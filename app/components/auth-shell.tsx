import Image from "next/image";
import { PixelSky, PixelStar } from "./pixel-art";

/** Shared frame for the auth pages: pixel sky, logo, and a pixel card. */
export function AuthShell({
  tagline,
  children,
}: {
  tagline: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-10">
      <PixelSky />

      <header className="relative z-10 mb-8 flex flex-col items-center gap-3 text-center">
        <Image
          src="/piplup.gif"
          alt="Piplup, Capture's mascot"
          width={96}
          height={96}
          unoptimized
        />
        <h1 className="font-pixel text-3xl text-blue-deep [text-shadow:4px_4px_0_var(--yellow)]">
          CAPTURE
        </h1>
        <p className="flex items-center gap-2 text-2xl text-blue-brand">
          <PixelStar size={14} />
          {tagline}
          <PixelStar size={14} />
        </p>
      </header>

      <div className="pixel-card relative z-10 w-full max-w-md p-8">
        {children}
      </div>
    </main>
  );
}
