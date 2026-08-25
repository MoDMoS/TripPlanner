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

## Follow-up (2026-08-26)

Blank-looking map with Taipei + Bangkok pins was caused by `fitBounds` zooming to continental scale (~z4–5), where Bright shows almost no roads. Fix: if place span &gt; ~0.8°, fly to the latest place at city zoom instead of fitting all; show a Focus hint.