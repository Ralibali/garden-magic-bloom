// Duplicates of the guardrails inside supabase/functions/analyze-plant-photo/index.ts,
// exported here so unit tests can validate the parser and sanitizer without Deno.

export interface AnalysisResult {
  overall_impression: string;
  observations: Array<{ label: string; severity: 'info' | 'watch' | 'concern' }>;
  manual_checks: string[];
  recommendation: string;
  confidence: 'low' | 'medium' | 'high';
  unclear: boolean;
}

export function sanitizeAnalysisForTest(raw: any): AnalysisResult {
  const observations = Array.isArray(raw?.observations)
    ? raw.observations
        .filter((o: any) => o && typeof o.label === 'string')
        .slice(0, 6)
        .map((o: any) => ({
          label: String(o.label).slice(0, 160),
          severity: ['info', 'watch', 'concern'].includes(o.severity) ? o.severity : 'info',
        }))
    : [];
  const manualChecks = Array.isArray(raw?.manual_checks)
    ? raw.manual_checks.filter((c: any) => typeof c === 'string').slice(0, 6).map((c: string) => c.slice(0, 200))
    : [];
  return {
    overall_impression: String(raw?.overall_impression || '').slice(0, 220),
    observations,
    manual_checks: manualChecks,
    recommendation: String(raw?.recommendation || '').slice(0, 280),
    confidence: ['low', 'medium', 'high'].includes(raw?.confidence) ? raw.confidence : 'low',
    unclear: raw?.unclear === true,
  };
}

export function extractJsonForTest(text: string): any {
  if (!text) return null;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text;
  const first = candidate.indexOf('{');
  const last = candidate.lastIndexOf('}');
  if (first === -1 || last === -1) return null;
  try {
    return JSON.parse(candidate.slice(first, last + 1));
  } catch {
    return null;
  }
}
