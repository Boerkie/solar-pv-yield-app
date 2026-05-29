import { useMemo, useState } from 'react';
import { ApplianceLoad, LoadProfile, Site } from '../types';
import { calculateAnnualLoadKwh } from '../utils/usageSimulation';

type LoadProfilePanelProps = {
  site: Site;
  loadProfile: LoadProfile;
  fallbackBaseWatts: number;
  onChange: (loadProfile: LoadProfile) => void;
};

const MONTHS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Feb' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' },
  { value: 5, label: 'May' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Aug' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dec' }
];

const APPLIANCE_ICONS: Record<string, string> = {
  kettle: 'K',
  dishwasher: 'D',
  'washing-machine': 'W',
  geyser: 'G',
  dryer: 'DR',
  aircon: 'AC',
  oven: 'O',
  stove: 'S',
  'pool-pump': 'P',
  'fridge-freezer': 'F',
  microwave: 'M',
  vacuum: 'V',
  workstation: 'PC',
  'tv-media': 'TV',
  'ev-charger': 'EV'
};

export function LoadProfilePanel({ site, loadProfile, fallbackBaseWatts, onChange }: LoadProfilePanelProps) {
  const [selectedApplianceId, setSelectedApplianceId] = useState(loadProfile.appliances[0]?.id ?? '');
  const annualLoadKwh = calculateAnnualLoadKwh(loadProfile, fallbackBaseWatts);
  const enabledApplianceCount = loadProfile.appliances.filter((appliance) => appliance.enabled).length;
  const selectedAppliance = loadProfile.appliances.find((appliance) => appliance.id === selectedApplianceId) ?? loadProfile.appliances[0];
  const seasonLabels = useMemo(() => buildSeasonLabels(site.latitude), [site.latitude]);

  function updateBaseField(field: keyof Pick<LoadProfile, 'nightBaseWatts' | 'dayBaseWatts' | 'eveningBaseWatts'>, value: number) {
    onChange({
      ...loadProfile,
      [field]: value
    });
  }

  function updateAppliance(nextAppliance: ApplianceLoad) {
    onChange({
      ...loadProfile,
      appliances: loadProfile.appliances.map((appliance) => appliance.id === nextAppliance.id ? nextAppliance : appliance)
    });
  }

  function addAppliance() {
    const nextAppliance: ApplianceLoad = {
      id: `custom-${Date.now()}`,
      name: 'Custom appliance',
      enabled: true,
      powerKw: 1,
      hoursPerRun: 1,
      runsPerWeek: 1,
      startHour: 12,
      activeMonths: seasonLabels.allYear
    };

    onChange({
      ...loadProfile,
      appliances: [...loadProfile.appliances, nextAppliance]
    });
    setSelectedApplianceId(nextAppliance.id);
  }

  function toggleAppliance(appliance: ApplianceLoad) {
    const nextAppliance = {
      ...appliance,
      enabled: !appliance.enabled
    };

    updateAppliance(nextAppliance);
    setSelectedApplianceId(appliance.id);
  }

  return (
    <section className="load-profile-card card">
      <div className="section-heading">
        <div>
          <h2>Load profile</h2>
          <p>Approximate when the house uses power. This guides the battery, grid import and curtailment estimates.</p>
        </div>
        <button type="button" className="secondary-button" onClick={addAppliance}>Add appliance</button>
        <div className="limit-chip">
          <span>Modelled annual load</span>
          <strong>{formatNumber(annualLoadKwh)} kWh</strong>
        </div>
      </div>

      <div className="input-grid">
        <label>
          Night base load, 22:00-07:00 (W)
          <input type="number" min="0" step="10" value={loadProfile.nightBaseWatts} onChange={(event) => updateBaseField('nightBaseWatts', Number(event.target.value))} />
        </label>
        <label>
          Day base load, 07:00-17:00 (W)
          <input type="number" min="0" step="10" value={loadProfile.dayBaseWatts} onChange={(event) => updateBaseField('dayBaseWatts', Number(event.target.value))} />
        </label>
        <label>
          Evening base load, 17:00-22:00 (W)
          <input type="number" min="0" step="10" value={loadProfile.eveningBaseWatts} onChange={(event) => updateBaseField('eveningBaseWatts', Number(event.target.value))} />
        </label>
        <div className="load-summary-box">
          <strong>{enabledApplianceCount} enabled appliances</strong>
          <span>Base loads plus scheduled appliance runs are simulated hour by hour.</span>
        </div>
      </div>

      <div className="appliance-picker-row" aria-label="Appliances">
        {loadProfile.appliances.map((appliance) => (
          <button
            key={appliance.id}
            type="button"
            className={[
              'appliance-icon-button',
              appliance.enabled ? 'enabled' : '',
              appliance.id === selectedAppliance?.id ? 'selected' : ''
            ].filter(Boolean).join(' ')}
            title={`${appliance.enabled ? 'Enabled' : 'Disabled'}: ${appliance.name}`}
            onClick={() => toggleAppliance(appliance)}
          >
            <span>{APPLIANCE_ICONS[appliance.id] ?? appliance.name.slice(0, 2).toUpperCase()}</span>
            <small>{appliance.name}</small>
          </button>
        ))}
      </div>

      {selectedAppliance ? (
        <ApplianceEditor
          appliance={selectedAppliance}
          seasonLabels={seasonLabels}
          onChange={updateAppliance}
        />
      ) : null}
    </section>
  );
}

