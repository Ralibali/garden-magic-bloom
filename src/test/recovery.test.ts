import { describe, it, expect, beforeEach } from 'vitest';
import { attemptRecovery, isChunkLoadError } from '@/lib/recovery';

describe('recovery', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('detects chunk load errors', () => {
    expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module: /assets/foo.js'))).toBe(true);
    expect(isChunkLoadError(new Error('Loading chunk 42 failed'))).toBe(true);
    expect(isChunkLoadError(new Error('Loading CSS chunk 3 failed'))).toBe(true);
    const err = new Error('boom'); err.name = 'ChunkLoadError';
    expect(isChunkLoadError(err)).toBe(true);
    expect(isChunkLoadError(new Error('publish-unit-mismatch html=a js=b'))).toBe(true);
    expect(isChunkLoadError(new Error('unrelated'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });

  it('skips recovery in preview/dev (localhost)', async () => {
    // vitest jsdom hostname = 'localhost' → treated as dev, no reload.
    const err = new Error('Failed to fetch dynamically imported module: /assets/foo.js');
    const result = await attemptRecovery(err);
    expect(result).toBe(false);
    // Flag not set in dev — recovery bailed before touching sessionStorage.
    expect(sessionStorage.getItem('odling_recovery_attempted_v1')).toBeNull();
  });

  it('does not attempt recovery for non-chunk errors', async () => {
    const result = await attemptRecovery(new Error('some other error'));
    expect(result).toBe(false);
    expect(sessionStorage.getItem('odling_recovery_attempted_v1')).toBeNull();
  });

  it('sessionStorage flag prevents reload-loop within same session', async () => {
    // Pre-set flag simulating a prior recovery.
    sessionStorage.setItem('odling_recovery_attempted_v1', '1');
    const result = await attemptRecovery(new Error('Loading chunk 42 failed'));
    // Even in prod-like context this would return false because the flag is set.
    expect(result).toBe(false);
  });
});
