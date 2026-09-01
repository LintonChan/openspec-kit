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

1. **四件套出完** → 报告产出 + 「评审待定项」清单 → **问用户是否现在出评审原型**
2. **原型出完** → 报告 section 清单 + 待评审项 + 闭环审计结果 → **停下等评审**
3. **评审决议执行完** → 给对照表（决议 → 落点 → 状态）→ **等用户回复签字**，AI 不自己改状态

**硬规则**：

- 一次只做一个变更包。拆包方案里列了 N 个包也一样，**MUST 只做当前这一个**
- 未签字的包，**MUST NOT 开下一个包**
- 「评审待定项」**MUST NOT 由 AI 拍板**
- 用户说「继续」时，**MUST 先确认**是继续当前包的下一阶段，还是开下一个包

**`openspec-propose` / `opsx-propose` 里那句 `prefer making reasonable decisions to keep momentum`，在本仓被本节覆盖。** 这里的产出物是需求事实源，研发直接照着实现；AI 一路做下去的每个包都埋着没人评审过的决定，等人发现时几个包已互相焊死，返工成本是当初停下问一句的几十倍。

---

## 二、画原型：动手前 MUST 先完整读 proto-gen 的 SKILL.md

用户说「出原型」「画原型」「做个原型」「做个页面」或任何要产出可视化界面的任务 → **第一件事是完整读一遍 SKILL.md**：

```
<仓根>/.agent-skills/proto-gen/SKILL.md        ← 工具无关基准副本
<仓根>/.claude|.cursor|.codex|…/skills/proto-gen/SKILL.md   ← 各工具副本，内容相同
```

**MUST NOT 依赖自动触发**——部分工具（Codex 尤其）没有 skill 发现机制，不主动读就等于不存在，结果是手写一个普通 HTML，缺三段结构、缺 PRD 面板、缺样式注入，评审时才发现要重做。

**验收三条**（不满足即为没走 skill，MUST 重做）：

1. `<head>` 三对注入标记块已回填：`@proto-gen:theme` / `shared` / `highlight`
2. 每个 section = macos-window 外壳 + 右侧 360px `prd-panel` 一一对应
3. 顶部有 48px 固定导航栏

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
