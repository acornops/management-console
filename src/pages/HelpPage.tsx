import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight } from 'lucide-react';
import { ICONS } from '@/constants';
import { IconTile, PageHeader, PageShell } from '@acornops/ui';

export const DEFAULT_HELP_LINKS = {
  documentationUrl: 'https://docs.acornops.dev',
  supportUrl: 'https://discord.gg/jBgTy4KhF'
};

function validHttpsDestination(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function validSupportDestination(value: unknown): value is string {
  if (validHttpsDestination(value)) return true;
  if (typeof value !== 'string' || value.length > 2048 || !value.startsWith('mailto:') || value.includes('?') || value.includes('#')) return false;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.slice('mailto:'.length));
}

export function resolveHelpLinks(value?: { documentationUrl?: unknown; supportUrl?: unknown }) {
  return {
    documentationUrl: validHttpsDestination(value?.documentationUrl) ? value.documentationUrl : DEFAULT_HELP_LINKS.documentationUrl,
    supportUrl: validSupportDestination(value?.supportUrl) ? value.supportUrl : DEFAULT_HELP_LINKS.supportUrl
  };
}

const HelpAction: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
}> = ({ icon: Icon, title, description, href }) => (
  <a
    href={href}
    className="group grid min-h-24 grid-cols-[2.5rem_minmax(0,1fr)_1.25rem] items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-ui-bg focus:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/25 sm:px-6"
  >
    <IconTile>
      <Icon className="h-5 w-5" aria-hidden="true" />
    </IconTile>
    <span className="min-w-0">
      <span className="block type-row-title">{title}</span>
      <span className="mt-1 block type-caption leading-5 text-ui-text-muted">{description}</span>
    </span>
    <ArrowUpRight className="h-4 w-4 text-ui-text-muted transition-colors group-hover:text-accent-strong" aria-hidden="true" />
  </a>
);

export const HelpPage: React.FC<{ helpLinks?: { documentationUrl: string; supportUrl: string } }> = ({ helpLinks }) => {
  const { t } = useTranslation();
  const links = resolveHelpLinks(helpLinks);

  return (
    <PageShell data-route-state="help">
      <PageHeader title={t('help.title')} description={t('help.subtitle')} />

      <div className="max-w-3xl divide-y divide-ui-border overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
        <HelpAction
          icon={ICONS.BookOpen}
          title={t('help.docsTitle')}
          description={t('help.docsBody')}
          href={links.documentationUrl}
        />
        <HelpAction
          icon={ICONS.MessageSquare}
          title={t('help.supportTitle')}
          description={t('help.supportBody')}
          href={links.supportUrl}
        />
      </div>
    </PageShell>
  );
};
