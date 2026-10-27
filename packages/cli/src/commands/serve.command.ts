import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { getDb } from '@javis/core';
import type { CliContext } from '../context.js';
import type { ParsedArgs } from '../args.js';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

/** JSON 响应；≥1KB 且客户端接受时 gzip（外网链路慢，压缩比 ~10x）。 */
export function json(res: ServerResponse, body: unknown, status = 200): void {
  const buf = Buffer.from(JSON.stringify(body), 'utf8');
  const accepts = String(res.req?.headers['accept-encoding'] ?? '');
  const headers: Record<string, string> = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  };
  if (buf.length >= 1024 && /\bgzip\b/.test(accepts)) {
    res.writeHead(status, { ...headers, 'content-encoding': 'gzip', vary: 'accept-encoding' });
    res.end(gzipSync(buf, { level: 6 }));
    return;
  }
  res.writeHead(status, headers);
  res.end(buf);
}

/** 读 JSON 请求体（上限 1MB）；空体返回 undefined。 */
export async function readJson<T = unknown>(req: IncomingMessage, limit = 1 << 20): Promise<T | undefined> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > limit) throw Object.assign(new Error('payload_too_large'), { status: 413 });
    chunks.push(c as Buffer);
  }
  if (!size) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T;
  } catch {
    throw Object.assign(new Error('invalid_json'), { status: 400 });
  }
}

/** 定长比较，避免按字符提前返回泄露凭证长度/前缀。 */
function sameToken(a: unknown, b: string): boolean {
  if (typeof a !== 'string') return false;
  const h = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(h(a), h(b));
}

const COOKIE = 'javis_token';
const COOKIE_MAX_AGE = 30 * 24 * 3600;

/** 公开 API：不鉴权。health 给部署冒烟用；login/logout 给运营后台登录页用。 */
const PUBLIC_API = new Set(['/api/health', '/api/auth/login', '/api/auth/logout']);

export interface AppOptions {
  /** 运营后台构建产物目录；不存在时非 /api 请求返回 404 提示先构建。 */
  webDir?: string;
}

/** 组装 HTTP 服务（不 listen），测试直接拿它起随机端口。 */
export function createApp(ctx: CliContext, opts: AppOptions = {}): Server {
  const authToken = ctx.config.authToken;
  const webDir = resolve(opts.webDir ?? 'packages/web/dist');
  return createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname;
    try {
      if (!path.startsWith('/api/')) return await serveStatic(webDir, path, res);

      // 鉴权：设了 JAVIS_AUTH_TOKEN 就要求 x-javis-token 头（小程序）/ cookie（运营后台）/ ?token= 之一。
      // 没设则全部放行，仅限本机开发。
      const cookie = (req.headers.cookie ?? '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`))?.[1];
      const authed =
        !authToken ||
        sameToken(req.headers['x-javis-token'], authToken) ||
        sameToken(cookie && decodeURIComponent(cookie), authToken) ||
        sameToken(url.searchParams.get('token'), authToken);
      if (!authed && !PUBLIC_API.has(path)) return json(res, { error: 'unauthorized' }, 401);

      if (path === '/api/health' && req.method === 'GET') {
        const db = getDb();
        let dbState: 'ok' | 'down' | 'unconfigured' = 'unconfigured';
        let database: string | undefined;
        if (db) {
          try {
            database = (await db.query('select current_database() as d')).rows[0].d as string;
            dbState = 'ok';
          } catch {
            dbState = 'down';
          }
        }
        // 库名只给已登录的人看，公开探活只回状态。
        return json(
          res,
          { ok: dbState !== 'down', db: dbState, ...(authed ? { database } : {}), time: ctx.now() },
          dbState === 'down' ? 503 : 200,
        );
      }

      // ---- 运营后台登录：凭证换 HttpOnly cookie，前端 JS 拿不到 token ----
      if (path === '/api/auth/login' && req.method === 'POST') {
        const body = await readJson<{ token?: string }>(req);
        if (authToken && !sameToken(body?.token, authToken)) return json(res, { error: 'unauthorized' }, 401);
        const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
        res.setHeader(
          'Set-Cookie',
          `${COOKIE}=${encodeURIComponent(authToken ?? '')}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax${secure}`,
        );
        return json(res, { ok: true });
      }
      if (path === '/api/auth/logout' && req.method === 'POST') {
        res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
        return json(res, { ok: true });
      }
      if (path === '/api/auth/me' && req.method === 'GET') {
        return json(res, { ok: true });
      }

      // 带 token 的连通性自检：小程序设置页用它验证地址 + 凭证都对。
      if (path === '/api/ping' && req.method === 'GET') {
        return json(res, { pong: true });
      }

      json(res, { error: 'not_found' }, 404);
    } catch (err) {
      const status = (err as { status?: number }).status ?? 500;
      if (status >= 500) ctx.logger.error('request failed', { path, err: err instanceof Error ? err.stack : String(err) });
      json(res, { error: err instanceof Error ? err.message : String(err) }, status);
    }
  });
}

/** 运营后台静态资源；找不到的路径回退 index.html（BrowserRouter 深链刷新）。 */
async function serveStatic(webDir: string, path: string, res: ServerResponse): Promise<void> {
  const safe = normalize(path).replace(/^(\.\.[/\\])+/, '');
  let file = join(webDir, safe === '/' ? 'index.html' : safe);
  if (!resolve(file).startsWith(webDir)) file = join(webDir, 'index.html');
  try {
    const s = await stat(file);
    if (s.isDirectory()) file = join(file, 'index.html');
  } catch {
    file = join(webDir, 'index.html');
  }
  try {
    const buf = await readFile(file);
    const type = MIME[extname(file)] ?? 'application/octet-stream';
    // vite 产物文件名带 hash，可长缓存；index.html 必须每次重新取，才能拿到新版本的入口。
    const cache = file.includes(`${join(webDir, 'assets')}`) ? 'public, max-age=31536000, immutable' : 'no-cache';
    const accepts = String(res.req?.headers['accept-encoding'] ?? '');
    if (/javascript|css|html|json|svg/.test(type) && buf.length >= 1024 && /\bgzip\b/.test(accepts)) {
      res.writeHead(200, { 'content-type': type, 'cache-control': cache, 'content-encoding': 'gzip', vary: 'accept-encoding' });
      return void res.end(gzipSync(buf, { level: 6 }));
    }
    res.writeHead(200, { 'content-type': type, 'cache-control': cache });
    res.end(buf);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('运营后台未构建 — run: pnpm web:build');
  }
}

export async function cmdServe(ctx: CliContext, a: ParsedArgs): Promise<void> {
  const port = Number((typeof a.flags.port === 'string' && a.flags.port) || ctx.config.port);
  const webDir = typeof a.flags['web-dir'] === 'string' ? a.flags['web-dir'] : process.env.JAVIS_WEB_DIR;
  const server = createApp(ctx, { webDir });
  server.listen(port, () => {
    ctx.logger.info('javis serve', { url: `http://localhost:${port}`, auth: Boolean(ctx.config.authToken), db: Boolean(getDb()) });
  });

  await new Promise<void>((resolveProc) => {
    const stop = () => server.close(() => resolveProc());
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  });
}
