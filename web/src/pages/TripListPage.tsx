import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type Trip } from '../api';
import { useAuth } from '../auth';

export function TripListPage() {
  const navigate = useNavigate();
  const { user, loading, hasTripAccess, logout } = useAuth();
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
    return <p className="p-8 text-slate-300">Loading…</p>;
  }
  if (!user) {
    return (
      <main className="p-8">
        <p className="text-slate-300">กรุณาเข้าสู่ระบบที่ Portal</p>
        <a className="text-sky-400" href="/login">
          ไปหน้า Login
        </a>
      </main>
    );
  }
  if (!hasTripAccess) {
    return (
      <main className="p-8 text-slate-300">
        ไม่มีสิทธิ์ `service:trip-planner`
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-50">Your trips</h1>
          <p className="text-sm text-slate-400">{user.name}</p>
        </div>
        <button type="button" className="text-sm text-slate-400" onClick={() => void logout()}>
          Logout
        </button>
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
          className="flex-1 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2"
          placeholder="Trip name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-lg bg-sky-500 px-4 py-2 font-semibold text-slate-950"
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
              className="block rounded-xl border border-slate-700 bg-slate-900/70 p-4 hover:border-sky-500/50"
            >
              <div className="font-semibold text-slate-50">{trip.name}</div>
              <div className="text-xs text-slate-400">
                {trip.places?.length ?? 0} places · step {trip.wizardStep}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
