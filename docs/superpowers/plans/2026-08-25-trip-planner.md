# TripPlanner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship TripPlanner as a MoDMoS sibling app: zero paid-API itinerary wizard (GMaps link + OSM search → days → schedule → preview → DOCX).

**Architecture:** NestJS API (`api/`) + Vite/React/Tailwind SPA (`web/`), Portal SSO cookie + `service:trip-planner`, Postgres DB `tripplanner` on Portal cluster `:5433`, PM2 + nginx `/trip/` + `/trip-api/`. External OSM providers behind abstractions with DB cache; no recommendation engine.

**Tech Stack:** NestJS 11, Prisma 6, PostgreSQL, class-validator, cookie-parser, `docx`, Vite 7, React 19, React Router 7, Tailwind 4, MapLibre GL JS, OpenFreeMap, Photon, Nominatim, FOSSGIS OSRM.

**Spec:** `docs/superpowers/specs/2026-08-25-trip-planner-design.md`

## Global Constraints

- Zero paid API cost: no Google Places/Routes/Geocoding keys, no Mapbox paid, no OpenAI.
- Google Maps links: HTTP redirect follow + URL parse only — never scrape Google HTML.
- No place recommendations / ratings / popularity scores in v1.
- Transit mode: user-entered travel duration only (no auto route).
- Walk/drive/bike: OSRM matrix via `RoutingProvider` abstraction + `RouteCache`.
- Nominatim never on keystroke path; server-side ≤ 1 req/s queue; identifying User-Agent on all OSM calls.
- Auth: Portal `access_token` cookie; permission `service:trip-planner`; trip ownership by JWT `sub`.
- API responses: raw JSON (no envelope); Nest exceptions; class-validator DTOs with global ValidationPipe (`whitelist`, `transform`, `forbidNonWhitelisted`).
- Docs: update ecosystem/VPS/permission docs in the same change set that introduces them; never commit secrets.
- Init git in TripPlanner before first commit if missing.

---

## File map (create unless noted)

### TripPlanner repo

```
TripPlanner/
  README.md
  deploy.sh
  .gitignore
  docs/
    ARCHITECTURE.md
    KEEP_DOCS_UPDATED.md   (or symlink policy via .cursor/rules)
    superpowers/specs/2026-08-25-trip-planner-design.md   (exists)
    superpowers/plans/2026-08-25-trip-planner.md           (this file)
  api/
    package.json
    tsconfig.json
    nest-cli.json
    .env.example
    prisma/schema.prisma
    prisma/migrations/...
    src/
      main.ts
      app.module.ts
      prisma/prisma.module.ts
      prisma/prisma.service.ts
      auth/jwt-cookie.guard.ts
      auth/public.decorator.ts
      auth/current-user.decorator.ts
      auth/auth.module.ts
      users/users.service.ts          # upsert from JWT
      users/users.module.ts
      common/http/osm-user-agent.ts
      common/cache/cache.service.ts
      places/
        places.module.ts
        places.controller.ts
        dto/search-places.dto.ts
        dto/resolve-link.dto.ts
        place-search.service.ts
        place-link-resolve.service.ts
        google-maps-url.parser.ts
        nominatim.client.ts
        photon.client.ts
      trips/
        trips.module.ts
        trips.controller.ts
        trips.service.ts
        dto/*.ts
      itinerary/
        itinerary.module.ts
        itinerary.controller.ts
        itinerary.service.ts
        schedule.engine.ts
        schedule.validator.ts
        dto/*.ts
      routing/
        routing.module.ts
        routing.service.ts
        routing.provider.ts           # interface
        osrm.routing.provider.ts
        route-cache.service.ts
      export/
        export.module.ts
        export.controller.ts
        export.service.ts
        trip-docx.builder.ts
      health/health.controller.ts
    test/ or src/**/*.spec.ts
  web/
    package.json
    vite.config.ts
    index.html
    tailwind setup
    src/
      main.tsx
      App.tsx
      api.ts
      auth.tsx
      services.ts                     # 9-dot launcher (copy pattern from Gold)
      index.css
      pages/TripListPage.tsx
      pages/WizardPage.tsx
      wizard/
        WizardShell.tsx
        StepPlaces.tsx
        StepDays.tsx
        StepSchedule.tsx
        StepPreview.tsx
        StepExport.tsx
      map/TripMap.tsx
      map/captureMapPng.ts
```

