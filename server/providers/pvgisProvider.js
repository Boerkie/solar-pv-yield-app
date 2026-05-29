import { ProviderUnavailableError, SolarProvider } from './solarProvider.js';

const PVGIS_BASE_URL = process.env.PVGIS_BASE_URL || 'https://re.jrc.ec.europa.eu/api/seriescalc';

export class PvgisProvider extends SolarProvider {
  async simulateString(site, pvString) {
    const pvgisAspect = compassAzimuthToPvgisAspect(pvString.azimuthDegrees);
    const queryParams = new URLSearchParams({
      lat: String(site.latitude),
      lon: String(site.longitude),
      pvcalculation: '1',
      peakpower: String(pvString.capacityKwp),
      loss: String(pvString.lossPercent),
      angle: String(pvString.tiltDegrees),
      aspect: String(pvgisAspect),
      mountingplace: 'building',
      usehorizon: '1',
      outputformat: 'json'
    });

    const requestUrl = `${PVGIS_BASE_URL}?${queryParams.toString()}`;

    try {
      const response = await fetch(requestUrl, {
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PVGIS returned HTTP ${response.status}: ${errorText}`);
      }

      const pvgisPayload = await response.json();
      const hourlyOutput = pvgisPayload?.outputs?.hourly;

      if (!Array.isArray(hourlyOutput) || hourlyOutput.length === 0) {
        throw new Error('PVGIS response did not include hourly PV output.');
      }

      return {
        provider: 'PVGIS',
        providerRequest: {
          url: `${PVGIS_BASE_URL}?${redactNothing(queryParams)}`,
          pvgisAspect,
          uiAzimuthDegrees: pvString.azimuthDegrees
        },
        hourly: hourlyOutput.map((hourlyRow) => mapPvgisHourlyRow(hourlyRow, pvString.id))
      };
    } catch (error) {
      throw new ProviderUnavailableError('PVGIS is unavailable or returned an unsupported response.', error);
    }
  }
}

export function compassAzimuthToPvgisAspect(azimuthDegrees) {
  // UI azimuth is normal compass bearing: north=0, east=90, south=180, west=270.
  // PVGIS aspect is relative to south: south=0, west=90, east=-90.
  const normalised = ((Number(azimuthDegrees) - 180 + 540) % 360) - 180;
  return Math.round(normalised * 100) / 100;
}

function mapPvgisHourlyRow(hourlyRow, stringId) {
  const parsedTime = parsePvgisTime(hourlyRow.time);
  const powerWatts = Number(hourlyRow.P ?? hourlyRow.power ?? 0);

  // PVGIS P is an hourly PV power estimate after the supplied system losses.
  // Because the source granularity is hourly, kWh for the hour is approximated as average kW over one hour.
  const powerKw = Math.max(0, powerWatts / 1000);

  return {
    stringId,
    timeKey: parsedTime.timeKey,
    year: parsedTime.year,
    month: parsedTime.month,
    day: parsedTime.day,
    hour: parsedTime.hour,
    powerKw,
    energyKwh: powerKw
  };
}

function parsePvgisTime(timeValue) {
  const match = String(timeValue).match(/^(\d{4})(\d{2})(\d{2}):(\d{2})(\d{2})$/);

  if (!match) {
    throw new Error(`Unsupported PVGIS time format: ${timeValue}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);

  return {
    year,
    month,
    day,
    hour,
    timeKey: `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:00`
  };
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function redactNothing(queryParams) {
  return queryParams.toString();
}
