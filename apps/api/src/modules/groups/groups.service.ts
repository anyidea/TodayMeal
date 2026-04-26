import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async mine(userId: string) {
    return this.groupState(userId);
  }

  async switchGroup(userId: string, groupId: string) {
    await this.ensureMember(userId, groupId);
    await this.prisma.user.update({
      where: { id: userId },
      data: { currentGroupId: groupId },
    });

    return this.groupState(userId);
  }

  async createInvite(userId: string, groupId: string) {
    await this.ensureMember(userId, groupId);

    const invite = await this.prisma.mealGroupInvite.create({
      data: {
        code: await this.uniqueInviteCode(),
        groupId,
        createdById: userId,
      },
    });

    return {
      inviteCode: invite.code,
      groupId,
    };
  }

  async join(userId: string, inviteCode: string) {
    const invite = await this.prisma.mealGroupInvite.findUnique({
      where: { code: inviteCode.trim() },
    });

    if (!invite) {
      throw new NotFoundException();
    }

    await this.prisma.mealGroupMember.upsert({
      where: {
        groupId_userId: {
          groupId: invite.groupId,
          userId,
        },
      },
      update: {},
      create: {
        groupId: invite.groupId,
        userId,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { currentGroupId: invite.groupId },
    });

    return this.groupState(userId);
  }

  async members(userId: string, groupId: string) {
    await this.ensureMember(userId, groupId);
    const group = await this.prisma.mealGroup.findUniqueOrThrow({
      where: { id: groupId },
      select: { createdById: true },
    });

    const members = await this.prisma.mealGroupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return members.map((member) => ({
      userId: member.userId,
      role: member.role,
      joinedAt: member.joinedAt,
      nickname: member.user.nickname,
      avatarUrl: member.user.avatarUrl,
      globalRole: member.user.role,
      canRemove: group.createdById === userId && member.userId !== userId,
    }));
  }

  async removeMember(ownerUserId: string, groupId: string, targetUserId: string) {
    if (ownerUserId === targetUserId) {
      throw new ForbiddenException();
    }

    const group = await this.prisma.mealGroup.findUnique({
      where: { id: groupId },
      select: { createdById: true },
    });

    if (!group || group.createdById !== ownerUserId) {
      throw new ForbiddenException();
    }

    const targetMembership = await this.prisma.mealGroupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: targetUserId,
        },
      },
    });

    if (!targetMembership) {
      throw new NotFoundException();
    }

    await this.prisma.mealGroupMember.delete({
      where: {
        groupId_userId: {
          groupId,
          userId: targetUserId,
        },
      },
    });

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { currentGroupId: true },
    });

    if (targetUser?.currentGroupId === groupId) {
      const nextMembership = await this.prisma.mealGroupMember.findFirst({
        where: { userId: targetUserId },
        orderBy: { joinedAt: 'asc' },
      });
      await this.prisma.user.update({
        where: { id: targetUserId },
        data: { currentGroupId: nextMembership?.groupId ?? null },
      });
    }

    return {
      groupId,
      memberCount: await this.prisma.mealGroupMember.count({
        where: { groupId },
      }),
    };
  }

  async ensureMember(userId: string, groupId: string) {
    const member = await this.prisma.mealGroupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException();
    }

    return member;
  }

  async currentGroupId(userId: string): Promise<string> {
    const state = await this.groupState(userId);
    if (!state.currentGroupId) {
      throw new ForbiddenException();
    }

    return state.currentGroupId;
  }

  private async groupState(userId: string) {
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

  private async uniqueInviteCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomBytes(4).toString('hex').toUpperCase();
      const existing = await this.prisma.mealGroupInvite.findUnique({
        where: { code },
      });

      if (!existing) {
        return code;
      }
    }

    return randomBytes(8).toString('hex').toUpperCase();
  }
}
