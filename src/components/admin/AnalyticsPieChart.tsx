"use client";

import { useMemo, useState } from "react";

export type AnalyticsPieSlice = {
  id: string;
  label: string;
  value: number;
  color: string;
};

const TAU = Math.PI * 2;

function polar(cx: number, cy: number, radius: number, angle: number) {
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

function slicePath(cx: number, cy: number, radius: number, start: number, end: number) {
  const from = polar(cx, cy, radius, start);
  const to = polar(cx, cy, radius, end);
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${from.x} ${from.y} A ${radius} ${radius} 0 ${large} 1 ${to.x} ${to.y} Z`;
}

export default function AnalyticsPieChart({
  slices,
  unit = "회",
}: {
  slices: AnalyticsPieSlice[];
  unit?: string;
}) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const total = slices.reduce((sum, item) => sum + item.value, 0);
  const visible = useMemo(() => slices.filter((item) => item.value > 0), [slices]);
  const cx = 120;
  const cy = 120;
  const radius = 104;
  let cursor = -Math.PI / 2;
  const arcs = visible.map((slice) => {
    const portion = slice.value / Math.max(1, total);
    const start = cursor;
    const end = cursor + portion * TAU;
    cursor = end;
    return { ...slice, start, end, portion };
  });
  const active = arcs.find((item) => item.id === hoverId) ?? null;

  if (visible.length === 0) {
    return <p className="mt-4 text-sm text-gray-500">표시할 기록이 없습니다.</p>;
  }

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:items-center">
      <div className="relative mx-auto h-56 w-56">
        <svg viewBox="0 0 240 240" className="h-full w-full" role="img" aria-label="원 그래프">
          {arcs.map((slice) => (
            <path
              key={slice.id}
              d={slicePath(cx, cy, radius, slice.start, slice.end)}
              fill={slice.color}
              opacity={hoverId && hoverId !== slice.id ? 0.45 : 1}
              stroke="#fff"
              strokeWidth="2"
              onMouseEnter={() => setHoverId(slice.id)}
              onMouseLeave={() => setHoverId(null)}
            />
          ))}
          <circle cx={cx} cy={cy} r="58" fill="#fff" />
          <text x={cx} y={cy - 6} textAnchor="middle" className="fill-gray-900" fontSize="18" fontWeight="700">
            {total.toLocaleString("ko-KR")}
          </text>
          <text x={cx} y={cy + 16} textAnchor="middle" className="fill-gray-500" fontSize="11">
            {unit}
          </text>
        </svg>
        {active ? (
          <div className="pointer-events-none absolute left-1/2 top-2 z-10 w-max max-w-[12rem] -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-center shadow-md">
            <p className="text-sm font-semibold text-gray-900">{active.label}</p>
            <p className="text-xs text-gray-500">
              {active.value.toLocaleString("ko-KR")}
              {unit} · {Math.round(active.portion * 1000) / 10}%
            </p>
          </div>
        ) : null}
      </div>
      <ul className="space-y-2">
        {arcs.map((slice) => (
          <li key={slice.id}>
            <button
              type="button"
              className="flex w-full items-baseline justify-between gap-3 text-left text-sm"
              onMouseEnter={() => setHoverId(slice.id)}
              onMouseLeave={() => setHoverId(null)}
            >
              <span className="flex min-w-0 items-center gap-2 text-gray-700">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: slice.color }} />
                <span className="truncate">{slice.label}</span>
              </span>
              <span className="shrink-0 font-medium text-gray-900">
                {slice.value.toLocaleString("ko-KR")}
                {unit} · {Math.round(slice.portion * 1000) / 10}%
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
