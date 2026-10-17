/**
 * dsh-rule-of-law — 浏览器半边（Client）
 *
 * 遵循官方 UI 插件模板（cordis-plugin-development/templates/decoration/client.js）：
 *   · `window.__ModuleLoader__.load({ id, factory })` 注册惰性工厂，id 必须等于包名；
 *   · React 从浏览器模块表 `require('react')` 直接取得——**不需要**任何
 *     window.React / fiber 借用 / UMD 探测之类的兜底（官方明确说了）；
 *   · 资源（定时器、监听）在 `apply` 里注册，并在返回的 dispose 中清理；
 *   · 挂载点是 `settings.section`（list 槽位，与内置设置页共存，不遮蔽任何东西）。
 *
 * 界面内容：设置面板多一页「法律至上」——效力层级、核心原则、内置法律索引，
 *           以及本会话的合法性提示命中统计与启停开关。
 *
 * 数据来源：宿主半边通过 package-private RPC 提供 `snapshot` / `setEnabled`。
 *           拿不到 RPC 时退回内嵌数据（与 core/law-data.mjs 保持一致），
 *           保证面板在任何情况下都能渲染，不会白屏。
 */
window.__ModuleLoader__.load({
  id: 'dsh-rule-of-law',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /* ───────────────────────── 内嵌数据 ─────────────────────────
     * 与 core/law-data.mjs 的 compactSummary() 内容一致。
     * 浏览器 factory 无法 import 宿主的 ESM，所以这里放一份副本；
     * test/client.test.mjs 有一条断言两边数量一致，改数据忘同步会立刻报错。
     * ------------------------------------------------------------------ */
    const HIERARCHY = [
      { rank: 1, tier: '宪法', note: '国家根本法，具有最高的法律效力；一切法律、行政法规、地方性法规、自治条例和单行条例、规章都不得同宪法相抵触。' },
      { rank: 2, tier: '法律', note: '全国人民代表大会及其常务委员会制定，效力高于行政法规、地方性法规、规章。' },
      { rank: 3, tier: '行政法规', note: '国务院制定，效力高于地方性法规、规章。' },
      { rank: 4, tier: '地方性法规 / 自治条例 / 单行条例 / 经济特区法规', note: '有地方立法权的人民代表大会及其常务委员会制定，效力高于本级和下级地方政府规章。' },
      { rank: 5, tier: '规章', note: '部门规章与地方政府规章在各自权限范围内施行，具有同等效力。' },
      { rank: 6, tier: '司法解释与规范性文件', note: '对法律具体应用问题的解释，不得同宪法、法律相抵触。' },
    ];

    const PRINCIPLES = [
      { title: '法定权限', text: '法无授权不可为。任何公权力的行使必须有法律依据；对私权主体而言，法无禁止即可为。', basis: '《宪法》第五条、《行政处罚法》第四条' },
      { title: '程序合法', text: '实体决定必须经由法定程序作出。告知、听取陈述申辩、说明理由、送达、期限、救济途径，都是程序合法性的组成部分。', basis: '《行政处罚法》第四十四条至第四十六条' },
      { title: '比例原则', text: '手段与目的之间应当适度、必要。处罚与教育相结合，管制措施应以实现目的所必需者为限。', basis: '《行政处罚法》第五条、《行政强制法》第五条' },
      { title: '法律面前一律平等', text: '任何组织或者个人都不得有超越宪法和法律的特权。', basis: '《宪法》第五条、《刑法》第四条' },
      { title: '诚实信用', text: '民事主体从事民事活动，应当遵循诚信原则，秉持诚实，恪守承诺。', basis: '《民法典》第七条' },
      { title: '公序良俗', text: '民事主体从事民事活动，不得违反法律，不得违背公序良俗。', basis: '《民法典》第八条' },
      { title: '法律保留', text: '限制人身自由、设定行政许可与处罚、征收征用等事项，只能由法律设定；行政法规、规章不得越位。', basis: '《立法法》第十一条' },
      { title: '过罚相当', text: '行政处罚应当与违法行为的事实、性质、情节以及社会危害程度相当。', basis: '《行政处罚法》第五条' },
      { title: '以事实为根据，以法律为准绳', text: '认定事实须有证据支持，适用法律须准确；举证责任由法律明确规定。', basis: '《刑事诉讼法》第六条、《民事诉讼法》第七条' },
      { title: '禁止权利滥用', text: '民事主体不得滥用民事权利损害国家利益、社会公共利益或者他人合法权益。', basis: '《民法典》第一百三十二条' },
      { title: '救济途径', text: '行政复议、行政诉讼、国家赔偿、检察监督、申诉控告，都是法定的权利救济渠道。', basis: '《行政复议法》、《行政诉讼法》、《国家赔偿法》' },
    ];

    const STATUTES = [
      { id: 'constitution', name: '《中华人民共和国宪法》', domain: 'constitutional', authority: '全国人民代表大会', summary: '国家的根本法。规定国家性质、根本制度、公民的基本权利与义务、国家机构组织与职权，是一切法律制度的效力源头。' },
      { id: 'legislation-law', name: '《中华人民共和国立法法》', domain: 'constitutional', authority: '全国人民代表大会', summary: '规定立法权限划分、立法程序、法律解释、效力层级与适用规则，是判断"哪一级规范说了算"的依据。' },
      { id: 'civil-code', name: '《中华人民共和国民法典》', domain: 'civil', authority: '全国人民代表大会', summary: '民事领域的基础性、综合性法律，调整平等主体的自然人、法人和非法人组织之间的人身关系与财产关系。' },
      { id: 'civil-code-contract', name: '《中华人民共和国民法典》合同编', domain: 'civil', authority: '全国人民代表大会', summary: '合同的订立、效力、履行、变更、转让、终止与违约责任的一般规则。' },
      { id: 'civil-code-family', name: '《中华人民共和国民法典》婚姻家庭编', domain: 'civil', authority: '全国人民代表大会', summary: '结婚、家庭关系、离婚、收养等婚姻家庭制度。' },
      { id: 'civil-code-succession', name: '《中华人民共和国民法典》继承编', domain: 'civil', authority: '全国人民代表大会', summary: '法定继承、遗嘱继承、遗赠与遗产处理。' },
      { id: 'criminal-law', name: '《中华人民共和国刑法》', domain: 'criminal', authority: '全国人民代表大会', summary: '规定犯罪与刑罚。刑罚分为主刑和附加刑；罪刑法定、适用刑法人人平等、罪责刑相适应是基本原则。' },
      { id: 'criminal-procedure-law', name: '《中华人民共和国刑事诉讼法》', domain: 'procedure', authority: '全国人民代表大会', summary: '规定刑事诉讼的立案、侦查、起诉、审判、执行程序与犯罪嫌疑人、被告人的诉讼权利。' },
      { id: 'civil-procedure-law', name: '《中华人民共和国民事诉讼法》', domain: 'procedure', authority: '全国人民代表大会常务委员会', summary: '规定民事诉讼的管辖、当事人、证据、审判程序与执行，是民事权利的程序保障。' },
      { id: 'administrative-procedure-law', name: '《中华人民共和国行政诉讼法》', domain: 'procedure', authority: '全国人民代表大会常务委员会', summary: '"民告官"的渠道，规定行政诉讼的受案范围、管辖、证据、审理与判决。' },
      { id: 'administrative-reconsideration-law', name: '《中华人民共和国行政复议法》', domain: 'procedure', authority: '全国人民代表大会常务委员会', summary: '行政机关系统内部的层级监督与救济制度，是行政诉讼之外的主要法定救济渠道。' },
      { id: 'state-compensation-law', name: '《中华人民共和国国家赔偿法》', domain: 'procedure', authority: '全国人民代表大会常务委员会', summary: '国家机关和国家机关工作人员违法行使职权造成损害时的国家赔偿制度。' },
      { id: 'administrative-penalty-law', name: '《中华人民共和国行政处罚法》', domain: 'administrative', authority: '全国人民代表大会', summary: '规范行政处罚的设定与实施。处罚法定、公正公开、过罚相当、处罚与教育相结合是基本原则。' },
      { id: 'administrative-licensing-law', name: '《中华人民共和国行政许可法》', domain: 'administrative', authority: '全国人民代表大会常务委员会', summary: '规范行政许可的设定与实施，防止设置不合理的准入限制。' },
      { id: 'administrative-compulsion-law', name: '《中华人民共和国行政强制法》', domain: 'administrative', authority: '全国人民代表大会常务委员会', summary: '规范行政强制措施与行政强制执行，强调适当、必要，教育与强制相结合。' },
      { id: 'public-security-penalty-law', name: '《中华人民共和国治安管理处罚法》', domain: 'administrative', authority: '全国人民代表大会常务委员会', summary: '对扰乱公共秩序、妨害公共安全、侵犯人身权利、财产权利，妨害社会管理，具有社会危害性但尚不够刑事处罚的行为给予处罚。' },
      { id: 'personal-information-protection-law', name: '《中华人民共和国个人信息保护法》', domain: 'digital', authority: '全国人民代表大会常务委员会', summary: '个人信息处理活动的基本准则：合法、正当、必要、诚信；最小范围处理；不得过度处理。' },
      { id: 'data-security-law', name: '《中华人民共和国数据安全法》', domain: 'digital', authority: '全国人民代表大会常务委员会', summary: '规范数据处理活动，保障数据安全，促进数据开发利用，实行数据分类分级保护。' },
      { id: 'cybersecurity-law', name: '《中华人民共和国网络安全法》', domain: 'digital', authority: '全国人民代表大会常务委员会', summary: '保障网络安全，维护网络空间主权和国家安全、社会公共利益，保护公民、法人和其他组织的合法权益。' },
      { id: 'company-law', name: '《中华人民共和国公司法》', domain: 'economic', authority: '全国人民代表大会常务委员会', summary: '规范公司的组织和行为，保护公司、股东、职工和债权人的合法权益。' },
      { id: 'anti-unfair-competition-law', name: '《中华人民共和国反不正当竞争法》', domain: 'economic', authority: '全国人民代表大会常务委员会', summary: '禁止混淆、商业贿赂、虚假宣传、侵犯商业秘密、不正当有奖销售、商业诋毁与网络不正当竞争等行为。' },
      { id: 'consumer-protection-law', name: '《中华人民共和国消费者权益保护法》', domain: 'economic', authority: '全国人民代表大会常务委员会', summary: '保护消费者的合法权益，规定经营者的义务与争议解决途径。' },
      { id: 'copyright-law', name: '《中华人民共和国著作权法》', domain: 'ip', authority: '全国人民代表大会常务委员会', summary: '保护文学、艺术和科学作品作者的著作权，以及与著作权有关的权益。' },
      { id: 'labor-law', name: '《中华人民共和国劳动法》', domain: 'labor', authority: '全国人民代表大会常务委员会', summary: '保护劳动者合法权益，调整劳动关系，建立和维护适应社会主义市场经济的劳动制度。' },
      { id: 'labor-contract-law', name: '《中华人民共和国劳动合同法》', domain: 'labor', authority: '全国人民代表大会常务委员会', summary: '劳动合同的订立、履行、变更、解除和终止，以及劳务派遣等特殊用工形式。' },
    ];

    const GUARD_TITLES = {
      'personal-data-bulk': '可能涉及个人信息的批量处理',
      'data-export-outbound': '可能涉及数据出境或凭据外泄',
      'destructive-operation': '不可逆的删除或破坏性操作',
      'security-testing': '可能涉及网络安全测试或侵入行为',
      'scraping-and-collection': '批量数据采集',
      'illegal-content': '可能涉及违法信息内容',
      'copyright-infringement': '可能涉及著作权侵权',
    };

    const DOMAINS = {
      constitutional: '宪法与国家制度',
      civil: '民事',
      criminal: '刑事',
      administrative: '行政',
      economic: '经济与市场',
      digital: '数据与网络',
      ip: '知识产权',
      labor: '劳动与社会保障',
      procedure: '程序与救济',
    };

    /* ───────────────────────── 组件 ───────────────────────── */

    function Item(props) {
      return h('li', { className: 'dsh-rol__item' },
        h('b', null, props.title),
        props.children,
        props.basis ? h('span', { className: 'dsh-rol__basis' }, '依据：' + props.basis) : null,
      );
    }

    function Panel(props) {
      const v = props.view;
      const stats = v.stats || {};
      const statIds = Object.keys(stats);
      const children = [];

      children.push(h('div', { className: 'dsh-rol__head', key: 'head' },
        h('div', null,
          h('h2', { className: 'dsh-rol__title' }, '法律至上'),
          h('p', { className: 'dsh-rol__sub' }, '以《中华人民共和国法律》为判断依据'),
        ),
        h('span', {
          className: 'dsh-rol__badge ' + (v.enabled ? 'dsh-rol__badge--on' : 'dsh-rol__badge--off'),
        }, v.enabled ? '已启用' : '已停用'),
      ));

      children.push(h('div', { key: 'note' },
        h('p', { className: 'dsh-rol__note' }, v.enabled
          ? '提示词会按《中华人民共和国法律》改写；工具调用时追加合法性提示（只提示，不阻断）。'
          : '当前不改写提示词，也不追加合法性提示。'),
        v.local
          ? h('p', { className: 'dsh-rol__note dsh-rol__note--local' }, '（未连接宿主 RPC，以下为本地内嵌数据；用 /law 命令查看实时状态）')
          : null,
        h('div', { className: 'dsh-rol__actions' },
          h('button', {
            className: 'dsh-rol__btn',
            onClick: () => props.onToggle(!v.enabled),
            disabled: props.busy,
          }, v.enabled ? '停用' : '启用'),
          h('button', {
            className: 'dsh-rol__btn',
            onClick: props.onRefresh,
            disabled: props.busy,
          }, '刷新'),
        ),
      ));

      children.push(h('div', { className: 'dsh-rol__stats', key: 'stats' },
        h('span', { className: 'dsh-rol__stat' }, v.statuteCount + ' 部法律'),
        h('span', { className: 'dsh-rol__stat' }, v.principleCount + ' 条原则'),
        h('span', { className: 'dsh-rol__stat' }, v.guardRuleCount + ' 条提示规则'),
      ));

      children.push(h('div', { className: 'dsh-rol__section', key: 'hierarchy' },
        h('h3', { className: 'dsh-rol__h3' }, '效力层级'),
        h('ul', { className: 'dsh-rol__list' }, HIERARCHY.map((x, i) =>
          h('li', { className: 'dsh-rol__item', key: 'h' + i },
            h('span', { className: 'dsh-rol__rank' }, x.rank + '. '),
            h('b', null, x.tier),
            x.note,
          ),
        )),
      ));

      children.push(h('div', { className: 'dsh-rol__section', key: 'principles' },
        h('h3', { className: 'dsh-rol__h3' }, '核心原则'),
        h('ul', { className: 'dsh-rol__list' }, PRINCIPLES.map((p, i) =>
          h(Item, { key: 'p' + i, title: p.title + '：', basis: p.basis }, p.text),
        )),
      ));

      const statChildren = statIds.length
        ? [h('ul', { className: 'dsh-rol__list', key: 'list' },
            statIds.sort((a, b) => stats[b] - stats[a]).map((id) =>
              h('li', { className: 'dsh-rol__item', key: id },
                (GUARD_TITLES[id] || id) + ' × ' + stats[id]),
            ))]
        : [h('p', { className: 'dsh-rol__empty', key: 'empty' }, '暂无命中记录。')];
      children.push(h('div', { className: 'dsh-rol__section', key: 'guard' },
        h('h3', { className: 'dsh-rol__h3' }, '合法性提示命中统计'),
        statChildren,
      ));

      const order = [];
      const byDomain = {};
      STATUTES.forEach((s) => {
        if (!byDomain[s.domain]) { byDomain[s.domain] = []; order.push(s.domain); }
        byDomain[s.domain].push(s);
      });
      children.push(h('div', { className: 'dsh-rol__section', key: 'book' },
        h('h3', { className: 'dsh-rol__h3' }, '内置法律索引'),
        h('div', { className: 'dsh-rol__groups' }, order.map((d) =>
          h('div', { className: 'dsh-rol__group', key: 'g' + d },
            h('h4', { className: 'dsh-rol__h4' }, DOMAINS[d] || d),
            h('ul', { className: 'dsh-rol__list' }, byDomain[d].map((s) =>
              h(Item, { key: s.id, title: s.name, basis: s.authority }, s.summary),
            )),
          ),
        )),
      ));

      return h('div', { className: 'dsh-rol' }, children);
    }

    /* ───────────────────────── 样式 ───────────────────────── */

    const CSS = [
      '.dsh-rol { display: flex; flex-direction: column; gap: 18px; }',
      '.dsh-rol__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }',
      '.dsh-rol__title { margin: 0; font-size: 18px; font-weight: 600; color: var(--dsw-alias-label-primary, inherit); }',
      '.dsh-rol__sub { margin: 4px 0 0; font-size: 12px; color: var(--dsw-alias-label-secondary, inherit); }',
      '.dsh-rol__badge { font-size: 11px; padding: 2px 8px; border-radius: 999px; white-space: nowrap; border: 1px solid var(--dsw-alias-border-l1, currentColor); color: var(--dsw-alias-label-secondary, inherit); }',
      '.dsh-rol__badge--on { color: var(--dsw-alias-state-success-primary, #0f9d58); border-color: currentColor; }',
      '.dsh-rol__badge--off { color: var(--dsw-alias-state-idle-primary, #888); border-color: currentColor; }',
      '.dsh-rol__note { font-size: 12px; line-height: 1.6; color: var(--dsw-alias-label-secondary, inherit); padding: 10px 12px; border-radius: 8px; background: var(--dsw-alias-bg-layer-2, transparent); }',
      '.dsh-rol__note--local { margin-top: 8px; font-size: 11px; opacity: .8; }',
      '.dsh-rol__actions { display: flex; gap: 8px; margin-top: 8px; }',
      '.dsh-rol__btn { font-size: 12px; padding: 5px 12px; border-radius: 6px; cursor: pointer; border: 1px solid var(--dsw-alias-border-l2, currentColor); background: var(--dsw-alias-bg-layer-1, transparent); color: var(--dsw-alias-label-primary, inherit); }',
      '.dsh-rol__btn:hover { border-color: var(--dsw-alias-brand-primary, currentColor); }',
      '.dsh-rol__btn:disabled { opacity: .5; cursor: default; }',
      '.dsh-rol__stats { display: flex; flex-wrap: wrap; gap: 8px; }',
      '.dsh-rol__stat { font-size: 12px; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l1, currentColor); color: var(--dsw-alias-label-secondary, inherit); }',
      '.dsh-rol__section { display: flex; flex-direction: column; gap: 8px; }',
      '.dsh-rol__h3 { margin: 0; font-size: 13px; font-weight: 600; color: var(--dsw-alias-label-primary, inherit); }',
      '.dsh-rol__list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }',
      '.dsh-rol__item { font-size: 12px; line-height: 1.65; color: var(--dsw-alias-label-secondary, inherit); }',
      '.dsh-rol__item b { color: var(--dsw-alias-label-primary, inherit); font-weight: 600; }',
      '.dsh-rol__basis { display: block; font-size: 11px; opacity: .75; margin-top: 2px; }',
      '.dsh-rol__rank { display: inline-block; min-width: 18px; font-variant-numeric: tabular-nums; color: var(--dsw-alias-brand-primary, inherit); font-weight: 600; }',
      '.dsh-rol__groups { display: flex; flex-direction: column; gap: 14px; }',
      '.dsh-rol__group { display: flex; flex-direction: column; gap: 6px; }',
      '.dsh-rol__h4 { margin: 0; font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-primary, inherit); }',
      '.dsh-rol__empty { font-size: 12px; color: var(--dsw-alias-label-secondary, inherit); }',
    ].join('\n');

    /** 组件内联样式：卸载时随组件一起消失，无需手动清理。 */
    function Styles() {
      return h('style', null, CSS);
    }

    /* ───────────────────────── 插件体 ───────────────────────── */

    function apply(ctx) {
      /** 宿主 RPC；拿不到就是 null，面板退回本地数据。 */
      let rpc = null;
      try {
        if (typeof host === 'object' && host && typeof host.call === 'function') rpc = host;
      } catch { /* 没有 host builtin */ }

      const listeners = [];
      let remote = null;   // 宿主快照
      let localEnabled = true;
      let busy = false;

      const notify = () => { listeners.forEach((fn) => { try { fn(); } catch { /* 单个订阅者崩了不影响其他 */ } }); };
      const subscribe = (fn) => {
        listeners.push(fn);
        return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
      };

      const view = () => ({
        enabled: remote && typeof remote.enabled === 'boolean' ? remote.enabled : localEnabled,
        local: rpc === null,
        statuteCount: STATUTES.length,
        principleCount: PRINCIPLES.length,
        guardRuleCount: Object.keys(GUARD_TITLES).length,
        stats: (remote && remote.stats) || {},
      });

      const readRemote = () => {
        if (!rpc) return Promise.resolve();
        busy = true; notify();
        return rpc.call('snapshot')
          .then((v) => { remote = v && typeof v === 'object' ? v : null; })
          .catch(() => { rpc = null; })
          .then(() => { busy = false; notify(); });
      };

      const toggle = (next) => {
        localEnabled = next;
        if (!rpc) { notify(); return Promise.resolve(); }
        busy = true; notify();
        return rpc.call('setEnabled', { enabled: next })
          .then(readRemote)
          .catch(() => { rpc = null; busy = false; notify(); });
      };

      /** 包装组件：订阅宿主状态，状态一变就重渲染。 */
      function Wrapper() {
        const [snap, setSnap] = React.useState(view());
        React.useEffect(() => subscribe(() => setSnap(view())), []);
        return h('div', null,
          h(Styles),
          h(Panel, {
            view: snap,
            busy,
            onRefresh: readRemote,
            onToggle: toggle,
          }),
        );
      }

      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'dsh-rule-of-law',
        order: 50,
        label: '法律至上',
      }, Wrapper));

      // 首屏读一次宿主状态
      readRemote();

      return { dispose: () => { listeners.length = 0; } };
    }

    return { inject: ['slots'], apply };
  },
});
