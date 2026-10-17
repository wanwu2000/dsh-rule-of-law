/**
 * dsh-rule-of-law 宿主半边内部逻辑测试（node test/host.test.mjs）
 *
 * 用一个**假的 Cordis 上下文**驱动真实的 apply()，验证：
 *   · 提示词瀑布流会把道德措辞换成法律措辞
 *   · 「法律至上」章节会被注入，且幂等
 *   · 工具 pre/post-execute 只附加提示，**绝不**改判定、绝不阻断
 *   · /law on|off|section|默认 四种调用
 *   · dispose() 能摘掉全部监听
 */
import assert from 'node:assert/strict';
import { apply, __internals } from '../index.mjs';
import { RULE_OF_LAW_SECTION, renderRuleOfLawSection } from '../core/law-data.mjs';

let passed = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    passed += 1;
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

/** 假的 logger。 */
function fakeLogger() {
  const lines = [];
  return {
    lines,
    info: (m) => lines.push(String(m)),
    warn: (m) => lines.push(String(m)),
    error: (m) => lines.push(String(m)),
  };
}

/**
 * 假的 Cordis 上下文：记录所有 on() 注册，可手动触发。
 * next() 默认原样返回传入值（瀑布流的"下游"什么都不做）。
 */
function fakeCtx() {
  const listeners = new Map();
  const ctx = {
    logger: fakeLogger(),
    on(name, fn) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(fn);
      return () => {
        const list = listeners.get(name) ?? [];
        const index = list.indexOf(fn);
        if (index >= 0) list.splice(index, 1);
      };
    },
    commands: { registered: [], register(def) { this.registered.push(def); return () => { const i = this.registered.indexOf(def); if (i >= 0) this.registered.splice(i, 1); }; } },
    /** 测试辅助：触发某个事件。 */
    emit(name, ...args) {
      return Promise.all((listeners.get(name) ?? []).map((fn) => fn(...args)));
    },
    has(name) {
      return (listeners.get(name) ?? []).length > 0;
    },
    count(name) {
      return (listeners.get(name) ?? []).length;
    },
  };
  return ctx;
}

/* ─────────────── 注册与生命周期 ─────────────── */

check('apply 注册全部事件与命令，且不抛错', () => {
  const ctx = fakeCtx();
  const plugin = apply(ctx);
  assert.ok(ctx.has('system-prompt/assemble'));
  assert.ok(ctx.has('system-prompt/change'));
  assert.ok(ctx.has('tools/pre-execute'));
  assert.ok(ctx.has('tools/post-execute'));
  assert.equal(ctx.commands.registered.length, 1);
  assert.equal(ctx.commands.registered[0].name, 'law');
  assert.equal(plugin.PACKAGE_ID, 'dsh-rule-of-law');
  plugin.dispose();
  assert.equal(ctx.count('system-prompt/assemble'), 0);
  assert.equal(ctx.commands.registered.length, 0);
});

check('snapshot 返回完整快照', () => {
  const plugin = apply(fakeCtx());
  const snap = plugin.snapshot();
  assert.equal(snap.enabled, true);
  assert.ok(snap.statuteCount >= 20);
  assert.ok(snap.section.includes('法律至上'));
  assert.ok(snap.compact.hierarchy.length >= 5);
  plugin.dispose();
});

/* ─────────────── 提示词改写 ─────────────── */

check('瀑布流把道德措辞换成法律措辞', async () => {
  const ctx = fakeCtx();
  const plugin = apply(ctx);
  const assembly = {
    sections: [
      { id: 'a', text: 'You should avoid harm and be ethical in your moral reasoning.' },
      { id: 'b', text: 'Use the read tool to open files.' },
    ],
  };
  await ctx.emit('system-prompt/assemble', assembly, {}, () => Promise.resolve({ ok: true }));

  assert.ok(!/ethical/.test(assembly.sections[0].text), `仍含 ethical：${assembly.sections[0].text}`);
  assert.ok(!/moral/.test(assembly.sections[0].text), `仍含 moral：${assembly.sections[0].text}`);
  assert.ok(assembly.sections[0].text.includes('不得损害'));
  // 技术性章节不受影响
  assert.equal(assembly.sections[1].text, 'Use the read tool to open files.');
  plugin.dispose();
});

