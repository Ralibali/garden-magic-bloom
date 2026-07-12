import { describe, it, expect } from 'vitest';
import { buildPlantWeeklySummary } from '@/lib/plantWeeklySummary';

const NOW = new Date('2026-05-15T12:00:00Z');
const dayAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

describe('buildPlantWeeklySummary', () => {
  it('empty state when no plants', () => {
    const summary = buildPlantWeeklySummary({
      plants: [],
      eventsByPlant: new Map(),
      wateringsByPlant: new Map(),
      photos: [],
      now: NOW,
    });
    expect(summary.hasData).toBe(false);
    expect(summary.healthChecks).toBe(0);
    expect(summary.waterings).toBe(0);
  });

  it('counts events within the last seven days only', () => {
    const plants = [{ id: 'p1', name: 'Monstera', watering_interval_days: 7 }];
    const eventsByPlant = new Map<string, any[]>([
      ['p1', [
        { event_type: 'health_check', occurred_at: dayAgo(1), health_rating: 4 },
        { event_type: 'health_check', occurred_at: dayAgo(10), health_rating: 3 },
        { event_type: 'watered', occurred_at: dayAgo(2) },
      ]],
    ]);
    const summary = buildPlantWeeklySummary({
      plants,
      eventsByPlant,
      wateringsByPlant: new Map(),
      photos: [],
      now: NOW,
    });
    expect(summary.healthChecks).toBe(1);
    expect(summary.waterings).toBe(1);
    expect(summary.hasData).toBe(true);
  });

  it('classifies improving vs declining plants by trend', () => {
    const plants = [
      { id: 'improve', name: 'Bättring', watering_interval_days: 7 },
      { id: 'worse', name: 'Sämre', watering_interval_days: 7 },
    ];
    const events = new Map<string, any[]>([
      ['improve', [
        { event_type: 'health_check', occurred_at: dayAgo(1), health_rating: 5 },
        { event_type: 'health_check', occurred_at: dayAgo(3), health_rating: 5 },
        { event_type: 'health_check', occurred_at: dayAgo(10), health_rating: 2 },
        { event_type: 'health_check', occurred_at: dayAgo(14), health_rating: 2 },
      ]],
      ['worse', [
        { event_type: 'health_check', occurred_at: dayAgo(1), health_rating: 2 },
        { event_type: 'health_check', occurred_at: dayAgo(3), health_rating: 2 },
        { event_type: 'health_check', occurred_at: dayAgo(10), health_rating: 5 },
        { event_type: 'health_check', occurred_at: dayAgo(14), health_rating: 5 },
      ]],
    ]);
    const summary = buildPlantWeeklySummary({
      plants,
      eventsByPlant: events,
      wateringsByPlant: new Map(),
      photos: [],
      now: NOW,
    });
    expect(summary.improved.some(p => p.id === 'improve')).toBe(true);
    expect(summary.declining.some(p => p.id === 'worse')).toBe(true);
  });

  it('only counts photos linked to a plant within the window', () => {
    const plants = [{ id: 'p1', name: 'Pilea', watering_interval_days: 7 }];
    const photos = [
      { id: '1', my_plant_id: 'p1', taken_at: dayAgo(2), created_at: dayAgo(2) },
      { id: '2', my_plant_id: 'p1', taken_at: dayAgo(20), created_at: dayAgo(20) },
      { id: '3', my_plant_id: null, taken_at: dayAgo(1), created_at: dayAgo(1) },
    ];
    const summary = buildPlantWeeklySummary({
      plants,
      eventsByPlant: new Map(),
      wateringsByPlant: new Map(),
      photos,
      now: NOW,
    });
    expect(summary.photos).toBe(1);
  });
});

// Guardrails for the analyze-plant-photo edge function sanitizer
import { sanitizeAnalysisForTest, extractJsonForTest } from './analysisGuardrails';

describe('analyze-plant-photo guardrails', () => {
  it('extracts JSON from fenced markdown', () => {
    const raw = 'Här kommer\n```json\n{"overall_impression":"ok","observations":[],"manual_checks":[],"recommendation":"","confidence":"low","unclear":false}\n```';
    const parsed = extractJsonForTest(raw);
    expect(parsed?.overall_impression).toBe('ok');
  });

  it('sanitizes and clamps invalid input', () => {
    const clean = sanitizeAnalysisForTest({
      overall_impression: 'x'.repeat(500),
      observations: [
        { label: 'lite gula blad', severity: 'watch' },
        { label: 'hack', severity: 'BOOM' },
        'not an object',
      ],
      manual_checks: ['känn jorden', 42],
      recommendation: 'y'.repeat(500),
      confidence: 'ultra',
      unclear: 'yes',
    });
    expect(clean.overall_impression.length).toBeLessThanOrEqual(220);
    expect(clean.observations).toHaveLength(2);
    expect(clean.observations[1].severity).toBe('info');
    expect(clean.manual_checks).toHaveLength(1);
    expect(clean.recommendation.length).toBeLessThanOrEqual(280);
    expect(clean.confidence).toBe('low');
    expect(clean.unclear).toBe(false);
  });

  it('returns null for junk instead of crashing', () => {
    expect(extractJsonForTest('no json here at all')).toBeNull();
  });
});
