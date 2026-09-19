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
import { api, type Trip, type TripDay, type TripPlace } from '../api';

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
      className="flex items-center justify-between rounded-lg border border-violet-500/30 bg-violet-950/50 px-3 py-2 text-sm"
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

function PlaceAssignCard({
  place,
  days,
  busy,
  onAssign,
}: {
  place: TripPlace;
  days: TripDay[];
  busy: boolean;
  onAssign: (dayId: string) => void;
}) {
  const dayIdsWithPlace = useMemo(() => {
    const ids = new Set<string>();
    for (const day of days) {
      if (day.places?.some((row) => row.placeId === place.id)) {
        ids.add(day.id);
      }
    }
    return ids;
  }, [days, place.id]);

  const targets = days.filter((day) => !dayIdsWithPlace.has(day.id));

  return (
    <li className="rounded-lg border border-violet-500/25 p-2">
      <div className="font-medium">{place.name}</div>
      {targets.length ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {targets.map((day) => (
            <button
              key={day.id}
              type="button"
              disabled={busy}
              className="rounded bg-violet-900/70 px-2 py-1 text-xs text-violet-300 disabled:opacity-40"
              onClick={() => onAssign(day.id)}
            >
              → Day {day.dayNumber}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-xs text-violet-400/70">อยู่ในทุกวันแล้ว</p>
      )}
    </li>
  );
}

export function StepDays({ trip, onChanged, onBack, onContinue }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor));
  const days = trip.days ?? [];
  const places = trip.places ?? [];

  const assignedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const day of days) {
      for (const row of day.places ?? []) ids.add(row.placeId);
    }
    return ids;
  }, [days]);

  /** Not on any day yet — exclusive pool */
  const onceOnly = useMemo(
    () => places.filter((p) => !assignedIds.has(p.id)),
    [places, assignedIds],
  );

  /** On ≥1 day — reusable on other days */
  const reusable = useMemo(
    () => places.filter((p) => assignedIds.has(p.id)),
    [places, assignedIds],
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

  async function assignToDay(placeId: string, dayId: string) {
    setBusy(true);
    setError(null);
    try {
      await api.assignPlaceToDay(trip.id, dayId, placeId);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'assign failed');
    } finally {
      setBusy(false);
    }
  }

  async function onDragEnd(dayId: string, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const day = days.find((d) => d.id === dayId);
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

  const canContinue = days.some((d) => d.places.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-violet-500/25 px-3 py-2 text-sm"
          onClick={onBack}
        >
          ← Places
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-lg bg-violet-500 px-3 py-2 text-sm font-semibold text-violet-950"
          onClick={() => void addDay()}
        >
          + Add day
        </button>
        <button
          type="button"
          disabled={!canContinue}
          className="rounded-lg bg-violet-500 px-3 py-2 text-sm font-semibold text-violet-950 disabled:opacity-40"
          onClick={onContinue}
        >
          Continue to schedule →
        </button>
      </div>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[260px_repeat(auto-fit,minmax(220px,1fr))]">
        <div className="space-y-4">
          <section className="rounded-xl border border-violet-500/25 bg-violet-950/40 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-violet-300/80">
              ใช้ครั้งเดียว
            </h2>
            <p className="mt-1 text-[11px] text-violet-400/70">
              ยังไม่ได้อยู่ในวันใด — ใส่แล้วจะย้ายไป「ใช้ซ้ำได้」
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {onceOnly.map((place) => (
                <PlaceAssignCard
                  key={place.id}
                  place={place}
                  days={days}
                  busy={busy}
                  onAssign={(dayId) => void assignToDay(place.id, dayId)}
                />
              ))}
              {!onceOnly.length ? (
                <li className="text-xs text-violet-400">ว่าง</li>
              ) : null}
            </ul>
          </section>

          <section className="rounded-xl border border-violet-400/30 bg-violet-950/40 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-violet-300/80">
              ใช้ซ้ำได้
            </h2>
            <p className="mt-1 text-[11px] text-violet-400/70">
              อยู่ในอย่างน้อย 1 วัน — ใส่วันอื่นได้อีก
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {reusable.map((place) => (
                <PlaceAssignCard
                  key={place.id}
                  place={place}
                  days={days}
                  busy={busy}
                  onAssign={(dayId) => void assignToDay(place.id, dayId)}
                />
              ))}
              {!reusable.length ? (
                <li className="text-xs text-violet-400">ว่าง — ใส่จาก「ใช้ครั้งเดียว」ก่อน</li>
              ) : null}
            </ul>
          </section>
        </div>

        {days.map((day) => (
          <section
            key={day.id}
            className="rounded-xl border border-violet-500/25 bg-violet-950/40 p-4"
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
                      <span className="w-5 text-xs text-violet-400">{index + 1}.</span>
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
