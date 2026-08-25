import { useEffect, useMemo, useState } from 'react';
import { api, type Trip, type TripDay } from '../api';

type Mode = 'walk' | 'drive' | 'bike' | 'transit';

type Props = {
  trip: Trip;
  onChanged: () => Promise<void>;
  onBack: () => void;
  onContinue: () => void;
};

function minutesLabel(sec: number) {
  return `${Math.round(sec / 60)} นาที`;
}

export function StepSchedule({ trip, onChanged, onBack, onContinue }: Props) {
  const days = trip.days ?? [];
  const [dayId, setDayId] = useState(days[0]?.id ?? '');
  const day = useMemo(
    () => days.find((d) => d.id === dayId) ?? days[0],
    [days, dayId],
  );

  const [startTime, setStartTime] = useState(day?.startTime || '09:00');
  const [startLabel, setStartLabel] = useState(day?.startLabel || '');
  const [mode, setMode] = useState<Mode>(
    (day?.transportMode as Mode) || 'drive',
  );
  const [stays, setStays] = useState<Record<string, number>>({});
  const [legMins, setLegMins] = useState<Record<string, number>>({});
  const [manual, setManual] = useState<Record<string, boolean>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [ack, setAck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [timeline, setTimeline] = useState<string | null>(null);

  useEffect(() => {
    if (!day) return;
    setStartTime(day.startTime || '09:00');
    setStartLabel(day.startLabel || '');
    setMode((day.transportMode as Mode) || 'drive');
    const nextStays: Record<string, number> = {};
    const nextLegs: Record<string, number> = {};
    const nextManual: Record<string, boolean> = {};
    for (const row of day.places) {
      nextStays[row.placeId] = row.stayMinutes;
    }
    for (const leg of day.legs ?? []) {
      if (leg.toPlaceId) {
        nextLegs[leg.toPlaceId] = Math.round(leg.durationSec / 60);
        nextManual[leg.toPlaceId] = leg.isManualOverride;
      }
    }
    setStays(nextStays);
    setLegMins(nextLegs);
    setManual(nextManual);
    setWarnings([]);
    setAck(false);
    setTimeline(null);
  }, [day]);

  async function calculate(current: TripDay) {
    setBusy(true);
    setError(null);
    try {
      const result = await api.calculateDayRoute(trip.id, current.id, {
        transportMode: mode,
        startTime,
      });
      setWarnings(result.warnings ?? []);
      if (result.needsManual) {
        setError(result.warnings?.[0] ?? 'ต้องใส่เวลาเดินทางเอง');
        return;
      }
      if (result.schedule) {
        const next: Record<string, number> = {};
        for (const leg of result.schedule.legs) {
          next[leg.toPlaceId] = Math.round(leg.durationSec / 60);
        }
        setLegMins(next);
        setTimeline(
          result.schedule.stops
            .map((s) => `${s.arrive}–${s.depart} ${s.name}`)
            .join('\n'),
        );
      }
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'calculate failed');
    } finally {
      setBusy(false);
    }
  }

  async function save(acknowledge = ack) {
    if (!day) return;
    setBusy(true);
    setError(null);
    try {
      const body = {
        startTime,
        startLabel: startLabel || undefined,
        transportMode: mode,
        stays: day.places.map((p) => ({
          placeId: p.placeId,
          stayMinutes: stays[p.placeId] ?? p.stayMinutes,
        })),
        legs: day.places.map((p) => ({
          toPlaceId: p.placeId,
          durationSec: Math.round((legMins[p.placeId] ?? 0) * 60),
          isManualOverride: mode === 'transit' || Boolean(manual[p.placeId]),
        })),
        acknowledgeWarnings: acknowledge,
      };
      const result = await api.saveDaySchedule(trip.id, day.id, body);
      setWarnings(result.warnings ?? []);
      if (result.schedule) {
        setTimeline(
          result.schedule.stops
            .map((s) => `${s.arrive}–${s.depart} ${s.name}`)
            .join('\n'),
        );
      }
      await onChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'save failed';
      setError(message);
      if (message.toLowerCase().includes('allow') || message.includes('นาที')) {
        setWarnings((w) => (w.length ? w : [message]));
      }
    } finally {
      setBusy(false);
    }
  }

  if (!day) {
    return <p className="text-violet-600/80">สร้างวันและจัดสถานที่ก่อน</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-violet-200 px-3 py-2 text-sm"
          onClick={onBack}
        >
          ← Days
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
          onClick={onContinue}
        >
          Continue to preview →
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {days.map((d) => (
          <button
            key={d.id}
            type="button"
            className={`rounded-full px-3 py-1 text-sm ${
              d.id === day.id ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-800'
            }`}
            onClick={() => setDayId(d.id)}
          >
            Day {d.dayNumber}
          </button>
        ))}
      </div>

      <section className="grid gap-4 rounded-xl border border-violet-200 bg-white/85 p-4 lg:grid-cols-2">
        <label className="text-sm">
          Start time
          <input
            className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Start label
          <input
            className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2"
            value={startLabel}
            onChange={(e) => setStartLabel(e.target.value)}
            placeholder="Hotel"
          />
        </label>
        <label className="text-sm lg:col-span-2">
          Transport mode
          <select
            className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2"
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
          >
            <option value="drive">Drive</option>
            <option value="walk">Walk</option>
            <option value="bike">Bike</option>
            <option value="transit">Public transit (manual times)</option>
          </select>
        </label>
      </section>

      <section className="space-y-3 rounded-xl border border-violet-200 bg-white/85 p-4">
        {day.places.map((row, index) => (
          <div
            key={row.placeId}
            className="grid gap-2 rounded-lg border border-violet-200 p-3 md:grid-cols-3"
          >
            <div>
              <div className="text-xs text-violet-500">Stop {index + 1}</div>
              <div className="font-medium">{row.place.name}</div>
            </div>
            <label className="text-sm">
              Stay (min)
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2"
                value={stays[row.placeId] ?? row.stayMinutes}
                onChange={(e) =>
                  setStays((s) => ({
                    ...s,
                    [row.placeId]: Number(e.target.value),
                  }))
                }
              />
            </label>
            <label className="text-sm">
              Travel to here (min)
              {mode === 'transit' ? (
                <span className="ml-1 text-xs text-amber-300">required</span>
              ) : null}
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2"
                value={legMins[row.placeId] ?? 0}
                onChange={(e) => {
                  setLegMins((s) => ({
                    ...s,
                    [row.placeId]: Number(e.target.value),
                  }));
                  setManual((m) => ({ ...m, [row.placeId]: true }));
                }}
              />
            </label>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap gap-2">
        {mode !== 'transit' ? (
          <button
            type="button"
            disabled={busy}
            className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white"
            onClick={() => void calculate(day)}
          >
            Calculate travel times
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          className="rounded-lg border border-violet-300 px-3 py-2 text-sm"
          onClick={() => void save(false)}
        >
          Save schedule
        </button>
      </div>

      {warnings.length ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
          <ul className="list-disc pl-5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <label className="mt-2 flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />
            Acknowledge and save anyway
          </label>
          <button
            type="button"
            className="mt-2 text-violet-700"
            disabled={!ack || busy}
            onClick={() => void save(true)}
          >
            Save with acknowledgment
          </button>
        </div>
      ) : null}

      {timeline ? (
        <pre className="overflow-auto rounded-lg border border-violet-200 bg-white p-3 text-xs text-violet-800">
          {timeline}
        </pre>
      ) : null}
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {day.legs?.length ? (
        <p className="text-xs text-violet-500">
          Stored legs:{' '}
          {day.legs
            .map((l) => `${l.toPlaceId}:${minutesLabel(l.durationSec)}`)
            .join(' · ')}
        </p>
      ) : null}
    </div>
  );
}
