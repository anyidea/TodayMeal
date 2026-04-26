import { getToken, isAuthRequiredError, request } from "../../utils/api";
import {
  AuthUser,
  GroupState,
  clearAuth,
  getGroupState,
  getStoredUser,
  loadGroups,
  login,
  setGroupState,
  setStoredUser
} from "../../utils/auth";
import { uploadAvatar } from "../../utils/upload";

type ProfileSummary = {
  recipeCount: number;
  takeoutCount: number;
  favoriteCount: number;
  recentMealCount: number;
};

type GroupMember = {
  userId: string;
  nickname?: string | null;
  avatarUrl?: string | null;
};

type AvatarStackItem = {
  userId: string;
  nickname: string;
  avatarUrl: string;
  initial: string;
};

Page({
  data: {
    user: null as AuthUser | null,
    avatarUrl: "",
    nicknameInput: "",
    roleLabel: "",
    statusLabel: "未登录",
    currentGroupName: "",
    currentGroupMemberCount: 0,
    groupAvatars: [] as AvatarStackItem[],
    extraGroupMemberCount: 0,
    needsProfileSetup: false,
    isSavingProfile: false,
    summary: {
      recipeCount: 0,
      takeoutCount: 0,
      favoriteCount: 0,
      recentMealCount: 0
    } as ProfileSummary
  },

  onShow() {
    this.loadProfile();
  },

  async loadProfile() {
    const token = getToken();
    const cachedUser = getStoredUser();
    if (cachedUser && token) {
      this.setProfileUser(cachedUser);
      this.setProfileGroupState(getGroupState());
    }

    if (!token) {
      this.resetProfileUser();
      return;
    }

    try {
      const user = await request<AuthUser>({ url: "/profile/me" });
      setStoredUser(user);
      this.setProfileUser(user);
      await this.loadGroupInfo();
      await this.loadSummary();
    } catch (error) {
      if (isUnauthorized(error)) {
        clearAuth();
        this.resetProfileUser();
        wx.showToast({ title: "登录已过期，请重新登录", icon: "none" });
        return;
      }

      wx.showToast({ title: "资料加载失败", icon: "none" });
    }
  },

  async loadSummary() {
    if (!getToken()) {
      return;
    }

    try {
      const summary = await request<ProfileSummary>({
        url: "/profile/summary"
      });
      this.setData({ summary });
    } catch (error) {
      if (!isAuthRequiredError(error)) {
        wx.showToast({ title: "统计加载失败", icon: "none" });
      }
    }
  },

  async loginWithWechat() {
    try {
      wx.showLoading({ title: "登录中" });
      const result = await login();
      setStoredUser(result.user);
      setGroupState({
        currentGroupId: result.currentGroupId ?? null,
        groups: result.groups ?? []
      });
      this.setProfileUser(result.user);
      this.setProfileGroupState(getGroupState());
      await this.loadSummary();
      wx.showToast({ title: "登录成功", icon: "success" });
      if (!result.user.nickname) {
        wx.showToast({ title: "请选择微信昵称", icon: "none" });
      }
      return result;
    } catch {
      wx.showToast({ title: "登录失败，请稍后重试", icon: "none" });
      return null;
    } finally {
      wx.hideLoading();
    }
  },

  async loadGroupInfo() {
    try {
      const state = await loadGroups();
      this.setProfileGroupState(state);
      await this.loadGroupMembers(state.currentGroupId);
    } catch (error) {
      if (!isAuthRequiredError(error)) {
        wx.showToast({ title: "饭团加载失败", icon: "none" });
      }
    }
  },

  async loadGroupMembers(groupId: string | null) {
    if (!groupId) {
      this.setData({
        groupAvatars: [],
        extraGroupMemberCount: 0
      });
      return;
    }

    try {
      const members = await request<GroupMember[]>({
        url: `/groups/${groupId}/members`
      });
      this.setGroupAvatars(members);
    } catch (error) {
      if (!isAuthRequiredError(error)) {
        this.setData({
          groupAvatars: [],
          extraGroupMemberCount: 0
        });
      }
    }
  },

  async onChooseAvatar(event: WechatMiniprogram.CustomEvent<{ avatarUrl: string }>) {
    const avatarUrl = event.detail.avatarUrl;
    if (!avatarUrl) {
      return;
    }

    try {
      if (!getToken()) {
        const result = await this.loginWithWechat();
        if (!result) {
          return;
        }
      }

      wx.showLoading({ title: "上传头像" });
      const uploaded = await uploadAvatar(avatarUrl);
      const user = await request<AuthUser>({
        url: "/profile/me",
        method: "PATCH",
        data: { avatarUrl: uploaded.url }
      });
      setStoredUser(user);
      this.setProfileUser(user);
    } catch (error) {
      if (!isAuthRequiredError(error)) {
        wx.showToast({ title: "头像上传失败", icon: "none" });
      }
    } finally {
      wx.hideLoading();
    }
  },

  onNicknameInput(event: WechatMiniprogram.Input) {
    this.setData({ nicknameInput: event.detail.value });
  },

  async submitProfile(event: WechatMiniprogram.FormSubmit) {
    const values = event.detail.value as { nickname?: string };
    const nickname = (values.nickname || this.data.nicknameInput || "").trim();

    if (!nickname) {
      wx.showToast({ title: "请选择微信昵称", icon: "none" });
      return;
    }

    try {
      if (!getToken()) {
        const result = await this.loginWithWechat();
        if (!result) {
          return;
        }
      }

      this.setData({ isSavingProfile: true });
      const user = await request<AuthUser>({
        url: "/profile/me",
        method: "PATCH",
        data: {
          nickname,
          ...(this.data.avatarUrl ? { avatarUrl: this.data.avatarUrl } : {})
        }
      });
      setStoredUser(user);
      this.setProfileUser(user);
      wx.showToast({ title: "资料已保存", icon: "success" });
    } catch (error) {
      if (!isAuthRequiredError(error)) {
        wx.showToast({ title: "保存失败，请稍后重试", icon: "none" });
      }
    } finally {
      this.setData({ isSavingProfile: false });
    }
  },

  setProfileUser(user: AuthUser) {
    this.setData({
      user,
      avatarUrl: user.avatarUrl || "",
      nicknameInput: user.nickname || "",
      roleLabel: toRoleLabel(user.role),
      statusLabel: user.role === "viewer" ? "已登录" : `已登录 · ${toRoleLabel(user.role)}`,
      needsProfileSetup: !user.nickname
    });
  },

  setProfileGroupState(state: GroupState) {
    const currentGroup =
      state.groups.find((group) => group.id === state.currentGroupId) ||
      state.groups[0];

    this.setData({
      currentGroupName: currentGroup?.name || "",
      currentGroupMemberCount: currentGroup?.memberCount || 0
    });
  },

  setGroupAvatars(members: GroupMember[]) {
    const visibleMembers = members.slice(0, 4);
    this.setData({
      groupAvatars: visibleMembers.map((member, index) => {
        const nickname = member.nickname || (index === 0 ? "我" : "饭搭子");
        return {
          userId: member.userId,
          nickname,
          avatarUrl: member.avatarUrl || "",
          initial: nickname.slice(0, 1) || "TM"
        };
      }),
      extraGroupMemberCount: Math.max(members.length - visibleMembers.length, 0)
    });
  },

  resetProfileUser() {
    this.setData({
      user: null,
      avatarUrl: "",
      nicknameInput: "",
      roleLabel: "",
      statusLabel: "未登录",
      currentGroupName: "",
      currentGroupMemberCount: 0,
      groupAvatars: [],
      extraGroupMemberCount: 0,
      needsProfileSetup: false,
      summary: {
        recipeCount: 0,
        takeoutCount: 0,
        favoriteCount: 0,
        recentMealCount: 0
      }
    });
  },

  logout() {
    wx.showModal({
      title: "退出登录",
      content: "退出后，本机将清除登录状态和微信资料缓存。",
      confirmText: "退出",
      confirmColor: "#B7895C",
      success: ({ confirm }) => {
        if (!confirm) {
          return;
        }

        clearAuth();
        this.resetProfileUser();
        wx.showToast({ title: "已退出登录", icon: "success" });
      }
    });
  },

  goHome() {
    wx.navigateTo({ url: "/pages/home/home" });
  },

  goRecipes() {
    wx.navigateTo({ url: "/pages/recipes/recipes" });
  },

  goRandom() {
    wx.navigateTo({ url: "/pages/result/result" });
  },

  goFavorites() {
    wx.navigateTo({ url: "/pages/favorites/favorites" });
  },

  goGroups() {
    wx.navigateTo({ url: "/pages/groups/groups" });
  },

  goGroupInvite() {
    wx.navigateTo({ url: "/pages/group-invite/group-invite" });
  },

  goGroupMembers() {
    wx.navigateTo({ url: "/pages/group-members/group-members" });
  }
});

function isUnauthorized(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "statusCode" in error &&
      (error as WechatMiniprogram.RequestSuccessCallbackResult).statusCode === 401
  );
}

function toRoleLabel(role: AuthUser["role"]): string {
  const labels: Record<AuthUser["role"], string> = {
    viewer: "访客",
    editor: "编辑",
    owner: "主人"
  };

  return labels[role];
}
