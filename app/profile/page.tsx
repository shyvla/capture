import { redirect } from "next/navigation";
import {
  CaptureFooter,
  CaptureHeader,
} from "@/app/components/capture-frame";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

function HangingPolaroid({ className }: { className: string }) {
  return (
    <div
      className={`absolute w-48 -translate-x-1/2 rounded-xs bg-white p-3.5 pb-10 shadow-[0_16px_32px_rgba(0,0,0,0.16)] sm:w-60 sm:p-4 sm:pb-12 ${className}`}
    >
      <div className="aspect-square w-full bg-[#dcdcdc]" />
    </div>
  );
}

// A rope sagging across the page with photos pinned to it. The rope and the
// short hanger strings live in one stretched SVG; the polaroids are HTML
// positioned at the same x-percentages (viewBox x / 1600).
function PhotoLine() {
  return (
    <div className="absolute inset-0" aria-hidden>
      <svg
        viewBox="0 0 1600 1000"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <path
          d="M 0 290 Q 800 480 1600 330"
          fill="none"
          stroke="#a97c50"
          strokeWidth="4"
          vectorEffect="non-scaling-stroke"
        />
        <line x1="144" y1="321" x2="152" y2="470" stroke="#a97c50" strokeWidth="4" vectorEffect="non-scaling-stroke" />
        <line x1="448" y1="370" x2="444" y2="500" stroke="#a97c50" strokeWidth="4" vectorEffect="non-scaling-stroke" className="hidden md:block" />
        <line x1="752" y1="394" x2="758" y2="520" stroke="#a97c50" strokeWidth="4" vectorEffect="non-scaling-stroke" />
        <line x1="1104" y1="390" x2="1098" y2="510" stroke="#a97c50" strokeWidth="4" vectorEffect="non-scaling-stroke" className="hidden md:block" />
        <line x1="1440" y1="357" x2="1446" y2="490" stroke="#a97c50" strokeWidth="4" vectorEffect="non-scaling-stroke" />
      </svg>

      {/* Placeholder slots — wire these to the user's uploads once the
          photobooth and a photos table exist. */}
      <HangingPolaroid className="left-[9%] top-[44%] -rotate-8" />
      <HangingPolaroid className="hidden left-[28%] top-[48%] -rotate-2 md:block" />
      <HangingPolaroid className="left-[47%] top-[50%] rotate-4" />
      <HangingPolaroid className="hidden left-[69%] top-[49%] -rotate-4 md:block" />
      <HangingPolaroid className="left-[90%] top-[46%] rotate-5" />
    </div>
  );
}

function ProfileView({ username }: { username: string }) {
  return (
    <div className="font-pixel flex flex-1 flex-col text-black">
      <CaptureHeader />

      <main className="relative min-h-[38rem] flex-1 overflow-hidden bg-capture-paper">
        <PhotoLine />

        <div className="absolute left-[5%] top-12 z-10">
          <div className="h-28 w-28 rounded-full bg-[#b3b3b3] sm:h-36 sm:w-36" />
          <p className="mt-4 text-2xl font-bold">@{username}</p>
        </div>
      </main>

      <CaptureFooter />
    </div>
  );
}

export default async function ProfilePage() {
  // Until Supabase credentials are in .env.local there are no accounts to
  // load, so render the page with preview data instead of redirecting.
  // Once configured, the real auth guard below takes over.
  if (!isSupabaseConfigured()) {
    return <ProfileView username="previewuser" />;
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

  return <ProfileView username={profile?.username ?? user.email ?? "me"} />;
}
