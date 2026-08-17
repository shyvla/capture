"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { FeedComment, FeedPost } from "@/lib/feed";
import { addComment, setCommentLike, setPostLike } from "@/app/feed/actions";
import { timeAgo } from "@/lib/format";
import { COMMENT_WORD_LIMIT, countWords } from "@/lib/validation";
import { PixelAvatar } from "@/app/components/pixel-avatar";
import { PixelChatBubble, PixelHeart, PixelStar } from "@/app/components/pixel-art";

const PREVIEW_COMMENTS = 2;

function CommentRow({
  comment,
  onToggleLike,
}: {
  comment: FeedComment;
  onToggleLike?: (comment: FeedComment) => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <Link
        href={`/u/${comment.author.username}`}
        aria-label={`@${comment.author.username}'s profile`}
      >
        <PixelAvatar username={comment.author.username} size={26} />
      </Link>
      <p className="flex-1 text-xl leading-tight">
        <Link
          href={`/u/${comment.author.username}`}
          className="font-pixel text-[0.5rem] text-blue-deep hover:underline"
        >
          @{comment.author.username}
        </Link>{" "}
        {comment.comment}
      </p>
      <button
        type="button"
        className="pixel-icon-btn mt-1"
        aria-label={comment.likedByMe ? "Unlike comment" : "Like comment"}
        onClick={onToggleLike ? () => onToggleLike(comment) : undefined}
        disabled={!onToggleLike}
      >
        <PixelHeart size={12} filled={comment.likedByMe} />
        <span className="text-base text-blue-brand">{comment.likeCount}</span>
      </button>
    </div>
  );
}

