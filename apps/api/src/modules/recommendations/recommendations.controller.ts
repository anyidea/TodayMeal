import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { MealPeriod, MenuItemType } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { ok } from '../../common/api-response';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RecommendationsService } from './recommendations.service';

class TodayRecommendationDto {
  @IsOptional()
  @IsEnum(MealPeriod)
  mealPeriod?: MealPeriod;
}

class RandomRecommendationDto extends TodayRecommendationDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagNames?: string[];

  @IsOptional()
  @IsEnum(MenuItemType)
  type?: MenuItemType;
}

@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('today')
  async today(
    @CurrentUser() user: RequestUser,
    @Query() query: TodayRecommendationDto,
  ) {
    return ok(await this.recommendationsService.today(query, user.id));
  }

  @UseGuards(JwtAuthGuard)
  @Post('random')
  async random(
    @CurrentUser() user: RequestUser,
    @Body() dto: RandomRecommendationDto,
  ) {
    return ok(await this.recommendationsService.random(dto, user.id));
  }
}
