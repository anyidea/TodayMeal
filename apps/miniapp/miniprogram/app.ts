import { login } from "./utils/auth";

App({
  globalData: {},

  onLaunch() {
    login().catch(() => {
      wx.showToast({ title: "登录失败，请稍后重试", icon: "none" });
    });
  }
});
