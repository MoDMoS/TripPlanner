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

export type Trip = {
  id: string;
  name: string;
  destination?: string | null;
  wizardStep: number;
  places: TripPlace[];
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
