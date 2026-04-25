const tokenKey = "todayMeal.authToken";
const apiBaseUrl = "http://localhost:3000";

type ApiResponse<T> = {
  data: T;
};

export type ApiMethod = "GET" | "POST" | "PATCH" | "DELETE";

export function getToken(): string {
  return wx.getStorageSync(tokenKey) || "";
}

export function setToken(token: string) {
  wx.setStorageSync(tokenKey, token);
}

export function request<T>(options: {
  url: string;
  method?: ApiMethod;
  data?: unknown;
}): Promise<T> {
  return new Promise((resolve, reject) => {
    const token = getToken();

    wx.request({
      url: `${apiBaseUrl}${options.url}`,
      method: options.method || "GET",
      data: options.data,
      header: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve((res.data as ApiResponse<T>).data);
          return;
        }

        reject(res);
      },
      fail: reject
    });
  });
}
