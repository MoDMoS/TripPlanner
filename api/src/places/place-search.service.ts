import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { CacheService } from '../common/cache/cache.service';
import { PhotonClient, type PhotonHit } from './photon.client';

@Injectable()
export class PlaceSearchService {
  constructor(
    private readonly photon: PhotonClient,
    private readonly cache: CacheService,
  ) {}

  async search(input: {
    query: string;
    lat?: number;
    lng?: number;
    limit?: number;
  }): Promise<PhotonHit[]> {
    const key = `photon:${input.query.trim().toLowerCase()}:${input.lat ?? ''}:${input.lng ?? ''}:${input.limit ?? 8}`;
    const cached = await this.cache.getJson<PhotonHit[]>(key);
    if (cached) return cached;

    try {
      const hits = await this.photon.search(input);
      await this.cache.setJson(key, hits, 10 * 60 * 1000);
      return hits;
    } catch {
      throw new ServiceUnavailableException(
        'ค้นหาสถานที่ไม่ได้ในตอนนี้ ลองใหม่อีกครั้ง',
      );
    }
  }
}
