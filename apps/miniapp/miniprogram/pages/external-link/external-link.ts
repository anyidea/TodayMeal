Page({
  data: {
    url: ""
  },

  onLoad(query: { url?: string }) {
    const url = query.url ? decodeURIComponent(query.url) : "";
    if (!url) {
      wx.showToast({ title: "链接无效", icon: "none" });
      setTimeout(() => wx.navigateBack(), 500);
      return;
    }

    this.setData({ url });
  },

  back() {
    wx.navigateBack();
  },

  copyLink() {
    if (!this.data.url) {
      return;
    }

    wx.setClipboardData({
      data: this.data.url,
      success: () => {
        wx.showToast({ title: "链接已复制", icon: "success" });
      }
    });
  },

  onWebViewError() {
    this.copyLink();
    wx.showToast({ title: "已复制链接，可到外部打开", icon: "none" });
  }
});
