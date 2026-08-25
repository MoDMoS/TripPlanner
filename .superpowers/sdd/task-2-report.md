# Task 2 Report: Prisma schema + User upsert + SSO guard (M0b)

Date: 2026-08-26

## Status

Complete. Task 2 was implemented in commits `7aabd1a` and `51c82d1`.

## Implemented

- Added Prisma 6.19.2 and `@prisma/client` 6.19.2.
- Added the PostgreSQL schema and reviewed baseline SQL migration for:
  `User`, `Trip`, `TripPlace`, `TripDay`, `TripDayPlace`, `TripLeg`,
  `PlaceCache`, and `RouteCache`.
- Added global `PrismaModule` and `PrismaService`.
- Added `AuthUser { userId, email, name, roles, permissions }`.
- Added global `JwtCookieGuard`, registered through `APP_GUARD`.
- The guard reads Portal's `access_token` cookie, verifies it with the shared
  `AUTH_SECRET`, and requires the exact permission `service:trip-planner`.
- Existing `@Public()` metadata bypasses authentication for `GET /health`.
- Added `UsersService.ensureFromJwt()` using Prisma `user.upsert()` keyed by
  Portal JWT `sub`.
- Added `CurrentUser` support for later authenticated controllers.
- Updated `api/.env.example`, `README.md`, and `docs/ARCHITECTURE.md` without
  adding secrets.

## TDD evidence

The missing-permission guard test was written first. It initially failed
because `canActivate()` returned without throwing. After implementation, it
passes and confirms a JWT lacking `service:trip-planner` raises
`ForbiddenException`.

The user-upsert test was also run red first (the mock received zero calls),
then passed after implementing `ensureFromJwt()`.

Additional guard coverage verifies public-route bypass, missing-cookie
rejection, and attachment of `AuthUser` for an authorized JWT.

## Verification

- `npm test -- --runInBand`: 3 suites passed, 6 tests passed.
- `npm run build`: passed.
- `DATABASE_URL=... npx prisma validate`: schema valid.
- IDE diagnostics for edited API and Prisma files: no errors.
- Generated migration SQL was reviewed against the schema; the accidental
  duplicate initial migration was removed in follow-up commit `51c82d1`.

## Database deployment

`prisma migrate deploy` was not run. A connectivity check with
`npx prisma migrate status` returned Prisma `P1001`: PostgreSQL was not
reachable at `127.0.0.1:5433`.

The committed migration is ready for deployment after creating the database:

```sql
CREATE DATABASE tripplanner OWNER portal;
```

Use the real Portal database password in `DATABASE_URL`; do not commit it.

## Concerns

- `npm install` reports four high-severity transitive vulnerabilities. No
  automatic force-fix was applied because it may introduce breaking upgrades.
- The database migration still needs to be applied in an environment that can
  reach the Portal PostgreSQL cluster.
