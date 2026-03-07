
-- Step 1: Drop old höns-related tables (order matters due to foreign keys)
DROP TABLE IF EXISTS public.chore_completions CASCADE;
DROP TABLE IF EXISTS public.daily_chores CASCADE;
DROP TABLE IF EXISTS public.health_logs CASCADE;
DROP TABLE IF EXISTS public.egg_logs CASCADE;
DROP TABLE IF EXISTS public.hatchings CASCADE;
DROP TABLE IF EXISTS public.hens CASCADE;
DROP TABLE IF EXISTS public.flocks CASCADE;
DROP TABLE IF EXISTS public.feed_records CASCADE;
DROP TABLE IF EXISTS public.coop_settings CASCADE;
DROP TABLE IF EXISTS public.achievement_rewards CASCADE;
DROP TABLE IF EXISTS public.daily_ai_tip CASCADE;

-- Step 2: Add climate_zone to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS climate_zone integer DEFAULT 3;

-- Step 3: Create beds table
CREATE TABLE public.beds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own beds" ON public.beds FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Step 4: Create sowings table
CREATE TABLE public.sowings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bed_id uuid REFERENCES public.beds(id) ON DELETE SET NULL,
  variety text NOT NULL,
  sow_date date NOT NULL,
  type text NOT NULL DEFAULT 'direct',
  transplant_date date,
  status text NOT NULL DEFAULT 'sown',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.sowings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sowings" ON public.sowings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Step 5: Create harvests table
CREATE TABLE public.harvests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sowing_id uuid REFERENCES public.sowings(id) ON DELETE SET NULL,
  bed_id uuid REFERENCES public.beds(id) ON DELETE SET NULL,
  variety text NOT NULL,
  harvest_date date NOT NULL,
  weight_grams integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.harvests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own harvests" ON public.harvests FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Step 6: Add updated_at triggers
CREATE TRIGGER update_beds_updated_at BEFORE UPDATE ON public.beds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sowings_updated_at BEFORE UPDATE ON public.sowings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
