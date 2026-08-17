import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/app/components/app-header";
import { PixelSky } from "@/app/components/pixel-art";
import { CameraBooth } from "@/app/components/camera/camera-booth";

// The Photo Booth. The proxy redirects signed-out visitors to /login, and
// this double-checks in case the route is reached another way.
export default async function CameraPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <PixelSky />
      </div>

      <AppHeader myUsername={profile?.username} />

      <main className="relative mx-auto w-full max-w-[52rem] flex-1 px-4 pb-16 pt-6">
        <CameraBooth userId={user.id} username={profile?.username ?? ""} />
      </main>
    </div>
  );
}
