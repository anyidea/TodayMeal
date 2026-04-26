import { isAuthRequiredError, request, requireLogin } from "../../utils/api";
import { uploadImage } from "../../utils/upload";

type RecipeForm = {
  title: string;
  category: string;
  flavor: string;
  cookingMethod: string;
  cookTimeMinutes: string;
  coverImageUrl: string;
  ingredientsText: string;
  stepsText: string;
  notes: string;
};

Page({
  data: {
    form: {
      title: "",
      category: "",
      flavor: "",
      cookingMethod: "",
      cookTimeMinutes: "",
      coverImageUrl: "",
      ingredientsText: "",
      stepsText: "",
      notes: ""
    } as RecipeForm,
    isSaving: false
  },

  back() {
    wx.navigateBack();
  },

  onInput(event: WechatMiniprogram.Input) {
    const field = event.currentTarget.dataset.field as keyof RecipeForm;
    this.setData({
      [`form.${field}`]: event.detail.value
    });
  },

  chooseCover() {
    if (!requireLogin()) {
      return;
    }

    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      success: async (res) => {
        const filePath = res.tempFiles[0]?.tempFilePath;
        if (filePath) {
          this.setData({ "form.coverImageUrl": filePath });
          try {
            const uploaded = await uploadImage(filePath);
            this.setData({ "form.coverImageUrl": uploaded.url });
          } catch (error) {
            if (!isAuthRequiredError(error)) {
              wx.showToast({ title: "封面上传失败，可稍后重试", icon: "none" });
            }
          }
        }
      }
    });
  },

  async save() {
    if (!requireLogin()) {
      return;
    }

    const form = this.data.form as RecipeForm;
    if (!form.title.trim()) {
      wx.showToast({ title: "请输入菜谱名称", icon: "none" });
      return;
    }

    this.setData({ isSaving: true });
    try {
      const tagNames = [
        form.category,
        form.flavor,
        form.cookingMethod
      ].map((value) => value.trim()).filter(Boolean);

      await request({
        url: "/menu-items",
        method: "POST",
        data: {
          type: "recipe",
          title: form.title.trim(),
          subtitle: tagNames.join("　"),
          mealPeriods: ["lunch", "dinner"],
          tagNames,
          ingredients: this.toLines(form.ingredientsText),
          steps: this.toLines(form.stepsText),
          cookTimeMinutes: Number(form.cookTimeMinutes) || undefined,
          coverImageUrl: form.coverImageUrl.startsWith("http")
            ? form.coverImageUrl
            : undefined,
          notes: form.notes.trim() || undefined
        }
      });

      wx.showToast({ title: "已保存菜谱", icon: "success" });
      setTimeout(() => wx.navigateBack(), 500);
    } catch (error) {
      if (!isAuthRequiredError(error)) {
        wx.showToast({ title: "保存失败，请稍后重试", icon: "none" });
      }
    } finally {
      this.setData({ isSaving: false });
    }
  },

  toLines(value: string): string[] {
    return value
      .split(/\n|，|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
});
