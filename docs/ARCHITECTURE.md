# TripPlanner Architecture

อัปเดต: 2026-08-26

TripPlanner is a MoDMoS sibling application composed of:

- `api/`: NestJS 11 API, default port `3003`
- `web/`: Vite 7, React 19, React Router 7, and Tailwind CSS 4, development port `5175`

## HTTP routing

The Nest application intentionally has no global prefix. Controllers expose upstream-root paths such as `/health`.

During local development, Vite proxies `/trip-api/*` to `http://127.0.0.1:3003/*` and strips `/trip-api`. Production nginx will use the same contract: it strips `/trip-api` before forwarding requests to the Nest upstream.

Portal authentication requests under `/api/auth` are proxied unchanged to `http://127.0.0.1:3001`.

## Authentication

The API installs `JwtCookieGuard` globally. It verifies the Portal
`access_token` cookie with the shared `AUTH_SECRET`, requires the exact
`service:trip-planner` permission, and exposes JWT identity as
`AuthUser { userId, email, name, roles, permissions }`. The `GET /health`
endpoint remains public through `@Public()`.

`UsersService.ensureFromJwt()` upserts the local user by Portal JWT `sub`.
Trip ownership will use that same identifier.

## Database

TripPlanner uses the `tripplanner` database in the existing Portal PostgreSQL
cluster (`127.0.0.1:5433` from the host). Prisma models cover users, trips,
places, itinerary days and ordering, route legs, and place/route caches.
