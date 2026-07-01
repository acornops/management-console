import React from 'react';
import rollingAcornSvgSource from '@/assets/assistant/rolling-acorn.svg?raw';

interface ThinkingAcornProps {
  reducedMotion: boolean;
}

const getMutedAcornFillOpacity = (hexColor: string): string => {
  const value = hexColor.replace('#', '');
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

  if (luminance < 80) return '0.82';
  if (luminance < 130) return '0.72';
  if (luminance < 190) return '0.58';
  return '0.42';
};

const animatedAcornSvgMarkup = rollingAcornSvgSource
  .replace(/^\s*<\?xml[^>]*\?>\s*/, '')
  .replace(/\srole="img"/, '')
  .replace(/\saria-labelledby="title desc"/, '')
  .replace(/\s*<title\b[^>]*>[\s\S]*?<\/title>/g, '')
  .replace(/\s*<desc\b[^>]*>[\s\S]*?<\/desc>/g, '')
  .replace(/\sid=(["'])[^"']*\1/g, '')
  .replace(/\sfill="(#(?:[0-9A-Fa-f]{6}))"/g, (_match, fillColor: string) => (
    ` fill="currentColor" fill-opacity="${getMutedAcornFillOpacity(fillColor)}"`
  ))
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
