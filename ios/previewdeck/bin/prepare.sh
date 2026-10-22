#!/bin/bash
# Per-repo setup steps that the upstream READMEs require before a first build.
# Idempotent — safe to re-run. Called manually, or after a fresh clone sweep.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
R="$ROOT/repos"

step() { printf "%-26s %s\n" "$1" "$2"; }

# IceCubesApp: the project's base configuration reference is gitignored; the repo ships a
# template and the README tells you to copy it. Without it every target fails to configure.
if [ -f "$R/IceCubesApp/IceCubesApp.xcconfig.template" ] && [ ! -f "$R/IceCubesApp/IceCubesApp.xcconfig" ]; then
  cp "$R/IceCubesApp/IceCubesApp.xcconfig.template" "$R/IceCubesApp/IceCubesApp.xcconfig"
  step IceCubesApp "created IceCubesApp.xcconfig from template"
else
  step IceCubesApp "ok"
fi

# Swiftfin vendors its config the same way.
if [ -f "$R/Swiftfin/Shared/Configuration.xcconfig.template" ] && [ ! -f "$R/Swiftfin/Shared/Configuration.xcconfig" ]; then
  cp "$R/Swiftfin/Shared/Configuration.xcconfig.template" "$R/Swiftfin/Shared/Configuration.xcconfig"
  step Swiftfin "created Configuration.xcconfig from template"
else
  step Swiftfin "ok"
fi

echo
echo "Not fixable here:"
echo "  MeloX   its only iOS scheme embeds a watchOS app, so it needs the watchOS 26"
echo "          simulator runtime installed (several GB). Clone reads fine without it."
