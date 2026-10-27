export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface Logger {
  debug(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

function emit(
  min: LogLevel,
  bindings: Record<string, unknown>,
  level: LogLevel,
  msg: string,
  fields?: Record<string, unknown>,
): void {
  if (ORDER[level] < ORDER[min]) return;
  const line = { level, msg, ...bindings, ...(fields ?? {}) };
  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
  stream.write(JSON.stringify(line) + '\n');
}

export function createLogger(min: LogLevel = 'info', bindings: Record<string, unknown> = {}): Logger {
  return {
    debug: (m, f) => emit(min, bindings, 'debug', m, f),
    info: (m, f) => emit(min, bindings, 'info', m, f),
    warn: (m, f) => emit(min, bindings, 'warn', m, f),
    error: (m, f) => emit(min, bindings, 'error', m, f),
    child: (b) => createLogger(min, { ...bindings, ...b }),
  };
}
