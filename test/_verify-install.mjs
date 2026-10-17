// 真实验证：从 profile 的 node_modules 链接位置加载插件，模拟宿主调用。
import { apply } from 'file:///C:/Users/Administrator/.dsh/profiles/desktop/node_modules/dsh-rule-of-law/index.mjs';

const logs = [];
const listeners = new Map();
const registeredCommands = [];

const ctx = {
  logger: { info: (m) => logs.push(String(m)), warn: (m) => logs.push(String(m)) },
  on(name, fn) {
    if (!listeners.has(name)) listeners.set(name, []);
    listeners.get(name).push(fn);
    return () => {};
  },
  commands: {
    register(def) { registeredCommands.push(def); return () => {}; },
  },
};

const plugin = apply(ctx);
console.log('--- 注册的事件 ---');
console.log([...listeners.keys()].sort().join('\n'));
console.log('\n--- 注册的命令 ---');
console.log(registeredCommands.map((c) => `${c.name}: ${c.description}`).join('\n'));

console.log('\n--- 启动日志 ---');
console.log(logs.join('\n'));

// 真调一次 /law
const lawCmd = registeredCommands.find((c) => c.name === 'law');
const report = await lawCmd.execute('');
console.log('\n--- /law 输出前 600 字 ---');
console.log(report.text.slice(0, 600));
console.log(`...（全文 ${report.text.length} 字）`);

console.log('\n--- snapshot ---');
const snap = plugin.snapshot();
console.log(JSON.stringify({
  enabled: snap.enabled,
  statuteCount: snap.statuteCount,
  principleCount: snap.principleCount,
  guardRuleCount: snap.guardRuleCount,
  replacementRuleCount: snap.replacementRuleCount,
}, null, 2));

// 真跑一次守卫
const decision = { allow: true };
const out = await listeners.get('tools/pre-execute')[0](
  { name: 'bash', params: { command: 'rm -rf ./build' } },
  () => Promise.resolve(decision),
);
console.log('\n--- tools/pre-execute 命中 rm -rf ---');
console.log('allow =', out.allow, '（必须仍为 true）');
console.log('notice 存在 =', typeof out.notice === 'string');
console.log(out.notice ? out.notice.split('\n').slice(0, 4).join('\n') : '(无)');

plugin.dispose();
console.log('\nOK');
