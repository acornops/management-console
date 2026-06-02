import { Service as ClusterService } from '@/types';

const MEMORY_BINARY_UNITS: Record<string, number> = {
  Ki: 1024,
  Mi: 1024 ** 2,
  Gi: 1024 ** 3,
  Ti: 1024 ** 4,
  Pi: 1024 ** 5,
  Ei: 1024 ** 6
};

const MEMORY_DECIMAL_UNITS: Record<string, number> = {
  K: 1000,
  M: 1000 ** 2,
  G: 1000 ** 3,
  T: 1000 ** 4,
  P: 1000 ** 5,
  E: 1000 ** 6
};

export function toArray<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export function parseCpuToCores(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.trim().match(/^([0-9]+(?:\.[0-9]+)?)(n|u|m)?$/);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2];
  if (!Number.isFinite(amount)) return null;

  if (unit === 'n') return amount / 1_000_000_000;
  if (unit === 'u') return amount / 1_000_000;
  if (unit === 'm') return amount / 1000;
  return amount;
}

export function parseMemoryToBytes(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.trim().match(/^([0-9]+(?:\.[0-9]+)?)([a-zA-Z]+)?$/);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2] || '';
  if (!Number.isFinite(amount)) return null;

  if (!unit) return amount;
  if (MEMORY_BINARY_UNITS[unit]) return amount * MEMORY_BINARY_UNITS[unit];
  if (MEMORY_DECIMAL_UNITS[unit]) return amount * MEMORY_DECIMAL_UNITS[unit];
  return null;
}

export function formatCpuCores(cores: number | null): string {
  if (cores === null || !Number.isFinite(cores)) {
    return 'Unavailable';
  }
  if (cores >= 10) return `${cores.toFixed(1)} Core`;
  if (cores >= 1) return `${cores.toFixed(2)} Core`;
  return `${cores.toFixed(3)} Core`;
}

export function formatMemoryBytes(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes)) {
    return 'Unavailable';
  }

  const gib = bytes / (1024 ** 3);
  if (gib >= 1) return `${gib.toFixed(2)} GiB`;

  const mib = bytes / (1024 ** 2);
  if (mib >= 1) return `${mib.toFixed(1)} MiB`;

  const kib = bytes / 1024;
  return `${kib.toFixed(0)} KiB`;
}

export function normalizeServiceType(value: string | undefined): ClusterService['type'] {
  if (value === 'NodePort' || value === 'LoadBalancer') return value;
  return 'ClusterIP';
}

export function formatResourceAge(value: string | undefined): string {
  if (!value) return '-';
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return '-';
  const deltaMs = Math.max(Date.now() - timestamp, 0);
  const minutes = Math.floor(deltaMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 90) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 24) return `${months}mo`;
  const years = Math.floor(days / 365);
  return `${years}y`;
}

export function normalizeNamespaceList(value: string[] | undefined): string[] {
  return Array.isArray(value)
    ? value.map((namespace) => String(namespace).trim()).filter(Boolean)
    : [];
}

export function formatNamespaceScope(include: string[], exclude: string[]): string {
  if (include.length > 0) {
    return include.join(', ');
  }
  if (exclude.length > 0) {
    return `all except ${exclude.join(', ')}`;
  }
  return 'all';
}
