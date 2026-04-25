const storageKey = "todayMeal.takeoutFavorites";

type StoreItem = {
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

const defaultStores: StoreItem[] = [
  {
    name: "喜茶（万象城店）",
    desc: "多肉葡萄",
    price: "¥28",
    likes: 66,
    tag: "茶",
    image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=260&q=80"
  },
  {
    name: "太二酸菜鱼（万象城店）",
    desc: "酸菜鱼",
    price: "¥88",
    likes: 42,
    tag: "鱼",
    image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=260&q=80"
  },
  {
    name: "海底捞外送",
    desc: "番茄锅底",
    price: "¥68",
    likes: 38,
    tag: "锅",
    image: "https://images.unsplash.com/photo-1615361200141-f45961202b5c?auto=format&fit=crop&w=260&q=80"
  },
  {
    name: "肯德基宅急送",
    desc: "吮指原味鸡",
    price: "¥39.9",
    likes: 24,
    tag: "炸",
    image: "https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=260&q=80"
  },
  {
    name: "茶百道",
    desc: "鲜奶茶",
    price: "¥26",
    likes: 18,
    tag: "饮",
    image: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=260&q=80"
  }
];

Page({
  data: {
    tabs: ["全部", "外卖", "店铺", "饮品"],
    activeTab: 0,
    stores: defaultStores
  },

  onShow() {
    this.setData({ stores: [...this.readStoredTakeouts(), ...defaultStores] });
  },

  chooseTab(event: any) {
    this.setData({ activeTab: event.currentTarget.dataset.index });
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

  readStoredTakeouts(): StoreItem[] {
    try {
      return wx.getStorageSync(storageKey) || [];
    } catch {
      return [];
    }
  }
});
