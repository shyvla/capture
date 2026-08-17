import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchFeedPage } from "@/lib/feed";
import { AppHeader } from "@/app/components/app-header";
import { FeedClient } from "@/app/components/feed/feed-client";
import { StoriesRow } from "@/app/components/feed/stories-row";
import { PixelSky } from "@/app/components/pixel-art";

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

      <AppHeader myUsername={profile?.username} />

      {/* No z-index here: modals inside must be able to layer above the z-40
          header, and DOM order already keeps main above the fixed sky. */}
      <main className="relative mx-auto w-full max-w-[40rem] flex-1 px-4 pb-16 pt-6">
        <p className="mb-4 text-xl text-blue-brand">
          hi{" "}
          {profile ? (
            <Link
              href={`/u/${profile.username}`}
              className="underline underline-offset-4"
            >
              @{profile.username}
            </Link>
          ) : (
            "@friend"
          )}
          , here&apos;s what everyone captured ✦
        </p>
        <StoriesRow myUsername={profile?.username ?? "you"} />
        <FeedClient initialPosts={feed.posts} initialCursor={feed.nextCursor} />
      </main>
    </div>
  );
}
