# javis

微信小程序 + 运营后台（web）+ Node 后端，pnpm monorepo。脚手架沿用 antman（`/Users/zhouxue/project/antman`）。

```
packages/
  core/      领域逻辑 + PG（不读 process.env，由 cli 注入配置）
  cli/       入口：javis serve / javis db …（tsx 直跑 TS，无需编译）；serve 同源托管运营后台
  web/       运营后台：Vite + React + Ant Design + React Router
  miniapp/   Taro 3.6 + React 小程序（weapp / h5）
scripts/     部署、容器入口、密钥检查
tests/       跨包集成测试（vitest）
```

## 快速开始

```bash
pnpm install
cp .env.example .env        # 填 DATABASE_URL 等；本机指向 javis_dev
pnpm db:migrate             # 建表（幂等）
pnpm db:status              # 确认连的是哪个库、迁移状态
pnpm serve                  # http://localhost:5173/api/health
pnpm admin                  # 构建运营后台并起服务 → http://localhost:5173 ，用 JAVIS_AUTH_TOKEN 登录
pnpm web:dev                # 运营后台热更新 http://localhost:5174（/api 代理到 5173，需另开 pnpm serve）
pnpm test && pnpm typecheck
```

小程序：

```bash
pnpm miniapp:dev            # 产物 packages/miniapp/dist，用微信开发者工具打开 packages/miniapp
pnpm miniapp:preview        # H5 预览 http://127.0.0.1:10086
```

`project.config.json` 的 `appid` 目前是 `touristappid`，拿到正式 AppID 后替换，
并在小程序后台把 `https://t10.upivot.io` 加进 request 合法域名。

## 环境与数据库

| 环境 | 数据库 | 位置 |
| --- | --- | --- |
| 本机 | `javis_dev` | `kei.upivot.io:65435`（与 antman 同一 PG 17 实例，独立库） |
| 线上 | `javis_prod` | 同上 |

- 迁移在 `packages/core/src/db/migrations.ts`，**只追加不修改**；容器启动时自动 `db migrate`。
- OSS 复用 antman 的 bucket（`upivot-static` / `oss-cn-hangzhou`），对象放在 `OSS_UPLOAD_PATH/javis/` 下。
- 鉴权：设了 `JAVIS_AUTH_TOKEN` 后，`/api/*` 除 `health`、`auth/login`、`auth/logout` 外都要鉴权：
  - 小程序：`x-javis-token` 请求头；
  - 运营后台：登录页 `POST /api/auth/login` 用凭证换 HttpOnly cookie（30 天），前端 JS 拿不到 token。
  - 非 `/api` 路径都是运营后台静态资源（公开），深链回退 `index.html`。
- 新增运营页面：`packages/web/src/pages/` 加页面，`layouts/AdminLayout.tsx` 的 `MENU` 加菜单，`App.tsx` 加路由。

## 部署（skylab machine i · t10）

`t10.upivot.io → 172.17.0.1:9010`，Caddy 已预接，不用改 Caddyfile。

首次：在服务器建 `/root/repos/javis/.env`（从本机 `.env` 复制，`DATABASE_URL` 改成 `javis_prod`，
`JAVIS_AUTH_TOKEN` 换一个新值），然后：

```bash
pnpm deploy:skylab          # = rsync(排除 .env*/data) + docker compose up -d --build + 健康检查
```

部署脚本会先校验服务器 `.env` 指向 `javis_prod`，不是就中止——避免线上被静默切到开发库。
