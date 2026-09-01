---
name: proto-gen
description: >
  生成高保真 HTML 原型文件。触发场景：用户提供某个页面/功能的构思、草稿或 PRD，想要快速生成
  对应的可视化 HTML 原型（含页面索引、macOS 窗口原型、旁注 PRD 面板）。
  关键词：生成原型、新建原型、写原型、画原型、做个原型、出个原型、新增一个 html、新建 html 原型。
  生成的 HTML 复用一套统一的设计系统（shared.css），遵循 references/ 下的内容规范。
---

# proto-gen — 高保真原型生成

本 skill 生成统一风格的高保真 HTML 原型，适合 Web/桌面应用产品 MVP 阶段的方案演示与评审。

## 设备系列

| 系列 | 状态 | 外壳容器 | 适用 reference |
|---|---|---|---|
| **PC · macOS** | ✅ 当前覆盖 | `macos-window` / `macos-titlebar` / `macos-body` + `app-sidebar` / `win-chrome-bar` / `app-main` | 现有 `references/*.md` 全部 |
| **Mobile** | 🚧 规划中 | 拟用 `mobile-frame` / `mobile-statusbar` / `mobile-tabbar`（待落地） | 后续以独立文件扩展（如 `references/html-structure-mobile.md`），不混入现有 |

> 当前所有原型骨架与组件描述均基于 PC · macOS 系列。引入 Mobile 系列时，**新增独立 reference 文件**而不是覆写现有，避免设备形态混淆。

## 铁律：原型内容必须有需求依据

**不允许凭空添加页面元素或功能。** 每一个控件、每一列、每一个操作项，都要能指回需求里的某一条。

- 画之前自问：**「需求哪一条写了这个」**。答不上来就不画。
- 画的过程中发现确实缺、确实该有的 → **列为「待评审项」交用户确认**，确认后才画进去；不要自作主张补齐。
- 交付时主动说明：本次哪些元素来自需求、哪些是提请评审的新增。

**为什么是铁律**：原型一旦画出来，开发就照着实现，等于原型替需求做了决定，而这个决定没人评审过。真实事故：给后台账号列表凭空加了「导出」，而需求从未要求——该列表含登录名与姓名属个人信息，同一份需求里其他导出功能是专门单独授权的。

---

## 铁律：canvas 只放产品界面，评审说明一律进 panel

**原型图（macos-window 内）= 用户真实会看到的产品界面**，不允许任何「评审旁白」混在上面。

- ❌ **移除**：版本变更徽标（如「R2 变更」）、「经评审确认」「需求原未定义」这类过程说明、指向需求的解释性批注、给评审者看的注解文字
- ✅ **保留**：产品自身的 UI 文案——按钮/标签/占位符/表单 helper 微文案/校验提示（真实用户在成品里会看到的）
- **判据**：这段文字，成品交付给终端用户后还会显示吗？会 → 产品文案，留在 canvas；只为评审者解释规则/背景 → 批注，移到 panel
- **判据之外再问一层**：这个信息在**数据模型里有对应字段吗**？没有字段支撑的「推导性/参考性展示」（如给分组打题型标签——槽位本就不锁题型；在音频控件下附「文案：『……』」旁注）即使措辞像产品文案，真实界面也渲染不出来，一律不画（2026-08-14 评审实例）

所有「为什么这样设计、什么规则、什么背景」的说明，去处是 **prd-panel**：改写型写成 bullets，评审型由 `spec-inject` 注入 spec 真身。canvas 保持纯净，研发转产品代码时不必再剔除画布上的旁白。

**自检**：`grep 'yd-note'`（评审徽标类）在 canvas 应为 0 处使用；画布上不应出现「评审」「需求原」「经评审」等旁白词。

---

## 铁律：交互链路必须闭环

静态截图讲不完逻辑——**开发真正要知道的是「点了之后会怎样」**。

**规则**：原型里每一个可点击的操作（行操作、主按钮、入口链接），都必须能回答「点击后到哪」。

- 若点击后打开弹窗 / 跳新页 / 出确认框 → **必须有对应的 section 画出那个状态**
- 该操作元素加 `data-goto="目标 section 的 id"`，点击即跳转过去，形成可演示的链路
- 目标 section 与来源 section 一样要配 PRD 旁注，说明其业务规则

**三种合法状态**，每个可点击操作必居其一，否则算断点：

| 标记 | 含义 |
|---|---|
| `data-goto="section-id"` | 点击后跳到该 section（弹窗 / 新页 / 确认框都算） |
| `data-noflow="原因"` | **确实没有后续态**，如「启用」无破坏性、点击直接生效——必须写明原因 |
| 置灰不可点（`cursor:not-allowed`） | 该行/该态下不可用，如超管行的停用 |

