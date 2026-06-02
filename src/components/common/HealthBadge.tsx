
import React from 'react';
import { HealthStatus } from '@/types';

interface Props {
  status: HealthStatus;
  size?: 'sm' | 'md';
}

const HealthBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const colors = {
    [HealthStatus.GREEN]: 'border-status-success/25 bg-status-success-soft text-status-success-text',
    [HealthStatus.YELLOW]: 'border-status-warning/25 bg-status-warning-soft text-status-warning-text',
    [HealthStatus.RED]: 'border-status-danger/25 bg-status-danger-soft text-status-danger-text',
  };

  const dotColors = {
    [HealthStatus.GREEN]: 'bg-status-success',
    [HealthStatus.YELLOW]: 'bg-status-warning',
    [HealthStatus.RED]: 'bg-status-danger',
  };

  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${colors[status]} ${size === 'sm' ? 'scale-90' : ''}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[status]}`}></span>
      {status}
    </div>
  );
};

export default HealthBadge;
