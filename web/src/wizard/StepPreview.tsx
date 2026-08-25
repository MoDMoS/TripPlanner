import { useEffect, useState } from 'react';
import { api, type Trip } from '../api';
import { TripMap } from '../map/TripMap';

type Preview = Awaited<ReturnType<typeof api.getPreview>>;

type Props = {
  trip: Trip;
  onBack: () => void;
  onContinue: () => void;
};

export function StepPreview({ trip, onBack, onContinue }: Props) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dayIndex, setDayIndex] = useState(0);

  useEffect(() => {
    api
      .getPreview(trip.id)
      .then(setPreview)
      .catch((err: Error) => setError(err.message));
  }, [trip.id]);

  if (!preview) {
    return <p className="text-violet-300/80">{error ?? 'Loading preview…'}</p>;
  }

  const day = preview.days[dayIndex];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-violet-500/25 px-3 py-2 text-sm"
          onClick={onBack}
        >
          ← Schedule
        </button>
        <button
          type="button"
          className="rounded-lg bg-violet-500 px-3 py-2 text-sm font-semibold text-violet-950"
          onClick={onContinue}
        >
          Continue to export →
        </button>
      </div>

      <section className="rounded-xl border border-violet-500/25 bg-violet-950/40 p-4">
        <h2 className="text-xl font-semibold">{preview.trip.name}</h2>
        <p className="text-sm text-violet-300/80">
          {preview.trip.destination || 'No destination set'} ·{' '}
          {preview.trip.dayCount} days · {preview.trip.placeCount} places
        </p>
        <p className="mt-2 text-sm text-violet-200">
          Travel {Math.round(preview.totals.totalTravelSec / 60)} min · Activities{' '}
          {Math.round(preview.totals.totalActivitySec / 60)} min
        </p>
        {preview.warnings.length ? (
          <ul className="mt-2 list-disc pl-5 text-sm text-amber-200">
            {preview.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-2">
        {preview.days.map((d, i) => (
          <button
            key={d.id}
            type="button"
            className={`rounded-full px-3 py-1 text-sm ${
              i === dayIndex ? 'bg-violet-500 text-violet-950' : 'bg-violet-900/70 text-violet-200'
            }`}
            onClick={() => setDayIndex(i)}
          >
            Day {d.dayNumber}
          </button>
        ))}
      </div>

      {day ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-violet-500/25 bg-violet-950/40 p-4 text-sm">
            <h3 className="font-semibold">
              Day {day.dayNumber}
              {day.title ? ` — ${day.title}` : ''}
            </h3>
            <p className="text-xs text-violet-300/80">
              Start {day.startTime}
              {day.startLabel ? ` · ${day.startLabel}` : ''} · {day.transportMode}
            </p>
            <ol className="mt-3 space-y-2">
              {day.schedule?.stops.map((stop) => (
                <li key={`${stop.placeId}-${stop.arrive}`}>
                  <span className="text-violet-300/80">
                    {stop.arrive}–{stop.depart}
                  </span>{' '}
                  {stop.name}
                </li>
              )) ??
                day.places.map((p) => <li key={p.id}>{p.name}</li>)}
            </ol>
          </section>
          <section className="min-h-[280px] overflow-hidden rounded-xl border border-violet-500/25">
            <TripMap
              places={day.places.map((p) => ({
                id: p.id,
                name: p.name,
                address: p.address,
                lat: p.lat,
                lng: p.lng,
                source: p.source,
              }))}
            />
          </section>
        </div>
      ) : null}
    </div>
  );
}
