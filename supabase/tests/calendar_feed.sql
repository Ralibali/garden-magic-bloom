begin;
insert into auth.users(id) values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
do $$
declare
  a uuid := '11111111-1111-4111-8111-111111111111';
  b uuid := '22222222-2222-4222-8222-222222222222';
  token_a text;
  token_a2 text;
  token_b text;
  hash_a text;
  n integer;
begin
  -- Klienter kan aldrig läsa tabellen eller slå upp tokens själva.
  assert not has_table_privilege('authenticated','public.calendar_feed_tokens','SELECT'), 'token hashes exposed';
  assert not has_table_privilege('anon','public.calendar_feed_tokens','SELECT'), 'token hashes exposed to anon';
  assert not has_function_privilege('authenticated','public.resolve_calendar_feed(text)','EXECUTE'), 'lookup exposed';
  assert not has_function_privilege('anon','public.create_calendar_feed_token()','EXECUTE'), 'anon can create feeds';
  assert has_function_privilege('authenticated','public.create_calendar_feed_token()','EXECUTE');

  perform set_config('request.jwt.claim.sub', a::text, true);
  token_a := public.create_calendar_feed_token();
  assert token_a ~ '^[a-f0-9]{64}$', 'token format';
  select token_hash into hash_a from public.calendar_feed_tokens where user_id = a;
  assert hash_a <> token_a, 'plaintext token stored';
  assert hash_a = encode(sha256(convert_to(token_a, 'UTF8')), 'hex'), 'hash mismatch';
  assert public.resolve_calendar_feed(hash_a) = a;
  assert (select last_accessed_at from public.calendar_feed_status()) is not null, 'access not recorded';
  select count(*) into n from public.calendar_feed_status();
  assert n = 1;

  -- En ny länk gör den gamla ogiltig.
  token_a2 := public.create_calendar_feed_token();
  assert token_a2 <> token_a;
  assert public.resolve_calendar_feed(hash_a) is null, 'rotated token still works';
  assert public.resolve_calendar_feed(encode(sha256(convert_to(token_a2, 'UTF8')), 'hex')) = a;

  -- B ser inte A:s status och kan inte stänga av A:s länk.
  perform set_config('request.jwt.claim.sub', b::text, true);
  select count(*) into n from public.calendar_feed_status();
  assert n = 0, 'status leaked across users';
  perform public.revoke_calendar_feed_token();
  assert exists(select 1 from public.calendar_feed_tokens where user_id = a), 'B revoked A';
  token_b := public.create_calendar_feed_token();
  assert public.resolve_calendar_feed(encode(sha256(convert_to(token_b, 'UTF8')), 'hex')) = b;

  -- A stänger av sin länk.
  perform set_config('request.jwt.claim.sub', a::text, true);
  perform public.revoke_calendar_feed_token();
  assert public.resolve_calendar_feed(encode(sha256(convert_to(token_a2, 'UTF8')), 'hex')) is null, 'revoked token still works';

  -- Skräp in ger null, aldrig fel.
  assert public.resolve_calendar_feed('inte-en-hash') is null;
  assert public.resolve_calendar_feed(null) is null;

  -- Utloggad användare kan inte skapa länk.
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    perform public.create_calendar_feed_token();
    assert false, 'anonymous create succeeded';
  exception when raise_exception then null;
  end;

  -- Kontot raderas → länken försvinner.
  delete from auth.users where id = b;
  assert not exists(select 1 from public.calendar_feed_tokens where user_id = b), 'token survived account deletion';
end $$;
rollback;
