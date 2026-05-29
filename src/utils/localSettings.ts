import { DEFAULT_ECONOMIC_ASSUMPTIONS, DEFAULT_LOAD_PROFILE, DEFAULT_OBSERVED_STATS, DEFAULT_SYSTEM_LIMITS } from '../defaults';
import { ApplianceLoad, EconomicAssumptions, LoadProfile, ObservedAnnualStats, PVStringConfig, Site, SystemLimits } from '../types';

const STORAGE_KEY = 'solar-pv-yield-app:setup:v1';

export type SavedSetup = {
  site: Site;
  strings: PVStringConfig[];
  mapScrollLocked: boolean;
  systemLimits: SystemLimits;
  economicAssumptions: EconomicAssumptions;
  observedStats: ObservedAnnualStats[];
  loadProfile: LoadProfile;
};

export function loadSavedSetup(): SavedSetup | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<SavedSetup>;

    if (!isSite(parsedValue.site) || !Array.isArray(parsedValue.strings) || parsedValue.strings.length === 0) {
      return null;
    }

    return {
      site: parsedValue.site,
      strings: parsedValue.strings.filter(isPvString),
      mapScrollLocked: parsedValue.mapScrollLocked !== false,
      systemLimits: mergeSystemLimits(parsedValue.systemLimits),
      economicAssumptions: mergeEconomicAssumptions(parsedValue.economicAssumptions),
      observedStats: mergeObservedStats(parsedValue.observedStats),
      loadProfile: mergeLoadProfile(parsedValue.loadProfile)
    };
  } catch {
    return null;
  }
}

function mergeLoadProfile(value: unknown): LoadProfile {
  const loadProfile = value as Partial<LoadProfile>;

  if (!loadProfile || typeof loadProfile !== 'object') {
    return DEFAULT_LOAD_PROFILE;
  }

  const savedAppliances = Array.isArray(loadProfile.appliances)
    ? loadProfile.appliances.filter(isApplianceLoad)
    : [];
  const savedApplianceIds = new Set(savedAppliances.map((appliance) => appliance.id));
  const appliances = [
    ...savedAppliances,
    ...DEFAULT_LOAD_PROFILE.appliances.filter((appliance) => !savedApplianceIds.has(appliance.id))
  ];

  return {
    nightBaseWatts: finiteOrDefault(loadProfile.nightBaseWatts, DEFAULT_LOAD_PROFILE.nightBaseWatts),
    dayBaseWatts: finiteOrDefault(loadProfile.dayBaseWatts, DEFAULT_LOAD_PROFILE.dayBaseWatts),
    eveningBaseWatts: finiteOrDefault(loadProfile.eveningBaseWatts, DEFAULT_LOAD_PROFILE.eveningBaseWatts),
    appliances: appliances.length > 0 ? appliances : DEFAULT_LOAD_PROFILE.appliances
  };
}

function mergeObservedStats(value: unknown): ObservedAnnualStats[] {
  if (!Array.isArray(value)) {
    return DEFAULT_OBSERVED_STATS;
  }

  const observedStats = value.filter(isObservedAnnualStats);
  return observedStats.length > 0 ? observedStats : DEFAULT_OBSERVED_STATS;
}

function mergeEconomicAssumptions(value: unknown): EconomicAssumptions {
  const economicAssumptions = value as Partial<EconomicAssumptions>;

  if (!economicAssumptions || typeof economicAssumptions !== 'object') {
    return DEFAULT_ECONOMIC_ASSUMPTIONS;
  }

  return {
    importTariffRandPerKwh: finiteOrDefault(economicAssumptions.importTariffRandPerKwh, DEFAULT_ECONOMIC_ASSUMPTIONS.importTariffRandPerKwh),
    exportCreditPercent: finiteOrDefault(economicAssumptions.exportCreditPercent, DEFAULT_ECONOMIC_ASSUMPTIONS.exportCreditPercent),
    exportEnablementCostRand: finiteOrDefault(economicAssumptions.exportEnablementCostRand, DEFAULT_ECONOMIC_ASSUMPTIONS.exportEnablementCostRand),
    systemCostRand: finiteOrDefault(economicAssumptions.systemCostRand, DEFAULT_ECONOMIC_ASSUMPTIONS.systemCostRand)
  };
}

