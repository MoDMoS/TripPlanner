import { useEffect, useMemo, useState } from 'react';
import { api, type SearchHit, type Trip, type TripPlace } from '../api';
import { TripMap } from '../map/TripMap';

type Props = {
  trip: Trip;
  onChanged: () => Promise<void>;
  onContinue: () => void;
};

export function StepPlaces({ trip, onChanged, onContinue }: Props) {
  const [link, setLink] = useState('');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [preview, setPreview] = useState<SearchHit | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    const handle = window.setTimeout(() => {
      api
        .searchPlaces({ query: query.trim() })
        .then(setHits)
        .catch((err: Error) => setError(err.message));
    }, 400);
    return () => window.clearTimeout(handle);
  }, [query]);

  const places = trip.places ?? [];

  async function resolveLink() {
    setBusy(true);
    setError(null);
    try {
      const resolved = await api.resolveLink(link.trim());
      setPreview({
        name: resolved.name,
        address: resolved.address,
        lat: resolved.lat,
        lng: resolved.lng,
        source: 'osm',
      });
      setFocus({ lat: resolved.lat, lng: resolved.lng });
      await api.addPlace(trip.id, {
        name: resolved.name,
        address: resolved.address,
        lat: resolved.lat,
        lng: resolved.lng,
        source: 'gmaps',
        sourceUrl: resolved.sourceUrl,
      });
      setLink('');
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'resolve failed');
    } finally {
      setBusy(false);
    }
  }

  async function addHit(hit: SearchHit) {
    setBusy(true);
    setError(null);
    try {
      await api.addPlace(trip.id, {
        name: hit.name,
        address: hit.address,
        lat: hit.lat,
        lng: hit.lng,
        source: 'osm',
        category: hit.category,
      });
      setFocus({ lat: hit.lat, lng: hit.lng });
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'add failed');
    } finally {
      setBusy(false);
    }
  }

  async function removePlace(place: TripPlace) {
    setBusy(true);
    try {
      await api.removePlace(trip.id, place.id);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'remove failed');
    } finally {
      setBusy(false);
    }
  }

  const canContinue = places.length > 0;

  const mapPlaces = useMemo(() => places, [places]);

  return (
    <div className="grid min-h-[70vh] gap-4 lg:grid-cols-[280px_minmax(0,1fr)_260px]">
      <aside className="space-y-4 rounded-xl border border-violet-200 bg-white/85 p-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-violet-600/80">
            Google Maps link
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://maps.app.goo.gl/..."
          />
          <button
            type="button"
            disabled={busy || !link.trim()}
            onClick={() => void resolveLink()}
            className="mt-2 w-full rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Resolve & add
          </button>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-violet-600/80">
            Search name (OSM)
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Taipei 101"
          />
          <ul className="mt-2 max-h-56 space-y-2 overflow-auto text-sm">
            {hits.map((hit) => (
              <li
                key={`${hit.name}-${hit.lat}-${hit.lng}`}
                className="rounded-lg border border-violet-200 p-2"
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => {
                    setFocus({ lat: hit.lat, lng: hit.lng });
                    setPreview(hit);
                  }}
                >
                  <div className="font-medium text-violet-950">{hit.name}</div>
                  <div className="text-xs text-violet-600/80">{hit.address}</div>
                </button>
                <button
                  type="button"
                  className="mt-1 text-xs text-violet-700"
                  onClick={() => void addHit(hit)}
                >
                  Add to My Places
                </button>
              </li>
            ))}
          </ul>
        </div>
        {preview ? (
          <div className="rounded-lg border border-violet-200 p-3 text-sm">
            <div className="font-semibold">{preview.name}</div>
            <div className="text-xs text-violet-600/80">{preview.address}</div>
            <div className="mt-1 text-xs text-violet-500">
              {preview.lat.toFixed(5)}, {preview.lng.toFixed(5)}
            </div>
          </div>
        ) : null}
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      </aside>

      <section className="min-h-[320px] overflow-hidden rounded-xl border border-violet-200">
        <TripMap places={mapPlaces} focus={focus} />
      </section>

      <aside className="flex flex-col rounded-xl border border-violet-200 bg-white/85 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-600/80">
          My Places ({places.length})
        </h2>
        <ul className="mt-3 flex-1 space-y-2 overflow-auto text-sm">
          {places.map((place) => (
            <li key={place.id} className="rounded-lg border border-violet-200 p-2">
              <div className="font-medium">{place.name}</div>
              <div className="text-xs text-violet-600/80">{place.address}</div>
              <div className="mt-1 flex gap-2 text-xs">
                <button
                  type="button"
                  className="text-violet-700"
                  onClick={() => setFocus({ lat: place.lat, lng: place.lng })}
                >
                  Focus
                </button>
                <button
                  type="button"
                  className="text-rose-400"
                  onClick={() => void removePlace(place)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={!canContinue}
          onClick={onContinue}
          className="mt-4 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Continue to days →
        </button>
      </aside>
    </div>
  );
}