**用闭环反查缺口**（交付前必做）：

1. 列出每个 section 里所有可点击操作
2. 逐个问「点它之后是什么」
3. 三种状态都不占 → **缺 section，补上**
4. 例：列表行有 编辑 / 重置密码 / 停用 / 删除，就要有这四个的后续态

审计可脚本化：扫全部 `yd-link` / `btn`，检查是否带 `data-goto`（且目标存在）、`data-noflow` 或置灰样式。**断点数必须为 0 才算可交付。**

**弹窗要有回程**：弹窗/确认框的「确定」「取消」都应 `data-goto` 回到来源列表，形成「列表 → 弹窗 → 回列表」的小闭环，评审时能连着走完。

**这套方法的副产品：闭环审计会逼出需求缺口。**

实例——审「重置密码」链路时发现：需求写了「超管重置即设定新密码」，却没说**这个密码怎么交给员工**。这是纯读需求文档发现不了的断点，必须画链路才会撞上。

注意结论未必是「加功能」：该例最终定为**由超管线下转告、系统不介入**，反而删掉了一度画出的「重置成功展示」态。**审计的价值在于逼出问题并让人拍板，而不是逼你加东西**——否则就违反了「原型内容必须有需求依据」。

**缺的那些若需求没写清楚**（如「停用是否要二次确认」需求未提），按「原型内容必须有需求依据」处理——**列为待评审项交用户确认，不要自己拍板画出来**。

---

## 铁律：可输入字段必须有明确的字符数上限

**凡是可输入的字段，需求没写上限的，MUST 跟 PM 确认后再画，MUST NOT 自己拍一个数、也 MUST NOT 当作「无限制」画过去。**

- 上限是**需求的一部分**，不是实现细节——它决定数据库列宽、决定列表列宽、决定要不要显示计数器。
- 有上限就 **MUST 显示字数计数器**（`3/20` 形态），且 **MUST 硬截断**（输满即输不进去），**MUST NOT** 允许输入超长再在保存时报错——那让用户白打一段字。
- ⚠ **没有上限的字段 MUST NOT 加计数器**——**没有上限的计数器是一个没有分母的分数**。
- ⚠ **确认上限时必须同时问清「按字符还是按字节」**。中文场景下这不是措辞而是**三分之二的容量**：按字节算「20」只够填 6～7 个中文。实现若用 `LENGTH()` 而不是 `CHAR_LENGTH()`，上限会被**静默砍掉**且不报错，用户只会觉得「怎么才打几个字就打不动了」。

**自检**：列出原型里每一个可输入字段 → 逐个问「它的上限是多少、写在需求哪一条」→ 答不上来的，全部列为待评审项。

---

## 铁律：列表改动后，把它当背景的所有页面必须跟着改

**弹窗 / 抽屉类 section 的背景页，MUST 与「谁 `data-goto` 指向它」保持一致。**

一旦某个列表页的形态变了（换了交互载体、改了字段、拆成了子页），**所有把它当背景的叠加态 section 都会静默过期**——画面上还是旧列表，而评审者会以为那就是现状。

**这类不一致 `spec-inject` 与闭环审计都查不出来**（`data-goto` 仍然有效、覆盖率仍然满格），只能靠**反查来源**：

```
对每个含 yd-dialog / yd-drawer 的 section：
  ① 扫全文找出所有 data-goto="<该 section id>" 的来源 section
  ② 看该 section 的背景内容是不是来源那一页
  ③ 不是 → 换掉背景
```

⚠ **来源可能不止一个**（如「编辑学生」既能从班级抽屉进、也能从学生列表页进）：**选主入口那一个**作背景，并在 PRD 面板注明另一个入口。

**触发时机**：每次改动任何列表页的形态或字段后，**MUST 立即跑一遍这个反查**，不要等评审时被看出来。

---

## 三段结构契约

每个原型 HTML 文件由**三段固定结构**组成，任何 section 都必须遵守。骨架类名见 [`references/html-structure.md`](references/html-structure.md)。

