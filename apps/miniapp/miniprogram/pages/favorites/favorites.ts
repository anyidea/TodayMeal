import { request } from "../../utils/api";

type StoreItem = {
  id?: string;
  name: string;
  desc: string;
  price: string;
  likes: number;
  tag: string;
  image: string;
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
  notes?: string;
  tags: { name: string }[];
};

const defaultImage =
  "https://images.unsplash.com/photo-1615361200141-f45961202b5c?auto=format&fit=crop&w=260&q=80";

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
          price: item.priceRange || "价格待补",
          likes: 0,
          tag: this.tagFromItem(item),
          image: item.coverImageUrl || defaultImage,
          platform: item.platform,
          platformLabel: item.tags[0]?.name,
          externalUrl: item.externalUrl,
          notes: item.notes
        }))
      });
    } catch {
      wx.showToast({ title: "外卖收藏加载失败", icon: "none" });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  openExternalUrl(event: any) {
    const url = event.currentTarget.dataset.url;
    if (!url) {
      return;
    }

    wx.setClipboardData({
      data: url,
      success: () => {
        wx.showToast({ title: "链接已复制", icon: "success" });
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

  goAddTakeout() {
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
