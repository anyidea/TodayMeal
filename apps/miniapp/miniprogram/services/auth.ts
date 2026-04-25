import { api } from './api';
import type { LoginResponse, LoginUser, UserRole } from '../types';

const TOKEN_KEY = 'today-meal-token';
const USER_KEY = 'today-meal-user';

export function getToken(): string {
  return wx.getStorageSync(TOKEN_KEY) || '';
}

export function saveToken(token: string): void {
  wx.setStorageSync(TOKEN_KEY, token);
}

export function getCachedUser(): LoginUser | null {
  return wx.getStorageSync(USER_KEY) || null;
}

function saveUser(user: LoginUser): void {
  wx.setStorageSync(USER_KEY, user);
}

function getWechatLoginCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.login({
      success(result) {
        resolve(result.code);
      },
      fail(error) {
        reject(error);
      },
    });
  });
}

export async function loginWithWechat(): Promise<LoginResponse> {
  const code = await getWechatLoginCode();
  const response = await api.post<LoginResponse>('/auth/wechat-login', { code });

  saveToken(response.token);
  saveUser(response.user);

  return response;
}

export async function bindInvite(inviteCode: string): Promise<{ role: UserRole }> {
  const response = await api.post<{ role: UserRole }>(
    '/auth/bind-invite',
    { inviteCode },
    getToken(),
  );
  const user = getCachedUser();
  if (user) {
    saveUser({ ...user, role: response.role });
  }

  return response;
}
