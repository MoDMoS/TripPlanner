import { useEffect, useRef } from 'react';
import {
  LngLatBounds,
  Map,
  Marker,
  NavigationControl,
  Popup,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { TripPlace } from '../api';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

type Props = {
  places: TripPlace[];
  focus?: { lat: number; lng: number } | null;
  onSelectPlace?: (place: TripPlace) => void;
  mapRef?: (map: Map | null) => void;
};

export function TripMap({ places, focus, onSelectPlace, mapRef }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<Map | null>(null);
  const markers = useRef<Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapInstance.current) return;
    const map = new Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [100.5018, 13.7563],
      zoom: 5,
      // Needed later for DOCX canvas capture
      preserveDrawingBuffer: true,
    } as ConstructorParameters<typeof Map>[0]);
    map.addControl(new NavigationControl(), 'top-right');
    mapInstance.current = map;
    mapRef?.(map);
    return () => {
      mapRef?.(null);
      map.remove();
      mapInstance.current = null;
    };
  }, [mapRef]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    markers.current.forEach((m) => m.remove());
    markers.current = places.map((place) => {
      const marker = new Marker({ color: '#0ea5e9' })
        .setLngLat([place.lng, place.lat])
        .setPopup(
          new Popup({ offset: 16 }).setHTML(
            `<strong>${place.name}</strong><br/>${place.address ?? ''}`,
          ),
        )
        .addTo(map);
      marker.getElement().addEventListener('click', () => onSelectPlace?.(place));
      return marker;
    });
    if (places.length === 1) {
      map.flyTo({ center: [places[0].lng, places[0].lat], zoom: 14 });
    } else if (places.length > 1) {
      const bounds = new LngLatBounds();
      places.forEach((p) => bounds.extend([p.lng, p.lat]));
      map.fitBounds(bounds, { padding: 48, maxZoom: 14 });
    }
  }, [places, onSelectPlace]);

  useEffect(() => {
    if (!focus || !mapInstance.current) return;
    mapInstance.current.flyTo({ center: [focus.lng, focus.lat], zoom: 14 });
  }, [focus]);

  return <div ref={containerRef} className="h-full min-h-[320px] w-full rounded-xl" />;
}
