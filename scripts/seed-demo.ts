/**
 * Seed demo content for the Capture feed.
 *
 * Creates demo accounts (admin API), procedurally generates original
 * pixel-art "film" photos, uploads them to the `posts` storage bucket,
 * and inserts posts/comments/likes/follows. Also writes black-and-white
 * story placeholders to public/demo/stories/.
 *
 * Run with the service role key in the environment:
 *   SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-demo.ts
 */

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// --- config -----------------------------------------------------------------

const ROOT = join(import.meta.dirname, "..");

function readEnvLocal(key: string): string {
  const env = readFileSync(join(ROOT, ".env.local"), "utf8");
  const match = env.match(new RegExp(`^${key}=(.*)$`, "m"));
  if (!match) throw new Error(`${key} not found in .env.local`);
  return match[1].trim();
}

const SUPABASE_URL = readEnvLocal("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error("Set SUPABASE_SERVICE_ROLE_KEY in the environment.");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- deterministic rng --------------------------------------------------------

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
type Rng = () => number;
const pick = <T,>(rng: Rng, arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const irange = (rng: Rng, lo: number, hi: number) =>
  lo + Math.floor(rng() * (hi - lo + 1));

// --- pixel painting -----------------------------------------------------------

const SIZE = 48; // painted at 48x48, upscaled 15x with nearest-neighbor
type RGB = [number, number, number];

const hex = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

// Capture palette (globals.css) plus a few accents.
const C = {
  deep: hex("#2e4973"),
  blue: hex("#2a8bbc"),
  sky: hex("#7cd4ec"),
  pale: hex("#eaf7fc"),
  white: hex("#ffffff"),
  yellow: hex("#d8bc57"),
  yellowSoft: hex("#f5ebc4"),
  bgBlue: hex("#dceeff"),
  pink: hex("#ff9db1"),
  night: hex("#1d3050"),
  ink: hex("#141b2b"),
};

class Grid {
  px: RGB[];
  constructor(fill: RGB) {
    this.px = Array.from({ length: SIZE * SIZE }, () => [...fill] as RGB);
  }
  set(x: number, y: number, c: RGB) {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
    this.px[y * SIZE + x] = [...c] as RGB;
  }
  get(x: number, y: number): RGB {
    return this.px[y * SIZE + x];
  }
  rect(x: number, y: number, w: number, h: number, c: RGB) {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++) this.set(i, j, c);
  }
  /** Vertical gradient across full height between palette stops. */
  gradient(stops: RGB[]) {
    for (let y = 0; y < SIZE; y++) {
      const t = (y / (SIZE - 1)) * (stops.length - 1);
      const i = Math.min(Math.floor(t), stops.length - 2);
      const f = t - i;
      const c: RGB = [0, 1, 2].map((k) =>
        Math.round(stops[i][k] * (1 - f) + stops[i + 1][k] * f)
      ) as RGB;
      this.rect(0, y, SIZE, 1, c);
    }
  }
  sparkle(x: number, y: number, c: RGB) {
    this.set(x, y, c);
    this.set(x - 1, y, c);
    this.set(x + 1, y, c);
    this.set(x, y - 1, c);
    this.set(x, y + 1, c);
  }
  disc(cx: number, cy: number, r: number, c: RGB) {
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++)
        if (x * x + y * y <= r * r + r * 0.4) this.set(cx + x, cy + y, c);
  }
}

// --- scenes -------------------------------------------------------------------

function sceneNightSky(rng: Rng, g: Grid) {
  g.gradient([C.night, C.deep, C.blue]);
  const mx = irange(rng, 8, 38);
  const my = irange(rng, 8, 16);
  g.disc(mx, my, 5, C.pale);
  g.disc(mx, my, 4, C.white);
  g.set(mx - 1, my + 1, C.pale);
  g.set(mx + 2, my - 1, C.pale);
  for (let i = 0; i < 26; i++)
    g.set(irange(rng, 0, 47), irange(rng, 0, 47), rng() > 0.4 ? C.white : C.yellow);
  for (let i = 0; i < 4; i++)
    g.sparkle(irange(rng, 3, 44), irange(rng, 3, 44), rng() > 0.5 ? C.yellow : C.white);
}

