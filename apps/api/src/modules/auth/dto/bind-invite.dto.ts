import { IsString, MinLength } from 'class-validator';

export class BindInviteDto {
  @IsString()
  @MinLength(1)
  inviteCode!: string;
}
