begin;
insert into auth.users(id) values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
do $$
declare
  device uuid := '33333333-3333-4333-8333-333333333333';
  a uuid := '11111111-1111-4111-8111-111111111111';
  b uuid := '22222222-2222-4222-8222-222222222222';
  ga uuid := '44444444-4444-4444-8444-444444444444';
  gb uuid := '55555555-5555-4555-8555-555555555555';
  first_job public.native_push_deliveries%rowtype;
  second_job public.native_push_deliveries%rowtype;
  n integer;
begin
  assert not has_table_privilege('authenticated','public.native_push_installations','SELECT'), 'tokens exposed';
  assert not has_table_privilege('anon','public.native_push_revocations','INSERT'), 'anonymous direct writes';
  assert not has_function_privilege('authenticated','public.register_native_push(uuid,uuid,text,uuid,text,text,text,text)','EXECUTE'), 'RPC exposed';
  assert public.register_native_push(device,a,repeat('a',64),ga,'apns','sandbox','com.odlingsdagboken.app',repeat('c',64));
  assert not public.register_native_push(device,b,repeat('a',64),ga,'apns','sandbox','com.odlingsdagboken.app',repeat('d',64)), 'same generation changed owner';
  assert public.enqueue_native_push(a,'test:lease','test')=1;
  assert public.enqueue_native_push(a,'test:lease','test')=0, 'duplicate event';
  assert public.enqueue_native_push(a,'frost:2000-01-01','frost')=0, 'obsolete frost warning';
  select * into first_job from public.claim_native_push(device);
  assert first_job.attempts=1;
  assert not exists(select 1 from public.claim_native_push(device)), 'two active leases';
  update public.native_push_deliveries set lease_until=now()-interval '1 minute' where id=first_job.id;
  select * into second_job from public.claim_native_push(device);
  assert second_job.lease_id<>first_job.lease_id and second_job.attempts=2;
  update public.native_push_deliveries set state='sent' where id=first_job.id and lease_id=first_job.lease_id;
  get diagnostics n=row_count;
  assert n=0, 'stale worker completed newer lease';
  perform public.unregister_native_push(device,repeat('a',64),ga);
  assert not public.register_native_push(device,a,repeat('a',64),ga,'apns','sandbox','com.odlingsdagboken.app',repeat('c',64)), 'late register revived logout';
  assert public.register_native_push(device,b,repeat('a',64),gb,'apns','sandbox','com.odlingsdagboken.app',repeat('d',64));
  perform public.unregister_native_push(device,repeat('a',64),ga);
  assert exists(select 1 from public.native_push_installations where id=device and user_id=b and generation=gb and enabled), 'old cleanup disabled B';
  assert not public.register_native_push(device,a,repeat('f',64),ga,'apns','sandbox','com.odlingsdagboken.app',repeat('e',64)), 'secret overwritten';
  assert public.enqueue_native_push(a,'old-owner','daily')=0, 'old user can receive';
  assert public.enqueue_native_push(b,'new-owner','daily')=1;
  -- Revocation arrives before an in-flight first registration.
  perform public.unregister_native_push('66666666-6666-4666-8666-666666666666',repeat('a',64),ga);
  assert not public.register_native_push('66666666-6666-4666-8666-666666666666',a,repeat('a',64),ga,'apns','sandbox','com.odlingsdagboken.app',repeat('f',64));
  delete from auth.users where id=b;
  assert not exists(select 1 from public.native_push_installations where id=device), 'account deletion left device';
  assert not exists(select 1 from public.native_push_deliveries where installation_id=device), 'account deletion left delivery';
end $$;
rollback;
