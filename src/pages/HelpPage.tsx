import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight } from 'lucide-react';
import { ICONS } from '@/constants';
import { PageHeader, PageShell } from '@/components/common/PageComposition';

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
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-bg text-accent-strong">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
    <span className="min-w-0">
      <span className="block text-sm font-bold text-ui-text">{title}</span>
      <span className="mt-1 block text-xs leading-5 text-ui-text-muted">{description}</span>
    </span>
    <ArrowUpRight className="h-4 w-4 text-ui-text-muted transition-colors group-hover:text-accent-strong" aria-hidden="true" />
  </a>
);

export const HelpPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <PageShell>
      <PageHeader title={t('help.title')} description={t('help.subtitle')} />

      <div className="max-w-3xl divide-y divide-ui-border overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
        <HelpAction
          icon={ICONS.BookOpen}
          title={t('help.docsTitle')}
          description={t('help.docsBody')}
          href="https://docs.acornops.dev"
        />
        <HelpAction
          icon={ICONS.MessageSquare}
          title={t('help.supportTitle')}
          description={t('help.supportBody')}
          href="https://discord.gg/jBgTy4KhF"
        />
      </div>
    </PageShell>
  );
};
