import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ok } from '../../common/api-response';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { EditorGuard } from '../auth/editor.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTagDto } from './dto/create-tag.dto';
import { TagsService } from './tags.service';

@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@CurrentUser() user: RequestUser) {
    return ok(await this.tagsService.list(user.id));
  }

  @UseGuards(JwtAuthGuard, EditorGuard)
  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateTagDto) {
    return ok(await this.tagsService.create(dto, user.id));
  }
}
