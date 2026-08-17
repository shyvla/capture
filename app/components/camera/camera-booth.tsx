"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { CAPTION_CHAR_LIMIT } from "@/lib/validation";
import { createPost } from "@/app/camera/actions";
import { FILM_FILTERS, type FilmFilter } from "./filters";
import { STICKERS, stickerFrameCanvas, type StickerDef } from "./stickers";
import {
  type Capture,
  type PlacedSticker,
  drawComposite,
  exportGif,
  exportStill,
  hasAnimatedStickers,
  stickerRect,
} from "./render";
import { PixelPrinter } from "@/app/components/pixel-art";

const CAPTURE_WIDTH = 640; // internal working resolution (longest side)
const VIDEO_FPS = 10;
const VIDEO_SECONDS = 5;

const STICKER_MIN_SCALE = 0.07;
const STICKER_MAX_SCALE = 0.8;
// The resize grab handle sits just outside the selection outline's corner.
const HANDLE_OFFSET = 5;
const HANDLE_HIT_RADIUS = 18;

function clampScale(scale: number): number {
  return Math.min(STICKER_MAX_SCALE, Math.max(STICKER_MIN_SCALE, scale));
}

type Permission = "pending" | "granted" | "denied";
type Phase =
  | "capture"
  | "countdown"
  | "recording"
  | "edit"
  | "post"
  | "posting"
  | "posted";