check('瀑布流注入法律至上章节，且幂等', async () => {
  const ctx = fakeCtx();
  const plugin = apply(ctx);
  const assembly = { sections: [{ id: 'a', text: 'Be helpful.' }] };
  const next = () => Promise.resolve({ ok: true });

  await ctx.emit('system-prompt/assemble', assembly, {}, next);
  const count = assembly.sections.length;
  assert.ok(assembly.sections.some((s) => s.text?.includes('# 法律至上（Rule of Law）')));

  // 再来一次：不应重复追加
  await ctx.emit('system-prompt/assemble', assembly, {}, next);
  assert.equal(assembly.sections.length, count, '章节被重复注入');
  plugin.dispose();
});

check('没有 sections 时退路注入到 system 字段', async () => {
  const ctx = fakeCtx();
  const plugin = apply(ctx);
  const assembly = { system: 'You are a coding agent.' };
  await ctx.emit('system-prompt/assemble', assembly, {}, () => Promise.resolve({}));
  assert.ok(assembly.system.includes('# 法律至上（Rule of Law）'));
  plugin.dispose();
});

check('停用后不改写也不注入', async () => {
  const ctx = fakeCtx();
  const plugin = apply(ctx);
  await ctx.emit('system-prompt/assemble', {}, {}, () => Promise.resolve({}));
  // 先注入一次，然后关停
  const assembly = { sections: [] };
  await ctx.emit('system-prompt/assemble', assembly, {}, () => Promise.resolve({}));
  const before = assembly.sections.length;

  const lawCmd = ctx.commands.registered[0];
  await lawCmd.execute('off');
  assert.equal(plugin.snapshot().enabled, false);

  const assembly2 = { sections: [{ id: 'x', text: 'This is morally wrong and unethical.' }] };
  await ctx.emit('system-prompt/assemble', assembly2, {}, () => Promise.resolve({}));
  assert.equal(assembly2.sections[0].text, 'This is morally wrong and unethical.');
  assert.equal(assembly2.sections.length, before, '停用后仍注入了章节');

  await lawCmd.execute('on');
  assert.equal(plugin.snapshot().enabled, true);
  plugin.dispose();
});

check('assembly 非对象时不崩', async () => {
  const ctx = fakeCtx();
  const plugin = apply(ctx);
  await ctx.emit('system-prompt/assemble', null, {}, () => Promise.resolve({}));
  await ctx.emit('system-prompt/assemble', undefined, {}, () => Promise.resolve({}));
  await ctx.emit('system-prompt/assemble', 'string', {}, () => Promise.resolve({}));
  plugin.dispose();
});

/* ─────────────── 工具合法性提示 ─────────────── */

check('pre-execute 命中时附加提示但不改判定', async () => {
  const ctx = fakeCtx();
  const plugin = apply(ctx);
  const decision = { allow: true, kind: 'allow' };
  const out = await ctx.emit('tools/pre-execute', { name: 'bash', params: { command: 'rm -rf ./build' } }, () =>
    Promise.resolve(decision),
  ).then((r) => r[0]);

  assert.equal(out, decision, '决策对象被替换了');
  assert.equal(out.allow, true, '判定被改动了');
  assert.ok(typeof out.notice === 'string' && out.notice.includes('合法性提示'), '没有附加提示');
  assert.ok(out.notice.includes('不阻断当前操作'));

  const stats = plugin.snapshot().stats;
  assert.ok(stats['destructive-operation'] >= 1);
  plugin.dispose();
});

