/**
 * dsh-rule-of-law 客户端半边测试（node test/client.test.mjs）
 *
 * client.js 是 `window.__ModuleLoader__.load({ id, factory })` 包裹的
 * CommonJS 模块，内部通过 `require('react')` 取 React。
 *
 * 做法：加载前装好假的 `window.__ModuleLoader__`，用假的 require 驱动 factory，
 * 拿到 { inject, apply }，再用假的 slots 服务驱动 apply。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const clientSource = readFileSync(path.join(here, '..', 'client.js'), 'utf8');

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

/* ─────────────── 假 React ─────────────── */

function createFakeReact() {
  class Component {
    constructor(props) {
      this.props = props;
      this.state = {};
    }
    render() {
      return null;
    }
  }
  const React = {
    Component,
    createElement(type, props, ...children) {
      const flat = [];
      const push = (c) => {
        if (Array.isArray(c)) c.forEach(push);
        else if (c !== null && c !== undefined && c !== false) flat.push(c);
      };
      children.forEach(push);
      // 函数组件立即渲染，让"抽纯文本"能覆盖 props 里的文案
      if (typeof type === 'function' && !(type.prototype instanceof Component)) {
        return type({ ...(props ?? {}), children: flat.length === 1 ? flat[0] : flat });
      }
      return {
        type,
        props: props ?? {},
        children: flat,
        text() {
          let out = '';
          const walk = (node) => {
            if (node === null || node === undefined || node === false) return;
            if (typeof node === 'string' || typeof node === 'number') {
              out += String(node);
              return;
            }
            if (Array.isArray(node)) {
              node.forEach(walk);
              return;
            }
            if (node.props) {
              for (const k of ['title', 'label']) {
                if (typeof node.props[k] === 'string') out += node.props[k];
              }
            }
            if (node.children) node.children.forEach(walk);
          };
          flat.forEach(walk);
          return out;
        },
      };
    },
    useState(initial) {
      const box = { value: initial };
      return [box.value, (next) => { box.value = typeof next === 'function' ? next(box.value) : next; }];
    },
    useEffect() {},
  };
  return React;
}

/* ─────────────── 加载 client.js ─────────────── */

function loadClient({ React, host }) {
  const captured = {};
  const win = {
    __ModuleLoader__: {
      load(def) {
        captured.def = def;
        captured.module = def.factory(function requireShim(name) {
          if (name === 'react') return React;
          throw new Error(`unexpected require: ${name}`);
        });
      },
    },
  };
  const fn = new Function('window', 'host', 'console', clientSource);
  fn(win, host ?? null, console);
  return captured;
}

/* ─────────────── 测试 ─────────────── */

check('工厂 id 等于包名', () => {
  const React = createFakeReact();
  const { def } = loadClient({ React });
  assert.equal(def.id, 'dsh-rule-of-law');
  assert.equal(typeof def.factory, 'function');
});

check('导出 inject 与 apply', () => {
  const React = createFakeReact();
  const { module } = loadClient({ React });
  assert.deepEqual(module.inject, ['slots']);
  assert.equal(typeof module.apply, 'function');
});

check('apply 注册 settings.section 槽位', () => {
  const React = createFakeReact();
  const { module } = loadClient({ React });
  const injected = [];
  const registered = [];
  const ctx = {
    slots: {
      // register 的返回值是"注销函数"，def 通过参数传进来
      register(def, C) { registered.push({ def, Comp: C }); return () => {}; },
      inject(slot, cb) { injected.push({ slot, cb }); return () => {}; },
    },
  };
  module.apply(ctx);

  // 宿主在渲染时会调用 inject 的回调，回调内部再去 register
  const cleanup = injected[0].cb();
  assert.equal(typeof cleanup, 'function', 'inject 回调应返回 register 的注销函数');
  assert.equal(registered.length, 1, 'register 应被调用一次');

  const def = registered[0].def;
  assert.equal(injected[0].slot, 'settings.section');
  assert.equal(def.name, 'settings.section');
  assert.equal(def.id, 'dsh-rule-of-law');
  assert.equal(def.label, '法律至上');
  assert.equal(typeof def.order, 'number');
  assert.equal(typeof registered[0].Comp, 'function', '第二个参数应是组件');
});

