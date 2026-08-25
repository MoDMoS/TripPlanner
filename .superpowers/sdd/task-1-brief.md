### Task 1: Repo scaffold + git + health API (M0a)

**Files:**
- Create: full `api/` Nest skeleton listed above (minimal: `main.ts`, `app.module.ts`, `health/`, `prisma/`)
- Create: `web/` Vite React TS skeleton with Tailwind
- Create: root `.gitignore`, `README.md`, `deploy.sh`
- Create: `api/.env.example`

**Interfaces:**
- Produces: `GET /health` â†’ `{ ok: true }`; web builds; `npm` scripts `start:dev` / `build`

- [ ] **Step 1: Init git**

```bash
cd /d/Codeing/Project/TripPlanner
git init
```

- [ ] **Step 2: Scaffold Nest API**

Use Nest CLI or mirror Gold_agent `api/` layout. `main.ts` must:

```typescript
app.setGlobalPrefix('trip-api'); // or strip prefix in nginx and use no global prefix â€” pick ONE and document in ARCHITECTURE.md
app.use(cookieParser());
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
await app.listen(process.env.PORT ?? 3003);
```

**Decision (lock in this task):** Prefer **no Nest global prefix**; nginx strips `/trip-api` â†’ upstream root (matches Gold). Controllers use paths like `@Controller('health')`, `@Controller('trips')`.

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
cd api && npm run start:dev   # GET http://127.0.0.1:3003/health â†’ {"ok":true}
cd web && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold TripPlanner api and web"
```

---
