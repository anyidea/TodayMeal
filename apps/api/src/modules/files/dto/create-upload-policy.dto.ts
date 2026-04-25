import { IsInt, IsString, Max, Min } from 'class-validator';

export class CreateUploadPolicyDto {
  @IsString()
  fileName!: string;

  @IsString()
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(5 * 1024 * 1024)
  size!: number;
}

export class ConfirmUploadDto {
  @IsString()
  storageKey!: string;

  @IsString()
  url!: string;

  @IsString()
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(5 * 1024 * 1024)
  size!: number;
}
