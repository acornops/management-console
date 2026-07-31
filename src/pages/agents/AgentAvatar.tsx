import React from 'react';
import { Button, TextInput } from '@acornops/ui';

export const DEFAULT_AGENT_EMOJI = '🤖';

export const AGENT_EMOJI_OPTIONS = [
  '🤖',
  '🔎',
  '🧭',
  '🛠️',
  '📝',
  '☸️',
  '🚀',
  '🛡️',
  '🔧',
  '📊',
  '💡',
  '🧪',
  '🔔',
  '🗂️',
  '⚙️',
  '🧠',
  '📡',
  '🔐',
  '🧰',
  '🧹',
  '🩺',
  '🧾',
  '🔬',
  '🌐'
] as const;

export function normalizeAgentEmoji(value: string): string | null {
  const normalized = value.normalize('NFC').trim();
  if (!normalized || normalized.length > 64) return null;
  const segments = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(normalized)];
  if (segments.length !== 1) return null;
  const isPictograph = /\p{Extended_Pictographic}/u.test(normalized);
  const isFlag = /^\p{Regional_Indicator}{2}$/u.test(normalized);
  const isKeycap = /^[#*0-9]\uFE0F?\u20E3$/u.test(normalized);
  return isPictograph || isFlag || isKeycap ? normalized : null;
}

export function suggestAgentEmoji(name: string): string {
  const normalizedName = name.trim().toLowerCase();
  if (/(kubernetes|cluster|k8s)/.test(normalizedName)) return '☸️';
  if (/(incident|report|postmortem)/.test(normalizedName)) return '📝';
  if (/(diagnostic|inspect|search|investigat)/.test(normalizedName)) return '🔎';
  if (/(remediat|repair|fix|maintenance)/.test(normalizedName)) return '🛠️';
  if (/(workflow|automat|orchestrat)/.test(normalizedName)) return '⚙️';
  if (/(security|guard|policy|compliance)/.test(normalizedName)) return '🛡️';
  if (/(analyst|metric|data|insight)/.test(normalizedName)) return '📊';
  if (/(deploy|release|launch)/.test(normalizedName)) return '🚀';
  return DEFAULT_AGENT_EMOJI;
}

export const AgentAvatar: React.FC<{
  emoji?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ emoji = DEFAULT_AGENT_EMOJI, className = '', size = 'md' }) => {
  const sizeClass = size === 'sm'
    ? 'type-body h-8 w-8'
    : size === 'lg'
      ? 'type-route-title h-11 w-11'
      : 'type-panel-title h-9 w-9';
  return (
    <span
      data-agent-avatar="true"
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-md border border-ui-border bg-ui-bg leading-none ${sizeClass} ${className}`.trim()}
    >
      {emoji}
    </span>
  );
};

export const AgentEmojiPicker: React.FC<{
  value: string;
  onChange: (emoji: string) => void;
  label?: string;
  description?: string;
}> = ({
  value,
  onChange,
  label = 'Agent emoji',
  description = 'Choose a visual identity. Status is always shown separately.'
}) => {
  const selectedIsCurated = AGENT_EMOJI_OPTIONS.includes(value as (typeof AGENT_EMOJI_OPTIONS)[number]);
  const [customValue, setCustomValue] = React.useState(selectedIsCurated ? '' : value);
  const [customError, setCustomError] = React.useState('');

  React.useEffect(() => {
    if (AGENT_EMOJI_OPTIONS.includes(value as (typeof AGENT_EMOJI_OPTIONS)[number])) {
      setCustomValue('');
      setCustomError('');
    } else {
      setCustomValue(value);
    }
  }, [value]);

  return (
    <fieldset>
      <legend className="type-micro-label">{label}</legend>
      <p className="type-caption mt-1 text-ui-text-muted">{description}</p>
      <div
        data-agent-emoji-options="true"
        className="mt-3 grid grid-cols-[repeat(auto-fit,2.75rem)] gap-2"
        aria-label="Suggested Agent emojis"
      >
        {AGENT_EMOJI_OPTIONS.map((emoji) => (
          <Button
            key={emoji}
            type="button"
            aria-label={`Use ${emoji} for this Agent`}
            aria-pressed={value === emoji}
            onClick={() => onChange(emoji)}
            variant="secondary"
            size="icon"
            className={`control-target type-panel-title flex h-11 w-11 items-center justify-center rounded-md border leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-control-boundary sm:h-11 sm:w-11 ${
              value === emoji
                ? 'border-accent/45 bg-accent-soft text-ui-text'
                : 'border-ui-border bg-ui-surface hover:border-accent/30 hover:bg-ui-bg'
            }`}
          >
            {emoji}
          </Button>
        ))}
      </div>
      <div className="mt-4 flex items-end gap-3">
        <div className="shrink-0">
          <span className="type-caption type-emphasis block text-ui-text">Current</span>
          <AgentAvatar emoji={value} size="lg" className="mt-1" />
        </div>
        <label className="block min-w-0 flex-1 sm:max-w-sm">
          <span className="type-caption type-emphasis text-ui-text">Use another emoji</span>
          <TextInput
            value={customValue}
            maxLength={64}
            aria-invalid={Boolean(customError)}
            aria-describedby={customError ? 'agent-custom-emoji-error' : undefined}
            placeholder="Enter or paste one emoji"
            className="mt-1"
            onChange={(event) => {
              const nextValue = event.target.value;
              setCustomValue(nextValue);
              if (!nextValue) {
                setCustomError('');
                return;
              }
              const normalized = normalizeAgentEmoji(nextValue);
              if (!normalized) {
                setCustomError('Enter exactly one emoji.');
                return;
              }
              setCustomError('');
              onChange(normalized);
            }}
          />
        </label>
      </div>
      {customError && <p id="agent-custom-emoji-error" role="alert" className="type-caption mt-1 text-status-danger-text">{customError}</p>}
    </fieldset>
  );
};
