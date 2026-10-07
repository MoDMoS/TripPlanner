/** Client-side mirror of api schedule.engine for live Step 3 previews. */

export function parseHhMm(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function formatHhMm(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export type StopEstimate = {
  arrive: string;
  depart: string;
  travelMinutes: number;
};

export function estimateStops(input: {
  startTime: string;
  staysMinutes: number[];
  travelMinutes: number[];
}): StopEstimate[] | null {
  const start = parseHhMm(input.startTime);
  if (start == null) return null;
  if (input.staysMinutes.length !== input.travelMinutes.length) return null;

  let cursor = start;
  const out: StopEstimate[] = [];
  for (let i = 0; i < input.staysMinutes.length; i += 1) {
    const travel = Math.max(0, Math.round(input.travelMinutes[i]));
    cursor += travel;
    const arrive = formatHhMm(cursor);
    const stay = Math.max(0, Math.round(input.staysMinutes[i]));
    cursor += stay;
    out.push({
      arrive,
      depart: formatHhMm(cursor),
      travelMinutes: travel,
    });
  }
  return out;
}
