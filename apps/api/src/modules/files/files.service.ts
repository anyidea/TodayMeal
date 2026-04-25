import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import 'multer';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfirmUploadDto, CreateUploadPolicyDto } from './dto/create-upload-policy.dto';

const allowedImageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const imageMimeExtensions = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
} as const;

@Injectable()
export class FilesService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async upload(file: Express.Multer.File | undefined, userId: string) {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    if (!allowedImageMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('unsupported image type');
    }

    this.assertMagicBytes(file);

    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const extension = this.getExtension(file);
    const fileName = `${randomUUID()}${extension}`;
    const uploadRoot = path.resolve(
      this.configService.get<string>('UPLOAD_DIR') ?? './uploads',
    );
    const directory = path.join(uploadRoot, year, month);
    const storageKey = path.posix.join('uploads', year, month, fileName);

    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, fileName), file.buffer);

    const fileAsset = await this.prisma.fileAsset.create({
      data: {
        url: this.toPublicUrl(storageKey),
        storageKey,
        mimeType: file.mimetype,
        size: file.size,
        uploadedById: userId,
      },
    });

    return {
      id: fileAsset.id,
      url: fileAsset.url,
      mimeType: fileAsset.mimeType,
      size: fileAsset.size,
    };
  }

  createUploadPolicy(dto: CreateUploadPolicyDto) {
    if (!allowedImageMimeTypes.has(dto.mimeType)) {
      throw new BadRequestException('unsupported image type');
    }

    const bucket = this.requiredConfig('OSS_BUCKET');
    const endpoint = this.requiredConfig('OSS_ENDPOINT');
    const accessKeyId = this.requiredConfig('OSS_ACCESS_KEY_ID');
    const accessKeySecret = this.requiredConfig('OSS_ACCESS_KEY_SECRET');
    const publicBaseUrl =
      this.configService.get<string>('OSS_PUBLIC_BASE_URL') ?? endpoint;
    const storageKey = this.buildStorageKey(dto.fileName, dto.mimeType);
    const expiration = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const policy = Buffer.from(
      JSON.stringify({
        expiration,
        conditions: [
          ['eq', '$bucket', bucket],
          ['eq', '$key', storageKey],
          ['content-length-range', 1, dto.size],
        ],
      }),
    ).toString('base64');
    const signature = createHmac('sha1', accessKeySecret)
      .update(policy)
      .digest('base64');

    return {
      uploadUrl: endpoint.replace(/\/$/, ''),
      fileUrl: `${publicBaseUrl.replace(/\/$/, '')}/${storageKey}`,
      storageKey,
      formData: {
        key: storageKey,
        policy,
        OSSAccessKeyId: accessKeyId,
        Signature: signature,
        success_action_status: '200',
      },
    };
  }

  async confirmUpload(dto: ConfirmUploadDto, userId: string) {
    if (!allowedImageMimeTypes.has(dto.mimeType)) {
      throw new BadRequestException('unsupported image type');
    }

    if (!dto.storageKey.startsWith('uploads/')) {
      throw new BadRequestException('invalid storage key');
    }

    const fileAsset = await this.prisma.fileAsset.create({
      data: {
        url: dto.url,
        storageKey: dto.storageKey,
        mimeType: dto.mimeType,
        size: dto.size,
        uploadedById: userId,
      },
    });

    return {
      id: fileAsset.id,
      url: fileAsset.url,
      mimeType: fileAsset.mimeType,
      size: fileAsset.size,
    };
  }

  private getExtension(file: Express.Multer.File): string {
    const extension =
      imageMimeExtensions[file.mimetype as keyof typeof imageMimeExtensions];
    if (!extension) {
      throw new BadRequestException('unsupported image type');
    }

    return extension;
  }

  private buildStorageKey(fileName: string, mimeType: string): string {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const extension =
      imageMimeExtensions[mimeType as keyof typeof imageMimeExtensions] ??
      path.extname(fileName);

    if (!extension || !Object.values(imageMimeExtensions).includes(extension as never)) {
      throw new BadRequestException('unsupported image type');
    }

    return path.posix.join('uploads', year, month, `${randomUUID()}${extension}`);
  }

  private requiredConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new BadRequestException(`${key} is required`);
    }

    return value;
  }

  private assertMagicBytes(file: Express.Multer.File): void {
    const isValid =
      (file.mimetype === 'image/jpeg' && this.isJpeg(file.buffer)) ||
      (file.mimetype === 'image/png' && this.isPng(file.buffer)) ||
      (file.mimetype === 'image/gif' && this.isGif(file.buffer)) ||
      (file.mimetype === 'image/webp' && this.isWebp(file.buffer));

    if (!isValid) {
      throw new BadRequestException('image content does not match MIME type');
    }
  }

  private isJpeg(buffer: Buffer): boolean {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  private isPng(buffer: Buffer): boolean {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  private isGif(buffer: Buffer): boolean {
    return (
      buffer.length >= 6 &&
      (buffer.subarray(0, 6).equals(Buffer.from('GIF87a')) ||
        buffer.subarray(0, 6).equals(Buffer.from('GIF89a')))
    );
  }

  private isWebp(buffer: Buffer): boolean {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).equals(Buffer.from('RIFF')) &&
      buffer.subarray(8, 12).equals(Buffer.from('WEBP'))
    );
  }

  private toPublicUrl(storageKey: string): string {
    const publicBaseUrl =
      this.configService.get<string>('PUBLIC_BASE_URL') ?? 'http://localhost:3000';
    return `${publicBaseUrl.replace(/\/$/, '')}/${storageKey}`;
  }
}
