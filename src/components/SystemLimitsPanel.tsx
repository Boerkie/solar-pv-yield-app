import { SystemLimits } from '../types';

type SystemLimitsPanelProps = {
  systemLimits: SystemLimits;
  onChange: (systemLimits: SystemLimits) => void;
};

export function SystemLimitsPanel({ systemLimits, onChange }: SystemLimitsPanelProps) {
  const batteryChargeLimitKw = calculateBatteryChargeLimitKw(systemLimits);
  const usableBatteryKwh = systemLimits.batteryCapacityKwh * Math.max(0, 100 - systemLimits.batteryReservePercent) / 100;
  const idleUsableSolarKw = batteryChargeLimitKw + (systemLimits.idleLoadWatts / 1000);

  function updateField(field: keyof SystemLimits, value: number | string) {
    onChange({
      ...systemLimits,
      [field]: value
    });
  }

  return (
    <section className="system-limits-card card">
      <div className="section-heading">
        <div>
          <h2>System limits</h2>
          <p>These limits are used later to estimate usable solar, battery charging, grid import and curtailed energy.</p>
        </div>
        <div className="limit-chip">
          <span>Battery charge ceiling</span>
          <strong>{batteryChargeLimitKw.toFixed(2)} kW</strong>
        </div>
      </div>

      <div className="input-grid">
        <label>
          Inverter max kW
          <input type="number" min="0" step="0.1" value={systemLimits.inverterMaxKw} onChange={(event) => updateField('inverterMaxKw', Number(event.target.value))} />
        </label>
        <label>
          Battery capacity kWh
          <input type="number" min="0" step="0.1" value={systemLimits.batteryCapacityKwh} onChange={(event) => updateField('batteryCapacityKwh', Number(event.target.value))} />
        </label>
        <label>
          Reserve %
          <input type="number" min="0" max="100" value={systemLimits.batteryReservePercent} onChange={(event) => updateField('batteryReservePercent', Number(event.target.value))} />
        </label>
        <label>
          Shutdown floor %
          <input type="number" min="0" max="100" value={systemLimits.batteryShutdownPercent} onChange={(event) => updateField('batteryShutdownPercent', Number(event.target.value))} />
        </label>
        <label>
          Charge amps total
          <input type="number" min="0" step="1" value={systemLimits.batteryChargeCurrentAmps} onChange={(event) => updateField('batteryChargeCurrentAmps', Number(event.target.value))} />
        </label>
        <label>
          Battery voltage
          <input type="number" min="0" step="1" value={systemLimits.batteryNominalVoltage} onChange={(event) => updateField('batteryNominalVoltage', Number(event.target.value))} />
        </label>
        <label>
          Idle load W
          <input type="number" min="0" step="10" value={systemLimits.idleLoadWatts} onChange={(event) => updateField('idleLoadWatts', Number(event.target.value))} />
        </label>
        <label>
          Starting SOC %
          <input type="number" min="0" max="100" value={systemLimits.startingBatterySocPercent} onChange={(event) => updateField('startingBatterySocPercent', Number(event.target.value))} />
        </label>
        <label>
          Export mode
          <select value={systemLimits.exportMode} onChange={(event) => updateField('exportMode', event.target.value)}>
            <option value="zero-export">Zero export</option>
            <option value="export-limit">Export limit</option>
            <option value="unlimited-export">Export allowed</option>
          </select>
        </label>
        <label>
          Export limit kW
          <input
            type="number"
            min="0"
            step="0.1"
            disabled={systemLimits.exportMode !== 'export-limit'}
            value={systemLimits.exportLimitKw}
            onChange={(event) => updateField('exportLimitKw', Number(event.target.value))}
          />
        </label>
      </div>

      <div className="limit-summary-grid">
        <span><strong>{usableBatteryKwh.toFixed(1)} kWh</strong> usable above reserve</span>
        <span><strong>{idleUsableSolarKw.toFixed(2)} kW</strong> usable at idle while charging</span>
        <span><strong>{systemLimits.exportMode === 'zero-export' ? 'Zero export' : 'Export enabled'}</strong> export policy</span>
      </div>
    </section>
  );
}

function calculateBatteryChargeLimitKw(systemLimits: SystemLimits) {
  return (systemLimits.batteryChargeCurrentAmps * systemLimits.batteryNominalVoltage) / 1000;
}