function sceneWave(rng: Rng, g: Grid) {
  g.gradient([C.pale, C.bgBlue, C.sky]);
  const sx = irange(rng, 8, 40);
  g.disc(sx, 8, 4, C.yellow);
  g.disc(sx, 8, 2, C.yellowSoft);
  const base = irange(rng, 22, 28);
  const amp = irange(rng, 3, 6);
  const phase = rng() * Math.PI * 2;
  for (let x = 0; x < SIZE; x++) {
    const crest = Math.round(base + amp * Math.sin(x / 5 + phase));
    for (let y = crest; y < SIZE; y++) {
      const depth = (y - crest) / (SIZE - crest);
      g.set(x, y, depth < 0.25 ? C.sky : depth < 0.6 ? C.blue : C.deep);
    }
    g.set(x, crest, C.white);
    if (rng() > 0.6) g.set(x, crest + 1, C.pale);
    if (rng() > 0.82) g.set(x, crest - 1, C.white);
  }
  for (let i = 0; i < 10; i++)
    g.set(irange(rng, 0, 47), irange(rng, base + 6, 46), C.sky);
}

function sceneCritter(rng: Rng, g: Grid) {
  g.gradient(rng() > 0.5 ? [C.yellowSoft, C.pale, C.bgBlue] : [C.bgBlue, C.pale, C.yellowSoft]);
  const body = pick(rng, [C.blue, C.sky, C.yellow, C.pink]);
  const shade = pick(rng, [C.deep, C.blue]);
  const cx = 23,
    cy = 27,
    rx = irange(rng, 8, 11),
    ry = irange(rng, 7, 9);
  // wobbly blob body
  for (let y = -ry; y <= ry; y++) {
    const wob = Math.round(Math.sin(y * 1.3) * 1.5 * rng());
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y / ry) ** 2))) + wob;
    for (let x = -w; x <= w; x++) g.set(cx + x, cy + y, body);
    if (w > 0) {
      g.set(cx - w, cy + y, shade);
      g.set(cx + w, cy + y, shade);
    }
  }
  // ears
  if (rng() > 0.4) {
    g.rect(cx - rx + 2, cy - ry - 3, 2, 4, body);
    g.rect(cx + rx - 4, cy - ry - 3, 2, 4, body);
  }
  // face
  g.rect(cx - 4, cy - 2, 2, 2, C.ink);
  g.rect(cx + 3, cy - 2, 2, 2, C.ink);
  g.set(cx - 4, cy - 2, C.white);
  g.set(cx + 3, cy - 2, C.white);
  g.rect(cx - 1, cy + 2, 3, 1, C.ink);
  g.set(cx - 6, cy + 1, C.pink);
  g.set(cx + 6, cy + 1, C.pink);
  // sparkle friends
  g.sparkle(irange(rng, 4, 12), irange(rng, 4, 14), C.yellow);
  g.sparkle(irange(rng, 34, 44), irange(rng, 6, 18), C.white);
}

function sceneHills(rng: Rng, g: Grid) {
  const nightMode = rng() > 0.5;
  g.gradient(nightMode ? [C.deep, C.blue, C.sky] : [C.pale, C.sky, C.bgBlue]);
  const ox = irange(rng, 10, 38);
  g.disc(ox, 9, 4, nightMode ? C.pale : C.yellow);
  if (nightMode)
    for (let i = 0; i < 14; i++)
      g.set(irange(rng, 0, 47), irange(rng, 0, 20), C.white);
  const layers: [RGB, number, number][] = [
    [C.sky, 26, 5],
    [C.blue, 32, 6],
    [C.deep, 39, 5],
  ];
  for (const [c, base, amp] of layers) {
    const phase = rng() * Math.PI * 2;
    for (let x = 0; x < SIZE; x++) {
      const top = Math.round(base + amp * Math.sin(x / 7 + phase));
      for (let y = top; y < SIZE; y++) g.set(x, y, c);
    }
  }
  for (let i = 0; i < 6; i++)
    g.set(irange(rng, 2, 45), irange(rng, 40, 46), C.yellow);
}

