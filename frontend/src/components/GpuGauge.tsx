import ReactECharts from 'echarts-for-react';

type Props = { value: number; title: string };

export default function GpuGauge({ value, title }: Props) {
  const color = value > 80 ? '#ff2d78' : '#39ff14';
  const option = {
    series: [{
      type: 'gauge',
      startAngle: 200, endAngle: -20,
      min: 0, max: 100,
      axisLine: { lineStyle: { width: 12, color: [[value / 100, color], [1, '#1a1a30']] } },
      pointer: { length: '60%', width: 6, itemStyle: { color: '#b44dff' } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: {
        valueAnimation: true, fontSize: 18,
        color: color, fontFamily: "'Press Start 2P', monospace",
        formatter: '{value}%',
        textShadow: `0 0 10px ${color}`,
      },
      data: [{ value }],
    }],
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <ReactECharts option={option} style={{ height: 150, width: 180 }} />
      <div style={{
        fontFamily: "'Press Start 2P', monospace", fontSize: 8,
        color: '#6666aa', marginTop: -4,
      }}>
        [{title}]
      </div>
    </div>
  );
}