### MoDMoS_Portal (modify)

- `api/src/rbac/rbac.constants.ts` — add `SERVICE_TRIP_PLANNER: 'service:trip-planner'`
- `api/src/rbac/rbac-bootstrap.service.ts` — seed + default role grants as appropriate
- `src/services.ts` — launcher card + `VITE_TRIP_PLANNER_URL`
- `.env.example` — `VITE_TRIP_PLANNER_URL`
- `deploy/nginx-portal.conf` — `/trip/` static + `/trip-api/` → `:3003`
- `scripts/deploy-all.sh` — `tripplanner` target
- `docs/ecosystem-overview.md`, `docs/VPS.md` — 5th repo, ports, paths
- `api` env for Admin DB viewer optional `TRIPPLANNER_DATABASE_URL` if desired

---

### Task 1: Repo scaffold + git + health API (M0a)

**Files:**
- Create: full `api/` Nest skeleton listed above (minimal: `main.ts`, `app.module.ts`, `health/`, `prisma/`)
- Create: `web/` Vite React TS skeleton with Tailwind
- Create: root `.gitignore`, `README.md`, `deploy.sh`
- Create: `api/.env.example`

**Interfaces:**
- Produces: `GET /health` → `{ ok: true }`; web builds; `npm` scripts `start:dev` / `build`

- [ ] **Step 1: Init git**

```bash
cd /d/Codeing/Project/TripPlanner
git init
```

- [ ] **Step 2: Scaffold Nest API**

Use Nest CLI or mirror Gold_agent `api/` layout. `main.ts` must:

```typescript
app.setGlobalPrefix('trip-api'); // or strip prefix in nginx and use no global prefix — pick ONE and document in ARCHITECTURE.md
app.use(cookieParser());
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
await app.listen(process.env.PORT ?? 3003);
```

**Decision (lock in this task):** Prefer **no Nest global prefix**; nginx strips `/trip-api` → upstream root (matches Gold). Controllers use paths like `@Controller('health')`, `@Controller('trips')`.

- [ ] **Step 3: Health endpoint**

```typescript
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return { ok: true };
  }
}
```

- [ ] **Step 4: Scaffold web**

Vite React TS + Tailwind 4 + React Router. Dev proxy:

```typescript
// web/vite.config.ts
server: {
  port: 5175,
  proxy: {
    '/trip-api': { target: 'http://127.0.0.1:3003', changeOrigin: true, rewrite: (p) => p.replace(/^\/trip-api/, '') },
    '/api/auth': { target: 'http://127.0.0.1:3001', changeOrigin: true },
  },
}
```

- [ ] **Step 5: Verify**

```bash
cd api && npm run start:dev   # GET http://127.0.0.1:3003/health → {"ok":true}
cd web && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold TripPlanner api and web"
```

---

### Task 2: Prisma schema + User upsert + SSO guard (M0b)

**Files:**
- Create: `api/prisma/schema.prisma` (all models from spec)
- Create: `api/src/auth/*`, `api/src/users/*`, `api/src/prisma/*`
- Create: `api/src/auth/jwt-cookie.guard.spec.ts` (permission check)
- Modify: `api/.env.example`

**Interfaces:**
- Produces: `AuthUser { userId, email, name, roles, permissions }`
- Produces: `UsersService.ensureFromJwt(user: AuthUser): Promise<User>`
- Produces: global `JwtCookieGuard` requiring `service:trip-planner`
- Consumes: `AUTH_SECRET` shared with Portal

- [ ] **Step 1: Write Prisma schema**

