type TabItem = {
  text: string;
  path: string;
};

Component({
  data: {
    selected: 0,
    list: [
      { text: '首页', path: '/pages/today/index' },
      { text: '菜谱', path: '/pages/menu/index' },
      { text: '随机', path: '/pages/random-result/index' },
      { text: '收藏', path: '/pages/favorites/index' },
      { text: '我的', path: '/pages/profile/index' },
    ] as TabItem[],
  },

  methods: {
    switchTab(event: WechatMiniprogram.CustomEvent<{ index: number; path: string }>) {
      const { index, path } = event.currentTarget.dataset;
      if (typeof index === 'number') {
        this.setData({ selected: index });
      }
      if (path) {
        wx.switchTab({ url: path });
      }
    },
  },
});
