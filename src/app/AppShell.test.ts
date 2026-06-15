import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const appShell = readFileSync(resolve(root, 'src/app/AppShell.tsx'), 'utf8');

describe('AppShell cluster page callbacks', () => {
  it('keeps workspace cluster merge callbacks stable across parent renders', () => {
    expect(appShell).toContain('const replaceWorkspaceKubernetesClusters = React.useCallback');
    expect(appShell).toContain('const appendWorkspaceKubernetesClusters = React.useCallback');
    expect(appShell).toContain('}, [setKubernetesClusters, setWorkspaces]);');
  });

  it('keeps assistant completion indicators unseen-aware instead of always showing old terminal traces', () => {
    expect(appShell).toContain("const [clusterAssistantNavStatus, setClusterAssistantNavStatus] = React.useState<AssistantNavStatus>('idle');");
    expect(appShell).toContain("const isClusterChatVisible = activeClusterSubview === 'chat' || Boolean(isClusterCopilotOpen && clusterCopilotCluster);");
    expect(appShell).toContain('previousAssistantRuntimeStatusRef.current = status;');
    expect(appShell).toContain('isClusterChatVisibleRef.current = isClusterChatVisible;');
    expect(appShell).toContain('isActiveAssistantStatus(previousStatus) && !isClusterChatVisibleRef.current');
    expect(appShell).toContain('clusterAssistantNavStatus={clusterAssistantNavStatus}');
    expect(appShell).toContain('onAssistantRuntimeStatusChange={handleAssistantRuntimeStatusChange}');
  });
});
