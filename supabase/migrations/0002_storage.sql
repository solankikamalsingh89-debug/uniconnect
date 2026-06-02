-- 1. Create a public bucket for Reels and Images
insert into storage.buckets (id, name, public) 
values ('reels', 'reels', true)
on conflict (id) do nothing;

-- 2. Allow public read access to the bucket
create policy "Public Access" 
on storage.objects for select 
using ( bucket_id = 'reels' );

-- 3. Allow authenticated users to upload files
create policy "Authenticated Users can upload media" 
on storage.objects for insert 
with check ( 
  bucket_id = 'reels' and 
  auth.role() = 'authenticated' 
);

-- 4. Allow users to update/delete their own uploads
create policy "Users can update their own media"
on storage.objects for update
using ( bucket_id = 'reels' and auth.uid() = owner );

create policy "Users can delete their own media"
on storage.objects for delete
using ( bucket_id = 'reels' and auth.uid() = owner );
