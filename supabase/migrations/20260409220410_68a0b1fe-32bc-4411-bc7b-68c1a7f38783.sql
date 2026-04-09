-- sync-brevo-contacts: Add auth check via CRON_SECRET
-- (This is handled in the edge function code, not DB)

-- Create a public view for blog comments that excludes user_id
CREATE OR REPLACE VIEW public.blog_comments_public AS
SELECT id, post_id, display_name, content, created_at
FROM public.blog_comments;

-- Grant access to the view
GRANT SELECT ON public.blog_comments_public TO anon;
GRANT SELECT ON public.blog_comments_public TO authenticated;