import React from 'react';
import { CalendarClock, ChevronDown, Plus, Webhook, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@acornops/ui';
import { MenuItem } from '@acornops/ui';
import { menuSurfaceClassName } from '@acornops/ui';
import type { WorkflowTriggerType } from '@/utils/routes';

interface WorkflowTriggerCreateMenuProps {
  disabled?: boolean;
  onCreate: (triggerType: WorkflowTriggerType) => void;
}

const triggerTypes: WorkflowTriggerType[] = ['schedule', 'acornops_event', 'webhook'];

export function getWorkflowTriggerCreateMenuFocusIndex(
  currentIndex: number,
  key: 'ArrowDown' | 'ArrowUp' | 'Home' | 'End'
): number {
  if (key === 'Home') return 0;
  if (key === 'End') return triggerTypes.length - 1;
  if (key === 'ArrowDown') return (currentIndex + 1) % triggerTypes.length;
  return (currentIndex - 1 + triggerTypes.length) % triggerTypes.length;
}

function triggerIcon(triggerType: WorkflowTriggerType): React.ReactNode {
  if (triggerType === 'schedule') return <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />;
  if (triggerType === 'acornops_event') return <Zap className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />;
  return <Webhook className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />;
}

export const WorkflowTriggerCreateMenu: React.FC<WorkflowTriggerCreateMenuProps> = ({
  disabled = false,
  onCreate
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const itemRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = React.useId();

  const close = React.useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;
    itemRefs.current[0]?.focus({ preventScroll: true });

    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [close, open]);

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
    const nextIndex = getWorkflowTriggerCreateMenuFocusIndex(
      currentIndex < 0 ? 0 : currentIndex,
      event.key as 'ArrowDown' | 'ArrowUp' | 'Home' | 'End'
    );
    itemRefs.current[nextIndex]?.focus({ preventScroll: true });
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Button
        ref={triggerRef}
        size="md"
        variant="primary"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.preventDefault();
            event.stopPropagation();
            close(true);
          }
          if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {t('triggers.actions.create')}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </Button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={t('triggers.actions.createMenuLabel')}
          onKeyDown={handleMenuKeyDown}
          className={menuSurfaceClassName('absolute right-0 top-full z-[70] mt-2 w-72 p-1.5 shadow-xl')}
        >
          {triggerTypes.map((triggerType, index) => (
            <MenuItem
              key={triggerType}
              ref={(element) => { itemRefs.current[index] = element; }}
              tabIndex={index === 0 ? 0 : -1}
              className="items-start"
              onClick={() => {
                close();
                onCreate(triggerType);
              }}
            >
              {triggerIcon(triggerType)}
              <span>
                <span className="block text-sm font-semibold">{t(`triggers.types.${triggerType === 'acornops_event' ? 'acornopsEvent' : triggerType}`)}</span>
                <span className="type-caption mt-0.5 block font-normal text-ui-text-muted">
                  {t(`triggers.createDescriptions.${triggerType === 'acornops_event' ? 'acornopsEvent' : triggerType}`)}
                </span>
              </span>
            </MenuItem>
          ))}
        </div>
      )}
    </div>
  );
};
