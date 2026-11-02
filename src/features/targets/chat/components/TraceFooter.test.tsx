import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { en } from '@/i18n/locales/en.js';
import { zh } from '@/i18n/locales/zh.js';
import type { ControlPlaneRunEvent } from '@/services/controlPlaneApi';
import type { LiveRunTrace } from '../types';
import { buildTraceFromRunEvents, createBaseRunTrace, createRunEventHandler, preferRicherRunTrace } from '../hooks/chatRunTrace';
import { TraceFooter } from './TraceFooter';

function event(type: string, seq: number, payload: Record<string, unknown> = {}): ControlPlaneRunEvent {
  return { schema_version: 1, run_id: 'run-1', seq, ts: '2026-11-03T00:00:00.000Z', type, payload };
}

function streamTrace(events: ControlPlaneRunEvent[]): LiveRunTrace {
  let trace = createBaseRunTrace('run-1', 'connecting');
  const handle = createRunEventHandler({
    seenSeq: new Set(),
    getTrace: () => trace,
    setTrace: next => { trace = next; },
    setTraceExpanded: () => undefined,
    ensureStreamingMessage: () => undefined,
    appendStreamingText: () => undefined
  });
  events.forEach(handle);
  return trace;
}

async function renderTrace(trace: LiveRunTrace, language = 'en', activeOverride?: boolean) {
  const translation = createInstance();
  await translation.init({
    lng: language,
    fallbackLng: 'en',
    resources: { en: { translation: en }, zh: { translation: zh } },
    interpolation: { escapeValue: false }
  });
  const markup = renderToStaticMarkup(
    <I18nextProvider i18n={translation}>
      <TraceFooter runId={trace.runId} trace={trace} isExpanded setExpanded={() => undefined} activeOverride={activeOverride} />
    </I18nextProvider>
  );
  return markup.replace(/<[^>]*>/g, '');
}

const startedEvents = [
  event('run_started', 1),
  event('run_progress', 2, { stage: 'context_fetch', message: 'RAW CONTEXT EVIDENCE' }),
  event('tool_call_started', 3, { call_id: 'call-1', tool: 'inspect_host', arguments: { host: 'node-1' } })
];

