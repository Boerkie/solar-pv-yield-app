import { ApplianceLoad, HourlyAggregate, LoadProfile, MonthlyUsageAggregate, SystemLimits, UsageSimulationResult } from '../types';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function simulateUsage(hourlyRows: HourlyAggregate[], systemLimits: SystemLimits, loadProfile?: LoadProfile): UsageSimulationResult {
  const batteryChargeLimitKw = calculateBatteryChargeLimitKw(systemLimits);
  const baseLoadKw = (loadProfile?.dayBaseWatts ?? systemLimits.idleLoadWatts) / 1000;
  const reserveKwh = systemLimits.batteryCapacityKwh * clamp(systemLimits.batteryReservePercent, 0, 100) / 100;
  const fullBatteryKwh = Math.max(systemLimits.batteryCapacityKwh, 0);
  const usableBatteryKwh = Math.max(fullBatteryKwh - reserveKwh, 0);
  let batteryKwh = fullBatteryKwh * clamp(systemLimits.startingBatterySocPercent, systemLimits.batteryReservePercent, 100) / 100;
  let minBatteryKwh = batteryKwh;
  let maxBatteryKwh = batteryKwh;

  const monthRows = new Map<number, MonthlyUsageAggregate>();

  sortedHourlyRows(hourlyRows).forEach((hourlyRow) => {
    const row = monthRows.get(hourlyRow.month) ?? createMonthlyRow(hourlyRow.month);
    const rawPvKwh = Math.max(hourlyRow.combinedKwh, 0);
    const pvAfterInverterKwh = Math.min(rawPvKwh, Math.max(systemLimits.inverterMaxKw, 0));
    const inverterClippedKwh = Math.max(rawPvKwh - pvAfterInverterKwh, 0);
    const loadKwh = calculateHourlyLoadKwh(hourlyRow, systemLimits, loadProfile);
    const directSolarKwh = Math.min(pvAfterInverterKwh, loadKwh);
    const remainingLoadKwh = Math.max(loadKwh - directSolarKwh, 0);
    const batteryAvailableKwh = Math.max(batteryKwh - reserveKwh, 0);
    const batteryDischargeKwh = Math.min(remainingLoadKwh, batteryAvailableKwh);
    batteryKwh -= batteryDischargeKwh;

    const gridImportKwh = Math.max(remainingLoadKwh - batteryDischargeKwh, 0);
    const surplusPvKwh = Math.max(pvAfterInverterKwh - directSolarKwh, 0);
    const batteryHeadroomKwh = Math.max(fullBatteryKwh - batteryKwh, 0);
    const batteryChargeKwh = Math.min(surplusPvKwh, batteryChargeLimitKw, batteryHeadroomKwh);
    batteryKwh += batteryChargeKwh;

    const exportableKwh = Math.max(surplusPvKwh - batteryChargeKwh, 0);
    const exportedKwh = calculateExportedKwh(exportableKwh, systemLimits);
    const curtailedKwh = Math.max(exportableKwh - exportedKwh, 0);

    row.pvPotentialKwh += rawPvKwh;
    row.directSolarKwh += directSolarKwh;
    row.batteryChargeKwh += batteryChargeKwh;
    row.batteryDischargeKwh += batteryDischargeKwh;
    row.gridImportKwh += gridImportKwh;
    row.exportedKwh += exportedKwh;
    row.curtailedKwh += curtailedKwh + inverterClippedKwh;
    row.inverterClippedKwh += inverterClippedKwh;

    minBatteryKwh = Math.min(minBatteryKwh, batteryKwh);
    maxBatteryKwh = Math.max(maxBatteryKwh, batteryKwh);
    monthRows.set(hourlyRow.month, row);
  });

  const monthly = Array.from(monthRows.values()).map(roundMonthlyRow);
  const totals = monthly.reduce((total, row) => ({
    pvPotentialKwh: total.pvPotentialKwh + row.pvPotentialKwh,
    directSolarKwh: total.directSolarKwh + row.directSolarKwh,
    batteryChargeKwh: total.batteryChargeKwh + row.batteryChargeKwh,
    batteryDischargeKwh: total.batteryDischargeKwh + row.batteryDischargeKwh,
    gridImportKwh: total.gridImportKwh + row.gridImportKwh,
    exportedKwh: total.exportedKwh + row.exportedKwh,
    curtailedKwh: total.curtailedKwh + row.curtailedKwh,
    inverterClippedKwh: total.inverterClippedKwh + row.inverterClippedKwh
  }), createEmptyTotals());

  return {
    batteryChargeLimitKw,
    idleSolarUseCeilingKw: batteryChargeLimitKw + baseLoadKw,
    usableBatteryKwh: round2(usableBatteryKwh),
    totals: {
      ...roundTotals(totals),
      finalSocPercent: batteryPercent(batteryKwh, fullBatteryKwh),
      minSocPercent: batteryPercent(minBatteryKwh, fullBatteryKwh),
      maxSocPercent: batteryPercent(maxBatteryKwh, fullBatteryKwh)
    },
    monthly
  };
}

export function calculateAnnualLoadKwh(loadProfile: LoadProfile, fallbackBaseWatts: number) {
  return Array.from({ length: 12 }, (_, index) => index + 1).reduce((total, month) => {
    const days = daysInMonth(month);

    return total + Array.from({ length: days }, (_, dayIndex) => dayIndex + 1).reduce((monthTotal, day) => {
      return monthTotal + Array.from({ length: 24 }, (_, hour) => calculateHourlyLoadKwh({ month, day, hour } as HourlyAggregate, { idleLoadWatts: fallbackBaseWatts } as SystemLimits, loadProfile))
        .reduce((hourTotal, value) => hourTotal + value, 0);
    }, 0);
  }, 0);
}

