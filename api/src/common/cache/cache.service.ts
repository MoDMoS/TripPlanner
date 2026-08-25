import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CacheService {
  constructor(private readonly prisma: PrismaService) {}

  async getJson<T>(key: string): Promise<T | null> {
    const row = await this.prisma.placeCache.findUnique({ where: { key } });
    if (!row) return null;
    if (row.expiresAt.getTime() <= Date.now()) {
      await this.prisma.placeCache.delete({ where: { key } }).catch(() => undefined);
      return null;
    }
    return row.payload as T;
  }

  async setJson(key: string, payload: unknown, ttlMs: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlMs);
    await this.prisma.placeCache.upsert({
      where: { key },
      create: { key, payload: payload as object, expiresAt },
      update: { payload: payload as object, expiresAt },
    });
  }
}

@Injectable()
export class RouteCacheService {
  constructor(private readonly prisma: PrismaService) {}

  async getJson<T>(key: string): Promise<T | null> {
    const row = await this.prisma.routeCache.findUnique({ where: { key } });
    if (!row) return null;
    if (row.expiresAt.getTime() <= Date.now()) {
      await this.prisma.routeCache.delete({ where: { key } }).catch(() => undefined);
      return null;
    }
    return row.payload as T;
  }

  async setJson(key: string, payload: unknown, ttlMs: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlMs);
    await this.prisma.routeCache.upsert({
      where: { key },
      create: { key, payload: payload as object, expiresAt },
      update: { payload: payload as object, expiresAt },
    });
  }
}

export function osmUserAgent(config: ConfigService): string {
  return (
    config.get<string>('OSM_USER_AGENT')?.trim() ||
    'MoDMoSTripPlanner/1.0 (contact: unset@example.com)'
  );
}
