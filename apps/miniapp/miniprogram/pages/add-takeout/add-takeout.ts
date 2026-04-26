import { isAuthRequiredError, request, requireLogin } from "../../utils/api";

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

  async parseLink() {
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

    try {
      const data = await request<TakeoutPreviewResponse>({
        url: "/link-preview/takeout",
        method: "POST",
        data: { url }
      });

      if (data.status !== "success") {
        this.setData({
          parseStatus: "failed",
          parseMessage: data.reason || "无法自动识别，可手动补全"
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
    } catch (error) {
      if (!isAuthRequiredError(error)) {
        this.setData({
          parseStatus: "failed",
          parseMessage: "解析服务暂时不可用，可先手动填写并保存链接。"
        });
      }
    } finally {
      this.setData({ isParsing: false });
    }
  },

  async save() {
    if (!requireLogin()) {
      return;
    }

    const form = this.data.form as TakeoutForm;
    if (!form.restaurantName.trim() || !form.title.trim()) {
      wx.showToast({ title: "请填写店铺和菜单", icon: "none" });
      return;
    }

    try {
      await request({
        url: "/menu-items",
        method: "POST",
        data: {
          type: "takeout",
          title: form.title.trim(),
          subtitle: form.restaurantName.trim(),
          restaurantName: form.restaurantName.trim(),
          platform: form.platform || undefined,
          externalUrl: form.externalUrl.trim() || undefined,
          priceRange: form.priceRange.trim() || undefined,
          coverImageUrl: form.coverImageUrl || undefined,
          notes: form.notes.trim() || undefined,
          mealPeriods: ["lunch", "dinner"],
          tagNames: [form.platformLabel || "外卖"].filter(Boolean),
          isFavorite: true
        }
      });

      wx.showToast({ title: "已保存外卖", icon: "success" });
      setTimeout(() => wx.navigateBack(), 500);
    } catch (error) {
      if (!isAuthRequiredError(error)) {
        wx.showToast({ title: "保存失败，请稍后重试", icon: "none" });
      }
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
