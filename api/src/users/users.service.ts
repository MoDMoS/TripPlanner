import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureFromJwt(user: AuthUser) {
    return this.prisma.user.upsert({
      where: { id: user.userId },
      create: {
        id: user.userId,
        email: user.email,
        name: user.name,
      },
      update: {
        email: user.email,
        name: user.name,
      },
    });
  }
}
