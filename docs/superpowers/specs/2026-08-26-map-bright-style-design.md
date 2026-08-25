# TripPlanner map basemap → OpenFreeMap Bright

อัปเดต: 2026-08-26  
Status: Implemented

## Goal

Make the in-app map look closer to light Google Maps (pale land, soft greens, light-blue water, readable road labels) without Google Maps API or paid tiles.

## Decision

Switch MapLibre style URL from Liberty to Bright:

`https://tiles.openfreemap.org/styles/bright`

## Out of scope

- Google Maps JS / Google tile API
- Numbered markers / route polylines
- Style picker UI

## Change

- `web/src/map/TripMap.tsx` — `STYLE_URL`
- Docs: `ARCHITECTURE.md`, parent design table
