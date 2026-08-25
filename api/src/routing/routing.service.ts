import { Injectable } from '@nestjs/common';
import { RouteCacheService } from '../common/cache/cache.service';
import { OsrmRoutingProvider } from './osrm.routing.provider';
import type { RoutingMode } from './routing.provider';

@Injectable()
export class RoutingService {
  constructor(
    private readonly osrm: OsrmRoutingProvider,
    private readonly cache: RouteCacheService,
  ) {}

  async getLegDurations(input: {
    mode: RoutingMode;
    points: { lat: number; lng: number }[];
  }): Promise<{ durationSec: number[]; distanceM: number[] } | null> {
    if (input.points.length < 2) {
      return { durationSec: [], distanceM: [] };
    }
    const key = [
      input.mode,
      ...input.points.map(
        (p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`,
      ),
    ].join('|');
    const cached = await this.cache.getJson<{
      durationSec: number[];
      distanceM: number[];
    }>(key);
    if (cached) return cached;

    try {
      const matrix = await this.osrm.getMatrix(input.points, input.mode);
      const durationSec: number[] = [];
      const distanceM: number[] = [];
      for (let i = 0; i < input.points.length - 1; i += 1) {
        durationSec.push(Math.round(matrix.durationsSec[i]?.[i + 1] ?? 0));
        distanceM.push(Math.round(matrix.distancesM[i]?.[i + 1] ?? 0));
      }
      const payload = { durationSec, distanceM };
      await this.cache.setJson(key, payload, 24 * 60 * 60 * 1000);
      return payload;
    } catch {
      return null;
    }
  }
}
