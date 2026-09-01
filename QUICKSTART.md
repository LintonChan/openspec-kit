# QUICKSTART · 七步跑通一个真实需求

> 这不是教程，是**操作清单**。
> 全程约 1 小时（其中第 4–6 步是你本来就要做的需求工作）。
>
> 不讲 OpenSpec 是什么、不讲为什么要 spec-driven。跑完你自然知道。

---

## 一、装环境（一次性，约 10 分钟）

```bash
# 1. 检查 node —— 没输出就去 nodejs.org 装 LTS 版
node -v

# 2. 装 openspec CLI（唯一需要安装的东西）
npm i -g @fission-ai/openspec
openspec --version      # 有版本号即成功
```

**3. 配 git 凭据** —— 照 [docs/git-setup.md](docs/git-setup.md) 走一遍（私人令牌 + 钥匙串，配一次永久生效）。

**不用装的**：

- ❌ proto-gen 原型 skill —— 已在仓里，clone 即用
- ❌ 任何规范文档 —— 已在 `AGENTS.md` 与 `openspec/config.yaml`，AI 自动读取遵守

---

## 二、clone（约 1 分钟）

```bash
git clone <你们产品仓的地址>
cd <仓名>
```

用你惯用的 AI 工具打开**仓根目录**（不是子目录）。七家工具都已配好入口：

| 你用的工具 | 打开后可用 |
|---|---|
| Claude Code / 通义灵码 / Qoder | `/opsx:propose` `/opsx:apply` `/opsx:archive` … |
| Cursor / Trae | `/opsx-propose` `/opsx-apply` `/opsx-archive` … |
| Codex / Windsurf | 无斜杠命令，直接说「我要提一个新变更」 |

> ⚠️ **不要跑 `openspec init`** —— 根已经初始化并提交，重跑会重置全仓配置。

---

## 三、认目录（5 分钟，只需知道东西在哪）

```
AGENTS.md             AI 工作规则 ← 出问题先来这里对照
openspec/
├── requirements.md   需求清单 ← 你的需求点写这里（规划层）
├── changes/NN-xxx/   变更包   ← 一个需求一个文件夹（交付层）
├── specs/            现行账本 ← 只随归档更新，任何人不手改（知识层）
├── contracts/        跨包契约 ← 要用别人包的东西，读这里，别读对方 spec
├── conventions/      三份流程规范
├── prototypes/NN-xxx/ 评审原型
└── review-raw/       评审纪要往这里丢
```

**三层关系**：需求清单说「做什么」→ 变更包说「这次怎么做」→ 归档后并进现行账本说「系统现在是什么样」。

### 打开 requirements.md 你会看到别人的需求 —— 这是对的

**你的需求也写进这一份，不要新建自己的。** 因为需求域是按**能力**切的，共享底座（账号 / 后台 / 官网这类）若每人一份，会被复制成 N 份然后各自漂移。

编号规则见 [collaboration-convention.md](openspec/conventions/collaboration-convention.md) 第五节。**动手前先通读现有全部域**，别开出跟别人重叠的新域；拿不准群里问一句。

**现在花 10 分钟读完那份 collaboration-convention** —— 它讲清楚哪些目录是你的、哪些不能碰、跨人怎么协作。这是唯一必读的规范，另两份用到时 AI 会自己遵守。

---

## ⛔ 先记住三个停点，不然后面会翻车

这套流程**不是让 AI 一口气跑完的**。三个地方必须停下来：

```
① 四件套出完 ──[停]── ② 评审原型出完 ──[停]── ③ 评审签字 ──[停]── 下一个包
```

**AI 已经被 [AGENTS.md](AGENTS.md) 第一节要求在这三处停下问你。** 但如果它没停、自顾自开了下一个包：

> 这是它违反了本仓规则，把 `AGENTS.md` 第一节甩给它，让它退回来。

**为什么必须停**：这里的产出物是需求事实源，研发直接照着实现。AI 一路做下去的三个包，每个都埋着没人评审过的决定；等发现时几个包的 spec、原型、契约已互相引用焊死，返工成本是当初停下来问一句的几十倍。

---

## 四、跑 propose：把真实需求变成变更包（约 20 分钟）

先 `git pull`，看一眼 `openspec/changes/` 现有最大序号，你的新包接着排。

然后对 AI 说（用你自己的话描述需求，越具体越好）：

```
/opsx:propose 我要做 XX 功能：<背景、用户是谁、要解决什么问题、
你已经想清楚的规则、你还没想清楚的地方>
```

AI 会产出**四件套**：

| 文件 | 是什么 |
|---|---|
| `proposal.md` | 范围与背景 + **评审待定项**（你没拍板的，AI 不许替你拍） |
| `design.md` | 技术决策与理由、跨包契约、数据模型 |
| `specs/<能力>/spec.md` | **开发的实现与验收依据**，每条 Scenario 可直接转测试用例 |
| `tasks.md` | 施工清单，按依赖排序 |

**这一步你要做的判断**：

- 「评审待定项」列的是 AI 认为需要你拍板的问题 —— **逐条看，别跳过**。跳过的结果是原型和 spec 里出现没人评审过的决定
- spec 里出现「详见某文档」= 缺陷，让它把规则原文写进去
- 列表页必须写全**列表五要素**（取值来源 / 排序 / 字段格式 / 缺省 / 分页），缺一条就退回重写
- 可输入的字段必须写明**字符数上限**，且写明按字符还是按字节 —— 中文场景下这不是措辞，是三分之二的容量差

跑完校验：

