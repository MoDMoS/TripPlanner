import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMemo, useState } from 'react';
import { api, type Trip, type TripPlace } from '../api';

type Props = {
  trip: Trip;
  onChanged: () => Promise<void>;
  onBack: () => void;
  onContinue: () => void;
};

function SortableItem({
  id,
  label,
  onRemove,
}: {
  id: string;
  label: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm"
    >
      <button type="button" className="flex-1 text-left" {...attributes} {...listeners}>
        {label}
      </button>
      <button type="button" className="text-xs text-rose-400" onClick={onRemove}>
        Remove
      </button>
    </li>
  );
}

export function StepDays({ trip, onChanged, onBack, onContinue }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor));

  const assignedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const day of trip.days ?? []) {
      for (const row of day.places ?? []) ids.add(row.placeId);
    }
    return ids;
  }, [trip.days]);

  const unassigned: TripPlace[] = (trip.places ?? []).filter(
    (p) => !assignedIds.has(p.id),
  );

  async function addDay() {
    setBusy(true);
    try {
      await api.createDay(trip.id);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'create day failed');
    } finally {
      setBusy(false);
    }
  }

  async function onDragEnd(dayId: string, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const day = (trip.days ?? []).find((d) => d.id === dayId);
    if (!day) return;
    const ids = day.places.map((p) => p.placeId);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(ids, oldIndex, newIndex);
    setBusy(true);
    try {
      await api.setDayOrder(trip.id, dayId, next);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'reorder failed');
    } finally {
      setBusy(false);
    }
  }

  const canContinue = (trip.days ?? []).some((d) => d.places.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-violet-200 px-3 py-2 text-sm"
          onClick={onBack}
        >
          ← Places
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white"
          onClick={() => void addDay()}
        >
          + Add day
        </button>
        <button
          type="button"
          disabled={!canContinue}
          className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
          onClick={onContinue}
        >
          Continue to schedule →
        </button>
      </div>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[240px_repeat(auto-fit,minmax(220px,1fr))]">
        <section className="rounded-xl border border-violet-200 bg-white/85 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-violet-600/80">
            Unassigned
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {unassigned.map((place) => (
              <li key={place.id} className="rounded-lg border border-violet-200 p-2">
                <div className="font-medium">{place.name}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(trip.days ?? []).map((day) => (
                    <button
                      key={day.id}
                      type="button"
                      className="rounded bg-violet-100 px-2 py-1 text-xs text-violet-700"
                      onClick={() =>
                        void api
                          .assignPlaceToDay(trip.id, day.id, place.id)
                          .then(onChanged)
                          .catch((err: Error) => setError(err.message))
                      }
                    >
                      → Day {day.dayNumber}
                    </button>
                  ))}
                </div>
              </li>
            ))}
            {!unassigned.length ? (
              <li className="text-xs text-violet-500">All places assigned</li>
            ) : null}
          </ul>
        </section>

        {(trip.days ?? []).map((day) => (
          <section
            key={day.id}
            className="rounded-xl border border-violet-200 bg-white/85 p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">
                {day.title || `Day ${day.dayNumber}`}
              </h2>
              <button
                type="button"
                className="text-xs text-rose-400"
                onClick={() =>
                  void api
                    .deleteDay(trip.id, day.id)
                    .then(onChanged)
                    .catch((err: Error) => setError(err.message))
                }
              >
                Delete
              </button>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => void onDragEnd(day.id, event)}
            >
              <SortableContext
                items={day.places.map((p) => p.placeId)}
                strategy={verticalListSortingStrategy}
              >
                <ol className="space-y-2">
                  {day.places.map((row, index) => (
                    <div key={row.placeId} className="flex items-center gap-2">
                      <span className="w-5 text-xs text-violet-500">{index + 1}.</span>
                      <div className="flex-1">
                        <SortableItem
                          id={row.placeId}
                          label={row.place.name}
                          onRemove={() =>
                            void api
                              .removePlaceFromDay(trip.id, day.id, row.placeId)
                              .then(onChanged)
                              .catch((err: Error) => setError(err.message))
                          }
                        />
                      </div>
                    </div>
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          </section>
        ))}
      </div>
    </div>
  );
}
