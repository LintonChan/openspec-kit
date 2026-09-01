#!/usr/bin/env bash
# sync-from-kit.sh —— 把通用层规则从 openspec-kit 同步进本产品仓
#
# 方向是**单向的**：kit → 产品仓。产品仓改了通用文件，下次同步会被覆盖。
# 要改通用规则，去 kit 里改，然后各产品仓跑一次本脚本。
#
# 用法（在产品仓根目录跑）：
#   tools/sync-from-kit.sh                      # 用默认 kit 路径
#   KIT=/path/to/openspec-kit tools/sync-from-kit.sh
#   tools/sync-from-kit.sh --check              # 只检查是否有漂移，不写入（提交前 / CI 用）
#
# config.yaml 特殊处理：只同步 naming / rules 两个顶层键（通用），
# 保留本仓自己的 context 段（产品特有）。

set -euo pipefail

KIT="${KIT:-$HOME/repos/openspec-kit}"
REPO="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
CHECK_ONLY=0
[[ "${1:-}" == "--check" ]] && CHECK_ONLY=1

[[ -d "$KIT" ]] || { echo "✗ kit 不在：$KIT（设 KIT 环境变量指定）" >&2; exit 1; }
[[ "$KIT" != "$REPO" ]] || { echo "✗ 这里就是 kit 本身，不用同步" >&2; exit 1; }

# ── 通用层文件清单：改这里来增减同步范围 ────────────────────────────────────
SYNC_FILES=(
  AGENTS.md
  CLAUDE.md
  QUICKSTART.md
  openspec/AGENTS.md
  .cursor/rules/openspec-workflow.mdc
  docs/where-rules-live.md
  openspec/conventions/collaboration-convention.md
  openspec/conventions/review-convention.md
  openspec/conventions/publish-convention.md
  tools/sync-proto-gen.sh
  tools/sync-from-kit.sh
  tools/init-new-repo.sh
  docs/git-setup.md
)
# config.yaml 里按键同步的顶层键
YAML_KEYS=(naming rules)

drift=0

# ── 整文件同步 ──────────────────────────────────────────────────────────────
for f in "${SYNC_FILES[@]}"; do
  [[ -f "$KIT/$f" ]] || { echo "⚠ kit 里没有 $f，跳过"; continue; }
  if [[ -f "$REPO/$f" ]] && cmp -s "$KIT/$f" "$REPO/$f"; then continue; fi
  if [[ $CHECK_ONLY -eq 1 ]]; then
    echo "✗ 与 kit 不一致：$f"; drift=1
  else
    mkdir -p "$(dirname "$REPO/$f")"
    cp "$KIT/$f" "$REPO/$f"
    echo "✓ 同步 $f"
  fi
done

# ── config.yaml 按键同步（保留本仓 context） ────────────────────────────────
python3 - "$KIT/openspec/config.yaml" "$REPO/openspec/config.yaml" "$CHECK_ONLY" "${YAML_KEYS[@]}" <<'PY'
import re, sys, pathlib

kit_p, repo_p, check_only, *keys = sys.argv[1:]
check_only = check_only == '1'
kit_s = pathlib.Path(kit_p).read_text(encoding='utf-8')
repo_f = pathlib.Path(repo_p)
if not repo_f.exists():
    print('⚠ 本仓没有 openspec/config.yaml，跳过'); sys.exit(0)
repo_s = repo_f.read_text(encoding='utf-8')

def block(src, key):
    """抓出一个顶层键连同它下面的缩进内容，含紧贴其上的注释块。"""
    m = re.search(rf'^{re.escape(key)}:', src, re.M)
    if not m: return None
    start = m.start()
    # 往上吞掉紧贴的注释行（# 开头，中间不许有空行）
    head = src[:start].rstrip('\n').split('\n')
    take = 0
    for line in reversed(head):
        if line.startswith('#'): take += 1
        else: break
    if take:
        start = len('\n'.join(head[:len(head)-take]))
        start = start + 1 if start else 0
    # 往下到下一个顶层键（行首非空白且非注释）
    rest = src[m.end():]
    nm = re.search(r'^(?![ \t#])\S', rest, re.M)
    end = m.end() + (nm.start() if nm else len(rest))
    return start, end, src[start:end].rstrip('\n') + '\n'

changed = False
out = repo_s
for key in keys:
    kb = block(kit_s, key)
    if not kb: print(f'⚠ kit 的 config.yaml 没有 {key}:，跳过'); continue
    _, _, kit_text = kb
    rb = block(out, key)
    if rb is None:
        if check_only: print(f'✗ 本仓 config.yaml 缺 {key}:'); changed = True
        else:
            out = out.rstrip('\n') + '\n\n' + kit_text
            print(f'✓ config.yaml 补上 {key}:'); changed = True
        continue
    s, e, cur = rb
    if cur.strip() == kit_text.strip(): continue
    if check_only:
        print(f'✗ config.yaml 的 {key}: 与 kit 不一致'); changed = True
    else:
        out = out[:s] + kit_text + '\n' + out[e:].lstrip('\n')
        print(f'✓ config.yaml 同步 {key}:'); changed = True

if changed and not check_only:
    repo_f.write_text(re.sub(r'\n{3,}', '\n\n', out), encoding='utf-8')
sys.exit(2 if (changed and check_only) else 0)
PY
[[ $? -eq 2 ]] && drift=1

echo
if [[ $CHECK_ONLY -eq 1 ]]; then
  [[ $drift -eq 0 ]] && echo "✓ 通用层与 kit 一致" || { echo "  → 跑 tools/sync-from-kit.sh 同步"; exit 1; }
else
  echo "同步完成。别忘了："
  echo "  openspec validate --all --strict"
  echo "  git add -A && git commit -m '同步 openspec-kit 通用层规则' && git push"
fi
