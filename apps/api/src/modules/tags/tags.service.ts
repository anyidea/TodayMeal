import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class TagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groupsService: GroupsService,
  ) {}

  async list(userId: string) {
    const groupId = await this.groupsService.currentGroupId(userId);
    return this.prisma.tag.findMany({
      where: {
        OR: [{ groupId }, { groupId: null }],
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateTagDto, userId: string) {
    const groupId = await this.groupsService.currentGroupId(userId);
    return this.prisma.tag.upsert({
      where: {
        groupId_name: {
          groupId,
          name: dto.name,
        },
      },
      update: {
        color: dto.color,
      },
      create: {
        name: dto.name,
        color: dto.color,
        type: 'custom',
        groupId,
      },
    });
  }
}
