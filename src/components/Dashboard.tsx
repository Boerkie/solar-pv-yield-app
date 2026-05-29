import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Bar,
  ComposedChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { HourlyAggregate, SimulationResult, SystemLimits } from '../types';
import { simulateUsage } from '../utils/usageSimulation';
import { MetricCard } from './MetricCard';

type DashboardProps = {
  result: SimulationResult;
  systemLimits: SystemLimits;
};

type PeriodType = 'day' | 'week' | 'month' | 'year';

type StringLabel = {
  id: string;
  name: string;
  colour: string;
  energyKey: string;
  powerKey: string;
};

type StickySelection = {
  label: string;
  rows: Array<{
    name: string;
    value: number;
    colour?: string;
    unit: string;
  }>;
};

const TOTAL_COLOUR = '#2563eb';

const ARRAY_COLOURS = [
  '#f97316',
  '#16a34a',
  '#a855f7',
  '#dc2626',
  '#0891b2',
  '#ca8a04',
  '#db2777',
  '#65a30d',
  '#7c3aed',
  '#ea580c'
];

const MONTH_COLOURS = [
  '#0f766e',
  '#7c3aed',
  '#c2410c',
  '#15803d',
  '#be123c',
  '#0369a1',
  '#a16207',
  '#4338ca',
  '#b45309',
  '#047857',
  '#9333ea',
  '#e11d48'
];

const MONTH_OPTIONS = [
  { value: 1, label: 'January', shortLabel: 'Jan' },
  { value: 2, label: 'February', shortLabel: 'Feb' },
  { value: 3, label: 'March', shortLabel: 'Mar' },
  { value: 4, label: 'April', shortLabel: 'Apr' },
  { value: 5, label: 'May', shortLabel: 'May' },
  { value: 6, label: 'June', shortLabel: 'Jun' },
  { value: 7, label: 'July', shortLabel: 'Jul' },
  { value: 8, label: 'August', shortLabel: 'Aug' },
  { value: 9, label: 'September', shortLabel: 'Sep' },
  { value: 10, label: 'October', shortLabel: 'Oct' },
  { value: 11, label: 'November', shortLabel: 'Nov' },
  { value: 12, label: 'December', shortLabel: 'Dec' }
];

