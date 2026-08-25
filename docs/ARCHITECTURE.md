# TripPlanner Architecture

อัปเดต: 2026-08-26

TripPlanner is a MoDMoS sibling application composed of:

- `api/`: NestJS 11 API, default port `3003`
- `web/`: Vite 7, React 19, React Router 7, and Tailwind CSS 4, development port `5175`

## HTTP routing

The Nest application intentionally has no global prefix. Controllers expose upstream-root paths such as `/health`, `/trips`, `/places`.

During local development, Vite proxies `/trip-api/*` to `http://127.0.0.1:3003/*` and strips `/trip-api`. Production nginx uses the same contract under `/trip-api/` → `:3003` and serves the SPA at `/trip/`.

Portal authentication requests under `/api/auth` are proxied unchanged to `http://127.0.0.1:3001`.

## Authentication

The API installs `JwtCookieGuard` globally. It verifies the Portal
`access_token` cookie with the shared `AUTH_SECRET`, requires the exact
`service:trip-planner` permission, and exposes JWT identity as
`AuthUser { userId, email, name, roles, permissions }`. The `GET /health`
endpoint remains public through `@Public()`.

`UsersService.ensureFromJwt()` upserts the local user by Portal JWT `sub`.
Trip ownership uses that same identifier.

## Database

TripPlanner uses the `tripplanner` database in the existing Portal PostgreSQL
cluster (`127.0.0.1:5433` from the host). Prisma models cover users, trips,
places, itinerary days and ordering, route legs, and place/route caches.

## Feature modules

| Module | Role |
|--------|------|
| `places` | Google Maps link resolve (redirect + URL parse) · Photon search · Nominatim reverse |
| `trips` | Trip CRUD · My Places · duplicate guard |
| `itinerary` | Days · order · schedule · preview · validation |
| `routing` | OSRM matrix abstraction + `RouteCache` |
| `export` | `.docx` via `docx` (optional MapLibre canvas PNG) |

Wizard steps: Places → Days → Schedule → Preview → Export.

## Zero-cost external services (Phase 1)

| Need | Provider |
|------|----------|
| Map tiles | OpenFreeMap **Bright** style + MapLibre GL JS (`TripMap`) |
| Name search | Photon |
| Reverse geocode | Nominatim (≤ 1 req/s queue, never on keystroke path) |
| Routing walk/drive/bike | FOSSGIS OSRM |
| Transit | Manual duration only |
| DOCX | `docx` npm |

Provider base URLs are overridable via env (`PHOTON_BASE_URL`, `NOMINATIM_BASE_URL`, `OSRM_BASE_URL`) so Phase 2 can self-host without rewriting business logic.

Public OSM endpoints are fair-use only — fine for low/medium traffic with caching; self-host when limits are hit.

## Deploy

```bash
deploy-modmos trip          # alias
deploy-modmos tripplanner
```

PM2 app name: `tripplanner-api` · static: `/var/www/trip` · requires Portal repo with updated nginx + `deploy-all.sh`.
