import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { PixelPlane, PixelStar } from "@/app/components/pixel-art";
import { PixelAvatar } from "@/app/components/pixel-avatar";

/** Sticky top bar shared by the signed-in pages (feed, profile, …). */
export function AppHeader({ myUsername }: { myUsername?: string }) {
  return (
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
          {myUsername && (
            <Link
              href={`/u/${myUsername}`}
              aria-label="My profile"
              className="pixel-icon-btn"
            >
              <PixelAvatar username={myUsername} size={30} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
