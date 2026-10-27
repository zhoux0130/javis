const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8, no DST

/** Convert an epoch (s or ms) or ISO string into a YYYY-MM-DD date in Asia/Shanghai. */
export function toShanghaiDate(input: number | string): string {
  let ms: number;
  if (typeof input === 'number') {
    ms = input < 1e12 ? input * 1000 : input; // seconds vs ms heuristic
  } else if (/^\d+$/.test(input)) {
    const n = Number(input);
    ms = n < 1e12 ? n * 1000 : n;
  } else {
    ms = Date.parse(input);
  }
  if (!Number.isFinite(ms)) {
    throw new Error(`toShanghaiDate: unparseable timestamp: ${String(input)}`);
  }
  const shifted = new Date(ms + SHANGHAI_OFFSET_MS);
  return shifted.toISOString().slice(0, 10);
}

/** Today's date (YYYY-MM-DD) in Asia/Shanghai. Side-effecting; never used inside pure scoring. */
export function todayInShanghai(now: number = Date.now()): string {
  return toShanghaiDate(now);
}
