"use client";

import { useEffect, useState, useTransition } from "react";
import type { FeedPost } from "@/lib/feed";
import type { ProfilePageData } from "@/lib/profile";
import { setFollow } from "@/app/u/actions";
import { PostCard } from "@/app/components/feed/post-card";
import { PixelAvatar } from "@/app/components/pixel-avatar";
import { PixelCamera, PixelStar, StarBuddy } from "@/app/components/pixel-art";

const FRAMES_PER_STRIP = 3;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Row of film sprocket holes along a strip's edge. */
function Sprockets() {
  return (
    <div className="flex justify-between px-2 py-1.5" aria-hidden>
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-[1px] bg-[var(--blue-pale)] opacity-80"
        />
      ))}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 border-2 border-[var(--blue-deep)] bg-[var(--blue-pale)] px-2 py-1">
      <span className="text-3xl leading-none text-blue-deep">{value}</span>
      <span className="font-pixel text-[0.45rem] text-blue-brand">{label}</span>
    </div>
  );
}

function FollowButton({
  followeeId,
  initialFollowing,
  onDelta,
}: {
  followeeId: string;
  initialFollowing: boolean;
  onDelta: (delta: number) => void;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [, startTransition] = useTransition();

  const toggle = () => {
    const next = !following;
    setFollowing(next);
    onDelta(next ? 1 : -1);
    startTransition(async () => {
      const res = await setFollow(followeeId, next);
      if (!res.ok) {
        setFollowing(!next);
        onDelta(next ? -1 : 1);
      }
    });
  };

  return (
    <button
      type="button"
      className={`pixel-btn ${following ? "pixel-btn-white" : "pixel-btn-yellow"}`}
      aria-pressed={following}
      onClick={toggle}
    >
      {following ? "FOLLOWING ✓" : "FOLLOW ✦"}
    </button>
  );
}

/** One frame on the contact sheet: first photo of a post, plus tiny chips. */
function FilmFrame({
  post,
  frameNumber,
  isFanFave,
  onOpen,
}: {
  post: FeedPost;
  frameNumber: number;
  isFanFave: boolean;
  onOpen: () => void;
}) {
  const isGif = post.media[0]?.toLowerCase().endsWith(".gif");
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <button
        type="button"
        className="group relative block w-full border-2 border-[var(--blue-pale)] transition-transform hover:-translate-y-0.5"
        aria-label={`Open post: ${post.caption || `capture #${frameNumber}`}`}
        onClick={onOpen}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.media[0]}
          alt={post.caption || `Capture #${frameNumber}`}
          className="aspect-square w-full object-cover"
          style={{ imageRendering: "pixelated" }}
          loading="lazy"
        />
        {isFanFave && (
          <span className="pixel-badge absolute left-1 top-1 flex items-center gap-1">
            <PixelStar size={10} /> FAN FAVE
          </span>
        )}
        {isGif && (
          <span className="pixel-badge absolute right-1 top-1">GIF</span>
        )}
        {post.media.length > 1 && (
          <span className="absolute bottom-1 right-1 border border-[var(--blue-deep)] bg-[var(--white)] px-1 font-pixel text-[0.4rem] text-blue-deep">
            ▣ {post.media.length}
          </span>
        )}
      </button>
      <div className="flex items-center justify-between px-0.5">
        <span className="font-pixel text-[0.4rem] text-[var(--blue-sky)]">
          Nº {String(frameNumber).padStart(2, "0")}
        </span>
        <span className="font-pixel text-[0.4rem] text-[var(--yellow-soft)]">
          ♥ {post.likeCount}
        </span>
      </div>
    </div>
  );
}

