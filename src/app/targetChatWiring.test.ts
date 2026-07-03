import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');

describe('target chat controller wiring', () => {
  const clusterDetail = readFileSync(resolve(root, 'src/features/kubernetes-cluster-detail/KubernetesClusterDetail.tsx'), 'utf8');
  const clusterChatPanel = readFileSync(resolve(root, 'src/features/kubernetes-cluster-detail/components/detail/ClusterChatPanel.tsx'), 'utf8');
  const appClusterChatRuntime = readFileSync(resolve(root, 'src/app/AppClusterChatRuntime.tsx'), 'utf8');
  const chatView = readFileSync(resolve(root, 'src/features/targets/chat/components/TargetChatView.tsx'), 'utf8');
  const chatComposer = readFileSync(resolve(root, 'src/features/targets/chat/components/TargetChatComposer.tsx'), 'utf8');
  const targetChatViewHelpers = readFileSync(resolve(root, 'src/features/targets/chat/components/targetChatViewHelpers.ts'), 'utf8');
  const clusterChatFooter = readFileSync(resolve(root, 'src/features/kubernetes-cluster-detail/components/detail/clusterChatFooter.ts'), 'utf8');
  const assistantCapabilityPreviewControl = readFileSync(resolve(root, 'src/features/targets/chat/components/AssistantCapabilityPreviewControl.tsx'), 'utf8');
  const useTargetChat = readFileSync(resolve(root, 'src/features/targets/chat/hooks/useTargetChat.ts'), 'utf8');
  const targetChatState = readFileSync(resolve(root, 'src/features/targets/chat/hooks/targetChatState.ts'), 'utf8');
  const chatSubmit = readFileSync(resolve(root, 'src/features/targets/chat/hooks/chatSubmit.ts'), 'utf8');
  const chatSubmitFailures = readFileSync(resolve(root, 'src/features/targets/chat/hooks/chatSubmitFailures.ts'), 'utf8');
  const chatSessionSync = readFileSync(resolve(root, 'src/features/targets/chat/hooks/chatSessionSync.ts'), 'utf8');
  const targetChatRunWatcher = readFileSync(resolve(root, 'src/features/targets/chat/hooks/targetChatRunWatcher.ts'), 'utf8');
  const targetChatActivityStream = readFileSync(resolve(root, 'src/features/targets/chat/hooks/targetChatActivityStream.ts'), 'utf8');
  const useActivityDiscoveredRun = readFileSync(resolve(root, 'src/features/targets/chat/hooks/useActivityDiscoveredRun.ts'), 'utf8');
  const useTargetChatScrollAnchor = readFileSync(resolve(root, 'src/features/targets/chat/hooks/useTargetChatScrollAnchor.ts'), 'utf8');

  it('keeps the chat runtime hoisted above sidebar and fullscreen presentations', () => {
    expect(clusterDetail).not.toContain('useTargetChat({');
    expect(clusterChatPanel).not.toContain('useTargetChat({');
    expect(appClusterChatRuntime).toContain('useTargetChat({');
  });

  it('uses restored active run state to disable input and expose cancellation', () => {
    expect(chatView).toContain('const canCancelActiveRun = isRunActive && canCancelRuns && Boolean(activeRunId);');
    expect(chatComposer).toContain("type={isRunActive ? 'button' : 'submit'}");
    expect(chatComposer).toContain('if (canCancelActiveRun && !isCancellingRun) void onCancelRun();');
    expect(chatComposer).toContain('disabled={!canPost || isRunActive}');
    expect(chatView).toContain('const hasComposerSubmitPayload = Boolean(inputValue.trim() || hasComposerAttachmentContext);');
    expect(chatComposer).toContain('disabled={isRunActive ? !canCancelActiveRun || isCancellingRun : !canPost || !hasComposerSubmitPayload || isComposerRuntimeUnavailable}');
  });

  it('requests backend-backed capability preview with the same access mode as submissions', () => {
    expect(chatView).toContain("const requestedToolAccessMode = canRequestWriteRuns ? 'read_write' : 'read_only';");
    expect(chatView).toContain('controlPlaneApi.getTargetAssistantCapabilitiesPreview(target.workspaceId, target.id, requestedToolAccessMode)');
    expect(chatView).toContain('setAssistantCapabilitiesPreview(null);');
    expect(chatView).toContain("t('chat.capabilityPreviewUnavailable')");
    expect(chatComposer).toContain('<AssistantCapabilityPreviewControl');
    expect(assistantCapabilityPreviewControl).toContain('preview?.toolSummary.totalAllowed');
    expect(assistantCapabilityPreviewControl).toContain('preview && !error && !isLoading');
    expect(assistantCapabilityPreviewControl).toContain('const showToolPolicyNote = toolItems.length > 0 || Boolean(writeUnavailableLabel);');
    expect(assistantCapabilityPreviewControl).toContain("TOOL_CAPABILITY_ORDER[first.capability] - TOOL_CAPABILITY_ORDER[second.capability]");
    expect(assistantCapabilityPreviewControl).toContain('border-status-warning/25 bg-status-warning-soft text-status-warning-text');
    expect(assistantCapabilityPreviewControl).toContain('{showToolPolicyNote && (');
    expect(assistantCapabilityPreviewControl).toContain('setIsOpen(false);');
    expect(clusterDetail).toContain('canRequestWriteRuns={canRequestWriteRuns}');
    expect(clusterChatPanel).toContain('canRequestWriteRuns={canRequestWriteRuns}');
    expect(chatSubmit).toContain("canRequestWriteRuns ? 'read_write' : 'read_only'");
  });

  it('defaults shared chat sessions to target session APIs', () => {
    expect(chatSubmit).toContain('createSession = controlPlaneApi.createTargetSession');
    expect(chatSessionSync).toContain('listSessions = controlPlaneApi.listTargetSessions');
    expect(targetChatActivityStream).toContain('controlPlaneApi.listTargetSessions(target.workspaceId, target.id');
    expect(targetChatActivityStream).toContain('controlPlaneApi.streamTargetChatActivity(target.workspaceId, target.id');
    expect(useTargetChat).toContain('controlPlaneApi.getTargetChatActivity)(target.workspaceId, target.id)');
    expect(useTargetChat).not.toContain('controlPlaneApi.createSession');
    expect(chatSessionSync).not.toContain('controlPlaneApi.listSessions');
  });

  it('matches the model submenu chevron direction to its desktop placement', () => {
    expect(chatComposer).toContain('ChevronRight');
    expect(chatComposer).toContain('sm:left-[calc(100%+0.5rem)]');
    expect(chatComposer).toContain('sm:right-auto');
    expect(chatComposer).not.toContain('ChevronLeft');
  });

  it('uses cluster write confirmation policy for composer footer copy', () => {
    expect(clusterDetail).toContain('resolveClusterChatFooterKey(cluster, canRequestWriteRuns)');
    expect(clusterChatPanel).toContain('resolveClusterChatFooterKey(cluster, canRequestWriteRuns)');
    expect(clusterChatFooter).toContain('cluster.writeConfirmationPolicy?.effectiveRequired ?? true');
    expect(clusterChatFooter).toContain("'chat.footerApprovalRequired'");
    expect(clusterChatFooter).toContain("'chat.footerApprovalNotRequired'");
    expect(targetChatViewHelpers).not.toContain('writeConfirmationPolicy');
    expect(targetChatViewHelpers).not.toContain('KubernetesCluster');
  });

  it('serializes chat submissions before React run-active state catches up', () => {
    expect(useTargetChat).toContain('const submitInFlightRef = useRef(false);');
    expect(useTargetChat).toContain('const submitChatMessageForArgs = (args: {');
    expect(useTargetChat).toContain('const releaseSubmitLockSoon = () => {');
    expect(useTargetChat).toContain('setTimeout(() => {');
    expect(useTargetChat).toContain('if (submitInFlightRef.current) return;');
    expect(useTargetChat).toContain('submitInFlightRef.current = true;');
    expect(useTargetChat).toContain('releaseSubmitLockSoon();');
    expect(useTargetChat).toContain('if (shouldReleaseSubmitLock) submitInFlightRef.current = false;');
    expect(useTargetChat).toContain('if (!prompt || isRunActive || !canPostInActiveSession || submitInFlightRef.current) return;');
    expect(useTargetChat).toContain('const handleSendInNewSession = async (overrideInput: string, runtimeSelection?: ChatRuntimeSelection) => {');
    expect(useTargetChat).toContain('let shouldReleaseSubmitLock = true;');
    expect(useTargetChat).toContain('const submitPromise = submitChatMessageForArgs({');
  });

  it('optimistically resolves cancelled runs so the composer and placeholder recover', () => {
    expect(useTargetChat).toContain('await controlPlaneApi.cancelRun(runId);');
    expect(useTargetChat).toContain('setActiveRunId(null);');
    expect(useTargetChat).toContain('setIsLoading(false);');
    expect(useTargetChat).toContain("status: 'cancelled'");
    expect(useTargetChat).toContain("t('chat.runCancelledMessage')");
    expect(useTargetChat).toContain('cancelledRunIdsRef.current.add(runId);');
    expect(useTargetChat).toContain("const isPendingAcceptedRun = runId.startsWith('pending-trace-');");
    expect(useTargetChat).toContain('if (!isPendingAcceptedRun)');
    expect(useTargetChat).toContain('markRunCancelled,');
    expect(useTargetChat).toContain('activeRunStreamControlsRef.current[runId]?.abort();');
    expect(useTargetChat).toContain('runTracesByRunIdRef.current = next;');
    expect(useTargetChat).toContain('replaceCancelledRunAssistantMessages(');
    expect(chatSubmit).toContain('isRunCancelled(pendingTraceRunId)');
    expect(chatSubmit).toContain('markRunCancelled?.(accepted.runId);');
    expect(chatSubmit).toContain('replacePendingCancelledRunMessages(');
    expect(chatSubmit).toContain('await controlPlaneApi.cancelRun(accepted.runId).catch(() => undefined);');
  });

  it('replaces transient assistant placeholders with actionable setup failures', () => {
    expect(chatSubmitFailures).toContain("error.code === 'AI_PROVIDER_CREDENTIAL_MISSING'");
    expect(chatSubmitFailures).toContain('buildChatSetupFailureMessage(errorMessage, args.runId)');
    expect(chatSubmit).toContain('buildChatSubmitFailureMessage({');
    expect(chatSubmit).toContain('replacePendingAssistantWithFailure({');
    expect(chatSubmit).toContain('pendingAssistantMessageId,');
    expect(chatSubmit).toContain('pendingTraceRunId,');
    expect(chatSubmitFailures).toContain('isBlankAssistantMessage(message)');
    expect(chatSubmitFailures).toContain('AI Settings](#${AppPaths.workspaceAiSettings(workspaceId)}');
    expect(chatSubmitFailures).toContain('formatControlPlaneError(error, fallbackMessage');
  });

  it('merges session refreshes with the latest selected session id', () => {
    expect(chatSessionSync).toContain('const activeSessionIdRef = useRef(activeSessionId);');
    expect(chatSessionSync).toContain('activeSessionIdRef.current = activeSessionId;');
    expect(chatSessionSync).toContain('mergeFetchedChatSessions(fetched, latestSessionsRef.current, activeSessionIdRef.current)');
    expect(chatSessionSync).toContain('mergeHydratedChatMessages({');
    expect(chatSessionSync).toContain("if (existingTrace.status === 'cancelled')");
    expect(chatSessionSync).toContain('if (message.runId && isRunCancelled(message.runId))');
    expect(chatSessionSync).toContain('isRunCancelled,');
    expect(chatSessionSync).toContain('suppressedRunIds: suppressedHydrationRunIdsRef?.current');
    expect(useTargetChat).toContain('filterMessagesByRunIds(sanitizeChatMessages(messages), suppressedHydrationRunIdsRef.current)');
    expect(useTargetChat).toContain('const revisedRunIds = new Set(turnMessages.map((message) => message.runId).filter(Boolean) as string[]);');
    expect(useTargetChat).toContain('for (const revisedRunId of revisedRunIds) suppressedHydrationRunIdsRef.current.add(revisedRunId);');
    expect(chatSubmit).toContain('suppressedRunIdsRef?: MutableRefObject<ReadonlySet<string>>;');
    expect(chatSubmit).toContain('const filterSuppressedMessages = (nextMessages: ChatMessage[]) => filterMessagesByRunIds(nextMessages, suppressedRunIdsRef?.current);');
    expect(chatSessionSync).toContain('replaceCancelledRunMessagesForHydration(');
  });

  it('keeps chat auto-scroll anchored by stable render signals', () => {
    expect(useTargetChat).toContain('buildTargetChatAutoScrollSignature({ messages, effectiveActiveRunId, runTracesByRunId })');
    expect(targetChatState).toContain('const activeRunTraceSignature = activeRunTrace');
    expect(targetChatState).toContain('lastMessage?.content.length || 0');
    expect(targetChatState).toContain('lastMessage?.approval?.status ||');
    expect(targetChatState).toContain('activeRunTrace.steps.length');
    expect(targetChatState).toContain('activeRunLatestStep?.detail?.length || 0');
    expect(targetChatState).toContain("toolCall.status === 'running'");
    expect(targetChatState).toContain('activeRunTraceSignature');
    expect(useTargetChat).toContain('useTargetChatScrollAnchor({');
    expect(useTargetChat).toContain('transcriptRef');
    expect(useTargetChatScrollAnchor).toContain('useLayoutEffect(() => {');
    expect(useTargetChatScrollAnchor).toContain('const wasChatActiveRef = useRef(isChatActive);');
    expect(useTargetChatScrollAnchor).toContain('const openedChatSessionIdRef = useRef(isChatActive ? activeSessionId : null);');
    expect(useTargetChatScrollAnchor).toContain('const wasChatActive = wasChatActiveRef.current;');
    expect(useTargetChatScrollAnchor).toContain('wasChatActiveRef.current = isChatActive;');
    expect(useTargetChatScrollAnchor).toContain('const didChangeOpenSession = isChatActive && activeSessionId !== openedChatSessionIdRef.current;');
    expect(useTargetChatScrollAnchor).toContain('openedChatSessionIdRef.current = isChatActive ? activeSessionId : null;');
    expect(useTargetChatScrollAnchor).toContain('if ((isChatActive && !wasChatActive) || didChangeOpenSession) {');
    expect(useTargetChatScrollAnchor).toContain('lastChatScrollTopRef.current = 0;');
    expect(useTargetChatScrollAnchor).toContain('const transcriptRef = useCallback((node: HTMLDivElement | null) => {');
    expect(useTargetChatScrollAnchor).toContain('scrollRef.current = node;');
    expect(useTargetChatScrollAnchor).toContain('lastChatScrollTopRef.current = node.scrollTop;');
    expect(useTargetChatScrollAnchor).toContain('window.requestAnimationFrame(() => {');
    expect(useTargetChatScrollAnchor).toContain('isLoadingEarlierMessages');
    expect(useTargetChatScrollAnchor).toContain('node.scrollTop = node.scrollHeight;');
    expect(useTargetChatScrollAnchor).toContain('const lastChatScrollTopRef = useRef(0);');
    expect(useTargetChat).toContain('currentScrollTop < lastChatScrollTopRef.current - 0.5');
    expect(useTargetChat).toContain('currentScrollTop > lastChatScrollTopRef.current + 0.5');
    expect(useTargetChat).toContain('shouldStickToBottomRef.current = false;');
    expect(useTargetChat).toContain('distanceToBottom <= 2 && (shouldStickToBottomRef.current || isScrollingDown)');
    expect(useTargetChat).toContain('!shouldStickToBottomRef.current && node.scrollTop < 160 && hasEarlierMessages');
    expect(useTargetChatScrollAnchor).toContain('[activeSessionId, chatAutoScrollSignature, isChatActive, isLoadingEarlierMessages]');
    expect(useTargetChat).not.toContain('[messages, isRunActive, isChatActive]');
  });

  it('keeps live run trace state and reconciliation refs synchronized', () => {
    expect(useTargetChat).toContain('const setRunTracesByRunIdAndRef: typeof setRunTracesByRunId = useCallback((update) => {');
    expect(useTargetChat).toContain('runTracesByRunIdRef.current = next;');
    expect(useTargetChat).toContain('setRunTracesByRunId: setRunTracesByRunIdAndRef,');
    expect(targetChatRunWatcher).toContain('runTracesByRunIdRef.current = next;');
    expect(chatSessionSync).toContain('runTracesByRunIdRef.current = next;');
  });

  it('advances target activity replay cursors only after canonical reconciliation', () => {
    expect(targetChatActivityStream).toContain('let processing = Promise.resolve();');
    expect(targetChatActivityStream).toContain('let activityRefreshFailed = false;');
    expect(targetChatActivityStream).toContain('if (activityRefreshFailed) {');
    expect(targetChatActivityStream).toContain('await refreshSession(event);');
    expect(targetChatActivityStream).toContain('lastEventIdRef.current = event.id;');
    expect(targetChatActivityStream.indexOf('await refreshSession(event);')).toBeLessThan(
      targetChatActivityStream.indexOf('lastEventIdRef.current = event.id;')
    );
    expect(targetChatActivityStream.indexOf('activityRefreshFailed = true;')).toBeGreaterThan(
      targetChatActivityStream.indexOf('lastEventIdRef.current = event.id;')
    );
    expect(targetChatActivityStream).toContain('const onUpdateSessionsRef = useRef(onUpdateSessions);');
    expect(targetChatActivityStream).toContain('onUpdateSessionsRef.current = onUpdateSessions;');
    expect(targetChatActivityStream).toContain('controlPlaneApi.getRun(event.runId).catch(() => null)');
    expect(targetChatActivityStream).toContain('let fetchedSessions: ChatSession[] | null = null;');
    expect(targetChatActivityStream).toContain('findExistingSessionForBackendId(latestSessions, session.id)');
    expect(targetChatActivityStream).toContain('const currentSessions = latestSessionsRef.current;');
    expect(targetChatActivityStream).toContain('const publishBase = fetchedSessions');
    expect(targetChatActivityStream).toContain('nextSessions = upsertSession(publishBase, hydratedSession);');
    expect(targetChatActivityStream).toContain('onUpdateSessionsRef.current(nextSessions);');
    const activityEffectDependencies = targetChatActivityStream.slice(targetChatActivityStream.lastIndexOf('  }, ['));
    expect(activityEffectDependencies).not.toContain('onUpdateSessions,');
    expect(targetChatActivityStream).toContain("console.warn('Target chat activity refresh failed', error);");
    expect(targetChatActivityStream).toContain('streamAbortController?.abort();');
    expect(targetChatActivityStream).toContain('replaceCancelledRunAssistantMessages(mappedMessages, run.id, runCancelledMessage)');
    expect(targetChatActivityStream).toContain('const restoredTrace = buildTraceFromRunEvents(run, events);');
    expect(targetChatActivityStream).toContain('preferRicherRunTrace(existingTrace, restoredTrace)');
    expect(targetChatActivityStream).toContain('preferRicherRunTrace(runTracesByRunIdRef.current[run.id], buildTraceFromRunEvents(run, events))');
    expect(targetChatActivityStream).not.toContain('steps: [],\n                toolCalls: []');
    expect(targetChatActivityStream).toContain('createRecentActivitySessionPlaceholder(event.sessionId)');
    expect(targetChatActivityStream).toContain('shouldDiscoverActiveRunFromActivity(activeSessionIdRef.current, hydratedSession.id)');
    expect(targetChatActivityStream).toContain('onActiveRunDiscovered?.(hydratedSession.id, run.id);');
    expect(useTargetChat).toContain('} = useActivityDiscoveredRun({');
    expect(useTargetChat).toContain('const effectiveActiveRunId = derivedRunState.activeRunId || activityDiscoveredRunId;');
    expect(useTargetChat).toContain('const isRunActive = isLoading || derivedRunState.isRunActive || Boolean(activityDiscoveredRunId);');
    expect(useTargetChat).toContain('onActiveRunDiscovered: handleActiveRunDiscovered,');
    expect(useTargetChat).toContain('cancelledRunIds: cancelledRunIdsRef.current,');
    expect(useTargetChat).toContain("runCancelledMessage: t('chat.runCancelledMessage')");
    expect(targetChatActivityStream).toContain('cancelledRunIds?: ReadonlySet<string>;');
    expect(targetChatActivityStream).toContain('const isLocallyCancelledRun = cancelledRunIds?.has(run.id) === true;');
    expect(targetChatActivityStream).toContain('if (isLocallyCancelledRun) {');
    expect(targetChatActivityStream).toContain('hasActiveRun: run && cancelledRunIds?.has(run.id) ? false');
    expect(targetChatActivityStream).toContain('!cancelledRunIds?.has(run.id) &&');
    expect(useTargetChat).toContain('resetActivityWatchedRun();');
    expect(useTargetChat).toContain('clearActivityWatchedRunForSession(sessionId);');
    expect(useTargetChat).toContain('if (!activeSessionId) {\n      setActiveSessionId(sortedSessions.length > 0 ? sortedSessions[0].id : null);\n      return;\n    }');
    expect(chatSessionSync).not.toContain('activeHydrationRunSignature');
    expect(chatSessionSync).toContain('Run-id churn is intentionally excluded');
    expect(useActivityDiscoveredRun).toContain('const [activityWatchedRun, setActivityWatchedRun]');
    expect(useActivityDiscoveredRun).toContain('const activityDiscoveredRunId = deriveActivityDiscoveredRunId({');
    expect(useActivityDiscoveredRun).toContain('(sessionId: string, runId: string) => setActivityWatchedRun({ sessionId, runId })');
    expect(useActivityDiscoveredRun).toContain('current?.sessionId === sessionId ? null : current');
  });

  it('sanitizes visible messages before rendering in-flight placeholders', () => {
    expect(useTargetChat).toContain('const visibleMessages = filterMessagesByRunIds(sanitizeChatMessages(messages), suppressedHydrationRunIdsRef.current)');
    expect(useTargetChat).toContain(".filter((message) => !isBlankAssistantMessage(message) || isInFlightAssistantPlaceholder(message));");
  });

  it('does not mark watched sessions inactive after a stream pause without checking run status', () => {
    expect(appClusterChatRuntime).toContain('useTargetChat({');
    expect(targetChatRunWatcher).toContain('const missedEvents = await controlPlaneApi.getRunEvents(runId).catch(() => []);');
    expect(targetChatRunWatcher).toContain('hydrated: backendMessages ? true : session.hydrated');
    expect(targetChatRunWatcher).toContain('hasActiveRun: latestRun ? isRunInProgress(latestRun.status) : isTraceInProgress(trace)');
    expect(targetChatRunWatcher).toContain('mergeHydratedChatMessages({');
  });

  it('reconnects watched run streams with capped backoff instead of opening duplicate streams', () => {
    expect(targetChatRunWatcher).toContain('const WATCHER_RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000];');
    expect(targetChatRunWatcher).toContain('const WATCHER_EVENT_POLL_INTERVAL_MS = 700;');
    expect(targetChatRunWatcher).toContain('const replayRunEvents = (run: ControlPlaneRun, events: ControlPlaneRunEvent[]) =>');
    expect(targetChatRunWatcher).toContain('setTraceForRun(createBaseRunTrace(run.id, isRunInProgress(run.status) ? mapRunStatusToTraceStatus(run.status) :');
    expect(targetChatRunWatcher).toContain('handleRunEvent(event);');
    expect(targetChatRunWatcher).toContain('replayRunEvents(run, events);');
    expect(targetChatRunWatcher).not.toContain('seenSeq.add(event.seq);');
    expect(targetChatRunWatcher).toContain('while (!cancelled && !isRunCancelled(runId) && latestRun && isRunInProgress(latestRun.status))');
    expect(targetChatRunWatcher).toContain('const polledEvents = await controlPlaneApi.getRunEvents(runId);');
    expect(targetChatRunWatcher).toContain('handleRunEvent(polledEvent);');
    expect(targetChatRunWatcher).toContain('pollEventsStop = true;');
    expect(targetChatRunWatcher).toContain('await pollEventsPromise.catch(() => undefined);');
    expect(targetChatRunWatcher).toContain('await waitForReconnect(delayMs);');
    expect(targetChatRunWatcher).toContain('abortController.abort();');
    expect(targetChatRunWatcher).toContain('let pendingSessionPublish');
    expect(targetChatRunWatcher).toContain('pendingSessionPublish = setTimeout');
    expect(targetChatRunWatcher).toContain('}, 80);');
    expect(targetChatRunWatcher).toContain('const onUpdateSessionsRef = useRef(onUpdateSessions);');
    expect(targetChatRunWatcher).toContain('onUpdateSessionsRef.current = onUpdateSessions;');
    expect(targetChatRunWatcher).toContain('onUpdateSessionsRef.current(nextSessions);');
    const watcherEffectDependencies = targetChatRunWatcher.slice(targetChatRunWatcher.lastIndexOf('  }, ['));
    expect(watcherEffectDependencies).not.toContain('onUpdateSessions,');
    expect(targetChatRunWatcher).toContain('watchedBackendSessionId,');
    expect(targetChatRunWatcher).toContain('watchedSessionId');
    expect(targetChatRunWatcher).toContain('if (cancelled || isRunCancelled(runId)) return;');
    expect(targetChatRunWatcher).not.toMatch(/activeSessionRecord,\s*activeSessionRecord\?\.backendSessionId/);
  });

  it('skips only locally owned submit streams when following active runs', () => {
    expect(useTargetChat).toContain('const hasLocalRunStream = useCallback((runId: string) => Boolean(activeRunStreamControlsRef.current[runId]), []);');
    expect(useTargetChat).toContain('hasLocalRunStream,');
    expect(targetChatRunWatcher).toContain('hasLocalRunStream?: (runId: string) => boolean;');
    expect(targetChatRunWatcher).toContain('hasLocalRunStream = (runId: string) => activeRunId === runId');
    expect(targetChatRunWatcher).toContain('hasLocalRunStream(runId)');
    expect(targetChatRunWatcher).not.toContain('activeRunId === runId ||');
  });

  it('reuses restored assistant placeholders for watched streams', () => {
    expect(targetChatRunWatcher).toContain('let activeStreamingMessageId = streamingMessageId;');
    expect(targetChatRunWatcher).toContain("message.role === 'assistant' && message.runId === runId");
    expect(targetChatRunWatcher).toContain('activeStreamingMessageId = existingRunMessage.id;');
    expect(targetChatRunWatcher).toContain('message.id === activeStreamingMessageId');
    expect(targetChatRunWatcher).toContain('let streamingContent =');
    expect(targetChatRunWatcher).toContain('let streamingApproval');
    expect(targetChatRunWatcher).toContain('const replayApprovalState = (events: ControlPlaneRunEvent[]) =>');
    expect(targetChatRunWatcher).toContain("event.type === 'tool_approval_requested'");
    expect(targetChatRunWatcher).toContain("approval.status === 'pending'");
    expect(targetChatRunWatcher).toContain('replayApprovalState(events);');
    expect(targetChatRunWatcher).toContain('streamingContent = `${streamingContent}${text}`;');
    expect(targetChatRunWatcher).toContain('streamingApproval = approval;');
    expect(targetChatRunWatcher).toContain('const nextApproval = streamingApproval || existingRunMessage.approval;');
    expect(targetChatRunWatcher).toContain('approval: nextApproval');
    expect(targetChatRunWatcher).toContain('resolveAssistantTransientStatus(nextContent, nextApproval)');
    expect(targetChatRunWatcher).toContain('resolveAssistantTransientStatus(content, streamingApproval)');
    expect(chatSubmit).toContain('resolveAssistantTransientStatus(nextContent, message.approval)');
    expect(targetChatRunWatcher).not.toContain('content: `${message.content}${text}`');
  });
});