export function CameraBooth({
  userId,
  username,
}: {
  userId: string;
  username: string;
}) {
  const [permission, setPermission] = useState<Permission>("pending");
  const [phase, setPhase] = useState<Phase>("capture");
  const [timerSeconds, setTimerSeconds] = useState<5 | 10>(5);
  const [countdown, setCountdown] = useState(0);
  const [recordedFrames, setRecordedFrames] = useState(0);
  const [flash, setFlash] = useState(false);

  const [capture, setCapture] = useState<Capture | null>(null);
  const [filterId, setFilterId] = useState(FILM_FILTERS[0].id);
  const [stickers, setStickers] = useState<PlacedSticker[]>([]);
  const [selectedKey, setSelectedKey] = useState<number | null>(null);

  const [caption, setCaption] = useState("");
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recorderRef = useRef<{ stop: () => void } | null>(null);
  const stickerKeyRef = useRef(1);
  const dragRef = useRef<
    | { mode: "move"; key: number; dx: number; dy: number }
    | { mode: "resize"; key: number; startScale: number; startDist: number }
    | null
  >(null);

  const filter = useMemo(
    () => FILM_FILTERS.find((f) => f.id === filterId) ?? FILM_FILTERS[0],
    [filterId]
  );
  const willBeGif =
    capture?.kind === "video" || hasAnimatedStickers(stickers);

  // --- Camera access ---------------------------------------------------------

  const requestCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 960 },
          facingMode: "user",
        },
        audio: false,
      });
      streamRef.current = stream;
      setPermission("granted");
    } catch {
      // Denied, no camera, or camera busy — same photobooth-blocking result.
      setPermission("denied");
    }
  }, []);

  useEffect(() => {
    // setState here only fires after the async permission prompt resolves,
    // not synchronously — the lint rule can't see across the await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    requestCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (countdownRef.current) clearInterval(countdownRef.current);
      recorderRef.current?.stop();
    };
  }, [requestCamera]);

  // (Re)attach the stream whenever the live video element is on screen.
  const showLiveVideo =
    phase === "capture" || phase === "countdown" || phase === "recording";
  useEffect(() => {
    const video = videoRef.current;
    if (!video || permission !== "granted" || !showLiveVideo) return;
    video.srcObject = streamRef.current;
    video.play().catch(() => {});
  }, [permission, showLiveVideo]);

  // --- Capturing -------------------------------------------------------------

  const grabFrame = useCallback((): HTMLCanvasElement | null => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return null;
    const w = Math.min(CAPTURE_WIDTH, video.videoWidth);
    const h = Math.round((w * video.videoHeight) / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    // Mirror the frame so captures match the selfie-style live preview.
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    return canvas;
  }, []);

  const finishCapture = useCallback((next: Capture) => {
    setCapture(next);
    setFilterId(FILM_FILTERS[0].id);
    setStickers([]);
    setSelectedKey(null);
    setCaption("");
    setError(null);
    setPhase("edit");
  }, []);

  const takePhoto = useCallback(() => {
    const frame = grabFrame();
    if (!frame) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
    finishCapture({
      kind: "photo",
      frames: [frame],
      fps: 1,
      width: frame.width,
      height: frame.height,
    });
  }, [grabFrame, finishCapture]);

  const beginRecording = useCallback(() => {
    setPhase("recording");
    setRecordedFrames(0);
    const frames: HTMLCanvasElement[] = [];
    let done = false;
    const interval = setInterval(() => {
      const frame = grabFrame();
      if (frame) {
        frames.push(frame);
        setRecordedFrames(frames.length);
      }
      if (frames.length >= VIDEO_FPS * VIDEO_SECONDS) stop();
    }, 1000 / VIDEO_FPS);

    function stop() {
      if (done) return;
      done = true;
      clearInterval(interval);
      recorderRef.current = null;
      if (frames.length === 0) {
        setPhase("capture");
        return;
      }
      finishCapture({
        kind: "video",
        frames,
        fps: VIDEO_FPS,
        width: frames[0].width,
        height: frames[0].height,
      });
    }
    recorderRef.current = { stop };
  }, [grabFrame, finishCapture]);

  // Shared 5s/10s timer: counts down, then snaps a photo or starts filming.
  const startCountdown = useCallback(
    (mode: "photo" | "video") => {
      setPhase("countdown");
      setCountdown(timerSeconds);
      let remaining = timerSeconds;
      countdownRef.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          if (mode === "photo") takePhoto();
          else beginRecording();
        }
      }, 1000);
    },
    [timerSeconds, takePhoto, beginRecording]
  );

  const cancelCountdown = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = null;
    setPhase("capture");
  }, []);

  const retake = useCallback(() => {
    setCapture(null);
    setStickers([]);
    setSelectedKey(null);
    setError(null);
    setPhase("capture");
  }, []);

  // --- Editing preview loop ----------------------------------------------------

  // The rAF loop reads live values through a ref so dragging stickers doesn't
  // tear the loop down and restart it on every pointer move.
  const sceneRef = useRef({ filter, stickers, selectedKey, phase });
  useEffect(() => {
    sceneRef.current = { filter, stickers, selectedKey, phase };
  });

  const showPreview =
    phase === "edit" || phase === "post" || phase === "posting";
  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas || !capture || !showPreview) return;
    canvas.width = capture.width;
    canvas.height = capture.height;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;

    const loop = (now: number) => {
      const scene = sceneRef.current;
      const frameIndex =
        capture.kind === "video"
          ? Math.floor(now / (1000 / capture.fps)) % capture.frames.length
          : 0;
      drawComposite(
        ctx,
        capture,
        frameIndex,
        scene.filter,
        scene.stickers,
        now
      );
      if (scene.phase === "edit" && scene.selectedKey !== null) {
        const s = scene.stickers.find((x) => x.key === scene.selectedKey);
        if (s) {
          const r = stickerRect(s, capture.width, capture.height);
          ctx.save();
          ctx.strokeStyle = "#ffd94a";
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 6]);
          ctx.strokeRect(
            r.x - HANDLE_OFFSET,
            r.y - HANDLE_OFFSET,
            r.w + HANDLE_OFFSET * 2,
            r.h + HANDLE_OFFSET * 2
          );
          // Corner resize handle.
          ctx.setLineDash([]);
          ctx.fillStyle = "#ffd94a";
          ctx.strokeStyle = "#2e4973";
          ctx.lineWidth = 2;
          const hx = r.x + r.w + HANDLE_OFFSET;
          const hy = r.y + r.h + HANDLE_OFFSET;
          ctx.fillRect(hx - 7, hy - 7, 14, 14);
          ctx.strokeRect(hx - 7, hy - 7, 14, 14);
          ctx.restore();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [capture, showPreview]);

  // --- Sticker interactions -----------------------------------------------------

  const pointerFraction = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== "edit" || !capture) return;
    const p = pointerFraction(e);
    const px = p.x * capture.width;
    const py = p.y * capture.height;

    // Grabbing the selected sticker's corner handle starts a resize.
    const selected = stickers.find((s) => s.key === selectedKey);
    if (selected) {
      const r = stickerRect(selected, capture.width, capture.height);
      const hx = r.x + r.w + HANDLE_OFFSET;
      const hy = r.y + r.h + HANDLE_OFFSET;
      if (Math.hypot(px - hx, py - hy) <= HANDLE_HIT_RADIUS) {
        const startDist = Math.hypot(
          px - selected.x * capture.width,
          py - selected.y * capture.height
        );
        dragRef.current = {
          mode: "resize",
          key: selected.key,
          startScale: selected.scale,
          startDist: Math.max(1, startDist),
        };
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Synthetic pointer events have no active pointer to capture.
        }
        return;
      }
    }

    // Topmost sticker wins.
    for (let i = stickers.length - 1; i >= 0; i--) {
      const s = stickers[i];
      const r = stickerRect(s, capture.width, capture.height);
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) {
        setSelectedKey(s.key);
        dragRef.current = { mode: "move", key: s.key, dx: p.x - s.x, dy: p.y - s.y };
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Synthetic pointer events have no active pointer to capture.
        }
        return;
      }
    }
    setSelectedKey(null);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || phase !== "edit" || !capture) return;
    const p = pointerFraction(e);
    setStickers((prev) =>
      prev.map((s) => {
        if (s.key !== drag.key) return s;
        if (drag.mode === "move") {
          return {
            ...s,
            x: Math.min(1, Math.max(0, p.x - drag.dx)),
            y: Math.min(1, Math.max(0, p.y - drag.dy)),
          };
        }
        // Resize: scale by how far the pointer moved from the sticker center
        // relative to where the handle was grabbed.
        const dist = Math.hypot(
          p.x * capture.width - s.x * capture.width,
          p.y * capture.height - s.y * capture.height
        );
        return {
          ...s,
          scale: clampScale(drag.startScale * (dist / drag.startDist)),
        };
      })
    );
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const addSticker = (def: StickerDef) => {
    const key = stickerKeyRef.current++;
    setStickers((prev) => [
      ...prev,
      { key, def, x: 0.5, y: 0.5, scale: 0.22 },
    ]);
    setSelectedKey(key);
  };

  const resizeSelected = (factor: number) => {
    setStickers((prev) =>
      prev.map((s) =>
        s.key === selectedKey
          ? { ...s, scale: clampScale(s.scale * factor) }
          : s
      )
    );
  };

  const deleteSelected = () => {
    setStickers((prev) => prev.filter((s) => s.key !== selectedKey));
    setSelectedKey(null);
  };

  // --- Export / download / post ---------------------------------------------------

  const makeBlob = useCallback(
    async (format: "png" | "jpeg" | "gif"): Promise<Blob> => {
      if (!capture) throw new Error("Nothing captured");
      if (format === "gif") {
        return exportGif(capture, filter, stickers, (done, total) =>
          setBusyLabel(`DEVELOPING GIF ${done}/${total}`)
        );
      }
      return exportStill(
        capture,
        filter,
        stickers,
        format === "png" ? "image/png" : "image/jpeg"
      );
    },
    [capture, filter, stickers]
  );

  const download = async (format: "png" | "jpeg" | "gif") => {
    setError(null);
    setBusyLabel("DEVELOPING...");
    try {
      const blob = await makeBlob(format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `capture-${username || "photo"}-${Date.now()}.${
        format === "jpeg" ? "jpg" : format
      }`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the file");
    } finally {
      setBusyLabel(null);
    }
  };

  const [postedId, setPostedId] = useState<string | null>(null);

  const handlePost = async () => {
    if (!capture) return;
    setPhase("posting");
    setError(null);
    setBusyLabel("DEVELOPING...");
    try {
      const format = willBeGif ? "gif" : "png";
      const blob = await makeBlob(format);
      setBusyLabel("PRINTING...");
      const path = `${userId}/${crypto.randomUUID()}.${format}`;
      const supabase = createClient();
      const { error: uploadErr } = await supabase.storage
        .from("posts")
        .upload(path, blob, {
          contentType: blob.type,
          cacheControl: "31536000",
        });
      if (uploadErr) throw new Error("Upload failed — please try again");

      const result = await createPost(caption, path);
      if (!result.ok) throw new Error(result.error);
      setPostedId(result.postId);
      setPhase("posted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post");
      setPhase("post");
    } finally {
      setBusyLabel(null);
    }
  };

  // --- Render -------------------------------------------------------------------

  if (permission === "denied") {
    return (
      <div className="pixel-card overflow-hidden">
        <div className="relative flex aspect-[4/3] w-full flex-col items-center justify-center gap-4 bg-gradient-to-b from-neutral-400 to-neutral-600 px-6 text-center">
          <span className="text-5xl" aria-hidden>
            📷
          </span>
          <p className="font-pixel max-w-md text-xs leading-6 text-white [text-shadow:2px_2px_0_rgba(0,0,0,0.4)]">
            Oops. You need to allow Capture to access your camera to use the
            Photo Booth
          </p>
          <button
            type="button"
            className="pixel-btn pixel-btn-yellow"
            onClick={() => {
              setPermission("pending");
              requestCamera();
            }}
          >
            TRY AGAIN
          </button>
          <p className="max-w-sm text-lg leading-tight text-neutral-100">
            If the browser doesn&apos;t ask again, enable the camera for this
            site in your browser&apos;s site settings, then retry.
          </p>
        </div>
      </div>
    );
  }

  if (phase === "posted") {
    return (
      <div className="pixel-card flex flex-col items-center gap-5 px-6 py-10 text-center">
        <PixelPrinter size={72} printing />
        <h1 className="font-pixel text-sm text-blue-deep [text-shadow:2px_2px_0_var(--yellow)]">
          FILM DEVELOPED &amp; POSTED ✦
        </h1>
        <p className="text-xl text-blue-brand">
          Your capture is at the top of your feed and on your profile.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className="pixel-btn pixel-btn-yellow">
            SEE THE FEED
          </Link>
          {username && (
            <Link href={`/u/${username}`} className="pixel-btn pixel-btn-white">
              MY PROFILE
            </Link>
          )}
          <button
            type="button"
            className="pixel-btn pixel-btn-blue"
            onClick={() => {
              setPostedId(null);
              retake();
            }}
          >
            TAKE ANOTHER
          </button>
        </div>
        {postedId && (
          <p className="text-sm text-blue-brand/70">roll #{postedId.slice(0, 8)}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-pixel text-sm text-blue-deep [text-shadow:2px_2px_0_var(--yellow)]">
        PHOTO BOOTH
      </h1>

      {/* The camera / preview window */}
      <div className="pixel-card overflow-hidden">
        <div className="relative w-full bg-[var(--blue-deep)]">
          {showLiveVideo && (
            <>
              <video
                ref={videoRef}
                muted
                playsInline
                autoPlay
                className="aspect-[4/3] w-full -scale-x-100 object-cover"
              />
              {permission === "pending" && (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--blue-deep)]">
                  <p className="font-pixel animate-pulse text-xs text-white">
                    WARMING UP THE CAMERA...
                  </p>
                </div>
              )}
              {flash && <div className="absolute inset-0 bg-white" />}
              {phase === "countdown" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/30">
                  <span
                    key={countdown}
                    className="font-pixel text-7xl text-white [text-shadow:4px_4px_0_var(--blue-deep)]"
                  >
                    {countdown}
                  </span>
                  <button
                    type="button"
                    className="pixel-btn pixel-btn-white"
                    onClick={cancelCountdown}
                  >
                    CANCEL
                  </button>
                </div>
              )}
              {phase === "recording" && (
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-black/40 px-4 py-3">
                  <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                  <div className="h-3 flex-1 overflow-hidden rounded border-2 border-white/70">
                    <div
                      className="h-full bg-[var(--yellow)]"
                      style={{
                        width: `${
                          (recordedFrames / (VIDEO_FPS * VIDEO_SECONDS)) * 100
                        }%`,
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="pixel-btn pixel-btn-white"
                    onClick={() => recorderRef.current?.stop()}
                  >
                    STOP
                  </button>
                </div>
              )}
            </>
          )}

          {showPreview && capture && (
            <canvas
              ref={previewRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className={`aspect-auto w-full ${
                phase === "edit" ? "cursor-crosshair touch-none" : ""
              }`}
            />
          )}

          {busyLabel && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <p className="font-pixel animate-pulse text-xs text-white">
                {busyLabel}
              </p>
            </div>
          )}
        </div>
      </div>

      {error && <p className="pixel-alert-error">{error}</p>}

      {/* Camera controls */}
      {phase === "capture" && (
        <div className="pixel-card flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="pixel-label">TIMER</span>
            {([5, 10] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTimerSeconds(s)}
                className={`pixel-btn ${
                  timerSeconds === s ? "pixel-btn-yellow" : "pixel-btn-white"
                }`}
                aria-pressed={timerSeconds === s}
              >
                {s}S
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="pixel-btn pixel-btn-blue"
              onClick={() => startCountdown("photo")}
              disabled={permission !== "granted"}
            >
              ✦ TAKE PHOTO
            </button>
            <button
              type="button"
              className="pixel-btn pixel-btn-yellow"
              onClick={() => startCountdown("video")}
              disabled={permission !== "granted"}
            >
              ● FILM {VIDEO_SECONDS}S CLIP
            </button>
          </div>
        </div>
      )}

      {/* Editing UI */}
      {phase === "edit" && capture && (
        <div className="flex flex-col gap-4">
          <div className="pixel-card px-5 py-4">
            <p className="pixel-label mb-3">FILM STOCK</p>
            <FilterStrip
              capture={capture}
              activeId={filterId}
              onPick={setFilterId}
            />
          </div>

          <div className="pixel-card px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="pixel-label">STICKERS</p>
              <p className="text-base text-blue-brand">
                tap to add, drag to move, pull the corner handle to resize ·
                animated ones post as GIF
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {STICKERS.map((def) => (
                <StickerButton key={def.id} def={def} onAdd={addSticker} />
              ))}
            </div>
            {selectedKey !== null && (
              <div className="mt-4 flex items-center gap-2 border-t-2 border-dashed border-[var(--blue-sky)] pt-3">
                <span className="pixel-label">SELECTED</span>
                <button
                  type="button"
                  className="pixel-btn pixel-btn-white"
                  onClick={() => resizeSelected(1.25)}
                >
                  BIGGER
                </button>
                <button
                  type="button"
                  className="pixel-btn pixel-btn-white"
                  onClick={() => resizeSelected(0.8)}
                >
                  SMALLER
                </button>
                <button
                  type="button"
                  className="pixel-btn pixel-btn-blue"
                  onClick={deleteSelected}
                >
                  REMOVE
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-between gap-3">
            <button
              type="button"
              className="pixel-btn pixel-btn-white"
              onClick={retake}
            >
              ← RETAKE
            </button>
            <button
              type="button"
              className="pixel-btn pixel-btn-yellow"
              onClick={() => {
                setSelectedKey(null);
                setPhase("post");
              }}
            >
              DONE EDITING →
            </button>
          </div>
        </div>
      )}

      {/* Posting UI */}
      {(phase === "post" || phase === "posting") && capture && (
        <div className="flex flex-col gap-4">
          <div className="pixel-card px-5 py-4">
            <label htmlFor="caption" className="pixel-label mb-2 block">
              CAPTION (OPTIONAL)
            </label>
            <textarea
              id="caption"
              value={caption}
              onChange={(e) =>
                setCaption(e.target.value.slice(0, CAPTION_CHAR_LIMIT))
              }
              maxLength={CAPTION_CHAR_LIMIT}
              rows={3}
              placeholder="say something about this capture..."
              className="pixel-input resize-none"
              disabled={phase === "posting"}
            />
            <p className="mt-1 text-right text-base text-blue-brand">
              {caption.length}/{CAPTION_CHAR_LIMIT}
            </p>
          </div>

          <div className="pixel-card flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="pixel-label">SAVE A COPY</span>
              {willBeGif ? (
                <button
                  type="button"
                  className="pixel-btn pixel-btn-white"
                  onClick={() => download("gif")}
                  disabled={busyLabel !== null}
                >
                  GIF
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="pixel-btn pixel-btn-white"
                    onClick={() => download("png")}
                    disabled={busyLabel !== null}
                  >
                    PNG
                  </button>
                  <button
                    type="button"
                    className="pixel-btn pixel-btn-white"
                    onClick={() => download("jpeg")}
                    disabled={busyLabel !== null}
                  >
                    JPEG
                  </button>
                </>
              )}
            </div>
            <p className="text-base text-blue-brand">
              posting as {willBeGif ? "an animated .gif" : "a .png photo"}
            </p>
          </div>

          <div className="flex flex-wrap justify-between gap-3">
            <button
              type="button"
              className="pixel-btn pixel-btn-white"
              onClick={() => setPhase("edit")}
              disabled={phase === "posting"}
            >
              ← BACK TO EDIT
            </button>
            <button
              type="button"
              className="pixel-btn pixel-btn-yellow flex items-center gap-2"
              onClick={handlePost}
              disabled={phase === "posting"}
            >
              <PixelPrinter size={22} printing={phase === "posting"} />
              {phase === "posting" ? "PRINTING..." : "PRINT & POST"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Small subcomponents -------------------------------------------------------

function FilterStrip({
  capture,
  activeId,
  onPick,
}: {
  capture: Capture;
  activeId: string;
  onPick: (id: string) => void;
}) {
  // One small snapshot of the capture, tinted per-filter with CSS.
  const thumbSrc = useMemo(() => {
    const base = capture.frames[0];
    const w = 120;
    const h = Math.round((w * base.height) / base.width);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(base, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.75);
  }, [capture]);

  return (
    <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
      {FILM_FILTERS.map((f: FilmFilter) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onPick(f.id)}
          className={`flex shrink-0 flex-col items-center gap-1 rounded-lg border-3 p-1 transition-transform ${
            activeId === f.id
              ? "border-[var(--yellow)] bg-[var(--yellow-soft)]"
              : "border-transparent hover:-translate-y-0.5"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbSrc}
            alt=""
            width={72}
            className="rounded border-2 border-[var(--blue-deep)]"
            style={{ filter: f.css || undefined }}
          />
          <span className="font-pixel text-[0.45rem] text-blue-deep">
            {f.name}
          </span>
        </button>
      ))}
    </div>
  );
}

function StickerButton({
  def,
  onAdd,
}: {
  def: StickerDef;
  onAdd: (def: StickerDef) => void;
}) {
  const src = useMemo(() => {
    const sprite = stickerFrameCanvas(def, 0);
    const canvas = document.createElement("canvas");
    const scale = 4;
    canvas.width = sprite.width * scale;
    canvas.height = sprite.height * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL();
  }, [def]);

  return (
    <button
      type="button"
      onClick={() => onAdd(def)}
      title={def.name}
      className="pixel-icon-btn flex-col rounded-lg border-2 border-[var(--blue-sky)] bg-[var(--blue-pale)] p-2"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={def.name} className="h-10 w-auto [image-rendering:pixelated]" />
      <span className="font-pixel text-[0.4rem] text-blue-deep">
        {def.name}
        {def.frames.length > 1 ? " ✦" : ""}
      </span>
    </button>
  );
}
