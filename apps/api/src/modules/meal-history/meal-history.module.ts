import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { MealHistoryController } from './meal-history.controller';
import { MealHistoryService } from './meal-history.service';

@Module({
  imports: [AuthModule],
  controllers: [MealHistoryController],
  providers: [MealHistoryService, PrismaService],
})
export class MealHistoryModule {}
