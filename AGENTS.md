# AGENTS.md · 本仓的 AI 工作规则

本仓是产品的**需求事实源**，多位 PM 与研发共用。以下规则对所有 AI 会话生效，**优先级高于任何 skill、slash command 或工具自带的默认行为**。

> 本文件由 [openspec-kit](https://gitee.com/chinesia_0/openspec-kit) 分发，属通用层。
> 产品特有的内容（业务背景、需求域、拆包方案）写在 `openspec/config.yaml` 的 `context:` 段，不要写进本文件。

---

## 一、流程闸门：一次只做一个变更包，做完必须停

**这是本仓最容易被 AI 违反的规则，且违反的代价最大。**

### 三个强制停点

```
需求描述 ──▶ ① 四件套 ──[停]──▶ ② 评审原型 ──[停]──▶ ③ 评审签字 ──[停]──▶ 下一个包
             proposal        prototypes/          review-notes
             design          NN-xxx.html          状态=已签字(Rn)
             specs
             tasks
```

| 停点 | AI **MUST** 做的事 | AI **MUST NOT** 做的事 |
|---|---|---|
| ① 四件套出完 | 报告产出了什么、「评审待定项」有哪几条，然后**问用户是否现在出评审原型** | 不问就接着画原型；不问就开下一个包 |
| ② 原型出完 | 报告 section 清单 + 待评审项 + 闭环审计结果，然后**停下等用户评审** | 自行认定「原型没问题」就往下走 |
| ③ 评审决议执行完 | 给出对照表（决议 → 落点 → 状态），**等用户逐行核对并回复签字** | 自己把状态改成「已签字」 |

### 硬规则

1. **一次只做一个变更包。** 即使拆包方案里列了 9 个包、即使用户一次性描述了整条业务线，**也 MUST 只做当前这一个包**。
2. **未签字的包，MUST NOT 开下一个包。** 签字状态看该包 `review-notes.md` 的头部状态行。
3. **「评审待定项」MUST NOT 由 AI 拍板。** 列出来交用户，用户没回答就不许写进 spec、更不许画进原型。
4. **用户说「继续」「下一步」时，MUST 先确认是继续当前包的下一阶段，还是开下一个包。** 这两件事代价差一个数量级。

### 显式覆盖：`keep momentum` 在本仓不成立

`openspec` CLI 生成的 `openspec-propose` / `opsx-propose` 里有这么一句：

> *If context is critically unclear, ask the user - but prefer making reasonable decisions to keep momentum*

**这句在本仓被本节覆盖。** 那是给"一个人写代码"设计的默认值——保持推进比停下问更划算。本仓不是这个场景：

**为什么必须停**：这里的产出物是**需求事实源**，下游是研发直接照着实现。AI 一路做下去的三个包，每个包里都埋着没人评审过的决定；等人发现时，三个包的 spec、原型、契约已经互相引用焊死，返工成本是当初停下来问一句的几十倍。

**判据**：这个决定错了，是**改一行字**，还是**推翻一个包**？后者就停下来问。

---

## 二、画原型：动手前 MUST 先完整读 proto-gen 的 SKILL.md

### 触发条件（宽松匹配，命中任意一条即适用）

用户说「出原型」「画原型」「做个原型」「生成 NN-xxx 的评审原型」「做个页面看看」「搞个 HTML 演示」，或任何需要产出**可视化界面**的任务。

### MUST 做的第一件事

**先用文件读取工具完整读一遍 SKILL.md，再动手。** 按你正在用的工具选路径（都是同一份内容）：

| 工具 | 路径 |
|---|---|
| Claude Code | `.claude/skills/proto-gen/SKILL.md` |
| Cursor | `.cursor/skills/proto-gen/SKILL.md` |
| Codex | `.codex/skills/proto-gen/SKILL.md` |
| Trae / Windsurf / 通义灵码 / Qoder | `<对应工具目录>/skills/proto-gen/SKILL.md` |
| 都不匹配 | `.agent-skills/proto-gen/SKILL.md`（工具无关基准副本） |

**MUST NOT 依赖自动触发。** 部分工具（Codex 尤其）没有 skill 自动发现机制，`skills/` 目录对它就是一堆普通文件——不主动读就等于不存在，结果是你手写一个普通 HTML 交上去，缺三段结构、缺 PRD 面板、缺样式注入，评审时才被发现要重做。

SKILL.md 里还会指向 `references/` 下的细则（页面骨架、组件类名、PRD 写法），**按它的指引读，不要凭印象写**。

### 验收判据（人和 AI 都用这三条自查）

产物不满足任意一条，就是**没走 skill**，MUST 重做：

1. `<head>` 里有三对注入标记块，且已被脚本回填（不是空块）：
   `@proto-gen:theme` / `@proto-gen:shared` / `@proto-gen:highlight`
2. 每个 section 是 **macos-window 外壳 + 右侧 360px `prd-panel`** 的一一对应结构，不是一张光秃秃的页面
3. 顶部有 48px 固定导航栏，能在各 section 间切换

生成完 MUST 跑一次注入脚本，产物才是自包含单文件：

```bash
.agent-skills/proto-gen/assets/inject-assets.mjs openspec/prototypes/NN-xxx/
```

---

## 三、改完就提交推送（强制）

**只要改动了 `openspec/` 下任何内容，收尾时必须自己完成提交推送**，不要等用户开口：

```bash
git pull --rebase        # 先吃掉别人的提交
git add -A
git commit -m "<说清改了什么>"
git push
```

**为什么不能等**：这是共用仓。你改完不推，别人 pull 不到，会基于旧结论继续干活，甚至重复劳动。用户会忘记推送——所以这件事由你负责。

**commit message 要求**：说清改了哪个变更包的什么、为什么改、依据哪条决议（R 号）。不要写 "update"。

**唯一例外**：用户明确说了「先别推」。

---

## 四、提交前自检

- 改过 `specs/` 或变更包 → 跑 `openspec validate --all --strict`
- 改过 proto-gen 相关 → 跑 `tools/sync-proto-gen.sh --check`
- 出过原型 → 按第二节三条验收判据自查
- 有冲突 → `git pull --rebase` 后解决再推，不要 `--force`

---

## 五、目录所有权

| 路径 | 谁能写 |
|---|---|
| `changes/NN-xxx/`、`prototypes/NN-xxx/` | 该包 Owner 独占 |
| `contracts/` | 供稿方写，消费方只读 + 会签 |
| `requirements.md` | 各 PM 只改自己需求域的行 |
| `review-raw/` | 全局共用，只增不改不删 |
| `specs/` | **只由 `openspec archive` 写，任何人不手改** |
| `conventions/`、`tools/`、`config.yaml`、`AGENTS.md` | 体系 Owner |

**要改的文件不属于当前用户 Owner 的包 → 先提醒用户，别直接改。**

详见 `openspec/conventions/collaboration-convention.md`。

---

## 六、跨包依赖读契约，不读对方 spec

需要别的变更包的东西时，读 `openspec/contracts/`。对方 spec 会随包归档流转，直接引用会断链，也会把两个包焊死。

---

## 七、生成物禁止手改

- `.agent-skills/proto-gen/` 及各工具目录下的 `skills/proto-gen/` 副本 —— 改动回上游 proto-gen 真身，再跑 `tools/sync-proto-gen.sh`
- 各工具目录的 `openspec-*` skill 与 `opsx` 命令 —— 由 `openspec update` 生成
- 原型索引页等脚本产物 —— 重跑生成脚本

---

## 八、需求事实源纪律

- 需求清单 `openspec/requirements.md` 是事实源，**AI 只回写状态，不新增/合并/删除需求点**，只能建议
- 评审决议改了需求 → **先回写 requirements.md 的对应条目，再改 spec**，两处缺一不可
- spec 必须自包含，禁止用「详见某文档」代替规则本身
- 列表页必须写全**列表五要素**（取值来源 / 排序 / 字段格式 / 缺省 / 分页），缺一条即退回重写

完整规范见 `openspec/conventions/` 三份：评审 / 发布 / 协作。
