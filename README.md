# dsh-rule-of-law

> 法律至上：No action without statutory authority. No authority without a record.
>
> 把 DSH 系统提示词里的**道德/伦理/价值观表述**全部替换为《中华人民共和国法律》框架，
> 并在工具调用层做**合法性提示与留痕**——只提示，不阻断。

这是一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）插件。

---

## 它做什么

| 能力 | 说明 | 挂载点 |
|---|---|---|
| **① 提示词改写** | 把已装配系统提示词里的道德/伦理措辞换成法律措辞（`道德`→`法律`、`伦理`→`法律`、`ethical`→`依法`、`avoid harm`→`不得损害国家利益、社会公共利益或者他人合法权益`…） | `system-prompt/assemble` 瀑布流最后一跳 |
| **② 法律至上章节** | 追加一段完整的法律框架：效力层级（宪法→法律→行政法规→地方性法规→规章→司法解释）、11 条核心原则、8 条行为准则、25 部核心法律索引 | 同上 |
| **③ 工具合法性提示** | 工具执行前/后匹配 7 类风险规则（个人信息批量处理、数据出境、破坏性操作、安全测试、批量采集、违法内容、著作权），命中的把提示附加进上下文 | `tools/pre-execute` / `tools/post-execute` |
| **④ 设置面板** | 设置里多一页「法律至上」：效力层级、核心原则、法律索引、命中统计、启停开关 | 客户端 `settings.section` 槽位 |
| **⑤ /law 命令** | 查看法律框架、命中统计；`/law on`、`/law off`、`/law section` | `commands` 注册 |

---

## 安装

### 方式 A：作为本地 bundle 安装（推荐）

```bash
# 1. 克隆/复制本仓库
git clone https://github.com/<you>/dsh-rule-of-law.git
cd dsh-rule-of-law

# 2. 跑测试（可选但建议）
npm test

# 3. 用 DSH 的插件管理器安装本地包
```

在 DSH 会话中：

```
plugin_manager(action="install_bundle", target="D:\\path\\to\\dsh-rule-of-law")
```

### 方式 B：手动放进插件目录

```bash
cp -r dsh-rule-of-law ~/.dsh/plugins/
# 然后重启 DSH
```

### 方式 C：npm 发布后安装

```bash
plugin_manager(action="install_bundle", target="dsh-rule-of-law")
```

---

## 验证装上了

装好后，在任意 DSH 会话里：

1. 输入 `/law` —— 应看到完整报告（效力层级 + 核心原则 + 25 部法律索引 + 命中统计）。
2. 输入 `/law section` —— 应看到注入到系统提示词的「法律至上」章节原文。
3. 让模型执行 `rm -rf ./build` —— 工具结果后面应附加【合法性提示】。
4. 打开 设置 → 法律至上 —— 应看到面板，开关可切。

### 已在本机验证过的部分

| 项 | 结果 |
|---|---|
| `npm test` | 三套全绿：core 28/28、host 23/23、client 15/15 |
| `plugin_manager install_bundle` | 成功，pnpm 以 `link:` 方式接入 profile |
| Loader 条目 | `include:rule-of-law` / `dsh-rule-of-law` / `enabled: true` / `fiberPhase: active` |
| profile 注册 | `dsh.profile.bundles` 含 `dsh-rule-of-law` |

**尚未在真实 GUI 里验证的**（离线测试覆盖了逻辑，但需要你实际点一下）：

- 设置面板「法律至上」页面的实际渲染与主题适配
- 客户端 bundle 是否被 Web 启动图接纳（`clientModules.graph()` 里能看到 `dsh-rule-of-law`）
- 提示词改写对**真实** DSH system prompt 的实际命中率（取决于原生提示词用了多少道德措辞）

---

## 替换规则一览

改写只作用于**提示词的散文文本**；工具 schema、参数定义、代码片段一律不碰
（`transformAssembly` 会整棵跳过 `parameters` / `schema` / `inputSchema` / `tools` 字段，
且 `isReplaceableProse` 会拒绝带代码特征的文本）。

### 英文

| 原文 | 改为 | 依据 |
|---|---|---|
| `ethics` / `ethical` | 法律 / 依法 | 判断依据从主观价值排序转为现行法规范 |
| `morals` / `moral` | 法律 | 同上 |
| `unethical` / `immoral` | 违法 | —— |
| `morally wrong` | 违反法律规定 | —— |
| `ethically questionable` | 合法性存疑 | 进入法律评估 |
| `do the right thing` / `the right thing` | 依法行事 / 依法应当作出的行为 | 消除主观正确性判断 |
| `avoid harm` | 不得损害国家利益、社会公共利益或者他人合法权益 | 《民法典》第一百三十二条 |
| `human values` | 现行法律秩序 | —— |
| `socially acceptable` | 符合公序良俗 | 《民法典》第八条 |
| `culturally appropriate` | 不违背公序良俗 | 同上 |
| `moral/ethical framework` | 法律框架 | —— |
| `moral/ethical reasoning` | 法律推理 | —— |
| `responsible AI` / `responsible use` | 合法合规的人工智能 / 合法合规使用 | —— |

