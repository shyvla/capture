import Link from "next/link";
import { PixelPlane, PixelSky } from "@/app/components/pixel-art";

// Placeholder until the messages feature is built.
export default function MessagesPage() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <PixelSky />
      <PixelPlane className="pixel-bob relative z-10" size={72} />
      <h1 className="font-pixel relative z-10 text-lg text-blue-deep [text-shadow:3px_3px_0_var(--yellow)]">
        DIRECT MESSAGES
      </h1>
      <p className="relative z-10 max-w-sm text-2xl text-blue-brand">
        Your messages are still in the darkroom — this page is coming soon!
      </p>
      <Link href="/" className="pixel-btn pixel-btn-yellow relative z-10">
        BACK TO FEED
      </Link>
    </main>
  );
}
