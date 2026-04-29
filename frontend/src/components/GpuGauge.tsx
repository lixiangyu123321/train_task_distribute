import ReactECharts from 'echarts-for-react';

type Props = { value: number; title: string };

export default function GpuGauge({ value, title }: Props) {
  const color = value > 80 ? '#f04050' : '#50e060';
  const option = {
    series: [{
      type: 'gauge',
      startAngle: 200, endAngle: -20, min: 0, max: 100,
      axisLine: { lineStyle: { width: 10, color: [[value / 100, color], [1, '#2a3548']] } },
      pointer: { length: '55%', width: 5, itemStyle: { color: '#9060e0' } },
      axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
      detail: { valueAnimation: true, fontSize: 16, color: color, fontFamily: "'Press Start 2P', monospace", formatter: '{value}%' },
      data: [{ value }],
    }],
  };
  return (
    <div style={{ textAlign: 'center', background: 'var(--bg-card)', borderRadius: 8, padding: '8px 12px', border: '2px solid var(--border)' }}>
      <ReactECharts option={option} style={{ height: 130, width: 160 }} />
      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: 'var(--dim)', marginTop: -2 }}>[{title}]</div>
    </div>
  );
}
