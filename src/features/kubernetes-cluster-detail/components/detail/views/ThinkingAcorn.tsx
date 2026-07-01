import React from 'react';
import rollingAcornSvgSource from '@/assets/assistant/rolling-acorn.svg?raw';

interface ThinkingAcornProps {
  reducedMotion: boolean;
}

const animatedAcornSvgMarkup = rollingAcornSvgSource
  .replace(/^\s*<\?xml[^>]*\?>\s*/, '')
  .replace(/\srole="img"/, '')
  .replace(/\saria-labelledby="title desc"/, '')
  .replace(/\s*<title\b[^>]*>[\s\S]*?<\/title>/g, '')
  .replace(/\s*<desc\b[^>]*>[\s\S]*?<\/desc>/g, '')
  .replace(/\sid=(["'])[^"']*\1/g, '')
  .replace(/<svg\b(?![^>]*\bfocusable=)([^>]*)>/, '<svg$1 focusable="false">');
const staticAcornSvgMarkup = animatedAcornSvgMarkup.replace(
  /\s*<animate(?:Transform)?\b[^>]*\/>/g,
  ''
);

const ThinkingAcornComponent: React.FC<ThinkingAcornProps> = ({ reducedMotion }) => (
  <span
    className="thinking-acorn"
    aria-hidden="true"
    dangerouslySetInnerHTML={{
      __html: reducedMotion ? staticAcornSvgMarkup : animatedAcornSvgMarkup
    }}
  />
);

export const ThinkingAcorn = React.memo(ThinkingAcornComponent);
