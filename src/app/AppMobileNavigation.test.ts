import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const mobileNavigation = readFileSync(resolve(root, 'src/app/AppMobileNavigation.tsx'), 'utf8');
const assistantStatusIndicator = readFileSync(resolve(root, 'src/app/AssistantNavStatusIndicator.tsx'), 'utf8');
const navCountBadge = readFileSync(resolve(root, 'src/app/NavCountBadge.tsx'), 'utf8');

describe('mobile navigation structure', () => {
  it('uses named sections instead of vague More groups', () => {
    expect(mobileNavigation).not.toContain("t('app.more')");
    expect(mobileNavigation).toContain("t('app.primaryDestinations')");
    expect(mobileNavigation).toContain("t('app.administration')");
    expect(mobileNavigation).toContain("['mcpServers', t('app.mcpServers'), ICONS.Server, 0]");
    expect(mobileNavigation).toContain("['skills', t('app.skills'), ICONS.BookOpen, 0]");
    expect(mobileNavigation).toContain("['tools', t('app.tools'), ICONS.Wrench, 0]");
    expect(mobileNavigation).toContain("['chat', t('app.clusterAssistant'), ICONS.BotMessageSquare, 0]");
    expect(mobileNavigation).toContain("['chat', t('app.vmAssistant'), ICONS.BotMessageSquare, 0]");
    expect(mobileNavigation.indexOf("t('app.mcpServers')")).toBeLessThan(
      mobileNavigation.indexOf("t('app.skills')")
    );
    expect(mobileNavigation.indexOf("t('app.skills')")).toBeLessThan(
      mobileNavigation.indexOf("t('app.tools')")
    );
    expect(mobileNavigation).not.toContain("['settings', t('app.clusterSettings'), ICONS.Settings, 0]");
    expect(mobileNavigation).not.toContain("['settings', t('app.vmSettings'), ICONS.Settings, 0]");
    expect(mobileNavigation).toContain("onNavigateClusterSubview('settings')");
    expect(mobileNavigation).toContain("onNavigateVmSubview('settings')");
    expect(mobileNavigation).toContain("activeClusterSubview === 'settings'");
    expect(mobileNavigation).toContain("activeVmSubview === 'settings'");
  });

  it('uses the shared dialog behavior for the open navigation panel', () => {
    expect(mobileNavigation).toContain("import { Dialog } from '@/components/common/Dialog'");
    expect(mobileNavigation).toContain('const mobileNavButtonRef = React.useRef<HTMLButtonElement>(null);');
    expect(mobileNavigation).toContain('const mobileNavCloseButtonRef = React.useRef<HTMLButtonElement>(null);');
    expect(mobileNavigation).toContain('<Dialog');
    expect(mobileNavigation).toContain('titleId={mobileNavTitleId}');
    expect(mobileNavigation).toContain('initialFocusRef={mobileNavCloseButtonRef}');
    expect(mobileNavigation).not.toContain('onMouseDown={() => onSetMobileNavOpen(false)}');
  });

  it('keeps mobile drawer controls as flat scan groups with large touch targets', () => {
    expect(mobileNavigation).toContain("min-h-11");
    expect(mobileNavigation).not.toContain('<details');
    expect(mobileNavigation).not.toContain('<summary');
    expect(mobileNavigation).toContain("t('app.workspaceContext')");
    expect(mobileNavigation).toContain("t('app.userSettings')");
    expect(mobileNavigation).toContain("{t('app.auditLog')}");
    expect(mobileNavigation).toContain("{t('app.aiSettings')}");
    expect(mobileNavigation).toContain("{t('app.workspaceSettings')}");
    expect(mobileNavigation).toContain("{hasWorkspaceDataAccess && (\n                            <button\n                              type=\"button\"\n                              onClick={() => {\n                                onSetMobileNavOpen(false);\n                                selectedWorkspaceId && navigate(AppPaths.workspaceAiSettings(selectedWorkspaceId));");
    expect(mobileNavigation.indexOf("{t('app.auditLog')}")).toBeLessThan(
      mobileNavigation.indexOf("{t('app.aiSettings')}")
    );
    expect(mobileNavigation.indexOf("{t('app.aiSettings')}")).toBeLessThan(
      mobileNavigation.indexOf("{t('app.workspaceSettings')}")
    );
  });

  it('links virtual machines after clusters in workspace resources', () => {
    expect(mobileNavigation).toContain("t('app.virtualMachines')");
    expect(mobileNavigation).toContain("['virtualMachines', t('app.virtualMachines'), AppPaths.workspaceVirtualMachines, 0]");
    expect(mobileNavigation).not.toContain("title={t('app.virtualMachinesTooltip')}");
    expect(mobileNavigation).not.toContain("t('app.runbooks')");
    expect(mobileNavigation).not.toContain('AppPaths.workspaceRunbooks');
    expect(mobileNavigation.indexOf("['clusters', t('app.clusters')")).toBeLessThan(
      mobileNavigation.indexOf("t('app.virtualMachines')")
    );
  });

  it('keeps assistant activity as a compact trailing status indicator', () => {
    expect(mobileNavigation).toContain('AssistantNavStatusIndicator');
    expect(mobileNavigation).toContain('status={tab === \'chat\' ? clusterAssistantNavStatus : \'idle\'}');
    expect(mobileNavigation).toContain('withTooltip={false}');
    expect(mobileNavigation).not.toContain('tooltipSide="left"');
    expect(assistantStatusIndicator).toContain('title={withTooltip ? undefined : label}');
    expect(assistantStatusIndicator).toContain('aria-label={label}');
    expect(assistantStatusIndicator).not.toContain('aria-live');
    expect(assistantStatusIndicator).toContain('h-5 w-5 shrink-0');
    expect(mobileNavigation).not.toContain('Needs review');
  });

  it('uses the same fixed circular count badge as desktop navigation', () => {
    expect(mobileNavigation).toContain("import { NavCountBadge } from '@/app/NavCountBadge'");
    expect(mobileNavigation).toContain('<NavCountBadge count={badge} />');
    expect(mobileNavigation).not.toContain('MobileNavBadge');
    expect(navCountBadge).toContain('h-5 w-5 min-w-5');
    expect(navCountBadge).toContain('`${MAX_NAV_BADGE_COUNT}+`');
  });
});
