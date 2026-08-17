-- Deleting a post removes its files from the posts bucket; users may only
-- touch files inside their own folder (uploads are namespaced by user id).
create policy "Users can delete their own post media files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'posts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
