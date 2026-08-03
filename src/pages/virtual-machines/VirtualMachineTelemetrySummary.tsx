import React from 'react';
import { Activity, Gauge, HardDrive } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TelemetryFactGrid } from '@/components/common/TelemetryFactGrid';
import {
  formatVmBytes,
  formatVmLoad,
  formatVmPercent,
  type VmMetricTimelinePoint
} from '@/pages/virtual-machines/VirtualMachineMetrics';

interface VirtualMachineTelemetrySummaryProps {
  latestTelemetryPoint: VmMetricTimelinePoint | null;
  mode?: 'all' | 'storage';
}

export const VirtualMachineTelemetrySummary: React.FC<VirtualMachineTelemetrySummaryProps> = ({
  latestTelemetryPoint,
  mode = 'all'
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
      id: 'load',
      label: t('virtualMachines.overview.load1m'),
      value: formatVmLoad(latestTelemetryPoint?.loadAverage1m ?? null),
      detail: t('virtualMachines.overview.latestSample'),
      icon: Activity
    },
    {
      id: 'memory',
      label: t('virtualMachines.overview.memoryUsed'),
      value: formatVmPercent(latestTelemetryPoint?.memoryUsedPercent ?? null),
      detail: memoryDetail,
      icon: Gauge
    },
    {
      id: 'swap',
      label: t('virtualMachines.overview.swapUsed'),
      value: formatVmPercent(latestTelemetryPoint?.swapUsedPercent ?? null),
      detail: t('virtualMachines.overview.latestSample'),
      icon: Activity
    },
    {
      id: 'root-disk',
      label: t('virtualMachines.overview.rootDiskUsed'),
      value: formatVmPercent(latestTelemetryPoint?.rootDiskUsedPercent ?? null),
      detail: t('virtualMachines.overview.latestSample'),
      icon: HardDrive
    }
  ].filter(({ id }) => mode === 'all' || id === 'swap' || id === 'root-disk');

  return (
    <TelemetryFactGrid
      items={cards}
      variant="cards"
      className={mode === 'all' ? 'xl:grid-cols-4' : ''}
      data-vm-telemetry-facts={mode}
    />
  );
};