```
┌───────────────────────────────────────────────────────────────┐
│ proto-topbar (fixed 顶栏 48px)                                │
│ 页面导航 │ ‹ │ [页面1][页面2][页面3]… │ › │ ☰ 目录 →抽屉    │
└───────────────────────────────────────────────────────────────┘
.proto-layout (灰底桌面，flex 横排，gap 24)
┌──────────────────────────────────┬──────────────────┐
│   原型图(macos-window)           │  功能概览        │
│   1460×910（macOS 桌面感）       │  prd-panel       │
│                                  │  360px sticky    │
│   ←──── 一一对应 ────→           │  卡片            │
└──────────────────────────────────┴──────────────────┘
   sections-col (纵向堆叠每个 .proto-stack)
     │
     └─ 每个 .proto-stack = section-label + .proto-with-prd
                                          │
                                          └─ macos-window + prd-panel
```

**页面导航（v2）**：不再用左侧栏。`.toc-sidebar` 仍写在 HTML 里作**数据源**（`display:none`），运行时由 `prd-highlight.js` 读取其 `.toc-item` 构建：

- **固定顶栏**：横排页面标签，随滚动自动高亮当前页；点击切换；‹ › 翻上/下一页
- **侧边抽屉**：☰ 目录 → 右侧滑出完整页面清单，点击切换并自动关闭；Esc / 点遮罩关闭
- 存量原型无需改 HTML，重跑一次注入即升级

**布局规范**（实施于 `assets/shared.css`，原型 HTML 不应覆写）：

| 维度 | 值 | 说明 |
|---|---|---|
| body 背景 | `oklch(0.92 0.005 280)` | macOS 桌面浅灰，让白色窗口悬浮其上 |
| body padding | `32px 24px` | 整体外边距 |
| macos-window 尺寸 | **1460×910** | 对齐 PC macOS 应用常见窗口大小（参 `references/shadcn-tweakcn-theme.md`） |
| proto-topbar 高度 | **48px** | fixed 顶栏，body 相应 padding-top:64px |
| prd-panel 宽度 | **360px** | sticky top:64px（避开固定顶栏），与 macos-window 同高（910px） |
| 列间距 | `24px` | 原型 / prd 之间 |

约束：

1. **toc-sidebar 全文件唯一**：作为导航数据源，每个 section 一条 toc-item（渲染成顶栏标签 + 抽屉条目）
2. **原型图 ↔ 功能概览 一一对应**：每个 section 内一个 `.proto-with-prd` 包**恰好一个**外壳 + **恰好一个** `.prd-panel`
3. **不允许「一图多 PRD」**（一个外壳塞多个 prd-section 拆给多个状态）
4. **不允许「PRD 拆给多图」**（一个 prd-panel 描述跨多个外壳的内容）
5. 此契约**设备无关**——Mobile 系列引入后仍维持三段结构，只是外壳容器换成 `mobile-frame`

## 设计系统资产

本 skill 自带一套**主题可插拔**的设计系统：

- `assets/theme.css` — **主题 token 单一来源**（19 个 shadcn 核心 + 8 个 sidebar 子 token + 12 个状态色派生 + 字体 CDN）。默认 = tweakcn 724-1，可通过 `extract-theme.sh` 切换
- `assets/shared.css` — 组件类骨架（按钮 / 卡片 / 弹窗 / 表单 / PRD 面板等）；所有颜色 / 字体 / 圆角通过 `var()` 引用 `theme.css` 的 token
- `assets/components.html` — **人类可视组件清单**（核心交付物）：每个组件含 类名 / 常态 / hover / 禁用 / loading 四态横排 + 应用场景 + Token 速查；产品 / 测试 / AI 浏览器双击查阅
- `assets/extract-theme.sh` — 主题切换脚本：`./extract-theme.sh <tweakcn-url-or-id>` 一键覆盖 `theme.css`
- `assets/inject-assets.mjs` — **资产注入脚本**：把 `theme.css` / `shared.css` / `prd-highlight.js` 的最新内容注入原型 HTML 的标记块之间，产出仍是自包含单文件（见下节）
- `assets/spec-inject.mjs` — **评审型 spec 注入脚本**：把 OpenSpec 变更包 `specs/*/spec.md` 的 Requirement + Scenario 逐字回填进 `prd-section` 的 `@proto-gen:spec` 标记块，并跑一致性/死锚点/覆盖率审计。让「评审原型 = 评审 spec」（见 `references/prd-rules.md` 文末「评审型」专章）
- `assets/prd-highlight.js` — 原型运行时：PRD ↔ 原型 双向 hover 联动 + 顶部页面导航（顶栏标签 / 抽屉目录 / 滚动联动）
- `assets/example.html` — 最小可运行示例

> **想换主题**：跑 `./extract-theme.sh <new-tweakcn-url>` 覆盖 `theme.css`，再跑一次注入脚本刷新所有原型。
> **想查组件视觉规范**：浏览器打开 `components.html`，左侧 TOC 跳转，点类名复制。

