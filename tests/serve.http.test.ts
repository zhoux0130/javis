import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLogger, loadConfig } from '@javis/core';
import { createApp } from '../packages/cli/src/commands/serve.command.js';

let server: Server;
let base: string;

beforeAll(async () => {
  const webDir = mkdtempSync(join(tmpdir(), 'javis-web-'));
  mkdirSync(join(webDir, 'assets'));
  writeFileSync(join(webDir, 'index.html'), '<div id="root"></div>');
  writeFileSync(join(webDir, 'assets', 'app.js'), 'console.log(1)');
  const ctx = {
    config: loadConfig({ JAVIS_AUTH_TOKEN: 'secret' }),
    logger: createLogger('error'),
    now: () => '2026-01-01T00:00:00.000Z',
  };
  server = createApp(ctx, { webDir });
  await new Promise<void>((r) => server.listen(0, r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe('serve · api', () => {
  it('health 不鉴权，未配 DB 时报 unconfigured', async () => {
    const r = await fetch(`${base}/api/health`);
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, db: 'unconfigured' });
  });

  it('其余接口缺 token → 401', async () => {
    expect((await fetch(`${base}/api/ping`)).status).toBe(401);
    expect((await fetch(`${base}/api/auth/me`)).status).toBe(401);
  });

  it('带 x-javis-token 通过', async () => {
    const r = await fetch(`${base}/api/ping`, { headers: { 'x-javis-token': 'secret' } });
    expect(await r.json()).toEqual({ pong: true });
  });

  it('未知 api → 404', async () => {
    const r = await fetch(`${base}/api/nope?token=secret`);
    expect(r.status).toBe(404);
  });
});

describe('serve · 运营后台登录', () => {
  const login = (token: string) =>
    fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) });

  it('错误凭证 → 401，不种 cookie', async () => {
    const r = await login('wrong');
    expect(r.status).toBe(401);
    expect(r.headers.get('set-cookie')).toBeNull();
  });

  it('正确凭证种 HttpOnly cookie，凭 cookie 访问 /api/auth/me', async () => {
    const r = await login('secret');
    const cookie = r.headers.get('set-cookie')!;
    expect(cookie).toMatch(/HttpOnly/);
    const me = await fetch(`${base}/api/auth/me`, { headers: { cookie: cookie.split(';')[0] } });
    expect(me.status).toBe(200);
  });

  it('坏 JSON → 400', async () => {
    const r = await fetch(`${base}/api/auth/login`, { method: 'POST', body: '{' });
    expect(r.status).toBe(400);
  });
});

describe('serve · 静态资源', () => {
  it('深链回退 index.html，且不缓存', async () => {
    const r = await fetch(`${base}/users/42`);
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('no-cache');
    expect(await r.text()).toContain('root');
  });

  it('assets 长缓存', async () => {
    const r = await fetch(`${base}/assets/app.js`);
    expect(r.headers.get('cache-control')).toMatch(/immutable/);
  });
});
