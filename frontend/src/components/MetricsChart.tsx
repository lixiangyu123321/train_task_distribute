import ReactECharts from 'echarts-for-react';
import { useState } from 'react';

type Props = { metrics: Record<string, unknown>[] };
type ChartTab = 'training' | 'system';

function fmtDuration(sec: number): string {
  if (sec < 60) return sec.toFixed(0) + 's';
  if (sec < 3600) return Math.floor(sec / 60) + 'm ' + Math.round(sec % 60) + 's';
  return Math.floor(sec / 3600) + 'h ' + Math.round((sec % 3600) / 60) + 'm';
}

// Insert null at epoch integer boundaries so smooth curves don't create flat segments
function withBreaks<T extends (number | null | undefined)[]>(
  values: T,
  epochs: number[],
): { data: (number | null)[]; labels: string[] } {
  const data: (number | null)[] = [];
  const labels: string[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i > 0) {
      const currInt = Math.floor(epochs[i]);
      const prevInt = Math.floor(epochs[i - 1]);
      if (currInt > prevInt) {
        data.push(null);
        labels.push('');
      }
    }
    data.push(values[i] ?? null);
    labels.push(String(epochs[i]));
  }
  return { data, labels };
}

function TrainingChart({ metrics }: Props) {
  const epochs = metrics.map(m => Number(m.epoch ?? m.step ?? 0));
  const losses = metrics.map(m => Number(m.loss ?? 0));
  const lrs = metrics.map(m => m.learning_rate ?? m.lr) as (number | undefined)[];
  const hasLr = lrs.some(v => v != null);

  const { data: lossData, labels: xLabels } = withBreaks(losses, epochs);
  const { data: lrData } = withBreaks(lrs, epochs);

  const series: Record<string, unknown>[] = [
    {
      name: 'Loss',
      data: lossData,
      type: 'line', smooth: true, yAxisIndex: 0,
      symbol: 'circle', symbolSize: 3, showSymbol: true,
      emphasis: { focus: 'series', itemStyle: { borderWidth: 2, borderColor: '#fff' }, scale: 2.5 },
      itemStyle: { color: '#f06090' },
      lineStyle: { width: 2, shadowBlur: 6, shadowColor: 'rgba(240,96,144,0.4)' },
      areaStyle: {
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: 'rgba(240,96,144,0.18)' }, { offset: 1, color: 'rgba(240,96,144,0.01)' }],
        },
      },
    },
  ];

  if (hasLr) {
    series.push({
      name: 'Learning Rate',
      data: lrData,
      type: 'line', smooth: true, yAxisIndex: 1,
      symbol: 'diamond', symbolSize: 3, showSymbol: true,
      emphasis: { focus: 'series', itemStyle: { borderWidth: 2, borderColor: '#fff' }, scale: 2.5 },
      itemStyle: { color: '#40d8f0' },
      lineStyle: { width: 1.5, type: 'dashed' },
    });
  }

  const yAxis: Record<string, unknown>[] = [
    {
      type: 'value', name: 'Loss', position: 'left',
      nameLocation: 'middle', nameGap: 50,
      nameTextStyle: { color: '#f06090', fontSize: 10, fontFamily: "'Courier New', monospace" },
      axisLabel: { color: '#8090a8', fontSize: 9, margin: 8,
        formatter: (v: number) => v < 0.01 ? v.toExponential(1) : v.toFixed(3) },
      splitLine: { lineStyle: { color: '#2a3548' } },
    },
  ];

  if (hasLr) {
    yAxis.push({
      type: 'value', name: 'Learning Rate', position: 'right',
      nameLocation: 'middle', nameGap: 55,
      nameTextStyle: { color: '#40d8f0', fontSize: 10, fontFamily: "'Courier New', monospace" },
      axisLabel: { color: '#8090a8', fontSize: 9, margin: 8,
        formatter: (v: number) => v < 1e-6 ? v.toExponential(0) : v.toExponential(1) },
      splitLine: { show: false },
    });
  }

  const option = {
    backgroundColor: 'transparent',
    animation: false,
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'cross', label: { backgroundColor: '#1c2333' }, lineStyle: { color: '#506080', type: 'dashed' }, crossStyle: { color: '#506080' } },
      backgroundColor: '#1c2333', borderColor: '#3d5070', padding: [10, 14],
      textStyle: { color: '#e8e8f0', fontFamily: "'Courier New', monospace", fontSize: 11 },
      formatter: (params: { seriesName: string; value: number; name: string; marker: string; color: string }[]) => {
        if (!params.length) return '';
        const epoch = Number(params[0].name);
        if (isNaN(epoch)) return '';
        let html = `<div style="font-size:10px;color:#8090a8;margin-bottom:6px;border-bottom:1px solid #2a3548;padding-bottom:4px">EPOCH ${epoch.toFixed(2)}</div>`;
        params.forEach(p => {
          const val = p.value;
          if (val == null) return;
          const formatted = p.seriesName === 'Learning Rate' ? val.toExponential(3) :
            val < 0.001 ? val.toExponential(4) : val.toFixed(4);
          html += `<div style="margin:3px 0">${p.marker} <span style="color:#aaa">${p.seriesName}:</span> <b style="color:${p.color};font-size:12px">${formatted}</b></div>`;
        });
        return html;
      },
    },
    legend: {
      show: hasLr, data: hasLr ? ['Loss', 'Learning Rate'] : ['Loss'],
      textStyle: { color: '#8090a8', fontFamily: "'Courier New', monospace", fontSize: 10 },
      top: 0, itemWidth: 14, itemHeight: 8, selectedMode: true,
    },
    grid: { left: 70, right: hasLr ? 75 : 20, top: hasLr ? 35 : 15, bottom: 40 },
    xAxis: {
      type: 'category', data: xLabels,
      axisLabel: {
        color: '#8090a8', fontFamily: 'monospace', fontSize: 9, margin: 10,
        interval: (idx: number) => {
          if (idx === 0 || idx === xLabels.length - 1) return true;
          return Math.floor(epochs[idx]) !== Math.floor(epochs[idx - 1]);
        },
        formatter: (val: string) => val ? `Ep ${Math.floor(Number(val))}` : '',
      },
      axisTick: { alignWithLabel: true },
      axisLine: { lineStyle: { color: '#2a3548' } },
    },
    yAxis, series,
    dataZoom: [
      { type: 'inside', xAxisIndex: 0 },
      { type: 'slider', xAxisIndex: 0, height: 18, bottom: 4,
        borderColor: '#2a3548', fillerColor: 'rgba(64,216,240,0.12)',
        handleStyle: { color: '#40d8f0' }, textStyle: { color: '#8090a8', fontSize: 8 },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 320 }} />;
}