```bash
openspec validate <你的包名> --strict
```

**⛔ 停点①**：到这里停。AI 应当问你「是否现在出评审原型」。

---

## 五、出评审原型（约 10 分钟）

```
生成 NN-xxx 的评审原型
```

proto-gen 会产出自包含的 HTML（双击即开），放在 `openspec/prototypes/NN-xxx/`，目录与文件名 MUST 与变更包同名。

**四条铁律，AI 会自动遵守，你负责验收**：

1. **原型内容必须有需求依据** —— 每个控件都要能指回需求某一条。AI 认为该补的，会列成「待评审项」交你确认，不会自作主张画进去
2. **画布只放产品界面** —— 评审旁白（「经评审确认」这类）一律进右侧 PRD 面板，画布保持纯净
3. **交互链路必须闭环** —— 每个可点击操作都要能回答「点了之后到哪」，断点数必须为 0
4. **可输入字段必须有字符上限** —— 没定义的，列为待评审项，不许自己拍

**⚠️ 先验收「AI 到底走没走 skill」**，三条判据，缺一条就是没走，让它重做：

| 判据 | 怎么看 |
|---|---|
| 三对注入标记块已回填 | 搜 HTML 里的 `@proto-gen:theme`，块内应有大段 CSS，不是空的 |
| 每屏是「窗口 + 右侧 PRD 面板」一一对应 | 打开看右边有没有 360px 的说明面板 |
| 顶部有固定导航栏能切换页面 | 打开看最上面 |

**Codex / Windsurf 用户尤其要查这一条**——这两家没有 skill 自动发现机制，AI 很容易直接手写一个普通 HTML 交给你。

**闭环审计会逼出需求缺口**，这是原型最大的价值。真实案例：审「重置密码」链路时发现需求写了「超管重置即设定新密码」，却没说这个密码怎么交给员工——纯读文档发现不了，必须画链路才会撞上。

**⛔ 停点②**：原型出完停下，进入评审。

---

## 六、评审闭环（约 15 分钟）

1. **纪要丢进 `openspec/review-raw/`** —— 任意格式（md / docx / 截图都行），文件名 `R<全局序号>-<日期>-<主题>.md`，**只增不改不删**
2. 对 AI 说：

```
评审记录在 openspec/review-raw/R<N>-xxx.md，按评审决议规范提炼并更新相关变更包
```

3. AI 会走完七步闭环，产出 `review-notes.md`（第五张纸）并给你一张**对照表**（决议 → 落点 → 状态）
4. **你逐行核对**，确认后回复签字 → AI 把状态改成「已签字（Rn）」，变更包进入待施工

**这一步最容易漏的**：评审改了需求，只改了 spec 没回写 `requirements.md`（或反过来）。**两处缺一不可** —— 需求清单是产品语言的事实源，spec 是开发验收依据。AI 会做，但你要在对照表里核实。

**⛔ 停点③**：签字之前，**不要让 AI 开下一个包**。

---

## 七、交付给研发

按 [publish-convention.md](openspec/conventions/publish-convention.md) 发布原型链接给相关人，然后：

```bash
git pull --rebase        # 先吃掉别人的提交
git push                 # 你的结论别人才看得到
```

研发侧：clone 本仓到代码仓同级目录，读 `changes/NN-xxx/specs/` 实现，完成一项勾一项 `tasks.md`。

**上线后归档**（写进发版 checklist）：

```bash
openspec archive <你的包名>      # delta 并入 specs/，包移进 changes/archive/
```

---

## 跑完之后：日常两个动作

```bash
git pull      # 开工前
git push      # 收工后
```

漏 pull = 基于旧状态干活；漏 push = 别人看不到你的结论、可能重复劳动。

---

## 常见坑

| 现象 | 原因 | 处理 |
|---|---|---|
| **AI 不问就开了下一个包** | 它违反了 AGENTS.md 第一节；`opsx-propose` 自带的 `keep momentum` 在诱导它 | 把 AGENTS.md 第一节甩给它，让它退回来 |
| **原型是一张光秃秃的网页**，没有右侧 PRD 面板 | AI 没读 proto-gen 的 SKILL.md（Codex 无自动发现机制） | 让它先完整读 `.codex/skills/proto-gen/SKILL.md`（或你的工具对应路径）再重做 |
| 跑了 `openspec init` 把配置搞乱了 | 根已初始化，不该重跑 | `git checkout openspec/config.yaml` 还原 |
| 想改别人包里的东西 | 一包一 Owner | 找 Owner，别直接改（见协作规范第二节） |
| 需要别人包的接口 | 不读对方 spec | 读 `openspec/contracts/`，没有就找对方要（见协作规范第三节） |
| `requirements.md` 冲突 | 唯一多人写的文件 | `git pull --rebase` 后把冲突交给 AI，它看得懂两边意图 |
| 建包时序号撞了 | 建包前没 pull | 后 push 的改名（还没人引用时改名代价最小） |
| 改了 `.agent-skills/` 或 `skills/proto-gen/` 没生效 | 那是生成物 | 改动回上游 proto-gen 真身，找体系 Owner 重跑同步 |
| AI 写的 spec 里有「详见 XX 文档」 | 违反自包含 | 退回，让它把规则原文写进 spec |

---

## 下一步

- 仓库全貌与纪律：[README.md](README.md)
- AI 工作规则（出问题先查这份）：[AGENTS.md](AGENTS.md)
- 体系 Owner 专用 · 规则该写在哪个文件：[docs/where-rules-live.md](docs/where-rules-live.md)
