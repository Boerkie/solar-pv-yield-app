import { EconomicAssumptions, LoadProfile, SimulationResult, SystemLimits } from '../types';
import { simulateUsage } from '../utils/usageSimulation';
import { MetricCard } from './MetricCard';

type EconomicsPanelProps = {
  result: SimulationResult;
  systemLimits: SystemLimits;
  loadProfile: LoadProfile;
  economicAssumptions: EconomicAssumptions;
  onChange: (economicAssumptions: EconomicAssumptions) => void;
};

export function EconomicsPanel({ result, systemLimits, loadProfile, economicAssumptions, onChange }: EconomicsPanelProps) {
  const usage = simulateUsage(result.hourlyByDay, systemLimits, loadProfile);
  const exportRate = economicAssumptions.importTariffRandPerKwh * (economicAssumptions.exportCreditPercent / 100);
  const selfConsumedKwh = usage.totals.directSolarKwh + usage.totals.batteryDischargeKwh;
  const selfConsumptionSavings = selfConsumedKwh * economicAssumptions.importTariffRandPerKwh;
  const exportRevenue = usage.totals.exportedKwh * exportRate;
  const annualBenefit = selfConsumptionSavings + exportRevenue;
  const potentialExportRevenue = usage.totals.curtailedKwh * exportRate;
  const exportPaybackYears = potentialExportRevenue > 0 ? economicAssumptions.exportEnablementCostRand / potentialExportRevenue : 0;
  const systemPaybackYears = economicAssumptions.systemCostRand > 0 && annualBenefit > 0 ? economicAssumptions.systemCostRand / annualBenefit : 0;

  function updateField(field: keyof EconomicAssumptions, value: number) {
    onChange({
      ...economicAssumptions,
      [field]: value
    });
  }

  return (
    <section className="economics-card">
      <div className="section-heading">
        <div>
          <h2>Economics</h2>
          <p>Estimate avoided import cost, optional export credit and rough payback using the current usage-limit simulation.</p>
        </div>
      </div>

      <div className="input-grid economics-inputs">
        <label>
          Import tariff R/kWh
          <input type="number" min="0" step="0.01" value={economicAssumptions.importTariffRandPerKwh} onChange={(event) => updateField('importTariffRandPerKwh', Number(event.target.value))} />
        </label>
        <label>
          Export credit %
          <input type="number" min="0" max="100" value={economicAssumptions.exportCreditPercent} onChange={(event) => updateField('exportCreditPercent', Number(event.target.value))} />
        </label>
        <label>
          Extra export setup cost (R)
          <input type="number" min="0" step="1000" value={economicAssumptions.exportEnablementCostRand} onChange={(event) => updateField('exportEnablementCostRand', Number(event.target.value))} />
        </label>
        <label>
          Installed system cost, excluding export setup (R)
          <input type="number" min="0" step="1000" value={economicAssumptions.systemCostRand} onChange={(event) => updateField('systemCostRand', Number(event.target.value))} />
        </label>
      </div>

      <div className="metric-grid">
        <MetricCard label="Avoided grid import value" value={formatCurrency(selfConsumptionSavings)} helpText={`${formatNumber(selfConsumedKwh)} kWh self-consumed at R${economicAssumptions.importTariffRandPerKwh.toFixed(2)}/kWh`} />
        <MetricCard label="Actual export credit" value={formatCurrency(exportRevenue)} helpText={`${formatNumber(usage.totals.exportedKwh)} kWh exported at R${exportRate.toFixed(2)}/kWh`} />
        <MetricCard label="Annual value in current mode" value={formatCurrency(annualBenefit)} helpText="Avoided import plus actual export credit" />
        <MetricCard label="Installed system payback" value={systemPaybackYears > 0 ? `${systemPaybackYears.toFixed(1)} years` : 'Add system cost'} helpText="Does not include extra export setup cost" />
      </div>

      <div className="export-payback-box">
        <div>
          <strong>Export enablement check</strong>
          <span>
            If export became available, current unused PV could be worth about {formatCurrency(potentialExportRevenue)} per year at the configured export credit.
          </span>
        </div>
        <div>
          <strong>{exportPaybackYears > 0 ? `${exportPaybackYears.toFixed(1)} years` : 'No payback'}</strong>
          <span>Estimated payback on the separate {formatCurrency(economicAssumptions.exportEnablementCostRand)} export setup cost.</span>
        </div>
      </div>
    </section>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 0 }).format(value);
}
