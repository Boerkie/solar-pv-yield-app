import { EconomicAssumptions, LoadProfile, ObservedAnnualStats, PVStringConfig, Site, SystemLimits } from './types';

export const DEFAULT_SITE: Site = {
  latitude: -33.9249,
  longitude: 18.4241,
  label: 'Cape Town, South Africa'
};

export const DEFAULT_STRINGS: PVStringConfig[] = [
  {
    id: 'east',
    name: 'East string',
    panelCount: 5,
    panelWatts: 550,
    capacityKwp: 2.75,
    tiltDegrees: 40,
    azimuthDegrees: 90,
    lossPercent: 14
  },
  {
    id: 'north',
    name: 'North string',
    panelCount: 4,
    panelWatts: 550,
    capacityKwp: 2.2,
    tiltDegrees: 40,
    azimuthDegrees: 0,
    lossPercent: 14
  }
];

export const DEFAULT_SYSTEM_LIMITS: SystemLimits = {
  inverterMaxKw: 8,
  batteryCapacityKwh: 20,
  batteryReservePercent: 40,
  batteryShutdownPercent: 25,
  batteryChargeCurrentAmps: 40,
  batteryNominalVoltage: 48,
  idleLoadWatts: 150,
  exportMode: 'zero-export',
  exportLimitKw: 0,
  startingBatterySocPercent: 40
};

export const DEFAULT_ECONOMIC_ASSUMPTIONS: EconomicAssumptions = {
  importTariffRandPerKwh: 4.5,
  exportCreditPercent: 33,
  exportEnablementCostRand: 60000,
  systemCostRand: 0
};

export const DEFAULT_OBSERVED_STATS: ObservedAnnualStats[] = [
  {
    id: 'observed-2024',
    year: 2024,
    pvGeneratedKwh: 0,
    gridImportKwh: 0,
    batteryThroughputKwh: 0
  },
  {
    id: 'observed-2025',
    year: 2025,
    pvGeneratedKwh: 0,
    gridImportKwh: 0,
    batteryThroughputKwh: 0
  }
];

export const DEFAULT_LOAD_PROFILE: LoadProfile = {
  nightBaseWatts: 150,
  dayBaseWatts: 450,
  eveningBaseWatts: 650,
  appliances: [
    {
      id: 'kettle',
      name: 'Kettle',
      enabled: true,
      powerKw: 2,
      hoursPerRun: 0.1,
      runsPerWeek: 14,
      startHour: 7,
      activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    },
    {
      id: 'dishwasher',
      name: 'Dishwasher',
      enabled: true,
      powerKw: 1.2,
      hoursPerRun: 1.5,
      runsPerWeek: 2,
      startHour: 11,
      activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    },
    {
      id: 'washing-machine',
      name: 'Washing machine',
      enabled: true,
      powerKw: 0.6,
      hoursPerRun: 1.5,
      runsPerWeek: 3,
      startHour: 10,
      activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    },
    {
      id: 'geyser',
      name: 'Geyser',
      enabled: true,
      powerKw: 3,
      hoursPerRun: 2,
      runsPerWeek: 7,
      startHour: 11,
      activeMonths: [4, 5, 6, 7, 8, 9]
    },
    {
      id: 'dryer',
      name: 'Dryer',
      enabled: true,
      powerKw: 2.4,
      hoursPerRun: 1.5,
      runsPerWeek: 2,
      startHour: 12,
      activeMonths: [5, 6, 7, 8]
    },
    {
      id: 'aircon',
      name: 'Aircon',
      enabled: false,
      powerKw: 1.6,
      hoursPerRun: 5,
      runsPerWeek: 5,
      startHour: 11,
      activeMonths: [12, 1, 2, 3]
    },
    {
      id: 'oven',
      name: 'Oven',
      enabled: false,
      powerKw: 2.2,
      hoursPerRun: 1,
      runsPerWeek: 2,
      startHour: 18,
      activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    },
    {
      id: 'stove',
      name: 'Stove',
      enabled: false,
      powerKw: 1.8,
      hoursPerRun: 0.75,
      runsPerWeek: 5,
      startHour: 18,
      activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    },
    {
      id: 'pool-pump',
      name: 'Pool pump',
      enabled: false,
      powerKw: 0.75,
      hoursPerRun: 4,
      runsPerWeek: 7,
      startHour: 10,
      activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    },
    {
      id: 'fridge-freezer',
      name: 'Fridge/freezer',
      enabled: false,
      powerKw: 0.12,
      hoursPerRun: 24,
      runsPerWeek: 7,
      startHour: 0,
      activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    },
    {
      id: 'microwave',
      name: 'Microwave',
      enabled: false,
      powerKw: 1.2,
      hoursPerRun: 0.15,
      runsPerWeek: 7,
      startHour: 12,
      activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    },
    {
      id: 'vacuum',
      name: 'Vacuum',
      enabled: false,
      powerKw: 1,
      hoursPerRun: 0.75,
      runsPerWeek: 2,
      startHour: 10,
      activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    },
    {
      id: 'workstation',
      name: 'Workstation',
      enabled: true,
      powerKw: 0.25,
      hoursPerRun: 8,
      runsPerWeek: 5,
      startHour: 8,
      activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    },
    {
      id: 'tv-media',
      name: 'TV/media',
      enabled: false,
      powerKw: 0.18,
      hoursPerRun: 4,
      runsPerWeek: 7,
      startHour: 18,
      activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    },
    {
      id: 'ev-charger',
      name: 'EV charger',
      enabled: false,
      powerKw: 3.6,
      hoursPerRun: 3,
      runsPerWeek: 3,
      startHour: 10,
      activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    }
  ]
};