### 中文

| 原文 | 改为 |
|---|---|
| 道德 / 道德上 / 道德标准 / 道德框架 / 道德判断 | 法律 / 依法 / 法律标准 / 法律框架 / 法律判断 |
| 伦理 / 伦理上 / 伦理标准 / 伦理框架 / 伦理判断 | 法律 / 依法 / 法律标准 / 法律框架 / 法律判断 |
| 善恶 | 合法与违法 |
| 价值观 | 法律规范 |
| 良知 / 美德 / 恶意 | 诚信原则 / 法定义务 / 故意违法 |

**两条关键纪律**：

- **长词优先**：先替换短语再替换单词，否则 `unethical` 会被 `ethical` 规则咬成 `dis依法`。
- **幂等**：替换结果不会再命中同一条规则，反复装配不会越改越乱。

---

## 合法性提示规则（只提示，不阻断）

| 规则 | 等级 | 命中示例 |
|---|---|---|
| `personal-data-bulk` | 中 | `导出全部用户名单`、命令里出现身份证号/银行卡号 |
| `data-export-outbound` | **高** | `上传备份到 github`、`curl` 带 `token` |
| `destructive-operation` | 中 | `rm -rf`、`drop table`、`git push --force` |
| `security-testing` | **高** | `nmap`、`sqlmap`、未授权访问测试 |
| `scraping-and-collection` | 低 | 批量爬虫、绕过 robots |
| `illegal-content` | 低 | 伪造证件、刷单、赌博内容 |
| `copyright-infringement` | 低 | 下载付费课程全集、去水印/破 DRM |

命中的效果（在工具结果末尾追加，**执行照常进行**）：

```
【合法性提示】以下操作可能触及法律领域，请在知情的前提下继续：

· [中风险] 不可逆的删除或破坏性操作
  民事主体从事民事活动应当遵循诚信原则；权利人行使权利不得滥用民事权利损害他人合法权益。
  依据：《民法典》第七条、第一百三十二条、第一千一百六十五条
  建议：确认操作范围，先备份或改用可恢复方式。

以上为法律风险提示，不构成法律意见，也不阻断当前操作。
```

---

## 文件结构

```
dsh-rule-of-law/
├── package.json          # 插件清单（dsh.bundle.patch + dsh.client）
├── cordis.patch.yml      # 把宿主半边插进 Loader
├── index.mjs             # 宿主半边：提示词改写 + 守卫 + /law 命令 + RPC
├── client.js             # 浏览器半边：设置面板
├── core/
│   └── law-data.mjs      # 核心法律数据 + 全部纯函数（可离线测）
├── test/
│   ├── smoke.test.mjs    # 数据完整性、守卫匹配、替换幂等性
│   ├── host.test.mjs     # 假 Cordis 上下文驱动真实 apply()
│   └── client.test.mjs   # 假 React/DOM 驱动客户端半边
└── README.md
```

---

## 测试

```bash
npm test           # 三套全跑
npm run test:core  # 只测核心数据与纯函数
npm run test:host  # 只测宿主半边（含瀑布流、守卫、命令、dispose）
npm run test:client
```

三套都是**离线**的，不需要 DSH 宿主、不需要网络。当前状态：**66 项全绿**。

---

## 已知取舍（诚实清单）

1. **不阻断**。守卫只附加提示。这是刻意选择：自动判定"违法"并拒绝执行，
   误判代价远高于漏判。需要硬门禁的场景应交给 DSH 自己的 approval 机制。
2. **不是法律意见**。内置的是**精炼后的原则摘要**，不是逐条法条；
   每次判断都应回到法条原文。摘要都标了 `basis` 便于溯源。
3. **法律有时效**。法条会修订（如《立法法》2023 修正、《公司法》2023 修订）。
   内置清单需要随立法进展更新；`core/law-data.mjs` 是唯一数据源。
4. **客户端数据有冗余**。`client.js` 内嵌了一份与 `compactSummary()` 等价的 `DATA`，
   因为浏览器 factory 无法 import 宿主的 ESM。测试里有一条断言两边数量一致，
   改数据时若忘了同步客户端会立刻报错。
5. **RPC 是可选的**。宿主提供了 `snapshot`/`setEnabled` 就实时同步；
   没提供则面板退回本地数据（会标注"未连接宿主 RPC"），不影响展示。
6. **替换表可能过度**。例如 `values` → `法律规范` 在个别语境下不够准确。
   每条规则都可单独 `enabled: false` 关掉，按需裁剪。

---

## 许可

MIT