check('渲染出的面板包含核心板块与法律名称', () => {
  const React = createFakeReact();
  const { module } = loadClient({ React });
  let Comp;
  const ctx = {
    slots: {
      register(def, C) { Comp = C; return () => {}; },
      inject(slot, cb) { cb(); return () => {}; },
    },
  };
  module.apply(ctx);

  // Comp 是 Wrapper（用了 useState/useEffect），假实现会立即求值
  const el = Comp();
  const text = el.text();
  for (const needle of [
    '法律至上',
    '效力层级',
    '核心原则',
    '内置法律索引',
    '合法性提示命中统计',
    '《中华人民共和国民法典》',
    '《中华人民共和国个人信息保护法》',
    '法定权限',
    '暂无命中记录',
  ]) {
    assert.ok(text.includes(needle), `面板缺少：${needle}`);
  }
  assert.ok(!/依据道德/.test(text), '面板里出现了道德判断');
});

check('dispose 可重复调用且不抛错', () => {
  const React = createFakeReact();
  const { module } = loadClient({ React });
  const ctx = {
    slots: { register() { return () => {}; }, inject(s, cb) { cb(); return () => {}; } },
  };
  const plugin = module.apply(ctx);
  assert.ok(plugin && typeof plugin.dispose === 'function');
  assert.doesNotThrow(() => plugin.dispose());
  assert.doesNotThrow(() => plugin.dispose());
});

check('无 host RPC 时仍能渲染（本地模式）', () => {
  const React = createFakeReact();
  const { module } = loadClient({ React, host: null });
  let Comp;
  const ctx = {
    slots: { register(d, C) { Comp = C; return () => {}; }, inject(s, cb) { cb(); return () => {}; } },
  };
  module.apply(ctx);
  assert.ok(Comp().text().includes('法律至上'));
});

check('有 host RPC 时调用 snapshot', async () => {
  const React = createFakeReact();
  const calls = [];
  const host = {
    call(method) {
      calls.push(method);
      if (method === 'snapshot') return Promise.resolve({ enabled: false, stats: { 'destructive-operation': 2 } });
      return Promise.reject(new Error('unknown'));
    },
  };
  const { module } = loadClient({ React, host });
  const ctx = {
    slots: { register() { return () => {}; }, inject(s, cb) { cb(); return () => {}; } },
  };
  module.apply(ctx);
  await new Promise((r) => setTimeout(r, 0));
  assert.ok(calls.includes('snapshot'), `没有调用 snapshot：${calls.join(',')}`);
});

check('内嵌数据条数与 core 一致', async () => {
  const core = await import('../core/law-data.mjs');
  const React = createFakeReact();
  const { module } = loadClient({ React });
  let Comp;
  const ctx = {
    slots: { register(d, C) { Comp = C; return () => {}; }, inject(s, cb) { cb(); return () => {}; } },
  };
  module.apply(ctx);
  const text = Comp().text();
  // 面板把条数渲染成 "25 部法律" / "11 条原则" / "7 条提示规则"
  assert.ok(text.includes(core.STATUTE_BOOK.length + ' 部法律'), `法律部数不符：${core.STATUTE_BOOK.length}`);
  assert.ok(text.includes(core.LEGAL_PRINCIPLES.length + ' 条原则'), `原则条数不符：${core.LEGAL_PRINCIPLES.length}`);
  assert.ok(text.includes(core.GUARD_RULES.length + ' 条提示规则'), `规则条数不符：${core.GUARD_RULES.length}`);
  // 每部法律的名字都应出现在面板里
  for (const s of core.STATUTE_BOOK) {
    assert.ok(text.includes(s.name), `面板缺少法律：${s.name}`);
  }
});

/* ─────────────── 报告 ─────────────── */

const total = passed + failures.length;
if (failures.length) {
  console.error(`\n失败 ${failures.length}/${total}：`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`全部通过：${passed}/${total}`);
