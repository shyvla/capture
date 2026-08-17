"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FeedComment } from "@/lib/feed";
import {
  COMMENT_CHAR_LIMIT,
  COMMENT_RULE,
  COMMENT_WORD_LIMIT,
  countWords,
} from "@/lib/validation";

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Like (or unlike) a post. The DB trigger keeps like_count in sync. */
export async function setPostLike(
  postId: string,
  liked: boolean
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = liked
    ? await supabase
        .from("post_likes")
        .upsert(
          { post_id: postId, user_id: user.id },
          { ignoreDuplicates: true }
        )
    : await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);

  if (error) return { ok: false, error: "Could not update the like" };
  return { ok: true };
}

/** Like (or unlike) a comment. */
export async function setCommentLike(
  commentId: number,
  liked: boolean
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = liked
    ? await supabase
        .from("comment_likes")
        .upsert(
          { comment_id: commentId, user_id: user.id },
          { ignoreDuplicates: true }
        )
    : await supabase
        .from("comment_likes")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", user.id);

  if (error) return { ok: false, error: "Could not update the like" };
  return { ok: true };
}

/** Delete one of the viewer's own posts (RLS blocks anyone else's). */
export async function deletePost(postId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not signed in" };

  // Grab the media paths before the row (and its cascade) disappears.
  const { data: media } = await supabase
    .from("post_media")
    .select("storage_path")
    .eq("post_id", postId);

  const { error, count } = await supabase
    .from("posts")
    .delete({ count: "exact" })
    .eq("post_id", postId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "Could not delete the post" };
  if (!count) return { ok: false, error: "Post not found" };

  // Best effort: clear the files from storage (the post row is already gone).
  const paths = (media ?? []).map((m) => m.storage_path);
  if (paths.length) await supabase.storage.from("posts").remove(paths);

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Add a comment (up to 50 words) and return it for optimistic UI. */
export async function addComment(
  postId: string,
  text: string
): Promise<{ ok: true; comment: FeedComment } | { ok: false; error: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const comment = text.trim();
  if (!comment) return { ok: false, error: "Write something first!" };
  if (countWords(comment) > COMMENT_WORD_LIMIT || comment.length > COMMENT_CHAR_LIMIT) {
    return { ok: false, error: COMMENT_RULE };
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, user_id: user.id, comment })
    .select(
      "id, comment, like_count, created_at, author:profiles!comments_user_id_fkey(username, display_name)"
    )
    .single();
  if (error || !data) return { ok: false, error: "Could not post your comment" };

  const author = data.author as unknown as {
    username: string;
    display_name: string;
  };
  return {
    ok: true,
    comment: {
      id: data.id,
      comment: data.comment,
      likeCount: data.like_count,
      createdAt: data.created_at,
      likedByMe: false,
      author: { username: author.username, displayName: author.display_name },
    },
  };
}
