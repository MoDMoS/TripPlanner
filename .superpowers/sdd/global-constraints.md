## Global Constraints

- Zero paid API cost: no Google Places/Routes/Geocoding keys, no Mapbox paid, no OpenAI.
- Google Maps links: HTTP redirect follow + URL parse only â€” never scrape Google HTML.
- No place recommendations / ratings / popularity scores in v1.
- Transit mode: user-entered travel duration only (no auto route).
- Walk/drive/bike: OSRM matrix via `RoutingProvider` abstraction + `RouteCache`.
- Nominatim never on keystroke path; server-side â‰¤ 1 req/s queue; identifying User-Agent on all OSM calls.
- Auth: Portal `access_token` cookie; permission `service:trip-planner`; trip ownership by JWT `sub`.
- API responses: raw JSON (no envelope); Nest exceptions; class-validator DTOs with global ValidationPipe (`whitelist`, `transform`, `forbidNonWhitelisted`).
- Docs: update ecosystem/VPS/permission docs in the same change set that introduces them; never commit secrets.
- Init git in TripPlanner before first commit if missing.
