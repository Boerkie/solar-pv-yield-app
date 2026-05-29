const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function buildSimulationResult(site, pvStrings, providerResults) {
  const combinedHourly = combineHourlyResults(providerResults, pvStrings);
  const completeYears = findCompleteYears(combinedHourly);
  const filteredHourly = combinedHourly.filter((row) => completeYears.has(row.year));

  return {
    generatedAt: new Date().toISOString(),
    estimateNotice: 'Estimate only. PVGIS historical irradiance and weather data are used with the PVGIS terrain horizon enabled. Nearby shading from houses, trees, chimneys or roof features, plus inverter clipping, batteries, load demand and export limits, are not modelled.',
    provider: 'PVGIS',
    site,
    strings: pvStrings.map((pvString) => ({
      ...pvString,
      annualTotalKwh: round2(averageAnnualTotal(filteredHourly, pvString.id))
    })),
    totals: {
      capacityKwp: round2(sum(pvStrings.map((pvString) => pvString.capacityKwp))),
      annualKwh: round2(averageAnnualTotal(filteredHourly, 'combined')),
      averageDailyKwh: round2(averageAnnualTotal(filteredHourly, 'combined') / 365),
      completeHistoricalYearsUsed: Array.from(completeYears).sort()
    },
    monthly: buildMonthlyAggregates(filteredHourly, pvStrings),
    weekly: buildWeeklyAggregates(filteredHourly, pvStrings),
    daily: buildDailyTypicalYear(filteredHourly, pvStrings),
    hourlyByMonth: buildHourlyByMonth(filteredHourly, pvStrings),
    hourlyByDay: buildHourlyByDay(filteredHourly, pvStrings),
    providerRequests: providerResults.map((result) => result.providerRequest)
  };
}

function combineHourlyResults(providerResults, pvStrings) {
  const rowsByTime = new Map();

  providerResults.forEach((providerResult) => {
    providerResult.hourly.forEach((hourlyRow) => {
      const combinedRow = rowsByTime.get(hourlyRow.timeKey) ?? {
        timeKey: hourlyRow.timeKey,
        year: hourlyRow.year,
        month: hourlyRow.month,
        day: hourlyRow.day,
        hour: hourlyRow.hour,
        values: {},
        combined: { powerKw: 0, energyKwh: 0 }
      };

      combinedRow.values[hourlyRow.stringId] = {
        powerKw: hourlyRow.powerKw,
        energyKwh: hourlyRow.energyKwh
      };
      combinedRow.combined.powerKw += hourlyRow.powerKw;
      combinedRow.combined.energyKwh += hourlyRow.energyKwh;
      rowsByTime.set(hourlyRow.timeKey, combinedRow);
    });
  });

  return Array.from(rowsByTime.values())
    .filter((row) => pvStrings.every((pvString) => row.values[pvString.id]))
    .sort((left, right) => left.timeKey.localeCompare(right.timeKey));
}

function findCompleteYears(hourlyRows) {
  const hourCountsByYear = new Map();

  hourlyRows.forEach((row) => {
    hourCountsByYear.set(row.year, (hourCountsByYear.get(row.year) ?? 0) + 1);
  });

  const completeYears = new Set();

  hourCountsByYear.forEach((count, year) => {
    if (count >= 8750) {
      completeYears.add(year);
    }
  });

  if (completeYears.size === 0) {
    hourlyRows.forEach((row) => completeYears.add(row.year));
  }

  return completeYears;
}

function averageAnnualTotal(hourlyRows, id) {
  const totalsByYear = new Map();

  hourlyRows.forEach((row) => {
    totalsByYear.set(row.year, (totalsByYear.get(row.year) ?? 0) + getEnergy(row, id));
  });

  return average(Array.from(totalsByYear.values()));
}

function buildMonthlyAggregates(hourlyRows, pvStrings) {
  const monthlyTotals = new Map();
  const dailyTotals = new Map();

  hourlyRows.forEach((row) => {
    addEnergy(monthlyTotals, `${row.year}-${row.month}`, row, pvStrings, { month: row.month });
    addEnergy(dailyTotals, `${row.year}-${row.month}-${row.day}`, row, pvStrings, { month: row.month });
  });

  return range(1, 12).map((month) => {
    const monthRows = Array.from(monthlyTotals.values()).filter((row) => row.month === month);
    const dayRows = Array.from(dailyTotals.values()).filter((row) => row.month === month);

    return {
      month,
      label: MONTH_LABELS[month - 1],
      combinedKwh: round2(average(monthRows.map((row) => row.combinedKwh))),
      averageDailyKwh: round2(average(dayRows.map((row) => row.combinedKwh))),
      strings: Object.fromEntries(pvStrings.map((pvString) => [
        pvString.id,
        round2(average(monthRows.map((row) => row.strings[pvString.id] ?? 0)))
      ]))
    };
  });
}

function buildWeeklyAggregates(hourlyRows, pvStrings) {
  const weeklyTotals = new Map();

  hourlyRows.forEach((row) => {
    const week = getWeekOfYear(row.year, row.month, row.day);
    addEnergy(weeklyTotals, `${row.year}-${week}`, row, pvStrings, { week });
  });

  return range(1, 53).map((week) => {
    const rows = Array.from(weeklyTotals.values()).filter((row) => row.week === week);

    return {
      week,
      label: `Week ${week}`,
      combinedKwh: round2(average(rows.map((row) => row.combinedKwh))),
      averageDailyKwh: round2(average(rows.map((row) => row.combinedKwh)) / 7),
      strings: Object.fromEntries(pvStrings.map((pvString) => [
        pvString.id,
        round2(average(rows.map((row) => row.strings[pvString.id] ?? 0)))
      ]))
    };
  });
}