## 自包含注入机制（默认交付方式）

原型 HTML 要求**自包含**（研发 / 评审拿到单文件直接双击打开），但 token 与通用组件样式**不手写副本**，只在本 skill 的 `assets/` 维护一份，通过脚本注入。

**标记格式**：`<head>` 内用一对 HTML 注释包住注入块，脚本只替换标记之间的内容：

```html
<!-- @proto-gen:theme:start -->
<style>/* 脚本注入 theme.css，勿手改 */</style>
<!-- @proto-gen:theme:end -->
<!-- @proto-gen:shared:start -->
<style>/* 脚本注入 shared.css，勿手改 */</style>
<!-- @proto-gen:shared:end -->
<!-- @proto-gen:highlight:start -->
<script>/* 脚本注入 prd-highlight.js，勿手改 */</script>
<!-- @proto-gen:highlight:end -->
<style>/* 页面自有样式写在标记块之外，注入不会碰 */</style>
```

支持的块：`theme`（必备）、`shared`、`highlight`（按需）。每个标记对全文件只允许出现一次。

**注入 / 批量刷新**（同一命令，参数可混填文件与目录，目录递归收集 `*.html`）：

```bash
~/.claude/skills/proto-gen/assets/inject-assets.mjs path/to/prototypes/
```

改完 `theme.css` / `shared.css` 后跑一次，所有带标记的原型统一换皮。脚本幂等，重复执行结果一致。

**存量原型一次性迁移**：把已有 `<style>` 中的 token 段（`:root { --background: ... }` 等）与通用组件样式删掉，原位放入上面的空标记块对（页面特有样式保留在标记块之外的独立 `<style>` 里），然后跑一次注入脚本回填。迁移后该文件即可参与批量刷新。

## References 总览

| 文件 | 内容 | 设备适用 |
|---|---|---|
| `references/html-structure.md` | 页面骨架 + 三种叠加态（modal / drawer / subpage） | PC · macOS 系列 |
| `references/css-components.md` | **类名 → 用途 → components.html 锚点** 索引表；不再含 hex / px 等具体值 | PC · macOS 系列 |
| `references/default-theme.md` | proto-gen 默认主题（724-1）说明 + 切换流程 + token 全表 + 切换后必须手工补的 3 项 | 设备无关 |
| `references/shadcn-tweakcn-theme.md` | **目标项目接入**：当原型要对齐业务项目自身主题时如何覆盖 `theme.css`（sidebar 子 token 陷阱 / 状态色派生 / 字体大小映射 / lucide 踩坑 / 自检清单） | 设备无关；项目接入场景 |
| `references/prd-rules.md` | 面板两种模式（改写型 / 评审型）、PRD bullets 写法、元素描述模板、重复引用规则、评审型 `data-req` 锚点 + spec 注入 | 设备无关 |
| `references/prd-highlight.md` | PRD ↔ 原型 双向 hover 联动：`data-comp` / `data-target` 命名约定 / scope / 交付剥离须知 | 设备无关 |

## 工作目录

由用户在调用时指定，例如 `designs/prototype/` 或 `prototypes/`。生成的 HTML 自包含，目录内无需伴随 css / js 文件。

## 执行步骤

### 1. 理解输入

用户的"构思"可以是：

- 自然语言描述（如"做一个数据导入页面，包含列表、上传弹窗"）
- 已有 PRD md 文件路径
- 对某个现有页面的补充/改版

**分析出**：

- 页面/功能名称（用于文件名和标题）
- 包含哪些 section（每个 section = 一个原型状态，如主页 / 弹窗 / 抽屉）
- 每个 section 的页面类型（主页 / 详情页 / 弹窗叠加态 / 抽屉叠加态）

### 2. 规划 sections

每个 section 对应一个 `macos-window` + `prd-panel`，分配：

- `section-id`（kebab-case，如 `section-account`、`section-acct-pwd`）
- `section-label` 与 `toc` 显示名 —— **两者必须完全一致**，便于对照

**命名格式（强制）**：`序号-模块-页面名`

```
01-账号-内部账号列表      06-角色-角色列表        12-门户-入口显隐对比
02-账号-新增账号          07-角色-新增角色        13-码表-业务场景码表
03-账号-编辑账号          08-角色-分配权限
04-账号-重置密码          09-角色-编辑角色
05-账号-停用确认          10-角色-删除确认
```

三段各自的规则：