export function Dashboard({ result, systemLimits }: DashboardProps) {
  const [periodType, setPeriodType] = useState<PeriodType>('year');
  const [selectedMonth, setSelectedMonth] = useState(4);
  const [selectedWeek, setSelectedWeek] = useState(16);
  const [selectedDate, setSelectedDate] = useState('2026-04-01');
  const [hourlySelection, setHourlySelection] = useState<StickySelection | null>(null);
  const [comparisonSelection, setComparisonSelection] = useState<StickySelection | null>(null);

  useEffect(() => {
    function clearStickySelections() {
      setHourlySelection(null);
      setComparisonSelection(null);
    }

    document.addEventListener('click', clearStickySelections);
    return () => document.removeEventListener('click', clearStickySelections);
  }, []);

  const stringLabels = useMemo(
    () => result.strings.map((pvString, index) => ({
      id: pvString.id,
      name: pvString.name,
      colour: ARRAY_COLOURS[index % ARRAY_COLOURS.length],
      energyKey: `array-${pvString.id}-kwh`,
      powerKey: `array-${pvString.id}-kw`
    })),
    [result.strings]
  );

  const monthlyProductionData = useMemo(() => result.monthly.map((monthRow) => flattenEnergyRow(monthRow, stringLabels)), [result.monthly, stringLabels]);
  const dailyYieldData = useMemo(() => result.monthly.map((monthRow) => ({
    label: monthRow.label,
    'Average kWh/day': monthRow.averageDailyKwh
  })), [result.monthly]);
  const usageSimulation = useMemo(() => simulateUsage(result.hourlyByDay, systemLimits), [result.hourlyByDay, systemLimits]);
  const usageChartData = useMemo(() => usageSimulation.monthly.map((monthRow) => ({
    label: monthRow.label,
    'Direct solar': monthRow.directSolarKwh,
    'Battery discharge': monthRow.batteryDischargeKwh,
    'Grid import': monthRow.gridImportKwh,
    'Curtailed': monthRow.curtailedKwh,
    'Exported': monthRow.exportedKwh
  })), [usageSimulation.monthly]);

  const selectedDay = Number(selectedDate.slice(8, 10));
  const selectedDateMonth = Number(selectedDate.slice(5, 7));

  const dayProfileData = useMemo(() => result.hourlyByDay
    .filter((row) => row.month === selectedDateMonth && row.day === selectedDay)
    .map((row) => flattenHourlyRow(row, stringLabels)), [result.hourlyByDay, selectedDateMonth, selectedDay, stringLabels]);

  const monthProfileData = useMemo(() => result.hourlyByMonth
    .filter((row) => row.month === selectedMonth)
    .map((row) => flattenHourlyRow(row, stringLabels)), [result.hourlyByMonth, selectedMonth, stringLabels]);

  const weekProfileData = useMemo(
    () => buildWeekProfileData(result.hourlyByDay, stringLabels, selectedWeek),
    [result.hourlyByDay, stringLabels, selectedWeek]
  );

  const yearProfileData = useMemo(() => buildYearProfileData(result.hourlyByMonth), [result.hourlyByMonth]);

  const hourlyProfileData = periodType === 'year'
    ? yearProfileData
    : periodType === 'week'
      ? weekProfileData
      : periodType === 'day'
        ? dayProfileData
        : monthProfileData;

  const hourlyLineKeys = periodType === 'year'
    ? MONTH_OPTIONS.map((month, index) => ({ key: `${month.shortLabel} combined kW`, name: month.label, colour: MONTH_COLOURS[index % MONTH_COLOURS.length] }))
    : [
      ...stringLabels.map((pvString) => ({ key: pvString.powerKey, name: pvString.name, colour: pvString.colour })),
      { key: 'combinedKw', name: 'Combined', colour: TOTAL_COLOUR }
    ];

  const periodSummary = getPeriodSummary(result, periodType, selectedMonth, selectedWeek, selectedDateMonth, selectedDay);
  const peakRows = getPeakRows(hourlyProfileData, hourlyLineKeys);

  return (
    <section className="dashboard">
      <div className="notice-card">
        <strong>Estimate notice</strong>
        <span>{result.estimateNotice}</span>
      </div>

      <div className="metric-grid">
        <MetricCard label="Total DC capacity" value={`${result.totals.capacityKwp.toFixed(2)} kWp`} helpText="Configured array total" />
        <MetricCard label="PVGIS unconstrained potential" value={`${formatNumber(result.totals.annualKwh)} kWh/year`} helpText="Before house load, battery and export limits" />
        <MetricCard label="Average potential per day" value={`${result.totals.averageDailyKwh.toFixed(2)} kWh/day`} helpText="PVGIS annual potential / 365" />
        <MetricCard label="Data provider" value={result.provider} helpText={result.cache?.hit ? 'Loaded from local API cache' : 'Fresh provider request'} />
      </div>

      <div className="usage-card">
        <div className="chart-header">
          <h2>Usage limits</h2>
          <p>Hour-by-hour estimate with idle load, reserve SOC, battery charge limit and export policy applied to the PVGIS typical year.</p>
        </div>
        <div className="metric-grid">
          <MetricCard label="Max battery charging power" value={`${usageSimulation.batteryChargeLimitKw.toFixed(2)} kW`} helpText={`${systemLimits.batteryChargeCurrentAmps} A total at ${systemLimits.batteryNominalVoltage} V`} />
          <MetricCard label="PV usable at base load" value={`${usageSimulation.idleSolarUseCeilingKw.toFixed(2)} kW`} helpText="Base load plus max battery charging power" />
          <MetricCard label="Estimated unused PV" value={`${formatNumber(usageSimulation.totals.curtailedKwh)} kWh/year`} helpText={systemLimits.exportMode === 'zero-export' ? 'Zero-export surplus and inverter clipping' : 'Surplus after export and charging'} />
          <MetricCard label="SOC range" value={`${usageSimulation.totals.minSocPercent.toFixed(0)}-${usageSimulation.totals.maxSocPercent.toFixed(0)}%`} helpText={`Planning reserve ${systemLimits.batteryReservePercent}%`} />
        </div>
        <div className="usage-flow-grid">
          <span><strong>{formatNumber(usageSimulation.totals.directSolarKwh)} kWh</strong> PV used immediately by house load</span>
          <span><strong>{formatNumber(usageSimulation.totals.batteryChargeKwh)} kWh</strong> PV accepted by the battery</span>
          <span><strong>{formatNumber(usageSimulation.totals.batteryDischargeKwh)} kWh</strong> load later served from battery</span>
          <span><strong>{formatNumber(usageSimulation.totals.gridImportKwh)} kWh</strong> load imported from grid</span>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={usageChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis unit=" kWh" />
            <Tooltip formatter={(value, name) => [formatDecimal(Number(value), 0), name]} />
            <Legend />
            <Bar dataKey="Direct solar" stackId="use" fill="#16a34a" />
            <Bar dataKey="Battery discharge" stackId="use" fill="#2563eb" />
            <Bar dataKey="Grid import" fill="#64748b" />
            <Bar dataKey="Curtailed" fill="#dc2626" />
            {systemLimits.exportMode !== 'zero-export' ? <Bar dataKey="Exported" fill="#0f766e" /> : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="period-card">
        <div>
          <h2>Period selector</h2>
          <p>Select the view period. The values remain estimates based on historical averages.</p>
        </div>
        <div className="period-controls">
          <label>
            Period
            <select value={periodType} onChange={(event) => setPeriodType(event.target.value as PeriodType)}>
              <option value="day">Single day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="year">Whole year</option>
            </select>
          </label>
          {periodType === 'day' ? (
            <label>
              Day
              <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
            </label>
          ) : null}
          {periodType === 'week' ? (
            <label>
              Week
              <input type="number" min="1" max="53" value={selectedWeek} onChange={(event) => setSelectedWeek(Number(event.target.value))} />
            </label>
          ) : null}
          {periodType === 'month' ? (
            <label>
              Month
              <select value={selectedMonth} onChange={(event) => setSelectedMonth(Number(event.target.value))}>
                {MONTH_OPTIONS.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
              </select>
            </label>
          ) : null}
        </div>
      </div>

      <div className="metric-grid">
        <MetricCard label="Selected period yield" value={`${formatNumber(periodSummary.combinedKwh)} kWh`} helpText={periodSummary.label} />
        <MetricCard label="Selected period average" value={`${periodSummary.averageDailyKwh.toFixed(2)} kWh/day`} helpText="Combined system" />
        {result.strings.map((pvString) => (
          <MetricCard
            key={pvString.id}
            label={`${pvString.name} contribution`}
            value={`${formatNumber(periodSummary.strings[pvString.id] ?? 0)} kWh`}
            helpText={`${percentage(periodSummary.strings[pvString.id] ?? 0, periodSummary.combinedKwh)} of selected period`}
          />
        ))}
      </div>

      <ChartCard
        title="Hourly average production profile"
        subtitle={periodType === 'year'
          ? 'kW by hour for the combined system, shown as one average-day curve per month.'
          : 'kW by hour. Arrays are split by orientation, with the combined system kept as the blue total line.'}
      >
        <div className="sticky-chart-area" onClick={(event) => event.stopPropagation()}>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={hourlyProfileData} onClick={(chartState) => setHourlySelection(readStickySelection(chartState, 'kW'))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis unit=" kW" />
              <Tooltip formatter={(value, name) => [formatDecimal(Number(value), 2), name]} />
              <Legend />
              {hourlyLineKeys.map((line) => (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={line.name}
                  stroke={line.colour}
                  strokeWidth={line.name === 'Combined' ? 3 : 2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <StickyChartPopup selection={hourlySelection} />
        </div>
        <div className="peak-row">
          {peakRows.map((peakRow) => (
            <span key={peakRow.label}><strong>{peakRow.label}</strong> peaks near {peakRow.hourLabel} at {peakRow.kw.toFixed(2)} kW</span>
          ))}
        </div>
      </ChartCard>

      <ChartCard title="Per-array vs combined comparison" subtitle="Annual contribution pattern across the year. Combined system remains the blue total line.">
        <div className="sticky-chart-area" onClick={(event) => event.stopPropagation()}>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={monthlyProductionData} onClick={(chartState) => setComparisonSelection(readStickySelection(chartState, 'kWh'))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis unit=" kWh" />
              <Tooltip formatter={(value, name) => [formatDecimal(Number(value), 0), name]} />
              <Legend />
              {stringLabels.map((pvString) => (
                <Line
                  key={pvString.id}
                  type="monotone"
                  dataKey={pvString.energyKey}
                  name={pvString.name}
                  stroke={pvString.colour}
                  strokeWidth={2}
                />
              ))}
              <Line type="monotone" dataKey="combinedKwh" name="Combined" stroke={TOTAL_COLOUR} strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
          <StickyChartPopup selection={comparisonSelection} />
        </div>
      </ChartCard>

      <div className="chart-grid two-columns bottom-charts">
        <ChartCard title="Monthly production" subtitle="kWh/month, averaged from PVGIS historical years. Combined system remains the blue total line.">
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={monthlyProductionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis unit=" kWh" />
              <Tooltip formatter={(value, name) => [formatDecimal(Number(value), 0), name]} />
              <Legend />
              {stringLabels.map((pvString) => (
                <Bar
                  key={pvString.id}
                  dataKey={pvString.energyKey}
                  name={pvString.name}
                  stackId="strings"
                  fill={pvString.colour}
                />
              ))}
              <Line type="monotone" dataKey="combinedKwh" name="Combined" stroke={TOTAL_COLOUR} strokeWidth={3} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Average daily yield by month">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={dailyYieldData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis unit=" kWh/day" />
              <Tooltip formatter={(value, name) => [formatDecimal(Number(value), 2), name]} />
              <Legend />
              <Line type="monotone" dataKey="Average kWh/day" stroke={TOTAL_COLOUR} strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </section>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

function StickyChartPopup({ selection }: { selection: StickySelection | null }) {
  if (!selection) {
    return null;
  }

  return (
    <div className="sticky-tooltip" onClick={(event) => event.stopPropagation()}>
      <strong>{selection.label}</strong>
      {selection.rows.map((row) => (
        <span key={row.name}>
          <i style={{ background: row.colour ?? '#172033' }} />
          {row.name}: {formatDecimal(row.value, row.unit === 'kWh' ? 0 : 2)} {row.unit}
        </span>
      ))}
    </div>
  );
}

function flattenEnergyRow(row: { label: string; combinedKwh: number; strings: Record<string, number> }, stringLabels: StringLabel[]) {
  return {
    label: row.label,
    combinedKwh: row.combinedKwh,
    ...Object.fromEntries(stringLabels.map((pvString) => [pvString.energyKey, row.strings[pvString.id] ?? 0]))
  };
}

function flattenHourlyRow(row: { label: string; combinedKw: number; strings: Record<string, { kw: number }> }, stringLabels: StringLabel[]) {
  return {
    label: row.label,
    combinedKw: row.combinedKw,
    ...Object.fromEntries(stringLabels.map((pvString) => [pvString.powerKey, row.strings[pvString.id]?.kw ?? 0]))
  };
}

function buildWeekProfileData(hourlyRows: HourlyAggregate[], stringLabels: StringLabel[], selectedWeek: number) {
  const groupsByHour = new Map<number, {
    count: number;
    combinedKw: number;
    strings: Record<string, number>;
  }>();

  hourlyRows
    .filter((row) => row.day !== undefined && getWeekOfYear(2026, row.month, row.day) === selectedWeek)
    .forEach((row) => {
      const group = groupsByHour.get(row.hour) ?? {
        count: 0,
        combinedKw: 0,
        strings: Object.fromEntries(stringLabels.map((pvString) => [pvString.id, 0]))
      };

      group.count += 1;
      group.combinedKw += row.combinedKw;
      stringLabels.forEach((pvString) => {
        group.strings[pvString.id] += row.strings[pvString.id]?.kw ?? 0;
      });

      groupsByHour.set(row.hour, group);
    });

  return range(0, 23).map((hour) => {
    const group = groupsByHour.get(hour);
    const divisor = Math.max(group?.count ?? 0, 1);

    return {
      label: `${String(hour).padStart(2, '0')}:00`,
      combinedKw: round3((group?.combinedKw ?? 0) / divisor),
      ...Object.fromEntries(stringLabels.map((pvString) => [pvString.powerKey, round3((group?.strings[pvString.id] ?? 0) / divisor)]))
    };
  });
}

function buildYearProfileData(hourlyRows: HourlyAggregate[]) {
  return range(0, 23).map((hour) => {
    const row: Record<string, string | number> = {
      label: `${String(hour).padStart(2, '0')}:00`
    };

    MONTH_OPTIONS.forEach((month) => {
      const monthHour = hourlyRows.find((hourlyRow) => hourlyRow.month === month.value && hourlyRow.hour === hour);
      row[`${month.shortLabel} combined kW`] = monthHour?.combinedKw ?? 0;
    });

    return row;
  });
}

function readStickySelection(chartState: unknown, unit: string): StickySelection | null {
  const state = chartState as {
    activeLabel?: string;
    activePayload?: Array<{
      name?: string;
      value?: number | string;
      color?: string;
      stroke?: string;
      fill?: string;
    }>;
  } | null;

  if (!state?.activeLabel || !Array.isArray(state.activePayload) || state.activePayload.length === 0) {
    return null;
  }

  return {
    label: state.activeLabel,
    rows: state.activePayload
      .filter((payload) => Number.isFinite(Number(payload.value)))
      .map((payload) => ({
        name: String(payload.name ?? 'Series'),
        value: Number(payload.value),
        colour: payload.color ?? payload.stroke ?? payload.fill,
        unit
      }))
  };
}

function getPeriodSummary(result: SimulationResult, periodType: PeriodType, month: number, week: number, dateMonth: number, day: number) {
  if (periodType === 'year') {
    return {
      label: 'Whole year',
      combinedKwh: result.totals.annualKwh,
      averageDailyKwh: result.totals.averageDailyKwh,
      strings: Object.fromEntries(result.strings.map((pvString) => [pvString.id, pvString.annualTotalKwh]))
    };
  }

  if (periodType === 'month') {
    const monthRow = result.monthly.find((row) => row.month === month) ?? result.monthly[0];
    return {
      label: monthRow.label,
      combinedKwh: monthRow.combinedKwh,
      averageDailyKwh: monthRow.averageDailyKwh,
      strings: monthRow.strings
    };
  }

  if (periodType === 'week') {
    const weekRow = result.weekly.find((row) => row.week === week) ?? result.weekly[0];
    return {
      label: weekRow.label,
      combinedKwh: weekRow.combinedKwh,
      averageDailyKwh: weekRow.averageDailyKwh,
      strings: weekRow.strings
    };
  }

  const dayRow = result.daily.find((row) => row.month === dateMonth && row.day === day) ?? result.daily[0];
  return {
    label: dayRow.label,
    combinedKwh: dayRow.combinedKwh,
    averageDailyKwh: dayRow.combinedKwh,
    strings: dayRow.strings
  };
}

function getPeakRows(hourlyRows: Array<Record<string, string | number>>, lines: Array<{ key: string; name: string }>) {
  return lines.map((line) => {
    const peakRow = hourlyRows.reduce((bestRow, currentRow) => {
      const bestValue = Number(bestRow?.[line.key] ?? -1);
      const currentValue = Number(currentRow[line.key] ?? -1);
      return currentValue > bestValue ? currentRow : bestRow;
    }, hourlyRows[0]);

    return {
      label: line.name,
      hourLabel: String(peakRow?.label ?? 'n/a'),
      kw: Number(peakRow?.[line.key] ?? 0)
    };
  });
}

function getWeekOfYear(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  const yearStart = new Date(Date.UTC(year, 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + yearStart.getUTCDay() + 1) / 7);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 0 }).format(value);
}

function formatDecimal(value: number, maximumFractionDigits: number) {
  return new Intl.NumberFormat('en-ZA', { maximumFractionDigits }).format(value);
}

function percentage(value: number, total: number) {
  if (!total) {
    return '0%';
  }

  return `${Math.round((value / total) * 100)}%`;
}

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function round3(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 1000) / 1000;
}
