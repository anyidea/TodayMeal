import type { MealPeriod, MenuItemView } from '../../types';

const typeLabels = {
  recipe: '自家菜谱',
  takeout: '外卖收藏',
  inspiration: '灵感清单',
};

const mealPeriodLabels: Record<MealPeriod, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  lateNight: '夜宵',
};

Component({
  properties: {
    item: {
      type: Object,
      value: null,
      observer: 'syncMeta',
    },
  },
  data: {
    typeLabel: '',
    mealPeriodText: '',
    subtitleText: '',
    extraText: '',
  },
  methods: {
    syncMeta(item: MenuItemView | null) {
      if (!item) {
        this.setData({
          typeLabel: '',
          mealPeriodText: '',
          subtitleText: '',
          extraText: '',
        });
        return;
      }

      this.setData({
        typeLabel: typeLabels[item.type],
        mealPeriodText: item.mealPeriods.map((period) => mealPeriodLabels[period]).join(' · '),
        subtitleText: item.subtitle || item.restaurantName || item.notes || '还没有补充说明',
        extraText:
          item.type === 'takeout'
            ? item.platform || '美团 / 淘宝闪购 / 小程序'
            : item.cookTimeMinutes
              ? `${item.cookTimeMinutes} 分钟`
              : '慢慢做',
      });
    },

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
