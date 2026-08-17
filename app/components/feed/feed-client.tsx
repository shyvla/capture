"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedPage, FeedPost } from "@/lib/feed";
import { PostCard } from "@/app/components/feed/post-card";
import { StarBuddy } from "@/app/components/pixel-art";

/**
 * Endless scroll: an IntersectionObserver sentinel near the bottom of the
 * list requests the next page from /api/feed with the opaque cursor.
 */
export function FeedClient({
  initialPosts,
  initialCursor,
}: {
  initialPosts: FeedPost[];
  initialCursor: string | null;
}) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !cursor) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/feed?cursor=${encodeURIComponent(cursor)}`);
      if (!res.ok) throw new Error(`feed request failed (${res.status})`);
      const page: FeedPage = await res.json();
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.postId));
        return [...prev, ...page.posts.filter((p) => !seen.has(p.postId))];
      });
      setCursor(page.nextCursor);
    } catch {
      setError("Couldn't load more posts. Scroll to retry ✦");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [cursor]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { rootMargin: "600px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="flex flex-col gap-8">
      {posts.map((post) => (
        <PostCard key={post.postId} post={post} />
      ))}

      {posts.length === 0 && (
        <div className="pixel-card flex flex-col items-center gap-4 px-6 py-10 text-center">
          <StarBuddy className="pixel-bob" size={64} />
          <p className="font-pixel text-[0.65rem] leading-relaxed text-blue-deep">
            NO POSTS YET
          </p>
          <p className="text-xl text-blue-brand">
            Follow some friends or visit the photo booth to get things rolling!
          </p>
        </div>
      )}

      <div ref={sentinelRef} aria-hidden />

      <div className="flex flex-col items-center gap-2 pb-4 text-center">
        {loading && (
          <>
            <StarBuddy className="pixel-bob" size={40} />
            <p className="font-pixel text-[0.55rem] text-blue-deep">LOADING…</p>
          </>
        )}
        {error && <p className="pixel-alert-error">{error}</p>}
        {!cursor && posts.length > 0 && (
          <p className="font-pixel text-[0.55rem] leading-relaxed text-blue-deep">
            ✦ YOU&apos;RE ALL CAUGHT UP ✦
          </p>
        )}
      </div>
    </div>
  );
}
