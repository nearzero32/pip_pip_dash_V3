# Zones map (dashboard)

Feature-owned MapLibre + Terra Draw integration for CITY-scoped Zone CRUD.

## Libraries

| Package | Version | Role |
|---|---|---|
| `maplibre-gl` | **5.24.0** | Map rendering |
| `terra-draw` | **1.32.3** | Polygon draw / vertex edit |
| `terra-draw-maplibre-gl-adapter` | **1.4.1** | Terra Draw ↔ MapLibre |

Terra Draw’s official adapter table supports **MapLibre GL JS v4/v5**. MapLibre v6 is ESM-only and is **not** used.

## Why this stack

- Open-source map runtime (no Google/Mapbox paid SDK).
- Terra Draw provides Polygon + Select modes without wrapping Angular map libraries.
- Overlap validation stays on the backend (PostGIS). No Turf.js.

## Configuration

`environment.mapStyleUrl` (see `src/app/core/config/environment.ts`).

Default: `https://demotiles.maplibre.org/style.json`

**This demo style is not a production tile provider decision.** Do not commit MapTiler/Mapbox tokens. Attribution must remain visible.

## Coordinate order

GeoJSON positions are **`[longitude, latitude]`**.

Dashboard Zone DTO `boundary` is a GeoJSON **Polygon** only (not Feature / FeatureCollection, not MultiPolygon).

## City scope

- Dashboard CRUD: `/api/v1/dashboard/zones`
- Do **not** send `cityId` in POST/PATCH bodies.
- Do **not** send `X-City-Id` on dashboard Zone requests.
- City is taken from the authenticated session.

## Overlap

Zones in the same city may **touch**. Positive-area overlap is rejected with `409 ZONE_BOUNDARY_OVERLAP`. The API is authoritative.

## CSP / tiles

If a future provider is used, allow its tile/style origins in CSP. MapLibre CSS is bundled from npm (`maplibre-gl/dist/maplibre-gl.css`).
