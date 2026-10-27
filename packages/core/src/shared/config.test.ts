import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('缺省值：无 DB / OSS / 微信配置', () => {
    const c = loadConfig({}, '/app');
    expect(c.port).toBe(5173);
    expect(c.dataDir).toBe('/app/data');
    expect(c.databaseUrl).toBeUndefined();
    expect(c.oss).toBeUndefined();
    expect(c.wx).toBeUndefined();
  });

  it('OSS 缺一项即视为未配置', () => {
    const base = { OSS_REGION: 'r', OSS_BUCKET: 'b', OSS_ACCESS_KEY_ID: 'i', OSS_ACCESS_KEY_SECRET: 's' };
    expect(loadConfig(base).oss?.uploadPath).toBe('uploads');
    expect(loadConfig({ ...base, OSS_BUCKET: '' }).oss).toBeUndefined();
  });
});
