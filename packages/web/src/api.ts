export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
  }
}

/** 同源请求，凭 HttpOnly cookie 鉴权；401 统一抛 ApiError，由 RequireAuth 跳登录。 */
export async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: init.method ?? 'GET',
    credentials: 'same-origin',
    headers: { accept: 'application/json', ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}) },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? 'request_failed', res.status);
  return data as T;
}

export interface Health {
  ok: boolean;
  db: 'ok' | 'down' | 'unconfigured';
  database?: string;
  time: string;
}

export const api = {
  login: (token: string) => request<{ ok: true }>('/api/auth/login', { method: 'POST', body: { token } }),
  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
  me: () => request<{ ok: true }>('/api/auth/me'),
  health: () => request<Health>('/api/health'),
};
