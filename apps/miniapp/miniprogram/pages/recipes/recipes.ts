Page({
  data: {
    tabs: ["全部", "家常菜", "快手菜", "甜品", "饮品", "主食"],
    activeTab: 0,
    recipes: [
      {
        name: "可乐鸡翅",
        meta: "家常菜　简单",
        time: "20分钟",
        likes: 128,
        image: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=280&q=80"
      },
      {
        name: "蒜蓉粉丝蒸虾",
        meta: "快手菜　海鲜",
        time: "25分钟",
        likes: 96,
        image: "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=280&q=80"
      },
      {
        name: "麻婆豆腐",
        meta: "家常菜　香辣",
        time: "15分钟",
        likes: 88,
        image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=280&q=80"
      },
      {
        name: "奶油蘑菇汤",
        meta: "西餐　暖胃",
        time: "20分钟",
        likes: 76,
        image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=280&q=80"
      },
      {
        name: "糖醋排骨",
        meta: "家常菜　酸甜",
        time: "35分钟",
        likes: 110,
        image: "https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=280&q=80"
      }
    ]
  },

  chooseTab(event: any) {
    this.setData({ activeTab: event.currentTarget.dataset.index });
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
