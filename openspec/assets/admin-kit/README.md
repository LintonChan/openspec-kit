# admin-kit — 管理后台原型底座（跨变更包共享）

管理后台原型的主题与页面模板。**用户端/官网原型不用本 kit**。

> 本目录由 **openspec-kit** 分发（`tools/sync-from-kit.sh`），属通用层——各产品仓的后台原型共用同一套形态。
> **改动回 kit 改**，再同步给各产品仓；在产品仓里直接改，下次同步会被覆盖。

## 位置约定（重要）

| 类别 | 放哪 | 为什么 |
|---|---|---|
| **原型文件** | `openspec/prototypes/<change-name>/*.html` | 独立于 change 包：OpenSpec schema 只认 proposal/specs/design/tasks 四个 artifact，且发布包结构本就 prototypes/ 与 openspec/ 并列（见 review-convention 第一节） |
| **本底座** | `openspec/assets/admin-kit/` | 所有后台变更包都用同一套 yudao 外壳，不属于任何单个变更包 |

形态对齐开发选定的框架 **yudao-ui-admin-vue3**（Element Plus 2.13.7）。所有尺寸与色值实测自框架源码与 EP 发布包，非照文档臆造——框架官方文档对布局几乎只字未提。

## 文件

| 文件 | 作用 |
|---|---|
| `admin-theme.css` | **主题单一事实源**。EP/yudao 的色板、圆角、字体、布局尺寸令牌 |
| `sync-theme.mjs` | 把 `admin-theme.css` / `admin-shell.css` 注入各原型的 `@admin-theme` / `@admin-shell` 标记块 |
| `admin-shell.css` | **外壳组件单一事实源**：yudao mixed-nav 外壳、表格、弹窗、树、多语言表单 |
| `crud-template.html` | **CRUD 页基准模板**：列表页 + 新增弹窗两个 section |

## 新建一个后台原型

1. 复制 `crud-template.html` 到 `openspec/prototypes/<change-name>/` 并改名
2. 只改三处：① 搜索区字段 ② 表格列与操作项 ③ 弹窗表单字段
3. 其余（卡片间距、按钮排布、分页位置、表头样式、弹窗页脚顺序）**一律不动**——它们是框架的固定形态
4. 跑注入（在仓根执行）：

```bash
.agent-skills/proto-gen/assets/inject-assets.mjs openspec/prototypes/<change-name>/
openspec/assets/admin-kit/sync-theme.mjs openspec/prototypes/<change-name>/
```

两条命令**顺序不能反**，且 `@admin-theme` 标记块在 HTML 里必须排在 `@proto-gen:theme` 之后——靠 CSS 后来者胜覆盖 proto-gen 的默认紫主题。脚本会校验，顺序不对直接报错。

**缺组件时加进 `admin-shell.css`**。`yd-` 是底座的命名空间：页面样式里**不得定义任何 `.yd-*` 类**，包括底座里还没有的——页面私有类用包前缀（如 `.b05-xxx`）。
为什么连「新起的」也不行：底座日后新增同名类时，页面没写到的属性会漏进来。06 的私有 `.yd-drawer` 就被后来底座加的同名抽屉撑宽过（`min-width:860px`）。

## 改主题

在 **openspec-kit** 里改 `admin-theme.css`（主题）或 `admin-shell.css`（外壳组件），跑 `tools/sync-from-kit.sh` 推给产品仓，然后在产品仓跑：

```bash
openspec/assets/admin-kit/sync-theme.mjs     # 不带参数 = 刷新本目录模板 + openspec/prototypes/ 下在制原型
```

**不带参数时跳过 `prototypes/archive/`**：已归档原型是签字时的冻结快照，重刷等于回改已归档包。确需重刷就显式点名该文件。

**不要去改 proto-gen 的全局 `theme.css`** —— 那是 skill 级共享资产，改了会让用户端原型下次注入时一起变成 EP 蓝。

## 已知的框架形态（易错点，原型必须照做）

| 项 | 框架实际形态 | 常见误解 |
|---|---|---|
| 布局 | `mixed-nav`：顶部一级域 + 左侧二级菜单 | 框架**默认**是 `sidebar-nav` 纯左侧菜单，须显式切换 |
| 搜索区 | **不可折叠**，控件统一 240px | 以为有展开/收起 |
| 操作按钮 | 与搜索按钮**同一行**流式排布 | 以为单独起一行 |
| 表头 | **白底灰字** | 以为是灰底 |
| 操作列 | 文字链接型，最右，约 300px | 以为是按钮块 |
| 弹窗页脚 | **「确定」在左、「取消」在右** | 与常规习惯相反 |
| 表单载体 | 弹窗 Dialog（框架内 369 处 vs 抽屉 10 处） | 以为用抽屉或新页面 |

## 模板示例里的两处需求适配（非框架默认，照抄前注意）

模板的示例数据是「内部账号」列表，带了两处产品决议，**不是框架形态**，别的列表不要照搬：

- **操作列无「删除」**：该需求要求账号只可停用不可删除，而框架用户管理自带删除入口，须屏蔽且不为其分配权限键
- **建号密码由超管填写**：不设全局固定初始密码，不做首登强制改密

## 离线

原型自包含，双击即开，无任何外部请求。`sync-theme.mjs` 会自动停用 proto-gen 默认主题带的 Google Fonts import（后台用 EP 系统字体栈，用不上它）。
