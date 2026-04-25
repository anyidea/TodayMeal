import { api } from '../../services/api';
import { getToken } from '../../services/auth';
import type { MealPeriod, MenuItemView } from '../../types';

const mealPeriodLabels: Record<MealPeriod, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  lateNight: '夜宵',
};

const typeLabels = {
  recipe: '家常菜谱',
  takeout: '外卖收藏',
  inspiration: '灵感片段',
};

type DetailPageData = {
  id: string;
  item?: MenuItemView;
  typeLabel: string;
  mealPeriodText: string;
};

function requireToken(): string {
  const token = getToken();
  if (!token) {
    wx.showToast({
      title: '先登录后再操作呀',
      icon: 'none',
    });
  }

  return token;
}

Page<DetailPageData, {
  loadItem: () => Promise<void>;
  toggleFavorite: () => Promise<void>;
  markEaten: () => Promise<void>;
  editItem: () => void;
  copyExternalLink: () => void;
}>({
  data: {
    id: '',
    item: undefined,
    typeLabel: '',
    mealPeriodText: '',
  },

  onLoad(query) {
    this.setData({ id: String(query.id || '') });
    void this.loadItem();
  },

  async loadItem() {
    if (!this.data.id) {
      return;
    }

    try {
      const item = await api.get<MenuItemView>(`/menu-items/${this.data.id}`);
      this.setData({
        item,
        typeLabel: typeLabels[item.type],
        mealPeriodText: item.mealPeriods.map((period) => mealPeriodLabels[period]).join(' · '),
      });
    } catch {
      wx.showToast({
        title: '这张菜单卡片不见了',
        icon: 'none',
      });
    }
  },

  async toggleFavorite() {
    const token = requireToken();
    if (!token || !this.data.item) {
      return;
    }

    try {
      const item = await api.post<MenuItemView>(
        `/menu-items/${this.data.item.id}/favorite`,
        {},
        token,
      );
      this.setData({ item });
      wx.showToast({
        title: item.isFavorite ? '已放进心动夹' : '已取消收藏',
        icon: 'none',
      });
    } catch {
      wx.showToast({
        title: '收藏状态没改成功',
        icon: 'none',
      });
    }
  },

  async markEaten() {
    const token = requireToken();
    if (!token || !this.data.item) {
      return;
    }

    try {
      await api.post(
        '/meal-history',
        {
          menuItemId: this.data.item.id,
          eatenAt: new Date().toISOString(),
        },
        token,
      );
      wx.showToast({
        title: '已记下这一餐',
        icon: 'success',
      });
    } catch {
      wx.showToast({
        title: '记录失败，稍后再试',
        icon: 'none',
      });
    }
  },

  editItem() {
    if (!this.data.item) {
      return;
    }

    wx.navigateTo({
      url: `/pages/menu-edit/index?id=${this.data.item.id}&type=${this.data.item.type}`,
    });
  },

  copyExternalLink() {
    const url = this.data.item?.externalUrl || this.data.item?.sourceUrl;
    if (!url) {
      wx.showToast({
        title: '还没有可复制的链接',
        icon: 'none',
      });
      return;
    }

    wx.setClipboardData({
      data: url,
      success() {
        wx.showToast({
          title: '链接已复制',
          icon: 'success',
        });
      },
    });
  },
});
