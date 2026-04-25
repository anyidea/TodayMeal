import { api } from '../../services/api';
import type { MenuItemView, RecommendationView } from '../../types';

type TodayPageData = {
  recommendation?: RecommendationView;
  menuItems: MenuItemView[];
  takeoutItems: MenuItemView[];
  drawing: boolean;
};

Page<TodayPageData, {
  loadToday: () => Promise<void>;
  drawRandom: () => Promise<void>;
  goMenu: () => void;
  goFilter: () => void;
  goRandom: () => void;
  goFavorites: () => void;
  goDetail: (event: WechatMiniprogram.TouchEvent) => void;
  goEdit: () => void;
}>({
  data: {
    recommendation: undefined,
    menuItems: [],
    takeoutItems: [],
    drawing: false,
  },

  onShow() {
    this.getTabBar()?.setData({ selected: 0 });
    void this.loadToday();
  },

  async loadToday() {
    try {
      const [recommendation, menuItems, takeoutItems] = await Promise.all([
        api.get<RecommendationView>('/recommendations/today'),
        api.get<MenuItemView[]>('/menu-items?limit=8'),
        api.get<MenuItemView[]>('/menu-items?type=takeout&favorite=true&limit=6'),
      ]);

      this.setData({
        recommendation,
        menuItems,
        takeoutItems,
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

  goFilter() {
    wx.navigateTo({
      url: '/pages/filter/index',
    });
  },

  goRandom() {
    wx.switchTab({
      url: '/pages/random-result/index',
    });
  },

  goFavorites() {
    wx.switchTab({
      url: '/pages/favorites/index',
    });
  },

  goDetail(event) {
    const id = event.currentTarget.dataset.id as string;
    if (!id) {
      return;
    }

    wx.navigateTo({
      url: `/pages/menu-detail/index?id=${id}`,
    });
  },

  goEdit() {
    wx.navigateTo({
      url: '/pages/menu-edit/index?type=recipe',
    });
  },
});
