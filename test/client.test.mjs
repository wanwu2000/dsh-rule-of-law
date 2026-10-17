/**
 * dsh-rule-of-law 客户端半边测试（node test/client.test.mjs）
 *
 * 难点：client.js 是一个 `window.__ModuleLoader__.load({ id, factory })` 包裹的
 * CommonJS 模块，而且内部会解析 React、访问 document/host/setInterval。
 *
 * 做法：在加载 client.js 之前，先在全局装好一个假的
 * `window.__ModuleLoader__`、假的 document、假的 host、假的 React。
 * 假 React 只需要 createElement/Component/useState/useEffect 四个面，
 * 足够把组件树走一遍并断言渲染出的文案。
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

/* ─────────────── 假的 React ─────────────── */

function createFakeReact() {
  const elements = [];
  class Component {
    constructor(props) {
      this.props = props;
      this.state = {};
    }
    setState(patch) {
      this.state = { ...this.state, ...(typeof patch === 'function' ? patch(this.state) : patch) };
      this.rendered = this.render();
    }
    render() {
      return null;
    }
  }
  const React = {
    Component,
    /**
     * 假的 createElement。为了让"纯文本抽取"能覆盖函数组件，
     * 这里对**函数类型**的 type 立即调用它，把返回的元素树内联进来；
     * 字符串/类 type 保持原样（由测试自行驱动）。
     */
    createElement(type, props, ...children) {
      const flat = [];
      const push = (c) => {
        if (Array.isArray(c)) c.forEach(push);
        else if (c !== null && c !== undefined && c !== false) flat.push(c);
      };
      children.forEach(push);
      if (typeof type === 'function' && !(type.prototype instanceof Component)) {
        // 函数组件：立即渲染，取回真实元素树
        return type({ ...(props ?? {}), children: flat.length === 1 ? flat[0] : flat });
      }
      const el = {
        type,
        props: props ?? {},
        children: flat,
        // 把整棵树的纯文本抽出来，方便断言文案
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
              // 函数组件的文案常在 props 里（title/children/basis）
              for (const key of ['title', 'label']) {
                if (typeof node.props[key] === 'string') out += node.props[key];
              }
            }
            if (node.children) node.children.forEach(walk);
          };
          flat.forEach(walk);
          return out;
        },
        find(predicate) {
          const stack = [this];
          while (stack.length) {
            const node = stack.pop();
            if (predicate(node)) return node;
            if (node && node.children) {
              for (const c of node.children) if (c && typeof c === 'object') stack.push(c);
            }
          }
          return null;
        },
        findAll(predicate) {
          const out = [];
          const stack = [this];
          while (stack.length) {
            const node = stack.pop();
            if (predicate(node)) out.push(node);
            if (node && node.children) {
              for (const c of node.children) if (c && typeof c === 'object') stack.push(c);
            }
          }
          return out;
        },
      };
      elements.push(el);
      return el;
    },
    useState(initial) {
      const box = { value: initial };
      const setter = (next) => {
        box.value = typeof next === 'function' ? next(box.value) : next;
      };
      return [box.value, setter];
    },
    useEffect() {
      /* 测试里不跑 effect：订阅行为由下面的 __internals 直接验证 */
    },
  };
  return React;
}

/* ─────────────── 假 document / window ─────────────── */

function createFakeDom() {
  const created = [];
  const removed = [];
  const head = {
    children: [],
    appendChild(node) {
      node.parentNode = this;
      this.children.push(node);
    },
    /** 真实 DOM 的语义：从父节点的 children 里摘掉自己。 */
    removeChild(node) {
      const index = this.children.indexOf(node);
      if (index >= 0) this.children.splice(index, 1);
      node.parentNode = null;
      removed.push(node);
      return node;
    },
  };
  const doc = {
    head,
    documentElement: { lang: 'zh-CN' },
    getElementById(id) {
      return head.children.find((n) => n.id === id) ?? null;
    },
    createElement(tag) {
      const node = { tag, id: '', textContent: '', parentNode: null };
      created.push(node);
      return node;
    },
    body: {},
  };
  return { doc, created, removed, head };
}

/* ─────────────── 加载 client.js ─────────────── */

