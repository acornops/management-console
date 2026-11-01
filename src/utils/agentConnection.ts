export type AgentConnectionState = 'connected' | 'disconnected' | 'not_installed' | 'unknown';

export interface AgentConnectionObservation {
  state: 'connected' | 'disconnected' | 'unknown';
  lastHeartbeatAt: string | null;
  observedAt: string;
  expiresAt: string | null;
  hasConnectionEvidence?: boolean;
  /** Local API receipt, retained by the session cache. Never renewed by rendering. */
  receivedAt: number;
}

/** Parse only at the API boundary. An absent field supports older control planes. */
export function parseAgentConnection(value: unknown, receivedAt = Date.now()): AgentConnectionObservation | undefined {
  if (value === undefined) return undefined;
  const unknown: AgentConnectionObservation = { state: 'unknown', lastHeartbeatAt: null, observedAt: '', expiresAt: null, receivedAt };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return unknown;
  const input = value as Record<string, unknown>;
  const timestamp = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
  if (!['connected', 'disconnected', 'unknown'].includes(String(input.state)) || !timestamp(input.observedAt)
    || (input.hasConnectionEvidence !== undefined && typeof input.hasConnectionEvidence !== 'boolean')
    || (input.lastHeartbeatAt !== null && !timestamp(input.lastHeartbeatAt))
    || (input.expiresAt !== null && !timestamp(input.expiresAt))) return unknown;
  const observed = Date.parse(input.observedAt as string);
  const heartbeat = input.lastHeartbeatAt === null ? null : Date.parse(input.lastHeartbeatAt as string);
  const expires = input.expiresAt === null ? null : Date.parse(input.expiresAt as string);
  if ((heartbeat === null) !== (expires === null)
    || (heartbeat !== null && (heartbeat > observed || expires! < heartbeat || expires! - heartbeat > 600_000))
    || (input.state === 'connected' && heartbeat === null)) return unknown;
  return { state: input.state as AgentConnectionObservation['state'], lastHeartbeatAt: input.lastHeartbeatAt as string | null,
    observedAt: input.observedAt as string, expiresAt: input.expiresAt as string | null,
    hasConnectionEvidence: input.hasConnectionEvidence as boolean | undefined, receivedAt };
}

export function agentConnectionDeadline(connection: AgentConnectionObservation): number | null {
  if (connection.state !== 'connected' || !Number.isFinite(connection.receivedAt) || connection.expiresAt === null) return null;
  const remaining = Date.parse(connection.expiresAt) - Date.parse(connection.observedAt);
  return Number.isFinite(remaining) && remaining <= 600_000 ? connection.receivedAt + remaining : null;
}

export function observedAgentConnectionState(connection: AgentConnectionObservation, now = Date.now()): AgentConnectionState {
  if (connection.state !== 'connected') return connection.state;
  const deadline = agentConnectionDeadline(connection);
  if (deadline === null || now < connection.receivedAt) return 'unknown';
  return now < deadline ? 'connected' : 'disconnected';
}

export function hasNeverConnectedObservation(connection: AgentConnectionObservation): boolean {
  return connection.state !== 'connected' && Boolean(connection.observedAt)
    && connection.hasConnectionEvidence !== true
    && connection.lastHeartbeatAt === null && connection.expiresAt === null;
}

export function virtualMachineConnectionState(vm: {
  status: 'online' | 'offline' | 'degraded' | 'unknown'; connection?: AgentConnectionObservation;
}, now = Date.now()): AgentConnectionState {
  if (vm.status === 'offline') return 'disconnected';
  if (vm.connection) {
    if (vm.status === 'unknown' && hasNeverConnectedObservation(vm.connection)) return 'not_installed';
    return observedAgentConnectionState(vm.connection, now);
  }
  return vm.status === 'online' ? 'connected' : vm.status === 'unknown' ? 'not_installed' : 'disconnected';
}
