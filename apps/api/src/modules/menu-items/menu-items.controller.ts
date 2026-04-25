import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ok } from '../../common/api-response';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { EditorGuard } from '../auth/editor.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { ListMenuItemsDto } from './dto/list-menu-items.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { MenuItemsService } from './menu-items.service';

@Controller('menu-items')
export class MenuItemsController {
  constructor(private readonly menuItemsService: MenuItemsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@CurrentUser() user: RequestUser, @Query() query: ListMenuItemsDto) {
    return ok(await this.menuItemsService.list(query, user.id));
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return ok(await this.menuItemsService.getById(id, user.id));
  }

  @UseGuards(JwtAuthGuard, EditorGuard)
  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateMenuItemDto) {
    return ok(await this.menuItemsService.create(dto, user.id));
  }

  @UseGuards(JwtAuthGuard, EditorGuard)
  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return ok(await this.menuItemsService.update(id, dto, user.id));
  }

  @UseGuards(JwtAuthGuard, EditorGuard)
  @Delete(':id')
  async archive(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return ok(await this.menuItemsService.archive(id, user.id));
  }

  @UseGuards(JwtAuthGuard, EditorGuard)
  @Post(':id/favorite')
  async toggleFavorite(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return ok(await this.menuItemsService.toggleFavorite(id, user.id));
  }
}
