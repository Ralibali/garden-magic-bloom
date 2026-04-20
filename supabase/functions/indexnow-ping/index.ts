// IndexNow-ping för Bing/Yandex/Seznam när en sida publiceras.
// Triggas från Postgres-trigger (pg_net) eller manuellt från admin-panelen.
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const HOST = "odlingsdagboken.com";
const KEY = "cf82dd06e2cee2bb8a1101be1c96df38";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

const Body = z.object({
  paths: z.array(z.string().min(1).max(500)).min(1).max(10000),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400, headers: corsHeaders });
  }

  const urlList = parsed.data.paths.map(p => `https://${HOST}${p.startsWith("/") ? p : "/" + p}`);

  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  };

  const results: Array<{ endpoint: string; status: number; ok: boolean }> = [];
  for (const endpoint of ["https://api.indexnow.org/indexnow", "https://www.bing.com/indexnow"]) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
      });
      // Consume body to avoid leaks
      await res.text();
      results.push({ endpoint, status: res.status, ok: res.ok });
    } catch (e) {
      results.push({ endpoint, status: 0, ok: false });
      console.error("IndexNow error:", endpoint, e);
    }
  }

  return new Response(JSON.stringify({ pinged: urlList, results }), { headers: corsHeaders });
});
