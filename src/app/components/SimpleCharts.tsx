import React from "react";

// ── Simple Bar Chart ──
interface BarChartData {
  label: string;
  values: { value: number; color: string; name: string }[];
}

export function SimpleBarChart({
  data,
  height = 200,
}: {
  data: BarChartData[];
  height?: number;
}) {
  if (data.length === 0) return null;
  const allValues = data.flatMap((d) => d.values.map((v) => v.value));
  const maxVal = Math.max(...allValues, 1);
  const barGroupWidth = 100 / data.length;
  const groupGap = 8;
  const barGap = 2;

  const legendItems = data[0]?.values.map((v) => ({ name: v.name, color: v.color })) || [];

  return (
    <div className="w-full" style={{ height }}>
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-end gap-0 px-1 relative">
          {/* Y-axis grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
            <div
              key={`grid-${pct}`}
              className="absolute left-0 right-0 border-t border-border/30"
              style={{ bottom: `${pct * 100}%` }}
            />
          ))}
          {data.map((group, gi) => (
            <div
              key={`bar-group-${gi}`}
              className="flex items-end gap-[2px] justify-center relative z-10"
              style={{ width: `${barGroupWidth}%`, paddingInline: `${groupGap / 2}px` }}
            >
              {group.values.map((v, vi) => {
                const h = maxVal > 0 ? (v.value / maxVal) * 100 : 0;
                return (
                  <div
                    key={`bar-${gi}-${vi}`}
                    className="flex-1 rounded-t-sm min-w-[6px] max-w-[28px] transition-all duration-300 hover:opacity-80 group relative"
                    style={{ height: `${Math.max(h, 2)}%`, backgroundColor: v.color }}
                    title={`${v.name}: ${v.value}`}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-card border shadow-sm rounded px-1.5 py-0.5 text-[9px] text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                      {v.value}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {/* X-axis labels */}
        <div className="flex mt-1.5 px-1">
          {data.map((group, gi) => (
            <div
              key={`label-${gi}`}
              className="text-center text-[10px] text-muted-foreground truncate"
              style={{ width: `${barGroupWidth}%` }}
            >
              {group.label}
            </div>
          ))}
        </div>
        {/* Legend */}
        {legendItems.length > 1 && (
          <div className="flex justify-center gap-3 mt-2">
            {legendItems.map((item, i) => (
              <span key={`legend-${i}`} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                {item.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Simple Donut / Pie Chart ──
interface PieSlice {
  name: string;
  value: number;
  color: string;
}

export function SimpleDonutChart({
  data,
  size = 140,
  thickness = 25,
  showLegend = true,
}: {
  data: PieSlice[];
  size?: number;
  thickness?: number;
  showLegend?: boolean;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  const center = size / 2;
  const radius = (size - thickness) / 2;
  let cumulative = 0;

  const slices = data.map((d) => {
    const startAngle = (cumulative / total) * 360;
    cumulative += d.value;
    const endAngle = (cumulative / total) * 360;
    return { ...d, startAngle, endAngle };
  });

  const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
    const angleRad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
  };

  const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((slice, i) => {
          const gap = data.length > 1 ? 2 : 0;
          return (
            <path
              key={`slice-${i}`}
              d={describeArc(center, center, radius, slice.startAngle + gap, slice.endAngle - gap)}
              fill="none"
              stroke={slice.color}
              strokeWidth={thickness}
              strokeLinecap="round"
            />
          );
        })}
        <text x={center} y={center - 4} textAnchor="middle" className="fill-foreground text-lg">
          {total}
        </text>
        <text x={center} y={center + 12} textAnchor="middle" className="fill-muted-foreground text-[10px]">
          total
        </text>
      </svg>
      {showLegend && (
        <div className="flex flex-wrap gap-2.5 justify-center mt-2">
          {data.map((d, i) => (
            <span key={`legend-${i}`} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              {d.name} ({d.value})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
