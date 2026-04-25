import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ok } from '../../common/api-response';
import { EditorGuard } from '../auth/editor.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTagDto } from './dto/create-tag.dto';
import { TagsService } from './tags.service';

@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  async list() {
    return ok(await this.tagsService.list());
  }

  @UseGuards(JwtAuthGuard, EditorGuard)
  @Post()
  async create(@Body() dto: CreateTagDto) {
    return ok(await this.tagsService.create(dto));
  }
}
