import { Body, Controller, Post } from '@nestjs/common';
import { ok } from '../../common/api-response';
import { LinkPreviewDto } from './dto/link-preview.dto';
import { LinkPreviewService } from './link-preview.service';

@Controller('link-preview')
export class LinkPreviewController {
  constructor(private readonly linkPreviewService: LinkPreviewService) {}

  @Post()
  async preview(@Body() dto: LinkPreviewDto) {
    return ok(await this.linkPreviewService.preview(dto.url));
  }
}
