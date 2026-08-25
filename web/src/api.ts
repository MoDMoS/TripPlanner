async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/trip-api${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      const next = encodeURIComponent(window.location.href);
      window.location.assign(`/login?next=${next}`);
      throw new Error('กรุณาเข้าสู่ระบบ');
    }
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) detail = body.message.join(', ');
      else if (body.message) detail = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(detail || `HTTP ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export type TripPlace = {
  id: string;
  name: string;
  address?: string | null;
  lat: number;
  lng: number;
  source: string;
  sourceUrl?: string | null;
  category?: string | null;
};

export type TripDayPlace = {
  id: string;
  placeId: string;
  sortOrder: number;
  stayMinutes: number;
  place: TripPlace;
};

export type TripDay = {
  id: string;
  dayNumber: number;
  title?: string | null;
  startTime?: string | null;
  startLabel?: string | null;
  startLat?: number | null;
  startLng?: number | null;
  transportMode: string;
  places: TripDayPlace[];
  legs?: TripLeg[];
};

export type TripLeg = {
  id: string;
  fromPlaceId?: string | null;
  toPlaceId?: string | null;
  durationSec: number;
  distanceM?: number | null;
  mode: string;
  isManualOverride: boolean;
  warning?: string | null;
};

export type Trip = {
  id: string;
  name: string;
  destination?: string | null;
  wizardStep: number;
  places: TripPlace[];
  days?: TripDay[];
};

export type SearchHit = {
  name: string;
  address?: string;
  lat: number;
  lng: number;
  category?: string;
  source: 'osm';
};

export type ResolvedPlace = {
  name: string;
  address?: string;
  lat: number;
  lng: number;
  source: 'gmaps';
  sourceUrl: string;
};

export const api = {
  listTrips: () => request<Trip[]>('/trips'),
  createTrip: (body: { name: string; destination?: string }) =>
    request<Trip>('/trips', { method: 'POST', body: JSON.stringify(body) }),
  getTrip: (id: string) => request<Trip>(`/trips/${id}`),
  updateTrip: (id: string, body: Partial<{ name: string; wizardStep: number }>) =>
    request<Trip>(`/trips/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  addPlace: (
    tripId: string,
    body: {
      name: string;
      address?: string;
      lat: number;
      lng: number;
      source: 'gmaps' | 'osm';
      sourceUrl?: string;
      category?: string;
    },
  ) =>
    request<TripPlace>(`/trips/${tripId}/places`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  removePlace: (tripId: string, placeId: string) =>
    request<{ ok: true }>(`/trips/${tripId}/places/${placeId}`, {
      method: 'DELETE',
    }),
  createDay: (tripId: string, title?: string) =>
    request<TripDay>(`/trips/${tripId}/days`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  deleteDay: (tripId: string, dayId: string) =>
    request<{ ok: true }>(`/trips/${tripId}/days/${dayId}`, {
      method: 'DELETE',
    }),
  setDayOrder: (tripId: string, dayId: string, placeIds: string[]) =>
    request<TripDay>(`/trips/${tripId}/days/${dayId}/order`, {
      method: 'PATCH',
      body: JSON.stringify({ placeIds }),
    }),
  assignPlaceToDay: (tripId: string, dayId: string, placeId: string) =>
    request(`/trips/${tripId}/days/${dayId}/places`, {
      method: 'POST',
      body: JSON.stringify({ placeId }),
    }),
  removePlaceFromDay: (tripId: string, dayId: string, placeId: string) =>
    request<{ ok: true }>(`/trips/${tripId}/days/${dayId}/places/${placeId}`, {
      method: 'DELETE',
    }),
  calculateDayRoute: (
    tripId: string,
    dayId: string,
    body?: {
      transportMode?: 'walk' | 'drive' | 'bike' | 'transit';
      startTime?: string;
      startLat?: number;
      startLng?: number;
    },
  ) =>
    request<{
      dayId: string;
      mode: string;
      needsManual: boolean;
      warnings: string[];
      schedule: {
        stops: Array<{
          placeId: string;
          name: string;
          arrive: string;
          depart: string;
          stayMinutes: number;
        }>;
        legs: Array<{
          fromPlaceId: string | null;
          toPlaceId: string;
          durationSec: number;
        }>;
        endTime: string;
      } | null;
    }>(`/trips/${tripId}/days/${dayId}/route/calculate`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    }),
  saveDaySchedule: (
    tripId: string,
    dayId: string,
    body: {
      startTime: string;
      startLabel?: string;
      startLat?: number;
      startLng?: number;
      transportMode: 'walk' | 'drive' | 'bike' | 'transit';
      stays: Array<{ placeId: string; stayMinutes: number }>;
      legs?: Array<{
        toPlaceId: string;
        durationSec: number;
        isManualOverride: boolean;
      }>;
      acknowledgeWarnings?: boolean;
    },
  ) =>
    request<{
      warnings: string[];
      errors: string[];
      schedule: {
        stops: Array<{
          placeId: string;
          name: string;
          arrive: string;
          depart: string;
        }>;
      };
    }>(`/trips/${tripId}/days/${dayId}/schedule`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  searchPlaces: (body: { query: string; lat?: number; lng?: number }) =>
    request<SearchHit[]>('/places/search', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  resolveLink: (url: string) =>
    request<ResolvedPlace>('/places/resolve-link', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),
};
