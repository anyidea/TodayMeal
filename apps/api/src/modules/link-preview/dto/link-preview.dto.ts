import { IsString, MinLength } from 'class-validator';

export class LinkPreviewDto {
  @IsString()
  @MinLength(1)
  url!: string;
}
