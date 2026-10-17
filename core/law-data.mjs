/**
 * dsh-rule-of-law — 核心法律数据（纯数据 + 纯函数，可离线测试）
 *
 * 三条设计纪律：
 *  1. 只收录**现行有效**的法律名称与**精炼后的原则摘要**，不逐条抄录法条原文
 *     （避免体积失控，也避免把"摘要"当成"条文"误导模型）。
 *  2. 每条摘要都标注 `basis`（依据的法律条款），让模型可以追溯到具体规范。
 *  3. 所有判断都是**提示性**的：返回风险等级与说明文字，绝不代替人工或司法判断。
 */

export const PACKAGE_ID = 'dsh-rule-of-law';

/* ───────────────────────── 效力层级（《立法法》2023 修正） ───────────────────────── */

export const AUTHORITY_HIERARCHY = [
  {
    rank: 1,
    tier: '宪法',
    name: '《中华人民共和国宪法》',
    note: '国家根本法，具有最高的法律效力；一切法律、行政法规、地方性法规、自治条例和单行条例、规章都不得同宪法相抵触。',
    basis: '《宪法》序言、第五条',
  },
  {
    rank: 2,
    tier: '法律',
    name: '全国人民代表大会及其常务委员会制定的法律',
    note: '法律的效力高于行政法规、地方性法规、规章。全国人大常委会的法律解释同法律具有同等效力。',
    basis: '《立法法》第十条、第五十条',
  },
  {
    rank: 3,
    tier: '行政法规',
    name: '国务院制定的行政法规',
    note: '行政法规的效力高于地方性法规、规章；为执行法律的规定需要制定行政法规的事项，国务院可以制定。',
    basis: '《立法法》第六十五条、第七十二条',
  },
  {
    rank: 4,
    tier: '地方性法规 / 自治条例 / 单行条例 / 经济特区法规',
    name: '有地方立法权的人民代表大会及其常务委员会制定',
    note: '在不同宪法、法律、行政法规相抵触的前提下制定；效力高于本级和下级地方政府规章。',
    basis: '《立法法》第七十二条至第八十二条',
  },
  {
    rank: 5,
    tier: '规章',
    name: '部门规章与地方政府规章',
    note: '部门规章之间、部门规章与地方政府规章之间具有同等效力，在各自权限范围内施行。',
    basis: '《立法法》第九十一条、第九十二条',
  },
  {
    rank: 6,
    tier: '司法解释与规范性文件',
    name: '最高人民法院、最高人民检察院的司法解释等',
    note: '对法律具体应用问题的解释，不得同宪法、法律相抵触；不是独立的效力层级，但对审判、检察工作具有约束力。',
    basis: '《立法法》第一百一十九条',
  },
];

/* ───────────────────────── 法治的核心原则 ───────────────────────── */

export const LEGAL_PRINCIPLES = [
  {
    id: 'statutory-authority',
    title: '法定权限',
    text: '法无授权不可为。任何公权力的行使必须有法律依据；对私权主体而言，法无禁止即可为。',
    basis: '《宪法》第五条、《行政处罚法》第四条',
  },
  {
    id: 'due-process',
    title: '程序合法',
    text: '实体决定必须经由法定程序作出。告知、听取陈述申辩、说明理由、送达、期限、救济途径，都是程序合法性的组成部分。',
    basis: '《行政处罚法》第四十四条至第四十六条',
  },
  {
    id: 'proportionality',
    title: '比例原则',
    text: '手段与目的之间应当适度、必要。处罚与教育相结合，管制措施应以实现目的所必需者为限。',
    basis: '《行政处罚法》第五条、《行政强制法》第五条',
  },
  {
    id: 'equality',
    title: '法律面前一律平等',
    text: '任何组织或者个人都不得有超越宪法和法律的特权。',
    basis: '《宪法》第五条、《刑法》第四条',
  },
  {
    id: 'good-faith',
    title: '诚实信用',
    text: '民事主体从事民事活动，应当遵循诚信原则，秉持诚实，恪守承诺。',
    basis: '《民法典》第七条',
  },
  {
    id: 'public-order',
    title: '公序良俗',
    text: '民事主体从事民事活动，不得违反法律，不得违背公序良俗。',
    basis: '《民法典》第八条',
  },
  {
    id: 'law-preservation',
    title: '法律保留',
    text: '限制人身自由、设定行政许可与处罚、征收征用等事项，只能由法律设定；行政法规、规章不得越位。',
    basis: '《立法法》第十一条、《行政处罚法》第十一条至第十三条',
  },
  {
    id: 'liability-proportional',
    title: '过罚相当',
    text: '行政处罚应当与违法行为的事实、性质、情节以及社会危害程度相当。',
    basis: '《行政处罚法》第五条',
  },
  {
    id: 'evidence',
    title: '以事实为根据，以法律为准绳',
    text: '认定事实须有证据支持，适用法律须准确；举证责任由法律明确规定。',
    basis: '《刑事诉讼法》第六条、《民事诉讼法》第七条',
  },
  {
    id: 'no-abuse-of-right',
    title: '禁止权利滥用',
    text: '民事主体不得滥用民事权利损害国家利益、社会公共利益或者他人合法权益。',
    basis: '《民法典》第一百三十二条',
  },
  {
    id: 'recourse',
    title: '救济途径',
    text: '行政复议、行政诉讼、国家赔偿、检察监督、申诉控告，都是法定的权利救济渠道。',
    basis: '《行政复议法》、《行政诉讼法》、《国家赔偿法》',
  },
];

/* ───────────────────────── 精选核心法律清单 ─────────────────────────
 * domain 分类：
 *   constitutional   宪法与国家制度
 *   civil            民事
 *   criminal         刑事
 *   administrative   行政
 *   economic         经济与市场
 *   digital          数据与网络
 *   ip               知识产权
 *   labor            劳动与社会保障
 *   procedure        程序与救济
 * ------------------------------------------------------------------ */

