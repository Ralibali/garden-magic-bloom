// @vitest-environment node
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { deleteAccountPhotos, GARDEN_YEARLY_PRICE, isGardenSubscription } from '../../supabase/functions/_shared/accountDeletion';

const userId = '12345678-1234-1234-1234-123456789abc';
// Live ysonnvbkrwajacvdkqut schema inspected on 2026-10-01. Missing relations
// must fail in the mock just as PostgREST does; never silently ignore DB errors.
const accountTables = new Set([
  'plant_care_events', 'blog_comments', 'watering_log', 'plant_logs',
  'plant_photos', 'pest_logs', 'harvests', 'sowings', 'seed_inventory',
  'season_summaries', 'my_plants', 'beds', 'feedback', 'reminder_settings',
  'user_roles', 'profiles', 'referrals',
]);
const source = readFileSync(new URL('../../supabase/functions/delete-account/index.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;

type Options = { failure?: 'stripe' | 'storage' | 'auth' | string; invalidSession?: boolean };
function setup(options: Options = {}) {
  const calls: string[] = [];
  let handler!: (request: Request) => Promise<Response>;
  const client = {
    auth: {
      getUser: async () => ({ data: { user: options.invalidSession ? null : { id: userId, email: 'isolated-review@example.com', email_confirmed_at: '2026-01-01' } }, error: null }),
      admin: { deleteUser: async (id: string) => {
        calls.push(`auth:${id}`);
        return { error: options.failure === 'auth' ? new Error('auth unavailable') : null };
      } },
    },
    storage: { from: (bucket: string) => ({
      list: async (prefix: string) => {
        calls.push(`storage-list:${bucket}:${prefix}`);
        return { data: [{ name: 'photo.jpg', id: 'photo-id' }], error: options.failure === 'storage' ? new Error('storage unavailable') : null };
      },
      remove: async (paths: string[]) => { calls.push(`storage-remove:${paths.join(',')}`); return { error: null }; },
    }) },
    from: (table: string) => ({ delete: () => ({
      eq: async (column: string, value: string) => {
        calls.push(`db:${table}:${column}:${value}`);
        return { error: !accountTables.has(table) || options.failure === table ? new Error(`Delete failed: ${table}`) : null };
      },
      or: async (filter: string) => {
        calls.push(`db:${table}:${filter}`);
        return { error: options.failure === table ? new Error(`Delete failed: ${table}`) : null };
      },
    }) }),
  };
  class Stripe {
    customers = { list: async function* () { yield { id: 'customer-1' }; } };
    subscriptions = {
      list: async function* () {
        yield { id: 'garden-active', status: 'active', metadata: { user_id: userId }, items: { data: [{ price: { id: GARDEN_YEARLY_PRICE } }] } };
        yield { id: 'other-product', status: 'active', items: { data: [{ price: { id: 'unrelated-price' } }] } };
        yield { id: 'other-user', status: 'active', metadata: { user_id: 'someone-else' }, items: { data: [{ price: { id: GARDEN_YEARLY_PRICE } }] } };
        yield { id: 'already-canceled', status: 'canceled', items: { data: [{ price: { id: GARDEN_YEARLY_PRICE } }] } };
      },
      cancel: async (id: string, parameters: unknown) => {
        calls.push(`stripe-cancel:${id}`);
        expect(parameters).toEqual({ prorate: false, invoice_now: false });
        if (options.failure === 'stripe') throw new Error('stripe unavailable');
      },
    };
  }
  vm.runInNewContext(compiled, {
    exports: {}, Response,
    console: { error: () => {} },
    Deno: { env: { get: () => 'test-only-key' }, serve: (value: typeof handler) => { handler = value; } },
    require: (specifier: string) => {
      if (specifier === 'https://esm.sh/stripe@18.5.0') return Stripe;
      if (specifier === 'https://esm.sh/@supabase/supabase-js@2') return { createClient: () => client };
      if (specifier === '../_shared/accountDeletion.ts') return { deleteAccountPhotos, isGardenSubscription };
      throw new Error(`Unexpected dependency: ${specifier}`);
    },
  });
  const request = (origin = 'capacitor://localhost', authorized = true, method = 'POST') => handler(new Request('https://example.invalid/delete-account', {
    method, headers: { Origin: origin, ...(authorized ? { Authorization: 'Bearer isolated-test-token' } : {}) },
    ...(method === 'POST' ? { body: JSON.stringify({ user_id: 'must-not-control-deletion' }) } : {}),
  }));
  return { calls, request };
}

describe('account deletion against the deployed schema', () => {
  it.each(['capacitor://localhost', 'https://localhost', 'https://odlingsdagboken.com', 'https://www.odlingsdagboken.com'])('permits preflight from %s without touching account data', async (origin) => {
    const { calls, request } = setup();
    const response = await request(origin, false, 'OPTIONS');
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
    expect(calls).toEqual([]);
  });

  it.each([false, true])('rejects missing or invalid authentication before any mutation (%s)', async (invalidSession) => {
    const { calls, request } = setup({ invalidSession });
    expect((await request(undefined, invalidSession)).status).toBe(401);
    expect(calls).toEqual([]);
  });

  it('removes the verified caller through the existing schema and deletes Auth last', async () => {
    const { calls, request } = setup();
    const response = await request();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(calls.filter(call => call.startsWith('stripe-cancel:'))).toEqual(['stripe-cancel:garden-active']);
    expect(calls[0]).toBe('stripe-cancel:garden-active');
    expect(calls[1]).toBe(`storage-list:plant-photos:${userId}`);
    expect(calls[2]).toBe(`storage-remove:${userId}/photo.jpg`);
    const deletions = calls.filter(call => call.startsWith('db:'));
    expect(new Set(deletions.map(call => call.split(':')[1]))).toEqual(accountTables);
    expect(deletions.every(call => call.includes(userId) && !call.includes('must-not-control-deletion'))).toBe(true);
    expect(calls.at(-1)).toBe(`auth:${userId}`);
  });

  it.each(['stripe', 'storage', 'plant_logs', 'referrals'])('fails closed on %s errors and preserves the Auth account for a retry', async (failure) => {
    const { calls, request } = setup({ failure });
    const response = await request();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Internal error' });
    expect(calls.some(call => call.startsWith('auth:'))).toBe(false);
    if (failure === 'stripe') expect(calls.some(call => call.startsWith('storage-'))).toBe(false);
    if (failure === 'stripe' || failure === 'storage') expect(calls.some(call => call.startsWith('db:'))).toBe(false);
  });

  it('does not report success if Auth deletion fails', async () => {
    const { request } = setup({ failure: 'auth' });
    const response = await request();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Failed to delete auth user' });
  });
});
