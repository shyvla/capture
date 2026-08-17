import type { SupabaseClient } from "@supabase/supabase-js";
import { postMediaUrl } from "@/lib/media";

/**
 * Feed pagination. Two interleaved streams — posts from people you follow
 * (plus your own) and "discovery" posts from everyone else — each with its
 * own created_at cursor, packed into one opaque token for the client.
 * A page is 6 followed posts with a discovery post injected after every 3rd.
 */

const FOLLOWED_PER_PAGE = 6;
const DISCOVERY_PER_PAGE = 2;
const INJECT_EVERY = 3;
const GLOBAL_PER_PAGE = 8;

export type FeedAuthor = { username: string; displayName: string };

export type FeedComment = {
  id: number;
  comment: string;
  likeCount: number;
  createdAt: string;
  likedByMe: boolean;
  author: FeedAuthor;
};

export type FeedPost = {
  postId: string;
  caption: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  likedByMe: boolean;
  isDiscovery: boolean;
  author: FeedAuthor;
  media: string[];
  /** All loaded comments, sorted most-liked first (ties: oldest first). */
  comments: FeedComment[];
};

export type FeedPage = { posts: FeedPost[]; nextCursor: string | null };

type Cursor = { f?: string; d?: string };

const encodeCursor = (c: Cursor) =>
  Buffer.from(JSON.stringify(c)).toString("base64url");

function decodeCursor(raw: string | null): Cursor {
  if (!raw) return {};
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    return {};
  }
}

// The !fkey hints are required: posts/comments also relate to profiles
// through the like junction tables, which would make the embed ambiguous.
export const POST_SELECT = `post_id, user_id, caption, like_count, comment_count, created_at,
  author:profiles!posts_user_id_fkey(username, display_name),
  media:post_media(storage_path, position),
  comments(id, comment, like_count, created_at, author:profiles!comments_user_id_fkey(username, display_name))`;

type AuthorRow = { username: string; display_name: string };
export type PostRow = {
  post_id: string;
  caption: string;
  like_count: number;
  comment_count: number;
  created_at: string;
  author: AuthorRow;
  media: { storage_path: string; position: number }[];
  comments: {
    id: number;
    comment: string;
    like_count: number;
    created_at: string;
    author: AuthorRow;
  }[];
};

async function queryPosts(
  supabase: SupabaseClient,
  opts: {
    authorIds?: string[];
    excludeAuthorIds?: string[];
    before?: string;
    limit: number;
  }
): Promise<PostRow[]> {
  let q = supabase
    .from("posts")
    .select(POST_SELECT)
    .order("created_at", { ascending: false })
    .limit(opts.limit);
  if (opts.authorIds) q = q.in("user_id", opts.authorIds);
  if (opts.excludeAuthorIds?.length)
    q = q.not("user_id", "in", `(${opts.excludeAuthorIds.join(",")})`);
  if (opts.before) q = q.lt("created_at", opts.before);
  const { data, error } = await q;
  if (error) throw new Error(`feed query failed: ${error.message}`);
  return (data ?? []) as unknown as PostRow[];
}

export async function fetchFeedPage(
  supabase: SupabaseClient,
  userId: string,
  cursorRaw: string | null
): Promise<FeedPage> {
  const cursor = decodeCursor(cursorRaw);

  const { data: followRows, error: followErr } = await supabase
    .from("follows")
    .select("followee_id")
    .eq("follower_id", userId);
  if (followErr) throw new Error(`follows query failed: ${followErr.message}`);
  const followees = (followRows ?? []).map((r) => r.followee_id as string);

  let picked: { row: PostRow; isDiscovery: boolean }[] = [];
  let hasMore = false;
  let next: Cursor = {};

  if (followees.length > 0) {
    const circle = [...followees, userId];
    const followed = await queryPosts(supabase, {
      authorIds: circle,
      before: cursor.f,
      limit: FOLLOWED_PER_PAGE,
    });
    // If the followed stream is running dry, backfill the page with discovery.
    const discoveryAsk =
      DISCOVERY_PER_PAGE + Math.max(0, FOLLOWED_PER_PAGE - followed.length);
    const discovery = await queryPosts(supabase, {
      excludeAuthorIds: circle,
      before: cursor.d,
      limit: discoveryAsk,
    });

    const queue = [...discovery];
    followed.forEach((row, i) => {
      picked.push({ row, isDiscovery: false });
      if ((i + 1) % INJECT_EVERY === 0 && queue.length)
        picked.push({ row: queue.shift()!, isDiscovery: true });
    });
    if (followed.length < FOLLOWED_PER_PAGE)
      while (queue.length) picked.push({ row: queue.shift()!, isDiscovery: true });

    const usedDiscovery = discovery.length - queue.length;
    hasMore =
      followed.length === FOLLOWED_PER_PAGE || discovery.length === discoveryAsk;
    next = {
      f: followed.at(-1)?.created_at ?? cursor.f,
      d: usedDiscovery > 0 ? discovery[usedDiscovery - 1].created_at : cursor.d,
    };
  } else {
    // Nothing followed yet: fall back to a global feed.
    const all = await queryPosts(supabase, {
      before: cursor.f,
      limit: GLOBAL_PER_PAGE,
    });
    picked = all.map((row) => ({ row, isDiscovery: false }));
    hasMore = all.length === GLOBAL_PER_PAGE;
    next = { f: all.at(-1)?.created_at ?? cursor.f };
  }

  const posts = await hydratePostRows(supabase, userId, picked);
  return { posts, nextCursor: hasMore ? encodeCursor(next) : null };
}

/**
 * Turn raw post rows into client-ready FeedPosts: look up which posts and
 * comments the viewer already liked, sort media/comments, build image URLs.
 * Shared by the feed and profile pages.
 */
export async function hydratePostRows(
  supabase: SupabaseClient,
  viewerId: string,
  picked: { row: PostRow; isDiscovery: boolean }[]
): Promise<FeedPost[]> {
  // Which of these posts/comments has the viewer already liked?
  const postIds = picked.map((p) => p.row.post_id);
  const commentIds = picked.flatMap((p) => p.row.comments.map((c) => c.id));
  const [likedPostRows, likedCommentRows] = await Promise.all([
    postIds.length
      ? supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", viewerId)
          .in("post_id", postIds)
      : { data: [] },
    commentIds.length
      ? supabase
          .from("comment_likes")
          .select("comment_id")
          .eq("user_id", viewerId)
          .in("comment_id", commentIds)
      : { data: [] },
  ]);
  const likedPosts = new Set((likedPostRows.data ?? []).map((r) => r.post_id));
  const likedComments = new Set(
    (likedCommentRows.data ?? []).map((r) => r.comment_id)
  );

  return picked.map(({ row, isDiscovery }) => ({
    postId: row.post_id,
    caption: row.caption,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    createdAt: row.created_at,
    likedByMe: likedPosts.has(row.post_id),
    isDiscovery,
    author: {
      username: row.author.username,
      displayName: row.author.display_name,
    },
    media: [...row.media]
      .sort((a, b) => a.position - b.position)
      .map((m) => postMediaUrl(m.storage_path)),
    comments: [...row.comments]
      .sort(
        (a, b) =>
          b.like_count - a.like_count ||
          a.created_at.localeCompare(b.created_at)
      )
      .map((c) => ({
        id: c.id,
        comment: c.comment,
        likeCount: c.like_count,
        createdAt: c.created_at,
        likedByMe: likedComments.has(c.id),
        author: {
          username: c.author.username,
          displayName: c.author.display_name,
        },
      })),
  }));
}
