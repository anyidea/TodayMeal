import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

type AuthUser = {
  id: string;
  openid: string;
  role: string;
  nickname: string | null;
  avatarUrl: string | null;
};

type GroupState = {
  currentGroupId: string | null;
  groups: Array<{
    id: string;
    name: string;
    memberCount: number;
    role: string;
    isCurrent: boolean;
  }>;
};

type WechatSessionResponse = {
  openid?: string;
  errcode?: number;
  errmsg?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  devLogin(openid: string) {
    if (!this.isDevLoginEnabled()) {
      throw new ForbiddenException();
    }

    return this.loginWithOpenid(openid);
  }

  async wechatLogin(code: string) {
    const appId = this.configService.get<string>('WECHAT_APP_ID');
    const appSecret = this.configService.get<string>('WECHAT_APP_SECRET');

    if (!appId || !appSecret) {
      throw new UnauthorizedException();
    }

    const params = new URLSearchParams({
      appid: appId,
      secret: appSecret,
      js_code: code,
      grant_type: 'authorization_code',
    });
    const response = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?${params.toString()}`,
    );

    if (!response.ok) {
      throw new UnauthorizedException();
    }

    const session = (await response.json()) as WechatSessionResponse;

    if (!session.openid) {
      throw new UnauthorizedException(session.errmsg);
    }

    return this.loginWithOpenid(session.openid);
  }

  async loginWithOpenid(openid: string) {
    const ownerOpenids = this.getOwnerOpenids();
    const ownerRole = ownerOpenids.has(openid);
    const user = await this.prisma.user.upsert({
      where: { openid },
      update: ownerRole ? { role: 'owner' } : {},
      create: {
        openid,
        role: ownerRole ? 'owner' : 'viewer',
      },
    });
    const groupState = await this.ensureDefaultMealGroup(user.id);

    return this.issueToken({
      id: user.id,
      openid: user.openid,
      role: user.role,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
    }, groupState);
  }

  async bindInvite(userId: string, inviteCode: string) {
    const expectedInviteCode =
      this.configService.get<string>('EDITOR_INVITE_CODE');

    if (!expectedInviteCode || inviteCode !== expectedInviteCode) {
      throw new UnauthorizedException();
    }

    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      throw new UnauthorizedException();
    }

    if (currentUser.role === 'owner') {
      return { role: currentUser.role };
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { role: 'editor' },
    });

    return { role: user.role };
  }

  private getOwnerOpenids(): Set<string> {
    const value = this.configService.get<string>('OWNER_OPENIDS') ?? '';
    return new Set(
      value
        .split(',')
        .map((openid) => openid.trim())
        .filter(Boolean),
    );
  }

  private isDevLoginEnabled(): boolean {
    return (
      this.configService.get<string>('ENABLE_DEV_LOGIN') === 'true' ||
      this.configService.get<string>('NODE_ENV') === 'test'
    );
  }

  private async ensureDefaultMealGroup(userId: string): Promise<GroupState> {
    const existingMembership = await this.prisma.mealGroupMember.findFirst({
      where: { userId },
      orderBy: { joinedAt: 'asc' },
    });

    if (!existingMembership) {
      const group = await this.prisma.mealGroup.create({
        data: {
          name: '我的饭团',
          createdById: userId,
          members: {
            create: {
              userId,
            },
          },
        },
      });

      await this.prisma.user.update({
        where: { id: userId },
        data: { currentGroupId: group.id },
      });
    }

    return this.groupState(userId);
  }

  private async groupState(userId: string): Promise<GroupState> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { currentGroupId: true },
    });
    const memberships = await this.prisma.mealGroupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            _count: {
              select: { members: true },
            },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    let currentGroupId = user.currentGroupId;
    if (
      currentGroupId &&
      !memberships.some((membership) => membership.groupId === currentGroupId)
    ) {
      currentGroupId = null;
    }

    if (!currentGroupId && memberships[0]) {
      currentGroupId = memberships[0].groupId;
      await this.prisma.user.update({
        where: { id: userId },
        data: { currentGroupId },
      });
    }

    return {
      currentGroupId,
      groups: memberships.map((membership) => ({
        id: membership.group.id,
        name: membership.group.name,
        memberCount: membership.group._count.members,
        role: membership.role,
        isCurrent: membership.groupId === currentGroupId,
      })),
    };
  }

  private async issueToken(user: AuthUser, groupState: GroupState) {
    const token = await this.jwtService.signAsync({
      sub: user.id,
      openid: user.openid,
      role: user.role,
    });

    return {
      token,
      user,
      ...groupState,
    };
  }
}
