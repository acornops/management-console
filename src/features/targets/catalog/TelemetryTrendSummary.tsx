import React from 'react';
import { DataTable, DataTableBody, DataTableCell, DataTableHeader, DataTableHeaderCell, DataTableRow } from '@acornops/ui';

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
  <div className="sr-only">
    <DataTable caption={title} className="min-w-0">
      <DataTableHeader>
        <DataTableRow>
          <DataTableHeaderCell scope="col">{metricColumnLabel}</DataTableHeaderCell>
          <DataTableHeaderCell scope="col">{startLabel}</DataTableHeaderCell>
          <DataTableHeaderCell scope="col">{endLabel}</DataTableHeaderCell>
        </DataTableRow>
      </DataTableHeader>
      <DataTableBody>
        {series.map((item) => (
          <DataTableRow key={item.label}>
            <DataTableCell as="th" scope="row">{item.label}</DataTableCell>
            <DataTableCell>{item.startValue}</DataTableCell>
            <DataTableCell>{item.endValue}</DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  </div>
);
