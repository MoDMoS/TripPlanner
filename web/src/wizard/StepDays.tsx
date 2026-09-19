import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
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
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type Trip, type TripDay, type TripPlace } from '../api';

type Props = {
  trip: Trip;
  onChanged: () => Promise<void>;
  onBack: () => void;
  onContinue: () => void;
};

const OPEN_KEY = 'trip-days-pool-open';

function readOpen() {
  try {
    const raw = localStorage.getItem(OPEN_KEY);
    if (!raw) return { reusable: true, once: true };
    return JSON.parse(raw) as { reusable: boolean; once: boolean };
  } catch {
    return { reusable: true, once: true };
  }
}

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

function DraggablePlace({
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
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: `place:${place.id}`, data: { placeId: place.id } });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const dayIdsWithPlace = useMemo(() => {
    const ids = new Set<string>();
    for (const day of days) {
      if (day.places?.some((row) => row.placeId === place.id)) ids.add(day.id);
    }
    return ids;
  }, [days, place.id]);

  const targets = days.filter((day) => !dayIdsWithPlace.has(day.id));

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-violet-500/25 bg-violet-950/50 p-2 ${
        isDragging ? 'opacity-60 ring-1 ring-violet-400' : ''
      }`}
    >
      <button
        type="button"
        className="w-full cursor-grab text-left font-medium active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        {place.name}
      </button>
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

function PoolBlock({
  id,
  title,
  hint,
  open,
  onToggle,
  emptyText,
  children,
  itemCount,
}: {
  id: 'pool:reusable' | 'pool:once';
  title: string;
  hint: string;
  open: boolean;
  onToggle: () => void;
  emptyText: string;
  children: ReactNode;
  itemCount: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <section
      ref={setNodeRef}
      className={`rounded-xl border p-4 ${
        isOver
          ? 'border-violet-400 bg-violet-900/40'
          : 'border-violet-500/25 bg-violet-950/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-violet-300/80">
            {title}
          </h2>
          <p className="mt-1 text-[11px] text-violet-400/70">{hint}</p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded border border-violet-500/30 px-2 py-1 text-xs text-violet-300"
          onClick={onToggle}
          aria-expanded={open}
        >
          {open ? 'ปิด' : 'เปิด'}
        </button>
      </div>
      {open ? (
        <ul className="mt-3 min-h-[48px] space-y-2 text-sm">
          {children}
          {!itemCount ? <li className="text-xs text-violet-400">{emptyText}</li> : null}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-violet-400/60">ย่อไว้ · {itemCount} รายการ</p>
      )}
    </section>
  );
}

function DayDropColumn({
  day,
  sensors,
  tripId,
  busy,
  onChanged,
  setError,
  onReorder,
}: {
  day: TripDay;
  sensors: ReturnType<typeof useSensors>;
  tripId: string;
  busy: boolean;
  onChanged: () => Promise<void>;
  setError: (msg: string | null) => void;
  onReorder: (dayId: string, event: DragEndEvent) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day:${day.id}`,
    data: { dayId: day.id },
  });

  return (
    <section
      ref={setNodeRef}
      className={`rounded-xl border p-4 ${
        isOver
          ? 'border-violet-400 bg-violet-900/40'
          : 'border-violet-500/25 bg-violet-950/40'
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{day.title || `Day ${day.dayNumber}`}</h2>
        <button
          type="button"
          className="text-xs text-rose-400"
          disabled={busy}
          onClick={() =>
            void api
              .deleteDay(tripId, day.id)
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
        onDragEnd={(event) => onReorder(day.id, event)}
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
                        .removePlaceFromDay(tripId, day.id, row.placeId)
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
      {!day.places.length ? (
        <p className="mt-2 text-xs text-violet-400/70">ลากสถานที่มาวางที่นี่</p>
      ) : null}
    </section>
  );
}

export function StepDays({ trip, onChanged, onBack, onContinue }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(readOpen);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const days = trip.days ?? [];
  const places = trip.places ?? [];

  useEffect(() => {
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify(open));
    } catch {
      /* ignore */
    }
  }, [open]);

  const assignedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const day of days) {
      for (const row of day.places ?? []) ids.add(row.placeId);
    }
    return ids;
  }, [days]);

  const onceOnly = useMemo(
    () => places.filter((p) => !p.allowReuse && !assignedIds.has(p.id)),
    [places, assignedIds],
  );

  const reusable = useMemo(
    () => places.filter((p) => Boolean(p.allowReuse) || assignedIds.has(p.id)),
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

  async function setAllowReuse(placeId: string, allowReuse: boolean) {
    setBusy(true);
    setError(null);
    try {
      await api.updatePlace(trip.id, placeId, { allowReuse });
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'update failed');
    } finally {
      setBusy(false);
    }
  }

  async function onPoolDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const placeId = String(active.id).replace(/^place:/, '');
    if (!placeId || active.id === over.id) return;
    const overId = String(over.id);

    if (overId === 'pool:reusable') {
      await setAllowReuse(placeId, true);
      return;
    }
    if (overId === 'pool:once') {
      await setAllowReuse(placeId, false);
      return;
    }
    if (overId.startsWith('day:')) {
      await assignToDay(placeId, overId.slice(4));
    }
  }

  async function onDayReorder(dayId: string, event: DragEndEvent) {
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => void onPoolDragEnd(event)}
      >
        <div className="grid gap-4 lg:grid-cols-[280px_repeat(auto-fit,minmax(220px,1fr))]">
          <div className="space-y-4">
            <PoolBlock
              id="pool:reusable"
              title="ใช้ซ้ำได้"
              hint="ลากจาก「ใช้ครั้งเดียว」มาวางที่นี่ หรือใส่วันแล้วจะโผล่เอง"
              open={open.reusable}
              onToggle={() =>
                setOpen((prev) => ({ ...prev, reusable: !prev.reusable }))
              }
              emptyText="ว่าง — ลากจาก「ใช้ครั้งเดียว」มาวาง"
              itemCount={reusable.length}
            >
              {reusable.map((place) => (
                <DraggablePlace
                  key={place.id}
                  place={place}
                  days={days}
                  busy={busy}
                  onAssign={(dayId) => void assignToDay(place.id, dayId)}
                />
              ))}
            </PoolBlock>

            <PoolBlock
              id="pool:once"
              title="ใช้ครั้งเดียว"
              hint="สถานที่ใหม่ — ลากไป「ใช้ซ้ำได้」หรือไปวางที่วัน"
              open={open.once}
              onToggle={() => setOpen((prev) => ({ ...prev, once: !prev.once }))}
              emptyText="ว่าง"
              itemCount={onceOnly.length}
            >
              {onceOnly.map((place) => (
                <DraggablePlace
                  key={place.id}
                  place={place}
                  days={days}
                  busy={busy}
                  onAssign={(dayId) => void assignToDay(place.id, dayId)}
                />
              ))}
            </PoolBlock>
          </div>

          {days.map((day) => (
            <DayDropColumn
              key={day.id}
              day={day}
              sensors={sensors}
              tripId={trip.id}
              busy={busy}
              onChanged={onChanged}
              setError={setError}
              onReorder={(dayId, event) => void onDayReorder(dayId, event)}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
