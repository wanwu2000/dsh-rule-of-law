/**
 * dsh-rule-of-law 离线冒烟测试（node test/smoke.test.mjs）
 *
 * 只测**纯函数**，不依赖 DSH 宿主：核心法律数据、守卫规则、提示词替换。
 * 每一项失败都打印清楚的原因，退出码非 0 表示失败。
 */
import assert from 'node:assert/strict';
import {
  STATUTE_BOOK,
  LEGAL_PRINCIPLES,
  GUARD_RULES,
  REPLACEMENT_RULES,
  AUTHORITY_HIERARCHY,
  RULE_OF_LAW_SECTION,
  statute,
  statutesByDomain,
  domains,
  hierarchy,
  findMentionedStatutes,
  matchGuardRules,
  renderGuardNotice,
  levelLabel,
  applyReplacements,
  isReplaceableProse,
  renderRuleOfLawSection,
  compactSummary,
  compileRule,
  escapeRegExp,
} from '../core/law-data.mjs';

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

/* ─────────────── 数据完整性 ─────────────── */

check('效力层级按 rank 升序且唯一', () => {
  const ranks = hierarchy().map((h) => h.rank);
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
  assert.equal(new Set(ranks).size, ranks.length);
  assert.equal(hierarchy()[0].tier, '宪法');
  assert.ok(AUTHORITY_HIERARCHY.length >= 5);
});

check('每部法律都有必填字段且 id 唯一', () => {
  const ids = new Set();
  for (const s of STATUTE_BOOK) {
    for (const key of ['id', 'name', 'domain', 'authority', 'summary', 'basis']) {
      assert.ok(s[key], `${s.id} 缺字段 ${key}`);
    }
    assert.ok(s.name.startsWith('《'), `${s.id} 名称应以《开头`);
    assert.ok(s.keyPoints.length >= 1, `${s.id} 至少一条关键条文`);
    assert.ok(!ids.has(s.id), `id 重复：${s.id}`);
    ids.add(s.id);
  }
});

check('核心诉求中的法律都在册', () => {
  for (const id of [
    'constitution',
    'civil-code',
    'criminal-law',
    'administrative-penalty-law',
    'personal-information-protection-law',
    'cybersecurity-law',
    'data-security-law',
  ]) {
    assert.ok(statute(id), `缺少 ${id}`);
  }
});

check('domain 过滤与去重', () => {
  assert.ok(statutesByDomain('digital').length >= 3);
  assert.deepEqual(domains(), [...new Set(domains())]);
  assert.equal(
    statutesByDomain('digital').reduce((n) => n + 1, 0),
    STATUTE_BOOK.filter((s) => s.domain === 'digital').length,
  );
});

check('每条守卫规则都有完整说明', () => {
  const levels = new Set(['notice', 'caution', 'high']);
  for (const r of GUARD_RULES) {
    for (const key of ['id', 'level', 'title', 'detail', 'basis']) {
      assert.ok(r[key], `守卫规则 ${r.id} 缺字段 ${key}`);
    }
    assert.ok(levels.has(r.level), `${r.id} level 非法：${r.level}`);
    assert.ok(r.patterns.length >= 1, `${r.id} 至少一个匹配模式`);
    for (const p of r.patterns) {
      assert.doesNotThrow(() => new RegExp(p, 'i'), `${r.id} 模式无法编译：${p}`);
    }
  }
});

check('每条替换规则都有说明', () => {
  for (const r of REPLACEMENT_RULES) {
    for (const key of ['id', 'term', 'replacement', 'note']) {
      assert.ok(r[key], `替换规则 ${r.id} 缺字段 ${key}`);
    }
    // 注意：enabled=false 的规则 compileRule 返回 null（设计如此），
    // 所以这里单独校验它的正则是**可编译的**，而不是校验 compileRule 的返回值。
    assert.doesNotThrow(() => {
      const re = new RegExp(escapeRegExp(r.term), 'gi');
      void re;
    }, `${r.id} 的 term 无法编译成正则`);
    // 启用的规则必须能真正编译
    if (r.enabled !== false) assert.ok(compileRule(r), `${r.id} 无法编译`);
  }
  // 停用的规则必须是 null
  const disabled = REPLACEMENT_RULES.filter((r) => r.enabled === false);
  for (const r of disabled) assert.equal(compileRule(r), null, `${r.id} 已停用却仍能编译`);
});