function buildDailyTypicalYear(hourlyRows, pvStrings) {
  const dayYearTotals = new Map();

  hourlyRows.forEach((row) => {
    addEnergy(dayYearTotals, `${row.year}-${row.month}-${row.day}`, row, pvStrings, {
      month: row.month,
      day: row.day
    });
  });

  const typicalRowsByMonthDay = new Map();

  dayYearTotals.forEach((dailyRow) => {
    const key = `${dailyRow.month}-${dailyRow.day}`;
    const rows = typicalRowsByMonthDay.get(key) ?? [];
    rows.push(dailyRow);
    typicalRowsByMonthDay.set(key, rows);
  });

  return Array.from(typicalRowsByMonthDay.entries()).map(([key, rows]) => {
    const [month, day] = key.split('-').map(Number);

    return {
      month,
      day,
      label: `${MONTH_LABELS[month - 1]} ${day}`,
      combinedKwh: round2(average(rows.map((row) => row.combinedKwh))),
      strings: Object.fromEntries(pvStrings.map((pvString) => [
        pvString.id,
        round2(average(rows.map((row) => row.strings[pvString.id] ?? 0)))
      ]))
    };
  }).sort((left, right) => (left.month - right.month) || (left.day - right.day));
}

function buildHourlyByMonth(hourlyRows, pvStrings) {
  const hourlyGroups = new Map();

  hourlyRows.forEach((row) => {
    addPowerAndEnergy(hourlyGroups, `${row.month}-${row.hour}`, row, pvStrings, {
      month: row.month,
      hour: row.hour
    });
  });

  return range(1, 12).flatMap((month) => range(0, 23).map((hour) => {
    const group = hourlyGroups.get(`${month}-${hour}`) ?? createPowerEnergyGroup(pvStrings, { month, hour });
    return formatPowerEnergyGroup(group, pvStrings);
  }));
}

function buildHourlyByDay(hourlyRows, pvStrings) {
  const hourlyGroups = new Map();

  hourlyRows.forEach((row) => {
    addPowerAndEnergy(hourlyGroups, `${row.month}-${row.day}-${row.hour}`, row, pvStrings, {
      month: row.month,
      day: row.day,
      hour: row.hour
    });
  });

  return Array.from(hourlyGroups.values())
    .map((group) => formatPowerEnergyGroup(group, pvStrings))
    .sort((left, right) => (left.month - right.month) || ((left.day ?? 0) - (right.day ?? 0)) || (left.hour - right.hour));
}

function addEnergy(map, key, row, pvStrings, extra = {}) {
  const aggregateRow = map.get(key) ?? {
    ...extra,
    combinedKwh: 0,
    strings: Object.fromEntries(pvStrings.map((pvString) => [pvString.id, 0]))
  };

  aggregateRow.combinedKwh += row.combined.energyKwh;
  pvStrings.forEach((pvString) => {
    aggregateRow.strings[pvString.id] += row.values[pvString.id]?.energyKwh ?? 0;
  });
  map.set(key, aggregateRow);
}

function addPowerAndEnergy(map, key, row, pvStrings, extra = {}) {
  const group = map.get(key) ?? createPowerEnergyGroup(pvStrings, extra);
  group.count += 1;
  group.combinedKw += row.combined.powerKw;
  group.combinedKwh += row.combined.energyKwh;

  pvStrings.forEach((pvString) => {
    group.strings[pvString.id].kw += row.values[pvString.id]?.powerKw ?? 0;
    group.strings[pvString.id].kwh += row.values[pvString.id]?.energyKwh ?? 0;
  });

  map.set(key, group);
}

function createPowerEnergyGroup(pvStrings, extra = {}) {
  return {
    ...extra,
    count: 0,
    combinedKw: 0,
    combinedKwh: 0,
    strings: Object.fromEntries(pvStrings.map((pvString) => [pvString.id, { kw: 0, kwh: 0 }]))
  };
}

function formatPowerEnergyGroup(group, pvStrings) {
  const divisor = Math.max(group.count, 1);

  return {
    month: group.month,
    day: group.day,
    hour: group.hour,
    label: `${String(group.hour).padStart(2, '0')}:00`,
    combinedKw: round3(group.combinedKw / divisor),
    combinedKwh: round3(group.combinedKwh / divisor),
    strings: Object.fromEntries(pvStrings.map((pvString) => [
      pvString.id,
      {
        kw: round3(group.strings[pvString.id].kw / divisor),
        kwh: round3(group.strings[pvString.id].kwh / divisor)
      }
    ]))
  };
}

function getEnergy(row, id) {
  if (id === 'combined') {
    return row.combined.energyKwh;
  }

  return row.values[id]?.energyKwh ?? 0;
}

function getWeekOfYear(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  const yearStart = new Date(Date.UTC(year, 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + yearStart.getUTCDay() + 1) / 7);
}

function average(values) {
  const validValues = values.filter((value) => Number.isFinite(value));

  if (validValues.length === 0) {
    return 0;
  }

  return sum(validValues) / validValues.length;
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value), 0);
}

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function round3(value) {
  return Math.round((Number(value) + Number.EPSILON) * 1000) / 1000;
}
