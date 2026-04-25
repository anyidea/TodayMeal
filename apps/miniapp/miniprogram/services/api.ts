export const API_BASE_URL = 'http://localhost:3000';

export type ApiMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export type ApiRequestOptions = {
  method?: ApiMethod;
  data?: unknown;
  token?: string;
};

type ApiEnvelope<T> = {
  data: T;
};

function buildUrl(path: string): string {
  return path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
}

export function request<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { method = 'GET', data, token } = options;

  return new Promise((resolve, reject) => {
    wx.request({
      url: buildUrl(path),
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success(response) {
        const { statusCode } = response;

        if (statusCode >= 200 && statusCode < 300) {
          resolve((response.data as ApiEnvelope<T>).data);
          return;
        }

        reject(response.data);
      },
      fail(error) {
        reject(error);
      },
    });
  });
}

export const api = {
  get<T>(path: string, token?: string): Promise<T> {
    return request<T>(path, { method: 'GET', token });
  },
  post<T>(path: string, data?: unknown, token?: string): Promise<T> {
    return request<T>(path, { method: 'POST', data, token });
  },
  patch<T>(path: string, data?: unknown, token?: string): Promise<T> {
    return request<T>(path, { method: 'PATCH', data, token });
  },
  delete<T>(path: string, token?: string): Promise<T> {
    return request<T>(path, { method: 'DELETE', token });
  },
};
