import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

export const ActiveTabIndicator: React.FC<{ className?: string }> = ({ className }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.span
      aria-hidden="true"
      layoutId="active-tab-indicator"
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={twMerge('pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-accent', className)}
    />
  );
};
