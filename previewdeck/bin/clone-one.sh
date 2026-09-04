#!/bin/bash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
slug="$1"; kind="$2"
name="${slug##*/}"
dest="$ROOT/repos/$name"
if [ -d "$dest/.git" ]; then echo "SKIP  $slug"; exit 0; fi
if git clone --depth 1 --quiet "https://github.com/$slug.git" "$dest" 2>"$ROOT/logs/clone-$name.log"; then
  echo "OK    $slug [$kind] $(du -sh "$dest" 2>/dev/null | cut -f1)"
else
  echo "FAIL  $slug -- $(tail -1 "$ROOT/logs/clone-$name.log")"
fi