| 段 | 规则 |
|---|---|
| **序号** | **全局连续两位数**，跨模块**不重新计数**（角色的第一页是 06 不是 01）。目的是拿编号能一步定位，不用先想它属于哪个模块 |
| **模块** | 二字为宜（账号 / 角色 / 门户 / 码表），同模块的页必须连续排布 |
| **页面名** | 动宾短语，直述该页干什么（内部账号列表 / 重置密码 / 删除被拦截），不写「弹窗」「页面」这类载体词——载体看图即知 |

**增删 section 后必须重排序号**，保持连续无空号。这是最易漏的一步：删掉某页后若不重排，会出现 04 之后直接跳 06，评审时以为丢了一页。

**改编号要同步三处**：`section-label`、TOC 条目、**PRD 旁注里的交叉引用**（如「见 07-角色-新增角色」）。漏了第三处会留下指向已不存在编号的死引用。

> 默认不拆分文件，所有 section 放在一个 HTML 中，垂直堆叠。

### 3. 为每个 section 构建 UI

参考 `references/css-components.md` 选择合适的 CSS 组件，不要随意 inline 替代或自造未列出的类名。

**UI 构建原则**：

- 使用真实示例数据，不用 `Lorem ipsum` 或空占位
- **表格选型**：列表页 / 业务宽表（≥5 列、带操作列）一律用 `.data-table`；`.usage-detail-table` 仅限用量日志类窄表，套到宽表会挤到折行
- `app-sidebar` 和 `win-chrome-bar` 是所有主页 section 的标配
- 弹窗叠加态：在主内容上 `position:absolute; inset:0; z-index` 加遮罩 + `.form-dialog` + `.modal-close-x`
- 抽屉叠加态：在主内容上加遮罩 + 右侧抽屉面板
- 详情页：左上角加 `← 返回 {上级页面}` 链接

### 4. 为每个 section 写功能概览

**先选模式**（见 `references/prd-rules.md` 开头「面板两种模式」）：

- 有 OpenSpec 变更包、评审目标是 spec → **评审型**：不手写 bullets，改为给 `prd-section` 打 `data-req` 锚点 + 留 `@proto-gen:spec` 标记块，由 `spec-inject.mjs` 从 `specs/*/spec.md` 逐字回填 Requirement + Scenario。详见 prd-rules 文末「评审型」专章，第 5 步注入
- 否则 → **产品语言改写型**：按下列规范手写 bullets

改写型遵循 `references/prd-rules.md` 的规范：

- 按页面从上到下视觉顺序排列
- 一个元素一条 bullet，句式见规范
- **优先用类名引用替代具体值描述**：不要写「展示一个紫色 #6366F1 圆角 8px 主按钮」，而写「展示主按钮（应用 `.btn-primary` 风格）」。视觉规范由 `theme.css` 与 `components.html` 沉淀，PRD / 旁注只引用类名
- **重复内容处理**：第一个 section 完整描述；后续 section 对相同通用结构用引用，只描述差异
- **顺手绑定 highlight**：按 `references/prd-highlight.md` 给 bullet 加 `data-target="<key>"`、给原型组件加 `data-comp="<key>"`，开启 PRD ↔ 原型 双向 hover 联动

### 5. 组装 HTML

参考 `references/html-structure.md` 的页面骨架模板，按顺序填入各 section。

`<head>` 内**必须带注入标记块**（见「自包含注入机制」，标记内先留空即可），页面自有样式写在标记块之外。写入用户指定目录下的 `{filename}.html` 后，跑一次注入脚本回填样式：

```bash
~/.claude/skills/proto-gen/assets/inject-assets.mjs {user-dir}/{filename}.html
```

**评审型追加一步**：回填 spec 真身并跑双审计（一致性 / 死锚点 / 覆盖率），全绿才可交付：

```bash
~/.claude/skills/proto-gen/assets/spec-inject.mjs {user-dir}/{filename}.html --change {变更包目录}
# 交付/CI 前用 --check 复核面板与 spec 是否同步
```

## 输出文件

- **HTML 原型**：`{user-dir}/{name}.html`（包含全部 sections，自包含单文件，token / 通用组件样式由注入脚本回填）
- **（可选）PRD md**：如用户需要，同步生成 `{name}.md`

## 验证

生成后检查：

1. HTML 文件可在浏览器直接打开（自包含，无本地文件依赖）；三对 `@proto-gen` 标记块均已由脚本回填、无空块
2. 各 section 都有 `toc-sidebar` 对应入口
3. `prd-panel` 内容与 UI 元素一一对应
4. 没有使用 `references/css-components.md` 中未列出的自造类名
5. **评审型**：`spec-inject.mjs --check` 全绿——面板已同步、无死锚点、覆盖率无缺口
