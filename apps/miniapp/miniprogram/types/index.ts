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

export type TagView = {
  id: string;
  name: string;
  type?: string;
  color?: string | null;
};

export type MenuItemView = {
  id: string;
  type: MenuItemType;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  mealPeriods: MealPeriod[];
  tags: TagView[];
  isFavorite: boolean;
  ingredients?: string[];
  steps?: string[];
  cookTimeMinutes?: number | null;
  difficulty?: string | null;
  restaurantName?: string | null;
  platform?: string | null;
  externalUrl?: string | null;
  priceRange?: string | null;
  deliveryNotes?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type RecommendationView = {
  item: MenuItemView;
  reason: string;
};

export type MealHistoryView = {
  id: string;
  menuItemId: string;
  eatenAt: string;
  rating?: number | null;
  note?: string | null;
  menuItem: Pick<
    MenuItemView,
    'id' | 'title' | 'type' | 'subtitle' | 'coverImageUrl'
  >;
};

export type LinkPreviewResult =
  | {
      status: 'success';
      url: string;
      title?: string;
      imageUrl?: string;
      description?: string;
    }
  | {
      status: 'failed';
      url: string;
      reason: string;
    };

export type FileUploadResponse = {
  id: string;
  url: string;
  mimeType: string;
  size: number;
};
