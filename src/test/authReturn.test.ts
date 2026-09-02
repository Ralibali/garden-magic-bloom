import { describe, expect, it } from 'vitest';
import { registerUrl, safeAppReturnPath } from '@/lib/authReturn';

describe('safeAppReturnPath', () => {
  it('allows in-app destinations', () => {
    expect(safeAppReturnPath('/app/sowings')).toBe('/app/sowings');
    expect(safeAppReturnPath('/app/pests')).toBe('/app/pests');
    expect(safeAppReturnPath('/app/calendar')).toBe('/app/calendar');
  });

  it('rejects open redirects and leftover public shells', () => {
    expect(safeAppReturnPath('https://evil.example/phish')).toBe('/app');
    expect(safeAppReturnPath('//evil.example')).toBe('/app');
    expect(safeAppReturnPath('/login')).toBe('/app');
    expect(safeAppReturnPath('/funktioner')).toBe('/app');
    expect(safeAppReturnPath('../etc/passwd')).toBe('/app');
    expect(safeAppReturnPath(null)).toBe('/app');
  });

  it('builds a register URL with crop and return', () => {
    expect(registerUrl({ source: 'vaxt', returnTo: '/app/sowings', crop: 'Tomat' })).toBe(
      '/login?mode=register&source=vaxt&return=%2Fapp%2Fsowings&crop=Tomat',
    );
  });
});
