import { PVStringConfig, Site } from '../types';

const STORAGE_KEY = 'solar-pv-yield-app:setup:v1';

export type SavedSetup = {
  site: Site;
  strings: PVStringConfig[];
  mapScrollLocked: boolean;
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
      mapScrollLocked: parsedValue.mapScrollLocked !== false
    };
  } catch {
    return null;
  }
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
