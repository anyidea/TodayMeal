Page({
  data: {
    tags: [
      {
        name: "清炒西兰花",
        image: "https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?auto=format&fit=crop&w=180&q=80"
      },
      {
        name: "米饭",
        image: "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=180&q=80"
      },
      {
        name: "冰红茶",
        image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=180&q=80"
      }
    ]
  },

  back() {
    wx.navigateBack();
  },

  share() {
    wx.showToast({ title: "已生成分享图", icon: "none" });
  },

  again() {
    wx.showToast({ title: "为你再来一次", icon: "none" });
  },

  favorite() {
    wx.showToast({ title: "已收藏", icon: "success" });
  },

  goHome() {
    wx.navigateTo({ url: "/pages/home/home" });
  },

  goRecipes() {
    wx.navigateTo({ url: "/pages/recipes/recipes" });
  },

  goFavorites() {
    wx.navigateTo({ url: "/pages/favorites/favorites" });
  },

  goProfile() {
    wx.navigateTo({ url: "/pages/profile/profile" });
  }
});