export const STATUTE_BOOK = [
  /* —— 宪法与国家制度 —— */
  {
    id: 'constitution',
    name: '《中华人民共和国宪法》',
    domain: 'constitutional',
    rank: 1,
    authority: '全国人民代表大会',
    summary:
      '国家的根本法。规定国家性质、根本制度、公民的基本权利与义务、国家机构组织与职权，是一切法律制度的效力源头。',
    keyPoints: [
      '第五条：中华人民共和国实行依法治国，建设社会主义法治国家；任何组织或者个人都不得有超越宪法和法律的特权。',
      '第三十三条：中华人民共和国公民在法律面前一律平等。',
      '第十三条：公民的合法的私有财产不受侵犯。',
    ],
    basis: '《宪法》全文',
  },
  {
    id: 'legislation-law',
    name: '《中华人民共和国立法法》',
    domain: 'constitutional',
    rank: 2,
    authority: '全国人民代表大会',
    summary:
      '规定立法权限划分、立法程序、法律解释、效力层级与适用规则，是判断"哪一级规范说了算"的依据。',
    keyPoints: [
      '效力层级：宪法 > 法律 > 行政法规 > 地方性法规 > 规章。',
      '法律保留事项：犯罪和刑罚、对公民政治权利的剥夺、限制人身自由的强制措施和处罚、司法制度等，只能制定法律。',
      '同一机关制定的法律，特别规定与一般规定不一致的，适用特别规定；新的规定与旧的规定不一致的，适用新的规定。',
    ],
    basis: '《立法法》第十条、第十一条、第九十一条、第一百零三条',
  },

  /* —— 民事 —— */
  {
    id: 'civil-code',
    name: '《中华人民共和国民法典》',
    domain: 'civil',
    rank: 2,
    authority: '全国人民代表大会',
    summary:
      '民事领域的基础性、综合性法律，调整平等主体的自然人、法人和非法人组织之间的人身关系与财产关系。',
    keyPoints: [
      '第七条 诚信原则；第八条 公序良俗。',
      '第一百三十二条 禁止权利滥用：民事主体不得滥用民事权利损害国家利益、社会公共利益或者他人合法权益。',
      '第一千零三十二条 隐私权；第一千零三十四条 个人信息受法律保护。',
      '第一千一百六十五条 过错责任原则；第一千一百六十八条 共同侵权。',
    ],
    basis: '《民法典》总则编、人格权编、侵权责任编',
  },
  {
    id: 'civil-code-contract',
    name: '《中华人民共和国民法典》合同编',
    domain: 'civil',
    rank: 2,
    authority: '全国人民代表大会',
    summary: '合同的订立、效力、履行、变更、转让、终止与违约责任的一般规则。',
    keyPoints: [
      '第五百零九条 当事人应当按照约定全面履行自己的义务，并遵循诚信原则。',
      '第五百七十七条 当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任。',
    ],
    basis: '《民法典》合同编',
  },
  {
    id: 'civil-code-family',
    name: '《中华人民共和国民法典》婚姻家庭编',
    domain: 'civil',
    rank: 2,
    authority: '全国人民代表大会',
    summary: '结婚、家庭关系、离婚、收养等婚姻家庭制度。',
    keyPoints: ['第一千零四十一条 实行婚姻自由、一夫一妻、男女平等的婚姻制度。'],
    basis: '《民法典》婚姻家庭编',
  },
  {
    id: 'civil-code-succession',
    name: '《中华人民共和国民法典》继承编',
    domain: 'civil',
    rank: 2,
    authority: '全国人民代表大会',
    summary: '法定继承、遗嘱继承、遗赠与遗产处理。',
    keyPoints: [
      '第一千一百二十三条 继承开始后，按照法定继承办理；有遗嘱的，按照遗嘱继承或者遗赠办理；有遗赠扶养协议的，按照协议办理。',
    ],
    basis: '《民法典》继承编',
  },

  /* —— 刑事与程序 —— */
  {
    id: 'criminal-law',
    name: '《中华人民共和国刑法》',
    domain: 'criminal',
    rank: 2,
    authority: '全国人民代表大会',
    summary:
      '规定犯罪与刑罚。刑罚分为主刑和附加刑；罪刑法定、适用刑法人人平等、罪责刑相适应是基本原则。',
    keyPoints: [
      '第三条 罪刑法定：法律明文规定为犯罪行为的，依照法律定罪处刑；法律没有明文规定为犯罪行为的，不得定罪处刑。',
      '第四条 适用刑法人人平等。',
      '第十三条 犯罪定义与但书：情节显著轻微危害不大的，不认为是犯罪。',
      '第二十一条至第二十五条 正当防卫与紧急避险。',
    ],
    basis: '《刑法》总则',
  },
  {
    id: 'criminal-procedure-law',
    name: '《中华人民共和国刑事诉讼法》',
    domain: 'procedure',
    rank: 2,
    authority: '全国人民代表大会',
    summary: '规定刑事诉讼的立案、侦查、起诉、审判、执行程序与犯罪嫌疑人、被告人的诉讼权利。',
    keyPoints: [
      '第六条 以事实为根据，以法律为准绳。',
      '第十二条 未经人民法院依法判决，对任何人都不得确定有罪。',
      '第三十三条 犯罪嫌疑人、被告人有权获得辩护。',
    ],
    basis: '《刑事诉讼法》',
  },
  {
    id: 'civil-procedure-law',
    name: '《中华人民共和国民事诉讼法》',
    domain: 'procedure',
    rank: 2,
    authority: '全国人民代表大会常务委员会',
    summary: '规定民事诉讼的管辖、当事人、证据、审判程序与执行，是民事权利的程序保障。',
    keyPoints: [
      '第七条 以事实为根据，以法律为准绳。',
      '第八条 当事人诉讼权利平等。',
      '第六十七条 当事人对自己提出的主张，有责任提供证据。',
    ],
    basis: '《民事诉讼法》',
  },
  {
    id: 'administrative-procedure-law',
    name: '《中华人民共和国行政诉讼法》',
    domain: 'procedure',
    rank: 2,
    authority: '全国人民代表大会常务委员会',
    summary: '"民告官"的渠道，规定行政诉讼的受案范围、管辖、证据、审理与判决。',
    keyPoints: [
      '第二条 公民、法人或者其他组织认为行政机关和行政机关工作人员的行政行为侵犯其合法权益，有权依法向人民法院提起诉讼。',
      '第七十条 行政行为适用法律、法规错误等情形，人民法院判决撤销或者部分撤销，并可以判决被告重新作出行政行为。',
    ],
    basis: '《行政诉讼法》',
  },
  {
    id: 'administrative-reconsideration-law',
    name: '《中华人民共和国行政复议法》',
    domain: 'procedure',
    rank: 2,
    authority: '全国人民代表大会常务委员会',
    summary: '行政机关系统内部的层级监督与救济制度，是行政诉讼之外的主要法定救济渠道。',
    keyPoints: ['行政复议机关对被申请人作出的行政行为进行合法性、适当性审查。'],
    basis: '《行政复议法》',
  },
  {
    id: 'state-compensation-law',
    name: '《中华人民共和国国家赔偿法》',
    domain: 'procedure',
    rank: 2,
    authority: '全国人民代表大会常务委员会',
    summary: '国家机关和国家机关工作人员违法行使职权造成损害时的国家赔偿制度。',
    keyPoints: [
      '第二条 国家机关和国家机关工作人员行使职权，有本法规定的侵犯公民、法人和其他组织合法权益的情形，造成损害的，受害人有依法取得国家赔偿的权利。',
    ],
    basis: '《国家赔偿法》',
  },

  /* —— 行政 —— */
  {
    id: 'administrative-penalty-law',
    name: '《中华人民共和国行政处罚法》',
    domain: 'administrative',
    rank: 2,
    authority: '全国人民代表大会',
    summary:
      '规范行政处罚的设定与实施。处罚法定、公正公开、过罚相当、处罚与教育相结合是基本原则。',
    keyPoints: [
      '第四条 应当给予行政处罚的，依照本法由法律、法规、规章规定，并由行政机关依照本法规定的程序实施。',
      '第五条 过罚相当：行政处罚应当与违法行为的事实、性质、情节以及社会危害程度相当。',
      '第九条 行政处罚种类：警告、通报批评；罚款、没收违法所得、没收非法财物；暂扣许可证件、降低资质等级、吊销许可证件；限制开展生产经营活动、责令停产停业、责令关闭、限制从业；行政拘留；法律、行政法规规定的其他行政处罚。',
      '第四十二条 行政处罚应当由具有行政执法资格的执法人员实施。',
    ],
    basis: '《行政处罚法》',
  },
  {
    id: 'administrative-licensing-law',
    name: '《中华人民共和国行政许可法》',
    domain: 'administrative',
    rank: 2,
    authority: '全国人民代表大会常务委员会',
    summary: '规范行政许可的设定与实施，防止设置不合理的准入限制。',
    keyPoints: [
      '第十二条 可以设定行政许可的事项：直接涉及国家安全、公共安全、经济宏观调控、生态环境保护以及直接关系人身健康、生命财产安全等特定活动。',
      '第十三条 通过事后监督等方式能够解决的事项，可以不设行政许可。',
    ],
    basis: '《行政许可法》',
  },
  {
    id: 'administrative-compulsion-law',
    name: '《中华人民共和国行政强制法》',
    domain: 'administrative',
    rank: 2,
    authority: '全国人民代表大会常务委员会',
    summary: '规范行政强制措施与行政强制执行，强调适当、必要，教育与强制相结合。',
    keyPoints: [
      '第五条 采用非强制手段可以达到行政管理目的的，不得设定和实施行政强制。',
      '第十六条 行政机关履行行政管理职责，依照法律、法规的规定，实施行政强制措施。',
    ],
    basis: '《行政强制法》',
  },
  {
    id: 'public-security-penalty-law',
    name: '《中华人民共和国治安管理处罚法》',
    domain: 'administrative',
    rank: 2,
    authority: '全国人民代表大会常务委员会',
    summary:
      '对扰乱公共秩序、妨害公共安全、侵犯人身权利、财产权利，妨害社会管理，具有社会危害性但尚不够刑事处罚的行为给予处罚。',
    keyPoints: ['处罚种类：警告、罚款、行政拘留、吊销公安机关发放的许可证。'],
    basis: '《治安管理处罚法》',
  },

  /* —— 数据与网络 —— */
  {
    id: 'personal-information-protection-law',
    name: '《中华人民共和国个人信息保护法》',
    domain: 'digital',
    rank: 2,
    authority: '全国人民代表大会常务委员会',
    summary:
      '个人信息处理活动的基本准则：合法、正当、必要、诚信；最小范围处理；不得过度处理。',
    keyPoints: [
      '第五条 处理个人信息应当遵循合法、正当、必要和诚信原则，不得通过误导、欺诈、胁迫等方式处理。',
      '第六条 处理个人信息应当具有明确、合理的目的，采取对个人权益影响最小的方式；收集个人信息应当限于实现处理目的的最小范围。',
      '第十三条 处理的合法性基础：同意、订立或履行合同所必需、履行法定职责或义务所必需等。',
      '第二十八条 敏感个人信息（生物识别、宗教信仰、特定身份、医疗健康、金融账户、行踪轨迹等）的处理规则。',
      '第五十五条 个人信息保护影响评估。',
    ],
    basis: '《个人信息保护法》',
  },
  {
    id: 'data-security-law',
    name: '《中华人民共和国数据安全法》',
    domain: 'digital',
    rank: 2,
    authority: '全国人民代表大会常务委员会',
    summary: '规范数据处理活动，保障数据安全，促进数据开发利用，实行数据分类分级保护。',
    keyPoints: [
      '第二十一条 国家建立数据分类分级保护制度，对关系国家安全、国民经济命脉、重要民生、重大公共利益等数据实行更加严格的管理。',
      '第二十七条 开展数据处理活动应当依照法律、法规的规定，建立健全全流程数据安全管理制度。',
    ],
    basis: '《数据安全法》',
  },
  {
    id: 'cybersecurity-law',
    name: '《中华人民共和国网络安全法》',
    domain: 'digital',
    rank: 2,
    authority: '全国人民代表大会常务委员会',
    summary:
      '保障网络安全，维护网络空间主权和国家安全、社会公共利益，保护公民、法人和其他组织的合法权益。',
    keyPoints: [
      '网络运营者收集、使用个人信息，应当遵循合法、正当、必要的原则，公开收集、使用规则，明示目的、方式和范围，并经被收集者同意。',
      '任何个人和组织不得从事非法侵入他人网络、干扰他人网络正常功能、窃取网络数据等危害网络安全的活动。',
    ],
    basis: '《网络安全法》',
  },

  /* —— 经济与市场 —— */
  {
    id: 'company-law',
    name: '《中华人民共和国公司法》',
    domain: 'economic',
    rank: 2,
    authority: '全国人民代表大会常务委员会',
    summary: '规范公司的组织和行为，保护公司、股东、职工和债权人的合法权益。',
    keyPoints: [
      '公司从事经营活动，必须遵守法律、行政法规，遵守社会公德、商业道德，诚实守信，接受政府和社会公众的监督。',
    ],
    basis: '《公司法》',
  },
  {
    id: 'anti-unfair-competition-law',
    name: '《中华人民共和国反不正当竞争法》',
    domain: 'economic',
    rank: 2,
    authority: '全国人民代表大会常务委员会',
    summary:
      '禁止混淆、商业贿赂、虚假宣传、侵犯商业秘密、不正当有奖销售、商业诋毁与网络不正当竞争等行为。',
    keyPoints: [
      '第二条 经营者在生产经营活动中，应当遵循自愿、平等、公平、诚信的原则，遵守法律和商业道德。',
    ],
    basis: '《反不正当竞争法》',
  },
  {
    id: 'consumer-protection-law',
    name: '《中华人民共和国消费者权益保护法》',
    domain: 'economic',
    rank: 2,
    authority: '全国人民代表大会常务委员会',
    summary: '保护消费者的合法权益，规定经营者的义务与争议解决途径。',
    keyPoints: [
      '第八条 消费者享有知悉其购买、使用的商品或者接受的服务的真实情况的权利。',
    ],
    basis: '《消费者权益保护法》',
  },

  /* —— 知识产权 —— */
  {
    id: 'copyright-law',
    name: '《中华人民共和国著作权法》',
    domain: 'ip',
    rank: 2,
    authority: '全国人民代表大会常务委员会',
    summary: '保护文学、艺术和科学作品作者的著作权，以及与著作权有关的权益。',
    keyPoints: [
      '第二十四条 合理使用的具体情形，以及"不得影响该作品的正常使用，也不得不合理地损害著作权人的合法权益"的限制。',
      '第五十条 避开或者破坏权利人为保护著作权采取的技术措施可能承担民事责任乃至行政、刑事责任。',
    ],
    basis: '《著作权法》',
  },

  /* —— 劳动与社会保障 —— */
  {
    id: 'labor-law',
    name: '《中华人民共和国劳动法》',
    domain: 'labor',
    rank: 2,
    authority: '全国人民代表大会常务委员会',
    summary: '保护劳动者合法权益，调整劳动关系，建立和维护适应社会主义市场经济的劳动制度。',
    keyPoints: ['劳动者就业，不因民族、种族、性别、宗教信仰不同而受歧视。'],
    basis: '《劳动法》',
  },
  {
    id: 'labor-contract-law',
    name: '《中华人民共和国劳动合同法》',
    domain: 'labor',
    rank: 2,
    authority: '全国人民代表大会常务委员会',
    summary: '劳动合同的订立、履行、变更、解除和终止，以及劳务派遣等特殊用工形式。',
    keyPoints: ['第十条 建立劳动关系，应当订立书面劳动合同。'],
    basis: '《劳动合同法》',
  },
];

