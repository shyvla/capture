import Link from "next/link";
import { AppHeader } from "@/app/components/app-header";
import { PixelSky, StarBuddy } from "@/app/components/pixel-art";

export default function ProfileNotFound() {
  return (
    <div className="relative flex flex-1 flex-col">
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <PixelSky />
      </div>
      <AppHeader myUsername="" />
      <main className="relative mx-auto w-full max-w-[40rem] flex-1 px-4 pt-10">
        <div className="pixel-card flex flex-col items-center gap-4 px-6 py-10 text-center">
          <StarBuddy className="pixel-bob" size={64} />
          <p className="font-pixel text-[0.65rem] leading-relaxed text-blue-deep">
            404 ✦ NO SUCH TRAINER
          </p>
          <p className="text-xl text-blue-brand">
            We searched every roll of film — nobody by that name here.
          </p>
          <Link href="/" className="pixel-btn pixel-btn-yellow">
            BACK TO THE FEED
          </Link>
        </div>
      </main>
    </div>
  );
}
