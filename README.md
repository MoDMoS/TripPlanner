# TripPlanner

TripPlanner is the fifth MoDMoS sibling application. It provides a zero-paid-API itinerary workflow with a NestJS API and a Vite React frontend.

## Local development

Start the API:

```bash
cd api
npm install
npm run start:dev
```

The API listens on `http://127.0.0.1:3003` by default. Check it with `GET /health`.

The API uses the Portal PostgreSQL cluster on host port `5433`. Create its
database once before applying migrations:

```sql
CREATE DATABASE tripplanner OWNER portal;
```

Copy `api/.env.example` to `api/.env`, keep `AUTH_SECRET` identical to the
Portal value, set the real database password in `DATABASE_URL`, then run:

```bash
cd api
npx prisma migrate deploy
```

Start the web app:

```bash
cd web
npm install
npm run dev
```

The Vite dev server listens on `http://127.0.0.1:5175`.