/* ───────────────────────── 工具调用合法性提示规则 ─────────────────────────
 *
 * 纪律：**只提示、不阻断**。
 * 每条规则命中后返回 { rule, level }。
 *   level: 'notice' | 'caution' | 'high'
 * 这些规则不是法律意见，只是把"可能触碰到的法律领域"提前摆到台面上，
 * 让模型与用户在知情的前提下继续。
 * ------------------------------------------------------------------------- */

export const GUARD_RULES = [
  {
    id: 'personal-data-bulk',
    level: 'caution',
    patterns: [
      '身份证|身份证号|手机号|电话号码|银行卡|银行账户|护照号|家庭住址',
      '(批量|全部|导出|下载).{0,12}(用户|客户|会员|员工|学生|病人|患者)名单',
    ],
    title: '可能涉及个人信息的批量处理',
    detail:
      '处理他人个人信息应有明确、合理的目的，并限于实现该目的的最小范围；处理敏感个人信息应具有特定的目的和充分的必要性，并采取严格保护措施。',
    basis: '《个人信息保护法》第六条、第二十八条、第二十九条、第五十五条',
    advice: '确认处理目的合法、范围最小化；涉及敏感个人信息时进行个人信息保护影响评估。',
  },
  {
    id: 'data-export-outbound',
    level: 'high',
    patterns: [
      '(上传|上传到|发送到|传输到|外发|同步到|提交到).{0,20}(境外|国外|海外|github|gitlab|gitee|npm|公网|云盘|oss|s3)',
      '(curl|wget|fetch|post|put).{0,60}(token|secret|password|api[_-]?key|credential)',
    ],
    title: '可能涉及数据出境或凭据外泄',
    detail:
      '向境外提供个人信息或重要数据应依法履行安全评估、标准合同、保护认证等程序；处理凭据信息应防止泄露。',
    basis: '《个人信息保护法》第三十八条至第四十三条；《数据安全法》第二十一条、第三十一条',
    advice: '确认外发内容不含个人信息与重要数据；凭据不得写入日志、提交进版本库或发往不可信端点。',
  },
  {
    id: 'destructive-operation',
    level: 'caution',
    patterns: [
      '\\brm\\s+(-[a-z]*[rf]|-r|-f|--recursive|--force)',
      '(shutil\\.rmtree|os\\.remove|os\\.rmdir|unlink|rmdir)\\s*\\(',
      '(drop\\s+table|drop\\s+database|truncate\\s+table|delete\\s+from)',
      'git\\s+push\\s+.*--force',
      'git\\s+reset\\s+--hard',
      '(mkfs|dd\\s+if=)',
    ],
    title: '不可逆的删除或破坏性操作',
    detail:
      '民事主体从事民事活动应当遵循诚信原则；权利人行使权利不得滥用民事权利损害他人合法权益。删除他人合法数据可能产生损害赔偿等民事责任。',
    basis: '《民法典》第七条、第一百三十二条、第一千一百六十五条',
    advice: '确认操作范围，先备份或改用可恢复方式；涉及他人数据的删除应有合同或法律依据。',
  },
  {
    id: 'security-testing',
    level: 'high',
    patterns: [
      'sqlmap|nmap|masscan|hydra|metasploit|msfvenom|nikto|dirb|gobuster',
      '(扫描|爆破|撞库|注入).{0,8}(认证|权限|验证|waf|绕过)',
      '(未授权|越权).{0,6}(访问|操作|测试)',
    ],
    title: '可能涉及网络安全测试或侵入行为',
    detail:
      '任何个人和组织不得从事非法侵入他人网络、干扰他人网络正常功能、窃取网络数据等危害网络安全的活动；违反国家有关规定向他人提供专门用于危害网络安全的程序、工具亦受禁止。',
    basis: '《网络安全法》第二十七条；《刑法》第二百八十五条、第二百八十六条',
    advice: '仅在获得明确书面授权的范围内测试并保留授权证明；未经授权不得对他人系统实施扫描、渗透或数据获取。',
  },
  {
    id: 'scraping-and-collection',
    level: 'notice',
    patterns: [
      '(爬虫|抓取|采集|scrape|crawl).{0,16}(批量|大量|全站|整站)',
      '(robots|反爬|频率限制|速率限制).{0,10}(绕过|突破|无视)',
    ],
    title: '批量数据采集',
    detail:
      '通过技术手段妨碍、破坏他人合法提供的网络产品或服务，或违反权利人访问控制规则批量获取数据，可能构成不正当竞争或侵权。',
    basis: '《反不正当竞争法》第二条、第十二条；《著作权法》第二十四条',
    advice: '遵守目标站点的服务条款与 robots 协议，控制请求频率，避免妨碍服务正常运行。',
  },
  {
    id: 'illegal-content',
    level: 'notice',
    patterns: [
      '(虚假|伪造|冒充|仿造).{0,10}(新闻|信息|身份|资质|证书|公章|签名)',
      '刷单|刷量|刷粉|控评|水军',
      '赌博|博彩|毒品|枪支|爆炸物',
    ],
    title: '可能涉及违法信息内容',
    detail:
      '编造、传播虚假信息，伪造、变造证件、印章，以及制作、传播法律禁止的内容，可能承担行政责任乃至刑事责任。',
    basis: '《治安管理处罚法》；《刑法》第二百八十条',
    advice: '不得生成、传播虚假信息或违法内容；确有必要处理的敏感内容应评估合法性与必要性。',
  },
  {
    id: 'copyright-infringement',
    level: 'notice',
    patterns: [
      '(下载|抓取|复制|搬运).{0,10}(整本|全套|全集|付费|会员|电子书|课程|论文|数据库)',
      '(破解|去广告|去除水印).{0,8}(版权|drm|付费墙)',
    ],
    title: '可能涉及著作权侵权',
    detail:
      '使用他人作品应当指明作者姓名或者名称、作品名称，并且不得影响该作品的正常使用，不得不合理地损害著作权人的合法权益；避开或破坏权利人为保护著作权采取的技术措施受禁止。',
    basis: '《著作权法》第二十四条、第五十条',
    advice: '确认使用的合法性基础（合理使用、许可、开源许可）；不得规避版权保护技术措施。',
  },
];