```prisma
generator client { provider = "prisma-client-js" }
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id // Portal JWT sub
  email     String?
  name      String   @default("")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  trips     Trip[]
}

model Trip {
  id          String      @id @default(cuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  name        String
  destination String?
  startDate   DateTime?
  endDate     DateTime?
  wizardStep  Int         @default(1)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  places      TripPlace[]
  days        TripDay[]
  @@index([userId])
}

model TripPlace {
  id        String   @id @default(cuid())
  tripId    String
  trip      Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  name      String
  address   String?
  lat       Float
  lng       Float
  source    String   // gmaps | osm
  sourceUrl String?
  category  String?
  notes     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  dayPlaces TripDayPlace[]
  @@index([tripId])
}

model TripDay {
  id            String         @id @default(cuid())
  tripId        String
  trip          Trip           @relation(fields: [tripId], references: [id], onDelete: Cascade)
  dayNumber     Int
  title         String?
  startTime     String?        // "09:00"
  startLat      Float?
  startLng      Float?
  startLabel    String?
  transportMode String         @default("drive") // walk|drive|bike|transit
  places        TripDayPlace[]
  legs          TripLeg[]
  @@unique([tripId, dayNumber])
}

model TripDayPlace {
  id          String    @id @default(cuid())
  dayId       String
  day         TripDay   @relation(fields: [dayId], references: [id], onDelete: Cascade)
  placeId     String
  place       TripPlace @relation(fields: [placeId], references: [id], onDelete: Cascade)
  sortOrder   Int
  stayMinutes Int       @default(60)
  @@unique([dayId, placeId])
  @@index([dayId, sortOrder])
}

model TripLeg {
  id                String  @id @default(cuid())
  dayId             String
  day               TripDay @relation(fields: [dayId], references: [id], onDelete: Cascade)
  fromPlaceId       String?
  toPlaceId         String?
  durationSec       Int
  distanceM         Int?
  mode              String
  isManualOverride  Boolean @default(false)
  warning           String?
  @@index([dayId])
}

model PlaceCache {
  key       String   @id
  payload   Json
  expiresAt DateTime
}

model RouteCache {
  key       String   @id
  payload   Json
  expiresAt DateTime
}
```

- [ ] **Step 2: Migration**

Create DB `tripplanner` on Portal Postgres (document SQL in README):

```sql
CREATE DATABASE tripplanner OWNER portal;
```

```bash
cd api
# DATABASE_URL=postgresql://portal:...@127.0.0.1:5433/tripplanner?schema=public
npx prisma migrate dev --name init
```

- [ ] **Step 3: Guard (mirror Gold)**

Copy pattern from `Gold_agent/api/src/auth/jwt-cookie.guard.ts` but require `service:trip-planner`. Register as `APP_GUARD`. `@Public()` on health.

- [ ] **Step 4: UsersService.ensureFromJwt**

Call from an interceptor or at start of trip mutations:

```typescript
async ensureFromJwt(user: AuthUser) {
  return this.prisma.user.upsert({
    where: { id: user.userId },
    create: { id: user.userId, email: user.email, name: user.name },
    update: { email: user.email, name: user.name },
  });
}
```

- [ ] **Step 5: Unit test guard rejects missing permission**

Mock JWT without `service:trip-planner` → `ForbiddenException`.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: prisma schema and Portal SSO guard"
```

---

### Task 3: Portal permission + nginx + deploy wiring (M0c)

**Files:**
- Modify: Portal `rbac.constants.ts`, `rbac-bootstrap.service.ts`, `services.ts`, `nginx-portal.conf`, `deploy-all.sh`, `ecosystem-overview.md`, `VPS.md`, `.env.example`
- Create: TripPlanner `deploy.sh`, `docs/ARCHITECTURE.md`

**Interfaces:**
- Produces: permission code `service:trip-planner` seeded; launcher href from `VITE_TRIP_PLANNER_URL` (e.g. `/trip/`)

- [ ] **Step 1: Add permission constant + bootstrap catalog entry + default role grant (admin all; decide whether `user` role gets it by default — recommend yes for parity with investment/gold)**

- [ ] **Step 2: Launcher card in Portal `services.ts`**

```typescript
{
  id: 'trip-planner',
  name: 'Trip Planner',
  description: 'วางแผนทริปหลายวัน ส่งออก Word',
  href: url(import.meta.env.VITE_TRIP_PLANNER_URL),
  available: Boolean(url(import.meta.env.VITE_TRIP_PLANNER_URL)),
  permission: 'service:trip-planner',
},
```

- [ ] **Step 3: nginx**

```nginx
location /trip/ {
  alias /var/www/trip/;
  try_files $uri $uri/ /trip/index.html;
}
location /trip-api/ {
  proxy_pass http://127.0.0.1:3003/;
  proxy_set_header Cookie $http_cookie;
  # standard proxy headers
}
```

- [ ] **Step 4: deploy-all.sh target `tripplanner`** — pull, `api` build + pm2 restart `tripplanner-api`, `web` build + rsync `/var/www/trip`

- [ ] **Step 5: Update docs dates `อัปเดต: 2026-08-25`**

- [ ] **Step 6: Commit in each repo separately** (Portal + TripPlanner)

---

### Task 4: Google Maps URL parser (M1a)

**Files:**
- Create: `api/src/places/google-maps-url.parser.ts`
- Create: `api/src/places/google-maps-url.parser.spec.ts`

**Interfaces:**
- Produces: `parseGoogleMapsUrl(finalUrl: string): { name?: string; lat?: number; lng?: number; placeId?: string } | null`

- [ ] **Step 1: Write failing tests** for these shapes:

1. `https://www.google.com/maps/place/Taipei+101/@25.0330,121.5654,17z` → name + lat/lng  
2. `https://www.google.com/maps/?q=25.0330,121.5654` → lat/lng  
3. `https://maps.google.com/maps?ll=25.03,121.56` → lat/lng  
4. Garbage URL → `null`

