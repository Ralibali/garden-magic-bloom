
-- Phase 1: Frost alerts
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location_lat double precision,
  ADD COLUMN IF NOT EXISTS location_lon double precision,
  ADD COLUMN IF NOT EXISTS location_name text,
  ADD COLUMN IF NOT EXISTS frost_alerts_enabled boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own push subscriptions" ON public.push_subscriptions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.frost_alert_log (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_date date NOT NULL,
  min_temp numeric,
  PRIMARY KEY (user_id, alert_date)
);
GRANT ALL ON public.frost_alert_log TO service_role;
ALTER TABLE public.frost_alert_log ENABLE ROW LEVEL SECURITY;
-- no policies: service-role only

-- Phase 3: Affiliate products
CREATE TABLE IF NOT EXISTS public.affiliate_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_label text,
  image_url text,
  affiliate_url text NOT NULL,
  partner text,
  category text NOT NULL CHECK (category IN ('frön','jord','verktyg','växthus','skadedjur','gödning','böcker','övrigt')),
  keywords text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.affiliate_products TO authenticated;
GRANT ALL ON public.affiliate_products TO service_role;
ALTER TABLE public.affiliate_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active products" ON public.affiliate_products
  FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "Admins read all products" ON public.affiliate_products
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert products" ON public.affiliate_products
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update products" ON public.affiliate_products
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete products" ON public.affiliate_products
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Seed inactive products (admin enables when affiliate URLs are filled in)
INSERT INTO public.affiliate_products (name, description, price_label, affiliate_url, category, keywords, sort_order) VALUES
('Nelson Garden Tomatfrön Mix', 'Blandning av 5 populära tomatsorter anpassade för svenskt klimat.', '49 kr', 'https://example.com/tomatfron', 'frön', ARRAY['tomat','tomatfrön','tomater'], 10),
('Runåbergs Fröer Sallatsmix', 'Ekologiska sallatsfrön – så i omgångar för skörd hela säsongen.', '39 kr', 'https://example.com/sallat', 'frön', ARRAY['sallat','sallad','sallatsfrön'], 20),
('Hasselfors Plantjord Eko', 'Torvfri ekologisk plantjord för förodling och omplantning.', '89 kr / 40L', 'https://example.com/plantjord', 'jord', ARRAY['jord','plantjord','förodling'], 30),
('Granngården Hönsgödsel', 'Naturligt gödselmedel. Perfekt för grönsaksland och pallkragar.', '79 kr / 10 kg', 'https://example.com/godsel', 'gödning', ARRAY['gödsel','gödning','näring'], 40),
('Fiskars Planteringsspade', 'Ergonomisk planteringsspade i rostfritt stål.', '149 kr', 'https://example.com/spade', 'verktyg', ARRAY['spade','planteringsspade','verktyg'], 50),
('Nelson Garden Miniväxthus', 'Kompakt miniväxthus för förodling på fönsterbrädan.', '199 kr', 'https://example.com/vaxthus', 'växthus', ARRAY['växthus','miniväxthus','förodling'], 60),
('Odla! av Sara Bäckmo', 'Sveriges mest populära odlingsbok. Steg för steg genom hela säsongen.', '229 kr', 'https://example.com/odla-bok', 'böcker', ARRAY['bok','odling','säsong'], 70),
('Pallkrageodling av Helena Sjögren', 'Allt om odling i pallkragar – perfekt för dig med liten trädgård.', '189 kr', 'https://example.com/pallkrage-bok', 'böcker', ARRAY['pallkrage','bok','trädgård'], 80);
