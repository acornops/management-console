export interface TelemetryChartPoint<T = unknown> {
  position: number;
  value: number;
  source?: T;
}

export interface ProjectTelemetrySeriesOptions {
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
  minValue?: number;
  maxValue?: number;
  gapThreshold?: number;
}

export interface ProjectedTelemetryPoint<T = unknown> extends TelemetryChartPoint<T> {
  x: number;
  y: number;
  startsSegment: boolean;
}

export function telemetryGapThreshold(
  positions: number[],
  minimumGap: number,
  multiplier = 2.5
): number {
  const intervals = positions
    .slice(1)
    .map((position, index) => position - positions[index])
    .filter((interval) => Number.isFinite(interval) && interval > 0)
    .sort((left, right) => left - right);
  if (intervals.length === 0) return minimumGap;
  return Math.max(minimumGap, intervals[Math.floor(intervals.length / 2)] * multiplier);
}

export function projectTelemetrySeries<T>(
  input: TelemetryChartPoint<T>[],
  options: ProjectTelemetrySeriesOptions
): { path: string; points: ProjectedTelemetryPoint<T>[] } {
  const points = input.filter((point) => Number.isFinite(point.position) && Number.isFinite(point.value));
  if (points.length === 0) return { path: '', points: [] };

  const positions = points.map((point) => point.position);
  const values = points.map((point) => point.value);
  const positionStart = Math.min(...positions);
  const positionEnd = Math.max(...positions);
  const minValue = options.minValue ?? Math.min(...values);
  const maxValue = options.maxValue ?? Math.max(...values);
  const positionRange = positionEnd - positionStart;
  const valueRange = maxValue - minValue;
  const xRange = options.xEnd - options.xStart;
  const yRange = options.yEnd - options.yStart;

  const projected = points.map<ProjectedTelemetryPoint<T>>((point, index) => ({
    ...point,
    x: positionRange <= 0
      ? options.xStart + xRange / 2
      : options.xStart + ((point.position - positionStart) / positionRange) * xRange,
    y: valueRange <= 0
      ? options.yStart + yRange / 2
      : options.yEnd - ((point.value - minValue) / valueRange) * yRange,
    startsSegment: index === 0 || Boolean(
      options.gapThreshold
      && point.position - points[index - 1].position > options.gapThreshold
    )
  }));

  return {
    points: projected,
    path: projected
      .map((point) => `${point.startsSegment ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
      .join(' ')
  };
}
