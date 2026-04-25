import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import { ok } from '../../common/api-response';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { EditorGuard } from '../auth/editor.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FilesService } from './files.service';

const maxUploadSizeBytes = 5 * 1024 * 1024;
const allowedImageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @UseGuards(JwtAuthGuard, EditorGuard)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: maxUploadSizeBytes,
      },
      fileFilter: (_request, file, callback) => {
        if (!allowedImageMimeTypes.has(file.mimetype)) {
          callback(new BadRequestException('unsupported image type'), false);
          return;
        }

        callback(null, true);
      },
    }),
  )
  async upload(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return ok(await this.filesService.upload(file, user.id));
  }
}
