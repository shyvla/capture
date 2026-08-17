import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchProfilePage } from "@/lib/profile";
import { AppHeader } from "@/app/components/app-header";
import { ProfileView } from "@/app/components/profile/profile-view";
import { PixelSky } from "@/app/components/pixel-art";

type Params = Promise<{ username: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username} ✦ Capture` };
}

export default async function ProfilePage({ params }: { params: Params }) {
  const { username } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: me }, data] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", user.id).single(),
    fetchProfilePage(supabase, user.id, decodeURIComponent(username)),
  ]);
  if (!data) notFound();

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <PixelSky />
      </div>

      <AppHeader myUsername={me?.username ?? ""} />

      {/* No z-index here: modals inside must be able to layer above the z-40
          header, and DOM order already keeps main above the fixed sky. */}
      <main className="relative mx-auto w-full max-w-[40rem] flex-1 px-4 pb-16 pt-6">
        <ProfileView data={data} />
      </main>
    </div>
  );
}
