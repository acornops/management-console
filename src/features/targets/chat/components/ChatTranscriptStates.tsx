import { motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, BotMessageSquare, MessageSquare } from 'lucide-react';

interface ChatEmptyPromptProps {
  isPanel: boolean;
  title: string;
  body: string;
  suggestions: Array<{ key: string; label: string }>;
  canSendSuggestion: boolean;
  onSendSuggestion: (suggestion: string) => void | Promise<void>;
}

export function ChatEmptyPrompt({
  isPanel,
  title,
  body,
  suggestions,
  canSendSuggestion,
  onSendSuggestion
}: ChatEmptyPromptProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      className={`mx-auto ${isPanel ? 'max-w-3xl pt-2' : 'flex max-w-3xl flex-col justify-center pt-4 lg:min-h-[28rem] lg:pt-0'}`}
    >
      <div className="border-y border-ui-border/70 py-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ui-border bg-ui-bg text-ui-text-muted shadow-sm">
            <BotMessageSquare className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className={`${isPanel ? 'text-lg' : 'text-xl'} font-semibold tracking-tight text-ui-text`}>
              {title}
            </h2>
            <p className={`${isPanel ? 'mt-2 text-sm' : 'mt-2 max-w-2xl text-sm'} leading-6 text-ui-text-muted`}>
              {body}
            </p>
          </div>
        </div>
      </div>
      <div className={`mt-5 grid grid-cols-1 gap-2 ${isPanel ? '' : 'md:grid-cols-2'}`}>
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.key}
            type="button"
            onClick={() => void onSendSuggestion(suggestion.label)}
            disabled={!canSendSuggestion}
            className="control-target group flex min-h-14 items-start gap-3 rounded-lg border border-ui-border bg-ui-surface px-4 py-3 text-left text-sm font-medium text-ui-text transition-colors hover:border-ui-text-muted/40 hover:bg-ui-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-ui-text-muted transition-colors group-hover:text-ui-text" />
            <span className="min-w-0 break-words">{suggestion.label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

export function ChatTranscriptSkeleton({ isPanel, label }: { isPanel: boolean; label: string }) {
  return (
    <div className={`${isPanel ? 'max-w-3xl' : 'max-w-4xl'} mx-auto space-y-5 pb-2`} aria-busy="true" aria-label={label}>
      <div className="flex w-full justify-end">
        <div className="h-16 w-[min(28rem,78%)] animate-pulse rounded-lg bg-ui-text/10 motion-reduce:animate-none" />
      </div>
      <div className="w-full max-w-[72ch] space-y-3">
        <div className="h-4 w-28 animate-pulse rounded bg-ui-text-muted/15 motion-reduce:animate-none" />
        <div className="h-4 w-[72%] animate-pulse rounded bg-ui-text-muted/15 motion-reduce:animate-none" />
        <div className="h-4 w-[46%] animate-pulse rounded bg-ui-text-muted/10 motion-reduce:animate-none" />
      </div>
      <div className="w-full max-w-[72ch] border-t border-ui-border/70 pt-3">
        <div className="h-9 w-[min(34rem,90%)] animate-pulse rounded-md bg-ui-surface motion-reduce:animate-none" />
      </div>
    </div>
  );
}

export function ChatTranscriptLoadError({
  isPanel,
  title,
  body
}: {
  isPanel: boolean;
  title: string;
  body: string;
}) {
  return (
    <div className={`mx-auto ${isPanel ? 'max-w-3xl pt-2' : 'max-w-4xl pt-6 lg:pt-10'}`} role="status">
      <div className="flex max-w-[72ch] items-start gap-3 border-t border-ui-border pt-4 text-sm">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning-text" />
        <div className="min-w-0">
          <p className="font-semibold text-ui-text">{title}</p>
          <p className="mt-1 leading-6 text-ui-text-muted">{body}</p>
        </div>
      </div>
    </div>
  );
}
