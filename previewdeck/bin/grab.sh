#!/bin/bash
# grab.sh <name> — capture the current simulator screen into shots/<name>.jpg
U=C1E4D38A-7B40-449B-8221-2BEB48AA1AB4
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
xcrun simctl io "$U" screenshot "$ROOT/shots/_g.png" >/dev/null 2>&1
sips -Z 1000 -s format jpeg -s formatOptions 72 "$ROOT/shots/_g.png" --out "$ROOT/shots/$1.jpg" >/dev/null 2>&1
rm -f "$ROOT/shots/_g.png"
echo "$1.jpg $(stat -f%z "$ROOT/shots/$1.jpg") bytes"
