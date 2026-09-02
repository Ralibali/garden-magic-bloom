import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveLovableHostFile } from '../../scripts/lovable-host.mjs';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'lovable-host-'));
  writeFileSync(
    join(root, 'index.html'),
    '<html><head><title>Home</title><link rel="canonical" href="https://odlingsdagboken.com/" /></head><body><h1>Home</h1></body></html>',
  );
  mkdirSync(join(root, 'vaxter'), { recursive: true });
  writeFileSync(
    join(root, 'vaxter', 'index.html'),
    '<html><head><title>Vaxter</title><link rel="canonical" href="https://odlingsdagboken.com/vaxter" /></head><body><h1>Vaxter</h1></body></html>',
  );
  return root;
}

describe('Lovable production host resolver', () => {
  it('serves existing dist/<route>/index.html (how /vaxter works in prod)', () => {
    const dist = fixture();
    const hit = resolveLovableHostFile(dist, '/vaxter');
    expect(hit.fallback).toBe(false);
    expect(hit.file).toBe(join(dist, 'vaxter', 'index.html'));
    expect(resolveLovableHostFile(dist, '/vaxter/').fallback).toBe(false);
  });

  it('SPA-falls back to homepage when the prerender file is missing (the live /funktioner bug)', () => {
    const dist = fixture();
    const miss = resolveLovableHostFile(dist, '/funktioner');
    expect(miss.fallback).toBe(true);
    expect(miss.file).toBe(join(dist, 'index.html'));
    expect(resolveLovableHostFile(dist, '/funktioner/').fallback).toBe(true);
    expect(resolveLovableHostFile(dist, '/hur-det-fungerar').fallback).toBe(true);
  });

  it('stops falling back once dist/funktioner/index.html exists', () => {
    const dist = fixture();
    mkdirSync(join(dist, 'funktioner'), { recursive: true });
    writeFileSync(join(dist, 'funktioner', 'index.html'), '<html><head><title>Funktioner</title></head><body><h1>Funktioner</h1></body></html>');
    const hit = resolveLovableHostFile(dist, '/funktioner');
    expect(hit.fallback).toBe(false);
    expect(hit.file).toBe(join(dist, 'funktioner', 'index.html'));
  });
});
