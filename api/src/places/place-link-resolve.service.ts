import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../common/cache/cache.service';
import { parseGoogleMapsUrl } from './google-maps-url.parser';
import { NominatimClient } from './nominatim.client';

const ALLOWED_HOST_SUFFIXES = [
  'google.com',
  'google.co.th',
  'google.co.jp',
  'google.com.tw',
  'maps.app.goo.gl',
  'goo.gl',
];

export type ResolvedPlace = {
  name: string;
  address?: string;
  lat: number;
  lng: number;
  source: 'gmaps';
  sourceUrl: string;
};

@Injectable()
export class PlaceLinkResolveService {
  constructor(
    private readonly nominatim: NominatimClient,
    private readonly cache: CacheService,
    private readonly config: ConfigService,
  ) {}

  async resolve(url: string): Promise<ResolvedPlace> {
    this.assertAllowedHost(url);
    const finalUrl = await this.followRedirects(url);
    const parsed = parseGoogleMapsUrl(finalUrl);
    if (parsed?.lat === undefined || parsed?.lng === undefined) {
      throw new BadRequestException(
        'ลิงก์นี้ดึงพิกัดไม่ได้ ลองใช้ลิงก์แบบเต็มหรือค้นหาชื่อ',
      );
    }

    const cacheKey = `rev:${parsed.lat.toFixed(5)},${parsed.lng.toFixed(5)}`;
    let address: string | null | undefined =
      await this.cache.getJson<string>(cacheKey);
    if (!address) {
      address = (await this.nominatim.reverse(parsed.lat, parsed.lng)) ?? null;
      if (address) {
        await this.cache.setJson(cacheKey, address, 30 * 24 * 60 * 60 * 1000);
      }
    }

    return {
      name: parsed.name ?? address ?? 'Dropped pin',
      address: address ?? undefined,
      lat: parsed.lat,
      lng: parsed.lng,
      source: 'gmaps',
      sourceUrl: url,
    };
  }

  private assertAllowedHost(raw: string) {
    let host: string;
    try {
      host = new URL(raw).hostname.toLowerCase();
    } catch {
      throw new BadRequestException('URL ไม่ถูกต้อง');
    }
    const ok = ALLOWED_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    );
    if (!ok) {
      throw new BadRequestException('รองรับเฉพาะลิงก์ Google Maps');
    }
  }

  private async followRedirects(startUrl: string): Promise<string> {
    let current = startUrl;
    for (let hop = 0; hop < 8; hop += 1) {
      const response = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'User-Agent':
            this.config.get<string>('OSM_USER_AGENT')?.trim() ||
            'MoDMoSTripPlanner/1.0',
        },
        signal: AbortSignal.timeout(8000),
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) break;
        current = new URL(location, current).toString();
        this.assertAllowedHost(current);
        continue;
      }
      return response.url || current;
    }
    return current;
  }
}
