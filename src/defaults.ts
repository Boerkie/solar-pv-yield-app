import { PVStringConfig, Site } from './types';

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
