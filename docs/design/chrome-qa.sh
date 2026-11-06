#!/bin/bash
# QA 用 Chrome 包装器：沙箱下 GPU 子进程会被 Kill，故强制 in-process
HS="$HOME/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell"
exec "$HS" --no-sandbox --in-process-gpu --disable-gpu --disable-software-rasterizer --no-first-run "$@"
