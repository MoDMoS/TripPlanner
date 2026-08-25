# TripPlanner — Multi-step Itinerary Wizard (Zero API Cost) — Design

Date: 2026-08-25  
Status: Implemented  
อัปเดต: 2026-08-26

## Goal

1. Build **TripPlanner** as the 5th MoDMoS sibling app: a wizard for planning multi-day travel itineraries.  
2. Operate at **zero paid API cost** — no Google Maps/Places/Routes billing, no Mapbox paid APIs, no OpenAI, no “free tier that requires a credit card.”  
3. Let users add places via **Google Maps share links** and/or **OSM name search**, organize by day, schedule with travel times, preview, and export **`.docx`**.

## Context

- MoDMoS ecosystem: Portal (SSO issuer) + Investment + Gold_agent + Discord bot. Shared JWT cookie `access_token`, permission strings `service:*`.  
- `d:\Codeing\Project\TripPlanner` is currently empty (no git, no code).  
- No existing map/geo/docx utilities in sibling repos. Closest patterns: Gold (`api/` + `web/` + PM2), Investment (Tailwind, ledger user upsert from JWT).  
- Audience: small public app (tens–low hundreds of users). VPS is small (~2–4GB RAM) — no room to self-host Nominatim/OSRM on day one.

## Approach (approved)

```
Portal SSO (service:trip-planner)
        │
        ▼
TripPlanner SPA (/trip/)  ←→  Nest API (/trip-api/)  ←→  Postgres DB `tripplanner` (Portal cluster :5433)
        │
        ├─ Step 1  Places: Google Maps link resolve OR Photon search → My Places
        ├─ Step 2  Days: assign / reorder (drag-drop)
        ├─ Step 3  Schedule: start time + stay; OSRM for walk/drive/bike; transit = manual duration
        ├─ Step 4  Preview
        └─ Step 5  Export DOCX (+ optional MapLibre canvas PNG)
```

External (keyless, no billing), behind provider abstractions + DB cache:

| Need | Provider (Phase 1) | Phase 2 |
|------|--------------------|---------|
| Map tiles | OpenFreeMap (MapLibre GL JS) | Self-host tiles |
| Name search | Photon | Self-host Photon/Nominatim |
| Reverse/structured geocode | Nominatim (never on keystroke path) | Self-host Nominatim (country extracts) |
| Routing walk/drive/bike | FOSSGIS OSRM (+ Valhalla optional) | Self-host OSRM |
| Transit routing | **None** — user enters duration | Optional OpenTripPlanner later |
| DOCX | `docx` npm (MIT) | — |
| Map image in DOCX | Client canvas capture; text route list if capture fails | — |

## Locked decisions

### 1. Placement & stack

- **New sibling repo** at `TripPlanner/` (not a Portal module).  
- Backend: NestJS + Prisma + PostgreSQL under `api/`.  
- Frontend: Vite + React 19 + React Router + **Tailwind CSS 4** under `web/`.  
- Auth: verify Portal cookie; require `service:trip-planner`. Upsert local `User` from JWT `sub` (Investment-style).  
- DB: database named `tripplanner` on **existing Portal Postgres :5433** (no 4th Postgres container).  
- Deploy: **PM2** API + nginx static `/trip/` (Gold-style). Proposed API port **3003**, proxy `/trip-api/`.  
- Wire into Portal launcher + RBAC permission catalog + `deploy-all.sh` + ecosystem docs.

### 2. Zero-cost rule

- No paid third-party APIs. No Google Places / Routes / Geocoding API keys.  
- Google Maps **links** are allowed only as **user-supplied URLs**: server follows redirects and parses the final URL — **no HTML scraping** of Google pages, no Places API.  
- Prefer OSM-family open services; design provider interfaces so public endpoints can be swapped for self-hosted instances without rewriting business logic.

### 3. Place discovery (no recommendations)

- **Removed:** recommendation engine, popularity scores, Overpass “nearby recommended,” Wikimedia ranking, star ratings UI.  
- **Primary:** paste Google Maps short/full link → resolve → preview card → add to My Places.  
- **Secondary:** Photon name search → focus map → add.  
- Map: MapLibre + OpenFreeMap; markers for selected places; click marker for details; add/remove; duplicate prevention (near coords + similar name).  
- Attribution required in UI and DOCX (© OpenStreetMap contributors; Wikipedia only if ever used — v1 does not use pageviews).

### 4. Google Maps link resolve

- `PlaceLinkResolveService`: allowlist hostnames (`maps.app.goo.gl`, `goo.gl`, `www.google.com`, `maps.google.com`, etc.), max redirects, timeout, identifying User-Agent.  
- Parse final URL for name, lat/lng, optional place id.  
- If address missing: Nominatim reverse geocode (rate-limited + cached).  
- On failure: clear error + suggest full URL or OSM search.  
- Persist snapshot on the trip place row (`source=gmaps`, `sourceUrl`).

### 5. Days & order

- Create Day 1…N; assign places; move between days; remove from day; drag-and-drop reorder within day.  
- Persisted order is authoritative for routing and export.

### 6. Routing & schedule

- Modes: **walk / drive / bike** → OSRM (matrix `/table` preferred); cache in `RouteCache`.  
- Mode **transit**: **no auto route** — user must enter travel duration per leg; UI labels it as user-defined.  
- Per day: start location, start time, transport mode, stay duration per stop.  
- Auto-compute arrive/depart/end + totals for non-transit (and for transit using manual legs).  
- Manual override of any computed travel duration (`isManualOverride`).  
- Recalculate only when order/mode/start changes — not on every keystroke.  
- If routing fails: warn and require manual duration (same UX as transit).

