export enum MenuItemType {
  Recipe = 'recipe',
  Takeout = 'takeout',
  Inspiration = 'inspiration',
}

export enum MealPeriod {
  Breakfast = 'breakfast',
  Lunch = 'lunch',
  Dinner = 'dinner',
  LateNight = 'lateNight',
}

export enum UserRole {
  Viewer = 'viewer',
  Editor = 'editor',
  Owner = 'owner',
}

export type ApiResponse<T> = {
  data: T;
};
