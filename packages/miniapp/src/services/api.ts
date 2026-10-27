import Taro from "@tarojs/taro";
export interface Connection {
  baseUrl: string;
  token: string;
}
const CONNECTION_KEY = "javis-connection";
export const DEFAULT_BASE_URL = "https://t10.upivot.io";
export const connection = (): Connection | null =>
  Taro.getStorageSync(CONNECTION_KEY) || null;
export const saveConnection = (c: Connection) =>
  Taro.setStorageSync(CONNECTION_KEY, c);
export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
  }
}
export async function request<T>(
  path: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  data?: unknown,
  config = connection(),
): Promise<T> {
  if (!config) throw new ApiError("not_connected", 401);
  const r = await Taro.request({
    url: config.baseUrl + path,
    method,
    data,
    timeout: 20000,
    header: {
      "x-javis-token": config.token,
      "content-type": "application/json",
    },
  });
  if (r.statusCode < 200 || r.statusCode >= 300)
    throw new ApiError(
      r.data?.error ||
        (r.statusCode === 401 ? "unauthorized" : "request_failed"),
      r.statusCode,
    );
  return r.data as T;
}
export function errorText(e: unknown) {
  // 域名没配、网络被拒这类失败，微信只给一个 errMsg 字符串，原样透出才有线索。
  const errMsg = (e as { errMsg?: string } | null)?.errMsg;
  if (!(e instanceof ApiError) && typeof errMsg === "string" && errMsg.trim()) {
    if (/url not in domain list/i.test(errMsg))
      return "微信拦下了这次请求：服务器域名没加进「request 合法域名」。";
    return errMsg.trim().slice(0, 120);
  }
  const code = e instanceof ApiError ? e.code : "";
  return (
    (
      {
        not_connected: "还没连接服务，请先到设置里填写地址和凭证。",
        unauthorized: "连接凭证不对，请检查后重试。",
      } as Record<string, string>
    )[code] || "暂时无法连接服务，请稍后重试。"
  );
}