function sceneFlowers(rng: Rng, g: Grid) {
  g.gradient([C.bgBlue, C.pale, C.yellowSoft]);
  for (let i = 0; i < 12; i++) {
    const x = irange(rng, 3, 44);
    const y = irange(rng, 20, 44);
    const petal = pick(rng, [C.white, C.sky, C.pink, C.bgBlue]);
    g.rect(x, y + 2, 1, irange(rng, 2, 4), C.blue); // stem
    g.sparkle(x, y, petal);
    g.set(x, y, C.yellow);
  }
  for (let i = 0; i < 5; i++)
    g.set(irange(rng, 2, 45), irange(rng, 2, 14), C.white);
}

function sceneClouds(rng: Rng, g: Grid) {
  g.gradient([C.sky, C.bgBlue, C.pale]);
  for (let i = 0; i < 5; i++) {
    const x = irange(rng, 2, 34);
    const y = irange(rng, 4, 40);
    const w = irange(rng, 8, 14);
    g.rect(x, y, w, 3, C.white);
    g.rect(x + 2, y - 2, w - 4, 2, C.white);
    g.rect(x + 1, y + 3, w - 2, 1, C.bgBlue);
  }
  for (let i = 0; i < 6; i++)
    g.sparkle(irange(rng, 3, 44), irange(rng, 3, 44), rng() > 0.5 ? C.yellow : C.white);
}

const SCENES = [sceneNightSky, sceneWave, sceneCritter, sceneHills, sceneFlowers, sceneClouds];

// --- film effects ---------------------------------------------------------------

function applyGrainAndVignette(g: Grid, rng: Rng, strength = 1) {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const c = g.get(x, y);
      if (rng() < 0.09 * strength) {
        const d = irange(rng, -16, 16) * strength;
        g.set(x, y, [c[0] + d, c[1] + d, c[2] + d].map((v) =>
          Math.max(0, Math.min(255, v))
        ) as RGB);
      }
      const dx = (x - SIZE / 2) / (SIZE / 2);
      const dy = (y - SIZE / 2) / (SIZE / 2);
      const dist = dx * dx + dy * dy;
      if (dist > 1.15) {
        const cur = g.get(x, y);
        g.set(x, y, cur.map((v) => Math.round(v * 0.86)) as RGB);
      }
    }
  }
}

function framePolaroid(g: Grid) {
  g.rect(0, 0, SIZE, 3, C.white);
  g.rect(0, 0, 3, SIZE, C.white);
  g.rect(SIZE - 3, 0, 3, SIZE, C.white);
  g.rect(0, SIZE - 6, SIZE, 6, C.white);
  for (let x = 3; x < SIZE - 3; x++) {
    g.set(x, 3, C.deep);
    g.set(x, SIZE - 7, C.deep);
  }
  for (let y = 3; y < SIZE - 6; y++) {
    g.set(3, y, C.deep);
    g.set(SIZE - 4, y, C.deep);
  }
}

function frameFilmstrip(g: Grid) {
  g.rect(0, 0, SIZE, 6, C.ink);
  g.rect(0, SIZE - 6, SIZE, 6, C.ink);
  for (let x = 3; x < SIZE - 3; x += 8) {
    g.rect(x, 2, 3, 2, C.white);
    g.rect(x, SIZE - 4, 3, 2, C.white);
  }
}

function toGrayscale(g: Grid) {
  for (let i = 0; i < g.px.length; i++) {
    const [r, gg, b] = g.px[i];
    const l = Math.round(0.3 * r + 0.59 * gg + 0.11 * b);
    // slight contrast push for that silver-film look
    const v = Math.max(0, Math.min(255, Math.round((l - 128) * 1.25 + 132)));
    g.px[i] = [v, v, v];
  }
}

async function renderPng(g: Grid): Promise<Buffer> {
  const raw = Buffer.alloc(SIZE * SIZE * 3);
  g.px.forEach((c, i) => {
    raw[i * 3] = c[0];
    raw[i * 3 + 1] = c[1];
    raw[i * 3 + 2] = c[2];
  });
  return sharp(raw, { raw: { width: SIZE, height: SIZE, channels: 3 } })
    .resize(720, 720, { kernel: "nearest" })
    .png()
    .toBuffer();
}

async function makePhoto(seed: number): Promise<Buffer> {
  const rng = mulberry32(seed);
  const g = new Grid(C.pale);
  pick(rng, SCENES)(rng, g);
  applyGrainAndVignette(g, rng);
  (rng() > 0.5 ? framePolaroid : frameFilmstrip)(g);
  return renderPng(g);
}

