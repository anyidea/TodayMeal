import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { HealthController } from './modules/health/health.controller';
import { MealHistoryModule } from './modules/meal-history/meal-history.module';
import { MenuItemsModule } from './modules/menu-items/menu-items.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { TagsModule } from './modules/tags/tags.module';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    MenuItemsModule,
    TagsModule,
    MealHistoryModule,
    RecommendationsModule,
  ],
  controllers: [HealthController],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
