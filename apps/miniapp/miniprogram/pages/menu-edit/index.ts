import { api, uploadImage } from '../../services/api';
import { getToken } from '../../services/auth';
import type {
  LinkPreviewResult,
  MealPeriod,
  MenuItemType,
  MenuItemView,
} from '../../types';

type EditPageData = {
  id: string;
  type: MenuItemType;
  title: string;
  subtitle: string;
  description: string;
  coverImageUrl: string;
  mealPeriods: MealPeriod[];
  breakfastActive: boolean;
  lunchActive: boolean;
  dinnerActive: boolean;
  lateNightActive: boolean;
  tagText: string;
  ingredientsText: string;
  stepsText: string;
  cookTimeMinutes: string;
  difficulty: string;
  restaurantName: string;
  platform: string;
  externalUrl: string;
  priceRange: string;
  deliveryNotes: string;
  sourceName: string;
  sourceUrl: string;
  notes: string;
  previewMessage: string;
  submitting: boolean;
};

const defaultMealPeriods: MealPeriod[] = ['dinner'];

function requireToken(): string {
  const token = getToken();
  if (!token) {
    wx.showToast({
      title: '先登录再保存菜单',
      icon: 'none',
    });
  }

  return token;
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitTags(value: string): string[] {
  return value
    .split(/[，,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function getMealPeriodState(mealPeriods: MealPeriod[]) {
  return {
    breakfastActive: mealPeriods.includes('breakfast'),
    lunchActive: mealPeriods.includes('lunch'),
    dinnerActive: mealPeriods.includes('dinner'),
    lateNightActive: mealPeriods.includes('lateNight'),
  };
}

Page<EditPageData, {
  loadItem: () => Promise<void>;
  handleInput: (event: WechatMiniprogram.Input) => void;
  setType: (event: WechatMiniprogram.TouchEvent) => void;
  toggleMealPeriod: (event: WechatMiniprogram.TouchEvent) => void;
  chooseImage: () => Promise<void>;
  previewLink: () => Promise<void>;
  submit: () => Promise<void>;
}>({
  data: {
    id: '',
    type: 'recipe',
    title: '',
    subtitle: '',
    description: '',
    coverImageUrl: '',
    mealPeriods: defaultMealPeriods,
    ...getMealPeriodState(defaultMealPeriods),
    tagText: '',
    ingredientsText: '',
    stepsText: '',
    cookTimeMinutes: '',
    difficulty: '',
    restaurantName: '',
    platform: '',
    externalUrl: '',
    priceRange: '',
    deliveryNotes: '',
    sourceName: '',
    sourceUrl: '',
    notes: '',
    previewMessage: '',
    submitting: false,
  },

  onLoad(query) {
    const type = (query.type as MenuItemType) || 'recipe';
    this.setData({
      id: String(query.id || ''),
      type,
    });

    if (query.id) {
      void this.loadItem();
    }
  },

  async loadItem() {
    try {
      const item = await api.get<MenuItemView>(`/menu-items/${this.data.id}`);
      this.setData({
        type: item.type,
        title: item.title,
        subtitle: item.subtitle || '',
        description: item.description || '',
        coverImageUrl: item.coverImageUrl || '',
        mealPeriods: item.mealPeriods.length ? item.mealPeriods : defaultMealPeriods,
        ...getMealPeriodState(
          item.mealPeriods.length ? item.mealPeriods : defaultMealPeriods,
        ),
        tagText: item.tags.map((tag) => tag.name).join('，'),
        ingredientsText: (item.ingredients || []).join('\n'),
        stepsText: (item.steps || []).join('\n'),
        cookTimeMinutes: item.cookTimeMinutes ? String(item.cookTimeMinutes) : '',
        difficulty: item.difficulty || '',
        restaurantName: item.restaurantName || '',
        platform: item.platform || '',
        externalUrl: item.externalUrl || '',
        priceRange: item.priceRange || '',
        deliveryNotes: item.deliveryNotes || '',
        sourceName: item.sourceName || '',
        sourceUrl: item.sourceUrl || '',
        notes: item.notes || '',
      });
    } catch {
      wx.showToast({
        title: '菜单内容没加载出来',
        icon: 'none',
      });
    }
  },

  handleInput(event) {
    const field = event.currentTarget.dataset.field as keyof EditPageData;
    this.setData({
      [field]: event.detail.value,
    } as Partial<EditPageData>);
  },

  setType(event) {
    const type = event.currentTarget.dataset.type as MenuItemType;
    this.setData({ type });
  },

  toggleMealPeriod(event) {
    const period = event.currentTarget.dataset.period as MealPeriod;
    const exists = this.data.mealPeriods.includes(period);
    const mealPeriods = exists
      ? this.data.mealPeriods.filter((item) => item !== period)
      : [...this.data.mealPeriods, period];

    this.setData({
      mealPeriods: mealPeriods.length ? mealPeriods : defaultMealPeriods,
      ...getMealPeriodState(mealPeriods.length ? mealPeriods : defaultMealPeriods),
    });
  },

  async chooseImage() {
    const token = requireToken();
    if (!token) {
      return;
    }

    try {
      const media = await new Promise<WechatMiniprogram.ChooseMediaSuccessCallbackResult>(
        (resolve, reject) => {
          wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: ['album', 'camera'],
            success: resolve,
            fail: reject,
          });
        },
      );
      const filePath = media.tempFiles[0]?.tempFilePath;
      if (!filePath) {
        return;
      }

      const uploaded = await uploadImage(filePath, token);
      this.setData({ coverImageUrl: uploaded.url });
      wx.showToast({
        title: '图片已放进菜单',
        icon: 'success',
      });
    } catch {
      wx.showToast({
        title: '图片没有上传成功',
        icon: 'none',
      });
    }
  },

  async previewLink() {
    const url = this.data.externalUrl.trim();
    if (!url) {
      wx.showToast({
        title: '先贴一个链接',
        icon: 'none',
      });
      return;
    }

    try {
      const preview = await api.post<LinkPreviewResult>('/link-preview', { url });
      if (preview.status === 'success') {
        this.setData({
          title: this.data.title || preview.title || '',
          subtitle: this.data.subtitle || preview.description || '',
          coverImageUrl: this.data.coverImageUrl || preview.imageUrl || '',
          previewMessage: '识别到一点线索，已经帮你填上啦。',
        });
        return;
      }

      this.setData({ previewMessage: '没自动识别出来，可以手动补一下。' });
    } catch {
      this.setData({ previewMessage: '没自动识别出来，可以手动补一下。' });
    }
  },

  async submit() {
    const token = requireToken();
    if (!token) {
      return;
    }

    if (!this.data.title.trim()) {
      wx.showToast({
        title: '先给它取个名字',
        icon: 'none',
      });
      return;
    }

    const payload = {
      type: this.data.type,
      title: this.data.title.trim(),
      subtitle: optionalText(this.data.subtitle),
      description: optionalText(this.data.description),
      coverImageUrl: optionalText(this.data.coverImageUrl),
      mealPeriods: this.data.mealPeriods,
      tagNames: splitTags(this.data.tagText),
      ingredients: splitLines(this.data.ingredientsText),
      steps: splitLines(this.data.stepsText),
      cookTimeMinutes: this.data.cookTimeMinutes
        ? Number(this.data.cookTimeMinutes)
        : undefined,
      difficulty: optionalText(this.data.difficulty),
      restaurantName: optionalText(this.data.restaurantName),
      platform: optionalText(this.data.platform),
      externalUrl: optionalText(this.data.externalUrl),
      priceRange: optionalText(this.data.priceRange),
      deliveryNotes: optionalText(this.data.deliveryNotes),
      sourceName: optionalText(this.data.sourceName),
      sourceUrl: optionalText(this.data.sourceUrl),
      notes: optionalText(this.data.notes),
    };

    this.setData({ submitting: true });
    try {
      const item = this.data.id
        ? await api.patch<MenuItemView>(`/menu-items/${this.data.id}`, payload, token)
        : await api.post<MenuItemView>('/menu-items', payload, token);

      wx.showToast({
        title: '菜单已保存',
        icon: 'success',
      });
      wx.redirectTo({
        url: `/pages/menu-detail/index?id=${item.id}`,
      });
    } catch {
      wx.showToast({
        title: '保存失败，检查一下必填项',
        icon: 'none',
      });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