function loadClient({ React, doc, window: win, host, setInterval, clearInterval }) {
  const captured = {};
  win.__ModuleLoader__ = {
    load(def) {
      captured.def = def;
      captured.factory = def.factory;
    },
  };
  // client.js 里直接引用 window/document/host/setInterval/clearInterval 这些全局名
  const fn = new Function(
    'window',
    'document',
    'host',
    'setInterval',
    'clearInterval',
    'console',
    clientSource,
  );
  fn(win, doc, host ?? null, setInterval, clearInterval, console);
  const module = captured.factory(function requireShim(name) {
    if (name === 'react') return React;
    throw new Error(`unexpected require: ${name}`);
  });
  return { def: captured.def, module };
}

/* ─────────────── 测试 ─────────────── */

check('模块注册 id 与插桩相符', () => {
  const React = createFakeReact();
  const dom = createFakeDom();
  const { def } = loadClient({ React, doc: dom.doc, window: {} });
  assert.equal(def.id, 'dsh-rule-of-law');
  assert.equal(typeof def.factory, 'function');
});

check('apply 无 React 时安静退出且不抛错', () => {
  const dom = createFakeDom();
  const { module } = loadClient({ React: null, doc: dom.doc, window: {} });
  assert.doesNotThrow(() => module.apply({ slots: { register() {} } }));
});

check('apply 无 document 时安静退出', () => {
  const React = createFakeReact();
  const { module } = loadClient({ React, doc: null, window: {} });
  assert.doesNotThrow(() => module.apply({ slots: { register() {} } }));
});

check('apply 无 slots 服务时警告但不抛错', () => {
  const React = createFakeReact();
  const dom = createFakeDom();
  const { module } = loadClient({ React, doc: dom.doc, window: {} });
  const warnings = [];
  const original = console.warn;
  console.warn = (...args) => warnings.push(args.join(' '));
  try {
    assert.doesNotThrow(() => module.apply({}));
  } finally {
    console.warn = original;
  }
  assert.ok(warnings.some((w) => w.includes('slots')));
});

check('apply 注册 settings.section 并安装样式', () => {
  const React = createFakeReact();
  const dom = createFakeDom();
  const registered = [];
  const ctx = {
    slots: { register(def, Boundary) { registered.push({ def, Boundary }); return () => {}; } },
    effect() { return () => {}; },
  };
  const { module } = loadClient({ React, doc: dom.doc, window: {} });
  module.apply(ctx);
  assert.equal(registered.length, 1);
  assert.equal(registered[0].def.name, 'settings.section');
  assert.equal(registered[0].def.registrant, 'dsh-rule-of-law');
  assert.equal(registered[0].def.label, '法律至上');
  assert.equal(dom.head.children.length, 1, '样式没有插入');
  assert.ok(dom.head.children[0].textContent.includes('.dsh-rol'));
});

check('样式幂等：重复 apply 不插第二条', () => {
  const React = createFakeReact();
  const dom = createFakeDom();
  const ctx = { slots: { register() { return () => {}; } }, effect() {} };
  const { module } = loadClient({ React, doc: dom.doc, window: {} });
  module.apply(ctx);
  module.apply(ctx);
  assert.equal(dom.head.children.length, 1);
});

check('inject 提供的视图含全部板块数据', () => {
  const React = createFakeReact();
  const dom = createFakeDom();
  let captured;
  const ctx = {
    slots: { register(def) { captured = def; return () => {}; } },
    effect() {},
  };
  const { module } = loadClient({ React, doc: dom.doc, window: {} });
  module.apply(ctx);
  const props = captured.inject();
  assert.equal(props.available, true);
  const view = props.__getView();
  assert.ok(view.hierarchy.length >= 5, '效力层级缺失');
  assert.ok(view.principles.length >= 10, '核心原则缺失');
  assert.ok(view.statutes.length >= 20, '法律索引缺失');
  assert.equal(typeof view.enabled, 'boolean');
  assert.equal(view.local, true, '没有 host 时应标记为本地模式');
});

check('内置数据与 core 模块一致（法律部数、原则条数）', async () => {
  const core = await import('../core/law-data.mjs');
  const React = createFakeReact();
  const dom = createFakeDom();
  const { module } = loadClient({ React, doc: dom.doc, window: {} });
  assert.equal(module.__internals.DATA.statutes.length, core.STATUTE_BOOK.length);
  assert.equal(module.__internals.DATA.principles.length, core.LEGAL_PRINCIPLES.length);
  assert.equal(module.__internals.DATA.hierarchy.length, core.AUTHORITY_HIERARCHY.length);
});

check('守卫规则标题表覆盖全部规则', async () => {
  const core = await import('../core/law-data.mjs');
  const React = createFakeReact();
  const dom = createFakeDom();
  const { module } = loadClient({ React, doc: dom.doc, window: {} });
  for (const rule of core.GUARD_RULES) {
    assert.ok(module.__internals.GUARD_RULE_TITLES[rule.id], `缺少标题：${rule.id}`);
  }
});

