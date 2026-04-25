import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userId: string) {
    const [recipeCount, takeoutCount, favoriteCount, recentMealCount] =
      await this.prisma.$transaction([
        this.prisma.menuItem.count({
          where: {
            createdById: userId,
            status: 'active',
            type: 'recipe',
          },
        }),
        this.prisma.menuItem.count({
          where: {
            createdById: userId,
            status: 'active',
            type: 'takeout',
          },
        }),
        this.prisma.menuItem.count({
          where: {
            createdById: userId,
            status: 'active',
            isFavorite: true,
          },
        }),
        this.prisma.mealHistory.count({
          where: {
            createdById: userId,
            eatenAt: {
              gte: this.oneWeekAgo(),
            },
          },
        }),
      ]);

    return {
      recipeCount,
      takeoutCount,
      favoriteCount,
      recentMealCount,
    };
  }

  private oneWeekAgo(): Date {
    return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  }
}
