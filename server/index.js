import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { buildCacheKey, getCachedValue, setCachedValue } from './cache.js';
import { buildSimulationResult } from './aggregates.js';
import { fetchWeatherForecast } from './forecast.js';
import { PvgisProvider } from './providers/pvgisProvider.js';
import { validateSimulationRequest } from './validation.js';

const app = express();
const port = Number(process.env.PORT || 3001);
const solarProvider = new PvgisProvider();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use((request, _response, next) => {
  console.log(`${request.method} ${request.originalUrl}`);
  next();
});

app.get(['/api/health', '/health'], (_request, response) => {
  response.json({ status: 'ok', service: 'solar-pv-yield-api' });
});

app.get(['/api/forecast', '/forecast'], getForecast);
app.post(['/api/simulate', '/simulate'], simulateProduction);

app.all(['/api/simulate', '/simulate'], (request, response) => {
  response.status(405).json({
    message: `${request.method} is not supported for ${request.originalUrl}. Use POST instead.`
  });
});

async function simulateProduction(request, response) {
  const validationErrors = validateSimulationRequest(request.body);

  if (validationErrors.length > 0) {
    response.status(400).json({ errors: validationErrors });
    return;
  }

  const cacheKey = buildCacheKey(request.body);
  const cachedResult = getCachedValue(cacheKey);

  if (cachedResult) {
    response.json({ ...cachedResult, cache: { hit: true } });
    return;
  }

  try {
    const providerResults = await Promise.all(
      request.body.strings.map((pvString) => solarProvider.simulateString(request.body.site, pvString))
    );

    const simulationResult = buildSimulationResult(request.body.site, request.body.strings, providerResults);
    setCachedValue(cacheKey, simulationResult);

    response.json({ ...simulationResult, cache: { hit: false } });
  } catch (error) {
    console.error(error);
    response.status(502).json({
      message: 'Unable to retrieve solar data from the configured provider.',
      detail: error?.cause?.message || error?.message || 'Unknown provider error'
    });
  }
}

async function getForecast(request, response) {
  const latitude = Number(request.query.latitude);
  const longitude = Number(request.query.longitude);

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    response.status(400).json({ message: 'Valid latitude and longitude query parameters are required.' });
    return;
  }

  try {
    const forecast = await fetchWeatherForecast({ latitude, longitude });
    response.json(forecast);
  } catch (error) {
    console.error(error);
    response.status(502).json({
      message: 'Unable to retrieve weather forecast from the configured provider.',
      detail: error?.cause?.message || error?.message || 'Unknown forecast provider error'
    });
  }
}

app.use((request, response) => {
  response.status(404).json({
    message: `No API route matched ${request.method} ${request.originalUrl}.`,
    availableEndpoints: [
      'GET /api/health',
      'GET /api/forecast',
      'POST /api/simulate',
      'POST /simulate'
    ]
  });
});

app.listen(port, () => {
  console.log(`Solar PV yield API listening on http://localhost:${port}`);
  console.log('Available endpoints: GET /api/health, GET /api/forecast, POST /api/simulate, POST /simulate');
});
