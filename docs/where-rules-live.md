# 规则写在哪：一张决策表

> 给体系 Owner 看的。想加一条新规则、或改一条旧规则时，先查这张表决定落点。

## 判据：AI 什么时候会读到它

选文件的依据**不是**「这条规则属于什么主题」，而是「AI 在什么时机需要它」。放错时机 = 规则形同虚设。

| 你要加的规则 | 落点 | AI 何时读到 | 例子 |
|---|---|---|---|
| **AI 行为闸门** —— 任何时候都要遵守的边界 | `AGENTS.md`（仓根）**＋** `openspec/AGENTS.md`（就近副本）| **每次会话开头自动读**，七家工具都会 | 一次只做一个包；画原型先读 SKILL.md；改完就提交推送；不是自己 Owner 的包别动 |
| **起草某类文档的规则** —— 只在写这类产出物时才用得上 | `openspec/config.yaml` 的 `rules:` 段，按 `proposal:` / `specs:` 分组 | 跑 `openspec instructions` 时**由 CLI 强制注入**上下文 | 列表五要素；spec 必须自包含；可输入字段必须写明字符上限与计量单位；跨包引用必须可解析 |
| **产品背景** —— 只对本产品仓成立 | `openspec/config.yaml` 的 `context:` 段 | 创建 change / spec 时注入 | 业务线有哪几条、需求域怎么划、拆包方案、领域术语、单位约定 |
| **多步骤长流程** —— 几百字讲不完的 | `openspec/conventions/` 三份之一 | AI 按需打开（`AGENTS.md` 里留指针） | 评审七步闭环；发布分发流程；目录所有权与冲突避免 |
| **原型怎么画** | proto-gen 的 `SKILL.md` / `references/`，**真身在 `~/repos/claude-skills/proto-gen`** | 画原型时读（由 `AGENTS.md` 第二节强制） | 三段结构契约；四条铁律；组件类名；PRD 面板写法 |
| **评审产出物是界面原型还是策略说明** | 判据与闸门在 `AGENTS.md` 第二节开头；两类各自的写法在 `config.yaml` 的 `rules.prototypes` | 闸门每次会话读；写法在起草时由 CLI 注入 | 有没有用户会看到的界面；策略型的四段结构；UML 选型；产物必须自包含 |
| **需求本身** | `openspec/requirements.md` | 需求事实源，全程 | 具体需求点 |

---

## 三条选址原则

**1. 规则越具体、越针对某类产出物，越该往 `config.yaml` 的 `rules:` 走。**

「列表五要素」如果只写进 `AGENTS.md`，AI 读完开头再写到 spec 中段早忘了；写进 `rules.specs`，CLI 会在它动笔前直接塞进上下文。**这是 kit 里最容易放错的一类。**

**2. `AGENTS.md` 只放「必须时刻在场」的东西，且要短。**

它每次会话都被完整读一遍，塞太多会稀释掉真正关键的几条。判据：这条规则如果 AI 在任务中途忘了，会造成不可逆的后果吗？会 → 放 AGENTS.md；只是产出物质量差一点 → 放 conventions 或 rules。

**3. 一条规则只写一处，其余地方留指针。**

唯一的例外是 `AGENTS.md` 与 `openspec/AGENTS.md` 这对——后者是为了解决「从软链进目录时加载不到仓根规则」，**必须是副本，且改一处必须同步另一处**。

---

## 改完之后：怎么传到各产品仓

kit 是**通用层的单一事实源**，方向单向：

```
openspec-kit  ──(tools/sync-from-kit.sh)──▶  product-openspec
     ▲                                        my-other-product-openspec
     │                                        …
  在这里改
```

**流程**：

```bash
# ① 在 kit 里改规则
cd ~/repos/openspec-kit && vim AGENTS.md
git commit -am "闸门补一条：xxx" && git push

# ② 各产品仓拉一次
cd ~/repos/product-openspec
git pull
tools/sync-from-kit.sh
openspec validate --all --strict
git commit -am "同步 openspec-kit 通用层规则" && git push

# ③ 同事各自 git pull 就拿到了
```

**提交前自检**：`tools/sync-from-kit.sh --check` 会报出产品仓有没有偷偷改过通用文件。

### `config.yaml` 的特殊处理

这个文件是**混合的**：

| 键 | 归属 | 同步行为 |
|---|---|---|
| `context:` | 产品特有 | **不同步**，各仓自己维护 |
| `naming:` | 通用 | 从 kit 覆盖 |
| `rules:` | 通用 | 从 kit 覆盖 |

所以 `sync-from-kit.sh` 对它做的是**键级合并**而不是整文件覆盖。产品仓要加自己的 artifact 规则时，注意它会在下次同步时被覆盖——**产品特有的起草规则应当写进 `context:` 的「纪律」段，不要写进 `rules:`**。

### 同步范围在哪定义

`tools/sync-from-kit.sh` 顶部的 `SYNC_FILES` 数组，加减文件改那里。

---

## 一条新规则的完整落地清单

以「可输入字段必须写明字符数上限」为例，它同时是行为规则和起草规则，所以落了三处：

- [ ] `config.yaml` 的 `rules.specs` —— 写 spec 时强制注入（**主落点**）
- [ ] proto-gen `SKILL.md` 的铁律章节 —— 画原型时强制（原型和 spec 是两个时机，都要挡）
- [ ] `AGENTS.md` 第八节 —— 一句话 + 指针，保证 AI 全程有印象
- [ ] 跑 `tools/sync-from-kit.sh` 推给各产品仓
- [ ] proto-gen 改的话，回上游 `~/repos/claude-skills/proto-gen` 改，再跑 `tools/sync-proto-gen.sh`

**别忘了 proto-gen 的真身不在本仓。** 直接改仓内副本，下次同步会被静默覆盖。
