Page({
  data: {
    fields: [
      { label: "菜谱名称", value: "", placeholder: "请输入菜谱名称", arrow: false },
      { label: "分类", value: "", placeholder: "请选择分类", arrow: true },
      { label: "口味", value: "", placeholder: "选择口味", arrow: true },
      { label: "烹饪方式", value: "", placeholder: "选择烹饪方式", arrow: true }
    ],
    addRows: ["食材", "烹饪步骤"]
  },

  back() {
    wx.navigateBack();
  },

  save() {
    wx.showToast({ title: "已保存菜谱", icon: "success" });
  }
});
