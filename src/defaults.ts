import { EconomicAssumptions, PVStringConfig, Site, SystemLimits } from './types';

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
