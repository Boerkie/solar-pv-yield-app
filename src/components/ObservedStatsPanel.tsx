import { ObservedAnnualStats, SimulationResult, SystemLimits } from '../types';
import { simulateUsage } from '../utils/usageSimulation';
import { MetricCard } from './MetricCard';

type ObservedStatsPanelProps = {
  result: SimulationResult;
  systemLimits: SystemLimits;
  observedStats: ObservedAnnualStats[];
  onChange: (observedStats: ObservedAnnualStats[]) => void;
};

export function ObservedStatsPanel({ result, systemLimits, observedStats, onChange }: ObservedStatsPanelProps) {
  const usage = simulateUsage(result.hourlyByDay, systemLimits);
  const validRows = observedStats.filter((row) => row.pvGeneratedKwh > 0);
  const observedAverage = summariseObservedRows(validRows);
  const usageGeneratedKwh = usage.totals.directSolarKwh + usage.totals.batteryChargeKwh;
  const actualToPvgisFactor = result.totals.annualKwh > 0 ? observedAverage.pvGeneratedKwh / result.totals.annualKwh : 0;
  const actualToUsageFactor = usageGeneratedKwh > 0 ? observedAverage.pvGeneratedKwh / usageGeneratedKwh : 0;

  function updateRow(rowId: string, field: keyof ObservedAnnualStats, value: number) {
    onChange(observedStats.map((row) => row.id === rowId ? { ...row, [field]: value } : row));
  }

  return (
    <section className="observed-card">
      <div className="section-heading">
        <div>
          <h2>Observed reality check</h2>
          <p>Optional local-only annual stats. They are used to compare PVGIS potential and the usage-limit model with what your inverter actually reported.</p>
        </div>
      </div>

      <div className="observed-table">
        <span>Year</span>
        <span>PV generated kWh</span>
        <span>Grid import kWh</span>
        <span>Battery charge/discharge kWh</span>
        {observedStats.map((row) => (
          <ObservedRow key={row.id} row={row} onChange={updateRow} />
        ))}
      </div>

      {validRows.length > 0 ? (
        <>
          <div className="metric-grid">
            <MetricCard label="Observed PV generated" value={`${formatNumber(observedAverage.pvGeneratedKwh)} kWh/year`} helpText={`Average of ${validRows.length} observed year${validRows.length === 1 ? '' : 's'}`} />
            <MetricCard label="PVGIS potential" value={`${formatNumber(result.totals.annualKwh)} kWh/year`} helpText="Unconstrained historical estimate" />
            <MetricCard label="Usage model generated" value={`${formatNumber(usageGeneratedKwh)} kWh/year`} helpText="After current load, battery and export limits" />
            <MetricCard label="Observed/PVGIS factor" value={`${Math.round(actualToPvgisFactor * 100)}%`} helpText="Useful calibration signal" />
          </div>

          <div className="calibration-summary-grid">
            <span><strong>{formatNumber(observedAverage.directSolarKwh)} kWh</strong> implied direct solar use</span>
            <span><strong>{formatNumber(observedAverage.houseLoadKwh)} kWh</strong> implied total house load</span>
            <span><strong>{formatNumber(observedAverage.gridImportKwh)} kWh</strong> average grid import</span>
            <span><strong>{Math.round(actualToUsageFactor * 100)}%</strong> observed vs usage model</span>
          </div>
        </>
      ) : (
        <div className="empty-inline">Enter one or more observed years to see calibration factors. The values stay in this browser only.</div>
      )}
    </section>
  );
}

function ObservedRow({ row, onChange }: { row: ObservedAnnualStats; onChange: (rowId: string, field: keyof ObservedAnnualStats, value: number) => void }) {
  return (
    <>
      <label>
        <span className="sr-only">Observed year</span>
        <input type="number" value={row.year} onChange={(event) => onChange(row.id, 'year', Number(event.target.value))} />
      </label>
      <label>
        <span className="sr-only">PV generated kWh</span>
        <input type="number" min="0" step="10" value={row.pvGeneratedKwh} onChange={(event) => onChange(row.id, 'pvGeneratedKwh', Number(event.target.value))} />
      </label>
      <label>
        <span className="sr-only">Grid import kWh</span>
        <input type="number" min="0" step="10" value={row.gridImportKwh} onChange={(event) => onChange(row.id, 'gridImportKwh', Number(event.target.value))} />
      </label>
      <label>
        <span className="sr-only">Battery charge and discharge kWh</span>
        <input type="number" min="0" step="10" value={row.batteryThroughputKwh} onChange={(event) => onChange(row.id, 'batteryThroughputKwh', Number(event.target.value))} />
      </label>
    </>
  );
}

function summariseObservedRows(rows: ObservedAnnualStats[]) {
  const divisor = Math.max(rows.length, 1);
  const totals = rows.reduce((total, row) => {
    const directSolarKwh = Math.max(row.pvGeneratedKwh - row.batteryThroughputKwh, 0);
    const houseLoadKwh = row.pvGeneratedKwh + row.gridImportKwh;

    return {
      pvGeneratedKwh: total.pvGeneratedKwh + row.pvGeneratedKwh,
      gridImportKwh: total.gridImportKwh + row.gridImportKwh,
      batteryThroughputKwh: total.batteryThroughputKwh + row.batteryThroughputKwh,
      directSolarKwh: total.directSolarKwh + directSolarKwh,
      houseLoadKwh: total.houseLoadKwh + houseLoadKwh
    };
  }, {
    pvGeneratedKwh: 0,
    gridImportKwh: 0,
    batteryThroughputKwh: 0,
    directSolarKwh: 0,
    houseLoadKwh: 0
  });

  return {
    pvGeneratedKwh: totals.pvGeneratedKwh / divisor,
    gridImportKwh: totals.gridImportKwh / divisor,
    batteryThroughputKwh: totals.batteryThroughputKwh / divisor,
    directSolarKwh: totals.directSolarKwh / divisor,
    houseLoadKwh: totals.houseLoadKwh / divisor
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 0 }).format(value);
}
