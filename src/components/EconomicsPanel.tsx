import { EconomicAssumptions, SimulationResult, SystemLimits } from '../types';
import { simulateUsage } from '../utils/usageSimulation';
import { MetricCard } from './MetricCard';

type EconomicsPanelProps = {
  result: SimulationResult;
  systemLimits: SystemLimits;
  economicAssumptions: EconomicAssumptions;
  onChange: (economicAssumptions: EconomicAssumptions) => void;
};

export function EconomicsPanel({ result, systemLimits, economicAssumptions, onChange }: EconomicsPanelProps) {
  const usage = simulateUsage(result.hourlyByDay, systemLimits);
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
          <p>Estimate avoided import cost, possible export credit and rough payback using the current usage-limit simulation.</p>
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
          Export enablement cost R
          <input type="number" min="0" step="1000" value={economicAssumptions.exportEnablementCostRand} onChange={(event) => updateField('exportEnablementCostRand', Number(event.target.value))} />
        </label>
        <label>
          Total system cost R
          <input type="number" min="0" step="1000" value={economicAssumptions.systemCostRand} onChange={(event) => updateField('systemCostRand', Number(event.target.value))} />
        </label>
      </div>

      <div className="metric-grid">
        <MetricCard label="Self-consumed value" value={formatCurrency(selfConsumptionSavings)} helpText={`${formatNumber(selfConsumedKwh)} kWh at R${economicAssumptions.importTariffRandPerKwh.toFixed(2)}/kWh`} />
        <MetricCard label="Export revenue" value={formatCurrency(exportRevenue)} helpText={`${formatNumber(usage.totals.exportedKwh)} kWh at R${exportRate.toFixed(2)}/kWh`} />
        <MetricCard label="Annual benefit" value={formatCurrency(annualBenefit)} helpText="Self-consumption plus export credit" />
        <MetricCard label="System payback" value={systemPaybackYears > 0 ? `${systemPaybackYears.toFixed(1)} years` : 'Add cost'} helpText="Uses total system cost input" />
      </div>

      <div className="export-payback-box">
        <div>
          <strong>Export enablement check</strong>
          <span>
            Current curtailment could be worth {formatCurrency(potentialExportRevenue)} per year at the configured export credit.
          </span>
        </div>
        <div>
          <strong>{exportPaybackYears > 0 ? `${exportPaybackYears.toFixed(1)} years` : 'No payback'}</strong>
          <span>Estimated payback on {formatCurrency(economicAssumptions.exportEnablementCostRand)} export enablement cost.</span>
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
