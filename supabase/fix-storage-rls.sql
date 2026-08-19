-- Fix partnership-images storage bucket and RLS policies
-- Run in Supabase SQL Editor if uploads fail with "row-level security policy"

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('partnership-images', 'partnership-images', true, 52428800, null)
on conflict (id) do update
set
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = null;

-- storage.objects RLS는 Supabase에서 기본 활성화됨 (alter table 불필요)

drop policy if exists "partnership_images_public_read" on storage.objects;
create policy "partnership_images_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'partnership-images');

drop policy if exists "partnership_images_admin_upload" on storage.objects;
create policy "partnership_images_admin_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'partnership-images');

drop policy if exists "partnership_images_admin_update" on storage.objects;
create policy "partnership_images_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'partnership-images')
  with check (bucket_id = 'partnership-images');

drop policy if exists "partnership_images_admin_delete" on storage.objects;
create policy "partnership_images_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'partnership-images');

-- 게시글 이미지·동영상: 비로그인 사용자도 업로드 허용
drop policy if exists "partnership_images_board_upload" on storage.objects;
create policy "partnership_images_board_upload"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'partnership-images'
    and (
      name like 'board-images/%'
      or name like 'board-videos/%'
      or (storage.foldername(name))[1] in ('board-images', 'board-videos')
    )
  );

drop policy if exists "partnership_images_board_update" on storage.objects;
create policy "partnership_images_board_update"
  on storage.objects for update
  to anon, authenticated
  using (
    bucket_id = 'partnership-images'
    and (
      name like 'board-images/%'
      or name like 'board-videos/%'
      or (storage.foldername(name))[1] in ('board-images', 'board-videos')
    )
  )
  with check (
    bucket_id = 'partnership-images'
    and (
      name like 'board-images/%'
      or name like 'board-videos/%'
      or (storage.foldername(name))[1] in ('board-images', 'board-videos')
    )
  );

notify pgrst, 'reload schema';
