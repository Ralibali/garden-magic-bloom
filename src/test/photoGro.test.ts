import { describe, expect, it } from 'vitest';
import { buildPhotoGroPrompt } from '@/lib/photoGro';

describe('photoGro', () => {
  it('builds a prompt with bed and caption context', () => {
    const prompt = buildPhotoGroPrompt({
      mode: 'quick_review',
      takenAt: '2026-07-05',
      caption: 'Tomaterna slokar lite',
      bedName: 'Växthus',
    });

    expect(prompt).toContain('2026-07-05');
    expect(prompt).toContain('Växthus');
    expect(prompt).toContain('Tomaterna slokar lite');
  });

  it('uses different wording for growth log mode', () => {
    const prompt = buildPhotoGroPrompt({ mode: 'growth_log', takenAt: '2026-07-05' });
    expect(prompt).toContain('förändrats');
  });
});
