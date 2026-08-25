import { useState } from 'react';
import type { Map } from 'maplibre-gl';
import { api, type Trip } from '../api';
import { TripMap } from '../map/TripMap';

type Props = {
  trip: Trip;
  onBack: () => void;
};

export function StepExport({ trip, onBack }: Props) {
  const [map, setMap] = useState<Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      let mapPngBase64: string | undefined;
      try {
        mapPngBase64 = map?.getCanvas().toDataURL('image/png');
      } catch {
        mapPngBase64 = undefined;
      }
      await api.exportDocx(trip.id, mapPngBase64);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'export failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm"
          onClick={onBack}
        >
          ← Preview
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40"
          onClick={() => void download()}
        >
          Download .docx
        </button>
      </div>
      <p className="text-sm text-slate-400">
        Map snapshot is attached when the browser allows canvas capture; otherwise the
        document still exports with the text itinerary.
      </p>
      <div className="h-64 overflow-hidden rounded-xl border border-slate-700">
        <TripMap places={trip.places ?? []} mapRef={setMap} />
      </div>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
    </div>
  );
}
