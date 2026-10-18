// Small helpers shared by every variant renderer.
// SVGs end up inside <img> on GitHub, so nothing external loads: fonts are embedded
// as base64 woff2 subsets and icons are inlined paths.

import { readFileSync } from "node:fs";
import { icons } from "../icons.mjs";

const fontsDir = new URL("../fonts/", import.meta.url);
const metrics = JSON.parse(readFileSync(new URL("metrics.json", fontsDir), "utf8"));
const fontCache = new Map();

/** XML-escape text content and attribute values. */
export const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * @font-face rule for one of the subsets in scripts/fonts.
 * `file` is the basename without extension, e.g. "jetbrains-mono-400".
 */
export function fontFace(family, file, { weight = 400, style = "normal" } = {}) {
  if (!fontCache.has(file)) fontCache.set(file, readFileSync(new URL(`${file}.woff2`, fontsDir)).toString("base64"));
  return `@font-face{font-family:"${family}";font-weight:${weight};font-style:${style};` +
    `src:url(data:font/woff2;base64,${fontCache.get(file)}) format("woff2");}`;
}

/** Advance width of `text` set in `file` at `size` px. Unknown glyphs count as 0.6em. */
export function measure(text, file, size, letterSpacing = 0) {
  const w = metrics[file]?.widths;
  if (!w) throw new Error(`no metrics for ${file}`);
  let em = 0;
  for (const ch of String(text)) em += w[ch] ?? 0.6;
  return em * size + letterSpacing * Math.max(0, [...String(text)].length - 1);
}

/**
 * Inline simple-icons glyph as a <path>, scaled from its 24×24 box to `size`.
 * Returns "" for unknown slugs so callers can fall back to a text marker.
 */
export function icon(slug, x, y, size, fill = "currentColor", extra = "") {
  const i = icons[slug];
  if (!i) return "";
  const k = size / 24;
  return `<path transform="translate(${r(x)} ${r(y)}) scale(${r(k, 4)})" d="${i.path}" fill="${fill}"${extra ? " " + extra : ""}/>`;
}

export const iconHex = (slug) => icons[slug]?.hex ?? null;
export const hasIcon = (slug) => Boolean(icons[slug]);

/** Round for compact output. */
export const r = (n, digits = 2) => Number(n.toFixed(digits));

/** 2900 → "2 900" with a thin no-break space, the way the sheets typeset numbers. */
export const num = (n, sep = " ") => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, sep);

export const pct = (share, digits = 1) => `${(share * 100).toFixed(digits)}%`;

/** Wrap content in a root <svg>. `title`/`desc` make the image readable by screen readers. */
export function svg({ width, height, title, desc = "", style = "", body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="t d">
<title id="t">${esc(title)}</title>
<desc id="d">${esc(desc)}</desc>
<style>${style}
@media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}
</style>
${body}
</svg>
`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const monthName = (i) => MONTHS[i];
export const weekdayName = (i) => WEEKDAYS[i];

/** "2026-09-26" → "26 Sep 2026" */
export function formatDate(iso, { year = true } = {}) {
  const d = new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}${year ? " " + d.getUTCFullYear() : ""}`;
}

/** Split the flat calendar into Sunday-first weeks of { date, count }. */
export function weeks(calendar) {
  const out = [];
  for (let i = 0; i < calendar.length; i += 7) out.push(calendar.slice(i, i + 7));
  return out;
}

/** Top `n` languages plus an "Other" bucket that sums the rest. */
export function topLanguages(languages, n = 6, otherColor = "#8b949e") {
  const top = languages.slice(0, n);
  const rest = languages.slice(n).reduce((s, l) => s + l.share, 0);
  return rest > 0.0005 ? [...top, { name: "Other", color: otherColor, share: rest }] : top;
}

/** Deterministic PRNG so generated art is stable between runs with the same data. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
