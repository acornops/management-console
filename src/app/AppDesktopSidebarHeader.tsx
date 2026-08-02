import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Tooltip } from '@acornops/ui';

import type { DesktopSidebarMode } from '@/app/preferences';
import { ICONS } from '@/constants';

interface AppDesktopSidebarHeaderProps {
  homePath: string;
  logoSrc: string;
  mode: DesktopSidebarMode;
  navigate: (path: string) => void;
  onSetMode: (mode: DesktopSidebarMode) => void;
}

export const AppDesktopSidebarHeader: React.FC<AppDesktopSidebarHeaderProps> = ({
  homePath,
  logoSrc,
  mode,
  navigate,
  onSetMode
}) => {
  const { t } = useTranslation();
  const collapsed = mode === 'collapsed';

  return (
    <div data-sidebar-header="true" className={`flex items-center ${collapsed ? 'flex-col gap-1 px-3 py-3' : 'justify-between gap-2 px-4 py-5'}`}>
      <Button
        variant="tertiary"
        size="inline"
        className="control-target flex min-h-10 min-w-10 cursor-pointer items-center gap-3 hover:bg-ui-bg hover:text-ui-text"
        onClick={() => navigate(homePath)}
        aria-label={t('app.goHome')}
      >
        <img src={logoSrc} alt="" data-rail-align={collapsed ? 'true' : undefined} className="h-9 w-9 shrink-0" />
        <div className={collapsed ? 'sr-only' : 'font-sans type-section-title leading-none tracking-tighter antialiased'}>
          <span className="type-wordmark text-brand-brown dark:text-brand-cream">acorn</span>
          <span data-brand-wordmark className="type-wordmark text-accent-bright">ops</span>
        </div>
      </Button>
      <Tooltip content={t(collapsed ? 'app.expandSidebar' : 'app.collapseSidebar')} side="right">
        <Button
          type="button"
          variant="tertiary"
          size="icon"
          className="flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-md text-ui-text-muted hover:bg-ui-bg hover:text-ui-text focus-visible:ring-2 focus-visible:ring-accent/25"
          aria-controls="desktop-sidebar-navigation"
          aria-expanded={!collapsed}
          aria-label={t(collapsed ? 'app.expandSidebar' : 'app.collapseSidebar')}
          onClick={() => onSetMode(collapsed ? 'expanded' : 'collapsed')}
        >
          <ICONS.PanelLeft
            data-rail-align={collapsed ? 'true' : undefined}
            className="h-[18px] w-[18px]"
          />
        </Button>
      </Tooltip>
    </div>
  );
};
