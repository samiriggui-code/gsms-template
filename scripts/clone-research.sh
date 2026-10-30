#!/usr/bin/env bash
# Clone veille Tencent sous research/ (non versionné — voir research/README.md).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RESEARCH="${ROOT}/research"

declare -A REPOS=(
  [tencentdb-agent-memory]="https://github.com/TencentCloud/tencentdb-agent-memory.git|ecc01a5"
  [tencentcloud-sdk-go]="https://github.com/TencentCloud/tencentcloud-sdk-go.git|779c9a6"
  [timsdk]="https://github.com/TencentCloud/TIMSDK.git|00fb559"
  [tencentmeeting-cli]="https://github.com/TencentCloud/tencentmeeting-cli.git|bd9ab53"
  [tencentcloud-speech-sdk-go]="https://github.com/TencentCloud/tencentcloud-speech-sdk-go.git|257f9f5"
)

clone_or_checkout() {
  local name="$1"
  local url="$2"
  local ref="$3"
  local dir="${RESEARCH}/${name}"

  mkdir -p "${RESEARCH}"

  if [[ -d "${dir}/.git" ]]; then
    echo "==> ${name}: déjà cloné, checkout ${ref}"
    git -C "${dir}" fetch origin --tags --prune
    git -C "${dir}" checkout --detach "${ref}" 2>/dev/null || git -C "${dir}" checkout "${ref}"
    return
  fi

  if [[ -d "${dir}" ]]; then
    echo "erreur: ${dir} existe sans .git — supprimez le dossier ou renommez-le." >&2
    exit 1
  fi

  echo "==> ${name}: clone ${url} @ ${ref}"
  git clone --filter=blob:none --no-checkout "${url}" "${dir}"
  git -C "${dir}" fetch --depth 1 origin "${ref}" 2>/dev/null || true
  git -C "${dir}" checkout --detach "${ref}" 2>/dev/null || git -C "${dir}" checkout "${ref}"
}

main() {
  for name in "${!REPOS[@]}"; do
    IFS='|' read -r url ref <<< "${REPOS[$name]}"
    clone_or_checkout "${name}" "${url}" "${ref}"
  done
  echo ""
  echo "Terminé. Voir research/README.md (liens internal/, plan doc 12)."
}

main "$@"
