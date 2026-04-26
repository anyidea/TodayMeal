import { isAuthRequiredError, request, requireLogin } from "../../utils/api";

type RecommendationItem = {
  id: string;
  type?: "recipe" | "takeout";
  title: string;
  subtitle?: string;
  restaurantName?: string;
  coverImageUrl?: string;
  tags: { name: string }[];
};

type Recommendation = {
  item: RecommendationItem;
  reason: string;
};

Page({
  data: {
    item: {
      id: "",
      title: "今日还没有推荐",
      subtitle: "先添加几道菜谱，再来随机灵感",
      coverImageUrl: "",
      tags: []
    } as RecommendationItem,
    reasonTags: ["适合今天"],
    matchPercent: 92,
    tags: [
      {
        name: "清炒西兰花",
        image: ""
      },
      {
        name: "米饭",
        image: ""
      },
      {
        name: "冰红茶",
        image: ""
      }
    ]
  },

  onLoad(options: { itemId?: string }) {
    if (options.itemId) {
      this.loadSharedItem(options.itemId);
      return;
    }

    this.loadRecommendation();
  },

  back() {
    wx.navigateBack();
  },

  again() {
    this.loadRecommendation();
  },

  async favorite() {
    if (!requireLogin()) {
      return;
    }

    if (!this.data.item.id) {
      return;
    }

    try {
      await request({
        url: `/menu-items/${this.data.item.id}/favorite`,
        method: "POST"
      });
      wx.showToast({ title: "已收藏", icon: "success" });
    } catch (error) {
      if (!isAuthRequiredError(error)) {
        wx.showToast({ title: "收藏失败", icon: "none" });
      }
    }
  },

  async loadRecommendation() {
    if (!requireLogin()) {
      return;
    }

    const filters =
      wx.getStorageSync("todayMeal.recommendationFilters") || {
        type: "recipe",
        mealPeriod: "dinner"
      };

    try {
      const result = await request<Recommendation | null>({
        url: "/recommendations/random",
        method: "POST",
        data: filters
      });

      if (!result) {
        wx.showToast({ title: "还没有可推荐的菜", icon: "none" });
        return;
      }

      this.setData({
        item: this.toDisplayItem(result.item),
        reasonTags: this.toReasonTags(result),
        matchPercent: 88 + Math.floor(Math.random() * 10)
      });
    } catch (error) {
      if (!isAuthRequiredError(error)) {
        wx.showToast({ title: "还没有可推荐的菜", icon: "none" });
      }
    }
  },

  async loadSharedItem(itemId: string) {
    if (!requireLogin()) {
      return;
    }

    try {
      const item = await request<RecommendationItem>({
        url: `/menu-items/${itemId}`
      });
      this.setData({
        item: this.toDisplayItem(item),
        reasonTags: this.toItemReasonTags(item),
        matchPercent: 92
      });
    } catch (error) {
      if (!isAuthRequiredError(error)) {
        wx.showToast({ title: "这份推荐暂时打不开", icon: "none" });
        this.loadRecommendation();
      }
    }
  },

  toReasonTags(result: Recommendation): string[] {
    const tagNames = result.item.tags.map((tag) => tag.name).filter(Boolean);
    return tagNames.length ? tagNames.slice(0, 3) : [result.reason];
  },

  toItemReasonTags(item: RecommendationItem): string[] {
    const tagNames = item.tags.map((tag) => tag.name).filter(Boolean);
    return tagNames.length ? tagNames.slice(0, 3) : ["适合今天"];
  },

  toDisplayItem(item: RecommendationItem): RecommendationItem {
    return {
      ...item,
      subtitle:
        item.subtitle ||
        item.restaurantName ||
        item.tags.map((tag) => tag.name).join(" / ") ||
        "今天的灵感菜单",
      coverImageUrl: item.coverImageUrl || ""
    };
  },

  onShareAppMessage() {
    const item = this.data.item;
    const isEmpty = !item.id;

    return {
      title: isEmpty ? "今天吃什么？来 Today Meal 随机一下" : `今天吃「${item.title}」怎么样？`,
      path: isEmpty ? "/pages/home/home" : `/pages/result/result?itemId=${encodeURIComponent(item.id)}`,
      ...(item.coverImageUrl ? { imageUrl: item.coverImageUrl } : {})
    };
  },

  goHome() {
    wx.navigateTo({ url: "/pages/home/home" });
  },

  goRecipes() {
    wx.navigateTo({ url: "/pages/recipes/recipes" });
  },

  goFavorites() {
    wx.navigateTo({ url: "/pages/favorites/favorites" });
  },

  goProfile() {
    wx.navigateTo({ url: "/pages/profile/profile" });
  }
});