function mergeSystemLimits(value: unknown): SystemLimits {
  const systemLimits = value as Partial<SystemLimits>;

  if (!systemLimits || typeof systemLimits !== 'object') {
    return DEFAULT_SYSTEM_LIMITS;
  }

  return {
    inverterMaxKw: finiteOrDefault(systemLimits.inverterMaxKw, DEFAULT_SYSTEM_LIMITS.inverterMaxKw),
    batteryCapacityKwh: finiteOrDefault(systemLimits.batteryCapacityKwh, DEFAULT_SYSTEM_LIMITS.batteryCapacityKwh),
    batteryReservePercent: finiteOrDefault(systemLimits.batteryReservePercent, DEFAULT_SYSTEM_LIMITS.batteryReservePercent),
    batteryShutdownPercent: finiteOrDefault(systemLimits.batteryShutdownPercent, DEFAULT_SYSTEM_LIMITS.batteryShutdownPercent),
    batteryChargeCurrentAmps: finiteOrDefault(systemLimits.batteryChargeCurrentAmps, DEFAULT_SYSTEM_LIMITS.batteryChargeCurrentAmps),
    batteryNominalVoltage: finiteOrDefault(systemLimits.batteryNominalVoltage, DEFAULT_SYSTEM_LIMITS.batteryNominalVoltage),
    idleLoadWatts: finiteOrDefault(systemLimits.idleLoadWatts, DEFAULT_SYSTEM_LIMITS.idleLoadWatts),
    exportMode: systemLimits.exportMode === 'export-limit' || systemLimits.exportMode === 'unlimited-export' || systemLimits.exportMode === 'zero-export'
      ? systemLimits.exportMode
      : DEFAULT_SYSTEM_LIMITS.exportMode,
    exportLimitKw: finiteOrDefault(systemLimits.exportLimitKw, DEFAULT_SYSTEM_LIMITS.exportLimitKw),
    startingBatterySocPercent: finiteOrDefault(systemLimits.startingBatterySocPercent, DEFAULT_SYSTEM_LIMITS.startingBatterySocPercent)
  };
}

export function saveSetup(setup: SavedSetup) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(setup));
}

export function clearSavedSetup() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

function isSite(value: unknown): value is Site {
  const site = value as Site;
  return Number.isFinite(site?.latitude) && Number.isFinite(site?.longitude) && typeof site?.label === 'string';
}

function isPvString(value: unknown): value is PVStringConfig {
  const pvString = value as PVStringConfig;
  return typeof pvString?.id === 'string'
    && typeof pvString.name === 'string'
    && Number.isFinite(pvString.panelCount)
    && Number.isFinite(pvString.panelWatts)
    && Number.isFinite(pvString.capacityKwp)
    && Number.isFinite(pvString.tiltDegrees)
    && Number.isFinite(pvString.azimuthDegrees)
    && Number.isFinite(pvString.lossPercent);
}

function isObservedAnnualStats(value: unknown): value is ObservedAnnualStats {
  const observedStats = value as ObservedAnnualStats;
  return typeof observedStats?.id === 'string'
    && Number.isFinite(observedStats.year)
    && Number.isFinite(observedStats.pvGeneratedKwh)
    && Number.isFinite(observedStats.gridImportKwh)
    && Number.isFinite(observedStats.batteryThroughputKwh);
}

function isApplianceLoad(value: unknown): value is ApplianceLoad {
  const appliance = value as ApplianceLoad;
  return typeof appliance?.id === 'string'
    && typeof appliance.name === 'string'
    && typeof appliance.enabled === 'boolean'
    && Number.isFinite(appliance.powerKw)
    && Number.isFinite(appliance.hoursPerRun)
    && Number.isFinite(appliance.runsPerWeek)
    && Number.isFinite(appliance.startHour)
    && Array.isArray(appliance.activeMonths);
}

function finiteOrDefault(value: unknown, defaultValue: number) {
  return Number.isFinite(value) ? Number(value) : defaultValue;
}
