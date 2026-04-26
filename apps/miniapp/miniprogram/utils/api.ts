const tokenKey = "todayMeal.authToken";
const userKey = "todayMeal.authUser";
const groupKey = "todayMeal.groupState";
const apiBaseUrl = "http://localhost:3000";
const profilePagePath = "pages/profile/profile";

let isRedirectingToLogin = false;

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

export function clearToken() {
  wx.removeStorageSync(tokenKey);
}

export function clearLocalAuth() {
  clearToken();
  wx.removeStorageSync(userKey);
  wx.removeStorageSync(groupKey);
}

export function getApiUrl(path: string): string {
  return `${apiBaseUrl}${path}`;
}

export function isAuthRequiredError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "authRequired" in error &&
      (error as { authRequired?: boolean }).authRequired
  );
}

export function redirectToLogin() {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  if (currentPage?.route === profilePagePath) {
    return;
  }

  wx.showToast({ title: "请先登录", icon: "none" });

  if (isRedirectingToLogin) {
    return;
  }

  isRedirectingToLogin = true;
  wx.navigateTo({
    url: "/pages/profile/profile",
    complete: () => {
      setTimeout(() => {
        isRedirectingToLogin = false;
      }, 500);
    }
  });
}

export function requireLogin(): boolean {
  if (getToken()) {
    return true;
  }

  clearLocalAuth();
  redirectToLogin();
  return false;
}

export function request<T>(options: {
  url: string;
  method?: ApiMethod;
  data?: unknown;
}): Promise<T> {
  return new Promise((resolve, reject) => {
    const token = getToken();

    wx.request({
      url: getApiUrl(options.url),
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

        if (res.statusCode === 401) {
          clearLocalAuth();
          redirectToLogin();
          reject({
            ...res,
            authRequired: true
          });
          return;
        }

        reject(res);
      },
      fail: reject
    });
  });
}
