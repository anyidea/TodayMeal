import { api } from '../../services/api';
import {
  bindInvite,
  getCachedUser,
  getToken,
  loginWithWechat,
} from '../../services/auth';
import type { LoginUser, MealHistoryView, MenuItemView, UserRole } from '../../types';

const roleLabels: Record<UserRole, string> = {
  owner: '主人',
  editor: '可一起编辑',
  viewer: '只读查看',
};

type ProfilePageData = {
  loggedIn: boolean;
  role: UserRole | '';
  roleLabel: string;
  inviteCode: string;
  histories: MealHistoryView[];
  recentCount: number;
  favoriteCount: number;
};

Page<ProfilePageData, {
  refresh: () => Promise<void>;
  login: () => Promise<void>;
  handleInviteInput: (event: WechatMiniprogram.Input) => void;
  bindInviteCode: () => Promise<void>;
}>({
  data: {
    loggedIn: false,
    role: '',
    roleLabel: '未登录',
    inviteCode: '',
    histories: [],
    recentCount: 0,
    favoriteCount: 0,
  },

  onShow() {
    void this.refresh();
  },

  async refresh() {
    const token = getToken();
    const user = getCachedUser();
    this.setData({
      loggedIn: Boolean(token),
      role: user?.role || '',
      roleLabel: user ? roleLabels[user.role] : '未登录',
    });

    try {
      const [me, histories, favorites] = await Promise.all([
        token ? api.get<LoginUser>('/auth/me', token) : Promise.resolve(user),
        api.get<MealHistoryView[]>('/meal-history/recent'),
        api.get<MenuItemView[]>('/menu-items?favorite=true'),
      ]);

      this.setData({
        role: me?.role || '',
        roleLabel: me ? roleLabels[me.role] : this.data.roleLabel,
        histories: histories.slice(0, 8),
        recentCount: histories.length,
        favoriteCount: favorites.length,
      });
    } catch {
      wx.showToast({
        title: '我的饭桌记录暂时没加载出来',
        icon: 'none',
      });
    }
  },

  async login() {
    try {
      const response = await loginWithWechat();
      this.setData({
        loggedIn: true,
        role: response.user.role,
        roleLabel: roleLabels[response.user.role],
      });
      wx.showToast({
        title: '登录成功',
        icon: 'success',
      });
    } catch {
      wx.showToast({
        title: '登录失败，稍后再试',
        icon: 'none',
      });
    }
  },

  handleInviteInput(event) {
    this.setData({ inviteCode: event.detail.value });
  },

  async bindInviteCode() {
    const inviteCode = this.data.inviteCode.trim();
    if (!inviteCode) {
      wx.showToast({
        title: '先输入邀请码',
        icon: 'none',
      });
      return;
    }

    if (!getToken()) {
      wx.showToast({
        title: '先登录再绑定邀请码',
        icon: 'none',
      });
      return;
    }

    try {
      const response = await bindInvite(inviteCode);
      this.setData({
        role: response.role,
        roleLabel: roleLabels[response.role],
        inviteCode: '',
      });
      wx.showToast({
        title: '邀请码已绑定',
        icon: 'success',
      });
    } catch {
      wx.showToast({
        title: '邀请码没有绑定成功',
        icon: 'none',
      });
    }
  },
});
