export async function fetchWeatherForecast(site) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(site.latitude));
  url.searchParams.set('longitude', String(site.longitude));
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '2');
  url.searchParams.set('hourly', [
    'temperature_2m',
    'cloud_cover',
    'shortwave_radiation',
    'direct_radiation',
    'diffuse_radiation'
  ].join(','));
  url.searchParams.set('daily', 'shortwave_radiation_sum');

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Open-Meteo returned HTTP ${response.status}`);
  }

  const payload = await response.json();
  return normaliseForecastPayload(payload, url.toString(), site);
}

function normaliseForecastPayload(payload, providerUrl, site) {
  const dates = payload?.daily?.time ?? [];
  const shortwaveSums = payload?.daily?.shortwave_radiation_sum ?? [];

  return {
    provider: 'Open-Meteo',
    providerUrl,
    locationLabel: site.label || `${round4(site.latitude)}, ${round4(site.longitude)}`,
    latitude: round4(Number(payload?.latitude ?? site.latitude)),
    longitude: round4(Number(payload?.longitude ?? site.longitude)),
    timezone: payload?.timezone ?? 'auto',
    generatedAt: new Date().toISOString(),
    days: dates.map((date, index) => {
      const hourlyIndexes = (payload?.hourly?.time ?? [])
        .map((time, hourIndex) => ({ time, hourIndex }))
        .filter((row) => row.time.startsWith(date));

      const cloudValues = hourlyIndexes.map(({ hourIndex }) => Number(payload?.hourly?.cloud_cover?.[hourIndex] ?? 0));
      const temperatureValues = hourlyIndexes.map(({ hourIndex }) => Number(payload?.hourly?.temperature_2m?.[hourIndex] ?? 0));
      const peakShortwave = Math.max(0, ...hourlyIndexes.map(({ hourIndex }) => Number(payload?.hourly?.shortwave_radiation?.[hourIndex] ?? 0)));

      return {
        date,
        shortwaveRadiationKwhM2: Number(shortwaveSums[index] ?? 0),
        averageCloudCoverPercent: round1(average(cloudValues)),
        averageTemperatureC: round1(average(temperatureValues)),
        peakShortwaveWm2: round1(peakShortwave)
      };
    })
  };
}

function average(values) {
  const finiteValues = values.filter((value) => Number.isFinite(value));

  if (finiteValues.length === 0) {
    return 0;
  }

  return finiteValues.reduce((total, value) => total + value, 0) / finiteValues.length;
}

function round1(value) {
  return Math.round((Number(value) + Number.EPSILON) * 10) / 10;
}

function round4(value) {
  return Math.round((Number(value) + Number.EPSILON) * 10000) / 10000;
}
