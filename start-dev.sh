#!/bin/bash
# Start mobile app and dashboard simultaneously

cd "$(dirname "$0")"

# Start dashboard in background
(cd neoagri-dashboard && npm run dev) &
DASH_PID=$!

# Start mobile app
(cd neoagri-mobile && npx expo run:android)
MOBILE_EXIT=$?

# Kill dashboard when mobile exits
kill $DASH_PID 2>/dev/null
exit $MOBILE_EXIT
