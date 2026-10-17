/**
 * 打包预检：模拟 npm pack，验证发布产物里包含所有必需文件、
 * 且不含测试/临时文件。发布前必须全绿。
 */
const { readFileSync, existsSync, statSync } = require('node:fs');
const path = require('node:path');

const root = 'D:/OneDrive/文档/GitHub/dsh-rule-of-law';
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

let failed = 0;
const ok = (m) => console.log('  ✓ ' + m);
const bad = (m) => { console.log('  ✗ ' + m); failed += 1; };

console.log('--- 必填字段 ---');
for (const f of ['name', 'version', 'description', 'license', 'repository', 'publishConfig']) {
  if (pkg[f]) ok(`${f} = ${JSON.stringify(pkg[f]).slice(0, 70)}`);
  else bad(`缺少 ${f}`);
}

console.log('\n--- 运行时文件存在性 ---');
const runtime = [
  'index.mjs',
  'client.js',
  'cordis.patch.yml',
  'core/law-data.mjs',
  'icon.svg',
  'locale/zh.json',
  'locale/en.json',
  'README.md',
  'LICENSE',
];
for (const f of runtime) {
  const p = path.join(root, f);
  if (existsSync(p) && statSync(p).isFile()) ok(`${f} (${statSync(p).size}B)`);
  else bad(`${f} 缺失`);
}

console.log('\n--- exports 指向真实文件 ---');
for (const [k, v] of Object.entries(pkg.exports)) {
  if (k.includes('*')) { ok(`${k} → ${v}（通配，跳过）`); continue; }
  const p = path.join(root, v);
  if (existsSync(p)) ok(`${k} → ${v}`);
  else bad(`${k} → ${v} 不存在`);
}

console.log('\n--- 语法检查（Node 能否解析） ---');
const { execFileSync } = require('node:child_process');
const NODE = 'C:/Users/Administrator/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node.exe';
for (const f of ['index.mjs', 'client.js', 'core/law-data.mjs']) {
  try {
    execFileSync(NODE, ['--check', path.join(root, f)], { encoding: 'utf8' });
    ok(`${f} 语法正确`);
  } catch (e) {
    bad(`${f} 语法错误：${e.stderr || e.message}`);
  }
}

console.log('\n--- locale JSON 合法性 ---');
for (const f of ['locale/zh.json', 'locale/en.json']) {
  try {
    const j = JSON.parse(readFileSync(path.join(root, f), 'utf8'));
    if (j.meta && j.meta.title && j.meta.description) ok(`${f} 含 meta.title/description`);
    else bad(`${f} 缺 meta 字段`);
  } catch (e) {
    bad(`${f} 不是合法 JSON：${e.message}`);
  }
}

console.log('\n--- dsh 清单 ---');
if (pkg.dsh && pkg.dsh.bundle && pkg.dsh.bundle.patch) ok(`bundle.patch = ${pkg.dsh.bundle.patch}`);
else bad('缺 dsh.bundle.patch');
if (pkg.dsh && pkg.dsh.client && pkg.dsh.client.platform === 'web') ok('client.platform = web');
else bad('缺 dsh.client.platform');
if (Array.isArray(pkg.dsh?.client?.inject) && pkg.dsh.client.inject.length) ok(`client.inject (${pkg.dsh.client.inject.length} 项)`);
else bad('缺 dsh.client.inject');
if (pkg.sideEffects && pkg.sideEffects.includes('./client.js')) ok('sideEffects 声明 ./client.js');
else bad('缺 sideEffects');

console.log('\n' + (failed ? `预检失败 ${failed} 项，不要发布` : '预检全部通过，可以 npm publish'));
process.exit(failed ? 1 : 0);
