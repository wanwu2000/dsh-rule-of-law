// 用 DSH 自己的 loader 逻辑读我们的 cordis.patch.yml，验证它的形状是否被接受。
const { readFileSync } = require('node:fs');
const yaml = require('C:/Users/Administrator/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/node_modules/js-yaml');

const raw = readFileSync('D:/OneDrive/文档/GitHub/dsh-rule-of-law/cordis.patch.yml', 'utf8');
console.log('--- 原始 YAML ---');
console.log(raw);

const parsed = yaml.load(raw);
console.log('--- 解析结果 ---');
console.log(JSON.stringify(parsed, null, 2));

console.log('--- 形状检查 ---');
console.log('是数组:', Array.isArray(parsed));
const first = parsed?.[0];
console.log('首项键:', Object.keys(first ?? {}));
console.log('insert 是数组:', Array.isArray(first?.insert));
console.log('insert[0].id:', first?.insert?.[0]?.id);
console.log('insert[0].name:', first?.insert?.[0]?.name);

