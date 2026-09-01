#!/usr/bin/env bash
# sync-proto-gen.sh —— 把 proto-gen skill 从上游真身同步进本仓，并铺给各家 AI 工具
#
# 上游真身：~/repos/claude-skills/proto-gen（只在那里改，改完跑本脚本发布）
# 仓内基准：.agent-skills/proto-gen/（工具无关）
# 各家副本：<工具目录>/skills/proto-gen/（由基准复制，禁止手改）
#
# 用法：
#   tools/sync-proto-gen.sh                    # 用默认上游路径
#   PROTO_GEN_SRC=/path/to/proto-gen tools/sync-proto-gen.sh
#   tools/sync-proto-gen.sh --check            # 只检查是否已同步，不写入（CI / 提交前用）

set -euo pipefail

SRC="${PROTO_GEN_SRC:-$HOME/repos/claude-skills/proto-gen}"
REPO="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
BASE="$REPO/.agent-skills/proto-gen"
CHECK_ONLY=0
[[ "${1:-}" == "--check" ]] && CHECK_ONLY=1

# 排除项：git 元数据、评测集、截图（仅上游开发用，420K）、系统垃圾
EXCLUDES=(--exclude='.git' --exclude='.gitignore' --exclude='evals'
          --exclude='.DS_Store' --exclude='assets/screenshots' --exclude='Untitled')

[[ -d "$SRC" ]] || { echo "✗ 上游真身不存在：$SRC" >&2; exit 1; }

# 各家工具的 skills 目录 = openspec init 生成的那些，动态发现，新增工具无需改脚本
TOOL_DIRS=()
while IFS= read -r _d; do TOOL_DIRS+=("$_d"); done \
  < <(find "$REPO" -maxdepth 2 -type d -name skills -not -path "*/.git/*" | sort)
[[ ${#TOOL_DIRS[@]} -gt 0 ]] || { echo "✗ 未找到任何 <工具>/skills 目录，先跑 openspec init --tools" >&2; exit 1; }

if [[ $CHECK_ONLY -eq 1 ]]; then
  drift=0
  rsync -rn --delete --itemize-changes "${EXCLUDES[@]}" "$SRC/" "$BASE/" | grep -q . && {
    echo "✗ .agent-skills/proto-gen 与上游不一致"; drift=1; }
  for d in "${TOOL_DIRS[@]}"; do
    rsync -rn --delete --itemize-changes "$BASE/" "$d/proto-gen/" | grep -q . && {
      echo "✗ ${d#$REPO/}/proto-gen 与基准不一致"; drift=1; }
  done
  [[ $drift -eq 0 ]] && echo "✓ proto-gen 全部同步" || echo "  → 跑 tools/sync-proto-gen.sh 修复"
  exit $drift
fi

# 上游 → 仓内基准
mkdir -p "$BASE"
rsync -a --delete "${EXCLUDES[@]}" "$SRC/" "$BASE/"
echo "✓ 上游 → .agent-skills/proto-gen  ($(find "$BASE" -type f | wc -l | tr -d ' ') 文件)"

# 基准 → 各家工具
for d in "${TOOL_DIRS[@]}"; do
  rsync -a --delete "$BASE/" "$d/proto-gen/"
  echo "✓ 基准 → ${d#$REPO/}/proto-gen"
done

echo
echo "共铺 ${#TOOL_DIRS[@]} 家工具。这些副本是生成物，禁止手改——改动一律回上游 $SRC。"
