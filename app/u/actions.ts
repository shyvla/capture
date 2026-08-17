"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

/** Follow (or unfollow) another user. */
export async function setFollow(
  followeeId: string,
  follow: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (user.id === followeeId)
    return { ok: false, error: "You can't follow yourself" };

  const { error } = follow
    ? await supabase
        .from("follows")
        .upsert(
          { follower_id: user.id, followee_id: followeeId },
          { ignoreDuplicates: true }
        )
    : await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("followee_id", followeeId);

  if (error) return { ok: false, error: "Could not update the follow" };
  // The feed's followed stream and any open profiles depend on this.
  revalidatePath("/", "layout");
  return { ok: true };
}
