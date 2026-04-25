import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ok } from '../../common/api-response';
import { AuthService } from './auth.service';
import { CurrentUser, RequestUser } from './current-user.decorator';
import { BindInviteDto } from './dto/bind-invite.dto';
import { DevLoginDto, WechatLoginDto } from './dto/wechat-login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('dev-login')
  async devLogin(@Body() dto: DevLoginDto) {
    return ok(await this.authService.devLogin(dto.openid));
  }

  @Post('wechat-login')
  async wechatLogin(@Body() dto: WechatLoginDto) {
    return ok(await this.authService.wechatLogin(dto.code));
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: RequestUser) {
    return ok(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('bind-invite')
  async bindInvite(
    @CurrentUser() user: RequestUser,
    @Body() dto: BindInviteDto,
  ) {
    return ok(await this.authService.bindInvite(user.id, dto.inviteCode));
  }
}
