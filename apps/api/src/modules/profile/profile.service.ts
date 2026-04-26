import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groupsService: GroupsService,
  ) {}

  async me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        openid: true,
        nickname: true,
        avatarUrl: true,
        role: true,
      },
    });
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.nickname !== undefined ? { nickname: dto.nickname.trim() || null } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl || null } : {}),
      },
      select: {
        id: true,
        openid: true,
        nickname: true,
        avatarUrl: true,
        role: true,
      },
    });
  }

  async summary(userId: string) {
    const groupId = await this.groupsService.currentGroupId(userId);
    const [recipeCount, takeoutCount, favoriteCount, recentMealCount] =
      await this.prisma.$transaction([
        this.prisma.menuItem.count({
          where: {
            groupId,
            status: 'active',
            type: 'recipe',
          },
        }),
        this.prisma.menuItem.count({
          where: {
            groupId,
            status: 'active',
            type: 'takeout',
          },
        }),
        this.prisma.menuItem.count({
          where: {
            groupId,
            status: 'active',
            isFavorite: true,
          },
        }),
        this.prisma.mealHistory.count({
          where: {
            groupId,
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
