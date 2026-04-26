import { isAuthRequiredError, request } from "../../utils/api";
import { getGroupState, loadGroups } from "../../utils/auth";

type GroupMember = {
  userId: string;
  nickname?: string | null;
  avatarUrl?: string | null;
  joinedAt: string;
  canRemove?: boolean;
};

Page({
  data: {
    currentGroupId: "",
    currentGroupName: "",
    members: [] as GroupMember[],
    isLoading: false
  },

  onShow() {
    const state = getGroupState();
    const currentGroup =
      state.groups.find((group) => group.id === state.currentGroupId) ||
      state.groups[0];

    this.setData({
      currentGroupId: currentGroup?.id || "",
      currentGroupName: currentGroup?.name || ""
    });
    this.loadMembers();
  },

  back() {
    wx.navigateBack();
  },

  async loadMembers() {
    this.setData({ isLoading: true });
    try {
      let groupId = this.data.currentGroupId;
      if (!groupId) {
        const state = await loadGroups();
        const currentGroup =
          state.groups.find((group) => group.id === state.currentGroupId) ||
          state.groups[0];
        groupId = currentGroup?.id || "";
        this.setData({
          currentGroupId: groupId,
          currentGroupName: currentGroup?.name || ""
        });
      }

      if (!groupId) {
        return;
      }

      const members = await request<GroupMember[]>({
        url: `/groups/${groupId}/members`
      });
      this.setData({ members });
    } catch {
      wx.showToast({ title: "饭搭子加载失败", icon: "none" });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  removeMember(event: WechatMiniprogram.TouchEvent) {
    const userId = event.currentTarget.dataset.userId as string;
    const canRemove = event.currentTarget.dataset.canRemove === "1";
    if (!userId || !canRemove || !this.data.currentGroupId) {
      return;
    }

    const member = this.data.members.find((item) => item.userId === userId);
    const nickname = member?.nickname || "这位饭搭子";
    wx.showModal({
      title: "移除饭搭子",
      content: `确定把${nickname}移出当前饭团吗？`,
      confirmText: "移除",
      confirmColor: "#B7895C",
      success: async ({ confirm }) => {
        if (!confirm) {
          return;
        }

        try {
          await request({
            url: `/groups/${this.data.currentGroupId}/members/${userId}`,
            method: "DELETE"
          });
          await loadGroups();
          wx.showToast({ title: "已移除", icon: "success" });
          await this.loadMembers();
        } catch (error) {
          if (isAuthRequiredError(error)) {
            return;
          }
          wx.showToast({ title: "移除失败", icon: "none" });
        }
      }
    });
  },

  goInvite() {
    wx.navigateTo({ url: "/pages/group-invite/group-invite" });
  }
});
