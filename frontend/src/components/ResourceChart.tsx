import ReactECharts from 'echarts-for-react';
import type { NodeItem } from '../types';

type Props = { nodes: NodeItem[] };

export default function ResourceChart({ nodes }: Props) {
  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['GPU利用率', '活跃任务数'], bottom: 0 },
    xAxis: { type: 'category', data: nodes.map(n => n.name) },
    yAxis: [
      { type: 'value', name: '%', max: 100 },
      { type: 'value', name: '任务数' },
    ],
    series: [
      {
        name: 'GPU利用率', type: 'bar',
        data: nodes.map(n => n.resources.gpuUtilization),
        itemStyle: { color: '#1677ff', borderRadius: [4, 4, 0, 0] },
      },
      {
        name: '活跃任务数', type: 'line', yAxisIndex: 1,
        data: nodes.map(n => n.resources.activeTasks),
        itemStyle: { color: '#52c41a' },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 300 }} />;
}
