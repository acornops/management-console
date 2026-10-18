import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { fixtureHandlers } from './handlers';
import { createFixtureState, FIXTURE_IDS, getFixtureState, resetFixtureStore } from './store';
import { routeFixtureRequest } from './router';

const server = setupServer(...fixtureHandlers);
const root = 'http://fixture.local/api/v1/workspaces/fixture-workspace';
const clock = '2026-10-18T08:30:00.000Z';
const scenario = (search: string) => vi.stubGlobal('window', {
  location: { search: `?${search}` }, setTimeout: globalThis.setTimeout
});
const read = async (path: string) => {
  const response = await fetch(`${root}${path}`);
  return { status: response.status, body: await response.json() };
};

describe('opt-in UI polish scenarios', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterAll(() => server.close());
  beforeEach(() => { resetFixtureStore(); scenario(''); });
  afterEach(() => vi.unstubAllGlobals());

  it('keeps defaults small and pages 125 explicitly requested members without duplicates', async () => {
    expect((await read('/members')).body.items).toHaveLength(3);
    scenario('fixtureMembers=125');
    const first = (await read('/members?limit=50')).body;
    expect(first.items).toHaveLength(50);
    expect(first.nextCursor).toBeTruthy();
    const second = (await read(`/members?limit=50&cursor=${encodeURIComponent(first.nextCursor)}`)).body;
    const third = (await read(`/members?limit=50&cursor=${encodeURIComponent(second.nextCursor)}`)).body;
    expect(second.items).toHaveLength(50);
    expect(third.items).toHaveLength(25);
    expect(third.nextCursor).toBeUndefined();
    expect(new Set([...first.items, ...second.items, ...third.items].map((member) => member.userId)).size).toBe(125);
    resetFixtureStore();
    scenario('');
    expect((await read('/members')).body.items).toHaveLength(3);
  });

  it('opts into duplicate and long names with stable identities and custom, reordered roles', async () => {
    scenario('fixtureMemberNames=duplicate-long&fixtureRoles=custom-reordered');
    const members = (await read('/members')).body.items;
    expect(members[0].displayName).toBe(members[1].displayName);
    expect(members[0].userId).not.toBe(members[1].userId);
    expect(members[2].displayName.length).toBeGreaterThan(150);
    const roles = (await read('/roles')).body.items;
    expect(roles.map((role) => role.key)).toEqual(['viewer', 'incident-reviewer', 'owner', 'admin']);
    expect(roles.find((role) => role.key === 'incident-reviewer')).toMatchObject({ kind: 'custom', protected: false });
  });

  it('opts into 200 target-scoped MCP tools while leaving VM tools and defaults small', async () => {
    scenario('fixtureMcpTools=200');
    const catalog = (await read(`/targets/${FIXTURE_IDS.cluster}/mcp/catalog`)).body;
    expect(catalog.servers[0].tools).toHaveLength(200);
    expect(catalog.servers[0].toolCounts).toMatchObject({ total: 200, readOnly: 100, writeCapable: 100 });
    const vm = (await read(`/targets/${FIXTURE_IDS.virtualMachine}/mcp/catalog`)).body;
    expect(vm.servers[0].tools).toHaveLength(2);
    expect(getFixtureState().targetMcpServers[0].tools.every((tool) => !tool.mcp_server_url?.startsWith('https:'))).toBe(true);
  });

  it('removes dependent issues from empty target scenarios without hiding unrelated issues', async () => {
    scenario('fixtureEmptyKubernetesClusters=1');
    expect((await read('/kubernetes-clusters')).body.items).toEqual([]);
    expect((await read('/issues')).body.items.map((issue) => issue.targetId)).toEqual([FIXTURE_IDS.virtualMachine]);
    expect((await read('/targets')).body.items.map((target) => target.id)).toEqual([FIXTURE_IDS.virtualMachine]);
    scenario('fixtureEmptyTargets=1');
    expect((await read('/issues')).body.items).toEqual([]);
    expect((await read('/targets')).body.items).toEqual([]);
  });

  it('returns explicitly empty collections and forbidden reads without mutating stored data', async () => {
    scenario('fixtureEmptyPath=/members');
    expect((await read('/members')).body.items).toEqual([]);
    expect(getFixtureState().members).toHaveLength(3);
    scenario('fixtureForbiddenPath=/members');
    expect(await read('/members')).toMatchObject({ status: 403, body: { error: { code: 'FORBIDDEN', retryable: false } } });
    expect((await read('/agents')).status).toBe(200);
  });

  it('separates initial failure/retry from refresh failure after a successful read', async () => {
    scenario('fixtureFailurePath=/members&fixtureFailureOn=1');
    expect((await read('/members')).status).toBe(503);
    expect((await read('/members')).body.items).toHaveLength(3);
    scenario('fixtureFailurePath=/members&fixtureFailureOn=2');
    const initial = await read('/members');
    expect(initial.body.items).toHaveLength(3);
    expect((await read('/members')).status).toBe(503);
    expect(initial.body.items[0].userId).toBe(FIXTURE_IDS.user);
  });

  it('can resolve a newer request before a delayed older request', async () => {
    scenario('fixtureDelayPath=/members&fixtureDelaySequence=80,0');
    const completed: number[] = [];
    const older = read('/members?q=old').then(() => completed.push(1));
    const newer = read('/members?q=new').then(() => completed.push(2));
    await Promise.all([older, newer]);
    expect(completed).toEqual([2, 1]);
  });

  it('returns expired and conflicting approval outcomes without overwriting a decision', async () => {
    scenario('fixtureApprovalState=expired');
    const expired = (await read('/approvals?status=all')).body.items[0];
    const decide = (approval, decision: string) => fetch(`http://fixture.local/api/v1/runs/${approval.runId}/approvals/${approval.approvalId}/decision`, {
      method: 'POST', body: JSON.stringify({ decision })
    });
    expect((await decide(expired, 'approved')).status).toBe(409);
    scenario('fixtureApprovalState=already-decided');
    const decided = (await read('/approvals?status=all')).body.items[0];
    expect(decided.status).toBe('approved');
    expect((await decide(decided, 'rejected')).status).toBe(409);
    expect((await decide(decided, 'approved')).status).toBe(200);
    expect(getFixtureState().approvals[0].status).toBe('approved');
  });

  it('derives schedule occurrences, approval expiry and telemetry from a supplied clock', async () => {
    // A rolling wall clock or hard-coded July occurrences breaks this contract.
    const state = createFixtureState(clock);
    expect(state.clusters[0].latestSnapshot.timestamp).toBe(clock);
    expect(state.approvals[0].expiresAt).toBe('2026-10-19T08:30:00.000Z');
    scenario(`fixtureClock=${encodeURIComponent(clock)}`);
    const preview = await fetch(`${root}/workflow-schedules/preview`, { method: 'POST', body: '{}' }).then((response) => response.json());
    expect(preview.nextRunTimes).toEqual(['2026-10-19T01:00:00.000Z', '2026-10-20T01:00:00.000Z']);
    expect(preview.nextRunTimes.every((time: string) => Date.parse(time) > Date.parse(clock))).toBe(true);
    const metrics = (await read(`/virtual-machines/${FIXTURE_IDS.virtualMachine}/metrics/history`)).body;
    expect(metrics.points[0].timestamp).toBe('2026-10-18T08:00:00.000Z');
    const capability = await routeFixtureRequest(new Request(`http://fixture.local/api/v1/workflows/${FIXTURE_IDS.workflow}/capabilities-preview`, { method: 'POST' }));
    expect(capability.body).toMatchObject({ checkedAt: clock });
  });
});
