import { api } from '../../services/api';
import type { MealPeriod, MenuItemType, MenuItemView } from '../../types';

type MenuFilterType = 'all' | MenuItemType;
type MenuFilterMealPeriod = 'all' | MealPeriod;

type FilterOption = {
  label: string;
  value: string;
};

type MenuPageData = {
  q: string;
  activeTag: string;
  activeType: MenuFilterType;
  activeMealPeriod: MenuFilterMealPeriod;
  items: MenuItemView[];
  typeOptions: FilterOption[];
  mealPeriodOptions: FilterOption[];
  loading: boolean;
};

const typeOptions: FilterOption[] = [
  { label: '全部', value: 'all' },
  { label: '家常菜谱', value: 'recipe' },
  { label: '外卖收藏', value: 'takeout' },
  { label: '灵感片段', value: 'inspiration' },
];

const mealPeriodOptions: FilterOption[] = [
  { label: '不限时段', value: 'all' },
  { label: '早餐', value: 'breakfast' },
  { label: '午餐', value: 'lunch' },
  { label: '晚餐', value: 'dinner' },
  { label: '夜宵', value: 'lateNight' },
];

function buildQuery(data: MenuPageData): string {
  const params: string[] = [];
  const q = data.q.trim();

  if (q) {
    params.push(`q=${encodeURIComponent(q)}`);
  }

  if (data.activeType !== 'all') {
    params.push(`type=${data.activeType}`);
  }

  if (data.activeMealPeriod !== 'all') {
    params.push(`mealPeriod=${data.activeMealPeriod}`);
  }

  if (data.activeTag) {
    params.push(`tag=${encodeURIComponent(data.activeTag)}`);
  }

  return params.length ? `?${params.join('&')}` : '';
}

Page<MenuPageData, {
  loadItems: () => Promise<void>;
  handleSearch: (event: WechatMiniprogram.Input) => void;
  handleFilterChange: (event: WechatMiniprogram.CustomEvent) => void;
  openFilter: () => void;
  resetFilters: () => void;
  goAdd: () => void;
}>({
  data: {
    q: '',
    activeTag: '',
    activeType: 'all',
    activeMealPeriod: 'all',
    items: [],
    typeOptions,
    mealPeriodOptions,
    loading: false,
  },

  onShow() {
    this.getTabBar()?.setData({ selected: 1 });
    const stored = wx.getStorageSync('todayMealFilter') as
      | Partial<Pick<MenuPageData, 'activeType' | 'activeMealPeriod' | 'activeTag' | 'q'>>
      | '';
    if (stored) {
      this.setData({
        q: stored.q || this.data.q,
        activeTag: stored.activeTag || '',
        activeType: stored.activeType || 'all',
        activeMealPeriod: stored.activeMealPeriod || 'all',
      });
      wx.removeStorageSync('todayMealFilter');
    }
    void this.loadItems();
  },

  async loadItems() {
    this.setData({ loading: true });
    try {
      const items = await api.get<MenuItemView[]>(`/menu-items${buildQuery(this.data)}`);
      this.setData({ items });
    } catch {
      wx.showToast({
        title: '菜单暂时翻不开',
        icon: 'none',
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  handleSearch(event) {
    this.setData({ q: event.detail.value });
    void this.loadItems();
  },

  handleFilterChange(event) {
    const { field, value } = event.detail as { field: string; value: string };

    if (field === 'type') {
      this.setData({ activeType: value as MenuFilterType });
    }

    if (field === 'mealPeriod') {
      this.setData({ activeMealPeriod: value as MenuFilterMealPeriod });
    }

    void this.loadItems();
  },

  openFilter() {
    wx.navigateTo({
      url: '/pages/filter/index',
    });
  },

  resetFilters() {
    this.setData({
      q: '',
      activeTag: '',
      activeType: 'all',
      activeMealPeriod: 'all',
    });
    void this.loadItems();
  },

  goAdd() {
    wx.navigateTo({
      url: '/pages/menu-edit/index?type=recipe',
    });
  },
});
