#!/usr/bin/env bash
# doctor.sh —— 环境自检。装完跑一次；以后觉得哪里不对劲也跑它。
#
# 用法（在仓根目录跑）：
#   tools/doctor.sh
#
# 退出码：0 = 全通过；1 = 有必修项没过

REPO="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO" || exit 1

pass=0; fail=0; warn=0
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; pass=$((pass+1)); }
bad()  { printf '  \033[31m✗\033[0m %s\n     → %s\n' "$1" "$2"; fail=$((fail+1)); }
note() { printf '  \033[33m!\033[0m %s\n     → %s\n' "$1" "$2"; warn=$((warn+1)); }

echo
echo "openspec 环境自检 · $REPO"
echo "────────────────────────────────────────────────────"

# ── 1. 必备命令行工具 ───────────────────────────────────────────────────────
echo "[1/5] 命令行工具"
if command -v node >/dev/null 2>&1; then
  v=$(node -v); maj=${v#v}; maj=${maj%%.*}
  if [[ "$maj" -ge 18 ]]; then ok "node $v"
  else bad "node $v 版本过低" "装 LTS 版：brew install node 或 nodejs.org"; fi
else
  bad "没装 node" "brew install node，或去 nodejs.org 下 LTS 版"
fi

if command -v openspec >/dev/null 2>&1; then
  ok "openspec $(openspec --version 2>/dev/null | head -1)"
else
  bad "没装 openspec CLI" "npm i -g @fission-ai/openspec"
fi

command -v git >/dev/null 2>&1 && ok "git $(git --version | awk '{print $3}')" \
  || bad "没装 git" "xcode-select --install"

# ── 2. git 身份与凭据 ───────────────────────────────────────────────────────
echo
echo "[2/5] git 身份与凭据"
gn=$(git config user.name  2>/dev/null)
ge=$(git config user.email 2>/dev/null)
[[ -n "$gn" ]] && ok "user.name = $gn"  || bad "没配 user.name"  "git config --global user.name '你的名字'"
[[ -n "$ge" ]] && ok "user.email = $ge" || bad "没配 user.email" "git config --global user.email '你的邮箱'"

if git remote get-url origin >/dev/null 2>&1; then
  url=$(git remote get-url origin)
  ok "远端 origin = $url"
  if timeout 15 git ls-remote --exit-code origin HEAD >/dev/null 2>&1; then
    ok "远端可访问（凭据已生效）"
  else
    bad "连不上远端" "令牌没存进钥匙串或已失效；GitHub 跑 gh auth login，Gitee 重新生成私人令牌"
  fi
else
  note "本仓没配远端 origin" "如果这是 openspec-kit 本体、或还没建远端仓，可忽略"
fi

# ── 3. 仓库结构 ─────────────────────────────────────────────────────────────
echo
echo "[3/5] 仓库结构"
[[ -f AGENTS.md ]]               && ok "AGENTS.md（AI 工作规则）" || bad "缺 AGENTS.md" "打开的可能不是仓根目录"
[[ -f openspec/config.yaml ]]    && ok "openspec/config.yaml"     || bad "缺 openspec/config.yaml" "打开的可能不是仓根目录"
[[ -f openspec/requirements.md ]]&& ok "openspec/requirements.md" || note "缺 openspec/requirements.md" "新仓还没填需求，正常"
[[ -f openspec/AGENTS.md ]]      && ok "openspec/AGENTS.md（就近副本）" || note "缺 openspec/AGENTS.md" "跑 tools/sync-from-kit.sh 补"

if [[ -f openspec/config.yaml ]] && grep -q '【待填' openspec/config.yaml 2>/dev/null; then
  note "config.yaml 里还有【待填】" "新仓要先把 context 段填完，AI 才知道这是什么产品"
fi

# ── 4. proto-gen 原型 skill ─────────────────────────────────────────────────
echo
echo "[4/5] proto-gen 原型 skill"
if [[ -f .agent-skills/proto-gen/SKILL.md ]]; then
  ok "基准副本在（AI 会读这个路径）"
  n=$(find .agent-skills/proto-gen -type f 2>/dev/null | wc -l | tr -d ' ')
  [[ "$n" -ge 15 ]] && ok "文件数 $n（含 assets 与 references）" \
    || bad "只有 $n 个文件，副本不完整" "跑 tools/sync-proto-gen.sh"
  [[ -x .agent-skills/proto-gen/assets/inject-assets.mjs ]] \
    && ok "注入脚本可执行" \
    || note "注入脚本没有执行权限" "chmod +x .agent-skills/proto-gen/assets/inject-assets.mjs"
else
  bad "缺 .agent-skills/proto-gen/SKILL.md" "跑 tools/sync-proto-gen.sh；这是 AI 画原型时要读的文件"
fi

tools_with_skill=$(find . -maxdepth 3 -path './.git' -prune -o -type d -name proto-gen -print 2>/dev/null | wc -l | tr -d ' ')
[[ "$tools_with_skill" -ge 2 ]] && ok "已铺给 $((tools_with_skill-1)) 家 AI 工具" \
  || note "只有基准副本，没铺给各家工具" "跑 tools/sync-proto-gen.sh（不影响使用，AI 读基准副本即可）"

# ── 5. 规范校验 ─────────────────────────────────────────────────────────────
echo
echo "[5/5] 规范校验"
if command -v openspec >/dev/null 2>&1 && [[ -f openspec/config.yaml ]]; then
  out=$(openspec validate --all --strict 2>&1)
  if echo "$out" | grep -qi "no items found"; then
    ok "还没有变更包（新仓正常）"
  elif [[ $? -eq 0 ]] && ! echo "$out" | grep -qiE "error|invalid|✗"; then
    ok "openspec validate --all --strict 通过"
  else
    bad "validate 没通过" "跑 openspec validate --all --strict 看详情"
  fi
else
  note "跳过 validate" "openspec CLI 或 config.yaml 缺失"
fi

if [[ -x tools/sync-from-kit.sh ]] && [[ -d "${KIT:-$HOME/repos/openspec-kit}" ]] \
   && [[ "$REPO" != "$(cd "${KIT:-$HOME/repos/openspec-kit}" && pwd)" ]]; then
  if tools/sync-from-kit.sh --check >/dev/null 2>&1; then
    ok "通用层与 openspec-kit 一致"
  else
    note "通用层与 openspec-kit 有差异" "跑 tools/sync-from-kit.sh --check 看清单"
  fi
fi

# ── 汇总 ────────────────────────────────────────────────────────────────────
echo
echo "────────────────────────────────────────────────────"
printf '通过 %d · 提醒 %d · \033[31m必修 %d\033[0m\n' "$pass" "$warn" "$fail"
echo
if [[ $fail -eq 0 ]]; then
  echo "✓ 环境没问题，可以开工了。下一步看 QUICKSTART.md 第三步。"
  exit 0
else
  echo "✗ 上面标 ✗ 的先修掉。修不动就把这段输出整个发给 AI，让它帮你处理。"
  exit 1
fi
