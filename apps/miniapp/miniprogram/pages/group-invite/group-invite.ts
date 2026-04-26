import {
  createGroupInvite,
  getGroupState,
  joinGroup,
  loadGroups,
  login
} from "../../utils/auth";
import { getToken, isAuthRequiredError } from "../../utils/api";

Page({
  data: {
    currentGroupId: "",
    currentGroupName: "",
    inviteCode: "",
    joinCode: "",
    pendingInviteCode: "",
    sharePath: "",
    isJoiningFromShare: false,
    isLoading: false
  },

  onLoad(options: { inviteCode?: string }) {
    const inviteCode = decodeURIComponent(options.inviteCode || "").trim();
    if (inviteCode) {
      this.setData({ pendingInviteCode: inviteCode });
    }
  },

  onShow() {
    if (this.data.pendingInviteCode) {
      this.joinFromShare();
      return;
    }

    const state = getGroupState();
    this.applyGroupState(state);
    this.loadGroupState();
  },

  back() {
    wx.navigateBack();
  },

  async loadGroupState() {
    try {
      const state = await loadGroups();
      this.applyGroupState(state);
      await this.ensureShareInvite();
    } catch {
      wx.showToast({ title: "饭团加载失败", icon: "none" });
    }
  },

  async ensureShareInvite() {
    if (!this.data.currentGroupId) {
      return;
    }

    if (this.data.inviteCode || this.data.isLoading) {
      return;
    }

    this.setData({ isLoading: true });
    try {
      const result = await createGroupInvite(this.data.currentGroupId);
      this.setData({
        inviteCode: result.inviteCode,
        sharePath: buildInvitePath(result.inviteCode)
      });
    } catch {
      wx.showToast({ title: "分享邀请准备失败", icon: "none" });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  async copyInviteCode() {
    await this.ensureShareInvite();
    if (!this.data.inviteCode) {
      wx.showToast({ title: "暂无邀请码", icon: "none" });
      return;
    }

    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => {
        wx.showToast({ title: "邀请码已复制", icon: "success" });
      }
    });
  },

  onJoinCodeInput(event: WechatMiniprogram.Input) {
    this.setData({ joinCode: event.detail.value });
  },

  async joinByCode() {
    const inviteCode = this.data.joinCode.trim();
    if (!inviteCode) {
      wx.showToast({ title: "请输入邀请码", icon: "none" });
      return;
    }

    this.setData({ isLoading: true });
    try {
      const state = await joinGroup(inviteCode);
      this.applyGroupState(state);
      this.setData({ joinCode: "" });
      wx.showToast({ title: "已加入饭团", icon: "success" });
    } catch (error) {
      if (isAuthRequiredError(error)) {
        return;
      }
      wx.showToast({ title: "邀请码无效", icon: "none" });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  async joinFromShare() {
    const inviteCode = this.data.pendingInviteCode;
    if (!inviteCode || this.data.isJoiningFromShare) {
      return;
    }

    this.setData({ isJoiningFromShare: true, isLoading: true });
    try {
      wx.showLoading({ title: getToken() ? "加入饭团" : "登录并加入" });
      if (!getToken()) {
        await login();
      }

      const state = await joinGroup(inviteCode);
      this.applyGroupState(state);
      this.setData({
        pendingInviteCode: "",
        joinCode: ""
      });
      wx.showToast({ title: "已加入饭团", icon: "success" });
      wx.redirectTo({ url: "/pages/group-members/group-members" });
    } catch {
      wx.showToast({ title: "邀请已失效", icon: "none" });
    } finally {
      wx.hideLoading();
      this.setData({ isJoiningFromShare: false, isLoading: false });
    }
  },

  applyGroupState(state: { currentGroupId: string | null; groups: Array<{ id: string; name: string }> }) {
    const currentGroup =
      state.groups.find((group) => group.id === state.currentGroupId) ||
      state.groups[0];

    this.setData({
      currentGroupId: currentGroup?.id || "",
      currentGroupName: currentGroup?.name || ""
    });
  },

  onShareAppMessage() {
    const inviteCode = this.data.inviteCode;
    return {
      title: `${this.data.currentGroupName || "我的饭团"}邀请你一起决定今天吃什么`,
      path: inviteCode ? buildInvitePath(inviteCode) : "/pages/home/home"
    };
  }
});

function buildInvitePath(inviteCode: string): string {
  return `/pages/group-invite/group-invite?inviteCode=${encodeURIComponent(inviteCode)}`;
}
