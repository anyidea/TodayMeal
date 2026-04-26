import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ok } from '../../common/api-response';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { EditorGuard } from '../auth/editor.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMealHistoryDto } from './dto/create-meal-history.dto';
import { MealHistoryService } from './meal-history.service';

@Controller('meal-history')
export class MealHistoryController {
  constructor(private readonly mealHistoryService: MealHistoryService) {}

  @UseGuards(JwtAuthGuard, EditorGuard)
  @Post()
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateMealHistoryDto,
  ) {
    return ok(await this.mealHistoryService.create(dto, user.id));
  }

  @UseGuards(JwtAuthGuard)
  @Get('recent')
  async recent(@CurrentUser() user: RequestUser) {
    return ok(await this.mealHistoryService.recent(user.id));
  }
}
