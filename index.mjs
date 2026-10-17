/**
 * dsh-rule-of-law — 宿主半边（Host）
 *
 * 目标：把 DSH 系统提示词里的道德/伦理表述全部替换为《中华人民共和国法律》框架，
 *       并在工具调用层做**合法性提示 + 留痕**（只提示、不阻断）。
 *
 * 挂载点（全部来自 Cordis Inspect 的真实契约，没有猜测）：
 *   1. `system-prompt/assemble`（waterfall）
 *      —— 专家级瀑布流，可以对已装配的 sections/contexts/tools/variables 做最后改写。
 *         这是替换"道德/伦理措辞"的正确位置：原生提示词已经装配完，
 *         我们只在最后一跳把散文里的道德措辞换成法律措辞，并追加「法律至上」章节。
 *   2. `system-prompt/change`（emit）
 *      —— 提示词提供方变化时记录一次日志，便于确认本插件仍在参与装配。
 *   3. `tools/pre-execute`（waterfall，返回 PreToolDecision）
 *      —— 只**读取**执行内容做合法性匹配；命中时在决策里附带提示文本，
 *         但**绝不返回 deny**。DSH 会照常执行，提示随结果一起回到模型上下文。
 *   4. `tools/post-execute`（waterfall，返回 PostToolDecision）
 *      —— 把同样的提示追加进工具结果，保证模型一定看得到；同样不阻断。
 *   5. `commands` —— 注册 /law 命令，人工查询法律框架、命中统计。
 *
 * 纪律（沿用 DSH 插件的既有教训）：
 *   A. `apply()` 绝不抛错 —— 同步抛错会让该 entry 加载失败，整个插件就没了。
 *   B. 所有回调都包 try/catch：任何一个钩子崩了，最坏情况是"本次不注入"，
 *      绝不能把宿主或用户的会话带崩。
 *   C. 不写文件、不联网、不改用户数据；只在进程内保留命中计数（有上限，防内存泄漏）。
 *   D. 默认启用、可一键关停：`enabled` 状态存在内存里，/law off 立即生效，
 *      重启后回到默认（插件不落盘，避免产生用户数据）。
 */

import {
  PACKAGE_ID,
  RULE_OF_LAW_SECTION,
  STATUTE_BOOK,
  LEGAL_PRINCIPLES,
  GUARD_RULES,
  REPLACEMENT_RULES,
  AUTHORITY_HIERARCHY,
  applyReplacements,
  isReplaceableProse,
  matchGuardRules,
  renderGuardNotice,
  renderRuleOfLawSection,
  compactSummary,
  levelLabel,
} from './core/law-data.mjs';

/** 命中计数上限：超过就整体清零，绝不无限增长。 */
const MAX_STAT_ENTRIES = 512;

/** 取 logger：拿不到就退回 console（console 不进日志文件，但比崩掉好）。 */
function loggerFor(ctx) {
  try {
    const candidate = ctx?.logger;
    if (typeof candidate === 'function') {
      const scoped = candidate(PACKAGE_ID);
      if (scoped && typeof scoped.info === 'function') return scoped;
    }
    if (candidate && typeof candidate.info === 'function') return candidate;
  } catch {
    /* 落到 console */
  }
  return console;
}

/** 任意函数的安全调用：失败只记日志，不向上抛。 */
function safeCall(fn, ...args) {
  try {
    return fn(...args);
  } catch (error) {
    try {
      console.warn(`[${PACKAGE_ID}] 回调失败：`, error);
    } catch {
      /* 连 console 都不能用时只能放弃 */
    }
    return undefined;
  }
}

/**
 * PromptAssembly 的形状由 DSH 定义且可能演进，我们**不假设字段名**：
 * 递归遍历整棵对象/数组树，把每一段"可替换散文"替换为法律表述，
 * 返回一份新的 assembly（不改动调用方传入的原对象，避免副作用）。
 *
 * 这是刻意选的策略：早期版本按 `sections[i].text` 这类路径**就地写回**，
 * 但字符串是原始类型、无法就地修改，结果静默丢失了全部替换。
 *
 * 重要：**必须跳过本插件自己注入的章节**。该章节的说明文字里
 * 明写了"不采用道德、伦理、价值观排序作为判断标准"，
 * 若一起改写就会变成"不采用法律、法律、法律规范排序"——语义全毁。
 */