check('停用的规则不参与替换', () => {
  const disabled = REPLACEMENT_RULES.filter((r) => r.enabled === false);
  assert.ok(disabled.length >= 1, '没有停用规则可测');
  for (const r of disabled) {
    // 这段文本必然命中一个**启用的**规则（"道德"），因此会被判为散文；
    // 停用规则的措辞夹在中间，应原样保留。
    const text = `从道德角度看，团队士气与${r.term}这个方面的问题都应当关注。`;
    const result = applyReplacements(text);
    // 启用的规则照常生效
    assert.ok(result.text.includes('法律'), `启用的规则没生效：${result.text}`);
    // 停用规则的措辞不应被替换
    assert.ok(result.text.includes(r.term), `停用的 ${r.id} 被替换了：${result.text}`);
    assert.ok(
      !result.applied.some((a) => a.id === r.id),
      `停用的 ${r.id} 出现在 applied 里`,
    );
  }
});

check('法律至上章节包含效力层级与核心原则', () => {
  assert.ok(RULE_OF_LAW_SECTION.includes('效力层级'));
  assert.ok(RULE_OF_LAW_SECTION.includes('法定权限'));
  assert.ok(RULE_OF_LAW_SECTION.includes('法律保留'));
  assert.ok(RULE_OF_LAW_SECTION.includes('《中华人民共和国法律》'));
  assert.ok(!/道德/.test(RULE_OF_LAW_SECTION.replace(/不采用道德、伦理、价值观排序作为判断标准/, '')));
});

/* ─────────────── 守卫规则 ─────────────── */

check('批量个人信息 → caution 以上', () => {
  const hits = matchGuardRules('导出全部用户名单到 csv');
  assert.ok(hits.length >= 1);
  assert.equal(hits[0].rule.id, 'personal-data-bulk');
  assert.ok(['caution', 'high'].includes(hits[0].level));
});

check('上传到 github + 凭据 → high 且排在前面', () => {
  const hits = matchGuardRules('把备份上传到 github 并 curl 带上 api_key');
  assert.ok(hits.length >= 1);
  assert.equal(hits[0].level, 'high');
  assert.equal(hits[0].rule.id, 'data-export-outbound');
});

check('rm -rf → 命中破坏性操作', () => {
  const hits = matchGuardRules('rm -rf ./build');
  assert.ok(hits.some((h) => h.rule.id === 'destructive-operation'));
});

check('nmap / sqlmap → 命中安全测试', () => {
  for (const cmd of ['nmap -sV 10.0.0.1', 'sqlmap -u "http://x"']) {
    const hits = matchGuardRules(cmd);
    assert.ok(hits.some((h) => h.rule.id === 'security-testing'), cmd);
  }
});

check('普通命令不误报', () => {
  for (const cmd of ['ls -la', 'git status', 'cat README.md', 'node --version', 'echo hi']) {
    const hits = matchGuardRules(cmd);
    assert.equal(hits.length, 0, `误报：${cmd} → ${hits.map((h) => h.rule.id).join(',')}`);
  }
});

check('空文本/非字符串安全返回', () => {
  assert.deepEqual(matchGuardRules(''), []);
  assert.deepEqual(matchGuardRules(null), []);
  assert.deepEqual(matchGuardRules(undefined), []);
});

check('渲染提示包含依据且声明不阻断', () => {
  const text = renderGuardNotice(matchGuardRules('rm -rf /data'));
  assert.ok(text);
  assert.ok(text.includes('合法性提示'));
  assert.ok(text.includes('依据：'));
  assert.ok(text.includes('不阻断当前操作'));
  assert.equal(renderGuardNotice([]), null);
});

check('等级中文名', () => {
  assert.equal(levelLabel('high'), '高');
  assert.equal(levelLabel('caution'), '中');
  assert.equal(levelLabel('notice'), '低');
});

/* ─────────────── 提示词替换 ─────────────── */

check('英文道德措辞 → 法律措辞', () => {
  const { text, applied } = applyReplacements(
    'You should avoid harm and be ethical in your moral reasoning about human values.',
  );
  assert.ok(!/ethical/.test(text), `仍含 ethical：${text}`);
  assert.ok(!/moral reasoning/.test(text), `仍含 moral reasoning：${text}`);
  assert.ok(text.includes('依法'));
  assert.ok(text.includes('不得损害'));
  assert.ok(applied.length >= 3);
});

