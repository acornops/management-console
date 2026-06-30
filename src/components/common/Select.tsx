import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { menuOptionClassName, menuSurfaceClassName } from '@/components/common/menuStyles';

export interface SelectOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
}

interface SelectProps<T extends string | number> {
  value: T;
  options: Array<SelectOption<T>>;
  onChange: (value: T) => void;
  id?: string;
  ariaLabel?: string;
  disabled?: boolean;
  placeholder?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

type Boundary = 'first' | 'last';

const menuOffsetPx = 6;

const sizeClasses: Record<NonNullable<SelectProps<string>['size']>, string> = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-11 px-4'
};

const getOptionId = (baseId: string, index: number) => `${baseId}-option-${index}`;

export const getBoundaryEnabledOptionIndex = <T extends string | number>(
  options: Array<SelectOption<T>>,
  boundary: Boundary
) => {
  const indexes = options.map((_, index) => index);
  const orderedIndexes = boundary === 'first' ? indexes : indexes.reverse();
  return orderedIndexes.find((index) => !options[index].disabled) ?? -1;
};

export const getNextEnabledOptionIndex = <T extends string | number>(
  options: Array<SelectOption<T>>,
  currentIndex: number,
  direction: 1 | -1
) => {
  if (options.length === 0 || options.every((option) => option.disabled)) return -1;

  let nextIndex = currentIndex;
  for (let step = 0; step < options.length; step += 1) {
    nextIndex = (nextIndex + direction + options.length) % options.length;
    if (!options[nextIndex].disabled) return nextIndex;
  }
  return -1;
};

export const Select = <T extends string | number>({
  value,
  options,
  onChange,
  id,
  ariaLabel,
  disabled = false,
  placeholder,
  size = 'md',
  className
}: SelectProps<T>) => {
  const reactId = useId();
  const baseId = id || `select-${reactId}`;
  const listboxId = `${baseId}-listbox`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties | null>(null);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const enabledSelectedIndex = selectedOption?.disabled ? -1 : selectedIndex;
  const initialActiveIndex = enabledSelectedIndex >= 0
    ? enabledSelectedIndex
    : getBoundaryEnabledOptionIndex(options, 'first');

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const estimatedMenuHeight = Math.min(256, Math.max(44, options.length * 40));
    const spaceBelow = window.innerHeight - rect.bottom;
    const shouldOpenAbove = spaceBelow < estimatedMenuHeight + menuOffsetPx && rect.top > spaceBelow;
    const top = shouldOpenAbove
      ? Math.max(menuOffsetPx, rect.top - estimatedMenuHeight - menuOffsetPx)
      : rect.bottom + menuOffsetPx;

    setMenuStyle({
      left: rect.left,
      minWidth: rect.width,
      top,
      width: rect.width
    });
  }, [options.length]);

  const openMenu = useCallback((nextActiveIndex = initialActiveIndex) => {
    if (disabled) return;
    setActiveIndex(nextActiveIndex);
    setIsOpen(true);
  }, [disabled, initialActiveIndex]);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  const selectOption = useCallback((index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    closeMenu();
    triggerRef.current?.focus();
  }, [closeMenu, onChange, options]);

  useEffect(() => {
    if (!isOpen) return;

    updateMenuPosition();
    const handleResize = () => updateMenuPosition();
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      closeMenu();
    };

    document.addEventListener('mousedown', handlePointerDown, true);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [closeMenu, isOpen, updateMenuPosition]);

  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    document.getElementById(getOptionId(baseId, activeIndex))?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, baseId, isOpen]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        openMenu(initialActiveIndex);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        openMenu(getBoundaryEnabledOptionIndex(options, 'last'));
      } else if (event.key === 'Home') {
        event.preventDefault();
        openMenu(getBoundaryEnabledOptionIndex(options, 'first'));
      } else if (event.key === 'End') {
        event.preventDefault();
        openMenu(getBoundaryEnabledOptionIndex(options, 'last'));
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openMenu(initialActiveIndex);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((currentIndex) => getNextEnabledOptionIndex(options, currentIndex, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((currentIndex) => getNextEnabledOptionIndex(options, currentIndex, -1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(getBoundaryEnabledOptionIndex(options, 'first'));
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(getBoundaryEnabledOptionIndex(options, 'last'));
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectOption(activeIndex);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
    } else if (event.key === 'Tab') {
      closeMenu();
    }
  };

  const menu = useMemo(() => {
    if (!isOpen || !menuStyle || typeof document === 'undefined') return null;

    return createPortal(
      <div
        ref={menuRef}
        id={listboxId}
        role="listbox"
        aria-label={ariaLabel}
        className={menuSurfaceClassName('type-ui fixed z-[140] max-h-64 py-1')}
        style={menuStyle}
      >
        {options.map((option, index) => {
          const isSelected = option.value === value;
          const isActive = index === activeIndex;
          return (
            <button
              key={String(option.value)}
              id={getOptionId(baseId, index)}
              type="button"
              role="option"
              aria-selected={isSelected}
              aria-disabled={option.disabled}
              disabled={option.disabled}
              onMouseEnter={() => {
                if (!option.disabled) setActiveIndex(index);
              }}
              onClick={() => selectOption(index)}
              className={menuOptionClassName({
                selected: isSelected,
                active: isActive,
                disabled: option.disabled,
                className: 'justify-between rounded-none'
              })}
            >
              <span className="min-w-0 truncate">{option.label}</span>
              {isSelected && <Check className="h-4 w-4 shrink-0 text-accent-strong" aria-hidden="true" />}
            </button>
          );
        })}
      </div>,
      document.body
    );
  }, [activeIndex, ariaLabel, baseId, isOpen, listboxId, menuStyle, options, selectOption, value]);

  return (
    <div className={twMerge(clsx('relative min-w-0', className))}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={isOpen && activeIndex >= 0 ? getOptionId(baseId, activeIndex) : undefined}
        disabled={disabled}
        onClick={() => {
          if (isOpen) {
            closeMenu();
          } else {
            openMenu();
          }
        }}
        onKeyDown={handleKeyDown}
        className={twMerge(clsx(
          'type-ui flex w-full items-center justify-between gap-3 rounded-md border bg-ui-surface text-ui-text shadow-sm outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-60',
          sizeClasses[size],
          isOpen
            ? 'border-accent/35 bg-ui-bg ring-2 ring-accent/10'
            : 'border-ui-border hover:border-accent/25 hover:bg-ui-bg focus-visible:border-accent/35 focus-visible:ring-2 focus-visible:ring-accent/15'
        ))}
      >
        <span className={clsx('min-w-0 truncate text-left', !selectedOption && 'text-ui-text-muted')}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown className={clsx('h-4 w-4 shrink-0 text-ui-text-muted transition-transform', isOpen && 'rotate-180 text-accent-strong')} aria-hidden="true" />
      </button>
      {menu}
    </div>
  );
};
