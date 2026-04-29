import ReactECharts from 'echarts-for-react';

type Props = {
  metrics: Record<string, unknown>[];
};

export default function MetricsChart({ metrics }: Props) {
  if (!metrics || metrics.length === 0) return null;

  const steps = metrics.map((m: Record<string, unknown>) => m.step as number);
  const losses = metrics.map((m: Record<string, unknown>) => m.loss as number);

  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 20, top: 10, bottom: 30 },
    xAxis: { type: 'category', name: 'Step', data: steps.map(String) },
    yAxis: { type: 'value', name: 'Loss' },
    series: [{
      data: losses, type: 'line', smooth: true,
      itemStyle: { color: '#e94560' },
      areaStyle: { color: 'rgba(233,69,96,0.1)' },
    }],
  };

  return (
    <div style={{ marginTop: 24 }}>
      <h4 style={{ marginBottom: 12 }}>训练指标趋势</h4>
      <ReactECharts option={option} style={{ height: 240 }} />
    </div>
  );
}
