
CREATE OR REPLACE FUNCTION public.get_user_activity_stats()
RETURNS TABLE(
  user_id uuid,
  beds_count bigint,
  sowings_count bigint,
  harvests_count bigint,
  photos_count bigint,
  seeds_count bigint,
  pest_logs_count bigint,
  last_activity timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    (SELECT count(*) FROM beds b WHERE b.user_id = p.user_id),
    (SELECT count(*) FROM sowings s WHERE s.user_id = p.user_id),
    (SELECT count(*) FROM harvests h WHERE h.user_id = p.user_id),
    (SELECT count(*) FROM plant_photos pp WHERE pp.user_id = p.user_id),
    (SELECT count(*) FROM seed_inventory si WHERE si.user_id = p.user_id),
    (SELECT count(*) FROM pest_logs pl WHERE pl.user_id = p.user_id),
    GREATEST(
      (SELECT max(created_at) FROM beds b WHERE b.user_id = p.user_id),
      (SELECT max(created_at) FROM sowings s WHERE s.user_id = p.user_id),
      (SELECT max(created_at) FROM harvests h WHERE h.user_id = p.user_id),
      (SELECT max(created_at) FROM plant_photos pp WHERE pp.user_id = p.user_id)
    )
  FROM profiles p
  WHERE has_role(auth.uid(), 'admin')
$$;
