// 直接向运行中的 DSH Web 服务查询客户端模块表。
const BASE = 'http://127.0.0.1:19387';

async function main() {
  // 1. 启动图
  const paths = ['/api/plugins/client-modules', '/api/client-modules', '/api/modules', '/api/plugins'];
  for (const p of paths) {
    try {
      const res = await fetch(BASE + p);
      const text = await res.text();
      console.log(`--- ${p} → ${res.status} ---`);
      console.log(text.slice(0, 500));
      if (text.includes('rule-of-law')) {
        console.log('>>> 命中 rule-of-law <<<');
        return;
      }
    } catch (e) {
      console.log(`--- ${p} → ERR ${e.message} ---`);
    }
  }
  console.log('（以上路径均未发现 rule-of-law）');
}

main();
