import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.tag.findMany({
      orderBy: { name: 'asc' },
    });
  }

  create(dto: CreateTagDto) {
    return this.prisma.tag.upsert({
      where: { name: dto.name },
      update: {
        color: dto.color,
      },
      create: {
        name: dto.name,
        color: dto.color,
        type: 'custom',
      },
    });
  }
}