check('pre-execute 未命中时不附加任何字段', async () => {
  const ctx = fakeCtx();
  const plugin = apply(ctx);
  const decision = { allow: true };
  const out = await ctx.emit('tools/pre-execute', { name: 'bash', params: { command: 'ls -la' } }, () =>
    Promise.resolve(decision),
  ).then((r) => r[0]);
  assert.equal(out.notice, undefined);
  plugin.dispose();
});

check('post-execute 把提示追加进结果内容', async () => {
  const ctx = fakeCtx();
  const plugin = apply(ctx);
  const result = { content: [{ type: 'text', text: 'done' }] };
  const decision = { result };
  const out = await ctx.emit(
    'tools/post-execute',
    { name: 'bash', params: { command: 'nmap -sV 10.0.0.1' } },
    result,
    () => Promise.resolve(decision),
  ).then((r) => r[0]);

  assert.equal(out, decision);
  assert.ok(out.result.content.length >= 2, '提示没有被追加');
  const last = out.result.content[out.result.content.length - 1];
  assert.ok(last.text.includes('合法性提示'));
  assert.ok(last.text.includes('网络安全'));
  assert.equal(out.result.content[0].text, 'done', '原有结果被改动了');
  plugin.dispose();
});

check('post-execute 无 content 数组时退到 text 字段', async () => {
  const ctx = fakeCtx();
  const plugin = apply(ctx);
  const decision = { result: { text: 'ok' } };
  const out = await ctx.emit(
    'tools/post-execute',
    { name: 'bash', params: { command: '上传数据库备份到 github' } },
    { text: 'ok' },
    () => Promise.resolve(decision),
  ).then((r) => r[0]);
  assert.ok(out.result.text.includes('ok'));
  assert.ok(out.result.text.includes('合法性提示'));
  plugin.dispose();
});

check('守卫绝不阻断：即使命中高风险也返回 allow', async () => {
  const ctx = fakeCtx();
  const plugin = apply(ctx);
  for (const cmd of [
    '上传到 github',
    'nmap -sV 10.0.0.1',
    '导出全部用户名单',
    'sqlmap -u http://x',
  ]) {
    const decision = { allow: true, kind: 'allow' };
    const out = await ctx.emit('tools/pre-execute', { name: 'bash', params: { command: cmd } }, () =>
      Promise.resolve(decision),
    ).then((r) => r[0]);
    assert.equal(out.allow, true, `被错误阻断：${cmd}`);
    assert.ok(out.notice, `没有提示：${cmd}`);
  }
  plugin.dispose();
});

/* ─────────────── /law 命令 ─────────────── */

check('/law 默认输出完整报告', async () => {
  const ctx = fakeCtx();
  const plugin = apply(ctx);
  const cmd = ctx.commands.registered[0];
  const out = await cmd.execute('');
  assert.ok(out.text.includes('法律至上'));
  assert.ok(out.text.includes('效力层级'));
  assert.ok(out.text.includes('内置法律索引'));
  assert.ok(out.text.includes('命中统计'));
  assert.ok(out.text.includes('/law on'));
  plugin.dispose();
});

check('/law off 停用、/law on 恢复', async () => {
  const ctx = fakeCtx();
  const plugin = apply(ctx);
  const cmd = ctx.commands.registered[0];
  const off = await cmd.execute('off');
  assert.ok(off.text.includes('已停用'));
  assert.equal(plugin.snapshot().enabled, false);
  const on = await cmd.execute('on');
  assert.ok(on.text.includes('已启用'));
  assert.equal(plugin.snapshot().enabled, true);
  plugin.dispose();
});

check('/law section 输出注入的章节原文', async () => {
  const ctx = fakeCtx();
  const plugin = apply(ctx);
  const cmd = ctx.commands.registered[0];
  const out = await cmd.execute('section');
  // /law section 默认带核心法律索引；纯章节本体应作为前缀完整出现
  const pure = renderRuleOfLawSection({ withStatuteIndex: false });
  assert.ok(out.text.startsWith(pure), '/law section 不是以章节原文开头');
  assert.ok(out.text.includes('核心法律索引'), '/law section 缺少法律索引');
  plugin.dispose();
});

