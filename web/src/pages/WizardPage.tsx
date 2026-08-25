import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type Trip } from '../api';
import { useAuth } from '../auth';
import { StepDays } from '../wizard/StepDays';
import { StepExport } from '../wizard/StepExport';
import { StepPlaces } from '../wizard/StepPlaces';
import { StepPreview } from '../wizard/StepPreview';
import { StepSchedule } from '../wizard/StepSchedule';
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
    return <p className="p-8 text-violet-300/80">{error ?? 'Loading trip…'}</p>;
  }

  const step = trip.wizardStep || 1;

  return (
    <WizardShell step={step} title={trip.name}>
      <div className="mb-4">
        <Link to="/" className="text-sm text-violet-300">
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
      ) : step === 3 ? (
        <StepSchedule
          trip={trip}
          onChanged={refresh}
          onBack={() =>
            void api.updateTrip(trip.id, { wizardStep: 2 }).then(refresh)
          }
          onContinue={() => {
            void api
              .updateTrip(trip.id, { wizardStep: 4 })
              .then(refresh)
              .catch((err: Error) => setError(err.message));
          }}
        />
      ) : step === 4 ? (
        <StepPreview
          trip={trip}
          onBack={() =>
            void api.updateTrip(trip.id, { wizardStep: 3 }).then(refresh)
          }
          onContinue={() => {
            void api
              .updateTrip(trip.id, { wizardStep: 5 })
              .then(refresh)
              .catch((err: Error) => setError(err.message));
          }}
        />
      ) : (
        <StepExport
          trip={trip}
          onBack={() =>
            void api.updateTrip(trip.id, { wizardStep: 4 }).then(refresh)
          }
        />
      )}
      {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}
    </WizardShell>
  );
}