export function ProfileView({ data }: { data: ProfilePageData }) {
  const { profile, isOwn, stats } = data;
  // Posts live in state so deleting one updates the sheet and stats in place.
  const [posts, setPosts] = useState<FeedPost[]>(data.posts);
  const [followers, setFollowers] = useState(stats.followers);
  const [openPost, setOpenPost] = useState<FeedPost | null>(null);

  // Esc closes the lightbox.
  useEffect(() => {
    if (!openPost) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenPost(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openPost]);

  const maxLikes = Math.max(0, ...posts.map((p) => p.likeCount));
  const fanFaveId =
    maxLikes > 0 ? posts.find((p) => p.likeCount === maxLikes)?.postId : null;
  const strips = chunk(posts, FRAMES_PER_STRIP);
  const joined = new Date(profile.joinedAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-6">
      {/* hero */}
      <section className="pixel-card px-4 py-4 sm:px-6">
        <div className="flex items-start gap-4">
          <PixelAvatar
            username={profile.username}
            size={88}
            className="shrink-0 border-4"
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-pixel break-words text-sm leading-relaxed text-blue-deep [text-shadow:2px_2px_0_var(--yellow-soft)]">
              {profile.displayName}
            </h1>
            <p className="truncate text-xl text-blue-brand">
              @{profile.username}
            </p>
            <p className="mt-1 flex items-center gap-2 text-lg text-blue-brand">
              <PixelCamera size={16} /> {posts.length}{" "}
              {posts.length === 1 ? "capture" : "captures"} ✦ joined {joined}
            </p>
            <div className="mt-2">
              {isOwn ? (
                <span className="pixel-badge">✦ THIS IS YOU</span>
              ) : (
                <FollowButton
                  followeeId={profile.id}
                  initialFollowing={data.viewerFollows}
                  onDelta={(d) => setFollowers((n) => Math.max(0, n + d))}
                />
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <StatTile label="FOLLOWERS" value={followers} />
          <StatTile label="FOLLOWING" value={stats.following} />
          <StatTile
            label="TOTAL ♥"
            value={posts.reduce((sum, p) => sum + p.likeCount, 0)}
          />
        </div>
      </section>

      {/* contact sheet */}
      {posts.length === 0 ? (
        <div className="pixel-card flex flex-col items-center gap-4 px-6 py-10 text-center">
          <StarBuddy className="pixel-bob" size={64} />
          <p className="font-pixel text-[0.65rem] leading-relaxed text-blue-deep">
            NO CAPTURES YET
          </p>
          <p className="text-xl text-blue-brand">
            {isOwn
              ? "Visit the photo booth to shoot your first roll!"
              : `@${profile.username} hasn't developed any film yet ✦`}
          </p>
        </div>
      ) : (
        <section aria-label={`@${profile.username}'s captures`}>
          <h2 className="font-pixel mb-3 flex items-center gap-2 text-[0.65rem] text-blue-deep">
            <PixelStar size={14} /> THE CONTACT SHEET
          </h2>
          <div className="flex flex-col gap-5">
            {strips.map((strip, s) => (
              <div
                key={s}
                className="bg-[var(--blue-deep)] shadow-[6px_6px_0_rgba(46,73,115,0.35)]"
                style={{ transform: `rotate(${s % 2 === 0 ? 0.5 : -0.5}deg)` }}
              >
                <Sprockets />
                <div className="flex gap-2 px-2">
                  {strip.map((post, i) => (
                    <FilmFrame
                      key={post.postId}
                      post={post}
                      frameNumber={s * FRAMES_PER_STRIP + i + 1}
                      isFanFave={post.postId === fanFaveId}
                      onOpen={() => setOpenPost(post)}
                    />
                  ))}
                  {/* keep the last strip's frames the same size */}
                  {Array.from({
                    length: FRAMES_PER_STRIP - strip.length,
                  }).map((_, i) => (
                    <div key={`pad-${i}`} className="min-w-0 flex-1" aria-hidden />
                  ))}
                </div>
                <Sprockets />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* lightbox: the full post card, likes and comments included */}
      {openPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[rgba(46,73,115,0.55)] p-4"
          onClick={() => setOpenPost(null)}
        >
          <div
            // The photo is square and fills the card's width, so capping the
            // width by the viewport height keeps the whole post on screen.
            className="my-auto w-full max-w-[clamp(15.4rem,calc(110dvh-28.6rem),30.8rem)]"
            role="dialog"
            aria-label={`Post by @${profile.username}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                className="pixel-btn pixel-btn-white !px-3 !py-2"
                aria-label="Close post"
                onClick={() => setOpenPost(null)}
              >
                ✕ CLOSE
              </button>
            </div>
            <PostCard
              key={openPost.postId}
              post={openPost}
              canDelete={isOwn}
              onDeleted={(postId) => {
                setPosts((prev) => prev.filter((p) => p.postId !== postId));
                setOpenPost(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
