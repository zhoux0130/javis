import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Minimal .env loader (zero-dep). Parses KEY=VALUE lines and sets them on
 * process.env without overriding values already present in the environment.
 * Quotes and `export ` prefixes are stripped; `#` comments are ignored.
 */
export function loadDotEnv(file = '.env', cwd: string = process.cwd()): void {
  let text: string;
  try {
    text = readFileSync(resolve(cwd, file), 'utf8');
  } catch {
    return; // no .env is fine
  }
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.replace(/^export\s+/, '').match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
