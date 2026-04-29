import ReactECharts from 'echarts-for-react';
import type { NodeItem } from '../types';

type Props = { nodes: NodeItem[] };

export default function ResourceChart({ nodes }: Props) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1c2333',
      borderColor: '#2a3548',
      textStyle: { color: '#e8e8f0', fontFamily: "'Courier New', monospace", fontSize: 10 },
    },
    grid: { left: 45, right: 50, top: 10, bottom: 45 },
    legend: {
      data: ['GPU%', 'ACTIVE TASKS'],
      bottom: 0,
      itemWidth: 12, itemHeight: 8,
      itemGap: 30,
      textStyle: { color: '#8090a8', fontFamily: "'Press Start 2P', monospace", fontSize: 7 },
    },
    xAxis: {
      type: 'category', data: nodes.map(n => n.name),
      axisLabel: { color: '#8090a8', fontFamily: 'monospace', fontSize: 9, rotate: 0 },
      axisLine: { lineStyle: { color: '#2a3548' } },
    },
    yAxis: [
      {
        type: 'value', name: '%', max: 100, nameTextStyle: { color: '#8090a8', fontSize: 9 },
        axisLabel: { color: '#8090a8', fontSize: 9 },
        splitLine: { lineStyle: { color: '#2a3548', type: 'dashed' } },
      },
      {
        type: 'value', name: 'TASKS', nameTextStyle: { color: '#8090a8', fontSize: 9 },
        axisLabel: { color: '#8090a8', fontSize: 9 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: 'GPU%', type: 'bar', barWidth: '50%',
        data: nodes.map(n => n.resources.gpuUtilization),
        itemStyle: { color: '#9060e0', borderRadius: [4, 4, 0, 0] },
        emphasis: { itemStyle: { color: '#a878f0' } },
      },
      {
        name: 'ACTIVE TASKS', type: 'line', yAxisIndex: 1,
        data: nodes.map(n => n.resources.activeTasks),
        itemStyle: { color: '#f04050' },
        lineStyle: { width: 2, type: 'dashed' },
        symbol: 'diamond', symbolSize: 8,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 280 }} />;
}
