#!/usr/bin/env bash
# 容器主进程：先迁移数据库，再前台起 serve（退出 → 容器退出 → compose restart 拉起）。
set -euo pipefail
cd /app
PORT="${JAVIS_PORT:-5173}"
TSX="./node_modules/.bin/tsx"
MAIN="packages/cli/src/main.ts"

echo "[$(date '+%F %T')] db migrate"
"$TSX" "$MAIN" db migrate

echo "[$(date '+%F %T')] serve --port $PORT"
exec "$TSX" "$MAIN" serve --port "$PORT"
