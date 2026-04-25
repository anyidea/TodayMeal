import { request } from "../../utils/api";

type Tag = {
  name: string;
};

type MenuItem = {
  id: string;
  title: string;
  subtitle?: string;
  coverImageUrl?: string;
  cookTimeMinutes?: number;
  tags: Tag[];
};

const fallbackImage =
  "https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=280&q=80";

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
          time: item.cookTimeMinutes ? `${item.cookTimeMinutes}分钟` : "未设置",
          likes: 0,
          image: item.coverImageUrl || fallbackImage
        }))
      });
    } catch {
      wx.showToast({ title: "菜谱加载失败", icon: "none" });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  goAdd() {
    wx.navigateTo({ url: "/pages/add-recipe/add-recipe" });
  },

  goHome() {
    wx.navigateTo({ url: "/pages/home/home" });
  },

  goRandom() {
    wx.navigateTo({ url: "/pages/result/result" });
  },

  goFavorites() {
    wx.navigateTo({ url: "/pages/favorites/favorites" });
  },

  goProfile() {
    wx.navigateTo({ url: "/pages/profile/profile" });
  }
});
