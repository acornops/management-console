import React from 'react';

export interface ResponsiveLedgerProps {
  compact: React.ReactNode;
  wide: React.ReactNode;
}

export function ResponsiveLedger({ compact, wide }: ResponsiveLedgerProps) {
  return (
    <>
      <div className="divide-y divide-ui-border lg:hidden">{compact}</div>
      <div className="hidden overflow-x-auto lg:block">{wide}</div>
    </>
  );
}
