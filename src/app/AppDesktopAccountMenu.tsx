import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button, Tooltip } from '@acornops/ui';

import { ThemeMenu } from '@/components/common/ThemeMenu';
import { ICONS } from '@/constants';
import type { ResolvedTheme, ThemePreference } from '@/app/theme';
import type { User } from '@/types';
import { AppPaths } from '@/utils/routes';

const MotionButton = motion.create(Button);

function getUserInitials(user: User): string {
  const source = user.name || user.email || 'User';
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2)).toUpperCase();
}

interface AppDesktopAccountMenuProps {
  collapsed: boolean;
  isActive: boolean;
  isOpen: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
  navigate: (path: string) => void;
  onLogout: () => void;
  onSelectTheme: (preference: ThemePreference, source: HTMLButtonElement) => void;
  onSetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  resolvedTheme: ResolvedTheme;
  themePreference: ThemePreference;
  user: User;
}

export const AppDesktopAccountMenu: React.FC<AppDesktopAccountMenuProps> = ({
  collapsed,
  isActive,
  isOpen,
  menuRef,
  navigate,
  onLogout,
  onSelectTheme,
  onSetOpen,
  resolvedTheme,
  themePreference,
  user
}) => {
  const { t } = useTranslation();
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const popoverId = React.useId();
  const userInitials = getUserInitials(user);
  const close = React.useCallback(({ restoreFocus = false } = {}) => {
    onSetOpen(false);
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  }, [onSetOpen]);
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    if (event.key !== 'Escape' || !isOpen) return;
    event.preventDefault();
    event.stopPropagation();
    close({ restoreFocus: true });
  }, [close, isOpen]);

  return (
    <div data-sidebar-account="true" className={`relative z-50 border-t border-ui-border bg-ui-surface ${collapsed ? 'px-3 pb-3 pt-3' : 'p-4'}`} ref={menuRef}>
      <div className="relative">
        <Tooltip content={t('app.accountSettings')} side="right" disabled={!collapsed} className="w-full">
          <MotionButton
            ref={triggerRef}
            type="button"
            variant="tertiary"
            size="inline"
            onClick={() => onSetOpen((current) => !current)}
            onKeyDown={handleKeyDown}
            data-account-settings-active={isActive ? 'true' : undefined}
            className={`group flex w-full items-center rounded-lg border text-left outline-none transition-colors duration-[160ms] focus-visible:ring-2 focus-visible:ring-accent/20 motion-reduce:duration-0 ${
              collapsed ? 'h-10 justify-center p-0' : 'min-h-12 justify-between gap-2.5 px-2.5 py-2'
            } ${(isActive || isOpen) ? 'border-transparent bg-ui-bg text-ui-text hover:bg-ui-bg hover:text-ui-text' : 'border-transparent hover:border-ui-border hover:bg-ui-bg'}`}
            aria-controls={popoverId}
            aria-expanded={isOpen}
            aria-haspopup="menu"
            aria-current={isActive ? 'page' : undefined}
            aria-label={t('app.accountSettings')}
          >
            <span className="flex min-w-0 flex-1 items-center gap-2.5">
              <span data-rail-align={collapsed ? 'true' : undefined} className={`flex h-8 w-8 shrink-0 items-center justify-center border border-ui-border font-mono type-micro-label type-emphasis transition-colors duration-[160ms] motion-reduce:duration-0 ${collapsed ? 'rounded-md' : 'rounded-full'} ${
                isActive ? 'bg-ui-surface text-accent-readable' : 'bg-ui-bg text-ui-text-muted group-hover:text-ui-text'
              }`}>{userInitials}</span>
              <span className={collapsed ? 'sr-only' : 'min-w-0'}>
                <span className="block truncate type-body type-emphasis leading-5 text-ui-text">{user.name}</span>
                <span className="block truncate type-caption leading-4 text-ui-text-muted">{user.email}</span>
              </span>
            </span>
            <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.18 }} className={collapsed ? 'sr-only' : 'shrink-0'}>
              <ICONS.ChevronDown className="h-3.5 w-3.5 text-ui-text-muted transition-colors duration-[160ms] group-hover:text-ui-text motion-reduce:duration-0" aria-hidden="true" />
            </motion.span>
          </MotionButton>
        </Tooltip>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.99 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              id={popoverId}
              aria-label={t('app.account')}
              onKeyDown={handleKeyDown}
              data-account-menu-panel="true"
              className={`absolute z-50 max-h-[calc(100vh-1rem)] w-72 overflow-y-auto rounded-lg border border-ui-border bg-ui-surface shadow-sm ${
                collapsed ? 'bottom-0 left-full ml-2' : 'bottom-full left-0 right-0 mb-2 w-auto'
              }`}
            >
              <div className="space-y-1 p-1.5">
                <MotionButton
                  type="button"
                  variant="tertiary"
                  size="md"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    close();
                    navigate(AppPaths.accountSettings());
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`type-ui flex w-full items-center justify-start gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-[160ms] motion-reduce:duration-0 sm:min-h-10 ${
                    isActive ? 'bg-ui-bg text-ui-text' : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'
                  }`}
                >
                  <ICONS.User className={`h-4 w-4 shrink-0 ${isActive ? 'text-accent-strong' : ''}`} />
                  <span>{t('app.accountSettings')}</span>
                </MotionButton>
                <ThemeMenu preference={themePreference} resolvedTheme={resolvedTheme} variant="account" onSelect={onSelectTheme} />
              </div>
              <div className="border-t border-ui-border p-1.5">
                <MotionButton type="button" variant="tertiary" size="md" whileTap={{ scale: 0.98 }} onClick={() => { close(); onLogout(); }} className="control-target type-ui flex w-full items-center justify-start gap-3 rounded-lg px-3 py-2 text-left text-ui-text-muted transition-colors duration-[160ms] hover:bg-ui-bg hover:text-ui-text motion-reduce:duration-0 sm:min-h-10">
                  <ICONS.LogOut className="h-4 w-4 shrink-0" />
                  <span>{t('app.logout')}</span>
                </MotionButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
