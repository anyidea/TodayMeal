import { isAuthRequiredError, request, requireLogin } from "../../utils/api";

type Tag = {
  name: string;
};

type MenuItem = {
  id: string;
  title: string;
  subtitle?: string;
  coverImageUrl?: string;
  cookTimeMinutes?: number;
  isFavorite?: boolean;
  tags: Tag[];
};

Page({
  data: {
    tabs: ["全部", "家常菜", "快手菜", "甜品", "饮品", "主食"],
    activeTab: 0,
    recipes: [],
    isLoading: false
  },

  onShow() {
    this.loadRecipes();
  },

  chooseTab(event: any) {
    this.setData({ activeTab: event.currentTarget.dataset.index }, () => {
      this.loadRecipes();
    });
  },

  async loadRecipes() {
    if (!requireLogin()) {
      return;
    }

    const tab = this.data.tabs[this.data.activeTab];
    const query = tab === "全部" ? "" : `&tag=${encodeURIComponent(tab)}`;

    this.setData({ isLoading: true });
    try {
      const items = await request<MenuItem[]>({
        url: `/menu-items?type=recipe${query}`
      });

      this.setData({
        recipes: items.map((item) => ({
          id: item.id,
          name: item.title,
          meta:
            item.subtitle ||
            item.tags.map((tag) => tag.name).filter(Boolean).join("　") ||
            "未分类",
          time: item.cookTimeMinutes ? `${item.cookTimeMinutes}分钟` : "",
          isFavorite: Boolean(item.isFavorite),
          image: item.coverImageUrl || ""
        }))
      });
    } catch (error) {
      if (!isAuthRequiredError(error)) {
        wx.showToast({ title: "菜谱加载失败", icon: "none" });
      }
    } finally {
      this.setData({ isLoading: false });
    }
  },

  goAdd() {
    if (!requireLogin()) {
      return;
    }

    wx.navigateTo({ url: "/pages/add-recipe/add-recipe" });
  },

  showRecipeMenu(event: WechatMiniprogram.TouchEvent) {
    const { id, favorite } = event.currentTarget.dataset as {
      id?: string;
      favorite?: string;
    };
    if (!id) {
      return;
    }

    wx.showActionSheet({
      itemList: [favorite === "1" ? "取消收藏" : "收藏"],
      success: ({ tapIndex }) => {
        if (tapIndex === 0) {
          this.toggleFavorite(id);
        }
      }
    });
  },

  async toggleFavorite(id: string) {
    if (!requireLogin()) {
      return;
    }

    try {
      await request({
        url: `/menu-items/${id}/favorite`,
        method: "POST"
      });
      wx.showToast({ title: "已更新收藏", icon: "success" });
      await this.loadRecipes();
    } catch (error) {
      if (!isAuthRequiredError(error)) {
        wx.showToast({ title: "操作失败", icon: "none" });
      }
    }
  },

  goHome() {
    wx.navigateTo({ url: "/pages/home/home" });
  },

  goRandom() {
    if (!requireLogin()) {
      return;
    }

    wx.navigateTo({ url: "/pages/result/result" });
  },

  goFavorites() {
    if (!requireLogin()) {
      return;
    }

    wx.navigateTo({ url: "/pages/favorites/favorites" });
  },

  goProfile() {
    wx.navigateTo({ url: "/pages/profile/profile" });
  }
});