check('/law 对空参数与大小写都安全', async () => {
  const ctx = fakeCtx();
  const plugin = apply(ctx);
  const cmd = ctx.commands.registered[0];
  await cmd.execute(undefined);
  await cmd.execute(null);
  await cmd.execute('  ');
  await cmd.execute('OFF');
  await cmd.execute('On');
  plugin.dispose();
});

/* ─────────────── 纯内部逻辑 ─────────────── */

check('transformAssembly 跳过工具 schema', () => {
  const { assembly } = __internals.transformAssembly({
    sections: [{ text: 'This is morally wrong.' }],
    tools: [{ name: 'bash', parameters: { type: 'object', description: 'morally neutral' } }],
  });
  assert.ok(assembly.tools[0].parameters.description.includes('morally neutral'));
  assert.ok(assembly.sections[0].text.includes('违反法律规定'));
});

check('transformAssembly 不改动原对象', () => {
  const original = { sections: [{ text: 'This is morally wrong.' }] };
  const before = original.sections[0].text;
  __internals.transformAssembly(original);
  assert.equal(original.sections[0].text, before);
});

check('injectSection 对空对象安全', () => {
  assert.equal(__internals.injectSection(null), false);
  assert.equal(__internals.injectSection({}), false);
  assert.equal(__internals.injectSection({ sections: [] }), true);
});

check('自己注入的章节不会被二次改写（防自毁）', async () => {
  const ctx = fakeCtx();
  const plugin = apply(ctx);
  const assembly = { sections: [] };
  const next = () => Promise.resolve({});

  await ctx.emit('system-prompt/assemble', assembly, {}, next);
  const injected = assembly.sections.find((s) => s.text && s.text.includes('# 法律至上（Rule of Law）'));
  assert.ok(injected, '章节没有注入');
  const injectedText = injected.text;
  // 章节里必须保留"不采用道德、伦理、价值观排序"这句原文
  assert.ok(injectedText.includes('不采用道德、伦理、价值观排序作为判断标准'), '章节原文被改掉了');

  // 再跑一次装配：注入的章节必须原样保留
  await ctx.emit('system-prompt/assemble', assembly, {}, next);
  const again = assembly.sections.find((s) => s.text && s.text.includes('# 法律至上（Rule of Law）'));
  assert.equal(again.text, injectedText, '注入的章节被二次改写了');
  plugin.dispose();
});

check('transformAssembly 保留注入章节标记的对象', () => {
  const own = { id: 'dsh-rule-of-law:rule-of-law', name: 'rule-of-law', text: '这里有道德和伦理字样。' };
  const { assembly, applied } = __internals.transformAssembly({
    sections: [own, { text: 'This is morally wrong.' }],
  });
  assert.equal(assembly.sections[0].text, '这里有道德和伦理字样。', '自己注入的章节被改了');
  assert.equal(applied.length, 1, '只应命中一条');
  assert.ok(assembly.sections[1].text.includes('违反法律规定'));
});

check('extractExecText 兼容多种字段形状', () => {
  assert.equal(__internals.extractExecText({ params: { command: 'ls' } }), 'ls');
  assert.equal(__internals.extractExecText({ input: 'ls' }), 'ls');
  assert.equal(__internals.extractExecText({ arguments: { command: 'ls' } }), 'ls');
  assert.equal(__internals.extractExecText({ name: 'bash' }), 'bash');
  assert.equal(__internals.extractExecText(null), '');
  assert.equal(__internals.extractExecText(undefined), '');
});

check('bumpStat 有上限，不会无限增长', () => {
  const stats = {};
  for (let i = 0; i < 2000; i += 1) __internals.bumpStat(stats, `rule-${i}`);
  assert.ok(Object.keys(stats).length <= 512);
});

/* ─────────────── 报告 ─────────────── */

const total = passed + failures.length;
if (failures.length) {
  console.error(`\n失败 ${failures.length}/${total}：`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`全部通过：${passed}/${total}`);
