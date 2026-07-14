import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { ResolvedTheme, ThemePreference } from '@/app/theme';
import { ThemeToggleIcon } from '@/components/common/ThemeToggleIcon';

export type ThemeMenuVariant = 'login' | 'account' | 'mobile';

export interface ThemeMenuProps {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  variant: ThemeMenuVariant;
  onSelect: (preference: ThemePreference, source: HTMLButtonElement) => void;
}

const themePreferences: ThemePreference[] = ['system', 'light', 'dark'];

export function getThemeMenuFocusIndex(
  currentIndex: number,
  key: 'ArrowDown' | 'ArrowUp' | 'Home' | 'End'
): number {
  if (key === 'Home') return 0;
  if (key === 'End') return themePreferences.length - 1;
  if (key === 'ArrowDown') return (currentIndex + 1) % themePreferences.length;
  return (currentIndex - 1 + themePreferences.length) % themePreferences.length;
}

function preferenceIcon(preference: ThemePreference, className: string): React.ReactNode {
  if (preference === 'system') return <Monitor className={className} aria-hidden="true" />;
  if (preference === 'light') return <Sun className={className} aria-hidden="true" />;
  return <Moon className={className} aria-hidden="true" />;
}

export const ThemeMenu: React.FC<ThemeMenuProps> = ({
  preference,
  resolvedTheme,
  variant,
  onSelect
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const itemRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = React.useId();
  const selectedIndex = themePreferences.indexOf(preference);
  const selectedLabel = t(`app.theme${preference[0].toUpperCase()}${preference.slice(1)}`);

  const close = React.useCallback((restoreFocus = false) => {
    setIsOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
    }
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    itemRefs.current[selectedIndex]?.focus({ preventScroll: true });

    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [close, isOpen, selectedIndex]);

  const focusItem = (index: number) => itemRefs.current[index]?.focus({ preventScroll: true });

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;

    event.preventDefault();
    const currentIndex = itemRefs.current.findIndex((item) => item === document.activeElement);
    focusItem(getThemeMenuFocusIndex(
      currentIndex < 0 ? selectedIndex : currentIndex,
      event.key as 'ArrowDown' | 'ArrowUp' | 'Home' | 'End'
    ));
  };

  const wrapperClass = variant === 'login'
    ? 'fixed right-4 top-4 z-[70]'
    : 'relative w-full';
  const menuPlacementClass = variant === 'login'
    ? 'fixed bottom-4 left-4 right-4 grid grid-cols-3 sm:absolute sm:bottom-auto sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:block'
    : variant === 'account'
      ? 'bottom-0 left-full ml-2'
      : 'bottom-full right-0 mb-2';
  const triggerClass = variant === 'login'
    ? 'flex h-11 w-11 items-center justify-center rounded-lg border border-control-boundary bg-ui-surface/95 text-ui-text-muted shadow-sm transition-colors duration-[160ms] hover:bg-ui-surface-strong hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-control-boundary focus-visible:ring-offset-2 focus-visible:ring-offset-ui-bg motion-reduce:duration-0'
    : variant === 'account'
      ? 'group/theme flex min-h-12 w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-ui-text-muted transition-colors duration-[160ms] hover:bg-ui-bg hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-control-boundary motion-reduce:duration-0'
      : 'flex min-h-11 w-full items-center justify-between rounded-md px-3 py-2 text-xs font-bold text-ui-text-muted transition-colors duration-[160ms] hover:bg-ui-bg hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-control-boundary motion-reduce:duration-0';

  return (
    <div ref={wrapperRef} className={wrapperClass} data-theme-menu={variant}>
      <motion.button
        ref={triggerRef}
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && isOpen) {
            event.preventDefault();
            event.stopPropagation();
            close(true);
          }
          if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !isOpen) {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
        className={`control-target ${triggerClass}`}
        aria-label={t('app.openThemeMenu', { theme: selectedLabel })}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        data-theme-menu-trigger="true"
        data-account-theme-control={variant === 'account' ? 'true' : undefined}
      >
        {variant === 'login' ? (
          <ThemeToggleIcon resolvedTheme={resolvedTheme} />
        ) : variant === 'account' ? (
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-control-boundary bg-ui-bg">
              <ThemeToggleIcon resolvedTheme={resolvedTheme} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-5">{t('app.theme')}</span>
              <span className="block text-xs leading-4 text-ui-text-muted">{selectedLabel}</span>
            </span>
          </span>
        ) : (
          <>
            <span className="flex items-center gap-2">
              <ThemeToggleIcon resolvedTheme={resolvedTheme} />
              <span>{t('app.theme')}</span>
            </span>
            <span className="text-ui-text-muted">{selectedLabel}</span>
          </>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={menuId}
            role="menu"
            aria-label={t('app.themeMenuLabel')}
            initial={{ opacity: 0, y: variant === 'mobile' ? 4 : -4, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: variant === 'mobile' ? 4 : -4, scale: 0.99 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            onKeyDown={handleMenuKeyDown}
            className={`${variant === 'login' ? 'w-auto sm:w-48' : 'absolute w-48'} z-[70] rounded-lg border border-control-boundary bg-ui-surface p-1.5 text-ui-text shadow-xl ${menuPlacementClass}`}
            data-resolved-theme={resolvedTheme}
          >
            {themePreferences.map((option, index) => {
              const label = t(`app.theme${option[0].toUpperCase()}${option.slice(1)}`);
              const isSelected = option === preference;
              return (
                <button
                  key={option}
                  ref={(element) => { itemRefs.current[index] = element; }}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={(event) => {
                    onSelect(option, event.currentTarget);
                    close(true);
                  }}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm font-medium transition-colors duration-[160ms] focus:outline-none focus-visible:ring-2 focus-visible:ring-control-boundary motion-reduce:duration-0 sm:min-h-9 ${
                    isSelected ? 'bg-accent-soft text-accent-strong' : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'
                  }`}
                >
                  <span className="flex h-5 w-5 items-center justify-center">
                    {preferenceIcon(option, 'h-4 w-4')}
                  </span>
                  <span className="flex-1">{label}</span>
                  <span className="flex h-4 w-4 items-center justify-center" aria-hidden="true">
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