async function makeStoryFrame(seed: number): Promise<Buffer> {
  const rng = mulberry32(seed);
  const g = new Grid(C.pale);
  pick(rng, SCENES)(rng, g);
  toGrayscale(g);
  applyGrainAndVignette(g, rng, 1.6);
  frameFilmstrip(g);
  return renderPng(g);
}

// --- demo content ----------------------------------------------------------------

const DEMO_USERS = [
  { username: "wave_rider", display: "WaveRider" },
  { username: "moon_pixel", display: "MoonPixel" },
  { username: "film_fern", display: "FilmFern" },
  { username: "star_gazer99", display: "StarGazer99" },
  { username: "cloud_kid", display: "CloudKid" },
  { username: "retro_rin", display: "RetroRin" },
  { username: "blue_beetle", display: "BlueBeetle" },
  { username: "snapshot_sam", display: "SnapshotSam" },
];

// star_trainer follows the first five; the rest fuel the discovery slots.
const FOLLOWED_BY_TESTER = 5;

const CAPTIONS = [
  "caught this on expired film and it still sparkles ✦",
  "the sea was extra pixelated today",
  "moonrise over bit rate bay",
  "new friend followed me home from the arcade",
  "35mm skies, 8-bit heart",
  "golden hour hits different at 48x48",
  "found a patch of forget-me-nots behind the film lab",
  "double exposure? no, double adorable",
  "clouds rendering slowly today, please wait",
  "night shift at the observatory",
  "this one goes in the shoebox of favorites",
  "shot on the booth's grain setting. zero regrets",
  "postcard from the low-res coast",
  "little dude said cheese",
  "star charts and heart charts",
  "the hills had their layers on today",
  "waves practicing their sine curves",
  "film never dies it just twinkles",
  "somewhere between blue and bluer",
  "the flowers asked for a group photo",
];

const COMMENTS = [
  "this belongs in a museum of tiny art",
  "the grain on this one is immaculate",
  "screaming at how cute this is",
  "okay the vignette really sells it",
  "putting this on my wall, no notes",
  "the palette!!! chef's kiss",
  "teach me your booth settings please",
  "this is so cozy i can hear the film winding",
  "star of the feed honestly",
  "i've looked at this for five minutes straight",
  "the little sparkles got me",
  "pixel perfect. literally",
  "need this as my lock screen immediately",
  "the composition is unreal",
  "my favorite one of yours so far",
  "how do you make 48 pixels feel infinite",
  "this one's a keeper for the shoebox",
  "so dreamy it should be illegal",
];

// --- seeding steps ------------------------------------------------------------------

type Profile = { id: string; username: string };

async function ensureDemoUsers(): Promise<Profile[]> {
  const { data: existing, error } = await db
    .from("profiles")
    .select("id, username")
    .in("username", DEMO_USERS.map((u) => u.username));
  if (error) throw error;

  const have = new Set((existing ?? []).map((p) => p.username));
  const out: Profile[] = [...(existing ?? [])];

  for (const u of DEMO_USERS) {
    if (have.has(u.username)) continue;
    const { data, error: createErr } = await db.auth.admin.createUser({
      email: `star.trainer.capture.test+${u.username.replace(/_/g, ".")}@gmail.com`,
      password: `Demo${u.display}2026!`,
      email_confirm: true,
      user_metadata: {
        username: u.username,
        display_name: u.display,
        phone_number: "",
      },
    });
    if (createErr) throw new Error(`createUser ${u.username}: ${createErr.message}`);
    out.push({ id: data.user!.id, username: u.username });
    console.log(`created demo user @${u.username}`);
  }
  return out;
}

