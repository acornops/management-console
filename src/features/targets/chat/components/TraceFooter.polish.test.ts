import { describe, expect, it } from 'vitest';

import { traceFooter } from '@/stylesTestSupport';

describe('trace footer polish contracts', () => {
  it('keeps complete retained details and full results in one scroller', () => {
    expect(traceFooter).toContain('type-caption mt-0.5 whitespace-pre-wrap break-words text-ui-text-muted');
    expect(traceFooter).not.toContain('line-clamp-4');
    expect(traceFooter).not.toContain('title={event.detail}');
    expect(traceFooter).toContain('Full tool results');
    expect(traceFooter).toContain('View full result');
    expect(traceFooter).toContain('Hide full result');
    expect(traceFooter).toContain('Full result unavailable');
    expect(traceFooter).toContain('error instanceof ControlPlaneRequestError && error.status === 404');
    expect(traceFooter).toContain('Could not load the full result. Try again.');
    expect(traceFooter).not.toContain("error instanceof Error ? error.message");
    expect(traceFooter).not.toContain('Full redacted results');
    expect(traceFooter).not.toContain('expires ${new Date');
    expect(traceFooter).not.toContain('max-h-72 overflow-auto');
  });

  it('follows live events only while the latest event remains in view', () => {
    expect(traceFooter).toContain('timelineScrollRef');
    expect(traceFooter).toContain('latestTimelineEventRef');
    expect(traceFooter).toContain('const FOLLOW_LATEST_THRESHOLD_PX = 24;');
    expect(traceFooter).toContain('function isLatestEventInFollowZone');
    expect(traceFooter).toContain('shouldFollowLatestRef.current = isLatestEventInFollowZone');
    expect(traceFooter).toContain('onScroll={handleTimelineScroll}');
    expect(traceFooter).toContain('if (!shouldFollowLatestRef.current) return;');
    expect(traceFooter).toContain('(!previousDisclosure.isExpanded && isExpanded)');
    expect(traceFooter).toContain('latestEvent.offsetTop + latestEvent.offsetHeight - scrollContainer.clientHeight');
  });
});
