import {
  buildDaySchedule,
  formatHhMm,
  parseHhMm,
  validateSchedule,
} from './schedule.engine';

describe('schedule.engine', () => {
  it('builds arrive/depart from start, travel, and stay', () => {
    const result = buildDaySchedule({
      startTime: '09:00',
      places: [
        { placeId: 'a', name: 'A', stayMinutes: 120 },
        { placeId: 'b', name: 'B', stayMinutes: 60 },
      ],
      legsDurationSec: [3600, 1800],
    });

    expect(result.stops[0]).toMatchObject({
      arrive: '10:00',
      depart: '12:00',
    });
    expect(result.stops[1]).toMatchObject({
      arrive: '12:30',
      depart: '13:30',
    });
    expect(result.endTime).toBe('13:30');
    expect(result.totalTravelSec).toBe(5400);
    expect(result.totalActivitySec).toBe(180 * 60);
  });

  it('parses and formats HH:mm', () => {
    expect(parseHhMm('09:00')).toBe(540);
    expect(formatHhMm(540)).toBe('09:00');
  });

  it('warns when travel exceeds allowed window', () => {
    const result = validateSchedule({
      legsDurationSec: [3600],
      manualWindowsSec: [1800],
    });
    expect(result.errors).toEqual([]);
    expect(result.warnings[0]).toContain('60 min');
  });
});
