-- Contraya avatars bucket: stores each user's profile picture.
--
-- Mirrors the documents bucket's security posture (private, folder-scoped RLS
-- keyed on the owner's user id), with two differences:
--  * Smaller size cap (2MB) and images only; profile pictures are downscaled
--    to a small JPEG on-device before upload.
--  * An UPDATE policy is included so the client can upsert-overwrite the single
--    object at {user_id}/avatar.jpg in place (documents are immutable, so they
--    have no update policy).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/*'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Object paths are {user_id}/avatar.jpg; the first folder segment must match
-- the caller's uid on every operation.
create policy "read own avatar" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "upload own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "update own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "delete own avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
