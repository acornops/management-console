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
