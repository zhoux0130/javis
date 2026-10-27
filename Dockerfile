# javis 后端 + 运营后台：服务端 tsx 直跑 TS（无需编译），只编译运营后台到 packages/web/dist 由 serve 同源托管。
# 小程序不进镜像，走微信开发者工具上传。
FROM node:20-slim

# pnpm（对齐本地 10.x）
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# 1) 先装依赖（充分利用层缓存：只有 manifest 变了才重装）
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json tsconfig.json ./
COPY packages/core/package.json    packages/core/package.json
COPY packages/cli/package.json     packages/cli/package.json
COPY packages/web/package.json     packages/web/package.json
COPY packages/miniapp/package.json packages/miniapp/package.json
RUN pnpm install --frozen-lockfile --filter @javis/cli... --filter @javis/web...

# 2) 源码（data/ 与 .env 由 .dockerignore 排除，运行期挂载/注入）
COPY . .

# 3) 构建运营后台 → packages/web/dist（serve 同源托管）
RUN pnpm web:build

ENV JAVIS_PORT=5173
EXPOSE 5173

CMD ["bash", "scripts/server-entrypoint.sh"]
