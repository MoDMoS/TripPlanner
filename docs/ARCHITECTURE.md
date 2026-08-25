# TripPlanner Architecture

อัปเดต: 2026-08-25

TripPlanner is a MoDMoS sibling application composed of:

- `api/`: NestJS 11 API, default port `3003`
- `web/`: Vite 7, React 19, React Router 7, and Tailwind CSS 4, development port `5175`

## HTTP routing

The Nest application intentionally has no global prefix. Controllers expose upstream-root paths such as `/health`.

During local development, Vite proxies `/trip-api/*` to `http://127.0.0.1:3003/*` and strips `/trip-api`. Production nginx will use the same contract: it strips `/trip-api` before forwarding requests to the Nest upstream.

Portal authentication requests under `/api/auth` are proxied unchanged to `http://127.0.0.1:3001`.

## Current scope

The current scaffold exposes the public `GET /health` endpoint returning raw JSON:

```json
{ "ok": true }
```

SSO enforcement, database models, and Portal integration are introduced in later milestones.
