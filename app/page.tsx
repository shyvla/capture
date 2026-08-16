import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { PixelSky, StarBuddy } from "@/app/components/pixel-art";

// Placeholder home feed — the proxy redirects signed-out visitors to /login,
// and this double-checks in case the route is reached another way.
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .single();

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <PixelSky />
      <StarBuddy className="pixel-bob relative z-10" size={72} />
      <h1 className="font-pixel relative z-10 text-xl text-blue-deep [text-shadow:3px_3px_0_var(--yellow)]">
        Welcome, {profile?.display_name ?? "friend"}!
      </h1>
      <p className="relative z-10 text-2xl text-blue-brand">
        @{profile?.username} — your film feed is coming soon.
      </p>
      <form action={signOut} className="relative z-10">
        <button type="submit" className="pixel-btn pixel-btn-white">
          SIGN OUT
        </button>
      </form>
    </main>
  );
}
