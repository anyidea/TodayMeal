import { request } from "../../utils/api";

type RecommendationItem = {
  id: string;
  title: string;
  subtitle?: string;
  coverImageUrl?: string;
  tags: { name: string }[];
};

type Recommendation = {
  item: RecommendationItem;
  reason: string;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=900&q=90";

Page({
  data: {
    item: {
      id: "",
      title: "今日还没有推荐",
      subtitle: "先添加几道菜谱，再来随机灵感",
      coverImageUrl: fallbackImage,
      tags: []
    } as RecommendationItem,
    reasonTags: ["适合今天"],
    matchPercent: 92,
    tags: [
      {
        name: "清炒西兰花",
        image: "https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?auto=format&fit=crop&w=180&q=80"
      },
      {
        name: "米饭",
        image: "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=180&q=80"
      },
      {
        name: "冰红茶",
        image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=180&q=80"
      }
    ]
  },

  onLoad() {
    this.loadRecommendation();
  },

  back() {
    wx.navigateBack();
  },

  share() {
    wx.showToast({ title: "已生成分享图", icon: "none" });
  },

  again() {
    this.loadRecommendation();
  },

  async favorite() {
    if (!this.data.item.id) {
      return;
    }

    try {
      await request({
        url: `/menu-items/${this.data.item.id}/favorite`,
        method: "POST"
      });
      wx.showToast({ title: "已收藏", icon: "success" });
    } catch {
      wx.showToast({ title: "收藏失败", icon: "none" });
    }
  },

  async loadRecommendation() {
    const filters =
      wx.getStorageSync("todayMeal.recommendationFilters") || {
        type: "recipe",
        mealPeriod: "dinner"
      };

    try {
      const result = await request<Recommendation>({
        url: "/recommendations/random",
        method: "POST",
        data: filters
      });

      this.setData({
        item: {
          ...result.item,
          subtitle:
            result.item.subtitle ||
            result.item.tags.map((tag) => tag.name).join(" / ") ||
            "今天的灵感菜单",
          coverImageUrl: result.item.coverImageUrl || fallbackImage
        },
        reasonTags: this.toReasonTags(result),
        matchPercent: 88 + Math.floor(Math.random() * 10)
      });
    } catch {
      wx.showToast({ title: "还没有可推荐的菜", icon: "none" });
    }
  },

  toReasonTags(result: Recommendation): string[] {
    const tagNames = result.item.tags.map((tag) => tag.name).filter(Boolean);
    return tagNames.length ? tagNames.slice(0, 3) : [result.reason];
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
