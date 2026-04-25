import { request } from "../../utils/api";

type MenuItem = {
  title: string;
  subtitle?: string;
  coverImageUrl?: string;
  tags: { name: string }[];
};

const fallbackImage =
  "https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=420&q=80";

Page({
  data: {
    dishes: [
      {
        name: "番茄牛腩煲",
        meta: "酸甜开胃 / 暖心硬菜",
        image: "https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=420&q=80"
      },
      {
        name: "虾仁滑蛋",
        meta: "15分钟 / 高蛋白",
        image: "https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?auto=format&fit=crop&w=420&q=80"
      },
      {
        name: "香煎豆腐",
        meta: "素食 / 家常",
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=420&q=80"
      },
      {
        name: "照烧鸡腿饭",
        meta: "米饭搭子 / 省心",
        image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=420&q=80"
      }
    ],
    miniDishes: [
      "https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=160&q=80",
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=160&q=80",
      "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=160&q=80"
    ]
  },

  onShow() {
    this.loadInspirations();
  },

  async loadInspirations() {
    try {
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
          image: item.coverImageUrl || fallbackImage
        })),
        miniDishes: items
          .slice(0, 3)
          .map((item) => item.coverImageUrl || fallbackImage)
      });
    } catch {
      // 首页保留默认灵感，避免登录或网络失败时出现空白。
    }
  },

  goFilter() {
    wx.navigateTo({ url: "/pages/filter/filter" });
  },

  goRecipes() {
    wx.navigateTo({ url: "/pages/recipes/recipes" });
  },

  goFavorites() {
    wx.navigateTo({ url: "/pages/favorites/favorites" });
  },

  goAddRecipe() {
    wx.navigateTo({ url: "/pages/add-recipe/add-recipe" });
  },

  goAddTakeout() {
    wx.navigateTo({ url: "/pages/add-takeout/add-takeout" });
  },

  goRandom() {
    wx.navigateTo({ url: "/pages/result/result" });
  },

  goProfile() {
    wx.navigateTo({ url: "/pages/profile/profile" });
  }
});
