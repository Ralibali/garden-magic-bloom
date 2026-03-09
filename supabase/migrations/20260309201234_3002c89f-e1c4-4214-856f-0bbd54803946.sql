
-- Page views table for analytics
CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  referrer text,
  user_agent text,
  session_id text,
  device_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert page views" ON public.page_views
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can read page views" ON public.page_views
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_page_views_created_at ON public.page_views (created_at);
CREATE INDEX idx_page_views_path ON public.page_views (path);
CREATE INDEX idx_page_views_session_id ON public.page_views (session_id);

-- Click events table for analytics
CREATE TABLE public.click_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  element_id text,
  element_text text,
  path text,
  session_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.click_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert click events" ON public.click_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can read click events" ON public.click_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_click_events_created_at ON public.click_events (created_at);
CREATE INDEX idx_click_events_event_name ON public.click_events (event_name);

-- Blog comments table
CREATE TABLE public.blog_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.blog_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  display_name text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments" ON public.blog_comments
  FOR SELECT TO public USING (true);

CREATE POLICY "Auth users can insert comments" ON public.blog_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.blog_comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any comment" ON public.blog_comments
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_blog_comments_post_id ON public.blog_comments (post_id);
