import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const fallbackDatabaseUrl =
  'postgresql://today_meal:today_meal_dev@localhost:5433/today_meal?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? fallbackDatabaseUrl,
  },
});
