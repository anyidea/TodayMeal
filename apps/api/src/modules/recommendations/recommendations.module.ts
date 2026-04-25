import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

@Module({
  imports: [AuthModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService, PrismaService],
})
export class RecommendationsModule {}
