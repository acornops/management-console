import React from 'react';

import {
  DataTable,
  DataTableBody,
  DataTableFrame,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableRow,
  TableLoadingRows
} from '@acornops/ui';

interface TargetCapabilityInventoryLoadingColumn {
  label: React.ReactNode;
  className?: string;
  numeric?: boolean;
}

interface TargetCapabilityInventoryLoadingProps {
  caption: string;
  columns: TargetCapabilityInventoryLoadingColumn[];
  label: string;
  rows?: number;
}

/** Keeps capability catalog loading table-shaped without inventing metrics or totals. */
export const TargetCapabilityInventoryLoading: React.FC<TargetCapabilityInventoryLoadingProps> = ({
  caption,
  columns,
  label,
  rows = 4
}) => (
  <section data-target-capability-inventory-loading="true" className="overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
    <DataTableFrame data-target-capability-table-frame="true" className="rounded-none border-0 shadow-none custom-scrollbar">
      <DataTable caption={caption} className="w-full table-fixed text-left" aria-label={caption}>
        <DataTableHeader collectionState={{ phase: 'loading', itemCount: 0, showDuringInitialLoading: true }}>
          <DataTableRow>
            {columns.map((column, index) => (
              <DataTableHeaderCell key={index} className={column.className} numeric={column.numeric}>
                {column.label}
              </DataTableHeaderCell>
            ))}
          </DataTableRow>
        </DataTableHeader>
        <DataTableBody>
          <TableLoadingRows columns={columns.length} label={label} rows={rows} showAvatarInFirstColumn />
        </DataTableBody>
      </DataTable>
    </DataTableFrame>
  </section>
);

export const McpServersCatalogLoading: React.FC<{
  caption: string;
  labels: {
    server: string;
    status: string;
    enabled: string;
    tools: string;
    actions: string;
  };
  label: string;
}> = ({ caption, labels, label }) => (
  <TargetCapabilityInventoryLoading
    caption={caption}
    label={label}
    columns={[
      { label: labels.server },
      { label: labels.status },
      { label: labels.enabled },
      { label: labels.tools, className: 'hidden md:table-cell' },
      { label: labels.actions, numeric: true }
    ]}
  />
);
