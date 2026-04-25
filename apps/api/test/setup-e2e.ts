process.env.DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  'postgresql://today_meal:today_meal_dev@localhost:5433/today_meal?schema=public';

process.env.JWT_SECRET ??= 'test-secret';
