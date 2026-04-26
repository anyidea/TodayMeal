import {
  BadRequestException,
  Controller,
  Body,
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
import { ConfirmUploadDto, CreateUploadPolicyDto } from './dto/create-upload-policy.dto';
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
  @Post('upload-policy')
  async createUploadPolicy(
    @Body() dto: CreateUploadPolicyDto,
  ) {
    return ok(this.filesService.createUploadPolicy(dto));
  }

  @UseGuards(JwtAuthGuard, EditorGuard)
  @Post('confirm')
  async confirmUpload(
    @CurrentUser() user: RequestUser,
    @Body() dto: ConfirmUploadDto,
  ) {
    return ok(await this.filesService.confirmUpload(dto, user.id));
  }

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

  @UseGuards(JwtAuthGuard)
  @Post('avatar')
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
  async uploadAvatar(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return ok(await this.filesService.upload(file, user.id));
  }
}
