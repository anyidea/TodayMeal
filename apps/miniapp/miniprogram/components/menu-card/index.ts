import type { MenuItemView } from '../../types';

Component({
  properties: {
    item: {
      type: Object,
      value: null,
    },
  },
  methods: {
    handleTap() {
      const item = this.data.item as MenuItemView | null;
      if (!item?.id) {
        return;
      }

      wx.navigateTo({
        url: `/pages/menu-detail/index?id=${item.id}`,
      });
    },
  },
});
