import type { TFunction } from 'i18next';
import type { RunTraceTimelineEvent } from '../types';

const stepLabelKeys = new Map([
  ['Run details restored', 'runTrace.eventLabels.restored'],
  ['Assistant started', 'runTrace.eventLabels.assistantStarted'],
  ['Thinking started', 'runTrace.eventLabels.thinkingStarted'],
  ['Response ready', 'runTrace.eventLabels.responseReady'],
  ['Preparing response', 'runTrace.eventLabels.preparingResponse'],
  ['Reviewing context', 'runTrace.eventLabels.reviewingContext'],
  ['Context ready', 'runTrace.eventLabels.contextReady'],
  ['Thinking', 'runTrace.eventLabels.thinking'],
  ['Writing response', 'runTrace.eventLabels.writingResponse'],
  ['Insights searched', 'runTrace.eventLabels.insightsSearched'],
  ['Completed', 'runTrace.eventLabels.completed'],
  ['Cancelled', 'runTrace.eventLabels.cancelled'],
  ['Could not complete', 'runTrace.eventLabels.failed'],
  ['Failed', 'workflowActivity.status.failed'],
  ['Needs review', 'workflowActivity.status.needs_review'],
  ['Submitting request', 'runTrace.eventLabels.submittingRequest'],
  ['Conversation ready', 'runTrace.eventLabels.conversationReady'],
  ['Request queued', 'runTrace.eventLabels.requestQueued'],
  ['Waiting for approval', 'runTrace.eventLabels.waitingForApproval'],
  ['Workflow running', 'runTrace.eventLabels.workflowRunning']
]);

const toolLabelPrefixes = [
  ['Tool call started: ', 'runTrace.eventLabels.toolStarted'],
  ['Tool call completed: ', 'runTrace.eventLabels.toolCompleted'],
  ['Approval requested: ', 'runTrace.eventLabels.approvalRequested'],
  ['Approval granted: ', 'runTrace.eventLabels.approvalGranted'],
  ['Approval rejected: ', 'runTrace.eventLabels.approvalRejected'],
  ['Approval expired: ', 'runTrace.eventLabels.approvalExpired']
];

const skillLabelPrefixes = [
  ['Loading skill context: ', 'runTrace.eventLabels.skillLoading'],
  ['Skill context loaded: ', 'runTrace.eventLabels.skillLoaded'],
  ['Skill context unavailable: ', 'runTrace.eventLabels.skillUnavailable']
];

const fixedStepDetails = [
  ['Run details restored', 'Restored saved progress for this response.', 'runTrace.eventDetails.restoredSaved'],
  ['Run details restored', 'Reconnected to an in-progress assistant response.', 'runTrace.eventDetails.restoredActive'],
  ['Assistant started', 'The assistant worker accepted the request.', 'runTrace.eventDetails.assistantStarted'],
  ['Thinking started', 'Reviewing the request and available context.', 'runTrace.eventDetails.thinkingStarted'],
  ['Response ready', 'The assistant finished writing its response.', 'runTrace.eventDetails.responseReady'],
  ['Completed', 'The run finished successfully.', 'runTrace.eventDetails.completed'],
  ['Cancelled', 'You cancelled this response.', 'runTrace.eventDetails.cancelled'],
  ['Submitting request', 'Sending your message.', 'runTrace.eventDetails.submittingRequest'],
  ['Conversation ready', 'Waiting for the assistant to accept the request.', 'runTrace.eventDetails.conversationReady'],
  ['Request queued', 'Waiting for an assistant worker.', 'runTrace.eventDetails.requestQueued']
];

/** Translates console-generated copy without rewriting stored events or evidence. */
export function localizeTraceTimelineEvent(event: RunTraceTimelineEvent, t: TFunction): RunTraceTimelineEvent {
  let label = event.label;
  let detail = event.detail;
  if (event.type === 'step') {
    const key = stepLabelKeys.get(label);
    if (key) label = t(key);
    else if (label.startsWith('Progress: ')) label = t('runTrace.eventLabels.progress', { name: label.slice('Progress: '.length) });
    const fixedDetail = fixedStepDetails.find(([sourceLabel, sourceDetail]) => event.label === sourceLabel && detail === sourceDetail);
    if (fixedDetail) detail = t(fixedDetail[2]);
  } else if (event.type === 'reasoning') {
    if (label === 'Reasoning summary') label = t('runTrace.reasoningSummary');
    else if (label === 'Reasoning summary unavailable') label = t('runTrace.reasoningSummaryUnavailable');
  } else {
    const prefixes = event.type === 'tool' ? toolLabelPrefixes : skillLabelPrefixes;
    const prefix = prefixes.find(([source]) => label.startsWith(source));
    if (prefix) label = t(prefix[1], { name: label.slice(prefix[0].length) });
  }
  return { ...event, label, detail };
}
