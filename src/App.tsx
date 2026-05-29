import { useMemo, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { SiteMap } from './components/SiteMap';
import { StringEditor } from './components/StringEditor';
import { PVStringConfig, SimulationResult, Site } from './types';
import { calculateDestinationPoint, calculateDistanceMetres } from './utils/geo';
import './styles.css';

const DEFAULT_SITE: Site = {
  latitude: -33.9249,
  longitude: 18.4241,
  label: 'Cape Town, South Africa'
};

const DEFAULT_STRINGS: PVStringConfig[] = [
  {
    id: 'east',
    name: 'East string',
    panelCount: 5,
    panelWatts: 550,
    capacityKwp: 2.75,
    tiltDegrees: 40,
    azimuthDegrees: 90,
    lossPercent: 14
  },
  {
    id: 'north',
    name: 'North string',
    panelCount: 4,
    panelWatts: 550,
    capacityKwp: 2.2,
    tiltDegrees: 40,
    azimuthDegrees: 0,
    lossPercent: 14
  }
];

function App() {
  const [site, setSite] = useState(DEFAULT_SITE);
  const [strings, setStrings] = useState(DEFAULT_STRINGS);
  const [activeDrawStringId, setActiveDrawStringId] = useState<string | undefined>();
  const [mapScrollLocked, setMapScrollLocked] = useState(true);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCapacity = useMemo(() => strings.reduce((total, pvString) => total + Number(pvString.capacityKwp || 0), 0), [strings]);
  const warnings = useMemo(() => buildWarnings(site, strings), [site, strings]);

  function handleSiteChange(nextSite: Site) {
    const nextStart = { lat: nextSite.latitude, lng: nextSite.longitude };

    setSite(nextSite);
    setStrings((currentStrings) => currentStrings.map((pvString) => {
      if (!pvString.arrow) {
        return pvString;
      }

      const currentDistanceMetres = calculateDistanceMetres(pvString.arrow.start, pvString.arrow.end);
      const arrowDistanceMetres = Number.isFinite(currentDistanceMetres) && currentDistanceMetres > 0 ? currentDistanceMetres : 10;

      return {
        ...pvString,
        arrow: {
          start: nextStart,
          end: calculateDestinationPoint(nextStart, arrowDistanceMetres, pvString.azimuthDegrees)
        }
      };
    }));
  }

  function updateString(nextString: PVStringConfig) {
    setStrings((currentStrings) => currentStrings.map((pvString) => pvString.id === nextString.id ? nextString : pvString));
  }

  function removeSolarArray(stringId: string) {
    setStrings((currentStrings) => {
      if (currentStrings.length <= 1) {
        return currentStrings;
      }

      return currentStrings.filter((pvString) => pvString.id !== stringId);
    });

    setActiveDrawStringId((currentStringId) => currentStringId === stringId ? undefined : currentStringId);
    setResult(null);
  }

  function addSolarArray() {
    const templateString = strings[strings.length - 1] ?? DEFAULT_STRINGS[0];
    const nextIndex = strings.length + 1;
    const panelWatts = Number(templateString.panelWatts || 550);
    const tiltDegrees = Number(templateString.tiltDegrees || 40);
    const lossPercent = Number(templateString.lossPercent || 14);
    const nextString: PVStringConfig = {
      id: `array-${nextIndex}-${Date.now()}`,
      name: `Solar array ${nextIndex}`,
      panelCount: 1,
      panelWatts,
      capacityKwp: Number((panelWatts / 1000).toFixed(3)),
      tiltDegrees,
      azimuthDegrees: 0,
      lossPercent
    };

    setStrings((currentStrings) => [...currentStrings, nextString]);
    setActiveDrawStringId(nextString.id);
  }

  async function runSimulation() {
    setIsLoading(true);
    setError(null);

    try {
      const payload = await postSimulation({ site, strings });
      setResult(payload);
    } catch (simulationError) {
      setError(simulationError instanceof Error ? simulationError.message : 'Simulation failed.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main>
      <header className="app-header">
        <div>
          <p className="eyebrow">Residential PV estimator</p>
          <h1>Solar production dashboard</h1>
          <p>
            Pick your roof location, draw the true-north panel direction arrows, then estimate annual, monthly and hourly PV production.
          </p>
        </div>
        <div className="header-summary">
          <span>Total DC capacity</span>
          <strong>{totalCapacity.toFixed(2)} kWp</strong>
          <small>{strings.reduce((total, pvString) => total + pvString.panelCount, 0)} panels · {strings.length} arrays · metric units</small>
        </div>
      </header>

      <SiteMap
        site={site}
        strings={strings}
        activeDrawStringId={activeDrawStringId}
        mapScrollLocked={mapScrollLocked}
        onSiteChange={handleSiteChange}
        onStringChange={updateString}
      />

      <section className="array-toolbar card">
        <div>
          <h2>Solar arrays</h2>
          <p>Add another orientation if you have another group of panels. New arrays default to one panel and copy the latest panel wattage, tilt and loss settings.</p>
        </div>
        <button type="button" className="secondary-button" onClick={addSolarArray}>Add Solar Array</button>
      </section>

      <section className="setup-grid">
        <div className="site-form card">
          <div className="site-card-header">
            <div>
              <h2>Site</h2>
              <p>Latitude and longitude are extracted from the selected map point. Azimuths are stored as true-north compass bearings.</p>
            </div>
            <button type="button" className="ghost-button" onClick={() => setMapScrollLocked((currentValue) => !currentValue)}>
              {mapScrollLocked ? 'Unlock map scrolling' : 'Lock map scrolling'}
            </button>
          </div>
          <div className="input-grid">
            <label>
              Latitude
              <input type="number" step="0.000001" value={site.latitude} onChange={(event) => handleSiteChange({ ...site, latitude: Number(event.target.value) })} />
            </label>
            <label>
              Longitude
              <input type="number" step="0.000001" value={site.longitude} onChange={(event) => handleSiteChange({ ...site, longitude: Number(event.target.value) })} />
            </label>
            <label className="full-width">
              Label
              <input value={site.label} onChange={(event) => handleSiteChange({ ...site, label: event.target.value })} />
            </label>
          </div>

          {warnings.length > 0 ? (
            <div className="warning-box">
              <strong>Warnings</strong>
              <ul>
                {warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </div>
          ) : null}
        </div>

        {strings.map((pvString) => (
          <StringEditor
            key={pvString.id}
            pvString={pvString}
            activeDrawStringId={activeDrawStringId}
            onChange={updateString}
            onStartDrawing={setActiveDrawStringId}
            onStopDrawing={() => setActiveDrawStringId(undefined)}
            onRemove={removeSolarArray}
            canRemove={strings.length > 1}
          />
        ))}
      </section>

      <section className="actions-card card">
        <div>
          <h2>Run PVGIS estimate</h2>
          <p>
            The backend calls PVGIS once per solar array, using capacity, tilt, true-north azimuth converted to PVGIS aspect, and system losses.
          </p>
        </div>
        <button type="button" className="primary-button" disabled={isLoading || warnings.some((warning) => warning.startsWith('Invalid'))} onClick={runSimulation}>
          {isLoading ? 'Estimating…' : 'Estimate production'}
        </button>
      </section>

      {error ? <div className="error-box">{error}</div> : null}
      {result ? <Dashboard result={result} /> : <EmptyState />}
    </main>
  );
}

function EmptyState() {
  return (
    <section className="empty-state">
      <h2>No simulation yet</h2>
      <p>Set the site and panel orientations, then run the estimate to populate the dashboard charts.</p>
    </section>
  );
}

async function postSimulation(body: { site: Site; strings: PVStringConfig[] }) {
  const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  const apiUrls = configuredApiBaseUrl
    ? buildConfiguredApiUrls(configuredApiBaseUrl)
    : [
      '/api/simulate',
      '/simulate',
      'http://127.0.0.1:3001/api/simulate',
      'http://localhost:3001/api/simulate',
      'http://127.0.0.1:3001/simulate',
      'http://localhost:3001/simulate'
    ];

  let lastError: Error | null = null;

  for (const apiUrl of apiUrls) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const payload = await readJsonResponse(response);

      if (!response.ok) {
        const errorList = Array.isArray(payload?.errors) ? payload.errors.join(' ') : undefined;
        const message = payload?.message || payload?.detail || errorList || `Simulation failed with HTTP ${response.status} from ${apiUrl}.`;
        lastError = new Error(message);

        if (response.status === 404 || response.status >= 500) {
          continue;
        }

        throw lastError;
      }

      return payload as SimulationResult;
    } catch (fetchError) {
      lastError = fetchError instanceof Error ? fetchError : new Error('Simulation failed.');
    }
  }

  throw new Error(`${lastError?.message || 'Simulation failed.'} The backend is running, but the simulation route was not found. Confirm the terminal shows POST /api/simulate or POST /simulate after clicking Estimate production.`);
}

function buildConfiguredApiUrls(configuredApiBaseUrl: string) {
  const baseUrl = configuredApiBaseUrl.replace(/\/$/, '');

  if (baseUrl.endsWith('/api')) {
    return [`${baseUrl}/simulate`];
  }

  return [`${baseUrl}/api/simulate`, `${baseUrl}/simulate`];
}

async function readJsonResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      message: text
    };
  }
}

