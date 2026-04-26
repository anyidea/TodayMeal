import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedRequest } from './current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EditorGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentGroupId: true },
    });

    if (!user?.currentGroupId) {
      throw new ForbiddenException();
    }

    const membership = await this.prisma.mealGroupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: user.currentGroupId,
          userId,
        },
      },
    });

    if (membership) {
      return true;
    }

    throw new ForbiddenException();
  }
}
