// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
let db: PGlite;
const owner = "00000000-0000-4000-8000-000000000001",
  member = "00000000-0000-4000-8000-000000000002",
  stranger = "00000000-0000-4000-8000-000000000003",
  bed = "00000000-0000-4000-8000-000000000004";
async function asUser(id: string) {
  await db.exec(
    `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`,
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
 insert into auth.users values('${owner}'),('${member}'),('${stranger}');
 create table public.beds(id uuid primary key,user_id uuid not null,name text);alter table public.beds enable row level security;create policy own_beds on public.beds for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());grant all on public.beds to authenticated;
 insert into public.beds values('${bed}','${owner}','Min bädd');`,
  );
  for (const table of ["sowings", "harvests", "pest_logs"]) {
    await db.exec(
      `create table ${table}(id uuid primary key default gen_random_uuid(),user_id uuid default auth.uid(),bed_id uuid references beds(id),notes text);alter table ${table} enable row level security;create policy own_rows on ${table} for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());grant all on ${table} to authenticated;`,
    );
  }
  await db.exec(
    await readFile(
      new URL(
        "../../supabase/migrations/20261007165434_garden_planner_sharing_exchange.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
}, 30000);
afterAll(() => db?.close());
it("isolates strangers, supports single-use invitations and revokes access to shared records", async () => {
  await asUser(stranger);
  expect((await db.query("select * from beds")).rows).toHaveLength(0);
  await expect(db.query(`insert into bed_layouts(bed_id) values('${bed}')`))
    .rejects.toThrow();
  await asUser(owner);
  const token = (await db.query<{ token: string }>(
    "select create_garden_invitation() as token",
  )).rows[0].token;
  await asUser(member);
  await db.query("select accept_garden_invitation($1,$2)", [
    token,
    "Familjemedlem",
  ]);
  expect((await db.query("select * from beds")).rows).toHaveLength(1);
  await db.query(`insert into bed_layouts(bed_id) values('${bed}')`);
  await db.query(
    `insert into sowings(bed_id,notes) values('${bed}','Vi sådde tillsammans')`,
  );
  await asUser(stranger);
  await expect(
    db.query("select accept_garden_invitation($1,$2)", [token, "Obehörig"]),
  ).rejects.toThrow();
  expect((await db.query("select * from sowings")).rows).toHaveLength(0);
  await asUser(owner);
  expect((await db.query("select * from sowings")).rows).toHaveLength(1);
  await expect(db.query(`update sowings set user_id='${owner}'`)).rejects
    .toThrow();
  await db.query(`delete from garden_members where member_id='${member}'`);
  await asUser(member);
  expect((await db.query("select * from beds")).rows).toHaveLength(0);
  expect((await db.query("select * from sowings")).rows).toHaveLength(0);
});
it("keeps exchange conversations between their participants", async () => {
  await asUser(owner);
  const listing = (await db.query<{ id: string }>(
    `insert into seed_exchange_listings(title,crop,kind,offer,locality) values('Tomatfrön','Tomat','seed','swap','Linköping') returning id`,
  )).rows[0].id;
  await asUser(member);
  await db.query(
    "insert into seed_exchange_messages(listing_id,recipient_id,message) values($1,$2,$3)",
    [listing, owner, "Finns fröna kvar?"],
  );
  await asUser(stranger);
  expect((await db.query("select * from seed_exchange_messages")).rows)
    .toHaveLength(0);
  await expect(
    db.query(
      "insert into seed_exchange_messages(listing_id,recipient_id,message) values($1,$2,$3)",
      [listing, member, "spam"],
    ),
  ).rejects.toThrow();
  await asUser(owner);
  expect((await db.query("select * from seed_exchange_messages")).rows)
    .toHaveLength(1);
  await db.query(
    "insert into seed_exchange_messages(listing_id,recipient_id,message) values($1,$2,$3)",
    [listing, member, "Ja"],
  );
  await db.query("update seed_exchange_listings set status=$1 where id=$2", [
    "closed",
    listing,
  ]);
  await asUser(member);
  expect((await db.query("select * from seed_exchange_messages")).rows)
    .toHaveLength(2);
  await expect(
    db.query(
      "insert into seed_exchange_messages(listing_id,recipient_id,message) values($1,$2,$3)",
      [listing, owner, "nytt"],
    ),
  ).rejects.toThrow();
});
