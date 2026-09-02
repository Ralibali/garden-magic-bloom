import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const spine = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260902160000_garden_os_spine.sql'), 'utf8');
const seeds = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260902170000_seed_inventory_crop_key.sql'), 'utf8');

describe('garden data spine migration safety', () => {
  it('keeps the merged spine additive and non-destructive', () => {
    expect(spine).toMatch(/add column if not exists crop_key/i);
    expect(spine).toMatch(/seed_inventory_id/i);
    expect(spine).toMatch(/pest_logs[\s\S]*sowing_id/i);
    expect(spine).toMatch(/on delete set null/i);
    expect(spine).not.toMatch(/drop table/i);
    expect(spine).not.toMatch(/update public\.sowings/i);
  });

  it('adds seed_inventory.crop_key without rewriting variety', () => {
    expect(seeds).toMatch(/seed_inventory/i);
    expect(seeds).toMatch(/add column if not exists crop_key/i);
    expect(seeds).not.toMatch(/update public\.seed_inventory\s+set variety/i);
  });
});
