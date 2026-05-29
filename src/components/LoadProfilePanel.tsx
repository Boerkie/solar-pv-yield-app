import { ApplianceLoad, LoadProfile } from '../types';
import { calculateAnnualLoadKwh } from '../utils/usageSimulation';

type LoadProfilePanelProps = {
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

export function LoadProfilePanel({ loadProfile, fallbackBaseWatts, onChange }: LoadProfilePanelProps) {
  const annualLoadKwh = calculateAnnualLoadKwh(loadProfile, fallbackBaseWatts);
  const enabledApplianceCount = loadProfile.appliances.filter((appliance) => appliance.enabled).length;

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

  return (
    <section className="load-profile-card card">
      <div className="section-heading">
        <div>
          <h2>Load profile</h2>
          <p>Approximate when the house uses power. This guides the battery, grid import and curtailment estimates.</p>
        </div>
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

      <div className="appliance-grid">
        {loadProfile.appliances.map((appliance) => (
          <ApplianceEditor key={appliance.id} appliance={appliance} onChange={updateAppliance} />
        ))}
      </div>
    </section>
  );
}

function ApplianceEditor({ appliance, onChange }: { appliance: ApplianceLoad; onChange: (appliance: ApplianceLoad) => void }) {
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
    <article className={appliance.enabled ? 'appliance-card' : 'appliance-card disabled'}>
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

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 0 }).format(value);
}
