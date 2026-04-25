import { request, setToken } from "./api";

type LoginResult = {
  token: string;
  user: {
    id: string;
    openid: string;
    role: "viewer" | "editor" | "owner";
  };
};

export function login(): Promise<LoginResult> {
  return new Promise((resolve, reject) => {
    wx.login({
      success: async ({ code }) => {
        try {
          const result = await request<LoginResult>({
            url: "/auth/wechat-login",
            method: "POST",
            data: { code }
          });
          setToken(result.token);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      },
      fail: reject
    });
  });
}
