import { api } from '../../services/api';
import type { MenuItemType, MenuItemView } from '../../types';

type FavoriteFilter = 'takeout' | MenuItemType | 'all';

type FavoritesData = {
  active: FavoriteFilter;
  items: MenuItemView[];
  loading: boolean;
};

function buildQuery(active: FavoriteFilter): string {
  const params = ['favorite=true'];
  if (active !== 'all') {
    params.push(`type=${active}`);
  }

  return `?${params.join('&')}`;
}

Page<FavoritesData, {
  loadItems: () => Promise<void>;
  setFilter: (event: WechatMiniprogram.TouchEvent) => void;
  goAddTakeout: () => void;
}>({
  data: {
    active: 'takeout',
    items: [],
    loading: false,
  },

  onShow() {
    this.getTabBar()?.setData({ selected: 3 });
    void this.loadItems();
  },

  async loadItems() {
    this.setData({ loading: true });
    try {
      const items = await api.get<MenuItemView[]>(`/menu-items${buildQuery(this.data.active)}`);
      this.setData({ items });
    } catch {
      wx.showToast({
        title: '收藏暂时没加载出来',
        icon: 'none',
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  setFilter(event) {
    const active = event.currentTarget.dataset.value as FavoriteFilter;
    this.setData({ active });
    void this.loadItems();
  },

  goAddTakeout() {
    wx.navigateTo({
      url: '/pages/menu-edit/index?type=takeout',
    });
  },
});
