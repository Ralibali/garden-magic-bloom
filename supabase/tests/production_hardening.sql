begin;

select plan(9);

select has_table('public', 'garden_reminders', 'garden_reminders table exists');
select has_function('public', 'consume_gro_quota', array['uuid', 'date', 'integer'], 'atomic quota function exists');
select has_function('public', 'merge_reminder_settings', array['jsonb'], 'settings merge function exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.garden_reminders'::regclass),
  'row level security is enabled for reminders'
);

 delete from public.gro_usage
 where user_id = '11111111-1111-4111-8111-111111111111'::uuid
   and usage_date = '2026-06-26'::date;

select is(
  public.consume_gro_quota('11111111-1111-4111-8111-111111111111'::uuid, '2026-06-26'::date, 3),
  1,
  'first free Gro question is accepted'
);
select is(
  public.consume_gro_quota('11111111-1111-4111-8111-111111111111'::uuid, '2026-06-26'::date, 3),
  2,
  'second free Gro question is accepted'
);
select is(
  public.consume_gro_quota('11111111-1111-4111-8111-111111111111'::uuid, '2026-06-26'::date, 3),
  3,
  'third free Gro question is accepted'
);
select is(
  public.consume_gro_quota('11111111-1111-4111-8111-111111111111'::uuid, '2026-06-26'::date, 3),
  null::integer,
  'fourth free Gro question is rejected atomically'
);
select is(
  (select message_count from public.gro_usage where user_id = '11111111-1111-4111-8111-111111111111'::uuid and usage_date = '2026-06-26'::date),
  3,
  'stored quota never exceeds the limit'
);

select * from finish();
rollback;
