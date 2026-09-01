# openspec-kit

产品需求的 **spec-driven 工作流种子仓**。国际中文事业部通用层，不含任何具体产品逻辑。

两个用途：

| 用途 | 怎么用 |
|---|---|
| **培训新同事** | clone 下来，拿自带的玩具需求（团队会议室预订）跑完 [QUICKSTART.md](QUICKSTART.md) 七步 |
| **起一条新产品线的需求仓** | `tools/init-new-repo.sh ~/repos/xxx-openspec "产品名"`，玩具需求会被清空 |

> ⚠️ **起新仓前先回答**：新产品线用不用现有仓的底座能力（账号 / 权限 / 后台 / 官网…）？
> **用任何一样 → 不要起新仓**，进现有仓单根共享。判据见 [collaboration-convention.md](openspec/conventions/collaboration-convention.md) 第一节。

---

## 里面有什么

```
AGENTS.md              ★ AI 工作规则 —— 流程闸门 + proto-gen 强制入口 + 六条纪律
CLAUDE.md              → @AGENTS.md
QUICKSTART.md          七步操作清单（给人看的）
tools/
  ├── init-new-repo.sh   从 kit 起一个新产品仓
  └── sync-proto-gen.sh  把 proto-gen 从上游铺给 7 家 AI 工具
.agent-skills/proto-gen/   proto-gen skill 基准副本（工具无关）
.claude/ .cursor/ .codex/ .trae/ .windsurf/ .lingma/ .qoder/
                           7 家 AI 工具入口（命令 + skill 副本，都是生成物）
openspec/
  ├── AGENTS.md          仓根规则的就近副本（软链进来时用）
  ├── config.yaml        项目上下文 + 逐 artifact 规则
  ├── requirements.md    需求事实源（kit 里装的是玩具需求）
  ├── conventions/       三份规范：评审 / 发布 / 协作
  ├── changes/           变更包
  ├── prototypes/        评审原型
  ├── contracts/         跨包契约
  ├── review-raw/        评审纪要原件
  └── specs/             现行账本（只由 archive 写）
training/
  └── trainer-guide.md   讲师手册：怎么带一场培训
```

---

## 这套流程要解决的问题

需求文档写完就过时、原型和需求对不上、评审结论散落在聊天记录里、开发照着旧版本实现。

解法是把需求拆成**三层，各自一个事实源**：

```
requirements.md   说「做什么」      规划层 · 产品语言 · 各 PM 只改自己的域
     ↓
changes/NN-xxx/   说「这次怎么做」  交付层 · 一包一 Owner · 四件套 + 原型 + 评审决议
     ↓
specs/            说「系统现在是什么样」 知识层 · 只由 archive 写，任何人不手改
```

配套两条纪律，缺一整套就垮：

1. **评审改了需求 → 需求列表和 spec 两处都要改**，只改一处必然漂移
2. **一次只做一个包，做完停下来等评审**（[AGENTS.md](AGENTS.md) 第一节的三个停点）

---

## AI 工具支持

七家工具都配好了入口，clone 即用：

| 工具 | 斜杠命令 | proto-gen |
|---|---|---|
| Claude Code / 通义灵码 / Qoder | `/opsx:propose` `/opsx:apply` `/opsx:archive` … | 自动发现 |
| Cursor / Trae | `/opsx-propose` `/opsx-apply` … | 自动发现（需较新版本） |
| Codex / Windsurf | 无斜杠命令，直接说「我要提一个新变更」 | **不自动发现**，靠 AGENTS.md 第二节强制 AI 主动读 |

> Codex 没有 skill 自动发现机制。[AGENTS.md](AGENTS.md) 第二节写了显式路径要求 AI 动手前先读 SKILL.md —— **这一节不能删**，删了 Codex 用户画出来的原型会缺三段结构和 PRD 面板。

---

## 维护

本仓是**通用层的单一事实源**。各产品仓从这里同步通用文件，方向是**单向的**（kit → 产品仓），产品仓不许反向改通用层。

改动通用层的流程：改 kit → 各产品仓同步 → 各仓跑一次 `openspec validate --all --strict`。

proto-gen 的真身不在本仓，在 `~/repos/claude-skills/proto-gen`；本仓的副本是 `sync-proto-gen.sh` 的产物，**禁止手改**。
