import { getToken, request, requireLogin } from "../../utils/api";

type MenuItem = {
  title: string;
  subtitle?: string;
  coverImageUrl?: string;
  tags: { name: string }[];
};

Page({
  data: {
    dishes: [
      {
        name: "番茄牛腩煲",
        meta: "酸甜开胃 / 暖心硬菜",
        image: ""
      },
      {
        name: "虾仁滑蛋",
        meta: "15分钟 / 高蛋白",
        image: ""
      },
      {
        name: "香煎豆腐",
        meta: "素食 / 家常",
        image: ""
      },
      {
        name: "照烧鸡腿饭",
        meta: "米饭搭子 / 省心",
        image: ""
      }
    ],
    miniDishes: ["", "", ""]
  },

  onShow() {
    this.loadInspirations();
  },

  async loadInspirations() {
    try {
      if (!getToken()) {
        return;
      }

      const items = await request<MenuItem[]>({
        url: "/menu-items?type=recipe&limit=10"
      });

      if (!items.length) {
        return;
      }

      this.setData({
        dishes: items.map((item) => ({
          name: item.title,
          meta:
            item.subtitle ||
            item.tags.map((tag) => tag.name).filter(Boolean).join(" / ") ||
            "今日灵感",
          image: item.coverImageUrl || ""
        })),
        miniDishes: items
          .slice(0, 3)
          .map((item) => item.coverImageUrl || "")
      });
    } catch {
      // 首页保留默认灵感，避免登录或网络失败时出现空白。
    }
  },

  goFilter() {
    wx.navigateTo({ url: "/pages/filter/filter" });
  },

  goRecipes() {
    if (!requireLogin()) {
      return;
    }

    wx.navigateTo({ url: "/pages/recipes/recipes" });
  },

  goFavorites() {
    if (!requireLogin()) {
      return;
    }

    wx.navigateTo({ url: "/pages/favorites/favorites" });
  },

  goAddRecipe() {
    if (!requireLogin()) {
      return;
    }

    wx.navigateTo({ url: "/pages/add-recipe/add-recipe" });
  },

  goAddTakeout() {
    if (!requireLogin()) {
      return;
    }

    wx.navigateTo({ url: "/pages/add-takeout/add-takeout" });
  },

  goRandom() {
    if (!requireLogin()) {
      return;
    }

    wx.navigateTo({ url: "/pages/result/result" });
  },

  goProfile() {
    wx.navigateTo({ url: "/pages/profile/profile" });
  }
});
