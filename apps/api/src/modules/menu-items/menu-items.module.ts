import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { GroupsModule } from '../groups/groups.module';
import { MenuItemsController } from './menu-items.controller';
import { MenuItemsService } from './menu-items.service';

@Module({
  imports: [AuthModule, GroupsModule],
  controllers: [MenuItemsController],
  providers: [MenuItemsService, PrismaService],
  exports: [MenuItemsService],
})
export class MenuItemsModule {}
