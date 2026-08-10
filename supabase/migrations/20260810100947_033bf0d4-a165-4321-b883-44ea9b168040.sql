CREATE OR REPLACE FUNCTION public.get_recent_user_activity(_limit integer DEFAULT 200, _user_id uuid DEFAULT NULL)
RETURNS TABLE(
  activity_id text,
  user_id uuid,
  display_name text,
  email text,
  activity_type text,
  title text,
  detail text,
  occurred_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH events AS (
    SELECT 'signup:' || p.id::text AS activity_id, p.user_id, 'signup'::text AS activity_type,
           'Skapade konto'::text AS title, coalesce(p.location_name, 'Zon ' || p.climate_zone::text) AS detail, p.created_at AS occurred_at
    FROM profiles p
    UNION ALL
    SELECT 'bed:' || b.id::text, b.user_id, 'bed', 'Ny bädd', b.name, b.created_at FROM beds b
    UNION ALL
    SELECT 'sowing:' || s.id::text, s.user_id, 'sowing', 'Sådd', s.variety, s.created_at FROM sowings s
    UNION ALL
    SELECT 'harvest:' || h.id::text, h.user_id, 'harvest', 'Skörd', h.variety || ' – ' || round(h.weight_grams / 1000.0, 2)::text || ' kg', h.created_at FROM harvests h
    UNION ALL
    SELECT 'photo:' || pp.id::text, pp.user_id, 'photo', 'Foto', pp.caption, pp.created_at FROM plant_photos pp
    UNION ALL
    SELECT 'plant:' || mp.id::text, mp.user_id, 'plant', 'Ny krukväxt', coalesce(mp.custom_name, mp.location), mp.created_at FROM my_plants mp
    UNION ALL
    SELECT 'care:' || pce.id::text, pce.user_id, 'care', 'Växtvård', pce.event_type, pce.created_at FROM plant_care_events pce
    UNION ALL
    SELECT 'seed:' || si.id::text, si.user_id, 'seed', 'Frölager', si.variety, si.created_at FROM seed_inventory si
    UNION ALL
    SELECT 'pest:' || pl.id::text, pl.user_id, 'pest', 'Skadedjur', pl.pest_name, pl.created_at FROM pest_logs pl
    UNION ALL
    SELECT 'feedback:' || f.id::text, f.user_id, 'feedback', 'Feedback', left(f.message, 160), f.created_at FROM feedback f
    UNION ALL
    SELECT 'comment:' || bc.id::text, bc.user_id, 'comment', 'Bloggkommentar', left(bc.content, 160), bc.created_at FROM blog_comments bc
    UNION ALL
    SELECT 'season:' || ss.id::text, ss.user_id, 'season', 'Säsongssummering', ss.year::text, ss.created_at FROM season_summaries ss
  )
  SELECT e.activity_id, e.user_id, p.display_name, p.email, e.activity_type, e.title, e.detail, e.occurred_at
  FROM events e
  LEFT JOIN profiles p ON p.user_id = e.user_id
  WHERE has_role(auth.uid(), 'admin')
    AND (_user_id IS NULL OR e.user_id = _user_id)
  ORDER BY e.occurred_at DESC
  LIMIT least(coalesce(_limit, 200), 500)
$$;

REVOKE ALL ON FUNCTION public.get_recent_user_activity(integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recent_user_activity(integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_user_activity(integer, uuid) TO service_role;