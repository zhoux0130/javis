import pg from 'pg';

const { Pool, types } = pg;

// date(oid 1082)原样返回 'YYYY-MM-DD' 字符串，避免 JS Date 时区漂移
// （javis 全程把日期当上海时区的字符串处理）。
types.setTypeParser(1082, (v: string) => v);

let pool: pg.Pool | undefined;

/**
 * 由 CLI 注入连接串（core 不读 process.env）。无连接串则不启用 PG，
 * 依赖 DB 的功能自行报「未配置」。重复调用幂等。
 */
export function configureDb(connectionString: string | undefined): void {
  if (!connectionString || pool) return;
  pool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 30_000 });
}

export function getDb(): pg.Pool | undefined {
  return pool;
}

/** timestamptz 列读回来是 Date；统一转成 ISO 字符串，对齐 app 的时间契约。 */
export function toIso(v: unknown): string {
  return v instanceof Date ? v.toISOString() : String(v);
}

export async function closeDb(): Promise<void> {
  if (pool) {
    const p = pool;
    pool = undefined;
    await p.end();
  }
}
