Page({
  data: {
    scene: [
      { label: "全部", icon: "home" },
      { label: "日常", icon: "star" },
      { label: "约会", icon: "heart" },
      { label: "聚餐", icon: "usergroup" },
      { label: "宵夜", icon: "moon" },
      { label: "便当", icon: "rice-ball" }
    ],
    type: ["全部", "中餐", "西餐", "日料", "韩餐", "东南亚", "小吃", "饮品", "甜品", "其他"],
    taste: ["全部", "清淡", "香辣", "酸辣", "甜口", "咸鲜", "蒜香", "麻辣", "番茄", "咖喱"],
    methods: ["全部", "炒", "煎", "蒸", "烤", "炸", "焖", "拌", "炖", "凉拌"],
    ingredients: ["全部", "肉类", "海鲜", "蔬菜", "豆制品"],
    selected: {
      scene: 0,
      type: 0,
      taste: 0,
      methods: 0,
      ingredients: 0
    }
  },

  back() {
    wx.navigateBack();
  },

  reset() {
    this.setData({
      selected: {
        scene: 0,
        type: 0,
        taste: 0,
        methods: 0,
        ingredients: 0
      }
    });
  },

  choose(event: any) {
    const key = event.currentTarget.dataset.key;
    const index = event.currentTarget.dataset.index;
    this.setData({ [`selected.${key}`]: index });
  },

  submit() {
    wx.navigateTo({ url: "/pages/result/result" });
  }
});
