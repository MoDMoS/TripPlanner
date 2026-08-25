import { buildTripDocx } from './trip-docx.builder';

describe('buildTripDocx', () => {
  it('returns a non-empty docx buffer with PK zip signature', async () => {
    const buffer = await buildTripDocx({
      tripName: 'Taipei Weekend',
      destination: 'Taiwan',
      placeCount: 2,
      dayCount: 1,
      totals: { totalTravelSec: 3600, totalActivitySec: 7200 },
      days: [
        {
          dayNumber: 1,
          title: 'City',
          startTime: '09:00',
          startLabel: 'Hotel',
          transportMode: 'drive',
          schedule: {
            stops: [
              {
                name: 'Taipei 101',
                arrive: '10:00',
                depart: '12:00',
                stayMinutes: 120,
              },
            ],
            legs: [{ toPlaceId: 'a', durationSec: 3600 }],
            endTime: '12:00',
            totalTravelSec: 3600,
            totalActivitySec: 7200,
          },
          places: [
            {
              name: 'Taipei 101',
              address: 'Taipei',
              lat: 25.03,
              lng: 121.56,
            },
          ],
        },
      ],
    });
    expect(buffer.byteLength).toBeGreaterThan(100);
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
  });
});
