import ReactECharts from 'echarts-for-react';
import type { NodeItem } from '../types';

type Props = { nodes: NodeItem[] };

export default function ResourceChart({ nodes }: Props) {
  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 40, top: 10, bottom: 30 },
    legend: {
      data: ['GPU%', 'TASKS'],
      bottom: 0,
      textStyle: { color: '#6666aa', fontFamily: 'monospace', fontSize: 10 },
    },
    xAxis: {
      type: 'category', data: nodes.map(n => n.name),
      axisLabel: { color: '#888', fontFamily: 'monospace', fontSize: 9 },
      axisLine: { lineStyle: { color: '#2a2a50' } },
    },
    yAxis: [
      {
        type: 'value', name: '%', max: 100,
        axisLabel: { color: '#666' }, splitLine: { lineStyle: { color: '#1a1a30' } },
      },
      {
        type: 'value', name: 'TASKS',
        axisLabel: { color: '#666' }, splitLine: { show: false },
      },
    ],
    series: [
      {
        name: 'GPU%', type: 'bar',
        data: nodes.map(n => n.resources.gpuUtilization),
        itemStyle: {
          color: '#b44dff',
          borderRadius: 0,
          shadowBlur: 10, shadowColor: 'rgba(180,77,255,0.4)',
        },
      },
      {
        name: 'TASKS', type: 'line', yAxisIndex: 1,
        data: nodes.map(n => n.resources.activeTasks),
        itemStyle: { color: '#39ff14' },
        lineStyle: { width: 2, shadowBlur: 8, shadowColor: 'rgba(57,255,20,0.5)' },
        symbol: 'rect', symbolSize: 8,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 280 }} />;
}
