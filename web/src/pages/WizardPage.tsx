import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type Trip } from '../api';
import { useAuth } from '../auth';
import { StepDays } from '../wizard/StepDays';
import { StepPlaces } from '../wizard/StepPlaces';
import { WizardShell } from '../wizard/WizardShell';

export function WizardPage() {
  const { id } = useParams();
  const { loading, hasTripAccess } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setTrip(await api.getTrip(id));
  }, [id]);

  useEffect(() => {
    if (!hasTripAccess || !id) return;
    refresh().catch((err: Error) => setError(err.message));
  }, [hasTripAccess, id, refresh]);

  if (loading || !trip) {
    return <p className="p-8 text-slate-300">{error ?? 'Loading trip…'}</p>;
  }

  const step = trip.wizardStep || 1;

  return (
    <WizardShell step={step} title={trip.name}>
      <div className="mb-4">
        <Link to="/" className="text-sm text-sky-400">
          ← All trips
        </Link>
      </div>
      {step <= 1 ? (
        <StepPlaces
          trip={trip}
          onChanged={refresh}
          onContinue={() => {
            void api
              .updateTrip(trip.id, { wizardStep: 2 })
              .then(refresh)
              .catch((err: Error) => setError(err.message));
          }}
        />
      ) : step === 2 ? (
        <StepDays
          trip={trip}
          onChanged={refresh}
          onBack={() =>
            void api.updateTrip(trip.id, { wizardStep: 1 }).then(refresh)
          }
          onContinue={() => {
            void api
              .updateTrip(trip.id, { wizardStep: 3 })
              .then(refresh)
              .catch((err: Error) => setError(err.message));
          }}
        />
      ) : (
        <div className="rounded-xl border border-slate-700 p-6 text-slate-300">
          <p>Step {step} UI comes in later milestones.</p>
          <button
            type="button"
            className="mt-4 text-sky-400"
            onClick={() =>
              void api.updateTrip(trip.id, { wizardStep: 2 }).then(refresh)
            }
          >
            Back to days
          </button>
          {error ? <p className="mt-2 text-rose-400">{error}</p> : null}
        </div>
      )}
    </WizardShell>
  );
}
