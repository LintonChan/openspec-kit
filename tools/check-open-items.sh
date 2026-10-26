#!/usr/bin/env bash
# check-open-items.sh —— 签字 / 归档前的闸门：待定项清没清、异常场景漏没漏
#
# 先查 config.yaml 能否被 CLI 解析，再查三件事（任一不过即退出码 1）：
#   ① proposal.md 里还有未勾的待定项        `- [ ] Q<n> …`
#   ② 包内 spec 里还残留待定标记：TBD、（待定）、待定：、待确认
#   ③ 包内 spec 的某条 Requirement 既没有「异常：」开头的 Scenario，
#      也没有声明「异常：不适用（原因）」——即异常路径被静默略过
#
# 用法（在产品仓根目录跑）：
#   tools/check-open-items.sh                 # 查 openspec/changes/ 下全部活跃包
#   tools/check-open-items.sh 05-xxx          # 只查一个包
#
# 规则正本：openspec/config.yaml 的 rules.proposal / rules.specs，
#           openspec/conventions/review-convention.md 第二节。

set -euo pipefail

REPO="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
CHANGES="$REPO/openspec/changes"

if [[ $# -gt 0 ]]; then
  dirs=("$CHANGES/$1")
  [[ -d "${dirs[0]}" ]] || { echo "✗ 没有这个包：$1" >&2; exit 1; }
else
  dirs=()
  for d in "$CHANGES"/*/; do
    [[ "$(basename "$d")" == "archive" ]] && continue
    dirs+=("${d%/}")
  done
fi

# config.yaml 能否被 openspec CLI 解析——解析失败时 CLI 只打一行 Warning 就整份忽略，
# context 与 rules 全部不注入，validate 也不报。用 CLI 自带的 yaml 包解析，口径与 CLI 一致
config_parse_error() {
  local bin pkg
  bin="$(command -v openspec 2>/dev/null)" || return 0
  pkg="$(cd "$(dirname "$(readlink -f "$bin")")/.." && pwd)"
  node -e '
    const r = require("module").createRequire(process.argv[1] + "/package.json");
    try { r("yaml").parse(require("fs").readFileSync(process.argv[2], "utf8")) }
    catch (e) { console.log(e.message.split("\n")[0]) }' "$pkg" "$1" 2>/dev/null || true
}

err="$(config_parse_error "$REPO/openspec/config.yaml")"
if [[ -n "$err" ]]; then
  echo "✗ openspec/config.yaml 解析失败，CLI 会整份忽略（rules 全部失效）：$err"
  echo "  常见原因：列表项以 ** 开头、正文里有英文「冒号+空格」"
  exit 1
fi

[[ ${#dirs[@]} -gt 0 ]] || { echo "✓ 没有活跃变更包"; exit 0; }

fail=0
for d in "${dirs[@]}"; do
  name="$(basename "$d")"
  out=""

  # ① 未勾的待定项
  if [[ -f "$d/proposal.md" ]]; then
    hits="$(grep -nE '^[[:space:]]*- \[ \] Q[0-9]+' "$d/proposal.md" || true)"
    [[ -n "$hits" ]] && out+="  ✗ 待定项未拍板（proposal.md）：\n$(sed 's/^/      /' <<<"$hits")\n"
  fi

  while IFS= read -r spec; do
    rel="${spec#"$d/"}"

    # ② 残留待定标记（只认标记写法，「待定条件」这类正文用词不算）
    hits="$(grep -nE 'TBD|[（(]待定|待定[)）：:]|待确认' "$spec" || true)"
    [[ -n "$hits" ]] && out+="  ✗ spec 残留待定字样（$rel）：\n$(sed 's/^/      /' <<<"$hits")\n"

    # ③ Requirement 缺异常覆盖（REMOVED / RENAMED 段不查）
    hits="$(awk '
      function flush() { if (req != "" && !ok) printf "%d: %s\n", line, req }
      /^## /             { flush(); req=""; skip = ($0 ~ /REMOVED|RENAMED/); next }
      /^### Requirement:/ { flush(); req=""; if (skip) next
                            req=$0; sub(/^### Requirement:[[:space:]]*/, "", req)
                            line=NR; ok=0; next }
      req != "" && /^#### Scenario:[[:space:]]*异常：/ { ok=1 }
      req != "" && /异常：不适用/                         { ok=1 }
      END { flush() }
    ' "$spec")"
    [[ -n "$hits" ]] && out+="  ✗ Requirement 未覆盖异常路径（$rel）——补「异常：」Scenario 或写明「异常：不适用（原因）」：\n$(sed 's/^/      /' <<<"$hits")\n"
  done < <(find "$d/specs" -name spec.md 2>/dev/null)

  if [[ -n "$out" ]]; then
    echo "■ $name"; printf "%b" "$out"; fail=1
  else
    echo "✓ $name"
  fi
done

if [[ $fail -eq 1 ]]; then
  echo
  echo "未通过：清完以上项再签字 / 归档。规则见 config.yaml rules.specs 与 review-convention.md 第二节。"
  exit 1
fi
