import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtCookieGuard } from './jwt-cookie.guard';

function makeContext(request: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
    }),
  } as unknown as ExecutionContext;
}

describe('JwtCookieGuard', () => {
  it('allows @Public routes without a cookie', () => {
    const jwt = { verify: jest.fn() } as unknown as JwtService;
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    } as unknown as Reflector;
    const guard = new JwtCookieGuard(jwt, reflector);

    expect(guard.canActivate(makeContext({ cookies: {} }))).toBe(true);
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it('rejects missing access_token cookie', () => {
    const jwt = { verify: jest.fn() } as unknown as JwtService;
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const guard = new JwtCookieGuard(jwt, reflector);

    expect(() => guard.canActivate(makeContext({ cookies: {} }))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a valid JWT without the Trip Planner service permission', () => {
    const jwt = {
      verify: jest.fn().mockReturnValue({
        sub: 'portal-user-1',
        email: 'user@example.com',
        name: 'Portal User',
        roles: ['user'],
        permissions: ['service:gold-agent'],
      }),
    } as unknown as JwtService;
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const request = { cookies: { access_token: 'valid-token' } };
    const guard = new JwtCookieGuard(jwt, reflector);

    expect(() => guard.canActivate(makeContext(request))).toThrow(
      ForbiddenException,
    );
  });

  it('attaches AuthUser when JWT has service:trip-planner', () => {
    const jwt = {
      verify: jest.fn().mockReturnValue({
        sub: 'portal-user-1',
        email: 'user@example.com',
        name: 'Portal User',
        roles: ['user'],
        permissions: ['service:trip-planner'],
      }),
    } as unknown as JwtService;
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const request: Record<string, unknown> = {
      cookies: { access_token: 'valid-token' },
    };
    const guard = new JwtCookieGuard(jwt, reflector);

    expect(guard.canActivate(makeContext(request))).toBe(true);
    expect(request.user).toEqual({
      userId: 'portal-user-1',
      email: 'user@example.com',
      name: 'Portal User',
      roles: ['user'],
      permissions: ['service:trip-planner'],
    });
  });
});
