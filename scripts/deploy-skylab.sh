#!/usr/bin/env bash
# 部署到 skylab t10：同步源码 → 重建容器。
#
# 只同步【代码】。服务器上这两样是它自己的，绝不能被本机覆盖：
#   .env   本机指向 javis_dev，服务器指向 javis_prod（覆盖了会静默切库）
#   data/  运行期数据
set -euo pipefail

HOST="${JAVIS_DEPLOY_HOST:-kei}"
DIR="${JAVIS_DEPLOY_DIR:-/root/repos/javis}"
EPORT="${EPORT:-9010}"
cd "$(dirname "$0")/.."

echo "→ 部署前自检：服务器 .env 必须指向 javis_prod"
ssh "$HOST" "grep -q '^DATABASE_URL=.*/javis_prod' $DIR/.env" || {
  echo "✗ 服务器 $DIR/.env 的 DATABASE_URL 不是 javis_prod —— 停止部署，先修 .env" >&2
  exit 1
}

echo "→ 同步源码到 $HOST:${DIR}（排除 .env* / data）"
# /data 而不是 data：只排根目录那个运行期 data/，不误伤同名源码目录。
rsync -a --delete \
  --exclude '.env*' --exclude /data --exclude node_modules --exclude .git \
  --exclude dist --exclude dist-h5 --exclude .swc --exclude project.private.config.json --exclude '*.tsbuildinfo' \
  --exclude test-results --exclude '*.log' \
  ./ "$HOST:$DIR/"

echo "→ 重建并启动容器（EPORT=${EPORT}）"
ssh "$HOST" "cd $DIR && EPORT=$EPORT docker compose up -d --build"

echo "→ 冒烟：/api/health"
sleep 5
ssh "$HOST" "docker logs --tail 5 javis; curl -fsS http://172.17.0.1:$EPORT/api/health"
echo
echo "✓ 完成 → https://t10.upivot.io"