- [ ] **Step 2: Implement parser** with decodeURIComponent on place slug; support `@lat,lng` and `!3dLAT!4dLNG` patterns common in Google URLs.

- [ ] **Step 3: Tests pass → commit**

```bash
git commit -m "feat: parse Google Maps place URLs"
```

---

### Task 5: Place link resolve + Photon search APIs (M1b)

**Files:**
- Create: `place-link-resolve.service.ts`, `nominatim.client.ts`, `photon.client.ts`, `place-search.service.ts`, `places.controller.ts`, DTOs, `PlaceCache` usage via `cache.service.ts`

**Interfaces:**
- Produces: `POST /places/resolve-link` body `{ url: string }` → `{ name, address?, lat, lng, source: 'gmaps', sourceUrl }`
- Produces: `POST /places/search` body `{ query: string, lat?, lng?, limit? }` → `Array<{ name, address?, lat, lng, category?, source: 'osm' }>`
- Consumes: `parseGoogleMapsUrl`; Nominatim reverse; Photon API

- [ ] **Step 1: Nominatim client** with in-process queue (min 1100ms between calls), User-Agent `MoDMoSTripPlanner/1.0 (contact: ...)` from env `OSM_USER_AGENT`.

- [ ] **Step 2: Link resolve service**

```typescript
// Pseudocode contract
async resolve(url: string): Promise<ResolvedPlace> {
  assertAllowedHost(url);
  const finalUrl = await followRedirects(url, { maxHops: 8, timeoutMs: 8000 });
  const parsed = parseGoogleMapsUrl(finalUrl);
  if (!parsed?.lat || !parsed?.lng) throw new BadRequestException('ลิงก์นี้ดึงพิกัดไม่ได้ ลองใช้ลิงก์แบบเต็มหรือค้นหาชื่อ');
  let address = undefined;
  const cacheKey = `rev:${parsed.lat.toFixed(5)},${parsed.lng.toFixed(5)}`;
  // PlaceCache hit or Nominatim reverse
  return { name: parsed.name ?? address ?? 'Dropped pin', address, lat, lng, source: 'gmaps', sourceUrl: url };
}
```

- [ ] **Step 3: Photon search** — `https://photon.komoot.io/api/?q=&limit=8` (+ optional lat/lon bias); map to DTO; cache short TTL (10 min).

- [ ] **Step 4: Controller + DTO validation** (`@IsUrl`, `@IsString`, `@MinLength`)

- [ ] **Step 5: Tests with mocked `fetch` for redirect chain + Photon JSON**

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: resolve Google Maps links and Photon search"
```

---

### Task 6: Trips CRUD + add/remove places (M1c)

**Files:**
- Create: `trips.module.ts`, `trips.controller.ts`, `trips.service.ts`, DTOs
- Create: duplicate-check helper `isDuplicatePlace(a, b, meters=40)`

**Interfaces:**
- `POST /trips` `{ name, destination? }`  
- `GET /trips`, `GET /trips/:id`, `PATCH /trips/:id`  
- `POST /trips/:id/places` body place fields  
- `DELETE /trips/:id/places/:placeId`  
- Ownership: 404/403 if `trip.userId !== user.userId`

- [ ] **Step 1: Implement service with ensureFromJwt on write**

- [ ] **Step 2: Duplicate rule** — if existing place within ~40m AND normalized name similarity, reject `BadRequestException('สถานที่นี้มีในทริปแล้ว')`

- [ ] **Step 3: Tests for ownership + duplicate**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: trips CRUD and trip places"
```

