import { api } from '../../services/api';
import { getToken } from '../../services/auth';
import type { RecommendationView, MenuItemView } from '../../types';

type RandomResultData = {
  recommendation?: RecommendationView;
  pairings: string[];
  drawing: boolean;
};

const fallbackPairings = ['一杯热饮', '清爽小菜', '饭后水果'];

function requireToken(): string {
  const token = getToken();
  if (!token) {
    wx.showToast({
      title: '先登录后再收藏呀',
      icon: 'none',
    });
  }

  return token;
}

Page<RandomResultData, {
  draw: () => Promise<void>;
  toggleFavorite: () => Promise<void>;
  markEaten: () => Promise<void>;
  goDetail: () => void;
}>({
  data: {
    recommendation: undefined,
    pairings: fallbackPairings,
    drawing: false,
  },

  onShow() {
    this.getTabBar()?.setData({ selected: 2 });
    void this.draw();
  },

  async draw() {
    if (this.data.drawing) {
      return;
    }

    this.setData({ drawing: true });
    try {
      await new Promise((resolve) => setTimeout(resolve, 420));
      const recommendation = await api.post<RecommendationView>('/recommendations/random', {});
      const tags = recommendation.item.tags.map((tag) => tag.name).slice(0, 3);
      this.setData({
        recommendation,
        pairings: tags.length ? tags.map((tag) => `搭配一点${tag}`) : fallbackPairings,
      });
    } catch {
      wx.showToast({
        title: '还没抽到，先去菜单加几道吧',
        icon: 'none',
      });
    } finally {
      this.setData({ drawing: false });
    }
  },

  async toggleFavorite() {
    const token = requireToken();
    const current = this.data.recommendation;
    const item = current?.item;
    if (!token || !current || !item) {
      return;
    }

    try {
      const updated = await api.post<MenuItemView>(`/menu-items/${item.id}/favorite`, {}, token);
      this.setData({
        recommendation: {
          ...current,
          item: updated,
        },
      });
      wx.showToast({
        title: updated.isFavorite ? '已收藏' : '已取消收藏',
        icon: 'none',
      });
    } catch {
      wx.showToast({
        title: '收藏没成功',
        icon: 'none',
      });
    }
  },

  async markEaten() {
    const token = requireToken();
    const item = this.data.recommendation?.item;
    if (!token || !item) {
      return;
    }

    try {
      await api.post(
        '/meal-history',
        {
          menuItemId: item.id,
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
        title: '记录失败',
        icon: 'none',
      });
    }
  },

  goDetail() {
    const id = this.data.recommendation?.item.id;
    if (!id) {
      return;
    }

    wx.navigateTo({
      url: `/pages/menu-detail/index?id=${id}`,
    });
  },
});