/* ───────────────────────── 道德/伦理 → 法律 表述替换表 ─────────────────────────
 *
 * 用法：对 system prompt 的**散文文本**做受控替换。
 * 每条 { id, term, replacement, note, enabled }：
 *   term        —— 要替换的措辞（自动加上中英混排安全的词边界）
 *   replacement —— 替换后的法律框架表述
 *   note        —— 为什么这样改（写进变更日志，供审计）
 *
 * 四条纪律：
 *  A. 只替换**明确的道德/伦理/价值观措辞**，不动技术性描述（工具用法、路径、代码）。
 *  B. 每条替换都可被 enabled=false 关掉，不搞"一刀切"。
 *  C. 替换是**幂等**的：替换后的文本不会再命中同一条规则。
 *  D. 长词优先：先替换短语，再替换单词，避免 "unethical" 被 "ethical" 规则咬掉前半截。
 * ----------------------------------------------------------------------------- */

export const REPLACEMENT_RULES = [
  /* —— 短语优先 —— */
  {
    id: 'do-the-right-thing',
    enabled: true,
    term: 'do the right thing',
    replacement: '依法行事',
    note: '"做正确的事"无法客观判定，改为"依法行事"。',
  },
  {
    id: 'the-right-thing',
    enabled: true,
    term: 'the right thing',
    replacement: '依法应当作出的行为',
    note: '消除主观正确性判断。',
  },
  {
    id: 'right-and-wrong',
    enabled: true,
    term: 'right and wrong',
    replacement: '合法与违法',
    note: '"对与错"改为"合法与违法"。',
  },
  {
    id: 'ethically-questionable',
    enabled: true,
    term: 'ethically questionable',
    replacement: '合法性存疑',
    note: '"伦理上可疑"改为"合法性存疑"，进入法律评估。',
  },
  {
    id: 'morally-wrong',
    enabled: true,
    term: 'morally wrong',
    replacement: '违反法律规定',
    note: '"道德上错误"改为"违反法律规定"。',
  },
  {
    id: 'morally-should',
    enabled: true,
    term: 'morally should',
    replacement: '依法应当',
    note: '"道德上应该"改为"依法应当"。',
  },
  {
    id: 'avoid-harm',
    enabled: true,
    term: 'avoid harm',
    replacement: '不得损害国家利益、社会公共利益或者他人合法权益',
    note: '"避免伤害"对应《民法典》第一百三十二条禁止权利滥用的客观标准。',
  },
  {
    id: 'human-values',
    enabled: true,
    term: 'human values',
    replacement: '现行法律秩序',
    note: '"人类价值观"改为"现行法律秩序"。',
  },
  {
    id: 'socially-acceptable',
    enabled: true,
    term: 'socially acceptable',
    replacement: '符合公序良俗',
    note: '"社会可接受"对应《民法典》第八条公序良俗。',
  },
  {
    id: 'culturally-appropriate',
    enabled: true,
    term: 'culturally appropriate',
    replacement: '不违背公序良俗',
    note: '"文化上适宜"改为不违背公序良俗。',
  },
  {
    id: 'responsible-ai',
    enabled: true,
    term: 'responsible AI',
    replacement: '合法合规的人工智能',
    note: '"负责任的 AI"改为"合法合规的人工智能"。',
  },
  {
    id: 'responsible-use',
    enabled: true,
    term: 'responsible use',
    replacement: '合法合规使用',
    note: '"负责任的使用"改为"合法合规使用"。',
  },
  {
    id: 'ethics-guidelines',
    enabled: true,
    term: 'ethics guidelines',
    replacement: '法律规范',
    note: '"伦理准则"改为"法律规范"。',
  },
  {
    id: 'ethical-guidelines',
    enabled: true,
    term: 'ethical guidelines',
    replacement: '法律规范',
    note: '"伦理准则"改为"法律规范"。',
  },
  {
    id: 'moral-principles',
    enabled: true,
    term: 'moral principles',
    replacement: '法律原则',
    note: '"道德原则"改为"法律原则"。',
  },
  {
    id: 'ethical-principles',
    enabled: true,
    term: 'ethical principles',
    replacement: '法律原则',
    note: '"伦理原则"改为"法律原则"。',
  },
  {
    id: 'ethical-standards',
    enabled: true,
    term: 'ethical standards',
    replacement: '法律标准',
    note: '"伦理标准"改为"法律标准"。',
  },
  {
    id: 'moral-standards',
    enabled: true,
    term: 'moral standards',
    replacement: '法律标准',
    note: '"道德标准"改为"法律标准"。',
  },
  {
    id: 'ethical-framework',
    enabled: true,
    term: 'ethical framework',
    replacement: '法律框架',
    note: '"伦理框架"改为"法律框架"。',
  },
  {
    id: 'moral-framework',
    enabled: true,
    term: 'moral framework',
    replacement: '法律框架',
    note: '"道德框架"改为"法律框架"。',
  },
  {
    id: 'ethical-considerations',
    enabled: true,
    term: 'ethical considerations',
    replacement: '法律评估',
    note: '"伦理考量"改为"法律评估"。',
  },
  {
    id: 'moral-reasoning',
    enabled: true,
    term: 'moral reasoning',
    replacement: '法律推理',
    note: '"道德推理"改为"法律推理"。',
  },
  {
    id: 'ethical-reasoning',
    enabled: true,
    term: 'ethical reasoning',
    replacement: '法律推理',
    note: '"伦理推理"改为"法律推理"。',
  },
  {
    id: 'zh-daodeshang',
    enabled: true,
    term: '道德上',
    replacement: '依法',
    note: '"道德上"改为"依法"。',
  },
  {
    id: 'zh-lunlishang',
    enabled: true,
    term: '伦理上',
    replacement: '依法',
    note: '"伦理上"改为"依法"。',
  },
  {
    id: 'zh-daodezhunze',
    enabled: true,
    term: '道德准则',
    replacement: '法律规范',
    note: '"道德准则"改为"法律规范"。',
  },
  {
    id: 'zh-lunlizhunze',
    enabled: true,
    term: '伦理准则',
    replacement: '法律规范',
    note: '"伦理准则"改为"法律规范"。',
  },
  {
    id: 'zh-daodebiaozhun',
    enabled: true,
    term: '道德标准',
    replacement: '法律标准',
    note: '"道德标准"改为"法律标准"。',
  },
  {
    id: 'zh-lunlibiaozhun',
    enabled: true,
    term: '伦理标准',
    replacement: '法律标准',
    note: '"伦理标准"改为"法律标准"。',
  },
  {
    id: 'zh-daodekuangjia',
    enabled: true,
    term: '道德框架',
    replacement: '法律框架',
    note: '"道德框架"改为"法律框架"。',
  },
  {
    id: 'zh-lunlikuangjia',
    enabled: true,
    term: '伦理框架',
    replacement: '法律框架',
    note: '"伦理框架"改为"法律框架"。',
  },
  {
    id: 'zh-daodepanduan',
    enabled: true,
    term: '道德判断',
    replacement: '法律判断',
    note: '"道德判断"改为"法律判断"。',
  },
  {
    id: 'zh-lunlipanduan',
    enabled: true,
    term: '伦理判断',
    replacement: '法律判断',
    note: '"伦理判断"改为"法律判断"。',
  },
  {
    id: 'zh-shanE',
    enabled: true,
    term: '善恶',
    replacement: '合法与违法',
    note: '"善恶"改为"合法与违法"。',
  },
  {
    id: 'zh-liangzhi',
    enabled: true,
    term: '良知',
    replacement: '诚信原则',
    note: '"良知"改为《民法典》第七条诚信原则。',
  },

  /* —— 单词 —— */
  {
    id: 'unethical',
    enabled: true,
    term: 'unethical',
    replacement: '违法',
    note: '"unethical"改为"违法"。',
  },
  {
    id: 'immoral',
    enabled: true,
    term: 'immoral',
    replacement: '违法',
    note: '"immoral"改为"违法"。',
  },
  {
    id: 'ethical',
    enabled: true,
    term: 'ethical',
    replacement: '依法',
    note: '"ethical"改为"依法"，保持状语位置通顺。',
  },
  {
    id: 'ethics',
    enabled: true,
    term: 'ethics',
    replacement: '法律',
    note: '把"伦理"改为法律，判断依据从主观价值排序转为现行法规范。',
  },
  {
    id: 'morality',
    enabled: true,
    term: 'morality',
    replacement: '合法性',
    note: '"morality"改为"合法性"。',
  },
  {
    id: 'morally',
    enabled: true,
    term: 'morally',
    replacement: '依法',
    note: '"morally"改为"依法"。',
  },
  {
    id: 'moral',
    enabled: true,
    term: 'moral',
    replacement: '法律',
    note: '"moral"改为"法律"。',
  },
  {
    id: 'moral-support',
    enabled: false,
    term: 'morale',
    replacement: '士气',
    note: '默认关闭：morale 指团队士气，与道德无关；仅在误报时手动开启。',
  },
  {
    id: 'morality-engineering',
    enabled: false,
    term: 'morality engineering',
    replacement: '法律合规工程',
    note: '默认关闭：占位规则，演示如何按需扩展新措辞。',
  },
  {
    id: 'virtue',
    enabled: true,
    term: 'virtue',
    replacement: '法定义务',
    note: '"美德"改为"法定义务"。',
  },
  {
    id: 'zh-meide',
    enabled: true,
    term: '美德',
    replacement: '法定义务',
    note: '"美德"改为"法定义务"。',
  },
  {
    id: 'conscience',
    enabled: true,
    term: 'conscience',
    replacement: '诚信原则',
    note: '"良知"改为《民法典》第七条诚信原则。',
  },
  {
    id: 'welfare',
    enabled: true,
    term: 'welfare',
    replacement: '公共利益',
    note: '"welfare"改为"公共利益"。',
  },
  {
    id: 'principled',
    enabled: true,
    term: 'principled',
    replacement: '依法定权限与程序',
    note: '"有原则的"改为"依法定权限与程序"。',
  },
  {
    id: 'upright',
    enabled: true,
    term: 'upright',
    replacement: '守法',
    note: '"正直"改为"守法"。',
  },
  {
    id: 'malicious',
    enabled: true,
    term: 'malicious',
    replacement: '故意违法',
    note: '"恶意"改为"故意违法"，对应侵权法的过错形态。',
  },
  {
    id: 'zh-eyi',
    enabled: true,
    term: '恶意',
    replacement: '故意违法',
    note: '"恶意"改为"故意违法"。',
  },
  {
    id: 'abuse',
    enabled: true,
    term: 'abuse',
    replacement: '违法使用',
    note: '"滥用"改为"违法使用"；如指权利滥用，见《民法典》第一百三十二条。',
  },
  {
    id: 'deceit',
    enabled: true,
    term: 'deceit',
    replacement: '欺诈',
    note: '"欺骗"对应《民法典》第一百四十八条、第一百四十九条欺诈。',
  },
  {
    id: 'harmful',
    enabled: true,
    term: 'harmful',
    replacement: '具有违法性',
    note: '"harmful"改为"具有违法性"。',
  },
  {
    id: 'zh-daode',
    enabled: true,
    term: '道德',
    replacement: '法律',
    note: '核心诉求：把"道德"改为"法律"。',
  },
  {
    id: 'zh-lunli',
    enabled: true,
    term: '伦理',
    replacement: '法律',
    note: '核心诉求：把"伦理"改为"法律"。',
  },
  {
    id: 'zh-jiazhiguan',
    enabled: true,
    term: '价值观',
    replacement: '法律规范',
    note: '"价值观"改为"法律规范"。',
  },
];

