import { closeDb, dbStatus, getDb, runMigrations } from '@javis/core';
import type { CliContext } from '../context.js';
import type { ParsedArgs } from '../args.js';

/** PG 数据库：migrate（建表）/ status（当前库 + 迁移状态）。 */
export async function cmdDb(_ctx: CliContext, a: ParsedArgs): Promise<void> {
  const sub = a.positionals[0] ?? 'status';
  if (!getDb()) {
    process.stderr.write('DB 未配置：请在 .env 设置 DATABASE_URL\n');
    process.exitCode = 1;
    return;
  }

  try {
    if (sub === 'migrate') {
      const applied = await runMigrations();
      process.stdout.write(applied.length ? `✓ 应用迁移：${applied.join(', ')}\n` : '✓ 无待应用迁移（已最新）\n');
      return;
    }

    if (sub === 'status') {
      const s = await dbStatus();
      process.stdout.write(
        `库：${s.database}\n已应用：${s.applied.join(', ') || '（无）'}\n待应用：${s.pending.join(', ') || '（无）'}\n`,
      );
      return;
    }

    process.stderr.write(`db 未知子命令：${sub}（migrate | status）\n`);
    process.exitCode = 1;
  } finally {
    await closeDb();
  }
}
