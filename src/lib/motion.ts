import type { Variants } from 'framer-motion';

export const fadeTransition = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.16, ease: [0.16, 1, 0.3, 1] }
} as const;

export const headerMotion = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
} as const;

export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.035
    }
  }
};

export const tableVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.025
    }
  }
};

export const itemVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.16, ease: [0.16, 1, 0.3, 1] } }
};

export const rowVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.16, ease: [0.16, 1, 0.3, 1] } }
};

export const modalOverlayMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
} as const;

export const modalPanelMotion = {
  initial: { opacity: 0, scale: 0.98, y: 6 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: 6 },
  transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
} as const;

export const sidePanelMotion = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
} as const;
