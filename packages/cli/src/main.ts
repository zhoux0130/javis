#!/usr/bin/env -S npx tsx
import { parseArgs } from './args.js';
import { buildContext } from './context.js';
import { loadDotEnv } from './dotenv.js';
import { cmdDb } from './commands/db.command.js';
import { cmdServe } from './commands/serve.command.js';

const HELP = `javis — 小程序后端

用法: javis <command> [options]

命令:
  db               PG 数据库 (migrate 建表 / status 当前库 + 迁移状态)
  serve            启动 HTTP 服务 (--port 5173)

环境变量见 .env.example
`;

async function main(): Promise<void> {
  loadDotEnv();
  const args = parseArgs(process.argv.slice(2));
  if (args.command === 'help' || args.flags.help) {
    process.stdout.write(HELP);
    return;
  }
  const ctx = buildContext(process.env);

  switch (args.command) {
    case 'db': return cmdDb(ctx, args);
    case 'serve': return cmdServe(ctx, args);
    default:
      process.stderr.write(`unknown command: ${args.command}\n\n${HELP}`);
      process.exitCode = 1;
  }
}

main().catch((err) => {
  process.stderr.write(`error: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exitCode = 1;
});
