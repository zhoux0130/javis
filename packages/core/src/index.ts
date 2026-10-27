// ── shared ──
export * from './shared/config.js';
export * from './shared/logger.js';
export * from './shared/time.js';

// ── 数据库（PG；缺 DATABASE_URL 则依赖 DB 的功能报「未配置」） ──
export { configureDb, getDb, toIso, closeDb } from './shared/db.js';
export { runMigrations, dbStatus } from './db/migrations.js';
