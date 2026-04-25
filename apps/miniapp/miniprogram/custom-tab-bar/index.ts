type TabItem = {
  text: string;
  path: string;
};

Component({
  data: {
    selected: 0,
    list: [
      { text: '今天', path: '/pages/today/index' },
      { text: '菜单', path: '/pages/menu/index' },
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
