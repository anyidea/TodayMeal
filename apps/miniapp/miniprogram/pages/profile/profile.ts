Page({
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