function buildWarnings(site: Site, strings: PVStringConfig[]) {
  const warnings: string[] = [];

  if (site.latitude < -90 || site.latitude > 90) {
    warnings.push('Invalid latitude: must be between -90 and 90.');
  }

  if (site.longitude < -180 || site.longitude > 180) {
    warnings.push('Invalid longitude: must be between -180 and 180.');
  }

  strings.forEach((pvString) => {
    if (pvString.tiltDegrees < 0 || pvString.tiltDegrees > 90) {
      warnings.push(`Invalid ${pvString.name} tilt: must be between 0 and 90 degrees.`);
    }

    if (pvString.azimuthDegrees < 0 || pvString.azimuthDegrees > 359) {
      warnings.push(`Invalid ${pvString.name} azimuth: must be between 0 and 359 degrees.`);
    }

    if (pvString.panelCount <= 0 || pvString.panelWatts <= 0) {
      warnings.push(`Invalid ${pvString.name} panel configuration: panel count and wattage must be positive.`);
    }

    if (pvString.lossPercent < 5 || pvString.lossPercent > 30) {
      warnings.push(`${pvString.name} losses look unusual. 14% is a typical starting estimate.`);
    }

    if (pvString.tiltDegrees > 60) {
      warnings.push(`${pvString.name} tilt is steep. This may be correct for your roof, but verify the value.`);
    }
  });

  return warnings;
}

export default App;
