import React from 'react';
import { Button } from '@/components/common/Button';
import { CloseButton, TextInput } from '@/components/common/ComponentVocabulary';
import { RightSidePanel } from '@/components/common/RightSidePanel';
import {
  MAX_FETCH_PATTERN_LENGTH,
  MAX_FETCH_PATTERNS,
  validateFetchPatterns,
  type FetchToolConfig
} from '@/pages/agents/fetchToolConfig';

interface FetchToolDrawerProps {
  initialConfig: FetchToolConfig;
  isOpen: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (config: FetchToolConfig) => Promise<void>;
}

export const FetchToolDrawer: React.FC<FetchToolDrawerProps> = ({
  initialConfig,
  isOpen,
  saving,
  onClose,
  onSave
}) => {
  const [urls, setUrls] = React.useState<string[]>(['']);
  const [errors, setErrors] = React.useState<Record<number, string>>({});
  const [saveError, setSaveError] = React.useState('');
  const firstUrlRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setUrls(initialConfig.allowedUrlPatterns.length ? initialConfig.allowedUrlPatterns : ['']);
    setErrors({});
    setSaveError('');
  }, [initialConfig, isOpen]);

  const close = () => {
    if (!saving) onClose();
  };

  const focusUrl = (index: number) => {
    window.requestAnimationFrame(() => {
      document.getElementById(`fetch-url-${index}`)?.focus();
    });
  };

  const save = async () => {
    const validation = validateFetchPatterns(urls);
    setErrors(validation.errors);
    if (Object.keys(validation.errors).length) return;
    setSaveError('');
    try {
      await onSave({ allowedUrlPatterns: validation.normalizedPatterns });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'The Fetch configuration could not be saved.');
    }
  };

  return (
    <RightSidePanel
      isOpen={isOpen}
      onClose={close}
      closeDisabled={saving}
      initialFocusRef={firstUrlRef}
      titleId="fetch-tool-title"
      descriptionId="fetch-tool-description"
      portalToBody
      containerClassName="z-[130]"
    >
      <div className="flex items-start justify-between gap-4 border-b border-ui-border bg-ui-bg px-5 py-4">
        <div>
          <h2 id="fetch-tool-title" className="type-section-title">Configure Fetch</h2>
          <p id="fetch-tool-description" className="type-caption mt-1 text-ui-text-muted">
            Allow this agent to read text or JSON from specific public HTTPS URLs.
          </p>
        </div>
        <CloseButton onClick={close} disabled={saving} label="Close Fetch configuration" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
        <div className="space-y-5">
          {saveError && (
            <div role="alert" className="rounded-md border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-sm text-status-danger-text">
              {saveError}
            </div>
          )}
          <label className="block">
            <span className="type-micro-label">Method</span>
            <TextInput
              aria-label="HTTP method"
              value="GET"
              disabled
              className="mt-2 bg-ui-bg text-ui-text-muted"
            />
          </label>

          <fieldset>
            <div className="flex items-end justify-between gap-4">
              <div>
                <legend className="type-micro-label">Allowed URLs</legend>
                <p className="type-caption mt-1 text-ui-text-muted">
                  Paste complete URLs. Use * only in a path or query value.
                </p>
              </div>
              <span className="type-caption shrink-0 text-ui-text-muted">{urls.length}/{MAX_FETCH_PATTERNS}</span>
            </div>

            <div className="mt-3 space-y-3">
              {urls.map((url, index) => {
                const errorId = `fetch-url-${index}-error`;
                return (
                  <div key={index}>
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <label htmlFor={`fetch-url-${index}`} className="sr-only">Allowed URL {index + 1}</label>
                        <TextInput
                          ref={index === 0 ? firstUrlRef : undefined}
                          id={`fetch-url-${index}`}
                          type="url"
                          inputMode="url"
                          maxLength={MAX_FETCH_PATTERN_LENGTH}
                          value={url}
                          placeholder={index === 0
                            ? 'https://api.example.com/v1/services/*'
                            : 'https://status.example.com/api/health'}
                          aria-invalid={Boolean(errors[index])}
                          aria-describedby={errors[index] ? errorId : undefined}
                          disabled={saving}
                          onChange={(event) => {
                            const value = event.target.value;
                            setUrls((current) => current.map((item, itemIndex) => (
                              itemIndex === index ? value : item
                            )));
                            setErrors((current) => {
                              const next = { ...current };
                              delete next[index];
                              return next;
                            });
                          }}
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="tertiary"
                        aria-label={`Remove allowed URL ${index + 1}`}
                        disabled={saving || urls.length === 1}
                        onClick={() => {
                          setUrls((current) => current.filter((_, itemIndex) => itemIndex !== index));
                          setErrors({});
                          focusUrl(Math.min(index, urls.length - 2));
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                    {errors[index] && (
                      <p id={errorId} role="alert" className="type-caption mt-1 text-status-danger-text">
                        {errors[index]}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <Button
              className="mt-3"
              size="sm"
              variant="secondary"
              disabled={saving || urls.length >= MAX_FETCH_PATTERNS}
              onClick={() => {
                setUrls((current) => [...current, '']);
                focusUrl(urls.length);
              }}
            >
              Add URL
            </Button>
          </fieldset>

          <div className="rounded-md border border-status-warning/30 bg-status-warning-soft px-4 py-3">
            <p className="text-sm font-semibold text-status-warning-text">External data notice</p>
            <p className="type-caption mt-1 text-status-warning-text">
              URL paths and query values are sent to the configured external service. Do not include secrets.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-ui-border bg-ui-bg px-5 py-4">
        <Button variant="tertiary" disabled={saving} onClick={close}>Cancel</Button>
        <Button variant="primary" disabled={saving} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save Fetch tool'}
        </Button>
      </div>
    </RightSidePanel>
  );
};
