export type TransportMode = 'walk' | 'drive' | 'bike' | 'transit';

export function parseHhMm(value: string): number {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) throw new Error(`Invalid time: ${value}`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new Error(`Invalid time: ${value}`);
  return hours * 60 + minutes;
}

export function formatHhMm(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export type ScheduleStop = {
  placeId: string;
  name: string;
  arrive: string;
  depart: string;
  stayMinutes: number;
};

export type ScheduleLeg = {
  fromPlaceId: string | null;
  toPlaceId: string;
  durationSec: number;
  isManualOverride: boolean;
  warning?: string;
};

export function buildDaySchedule(input: {
  startTime: string;
  places: {
    placeId: string;
    name: string;
    stayMinutes: number;
  }[];
  legsDurationSec: number[];
}): {
  stops: ScheduleStop[];
  legs: ScheduleLeg[];
  endTime: string;
  totalTravelSec: number;
  totalActivitySec: number;
} {
  if (input.legsDurationSec.length !== input.places.length) {
    throw new Error('legsDurationSec length must equal places length');
  }

  let cursor = parseHhMm(input.startTime);
  const stops: ScheduleStop[] = [];
  const legs: ScheduleLeg[] = [];
  let totalTravelSec = 0;
  let totalActivitySec = 0;
  let prevPlaceId: string | null = null;

  for (let i = 0; i < input.places.length; i += 1) {
    const place = input.places[i];
    const travelSec = Math.max(0, Math.round(input.legsDurationSec[i]));
    totalTravelSec += travelSec;
    cursor += Math.ceil(travelSec / 60);
    const arrive = formatHhMm(cursor);
    const stay = Math.max(0, place.stayMinutes);
    totalActivitySec += stay * 60;
    cursor += stay;
    const depart = formatHhMm(cursor);

    legs.push({
      fromPlaceId: prevPlaceId,
      toPlaceId: place.placeId,
      durationSec: travelSec,
      isManualOverride: false,
    });
    stops.push({
      placeId: place.placeId,
      name: place.name,
      arrive,
      depart,
      stayMinutes: stay,
    });
    prevPlaceId = place.placeId;
  }

  return {
    stops,
    legs,
    endTime: formatHhMm(cursor),
    totalTravelSec,
    totalActivitySec,
  };
}

export function validateSchedule(input: {
  legsDurationSec: number[];
  manualWindowsSec?: number[];
}): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (let i = 0; i < input.legsDurationSec.length; i += 1) {
    if (input.legsDurationSec[i] < 0) {
      errors.push(`Leg ${i + 1} has negative travel duration`);
    }
    const windowSec = input.manualWindowsSec?.[i];
    if (
      windowSec !== undefined &&
      windowSec > 0 &&
      input.legsDurationSec[i] > windowSec
    ) {
      warnings.push(
        `Travel time for leg ${i + 1} is estimated at ${Math.round(input.legsDurationSec[i] / 60)} min, but your schedule only allows ${Math.round(windowSec / 60)} min.`,
      );
    }
  }
  return { errors, warnings };
}
