'use client';

import { useState, useRef, useEffect } from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { EnergyDataPoint } from '@/types';
import { useTheme } from './ThemeProvider';

interface EnergyChartProps {
  data: EnergyDataPoint[];
  days: number;
  onDaysChange: (days: number) => void;
  loading?: boolean;
  priceData?: EnergyDataPoint[];
  totalKwh?: number;
  totalCost?: number;
}

const DAY_OPTIONS = [1, 3, 7, 15];

function formatTime(timestamp: number, days: number): string {
  const date = new Date(timestamp);
  if (days <= 1) {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function formatValue(value: number): string {
  return `${value.toFixed(1)} W`;
}

function formatPrice(value: number): string {
  return `${value.toFixed(3)} €/kWh`;
}

function formatKwh(value: number): string {
  return `${value.toFixed(2)} kWh`;
}

function formatCost(value: number): string {
  return `${value.toFixed(2)} €`;
}

export default function EnergyChart({
  data,
  days,
  onDaysChange,
  loading,
  priceData,
  totalKwh,
  totalCost,
}: EnergyChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const { theme } = useTheme();

  const hasPrice = !!priceData && priceData.length > 0;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDims({
        width: Math.max(0, Math.floor(width)),
        height: Math.max(0, Math.floor(height)),
      });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [data.length > 0]); // Re-attach when chart container appears

  const chartData = data.map((point, i) => ({
    time: point.timestamp,
    value: point.value,
    price: hasPrice ? priceData![i]?.value ?? null : null,
  }));

  // Calculate stats
  const values = data.map(d => d.value).filter(v => !isNaN(v));
  const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;
  const min = values.length > 0 ? Math.min(...values) : 0;

  const isDark = theme === 'dark';

  return (
    <div>
      {/* Day range selector and stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => onDaysChange(d)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                days === d
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {d === 1 ? '1d' : `${d}d`}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          {values.length > 0 && (
            <>
              <span>Avg: <span className="font-semibold text-gray-700 dark:text-gray-300">{avg.toFixed(1)} W</span></span>
              <span>Max: <span className="font-semibold text-gray-700 dark:text-gray-300">{max.toFixed(1)} W</span></span>
              <span>Min: <span className="font-semibold text-gray-700 dark:text-gray-300">{min.toFixed(1)} W</span></span>
            </>
          )}
        </div>
      </div>

      {/* Energy summary when price metric is configured */}
      {hasPrice && totalKwh !== undefined && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg border border-blue-200/60 bg-blue-50/50 px-4 py-3 dark:border-blue-800/40 dark:bg-blue-900/20">
            <p className="text-[11px] font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400">Consumed Energy</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-0.5">
              {totalKwh !== undefined ? formatKwh(totalKwh) : '—'}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">over {days} {days === 1 ? 'day' : 'days'}</p>
          </div>
          <div className="rounded-lg border border-amber-200/60 bg-amber-50/50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-900/20">
            <p className="text-[11px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">Total Cost</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-0.5">
              {totalCost !== undefined ? formatCost(totalCost) : '—'}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              {totalKwh && totalCost !== undefined ? `${formatCost(totalCost / totalKwh)}/kWh avg` : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Legend when price overlay is present */}
      {hasPrice && (
        <div className="flex items-center gap-4 mb-2 text-xs">
          <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
            <span className="inline-block w-3 h-1 rounded-full bg-blue-500"></span> Power (W)
          </span>
          <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
            <span className="inline-block w-3 h-0.5 bg-amber-500"></span> Price (€/kWh)
          </span>
        </div>
      )}

      {/* Chart */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-3 border-blue-100 border-t-blue-600 animate-spin dark:border-gray-700 dark:border-t-blue-500"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
          <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <p className="text-sm">No energy data available</p>
          <p className="text-xs mt-1">Check that Prometheus is running and the metric is correct</p>
        </div>
      ) : (
        <div ref={containerRef} className="h-64 -ml-2" style={{ minWidth: 0 }}>
          {dims.width > 0 && dims.height > 0 && (
            <AreaChart width={dims.width} height={dims.height} data={chartData} margin={{ top: 5, right: hasPrice ? 10 : 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#f1f5f9'} />
              <XAxis
                dataKey="time"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(ts) => formatTime(ts, days)}
                tick={{ fontSize: 11, fill: isDark ? '#9ca3af' : '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: isDark ? '#4b5563' : '#e2e8f0' }}
                minTickGap={40}
              />
              <YAxis
                yAxisId="power"
                tick={{ fontSize: 11, fill: isDark ? '#9ca3af' : '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v} W`}
                width={55}
              />
              {hasPrice && (
                <YAxis
                  yAxisId="price"
                  orientation="right"
                  tick={{ fontSize: 11, fill: isDark ? '#d6a456' : '#d97706' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v.toFixed(2)}`}
                  width={45}
                />
              )}
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#1f2937' : 'white',
                  border: `1px solid ${isDark ? '#4b5563' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  fontSize: '12px',
                  color: isDark ? '#e5e7eb' : undefined,
                }}
                labelStyle={{ color: isDark ? '#9ca3af' : '#64748b', fontWeight: 500 }}
                formatter={(value: unknown, name: unknown) => {
                  if (String(name) === 'price') return [formatPrice(Number(value)), 'Price'];
                  return [formatValue(Number(value)), 'Power'];
                }}
                labelFormatter={(ts) => {
                  return new Date(ts).toLocaleString('es-ES', {
                    day: 'numeric', month: 'short',
                    hour: '2-digit', minute: '2-digit'
                  });
                }}
              />
              <Area
                yAxisId="power"
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#energyGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#3b82f6', stroke: isDark ? '#1f2937' : 'white', strokeWidth: 2 }}
              />
              {hasPrice && (
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="price"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3, fill: '#f59e0b', stroke: isDark ? '#1f2937' : 'white', strokeWidth: 2 }}
                />
              )}
            </AreaChart>
          )}
        </div>
      )}
    </div>
  );
}
