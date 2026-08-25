import { parseGoogleMapsUrl } from './google-maps-url.parser';

describe('parseGoogleMapsUrl', () => {
  it('parses place name and @lat,lng from a place URL', () => {
    const parsed = parseGoogleMapsUrl(
      'https://www.google.com/maps/place/Taipei+101/@25.0330,121.5654,17z',
    );
    expect(parsed).toEqual({
      name: 'Taipei 101',
      lat: 25.033,
      lng: 121.5654,
    });
  });

  it('parses q=lat,lng', () => {
    const parsed = parseGoogleMapsUrl(
      'https://www.google.com/maps/?q=25.0330,121.5654',
    );
    expect(parsed).toEqual({
      lat: 25.033,
      lng: 121.5654,
    });
  });

  it('parses ll= from maps.google.com', () => {
    const parsed = parseGoogleMapsUrl(
      'https://maps.google.com/maps?ll=25.03,121.56',
    );
    expect(parsed).toEqual({
      lat: 25.03,
      lng: 121.56,
    });
  });

  it('parses !3d!4d data coordinates', () => {
    const parsed = parseGoogleMapsUrl(
      'https://www.google.com/maps/place/Ximending/data=!3d25.0421!4d121.508',
    );
    expect(parsed?.name).toBe('Ximending');
    expect(parsed?.lat).toBe(25.0421);
    expect(parsed?.lng).toBe(121.508);
  });

  it('returns null for garbage URLs', () => {
    expect(parseGoogleMapsUrl('not-a-url')).toBeNull();
    expect(parseGoogleMapsUrl('https://example.com/foo')).toBeNull();
  });
});
