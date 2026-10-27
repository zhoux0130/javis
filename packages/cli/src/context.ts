import { configureDb, createLogger, loadConfig, type JavisConfig, type Logger } from '@javis/core';

export interface CliContext {
  config: JavisConfig;
  logger: Logger;
  now: () => string;
}

/** Wire config + clients from the real environment; core receives them injected. */
export function buildContext(env: Record<string, string | undefined>): CliContext {
  const config = loadConfig(env);
  configureDb(config.databaseUrl);
  const logger = createLogger(config.logLevel, { app: 'javis' });
  const now = () => new Date().toISOString();
  return { config, logger, now };
}
