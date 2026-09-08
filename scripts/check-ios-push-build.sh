#!/bin/sh
set -eu
case "${CONFIGURATION:?Xcode configuration is required}" in
  Debug) expected=sandbox ;;
  Release) expected=production ;;
  *) echo 'error: Unknown push build configuration'; exit 1 ;;
esac
actual=$(cat "${SRCROOT}/App/public/apns-environment.txt")
if [ "$actual" != "$expected" ]; then
  echo "error: APNs environment must be $expected for $CONFIGURATION. Run npm run build:native (Release) or npm run build:native:dev (Debug), then npx cap sync ios."
  exit 1
fi
