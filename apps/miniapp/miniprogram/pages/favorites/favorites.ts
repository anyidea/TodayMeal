import { isAuthRequiredError, request, requireLogin } from "../../utils/api";

type StoreItem = {
  id?: string;
  name: string;
  desc: string;
  price: string;
  tag: string;
  image: string;
  isFavorite?: boolean;
  platform?: string;
  platformLabel?: string;
  externalUrl?: string;
  notes?: string;
};

type MenuItem = {
  id: string;
  title: string;
  subtitle?: string;
  restaurantName?: string;
  platform?: string;
  externalUrl?: string;
  priceRange?: string;
  coverImageUrl?: string;
  isFavorite?: boolean;
  notes?: string;
  tags: { name: string }[];
};

Page({
  data: {
    tabs: ["全部", "外卖", "店铺", "饮品"],
    activeTab: 0,
    stores: [],
    isLoading: false
  },

  onShow() {
    this.loadStores();
  },

  chooseTab(event: any) {
    this.setData({ activeTab: event.currentTarget.dataset.index }, () => {
      this.loadStores();
    });
  },

  async loadStores() {
    if (!requireLogin()) {
      return;
    }

    const tab = this.data.tabs[this.data.activeTab];
    const query = tab === "全部" ? "" : `&tag=${encodeURIComponent(tab)}`;

    this.setData({ isLoading: true });
    try {
      const items = await request<MenuItem[]>({
        url: `/menu-items?type=takeout${query}`
      });

      this.setData({
        stores: items.map((item) => ({
          id: item.id,
          name: item.restaurantName || item.subtitle || item.title,
          desc: item.title,
          price: item.priceRange || "",
          tag: this.tagFromItem(item),
          image: item.coverImageUrl || "",
          isFavorite: Boolean(item.isFavorite),
          platform: item.platform,
          platformLabel: item.tags[0]?.name,
          externalUrl: item.externalUrl,
          notes: item.notes
        }))
      });
    } catch (error) {
      if (!isAuthRequiredError(error)) {
        wx.showToast({ title: "外卖收藏加载失败", icon: "none" });
      }
    } finally {
      this.setData({ isLoading: false });
    }
  },

  openExternalUrl(event: any) {
    const url = event.currentTarget.dataset.url;
    if (!url) {
      return;
    }

    this.navigateToExternalUrl(url);
  },

  showStoreMenu(event: WechatMiniprogram.TouchEvent) {
    const { id, favorite, url } = event.currentTarget.dataset as {
      id?: string;
      favorite?: string;
      url?: string;
    };
    if (!id) {
      return;
    }

    const itemList = [favorite === "1" ? "取消收藏" : "收藏"];
    if (url) {
      itemList.unshift("去下单");
    }

    wx.showActionSheet({
      itemList,
      success: ({ tapIndex }) => {
        if (url && tapIndex === 0) {
          this.navigateToExternalUrl(url);
          return;
        }

        this.toggleFavorite(id);
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
      await this.loadStores();
    } catch (error) {
      if (!isAuthRequiredError(error)) {
        wx.showToast({ title: "操作失败", icon: "none" });
      }
    }
  },

  navigateToExternalUrl(url: string) {
    wx.navigateTo({
      url: `/pages/external-link/external-link?url=${encodeURIComponent(url)}`
    });
  },

  goHome() {
    wx.navigateTo({ url: "/pages/home/home" });
  },

  goRecipes() {
    if (!requireLogin()) {
      return;
    }

    wx.navigateTo({ url: "/pages/recipes/recipes" });
  },

  goRandom() {
    if (!requireLogin()) {
      return;
    }

    wx.navigateTo({ url: "/pages/result/result" });
  },

  goAddTakeout() {
    if (!requireLogin()) {
      return;
    }

    wx.navigateTo({ url: "/pages/add-takeout/add-takeout" });
  },

  goProfile() {
    wx.navigateTo({ url: "/pages/profile/profile" });
  },

  tagFromItem(item: MenuItem): string {
    const label = item.tags[0]?.name || item.platform || "外";
    if (label.includes("美团")) {
      return "美";
    }
    if (label.includes("淘宝")) {
      return "淘";
    }

    return label.slice(0, 1);
  }
});
