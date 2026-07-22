import React from 'react';
import { useTranslation } from 'react-i18next';

export const MetricChart: React.FC<{
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  points: { label: string; value: number }[];
  unit: string;
  type: 'area' | 'line';
  isLoading?: boolean;
  emptyTitle: string;
  loadingTitle: string;
  emptyDescription: string;
}> = ({ title, description, icon: Icon, points, unit, type, isLoading = false, emptyTitle, loadingTitle, emptyDescription }) => {
  const { i18n, t } = useTranslation();
  const width = 520;
  const height = 220;
  const plotLeft = 54;
  const plotRight = width - 14;
  const plotTop = 18;
  const plotBottom = height - 30;
  const yAxisLabelGap = 6;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;
  const numberFormatter = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 });
  const formatMetricValue = (value: number | string) => `${value}${unit === '%' ? unit : unit ? ` ${unit}` : ''}`;
  const accessibleDataTable = points.length > 0 ? (
    <table className="sr-only">
      <caption>{t('common.chartData', { title })}</caption>
      <thead>
        <tr>
          <th scope="col">{t('common.time')}</th>
          <th scope="col">{t('common.value')}</th>
        </tr>
      </thead>
      <tbody>
        {points.map((point, index) => (
          <tr key={`${point.label}-${index}-accessible`}>
            <th scope="row">{point.label}</th>
            <td>{formatMetricValue(numberFormatter.format(point.value))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ) : null;

  if (points.length < 2) {
    return (
      <div className="rounded-lg border border-ui-border bg-ui-surface p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="type-section-title flex items-center gap-3">
              <Icon className={`h-5 w-5 ${type === 'area' ? 'text-accent-strong' : 'text-metric-blue'}`} aria-hidden="true" />
              {title}
            </h2>
            <p className="type-body mt-1">{description}</p>
          </div>
        </div>
        <div
          className="flex h-[180px] flex-col items-center justify-center border-y border-dashed border-ui-border bg-ui-bg/60 px-6 text-center sm:h-[200px]"
          role={isLoading ? 'status' : undefined}
          aria-live={isLoading ? 'polite' : undefined}
        >
          <p className="type-label">
            {isLoading ? loadingTitle : emptyTitle}
          </p>
          <p className="type-body mt-2 max-w-sm">
            {emptyDescription}
          </p>
        </div>
        {accessibleDataTable}
      </div>
    );
  }

  const maxObservedValue = Math.max(...points.map((point) => point.value), 0);
  const maxValue = Math.max(maxObservedValue * 1.12, 1);
  const coords = points.map((point, index) => {
    const x = points.length === 1
      ? width / 2
      : plotLeft + (index * plotWidth) / (points.length - 1);
    const y = plotTop + (1 - Math.max(0, Math.min(1, point.value / maxValue))) * plotHeight;
    return { x, y, ...point };
  });
  const linePath = coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${plotBottom} L ${coords[0].x} ${plotBottom} Z`;
  const stroke = type === 'area' ? 'var(--brand-orange)' : 'rgb(var(--metric-blue-rgb))';

  return (
    <div className="rounded-lg border border-ui-border bg-ui-surface p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="type-section-title flex items-center gap-3">
            <Icon className={`h-5 w-5 ${type === 'area' ? 'text-accent-strong' : 'text-metric-blue'}`} aria-hidden="true" />
            {title}
          </h2>
          <p className="type-body mt-1">{description}</p>
        </div>
      </div>
      <div className="h-[180px] w-full sm:h-[200px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" aria-hidden="true" focusable="false">
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = plotTop + (1 - tick) * plotHeight;
            const valueLabel = (maxValue * tick).toFixed(maxValue >= 10 ? 0 : 1);
            const label = tick === 0 ? '0' : formatMetricValue(valueLabel);
            return (
              <g key={tick}>
                <line x1={plotLeft} y1={y} x2={plotRight} y2={y} stroke="var(--border)" strokeDasharray="3 3" />
                <text x={plotLeft - yAxisLabelGap} y={y + 4} textAnchor="end" className="type-micro-label fill-ui-text-muted">{label}</text>
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
      {accessibleDataTable}
    </div>
  );
};
