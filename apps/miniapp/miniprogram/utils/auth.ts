import { clearLocalAuth, request, setToken } from "./api";

const userKey = "todayMeal.authUser";
const groupKey = "todayMeal.groupState";

export type AuthUser = {
  id: string;
  openid: string;
  role: "viewer" | "editor" | "owner";
  nickname?: string | null;
  avatarUrl?: string | null;
};

export type LoginResult = {
  token: string;
  user: AuthUser;
  currentGroupId?: string | null;
  groups?: MealGroup[];
};

export type MealGroup = {
  id: string;
  name: string;
  memberCount: number;
  role: string;
  isCurrent?: boolean;
};

export type GroupState = {
  currentGroupId: string | null;
  groups: MealGroup[];
};

let pendingLogin: Promise<LoginResult> | null = null;

export function login(): Promise<LoginResult> {
  if (pendingLogin) {
    return pendingLogin;
  }

  pendingLogin = new Promise((resolve, reject) => {
    wx.login({
      success: async ({ code }) => {
        try {
          const result = await request<LoginResult>({
            url: "/auth/wechat-login",
            method: "POST",
            data: { code }
          });
          setToken(result.token);
          setStoredUser(result.user);
          setGroupState({
            currentGroupId: result.currentGroupId ?? null,
            groups: result.groups ?? []
          });
          resolve(result);
        } catch (error) {
          reject(error);
        }
      },
      fail: reject
    });
  }).finally(() => {
    pendingLogin = null;
  });

  return pendingLogin;
}

export function getStoredUser(): AuthUser | null {
  return wx.getStorageSync(userKey) || null;
}

export function setStoredUser(user: AuthUser) {
  wx.setStorageSync(userKey, user);
}

export function getGroupState(): GroupState {
  return wx.getStorageSync(groupKey) || {
    currentGroupId: null,
    groups: []
  };
}

export function setGroupState(state: GroupState) {
  wx.setStorageSync(groupKey, state);
}

export async function loadGroups(): Promise<GroupState> {
  const state = await request<GroupState>({ url: "/groups/me" });
  setGroupState(state);
  return state;
}

export async function switchGroup(groupId: string): Promise<GroupState> {
  const state = await request<GroupState>({
    url: `/groups/${groupId}/switch`,
    method: "POST"
  });
  setGroupState(state);
  return state;
}

export async function joinGroup(inviteCode: string): Promise<GroupState> {
  const state = await request<GroupState>({
    url: "/groups/join",
    method: "POST",
    data: { inviteCode }
  });
  setGroupState(state);
  return state;
}

export async function createGroupInvite(groupId: string): Promise<{ inviteCode: string; groupId: string }> {
  return request({
    url: `/groups/${groupId}/invites`,
    method: "POST"
  });
}

export function clearAuth() {
  clearLocalAuth();
}
