/**
 * dsh-rule-of-law — 浏览器半边（自包含，无构建步骤）
 *
 * 做什么：
 *   · 在设置面板加一页「法律至上」：效力层级、核心原则、内置法律索引、合法性提示命中统计；
 *   · 提供启用/停用开关（宿主支持 RPC 时写回宿主；不支持时仅在本地记住选择）。
 *
 * 挂载方式（与 dsh-codex-effort 同一套纪律）：
 *   · 注册进 `settings.section`（list 槽位，优先级 0，与内置设置页共存，不遮蔽任何东西）；
 *   · React 运行时自己解析，拿不到就**安静退出**——绝不因为本插件让设置面板挂掉。
 *
 * 关于数据来源（重要设计决定）：
 *   浏览器半边通过 `window.__ModuleLoader__` 加载，运行在一个 CommonJS 风格的
 *   factory 里，**无法 import 宿主半边的 ESM 模块**。所以这里内嵌一份
 *   `DATA`（与 core/law-data.mjs 的 compactSummary() 内容一致）。
 *   代价是两处要同步；好处是**完全不依赖 RPC 也能渲染**，
 *   不会因为宿主没接上 RPC 就让整个面板空白。
 *   （README 的"已知取舍"一节记着这件事。）
 *
 *   RPC 只作为增强：宿主若提供了 snapshot/setEnabled，命中统计与开关就是实时的；
 *   否则面板照常展示法律框架，只是统计显示为本地记录。
 *
 * 纪律：
 *   A. apply() 绝不抛错。
 *   B. 渲染失败连续 3 次就自动注销自己，把界面还给 DSH。
 *   C. 不写 localStorage、不联网。
 */