function transformAssembly(assembly) {
  const applied = [];
  const seen = new Set();

  /** 是不是本插件注入的章节：是就整棵放过。 */
  const isOwnSection = (node) =>
    !!node &&
    typeof node === 'object' &&
    (node.id === `${PACKAGE_ID}:rule-of-law` || node.name === 'rule-of-law' || node.registrant === PACKAGE_ID);

  const walk = (node, where) => {
    if (typeof node === 'string') {
      if (!isReplaceableProse(node)) return node;
      const result = safeCall(applyReplacements, node);
      if (!result || !result.applied.length || result.text === node) return node;
      for (const a of result.applied) applied.push({ where, id: a.id, count: a.count });
      return result.text;
    }
    if (!node || typeof node !== 'object') return node;
    if (seen.has(node)) return node; // 防御环形引用
    if (isOwnSection(node)) return node; // 自己注入的章节原样保留
    seen.add(node);

    if (Array.isArray(node)) {
      return node.map((item, index) => walk(item, `${where}[${index}]`));
    }
    const out = {};
    for (const [key, value] of Object.entries(node)) {
      // 工具 schema / 参数定义是结构化数据，不是散文，整棵跳过
      if (key === 'parameters' || key === 'schema' || key === 'inputSchema' || key === 'tools') {
        out[key] = value;
        continue;
      }
      out[key] = walk(value, where ? `${where}.${key}` : key);
    }
    return out;
  };

  const transformed = walk(assembly, '');
  return { assembly: transformed, applied };
}

/**
 * 把「法律至上」章节追加进 assembly（幂等：已存在就不再追加）。
 * 返回是否真正追加。
 */
function injectSection(assembly) {
  if (!assembly || typeof assembly !== 'object') return false;
  const marker = '# 法律至上（Rule of Law）';

  const hasMarker = (text) => typeof text === 'string' && text.includes(marker);

  const sections = Array.isArray(assembly.sections) ? assembly.sections : null;
  if (sections) {
    if (sections.some((s) => hasMarker(s?.text) || hasMarker(s?.content))) return false;
    sections.push({
      id: `${PACKAGE_ID}:rule-of-law`,
      name: 'rule-of-law',
      title: '法律至上',
      text: RULE_OF_LAW_SECTION,
    });
    return true;
  }

  // 退路：没有 sections 数组就贴在 system / text 这类字符串字段后面
  for (const key of ['system', 'text', 'prompt', 'systemPrompt']) {
    if (typeof assembly[key] === 'string') {
      if (hasMarker(assembly[key])) return false;
      assembly[key] = `${assembly[key]}\n\n${RULE_OF_LAW_SECTION}`;
      return true;
    }
  }
  return false;
}

/** 从一次工具执行里取出最像"命令文本"的字符串。 */
function extractExecText(exec) {
  if (!exec) return '';
  const candidates = [];
  const params = exec.params ?? exec.input ?? exec.arguments ?? exec.args;
  if (typeof params === 'string') candidates.push(params);
  else if (params && typeof params === 'object') {
    for (const value of Object.values(params)) {
      if (typeof value === 'string') candidates.push(value);
      else if (value && typeof value === 'object') {
        for (const inner of Object.values(value)) {
          if (typeof inner === 'string') candidates.push(inner);
        }
      }
    }
  }
  const direct = [exec.name, exec.tool, exec.toolName, exec.description, exec.command];
  for (const d of direct) if (typeof d === 'string') candidates.push(d);
  return candidates.filter(Boolean).join('\n');
}

/** 进程内命中计数（有上限）。 */
function bumpStat(stats, ruleId) {
  if (!Object.prototype.hasOwnProperty.call(stats, ruleId)) {
    if (Object.keys(stats).length >= MAX_STAT_ENTRIES) {
      for (const k of Object.keys(stats)) delete stats[k];
    }
    stats[ruleId] = 0;
  }
  stats[ruleId] += 1;
}

