// Variant "blueprint": the profile as an engineering drawing set on cyanotype paper.
// Sheet 1 general arrangement (hero), 2 measurements (stats), 3 bill of materials (stack),
// then one detail sheet per featured project and small linked contact tags.

// Palette tokens.
const C = {
  paper: "#103a5f",
  paperLight: "#17497a",
  paperDeep: "#072540",
  ink: "#e8f1fb",
  ink2: "#94b8d9",
  ink3: "#6890b8",
  grid: "rgba(232,241,251,.055)",
  gridMajor: "rgba(232,241,251,.12)",
  fill: "rgba(232,241,251,.045)",
  red: "#ff6b57",
};

// Type: IBM Plex Sans Condensed for lettering, IBM Plex Mono for figures and dimensions.
const FONTS = {
  c4: { family: "bpc", file: "plex-condensed-400", weight: 400 },
  c6: { family: "bpc", file: "plex-condensed-600", weight: 600 },
  c7: { family: "bpc", file: "plex-condensed-700", weight: 700 },
  m4: { family: "bpm", file: "plex-mono-400", weight: 400 },
  m6: { family: "bpm", file: "plex-mono-600", weight: 600 },
};
const FALLBACK = { bpc: `"Arial Narrow",sans-serif-condensed,sans-serif`, bpm: `ui-monospace,Menlo,Consolas,monospace` };

// Short notes for the bill of materials; anything missing prints as a dash.
const NOTES = {
  ".NET 10": "runtime",
  "ASP.NET Core": "HTTP APIs",
  "EF Core": "ORM, migrations",
  MediatR: "CQRS handlers",
  NestJS: "modular APIs",
  Hono: "lean HTTP on Bun",
  Bun: "runtime, scripts",
  Drizzle: "typed SQL",
  "React 19": "web UI",
  "Next.js": "SSR, routing",
  TypeScript: "everywhere",
  TanStack: "query, router",
  "Tailwind v4": "styling",
  Vite: "dev server, build",
  Angular: "enterprise SPAs",
  RxJS: "streams",
  Expo: "iOS and Android",
  "React Native": "native UI",
  Flutter: "Dart apps",
  SwiftUI: "iOS widgets",
  PostgreSQL: "primary store",
  "Row-level security": "tenant isolation",
  Zod: "edge validation",
  Docker: "every service",
  "GitHub Actions": "CI, this README",
  Turborepo: "monorepo builds",
  Vercel: "previews",
  Serilog: "structured logs",
  xUnit: ".NET tests",
  Vitest: "unit tests",
  Jest: "mobile tests",
  Playwright: "end-to-end",
  "Arch Linux": "daily driver",
  Hyprland: "tiling compositor",
  Quickshell: "QML dashboard",
  kitty: "terminal",
  zsh: "shell",
  "Claude Code": "pair programmer",
  Git: "always",
};

