"use client";

import { useState } from "react";

function formatCount(value: number) {
  return value.toLocaleString("ko-KR");
}

function formatChartDate(date: string) {
  const parts = date.split("-").map(Number);
  if (parts.length < 2 || parts.some((part) => Number.isNaN(part))) {
    return date;
  }
  if (parts.length === 2) {
    return `${parts[0]}년 ${parts[1]}월`;
  }
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][
    new Date(parts[0], parts[1] - 1, parts[2]).getDay()
  ];
  return `${parts[0]}년 ${parts[1]}월 ${parts[2]}일 (${weekday})`;
}

type ChartLayout = {
  offsetX: number;
  offsetY: number;
  scale: number;
  elW: number;
};

function readLayout(rect: DOMRect, vbW: number, vbH: number): ChartLayout {
  const elAspect = rect.width / Math.max(1, rect.height);
  const vbAspect = vbW / vbH;
  if (elAspect > vbAspect) {
    const scale = rect.height / vbH;
    return { offsetX: (rect.width - vbW * scale) / 2, offsetY: 0, scale, elW: rect.width };
  }
  const scale = rect.width / vbW;
  return { offsetX: 0, offsetY: (rect.height - vbH * scale) / 2, scale, elW: rect.width };
}

export default function AnalyticsMiniChart<T extends { date: string }>({
  daily,
  value,
  color,
  metric,
  unit = "회",
  className = "mt-4",
}: {
  daily: T[];
  value: (item: T) => number;
  color: string;
  metric: string;
  unit?: string;
  className?: string;
}) {
  const [hover, setHover] = useState<{ index: number; layout: ChartLayout } | null>(null);
  const values = daily.map(value);
  const maxBar = Math.max(1, ...values);
  const width = 720;
  const height = 220;
  const padX = 18;
  const padY = 16;
  const innerWidth = width - padX * 2;
  const innerHeight = height - padY * 2;
  const points = daily.map((item, index) => {
    const x = daily.length <= 1 ? width / 2 : padX + (index / (daily.length - 1)) * innerWidth;
    const y = padY + innerHeight - (values[index] / maxBar) * innerHeight;
    return { x, y, item, count: values[index] };
  });
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = points.length
    ? `${padX},${height - padY} ${polyline} ${points[points.length - 1]?.x ?? padX},${height - padY}`
    : "";
  const active = hover ? points[hover.index] : null;
  const markerLeft = hover && active ? hover.layout.offsetX + active.x * hover.layout.scale : 0;
  const markerTop = hover && active ? hover.layout.offsetY + active.y * hover.layout.scale : 0;
  const tooltipShift =
    hover && active
      ? markerLeft < 72
        ? "0"
        : markerLeft > hover.layout.elW - 72
          ? "-100%"
          : "-50%"
      : "-50%";

  if (daily.length === 0) {
    return <div className="mt-4 h-48 rounded-lg bg-gray-50" />;
  }

  function nearestIndex(clientX: number, layout: ChartLayout) {
    const svgX = (clientX - layout.offsetX) / Math.max(0.001, layout.scale);
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    points.forEach((point, index) => {
      const dist = Math.abs(point.x - svgX);
      if (dist < bestDist) {
        best = index;
        bestDist = dist;
      }
    });
    return best;
  }

  function updateHover(clientX: number, rect: DOMRect) {
    const layout = readLayout(rect, width, height);
    setHover({
      index: nearestIndex(clientX - rect.left, layout),
      layout,
    });
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative h-48 w-full sm:h-60">
        {active && hover ? (
          <>
            <div
              className="pointer-events-none absolute top-0 z-10 w-0 border-l border-dashed"
              style={{
                left: markerLeft,
                top: hover.layout.offsetY,
                height: height * hover.layout.scale,
                borderColor: color,
              }}
            />
            <div
              className="pointer-events-none absolute z-20 w-max max-w-[min(100%,16rem)] rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md"
              style={{
                left: markerLeft,
                top: markerTop,
                transform: `translate(${tooltipShift}, calc(-100% - 10px))`,
              }}
            >
              <p className="text-sm leading-snug text-gray-600">{formatChartDate(active.item.date)}</p>
              <p className="mt-0.5 text-sm font-semibold leading-snug" style={{ color }}>
                {metric} {formatCount(active.count)}
                {unit}
              </p>
            </div>
          </>
        ) : null}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-full w-full cursor-crosshair overflow-visible"
          role="img"
          onMouseLeave={() => setHover(null)}
          onMouseMove={(event) => {
            updateHover(event.clientX, event.currentTarget.getBoundingClientRect());
          }}
          onTouchStart={(event) => {
            const touch = event.touches[0];
            if (!touch) return;
            updateHover(touch.clientX, event.currentTarget.getBoundingClientRect());
          }}
        >
          <polygon points={area} fill={color} opacity="0.12" />
          <polyline
            points={polyline}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((point, index) => (
            <circle
              key={`${point.item.date}-${index}`}
              cx={point.x}
              cy={point.y}
              r={hover?.index === index ? 6.5 : 4}
              fill="#fff"
              stroke={color}
              strokeWidth={hover?.index === index ? 3.2 : 2.2}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
