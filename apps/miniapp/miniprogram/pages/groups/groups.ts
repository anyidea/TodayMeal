import { MealGroup, getGroupState, loadGroups, switchGroup } from "../../utils/auth";

Page({
  data: {
    groups: [] as MealGroup[],
    currentGroupId: "",
    isLoading: false
  },

  onShow() {
    const cached = getGroupState();
    this.setData({
      groups: cached.groups,
      currentGroupId: cached.currentGroupId || ""
    });
    this.loadGroupList();
  },

  back() {
    wx.navigateBack();
  },

  async loadGroupList() {
    this.setData({ isLoading: true });
    try {
      const state = await loadGroups();
      this.setData({
        groups: state.groups,
        currentGroupId: state.currentGroupId || ""
      });
    } catch {
      wx.showToast({ title: "饭团加载失败", icon: "none" });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  async chooseGroup(event: WechatMiniprogram.TouchEvent) {
    const groupId = event.currentTarget.dataset.id as string;
    if (!groupId || groupId === this.data.currentGroupId) {
      return;
    }

    try {
      wx.showLoading({ title: "切换中" });
      const state = await switchGroup(groupId);
      this.setData({
        groups: state.groups,
        currentGroupId: state.currentGroupId || ""
      });
      wx.showToast({ title: "已切换饭团", icon: "success" });
    } catch {
      wx.showToast({ title: "切换失败", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  },

  goInvite() {
    wx.navigateTo({ url: "/pages/group-invite/group-invite" });
  }
});
