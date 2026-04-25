import { request } from "../../utils/api";

type ProfileSummary = {
  recipeCount: number;
  takeoutCount: number;
  favoriteCount: number;
  recentMealCount: number;
};

Page({
  data: {
    summary: {
      recipeCount: 0,
      takeoutCount: 0,
      favoriteCount: 0,
      recentMealCount: 0
    } as ProfileSummary
  },

  onShow() {
    this.loadSummary();
  },

  async loadSummary() {
    try {
      const summary = await request<ProfileSummary>({
        url: "/profile/summary"
      });
      this.setData({ summary });
    } catch {
      wx.showToast({ title: "统计加载失败", icon: "none" });
    }
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
  }
});