---

### Task 7: Wizard Step 1 UI — map + link + search + My Places (M1d)

**Files:**
- Create: web auth/api, `WizardShell`, `StepPlaces`, `TripMap`, trip list page
- Dependency: `maplibre-gl`, OpenFreeMap style URL (e.g. `https://tiles.openfreemap.org/styles/liberty`)

**Interfaces:**
- Consumes: resolve-link, search, trips places APIs
- Map: `preserveDrawingBuffer: true` (needed later for export)

- [ ] **Step 1: AuthProvider** calling Portal `GET /api/auth/me` with credentials; gate on `service:trip-planner`

- [ ] **Step 2: StepPlaces layout** — left: link input + search; center: map; right/bottom: My Places list with remove

- [ ] **Step 3: Debounce search 400ms; clicking result flies map + shows Add

- [ ] **Step 4: Autosave `wizardStep` when continuing to step 2 (min 1 place required)

- [ ] **Step 5: Manual smoke on desktop width + mobile width**

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: wizard step 1 places map UI"
```

---

### Task 8: Days + order APIs + Step 2 UI (M2)

**Files:**
- Create: itinerary day endpoints in `itinerary` or `trips` module
- Create: `StepDays.tsx` with drag-and-drop (`@dnd-kit/core` + sortable — lightweight, MIT)

**Interfaces:**
- `POST /trips/:id/days` → create next dayNumber  
- `PATCH /trips/:id/days/:dayId` `{ title? }`  
- `DELETE /trips/:id/days/:dayId`  
- `PATCH /trips/:id/days/:dayId/order` `{ placeIds: string[] }`  
- `POST /trips/:id/days/:dayId/places` `{ placeId, stayMinutes? }`  
- `DELETE /trips/:id/days/:dayId/places/:placeId`  
- `POST /trips/:id/days/:dayId/places/:placeId/move` `{ toDayId, index }`

- [ ] **Step 1: Backend order replace** — transaction: delete missing join rows, upsert sortOrder 0..n-1

- [ ] **Step 2: StepDays UI** — unassigned pool + day columns; DnD within/between days

- [ ] **Step 3: Persist on drop; empty day allowed**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: organize places into days with drag-and-drop"
```

---

### Task 9: Routing provider + schedule engine (M3a)

**Files:**
- Create: `routing.provider.ts`, `osrm.routing.provider.ts`, `routing.service.ts`, `route-cache.service.ts`
- Create: `schedule.engine.ts`, `schedule.validator.ts` + specs

**Interfaces:**

```typescript
export type TransportMode = 'walk' | 'drive' | 'bike' | 'transit';

export interface RoutingProvider {
  getMatrix(coords: { lat: number; lng: number }[], mode: Exclude<TransportMode, 'transit'>): Promise<{
    durationsSec: number[][]; // [from][to]
    distancesM: number[][];
  }>;
}

export type ScheduleStop = {
  placeId: string;
  name: string;
  arrive: string; // HH:mm
  depart: string;
  stayMinutes: number;
};

export type ScheduleLeg = {
  fromPlaceId: string | null;
  toPlaceId: string;
  durationSec: number;
  isManualOverride: boolean;
  warning?: string;
};

export function buildDaySchedule(input: {
  startTime: string; // HH:mm
  startCoord?: { lat: number; lng: number };
  places: { placeId: string; name: string; lat: number; lng: number; stayMinutes: number }[];
  legsDurationSec: number[]; // length places.length (start→p0, p0→p1, ...)
}): { stops: ScheduleStop[]; legs: ScheduleLeg[]; endTime: string; totalTravelSec: number; totalActivitySec: number };

export function validateSchedule(...): { errors: string[]; warnings: string[] };
```

- [ ] **Step 1: Failing tests for schedule math** — start 09:00, stay 120, travel 3600 → arrive 10:00 depart 12:00

- [ ] **Step 2: Implement `buildDaySchedule` + time helpers (HH:mm + minutes arithmetic, local wall clock no TZ conversion in v1)

- [ ] **Step 3: Validator** — insufficient travel window warning; end before start error; acknowledge flag stored on trip/day JSON or leg.warning

- [ ] **Step 4: OSRM provider** — FOSSGIS profile URLs:

  - drive: `https://routing.openstreetmap.de/routed-car/table/v1/driving/{coords}?annotations=duration,distance`
  - bike / foot equivalents per FOSSGIS docs

  Cache key: `mode|lat,lng|...` rounded to 5 decimals.

