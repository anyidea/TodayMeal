const apiBaseUrl = "http://localhost:3000";
const storageKey = "todayMeal.takeoutFavorites";
const defaultImage =
  "https://images.unsplash.com/photo-1615361200141-f45961202b5c?auto=format&fit=crop&w=260&q=80";

type TakeoutForm = {
  externalUrl: string;
  restaurantName: string;
  title: string;
  platform: string;
  platformLabel: string;
  priceRange: string;
  coverImageUrl: string;
  notes: string;
};

type TakeoutPreviewResponse = {
  status: "success" | "failed";
  externalUrl: string;
  platform?: string;
  platformLabel?: string;
  restaurantName?: string;
  title?: string;
  priceRange?: string;
  coverImageUrl?: string;
  description?: string;
  reason?: string;
};

type StoredTakeout = {
  name: string;
  desc: string;
  price: string;
  likes: number;
  tag: string;
  image: string;
  platform?: string;
  platformLabel?: string;
  externalUrl?: string;
  notes?: string;
};

Page({
  data: {
    form: {
      externalUrl: "",
      restaurantName: "",
      title: "",
      platform: "",
      platformLabel: "",
      priceRange: "",
      coverImageUrl: "",
      notes: ""
    } as TakeoutForm,
    isParsing: false,
    parseStatus: "",
    parseMessage: ""
  },

  back() {
    wx.navigateBack();
  },

  onInput(event: WechatMiniprogram.Input) {
    const field = event.currentTarget.dataset.field as keyof TakeoutForm;
    this.setData({
      [`form.${field}`]: event.detail.value
    });
  },

  parseLink() {
    const url = this.data.form.externalUrl.trim();
    if (!url) {
      wx.showToast({ title: "先粘贴外卖链接", icon: "none" });
      return;
    }

    this.setData({
      isParsing: true,
      parseStatus: "",
      parseMessage: ""
    });

    wx.request({
      url: `${apiBaseUrl}/link-preview/takeout`,
      method: "POST",
      data: { url },
      success: (res) => {
        const data = (res.data as { data?: TakeoutPreviewResponse }).data;

        if (!data || data.status !== "success") {
          this.setData({
            parseStatus: "failed",
            parseMessage: data?.reason || "无法自动识别，可手动补全"
          });
          return;
        }

        this.setData({
          form: {
            ...this.data.form,
            externalUrl: data.externalUrl || url,
            restaurantName: data.restaurantName || this.data.form.restaurantName,
            title: data.title || this.data.form.title,
            platform: data.platform || this.data.form.platform,
            platformLabel: data.platformLabel || this.data.form.platformLabel,
            priceRange: data.priceRange || this.data.form.priceRange,
            coverImageUrl: data.coverImageUrl || this.data.form.coverImageUrl
          },
          parseStatus: "success",
          parseMessage: "已自动填入可识别的信息，保存前可以继续微调。"
        });
      },
      fail: () => {
        this.setData({
          parseStatus: "failed",
          parseMessage: "解析服务暂时不可用，可先手动填写并保存链接。"
        });
      },
      complete: () => {
        this.setData({ isParsing: false });
      }
    });
  },

  save() {
    const form = this.data.form as TakeoutForm;
    if (!form.restaurantName.trim() || !form.title.trim()) {
      wx.showToast({ title: "请填写店铺和菜单", icon: "none" });
      return;
    }

    const stored = this.readStoredTakeouts();
    const item: StoredTakeout = {
      name: form.restaurantName.trim(),
      desc: form.title.trim(),
      price: form.priceRange.trim() || "价格待补",
      likes: 0,
      tag: this.tagFromPlatform(form.platformLabel || form.platform),
      image: form.coverImageUrl || defaultImage,
      platform: form.platform,
      platformLabel: form.platformLabel,
      externalUrl: form.externalUrl.trim(),
      notes: form.notes.trim()
    };

    wx.setStorageSync(storageKey, [item, ...stored]);
    wx.showToast({ title: "已保存外卖", icon: "success" });
    setTimeout(() => wx.navigateBack(), 500);
  },

  readStoredTakeouts(): StoredTakeout[] {
    try {
      return wx.getStorageSync(storageKey) || [];
    } catch {
      return [];
    }
  },

  tagFromPlatform(platform: string): string {
    if (platform.includes("美团")) {
      return "美";
    }
    if (platform.includes("淘宝")) {
      return "淘";
    }

    return "外";
  }
});
