import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { MealPeriod, MenuItemType } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { ok } from '../../common/api-response';
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

  @Get('today')
  async today(@Query() query: TodayRecommendationDto) {
    return ok(await this.recommendationsService.today(query));
  }

  @Post('random')
  async random(@Body() dto: RandomRecommendationDto) {
    return ok(await this.recommendationsService.random(dto));
  }
}
