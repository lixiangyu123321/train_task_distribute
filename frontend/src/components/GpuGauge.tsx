import ReactECharts from 'echarts-for-react';

type Props = { value: number; title: string };

export default function GpuGauge({ value, title }: Props) {
  const option = {
    series: [{
      type: 'gauge',
      startAngle: 200, endAngle: -20,
      min: 0, max: 100,
      progress: { show: true, width: 10, itemStyle: { color: value > 80 ? '#ff4d4f' : '#52c41a' } },
      axisLine: { lineStyle: { width: 10, color: [[1, '#f0f0f0']] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: { valueAnimation: true, fontSize: 20, formatter: '{value}%' },
      data: [{ value }],
    }],
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <ReactECharts option={option} style={{ height: 160, width: 200 }} />
      <div style={{ fontSize: 13, color: '#666', marginTop: -8 }}>{title}</div>
    </div>
  );
}
