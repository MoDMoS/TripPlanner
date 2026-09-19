# Step 2 — Unassigned: once vs reusable

อัปเดต: 2026-09-20  
Status: Implemented

## Goal

Split Organize Days **Unassigned** into two pools so a place can be reused across days after it has been used once.

## Behavior

| Pool | Contents | After assign to a day |
|------|----------|------------------------|
| **ใช้ครั้งเดียว** | Places not on any day | Leaves this pool; appears in reusable |
| **ใช้ซ้ำได้** | Places on ≥ 1 day | Can assign to other days that do not already include it |

- Reusable starts empty.
- Remove from the last day that uses a place → place returns to **ใช้ครั้งเดียว**.
- Day buttons hide for days that already have that place.

## Scope

- UI: `web/src/wizard/StepDays.tsx` only (API already allows same `placeId` on different days via `@@unique([dayId, placeId])`).
- No full cross-column DnD in this change.
