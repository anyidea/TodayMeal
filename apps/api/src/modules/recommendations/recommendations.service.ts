import { Injectable, NotFoundException } from '@nestjs/common';
import { MealPeriod, MenuItemType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type Candidate = {
  id: string;
  title: string;
  isFavorite: boolean;
  mealPeriods: MealPeriod[];
  mealHistories: { eatenAt: Date; rating: number | null }[];
};

type RecommendationFilters = {
  mealPeriod?: MealPeriod;
  tagNames?: string[];
  type?: MenuItemType;
};

const recommendationSelect = {
  id: true,
  title: true,
  subtitle: true,
  type: true,
  coverImageUrl: true,
  mealPeriods: true,
  isFavorite: true,
  tags: {
    select: {
      tag: {
        select: {
          id: true,
          name: true,
          type: true,
          color: true,
        },
      },
    },
  },
  mealHistories: {
    select: {
      eatenAt: true,
      rating: true,
    },
    orderBy: {
      eatenAt: 'desc',
    },
    take: 1,
  },
} satisfies Prisma.MenuItemSelect;

type RecommendationCandidate = Prisma.MenuItemGetPayload<{
  select: typeof recommendationSelect;
}>;

function scoreCandidate(candidate: Candidate, mealPeriod?: string): number {
  let score = 1;
  if (mealPeriod && candidate.mealPeriods.includes(mealPeriod as MealPeriod)) {
    score += 5;
  }
  if (candidate.isFavorite) score += 3;

  const lastHistory = candidate.mealHistories[0];
  if (lastHistory) {
    const daysSince = (Date.now() - lastHistory.eatenAt.getTime()) / 86400000;
    if (daysSince < 3) score -= 10;
    if (lastHistory.rating && lastHistory.rating >= 4) score += 2;
  }

  return score;
}

const mealPeriodLabels: Record<MealPeriod, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  lateNight: '夜宵',
};

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async today(filters: RecommendationFilters, userId: string) {
    const scored = await this.getScoredCandidates(filters, userId);
    const best = scored.sort((a, b) => b.score - a.score)[0];

    if (!best) {
      throw new NotFoundException();
    }

    return this.toRecommendation(best.candidate, filters.mealPeriod);
  }

  async random(filters: RecommendationFilters, userId: string) {
    const scored = await this.getScoredCandidates(filters, userId);
    const positiveCandidates = scored.filter(({ score }) => score > 0);
    const pool = positiveCandidates.length > 0 ? positiveCandidates : scored;

    if (pool.length === 0) {
      throw new NotFoundException();
    }

    const totalWeight = pool.reduce(
      (sum, { score }) => sum + Math.max(score, 1),
      0,
    );
    let target = Math.random() * totalWeight;

    for (const item of pool) {
      target -= Math.max(item.score, 1);
      if (target <= 0) {
        return this.toRecommendation(item.candidate, filters.mealPeriod);
      }
    }

    return this.toRecommendation(pool[pool.length - 1].candidate, filters.mealPeriod);
  }

  private async getScoredCandidates(filters: RecommendationFilters, userId: string) {
    const candidates = await this.prisma.menuItem.findMany({
      where: this.buildWhere(filters, userId),
      select: recommendationSelect,
      orderBy: { createdAt: 'asc' },
    });

    return candidates.map((candidate) => ({
      candidate,
      score: scoreCandidate(candidate, filters.mealPeriod),
    }));
  }

  private buildWhere(
    filters: RecommendationFilters,
    userId: string,
  ): Prisma.MenuItemWhereInput {
    const where: Prisma.MenuItemWhereInput = {
      status: 'active',
      createdById: userId,
    };

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.mealPeriod) {
      where.mealPeriods = { has: filters.mealPeriod };
    }

    if (filters.tagNames?.length) {
      where.tags = {
        some: {
          tag: {
            name: { in: filters.tagNames },
          },
        },
      };
    }

    return where;
  }

  private toRecommendation(
    candidate: RecommendationCandidate,
    mealPeriod?: MealPeriod,
  ) {
    const { mealHistories, tags, ...item } = candidate;

    return {
      item: {
        ...item,
        tags: tags.map(({ tag }) => tag),
      },
      reason: this.buildReason(candidate, mealPeriod),
    };
  }

  private buildReason(candidate: Candidate, mealPeriod?: MealPeriod): string {
    const reasons: string[] = [];

    if (mealPeriod && candidate.mealPeriods.includes(mealPeriod)) {
      reasons.push(`匹配${mealPeriodLabels[mealPeriod]}标签`);
    }

    if (candidate.isFavorite) {
      reasons.push('是收藏菜品');
    }

    if (!candidate.mealHistories[0]) {
      reasons.push('最近没有吃过');
    }

    return reasons.length > 0 ? reasons.join('，且') : '适合作为今天的选择';
  }
}
