# Residential PV Yield Estimator

A working React + Express prototype for estimating and visualising residential solar PV production for residential roof arrays.

The default configuration matches the requested system:

- East string: 5 × 550 W panels, 2.75 kWp, 40° tilt, 90° placeholder azimuth
- North string: 4 × 550 W panels, 2.2 kWp, 40° tilt, 0° placeholder azimuth
- Whole system: 9 panels, 4.95 kWp
- Metric units throughout
- Default system losses: 14%

Additional solar arrays can be added from the setup screen. A new array starts with 1 panel and copies the latest configured panel wattage, tilt and loss percentage. Arrays can also be removed again from the bottom-right of each array card; the app keeps at least one array configured.

## Features

- Satellite map setup using Leaflet and Esri World Imagery tiles.
- Map scrolling/panning can be locked after site selection, while click-based site and arrow selection still works.
- Digital zoom is enabled beyond the imagery provider's native zoom level to help align roof angles.
- Click the map to set the site latitude and longitude.
- Draw a direction arrow per PV array with one click:
  - the selected site dot is always the arrow start point
  - the clicked map point becomes the direction endpoint
- Manual azimuth entry and manual arrow rotation after placement.
- Compass preview using true-north azimuth:
  - North = 0°
  - East = 90°
  - South = 180°
  - West = 270°
- Backend PVGIS proxy endpoint.
- Per-array PVGIS modelling using latitude, longitude, kWp, tilt, azimuth and losses.
- Converts UI compass azimuth to PVGIS `aspect` convention before calling PVGIS.
- In-memory API result cache keyed by location, tilt, azimuth, system size and losses.
- Dashboard views for:
  - Annual expected yield
  - Monthly production
  - Average daily yield by month
  - Per-array vs combined comparison
  - Hourly average production profile
  - Whole-year mode shows one combined-system hourly curve per month
  - Day, week and month modes split the profile by array plus a blue combined total
  - Day, week, month and year period summaries
  - Stable per-array chart colours across all graphs
  - Sticky click-to-pin chart popups on the hourly and per-array comparison charts

## Important modelling assumptions

This app is intended as a practical estimate, not an engineering-grade simulation.

- PVGIS historical irradiance and weather data are used.
- Each array is simulated separately.
- Hourly PVGIS output is treated as the average power for that hour, so hourly energy is approximated as `kW × 1 hour`.
- Results are averaged across complete historical years returned by PVGIS.
- Nearby shading from trees, chimneys, buildings or roof features is not modelled.
- Inverter clipping, battery state, load consumption and export limits are not modelled.
- PVGIS terrain horizon handling is enabled with `usehorizon=1`, so broad hills and mountains may affect the estimate. This is based on PVGIS elevation data and is not derived from the satellite map image.
- Nearby/local shading from trees, chimneys, neighbouring buildings, the roof ridge, or individual obstructions is still not modelled.

## Setup

Install dependencies and run both the frontend and backend:

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:5173
```

The Express API runs on:

```text
http://localhost:3001
```

Vite proxies `/api/*` calls to the backend during development. The frontend also falls back to `http://localhost:3001/api/simulate` if the relative `/api/simulate` endpoint is not available, which avoids the empty 404 JSON parsing error.

Do not run only `npm run client` unless you have also started the backend separately with:

```bash
npm run server
```

## Configuration

Create a `.env` file if needed:

```bash
PORT=3001
PVGIS_BASE_URL=https://re.jrc.ec.europa.eu/api/seriescalc
```

If the API is hosted somewhere other than `localhost:3001`, set this in `.env` before starting Vite:

```bash
VITE_API_BASE_URL=http://localhost:3001
```

Leave `VITE_API_BASE_URL` empty when using the normal `npm run dev` command.

## Provider design

The provider layer is intentionally isolated under `server/providers`.

- `solarProvider.js` defines the provider interface.
- `pvgisProvider.js` implements the current PVGIS integration.

A future NREL PVWatts V8 provider can be added by implementing the same `simulateString(site, pvString)` shape and swapping the provider in `server/index.js`.

## PVGIS azimuth conversion

The UI stores azimuth as a normal true-north compass bearing.

PVGIS expects `aspect` relative to south:

- South = 0
- West = 90
- East = -90

The conversion is implemented in `server/providers/pvgisProvider.js`:

```js
const pvgisAspect = ((azimuthDegrees - 180 + 540) % 360) - 180;
```

## API route troubleshooting

The backend exposes both simulation endpoints:

- `POST /api/simulate`
- `POST /simulate`

When you click **Estimate production**, the server terminal should log one of those POST requests. If the frontend still reports a 404, stop both terminals and restart with:

```bash
npm run dev
```

You can also test the backend health endpoint directly:

```text
http://localhost:3001/api/health
```
