import { resolve } from 'node:path';
import type { LogLevel } from './logger.js';

export interface JavisConfig {
  port: number;
  dataDir: string;
  logLevel: LogLevel;
  authToken?: string;
  databaseUrl?: string;
  oss?: {
    region: string;
    bucket: string;
    accessKeyId: string;
    accessKeySecret: string;
    uploadPath: string;
  };
  wx?: {
    appId: string;
    appSecret: string;
  };
}

/**
 * Pure: derives config from a provided env bag. Core never touches process.env
 * directly — the CLI passes process.env in, keeping the engine injectable/testable.
 */
export function loadConfig(env: Record<string, string | undefined>, cwd: string = process.cwd()): JavisConfig {
  return {
    port: Number(env.JAVIS_PORT || 5173),
    dataDir: resolve(cwd, env.JAVIS_DATA_DIR ?? './data'),
    logLevel: (env.JAVIS_LOG_LEVEL as LogLevel) ?? 'info',
    authToken: env.JAVIS_AUTH_TOKEN || undefined,
    databaseUrl: env.DATABASE_URL || undefined,
    // 四项齐全才算配置了 OSS；缺一项就整体视为未配置，上传时明确报错而不是半残运行。
    oss:
      env.OSS_REGION && env.OSS_BUCKET && env.OSS_ACCESS_KEY_ID && env.OSS_ACCESS_KEY_SECRET
        ? {
            region: env.OSS_REGION,
            bucket: env.OSS_BUCKET,
            accessKeyId: env.OSS_ACCESS_KEY_ID,
            accessKeySecret: env.OSS_ACCESS_KEY_SECRET,
            uploadPath: env.OSS_UPLOAD_PATH ?? 'uploads',
          }
        : undefined,
    wx: env.WX_APP_ID && env.WX_APP_SECRET ? { appId: env.WX_APP_ID, appSecret: env.WX_APP_SECRET } : undefined,
  };
}
