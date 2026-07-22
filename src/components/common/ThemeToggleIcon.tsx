import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';

import type { ResolvedTheme } from '@/app/theme';

export interface ThemeToggleIconProps {
  className?: string;
  resolvedTheme: ResolvedTheme;
}

/** Shows the currently resolved appearance. */
export const ThemeToggleIcon: React.FC<ThemeToggleIconProps> = ({
  className = 'h-4 w-4',
  resolvedTheme
}) => {
  const shouldReduceMotion = useReducedMotion();
  const Icon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <span className={`relative inline-flex ${className}`} aria-hidden="true">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={resolvedTheme}
          className="absolute inset-0 inline-flex items-center justify-center"
          initial={shouldReduceMotion ? false : { opacity: 0, rotate: -24, scale: 0.82 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={shouldReduceMotion ? undefined : { opacity: 0, rotate: 24, scale: 0.82 }}
          transition={shouldReduceMotion
            ? { duration: 0 }
            : { duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
        >
          <Icon className="h-full w-full" />
        </motion.span>
      </AnimatePresence>
    </span>
  );
};