export async function render({ stats, config, lib }) {
  const { esc, r, num, pct, measure, icon, formatDate, weekdayName, monthName, topLanguages } = lib;

  // ---------- primitives ----------

  function ctx() {
    return { used: new Set(), id: 0 };
  }

  function css(c) {
    const faces = [...c.used]
      .map((k) => lib.fontFace(FONTS[k].family, FONTS[k].file, { weight: FONTS[k].weight }))
      .join("");
    const classes = Object.entries(FONTS)
      .filter(([k]) => c.used.has(k))
      .map(([k, f]) => `.${k}{font-family:${f.family},${FALLBACK[f.family]};font-weight:${f.weight}}`)
      .join("");
    return faces + classes + "text{font-kerning:normal}";
  }

  /** <text>. `f` is a key of FONTS; caps adds tracking for title-block field names. */
  function T(c, x, y, s, { f = "c4", size = 13, fill = C.ink, anchor = "start", ls = 0, cls = "", extra = "" } = {}) {
    c.used.add(f);
    return `<text class="${f}${cls ? " " + cls : ""}" x="${r(x)}" y="${r(y)}" font-size="${size}" fill="${fill}"` +
      (anchor !== "start" ? ` text-anchor="${anchor}"` : "") +
      (ls ? ` letter-spacing="${ls}"` : "") +
      (extra ? " " + extra : "") +
      `>${esc(s)}</text>`;
  }

  const W = (s, f, size, ls = 0) => measure(s, FONTS[f].file, size, ls);

  function wrap(s, f, size, max) {
    const lines = [];
    let line = "";
    for (const word of s.split(/\s+/)) {
      const next = line ? line + " " + word : word;
      if (line && W(next, f, size) > max) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  }

  const line = (x1, y1, x2, y2, { stroke = C.ink2, w = 1, extra = "" } = {}) =>
    `<path d="M${r(x1)} ${r(y1)}L${r(x2)} ${r(y2)}" stroke="${stroke}" stroke-width="${w}" fill="none"${extra ? " " + extra : ""}/>`;

  /** Rectangle as a <path> so it can be "drafted" with a normalised dash. */
  const box = (x, y, w, h, { stroke = C.ink, sw = 1.3, fill = "none", cls = "", style = "" } = {}) =>
    `<path${cls ? ` class="${cls}"` : ""}${style ? ` style="${style}"` : ""} pathLength="1" d="M${r(x)} ${r(y)}H${r(x + w)}V${r(y + h)}H${r(x)}Z" stroke="${stroke}" stroke-width="${sw}" fill="${fill}"/>`;

  const kyivDay = (iso) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Kyiv", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));

  const revised = formatDate(kyivDay(stats.generatedAt));
  const drawn = formatDate(kyivDay(stats.memberSince));
  const sheets = 3 + stats.featured.length;
  const dwg = (n) => `4BSR-${String(n).padStart(3, "0")}`;

  /** Background, grid, zone band and frame shared by every sheet. */
  function sheet(c, { w, h, cols, rows, outer = 6, band = 16, markerSize = 11 }) {
    const ix = outer + band;
    const iy = outer + band;
    const iw = w - 2 * ix;
    const ih = h - 2 * iy;
    const defs = `<defs>
<pattern id="gf" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="translate(${ix} ${iy})"><path d="M10 0H0V10" fill="none" stroke="${C.grid}" stroke-width=".6"/></pattern>
<pattern id="gm" width="50" height="50" patternUnits="userSpaceOnUse" patternTransform="translate(${ix} ${iy})"><path d="M50 0H0V50" fill="none" stroke="${C.gridMajor}" stroke-width=".6"/></pattern>
<radialGradient id="vg" cx="46%" cy="40%" r="78%"><stop offset="0" stop-color="${C.paperLight}" stop-opacity=".75"/><stop offset=".55" stop-color="${C.paper}" stop-opacity="0"/><stop offset="1" stop-color="${C.paperDeep}" stop-opacity=".8"/></radialGradient>
<filter id="mottle" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".0035 .006" numOctaves="3" seed="11"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .66  0 0 0 0 .9  0 0 0 .5 -.18"/></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="5" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .91  0 0 0 0 .95  0 0 0 0 .99  0 0 0 .07 0"/></filter>
<marker id="ah" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0 1.6L10 5L0 8.4Z" fill="${C.ink}"/></marker>
<marker id="dh" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0 2L10 5L0 8Z" fill="${C.ink2}"/></marker>
<marker id="rh" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0 2L10 5L0 8Z" fill="${C.red}"/></marker>
</defs>`;
    let s = defs;
    s += `<rect width="${w}" height="${h}" fill="${C.paper}"/>`;
    s += `<rect width="${w}" height="${h}" filter="url(#mottle)"/>`;
    s += `<rect width="${w}" height="${h}" fill="url(#vg)"/>`;
    s += `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="url(#gf)"/>`;
    s += `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="url(#gm)"/>`;
    s += `<rect width="${w}" height="${h}" filter="url(#grain)"/>`;
    // Trimmed edge and frame.
    s += `<rect x="${outer}" y="${outer}" width="${w - 2 * outer}" height="${h - 2 * outer}" fill="none" stroke="${C.ink2}" stroke-width=".8"/>`;
    s += `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="none" stroke="${C.ink}" stroke-width="1.8"/>`;
    // Zone markers: numbers across, letters down.
    const mid = outer + band / 2 + markerSize * 0.36;
    for (let i = 0; i < cols; i++) {
      const x0 = ix + (i * iw) / cols;
      if (i) {
        s += line(x0, outer, x0, iy, { stroke: C.ink2, w: 0.8 });
        s += line(x0, iy + ih, x0, h - outer, { stroke: C.ink2, w: 0.8 });
      }
      const cx = x0 + iw / cols / 2;
      s += T(c, cx, mid, String(i + 1), { f: "m4", size: markerSize, fill: C.ink2, anchor: "middle" });
      s += T(c, cx, h - outer - band / 2 + markerSize * 0.36, String(i + 1), { f: "m4", size: markerSize, fill: C.ink2, anchor: "middle" });
    }
    for (let j = 0; j < rows; j++) {
      const y0 = iy + (j * ih) / rows;
      if (j) {
        s += line(outer, y0, ix, y0, { stroke: C.ink2, w: 0.8 });
        s += line(ix + iw, y0, w - outer, y0, { stroke: C.ink2, w: 0.8 });
      }
      const cy = y0 + ih / rows / 2 + markerSize * 0.36;
      const letter = String.fromCharCode(65 + j);
      s += T(c, outer + band / 2, cy, letter, { f: "m4", size: markerSize, fill: C.ink2, anchor: "middle" });
      s += T(c, w - outer - band / 2, cy, letter, { f: "m4", size: markerSize, fill: C.ink2, anchor: "middle" });
    }
    // Centring marks.
    s += line(w / 2, outer, w / 2, iy + 7, { stroke: C.ink, w: 1.4 });
    s += line(w / 2, h - outer, w / 2, iy + ih - 7, { stroke: C.ink, w: 1.4 });
    s += line(outer, h / 2, ix + 7, h / 2, { stroke: C.ink, w: 1.4 });
    s += line(w - outer, h / 2, ix + iw - 7, h / 2, { stroke: C.ink, w: 1.4 });
    return { svg: s, x: ix, y: iy, w: iw, h: ih, right: ix + iw, bottom: iy + ih };
  }

  /** One title-block cell: tiny field name on top, value underneath. */
  function cell(c, x, y, w, h, label, value, { f = "c6", size = 13, fill = C.ink } = {}) {
    let s = `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" fill="none" stroke="${C.ink}" stroke-width="1"/>`;
    s += T(c, x + 6, y + 12, label, { f: "c6", size: 9.5, fill: C.ink2, ls: 0.9 });
    s += T(c, x + 6, y + h - 7, value, { f, size, fill });
    return s;
  }

  /** Compact title strip used on sheets 2+. */
  function strip(c, x, y, w, title, n) {
    const h = 40;
    const a = w * 0.5;
    const b = w * 0.27;
    let s = `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${h}" fill="${C.paper}" fill-opacity=".85"/>`;
    s += cell(c, x, y, a, h, "TITLE", title);
    s += cell(c, x + a, y, b, h, "DWG NO.", dwg(n), { f: "m4", size: 12 });
    s += cell(c, x + a + b, y, w - a - b, h, "SHEET", `${n} of ${sheets}`, { f: "m4", size: 12 });
    s += `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${h}" fill="none" stroke="${C.ink}" stroke-width="1.6"/>`;
    return s;
  }

  /** Horizontal dimension with extension lines and the value set in a break of the line. */
  function dimH(c, x1, x2, y, label, { from = null, f = "m4", size = 12, fill = C.ink2, stroke = C.ink2 } = {}) {
    let s = "";
    if (from !== null) {
      const dir = from > y ? -1 : 1;
      s += line(x1, from + dir * -3, x1, y + dir * 5, { stroke, w: 0.7 });
      s += line(x2, from + dir * -3, x2, y + dir * 5, { stroke, w: 0.7 });
    }
    const tw = W(label, f, size) + 12;
    const mid = (x1 + x2) / 2;
    s += `<path d="M${r(mid - tw / 2)} ${r(y)}H${r(x1)}" stroke="${stroke}" stroke-width=".8" marker-end="url(#dh)"/>`;
    s += `<path d="M${r(mid + tw / 2)} ${r(y)}H${r(x2)}" stroke="${stroke}" stroke-width=".8" marker-end="url(#dh)"/>`;
    s += T(c, mid, y + size * 0.36, label, { f, size, fill, anchor: "middle" });
    return s;
  }

  function dimV(c, x, y1, y2, label, { from = null, f = "m4", size = 12, fill = C.ink2, stroke = C.ink2 } = {}) {
    let s = "";
    if (from !== null) {
      s += line(from + 3, y1, x + 5, y1, { stroke, w: 0.7 });
      s += line(from + 3, y2, x + 5, y2, { stroke, w: 0.7 });
    }
    const tw = W(label, f, size) + 12;
    const mid = (y1 + y2) / 2;
    if (tw < y2 - y1 - 16) {
      s += `<path d="M${r(x)} ${r(mid - tw / 2)}V${r(y1)}" stroke="${stroke}" stroke-width=".8" marker-end="url(#dh)"/>`;
      s += `<path d="M${r(x)} ${r(mid + tw / 2)}V${r(y2)}" stroke="${stroke}" stroke-width=".8" marker-end="url(#dh)"/>`;
      s += T(c, x, mid, label, { f, size, fill, anchor: "middle", extra: `transform="rotate(-90 ${r(x)} ${r(mid)})" dy="${r(size * 0.36)}"` });
    } else {
      s += `<path d="M${r(x)} ${r(mid)}V${r(y1)}M${r(x)} ${r(mid)}V${r(y2)}" stroke="${stroke}" stroke-width=".8" marker-start="url(#dh)" marker-end="url(#dh)"/>`;
      s += T(c, x + 8, mid + size * 0.36, label, { f, size, fill });
    }
    return s;
  }

  /** Revision cloud: scalloped outline around a rectangle, clockwise so arcs bulge outward. */
  function cloud(x, y, w, h, step = 13) {
    const pts = [];
    const edge = (x1, y1, x2, y2) => {
      const len = Math.hypot(x2 - x1, y2 - y1);
      const n = Math.max(1, Math.round(len / step));
      for (let i = 1; i <= n; i++) pts.push([x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n, len / n]);
    };
    edge(x, y, x + w, y);
    edge(x + w, y, x + w, y + h);
    edge(x + w, y + h, x, y + h);
    edge(x, y + h, x, y);
    let d = `M${r(x)} ${r(y)}`;
    for (const [px, py, seg] of pts) d += `A${r(seg * 0.62)} ${r(seg * 0.62)} 0 0 1 ${r(px)} ${r(py)}`;
    return `<path d="${d}" fill="none" stroke="${C.red}" stroke-width="1.3" stroke-linejoin="round"/>`;
  }

  /** Revision delta: triangle with the revision letter. */
  const delta = (c, x, y, letter) =>
    `<path d="M${r(x)} ${r(y - 9)}L${r(x + 9)} ${r(y + 7)}L${r(x - 9)} ${r(y + 7)}Z" fill="${C.paper}" stroke="${C.red}" stroke-width="1.3" stroke-linejoin="round"/>` +
    T(c, x, y + 4.5, letter, { f: "m6", size: 10, fill: C.red, anchor: "middle" });

  /** Drafting fallback for a part with no glyph: a box with a diagonal cross. */
  const noGlyph = (x, y, s, stroke = C.ink2) =>
    `<path d="M${r(x + 1)} ${r(y + 1)}h${r(s - 2)}v${r(s - 2)}h${r(-(s - 2))}ZM${r(x + 1)} ${r(y + 1)}l${r(s - 2)} ${r(s - 2)}M${r(x + s - 1)} ${r(y + 1)}l${r(-(s - 2))} ${r(s - 2)}" fill="none" stroke="${stroke}" stroke-width=".9"/>`;

  const glyph = (slug, x, y, s, fill = C.ink) => (slug && lib.hasIcon(slug) ? icon(slug, x, y, s, fill) : noGlyph(x, y, s));

  /** Hatch patterns for monochrome fills, one per series. */
  const HATCH = [
    `<pattern id="h0" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V5" stroke="${C.ink}" stroke-width="1.1"/></pattern>`,
    `<pattern id="h1" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V6M0 0H6" stroke="${C.ink}" stroke-width=".9"/></pattern>`,
    `<pattern id="h2" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".95" fill="${C.ink}"/></pattern>`,
    `<pattern id="h3" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><path d="M0 0V5" stroke="${C.ink}" stroke-width="1.1"/></pattern>`,
    `<pattern id="h4" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 2H4" stroke="${C.ink}" stroke-width=".9"/></pattern>`,
    `<pattern id="h5" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M2 0V4" stroke="${C.ink}" stroke-width=".9"/></pattern>`,
    `<pattern id="h6" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><path d="M0 0V8" stroke="${C.ink}" stroke-width=".7"/></pattern>`,
  ];

  // ---------- sheet 1: general arrangement ----------

  function hero() {
    const c = ctx();
    const w = 848;
    const h = 584;
    const fr = sheet(c, { w, h, cols: 8, rows: 4 });
    let body = fr.svg;
    let anim = "";
    let draft = 0; // stagger counter for the drafting sequence
    const drafted = () => `animation-delay:${r(0.15 + draft++ * 0.12)}s`;

    // Title block geometry first: the schematic is laid out around it.
    const tbw = 330;
    const tbh = 156;
    const tbx = fr.right - tbw;
    const tby = fr.bottom - tbh;

    // Block helper: outline, title, symbol slot, rule, icon row, note lines.
    function block(x, y, bw, bh, title, icons, notes, symbol = "") {
      let s = box(x, y, bw, bh, { cls: "dr", style: drafted(), fill: C.fill });
      s += `<g class="tx" style="animation-delay:${r(0.5 + draft * 0.12)}s">`;
      s += T(c, x + 12, y + 21, title, { f: "c6", size: 15 });
      s += symbol;
      s += line(x, y + 32, x + bw, y + 32, { stroke: C.ink2, w: 0.7 });
      icons.forEach((slug, i) => (s += glyph(slug, x + 12 + i * 26, y + 42, 17)));
      notes.forEach((n, i) => (s += T(c, x + 12, y + 80 + i * 16, n, { f: "c4", size: 13, fill: C.ink2 })));
      s += `</g>`;
      return s;
    }

    // Columns.
    const cx1 = 46;
    const cw1 = 192;
    const cx2 = 330;
    const cw2 = 228;
    const cx3 = 646;
    const cw3 = 160;
    const top = 78;

    // Web client: browser symbol in the corner.
    const browserSym = (x, y) =>
      `<path d="M${x} ${y}h24v16h-24ZM${x} ${y + 4.5}h24" fill="none" stroke="${C.ink2}" stroke-width=".9"/>`;
    const phoneSym = (x, y) =>
      `<path d="M${x + 2} ${y}h9a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-14a2 2 0 0 1 2-2ZM${x + 4.5} ${y + 15.5}h4" fill="none" stroke="${C.ink2}" stroke-width=".9"/>`;
    const serverSym = (x, y) =>
      `<path d="M${x} ${y}h22v7h-22ZM${x} ${y + 9}h22v7h-22Z" fill="none" stroke="${C.ink2}" stroke-width=".9"/><circle cx="${x + 18}" cy="${y + 3.5}" r="1" fill="${C.ink2}"/><circle cx="${x + 18}" cy="${y + 12.5}" r="1" fill="${C.ink2}"/>`;

    body += block(cx1, top, cw1, 104, "Web client", ["react", "nextdotjs", "tanstack", "tailwindcss", "vite"],
      ["React 19, Next.js, TanStack,", "Tailwind v4, Angular"], browserSym(cx1 + cw1 - 36, top + 9));
    body += block(cx1, top + 122, cw1, 104, "Mobile client", ["expo", "react", "swift", "flutter"],
      ["Expo, React Native,", "SwiftUI widgets, Flutter"], phoneSym(cx1 + cw1 - 28, top + 7));

    // API layer: one block, two sections split by a section line.
    const apiH = 226;
    body += box(cx2, top, cw2, apiH, { cls: "dr", style: drafted(), fill: C.fill });
    body += `<g class="tx" style="animation-delay:${r(0.5 + draft * 0.12)}s">`;
    body += T(c, cx2 + 12, top + 21, "API layer", { f: "c6", size: 15 });
    body += serverSym(cx2 + cw2 - 34, top + 9);
    body += line(cx2, top + 32, cx2 + cw2, top + 32, { stroke: C.ink2, w: 0.7 });
    // Section A: .NET
    body += icon("dotnet", cx2 + 12, top + 44, 22, C.ink);
    body += T(c, cx2 + 44, top + 54, ".NET 10", { f: "c6", size: 14 });
    body += T(c, cx2 + 44, top + 70, "ASP.NET Core, EF Core,", { f: "c4", size: 13, fill: C.ink2 });
    body += T(c, cx2 + 44, top + 86, "MediatR, Serilog, xUnit", { f: "c4", size: 13, fill: C.ink2 });
    body += line(cx2 + 8, top + 112, cx2 + cw2 - 8, top + 112, { stroke: C.ink2, w: 0.8, extra: `stroke-dasharray="14 3 2 3"` });
    body += T(c, cx2 + cw2 - 10, top + 108, "or", { f: "c4", size: 12, fill: C.ink3, anchor: "end" });
    // Section B: TypeScript on Bun / Node
    body += icon("typescript", cx2 + 12, top + 124, 22, C.ink);
    body += T(c, cx2 + 44, top + 136, "TypeScript on Bun", { f: "c6", size: 14 });
    body += T(c, cx2 + 44, top + 152, "NestJS, Hono, Drizzle,", { f: "c4", size: 13, fill: C.ink2 });
    body += T(c, cx2 + 44, top + 168, "Zod, WebSockets", { f: "c4", size: 13, fill: C.ink2 });
    ["nestjs", "hono", "bun", "drizzle", "zod"].forEach((s, i) => (body += glyph(s, cx2 + 44 + i * 26, top + 186, 17)));
    body += `</g>`;

    // PostgreSQL as a cylinder: visible front edge solid, hidden back edge dashed, centre line.
    const dx = cx3 + cw3 / 2;
    const rx = cw3 / 2;
    const ry = 15;
    const dTop = top + 18;
    const dBot = top + apiH - 16;
    body += `<path class="dr" style="${drafted()}" pathLength="1" d="M${cx3} ${dTop}V${dBot}A${rx} ${ry} 0 0 0 ${cx3 + cw3} ${dBot}V${dTop}" fill="${C.fill}" stroke="${C.ink}" stroke-width="1.3"/>`;
    body += `<ellipse cx="${dx}" cy="${dTop}" rx="${rx}" ry="${ry}" fill="${C.paper}" fill-opacity=".6" stroke="${C.ink}" stroke-width="1.3"/>`;
    body += `<path d="M${cx3} ${dBot}A${rx} ${ry} 0 0 1 ${cx3 + cw3} ${dBot}" fill="none" stroke="${C.ink2}" stroke-width=".9" stroke-dasharray="4 3"/>`;
    body += `<path d="M${cx3} ${dTop + 66}A${rx} ${ry} 0 0 0 ${cx3 + cw3} ${dTop + 66}" fill="none" stroke="${C.ink2}" stroke-width=".8"/>`;
    body += line(dx, dTop - ry - 12, dx, dBot + ry + 12, { stroke: C.ink3, w: 0.7, extra: `stroke-dasharray="16 3 2 3"` });
    body += `<g class="tx" style="animation-delay:${r(0.5 + draft * 0.12)}s">`;
    body += icon("postgresql", dx - 30, dTop + 28, 22, C.ink);
    body += T(c, dx - 3, dTop + 45, "Data", { f: "c6", size: 15 });
    body += T(c, dx, dTop + 104, "PostgreSQL 17", { f: "c6", size: 15, anchor: "middle" });
    body += T(c, dx, dTop + 122, "row-level security,", { f: "c4", size: 13, fill: C.ink2, anchor: "middle" });
    body += T(c, dx, dTop + 138, "migrations, PL/pgSQL", { f: "c4", size: 13, fill: C.ink2, anchor: "middle" });
    body += `</g>`;

    // Delivery chain under the API.
    const dy = top + apiH + 30;
    const dh = 36;
    const chain = [
      { x: cx1, w: 150, label: "Turborepo", icon: "turborepo" },
      { x: cx1 + 178, w: 160, label: "GitHub Actions", icon: "githubactions" },
      { x: cx1 + 366, w: cw2 - 10 + (cx2 - cx1 - 366) + 10, label: "Docker compose", icon: "docker" },
    ];
    for (const d of chain) {
      body += box(d.x, dy, d.w, dh, { cls: "dr", style: drafted(), fill: C.fill, sw: 1.1 });
      body += `<g class="tx" style="animation-delay:${r(0.5 + draft * 0.12)}s">`;
      body += icon(d.icon, d.x + 10, dy + 10, 16, C.ink);
      body += T(c, d.x + 34, dy + 23, d.label, { f: "c6", size: 13.5 });
      body += `</g>`;
    }

    // Connectors with arrowheads, labels and travelling packets.
    const flows = [];
    const conn = (d, label, lx, ly, { both = false, anchor = "middle" } = {}) => {
      body += `<path d="${d}" stroke="${C.ink2}" stroke-width="1.1" fill="none" marker-end="url(#ah)"${both ? ` marker-start="url(#ah)"` : ""}/>`;
      if (label) body += T(c, lx, ly, label, { f: "m4", size: 12, fill: C.ink2, anchor });
      flows.push(d);
    };
    const webY = top + 52;
    const mobY = top + 122 + 52;
    conn(`M${cx1 + cw1} ${webY}H${cx2 - 1}`, "REST/JSON", (cx1 + cw1 + cx2) / 2, webY - 8);
    conn(`M${cx1 + cw1} ${mobY}H${cx2 - 1}`, "REST, push", (cx1 + cw1 + cx2) / 2, mobY - 8);
    const sqlY = top + 96;
    conn(`M${cx2 + cw2 + 1} ${sqlY}H${cx3 - 1}`, "SQL, RLS", (cx2 + cw2 + cx3) / 2, sqlY - 8, { both: true });
    conn(`M${chain[0].x + chain[0].w} ${dy + dh / 2}H${chain[1].x - 1}`, "", 0, 0);
    conn(`M${chain[1].x + chain[1].w} ${dy + dh / 2}H${chain[2].x - 1}`, "", 0, 0);
    const upX = chain[2].x + chain[2].w / 2 + 40;
    conn(`M${upX} ${dy}V${top + apiH + 1}`, "deploy", upX + 8, dy - 9, { anchor: "start" });

    // Packets: one dash per connector, plus a reply travelling back from the database.
    const packets = [...flows, `M${cx3 - 1} ${sqlY}H${cx2 + cw2 + 1}`];
    packets.forEach((d, i) => {
      const len = pathLen(d);
      const dash = 9;
      const period = len + dash;
      const dur = r(1.6 + len / 90, 2);
      anim += `@keyframes p${i}{from{stroke-dashoffset:${r(period)}}to{stroke-dashoffset:0}}`;
      body += `<path d="${d}" fill="none" stroke="${i === packets.length - 1 ? C.red : C.ink}" stroke-width="3" stroke-linecap="round" stroke-dasharray="${dash} ${r(len)}" ` +
        `style="animation:fi .3s 2s both,p${i} ${dur}s linear ${r(2.1 + i * 0.37)}s infinite"/>`;
    });

    // Overall dimension: the full width of the arrangement, one person.
    body += dimH(c, cx1, cx3 + cw3, 50, `end to end, ${config.experience}`, { from: top, f: "m4", size: 12 });

    // Notes, with the work in progress clouded in red.
    const nx = cx1;
    let ny = dy + dh + 36;
    body += T(c, nx, ny, "Notes", { f: "c7", size: 15 });
    body += line(nx, ny + 4, nx + W("Notes", "c7", 15), ny + 4, { stroke: C.ink, w: 1 });
    ny += 22;
    const noteW = tbx - nx - 30;
    const tagLines = wrap(config.tagline, "c4", 13, noteW - 18);
    body += T(c, nx, ny, "1.", { f: "m4", size: 12, fill: C.ink2 });
    tagLines.forEach((l, i) => (body += T(c, nx + 18, ny + i * 16, l, { f: "c4", size: 13 })));
    ny += tagLines.length * 16 + 10;
    body += T(c, nx, ny, "2.", { f: "m4", size: 12, fill: C.ink2 });
    body += T(c, nx + 18, ny, "In progress, clouded at revision C:", { f: "c4", size: 13 });
    ny += 27;
    const cloudTop = ny - 15;
    config.now.forEach((n, i) => {
      const [head, ...rest] = n.split(":");
      const y = ny + i * 16;
      body += T(c, nx + 18, y, head + (rest.length ? ":" : ""), { f: "c6", size: 13, fill: C.ink });
      if (rest.length) body += T(c, nx + 18 + W(head + ":", "c6", 13) + 4, y, rest.join(":").trim(), { f: "c4", size: 13, fill: C.ink2 });
    });
    const cloudBottom = ny + (config.now.length - 1) * 16 + 8;
    const nowW = (n) => {
      const [head, ...rest] = n.split(":");
      return rest.length ? W(head + ":", "c6", 13) + 4 + W(rest.join(":").trim(), "c4", 13) : W(n, "c6", 13);
    };
    const cloudRight = Math.min(tbx - 24, nx + 18 + Math.max(...config.now.map(nowW)) + 12);
    body += `<g class="rv">${cloud(nx + 10, cloudTop, cloudRight - nx - 10, cloudBottom - cloudTop)}${delta(c, cloudRight + 2, cloudTop - 2, "C")}</g>`;

    // Title block.
    let tb = `<rect x="${tbx}" y="${tby}" width="${tbw}" height="${tbh}" fill="${C.paper}" fill-opacity=".9"/>`;
    const rowH = 31;
    const nameH = tbh - rowH * 3;
    tb += `<rect x="${tbx}" y="${tby}" width="${tbw}" height="${nameH}" fill="none" stroke="${C.ink}" stroke-width="1"/>`;
    tb += T(c, tbx + 8, tby + 13, "DRAWN FOR", { f: "c6", size: 9.5, fill: C.ink2, ls: 0.9 });
    tb += T(c, tbx + 8, tby + 38, config.name, { f: "c7", size: 26, ls: 0.2 });
    tb += T(c, tbx + tbw - 8, tby + 13, config.role, { f: "c4", size: 12, fill: C.ink2, anchor: "end" });
    let ry0 = tby + nameH;
    tb += cell(c, tbx, ry0, 126, rowH, "LOCATION", config.location);
    tb += cell(c, tbx + 126, ry0, tbw - 126, rowH, "COORDINATES", config.coords, { f: "m4", size: 12 });
    ry0 += rowH;
    tb += cell(c, tbx, ry0, 96, rowH, "EXPERIENCE", config.experience);
    tb += cell(c, tbx + 96, ry0, 117, rowH, "DRAWN", drawn, { f: "m4", size: 12 });
    tb += cell(c, tbx + 213, ry0, tbw - 213, rowH, "REVISED", revised, { f: "m4", size: 12, fill: C.ink });
    ry0 += rowH;
    tb += cell(c, tbx, ry0, 96, rowH, "DWG NO.", dwg(1), { f: "m6", size: 12 });
    tb += cell(c, tbx + 96, ry0, 117, rowH, "SCALE", "1:1", { f: "m6", size: 12 });
    tb += cell(c, tbx + 213, ry0, tbw - 213, rowH, "SHEET", `1 of ${sheets}`, { f: "m6", size: 12 });
    tb += `<rect x="${tbx}" y="${tby}" width="${tbw}" height="${tbh}" fill="none" stroke="${C.ink}" stroke-width="1.8"/>`;
    body += tb;

    const style = css(c) +
      `.dr{stroke-dasharray:1;animation:draft 1.1s cubic-bezier(.6,0,.3,1) both}` +
      `@keyframes draft{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}` +
      `.tx{animation:fi .7s ease-out both}.rv{animation:fi .5s 2.4s both}` +
      `@keyframes fi{from{opacity:0}}` + anim;

    return lib.svg({
      width: w,
      height: h,
      title: `${config.name}, ${config.role}: general arrangement`,
      desc: `Engineering drawing of the stack: web and mobile clients call ASP.NET Core or TypeScript APIs on Bun, backed by PostgreSQL with row-level security; Turborepo, GitHub Actions and Docker deliver it. ${config.location}.`,
      style,
      body,
    });
  }

  // Length of an M…H/V path made of axis-aligned segments.
  function pathLen(d) {
    let x = 0, y = 0, len = 0;
    for (const [, cmd, a, b] of d.matchAll(/([MHVL])\s*(-?[\d.]+)(?:\s+(-?[\d.]+))?/g)) {
      if (cmd === "M") { x = +a; y = +b; }
      else if (cmd === "H") { len += Math.abs(+a - x); x = +a; }
      else if (cmd === "V") { len += Math.abs(+a - y); y = +a; }
      else if (cmd === "L") { len += Math.hypot(+a - x, +b - y); x = +a; y = +b; }
    }
    return len;
  }

  // ---------- sheet 2: measurements ----------

  function measurements() {
    const c = ctx();
    const w = 848;
    // Bands are laid out top-down at fixed offsets, so the sheet height follows the leader count.
    const nSmall = Math.max(0, topLanguages(stats.languages, 5).length - 1);
    const h = Math.max(262 + 28 + 6 * 19, 352 + 19 * Math.max(0, nSmall - 1)) + 36 + 162;
    const fr = sheet(c, { w, h, cols: 8, rows: 4 });
    let body = fr.svg;
    let anim = "";
    body += `<defs>${HATCH.join("")}</defs>`;

    const x0 = 46;
    body += T(c, x0, 56, "Contribution record", { f: "c7", size: 19 });
    body += T(c, x0 + W("Contribution record", "c7", 19) + 12, 56,
      `last 12 months, ${num(stats.totals.contributionsLastYear)} contributions`, { f: "c4", size: 13, fill: C.ink2 });

    // Calendar as a measured grid. Monday-first rows read like a European week.
    const cal = stats.calendar;
    const max = Math.max(1, ...cal.map((d) => d.count));
    const pitch = 13.2;
    const gx = 82;
    const gy = 96;
    const order = [1, 2, 3, 4, 5, 6, 0]; // row index -> weekday
    const rowOf = (wd) => order.indexOf(wd);
    const nWeeks = Math.ceil(cal.length / 7) + 1;
    let cells = "";
    let fills = "";
    let peak = null;
    let lastMonth = -1;
    // Column = Monday-based week.
    const first = new Date(cal[0].date + "T00:00:00Z");
    const firstMon = new Date(first);
    firstMon.setUTCDate(first.getUTCDate() - ((first.getUTCDay() + 6) % 7));
    const colOf = (iso) => Math.floor((new Date(iso + "T00:00:00Z") - firstMon) / 864e5 / 7);
    const usedCols = colOf(cal[cal.length - 1].date) + 1;
    for (const d of cal) {
      const dt = new Date(d.date + "T00:00:00Z");
      const col = colOf(d.date);
      const row = rowOf(dt.getUTCDay());
      const x = gx + col * pitch;
      const y = gy + row * pitch;
      cells += `M${r(x)} ${r(y)}h11v11h-11Z`;
      if (d.count > 0) {
        const s = 2.6 + 8.4 * Math.sqrt(d.count / max);
        const o = (11 - s) / 2;
        fills += `<rect x="${r(x + o)}" y="${r(y + o)}" width="${r(s)}" height="${r(s)}" fill="${C.ink}" style="animation-delay:${r(0.2 + col * 0.035)}s"/>`;
      }
      if (d.date === stats.busiestDay.date) peak = { x: x + 5.5, y: y + 5.5 };
      if (dt.getUTCDate() <= 7 && dt.getUTCDay() === 1 && dt.getUTCMonth() !== lastMonth) {
        lastMonth = dt.getUTCMonth();
        body += T(c, x, gy - 9, monthName(dt.getUTCMonth()), { f: "m4", size: 11, fill: C.ink2 });
      }
    }
    body += `<path d="${cells}" fill="none" stroke="${C.ink2}" stroke-opacity=".38" stroke-width=".6"/>`;
    body += `<g class="cg">${fills}</g>`;
    ["Mon", "Wed", "Fri"].forEach((lbl, i) => (body += T(c, gx - 8, gy + (i * 2) * pitch + 9.5, lbl, { f: "m4", size: 11, fill: C.ink2, anchor: "end" })));
    const gRight = gx + usedCols * pitch - 2.2;
    const gBottom = gy + 7 * pitch - 2.2;
    body += dimH(c, gx, gRight, gBottom + 20, `${usedCols} weeks`, { from: gBottom });
    body += dimV(c, gRight + 18, gy, gBottom, "7 days", { from: gRight });

    // Peak callout in red.
    if (peak) {
      const lx = peak.x - 70;
      const ly = 74;
      const label = `peak ${stats.busiestDay.count} on ${formatDate(stats.busiestDay.date)}`;
      body += `<g class="rv"><circle cx="${r(peak.x)}" cy="${r(peak.y)}" r="9" fill="none" stroke="${C.red}" stroke-width="1.3"/>`;
      const ex = peak.x - 9 * Math.SQRT1_2;
      const ey = peak.y - 9 * Math.SQRT1_2;
      const ld = `M${r(ex)} ${r(ey)}L${r(lx)} ${ly}H${r(lx - W(label, "m4", 12) - 8)}`;
      body += `<path d="${ld}" fill="none" stroke="${C.paper}" stroke-width="3.5" stroke-opacity=".8"/>`;
      body += `<path d="${ld}" fill="none" stroke="${C.red}" stroke-width="1"/>`;
      body += T(c, lx - 4, ly - 5, label, { f: "m4", size: 12, fill: C.red, anchor: "end" });
      body += `</g>`;
    }

    // Key figures: a schedule with dotted leaders.
    const ry0 = 262;
    const t = stats.totals;
    const rows = [
      ["Contributions, 12 months", num(t.contributionsLastYear)],
      ["Commits", num(t.commits)],
      ["Pull requests", `${num(t.pullRequests)} (${num(t.mergedPullRequests)} merged)`],
      ["Issues", num(t.issues)],
      ["Current streak", `${stats.streak.current} days`],
      ["Longest streak", `${stats.streak.longest} days`],
      ["Repositories", num(t.repositories)],
    ];
    body += T(c, x0, ry0, "Key figures", { f: "c7", size: 16 });
    const fw = 244;
    rows.forEach(([k, v], i) => {
      const y = ry0 + 28 + i * 19;
      body += T(c, x0, y, k, { f: "c4", size: 13, fill: C.ink2 });
      const vw = W(v, "m6", 12.5);
      const kw = W(k, "c4", 13);
      body += `<path d="M${r(x0 + kw + 5)} ${r(y)}H${r(x0 + fw - vw - 5)}" stroke="${C.ink3}" stroke-width="1" stroke-dasharray="1 3"/>`;
      body += T(c, x0 + fw, y, v, { f: "m6", size: 12.5, anchor: "end" });
    });
    const figBottom = ry0 + 28 + (rows.length - 1) * 19;

    // Language composition: one stacked bar with a ruler, hatched segments, leaders.
    const bx = x0 + fw + 46;
    body += T(c, bx, ry0, "Language composition", { f: "c7", size: 16 });
    body += T(c, bx + W("Language composition", "c7", 16) + 10, ry0, "share of bytes in own repositories", { f: "c4", size: 13, fill: C.ink2 });
    const bw = fr.right - 20 - bx;
    const by = ry0 + 44;
    const bh = 24;
    for (let p = 0; p <= 100; p += 2) {
      const x = bx + (bw * p) / 100;
      const major = p % 10 === 0;
      body += line(x, by - (major ? 9 : 4), x, by - 1, { stroke: C.ink2, w: major ? 0.9 : 0.6 });
      if (p % 20 === 0) body += T(c, x, by - 13, `${p}`, { f: "m4", size: 11, fill: C.ink2, anchor: p === 0 ? "start" : p === 100 ? "end" : "middle" });
    }
    const langs = topLanguages(stats.languages, 5);
    let acc = 0;
    const segs = langs.map((l, i) => {
      const s = { ...l, x: bx + bw * acc, w: bw * l.share, i };
      acc += l.share;
      return s;
    });
    let bars = "";
    segs.forEach((s) => {
      bars += `<rect x="${r(s.x)}" y="${by}" width="${r(Math.max(1, s.w))}" height="${bh}" fill="url(#h${s.i % HATCH.length})" stroke="${C.ink}" stroke-width="1"/>`;
    });
    body += `<g class="lb">${bars}</g>`;
    body += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="none" stroke="${C.ink}" stroke-width="1.4"/>`;
    // Leaders: the largest share drops straight down; the rest step down to a right-aligned column.
    const lead = (s, ty, lx, k) => {
      const sx = s.x + s.w / 2;
      let d = `M${r(sx)} ${by + bh}V${r(ty)}`;
      if (lx !== null) d += `H${r(lx)}`;
      let out = `<circle cx="${r(sx)}" cy="${by + bh}" r="1.8" fill="${C.ink}"/>`;
      out += `<path d="${d}" fill="none" stroke="${C.ink2}" stroke-width=".8"/>`;
      const tx = (lx ?? sx) - 6;
      const value = pct(s.share);
      out += T(c, tx, ty + 4.5, value, { f: "m4", size: 12, fill: C.ink2, anchor: "end" });
      out += T(c, tx - W(value, "m4", 12) - 6, ty + 4.5, s.name, { f: "c6", size: 13, anchor: "end" });
      return out;
    };
    const [big, ...small] = segs;
    body += lead(big, by + bh + 22, null);
    const colX = small.length ? small[0].x + small[0].w / 2 - 24 : 0;
    small.forEach((s, k) => (body += lead(s, by + bh + 22 + k * 19, colX)));
    const langBottom = by + bh + 22 + Math.max(0, small.length - 1) * 19;

    // Bottom band: weekly rhythm, notes, title strip.
    const sy = Math.max(langBottom, figBottom) + 36;
    body += T(c, x0, sy, "Weekly rhythm", { f: "c7", size: 16 });
    const wdOrder = [1, 2, 3, 4, 5, 6, 0];
    const wmax = Math.max(1, ...stats.weekdays);
    const ground = sy + 104;
    const bwid = 20;
    const gap = 9;
    let wbars = "";
    wdOrder.forEach((wd, i) => {
      const v = stats.weekdays[wd];
      const bh2 = Math.max(1.5, (v / wmax) * 64);
      const x = x0 + i * (bwid + gap);
      wbars += `<rect x="${x}" y="${r(ground - bh2)}" width="${bwid}" height="${r(bh2)}" fill="url(#h0)" stroke="${C.ink}" stroke-width="1"/>`;
      body += T(c, x + bwid / 2, ground - bh2 - 6, num(v), { f: "m4", size: 11, fill: C.ink2, anchor: "middle" });
      body += T(c, x + bwid / 2, ground + 17, weekdayName(wd).slice(0, 2), { f: "m4", size: 11, fill: C.ink2, anchor: "middle" });
    });
    body += `<g class="wb">${wbars}</g>`;
    const gw = 7 * (bwid + gap) - gap;
    body += line(x0 - 6, ground, x0 + gw + 6, ground, { stroke: C.ink, w: 1.3 });
    let gt = "";
    for (let x = x0 - 2; x < x0 + gw + 8; x += 6) gt += `M${r(x)} ${ground + 1}l-4 5`;
    body += `<path d="${gt}" stroke="${C.ink2}" stroke-width=".7"/>`;

    const stw = 280;
    const nx = x0 + gw + 50;
    const notesW = fr.right - stw - nx - 24;
    body += T(c, nx, sy, "Notes", { f: "c7", size: 16 });
    let nyy = sy + 26;
    [
      "Square size follows the square root of the day's count.",
      "Private contributions are included.",
      "Generated code and build files are left out of language shares.",
    ].forEach((n, i) => {
      body += T(c, nx, nyy, `${i + 1}.`, { f: "m4", size: 11.5, fill: C.ink2 });
      wrap(n, "c4", 12.5, notesW - 18).forEach((l, k) => (body += T(c, nx + 18, nyy + k * 15, l, { f: "c4", size: 12.5, fill: C.ink2 })));
      nyy += wrap(n, "c4", 12.5, notesW - 18).length * 15 + 6;
    });

    body += strip(c, fr.right - stw, fr.bottom - 40, stw, "Measurements", 2);

    const style = css(c) +
      `.cg rect{transform-box:fill-box;transform-origin:center;animation:grow .5s cubic-bezier(.3,1.4,.6,1) both}` +
      `@keyframes grow{from{transform:scale(0)}}` +
      `.lb{animation:wipe 1.2s cubic-bezier(.6,0,.2,1) .4s both}@keyframes wipe{from{clip-path:inset(0 100% 0 0)}}` +
      `.wb rect{transform-box:fill-box;transform-origin:bottom;animation:rise .8s cubic-bezier(.3,1.2,.6,1) 1s both}@keyframes rise{from{transform:scaleY(0)}}` +
      `.rv{animation:fi .5s 2.6s both}@keyframes fi{from{opacity:0}}` + anim;

    return lib.svg({
      width: w,
      height: h,
      title: "Measurements: contributions and languages",
      desc: `${num(stats.totals.contributionsLastYear)} contributions in the last 12 months, peak ${stats.busiestDay.count} on ${formatDate(stats.busiestDay.date)}. ` +
        `${num(stats.totals.commits)} commits, ${stats.totals.pullRequests} pull requests, ${stats.totals.issues} issues, current streak ${stats.streak.current} days. ` +
        `Languages: ${langs.map((l) => `${l.name} ${pct(l.share)}`).join(", ")}.`,
      style,
      body,
    });
  }

  // ---------- sheet 3: bill of materials ----------

  function bom() {
    const c = ctx();
    const w = 848;
    const layers = config.stack;
    const total = layers.reduce((n, l) => n + l.items.length, 0);
    // Split layers into two columns, keeping order, as evenly as possible.
    let split = 1;
    let best = Infinity;
    for (let k = 1; k < layers.length; k++) {
      const a = layers.slice(0, k).reduce((n, l) => n + l.items.length, 0);
      const diff = Math.abs(total - 2 * a);
      if (diff < best) { best = diff; split = k; }
    }
    const colsData = [layers.slice(0, split), layers.slice(split)];
    const rowH = 21;
    const headH = 24;
    const maxRows = Math.max(...colsData.map((cl) => cl.reduce((n, l) => n + l.items.length, 0)));
    const tableTop = 78;
    const tableH = headH + maxRows * rowH;
    const h = Math.ceil(tableTop + tableH + 24 + 40 + 22 + 10);
    const fr = sheet(c, { w, h, cols: 8, rows: 4 });
    let body = fr.svg;
    const x0 = 46;
    body += T(c, x0, 56, "Bill of materials", { f: "c7", size: 19 });
    body += T(c, x0 + W("Bill of materials", "c7", 19) + 12, 56, `the stack, ${total} parts in ${layers.length} layers`, { f: "c4", size: 13, fill: C.ink2 });

    const tw = (fr.right - 20 - x0 - 24) / 2;
    let item = 1;
    let rowsAnim = "";
    colsData.forEach((cl, ci) => {
      const tx = x0 + ci * (tw + 24);
      const cNo = 34;
      const cPart = 142;
      const cLayer = 76;
      const cNote = tw - cNo - cPart - cLayer;
      // Header.
      let t = `<rect x="${r(tx)}" y="${tableTop}" width="${r(tw)}" height="${tableH}" fill="${C.fill}"/>`;
      const heads = [["ITEM", 0], ["PART", cNo], ["LAYER", cNo + cPart], ["NOTE", cNo + cPart + cLayer]];
      heads.forEach(([hd, off]) => (t += T(c, tx + off + 7, tableTop + 16, hd, { f: "c6", size: 10, fill: C.ink2, ls: 1 })));
      t += line(tx, tableTop + headH, tx + tw, tableTop + headH, { stroke: C.ink, w: 1.2 });
      [cNo, cNo + cPart, cNo + cPart + cLayer].forEach((off) => (t += line(tx + off, tableTop, tx + off, tableTop + tableH, { stroke: C.ink2, w: 0.7 })));
      let y = tableTop + headH;
      cl.forEach((layer, li) => {
        if (li) t += line(tx, y, tx + tw, y, { stroke: C.ink, w: 1 });
        layer.items.forEach((it, k) => {
          const by = y + k * rowH;
          if (k) {
            // Layer cells stay merged down the group, so row rules skip that column.
            t += line(tx + cNo, by, tx + cNo + cPart, by, { stroke: C.ink2, w: 0.5, extra: `stroke-opacity=".45"` });
            t += line(tx + cNo + cPart + cLayer, by, tx + tw, by, { stroke: C.ink2, w: 0.5, extra: `stroke-opacity=".45"` });
          }
          t += `<g style="animation-delay:${r(0.1 + item * 0.035)}s">`;
          t += T(c, tx + cNo - 8, by + 15, String(item).padStart(2, "0"), { f: "m4", size: 11.5, fill: C.ink2, anchor: "end" });
          t += glyph(it.icon, tx + cNo + 7, by + 4, 13);
          t += T(c, tx + cNo + 27, by + 15, it.name, { f: "c6", size: 13 });
          if (k === 0) {
            let ls = 13;
            while (W(layer.layer, "c4", ls) > cLayer - 12 && ls > 11) ls -= 0.25;
            t += T(c, tx + cNo + cPart + 7, by + 15, layer.layer, { f: "c4", size: ls, fill: C.ink2 });
          }
          const note = NOTES[it.name] ?? "-";
          let ns = 12.5;
          while (W(note, "c4", ns) > cNote - 12 && ns > 11) ns -= 0.25;
          t += T(c, tx + cNo + cPart + cLayer + 7, by + 15, note, { f: "c4", size: ns, fill: C.ink2 });
          t += `</g>`;
          item++;
        });
        y += layer.items.length * rowH;
      });
      // Empty rows to square the table off.
      t += `<rect x="${r(tx)}" y="${tableTop}" width="${r(tw)}" height="${tableH}" fill="none" stroke="${C.ink}" stroke-width="1.6"/>`;
      rowsAnim += t;
    });
    body += `<g class="bm">${rowsAnim}</g>`;
    body += T(c, x0, fr.bottom - 14, "Parts without a glyph are drawn as a crossed box.", { f: "c4", size: 12, fill: C.ink3 });
    body += noGlyph(x0 + W("Parts without a glyph are drawn as a crossed box.", "c4", 12) + 8, fr.bottom - 25, 13);
    const stw = 300;
    body += strip(c, fr.right - stw, fr.bottom - 40, stw, "Bill of materials", 3);

    const style = css(c) + `.bm g{animation:fi .4s ease-out both}@keyframes fi{from{opacity:0}}`;
    return lib.svg({
      width: w,
      height: h,
      title: "Bill of materials: the stack by layer",
      desc: layers.map((l) => `${l.layer}: ${l.items.map((i) => i.name).join(", ")}`).join(". ") + ".",
      style,
      body,
    });
  }

  // ---------- detail sheets: featured projects ----------

  // Glyph for a free-form stack label: match against config.stack names by prefix.
  const stackIcons = config.stack.flatMap((l) => l.items).filter((i) => i.icon);
  const iconFor = (label) => {
    const k = label.toLowerCase();
    const hit = stackIcons.find((i) => k.startsWith(i.name.toLowerCase().split(" ")[0].replace(/\d+$/, "")));
    return hit && lib.hasIcon(hit.icon) ? hit.icon : null;
  };

  // Layout of a detail sheet's body, shared by the measuring pass and the drawing pass.
  function projectLayout(p) {
    const fy = 18;
    const maxW = 420 - 2 * 18 - 32;
    const lines = wrap(p.description ?? "", "c4", 13.5, maxW);
    let ty = fy + 70 + lines.length * 18 + 14 + 9;
    let tx = 0;
    const tags = [];
    for (const s of p.stack) {
      const ic = iconFor(s);
      const tw = W(s, "c6", 12.5) + 16 + (ic ? 18 : 0);
      if (tx && tx + tw > maxW) { tx = 0; ty += 27; }
      tags.push({ s, ic, x: tx, y: ty, w: tw });
      tx += tw + 7;
    }
    return { lines, tags, bottom: ty + 20 };
  }
  const projectH = Math.max(0, ...stats.featured.map((p) => projectLayout(p).bottom)) + 26 + 40 + 18;

  function project(p, n, letter) {
    const c = ctx();
    const w = 420;
    const h = projectH;
    const fr = sheet(c, { w, h, cols: 4, rows: 3, outer: 5, band: 13, markerSize: 9.5 });
    let body = fr.svg;
    const x0 = fr.x + 16;
    const L = projectLayout(p);
    // Detail balloon, then the name.
    body += `<circle cx="${x0 + 12}" cy="${fr.y + 27}" r="12" fill="none" stroke="${C.ink}" stroke-width="1.3"/>`;
    body += T(c, x0 + 12, fr.y + 32, letter, { f: "c7", size: 14, anchor: "middle" });
    body += T(c, x0 + 34, fr.y + 37, p.name, { f: "c7", size: 27 });
    const host = p.homepage ? p.homepage.replace(/^https?:\/\//, "").replace(/\/$/, "") : `github.com/${config.login}/${p.name}`;
    body += T(c, fr.right - 16, fr.y + 34, host, { f: "m4", size: 11.5, fill: C.ink2, anchor: "end" });
    body += line(fr.x, fr.y + 50, fr.right, fr.y + 50, { stroke: C.ink, w: 1 });
    L.lines.forEach((l, i) => (body += T(c, x0, fr.y + 72 + i * 18, l, { f: "c4", size: 13.5, fill: C.ink })));
    // Materials as outlined tags.
    body += T(c, x0, fr.y + 72 + L.lines.length * 18 + 14, "Materials", { f: "c6", size: 12, fill: C.ink2 });
    for (const t of L.tags) {
      const tx = x0 + t.x;
      const ty = t.y + 2;
      body += `<rect x="${r(tx)}" y="${r(ty)}" width="${r(t.w)}" height="21" fill="${C.fill}" stroke="${C.ink2}" stroke-width=".9"/>`;
      if (t.ic) body += icon(t.ic, tx + 7, ty + 4.5, 12, C.ink);
      body += T(c, tx + 8 + (t.ic ? 18 : 0), ty + 15, t.s, { f: "c6", size: 12.5 });
    }
    // Figures row as a title strip.
    const sh = 40;
    const sy = fr.bottom - sh;
    const cw = fr.w / 4;
    body += `<rect x="${fr.x}" y="${sy}" width="${fr.w}" height="${sh}" fill="${C.paper}" fill-opacity=".85"/>`;
    body += cell(c, fr.x, sy, cw, sh, "COMMITS", num(p.commits), { f: "m6", size: 12.5 });
    body += cell(c, fr.x + cw, sy, cw, sh, "LANGUAGE", p.language?.name ?? "-", { f: "c6", size: 13 });
    body += cell(c, fr.x + 2 * cw, sy, cw, sh, "LAST PUSH", formatDate(kyivDay(p.pushedAt)), { f: "m4", size: 11.5 });
    body += cell(c, fr.x + 3 * cw, sy, cw, sh, "SHEET", `${n} of ${sheets}`, { f: "m6", size: 12 });
    body += line(fr.x, sy, fr.right, sy, { stroke: C.ink, w: 1.6 });

    return lib.svg({
      width: w,
      height: h,
      title: `${p.name}: detail sheet`,
      desc: `${p.description ?? ""} Stack: ${p.stack.join(", ")}. ${p.commits} commits, ${p.language?.name ?? ""}.`,
      style: css(c),
      body,
    });
  }

  // ---------- contact tags ----------

  function tag(label, value) {
    const c = ctx();
    const w = 272;
    const h = 62;
    let body = `<rect width="${w}" height="${h}" fill="${C.paper}"/>`;
    body += `<rect x="4" y="4" width="${w - 8}" height="${h - 8}" fill="none" stroke="${C.ink2}" stroke-width=".8"/>`;
    body += `<rect x="9" y="9" width="${w - 18}" height="${h - 18}" fill="none" stroke="${C.ink}" stroke-width="1.6"/>`;
    // Punched hole, like a parts tag.
    body += `<circle cx="27" cy="${h / 2}" r="6" fill="none" stroke="${C.ink}" stroke-width="1.2"/><path d="M27 ${h / 2 - 11}V${h / 2 + 11}M16 ${h / 2}H38" stroke="${C.ink3}" stroke-width=".6" stroke-dasharray="3 2 1 2"/>`;
    body += T(c, 48, 27, label, { f: "c6", size: 12, fill: C.ink2 });
    let vs = 15;
    while (W(value, "m6", vs) > w - 66 && vs > 11) vs -= 0.5;
    body += T(c, 48, 45, value, { f: "m6", size: vs });
    return lib.svg({ width: w, height: h, title: `${label}: ${value}`, style: css(c), body });
  }

  // ---------- assemble ----------

  const files = {
    "hero.svg": hero(),
    "stats.svg": measurements(),
    "bom.svg": bom(),
  };
  const projects = stats.featured.map((p, i) => {
    const file = `project-${p.name.toLowerCase()}.svg`;
    files[file] = project(p, 4 + i, String.fromCharCode(65 + i));
    return { ...p, file };
  });

  const L = config.links;
  const contacts = [
    L.email && { file: "contact-email.svg", href: L.email, label: "Email", value: L.email.replace(/^mailto:/, "") },
    L.telegram && { file: "contact-telegram.svg", href: L.telegram, label: "Telegram", value: "@" + L.telegram.split("/").pop() },
    L.linkedin && { file: "contact-linkedin.svg", href: L.linkedin, label: "LinkedIn", value: "in/" + L.linkedin.split("/").pop() },
  ].filter(Boolean);
  for (const ct of contacts) files[ct.file] = tag(ct.label, ct.value);

  const t = stats.totals;
  const homepages = projects.filter((p) => p.homepage);

  const readme = (base) => `<p align="center">
  <img src="${base}hero.svg" width="100%" alt="General arrangement drawing: web and mobile clients call ASP.NET Core or TypeScript APIs on Bun, backed by PostgreSQL; title block reads ${esc(config.name)}, ${esc(config.role)}, ${esc(config.location)}.">
</p>

I’m **${config.name}**, a ${config.role.toLowerCase()} in ${config.location.split(",")[0]}. ${config.tagline} The sheets below are redrawn every day from the GitHub API.

<p align="center">
  <img src="${base}stats.svg" width="100%" alt="Measurements: ${num(t.contributionsLastYear, ",")} contributions in the last 12 months, ${num(t.commits, ",")} commits, ${t.pullRequests} pull requests, ${t.issues} issues, current streak ${stats.streak.current} days; language composition led by ${esc(stats.languages[0]?.name ?? "")}.">
</p>

<p align="center">
  <img src="${base}bom.svg" width="100%" alt="Bill of materials: ${esc(config.stack.map((l) => `${l.layer}: ${l.items.map((i) => i.name).join(", ")}`).join("; "))}.">
</p>

<p align="center">
${projects.map((p) => `  <a href="${p.url}"><img src="${base}${p.file}" width="49%" alt="${esc(p.name)}: ${esc(p.description ?? "")}"></a>`).join("\n")}
</p>
${homepages.length ? `
<p align="center"><sub>${homepages.map((p) => `${esc(p.name)} runs in production at <a href="${p.homepage}">${esc(p.homepage.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a>`).join(". ")}.</sub></p>
` : ""}
<p align="center">
${contacts.map((ct) => `  <a href="${ct.href}"><img src="${base}${ct.file}" width="32%" alt="${ct.label}: ${esc(ct.value)}"></a>`).join("\n")}
</p>

<p align="center"><sub>Drawn by <code>scripts/build.mjs</code>, last revised ${revised}.</sub></p>
`;

  return { files, readme };
}
