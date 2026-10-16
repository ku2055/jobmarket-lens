import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { ScatterChart, BarChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  AriaComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { Analysis } from "../data/types";
echarts.use([
  ScatterChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  AriaComponent,
  CanvasRenderer,
]);
export function Atlas({
  analysis,
  label,
  onCell,
}: {
  analysis: Analysis;
  label: (id: string) => string;
  onCell: (occupation: string, level: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const c = echarts.init(ref.current);
    const roles = [...new Set(analysis.cells.map((c) => c.occupationId))],
      levels = [...new Set(analysis.cells.map((c) => c.level))];
    const max = Math.max(1, ...analysis.cells.map((c) => c.count));
    c.setOption({
      animation: !matchMedia("(prefers-reduced-motion: reduce)").matches,
      animationDuration: 250,
      grid: { left: 185, right: 45, top: 18, bottom: 70 },
      tooltip: {
        renderMode: "richText",
        formatter: (p: { data: [number, number, number] }) => {
          const [x, y, n] = p.data;
          return `${label(roles[y])}\n${label(levels[x])}\n${n.toLocaleString()} postings`;
        },
      },
      xAxis: {
        type: "category",
        data: levels.map(label),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#717680", rotate: 20, fontSize: 10 },
        splitLine: {
          show: true,
          lineStyle: { color: "#ecece9", type: "dashed" },
        },
      },
      yAxis: {
        type: "category",
        data: roles.map(label),
        inverse: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "#666a76",
          width: 160,
          overflow: "truncate",
          fontSize: 11,
        },
        splitLine: { show: true, lineStyle: { color: "#ecece9" } },
      },
      series: [
        {
          type: "scatter",
          data: analysis.cells.map((cell) => [
            levels.indexOf(cell.level),
            roles.indexOf(cell.occupationId),
            cell.count,
          ]),
          symbolSize: (v: number[]) => 56 * Math.sqrt(v[2] / max),
          itemStyle: {
            color: "#6861d8",
            opacity: 0.8,
            borderColor: "#fff",
            borderWidth: 2,
          },
          emphasis: { itemStyle: { color: "#35308e", opacity: 1 } },
          label: {
            show: true,
            formatter: (p: { data: number[] }) =>
              p.data[2] > max * 0.16 ? p.data[2].toLocaleString() : "",
            color: "#fff",
            fontSize: 10,
          },
        },
      ],
      aria: {
        enabled: true,
        description: `Occupation and level overview. ${analysis.count.toLocaleString()} postings. Circle area encodes count. Use the categorical table below for keyboard filtering.`,
      },
    });
    c.on("click", ((p: { data: [number, number, number] }) =>
      onCell(roles[p.data[1]], levels[p.data[0]])) as never);
    const observer = new ResizeObserver(() => c.resize());
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      c.dispose();
    };
  }, [analysis, label, onCell]);
  return (
    <div
      ref={ref}
      className="atlas"
      role="img"
      aria-label="Postings by occupation and career level. Use the accessible group list below to filter."
      style={{
        height: Math.max(
          330,
          analysis.cells.length
            ? new Set(analysis.cells.map((c) => c.occupationId)).size * 38 + 90
            : 330,
        ),
      }}
    />
  );
}