function SystemChart({ metrics }: Props) {
  const epochs = metrics.map(m => Number(m.epoch ?? m.step ?? 0));
  const gpuUtils = metrics.map(m => m.gpu_util != null ? Number(m.gpu_util) : null);
  const elapsedS = metrics.map(m => m.elapsed_s != null ? Number(m.elapsed_s) : null);
  const hasGpu = gpuUtils.some(v => v != null);
  const hasElapsed = elapsedS.some(v => v != null);

  if (!hasGpu && !hasElapsed) {
    return (
      <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--dim)', fontFamily: "'Press Start 2P', monospace", fontSize: 7 }}>
        NO SYSTEM METRICS AVAILABLE
      </div>
    );
  }

  const { data: gpuData, labels: xLabels } = withBreaks(gpuUtils as (number | null)[], epochs);
  const { data: elapsedData } = withBreaks(elapsedS as (number | null)[], epochs);

  const series: Record<string, unknown>[] = [];
  const yAxis: Record<string, unknown>[] = [];
  const legendData: string[] = [];

  if (hasGpu) {
    yAxis.push({
      type: 'value', name: 'GPU Utilization', position: 'left', min: 0, max: 100,
      nameLocation: 'middle', nameGap: 42,
      nameTextStyle: { color: '#a78bfa', fontSize: 10, fontFamily: "'Courier New', monospace" },
      axisLabel: { color: '#8090a8', fontSize: 9, margin: 8, formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#2a3548' } },
    });
    series.push({
      name: 'GPU Util',
      data: gpuData,
      type: 'line', smooth: true, yAxisIndex: 0,
      symbol: 'triangle', symbolSize: 3, showSymbol: true,
      emphasis: { focus: 'series', itemStyle: { borderWidth: 2, borderColor: '#fff' }, scale: 2.5 },
      itemStyle: { color: '#a78bfa' },
      lineStyle: { width: 2 },
      areaStyle: {
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: 'rgba(167,139,250,0.18)' }, { offset: 1, color: 'rgba(167,139,250,0.02)' }],
        },
      },
    });
    legendData.push('GPU Util');
  }

  if (hasElapsed) {
    yAxis.push({
      type: 'value', name: 'Elapsed Time', position: hasGpu ? 'right' : 'left',
      nameLocation: 'middle', nameGap: hasGpu ? 55 : 42,
      nameTextStyle: { color: '#f0c040', fontSize: 10, fontFamily: "'Courier New', monospace" },
      axisLabel: { color: '#8090a8', fontSize: 9, margin: 8,
        formatter: (v: number) => fmtDuration(v) },
      splitLine: hasGpu ? { show: false } : { lineStyle: { color: '#2a3548' } },
    });
    series.push({
      name: 'Elapsed',
      data: elapsedData,
      type: 'line', smooth: true, yAxisIndex: hasGpu ? 1 : 0,
      symbol: 'rect', symbolSize: 3, showSymbol: true,
      emphasis: { focus: 'series', itemStyle: { borderWidth: 2, borderColor: '#fff' }, scale: 2.5 },
      itemStyle: { color: '#f0c040' },
      lineStyle: { width: 1.5, type: 'dashed' },
    });
    legendData.push('Elapsed');
  }

  const option = {
    backgroundColor: 'transparent',
    animation: false,
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'cross', label: { backgroundColor: '#1c2333' }, lineStyle: { color: '#506080', type: 'dashed' }, crossStyle: { color: '#506080' } },
      backgroundColor: '#1c2333', borderColor: '#3d5070', padding: [10, 14],
      textStyle: { color: '#e8e8f0', fontFamily: "'Courier New', monospace", fontSize: 11 },
      formatter: (params: { seriesName: string; value: number; name: string; marker: string; color: string }[]) => {
        if (!params.length) return '';
        const epoch = Number(params[0].name);
        if (isNaN(epoch)) return '';
        let html = `<div style="font-size:10px;color:#8090a8;margin-bottom:6px;border-bottom:1px solid #2a3548;padding-bottom:4px">EPOCH ${epoch.toFixed(2)}</div>`;
        params.forEach(p => {
          const val = p.value;
          if (val == null) return;
          const formatted = p.seriesName === 'GPU Util' ? val.toFixed(1) + '%' :
            p.seriesName === 'Elapsed' ? fmtDuration(val) : String(val);
          html += `<div style="margin:3px 0">${p.marker} <span style="color:#aaa">${p.seriesName}:</span> <b style="color:${p.color};font-size:12px">${formatted}</b></div>`;
        });
        return html;
      },
    },
    legend: {
      show: legendData.length > 1, data: legendData,
      textStyle: { color: '#8090a8', fontFamily: "'Courier New', monospace", fontSize: 10 },
      top: 0, itemWidth: 14, itemHeight: 8, selectedMode: true,
    },
    grid: { left: 65, right: hasElapsed && hasGpu ? 75 : 20, top: legendData.length > 1 ? 35 : 15, bottom: 40 },
    xAxis: {
      type: 'category', data: xLabels,
      axisLabel: {
        color: '#8090a8', fontFamily: 'monospace', fontSize: 9, margin: 10,
        interval: (idx: number) => {
          if (idx === 0 || idx === xLabels.length - 1) return true;
          return Math.floor(epochs[idx]) !== Math.floor(epochs[idx - 1]);
        },
        formatter: (val: string) => val ? `Ep ${Math.floor(Number(val))}` : '',
      },
      axisTick: { alignWithLabel: true },
      axisLine: { lineStyle: { color: '#2a3548' } },
    },
    yAxis, series,
    dataZoom: [
      { type: 'inside', xAxisIndex: 0 },
      { type: 'slider', xAxisIndex: 0, height: 18, bottom: 4,
        borderColor: '#2a3548', fillerColor: 'rgba(64,216,240,0.12)',
        handleStyle: { color: '#40d8f0' }, textStyle: { color: '#8090a8', fontSize: 8 },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 280 }} />;
}

const tabStyle = (active: boolean): React.CSSProperties => ({
  fontFamily: "'Press Start 2P', monospace",
  fontSize: 7,
  padding: '6px 14px',
  cursor: 'pointer',
  border: '2px solid',
  borderColor: active ? 'var(--cyan)' : 'var(--border)',
  background: active ? 'rgba(64,216,240,0.12)' : 'transparent',
  color: active ? 'var(--cyan)' : 'var(--dim)',
  letterSpacing: 0.5,
  transition: 'all 0.15s',
});

export default function MetricsChart({ metrics }: Props) {
  const [tab, setTab] = useState<ChartTab>('training');
  if (!metrics || metrics.length === 0) return null;

  const hasSystem = metrics.some(m => m.gpu_util != null || m.elapsed_s != null);

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {hasSystem && (
          <>
            <div style={tabStyle(tab === 'training')} onClick={() => setTab('training')}>TRAINING</div>
            <div style={tabStyle(tab === 'system')} onClick={() => setTab('system')}>SYSTEM</div>
          </>
        )}
        <div style={{ flex: 1 }} />
      </div>
      {tab === 'training'
        ? <TrainingChart metrics={metrics} />
        : <SystemChart metrics={metrics} />}
    </div>
  );
}
