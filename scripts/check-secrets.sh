#!/usr/bin/env bash
# Guard against committing real credentials.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
hits=$(grep -RIn --exclude-dir=node_modules --exclude-dir=data --exclude-dir=.git --exclude='*.example' --exclude='.env' \
  -E '(OSS_ACCESS_KEY_SECRET|WX_APP_SECRET|JAVIS_AUTH_TOKEN)\s*=\s*[A-Za-z0-9_-]{8,}|postgres(ql)?://[^:]+:[^<@]{6,}@' "$ROOT" || true)
if [ -n "$hits" ]; then
  echo "❌ possible secret committed:"; echo "$hits"; exit 1
fi
echo "✓ no secrets found"
