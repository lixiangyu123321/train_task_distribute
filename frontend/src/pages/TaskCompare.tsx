import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { fetchTasks, compareTasks } from '../services/api';
import ReactECharts from 'echarts-for-react';

const COLORS = ['#40d8f0', '#f0c040', '#f070b0']; // cyan, gold, pink

export default function TaskCompare() {
  const { data: taskData } = useApi(() => fetchTasks('COMPLETED', 1, 100));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compareData, setCompareData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedIds.length >= 2) {
      setLoading(true);
      compareTasks(selectedIds)
        .then(setCompareData)
        .catch(() => setCompareData(null))
        .finally(() => setLoading(false));
    } else {
      setCompareData(null);
    }
  }, [selectedIds]);

  const toggle = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const items = (taskData as Record<string, unknown>)?.items as Record<string, unknown>[] || [];

  // Build ECharts option from compareData
  const buildChartOption = () => {
    if (!compareData || compareData.length === 0) return null;

    const series: Record<string, unknown>[] = [];
    let maxLen = 0;

    compareData.forEach((taskMetrics: any, idx: number) => {
      const history = taskMetrics?.metricsHistory || taskMetrics?.history || [];
      if (history.length > maxLen) maxLen = history.length;

      const lossData = history.map((m: Record<string, unknown>) =>
        m.loss != null ? Number(m.loss) : null
      );

      const taskId = selectedIds[idx] || `Task ${idx + 1}`;
      const label = taskId.substring(0, 10) + '..';

      series.push({
        name: label,
        data: lossData,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 3,
        showSymbol: true,
        emphasis: {
          focus: 'series',
          itemStyle: { borderWidth: 2, borderColor: '#fff' },
          scale: 2.5,
        },
        itemStyle: { color: COLORS[idx % COLORS.length] },
        lineStyle: {
          width: 2,
          shadowBlur: 6,
          shadowColor: COLORS[idx % COLORS.length] + '66',
        },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: COLORS[idx % COLORS.length] + '30' },
              { offset: 1, color: COLORS[idx % COLORS.length] + '03' },
            ],
          },
        },
      });
    });

    const xData = Array.from({ length: maxLen }, (_, i) => String(i));

    return {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: {
          type: 'cross',
          label: { backgroundColor: '#1c2333' },
          lineStyle: { color: '#506080', type: 'dashed' },
          crossStyle: { color: '#506080' },
        },
        backgroundColor: '#1c2333',
        borderColor: '#3d5070',
        padding: [10, 14],
        textStyle: { color: '#e8e8f0', fontFamily: "'Courier New', monospace", fontSize: 11 },
        formatter: (params: { seriesName: string; value: number; name: string; marker: string; color: string }[]) => {
          if (!params.length) return '';
          let html = `<div style="font-size:10px;color:#8090a8;margin-bottom:6px;border-bottom:1px solid #2a3548;padding-bottom:4px">STEP ${params[0].name}</div>`;
          params.forEach(p => {
            const val = p.value;
            if (val == null) return;
            const formatted = val < 0.001 ? val.toExponential(4) : val.toFixed(4);
            html += `<div style="margin:3px 0">${p.marker} <span style="color:#aaa">${p.seriesName}:</span> <b style="color:${p.color};font-size:12px">${formatted}</b></div>`;
          });
          return html;
        },
      },
      legend: {
        show: true,
        data: series.map(s => s.name as string),
        textStyle: { color: '#8090a8', fontFamily: "'Courier New', monospace", fontSize: 10 },
        top: 0, itemWidth: 14, itemHeight: 8, selectedMode: true,
      },
      grid: { left: 70, right: 20, top: 35, bottom: 40 },
      xAxis: {
        type: 'category',
        data: xData,
        axisLabel: {
          color: '#8090a8', fontFamily: 'monospace', fontSize: 9, margin: 10,
          interval: (idx: number) => {
            if (idx === 0 || idx === xData.length - 1) return true;
            const step = Math.max(1, Math.floor(xData.length / 10));
            return idx % step === 0;
          },
          formatter: (val: string) => `Step ${val}`,
        },
        axisTick: { alignWithLabel: true },
        axisLine: { lineStyle: { color: '#2a3548' } },
      },
      yAxis: {
        type: 'value',
        name: 'Loss',
        position: 'left',
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: { color: '#f06090', fontSize: 10, fontFamily: "'Courier New', monospace" },
        axisLabel: {
          color: '#8090a8', fontSize: 9, margin: 8,
          formatter: (v: number) => v < 0.01 ? v.toExponential(1) : v.toFixed(3),
        },
        splitLine: { lineStyle: { color: '#2a3548' } },
      },
      series,
      dataZoom: [
        { type: 'inside', xAxisIndex: 0 },
        {
          type: 'slider', xAxisIndex: 0, height: 18, bottom: 4,
          borderColor: '#2a3548', fillerColor: 'rgba(64,216,240,0.12)',
          handleStyle: { color: '#40d8f0' }, textStyle: { color: '#8090a8', fontSize: 8 },
        },
      ],
    };
  };

  const chartOption = buildChartOption();

  return (
    <div>
      <h2>◇ TASK COMPARE</h2>
      <div className="divider" />

      <div style={{ marginTop: 14, marginBottom: 14 }}>
        <h4 style={{ marginBottom: 8 }}>SELECT 2-3 COMPLETED TASKS</h4>
        <div className="panel" style={{ maxHeight: 260, overflowY: 'auto', padding: 0 }}>
          {items.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--dim)', fontFamily: "'Press Start 2P', monospace", fontSize: 7 }}>
              NO COMPLETED TASKS
            </div>
          )}
          {items.map((t: Record<string, unknown>) => {
            const id = t.taskId as string;
            const isSelected = selectedIds.includes(id);
            const colorIdx = selectedIds.indexOf(id);
            return (
              <div key={id}
                onClick={() => toggle(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  background: isSelected ? 'rgba(64,216,240,0.08)' : 'transparent',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = ''; }}
              >
                <input type="checkbox"
                  checked={isSelected}
                  readOnly
                  style={{ accentColor: isSelected ? COLORS[colorIdx] : 'var(--cyan)' }}
                />
                {isSelected && (
                  <div style={{
                    width: 8, height: 8, borderRadius: 2,
                    background: COLORS[colorIdx],
                    flexShrink: 0,
                  }} />
                )}
                <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--muted)' }}>
                  {id.substring(0, 10)}..
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--white)' }}>
                  {t.name as string}
                </span>
                <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: 'var(--purple)', marginLeft: 'auto' }}>
                  {t.type as string}
                </span>
              </div>
            );
          })}
        </div>
        {selectedIds.length > 0 && selectedIds.length < 2 && (
          <div style={{ marginTop: 6, fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: 'var(--gold)' }}>
            SELECT AT LEAST 1 MORE TASK
          </div>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 30, fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: 'var(--cyan)' }}>
          LOADING COMPARISON DATA...
        </div>
      )}

      {chartOption && !loading && (
        <div className="panel" style={{ padding: 20 }}>
          <h4 style={{ marginBottom: 10 }}>LOSS CURVES OVERLAY</h4>
          <ReactECharts option={chartOption} style={{ height: 360 }} />
        </div>
      )}

      {selectedIds.length >= 2 && !loading && !chartOption && (
        <div className="panel" style={{ padding: 30, textAlign: 'center' }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: 'var(--dim)' }}>
            NO METRICS DATA AVAILABLE FOR COMPARISON
          </div>
        </div>
      )}
    </div>
  );
}
