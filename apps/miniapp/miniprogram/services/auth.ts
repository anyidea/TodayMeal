import { api } from './api';
import type { LoginResponse, UserRole } from '../types';

const TOKEN_KEY = 'today-meal-token';

export function getToken(): string {
  return wx.getStorageSync(TOKEN_KEY) || '';
}

export function saveToken(token: string): void {
  wx.setStorageSync(TOKEN_KEY, token);
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

  return response;
}

export async function bindInvite(inviteCode: string): Promise<{ role: UserRole }> {
  return api.post<{ role: UserRole }>(
    '/auth/bind-invite',
    { inviteCode },
    getToken(),
  );
}
