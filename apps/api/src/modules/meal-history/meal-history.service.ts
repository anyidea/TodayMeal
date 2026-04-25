import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMealHistoryDto } from './dto/create-meal-history.dto';

@Injectable()
export class MealHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMealHistoryDto, userId: string) {
    const menuItem = await this.prisma.menuItem.findFirst({
      where: {
        id: dto.menuItemId,
        status: 'active',
      },
    });

    if (!menuItem) {
      throw new NotFoundException();
    }

    return this.prisma.mealHistory.create({
      data: {
        menuItemId: dto.menuItemId,
        eatenAt: dto.eatenAt ? new Date(dto.eatenAt) : new Date(),
        rating: dto.rating,
        note: dto.note,
        createdById: userId,
      },
      include: {
        menuItem: {
          select: {
            id: true,
            title: true,
            type: true,
            subtitle: true,
            coverImageUrl: true,
          },
        },
      },
    });
  }

  recent() {
    return this.prisma.mealHistory.findMany({
      include: {
        menuItem: {
          select: {
            id: true,
            title: true,
            type: true,
            subtitle: true,
            coverImageUrl: true,
          },
        },
      },
      orderBy: { eatenAt: 'desc' },
      take: 20,
    });
  }
}
