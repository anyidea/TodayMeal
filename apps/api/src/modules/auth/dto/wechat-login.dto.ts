import { IsString, MinLength } from 'class-validator';

export class WechatLoginDto {
  @IsString()
  @MinLength(1)
  code!: string;
}

export class DevLoginDto {
  @IsString()
  @MinLength(1)
  openid!: string;
}
