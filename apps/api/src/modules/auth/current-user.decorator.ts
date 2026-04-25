import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export type RequestUser = {
  id: string;
  openid: string;
  role: string;
};

export type AuthenticatedRequest = Request & {
  user?: RequestUser;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestUser | undefined => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
