import ReactECharts from 'echarts-for-react';

type Props = { metrics: Record<string, unknown>[] };

export default function MetricsChart({ metrics }: Props) {
  if (!metrics || metrics.length === 0) return null;

  const steps = metrics.map(m => m.step as number);
  const losses = metrics.map(m => m.loss as number);

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1c2333',
      borderColor: '#2a3548',
      textStyle: { color: '#e8e8f0', fontFamily: "'Courier New', monospace", fontSize: 10 },
    },
    grid: { left: 45, right: 15, top: 10, bottom: 30 },
    xAxis: {
      type: 'category', name: 'STEP', data: steps.map(String),
      axisLabel: { color: '#8090a8', fontFamily: 'monospace', fontSize: 9 },
      axisLine: { lineStyle: { color: '#2a3548' } },
    },
    yAxis: {
      type: 'value', name: 'LOSS',
      axisLabel: { color: '#8090a8' },
      splitLine: { lineStyle: { color: '#2a3548' } },
    },
    series: [{
      data: losses, type: 'line', smooth: false,
      symbol: 'rect', symbolSize: 6,
      itemStyle: { color: '#f06090' },
      lineStyle: { width: 2, shadowBlur: 8, shadowColor: 'rgba(240,96,144,0.5)' },
      areaStyle: { color: 'rgba(240,96,144,0.08)' },
    }],
  };

  return <ReactECharts option={option} style={{ height: 220 }} />;
}
