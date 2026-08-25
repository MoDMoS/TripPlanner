import { useEffect, useRef, useState } from 'react';
import {
  LngLatBounds,
  Map,
  Marker,
  NavigationControl,
  Popup,
  type StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { TripPlace } from '../api';

/**
 * Raster basemap (Carto Voyager) — closer to light Google Maps and more reliable
 * than OpenFreeMap vector styles when planet tiles fail (blank cream canvas).
 */
const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    },
  },
  layers: [{ id: 'carto', type: 'raster', source: 'carto' }],
};

/** Beyond this span (~90 km), fitBounds becomes unreadable — zoom to a city instead. */
const MAX_FIT_SPAN_DEG = 0.8;

type Props = {
  places: TripPlace[];
  focus?: { lat: number; lng: number } | null;
  onSelectPlace?: (place: TripPlace) => void;
  mapRef?: (map: Map | null) => void;
};

function placesSpanTooLarge(places: TripPlace[]) {
  if (places.length < 2) return false;
  const bounds = new LngLatBounds();
  for (const p of places) bounds.extend([p.lng, p.lat]);
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  return (
    Math.abs(ne.lat - sw.lat) > MAX_FIT_SPAN_DEG ||
    Math.abs(ne.lng - sw.lng) > MAX_FIT_SPAN_DEG
  );
}

function framePlaces(map: Map, places: TripPlace[]) {
  if (places.length === 0) return;

  if (places.length === 1) {
    map.flyTo({
      center: [places[0].lng, places[0].lat],
      zoom: 14,
      essential: true,
    });
    return;
  }

  const bounds = new LngLatBounds();
  for (const p of places) bounds.extend([p.lng, p.lat]);

  if (placesSpanTooLarge(places)) {
    const target = places[places.length - 1];
    map.flyTo({
      center: [target.lng, target.lat],
      zoom: 13,
      essential: true,
    });
    return;
  }

  map.fitBounds(bounds, {
    padding: 56,
    maxZoom: 15,
    minZoom: 11,
    essential: true,
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function buildMarkers(
  map: Map,
  places: TripPlace[],
  onSelectPlace?: (place: TripPlace) => void,
) {
  return places.map((place) => {
    const marker = new Marker({ color: '#ea4335' })
      .setLngLat([place.lng, place.lat])
      .setPopup(
        new Popup({ offset: 16, maxWidth: '260px' }).setHTML(
          `<strong>${escapeHtml(place.name)}</strong>${
            place.address
              ? `<br/><span style="color:#555">${escapeHtml(place.address)}</span>`
              : ''
          }`,
        ),
      )
      .addTo(map);
    marker.getElement().style.cursor = 'pointer';
    marker.getElement().addEventListener('click', () => onSelectPlace?.(place));
    return marker;
  });
}

function whenMapReady(map: Map, fn: () => void) {
  if (map.loaded()) fn();
  else map.once('load', fn);
}

export function TripMap({ places, focus, onSelectPlace, mapRef }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<Map | null>(null);
  const markers = useRef<Marker[]>([]);
  const mapRefCb = useRef(mapRef);
  const placesRef = useRef(places);
  const onSelectRef = useRef(onSelectPlace);
  const [mapError, setMapError] = useState<string | null>(null);

  mapRefCb.current = mapRef;
  placesRef.current = places;
  onSelectRef.current = onSelectPlace;

  useEffect(() => {
    if (!containerRef.current || mapInstance.current) return;

    let cancelled = false;
    const map = new Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [100.5018, 13.7563],
      zoom: 11,
      // Needed for DOCX canvas capture
      preserveDrawingBuffer: true,
    } as ConstructorParameters<typeof Map>[0]);

    map.addControl(new NavigationControl({ visualizePitch: false }), 'top-right');

    map.on('error', (e) => {
      const msg = e.error?.message || 'map error';
      // Ignore benign tile 404s at high zoom; surface hard failures.
      if (/failed to fetch|ajax|network|webgl/i.test(msg)) {
        setMapError(msg);
      }
    });

    whenMapReady(map, () => {
      if (cancelled) return;
      map.resize();
      markers.current.forEach((m) => m.remove());
      markers.current = buildMarkers(map, placesRef.current, (p) =>
        onSelectRef.current?.(p),
      );
      framePlaces(map, placesRef.current);
    });

    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(containerRef.current);

    mapInstance.current = map;
    mapRefCb.current?.(map);

    return () => {
      cancelled = true;
      ro.disconnect();
      mapRefCb.current?.(null);
      markers.current.forEach((m) => m.remove());
      markers.current = [];
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    whenMapReady(map, () => {
      markers.current.forEach((m) => m.remove());
      markers.current = buildMarkers(map, places, onSelectPlace);
      if (!focus) framePlaces(map, places);
    });
  }, [places, onSelectPlace, focus]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!focus || !map) return;
    whenMapReady(map, () => {
      map.flyTo({
        center: [focus.lng, focus.lat],
        zoom: 15,
        essential: true,
      });
    });
  }, [focus]);

  const farApart = placesSpanTooLarge(places);

  return (
    <div className="relative h-full min-h-[320px] w-full">
      <div ref={containerRef} className="h-full min-h-[320px] w-full rounded-xl" />
      {mapError ? (
        <p className="absolute left-3 right-3 top-3 rounded-lg bg-rose-950/90 px-3 py-2 text-xs text-rose-200">
          โหลดแผนที่ไม่สำเร็จ: {mapError}
        </p>
      ) : null}
      {farApart ? (
        <p className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-lg bg-slate-950/80 px-3 py-2 text-xs text-amber-200">
          สถานที่อยู่คนละเมือง — กด Focus ที่รายการเพื่อดูถนนระดับเมือง
        </p>
      ) : null}
    </div>
  );
}
