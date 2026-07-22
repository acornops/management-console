import React from 'react';

interface ThinkingAcornProps {
  reducedMotion: boolean;
}

const ThinkingAcornComponent: React.FC<ThinkingAcornProps> = ({ reducedMotion }) => (
  <span
    className="thinking-acorn"
    data-reduced-motion={reducedMotion ? 'true' : undefined}
    aria-hidden="true"
  >
    <span className="thinking-acorn__spinner">
      <svg viewBox="3.75 1.5 12.5 14.5" focusable="false">
        <path
          className="thinking-acorn__stem"
          d="M10.15 4.45c1.05-.42 1.62-1.17 1.72-2.25"
        />
        <path
          className="thinking-acorn__body"
          d="M4.65 7.85c.08 4.85 2.2 7.55 5.35 7.55s5.27-2.7 5.35-7.55c-1.34.55-3.12.82-5.35.82s-4.01-.27-5.35-.82Z"
        />
        <path
          className="thinking-acorn__cap"
          d="M4.15 7.3C4.9 4.95 7.05 3.62 10 3.62s5.1 1.33 5.85 3.68c-1.02.9-2.97 1.38-5.85 1.38S5.17 8.2 4.15 7.3Z"
        />
      </svg>
    </span>
  </span>
);

export const ThinkingAcorn = React.memo(ThinkingAcornComponent);
