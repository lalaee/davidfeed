#!/bin/bash
# apps.sh [filter] — list the demo apps installed on the simulator, each with the deck id
# that launches it. Bundle ids come from the device; deck ids come from results.json.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

U=$(xcrun simctl list devices booted -j | python3 -c '
import json, sys
for lst in json.load(sys.stdin)["devices"].values():
    for d in lst:
        if d["name"] == "iPhone 17 Pro":
            print(d["udid"])' | head -1)

if [ -z "$U" ]; then
  echo "iPhone 17 Pro is not booted. Boot it with:"
  echo "  xcrun simctl boot 'iPhone 17 Pro'"
  exit 1
fi

# NB: the python below reads the pipe on stdin, so it must be passed with -c.
# A heredoc here would replace stdin and silently yield an empty list.
xcrun simctl listapps "$U" 2>/dev/null \
  | grep -oE 'CFBundleIdentifier = "[^"]+"' \
  | sed 's/.*= "//;s/"//' \
  | grep -vE '^com\.apple\.' \
  | sort \
  | python3 -c '
import json, sys
root = sys.argv[1]
filt = (sys.argv[2] if len(sys.argv) > 2 else "").lower()
res = json.load(open(root + "/results.json"))
by_bid = {v["bundle_id"]: v["id"] for v in res.values() if v.get("bundle_id")}
rows = []
for bid in (l.strip() for l in sys.stdin if l.strip()):
    did = by_bid.get(bid, "")
    if filt and filt not in (bid + " " + did).lower():
        continue
    rows.append((did or "— (installed by hand)", bid))
for did, bid in sorted(rows):
    print(f"  {did:46s} {bid}")
print(f"\n{len(rows)} installed" + (f" matching {filt!r}" if filt else "") + ". Launch one with:")
print("  ./bin/deck run \"<id>\"")
' "$ROOT" "${1:-}"
