/**
 * Smart import utility – parses CSV, XLSX, JSON files and auto-detects
 * whether data maps to sowings, harvests, or seed_inventory.
 */
import * as XLSX from 'xlsx';

export type ImportTarget = 'sowings' | 'harvests' | 'seed_inventory';

export interface ImportResult {
  target: ImportTarget;
  label: string;
  rows: Record<string, any>[];
  skipped: number;
}

/* ── Column synonyms (Swedish + English, case-insensitive) ── */

const SOWING_HINTS  = ['sådd', 'sow', 'sådatum', 'sow_date', 'sow date', 'transplant', 'såtid'];
const HARVEST_HINTS = ['skörd', 'harvest', 'skördedatum', 'harvest_date', 'vikt', 'weight', 'gram'];
const SEED_HINTS    = ['frö', 'seed', 'brand', 'märke', 'expiry', 'utgångsdatum', 'quantity', 'antal'];

const FIELD_MAP: Record<ImportTarget, Record<string, string>> = {
  sowings: {
    sort: 'variety', variety: 'variety', växt: 'variety', namn: 'variety', name: 'variety', plant: 'variety',
    sådatum: 'sow_date', 'sow date': 'sow_date', sow_date: 'sow_date', datum: 'sow_date', date: 'sow_date',
    typ: 'type', type: 'type',
    status: 'status',
    frömärke: 'seed_brand', 'seed brand': 'seed_brand', seed_brand: 'seed_brand', märke: 'seed_brand', brand: 'seed_brand',
    anteckningar: 'notes', notes: 'notes', anteckning: 'notes', note: 'notes', kommentar: 'notes',
    bädd: '_bed_name', bed: '_bed_name',
    'transplant datum': 'transplant_date', transplant_date: 'transplant_date', utplanteringsdatum: 'transplant_date',
  },
  harvests: {
    sort: 'variety', variety: 'variety', växt: 'variety', namn: 'variety', name: 'variety', plant: 'variety',
    datum: 'harvest_date', date: 'harvest_date', harvest_date: 'harvest_date', skördedatum: 'harvest_date', 'harvest date': 'harvest_date',
    vikt: 'weight_grams', 'vikt (g)': 'weight_grams', weight: 'weight_grams', weight_grams: 'weight_grams', gram: 'weight_grams',
    anteckningar: 'notes', notes: 'notes', anteckning: 'notes', note: 'notes', kommentar: 'notes',
    bädd: '_bed_name', bed: '_bed_name',
  },
  seed_inventory: {
    sort: 'variety', variety: 'variety', växt: 'variety', namn: 'variety', name: 'variety', frö: 'variety',
    märke: 'brand', brand: 'brand', frömärke: 'brand',
    antal: 'quantity', quantity: 'quantity', mängd: 'quantity',
    utgångsdatum: 'expiry_date', expiry: 'expiry_date', expiry_date: 'expiry_date', 'bäst före': 'expiry_date',
    anteckningar: 'notes', notes: 'notes', anteckning: 'notes', note: 'notes', kommentar: 'notes',
  },
};

const TARGET_LABELS: Record<ImportTarget, string> = {
  sowings: 'Sådder',
  harvests: 'Skördar',
  seed_inventory: 'Fröinventariet',
};

/* ── File parsing ── */

export async function parseFile(file: File): Promise<Record<string, any>[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'json') {
    const text = await file.text();
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : parsed.data ?? parsed.rows ?? [parsed];
  }

  // CSV or XLSX via SheetJS
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
}

/* ── Auto-detect target ── */

function score(columns: string[], hints: string[]): number {
  return columns.reduce((n, col) => {
    const lc = col.toLowerCase().trim();
    return n + (hints.some(h => lc.includes(h)) ? 1 : 0);
  }, 0);
}

export function detectTarget(columns: string[]): ImportTarget {
  const lc = columns.map(c => c.toLowerCase().trim());
  const scores: Record<ImportTarget, number> = {
    sowings: score(lc, SOWING_HINTS),
    harvests: score(lc, HARVEST_HINTS),
    seed_inventory: score(lc, SEED_HINTS),
  };
  // Tiebreaker: prefer in order sowings > harvests > seeds
  const sorted = (Object.entries(scores) as [ImportTarget, number][]).sort((a, b) => b[1] - a[1]);
  return sorted[0][1] > 0 ? sorted[0][0] : 'sowings';
}

/* ── Map rows to DB schema ── */

function normaliseDate(v: any): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().split('T')[0];
  const s = String(v).trim();
  // Try ISO-ish
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  // Swedish dd/mm/yyyy or dd-mm-yyyy
  const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  return null;
}

export function mapRows(
  rawRows: Record<string, any>[],
  target: ImportTarget,
): ImportResult {
  const fieldMap = FIELD_MAP[target];
  let skipped = 0;

  const rows = rawRows.map(raw => {
    const mapped: Record<string, any> = {};
    for (const [rawKey, rawVal] of Object.entries(raw)) {
      const lc = rawKey.toLowerCase().trim();
      const dbField = fieldMap[lc];
      if (dbField) mapped[dbField] = rawVal;
    }
    return mapped;
  }).filter(row => {
    // Must have at least variety/name
    if (!row.variety || String(row.variety).trim() === '') {
      skipped++;
      return false;
    }
    row.variety = String(row.variety).trim();

    // Normalise dates per target
    if (target === 'sowings') {
      row.sow_date = normaliseDate(row.sow_date) || new Date().toISOString().split('T')[0];
      row.transplant_date = normaliseDate(row.transplant_date) || null;
      row.type = row.type || 'direct';
      row.status = row.status || 'sown';
    }
    if (target === 'harvests') {
      row.harvest_date = normaliseDate(row.harvest_date) || new Date().toISOString().split('T')[0];
      row.weight_grams = parseInt(row.weight_grams) || 0;
    }
    if (target === 'seed_inventory') {
      row.expiry_date = normaliseDate(row.expiry_date) || null;
    }

    // Clean notes
    if (row.notes) row.notes = String(row.notes).trim().slice(0, 1000);
    // Remove internal mapping keys
    delete row._bed_name;

    return true;
  });

  return { target, label: TARGET_LABELS[target], rows, skipped };
}