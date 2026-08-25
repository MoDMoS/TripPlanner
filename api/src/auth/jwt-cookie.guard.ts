import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';
import type { AuthUser } from './auth-user.type';

type JwtPayload = {
  sub: string;
  email: string;
  name?: string;
  roles?: string[];
  permissions?: string[];
};

const TRIP_PLANNER_PERMISSION = 'service:trip-planner';
const ADMIN_ACCESS_PERMISSION = 'admin:access';

@Injectable()
export class JwtCookieGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies?.access_token;
    if (typeof token !== 'string' || !token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const payload = this.jwt.verify<JwtPayload>(token);
      const roles = Array.isArray(payload.roles) ? payload.roles : [];
      const permissions = Array.isArray(payload.permissions)
        ? payload.permissions
        : [];

      const allowed =
        permissions.includes(TRIP_PLANNER_PERMISSION) ||
        permissions.includes(ADMIN_ACCESS_PERMISSION) ||
        roles.includes('admin');
      if (!allowed) {
        throw new ForbiddenException(
          'Trip Planner service access required',
        );
      }

      (request as Request & { user?: AuthUser }).user = {
        userId: payload.sub,
        email: payload.email,
        name: typeof payload.name === 'string' ? payload.name : '',
        roles,
        permissions,
      };
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}
