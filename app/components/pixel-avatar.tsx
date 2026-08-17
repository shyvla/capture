// Deterministic pixel avatar: every username gets its own little
// mirrored 5x5 sprite, so profiles have a picture without any uploads.

const BACKGROUNDS = ["#eaf7fc", "#f5ebc4", "#dceeff", "#ffffff"];
const SPRITES = ["#2a8bbc", "#2e4973", "#7cd4ec", "#d8bc57", "#ff9db1"];

function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function PixelAvatar({
  username,
  size = 36,
  className = "",
}: {
  username: string;
  size?: number;
  className?: string;
}) {
  const rng = mulberry32(hashString(username.toLowerCase()));
  const bg = BACKGROUNDS[Math.floor(rng() * BACKGROUNDS.length)];
  const fg = SPRITES[Math.floor(rng() * SPRITES.length)];
  const accent = SPRITES[Math.floor(rng() * SPRITES.length)];

  // 3 columns mirrored to 5 for symmetry.
  const cells: { x: number; y: number; c: string }[] = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      if (rng() > 0.45) {
        const c = rng() > 0.8 ? accent : fg;
        cells.push({ x: x + 1, y: y + 1, c });
        if (x < 2) cells.push({ x: 5 - x, y: y + 1, c });
      }
    }
  }

  return (
    <svg
      className={`rounded-full border-2 border-[var(--blue-deep)] ${className}`}
      width={size}
      height={size}
      viewBox="0 0 7 7"
      shapeRendering="crispEdges"
      role="img"
      aria-label={`@${username}'s avatar`}
    >
      <rect x="0" y="0" width="7" height="7" fill={bg} />
      {cells.map((cell, i) => (
        <rect key={i} x={cell.x} y={cell.y} width="1" height="1" fill={cell.c} />
      ))}
    </svg>
  );
}