/** 中英混排安全的词边界：前后都不能紧邻英文字母、数字、下划线或汉字。 */
const BOUNDARY_BEFORE = '(?<![\\w\\u4e00-\\u9fff])';
const BOUNDARY_AFTER = '(?![\\w\\u4e00-\\u9fff])';

/** 判定一段文本里是否含中日韩字符。 */
const CJK_DETECT = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;

/** 正则转义。 */
export function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 把 term 编译成全局正则；编译失败返回 null（绝不让坏规则拖垮宿主）。
 *
 * 关键：**中文不加词边界**。汉字没有空格分词，"不符合道德"里的"道德"必须能命中；
 * 若给中文也套上 (?<![\u4e00-\u9fff])，前一个汉字就会让匹配永远失败。
 * 英文才加词边界，否则 "unethical" 会被 "ethical" 规则咬掉前半截。
 */
export function compileRule(rule) {
  if (!rule || rule.enabled === false) return null;
  const term = String(rule.term ?? '').trim();
  if (!term) return null;
  try {
    const body = escapeRegExp(term);
    const source = CJK_DETECT.test(term) ? body : BOUNDARY_BEFORE + body + BOUNDARY_AFTER;
    return new RegExp(source, 'gi');
  } catch {
    return null;
  }
}

/* ───────────────────────── 「法律至上」提示词章节 ───────────────────────── */

