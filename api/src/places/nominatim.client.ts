import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { osmUserAgent } from '../common/cache/cache.service';

@Injectable()
export class NominatimClient {
  private chain: Promise<void> = Promise.resolve();
  private lastAt = 0;
  private readonly minIntervalMs = 1100;

  constructor(private readonly config: ConfigService) {}

  async reverse(lat: number, lng: number): Promise<string | undefined> {
    await this.enqueue();
    const base =
      this.config.get<string>('NOMINATIM_BASE_URL')?.trim() ||
      'https://nominatim.openstreetmap.org';
    const url = new URL('/reverse', base);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': osmUserAgent(this.config),
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      return undefined;
    }
    const data = (await response.json()) as { display_name?: string };
    return typeof data.display_name === 'string' ? data.display_name : undefined;
  }

  private enqueue(): Promise<void> {
    const run = async () => {
      const wait = this.minIntervalMs - (Date.now() - this.lastAt);
      if (wait > 0) {
        await new Promise((r) => setTimeout(r, wait));
      }
      this.lastAt = Date.now();
    };
    const next = this.chain.then(run, run);
    this.chain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }
}
