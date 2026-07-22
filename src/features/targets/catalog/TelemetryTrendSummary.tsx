import React from 'react';

export interface TelemetryTrendSeries {
  label: string;
  startValue: string;
  endValue: string;
}

export const TelemetryTrendSummary: React.FC<{
  title: string;
  metricColumnLabel: string;
  startLabel: string;
  endLabel: string;
  series: ReadonlyArray<TelemetryTrendSeries>;
}> = ({ title, metricColumnLabel, startLabel, endLabel, series }) => (
  <table className="sr-only">
    <caption>{title}</caption>
    <thead>
      <tr>
        <th scope="col">{metricColumnLabel}</th>
        <th scope="col">{startLabel}</th>
        <th scope="col">{endLabel}</th>
      </tr>
    </thead>
    <tbody>
      {series.map((item) => (
        <tr key={item.label}>
          <th scope="row">{item.label}</th>
          <td>{item.startValue}</td>
          <td>{item.endValue}</td>
        </tr>
      ))}
    </tbody>
  </table>
);
