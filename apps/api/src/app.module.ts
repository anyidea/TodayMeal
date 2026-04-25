import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { FilesModule } from './modules/files/files.module';
import { HealthController } from './modules/health/health.controller';
import { LinkPreviewModule } from './modules/link-preview/link-preview.module';
import { MealHistoryModule } from './modules/meal-history/meal-history.module';
import { MenuItemsModule } from './modules/menu-items/menu-items.module';
import { ProfileModule } from './modules/profile/profile.module';
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
    ProfileModule,
    RecommendationsModule,
    FilesModule,
    LinkPreviewModule,
  ],
  controllers: [HealthController],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
