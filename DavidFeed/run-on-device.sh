#!/bin/bash
# Build DavidFeed and install it on a connected iPhone.
#
# Prerequisites this script cannot do for you:
#   1. An Apple ID in Xcode  (Xcode > Settings > Accounts > +). A free one works;
#      apps signed with a personal team stop launching after 7 days and just need
#      rebuilding.
#   2. A team selected for the target (Signing & Capabilities > Team).
#   3. The phone plugged in, unlocked, and "Trust This Computer" accepted.
#   4. The phone on iOS 26 or later — the app's deployment target is 26.0 and it
#      uses iOS 26-only API throughout (glassEffect, tabBarMinimizeBehavior,
#      scrollEdgeEffectStyle). It will not install on iOS 18.
set -u
cd "$(dirname "$0")"

echo "== devices =="
xcrun devicectl list devices 2>/dev/null | sed -n '1,12p'

# Two different ID namespaces, and they are NOT interchangeable:
#   devicectl  -> CoreDevice UUID   (2DF854AB-...)  for install/launch
#   xcodebuild -> hardware UDID     (00008150-...)  for -destination
# Reading the first one and handing it to xcodebuild fails with the unhelpful
# "Unable to find a device matching the provided destination specifier".
BUILD_ID=$(xcodebuild -project DavidFeed.xcodeproj -scheme DavidFeed -showdestinations 2>/dev/null \
  | awk -F'id:' '/platform:iOS,/ && !/Simulator/ && !/placeholder/ {split($2,a,","); print a[1]; exit}' \
  | tr -d ' ')
# Match the UUID by SHAPE, not by column position: the state column is
# sometimes "connected" and sometimes "available (paired)", and the model name
# contains spaces, so $(NF-2) drifts and happily returns "17" out of
# "iPhone 17 Pro".
INSTALL_ID=$(xcrun devicectl list devices 2>/dev/null \
  | grep -i iPhone | grep -vi unavailable \
  | grep -oE '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}' \
  | head -1)

if [ -z "${BUILD_ID:-}" ] || [ -z "${INSTALL_ID:-}" ]; then
  echo
  echo "No connected iPhone. Plug it in, unlock it, accept Trust This Computer,"
  echo "and make sure Developer Mode is on (Settings > Privacy & Security)."
  echo "  build id:   ${BUILD_ID:-<none>}"
  echo "  install id: ${INSTALL_ID:-<none>}"
  exit 1
fi

# Leave the machine usable while it compiles. xcodebuild fans out across every
# core it can find, and a Swift build is heavy enough that all 16 makes the Mac
# unresponsive for the duration. Half the cores costs a few seconds and gives
# the rest of the machine back. Override with JOBS=16 for a flat-out build.
JOBS="${JOBS:-$(( $(sysctl -n hw.ncpu) / 2 ))}"
[ "$JOBS" -lt 4 ] && JOBS=4

echo "== building for $BUILD_ID (on $JOBS cores) =="
xcodebuild -project DavidFeed.xcodeproj -scheme DavidFeed \
  -destination "id=$BUILD_ID" -configuration Debug \
  -derivedDataPath ../previewdeck/.dd-device \
  -jobs "$JOBS" \
  -allowProvisioningUpdates build || exit 1

APP=../previewdeck/.dd-device/Build/Products/Debug-iphoneos/DavidFeed.app
echo
echo "== installing =="
xcrun devicectl device install app --device "$INSTALL_ID" "$APP" || exit 1
echo
xcrun devicectl device process launch --device "$INSTALL_ID" com.davidfeed.ios >/dev/null 2>&1 \
  && echo "Launched." \
  || echo "Installed. Unlock the phone and tap the icon (or re-run) to launch."
