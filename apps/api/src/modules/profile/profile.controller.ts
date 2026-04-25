import { Controller, Get, UseGuards } from '@nestjs/common';
import { ok } from '../../common/api-response';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfileService } from './profile.service';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @UseGuards(JwtAuthGuard)
  @Get('summary')
  async summary(@CurrentUser() user: RequestUser) {
    return ok(await this.profileService.summary(user.id));
  }
}
