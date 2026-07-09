export interface EnergyDataPoint {
  timestamp: number;
  value: number;
}

export interface EnergyDataResponse {
  host_id: number;
  metric: string;
  instance: string;
  days: number;
  step: string;
  data: EnergyDataPoint[];
  price_metric?: string;
  price_data?: EnergyDataPoint[];
  total_kwh?: number;
  total_cost?: number;
}

export class PrometheusService {
  /**
   * Query Prometheus for energy consumption data
   */
  static async queryEnergyMetric(
    hostId: number,
    metric: string,
    instance: string,
    days: number,
    priceMetric?: string
  ): Promise<EnergyDataResponse> {
    const timestamp = new Date().toISOString();
    console.log(`\n[${timestamp}] [PROMETHEUS] queryEnergyMetric called`);
    console.log(`[PROMETHEUS] Host ID: ${hostId}, Metric: ${metric}, Instance: ${instance}, Days: ${days}, Price Metric: ${priceMetric || '(none)'}`);

    const prometheusUrl = process.env.PROMETHEUS_URL;
    if (!prometheusUrl) {
      console.error(`[PROMETHEUS] PROMETHEUS_URL not configured`);
      throw new Error('PROMETHEUS_URL not configured. Set it in the backend .env file.');
    }

    // Clamp days to 1-15 range
    days = Math.max(1, Math.min(15, days));

    // Calculate step based on days range
    const step = this.calculateStep(days);
    console.log(`[PROMETHEUS] Calculated step: ${step}`);

    // Calculate time range
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - (days * 24 * 60 * 60);

    const values = await this.queryRange(metric, startTime, endTime, step, prometheusUrl);

    const response: EnergyDataResponse = {
      host_id: hostId,
      metric,
      instance,
      days,
      step,
      data: values,
    };

    // If a price metric is configured, fetch it too and compute cost/kWh
    if (priceMetric) {
      try {
        const priceValues = await this.queryRange(priceMetric, startTime, endTime, step, prometheusUrl);
        // Align price points to the power data timestamps (linear interpolation)
        const alignedPrice = this.alignToTimestamps(priceValues, values);
        // Compute consumed energy (kWh) and total cost (€) via trapezoidal integration
        const { totalKwh, totalCost } = this.computeEnergyAndCost(values, alignedPrice);
        response.price_metric = priceMetric;
        response.price_data = alignedPrice;
        response.total_kwh = totalKwh;
        response.total_cost = totalCost;
      } catch (error) {
        console.error(`[PROMETHEUS] Failed to fetch price metric: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Don't fail the whole request — just leave price data out
      }
    }

    return response;
  }

  /**
   * Execute a PromQL query_range against Prometheus and return parsed time series
   */
  private static async queryRange(
    query: string,
    startTime: number,
    endTime: number,
    step: string,
    prometheusUrl: string
  ): Promise<EnergyDataPoint[]> {
    console.log(`[PROMETHEUS] PromQL query: ${query}`);
    console.log(`[PROMETHEUS] Time range: ${new Date(startTime * 1000).toISOString()} to ${new Date(endTime * 1000).toISOString()}`);

    const url = `${prometheusUrl}/api/v1/query_range?query=${encodeURIComponent(query)}&start=${startTime}&end=${endTime}&step=${step}`;
    console.log(`[PROMETHEUS] Request URL: ${url}`);

    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[PROMETHEUS] HTTP ${response.status}: ${body}`);
      throw new Error(`Prometheus returned HTTP ${response.status}: ${body}`);
    }

    const data = (await response.json()) as {
      status: string;
      error?: string;
      errorType?: string;
      data?: { resultType: string; result: Array<{ metric: Record<string, string>; values: [number, string][] }> };
    };
    console.log(`[PROMETHEUS] Response status: ${data.status}`);

    if (data.status !== 'success') {
      console.error(`[PROMETHEUS] Query failed: ${data.error || 'Unknown error'}`);
      throw new Error(`Prometheus query failed: ${data.error || 'Unknown error'}`);
    }

    const result = data.data?.result;
    if (!result || result.length === 0) {
      console.log(`[PROMETHEUS] No data returned for query`);
      return [];
    }

    // Extract time series values from the first result
    const values: EnergyDataPoint[] = result[0].values.map(([ts, val]: [number, string]) => ({
      timestamp: ts * 1000, // Convert to milliseconds for JS Date
      value: parseFloat(val),
    }));

    console.log(`[PROMETHEUS] Returning ${values.length} data points`);
    return values;
  }

  /**
   * Align a source time series to a target set of timestamps using linear interpolation.
   * Points before the first / after the last source sample are clamped to the nearest value.
   */
  private static alignToTimestamps(
    source: EnergyDataPoint[],
    target: EnergyDataPoint[]
  ): EnergyDataPoint[] {
    if (source.length === 0) {
      return target.map(() => ({ timestamp: 0, value: 0 }));
    }

    return target.map((t) => {
      const ts = t.timestamp;
      // Find surrounding source points
      let i = 0;
      while (i < source.length && source[i].timestamp < ts) i++;

      if (i === 0) {
        return { timestamp: ts, value: source[0].value };
      }
      if (i >= source.length) {
        return { timestamp: ts, value: source[source.length - 1].value };
      }

      const prev = source[i - 1];
      const next = source[i];
      const span = next.timestamp - prev.timestamp;
      const ratio = span === 0 ? 0 : (ts - prev.timestamp) / span;
      const value = prev.value + ratio * (next.value - prev.value);
      return { timestamp: ts, value };
    });
  }

  /**
   * Compute consumed energy (kWh) and total cost (currency units) via trapezoidal
   * integration of power (W) against time, weighted by price (per kWh) at each interval.
   */
  private static computeEnergyAndCost(
    power: EnergyDataPoint[],
    price: EnergyDataPoint[]
  ): { totalKwh: number; totalCost: number } {
    let totalKwh = 0;
    let totalCost = 0;

    for (let i = 1; i < power.length; i++) {
      const p0 = power[i - 1];
      const p1 = power[i];
      const dtHours = (p1.timestamp - p0.timestamp) / (1000 * 60 * 60);
      if (dtHours <= 0) continue;

      // Average power over the interval, converted to kW
      const avgKw = (p0.value + p1.value) / 2 / 1000;
      const energyKwh = avgKw * dtHours;
      totalKwh += energyKwh;

      // Average price (per kWh) over the interval, clamped to 0
      const avgPrice = Math.max(0, (price[i - 1]?.value ?? 0) + (price[i]?.value ?? 0)) / 2;
      totalCost += energyKwh * avgPrice;
    }

    return { totalKwh, totalCost };
  }

  /**
   * Calculate appropriate step interval based on days range
   */
  private static calculateStep(days: number): string {
    if (days <= 1) return '300s';      // 5 minutes
    if (days <= 3) return '900s';      // 15 minutes
    if (days <= 7) return '3600s';     // 1 hour
    return '10800s';                    // 3 hours
  }
}