export function calculateBatteryChargeLimitKw(systemLimits: SystemLimits) {
  return (systemLimits.batteryChargeCurrentAmps * systemLimits.batteryNominalVoltage) / 1000;
}

function sortedHourlyRows(hourlyRows: HourlyAggregate[]) {
  return [...hourlyRows].sort((left, right) => (left.month - right.month) || ((left.day ?? 0) - (right.day ?? 0)) || (left.hour - right.hour));
}

function createMonthlyRow(month: number): MonthlyUsageAggregate {
  return {
    month,
    label: MONTH_LABELS[month - 1] ?? `Month ${month}`,
    pvPotentialKwh: 0,
    directSolarKwh: 0,
    batteryChargeKwh: 0,
    batteryDischargeKwh: 0,
    gridImportKwh: 0,
    exportedKwh: 0,
    curtailedKwh: 0,
    inverterClippedKwh: 0
  };
}

function calculateExportedKwh(exportableKwh: number, systemLimits: SystemLimits) {
  if (systemLimits.exportMode === 'zero-export') {
    return 0;
  }

  if (systemLimits.exportMode === 'export-limit') {
    return Math.min(exportableKwh, Math.max(systemLimits.exportLimitKw, 0));
  }

  return exportableKwh;
}

function calculateHourlyLoadKwh(hourlyRow: HourlyAggregate, systemLimits: SystemLimits, loadProfile?: LoadProfile) {
  if (!loadProfile) {
    return Math.max(systemLimits.idleLoadWatts, 0) / 1000;
  }

  const baseWatts = hourlyRow.hour >= 7 && hourlyRow.hour < 17
    ? loadProfile.dayBaseWatts
    : hourlyRow.hour >= 17 && hourlyRow.hour < 22
      ? loadProfile.eveningBaseWatts
      : loadProfile.nightBaseWatts;

  const applianceKw = loadProfile.appliances
    .filter((appliance) => appliance.enabled && appliance.activeMonths.includes(hourlyRow.month))
    .reduce((total, appliance) => total + calculateApplianceHourKw(appliance, hourlyRow), 0);

  return Math.max(baseWatts, 0) / 1000 + applianceKw;
}

function calculateApplianceHourKw(appliance: ApplianceLoad, hourlyRow: Pick<HourlyAggregate, 'month' | 'day' | 'hour'>) {
  if (!isScheduledRunDay(appliance, hourlyRow.month, hourlyRow.day ?? 1)) {
    return 0;
  }

  const startHour = clamp(Math.floor(appliance.startHour), 0, 23);
  const endHour = startHour + Math.max(appliance.hoursPerRun, 0);
  const hourStart = hourlyRow.hour;
  const hourEnd = hourlyRow.hour + 1;
  const overlapHours = Math.max(0, Math.min(hourEnd, endHour) - Math.max(hourStart, startHour));

  return appliance.powerKw * overlapHours;
}

function isScheduledRunDay(appliance: ApplianceLoad, month: number, day: number) {
  const days = daysInMonth(month);
  const intervalDays = 7 / Math.max(appliance.runsPerWeek, 0.1);
  const runCountBeforeDay = Math.floor((day - 1) / intervalDays);
  const runCountAtDay = Math.floor(day / intervalDays);

  return runCountAtDay > runCountBeforeDay && day <= days;
}

function daysInMonth(month: number) {
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 30;
}

function createEmptyTotals() {
  return {
    pvPotentialKwh: 0,
    directSolarKwh: 0,
    batteryChargeKwh: 0,
    batteryDischargeKwh: 0,
    gridImportKwh: 0,
    exportedKwh: 0,
    curtailedKwh: 0,
    inverterClippedKwh: 0
  };
}

function roundMonthlyRow(row: MonthlyUsageAggregate): MonthlyUsageAggregate {
  return {
    ...row,
    pvPotentialKwh: round2(row.pvPotentialKwh),
    directSolarKwh: round2(row.directSolarKwh),
    batteryChargeKwh: round2(row.batteryChargeKwh),
    batteryDischargeKwh: round2(row.batteryDischargeKwh),
    gridImportKwh: round2(row.gridImportKwh),
    exportedKwh: round2(row.exportedKwh),
    curtailedKwh: round2(row.curtailedKwh),
    inverterClippedKwh: round2(row.inverterClippedKwh)
  };
}

function roundTotals(totals: ReturnType<typeof createEmptyTotals>) {
  return {
    pvPotentialKwh: round2(totals.pvPotentialKwh),
    directSolarKwh: round2(totals.directSolarKwh),
    batteryChargeKwh: round2(totals.batteryChargeKwh),
    batteryDischargeKwh: round2(totals.batteryDischargeKwh),
    gridImportKwh: round2(totals.gridImportKwh),
    exportedKwh: round2(totals.exportedKwh),
    curtailedKwh: round2(totals.curtailedKwh),
    inverterClippedKwh: round2(totals.inverterClippedKwh)
  };
}

function batteryPercent(value: number, capacityKwh: number) {
  if (capacityKwh <= 0) {
    return 0;
  }

  return round2((value / capacityKwh) * 100);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round2(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
