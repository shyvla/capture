import { redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { CaptureFrame } from "@/app/components/capture-frame";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export default async function HomePage() {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  return (
    <CaptureFrame>
      <div className="rounded-3xl bg-capture-card px-8 py-9 text-center shadow-[0_18px_40px_rgba(0,0,0,0.25)] sm:px-11">
        <h1 className="mb-4 text-3xl font-bold sm:text-4xl">
          Welcome{profile?.username ? `, ${profile.username}` : ""}!
        </h1>
        <p className="text-lg">
          You&apos;re signed in as {user.email}. The feed and photobooth are
          coming soon.
        </p>
        <form action={logout} className="mt-8">
          <button
            type="submit"
            className="cursor-pointer text-lg font-semibold hover:underline"
          >
            Log Out
          </button>
        </form>
      </div>
    </CaptureFrame>
  );
}
