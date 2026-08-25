import type { AuthUser } from '../auth/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  it('upserts the local user from Portal JWT claims', async () => {
    const upsert = jest.fn().mockResolvedValue({ id: 'portal-user-1' });
    const prisma = { user: { upsert } } as unknown as PrismaService;
    const service = new UsersService(prisma);
    const user: AuthUser = {
      userId: 'portal-user-1',
      email: 'user@example.com',
      name: 'Portal User',
      roles: ['user'],
      permissions: ['service:trip-planner'],
    };

    await service.ensureFromJwt(user);

    expect(upsert).toHaveBeenCalledWith({
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
  });
});
