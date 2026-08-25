import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { osmUserAgent } from '../common/cache/cache.service';
import type {
  RoutingMatrix,
  RoutingMode,
  RoutingProvider,
} from './routing.provider';

const PROFILE: Record<RoutingMode, { path: string; profile: string }> = {
  drive: { path: 'routed-car', profile: 'driving' },
  bike: { path: 'routed-bike', profile: 'cycling' },
  walk: { path: 'routed-foot', profile: 'foot' },
};

@Injectable()
export class OsrmRoutingProvider implements RoutingProvider {
  constructor(private readonly config: ConfigService) {}

  async getMatrix(
    coords: { lat: number; lng: number }[],
    mode: RoutingMode,
  ): Promise<RoutingMatrix> {
    if (coords.length === 0) {
      return { durationsSec: [], distancesM: [] };
    }
    const base =
      this.config.get<string>('OSRM_BASE_URL')?.trim() ||
      'https://routing.openstreetmap.de';
    const { path, profile } = PROFILE[mode];
    const coordStr = coords.map((c) => `${c.lng},${c.lat}`).join(';');
    const url = `${base.replace(/\/$/, '')}/${path}/table/v1/${profile}/${coordStr}?annotations=duration,distance`;

    const response = await fetch(url, {
      headers: { 'User-Agent': osmUserAgent(this.config) },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      throw new Error(`OSRM table failed: ${response.status}`);
    }
    const data = (await response.json()) as {
      code?: string;
      durations?: Array<Array<number | null>>;
      distances?: Array<Array<number | null>>;
    };
    if (data.code && data.code !== 'Ok') {
      throw new Error(`OSRM table code: ${data.code}`);
    }
    const durationsSec = (data.durations ?? []).map((row) =>
      row.map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)),
    );
    const distancesM = (data.distances ?? []).map((row) =>
      row.map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)),
    );
    return { durationsSec, distancesM };
  }
}