window.__ModuleLoader__.load({
  id: 'dsh-rule-of-law',
  factory: function (require) {
    'use strict';

    var module = { exports: {} };
    var PACKAGE_ID = 'dsh-rule-of-law';
    var SLOT = 'settings.section';
    var STYLE_ID = PACKAGE_ID + ':styles';
    var POLL_MS = 5000;

    /* ───────────────────────── 内嵌数据（与 core/law-data.mjs 保持一致） ───────────────────────── */

    var DATA = {
      hierarchy: [
        { rank: 1, tier: '宪法', note: '国家根本法，具有最高的法律效力；一切法律、行政法规、地方性法规、自治条例和单行条例、规章都不得同宪法相抵触。' },
        { rank: 2, tier: '法律', note: '全国人民代表大会及其常务委员会制定，效力高于行政法规、地方性法规、规章。' },
        { rank: 3, tier: '行政法规', note: '国务院制定，效力高于地方性法规、规章。' },
        { rank: 4, tier: '地方性法规 / 自治条例 / 单行条例 / 经济特区法规', note: '有地方立法权的人民代表大会及其常务委员会制定，效力高于本级和下级地方政府规章。' },
        { rank: 5, tier: '规章', note: '部门规章与地方政府规章在各自权限范围内施行，具有同等效力。' },
        { rank: 6, tier: '司法解释与规范性文件', note: '对法律具体应用问题的解释，不得同宪法、法律相抵触。' },
      ],
      principles: [
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
      ],
      statutes: [
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
      ],
    };

    var GUARD_RULE_TITLES = {
      'personal-data-bulk': '可能涉及个人信息的批量处理',
      'data-export-outbound': '可能涉及数据出境或凭据外泄',
      'destructive-operation': '不可逆的删除或破坏性操作',
      'security-testing': '可能涉及网络安全测试或侵入行为',
      'scraping-and-collection': '批量数据采集',
      'illegal-content': '可能涉及违法信息内容',
      'copyright-infringement': '可能涉及著作权侵权',
    };

    var ZH = {
      title: '法律至上',
      subtitle: '以《中华人民共和国法律》为判断依据',
      enabled: '已启用',
      disabled: '已停用',
      toggleOn: '启用',
      toggleOff: '停用',
      refreshing: '正在读取…',
      refresh: '刷新',
      empty: '暂无命中记录。',
      hierarchy: '效力层级',
      principles: '核心原则',
      statutes: '内置法律索引',
      guardStats: '合法性提示命中统计',
      counts: '部法律',
      principlesUnit: '条原则',
      rulesUnit: '条提示规则',
      replacementUnit: '条替换规则',
      noteOn: '提示词会按《中华人民共和国法律》改写；工具调用时追加合法性提示（只提示，不阻断）。',
      noteOff: '当前不改写提示词，也不追加合法性提示。',
      localNote: '（未连接宿主 RPC，以下为本地内嵌数据；用 /law 命令查看实时状态）',
      basis: '依据',
      domain: {
        constitutional: '宪法与国家制度',
        civil: '民事',
        criminal: '刑事',
        administrative: '行政',
        economic: '经济与市场',
        digital: '数据与网络',
        ip: '知识产权',
        labor: '劳动与社会保障',
        procedure: '程序与救济',
      },
    };

    /* ───────────────────────── 取 React ───────────────────────── */

    var loaderRequire = typeof require === 'function' ? require : null;

    function resolveReact() {
      try {
        if (loaderRequire) {
          var viaRequire = loaderRequire('react');
          if (viaRequire && typeof viaRequire.createElement === 'function') return viaRequire;
        }
      } catch (error) { /* 继续往下试 */ }
      try {
        var global = (typeof window !== 'undefined' && window.React) || null;
        if (global && typeof global.createElement === 'function') return global;
      } catch (error) { /* 继续往下试 */ }
      return null;
    }

    /* ───────────────────────── 样式 ───────────────────────── */

    var CSS_TEXT = [
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

    function installStyles(doc) {
      try {
        if (doc.getElementById(STYLE_ID)) return;
        var style = doc.createElement('style');
        style.id = STYLE_ID;
        style.textContent = CSS_TEXT;
        (doc.head || doc.documentElement).appendChild(style);
      } catch (error) { /* 没有样式只是难看一点，不影响功能 */ }
    }

    function removeStyles(doc) {
      try {
        var style = doc.getElementById(STYLE_ID);
        if (style && style.parentNode) style.parentNode.removeChild(style);
      } catch (error) { /* ignore */ }
    }

    /* ───────────────────────── 渲染 ───────────────────────── */

    function createComponent(React) {
      function Item(props) {
        return React.createElement(
          'li',
          { className: 'dsh-rol__item' },
          React.createElement('b', null, props.title),
          props.children,
          props.basis ? React.createElement('span', { className: 'dsh-rol__basis' }, ZH.basis + '：' + props.basis) : null,
        );
      }

      function Panel(props) {
        var t = ZH;
        var view = props.view;
        var hierarchy = view.hierarchy || [];
        var principles = view.principles || [];
        var statutes = view.statutes || [];
        var stats = view.stats || {};
        var statIds = Object.keys(stats);
        var children = [];

        /* 头部 */
        children.push(
          React.createElement(
            'div',
            { className: 'dsh-rol__head', key: 'head' },
            React.createElement(
              'div',
              null,
              React.createElement('h2', { className: 'dsh-rol__title' }, t.title),
              React.createElement('p', { className: 'dsh-rol__sub' }, t.subtitle),
            ),
            React.createElement(
              'span',
              { className: 'dsh-rol__badge ' + (view.enabled ? 'dsh-rol__badge--on' : 'dsh-rol__badge--off') },
              view.enabled ? t.enabled : t.disabled,
            ),
          ),
        );

        /* 说明 + 开关 */
        children.push(
          React.createElement(
            'div',
            { key: 'note' },
            React.createElement('p', { className: 'dsh-rol__note' }, view.enabled ? t.noteOn : t.noteOff),
            view.local
              ? React.createElement('p', { className: 'dsh-rol__note dsh-rol__note--local' }, t.localNote)
              : null,
            React.createElement(
              'div',
              { className: 'dsh-rol__actions' },
              React.createElement(
                'button',
                { className: 'dsh-rol__btn', onClick: function () { props.onToggle(!view.enabled); }, disabled: props.busy },
                view.enabled ? t.toggleOff : t.toggleOn,
              ),
              React.createElement(
                'button',
                { className: 'dsh-rol__btn', onClick: props.onRefresh, disabled: props.busy },
                t.refresh,
              ),
            ),
          ),
        );

        /* 计数 */
        children.push(
          React.createElement(
            'div',
            { className: 'dsh-rol__stats', key: 'stats' },
            React.createElement('span', { className: 'dsh-rol__stat' }, view.statuteCount + ' ' + t.counts),
            React.createElement('span', { className: 'dsh-rol__stat' }, view.principleCount + ' ' + t.principlesUnit),
            React.createElement('span', { className: 'dsh-rol__stat' }, view.guardRuleCount + ' ' + t.rulesUnit),
            React.createElement('span', { className: 'dsh-rol__stat' }, view.replacementRuleCount + ' ' + t.replacementUnit),
          ),
        );

        /* 效力层级 */
        children.push(
          React.createElement(
            'div',
            { className: 'dsh-rol__section', key: 'hierarchy' },
            React.createElement('h3', { className: 'dsh-rol__h3' }, t.hierarchy),
            React.createElement(
              'ul',
              { className: 'dsh-rol__list' },
              hierarchy.map(function (h, index) {
                return React.createElement(
                  'li',
                  { className: 'dsh-rol__item', key: 'h' + index },
                  React.createElement('span', { className: 'dsh-rol__rank' }, h.rank + '. '),
                  React.createElement('b', null, h.tier),
                  h.note,
                );
              }),
            ),
          ),
        );

        /* 核心原则 */
        children.push(
          React.createElement(
            'div',
            { className: 'dsh-rol__section', key: 'principles' },
            React.createElement('h3', { className: 'dsh-rol__h3' }, t.principles),
            React.createElement(
              'ul',
              { className: 'dsh-rol__list' },
              principles.map(function (p, index) {
                return React.createElement(Item, { key: 'p' + index, title: p.title + '：', basis: p.basis }, p.text);
              }),
            ),
          ),
        );

        /* 命中统计 */
        var statChildren;
        if (!statIds.length) {
          statChildren = [React.createElement('p', { className: 'dsh-rol__empty', key: 'empty' }, t.empty)];
        } else {
          statChildren = [
            React.createElement(
              'ul',
              { className: 'dsh-rol__list', key: 'list' },
              statIds
                .sort(function (a, b) { return stats[b] - stats[a]; })
                .map(function (id) {
                  var label = GUARD_RULE_TITLES[id] || id;
                  return React.createElement('li', { className: 'dsh-rol__item', key: id }, label + ' × ' + stats[id]);
                }),
            ),
          ];
        }
        children.push(
          React.createElement(
            'div',
            { className: 'dsh-rol__section', key: 'guard' },
            React.createElement('h3', { className: 'dsh-rol__h3' }, t.guardStats),
            statChildren,
          ),
        );

        /* 法律索引（按 domain 分组） */
        var order = [];
        var byDomain = {};
        statutes.forEach(function (s) {
          if (!byDomain[s.domain]) {
            byDomain[s.domain] = [];
            order.push(s.domain);
          }
          byDomain[s.domain].push(s);
        });
        var groups = order.map(function (domain) {
          return React.createElement(
            'div',
            { className: 'dsh-rol__group', key: 'g' + domain },
            React.createElement('h4', { className: 'dsh-rol__h4' }, t.domain[domain] || domain),
            React.createElement(
              'ul',
              { className: 'dsh-rol__list' },
              byDomain[domain].map(function (s) {
                return React.createElement(Item, { key: s.id, title: s.name, basis: s.authority }, s.summary);
              }),
            ),
          );
        });
        children.push(
          React.createElement(
            'div',
            { className: 'dsh-rol__section', key: 'book' },
            React.createElement('h3', { className: 'dsh-rol__h3' }, t.statutes),
            React.createElement('div', { className: 'dsh-rol__groups' }, groups),
          ),
        );

        return React.createElement('div', { className: 'dsh-rol' }, children);
      }

      Panel.displayName = 'RuleOfLawPanel';
      return Panel;
    }

    /* ───────────────────────── 渲染边界 ───────────────────────── */

    function createBoundary(React, Inner, onFailure, limit) {
      return class extends React.Component {
        constructor(props) {
          super(props);
          this.state = { failed: false };
          this.attempts = 0;
        }
        static getDerivedStateFromError() {
          return { failed: true };
        }
        componentDidCatch(error) {
          this.attempts += 1;
          var attempt = this.attempts;
          var giveUp = true;
          try {
            giveUp = onFailure(error, attempt) === false ? true : attempt >= limit;
          } catch (e) {
            giveUp = attempt >= limit;
          }
          if (giveUp) return;
          var self = this;
          try {
            setTimeout(function () {
              try {
                if (typeof self.setState === 'function') self.setState({ failed: false });
              } catch (e2) { /* 再次失败也无所谓 */ }
            }, 600 * attempt);
          } catch (e3) { /* 没有 setTimeout 就算了 */ }
        }
        render() {
          if (this.state.failed) return null;
          return React.createElement(Inner, this.props);
        }
      };
    }

    /* ───────────────────────── 插件体 ───────────────────────── */

    var inject = ['slots'];

    function apply(ctx) {
      var React = resolveReact();
      if (!React || typeof React.createElement !== 'function') {
        console.error('[' + PACKAGE_ID + '] 拿不到 React 运行时，法律面板不会挂载（DSH 设置面板不受影响）');
        return;
      }
      var doc = (typeof document !== 'undefined' && document) || null;
      if (!doc) {
        console.error('[' + PACKAGE_ID + '] 拿不到 document，法律面板不会挂载');
        return;
      }
      installStyles(doc);
      if (ctx && typeof ctx.effect === 'function') {
        ctx.effect(function () {
          return function () { removeStyles(doc); };
        }, PACKAGE_ID + ':styles');
      }

      /* 宿主 RPC：DSH 的 client builtin 提供 package-private 的 host.call。
       * 拿不到/调用失败都退回本地数据，面板照常可用。 */
      var hostRpc = null;
      try {
        if (typeof host === 'object' && host && typeof host.call === 'function') hostRpc = host;
      } catch (error) { /* 没有 host builtin */ }

      var localEnabled = true;
      var remoteStats = null;
      var remoteEnabled = null;
      var busy = false;
      var listeners = [];

      function notify() {
        for (var i = 0; i < listeners.length; i += 1) {
          try { listeners[i](); } catch (e) { /* 单个订阅者崩了不影响其他 */ }
        }
      }

      function subscribe(fn) {
        listeners.push(fn);
        return function () {
          var index = listeners.indexOf(fn);
          if (index >= 0) listeners.splice(index, 1);
        };
      }

      /** 组装的视图模型：优先远端，退回本地。 */
      function buildView() {
        var connected = hostRpc !== null;
        return {
          enabled: remoteEnabled === null ? localEnabled : remoteEnabled,
          local: !connected,
          statuteCount: DATA.statutes.length,
          principleCount: DATA.principles.length,
          guardRuleCount: Object.keys(GUARD_RULE_TITLES).length,
          replacementRuleCount: 0,
          stats: remoteStats || {},
          hierarchy: DATA.hierarchy,
          principles: DATA.principles,
          statutes: DATA.statutes,
        };
      }

      function readRemote() {
        if (!hostRpc) return Promise.resolve();
        busy = true;
        notify();
        return hostRpc
          .call('snapshot')
          .then(function (value) {
            if (value && typeof value === 'object') {
              remoteEnabled = typeof value.enabled === 'boolean' ? value.enabled : null;
              remoteStats = value.stats && typeof value.stats === 'object' ? value.stats : {};
            }
          })
          .catch(function (error) {
            console.warn('[' + PACKAGE_ID + '] 读取宿主状态失败，使用本地数据：', error);
            hostRpc = null;
          })
          .then(function () {
            busy = false;
            notify();
          });
      }

      function toggleRemote(next) {
        localEnabled = next;
        if (!hostRpc) {
          notify();
          return Promise.resolve();
        }
        busy = true;
        notify();
        return hostRpc
          .call('setEnabled', { enabled: next })
          .then(readRemote)
          .catch(function (error) {
            console.warn('[' + PACKAGE_ID + '] 切换宿主状态失败，仅本地生效：', error);
            hostRpc = null;
            busy = false;
            notify();
          });
      }

      function Wrapper(props) {
        var state = React.useState({ view: props.__getView(), busy: props.__getBusy() });
        var view = state[0].view;
        var busy = state[0].busy;
        var setState = state[1];

        React.useEffect(function () {
          var unsubscribe = props.__subscribe(function () {
            setState({ view: props.__getView(), busy: props.__getBusy() });
          });
          return unsubscribe;
        }, []);

        return React.createElement(Panel, {
          view: view,
          busy: busy,
          onRefresh: props.onRefresh,
          onToggle: props.onToggle,
        });
      }

      var Panel = createComponent(React);
      var Boundary = createBoundary(React, Wrapper, function (error, attempt) {
        try {
          console.warn('[' + PACKAGE_ID + '] 第 ' + attempt + ' 次渲染失败：' + String(error && error.message ? error.message : error));
        } catch (e) { /* ignore */ }
        return attempt < 3;
      }, 3);

      var registration = null;
      if (ctx && ctx.slots && typeof ctx.slots.register === 'function') {
        readRemote();
        registration = ctx.slots.register({
          name: SLOT,
          priority: 0,
          registrant: PACKAGE_ID,
          label: '法律至上',
          inject: function () {
            return {
              available: true,
              __getView: buildView,
              __getBusy: function () { return busy; },
              __subscribe: subscribe,
              onRefresh: readRemote,
              onToggle: toggleRemote,
            };
          },
        }, Boundary);
      } else {
        console.warn('[' + PACKAGE_ID + '] 宿主未提供 slots 服务，法律面板不会挂载');
      }

      var timer = null;
      try {
        timer = setInterval(readRemote, POLL_MS);
      } catch (e) { /* 没有定时器环境就放弃自动刷新 */ }

      return {
        dispose: function () {
          try { if (timer) clearInterval(timer); } catch (e) { /* ignore */ }
          timer = null;
          try { if (typeof registration === 'function') registration(); } catch (e) { /* ignore */ }
          registration = null;
          listeners.length = 0;
          removeStyles(doc);
        },
      };
    }

    module.exports = {
      apply: apply,
      inject: inject,
      __internals: {
        PACKAGE_ID: PACKAGE_ID,
        SLOT: SLOT,
        DATA: DATA,
        GUARD_RULE_TITLES: GUARD_RULE_TITLES,
        ZH: ZH,
        CSS_TEXT: CSS_TEXT,
        resolveReact: resolveReact,
        createComponent: createComponent,
        createBoundary: createBoundary,
        installStyles: installStyles,
        removeStyles: removeStyles,
      },
    };
    return module.exports;
  },
});
