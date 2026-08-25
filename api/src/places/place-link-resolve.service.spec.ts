import { PlaceLinkResolveService } from './place-link-resolve.service';
import { NominatimClient } from './nominatim.client';
import { CacheService } from '../common/cache/cache.service';
import { ConfigService } from '@nestjs/config';

describe('PlaceLinkResolveService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('follows redirects then parses coords', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 302,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === 'location'
            ? 'https://www.google.com/maps/place/Taipei+101/@25.0330,121.5654,17z'
            : null,
      },
      url: '',
    }) as unknown as typeof fetch;

    // Second hop: final page (no redirect) — followRedirects loops; simplify by
    // returning 200 on second call with url set.
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        status: 302,
        headers: {
          get: () =>
            'https://www.google.com/maps/place/Taipei+101/@25.0330,121.5654,17z',
        },
        url: '',
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: { get: () => null },
        url: 'https://www.google.com/maps/place/Taipei+101/@25.0330,121.5654,17z',
      });

    const nominatim = {
      reverse: jest.fn().mockResolvedValue('Taipei, Taiwan'),
    } as unknown as NominatimClient;
    const cache = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn().mockResolvedValue(undefined),
    } as unknown as CacheService;
    const config = {
      get: jest.fn().mockReturnValue('MoDMoSTripPlanner/test'),
    } as unknown as ConfigService;

    const service = new PlaceLinkResolveService(nominatim, cache, config);
    const result = await service.resolve('https://maps.app.goo.gl/abc');

    expect(result.lat).toBe(25.033);
    expect(result.lng).toBe(121.5654);
    expect(result.source).toBe('gmaps');
    expect(result.name).toBe('Taipei 101');
  });
});
