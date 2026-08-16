// Hand-drawn pixel art as inline SVG so it stays crisp at any size.

export function PixelStar({
  className = "",
  size = 24,
  color = "var(--yellow)",
}: {
  className?: string;
  size?: number;
  color?: string;
}) {
  // 7x7 four-pointed sparkle
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 7 7"
      shapeRendering="crispEdges"
      aria-hidden
    >
      <g fill={color}>
        <rect x="3" y="0" width="1" height="7" />
        <rect x="0" y="3" width="7" height="1" />
        <rect x="2" y="2" width="3" height="3" />
      </g>
      <rect x="3" y="3" width="1" height="1" fill="var(--white)" />
    </svg>
  );
}

export function PixelCamera({
  className = "",
  size = 72,
}: {
  className?: string;
  size?: number;
}) {
  // 16x13 retro instant camera with a yellow shutter button
  return (
    <svg
      className={className}
      width={size}
      height={(size * 13) / 16}
      viewBox="0 0 16 13"
      shapeRendering="crispEdges"
      aria-hidden
    >
      {/* body */}
      <rect x="1" y="3" width="14" height="9" fill="var(--blue)" />
      <rect x="1" y="3" width="14" height="1" fill="var(--blue-sky)" />
      <rect x="1" y="11" width="14" height="1" fill="var(--blue-deep)" />
      {/* outline */}
      <rect x="0" y="3" width="1" height="9" fill="var(--blue-deep)" />
      <rect x="15" y="3" width="1" height="9" fill="var(--blue-deep)" />
      <rect x="1" y="2" width="14" height="1" fill="var(--blue-deep)" />
      <rect x="1" y="12" width="14" height="1" fill="var(--blue-deep)" />
      {/* viewfinder bump */}
      <rect x="4" y="1" width="4" height="1" fill="var(--blue-deep)" />
      <rect x="4" y="2" width="4" height="1" fill="var(--blue)" />
      {/* lens */}
      <rect x="6" y="5" width="5" height="5" fill="var(--blue-deep)" />
      <rect x="7" y="6" width="3" height="3" fill="var(--blue-pale)" />
      <rect x="7" y="6" width="1" height="1" fill="var(--white)" />
      {/* shutter button */}
      <rect x="12" y="4" width="2" height="1" fill="var(--yellow)" />
      {/* film slot */}
      <rect x="2" y="9" width="3" height="2" fill="var(--white)" />
      <rect x="2" y="9" width="3" height="1" fill="var(--yellow-soft)" />
      {/* flash */}
      <rect x="2" y="4" width="2" height="2" fill="var(--yellow)" />
      <rect x="2" y="4" width="1" height="1" fill="var(--yellow-soft)" />
    </svg>
  );
}

export function PixelCloud({
  className = "",
  width = 96,
}: {
  className?: string;
  width?: number;
}) {
  return (
    <svg
      className={className}
      width={width}
      height={width / 2}
      viewBox="0 0 16 8"
      shapeRendering="crispEdges"
      aria-hidden
    >
      <g fill="var(--white)">
        <rect x="2" y="3" width="12" height="4" />
        <rect x="4" y="1" width="5" height="2" />
        <rect x="9" y="2" width="4" height="1" />
        <rect x="0" y="4" width="2" height="2" />
        <rect x="14" y="4" width="2" height="2" />
      </g>
    </svg>
  );
}

/** A cheerful star buddy — Capture's unofficial mascot. */
export function StarBuddy({
  className = "",
  size = 56,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 11 11"
      shapeRendering="crispEdges"
      aria-hidden
    >
      <g fill="var(--yellow)">
        <rect x="5" y="0" width="1" height="1" />
        <rect x="4" y="1" width="3" height="1" />
        <rect x="4" y="2" width="3" height="1" />
        <rect x="0" y="3" width="11" height="1" />
        <rect x="1" y="4" width="9" height="1" />
        <rect x="2" y="5" width="7" height="1" />
        <rect x="2" y="6" width="7" height="1" />
        <rect x="1" y="7" width="4" height="1" />
        <rect x="6" y="7" width="4" height="1" />
        <rect x="1" y="8" width="3" height="1" />
        <rect x="7" y="8" width="3" height="1" />
        <rect x="0" y="9" width="2" height="1" />
        <rect x="9" y="9" width="2" height="1" />
      </g>
      {/* face */}
      <rect x="3" y="4" width="1" height="1" fill="var(--blue-deep)" />
      <rect x="7" y="4" width="1" height="1" fill="var(--blue-deep)" />
      <rect x="4" y="6" width="3" height="1" fill="var(--blue-deep)" />
      {/* blush */}
      <rect x="2" y="5" width="1" height="1" fill="#ff9db1" />
      <rect x="8" y="5" width="1" height="1" fill="#ff9db1" />
    </svg>
  );
}

/** Decorative pixel sky used behind auth pages. */
export function PixelSky() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <PixelStar className="star-twinkle absolute left-[8%] top-[12%]" size={20} />
      <PixelStar className="star-twinkle-slow absolute left-[18%] top-[38%]" size={12} color="var(--white)" />
      <PixelStar className="star-twinkle absolute left-[6%] top-[70%]" size={16} />
      <PixelStar className="star-twinkle-slow absolute right-[10%] top-[15%]" size={16} color="var(--white)" />
      <PixelStar className="star-twinkle absolute right-[20%] top-[45%]" size={22} />
      <PixelStar className="star-twinkle-slow absolute right-[7%] top-[75%]" size={14} />
      <PixelStar className="star-twinkle absolute left-[42%] top-[6%]" size={12} color="var(--white)" />
      <PixelCloud className="absolute left-[12%] top-[22%] opacity-80" width={110} />
      <PixelCloud className="absolute right-[14%] top-[60%] opacity-70" width={90} />
      <PixelCloud className="absolute left-[30%] bottom-[8%] opacity-60" width={70} />
    </div>
  );
}