export function PostCard({ post }: { post: FeedPost }) {
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [comments, setComments] = useState<FeedComment[]>(post.comments);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [posting, startPosting] = useTransition();

  const toggleLike = () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((n) => Math.max(0, n + (next ? 1 : -1)));
    setPostLike(post.postId, next).then((res) => {
      if (!res.ok) {
        setLiked(!next);
        setLikeCount((n) => Math.max(0, n + (next ? -1 : 1)));
      }
    });
  };

  const toggleCommentLike = (target: FeedComment) => {
    const next = !target.likedByMe;
    const patch = (delta: number, isLiked: boolean) =>
      setComments((cs) =>
        cs.map((c) =>
          c.id === target.id
            ? { ...c, likedByMe: isLiked, likeCount: Math.max(0, c.likeCount + delta) }
            : c
        )
      );
    patch(next ? 1 : -1, next);
    setCommentLike(target.id, next).then((res) => {
      if (!res.ok) patch(next ? -1 : 1, !next);
    });
  };

  const submitComment = () => {
    const text = draft.trim();
    if (!text || posting) return;
    if (countWords(text) > COMMENT_WORD_LIMIT) {
      setCommentError(`Keep it under ${COMMENT_WORD_LIMIT} words!`);
      return;
    }
    setCommentError(null);
    startPosting(async () => {
      const res = await addComment(post.postId, text);
      if (res.ok) {
        setComments((cs) => [...cs, res.comment]);
        setCommentCount((n) => n + 1);
        setDraft("");
      } else {
        setCommentError(res.error);
      }
    });
  };

  const words = countWords(draft);

  return (
    <article className="pixel-card overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Link
          href={`/u/${post.author.username}`}
          className="flex min-w-0 flex-1 items-center gap-3"
          aria-label={`@${post.author.username}'s profile`}
        >
          <PixelAvatar username={post.author.username} size={38} />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="font-pixel block truncate text-[0.6rem] text-blue-deep">
              {post.author.displayName}
            </span>
            <span className="block truncate text-lg text-blue-brand">
              @{post.author.username}
            </span>
          </span>
        </Link>
        {post.isDiscovery && <span className="pixel-badge">✦ suggested</span>}
        <span className="text-lg text-blue-brand">{timeAgo(post.createdAt)}</span>
      </div>

      {/* media */}
      <div className="relative border-y-4 border-[var(--blue-deep)] bg-blue-pale">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.media[mediaIndex]}
          alt={`Film photo by @${post.author.username}`}
          className="aspect-square w-full object-cover"
          style={{ imageRendering: "pixelated" }}
          loading="lazy"
        />
        {post.media.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              className="pixel-btn pixel-btn-white absolute left-2 top-1/2 -translate-y-1/2 !p-2"
              onClick={() =>
                setMediaIndex((i) => (i - 1 + post.media.length) % post.media.length)
              }
            >
              ◀
            </button>
            <button
              type="button"
              aria-label="Next photo"
              className="pixel-btn pixel-btn-white absolute right-2 top-1/2 -translate-y-1/2 !p-2"
              onClick={() => setMediaIndex((i) => (i + 1) % post.media.length)}
            >
              ▶
            </button>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
              {post.media.map((_, i) => (
                <span
                  key={i}
                  className="h-2 w-2 border border-[var(--blue-deep)]"
                  style={{
                    background: i === mediaIndex ? "var(--yellow)" : "var(--white)",
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="space-y-2 px-4 py-3">
        {/* actions */}
        <div className="flex items-center gap-5">
          <button
            type="button"
            className="pixel-icon-btn"
            aria-label={liked ? "Unlike post" : "Like post"}
            aria-pressed={liked}
            onClick={toggleLike}
          >
            <PixelHeart size={22} filled={liked} />
            <span className="text-xl text-blue-deep">{likeCount}</span>
          </button>
          <button
            type="button"
            className="pixel-icon-btn"
            aria-label="Show comments"
            onClick={() => setDrawerOpen(true)}
          >
            <PixelChatBubble size={22} />
            <span className="text-xl text-blue-deep">{commentCount}</span>
          </button>
        </div>

        {/* caption */}
        {post.caption && (
          <p className="text-xl leading-tight">
            <Link
              href={`/u/${post.author.username}`}
              className="font-pixel text-[0.5rem] text-blue-deep hover:underline"
            >
              @{post.author.username}
            </Link>{" "}
            {post.caption}
          </p>
        )}

        {/* top comments */}
        {comments.slice(0, PREVIEW_COMMENTS).map((c) => (
          <CommentRow key={c.id} comment={c} onToggleLike={toggleCommentLike} />
        ))}
        {commentCount > PREVIEW_COMMENTS && (
          <button
            type="button"
            className="text-lg text-blue-brand underline underline-offset-4"
            onClick={() => setDrawerOpen(true)}
          >
            view all {commentCount} comments
          </button>
        )}
      </div>

      {/* comments drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(46,73,115,0.55)] p-4 sm:items-center"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="pixel-card flex max-h-[80vh] w-full max-w-md flex-col"
            role="dialog"
            aria-label={`Comments on @${post.author.username}'s post`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-4 border-[var(--blue-deep)] px-4 py-3">
              <h2 className="font-pixel flex items-center gap-2 text-[0.65rem] text-blue-deep">
                <PixelStar size={14} /> COMMENTS ({commentCount})
              </h2>
              <button
                type="button"
                className="font-pixel text-[0.65rem] text-blue-brand"
                aria-label="Close comments"
                onClick={() => setDrawerOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {comments.length === 0 && (
                <p className="text-xl text-blue-brand">
                  No comments yet — say something nice ✦
                </p>
              )}
              {comments.map((c) => (
                <CommentRow key={c.id} comment={c} onToggleLike={toggleCommentLike} />
              ))}
            </div>
            <div className="border-t-4 border-[var(--blue-deep)] px-4 py-3">
              {commentError && (
                <p className="pixel-alert-error mb-2">{commentError}</p>
              )}
              <div className="flex gap-2">
                <input
                  className="pixel-input"
                  placeholder="Add a comment…"
                  value={draft}
                  maxLength={600}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitComment();
                  }}
                />
                <button
                  type="button"
                  className="pixel-btn pixel-btn-yellow"
                  disabled={posting || !draft.trim()}
                  onClick={submitComment}
                >
                  POST
                </button>
              </div>
              <p
                className={`mt-1 text-base ${
                  words > COMMENT_WORD_LIMIT ? "text-red-700" : "text-blue-brand"
                }`}
              >
                {words}/{COMMENT_WORD_LIMIT} words
              </p>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
