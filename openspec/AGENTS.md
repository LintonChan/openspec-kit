# openspec/ 目录的 AI 规则

> 完整规则见**仓根** `AGENTS.md`。本文件是就近副本，解决「从软链进来时加载不到仓根规则」的问题。
> 两份内容冲突时以仓根为准；仓根改了本文件必须同步。

## 零、先搞清楚 git 仓在哪（最容易搞错）

本目录属于**本产品需求仓**，**不是**你当前打开的那个目录树的仓。

用户可能是通过软链进来的（例如 `个人文档库/需求设计/openspec` → `~/repos/<产品仓>/openspec`）。这种情况下直接跑 `git add` 会打到**个人文档库**上，团队仓什么都没提交。

**动手前先定位真身仓**：

```bash
REPO=$(git -C "$(dirname "$(readlink -f openspec/config.yaml 2>/dev/null || echo config.yaml)")" rev-parse --show-toplevel)
```

之后所有 git 命令都带 `-C "$REPO"`。

---

## 一、流程闸门：一次只做一个变更包，做完必须停

**三个强制停点**，每个停点 AI 都 MUST 停下等用户，MUST NOT 自行推进：

1. **四件套出完** → 报告产出 + 「评审待定项」清单 + **确认评审产出物类型（界面原型 / 策略说明，见第二节）** → **问用户是否现在出**
2. **产出物出完** → 报告清单 + 待评审项 + 闭环审计结果 → **停下等评审**
3. **评审决议执行完** → 给对照表（决议 → 落点 → 状态）→ **等用户回复签字**，AI 不自己改状态

**硬规则**：

- 一次只做一个变更包。拆包方案里列了 N 个包也一样，**MUST 只做当前这一个**
- 未签字的包，**MUST NOT 开下一个包**
- 「评审待定项」**MUST NOT 由 AI 拍板**
- 用户说「继续」时，**MUST 先确认**是继续当前包的下一阶段，还是开下一个包

**`openspec-propose` / `opsx-propose` 里那句 `prefer making reasonable decisions to keep momentum`，在本仓被本节覆盖。** 这里的产出物是需求事实源，研发直接照着实现；AI 一路做下去的每个包都埋着没人评审过的决定，等人发现时几个包已互相焊死，返工成本是当初停下问一句的几十倍。

---

## 二、评审产出物：先分岔，再动手

**不是每个变更包都有界面。** 两类产物**都是 `prototypes/NN-xxx/NN-xxx.html`**，都走 proto-gen 的主题与注入流程，**区别只在每个 section 里装什么**。

判据：**产出物里有没有用户或运营会直接看到的界面？**

| | 类型 | section 里装什么 |
|---|---|---|
| 有（用户端页面、后台页面） | **界面原型** | macos-window 外壳 + 右侧 360px prd-panel |
| 没有（策略 / 算法 / 契约 / 非功能） | **策略说明** | 规则说明块，**不套 macos-window / prd-panel**；四段结构与 UML 选型见 `config.yaml` 的 `rules.prototypes` |

- 类型应在**拆包方案或 proposal 里已标注**；没标注就**问用户，MUST NOT 默认成界面原型**
- 类型一经确认，**AI 不得自行改判**
- **两类都要先读 SKILL.md**——策略型也要用同一套主题、组件类名与注入流程

### 界面原型：动手前 MUST 先完整读 proto-gen 的 SKILL.md

用户说「出原型」「画原型」「做个原型」「做个页面」或任何要产出可视化界面的任务 → **第一件事是完整读一遍 SKILL.md**，路径固定，**不要去判断自己跑在哪个 AI 工具里**：

```text
<仓根>/.agent-skills/proto-gen/SKILL.md
```

各工具目录下的 `skills/proto-gen/` 是同内容拷贝，读上面这一份最省事——它一定存在。

**MUST NOT 依赖自动触发**——部分工具（Codex 尤其）没有 skill 发现机制，不主动读就等于不存在，结果是手写一个普通 HTML，缺三段结构、缺 PRD 面板、缺样式注入，评审时才发现要重做。

**验收三条**（不满足即为没走 skill，MUST 重做）：

1. `<head>` 三对注入标记块已回填：`@proto-gen:theme` / `shared` / `highlight`　（两类都要）
2. 顶部有 48px 固定导航栏　（两类都要）
3. 按类型分：
   - **界面型** = 每个 section 是 macos-window 外壳 + 右侧 360px `prd-panel` 一一对应
   - **策略型** = 每个 section 是规则说明块（**不得留空的 macos-window / prd-panel 壳**），四段齐全（输入输出 / 规则正文 / 边界异常 / 可配置项），图自包含不引 CDN

---

## 三、改完就提交推送（强制）

只要改动了本目录下任何内容，收尾时必须自己完成，不要等用户开口：

```bash
git -C "$REPO" pull --rebase
git -C "$REPO" add -A
git -C "$REPO" commit -m "<说清改了什么>"
git -C "$REPO" push
```

**为什么不能等**：这是多人共用仓。你改完不推，别人 pull 不到，会基于旧结论继续干活。

commit message 说清改了哪个变更包的什么、为什么改、依据哪条决议（R 号）。不要写 "update"。

**唯一例外**：用户明确说了「先别推」。

---

## 四、提交前自检

- 改过 `specs/` 或变更包 → `openspec validate --all --strict`
- 改过 proto-gen 相关 → `<仓根>/tools/sync-proto-gen.sh --check`
- 出过原型 → 按第二节三条验收判据自查
- 有冲突 → `pull --rebase` 后解决再推，**不要 `--force`**

---

## 五、三条硬边界

1. **`specs/` 只由 `openspec archive` 写**，任何人不手改
2. **不是当前用户 Owner 的变更包，先提醒用户再动**（所有权表见 `conventions/collaboration-convention.md` 第二节）
3. **跨包依赖读 `contracts/`，不读对方的 spec**——spec 随包归档会流转

---

## 六、需求事实源纪律

- `requirements.md` 是事实源，**AI 只回写状态，不新增/合并/删除需求点**，只能建议
- 评审决议改了需求 → **先回写 `requirements.md` 的对应条目，再改 spec**，两处缺一不可
- spec 必须自包含，禁止用「详见某文档」代替规则本身
- 列表页必须写全**列表五要素**（取值来源 / 排序 / 字段格式 / 缺省 / 分页）

三份完整规范在 `conventions/`：评审 / 发布 / 协作。