describe('TraceFooter event history', () => {
  it.each(['Failed', 'Needs review'])('translates the fallback workflow status %s', async label => {
    const trace: LiveRunTrace = {
      runId: 'run-1', status: 'failed', toolCalls: [],
      steps: [{ id: 'status', label, status: 'error', timestamp: 1 }]
    };
    const text = await renderTrace(trace, 'zh');
    expect(text).toContain(label === 'Failed' ? '失败' : '需要审核');
    expect(text).not.toContain(label);
    expect(trace.steps[0].label).toBe(label);
  });

  it.each(['streamed', 'replayed'] as const)('does not present %s completed-run history as active work', async source => {
    const events = [
      ...startedEvents,
      event('tool_call_completed', 4, { call_id: 'call-1', tool: 'inspect_host', result: 'RAW TOOL RESULT' }),
      event('run_completed', 5)
    ];
    const trace = source === 'streamed'
      ? streamTrace(events)
      : buildTraceFromRunEvents({ id: 'run-1', status: 'completed' }, events);
    const before = JSON.stringify(trace);
    const text = await renderTrace(trace);

    expect(text).toContain('Function tool · Event');
    expect(text).toContain('Function tool · Done');
    expect(text).toContain('1 of 1 function call complete');
    expect(text).toContain('RAW CONTEXT EVIDENCE');
    expect(text).toContain('RAW TOOL RESULT');
    expect(text).not.toContain('Progress');
    expect(text).not.toContain('Running');
    expect(JSON.stringify(trace)).toBe(before);
  });

  it.each(['completed', 'failed', 'cancelled'] as const)('keeps incomplete evidence neutral when the run is %s', async status => {
    const trace = buildTraceFromRunEvents({ id: 'run-1', status }, [
      ...startedEvents,
      event('assistant_reasoning_summary_delta', 4, { text: 'Partial retained reasoning.', provider: 'example', model: 'model-1' }),
      event('skill_context_load_started', 5, { skill_ref: 'skill-1', name: 'Host checks' }),
      event(`run_${status}`, 6)
    ]);
    const before = JSON.stringify(trace);
    const text = await renderTrace(trace);

    expect(text).toContain('Function tool · Event');
    expect(text).toContain('example / model-1 · Partial');
    expect(text).toContain('0 of 1 function call complete');
    expect(text).toContain('1 skill context outcome not recorded');
    expect(text).not.toContain('Function tool · Done');
    expect(text).not.toContain('Progress');
    expect(text).not.toContain('Running');
    expect(text).not.toContain('Live');
    expect(JSON.stringify(trace)).toBe(before);
    // Final-message reconciliation may still be active after a truthful terminal event.
    const reconcilingText = await renderTrace(trace, 'en', true);
    expect(reconcilingText).toContain('example / model-1 · Partial');
    expect(reconcilingText).not.toContain('Live');
  });

  it('preserves tool errors even when the overall run completes', async () => {
    const trace = streamTrace([
      ...startedEvents,
      event('tool_call_completed', 4, { call_id: 'call-1', tool: 'inspect_host', is_error: true, result: 'RAW FAILURE EVIDENCE' }),
      event('run_completed', 5)
    ]);
    const text = await renderTrace(trace);

    expect(text).toContain('Function tool · Attention');
    expect(text).toContain('RAW FAILURE EVIDENCE');
    expect(text).not.toContain('Function tool · Done');
    expect(trace.toolCalls[0]).toMatchObject({ status: 'completed', isError: true });
  });

  it('does not infer successful work when a sparse terminal replay preserves the live history', async () => {
    const live = streamTrace([
      ...startedEvents,
      event('assistant_reasoning_summary_delta', 4, { text: 'Retained partial reasoning.', provider: 'example' })
    ]);
    const trace = preferRicherRunTrace(live, buildTraceFromRunEvents({ id: 'run-1', status: 'completed' }, []));
    const text = await renderTrace(trace);

    expect(text).toContain('Function tool · Event');
    expect(text).toContain('example · Partial');
    expect(text).toContain('0 of 1 function call complete');
    expect(text).not.toContain('Function tool · Done');
    expect(text).not.toContain('Live');
    expect(trace.toolCalls[0].status).toBe('running');
    expect(trace.reasoningSummaries?.[0].status).toBe('streaming');
  });

  it('keeps active reasoning live while historical starts and approval requests remain events', async () => {
    const trace = streamTrace([
      ...startedEvents,
      event('assistant_reasoning_summary_delta', 4, { text: 'Thinking about the host.', provider: 'example', model: 'model-1' }),
      event('tool_approval_requested', 5, { approval_id: 'approval-1', tool: 'restart_service', arguments: { service: 'api' } })
    ]);
    const text = await renderTrace(trace);

    expect(text.match(/Function tool · Event/g)).toHaveLength(2);
    expect(text).toContain('example / model-1 · Live');
    expect(text).not.toContain('Function tool · Running');
    expect(text).not.toContain('Partial');
  });

  it('uses the same evidence semantics when a trace has no timeline events', async () => {
    const trace: LiveRunTrace = {
      runId: 'run-1', status: 'completed',
      steps: [{ id: 'step-1', label: 'Reviewing context', status: 'info', timestamp: 1 }],
      toolCalls: [{ callId: 'call-1', tool: 'inspect_host', status: 'running' }],
      reasoningSummaries: [
        { id: 'summary-1', text: 'Completed summary', status: 'completed', timestamp: 2 },
        { id: 'summary-2', text: 'Unavailable summary', status: 'unavailable', timestamp: 3 },
        { id: 'summary-3', text: 'Partial summary', status: 'streaming', timestamp: 4 }
      ]
    };
    const text = await renderTrace(trace);

    expect(text).toContain('Function tool · Event');
    expect(text).toContain('Completed');
    expect(text).toContain('Unavailable');
    expect(text).toContain('Partial');
    expect(text).not.toContain('Function tool · Done');
    expect(text).not.toContain('Live');
    expect(text).not.toContain('Running');
  });

  it.each([1, 2])('renders localized count grammar for %i retained items', async count => {
    const trace: LiveRunTrace = {
      runId: 'run-1', status: 'completed',
      steps: Array.from({ length: count }, (_, index) => ({ id: `step-${index}`, label: 'Evidence', status: 'info', timestamp: index })),
      toolCalls: Array.from({ length: count }, (_, index) => ({ callId: `call-${index}`, tool: 'inspect_host', status: 'completed' })),
      reasoningSummaries: Array.from({ length: count }, (_, index) => ({ id: `summary-${index}`, text: 'Summary evidence', status: 'completed', timestamp: index })),
      skillLoads: Array.from({ length: count }, (_, index) => ({ skillRef: `skill-${index}`, name: 'Host checks', status: 'loaded' }))
    };
    const text = await renderTrace(trace);

    expect(text).toContain(count === 1 ? '1 step · 1 summary · 1 skill context loaded · 1 of 1 function call complete' : '2 steps · 2 summaries · 2 skill contexts loaded · 2 of 2 function calls complete');
  });

  it('translates footer controls and status metadata while preserving evidence in Chinese', async () => {
    const trace = streamTrace([
      ...startedEvents,
      event('tool_call_completed', 4, { call_id: 'call-1', tool: 'inspect_host', result: 'RAW TOOL RESULT' }),
      event('assistant_message_completed', 5, { usage: { input_tokens: 8, output_tokens: 3, tool_calls: 1 } }),
      event('run_completed', 6)
    ]);
    const text = await renderTrace(trace, 'zh');

    expect(text).toContain('运行详情');
    expect(text).toContain('inspect_host');
    expect(text).toContain('RAW CONTEXT EVIDENCE');
    expect(text).toContain('RAW TOOL RESULT');
    expect(text).not.toContain('Hide run details');
    expect(text).not.toContain('Function tool');
    expect(text).not.toContain('Tokens: input');
    expect(text).not.toContain('function call');
    expect(text).not.toContain('Assistant started');
    expect(text).not.toContain('Reviewing context');
    expect(text).not.toContain('Tool call started:');
    expect(text).not.toContain('Tool call completed:');
    expect(text).not.toContain('The assistant worker accepted the request.');
    expect(text).not.toContain('The run finished successfully.');
  });

  it('preserves unknown titles and matching literal evidence when translating known event titles', async () => {
    const trace: LiveRunTrace = {
      runId: 'run-1', status: 'completed', steps: [], toolCalls: [],
      timelineEvents: [
        { id: 'custom', type: 'step', label: 'CUSTOM EVENT', detail: 'The run finished successfully.', status: 'info', timestamp: 1 },
        { id: 'result', type: 'tool', label: 'Tool call completed: inspect_host', detail: 'The assistant worker accepted the request.', status: 'success', timestamp: 2 },
        { id: 'reasoning', type: 'reasoning', label: 'Reasoning summary', detail: 'Thinking started', status: 'completed', timestamp: 3 }
      ]
    };
    const text = await renderTrace(trace, 'zh');

    expect(text).toContain('CUSTOM EVENT');
    expect(text).toContain('The run finished successfully.');
    expect(text).toContain('The assistant worker accepted the request.');
    expect(text).toContain('Thinking started');
    expect(text).not.toContain('Tool call completed:');
    expect(text).not.toContain('Reasoning summary');
  });
});
