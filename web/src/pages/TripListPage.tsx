import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type Trip } from '../api';
import { useAuth } from '../auth';

export function TripListPage() {
  const navigate = useNavigate();
  const { user, loading, hasTripAccess } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setTrips(await api.listTrips());
  }

  useEffect(() => {
    if (!hasTripAccess) return;
    refresh().catch((err: Error) => setError(err.message));
  }, [hasTripAccess]);

  if (loading) {
    return <p className="p-8 text-violet-300/70">Loading…</p>;
  }
  if (!user) {
    const next = encodeURIComponent(
      `${window.location.origin}${import.meta.env.BASE_URL}`,
    );
    return (
      <main className="p-8">
        <p className="text-violet-200/80">กรุณาเข้าสู่ระบบที่ Portal</p>
        <a className="text-violet-300" href={`/login?next=${next}`}>
          ไปหน้า Login
        </a>
      </main>
    );
  }
  if (!hasTripAccess) {
    return (
      <main className="p-8 text-violet-200/80">
        ไม่มีสิทธิ์ `service:trip-planner`
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-violet-100">Your trips</h1>
        <p className="text-sm text-violet-300/70">{user.name}</p>
      </div>

      <form
        className="mb-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void api
            .createTrip({ name: name.trim() || 'Untitled trip' })
            .then(async (trip) => {
              setName('');
              await refresh();
              navigate(`/trips/${trip.id}`);
            })
            .catch((err: Error) => setError(err.message));
        }}
      >
        <input
          className="flex-1 rounded-lg border border-violet-500/30 bg-violet-950/40 px-3 py-2 text-violet-100 placeholder:text-violet-400/50"
          placeholder="Trip name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-lg bg-violet-500 px-4 py-2 font-semibold text-violet-950 hover:bg-violet-400"
        >
          New trip
        </button>
      </form>

      {error ? <p className="mb-4 text-rose-400">{error}</p> : null}

      <ul className="space-y-3">
        {trips.map((trip) => (
          <li key={trip.id}>
            <Link
              to={`/trips/${trip.id}`}
              className="block rounded-xl border border-violet-500/25 bg-violet-950/35 p-4 hover:border-violet-400/45"
            >
              <div className="font-semibold text-violet-100">{trip.name}</div>
              <div className="text-xs text-violet-300/70">
                {trip.places?.length ?? 0} places · step {trip.wizardStep}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
