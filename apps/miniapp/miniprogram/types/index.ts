export type UserRole = 'owner' | 'editor' | 'viewer';

export type LoginUser = {
  id: string;
  openid: string;
  role: UserRole;
};

export type LoginResponse = {
  token: string;
  user: LoginUser;
};

export type MenuItemType = 'recipe' | 'takeout' | 'inspiration';

export type MealPeriod = 'breakfast' | 'lunch' | 'dinner' | 'lateNight';

export type MenuItemView = {
  id: string;
  type: MenuItemType;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  mealPeriods: MealPeriod[];
  tags: Array<{ id: string; name: string }>;
  isFavorite: boolean;
};
