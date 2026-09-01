#!/usr/bin/env bash
# init-new-repo.sh —— 用 openspec-kit 起一个新的产品需求仓
#
# 做三件事：
#   ① 把 kit 复制到目标目录（不带 kit 自己的 git 历史）
#   ② 清空培训玩具需求，config.yaml 的 context 换成待填占位
#   ③ git init + 首次提交 + 铺一遍 proto-gen
#
# 用法：
#   tools/init-new-repo.sh ~/repos/my-product-openspec "我的产品线"
#
# ⚠️ 起新仓前先回答一个问题：新产品线用不用现有仓的底座能力（账号/权限/后台/官网…）？
#    用任何一样 → MUST 进现有仓单根共享，不要起新仓。
#    判据见 openspec/conventions/collaboration-convention.md 第一节。

set -euo pipefail

TARGET="${1:-}"
PRODUCT="${2:-<产品线名称>}"
KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

[[ -n "$TARGET" ]] || { echo "用法：$0 <目标目录> [产品线名称]" >&2; exit 1; }
[[ ! -e "$TARGET" ]] || { echo "✗ 目标已存在：$TARGET" >&2; exit 1; }

echo "→ 从 kit 复制骨架：$KIT → $TARGET"
mkdir -p "$TARGET"
rsync -a --exclude='.git' --exclude='training' "$KIT/" "$TARGET/"

cd "$TARGET"

# ── 清空玩具需求 ────────────────────────────────────────────────────────────
cat > openspec/requirements.md <<EOF
# 需求清单

> 本文件是**需求事实源**。规则以它为准，spec 与原型都不得与它冲突。
> AI 只回写状态，不新增/合并/删除需求点，只能建议。

## 需求域目录

| 域 | 名称 | 归属 |
|---|---|---|
| A1 | _（待填）_ | |

> 新增域时在此补一行并标注「共享底座」还是「某产品线专属」
> （见 \`conventions/collaboration-convention.md\` 第五节）。

---

## A1 · _（待填）_

**背景**：

**本期范围**：

**不做**：

### A1-1 · _（待填）_
EOF

# ── config.yaml 的 context 换成占位 ─────────────────────────────────────────
python3 - "$PRODUCT" <<'PY'
import re, sys, pathlib
product = sys.argv[1]
p = pathlib.Path('openspec/config.yaml')
s = p.read_text(encoding='utf-8')
placeholder = f'''context: |
  # 组织与产品线
  {product} —— 【待填：一句话说清这是什么产品、用户是谁、解决什么问题】
  【待填：有没有共用别的产品线的底座能力？共用哪些？】

  # 需求事实源
  需求 = openspec/requirements.md。**规则以它为准。**

  # 拆包
  【待填：本产品线切成几个 change、按什么切、各自 Owner 是谁】

  # 流程规范（openspec/conventions/）
  - 评审决议遵循 review-convention.md（第五张纸：review-notes + review-raw + 七步闭环 + 回写需求事实源）
  - 发布分发遵循 publish-convention.md（git 事实源、服务器渲染物、全英文命名）
  - 多人协作遵循 collaboration-convention.md（目录所有权、跨人走契约不互读 spec、单根还是独立仓的判据）

  # 纪律
  - 需求列表是事实源，不是一次性输入：评审待定项有结论、review-raw 决议要改需求、
    或画原型过程中产生需求补充/变更时，必须先回写 openspec/requirements.md 的对应条目
    （删掉「待定」字样），再改 specs/*/spec.md 的 Requirement 与 Scenario，两处缺一不可。
  - 需求列表必须自包含：规则性内容写全在条目正文，宁可与 spec 重复录入；
    大块参考资料放 openspec/references/ 用相对路径引用。
    判据：**同事不读你的 spec，能不能读懂需求。**
  - specs/ 是现行规格账本，只随 change 归档更新，不手改。
  - 二期需求点不进本期 change。
'''
s = re.sub(r'^context: \|\n(?:  .*\n|\n)*', placeholder, s, count=1, flags=re.M)
p.write_text(s, encoding='utf-8')
print('  ✓ config.yaml 的 context 已换成占位')
PY

# ── 清掉 kit 自带的培训痕迹 ─────────────────────────────────────────────────
rm -f openspec/changes/.gitkeep 2>/dev/null || true
find openspec/changes openspec/prototypes openspec/review-raw openspec/contracts \
     -mindepth 1 -maxdepth 1 -exec rm -rf {} + 2>/dev/null || true
for d in changes prototypes review-raw contracts specs references; do
  mkdir -p "openspec/$d"; touch "openspec/$d/.gitkeep"
done

# ── git init + proto-gen ───────────────────────────────────────────────────
git init -q
if [[ -x tools/sync-proto-gen.sh ]]; then
  tools/sync-proto-gen.sh >/dev/null 2>&1 && echo "  ✓ proto-gen 已铺给各家工具" \
    || echo "  ⚠ proto-gen 同步跳过（上游真身不在本机，仓内已有副本可直接用）"
fi
git add -A && git commit -qm "从 openspec-kit 初始化 ${PRODUCT} 需求仓"

cat <<EOF

✓ 新仓建好了：$TARGET

接下来三步：
  1. 填 openspec/config.yaml 的 context 段（所有【待填】）
  2. 填 openspec/requirements.md 的需求域与需求点
  3. 建远端仓后 git remote add origin <url> && git push -u origin main

⚠️ 别跑 openspec init —— 配置已经在仓里了，重跑会重置。
EOF