/** 渲染 /law 命令输出。 */
function renderLawReport(state) {
  const lines = [];
  lines.push('# 法律至上（dsh-rule-of-law）');
  lines.push('');
  lines.push(`状态：${state.enabled ? '已启用' : '已停用'}`);
  lines.push(`提示词替换：${state.enabled ? '开' : '关'}`);
  lines.push(`合法性提示：${state.enabled ? '开（只提示，不阻断）' : '关'}`);
  lines.push('');
  lines.push(`内嵌法律 ${STATUTE_BOOK.length} 部 · 核心原则 ${LEGAL_PRINCIPLES.length} 条 · 合法性规则 ${GUARD_RULES.length} 条 · 替换规则 ${REPLACEMENT_RULES.filter((r) => r.enabled !== false).length} 条`);
  lines.push('');
  lines.push('## 效力层级');
  for (const h of AUTHORITY_HIERARCHY) {
    lines.push(`${h.rank}. ${h.tier} — ${h.note}`);
  }
  lines.push('');
  lines.push('## 核心原则');
  for (const p of LEGAL_PRINCIPLES) {
    lines.push(`- **${p.title}**：${p.text}（${p.basis}）`);
  }
  lines.push('');
  lines.push('## 内置法律索引');
  for (const s of STATUTE_BOOK) {
    lines.push(`- ${s.name}（${s.authority}）— ${s.summary}`);
  }
  lines.push('');
  lines.push('## 合法性提示命中统计（本次进程）');
  const entries = Object.entries(state.stats);
  if (!entries.length) {
    lines.push('（暂无命中）');
  } else {
    for (const [id, count] of entries.sort((a, b) => b[1] - a[1])) {
      const rule = GUARD_RULES.find((r) => r.id === id);
      lines.push(`- ${id} × ${count}${rule ? ` — ${rule.title}（${levelLabel(rule.level)}风险）` : ''}`);
    }
  }
  lines.push('');
  lines.push('命令：/law（本报告）· /law on · /law off · /law section（查看注入的提示词章节）');
  return lines.join('\n');
}

