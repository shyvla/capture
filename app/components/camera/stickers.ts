// Pixel-art stickers for the Photo Booth. Each sticker is a tiny sprite
// described as rows of characters (palette below). Stickers with two frames
// are animated: they wiggle in the preview and are exported as GIF frames,
// which is what forces a photo with animated stickers to post as a .gif.

export const STICKER_FRAME_MS = 320;

export type StickerDef = {
  id: string;
  name: string;
  /** One frame = static sticker; two frames = animated. */
  frames: string[][];
  colors: Record<string, string>;
};

const YELLOW = "#ffd94a";
const YELLOW_DEEP = "#d8bc57";
const CREAM = "#fff3bf";
const BLUE = "#2a8bbc";
const BLUE_DEEP = "#2e4973";
const SKY = "#7cd4ec";
const PALE = "#eaf7fc";
const WHITE = "#ffffff";
const PINK = "#ff9db1";
const PINK_DEEP = "#e05e7a";

export const STICKERS: StickerDef[] = [
  {
    id: "star",
    name: "TWINKLE STAR",
    colors: { y: YELLOW, d: YELLOW_DEEP, w: CREAM },
    frames: [
      [
        ".....y.....",
        "....ywy....",
        "....yyy....",
        "yyyyyyyyyyy",
        ".yyyyyyyyy.",
        "..yyyyyyy..",
        "...yyyyy...",
        "...yy.yy...",
        "..yy...yy..",
        "..d.....d..",
      ],
      [
        ".....y.....",
        "....ywy....",
        "...yywyy...",
        "..yyywyyy..",
        "ywwwwwwwwwy",
        "..yyywyyy..",
        "...yywyy...",
        "....ywy....",
        ".....y.....",
        "...........",
      ],
    ],
  },
  {
    id: "sparkle",
    name: "SPARKLE",
    colors: { w: WHITE, s: SKY, b: BLUE },
    frames: [
      [
        "....w....",
        "....s....",
        "....w....",
        ".w..w..w.",
        "wswwbwwsw",
        ".w..w..w.",
        "....w....",
        "....s....",
        "....w....",
      ],
      [
        "w...s...w",
        ".w..w..w.",
        "..w.w.w..",
        "...www...",
        "swwwbwwws",
        "...www...",
        "..w.w.w..",
        ".w..w..w.",
        "w...s...w",
      ],
    ],
  },
  {
    id: "heart",
    name: "HEART",
    colors: { p: PINK, d: PINK_DEEP, w: WHITE },
    frames: [
      [
        "..pp...pp..",
        ".pwpp.pppp.",
        "pwwpppppppd",
        "ppppppppppd",
        "ppppppppppd",
        ".pppppppdd.",
        "..pppppdd..",
        "...ppppd...",
        "....ppd....",
        ".....p.....",
      ],
    ],
  },
  {
    id: "cloud",
    name: "PUFF CLOUD",
    colors: { w: WHITE, s: SKY, p: PALE },
    frames: [
      [
        "....wwww......",
        "..wwwwwwww....",
        ".wwwwwwwwwww..",
        "wwwwwwwwwwwww.",
        "wwwwwwwwwwwwww",
        "wpppwwwwwppww.",
        ".sspsssspssp..",
      ],
    ],
  },
  {
    id: "ghost",
    name: "SHY GHOST",
    colors: { w: WHITE, p: PALE, b: BLUE_DEEP, k: PINK },
    frames: [
      [
        "...wwww...",
        "..wwwwww..",
        ".wwwwwwww.",
        ".wbwwwbww.",
        ".wwwwwwww.",
        ".wwkwwkww.",
        ".wwwwwwww.",
        ".wwwwwwww.",
        ".w.ww.ww..",
        "..........",
      ],
      [
        "..........",
        "...wwww...",
        "..wwwwww..",
        ".wwwwwwww.",
        ".wbwwwbww.",
        ".wwwwwwww.",
        ".wwkwwkww.",
        ".wwwwwwww.",
        ".wwwwwwww.",
        ".ww.ww.w..",
      ],
    ],
  },
  {
    id: "pip",
    name: "PIXEL PAL",
    colors: {
      b: BLUE,
      d: BLUE_DEEP,
      s: SKY,
      w: WHITE,
      y: YELLOW,
      o: YELLOW_DEEP,
    },
    frames: [
      [
        "....dddd....",
        "...dbbbbd...",
        "..dbbbbbbd..",
        "..dbwbbwbd..",
        "..dbdbbdbd..",
        "..dbbyybbd..",
        ".dbbwwwwbbd.",
        ".dbwwwwwwbd.",
        ".dbwwwwwwbd.",
        "..dswwwwsd..",
        "..dbwwwwbd..",
        "...dbbbbd...",
        "...oy..yo...",
        "............",
      ],
      [
        "............",
        "....dddd....",
        "...dbbbbd...",
        "..dbbbbbbd..",
        "..dbwbbwbd..",
        "..dbdbbdbd..",
        "..dbbyybbd..",
        ".dbbwwwwbbd.",
        ".dbwwwwwwbd.",
        ".dbwwwwwwbd.",
        "..dswwwwsd..",
        "..dbwwwwbd..",
        "...dbbbbd...",
        "..oy....yo..",
      ],
    ],
  },
  {
    id: "bolt",
    name: "ZAP BOLT",
    colors: { y: YELLOW, o: YELLOW_DEEP, w: CREAM },
    frames: [
      [
        "....wyyy",
        "...wyyy.",
        "..wyyy..",
        "..yyyo..",
        ".yyyyyyo",
        "...yyyo.",
        "..yyyo..",
        "..yyo...",
        ".yyo....",
        ".yo.....",
        "yo......",
      ],
    ],
  },
];

const spriteCache = new Map<string, HTMLCanvasElement>();

/** Render one frame of a sticker at native sprite resolution (cached). */
export function stickerFrameCanvas(
  def: StickerDef,
  frame: number
): HTMLCanvasElement {
  const idx = frame % def.frames.length;
  const key = `${def.id}:${idx}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const rows = def.frames[idx];
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = def.colors[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  spriteCache.set(key, canvas);
  return canvas;
}

export function isAnimated(def: StickerDef): boolean {
  return def.frames.length > 1;
}
