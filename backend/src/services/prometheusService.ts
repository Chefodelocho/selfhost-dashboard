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
}

export class PrometheusService {
  /**
   * Query Prometheus for energy consumption data
   */
  static async queryEnergyMetric(
    hostId: number,
    metric: string,
    instance: string,
    days: number
  ): Promise<EnergyDataResponse> {
    const timestamp = new Date().toISOString();
    console.log(`\n[${timestamp}] [PROMETHEUS] queryEnergyMetric called`);
    console.log(`[PROMETHEUS] Host ID: ${hostId}, Metric: ${metric}, Instance: ${instance}, Days: ${days}`);

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

    // Use the metric as-is (it should contain the full PromQL query with any labels)
    const query = metric;
    console.log(`[PROMETHEUS] PromQL query: ${query}`);
    console.log(`[PROMETHEUS] Time range: ${new Date(startTime * 1000).toISOString()} to ${new Date(endTime * 1000).toISOString()}`);

    const url = `${prometheusUrl}/api/v1/query_range?query=${encodeURIComponent(query)}&start=${startTime}&end=${endTime}&step=${step}`;
    console.log(`[PROMETHEUS] Request URL: ${url}`);

    try {
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

      // Parse the result
      const result = data.data?.result;
      if (!result || result.length === 0) {
        console.log(`[PROMETHEUS] No data returned for query`);
        return {
          host_id: hostId,
          metric,
          instance,
          days,
          step,
          data: [],
        };
      }

      // Extract time series values from the first result
      const values: EnergyDataPoint[] = result[0].values.map(([ts, val]: [number, string]) => ({
        timestamp: ts * 1000, // Convert to milliseconds for JS Date
        value: parseFloat(val),
      }));

      console.log(`[PROMETHEUS] Returning ${values.length} data points`);

      return {
        host_id: hostId,
        metric,
        instance,
        days,
        step,
        data: values,
      };
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error(`[PROMETHEUS] Connection failed to ${prometheusUrl}: ${error.message}`);
        throw new Error(`Cannot connect to Prometheus at ${prometheusUrl}. Ensure the server is running.`);
      }
      throw error;
    }
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
