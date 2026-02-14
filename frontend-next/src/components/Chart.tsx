'use client';

import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, CandlestickSeries } from 'lightweight-charts';

interface ChartProps {
  data?: CandlestickData[];
}

export const Chart: React.FC<ChartProps> = ({ data }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 250,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#000000',
      },
      grid: {
        vertLines: { color: '#e0e0e0' },
        horzLines: { color: '#e0e0e0' },
      },
      timeScale: { borderColor: '#000000' },
      rightPriceScale: { borderColor: '#000000' },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#ffffff',
      downColor: '#ff0000',
      borderVisible: true,
      borderColor: '#000000',
      wickUpColor: '#000000',
      wickDownColor: '#ff0000',
    });

    // Generate random initial data if none provided
    const initialData = data || generateRandomData();
    series.setData(initialData);

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
      if (seriesRef.current && data) {
          seriesRef.current.setData(data);
      }
  }, [data]);

  return <div ref={chartContainerRef} style={{ width: '100%', height: '250px' }} />;
};

function generateRandomData(): CandlestickData[] {
  const data: CandlestickData[] = [];
  let price = 100;
  const now = new Date();
  for (let i = 0; i < 100; i++) {
    const time = new Date(now.getTime() - (100 - i) * 86400000);
    const open = price;
    const close = price + (Math.random() - 0.5) * 5;
    const high = Math.max(open, close) + Math.random() * 2;
    const low = Math.min(open, close) - Math.random() * 2;

    data.push({
      time: time.toISOString().split('T')[0],
      open: open,
      high: high,
      low: low,
      close: close,
    } as CandlestickData);

    price = close;
  }
  return data;
}
