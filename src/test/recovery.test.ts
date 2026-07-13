import { describe, it, expect, beforeEach, vi } from 'vitest';
import { attemptRecovery, isChunkLoadError } from '@/lib/recovery';

describe('recovery', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('detects chunk load errors', () => {
    expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module: /assets/foo.js'))).toBe(true);
    expect(isChunkLoadError(new Error('Loading chunk 42 failed'))).toBe(true);
    expect(isChunkLoadError(new Error('Loading CSS chunk 3 failed'))).toBe(true);
    const err = new Error('boom'); err.name = 'ChunkLoadError';
    expect(isChunkLoadError(err)).toBe(true);
    expect(isChunkLoadError(new Error('unrelated'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });

  it('skips recovery in preview/dev (no window.location.replace)', async () => {
    // vitest jsdom hostname = 'localhost' → treated as dev.
    const spy = vi.fn();
    Object.defineProperty(window.location, 'replace', { configurable: true, value: spy });
    const err = new Error('Failed to fetch dynamically imported module: /assets/foo.js');
    const result = await attemptRecovery(err);
    expect(result).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not attempt recovery for non-chunk errors', async () => {
    const spy = vi.fn();
    Object.defineProperty(window.location, 'replace', { configurable: true, value: spy });
    const result = await attemptRecovery(new Error('some other error'));
    expect(result).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('odling_recovery_attempted_v1')).toBeNull();
  });

  it('sessionStorage flag prevents second recovery in same session', async () => {
    // Simulate that a recovery already ran.
    sessionStorage.setItem('odling_recovery_attempted_v1', '1');
    const spy = vi.fn();
    Object.defineProperty(window.location, 'replace', { configurable: true, value: spy });
    const result = await attemptRecovery(new Error('Loading chunk 42 failed'));
    expect(result).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });
});
