// 从 app.asar 里读出命令相关的类型定义，确认 CommandDefinition / CommandExecution 的真实形状。
const { readFileSync, readdirSync, statSync } = require('node:fs');
const path = require('node:path');

const BASE = 'D:/deepseekharnessnb666/resources/app.asar/dsh/node_modules/@deepseek-ai';
const NODE = 'C:/Users/Administrator/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node.exe';

// 用 Node 的 asar 支持读不了，改用 koffi/asar 解析太麻烦；
// 直接列出目录看有没有 .d.ts（unpacked 的会有）
function walk(dir, depth) {
  if (depth > 3) return [];
  let out = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return []; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p, depth + 1));
    else if (e.name.endsWith('.d.ts') || e.name === 'index.js') out.push(p);
  }
  return out;
}

const files = walk(BASE, 0);
console.log('找到文件数:', files.length);

const hits = [];
for (const f of files) {
  let txt;
  try { txt = readFileSync(f, 'utf8'); } catch { continue; }
  if (/CommandDefinition|CommandExecution|interface CommandDesc/.test(txt)) {
    hits.push(f);
  }
}
console.log('含命令类型的文件:');
for (const h of hits) console.log('  ', h);
