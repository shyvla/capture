/** Public URL for a file in the `posts` storage bucket. */
export function postMediaUrl(storagePath: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/posts/${storagePath}`;
}
