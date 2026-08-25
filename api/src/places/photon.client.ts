import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { osmUserAgent } from '../common/cache/cache.service';

export type PhotonHit = {
  name: string;
  address?: string;
  lat: number;
  lng: number;
  category?: string;
  source: 'osm';
};

@Injectable()
export class PhotonClient {
  constructor(private readonly config: ConfigService) {}

  async search(input: {
    query: string;
    lat?: number;
    lng?: number;
    limit?: number;
  }): Promise<PhotonHit[]> {
    const base =
      this.config.get<string>('PHOTON_BASE_URL')?.trim() ||
      'https://photon.komoot.io';
    const url = new URL('/api/', base);
    url.searchParams.set('q', input.query);
    url.searchParams.set('limit', String(input.limit ?? 8));
    if (input.lat !== undefined && input.lng !== undefined) {
      url.searchParams.set('lat', String(input.lat));
      url.searchParams.set('lon', String(input.lng));
    }

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': osmUserAgent(this.config),
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      throw new Error(`Photon search failed: ${response.status}`);
    }
    const data = (await response.json()) as {
      features?: Array<{
        geometry?: { coordinates?: number[] };
        properties?: Record<string, unknown>;
      }>;
    };

    const hits: PhotonHit[] = [];
    for (const f of data.features ?? []) {
      const coords = f.geometry?.coordinates;
      const props = f.properties ?? {};
      if (!coords || coords.length < 2) continue;
      const lng = coords[0];
      const lat = coords[1];
      const name =
        (typeof props.name === 'string' && props.name) ||
        (typeof props.street === 'string' && props.street) ||
        'Unknown place';
      const parts = [props.street, props.city, props.state, props.country].filter(
        (p): p is string => typeof p === 'string' && p.length > 0,
      );
      const osmValue = props.osm_value;
      hits.push({
        name,
        address: parts.length ? parts.join(', ') : undefined,
        lat,
        lng,
        category: typeof osmValue === 'string' ? osmValue : undefined,
        source: 'osm',
      });
    }
    return hits;
  }
}
