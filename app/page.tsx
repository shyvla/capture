import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchFeedPage } from "@/lib/feed";
import { signOut } from "@/app/auth/actions";
import { FeedClient } from "@/app/components/feed/feed-client";
import { StoriesRow } from "@/app/components/feed/stories-row";
import { PixelPlane, PixelSky, PixelStar } from "@/app/components/pixel-art";

// Home = the film feed. The proxy redirects signed-out visitors to /login,
// and this double-checks in case the route is reached another way.
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, feed] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", user.id)
      .single(),
    fetchFeedPage(supabase, user.id, null),
  ]);

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <PixelSky />
      </div>

      <header className="sticky top-0 z-40 border-b-4 border-[var(--blue-deep)] bg-[rgba(244,250,255,0.88)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-[40rem] items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="font-pixel flex items-center gap-2 text-sm text-blue-deep [text-shadow:2px_2px_0_var(--yellow)]"
          >
            <PixelStar size={18} /> CAPTURE
          </Link>
          <div className="flex items-center gap-4">
            <form action={signOut}>
              <button type="submit" className="pixel-link">
                SIGN OUT
              </button>
            </form>
            <Link
              href="/messages"
              aria-label="Direct messages"
              className="pixel-icon-btn"
            >
              <PixelPlane size={28} />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-[40rem] flex-1 px-4 pb-16 pt-6">
        <p className="mb-4 text-xl text-blue-brand">
          hi @{profile?.username ?? "friend"}, here&apos;s what everyone captured ✦
        </p>
        <StoriesRow myUsername={profile?.username ?? "you"} />
        <FeedClient initialPosts={feed.posts} initialCursor={feed.nextCursor} />
      </main>
    </div>
  );
}
