import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ICONS } from '@/constants';
import { headerMotion } from '@/lib/motion';

const HelpAction: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
}> = ({ icon: Icon, title, description, href }) => (
  <a
    href={href}
    className="group flex min-h-24 items-start gap-4 rounded-lg border border-ui-border bg-ui-surface p-5 text-left transition-colors hover:bg-ui-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
  >
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-bg text-accent-strong">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
    <span className="min-w-0">
      <span className="block text-sm font-bold text-ui-text">{title}</span>
      <span className="mt-1 block text-xs leading-5 text-ui-text-muted">{description}</span>
    </span>
  </a>
);

export const HelpPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8">
      <motion.header {...headerMotion} className="mb-10">
        <h1 className="type-route-title">{t('help.title')}</h1>
        <p className="type-body mt-2 max-w-2xl">{t('help.subtitle')}</p>
      </motion.header>

      <div className="grid max-w-4xl gap-4 md:grid-cols-2">
        <HelpAction
          icon={ICONS.BookOpen}
          title={t('help.docsTitle')}
          description={t('help.docsBody')}
          href="/docs"
        />
        <HelpAction
          icon={ICONS.MessageSquare}
          title={t('help.supportTitle')}
          description={t('help.supportBody')}
          href="mailto:support@acornops.dev"
        />
        <HelpAction
          icon={ICONS.Shield}
          title={t('help.auditTitle')}
          description={t('help.auditBody')}
          href="#/help"
        />
        <HelpAction
          icon={ICONS.CircleHelp}
          title={t('help.troubleshootingTitle')}
          description={t('help.troubleshootingBody')}
          href="#/help"
        />
      </div>
    </div>
  );
};
