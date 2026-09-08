import { webcrypto } from "node:crypto";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { drainNativePush } from "../functions/_shared/nativePushServer";

type Row = Record<string, unknown>;
let pem: string;
beforeAll(async () => {
  const key = await webcrypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  pem = `-----BEGIN PRIVATE KEY-----\n${Buffer.from(await webcrypto.subtle.exportKey("pkcs8", key.privateKey)).toString("base64")}\n-----END PRIVATE KEY-----`;
});
beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("AbortSignal", { timeout: () => new AbortController().signal });
  vi.stubGlobal("Deno", {
    env: {
      get: (key: string) =>
        ({
          NATIVE_PUSH_APP_ID: "com.odlingsdagboken.app",
          APNS_PRIVATE_KEY: pem,
          APNS_KEY_ID: "test-key",
          APNS_TEAM_ID: "test-team",
        })[key],
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

function fixture(options: { preference?: boolean; expired?: boolean } = {}) {
  const installation: Row = {
    id: "device",
    user_id: "owner",
    generation: "generation",
    provider: "apns",
    environment: "sandbox",
    app_id: "com.odlingsdagboken.app",
    token: "a".repeat(64),
    enabled: true,
  };
  const job: Row = {
    id: "job",
    installation_id: "device",
    generation: "generation",
    lease_id: "first-lease",
    kind: "frost",
    event_key: "frost:today",
    attempts: 1,
    expires_at: new Date(
      Date.now() + (options.expired ? -1000 : 90000),
    ).toISOString(),
  };
  const tables: Record<string, Row[]> = {
    native_push_installations: [installation],
    native_push_deliveries: [job],
    profiles: [
      { user_id: "owner", frost_alerts_enabled: options.preference ?? true },
    ],
  };
  let claimed = false;
  const admin = {
    rpc: async () => {
      if (claimed) return { data: [], error: null };
      claimed = true;
      return { data: [{ ...job }], error: null };
    },
    from: (table: string) => {
      const filters: [string, unknown][] = [];
      let values: Row | undefined;
      const execute = () => {
        const rows = tables[table].filter((row) =>
          filters.every(([key, value]) => row[key] === value),
        );
        if (values) rows.forEach((row) => Object.assign(row, values));
        return { data: rows.map((row) => ({ ...row })), error: null };
      };
      const builder = {
        select: () => builder,
        eq: (key: string, value: unknown) => {
          filters.push([key, value]);
          return builder;
        },
        update: (next: Row) => {
          values = next;
          return builder;
        },
        maybeSingle: async () => ({
          data: execute().data[0] ?? null,
          error: null,
        }),
        then: (resolve: (value: ReturnType<typeof execute>) => unknown) =>
          Promise.resolve(execute()).then(resolve),
      };
      return builder;
    },
  };
  return {
    admin: admin as unknown as Parameters<typeof drainNativePush>[0],
    installation,
    job,
  };
}

describe("native delivery worker", () => {
  it("cancels a queued warning when its category has since been disabled", async () => {
    const { admin, job } = fixture({ preference: false });
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await drainNativePush(admin, "device");
    expect(fetcher).not.toHaveBeenCalled();
    expect(job.provider_code).toBe("preference_disabled");
  });
  it("never sends an expired warning", async () => {
    const { admin, job } = fixture({ expired: true });
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await drainNativePush(admin, "device");
    expect(fetcher).not.toHaveBeenCalled();
    expect(job.provider_code).toBe("expired");
  });
  it("sends a generic APNs alert with a TTL bounded by the event deadline", async () => {
    const { admin, job } = fixture();
    const fetcher = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    const result = await drainNativePush(admin, "device");
    expect(result.accepted).toBe(1);
    const [url, init] = fetcher.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toContain("api.sandbox.push.apple.com/3/device/");
    const headers = new Headers(init.headers);
    expect(headers.get("apns-topic")).toBe("com.odlingsdagboken.app");
    expect(headers.get("authorization")).toMatch(
      /^bearer [^.]+\.[^.]+\.[^.]+$/,
    );
    expect(Number(headers.get("apns-expiration")) * 1000).toBeLessThanOrEqual(
      new Date(job.expires_at as string).getTime(),
    );
    const payload = JSON.parse(init.body as string);
    expect(payload.url).toBe("/app");
    expect(payload.aps.alert.title).toBe("Odlingsdagboken");
    expect(Object.keys(payload).sort()).toEqual(["aps", "eventId", "url"]);
  });
  it("retries a rotated token instead of disabling the new token", async () => {
    const { admin, installation, job } = fixture();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        installation.token = "b".repeat(64);
        return new Response(JSON.stringify({ reason: "Unregistered" }), {
          status: 410,
        });
      }),
    );
    const result = await drainNativePush(admin, "device");
    expect(result.retrying).toBe(1);
    expect(installation.enabled).toBe(true);
    expect(job.provider_code).toBe("token_rotated");
    expect(job.state).toBe("pending");
  });
  it("does not complete or count a job whose lease changed while sending", async () => {
    const { admin, job } = fixture();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        job.lease_id = "new-lease";
        return new Response(null, { status: 200 });
      }),
    );
    const result = await drainNativePush(admin, "device");
    expect(result.accepted).toBe(0);
    expect(job.state).toBeUndefined();
  });
});