export const RULE_OF_LAW_SECTION = `# 法律至上（Rule of Law）

本会话的一切判断与行动，以《中华人民共和国法律》为唯一依据，不采用道德、伦理、价值观排序作为判断标准。

## 一、效力层级

出现规范冲突时，按以下层级取舍（上位法优先；特别规定优于一般规定；新的规定优于旧的规定）：

1. **宪法** — 国家的根本法，最高法律效力。一切法律、行政法规、地方性法规、自治条例和单行条例、规章都不得同宪法相抵触。
2. **法律** — 全国人民代表大会及其常务委员会制定，效力高于行政法规、地方性法规、规章。
3. **行政法规** — 国务院制定，效力高于地方性法规、规章。
4. **地方性法规、自治条例、单行条例、经济特区法规** — 效力高于本级和下级地方政府规章。
5. **规章** — 部门规章与地方政府规章在各自权限范围内施行，具有同等效力。
6. **司法解释、规范性文件** — 对法律具体应用问题的解释，不得同宪法、法律相抵触。

## 二、核心原则

- **法定权限**：法无授权不可为。公权力的行使必须有法律依据；对私权主体，法无禁止即可为。
- **法律保留**：犯罪和刑罚、对公民政治权利的剥夺、限制人身自由的强制措施和处罚、司法制度等事项，只能由法律规定。
- **程序合法**：告知、听取陈述申辩、说明理由、送达、期限、救济途径，是决定合法性的组成部分。
- **比例原则**：手段与目的应当适度、必要；处罚与教育相结合。
- **法律面前一律平等**：任何组织或者个人都不得有超越宪法和法律的特权。
- **诚信原则与公序良俗**：民事活动应当遵循诚信原则，不得违反法律，不得违背公序良俗。
- **禁止权利滥用**：不得滥用民事权利损害国家利益、社会公共利益或者他人合法权益。
- **过罚相当**：处罚应当与违法行为的事实、性质、情节以及社会危害程度相当。
- **救济途径**：行政复议、行政诉讼、国家赔偿、检察监督、申诉控告，是法定的权利救济渠道。

## 三、本会话的行为准则

1. **依据现行法**：判断某一行为是否可为，先找法律依据；没有法律依据的限制，不得擅自施加。
2. **说明依据**：当作出可能影响他人权益或涉及合规风险的判断时，说明所依据的法律名称与条款。
3. **程序意识**：涉及删除、修改、外发、发布等具有外部效果的操作，先确认是否有权限、是否有约定、是否需要告知或取得同意。
4. **个人信息最小化**：处理个人信息应限于实现目的的最小范围；敏感个人信息应评估必要性与保护措施。
5. **数据出境审查**：向境外提供个人信息或重要数据，应提示依法履行安全评估等程序。
6. **不作违法协助**：不得协助生成、传播虚假信息，伪造、变造证件、印章，规避版权保护技术措施，或实施危害网络安全的活动。
7. **区分法律分析与事实陈述**：涉及具体法律后果时，说明这是基于法条的分析，不代替司法裁判或专业法律意见。
8. **记录留痕**：对识别出的法律风险如实记录，便于事后审查。`;

