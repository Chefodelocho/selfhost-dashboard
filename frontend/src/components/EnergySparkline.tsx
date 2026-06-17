'use client';

import { useRef, useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
} from 'recharts';
import type { EnergyDataPoint } from '@/types';

interface EnergySparklineProps {
  data: EnergyDataPoint[];
  avgWatts?: number;
}

export default function EnergySparkline({ data, avgWatts }: EnergySparklineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });

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

  if (data.length === 0) return null;

  const chartData = data.map((point) => ({
    value: point.value,
  }));

  return (
    <div className="flex items-center gap-2">
      <div ref={containerRef} className="flex-1 h-8" style={{ minWidth: 0 }}>
        {dims.width > 0 && dims.height > 0 && (
          <AreaChart
            width={dims.width}
            height={dims.height}
            data={chartData}
            margin={{ top: 2, right: 0, left: 0, bottom: 2 }}
          >
            <defs>
              <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={1.5}
              fill="url(#sparkGradient)"
              dot={false}
            />
          </AreaChart>
        )}
      </div>
      {avgWatts !== undefined && (
        <div className="text-right shrink-0">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{avgWatts.toFixed(0)}</span>
          <span className="text-[10px] text-gray-400 ml-0.5 dark:text-gray-500">W avg</span>
        </div>
      )}
    </div>
  );
}
