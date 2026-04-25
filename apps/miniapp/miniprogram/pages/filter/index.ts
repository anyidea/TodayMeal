import type { MealPeriod, MenuItemType } from '../../types';

type Chip = {
  label: string;
  value: string;
};

type FilterData = {
  q: string;
  activeType: MenuItemType | 'all';
  activeMealPeriod: MealPeriod | 'all';
  activeTag: string;
  typeOptions: Chip[];
  sceneOptions: Chip[];
  flavorOptions: Chip[];
  cookingOptions: Chip[];
  ingredientOptions: Chip[];
};

const typeOptions: Chip[] = [
  { label: '全部', value: 'all' },
  { label: '自家菜谱', value: 'recipe' },
  { label: '外卖店菜', value: 'takeout' },
  { label: '灵感清单', value: 'inspiration' },
];

const sceneOptions: Chip[] = [
  { label: '不限', value: 'all' },
  { label: '早餐', value: 'breakfast' },
  { label: '午餐', value: 'lunch' },
  { label: '晚餐', value: 'dinner' },
  { label: '夜宵', value: 'lateNight' },
];

const flavorOptions: Chip[] = [
  { label: '清淡', value: '清淡' },
  { label: '热乎', value: '热乎' },
  { label: '微辣', value: '微辣' },
  { label: '下饭', value: '下饭' },
];

const cookingOptions: Chip[] = [
  { label: '快手', value: '快手' },
  { label: '炖煮', value: '炖煮' },
  { label: '少油', value: '少油' },
  { label: '适合周末', value: '周末' },
];

const ingredientOptions: Chip[] = [
  { label: '牛肉', value: '牛肉' },
  { label: '鸡蛋', value: '鸡蛋' },
  { label: '番茄', value: '番茄' },
  { label: '米饭', value: '米饭' },
];

Page<FilterData, {
  handleInput: (event: WechatMiniprogram.Input) => void;
  chooseType: (event: WechatMiniprogram.TouchEvent) => void;
  chooseMealPeriod: (event: WechatMiniprogram.TouchEvent) => void;
  chooseTag: (event: WechatMiniprogram.TouchEvent) => void;
  reset: () => void;
  apply: () => void;
}>({
  data: {
    q: '',
    activeType: 'all',
    activeMealPeriod: 'all',
    activeTag: '',
    typeOptions,
    sceneOptions,
    flavorOptions,
    cookingOptions,
    ingredientOptions,
  },

  onLoad() {
    const stored = wx.getStorageSync('todayMealFilter') as Partial<FilterData> | '';
    if (stored) {
      this.setData({
        q: stored.q || '',
        activeType: stored.activeType || 'all',
        activeMealPeriod: stored.activeMealPeriod || 'all',
        activeTag: stored.activeTag || '',
      });
    }
  },

  handleInput(event) {
    this.setData({ q: event.detail.value });
  },

  chooseType(event) {
    this.setData({
      activeType: event.currentTarget.dataset.value as FilterData['activeType'],
    });
  },

  chooseMealPeriod(event) {
    this.setData({
      activeMealPeriod: event.currentTarget.dataset.value as FilterData['activeMealPeriod'],
    });
  },

  chooseTag(event) {
    const value = event.currentTarget.dataset.value as string;
    this.setData({
      activeTag: this.data.activeTag === value ? '' : value,
    });
  },

  reset() {
    this.setData({
      q: '',
      activeType: 'all',
      activeMealPeriod: 'all',
      activeTag: '',
    });
  },

  apply() {
    wx.setStorageSync('todayMealFilter', {
      q: this.data.q.trim(),
      activeType: this.data.activeType,
      activeMealPeriod: this.data.activeMealPeriod,
      activeTag: this.data.activeTag,
    });
    wx.switchTab({
      url: '/pages/menu/index',
    });
  },
});
