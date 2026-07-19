import { describe, expect, it } from 'vitest';
import {
  captureLogViewport,
  resolveRestoredLogScrollTop
} from '@/features/kubernetes-cluster-detail/components/workloads/podLogViewport';

describe('pod log viewport', () => {
  it('follows refreshed output when the reader is already near the bottom', () => {
    const snapshot = captureLogViewport({
      clientHeight: 200,
      scrollHeight: 1000,
      scrollTop: 785
    }, true);

    expect(resolveRestoredLogScrollTop(snapshot, {
      clientHeight: 200,
      scrollHeight: 1200
    })).toBe(1000);
  });

  it('preserves the reader position when they have scrolled away from the bottom', () => {
    const snapshot = captureLogViewport({
      clientHeight: 200,
      scrollHeight: 1000,
      scrollTop: 300
    }, true);

    expect(resolveRestoredLogScrollTop(snapshot, {
      clientHeight: 200,
      scrollHeight: 1200
    })).toBe(300);
  });

  it('does not force manual refreshes to the bottom', () => {
    const snapshot = captureLogViewport({
      clientHeight: 200,
      scrollHeight: 1000,
      scrollTop: 800
    }, false);

    expect(resolveRestoredLogScrollTop(snapshot, {
      clientHeight: 200,
      scrollHeight: 1200
    })).toBe(800);
  });

  it('clamps a preserved position when refreshed output becomes shorter', () => {
    const snapshot = captureLogViewport({
      clientHeight: 200,
      scrollHeight: 1000,
      scrollTop: 600
    }, false);

    expect(resolveRestoredLogScrollTop(snapshot, {
      clientHeight: 200,
      scrollHeight: 500
    })).toBe(300);
  });
});
