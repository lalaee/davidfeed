#!/bin/bash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
clone_one() {
  local kind="$1" slug="$2"
  local name="${slug##*/}"
  local dest="$ROOT/repos/$name"
  if [ -d "$dest/.git" ]; then echo "SKIP  $slug (already cloned)"; return 0; fi
  if git clone --depth 1 --quiet "https://github.com/$slug.git" "$dest" 2>"$ROOT/logs/clone-$name.log"; then
    local sz; sz=$(du -sh "$dest" 2>/dev/null | cut -f1)
    echo "OK    $slug  [$kind]  $sz"
  else
    echo "FAIL  $slug -- $(tail -1 "$ROOT/logs/clone-$name.log")"
  fi
}
export -f clone_one
export ROOT
awk -F'\t' '{print $1"\t"$2}' "$ROOT/repos.tsv" | \
  xargs -P 6 -I{} bash -c 'IFS=$'"'"'\t'"'"' read -r k s <<< "{}"; clone_one "$k" "$s"'
