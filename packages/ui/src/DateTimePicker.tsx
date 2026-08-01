import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { buttonClassName } from './Button';
import { formInputClassName } from './formControlStyles';
import { menuSurfaceClassName } from './menuStyles';

export interface DateTimePickerLabels {
  calendar?: string;
  clear?: string;
  done?: string;
  hour?: string;
  minute?: string;
  nextMonth?: string;
  now?: string;
  previousMonth?: string;
}

export interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  locale?: string;
  placeholder?: string;
  labels?: DateTimePickerLabels;
}

const defaultLabels: Required<DateTimePickerLabels> = {
  calendar: 'Calendar',
  clear: 'Clear',
  done: 'Done',
  hour: 'Hour',
  minute: 'Minute',
  nextMonth: 'Next month',
  now: 'Now',
  previousMonth: 'Previous month'
};

const pad = (value: number) => String(value).padStart(2, '0');

export function parseLocalDateTime(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match.map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) return null;

  return date;
}

export function toLocalDateTimeValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface LocaleWeekInfo {
  firstDay: number;
}

type LocaleWithWeekInfo = Intl.Locale & {
  getWeekInfo?: () => LocaleWeekInfo;
  weekInfo?: LocaleWeekInfo;
};

export function getFirstDayOfWeek(locale?: string): number {
  try {
    const resolvedLocale = locale || new Intl.DateTimeFormat().resolvedOptions().locale;
    const localeWithWeekInfo = new Intl.Locale(resolvedLocale) as LocaleWithWeekInfo;
    const firstDay = localeWithWeekInfo.getWeekInfo?.().firstDay ?? localeWithWeekInfo.weekInfo?.firstDay;
    return typeof firstDay === 'number' && firstDay >= 1 && firstDay <= 7 ? firstDay % 7 : 0;
  } catch {
    return 0;
  }
}

export function getCalendarDates(month: Date, firstDayOfWeek = 0): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  const leadingDays = (first.getDay() - firstDayOfWeek + 7) % 7;
  start.setDate(first.getDate() - leadingDays);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const sameDate = (first: Date, second: Date) => dateKey(first) === dateKey(second);
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

