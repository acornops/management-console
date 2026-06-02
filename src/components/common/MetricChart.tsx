import React from 'react';

export const MetricChart: React.FC<{
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  points: { label: string; value: number }[];
  unit: string;
  type: 'area' | 'line';
  isLoading?: boolean;
  emptyTitle: string;
  loadingTitle: string;
  emptyDescription: string;
}> = ({ title, description, icon: Icon, points, unit, type, isLoading = false, emptyTitle, loadingTitle, emptyDescription }) => {
  const width = 520;
  const height = 220;
  const padding = 28;

  if (points.length < 2) {
    return (
      <div className="rounded-xl border border-ui-border bg-ui-surface p-4 shadow-sm sm:p-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="type-section-title flex items-center gap-3">
              <Icon className={`h-6 w-6 ${type === 'area' ? 'text-accent-strong' : 'text-metric-blue'}`} />
              {title}
            </h2>
            <p className="type-body mt-1">{description}</p>
          </div>
        </div>
        <div className="flex h-[240px] flex-col items-center justify-center border-y border-dashed border-ui-border bg-ui-bg/60 px-6 text-center">
          <p className="type-label">
            {points.length === 0 && !isLoading ? emptyTitle : loadingTitle}
          </p>
          <p className="type-body mt-2 max-w-sm">
            {emptyDescription}
          </p>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const coords = points.map((point, index) => {
    const x = points.length === 1
      ? width / 2
      : padding + (index * (width - padding * 2)) / (points.length - 1);
    const y = padding + (1 - Math.max(0, Math.min(1, point.value / maxValue))) * (height - padding * 2);
    return { x, y, ...point };
  });
  const linePath = coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height - padding} L ${coords[0].x} ${height - padding} Z`;
  const stroke = type === 'area' ? 'var(--brand-orange)' : 'rgb(var(--metric-blue-rgb))';

  return (
    <div className="rounded-xl border border-ui-border bg-ui-surface p-4 shadow-sm sm:p-8">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="type-section-title flex items-center gap-3">
            <Icon className={`h-6 w-6 ${type === 'area' ? 'text-accent-strong' : 'text-metric-blue'}`} />
            {title}
          </h2>
          <p className="type-body mt-1">{description}</p>
        </div>
      </div>
      <div className="h-[240px] w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" role="img" aria-label={title}>
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = padding + (1 - tick) * (height - padding * 2);
            const label = tick === 0 ? '0' : `${(maxValue * tick).toFixed(maxValue >= 10 ? 0 : 1)} ${unit}`;
            return (
              <g key={tick}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="var(--border)" strokeDasharray="3 3" />
                <text x={4} y={y + 4} className="type-micro-label fill-ui-text-muted">{label}</text>
              </g>
            );
          })}
          {type === 'area' && <path d={areaPath} fill="var(--brand-orange)" opacity="0.08" />}
          <path d={linePath} fill="none" stroke={stroke} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          {coords.map((point, index) => (
            <circle key={`${point.label}-${index}-dot`} cx={point.x} cy={point.y} r={4} fill={stroke} stroke="var(--surface)" strokeWidth={2} />
          ))}
          {coords.map((point, index) => index === 0 || index === coords.length - 1 ? (
            <text key={`${point.label}-${index}-label`} x={point.x} y={height - 4} textAnchor={index === 0 ? 'start' : 'end'} className="type-micro-label fill-ui-text-muted">
              {point.label}
            </text>
          ) : null)}
        </svg>
      </div>
    </div>
  );
};
