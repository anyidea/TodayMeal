import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ok } from '../../common/api-response';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JoinGroupDto } from './dto/join-group.dto';
import { GroupsService } from './groups.service';

@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get('me')
  async mine(@CurrentUser() user: RequestUser) {
    return ok(await this.groupsService.mine(user.id));
  }

  @Post('join')
  async join(@CurrentUser() user: RequestUser, @Body() dto: JoinGroupDto) {
    return ok(await this.groupsService.join(user.id, dto.inviteCode));
  }

  @Post(':id/switch')
  async switchGroup(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return ok(await this.groupsService.switchGroup(user.id, id));
  }

  @Post(':id/invites')
  async createInvite(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return ok(await this.groupsService.createInvite(user.id, id));
  }

  @Get(':id/members')
  async members(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return ok(await this.groupsService.members(user.id, id));
  }

  @Delete(':id/members/:userId')
  async removeMember(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return ok(await this.groupsService.removeMember(user.id, id, userId));
  }
}
