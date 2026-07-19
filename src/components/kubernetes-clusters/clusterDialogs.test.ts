import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');
const addClusterModal = readFileSync(resolve(root, 'src/components/kubernetes-clusters/AddClusterModal.tsx'), 'utf8');
const installAgentModal = readFileSync(resolve(root, 'src/components/kubernetes-clusters/ClusterAgentInstallModal.tsx'), 'utf8');
const accessModeSelector = readFileSync(resolve(root, 'src/components/kubernetes-clusters/ClusterAgentAccessModeSelector.tsx'), 'utf8');
const appShell = readFileSync(resolve(root, 'src/app/AppShell.tsx'), 'utf8');
const kubernetesClusterApi = readFileSync(resolve(root, 'src/services/control-plane/kubernetesClusterApi.ts'), 'utf8');
const workspaceClusterActions = readFileSync(resolve(root, 'src/app/useWorkspaceClusterActions.ts'), 'utf8');
const namespaceScopeDialog = readFileSync(
  resolve(root, 'src/features/kubernetes-cluster-detail/components/detail/views/NamespaceScopeDialog.tsx'),
  'utf8'
);

describe('cluster dialog accessibility contracts', () => {
  it('uses the shared dialog shell for the connect-cluster flow', () => {
    expect(addClusterModal).toContain("import { Dialog } from '@/components/common/Dialog'");
    expect(addClusterModal).toContain("import { ModalStepIndicator } from '@/components/common/ModalStepIndicator'");
    expect(addClusterModal).toContain("import { ClusterAgentAccessModeSelector } from '@/components/kubernetes-clusters/ClusterAgentAccessModeSelector'");
    expect(addClusterModal).toContain('titleId="add-cluster-title"');
    expect(addClusterModal).toContain('initialFocusRef={clusterNameInputRef}');
    expect(addClusterModal).toContain('htmlFor="add-cluster-name-input"');
    expect(addClusterModal).toContain('id="add-cluster-name-input"');
    expect(addClusterModal).toContain("aria-label={t('clusterSetup.closeAddDialog')}");
    expect(addClusterModal).toContain('w-full max-w-3xl flex-col overflow-hidden');
    expect(addClusterModal).toContain('rounded-xl border border-ui-border bg-ui-surface');
    expect(addClusterModal).toContain('border-b border-ui-border bg-ui-bg px-6 py-4');
    expect(addClusterModal).toContain('<ModalStepIndicator steps={connectSteps} currentStepId={clusterCreationStep} className="mt-4" />');
    expect(addClusterModal).toContain('flex-1 space-y-4 overflow-y-auto');
    expect(addClusterModal).not.toContain('lg:grid-cols-[minmax(0,1fr)_19rem]');
    expect(addClusterModal).not.toContain('rounded-2xl');
    expect(addClusterModal).not.toContain("clusterCreationStep === 'instructions' ? 'max-w-3xl' : 'max-w-xl'");
    expect(addClusterModal).toContain('max-h-[18rem] overflow-auto');
  });

  it('keeps connect-cluster registration settings separate from install instructions', () => {
    expect(addClusterModal).toContain("t('clusterSetup.continueToInstallAgent')");
    expect(addClusterModal).toContain("t('clusterSetup.namespaceScopeSummary'");
    expect(addClusterModal).toContain('<ClusterAgentAccessModeSelector');
    expect(addClusterModal).toContain('value={agentAccessMode}');
    expect(addClusterModal).toContain('updateInstallCommandNamespaceScope(clusterInstallCommand, includeNamespaces, excludeNamespaces)');
    expect(addClusterModal).not.toContain("helmSetBool('rbac.write.enabled'");
    expect(addClusterModal).toContain("t('clusterSetup.installCommand')");
    expect(addClusterModal).not.toContain("1. {t('clusterSetup.clusterName')}");
    expect(addClusterModal).not.toContain("2. {t('clusterSetup.namespaceScope')}");
    expect(addClusterModal).not.toContain("3. {t('clusterSetup.installCommand')}");
    expect(addClusterModal).not.toContain('onBackToDetails');
    expect(addClusterModal).not.toContain("t('clusterSetup.back')");
    expect((addClusterModal.match(/add-cluster-include-namespaces/g) || []).length).toBe(2);
    expect((addClusterModal.match(/add-cluster-exclude-namespaces/g) || []).length).toBe(2);
    expect(workspaceClusterActions).not.toContain('createdClusterId');
    expect(workspaceClusterActions).not.toContain('updateClusterNamespaceScope');
    expect(kubernetesClusterApi).toContain("agentAccessMode: input.agentAccessMode || 'read_only'");
    expect(kubernetesClusterApi).toContain("JSON.stringify({ agentAccessMode: options.agentAccessMode || 'read_only' })");
  });

  it('resets connect-cluster draft state when the modal closes', () => {
    expect(workspaceClusterActions).toContain('const handleCancelAddCluster = () => {');
    expect(workspaceClusterActions).toContain('resetClusterCreationState();');
    expect(workspaceClusterActions).toContain("setNewClusterName('');");
    expect(workspaceClusterActions).toContain("setIncludeNamespaces('');");
    expect(workspaceClusterActions).toContain("setExcludeNamespaces('');");
    expect(addClusterModal).toContain("const [agentAccessMode, setAgentAccessMode] = useState<AgentAccessMode>('read_only');");
    expect(addClusterModal).toContain("setAgentAccessMode('read_only');");
    expect(appShell).toContain('onCloseAddCluster={handleCancelAddCluster}');
    expect(appShell).not.toContain('onCloseAddCluster={() => setIsAddingCluster(false)}');
  });

  it('checks the registered cluster connection before completing setup', () => {
    expect(workspaceClusterActions).toContain('await controlPlaneApi.getCluster(targetWorkspaceIdForClusterAdd, registeredClusterId)');
    expect(workspaceClusterActions).toContain("getAgentConnectionState(refreshed) !== 'connected'");
    expect(addClusterModal).toContain("t('clusterSetup.checkingConnection')");
  });

  it('uses the shared dialog shell for the install-agent flow', () => {
    expect(installAgentModal).toContain("import { Check, Copy, Loader2 } from 'lucide-react'");
    expect(installAgentModal).toContain("import { Dialog } from '@/components/common/Dialog'");
    expect(installAgentModal).toContain("import { ClusterAgentAccessModeSelector } from '@/components/kubernetes-clusters/ClusterAgentAccessModeSelector'");
    expect(installAgentModal).toContain('titleId="install-agent-title"');
    expect(installAgentModal).toContain('initialFocusRef={generateCommandButtonRef}');
    expect(installAgentModal).toContain('id="install-agent-title"');
    expect(installAgentModal).toContain("aria-label={t('clusterSetup.closeInstallAgentDialog')}");
    expect(installAgentModal).toContain('w-full max-w-xl flex-col overflow-hidden');
    expect(installAgentModal).not.toContain('max-w-3xl');
    expect(installAgentModal).toContain("t('clusterSetup.installCommand')");
    expect(installAgentModal).toContain('rotateClusterAgentKey(cluster.workspaceId, cluster.id, { agentAccessMode })');
    expect(installAgentModal).toContain("getAgentConnectionState(cluster) === 'disconnected'");
    expect(installAgentModal).toContain("t('clusterSetup.rotateAgentKeyWarning')");
    expect(installAgentModal).toContain("t('clusterSetup.rotateAndGenerateCommand')");
    expect(installAgentModal).toContain('<ClusterAgentAccessModeSelector');
    expect(installAgentModal).toContain('GENERATE_COMMAND_SPINNER_DELAY_MS = 500');
    expect(installAgentModal).toContain('const [showGenerateSpinner, setShowGenerateSpinner] = React.useState(false);');
    expect(installAgentModal).toContain('window.setTimeout(() =>');
    expect(installAgentModal).toContain('setShowGenerateSpinner(true);');
    expect(installAgentModal).toContain('const generateCommandLabel = isReinstall');
    expect(installAgentModal).toContain("t('clusterSetup.regenerateCommand')");
    expect(installAgentModal).toContain("t('clusterSetup.generateCommand')");
    expect(installAgentModal).toContain("className={isGenerating ? 'cursor-wait' : ''}");
    expect(installAgentModal).toContain('aria-busy={isGenerating}');
    expect(installAgentModal).toContain('aria-disabled={isGenerating}');
    expect(installAgentModal).toContain('{showGenerateSpinner && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}');
    expect(installAgentModal).not.toContain('min-w-[10.75rem]');
    expect(installAgentModal).not.toContain('absolute left-3');
    expect(installAgentModal).not.toContain('\n            disabled={isGenerating}\n            variant="primary"');
    expect(installAgentModal).toContain('inline-flex h-9 w-9');
    expect(installAgentModal).toContain('max-h-[18rem] overflow-auto');
    expect(installAgentModal).not.toContain('rounded-xl bg-code-bg p-4');
    expect(installAgentModal).not.toContain("t('clusterSetup.copyCommand')");
  });

  it('keeps agent access loading state visually stable', () => {
    expect(accessModeSelector).toContain('transition-colors');
    expect(accessModeSelector).toContain('aria-disabled={disabled}');
    expect(accessModeSelector).toContain('disabled={disabled}');
    expect(accessModeSelector).toContain('onChange={() => onChange(mode.value)}');
    expect(accessModeSelector).toContain("disabled ? 'cursor-not-allowed opacity-60' : ''");
    expect(accessModeSelector).not.toContain('transition-all');
  });

  it('uses the shared dialog shell and labelled token controls for namespace scope', () => {
    expect(namespaceScopeDialog).toContain("import { Dialog } from '@/components/common/Dialog'");
    expect(namespaceScopeDialog).toContain('titleId="namespace-scope-title"');
    expect(namespaceScopeDialog).not.toContain('initialFocusRef={includeInputRef}');
    expect(namespaceScopeDialog).toContain('htmlFor="namespace-scope-include-input"');
    expect(namespaceScopeDialog).toContain('id="namespace-scope-include-input"');
    expect(namespaceScopeDialog).toContain('htmlFor="namespace-scope-exclude-input"');
    expect(namespaceScopeDialog).toContain('id="namespace-scope-exclude-input"');
    expect(namespaceScopeDialog).toContain("aria-label={t('clusterSetup.closeNamespaceScopeDialog')}");
  });
});
