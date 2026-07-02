import React from 'react';
import { Activity, Gauge, HardDrive } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  formatVmBytes,
  formatVmLoad,
  formatVmPercent,
  type VmMetricTimelinePoint
} from '@/pages/virtual-machines/VirtualMachineMetrics';

export const VirtualMachineTelemetrySummary: React.FC<{ latestTelemetryPoint: VmMetricTimelinePoint | null }> = ({
  latestTelemetryPoint
}) => {
  const { t } = useTranslation();
  const memoryDetail = latestTelemetryPoint && latestTelemetryPoint.memoryUsedBytes !== null && latestTelemetryPoint.memoryTotalBytes !== null
    ? t('virtualMachines.overview.memoryUsedDetail', {
      used: formatVmBytes(latestTelemetryPoint.memoryUsedBytes),
      total: formatVmBytes(latestTelemetryPoint.memoryTotalBytes)
    })
    : t('common.unknown');
  const cards = [
    {
      label: t('virtualMachines.overview.load1m'),
      value: formatVmLoad(latestTelemetryPoint?.loadAverage1m ?? null),
      detail: t('virtualMachines.overview.latestSample'),
      icon: Activity
    },
    {
      label: t('virtualMachines.overview.memoryUsed'),
      value: formatVmPercent(latestTelemetryPoint?.memoryUsedPercent ?? null),
      detail: memoryDetail,
      icon: Gauge
    },
    {
      label: t('virtualMachines.overview.swapUsed'),
      value: formatVmPercent(latestTelemetryPoint?.swapUsedPercent ?? null),
      detail: t('virtualMachines.overview.latestSample'),
      icon: Activity
    },
    {
      label: t('virtualMachines.overview.rootDiskUsed'),
      value: formatVmPercent(latestTelemetryPoint?.rootDiskUsedPercent ?? null),
      detail: t('virtualMachines.overview.latestSample'),
      icon: HardDrive
    }
  ];

  return (
    <div className="mb-12 grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, detail, icon: Icon }) => (
        <div key={label} className="rounded-lg border border-ui-border bg-ui-surface p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-ui-border bg-ui-bg text-accent-strong">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="type-micro-label text-ui-text-muted">{label}</p>
              <p className="mt-1 text-lg font-bold text-ui-text">{value}</p>
            </div>
          </div>
          <p className="type-caption mt-3 truncate text-ui-text-muted">{detail}</p>
        </div>
      ))}
    </div>
  );
};
