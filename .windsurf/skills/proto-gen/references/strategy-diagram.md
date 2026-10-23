# 策略型配图规范（pg-dg 内联 SVG）

策略型 section 里的图**手写内联 SVG**，不再用 Mermaid。规则提炼自 [diagram-design](https://github.com/cathrynlavery/diagram-design)（MIT），并按 proto-gen 主题与中文场景改写。

**为什么不用 Mermaid**：Mermaid 自动布局把 18 个节点排成一条 2500px 的长链，评审要滚好几屏才能看完一张图；样式也跟原型主题脱节。手绘 SVG 能压到一屏，颜色、字体跟着 `theme.css` 走。

---

## 1. 先问：要不要画

- 图**只在文字讲不清时才画**，一个包通常 0~2 张。如果一张 3 列表格就能讲清，就用表格
- 图旁必须有「图的结论」文字；**图不是事实源**，评审改的是文字，图跟着改
- 图里的每个节点都要能对应到正文规则（铁律「内容必须有需求依据」同样适用）

## 2. 选型

| 表达对象 | 图型 | 布局要点 |
|---|---|---|
| 分支判断、多路由、算法步骤 | 流程图 | 自上而下；菱形=判断（≤3 个出口）、圆角矩形=步骤、胶囊=起止；每个出口都要标签 |
| 状态流转、生命周期 | 状态机 | 状态用圆角矩形，连线标触发条件；终态用胶囊 |
| 多方交互、契约调用时序 | 时序图 | 参与方横排，生命线竖直，消息按时间自上而下 |
| 数据结构与引用关系 | ER 图 | 实体卡片列字段，关系线标基数 |

本机装了 diagram-design 插件的，画前可以读它对应的 `type-*.md` 看布局写法。**颜色和字体一律以本文件为准**，不要用它的 style-guide。

## 3. 复杂度预算（单张图）

| 项 | 上限 |
|---|---|
| 节点 | 9 |
| 连线 | 12 |
| 焦点（`is-focal`） | 2 处：通常 1 个核心节点 + 1 条核心路径 |

超了先合并：**总是一起出现的两个节点就是一个节点**。例如「建候选池」和「排除」合成一个步骤，多级回退的判断链合成一个步骤里的有序列表。合并后还超，就拆成「总览 + 细节」两张图。

## 4. 连线六条硬规则

1. **只走直角**：不在同一水平/竖直线上的两点，用直角折线，拐角做 8px 圆角（`Q` 控制点或弧线）；**禁止斜线**。连线从节点边的直线段垂直出入，离拐角 ≥8px
2. **标签不压线**：标签放在不透明蒙版（`.dg-mask`）上，蒙版与连线保留 6~10px 间距；竖直线段的标签放在侧边
3. **不重叠**：两条线不共用路径；平行走线间距 ≥12px；单点交叉用跨线小弧
4. **同一条边上的多个连接点分开**：间距 ≥12px，按 `L × k / (N + 1)` 均分
5. **不从无关节点背后穿过**：绕行
6. **标签蒙版不压后画的节点**：标签要放在空白处

**绘制顺序**：背景 → 连线 → 标签 → 节点（让线压在节点下面）。

## 5. 中文排版

- **宽度预算按字符算**：全角字符（含全角标点 `（）「」，。：`）每个 1em，其余字符 0.6em（等宽 0.62em）。求和乘以字号，加左右内边距后向上取 4 的倍数。**不要按「汉字数」估算**：`ID 去重` 里的 `I`、`D`、空格也要计宽
- **字号下限 12px**：中文笔画密，小于 12px 就糊。放不下就删字，不要缩字号
- **连线标签、图例用 12px 500 sans**：中文不做大写、不加字距
- **步骤编号芯片可以用等宽小字**（`STEP 2–3`，9px）：它是拉丁技术值，不是中文
- **字体**：沿用 `--font-sans`，中文字形走系统中文字体（macOS 苹方、Windows 微软雅黑），与正文一致。不单独引中文网络字体

## 6. 类名（定义在 shared.css，随注入下发）

| 类 | 用于 |
|---|---|
| `svg.pg-dg` | 图根节点 |
| `.dg-bg` / `.dg-mask` | 背景 / 标签蒙版 |
| `.dg-node` | 步骤（`rect rx=6`） |
| `.dg-decision` | 判断（`polygon` 菱形） |
| `.dg-terminal` | 起止 / 结果（`rect rx=20` 胶囊） |
| `.is-focal` | 焦点：加在 `.dg-node` / `.dg-decision` / `.dg-edge` / `.dg-head` / `.dg-label` / `.dg-chip` / `.dg-chip-text` 上 |
| `.dg-edge`（`.is-dashed`） | 连线（虚线 = 可选 / 回程 / 异步） |
| `.dg-head` | marker 里的箭头 |
| `.dg-name` 14/600 · `.dg-dname` 13/600 · `.dg-text` 12 · `.dg-label` 12/500 | 节点名 · 菱形内文字 · 正文行 · 连线标签与图例 |
| `.dg-chip` + `.dg-chip-text` | 步骤编号芯片（对应正文表格的步骤号） |
| `.dg-rule` | 图例上方分隔线 |

**几何写在属性里，颜色和字体只写类名**，禁止在 SVG 里写 hex 或 `font-family`。节点 `rect` 额外带 `stroke="currentColor"` 属性，只是为了让几何校验识别成节点，实际颜色由类覆盖。

## 7. 骨架

```html
<div class="rules-diagram">
<svg class="pg-dg" viewBox="0 0 1040 1012" width="1040" role="img"
     aria-labelledby="dg-<slug>-title dg-<slug>-desc" xmlns="http://www.w3.org/2000/svg">
  <title id="dg-<slug>-title">出门测自动选题流程</title>
  <desc id="dg-<slug>-desc">一句话说清图的内容（不描述形状）。</desc>
  <defs>
    <marker id="dg-<slug>-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" class="dg-head"/></marker>
    <marker id="dg-<slug>-arrow-focal" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" class="dg-head is-focal"/></marker>
  </defs>
  <rect width="1040" height="1012" class="dg-bg"/>
  <!-- 连线 -->
  <path d="M400 200 V248" class="dg-edge" marker-end="url(#dg-<slug>-arrow)"/>
  <!-- 标签：蒙版高 16，与线隔 8 -->
  <rect x="408" y="216" width="20" height="16" rx="2" class="dg-mask"/>
  <text x="418" y="228" class="dg-label" text-anchor="middle">是</text>
  <!-- 节点 -->
  <polygon points="400,96 528,148 400,200 272,148" class="dg-decision"/>
  <rect x="140" y="248" width="520" height="116" rx="6" class="dg-node" stroke="currentColor"/>
  <rect x="156" y="264" width="60" height="16" rx="2" class="dg-chip"/>
  <text x="186" y="275.5" class="dg-chip-text" text-anchor="middle">STEP 2–3</text>
  <text x="226" y="277" class="dg-name">建候选池</text>
  <text x="156" y="304" class="dg-text">只取当前 lesson 关联题目的最新线上已审核通过、未停用版本</text>
  <!-- 图例：底部横条，viewBox 高度为它多留约 60px -->
</svg>
</div>
<p class="rules-conclusion"><b>图的结论：</b>……</p>
```

- **id 前缀 `dg-<slug>-`**：同一页面里有多张图时，marker 和 title 的 id 不会撞
- **固定 `width` = viewBox 宽**：图按原尺寸显示，宽版页面上不会被放大发虚；窄屏由 `max-width:100%` 缩小
- 步骤节点内的文字**左对齐**：芯片 + 节点名一行，正文从下一行开始，行距 20；节点高 = `56 + 20 × 行数`
- 坐标、尺寸、间距一律取 4 的倍数；节点之间的竖向间距 48

**完整样例**：`components.html` 里的「策略配图」一节（出门测自动选题流程，9 节点 / 9 连线 / 2 处焦点）。

## 8. 交付前自检

- [ ] 删掉任何一个节点或连线，读者会不会看不懂？不会就删
- [ ] 焦点 ≤2 处，图例覆盖全部用到的图形，且没有多余项
- [ ] 六条连线规则逐条过；装了 diagram-design 的，跑一次几何校验：
      `python3 ~/.claude/plugins/cache/diagram-design/diagram-design/*/scripts/verify-geometry.py <file>`（0 finding 才过）
- [ ] 每行文字都按第 5 节的宽度预算放得下
- [ ] `<title>` 是 svg 的第一个子元素，`<title>`、`<desc>` 都已填写
- [ ] 图下方有「图的结论」，且与正文规则一致
