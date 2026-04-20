-- Create public bucket for SEO plant images
insert into storage.buckets (id, name, public)
values ('seo-plant-images', 'seo-plant-images', true)
on conflict (id) do nothing;

-- Public read
create policy "Public read seo-plant-images"
on storage.objects for select
using (bucket_id = 'seo-plant-images');

-- Admins can upload/update/delete
create policy "Admins manage seo-plant-images"
on storage.objects for all
to authenticated
using (bucket_id = 'seo-plant-images' and public.has_role(auth.uid(), 'admin'))
with check (bucket_id = 'seo-plant-images' and public.has_role(auth.uid(), 'admin'));

-- Service role bypasses RLS automatically; explicit policy not needed.