check('中文道德措辞 → 法律措辞', () => {
  const { text, applied } = applyReplacements('这个判断涉及道德上的善恶与伦理标准，属于价值观问题。');
  assert.ok(!/道德/.test(text), `仍含"道德"：${text}`);
  assert.ok(!/伦理/.test(text), `仍含"伦理"：${text}`);
  assert.ok(!/价值观/.test(text), `仍含"价值观"：${text}`);
  assert.ok(applied.length >= 3);
});

check('替换是幂等的', () => {
  const first = applyReplacements('请从道德角度做伦理判断，并遵守道德准则。');
  const second = applyReplacements(first.text);
  assert.equal(second.text, first.text);
  assert.equal(second.applied.length, 0, `二次替换仍有命中：${second.applied.map((a) => a.id)}`);
});

check('applyReplacements 自带代码门槛（不再改代码里的标识符）', () => {
  const code = 'const moral = 1;\nfunction f() { return moral; }';
  const { text, applied } = applyReplacements(code);
  assert.equal(text, code);
  assert.equal(applied.length, 0);
});

check('unethical 不被 ethical 规则咬掉前半截', () => {
  const { text } = applyReplacements('dishonest is not the same as unethical but both matter');
  assert.ok(!/unethical/.test(text), `仍含 unethical：${text}`);
  assert.ok(!/^dis违法/.test(text.trim()), `前缀被吃掉：${text}`);
});

check('长词优先：morally wrong 整段替换', () => {
  const { text } = applyReplacements('that would be morally wrong');
  assert.ok(text.includes('违反法律规定'), text);
});

check('短文本与空文本安全', () => {
  assert.equal(applyReplacements('').text, '');
  assert.equal(applyReplacements(null).text, '');
  assert.equal(applyReplacements(undefined).text, '');
});

check('散文判定：该改的改，不该改的不碰', () => {
  // 该改
  assert.equal(isReplaceableProse('这不符合道德。'), true);
  assert.equal(isReplaceableProse('这是一个关于伦理判断的说明段落。'), true);
  assert.equal(
    isReplaceableProse('遵循"道德标准"这一条：请说明依据'),
    true,
    '带全角引号的散文不该被当成 JSON schema 误杀',
  );
  // 不该改
  assert.equal(isReplaceableProse('const moral = 1; function f() { return moral; }'), false);
  assert.equal(isReplaceableProse('import moral from "x";'), false);
  assert.equal(isReplaceableProse('   '), false);
  assert.equal(isReplaceableProse(''), false);
  assert.equal(isReplaceableProse(null), false);
  assert.equal(isReplaceableProse('完全合法的操作说明。'), false);
});

/* ─────────────── 渲染 ─────────────── */

check('法律索引默认附带，可关闭', () => {
  const withIndex = renderRuleOfLawSection();
  const withoutIndex = renderRuleOfLawSection({ withStatuteIndex: false });
  assert.ok(withIndex.length > withoutIndex.length);
  assert.ok(withIndex.includes('本会话内置的核心法律索引'));
  assert.ok(!withoutIndex.includes('本会话内置的核心法律索引'));
});

check('可展开指定法律的关键条文', () => {
  const text = renderRuleOfLawSection({
    withStatuteIndex: false,
    extraStatuteIds: ['personal-information-protection-law'],
  });
  assert.ok(text.includes('《中华人民共和国个人信息保护法》'));
  assert.ok(text.includes('最小范围'));
});

check('compactSummary 结构完整', () => {
  const s = compactSummary();
  assert.equal(s.statuteCount, STATUTE_BOOK.length);
  assert.equal(s.principleCount, LEGAL_PRINCIPLES.length);
  assert.equal(s.guardRuleCount, GUARD_RULES.length);
  assert.equal(s.hierarchy.length, AUTHORITY_HIERARCHY.length);
  assert.ok(s.statutes.every((x) => x.name && x.summary));
});

check('在文本中查找提及的法律', () => {
  const hits = findMentionedStatutes('依据《民法典》第七条和《个人信息保护法》处理');
  assert.ok(hits.includes('civil-code'));
  assert.ok(hits.includes('personal-information-protection-law'));
  assert.deepEqual(findMentionedStatutes(''), []);
});

/* ─────────────── 报告 ─────────────── */

const total = passed + failures.length;
if (failures.length) {
  console.error(`\n失败 ${failures.length}/${total}：`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`全部通过：${passed}/${total}`);