function shiftMonth(date: Date, amount: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  next.setDate(Math.min(date.getDate(), new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
  return next;
}

const popupMargin = 8;
const popupWidth = 320;
const estimatedPopupHeight = 410;

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  id,
  ariaLabel,
  className,
  disabled = false,
  locale,
  placeholder = 'Select date and time',
  labels: suppliedLabels
}) => {
  const reactId = useId();
  const baseId = id || `date-time-picker-${reactId}`;
  const dialogId = `${baseId}-dialog`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const selectedDate = useMemo(() => parseLocalDateTime(value), [value]);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(selectedDate || new Date()));
  const [activeDate, setActiveDate] = useState(() => selectedDate || new Date());
  const [hour, setHour] = useState(() => pad(selectedDate?.getHours() ?? 0));
  const [minute, setMinute] = useState(() => pad(selectedDate?.getMinutes() ?? 0));
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties | null>(null);
  const labels = { ...defaultLabels, ...suppliedLabels };

  const firstDayOfWeek = useMemo(() => getFirstDayOfWeek(locale), [locale]);
  const calendarDates = useMemo(() => getCalendarDates(visibleMonth, firstDayOfWeek), [firstDayOfWeek, visibleMonth]);
  const weekdays = useMemo(() => {
    const sunday = new Date(2024, 0, 7);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + firstDayOfWeek + index);
      return new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(date);
    });
  }, [firstDayOfWeek, locale]);

  const triggerValue = selectedDate
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(selectedDate)
    : placeholder;

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(popupWidth, window.innerWidth - popupMargin * 2);
    const left = Math.min(
      Math.max(popupMargin, rect.left),
      Math.max(popupMargin, window.innerWidth - width - popupMargin)
    );
    const maxHeight = window.innerHeight - popupMargin * 2;
    const renderedHeight = popupRef.current?.scrollHeight || estimatedPopupHeight;
    const popupHeight = Math.min(renderedHeight, maxHeight);
    const spaceBelow = window.innerHeight - rect.bottom - popupMargin;
    const spaceAbove = rect.top - popupMargin;
    const openAbove = spaceBelow < popupHeight && spaceAbove > spaceBelow;
    const preferredTop = openAbove
      ? rect.top - popupHeight - popupMargin
      : rect.bottom + popupMargin;
    const top = Math.min(
      Math.max(popupMargin, preferredTop),
      Math.max(popupMargin, window.innerHeight - popupHeight - popupMargin)
    );

    setPopupStyle({
      left,
      maxHeight,
      top,
      width
    });
  }, []);

  const focusActiveDate = useCallback((date: Date) => {
    window.requestAnimationFrame(() => {
      popupRef.current?.querySelector<HTMLButtonElement>(`[data-calendar-date="${dateKey(date)}"]`)?.focus();
    });
  }, []);

  const openPicker = useCallback(() => {
    if (disabled) return;
    const nextActiveDate = selectedDate || new Date();
    setActiveDate(nextActiveDate);
    setVisibleMonth(startOfMonth(nextActiveDate));
    setHour(pad(selectedDate?.getHours() ?? 0));
    setMinute(pad(selectedDate?.getMinutes() ?? 0));
    updatePosition();
    setIsOpen(true);
    focusActiveDate(nextActiveDate);
  }, [disabled, focusActiveDate, selectedDate, updatePosition]);

  const closePicker = useCallback((restoreFocus = false) => {
    setIsOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || popupRef.current?.contains(target)) return;
      closePicker();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closePicker(true);
    };
    const handleViewportChange = () => updatePosition();

    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [closePicker, isOpen, updatePosition]);

  useLayoutEffect(() => {
    if (isOpen && popupStyle) updatePosition();
  }, [isOpen, updatePosition]);

  const chooseDate = (date: Date) => {
    const next = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      selectedDate?.getHours() ?? 0,
      selectedDate?.getMinutes() ?? 0
    );
    setActiveDate(next);
    setVisibleMonth(startOfMonth(next));
    setHour(pad(next.getHours()));
    setMinute(pad(next.getMinutes()));
    onChange(toLocalDateTimeValue(next));
  };

  const moveActiveDate = (amount: number) => {
    const next = new Date(activeDate);
    next.setDate(next.getDate() + amount);
    setActiveDate(next);
    setVisibleMonth(startOfMonth(next));
    focusActiveDate(next);
  };

  const commitTime = (nextHour: string, nextMinute: string) => {
    const parsedHour = Number(nextHour);
    const parsedMinute = Number(nextMinute);
    const normalizedHour = Number.isInteger(parsedHour) && parsedHour >= 0 && parsedHour <= 23 ? parsedHour : selectedDate?.getHours() ?? 0;
    const normalizedMinute = Number.isInteger(parsedMinute) && parsedMinute >= 0 && parsedMinute <= 59 ? parsedMinute : selectedDate?.getMinutes() ?? 0;
    setHour(pad(normalizedHour));
    setMinute(pad(normalizedMinute));

    const base = selectedDate || activeDate || new Date();
    const next = new Date(base.getFullYear(), base.getMonth(), base.getDate(), normalizedHour, normalizedMinute);
    onChange(toLocalDateTimeValue(next));
  };

  const popup = isOpen && popupStyle && typeof document !== 'undefined'
    ? createPortal(
      <div
        ref={popupRef}
        id={dialogId}
        role="dialog"
        aria-label={ariaLabel}
        className={menuSurfaceClassName('fixed z-[140] overflow-y-auto p-3')}
        style={popupStyle}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="type-ui min-w-0 truncate px-1">
            {new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(visibleMonth)}
          </p>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              aria-label={labels.previousMonth}
              className={buttonClassName({ variant: 'tertiary', size: 'icon' })}
              onClick={() => {
                const next = shiftMonth(activeDate, -1);
                setActiveDate(next);
                setVisibleMonth(startOfMonth(next));
                focusActiveDate(next);
              }}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={labels.nextMonth}
              className={buttonClassName({ variant: 'tertiary', size: 'icon' })}
              onClick={() => {
                const next = shiftMonth(activeDate, 1);
                setActiveDate(next);
                setVisibleMonth(startOfMonth(next));
                focusActiveDate(next);
              }}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div role="group" aria-label={labels.calendar} className="mt-2 grid grid-cols-7 gap-0.5">
          {weekdays.map((weekday, index) => (
            <span key={`${weekday}-${index}`} aria-hidden="true" className="type-caption flex h-8 items-center justify-center text-ui-text-muted">
              {weekday}
            </span>
          ))}
          {calendarDates.map((date) => {
            const isSelected = Boolean(selectedDate && sameDate(date, selectedDate));
            const isActive = sameDate(date, activeDate);
            const isOutsideMonth = date.getMonth() !== visibleMonth.getMonth();
            const isToday = sameDate(date, new Date());
            return (
              <span key={dateKey(date)}>
                <button
                  type="button"
                  data-calendar-date={dateKey(date)}
                  aria-label={new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(date)}
                  aria-current={isToday ? 'date' : undefined}
                  aria-pressed={isSelected}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => chooseDate(date)}
                  onFocus={() => setActiveDate(date)}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowLeft') { event.preventDefault(); moveActiveDate(-1); }
                    else if (event.key === 'ArrowRight') { event.preventDefault(); moveActiveDate(1); }
                    else if (event.key === 'ArrowUp') { event.preventDefault(); moveActiveDate(-7); }
                    else if (event.key === 'ArrowDown') { event.preventDefault(); moveActiveDate(7); }
                    else if (event.key === 'Home') {
                      event.preventDefault();
                      moveActiveDate(-((activeDate.getDay() - firstDayOfWeek + 7) % 7));
                    } else if (event.key === 'End') {
                      event.preventDefault();
                      moveActiveDate(6 - ((activeDate.getDay() - firstDayOfWeek + 7) % 7));
                    }
                    else if (event.key === 'PageUp') {
                      event.preventDefault();
                      const next = shiftMonth(activeDate, -1);
                      setActiveDate(next);
                      setVisibleMonth(startOfMonth(next));
                      focusActiveDate(next);
                    } else if (event.key === 'PageDown') {
                      event.preventDefault();
                      const next = shiftMonth(activeDate, 1);
                      setActiveDate(next);
                      setVisibleMonth(startOfMonth(next));
                      focusActiveDate(next);
                    }
                  }}
                  className={clsx(
                    'control-target type-ui flex h-9 w-full items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/30',
                    isSelected && 'bg-control-primary text-control-primary-fg shadow-sm',
                    !isSelected && isToday && 'bg-accent-soft text-accent-readable',
                    !isSelected && !isToday && 'hover:bg-ui-bg',
                    isOutsideMonth && !isSelected && 'text-ui-text-muted/55'
                  )}
                >
                  {date.getDate()}
                </button>
              </span>
            );
          })}
        </div>

        <div className="mt-3 flex items-end gap-2 border-t border-ui-border pt-3">
          <Clock className="mb-3 h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
          <label className="min-w-0 flex-1">
            <span className="type-micro-label block pb-1">{labels.hour}</span>
            <input
              value={hour}
              inputMode="numeric"
              aria-label={labels.hour}
              autoComplete="off"
              onChange={(event) => setHour(event.target.value.replace(/\D/g, '').slice(0, 2))}
              onFocus={(event) => event.currentTarget.select()}
              onBlur={() => commitTime(hour, minute)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitTime(hour, minute);
              }}
              className={formInputClassName('px-3 text-center type-ui sm:min-h-9')}
            />
          </label>
          <span className="mb-2.5 type-ui text-ui-text-muted" aria-hidden="true">:</span>
          <label className="min-w-0 flex-1">
            <span className="type-micro-label block pb-1">{labels.minute}</span>
            <input
              value={minute}
              inputMode="numeric"
              aria-label={labels.minute}
              autoComplete="off"
              onChange={(event) => setMinute(event.target.value.replace(/\D/g, '').slice(0, 2))}
              onFocus={(event) => event.currentTarget.select()}
              onBlur={() => commitTime(hour, minute)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitTime(hour, minute);
              }}
              className={formInputClassName('px-3 text-center type-ui sm:min-h-9')}
            />
          </label>
          <span className="mb-2.5 shrink-0 type-caption text-ui-text-muted">24h</span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-ui-border pt-3">
          <button
            type="button"
            className={buttonClassName({ variant: 'tertiary', size: 'sm' })}
            onClick={() => {
              onChange('');
              closePicker(true);
            }}
          >
            {labels.clear}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              className={buttonClassName({ variant: 'secondary', size: 'sm' })}
              onClick={() => {
                const now = new Date();
                setActiveDate(now);
                setVisibleMonth(startOfMonth(now));
                setHour(pad(now.getHours()));
                setMinute(pad(now.getMinutes()));
                onChange(toLocalDateTimeValue(now));
              }}
            >
              {labels.now}
            </button>
            <button type="button" className={buttonClassName({ variant: 'primary', size: 'sm' })} onClick={() => closePicker(true)}>
              {labels.done}
            </button>
          </div>
        </div>
      </div>,
      document.body
    )
    : null;

  return (
    <div className={twMerge(clsx('relative min-w-0', className))}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? dialogId : undefined}
        disabled={disabled}
        onClick={() => (isOpen ? closePicker() : openPicker())}
        onKeyDown={(event) => {
          if (!isOpen && (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            openPicker();
          }
        }}
        className={formInputClassName(clsx(
          'control-target flex items-center justify-between gap-3 text-left type-ui',
          isOpen && 'border-accent/45 ring-2 ring-accent/15'
        ))}
      >
        <span className={clsx('min-w-0 truncate', !selectedDate && 'text-ui-text-muted/70')}>{triggerValue}</span>
        <CalendarDays className={clsx('h-4 w-4 shrink-0', isOpen ? 'text-accent-strong' : 'text-ui-text-muted')} aria-hidden="true" />
      </button>
      {popup}
    </div>
  );
};