- [ ] **Step 5: `RoutingService.calculateDay`** — if mode=`transit` OR provider fails → leave durations unset / require manual; never invent transit times

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: OSRM routing matrix and schedule engine"
```

---

### Task 10: Schedule API + Step 3 UI (M3b)

**Files:**
- Create: itinerary controller endpoints for calculate + patch schedule
- Create: `StepSchedule.tsx`

**Interfaces:**
- `POST /trips/:id/days/:dayId/route/calculate`  
- `PATCH /trips/:id/days/:dayId/schedule` body:

```typescript
{
  startTime: string;
  startLabel?: string;
  startLat?: number;
  startLng?: number;
  transportMode: TransportMode;
  stays: { placeId: string; stayMinutes: number }[];
  legs?: { toPlaceId: string; durationSec: number; isManualOverride: boolean }[];
  acknowledgeWarnings?: boolean;
}
```

- [ ] **Step 1: API persists TripDay + TripDayPlace.stayMinutes + TripLeg rows**

- [ ] **Step 2: UI** — mode select; for transit show required duration inputs per leg; for other modes show calculated + editable override

- [ ] **Step 3: Show warnings; require checkbox to continue if errors/warnings per product rule (errors block save unless acknowledge)**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: schedule step UI and APIs"
```

---

### Task 11: Preview (M4)

**Files:**
- Create: `GET /trips/:id/preview` aggregator in `itinerary.service.ts`
- Create: `StepPreview.tsx`

**Interfaces:**
- Returns summary totals + per-day timeline + warnings[]

- [ ] **Step 1: Preview DTO built only from DB (no live routing)**

- [ ] **Step 2: UI timeline + small map for selected day**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: trip preview step"
```

---

### Task 12: DOCX export (M5)

**Files:**
- Create: `export.service.ts`, `trip-docx.builder.ts`, `export.controller.ts`
- Create: `StepExport.tsx`, `captureMapPng.ts`
- Dependency: `docx`

**Interfaces:**
- `POST /trips/:id/export/docx` multipart optional `mapPng` OR JSON without image
- Response: `application/vnd.openxmlformats-officedocument.wordprocessingml.document` attachment

- [ ] **Step 1: Builder** — Title, summary table, each day Heading + bullet timeline, addresses, coords, notes, footer attribution `© OpenStreetMap contributors`

- [ ] **Step 2: If `mapPng` buffer present, embed under each day or once at top; else skip silently

- [ ] **Step 3: Client capture:**

```typescript
export function captureMapPng(map: maplibregl.Map): string | null {
  try {
    return map.getCanvas().toDataURL('image/png');
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Test builder returns non-empty Buffer; zip signature `PK`**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: export itinerary to docx"
```

---

### Task 13: Docs polish + verification pass

**Files:**
- Modify: `TripPlanner/docs/ARCHITECTURE.md`, Portal ecosystem/VPS if anything drifted
- Create: `api/.env.example` complete keys: `DATABASE_URL`, `AUTH_SECRET`, `PORT`, `OSM_USER_AGENT`, `OSRM_BASE_URL` (optional override), `PHOTON_BASE_URL`, `NOMINATIM_BASE_URL`

- [ ] **Step 1: Walk success criteria in the design spec — tick each manually**

- [ ] **Step 2: Confirm no Google API keys anywhere; no recommendation code paths**

- [ ] **Step 3: Final commit**

```bash
git commit -m "docs: TripPlanner architecture and env examples"
```

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| Sibling repo + SSO + permission | 1–3 |
| Zero-cost providers + abstractions | 5, 9 |
| GMaps link + Photon (no recommendations) | 4–7 |
| Days + DnD order | 8 |
| OSRM walk/drive/bike + transit manual | 9–10 |
| Validation warnings / no silent rewrite | 9–10 |
| Preview | 11 |
| DOCX + canvas/text fallback | 12 |
| Caching / debounce / Nominatim queue | 5, 7, 9 |
| Portal nginx/deploy/docs | 3, 13 |
| Small VPS / public OSM fair-use + Phase 2 self-host | documented in ARCHITECTURE (Task 13) |

## Execution note

After M0, each milestone (M1–M5) should be demoable. Prefer **subagent-driven-development** one task at a time with review between tasks.