async function seedPosts(users: Profile[], rng: Rng) {
  const { count } = await db
    .from("posts")
    .select("post_id", { count: "exact", head: true });
  if ((count ?? 0) > 0) {
    console.log(`posts already seeded (${count}), skipping posts/comments/likes`);
    return;
  }

  const captions = [...CAPTIONS];
  const now = Date.now();
  let seed = 20260816;
  let postNumber = 0;

  for (const user of users) {
    const postCount = irange(rng, 2, 3);
    for (let p = 0; p < postCount; p++) {
      postNumber++;
      const caption = captions.length
        ? captions.splice(Math.floor(rng() * captions.length), 1)[0]
        : pick(rng, CAPTIONS);
      // Spread posts over the past ~10 days, newest last so the feed mixes authors.
      const createdAt = new Date(
        now - irange(rng, 1, 14400) * 60_000
      ).toISOString();

      const { data: post, error } = await db
        .from("posts")
        .insert({ user_id: user.id, caption, created_at: createdAt })
        .select("post_id")
        .single();
      if (error) throw error;

      // 1–2 photos per post.
      const mediaCount = rng() > 0.7 ? 2 : 1;
      for (let m = 0; m < mediaCount; m++) {
        const png = await makePhoto(seed++);
        const path = `${user.id}/${post.post_id}-${m}.png`;
        const { error: upErr } = await db.storage
          .from("posts")
          .upload(path, png, { contentType: "image/png", upsert: true });
        if (upErr) throw new Error(`upload ${path}: ${upErr.message}`);
        const { error: mediaErr } = await db
          .from("post_media")
          .insert({ post_id: post.post_id, position: m, storage_path: path });
        if (mediaErr) throw mediaErr;
      }

      // Likes from a random subset of the other demo users.
      const others = users.filter((u) => u.id !== user.id);
      const likers = others
        .slice()
        .sort(() => rng() - 0.5)
        .slice(0, irange(rng, 0, others.length));
      if (likers.length) {
        const { error: likeErr } = await db
          .from("post_likes")
          .insert(likers.map((l) => ({ post_id: post.post_id, user_id: l.id })));
        if (likeErr) throw likeErr;
      }

      // 2–6 comments, some liked so "top comments" ordering is visible.
      const commentCount = irange(rng, 2, 6);
      for (let ci = 0; ci < commentCount; ci++) {
        const author = pick(rng, others);
        const { data: comment, error: cErr } = await db
          .from("comments")
          .insert({
            post_id: post.post_id,
            user_id: author.id,
            comment: pick(rng, COMMENTS),
            created_at: new Date(
              Date.parse(createdAt) + irange(rng, 1, 600) * 60_000
            ).toISOString(),
          })
          .select("id")
          .single();
        if (cErr) throw cErr;
        const cLikers = others
          .filter((u) => u.id !== author.id)
          .sort(() => rng() - 0.5)
          .slice(0, irange(rng, 0, 4));
        if (cLikers.length) {
          const { error: clErr } = await db
            .from("comment_likes")
            .insert(cLikers.map((l) => ({ comment_id: comment.id, user_id: l.id })));
          if (clErr) throw clErr;
        }
      }
      console.log(`post ${postNumber} by @${user.username} (${mediaCount} photo)`);
    }
  }
}

async function seedFollows(users: Profile[]) {
  const { data: tester, error } = await db
    .from("profiles")
    .select("id, username")
    .eq("username", "star_trainer")
    .single();
  if (error) throw new Error(`star_trainer profile not found: ${error.message}`);

  const byName = new Map(users.map((u) => [u.username, u]));
  const rows: { follower_id: string; followee_id: string }[] = [];

  DEMO_USERS.slice(0, FOLLOWED_BY_TESTER).forEach((u) => {
    rows.push({ follower_id: tester.id, followee_id: byName.get(u.username)!.id });
  });
  // Demo users follow each other in a ring, and everyone follows star_trainer.
  users.forEach((u, i) => {
    rows.push({ follower_id: u.id, followee_id: users[(i + 1) % users.length].id });
    rows.push({ follower_id: u.id, followee_id: tester.id });
  });

  const { error: fErr } = await db
    .from("follows")
    .upsert(rows, { ignoreDuplicates: true });
  if (fErr) throw fErr;
  console.log(`follows seeded (${rows.length} edges)`);
}

async function writeStoryFrames() {
  const dir = join(ROOT, "public", "demo", "stories");
  mkdirSync(dir, { recursive: true });
  for (let i = 0; i < 6; i++) {
    writeFileSync(join(dir, `story-${i + 1}.png`), await makeStoryFrame(777 + i * 31));
  }
  console.log("story frames written to public/demo/stories/");
}

async function main() {
  const rng = mulberry32(42);
  const users = await ensureDemoUsers();
  await seedPosts(users, rng);
  await seedFollows(users);
  await writeStoryFrames();
  console.log("done ✦");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