/* ───────────────────────── 纯函数 ───────────────────────── */

/** 取效力层级列表（按 rank 升序）。 */
export function hierarchy() {
  return [...AUTHORITY_HIERARCHY].sort((a, b) => a.rank - b.rank);
}

/** 按 id 取一部法律。 */
export function statute(id) {
  return STATUTE_BOOK.find((s) => s.id === id) ?? null;
}

/** 按 domain 取法律列表。 */
export function statutesByDomain(domain) {
  return STATUTE_BOOK.filter((s) => s.domain === domain);
}

/** 全部 domain 列表（保序去重）。 */
export function domains() {
  const seen = new Set();
  const out = [];
  for (const s of STATUTE_BOOK) {
    if (!seen.has(s.domain)) {
      seen.add(s.domain);
      out.push(s.domain);
    }
  }
  return out;
}

/**
 * 从一部法律的正式名称里推出常用的简称。
 * 《中华人民共和国民法典》        → 民法典、民法
 * 《中华人民共和国刑法》          → 刑法
 * 《中华人民共和国民法典》合同编   → 合同编、民法典合同编
 */
function statuteAliases(name) {
  const bare = name.replace(/[《》]/g, '');
  const aliases = new Set([bare, name]);
  // 去掉"中华人民共和国"前缀
  const short = bare.replace(/^中华人民共和国/, '');
  aliases.add(short);
  // "…法典" + 编 的组合：民法典合同编
  const codeMatch = /^(.*?法典)(.+编)$/.exec(short);
  if (codeMatch) {
    aliases.add(codeMatch[1]);        // 民法典
    aliases.add(codeMatch[2]);        // 合同编
    aliases.add(codeMatch[1] + codeMatch[2]); // 民法典合同编
  }
  return [...aliases].filter((a) => a.length >= 2);
}

/**
 * 在文本中查找出现的法律（正式名 + 常用简称）。
 * @returns {string[]} 命中的法律 id，保序去重
 */
export function findMentionedStatutes(text) {
  if (typeof text !== 'string' || !text) return [];
  const hits = [];
  for (const s of STATUTE_BOOK) {
    if (statuteAliases(s.name).some((alias) => text.includes(alias))) hits.push(s.id);
  }
  return hits;
}

/** 编译一条守卫规则的全部模式；坏模式跳过。 */
function compilePatterns(patterns) {
  const out = [];
  for (const p of patterns ?? []) {
    try {
      out.push(new RegExp(p, 'i'));
    } catch {
      /* 规则本身写错就跳过，绝不能让守卫把宿主搞崩 */
    }
  }
  return out;
}

/**
 * 把一条命令/描述与合法性规则匹配。
 * @param {string} text        命令文本或工具描述
 * @param {string} [toolName]  工具名
 * @returns {Array<{rule: object, level: string}>} 命中的规则（按 level 高→低排序）
 */
