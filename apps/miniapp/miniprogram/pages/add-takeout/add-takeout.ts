Page({
  data: {
    fields: [
      { label: "店铺名称", placeholder: "例如：太二酸菜鱼" },
      { label: "常点菜单", placeholder: "例如：酸菜鱼双人餐" },
      { label: "分类", placeholder: "外卖 / 店铺 / 饮品" },
      { label: "人均价格", placeholder: "例如：¥68" }
    ]
  },

  back() {
    wx.navigateBack();
  },

  save() {
    wx.showToast({ title: "已保存外卖", icon: "success" });
  }
});
