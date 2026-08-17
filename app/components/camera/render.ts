// Compositing + export pipeline for the Photo Booth. The same draw routine
// powers the live editing preview and the exported PNG/JPEG/GIF, so what you
// see while editing is exactly what gets posted.

import { GIFEncoder, quantize, applyPalette } from "gifenc";
import type { FilmFilter } from "./filters";
import {
  type StickerDef,
  stickerFrameCanvas,
  isAnimated,
  STICKER_FRAME_MS,
} from "./stickers";

export type Capture = {
  kind: "photo" | "video";
  /** ≥1 frame; all the same size. Video frames play at `fps`. */
  frames: HTMLCanvasElement[];
  fps: number;
  width: number;
  height: number;
};

export type PlacedSticker = {
  key: number;
  def: StickerDef;
  /** Sticker center as fractions (0..1) of the canvas size. */
  x: number;
  y: number;
  /** Sticker width as a fraction of the canvas width. */
  scale: number;
};

/** Storage bucket cap (matches the `posts` bucket file_size_limit). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function hasAnimatedStickers(stickers: PlacedSticker[]): boolean {
  return stickers.some((s) => isAnimated(s.def));
}

/** Pixel rect of a placed sticker — used for hit-testing and outlines. */
export function stickerRect(
  s: PlacedSticker,
  canvasW: number,
  canvasH: number
): { x: number; y: number; w: number; h: number } {
  const sprite = stickerFrameCanvas(s.def, 0);
  const w = s.scale * canvasW;
  const h = (w * sprite.height) / sprite.width;
  return { x: s.x * canvasW - w / 2, y: s.y * canvasH - h / 2, w, h };
}

// --- Film grain -------------------------------------------------------------

const GRAIN_TILES: HTMLCanvasElement[] = [];

function grainTile(variant: number): HTMLCanvasElement {
  if (GRAIN_TILES[variant]) return GRAIN_TILES[variant];
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  // Deterministic-ish noise; each variant gets its own scatter.
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  GRAIN_TILES[variant] = canvas;
  return canvas;
}

// --- Compositor ---------------------------------------------------------------

/**
 * Draw one finished frame (base + filter + grain + vignette + stickers) onto
 * `ctx`, which must belong to a canvas sized `capture.width` x `capture.height`.
 * `tMs` drives sticker animation and grain flicker.
 */
export function drawComposite(
  ctx: CanvasRenderingContext2D,
  capture: Capture,
  frameIndex: number,
  filter: FilmFilter,
  stickers: PlacedSticker[],
  tMs: number
): void {
  const { width: w, height: h } = capture;
  const frame = capture.frames[Math.min(frameIndex, capture.frames.length - 1)];

  ctx.clearRect(0, 0, w, h);
  ctx.filter = filter.css || "none";
  ctx.drawImage(frame, 0, 0, w, h);
  ctx.filter = "none";

  if (filter.grain > 0) {
    ctx.save();
    ctx.globalAlpha = filter.grain;
    ctx.globalCompositeOperation = "overlay";
    const tile = grainTile(Math.floor(tMs / 120) % 3);
    ctx.fillStyle = ctx.createPattern(tile, "repeat")!;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  if (filter.vignette > 0) {
    const g = ctx.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * 0.42,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.72
    );
    g.addColorStop(0, "rgba(18, 22, 42, 0)");
    g.addColorStop(1, `rgba(18, 22, 42, ${filter.vignette})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.imageSmoothingEnabled = false;
  for (const s of stickers) {
    const frameIdx = isAnimated(s.def)
      ? Math.floor(tMs / STICKER_FRAME_MS) % s.def.frames.length
      : 0;
    const sprite = stickerFrameCanvas(s.def, frameIdx);
    const r = stickerRect(s, w, h);
    ctx.drawImage(sprite, r.x, r.y, r.w, r.h);
  }
  ctx.imageSmoothingEnabled = true;
}

// --- Exporters ---------------------------------------------------------------

function compositeCanvas(
  capture: Capture,
  scale: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(capture.width * scale);
  canvas.height = Math.round(capture.height * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  return { canvas, ctx };
}

/** Export a still photo (filters + stickers frozen at frame 0). */
export async function exportStill(
  capture: Capture,
  filter: FilmFilter,
  stickers: PlacedSticker[],
  type: "image/png" | "image/jpeg"
): Promise<Blob> {
  const full = compositeCanvas(capture, 1);
  drawComposite(full.ctx, capture, 0, filter, stickers, 0);
  // JPEG has no alpha; PNG composits fine either way.
  const blob = await new Promise<Blob | null>((resolve) =>
    full.canvas.toBlob(resolve, type, 0.92)
  );
  if (!blob) throw new Error("Could not encode the image");
  return blob;
}

/**
 * Export an animated GIF. Videos use their captured frames; photos with
 * animated stickers loop through one sticker animation cycle. Retries at a
 * smaller scale if the encoded file would blow the storage cap.
 */
export async function exportGif(
  capture: Capture,
  filter: FilmFilter,
  stickers: PlacedSticker[],
  onProgress?: (done: number, total: number) => void
): Promise<Blob> {
  for (const scale of [1, 0.7, 0.5]) {
    const blob = await encodeGifAtScale(
      capture,
      filter,
      stickers,
      scale,
      onProgress
    );
    if (blob.size <= MAX_UPLOAD_BYTES) return blob;
  }
  throw new Error("GIF is too large to upload — try a shorter clip");
}

async function encodeGifAtScale(
  capture: Capture,
  filter: FilmFilter,
  stickers: PlacedSticker[],
  scale: number,
  onProgress?: (done: number, total: number) => void
): Promise<Blob> {
  const { canvas, ctx } = compositeCanvas(capture, scale);
  const { width: w, height: h } = canvas;

  // Video: every captured frame. Photo: one sticker animation cycle.
  const isVideo = capture.kind === "video";
  const cycle = Math.max(
    2,
    ...stickers.filter((s) => isAnimated(s.def)).map((s) => s.def.frames.length)
  );
  const totalFrames = isVideo ? capture.frames.length : cycle;
  const delay = isVideo ? Math.round(1000 / capture.fps) : STICKER_FRAME_MS;

  const gif = GIFEncoder();
  const scaled: Capture = { ...capture, width: w, height: h };

  for (let i = 0; i < totalFrames; i++) {
    const tMs = isVideo ? i * delay : i * STICKER_FRAME_MS;
    drawComposite(ctx, scaled, isVideo ? i : 0, filter, stickers, tMs);
    const { data } = ctx.getImageData(0, 0, w, h);
    // Per-frame palettes keep the film colors as rich as GIF allows.
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, w, h, { palette, delay, repeat: 0 });
    onProgress?.(i + 1, totalFrames);
    // Yield so the "developing…" UI can paint between frames.
    await new Promise((r) => setTimeout(r, 0));
  }

  gif.finish();
  const bytes = gif.bytes();
  return new Blob([bytes.slice().buffer], { type: "image/gif" });
}
