import { api } from '../../services/api';
import type { MenuItemView, RecommendationView } from '../../types';

type TodayPageData = {
  recommendation?: RecommendationView;
  menuItems: MenuItemView[];
  drawing: boolean;
};

Page<TodayPageData, {
  loadToday: () => Promise<void>;
  drawRandom: () => Promise<void>;
  goMenu: () => void;
  goEdit: () => void;
}>({
  data: {
    recommendation: undefined,
    menuItems: [],
    drawing: false,
  },

  onShow() {
    void this.loadToday();
  },

  async loadToday() {
    try {
      const [recommendation, menuItems] = await Promise.all([
        api.get<RecommendationView>('/recommendations/today'),
        api.get<MenuItemView[]>('/menu-items?limit=10'),
      ]);

      this.setData({
        recommendation,
        menuItems,
      });
    } catch {
      wx.showToast({
        title: '今天的灵感还没准备好',
        icon: 'none',
      });
    }
  },

  async drawRandom() {
    if (this.data.drawing) {
      return;
    }

    this.setData({ drawing: true });

    try {
      await new Promise((resolve) => setTimeout(resolve, 450));
      const recommendation = await api.post<RecommendationView>('/recommendations/random', {});
      this.setData({ recommendation });
    } catch {
      wx.showToast({
        title: '还没抽到合适的，先去菜单加几道吧',
        icon: 'none',
      });
    } finally {
      this.setData({ drawing: false });
    }
  },

  goMenu() {
    wx.switchTab({
      url: '/pages/menu/index',
    });
  },

  goEdit() {
    wx.navigateTo({
      url: '/pages/menu-edit/index?type=recipe',
    });
  },
});