function ApplianceEditor({ appliance, seasonLabels, onChange }: { appliance: ApplianceLoad; seasonLabels: SeasonLabels; onChange: (appliance: ApplianceLoad) => void }) {
  function updateField(field: keyof ApplianceLoad, value: number | string | boolean | number[]) {
    onChange({
      ...appliance,
      [field]: value
    });
  }

  function toggleMonth(month: number) {
    const activeMonths = appliance.activeMonths.includes(month)
      ? appliance.activeMonths.filter((activeMonth) => activeMonth !== month)
      : [...appliance.activeMonths, month].sort((left, right) => left - right);

    updateField('activeMonths', activeMonths);
  }

  return (
    <article className={appliance.enabled ? 'appliance-editor-card' : 'appliance-editor-card disabled'}>
      <div className="appliance-header">
        <label className="checkbox-label">
          <input type="checkbox" checked={appliance.enabled} onChange={(event) => updateField('enabled', event.target.checked)} />
          Enabled
        </label>
        <input className="appliance-name-input" value={appliance.name} onChange={(event) => updateField('name', event.target.value)} aria-label="Appliance name" />
      </div>

      <div className="input-grid compact-grid">
        <label>
          Power kW
          <input type="number" min="0" step="0.1" value={appliance.powerKw} onChange={(event) => updateField('powerKw', Number(event.target.value))} />
        </label>
        <label>
          Hours/run
          <input type="number" min="0" step="0.25" value={appliance.hoursPerRun} onChange={(event) => updateField('hoursPerRun', Number(event.target.value))} />
        </label>
        <label>
          Runs/week
          <input type="number" min="0" step="0.5" value={appliance.runsPerWeek} onChange={(event) => updateField('runsPerWeek', Number(event.target.value))} />
        </label>
        <label>
          Start hour
          <input type="number" min="0" max="23" step="1" value={appliance.startHour} onChange={(event) => updateField('startHour', Number(event.target.value))} />
        </label>
      </div>

      <div className="month-toggle-grid" aria-label={`${appliance.name} active months`}>
        <button type="button" className="month-preset" onClick={() => updateField('activeMonths', seasonLabels.allYear)}>All year</button>
        <button type="button" className="month-preset" onClick={() => updateField('activeMonths', seasonLabels.summerMonths)}>{seasonLabels.summerLabel}</button>
        <button type="button" className="month-preset" onClick={() => updateField('activeMonths', seasonLabels.winterMonths)}>{seasonLabels.winterLabel}</button>
        {MONTHS.map((month) => (
          <button
            key={month.value}
            type="button"
            className={appliance.activeMonths.includes(month.value) ? 'month-toggle active' : 'month-toggle'}
            onClick={() => toggleMonth(month.value)}
          >
            {month.label}
          </button>
        ))}
      </div>
    </article>
  );
}

type SeasonLabels = {
  summerLabel: string;
  winterLabel: string;
  summerMonths: number[];
  winterMonths: number[];
  allYear: number[];
};

function buildSeasonLabels(latitude: number): SeasonLabels {
  const northernHemisphere = latitude > 0;

  return {
    summerLabel: northernHemisphere ? 'Summer Jun-Aug' : 'Summer Dec-Feb',
    winterLabel: northernHemisphere ? 'Winter Dec-Feb' : 'Winter Jun-Aug',
    summerMonths: northernHemisphere ? [6, 7, 8] : [12, 1, 2],
    winterMonths: northernHemisphere ? [12, 1, 2] : [6, 7, 8],
    allYear: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 0 }).format(value);
}