/** 宿主半边入口。 */
export function apply(ctx) {
  const log = loggerFor(ctx);
  const say = (message) => safeCall(() => log.info?.(`[${PACKAGE_ID}] ${message}`));

  const state = {
    enabled: true,
    injectSection: true,
    guard: true,
    stats: Object.create(null),
    lastApplied: [],
  };

  /* ── 1. 系统提示词：最后一跳改写 + 注入「法律至上」章节 ── */
  const disposers = [];

  if (typeof ctx?.on === 'function') {
    disposers.push(
      ctx.on('system-prompt/assemble', async function assemble(assembly, context, next) {
        if (!state.enabled) return next();
        let applied = [];
        let injected = false;
        try {
          if (assembly && typeof assembly === 'object') {
            const { assembly: transformed, applied: hits } = transformAssembly(assembly);
            if (hits.length) {
              // 用改写后的版本整体替换：DSH 的瀑布流按引用传递，
              // 这里直接把改写结果交还给下游专家。
              Object.keys(assembly).forEach((k) => {
                try {
                  delete assembly[k];
                } catch {
                  /* 只读对象就放弃就地删除，走注入退路 */
                }
              });
              Object.assign(assembly, transformed);
            }
            applied = hits;
            if (state.injectSection) injected = injectSection(assembly);
          }
        } catch (error) {
          safeCall(() => log.warn?.(`[${PACKAGE_ID}] 提示词改写失败，本次不注入：`, error));
        }
        const result = await next();
        try {
          if (applied.length) {
            state.lastApplied = applied;
            say(
              `提示词已按《中华人民共和国法律》改写 ${applied.length} 处：`
              + applied.map((a) => `${a.where}:${a.id}×${a.count}`).join(', '),
            );
          }
          if (injected) say('已注入「法律至上」章节（效力层级 + 核心原则 + 行为准则）');
        } catch {
          /* 日志失败不影响装配 */
        }
        return result;
      }),
    );

    disposers.push(
      ctx.on('system-prompt/change', function onChange() {
        say('检测到提示词提供方变化；法律至上框架保持生效');
      }),
    );
  } else {
    say('宿主未提供 ctx.on，无法挂载提示词改写（插件其余功能不受影响）');
  }

  /* ── 2. 工具执行前：只读匹配，绝不 deny ── */
  if (state.guard && typeof ctx?.on === 'function') {
    disposers.push(
      ctx.on('tools/pre-execute', async function preExecute(exec, next) {
        const decision = await next();
        if (!state.enabled) return decision;
        try {
          const hits = matchGuardRules(extractExecText(exec));
          if (!hits.length) return decision;
          for (const hit of hits) bumpStat(state.stats, hit.rule.id);
          const notice = renderGuardNotice(hits);
          if (notice && decision && typeof decision === 'object') {
            // 只附提示，不改判定结果
            if (typeof decision.notice === 'string') decision.notice += `\n\n${notice}`;
            else decision.notice = notice;
          }
        } catch (error) {
          safeCall(() => log.warn?.(`[${PACKAGE_ID}] 合法性匹配失败：`, error));
        }
        return decision;
      }),
    );

    disposers.push(
      ctx.on('tools/post-execute', async function postExecute(exec, result, next) {
        const decision = await next();
        if (!state.enabled) return decision;
        try {
          const hits = matchGuardRules(extractExecText(exec));
          if (!hits.length) return decision;
          const notice = renderGuardNotice(hits);
          if (!notice) return decision;
          if (decision && typeof decision === 'object' && typeof decision.result === 'object' && decision.result) {
            // 追加进结果内容，保证模型看得到；不改执行结论
            const blocks = Array.isArray(decision.result.content)
              ? decision.result.content
              : null;
            if (blocks) {
              blocks.push({ type: 'text', text: `\n\n${notice}` });
            } else if (typeof decision.result.text === 'string') {
              decision.result.text += `\n\n${notice}`;
            }
          }
        } catch (error) {
          safeCall(() => log.warn?.(`[${PACKAGE_ID}] 合法性提示追加失败：`, error));
        }
        return decision;
      }),
    );
  }

  /* ── 3. /law 命令 ── */
  let disposeCommands = null;
  try {
    if (ctx?.commands && typeof ctx.commands.register === 'function') {
      disposeCommands = ctx.commands.register({
        name: 'law',
        description: '法律至上：查看法律框架、效力层级、内置法律索引与合法性提示命中统计；/law on|off|section',
        async execute(line) {
          const arg = String(line ?? '').trim().toLowerCase();
          if (arg === 'off') {
            state.enabled = false;
            return {
              kind: 'text',
              text: '已停用「法律至上」：不再改写提示词，也不再追加合法性提示。',
            };
          }
          if (arg === 'on') {
            state.enabled = true;
            return {
              kind: 'text',
              text: '已启用「法律至上」：提示词将按《中华人民共和国法律》改写，并在工具调用时追加合法性提示。',
            };
          }
          if (arg === 'section') {
            return { kind: 'text', text: renderRuleOfLawSection() };
          }
          return { kind: 'text', text: renderLawReport(state) };
        },
      });
    }
  } catch (error) {
    safeCall(() => log.warn?.(`[${PACKAGE_ID}] /law 命令注册失败：`, error));
  }

  say(
    `宿主半边就绪：system-prompt/assemble 改写 + 法律至上章节（${STATUTE_BOOK.length} 部法律）`
    + `，tools/pre|post-execute 合法性提示（${GUARD_RULES.length} 条规则，只提示不阻断），/law 命令`,
  );

  /* ── 4. 客户端 RPC：让设置面板能读状态、能开关 ──
   *
   * 客户端半边通过 package-private `host.call(method, args)` 调用这里。
   * 我们只暴露两个方法，且都做了参数校验：
   *   snapshot()            → 只读快照
   *   setEnabled({enabled}) → 开关
   */
  const rpc = {
    snapshot() {
      return buildSnapshot(state);
    },
    setEnabled(args) {
      const next = args && typeof args === 'object' ? args.enabled : undefined;
      if (typeof next !== 'boolean') {
        throw new Error('setEnabled 需要布尔参数 { enabled: boolean }');
      }
      state.enabled = next;
      say(next ? '客户端请求：已启用法律至上' : '客户端请求：已停用法律至上');
      return buildSnapshot(state);
    },
  };

  return {
    PACKAGE_ID,
    /** 供测试与其他半边读取的只读快照。 */
    snapshot() {
      return buildSnapshot(state);
    },
    /** 客户端 RPC 入口。 */
    rpc,
    /** 卸载：移除全部监听与命令。 */
    dispose() {
      for (const d of disposers) safeCall(() => (typeof d === 'function' ? d() : undefined));
      disposers.length = 0;
      safeCall(() => (typeof disposeCommands === 'function' ? disposeCommands() : undefined));
      disposeCommands = null;
    },
  };
}

/** 构造客户端可安全序列化的快照。 */
function buildSnapshot(state) {
  return {
    enabled: state.enabled,
    statuteCount: STATUTE_BOOK.length,
    principleCount: LEGAL_PRINCIPLES.length,
    guardRuleCount: GUARD_RULES.length,
    replacementRuleCount: REPLACEMENT_RULES.filter((r) => r.enabled !== false).length,
    stats: { ...state.stats },
    lastApplied: state.lastApplied.slice(0, 20),
    compact: compactSummary(),
    section: RULE_OF_LAW_SECTION,
  };
}

/** 供测试直接调用的纯逻辑（不依赖宿主）。 */
export const __internals = {
  transformAssembly,
  injectSection,
  extractExecText,
  renderLawReport,
  bumpStat,
};
