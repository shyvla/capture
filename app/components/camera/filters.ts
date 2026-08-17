// Film-stock filters for the Photo Booth. Each one is a CSS filter string
// (used both for live preview styling and baked in via ctx.filter on export)
// plus optional vignette/grain strengths composited on top for film feel.

export type FilmFilter = {
  id: string;
  /** Display name, styled after a film stock. */
  name: string;
  /** CSS filter functions ("" = untouched). */
  css: string;
  /** 0..1 — darkened corners. */
  vignette: number;
  /** 0..1 — animated noise overlay. */
  grain: number;
};

export const FILM_FILTERS: FilmFilter[] = [
  {
    id: "fresh",
    name: "FRESH ROLL",
    css: "",
    vignette: 0,
    grain: 0,
  },
  {
    id: "gold200",
    name: "GOLD 200",
    css: "sepia(0.28) saturate(1.35) contrast(1.05) brightness(1.06) hue-rotate(-8deg)",
    vignette: 0.18,
    grain: 0.05,
  },
  {
    id: "noir",
    name: "NOIR B&W",
    css: "grayscale(1) contrast(1.35) brightness(0.98)",
    vignette: 0.4,
    grain: 0.1,
  },
  {
    id: "fade35",
    name: "FADED 35",
    css: "contrast(0.82) brightness(1.12) saturate(0.7) sepia(0.18)",
    vignette: 0.12,
    grain: 0.08,
  },
  {
    id: "xpro",
    name: "X-PRO",
    css: "hue-rotate(14deg) saturate(1.65) contrast(1.22) brightness(0.98)",
    vignette: 0.3,
    grain: 0.06,
  },
  {
    id: "skychrome",
    name: "SKYCHROME",
    css: "hue-rotate(-12deg) saturate(1.2) contrast(1.08) brightness(1.04)",
    vignette: 0.15,
    grain: 0,
  },
  {
    id: "lomo",
    name: "LOMO STAR",
    css: "saturate(1.5) contrast(1.3) brightness(0.95) hue-rotate(4deg)",
    vignette: 0.55,
    grain: 0.09,
  },
];
