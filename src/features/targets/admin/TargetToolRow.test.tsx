import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { initializeI18n } from '@/i18n';
import { TargetToolRow } from '@/features/targets/admin/TargetToolRow';
import type { ControlPlaneTargetToolItem } from '@/services/controlPlaneApi';

beforeAll(async () => {
  await initializeI18n();
});

describe('TargetToolRow', () => {
  it('keeps an unavailable Web Search preference enabled and explains the effective state', () => {
    const tool: ControlPlaneTargetToolItem = {
      id: 'web_search',
      label: 'Web Search',
      description: 'Search the web.',
      enabled: true,
      toggleable: true,
      origin: 'target_setting',
      capability: 'read',
      runtimeKind: 'provider_native',
      availability: {
        available: false,
        unavailableReason: 'openai_responses_api_required'
      },
      permissions: { canEdit: true },
      config: {
        domainFilters: {
          allowedDomains: [],
          blockedDomains: []
        }
      }
    };

    const markup = renderToStaticMarkup(
      <table>
        <tbody>
          <TargetToolRow
            tool={tool}
            runtimeLabel="Provider"
            capabilityLabel="Read"
            capability="read"
            canEditTools
            pendingToolId={null}
            onConfigure={() => undefined}
            onToggleTool={() => undefined}
          />
        </tbody>
      </table>
    );

    expect(markup).toContain('Unavailable');
    expect(markup).toContain('Requires the OpenAI Responses API');
    expect(markup).toContain('role="switch"');
    expect(markup).toContain('aria-checked="true"');
    expect(markup).not.toContain('border-b border-ui-bg');
  });
});
