export type Site = {
  latitude: number;
  longitude: number;
  label: string;
};

export type LatLngPoint = {
  lat: number;
  lng: number;
};

export type ArrowDefinition = {
  start: LatLngPoint;
  end: LatLngPoint;
};

export type PVStringConfig = {
  id: string;
  name: string;
  panelCount: number;
  panelWatts: number;
  capacityKwp: number;
  tiltDegrees: number;
  azimuthDegrees: number;
  lossPercent: number;
  arrow?: ArrowDefinition;
};

export type ExportMode = 'zero-export' | 'export-limit' | 'unlimited-export';

export type SystemLimits = {
  inverterMaxKw: number;
  batteryCapacityKwh: number;
  batteryReservePercent: number;
  batteryShutdownPercent: number;
  batteryChargeCurrentAmps: number;
  batteryNominalVoltage: number;
  idleLoadWatts: number;
  exportMode: ExportMode;
  exportLimitKw: number;
  startingBatterySocPercent: number;
};

export type SimulationString = PVStringConfig & {
  annualTotalKwh: number;
};

export type MonthlyAggregate = {
  month: number;
  label: string;
  combinedKwh: number;
  averageDailyKwh: number;
  strings: Record<string, number>;
};

export type WeeklyAggregate = {
  week: number;
  label: string;
  combinedKwh: number;
  averageDailyKwh: number;
  strings: Record<string, number>;
};

export type DailyAggregate = {
  month: number;
  day: number;
  label: string;
  combinedKwh: number;
  strings: Record<string, number>;
};

export type HourlyAggregate = {
  month: number;
  day?: number;
  hour: number;
  label: string;
  combinedKw: number;
  combinedKwh: number;
  strings: Record<string, { kw: number; kwh: number }>;
};

export type SimulationResult = {
  generatedAt: string;
  estimateNotice: string;
  provider: string;
  site: Site;
  strings: SimulationString[];
  totals: {
    capacityKwp: number;
    annualKwh: number;
    averageDailyKwh: number;
    completeHistoricalYearsUsed: number[];
  };
  monthly: MonthlyAggregate[];
  weekly: WeeklyAggregate[];
  daily: DailyAggregate[];
  hourlyByMonth: HourlyAggregate[];
  hourlyByDay: HourlyAggregate[];
  providerRequests: Array<{
    url: string;
    pvgisAspect: number;
    uiAzimuthDegrees: number;
  }>;
  cache?: {
    hit: boolean;
  };
};

export type MonthlyUsageAggregate = {
  month: number;
  label: string;
  pvPotentialKwh: number;
  directSolarKwh: number;
  batteryChargeKwh: number;
  batteryDischargeKwh: number;
  gridImportKwh: number;
  exportedKwh: number;
  curtailedKwh: number;
  inverterClippedKwh: number;
};

export type UsageSimulationResult = {
  batteryChargeLimitKw: number;
  idleSolarUseCeilingKw: number;
  usableBatteryKwh: number;
  totals: Omit<MonthlyUsageAggregate, 'month' | 'label'> & {
    finalSocPercent: number;
    minSocPercent: number;
    maxSocPercent: number;
  };
  monthly: MonthlyUsageAggregate[];
};
