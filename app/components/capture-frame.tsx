import Link from "next/link";

export function CaptureHeader() {
  return (
    <header className="z-20 flex items-center justify-between gap-4 bg-capture-blue px-6 py-5 text-white sm:px-10">
      <Link href="/" className="text-3xl font-bold">
        Capture
      </Link>
      <p className="text-2xl font-bold">Save the moment</p>
    </header>
  );
}

export function CaptureFooter() {
  return (
    <footer className="z-20 flex flex-wrap items-center justify-between gap-x-12 gap-y-2 bg-capture-blue px-6 py-6 text-white sm:px-10">
      <p className="font-semibold">Don&apos;t Sue Me</p>
      <p className="font-semibold">
        By using Capture, you agree to allow us to collect, use, and sell all
        of your personal information.
      </p>
    </footer>
  );
}

function Polaroid({ className }: { className: string }) {
  return (
    <div
      className={`absolute h-56 w-44 rounded-xs bg-white p-3 pb-12 shadow-[0_12px_28px_rgba(0,0,0,0.2)] ${className}`}
      aria-hidden
    >
      <div className="h-full w-full bg-[#dcdcdc]" />
    </div>
  );
}

// Scattered blank polaroids behind the card, matching the Figma mockup.
function PolaroidBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <Polaroid className="left-[4%] top-[8%] -rotate-6" />
      <Polaroid className="hidden left-[28%] top-[7%] rotate-5 md:block" />
      <Polaroid className="hidden left-[53%] top-[9%] -rotate-3 md:block" />
      <Polaroid className="right-[4%] top-[8%] rotate-6" />
      <Polaroid className="left-[3%] top-[56%] rotate-7" />
      <Polaroid className="hidden left-[28%] top-[59%] -rotate-5 md:block" />
      <Polaroid className="hidden left-[54%] top-[57%] rotate-4 md:block" />
      <Polaroid className="right-[3%] top-[58%] -rotate-6" />
    </div>
  );
}

export function CaptureFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-pixel flex flex-1 flex-col text-black">
      <CaptureHeader />

      <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="absolute inset-0 flex flex-col" aria-hidden>
          <div className="flex-1 bg-capture-sky" />
          <div className="flex-1 bg-capture-paper" />
        </div>
        <PolaroidBackdrop />
        <div className="relative z-10 w-full max-w-2xl">{children}</div>
      </main>

      <CaptureFooter />
    </div>
  );
}