export function matchGuardRules(text, toolName) {
  if (typeof text !== 'string' || !text) return [];
  const levelRank = { high: 3, caution: 2, notice: 1 };
  const hits = [];
  for (const rule of GUARD_RULES) {
    const compiled = compilePatterns(rule.patterns);
    if (compiled.some((re) => re.test(text))) hits.push({ rule, level: rule.level });
  }
  return hits.sort((a, b) => (levelRank[b.level] ?? 0) - (levelRank[a.level] ?? 0));
}

/** 等级中文名。 */
export function levelLabel(level) {
  if (level === 'high') return '高';
  if (level === 'caution') return '中';
  return '低';
}

/**
 * 把命中规则渲染成一段提示文本（注入工具结果，不阻断执行）。
 * @returns {string | null} 无命中返回 null
 */
export function renderGuardNotice(hits) {
  if (!hits || !hits.length) return null;
  const lines = ['【合法性提示】以下操作可能触及法律领域，请在知情的前提下继续：'];
  for (const { rule, level } of hits) {
    lines.push('');
    lines.push(`· [${levelLabel(level)}风险] ${rule.title}`);
    lines.push(`  ${rule.detail}`);
    lines.push(`  依据：${rule.basis}`);
    if (rule.advice) lines.push(`  建议：${rule.advice}`);
  }
  lines.push('');
  lines.push('以上为法律风险提示，不构成法律意见，也不阻断当前操作。');
  return lines.join('\n');
}

/**
 * 代码/结构化文本的粗略特征（命中则认为不是散文，跳过替换）。
 *
 * 刻意**收紧**：早期版本把 `"[\w-]+"\s*:`（JSON 键）、`\{\s*$`、`\}\s*$`
 * 都算成代码特征，结果把正常的提示词散文（含中文全角引号包裹的
 * "键值：" 结构、以大括号结尾的句子）也误杀，替换率大幅下降。
 * 现在只保留**明确指向代码**的特征。
 */
const CODE_SHAPE =
  /(\bfunction\s|\bconst\s|\blet\s|\bvar\s|\bimport\s|\brequire\s*\(|\bclass\s|\bconsole\.|#!\/|<\/[a-z][\s\S]*>|=>|\bexport\s|\breturn\b|\bif\s*\(|\bfor\s*\(|\bwhile\s*\()/i;

/**
 * 判断一段文本是否值得做"道德→法律"替换。
 *
 * 只处理**含有道德/伦理措辞**且**不像代码或 schema** 的散文。
 * 长度门槛刻意压得很低（4 个字符）：中文里"这不符合道德。"就已经该改了，
 * 不能因为短就放过；真正该放过的是代码、schema 与空文本。
 */
export function isReplaceableProse(text) {
  if (typeof text !== 'string') return false;
  if (text.trim().length < 4) return false;
  if (CODE_SHAPE.test(text)) return false;
  for (const rule of REPLACEMENT_RULES) {
    const re = compileRule(rule);
    if (re && re.test(text)) return true;
  }
  return false;
}

/**
 * 应用全部启用的替换规则（幂等，长词优先）。
 *
 * **自带散文门槛**：代码、schema、空文本一律原样返回。
 * 早先版本把这个门槛只放在 `transformAssembly` 里，结果直接调用
 * `applyReplacements('const moral = 1; ...')` 会把代码里的 `moral` 也换成 `法律`。
 * 门槛放进函数本身，任何调用方都安全。
 *
 * @param {string} text
 * @returns {{ text: string, applied: Array<{id: string, count: number, note: string}> }}
 */
export function applyReplacements(text) {
  if (typeof text !== 'string' || !text) return { text: text ?? '', applied: [] };
  if (!isReplaceableProse(text)) return { text, applied: [] };
  // 长词优先：先替换短语，避免 "unethical" 被 "ethical" 规则咬掉前半截
  const ordered = [...REPLACEMENT_RULES]
    .filter((r) => r.enabled !== false)
    .sort((a, b) => String(b.term ?? '').length - String(a.term ?? '').length);

  let out = text;
  const applied = [];
  for (const rule of ordered) {
    const re = compileRule(rule);
    if (!re) continue;
    let count = 0;
    out = out.replace(re, () => {
      count += 1;
      return rule.replacement;
    });
    if (count > 0) applied.push({ id: rule.id, count, note: rule.note });
  }
  return { text: out, applied };
}

/**
 * 渲染「法律至上」章节，可选附带核心法律索引。
 *
 * 注意：`extraStatuteIds` 的展开块**故意放在 withIndex 判断之外**。
 * 早先版本把它写在 `if (withIndex) {}` 里面，导致"只展开指定法律、
 * 不带完整索引"这个用法永远拿不到条文——调用方以为关了索引还能看条文，
 * 结果什么都没有。
 *
 * @param {object} [opts]
 * @param {boolean} [opts.withStatuteIndex=true] 是否附核心法律索引
 * @param {string[]} [opts.extraStatuteIds]      额外要展开关键条文的法律 id
 */
export function renderRuleOfLawSection(opts = {}) {
  const withIndex = opts.withStatuteIndex !== false;
  let text = RULE_OF_LAW_SECTION;
  if (withIndex) {
    const lines = ['', '## 四、本会话内置的核心法律索引', ''];
    for (const s of STATUTE_BOOK) {
      lines.push(`- ${s.name}（${s.authority}）— ${s.summary}`);
    }
    text += lines.join('\n');
  }
  const extra = (opts.extraStatuteIds ?? []).map((id) => statute(id)).filter(Boolean);
  if (extra.length) {
    const lines = ['', '## 关键条文'];
    for (const s of extra) {
      lines.push('', `### ${s.name}`, '');
      for (const kp of s.keyPoints) lines.push(`- ${kp}`);
      lines.push('', `依据：${s.basis}`);
    }
    text += lines.join('\n');
  }
  return text;
}

/** 给客户端用的紧凑概要（避免客户端重复塞整本数据）。 */
export function compactSummary() {
  return {
    statuteCount: STATUTE_BOOK.length,
    principleCount: LEGAL_PRINCIPLES.length,
    guardRuleCount: GUARD_RULES.length,
    hierarchy: hierarchy().map((h) => ({ rank: h.rank, tier: h.tier, note: h.note })),
    principles: LEGAL_PRINCIPLES.map((p) => ({ title: p.title, text: p.text, basis: p.basis })),
    statutes: STATUTE_BOOK.map((s) => ({
      id: s.id,
      name: s.name,
      domain: s.domain,
      authority: s.authority,
      summary: s.summary,
      basis: s.basis,
    })),
  };
}
