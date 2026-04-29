import ReactECharts from 'echarts-for-react';
import type { NodeItem } from '../types';

type Props = { nodes: NodeItem[] };

export default function ResourceChart({ nodes }: Props) {
  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: 45, right: 50, top: 10, bottom: 45 },
    legend: {
      data: ['GPU%', 'ACTIVE TASKS'],
      bottom: 0,
      itemWidth: 12, itemHeight: 8,
      itemGap: 30,
      textStyle: { color: '#8a7aaa', fontFamily: "'Press Start 2P', monospace", fontSize: 7 },
    },
    xAxis: {
      type: 'category', data: nodes.map(n => n.name),
      axisLabel: { color: '#9a8fa8', fontFamily: 'monospace', fontSize: 9, rotate: 0 },
      axisLine: { lineStyle: { color: '#e0d6c8' } },
    },
    yAxis: [
      {
        type: 'value', name: '%', max: 100, nameTextStyle: { color: '#b0a0c0', fontSize: 9 },
        axisLabel: { color: '#b0a0c0', fontSize: 9 },
        splitLine: { lineStyle: { color: '#f0e8d8', type: 'dashed' } },
      },
      {
        type: 'value', name: 'TASKS', nameTextStyle: { color: '#b0a0c0', fontSize: 9 },
        axisLabel: { color: '#b0a0c0', fontSize: 9 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: 'GPU%', type: 'bar', barWidth: '50%',
        data: nodes.map(n => n.resources.gpuUtilization),
        itemStyle: { color: '#b8a0e8', borderRadius: [4, 4, 0, 0] },
        emphasis: { itemStyle: { color: '#c8b8f8' } },
      },
      {
        name: 'ACTIVE TASKS', type: 'line', yAxisIndex: 1,
        data: nodes.map(n => n.resources.activeTasks),
        itemStyle: { color: '#ff8a80' },
        lineStyle: { width: 2, type: 'dashed' },
        symbol: 'diamond', symbolSize: 8,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 280 }} />;
}
