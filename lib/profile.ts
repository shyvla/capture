import type { SupabaseClient } from "@supabase/supabase-js";
import {
  hydratePostRows,
  POST_SELECT,
  type FeedPost,
  type PostRow,
} from "@/lib/feed";

export type ProfileInfo = {
  id: string;
  username: string;
  displayName: string;
  joinedAt: string;
};

export type ProfileStats = {
  followers: number;
  following: number;
  totalLikes: number;
};

export type ProfilePageData = {
  profile: ProfileInfo;
  isOwn: boolean;
  viewerFollows: boolean;
  stats: ProfileStats;
  /** All of the user's posts, newest first. */
  posts: FeedPost[];
};

/** Everything the profile page needs, or null if the username doesn't exist. */
export async function fetchProfilePage(
  supabase: SupabaseClient,
  viewerId: string,
  username: string
): Promise<ProfilePageData | null> {
  // ilike with no wildcards = case-insensitive equality, so /u/Star_Trainer works.
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, username, display_name, created_at")
    .ilike("username", username)
    .maybeSingle();
  if (profileErr) throw new Error(`profile query failed: ${profileErr.message}`);
  if (!profile) return null;

  const [postsRes, followersRes, followingRes, viewerFollowRes] =
    await Promise.all([
      supabase
        .from("posts")
        .select(POST_SELECT)
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("followee_id", profile.id),
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profile.id),
      supabase
        .from("follows")
        .select("followee_id")
        .eq("follower_id", viewerId)
        .eq("followee_id", profile.id)
        .maybeSingle(),
    ]);
  if (postsRes.error)
    throw new Error(`profile posts query failed: ${postsRes.error.message}`);

  const rows = (postsRes.data ?? []) as unknown as PostRow[];
  const posts = await hydratePostRows(
    supabase,
    viewerId,
    rows.map((row) => ({ row, isDiscovery: false }))
  );

  return {
    profile: {
      id: profile.id,
      username: profile.username,
      displayName: profile.display_name,
      joinedAt: profile.created_at,
    },
    isOwn: profile.id === viewerId,
    viewerFollows: Boolean(viewerFollowRes.data),
    stats: {
      followers: followersRes.count ?? 0,
      following: followingRes.count ?? 0,
      totalLikes: posts.reduce((sum, p) => sum + p.likeCount, 0),
    },
    posts,
  };
}
