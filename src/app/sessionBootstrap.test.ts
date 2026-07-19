import { describe, expect, it } from 'vitest';
import { ControlPlaneRequestError } from '@/services/control-plane/http';
import { classifySessionBootstrapError } from './useAppBootstrap';

describe('session bootstrap classification', () => {
  it('treats an initial 401 as anonymous', () => {
    expect(classifySessionBootstrapError(new ControlPlaneRequestError('unauthorized', 401))).toBe('anonymous');
  });

  it('keeps network and server failures in an unavailable state', () => {
    expect(classifySessionBootstrapError(new TypeError('network'))).toBe('unavailable');
    expect(classifySessionBootstrapError(new ControlPlaneRequestError('upstream', 503))).toBe('unavailable');
  });
});
