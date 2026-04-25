import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { ListMenuItemsDto } from './dto/list-menu-items.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

const menuItemInclude = {
  tags: {
    include: {
      tag: true,
    },
  },
  mealHistories: {
    orderBy: {
      eatenAt: 'desc',
    },
    take: 5,
  },
} satisfies Prisma.MenuItemInclude;

type MenuItemWithRelations = Prisma.MenuItemGetPayload<{
  include: typeof menuItemInclude;
}>;

@Injectable()
export class MenuItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMenuItemDto, userId: string) {
    const { tagNames, ...data } = dto;
    const menuItem = await this.prisma.menuItem.create({
      data: {
        ...data,
        ingredients: dto.ingredients ?? [],
        steps: dto.steps ?? [],
        createdById: userId,
        updatedById: userId,
        tags: this.buildTagCreates(tagNames),
      },
      include: menuItemInclude,
    });

    return this.toResponse(menuItem);
  }

  async list(query: ListMenuItemsDto, userId: string) {
    const where: Prisma.MenuItemWhereInput = {
      status: 'active',
      createdById: userId,
    };

    if (query.type) {
      where.type = query.type;
    }

    if (query.mealPeriod) {
      where.mealPeriods = { has: query.mealPeriod };
    }

    if (query.tag) {
      where.tags = {
        some: {
          tag: {
            name: query.tag,
          },
        },
      };
    }

    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { subtitle: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { restaurantName: { contains: query.q, mode: 'insensitive' } },
        { notes: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    if (query.favorite !== undefined) {
      where.isFavorite = query.favorite;
    }

    if (query.recentlyEaten !== undefined) {
      where.mealHistories = query.recentlyEaten ? { some: {} } : { none: {} };
    }

    const menuItems = await this.prisma.menuItem.findMany({
      where,
      include: menuItemInclude,
      orderBy: { updatedAt: 'desc' },
      take: query.limit,
    });

    return menuItems.map((menuItem) => this.toResponse(menuItem));
  }

  async getById(id: string, userId: string) {
    const menuItem = await this.prisma.menuItem.findFirst({
      where: {
        id,
        status: 'active',
        createdById: userId,
      },
      include: menuItemInclude,
    });

    if (!menuItem) {
      throw new NotFoundException();
    }

    return this.toResponse(menuItem);
  }

  async update(id: string, dto: UpdateMenuItemDto, userId: string) {
    await this.ensureActive(id, userId);

    const { tagNames, ...data } = dto;
    const menuItem = await this.prisma.menuItem.update({
      where: { id },
      data: {
        ...data,
        updatedById: userId,
        tags:
          tagNames === undefined
            ? undefined
            : {
                deleteMany: {},
                ...this.buildTagCreates(tagNames),
              },
      },
      include: menuItemInclude,
    });

    return this.toResponse(menuItem);
  }

  async archive(id: string, userId: string) {
    await this.ensureActive(id, userId);

    const menuItem = await this.prisma.menuItem.update({
      where: { id },
      data: {
        status: 'archived',
      },
      include: menuItemInclude,
    });

    return this.toResponse(menuItem);
  }

  async toggleFavorite(id: string, userId: string) {
    const current = await this.ensureActive(id, userId);
    const menuItem = await this.prisma.menuItem.update({
      where: { id },
      data: {
        isFavorite: !current.isFavorite,
      },
      include: menuItemInclude,
    });

    return this.toResponse(menuItem);
  }

  private buildTagCreates(tagNames?: string[]): Prisma.MenuItemTagCreateNestedManyWithoutMenuItemInput | undefined {
    if (!tagNames?.length) {
      return undefined;
    }

    return {
      create: tagNames.map((name) => ({
        tag: {
          connectOrCreate: {
            where: { name },
            create: {
              name,
              type: 'custom',
            },
          },
        },
      })),
    };
  }

  private async ensureActive(id: string, userId: string) {
    const menuItem = await this.prisma.menuItem.findFirst({
      where: {
        id,
        status: 'active',
        createdById: userId,
      },
    });

    if (!menuItem) {
      throw new NotFoundException();
    }

    return menuItem;
  }

  private toResponse(menuItem: MenuItemWithRelations) {
    const { tags, ...data } = menuItem;

    return {
      ...data,
      tags: tags.map(({ tag }) => tag),
    };
  }
}