check('渲染出的面板包含法律名称与核心板块', () => {
  const React = createFakeReact();
  const dom = createFakeDom();
  let captured;
  const ctx = {
    slots: { register(def) { captured = def; return () => {}; } },
    effect() {},
  };
  const { module } = loadClient({ React, doc: dom.doc, window: {} });
  module.apply(ctx);

  // Panel 是函数组件，直接调用拿到元素树
  const Panel = module.__internals.createComponent(React);
  const view = captured.inject().__getView();
  const el = Panel({ view: view, busy: false, onRefresh() {}, onToggle() {} });
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
  ]) {
    assert.ok(text.includes(needle), `面板缺少：${needle}`);
  }
  // 面板里不应出现"依据道德"这类表述
  assert.ok(!/(依据|采用)道德/.test(text), `面板里还有道德判断：${text.slice(0, 400)}`);
});

check('停用态面板显示停用文案', () => {
  const React = createFakeReact();
  const dom = createFakeDom();
  let captured;
  const ctx = { slots: { register(def) { captured = def; return () => {}; } }, effect() {} };
  const { module } = loadClient({ React, doc: dom.doc, window: {} });
  module.apply(ctx);
  const Panel = module.__internals.createComponent(React);
  const props = captured.inject();
  props.onToggle(false);
  const el = Panel({ view: props.__getView(), busy: false, onRefresh() {}, onToggle() {} });
  const text = el.text();
  assert.ok(text.includes('已停用'));
  assert.ok(text.includes('当前不改写提示词'));
  assert.ok(!text.includes('提示词会按《中华人民共和国法律》改写'));
});

check('开关切换会更新视图', () => {
  const React = createFakeReact();
  const dom = createFakeDom();
  let captured;
  const ctx = {
    slots: { register(def) { captured = def; return () => {}; } },
    effect() {},
  };
  const { module } = loadClient({ React, doc: dom.doc, window: {} });
  const plugin = module.apply(ctx);
  const props = captured.inject();
  assert.equal(props.__getView().enabled, true);
  props.onToggle(false);
  assert.equal(props.__getView().enabled, false);
  props.onToggle(true);
  assert.equal(props.__getView().enabled, true);
  assert.doesNotThrow(() => plugin.dispose());
});

check('dispose 移除样式', () => {
  const React = createFakeReact();
  const dom = createFakeDom();
  const ctx = { slots: { register() { return () => {}; } }, effect() {} };
  const { module } = loadClient({ React, doc: dom.doc, window: {} });
  const plugin = module.apply(ctx);
  assert.equal(dom.head.children.length, 1);
  plugin.dispose();
  assert.equal(dom.head.children.length, 0);
});

check('有 host RPC 时标记为非本地模式', () => {
  const React = createFakeReact();
  const dom = createFakeDom();
  let captured;
  const host = {
    call(method) {
      if (method === 'snapshot') {
        return Promise.resolve({ enabled: false, stats: { 'destructive-operation': 3 } });
      }
      return Promise.reject(new Error('unknown'));
    },
  };
  const ctx = {
    slots: { register(def) { captured = def; return () => {}; } },
    effect() {},
  };
  const { module } = loadClient({ React, doc: dom.doc, window: {}, host });
  module.apply(ctx);
  const props = captured.inject();
  assert.equal(props.__getView().local, false, '有 host 却仍标记本地');
});

check('渲染边界类可实例化且失败态渲染 null', () => {
  const React = createFakeReact();
  const { module } = loadClient({ React, doc: createFakeDom().doc, window: {} });
  // Inner 返回一个真实元素，才能区分"渲染了 Inner"与"返回 null"
  const Inner = () => React.createElement('div', { className: 'dsh-rol' }, 'ok');
  const Boundary = module.__internals.createBoundary(React, Inner, () => true, 3);
  const instance = new Boundary({});
  instance.state = { failed: true };
  assert.equal(instance.render(), null);

  instance.state = { failed: false };
  const ok = instance.render();
  assert.ok(ok && ok.type === 'div', `成功态应渲染 Inner，实际：${JSON.stringify(ok)}`);
  assert.equal(ok.text(), 'ok');
});

/* ─────────────── 报告 ─────────────── */

const total = passed + failures.length;
if (failures.length) {
  console.error(`\n失败 ${failures.length}/${total}：`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`全部通过：${passed}/${total}`);