### 7. Validation

- Soft/hard rules: B cannot start before arrival from A; end ≥ start; overlap detection; insufficient travel window warning.  
- Warnings do not auto-fix the schedule; user may acknowledge and continue (flag stored; still shown in preview/export).

### 8. Preview & export

- Preview: trip summary + daily timeline + map of day’s order; desktop/mobile layouts.  
- Export `.docx` via `docx`: title, summary, per-day sections, times, durations, addresses, coords, notes, route order, OSM attribution.  
- Optional map PNG from MapLibre canvas upload; if capture fails → text route list only.

### 9. Caching & performance

- Debounced Photon search (~400ms).  
- `PlaceCache` / `RouteCache` with TTL.  
- Request dedupe for identical in-flight resolves/routes.  
- Nominatim ≤ 1 req/s globally on server (queue).  
- Document public endpoint fair-use limits; Phase 2 self-host when traffic grows.

### 10. Security

- Never expose server secrets to the frontend (none required for Phase 1 public OSM endpoints).  
- Trip ownership: only `Trip.userId === JWT.sub`.  
- Validate coords, URLs, and durations. Sanitize resolved external payloads before persist.  
- Follow Portal permission model.

### 11. Implementation phasing (milestones)

| Milestone | Scope |
|-----------|--------|
| M0 | Repo scaffold, SSO, Prisma schema, nginx/PM2/deploy, Portal permission + launcher |
| M1 | Map + GMaps link resolve + Photon search + My Places |
| M2 | Days + drag-and-drop order |
| M3 | Routing (walk/drive/bike) + transit manual + schedule + validation |
| M4 | Preview |
| M5 | DOCX export (+ canvas map optional) |

(Former “M6 recommendations” cancelled.)

### 12. Out of scope (v1)

- Place recommendations / ratings / reviews  
- Real public-transit routing (GTFS / OpenTripPlanner)  
- Opening-hours–based scheduling  
- Self-hosted Nominatim/OSRM on day one  
- Paid map/geocoding/routing providers  
- Scraping Google Maps HTML  
- Cross-app business APIs to Investment/Gold/Discord

## Data model (sketch)

```
User            id = Portal sub; createdAt; updatedAt
Trip            id; userId; name; destination?; startDate?; endDate?; wizardStep; timestamps
TripPlace       id; tripId; name; address?; lat; lng; source (gmaps|osm); sourceUrl?; category?; notes?; timestamps
TripDay         id; tripId; dayNumber; title?; startTime; startLat?; startLng?; startLabel?; transportMode
TripDayPlace    id; dayId; placeId; sortOrder; stayMinutes
TripLeg         id; dayId; fromPlaceId?; toPlaceId?; durationSec; distanceM?; mode; isManualOverride; warning?
PlaceCache      key; payload Json; expiresAt
RouteCache      key; payload Json; expiresAt
```

## API sketch (adapt to Nest conventions; prefix behind `/trip-api`)

```
POST/GET/PATCH     /trips
POST               /places/search
POST               /places/resolve-link
POST/DELETE        /trips/:id/places
POST/PATCH/DELETE  /trips/:id/days
PATCH              /trips/:id/days/:dayId/order
POST               /trips/:id/route/calculate
PATCH              /trips/:id/days/:dayId/schedule
GET                /trips/:id/preview
POST               /trips/:id/export/docx
```

Raw JSON responses (no envelope), class-validator DTOs, Nest exceptions — match Portal/Gold/Investment.

## Frontend sketch

- Wizard shell with steps 1–5 + back navigation without data loss; autosave.  
- Step 1 layout: left search/link · center map · right/bottom My Places.  
- DnD for day lists (library TBD during M2; prefer lightweight).  
- `fetch` + `credentials: 'include'`; auth via Portal `/api/auth/me` pattern like Gold.

## Ecosystem touchpoints (other repos)

| Repo | Change |
|------|--------|
| MoDMoS_Portal | Permission `service:trip-planner`; launcher card; nginx paths; optional DB viewer URL; docs |
| TripPlanner | Full app |
| deploy-all.sh | `tripplanner` target |

## Success criteria

1. User can build a multi-day trip end-to-end with $0 paid APIs.  
2. GMaps link and Photon search both add places; duplicates blocked.  
3. Walk/drive/bike get travel times from OSRM (or manual fallback); transit always manual.  
4. Schedule warnings work; overrides do not silently rewrite times.  
5. Preview + DOCX export usable on desktop and mobile.  
6. Docs/env examples updated; no secrets committed.

## Testing

- Unit: URL parse for common Google Maps link shapes; schedule math; validation rules.  
- Unit: routing provider mock → matrix → day timeline.  
- Integration: resolve-link with mocked redirects; export produces valid docx buffer.  
- Manual: SSO gate; wizard persistence; canvas export fallback.

## Known limitations (honest)

- Public Nominatim/OSRM are free community servers with fair-use limits — fine for early traffic with caching; may slow or refuse under heavy load until self-hosted.  
- Some Google short links may not resolve server-side → user uses full URL or OSM search.  
- Transit times are user-entered only — not real transit routing.  
- No star ratings or “recommended places” in v1.
