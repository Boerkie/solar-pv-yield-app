import { ForecastResult, SimulationResult } from '../types';
import { MetricCard } from './MetricCard';

type ForecastPanelProps = {
  result: SimulationResult;
  forecast: ForecastResult | null;
  isLoading: boolean;
  error: string | null;
  onLoad: () => void;
};

const PERFORMANCE_RATIO = 0.78;

export function ForecastPanel({ result, forecast, isLoading, error, onLoad }: ForecastPanelProps) {
  const rows = forecast?.days.map((day) => {
    const date = new Date(`${day.date}T12:00:00`);
    const normDay = result.daily.find((dailyRow) => dailyRow.month === date.getMonth() + 1 && dailyRow.day === date.getDate());
    const forecastKwh = day.shortwaveRadiationKwhM2 * result.totals.capacityKwp * PERFORMANCE_RATIO;
    const normKwh = normDay?.combinedKwh ?? 0;
    const differencePercent = normKwh > 0 ? ((forecastKwh - normKwh) / normKwh) * 100 : 0;

    return {
      ...day,
      label: date.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' }),
      forecastKwh,
      normKwh,
      differencePercent
    };
  }) ?? [];

  return (
    <section className="forecast-card">
      <div className="section-heading">
        <div>
          <h2>Weather forecast</h2>
          <p>Today and tomorrow use forecast horizontal shortwave radiation, scaled by configured capacity, then compared with the matching PVGIS normal day.</p>
        </div>
        <button type="button" className="secondary-button" disabled={isLoading} onClick={onLoad}>
          {isLoading ? 'Loading forecast...' : forecast ? 'Refresh forecast' : 'Load forecast'}
        </button>
      </div>

      {error ? <div className="error-box">{error}</div> : null}

      {forecast ? (
        <>
          <div className="metric-grid">
            <MetricCard label="Forecast provider" value={forecast.provider} helpText={forecast.timezone} />
            <MetricCard label="Model estimate" value="Shortwave x kWp" helpText={`Performance ratio ${Math.round(PERFORMANCE_RATIO * 100)}%`} />
            <MetricCard label="PVGIS comparison" value="Daily norm" helpText="Matched by month and day" />
            <MetricCard label="Updated" value={new Date(forecast.generatedAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })} helpText="Local API response time" />
          </div>

          <div className="forecast-grid">
            {rows.map((row) => (
              <article key={row.date} className="forecast-day">
                <div>
                  <strong>{row.label}</strong>
                  <span>{row.averageCloudCoverPercent.toFixed(0)}% cloud cover / {row.peakShortwaveWm2.toFixed(0)} W/m2 peak</span>
                </div>
                <div className="forecast-values">
                  <span><strong>{row.forecastKwh.toFixed(1)} kWh</strong> forecast</span>
                  <span><strong>{row.normKwh.toFixed(1)} kWh</strong> PVGIS norm</span>
                  <span className={row.differencePercent >= 0 ? 'positive-value' : 'negative-value'}>
                    <strong>{row.differencePercent >= 0 ? '+' : ''}{row.differencePercent.toFixed(0)}%</strong> vs norm
                  </span>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-inline">Run a production estimate, then load the weather forecast for the selected site.</div>
      )}
    </section>
  );
}
