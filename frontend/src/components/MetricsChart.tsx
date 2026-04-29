import ReactECharts from 'echarts-for-react';

type Props = { metrics: Record<string, unknown>[] };

export default function MetricsChart({ metrics }: Props) {
  if (!metrics || metrics.length === 0) return null;

  const steps = metrics.map(m => m.step as number);
  const losses = metrics.map(m => m.loss as number);

  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: 45, right: 15, top: 10, bottom: 30 },
    xAxis: {
      type: 'category', name: 'STEP', data: steps.map(String),
      axisLabel: { color: '#666', fontFamily: 'monospace', fontSize: 9 },
      axisLine: { lineStyle: { color: '#2a2a50' } },
    },
    yAxis: {
      type: 'value', name: 'LOSS',
      axisLabel: { color: '#666' },
      splitLine: { lineStyle: { color: '#1a1a30' } },
    },
    series: [{
      data: losses, type: 'line', smooth: false,
      symbol: 'rect', symbolSize: 6,
      itemStyle: { color: '#ff2d78' },
      lineStyle: { width: 2, shadowBlur: 8, shadowColor: 'rgba(255,45,120,0.5)' },
      areaStyle: { color: 'rgba(255,45,120,0.08)' },
    }],
  };

  return <ReactECharts option={option} style={{ height: 220 }} />;
}
