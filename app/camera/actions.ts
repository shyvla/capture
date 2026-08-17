"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CAPTION_CHAR_LIMIT, CAPTION_RULE } from "@/lib/validation";

type CreatePostResult =
  | { ok: true; postId: string }
  | { ok: false; error: string };

/**
 * Create a post from a file the client already uploaded to the `posts`
 * storage bucket. Inserts the posts row (post_id is DB-generated) plus its
 * post_media row; RLS restricts both to the signed-in author.
 */
export async function createPost(
  caption: string,
  storagePath: string
): Promise<CreatePostResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const trimmed = caption.trim();
  if (trimmed.length > CAPTION_CHAR_LIMIT) {
    return { ok: false, error: CAPTION_RULE };
  }

  // The upload policy already scopes writes to the user's own folder; this
  // guards against posting a path that points at someone else's file.
  if (
    !storagePath.startsWith(`${user.id}/`) ||
    !/\.(png|jpe?g|gif)$/i.test(storagePath)
  ) {
    return { ok: false, error: "Invalid media path" };
  }

  const { data: post, error: postErr } = await supabase
    .from("posts")
    .insert({ user_id: user.id, caption: trimmed })
    .select("post_id")
    .single();
  if (postErr || !post) return { ok: false, error: "Could not create the post" };

  const { error: mediaErr } = await supabase.from("post_media").insert({
    post_id: post.post_id,
    position: 0,
    storage_path: storagePath,
  });
  if (mediaErr) {
    // Don't leave a caption-only ghost post behind.
    await supabase.from("posts").delete().eq("post_id", post.post_id);
    return { ok: false, error: "Could not attach your photo" };
  }

  // New post should show up at the top of the feed and on the profile.
  revalidatePath("/", "layout");
  return { ok: true, postId: post.post_id };
}
