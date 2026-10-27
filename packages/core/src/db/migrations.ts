import { getDb } from '../shared/db.js';

interface Migration {
  id: string;
  sql: string;
}

/**
 * 只追加、不修改：已上线的迁移改了也不会重跑，要变更就新增一条。
 * 日期用 date 列、时间用 timestamptz，方便在 Postico 里直接查。
 */
const MIGRATIONS: Migration[] = [
  {
    id: '0001_init',
    sql: `
      -- 通用 KV：开关、游标等小块状态，避免早期为每个配置项建表
      create table if not exists app_state (
        key        text primary key,
        data       jsonb not null,
        updated_at timestamptz not null default now()
      );
    `,
  },
];

/** 建 _migrations 表并按序应用未执行的迁移（每条迁移单独事务）。返回新应用的 id 列表。 */
export async function runMigrations(): Promise<string[]> {
  const db = getDb();
  if (!db) throw new Error('DB 未配置（缺 DATABASE_URL）');
  await db.query('create table if not exists _migrations (id text primary key, applied_at timestamptz not null default now())');
  const done = new Set((await db.query('select id from _migrations')).rows.map((r) => r.id as string));
  const applied: string[] = [];
  for (const m of MIGRATIONS) {
    if (done.has(m.id)) continue;
    const client = await db.connect();
    try {
      await client.query('begin');
      await client.query(m.sql);
      await client.query('insert into _migrations(id) values($1)', [m.id]);
      await client.query('commit');
      applied.push(m.id);
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
  }
  return applied;
}

/** 已应用迁移 + 当前库名，`javis db status` 用来确认连的是哪个库。 */
export async function dbStatus(): Promise<{ database: string; applied: string[]; pending: string[] }> {
  const db = getDb();
  if (!db) throw new Error('DB 未配置（缺 DATABASE_URL）');
  const database = (await db.query('select current_database() as d')).rows[0].d as string;
  const exists = (await db.query("select to_regclass('_migrations') as t")).rows[0].t;
  const applied = exists
    ? (await db.query('select id from _migrations order by id')).rows.map((r) => r.id as string)
    : [];
  const pending = MIGRATIONS.map((m) => m.id).filter((id) => !applied.includes(id));
  return { database, applied, pending };
}
