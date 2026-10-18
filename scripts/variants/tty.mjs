// Variant "tty": the profile is a screenshot of the actual desktop.
// Numbers come from the dotfiles: kitty bg #0b0f14 / fg #dce3ea at 30% opacity with blur,
// Hyprland gaps_in 5, gaps_out 12, border_size 2, rounding 12, default active border gradient.

// ---------------------------------------------------------------------------------------------
// Tokens

const C = {
  bg: "#0b0f14",
  fg: "#dce3ea",
  dim: "#8592a1",
  faint: "#4a5666",
  // 16-colour scheme, tuned for frosted glass over the wallpaper
  black: "#1c232d", red: "#f2777a", green: "#94d39b", yellow: "#f3cf7a",
  blue: "#72b7ff", magenta: "#c8a2ff", cyan: "#6fe0dc", white: "#c4cdd6",
  brBlack: "#3b4654", brRed: "#ff9da0", brGreen: "#b7ebbb", brYellow: "#ffe3a3",
  brBlue: "#a3d0ff", brMagenta: "#e0c6ff", brCyan: "#a3f0ec", brWhite: "#f3f7fa",
  arch: "#1793d1",
  archLight: "#5cc6f2",
  // Hyprland: col.active_border = rgba(33ccffee) rgba(00ff99ee) 45deg
  activeA: "#33ccff", activeB: "#00ff99", inactive: "#595959",
  // btop "Default" theme
  cpuBox: "#4f9a5a", memBox: "#a8a53a", procBox: "#b54a4a", hiFg: "#e05555",
  graphLo: "#50f095", graphMid: "#f2e266", graphHi: "#fa1e1e", selectedBg: "#6a2f2f",
};

const HYPR = { gapsIn: 5, gapsOut: 12, border: 2, rounding: 12 };
const GLASS = 0.6; // kitty runs at 0.30; a little more ink keeps text legible in a static image

const FS = 12.5; // terminal font size
const CW = FS * 0.6; // JetBrains Mono advance
const LH = 18;
const W = 848;

// Wallpaper: deep dusk with an aurora. Positions are fractions of the image box.
const BLOBS = [
  { cx: 0.1, cy: 0.12, rx: 0.42, ry: 0.4, c: "#16618a", o: 0.95 },
  { cx: 0.5, cy: 0.0, rx: 0.34, ry: 0.22, c: "#1f8f86", o: 0.75 },
  { cx: 0.8, cy: 0.42, rx: 0.36, ry: 0.42, c: "#5a3fd6", o: 0.9 },
  { cx: 0.97, cy: 1.0, rx: 0.34, ry: 0.36, c: "#c43d86", o: 0.85 },
  { cx: 0.22, cy: 0.98, rx: 0.38, ry: 0.22, c: "#e2855a", o: 0.5 },
  { cx: 0.45, cy: 0.62, rx: 0.24, ry: 0.22, c: "#1d3fb8", o: 0.55 },
];
const AURORA = [
  { x: 0.18, y: 0.3, len: 0.7, th: 0.05, rot: -18, c: "#3be0b0", o: 0.45 },
  { x: 0.42, y: 0.18, len: 0.55, th: 0.035, rot: -24, c: "#7cf2d0", o: 0.35 },
  { x: 0.62, y: 0.7, len: 0.5, th: 0.04, rot: -14, c: "#8f6bff", o: 0.35 },
];

const ARCH = [
  "                   -`",
  "                  .o+`",
  "                 `ooo/",
  "                `+oooo:",
  "               `+oooooo:",
  "               -+oooooo+:",
  "             `/:-:++oooo+:",
  "            `/++++/+++++++:",
  "           `/++++++++++++++:",
  "          `/+++ooooooooooooo/`",
  "         ./ooosssso++osssssso+`",
  "        .oossssso-````/ossssss+`",
  "       -osssssso.      :ssssssso.",
  "      :osssssss/        osssso+++.",
  "     /ossssssss/        +ssssooo/-",
  "   `/ossssso+/:-        -:/+osssso+-",
  "  `+sso+:-`                 `.-/+oso:",
  " `++:.                           `-/+/",
  " .`                                 `/",
];

// ---------------------------------------------------------------------------------------------
// Helpers local to this variant

let L; // lib, set in render()

const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbToHex = (rgb) => "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const mix = (a, b, t) => rgbToHex(hexToRgb(a).map((v, i) => v + (hexToRgb(b)[i] - v) * t));
/** Lighten a brand colour toward white until it reads on the dark glass. */
function lift(hex, min = 4.2, bg = "#10151f") {
  let c = hex;
  for (let t = 0; t <= 1 && contrast(c, bg) < min; t += 0.06) c = mix(hex, "#ffffff", t);
  return c;
}
function gradientAt(stops, t) {
  const seg = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1)));
  return mix(stops[seg], stops[seg + 1], t * (stops.length - 1) - seg);
}

/**
 * One line of terminal text. `segs` is [[text, className], ...] laid on the monospace grid.
 * Every word gets an explicit x so whitespace never collapses.
 */
function tline(x, y, segs, { cw = CW, cls = "", attrs = "" } = {}) {
  let col = 0;
  let out = "";
  for (const [text, c = ""] of segs) {
    for (const tok of String(text).split(/( +)/)) {
      if (!tok) continue;
      if (/^ +$/.test(tok)) { col += tok.length; continue; }
      out += `<tspan x="${L.r(x + col * cw)}"${c ? ` class="${c}"` : ""}>${L.esc(tok)}</tspan>`;
      col += [...tok].length;
    }
  }
  return `<text y="${L.r(y)}"${cls ? ` class="${cls}"` : ""}${attrs ? " " + attrs : ""}>${out}</text>`;
}

/** Greedy word wrap to `cols` characters. */
function wrap(text, cols) {
  const lines = [];
  let cur = "";
  for (const word of text.split(/\s+/)) {
    if (!cur) cur = word;
    else if (cur.length + 1 + word.length <= cols) cur += " " + word;
    else { lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Join names with " · " as long as they fit in `cols`; skip the ones that don't. */
function fitJoin(names, cols) {
  let out = "";
  for (const n of names) {
    const next = out ? `${out} · ${n}` : n;
    if (next.length <= cols) out = next;
  }
  return out;
}

function kyiv(iso, opts) {
  const tz = (() => {
    try { new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv" }); return "Europe/Kyiv"; }
    catch { return "Europe/Kiev"; }
  })();
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, ...opts }).format(new Date(iso));
}

const delay = (s) => `style="animation-delay:${s.toFixed(2)}s"`;

function baseStyle(weights) {
  const files = { 400: "jetbrains-mono-400", 700: "jetbrains-mono-700", 800: "jetbrains-mono-800" };
  return weights.map((w) => L.fontFace("jbm", files[w], { weight: w })).join("") + `
svg{font-size:${FS}px}
text{font-family:"jbm",ui-monospace,SFMono-Regular,Menlo,monospace;fill:${C.fg}}
.b{font-weight:700}.fg{fill:${C.fg}}.dim{fill:${C.dim}}.faint{fill:${C.faint}}
.red{fill:${C.red}}.green{fill:${C.green}}.yellow{fill:${C.yellow}}.blue{fill:${C.blue}}
.magenta{fill:${C.magenta}}.cyan{fill:${C.cyan}}.white{fill:${C.brWhite}}.arch{fill:${C.archLight}}.hi{fill:${C.hiFg}}`;
}

// ---------------------------------------------------------------------------------------------
// Scene pieces

/** Blurred dusk wallpaper with aurora curtains and film grain. */
function wallpaper(id, w, h, { seed = 1, intensity = 1 } = {}) {
  const rand = L.rng(seed);
  const j = (v, amt) => v + (rand() - 0.5) * amt;
  const blur = Math.max(w, h) * 0.075;
  const blobs = BLOBS.map((b) => {
    const cx = j(b.cx, 0.12) * w, cy = j(b.cy, 0.12) * h;
    return `<ellipse cx="${L.r(cx)}" cy="${L.r(cy)}" rx="${L.r(b.rx * w)}" ry="${L.r(b.ry * Math.max(h, w * 0.5))}" fill="${b.c}" opacity="${L.r(b.o * intensity)}"/>`;
  }).join("");
  const aurora = AURORA.map((a) => {
    const x = j(a.x, 0.1) * w, y = j(a.y, 0.1) * h;
    return `<ellipse cx="${L.r(x + (a.len * w) / 2)}" cy="${L.r(y)}" rx="${L.r((a.len * w) / 2)}" ry="${L.r(a.th * Math.max(h, 300))}" fill="${a.c}" opacity="${L.r(a.o * intensity)}" transform="rotate(${a.rot} ${L.r(x)} ${L.r(y)})"/>`;
  }).join("");
  return {
    defs: `
<linearGradient id="${id}-base" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#070a1a"/><stop offset=".55" stop-color="#0c0e26"/><stop offset="1" stop-color="#140a22"/></linearGradient>
<filter id="${id}-blur" x="${-w}" y="${-h}" width="${w * 3}" height="${h * 3}" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="${L.r(blur)}"/></filter>
<filter id="${id}-soft" x="${-w}" y="${-h}" width="${w * 3}" height="${h * 3}" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="${L.r(blur * 0.32)}"/></filter>
<filter id="${id}-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch" seed="${seed}"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .055 0"/></filter>`,
    body: `<rect width="${w}" height="${h}" fill="url(#${id}-base)"/>
<g filter="url(#${id}-blur)">${blobs}</g>
<g filter="url(#${id}-soft)">${aurora}</g>
<rect width="${w}" height="${h}" filter="url(#${id}-grain)"/>`,
  };
}

/** Shared defs for windows: shadow, glass sheen, Hyprland border gradients. */
const windowDefs = `
<filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feGaussianBlur stdDeviation="9"/></filter>
<linearGradient id="active" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.activeA}" stop-opacity=".93"/><stop offset="1" stop-color="${C.activeB}" stop-opacity=".93"/></linearGradient>
<linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".07"/><stop offset=".35" stop-color="#ffffff" stop-opacity="0"/></linearGradient>`;

/** A tiled kitty window: soft shadow, frosted glass, 2px border inside the box. */
function frame(x, y, w, h, { active = false } = {}) {
  const rr = HYPR.rounding, b = HYPR.border;
  return `<g>
<rect x="${x + 3}" y="${y + 8}" width="${w - 6}" height="${h - 4}" rx="${rr}" fill="#000" opacity=".38" filter="url(#shadow)"/>
<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rr}" fill="${C.bg}" fill-opacity="${GLASS}"/>
<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rr}" fill="url(#sheen)"/>
<rect x="${x + b / 2}" y="${y + b / 2}" width="${w - b}" height="${h - b}" rx="${rr - b / 2}" fill="none" stroke="${active ? "url(#active)" : C.inactive}" stroke-opacity="${active ? 1 : 0.67}" stroke-width="${b}"/>
</g>`;
}

/** zsh prompt: "~ ❯ " then the command. Returns [segments, promptLength]. */
const prompt = (cmd = "", dir = "~") => [[[dir + " ", "cyan b"], ["❯ ", "magenta b"], [cmd, "fg"]], dir.length + 3];

/**
 * btop box: rounded border with titles cut into the top line, btop's ┐title┌ ticks included.
 * titles: [{ text, x?, align: "left"|"center"|"right", hi?: superscript digit }]
 */
function btopBox(x, y, w, h, color, titles, { fs = FS } = {}) {
  const cw = fs * 0.6;
  const rr = 7;
  const gaps = [];
  let labels = "";
  for (const t of titles) {
    const len = (t.hi ? 1 : 0) + [...t.text].length;
    const tw = len * cw;
    const tx = t.align === "center" ? x + (w - tw) / 2 : t.align === "right" ? x + w - 14 - tw : x + 14;
    gaps.push([tx - 6, tx + tw + 6]);
    const sup = t.hi ? `<tspan class="hi b" font-size="${L.r(fs * 0.8)}" dy="-3.5">${t.hi}</tspan><tspan dy="3.5">` : "<tspan>";
    labels += `<text x="${L.r(tx)}" y="${L.r(y + fs * 0.36)}" class="${t.cls ?? "white b"}">${sup}${L.esc(t.text)}</tspan></text>`;
  }
  gaps.sort((a, b) => a[0] - b[0]);
  let d = "";
  let cursor = x + rr;
  for (const [g0, g1] of gaps) {
    d += `M${L.r(cursor)} ${y}H${L.r(g0)}v4M${L.r(g1)} ${y + 4}v-4`;
    cursor = g1;
  }
  d += `M${L.r(cursor)} ${y}H${x + w - rr}a${rr} ${rr} 0 0 1 ${rr} ${rr}V${y + h - rr}a${rr} ${rr} 0 0 1 ${-rr} ${rr}H${x + rr}a${rr} ${rr} 0 0 1 ${-rr} ${-rr}V${y + rr}a${rr} ${rr} 0 0 1 ${rr} ${-rr}`;
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.3" stroke-linecap="round"/>${labels}`;
}

/** Sum the calendar into buckets of `size` days, newest bucket last. */
function buckets(calendar, size) {
  const days = calendar.slice(-Math.floor(calendar.length / size) * size);
  const out = [];
  for (let i = 0; i < days.length; i += size) {
    const chunk = days.slice(i, i + size);
    out.push({ date: chunk[0].date, count: chunk.reduce((n, d) => n + d.count, 0) });
  }
  return out;
}

/**
 * btop braille graph: every bucket is a dotted column (a dashed stroke with round caps),
 * coloured by height through the green→yellow→red gradient. Unlit dots are a faint pattern.
 */
function brailleGraph(id, x, y, w, h, series, { px = 3.6, py = 4.5, animate = false, start = 0, span = 1 } = {}) {
  const rows = Math.max(1, Math.floor(h / py));
  const gh = rows * py;
  const pitch = w / series.length;
  const max = Math.max(1, ...series.map((s) => s.count));
  const top = y + (h - gh);
  let cols = "";
  series.forEach((s, i) => {
    if (s.count <= 0) return;
    const lit = Math.max(1, Math.ceil((s.count / max) * rows));
    const cx = x + pitch * (i + 0.5);
    const y0 = top + gh - py / 2;
    const len = (lit - 1) * py + 0.01;
    const anim = animate ? ` class="sweep" ${delay(start + (i / series.length) * span)}` : "";
    cols += `<path d="M${L.r(cx)} ${L.r(y0)}v${L.r(-len)}"${anim}/>`;
  });
  return {
    defs: `<linearGradient id="${id}-g" gradientUnits="userSpaceOnUse" x1="0" y1="${L.r(top + gh)}" x2="0" y2="${L.r(top)}"><stop offset="0" stop-color="${C.graphLo}"/><stop offset=".55" stop-color="${C.graphMid}"/><stop offset="1" stop-color="${C.graphHi}"/></linearGradient>
<pattern id="${id}-p" x="${L.r(x)}" y="${L.r(top)}" width="${L.r(pitch)}" height="${py}" patternUnits="userSpaceOnUse"><circle cx="${L.r(pitch / 2)}" cy="${py / 2}" r="${L.r(Math.min(px, pitch) * 0.27)}" fill="#fff" fill-opacity=".07"/></pattern>`,
    body: `<rect x="${L.r(x)}" y="${L.r(top)}" width="${L.r(w)}" height="${L.r(gh)}" fill="url(#${id}-p)"/>
<g fill="none" stroke="url(#${id}-g)" stroke-width="${L.r(Math.min(px, pitch) * 0.6)}" stroke-linecap="round" stroke-dasharray="0 ${py}">${cols}</g>`,
    pitch,
    top,
    gh,
  };
}

function folderIcon(x, y, s, color) {
  const k = s / 16;
  return `<path transform="translate(${L.r(x)} ${L.r(y)}) scale(${L.r(k, 3)})" d="M1.5 3.5A1.5 1.5 0 0 1 3 2h3.6l1.6 1.8H13a1.5 1.5 0 0 1 1.5 1.5v7.2A1.5 1.5 0 0 1 13 14H3a1.5 1.5 0 0 1-1.5-1.5z" fill="${color}"/>`;
}

/** Typographic fallback for tools without a simple-icons glyph: initial in a rounded square. */
function monogram(x, y, s, letter, color) {
  return `<rect x="${L.r(x + 0.75)}" y="${L.r(y + 0.75)}" width="${s - 1.5}" height="${s - 1.5}" rx="3.5" fill="none" stroke="${color}" stroke-width="1.3"/>` +
    `<text x="${L.r(x + s / 2)}" y="${L.r(y + s * 0.72)}" text-anchor="middle" font-size="${L.r(s * 0.62)}" class="b" fill="${color}" style="fill:${color}">${L.esc(letter)}</text>`;
}

function starIcon(x, y, s, color) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? s * 0.22 : s * 0.5;
    pts.push(`${L.r(x + s / 2 + Math.cos(a) * rad)},${L.r(y + s / 2 + Math.sin(a) * rad)}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="${color}"/>`;
}

/** Wraps a scene in an image with rounded corners so it reads as a screenshot. */
function scene({ w, h, title, desc, weights, extraStyle = "", defs = "", body }) {
  return L.svg({
    width: w,
    height: h,
    title,
    desc,
    style: baseStyle(weights) + extraStyle,
    body: `<defs>${windowDefs}${defs}<clipPath id="screen"><rect width="${w}" height="${h}" rx="14"/></clipPath></defs>
<g clip-path="url(#screen)">${body}</g>`,
  });
}

// ---------------------------------------------------------------------------------------------
// Images

function hero({ stats, config }) {
  const g = HYPR.gapsOut, gi = HYPR.gapsIn * 2;

  // waybar
  const barY = 8, barH = 30;
  const clock = kyiv(stats.generatedAt, { weekday: "short", day: "numeric", month: "short" }) + "  " +
    kyiv(stats.generatedAt, { hour: "2-digit", minute: "2-digit", hour12: false });
  const right = [
    [`${L.num(stats.totals.contributionsLastYear)}`, "contributions"],
    [`${stats.streak.current}d`, "streak"],
  ];
  let rx = W - g - 14;
  let rightMods = "";
  for (const [v, label] of right.reverse()) {
    const len = v.length + 1 + label.length;
    rx -= len * CW;
    rightMods += tline(rx, barY + 19.5, [[v, "fg b"], [" " + label, "dim"]]);
    rx -= 22;
  }
  let ws = "";
  let wx = g + 36;
  for (let i = 1; i <= 5; i++) {
    if (i === 1) {
      ws += `<rect x="${wx}" y="${barY + 9}" width="26" height="12" rx="6" fill="url(#active)"/>`;
      wx += 34;
    } else {
      const occupied = i <= 3;
      ws += `<circle cx="${wx + 5}" cy="${barY + 15}" r="4" fill="${occupied ? C.white : C.faint}" fill-opacity="${occupied ? 0.75 : 1}"/>`;
      wx += 18;
    }
  }
  const bar = `<rect x="${g}" y="${barY}" width="${W - 2 * g}" height="${barH}" rx="10" fill="${C.bg}" fill-opacity=".55"/>
<rect x="${g + 0.5}" y="${barY + 0.5}" width="${W - 2 * g - 1}" height="${barH - 1}" rx="9.5" fill="none" stroke="#fff" stroke-opacity=".08"/>
${L.icon("archlinux", g + 12, barY + 7, 16, C.archLight)}${ws}
${tline(W / 2 - (clock.length * CW) / 2, barY + 19.5, [[clock, "fg b"]])}
${rightMods}`;

  // tiling: master on the left, stack of two on the right (dwindle)
  const top = barY + barH + 10;
  const leftW = 534;
  const A = { x: g, y: top, w: leftW, h: 0 };
  const rxw = W - g - (g + leftW + gi);
  const B = { x: g + leftW + gi, y: top, w: rxw, h: 0 };
  const padX = 18, padY = 30;

  // --- window A: fastfetch -------------------------------------------------------------------
  const [ps, plen] = prompt("");
  const ax = A.x + padX;
  let a = tline(ax, A.y + padY, ps);
  const cmd = "fastfetch";
  const t0 = 0.3, tStep = 0.075;
  [...cmd].forEach((ch, i) => {
    a += `<text x="${L.r(ax + (plen + i) * CW)}" y="${A.y + padY}" class="fg on" ${delay(t0 + i * tStep)}>${L.esc(ch)}</text>`;
  });
  const typedEnd = t0 + cmd.length * tStep;
  const curH = FS * 1.25;
  a += `<g class="tc"><rect class="tcm" x="${L.r(ax + plen * CW)}" y="${L.r(A.y + padY - FS * 0.95)}" width="${L.r(CW)}" height="${L.r(curH)}" fill="${C.fg}" fill-opacity=".85"/></g>`;

  const outY = A.y + padY + LH * 1.5;
  const logoFS = 9.2, logoCW = logoFS * 0.6, logoLH = 10.6;
  const outStart = typedEnd + 0.25;
  ARCH.forEach((line, i) => {
    a += tline(ax, outY - FS * 0.2 + i * logoLH, [[line]], {
      cw: logoCW,
      cls: "b rv",
      attrs: `font-size="${logoFS}" style="fill:url(#archgrad);animation-delay:${(outStart + i * 0.03).toFixed(2)}s"`,
    });
  });
  const logoW = Math.max(...ARCH.map((l) => l.length)) * logoCW;
  const ix = ax + logoW + 22;
  const valueCols = Math.floor((A.x + A.w - padX - ix) / CW) - 10;
  const layer = (name) => config.stack.find((s) => s.layer === name)?.items.map((i) => i.name) ?? [];
  const info = [
    [["abooser", "cyan b"], ["@", "fg"], ["arch", "cyan b"]],
    [["─".repeat(12), "faint"]],
    ["OS", "Arch Linux x86_64"],
    ["WM", "Hyprland"],
    ["Shell", "zsh"],
    ["Terminal", "kitty"],
    ["Role", config.role],
    ["Location", config.location],
    ["Uptime", config.experience],
    ["Backend", fitJoin(layer("backend"), valueCols)],
    ["Frontend", fitJoin(layer("frontend"), valueCols)],
    ["Mobile", fitJoin(layer("mobile"), valueCols)],
    ["Data", fitJoin(layer("data"), valueCols)],
    ["Activity", `${L.num(stats.totals.contributionsLastYear)} contributions/yr`],
  ];
  info.forEach((row, i) => {
    const y = outY + i * LH;
    const d = delay(outStart + 0.05 + i * 0.045);
    if (typeof row[0] === "string") {
      a += tline(ix, y, [[row[0].padEnd(10), "arch b"], [row[1], "fg"]], { cls: "rv", attrs: d });
    } else {
      a += tline(ix, y, row, { cls: "rv", attrs: d });
    }
  });
  const palY = outY + (info.length + 0.5) * LH;
  const pal = [
    [C.black, C.red, C.green, C.yellow, C.blue, C.magenta, C.cyan, C.white],
    [C.brBlack, C.brRed, C.brGreen, C.brYellow, C.brBlue, C.brMagenta, C.brCyan, C.brWhite],
  ];
  const palDelay = outStart + 0.05 + info.length * 0.045;
  pal.forEach((rowc, r) => {
    a += `<g class="rv" ${delay(palDelay + r * 0.05)}>` + rowc.map((c, i) =>
      `<rect x="${L.r(ix + i * CW * 3)}" y="${L.r(palY - FS + r * 15)}" width="${L.r(CW * 3)}" height="15" fill="${c}"/>`).join("") + "</g>";
  });
  const finalY = palY + 2 * 15 + LH * 1.5;
  const finalAt = palDelay + 0.35;
  a += `<g class="on" ${delay(finalAt)}>${tline(ax, finalY, prompt("")[0])}<rect class="blink" ${delay(finalAt)} x="${L.r(ax + plen * CW)}" y="${L.r(finalY - FS * 0.95)}" width="${L.r(CW)}" height="${L.r(curH)}" fill="${C.fg}" fill-opacity=".85"/></g>`;
  A.h = finalY + 22 - A.y;
  const H = A.y + A.h + g;
  const wp = wallpaper("wp", W, H, { seed: 7, intensity: 1 });

  // --- window B1: cat now.md -----------------------------------------------------------------
  const bx = B.x + padX - 2;
  const cols = Math.floor((B.w - 2 * (padX - 2)) / CW);
  let b1 = tline(bx, B.y + padY, prompt("cat now.md")[0]);
  let by = B.y + padY + LH;
  b1 += tline(bx, by, [["# now", "magenta b"]]);
  by += LH * 1.5;
  for (const item of config.now) {
    const [name, ...rest] = item.split(":");
    const body = rest.join(":").trim();
    const lines = wrap(`${name}: ${body}`, cols - 2);
    lines.forEach((ln, i) => {
      if (i === 0) {
        const after = ln.slice(name.length + 1);
        b1 += tline(bx, by, [["- ", "faint"], [name, "yellow b"], [":", "dim"], [after, "fg"]]);
      } else {
        b1 += tline(bx, by, [["  " + ln, "fg"]]);
      }
      by += LH;
    });
    by += 3;
  }
  B.h = by - B.y + 6;

  // --- window B2: btop, contributions only ---------------------------------------------------
  const B2 = { x: B.x, y: B.y + B.h + gi, w: B.w, h: 0 };
  B2.h = A.y + A.h - B2.y;
  const box = { x: B2.x + 12, y: B2.y + 18, w: B2.w - 24, h: B2.h - 30 };
  let b2 = btopBox(box.x, box.y, box.w, box.h, C.cpuBox, [
    { text: "contributions", hi: "¹" },
    { text: "1y", align: "right", cls: "dim" },
  ]);
  const gx = box.x + 12, gw = box.w - 24;
  const series = buckets(stats.calendar, Math.ceil(stats.calendar.length / Math.floor(gw / 4)));
  const footer = 44;
  const graph = brailleGraph("mini", gx, box.y + 14, gw, box.h - 14 - footer, series, { py: 4.4 });
  b2 += graph.body;
  b2 += tline(gx, box.y + box.h - 22, [[L.num(stats.totals.contributionsLastYear), "fg b"], [" this year", "dim"]]);
  b2 += tline(gx, box.y + box.h - 8, [["streak ", "dim"], [`${stats.streak.current}d`, "green b"], ["  peak ", "dim"], [String(stats.busiestDay.count), "red b"], [`/day`, "dim"]]);

  const body = `${wp.body}
${bar}
${frame(A.x, A.y, A.w, A.h, { active: true })}
${frame(B.x, B.y, B.w, B.h)}
${frame(B2.x, B2.y, B2.w, B2.h)}
${a}
${b1}
${b2}`;

  const archLogoTop = outY - FS;
  return scene({
    w: W,
    h: H,
    title: `${config.name}: ${config.role}, ${config.location}`,
    desc: `Hyprland desktop on Arch Linux. A kitty terminal runs fastfetch: ${config.role} in ${config.location}, ${config.experience} of experience; backend ${layer("backend").slice(0, 4).join(", ")}; frontend ${layer("frontend").slice(0, 4).join(", ")}; mobile ${layer("mobile").slice(0, 2).join(", ")}. Side windows list current work and a one-year contribution graph: ${stats.totals.contributionsLastYear} contributions, ${stats.streak.current}-day streak.`,
    weights: [400, 700],
    defs: wp.defs + graph.defs +
      `<linearGradient id="archgrad" gradientUnits="userSpaceOnUse" x1="0" y1="${L.r(archLogoTop)}" x2="0" y2="${L.r(archLogoTop + ARCH.length * logoLH)}"><stop offset="0" stop-color="#8fdcff"/><stop offset=".6" stop-color="${C.archLight}"/><stop offset="1" stop-color="${C.arch}"/></linearGradient>`,
    extraStyle: `
@keyframes on{from{opacity:0}to{opacity:1}}
@keyframes rv{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}
@keyframes tcv{0%,99%{opacity:1}100%{opacity:0}}
@keyframes tcm{from{transform:translateX(0)}to{transform:translateX(${L.r(cmd.length * CW)}px)}}
@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
.on{animation:on .01s steps(1) both}
.rv{animation:rv .22s ease-out both}
.tc{opacity:0;animation:tcv ${(typedEnd + 0.2).toFixed(2)}s linear both}
.tcm{animation:tcm ${(cmd.length * tStep).toFixed(2)}s steps(${cmd.length},end) ${t0}s both}
.blink{animation:blink 1.1s step-end infinite}`,
    body,
  });
}

function stack({ config }) {
  const groups = config.stack.map((g, i) => ({ ...g, i, rows: 1 + g.items.length }));
  // Balance groups over three columns: minimise the tallest column, keep layer order inside each.
  const n = groups.length;
  let best = null;
  for (let code = 0; code < 3 ** n; code++) {
    const cols = [[], [], []];
    let c = code;
    for (let i = 0; i < n; i++) { cols[c % 3].push(groups[i]); c = Math.floor(c / 3); }
    if (cols.some((col) => !col.length)) continue;
    const hs = cols.map((col) => col.reduce((s, g) => s + g.rows, 0) + (col.length - 1) * 0.6);
    const score = Math.max(...hs) * 1000 + hs.reduce((s, h) => s + h * h, 0) / 100 +
      cols.reduce((s, col, ci) => s + col.reduce((t, g) => t + Math.abs(g.i / n * 3 - ci), 0), 0) * 0.01;
    if (!best || score < best.score) best = { score, cols, hs };
  }
  best.cols.sort((p, q) => p[0].i - q[0].i);

  const rowH = 21, iconS = 14;
  const pad = 22;
  const win = { x: HYPR.gapsOut, y: HYPR.gapsOut };
  const headRows = 2;
  const maxRows = Math.max(...best.hs);
  const H = Math.ceil(win.y + 30 + headRows * rowH + maxRows * rowH + 34);
  win.w = W - 2 * HYPR.gapsOut;
  win.h = H - 2 * HYPR.gapsOut;
  const wp = wallpaper("wp", W, H, { seed: 3, intensity: 0.75 });

  const x0 = win.x + pad;
  const y0 = win.y + 30;
  let body = tline(x0, y0, prompt("eza --tree --icons ~/stack")[0]);
  const rootY = y0 + rowH * 1.3;
  body += folderIcon(x0, rootY - 12, 15, C.blue) + tline(x0 + 22, rootY, [["stack", "blue b"]]);

  const colW = (win.w - 2 * pad) / 3;
  const guide = `stroke="${C.brBlack}" stroke-width="1.2" fill="none"`;
  const allGroups = best.cols.flat();
  const lastGroup = allGroups[allGroups.length - 1];
  let paths = "";
  best.cols.forEach((col, ci) => {
    const cx = x0 + ci * colW;
    let y = rootY + rowH;
    const trunkX = cx + 7;
    const trunkTop = ci === 0 ? rootY + 5 : y - rowH * 0.6;
    let trunkBottom = y;
    col.forEach((g, gi) => {
      // branch to the layer
      paths += `<path d="M${L.r(trunkX)} ${L.r(y - 4)}h12" ${guide}/>`;
      trunkBottom = y - 4;
      body += folderIcon(trunkX + 16, y - 12, 15, C.blue);
      body += tline(trunkX + 37, y, [[g.layer, "blue b"]]);
      const leafX = trunkX + 24;
      const first = y + rowH;
      g.items.forEach((it, k) => {
        const iy = first + k * rowH;
        paths += `<path d="M${L.r(leafX)} ${L.r(iy - 4)}h12" ${guide}/>`;
        const ix = leafX + 17;
        if (it.icon && L.hasIcon(it.icon)) body += L.icon(it.icon, ix, iy - 15, iconS, lift(L.iconHex(it.icon)));
        else body += monogram(ix, iy - 15, iconS, it.name.replace(/[^A-Za-z]/g, "")[0] ?? "·", C.dim);
        body += tline(ix + iconS + 8, iy, [[it.name, "fg"]]);
      });
      const lastLeaf = first + (g.items.length - 1) * rowH - 4;
      paths += `<path d="M${L.r(leafX)} ${L.r(y + 5)}V${L.r(lastLeaf)}" ${guide}/>`;
      y = first + g.items.length * rowH + rowH * 0.6;
    });
    const isLastCol = col.includes(lastGroup);
    paths += `<path d="M${L.r(trunkX)} ${L.r(trunkTop)}V${L.r(trunkBottom)}" ${guide}${isLastCol ? "" : ""}/>`;
  });

  const count = config.stack.reduce((s, g) => s + g.items.length, 0);
  return scene({
    w: W,
    h: H,
    title: "Tech stack",
    desc: config.stack.map((g) => `${g.layer}: ${g.items.map((i) => i.name).join(", ")}`).join(". ") + `. ${count} tools in ${config.stack.length} layers.`,
    weights: [400, 700],
    defs: wp.defs,
    body: `${wp.body}${frame(win.x, win.y, win.w, win.h, { active: true })}${paths}${body}`,
  });
}

function statsCard({ stats }) {
  const H = 452;
  const wp = wallpaper("wp", W, H, { seed: 11, intensity: 0.75 });
  const win = { x: HYPR.gapsOut, y: HYPR.gapsOut, w: W - 2 * HYPR.gapsOut, h: H - 2 * HYPR.gapsOut };
  const m = 10;
  const clock = kyiv(stats.generatedAt, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  // contributions (cpu box)
  const cpu = { x: win.x + m, y: win.y + m + 6, w: win.w - 2 * m, h: 178 };
  let body = btopBox(cpu.x, cpu.y, cpu.w, cpu.h, C.cpuBox, [
    { text: "contributions", hi: "¹" },
    { text: clock, align: "center", cls: "white b" },
    { text: `${L.num(stats.totals.contributionsLastYear)} in 365 days`, align: "right", cls: "dim" },
  ]);
  const sub = { w: 168 };
  sub.x = cpu.x + cpu.w - 12 - sub.w;
  sub.y = cpu.y + 18;
  sub.h = cpu.h - 30;
  const gx = cpu.x + 16, gw = sub.x - 18 - gx;
  const series = buckets(stats.calendar, 2);
  const labelsH = 18;
  const graphTopPad = 34;
  const graph = brailleGraph("big", gx, cpu.y + graphTopPad, gw, cpu.h - graphTopPad - labelsH - 12, series, { py: 4.5, animate: true, start: 0.2, span: 1.4 });
  body += graph.body;
  // month ticks under the graph
  const ticks = [];
  let lastMonth = -1;
  series.forEach((s, i) => {
    const mo = Number(s.date.slice(5, 7)) - 1;
    if (mo !== lastMonth) ticks.push({ x: gx + graph.pitch * i, mo });
    lastMonth = mo;
  });
  ticks.filter((t, k) => !ticks[k + 1] || ticks[k + 1].x - t.x > 34).forEach((t) => {
    if (t.x < gx + gw - 24) body += tline(t.x, cpu.y + cpu.h - 12, [[L.monthName(t.mo), "dim"]], { attrs: `font-size="11.5"`, cw: 11.5 * 0.6 });
  });
  // peak marker on the bucket that holds the busiest day
  const peakIdx = Math.max(0, series.findLastIndex((s) => s.date <= stats.busiestDay.date));
  const px = gx + graph.pitch * (peakIdx + 0.5);
  const peakLabel = `peak ${stats.busiestDay.count}/day, ${L.formatDate(stats.busiestDay.date, { year: false })}`;
  const plw = peakLabel.length * CW * 0.92;
  const plx = Math.min(px - plw - 8, gx + gw - plw);
  body += `<path d="M${L.r(px)} ${L.r(graph.top - 3)}v-8H${L.r(plx + plw + 6)}" fill="none" stroke="${C.dim}" stroke-width="1"/>`;
  body += tline(plx, graph.top - 7, [[peakLabel, "dim"]], { attrs: `font-size="11.5"`, cw: CW * 0.92 });

  // weekday sub-box, btop's per-core list
  body += btopBox(sub.x, sub.y, sub.w, sub.h, C.brBlack, [{ text: "weekday", cls: "dim" }], { fs: 11.5 });
  const order = [1, 2, 3, 4, 5, 6, 0];
  const wmax = Math.max(...stats.weekdays);
  const cells = 9, cellW = 7, cellH = 8;
  order.forEach((d, k) => {
    const y = sub.y + 22 + k * 17.2;
    body += tline(sub.x + 10, y, [[L.weekdayName(d), d === 0 || d === 6 ? "magenta" : "dim"]], { attrs: `font-size="11.5"`, cw: 11.5 * 0.6 });
    const lit = Math.round((stats.weekdays[d] / wmax) * cells);
    for (let c = 0; c < cells; c++) {
      const color = c < lit ? gradientAt([C.graphLo, C.graphMid, C.graphHi], c / (cells - 1)) : "#ffffff";
      body += `<rect x="${L.r(sub.x + 40 + c * (cellW + 1.6))}" y="${L.r(y - cellH)}" width="${cellW}" height="${cellH}" rx="1" fill="${color}"${c < lit ? "" : ` fill-opacity=".08"`}/>`;
    }
    const v = String(stats.weekdays[d]);
    body += tline(sub.x + sub.w - 10 - v.length * 11.5 * 0.6, y, [[v, "fg"]], { attrs: `font-size="11.5"`, cw: 11.5 * 0.6 });
  });

  // languages (mem box)
  const lower = { y: cpu.y + cpu.h + 14, h: win.y + win.h - m - (cpu.y + cpu.h + 14) };
  const mem = { x: cpu.x, y: lower.y, w: 372, h: lower.h };
  const langs = L.topLanguages(stats.languages, 7, "#8b949e");
  body += btopBox(mem.x, mem.y, mem.w, mem.h, C.memBox, [
    { text: "languages", hi: "²" },
    { text: `${stats.languages.length} total`, align: "right", cls: "dim" },
  ]);
  const meterCells = 18, mcw = 8.2, mch = 10;
  langs.forEach((l, k) => {
    const y = mem.y + 30 + k * 23;
    const color = lift(l.color, 3.2);
    body += tline(mem.x + 14, y, [[l.name, "fg"]]);
    const mx = mem.x + 14 + 11 * CW;
    const filled = l.share * meterCells;
    for (let c = 0; c < meterCells; c++) {
      const cx = mx + c * (mcw + 1.6);
      body += `<rect x="${L.r(cx)}" y="${L.r(y - mch + 0.5)}" width="${mcw}" height="${mch}" rx="1.2" fill="#fff" fill-opacity=".07"/>`;
      const part = Math.max(0, Math.min(1, filled - c));
      if (part > 0 || (c === 0 && l.share > 0)) {
        body += `<rect x="${L.r(cx)}" y="${L.r(y - mch + 0.5)}" width="${L.r(Math.max(1.6, part * mcw))}" height="${mch}" rx="1.2" fill="${color}"/>`;
      }
    }
    const p = l.share >= 0.1 ? L.pct(l.share, 0) : L.pct(l.share, 1);
    body += tline(mem.x + mem.w - 14 - p.length * CW, y, [[p, "fg b"]]);
  });

  // proc table
  const proc = { x: mem.x + mem.w + 12, y: lower.y, w: cpu.x + cpu.w - (mem.x + mem.w + 12), h: lower.h };
  body += btopBox(proc.x, proc.y, proc.w, proc.h, C.procBox, [
    { text: "proc", hi: "³" },
    { text: "github", align: "right", cls: "dim" },
  ]);
  const active = stats.calendar.slice(-365).filter((d) => d.count > 0).length;
  const t = stats.totals;
  const rows = [
    ["commits", L.num(t.commits), "all time"],
    ["pull requests", L.num(t.pullRequests), `${t.mergedPullRequests} merged`],
    ["issues", L.num(t.issues), "opened"],
    ["streak", `${stats.streak.current}d`, "current", true],
    ["longest streak", `${stats.streak.longest}d`, "best run"],
    ["busiest day", L.num(stats.busiestDay.count), L.formatDate(stats.busiestDay.date)],
    ["active days", String(active), "of the last 365"],
    ["repositories", String(t.repositories), "public, own"],
  ];
  const colName = proc.x + 14, colVal = proc.x + 14 + 15 * CW + 6 * CW, colDet = colVal + 2 * CW;
  body += tline(colName, proc.y + 28, [["Metric", "white b"]]);
  body += tline(colVal - 5 * CW, proc.y + 28, [["Value", "white b"]]);
  body += tline(colDet, proc.y + 28, [["Detail", "white b"]]);
  rows.forEach(([name, val, det, sel], k) => {
    const y = proc.y + 28 + (k + 1) * 19.5;
    if (sel) body += `<rect x="${proc.x + 6}" y="${L.r(y - 14)}" width="${proc.w - 12}" height="19" rx="3" fill="${C.selectedBg}"/>`;
    body += tline(colName, y, [[name, sel ? "white b" : "fg"]]);
    body += tline(colVal - val.length * CW, y, [[val, sel ? "white b" : "green b"]]);
    body += tline(colDet, y, [[det, sel ? "white" : "dim"]]);
  });

  return scene({
    w: W,
    h: H,
    title: "GitHub activity",
    desc: `btop-style dashboard. ${t.contributionsLastYear} contributions in the last 365 days, peak ${stats.busiestDay.count} on ${L.formatDate(stats.busiestDay.date)}. ` +
      `Busiest weekday ${L.weekdayName(stats.weekdays.indexOf(wmax))}. Languages: ${langs.map((l) => `${l.name} ${L.pct(l.share)}`).join(", ")}. ` +
      rows.map(([n, v, d]) => `${n} ${v} (${d})`).join(", ") + ".",
    weights: [400, 700],
    defs: wp.defs + graph.defs,
    extraStyle: `
@keyframes sweep{from{opacity:0}to{opacity:1}}
.sweep{animation:sweep .3s ease-out both}`,
    body: `${wp.body}${frame(win.x, win.y, win.w, win.h, { active: true })}${body}`,
  });
}

function projectCards({ stats, config }) {
  const w = 416;
  const g = HYPR.gapsOut;
  const pad = 18;
  const cols = Math.floor((w - 2 * g - 2 * pad) / CW);
  const plan = stats.featured.map((p) => {
    const blurb = wrap(p.description ?? "", cols);
    const stackLines = [];
    for (const item of p.stack) {
      const last = stackLines.length - 1;
      if (last >= 0 && stackLines[last].length + 3 + item.length <= cols - 12) stackLines[last] += " · " + item;
      else stackLines.push(item);
    }
    return { p, blurb, stackLines };
  });
  const rowsOf = (x) => 1.5 + 1.2 + x.blurb.length + 0.6 + x.stackLines.length + 4;
  const maxRows = Math.max(...plan.map(rowsOf));
  const H = Math.ceil(g + 30 + (maxRows - 1) * LH + 26 + g);
  const files = {};
  plan.forEach(({ p, blurb, stackLines }, idx) => {
    const wp = wallpaper("wp", w, H, { seed: 21 + idx * 4, intensity: 0.8 });
    const x = g + pad;
    let y = g + 30;
    let body = tline(x, y, prompt(`gh repo view ${config.login}/${p.name}`)[0]);
    y += LH * 1.5;
    body += tline(x, y, [[`${config.login}/`, "dim"], [p.name, "cyan b"]]);
    const stars = String(p.stars);
    const sx = w - g - pad - stars.length * CW;
    body += starIcon(sx - 16, y - 11, 12, C.yellow) + tline(sx, y, [[stars, "yellow b"]]);
    y += LH * 1.2;
    for (const ln of blurb) { body += tline(x, y, [[ln, "fg"]]); y += LH; }
    y += LH * 0.6;
    const kv = (k, segs) => { body += tline(x, y, [[k.padEnd(10), "magenta"], ...segs]); y += LH; };
    stackLines.forEach((ln, i) => {
      if (i === 0) kv("stack", [[ln, "fg"]]);
      else { body += tline(x + 10 * CW, y, [["· " + ln, "fg"]]); y += LH; }
    });
    kv("commits", [[L.num(p.commits), "green b"]]);
    const lang = p.language?.name ?? "";
    body += `<circle cx="${L.r(x + 10 * CW + 4.5)}" cy="${L.r(y - 4.5)}" r="4.5" fill="${lift(p.language?.color ?? C.dim, 3)}"/>`;
    kv("language", [["  " + lang, "fg"]]);
    kv("pushed", [[L.formatDate(p.pushedAt), "fg"]]);
    if (p.homepage) kv("homepage", [[p.homepage.replace(/^https?:\/\//, "").replace(/\/$/, ""), "blue"]]);
    else kv("source", [[p.url.replace(/^https?:\/\//, ""), "blue"]]);
    files[`project-${p.name.toLowerCase()}.svg`] = scene({
      w,
      h: H,
      title: `${p.name} repository`,
      desc: `${p.name}: ${p.description}. Stack: ${p.stack.join(", ")}. ${p.commits} commits, ${lang}, last push ${L.formatDate(p.pushedAt)}.`,
      weights: [400, 700],
      defs: wp.defs,
      body: `${wp.body}${frame(g, g, w - 2 * g, H - 2 * g, { active: idx === 0 })}${body}`,
    });
  });
  return files;
}

/** waybar-like modules used as contact buttons. */
function buttons({ config }) {
  const telegram = config.links.telegram.replace(/^https?:\/\/t\.me\//, "@");
  const linkedin = config.links.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "").replace(/\/$/, "");
  const email = config.links.email.replace(/^mailto:/, "");
  const items = [
    { key: "email", label: email, glyph: (x, y) => `<path transform="translate(${x} ${y})" d="M1.5 3h13a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M1 4l7 5 7-5" fill="none" stroke="${C.cyan}" stroke-width="1.5" stroke-linejoin="round"/>` },
    { key: "telegram", label: telegram, glyph: (x, y) => `<path transform="translate(${x} ${y})" d="M15.2 2.2L.9 7.7c-.6.2-.6 1 0 1.2l3.6 1.2 1.4 4.3c.2.5.8.6 1.1.2l2-2.1 3.7 2.7c.4.3 1 .1 1.1-.4l2.4-11.8c.1-.6-.5-1.1-1-.8zM5.4 9.8l7-4.6-5.6 5.5-.3 2.6z" fill="${C.cyan}"/>` },
    { key: "linkedin", label: linkedin, glyph: (x, y) => `<rect x="${x + 0.5}" y="${y + 0.5}" width="15" height="15" rx="3" fill="none" stroke="${C.cyan}" stroke-width="1.5"/><text x="${x + 8}" y="${y + 12}" text-anchor="middle" font-size="10" class="cyan">in</text>` },
  ];
  const files = {};
  for (const it of items) {
    const h = 34, padL = 12, iconW = 16, gap = 9;
    const w = Math.ceil(padL + iconW + gap + it.label.length * CW + 14);
    files[`link-${it.key}.svg`] = L.svg({
      width: w,
      height: h,
      title: `${it.key}: ${it.label}`,
      desc: `Contact via ${it.key}: ${it.label}`,
      style: baseStyle([400]),
      body: `<defs><linearGradient id="active" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.activeA}"/><stop offset="1" stop-color="${C.activeB}"/></linearGradient></defs>
<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="10" fill="${C.bg}"/>
<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="10" fill="none" stroke="url(#active)" stroke-width="1.5" stroke-opacity=".85"/>
${it.glyph(padL, (h - 16) / 2)}
${tline(padL + iconW + gap, h / 2 + FS * 0.36, [[it.label, "fg"]])}`,
    });
  }
  return { files, items: items.map((it) => ({ ...it, href: config.links[it.key] })) };
}

// ---------------------------------------------------------------------------------------------

export async function render({ stats, config, lib }) {
  L = lib;
  const projects = projectCards({ stats, config });
  const contact = buttons({ config });
  const files = {
    "hero.svg": hero({ stats, config }),
    "stack.svg": stack({ config }),
    "stats.svg": statsCard({ stats }),
    ...projects,
    ...contact.files,
  };

  const first = config.name.split(" ")[0];
  const kyivTime = (iso) => kyiv(iso, { hour: "2-digit", minute: "2-digit", hour12: false });
  const built = `${lib.formatDate(stats.generatedAt)}, ${kyivTime(stats.generatedAt)} Kyiv time`;
  const t = stats.totals;
  const active = stats.calendar.slice(-365).filter((d) => d.count > 0).length;
  const keyWidth = Math.max(...config.whoami.map(([k]) => k.length)) + 1;
  const fmt = (n) => lib.num(n, ",");

  const projectText = stats.featured.map((p) => {
    const c = config.featured.find((f) => f.repo === p.name) ?? {};
    const links = [[`Source`, p.url], ...Object.entries(c.docs ?? {})].map(([label, href]) => `[${label}](${href})`).join(" · ");
    return `**[${p.name}](${p.url})**

${lib.esc(c.summary ?? p.description ?? "")}
${c.notes?.length ? `
<details>
<summary><code>less projects/${p.name.toLowerCase()}.notes</code></summary>

${c.notes.map((n) => `- ${n}`).join("\n")}

${links}

</details>
` : ""}`;
  }).join("\n");

  const readme = (base) => `<p align="center">
  <img src="${base}hero.svg" width="100%" alt="${lib.esc(`${first}'s Hyprland desktop on Arch Linux. fastfetch in kitty: ${config.role} in ${config.location}, ${config.experience} of experience, and the stack. Side windows: what is being built now and a one-year contribution graph.`)}">
</p>

<p align="center">
  <a href="#-whoami">whoami</a> ·
  <a href="#-btop">stats</a> ·
  <a href="#-ls-projects">projects</a> ·
  <a href="#-eza---tree-stack">stack</a> ·
  <a href="#-cat-engineeringnotes">notes</a> ·
  <a href="#-connect">connect</a>
</p>

### \`$ whoami\`

\`\`\`ini
${config.whoami.map(([k, v]) => `${k.padEnd(keyWidth)}= ${v}`).join("\n")}
\`\`\`

${config.about}

### \`$ btop\`

<img src="${base}stats.svg" width="100%" alt="${lib.esc(`GitHub activity in btop: ${t.contributionsLastYear} contributions in the last 365 days, peak ${stats.busiestDay.count} on ${lib.formatDate(stats.busiestDay.date)}, ${stats.streak.current}-day current streak. Languages led by ${stats.languages.slice(0, 3).map((l) => `${l.name} ${lib.pct(l.share)}`).join(", ")}.`)}">

<details>
<summary><code>cat /var/log/github.summary</code></summary>

| Metric | Value |
| :-- | --: |
| Contributions, last 365 days | ${fmt(t.contributionsLastYear)} |
| Active days, last 365 days | ${active} |
| Current streak, days | ${stats.streak.current} |
| Longest streak, days | ${stats.streak.longest} |
| Busiest day | ${fmt(stats.busiestDay.count)} on ${lib.formatDate(stats.busiestDay.date)} |
| Commit contributions | ${fmt(t.commits)} |
| Pull requests (merged) | ${fmt(t.pullRequests)} (${fmt(t.mergedPullRequests)}) |
| Issues | ${fmt(t.issues)} |
| Public repositories, own | ${t.repositories} |

| Language | Share of code |
| :-- | --: |
${stats.languages.filter((l) => l.share >= 0.001).map((l) => `| ${l.name} | ${lib.pct(l.share)} |`).join("\n")}

Snapshot ${lib.formatDate(stats.generatedAt)}, ${kyivTime(stats.generatedAt)} Kyiv time. The calendar is GitHub's own and includes
private activity the profile shows; languages, repositories and stars cover public, own, non-fork repositories only.

</details>

### \`$ ls ~/projects\`

<p align="center">
${stats.featured.map((p) => `  <a href="${p.url}"><img src="${base}project-${p.name.toLowerCase()}.svg" width="49%" alt="${lib.esc(`${p.name}: ${p.description}`)}"></a>`).join("\n")}
</p>

${projectText}
**[This profile](https://github.com/${config.login}/${config.login}/tree/main/scripts)**

A dependency-free Node script reads the GitHub API and draws every image on this page.
GitHub Actions redraws it every six hours.

### \`$ eza --tree ~/stack\`

<img src="${base}stack.svg" width="100%" alt="${lib.esc("Stack as a directory tree: " + config.stack.map((g) => `${g.layer}: ${g.items.map((i) => i.name).join(", ")}`).join("; "))}">

### \`$ cat engineering.notes\`

${config.notes.map((n) => `- ${n}`).join("\n")}

<details>
<summary><code>git log --public</code></summary>

| Repository | Last push, Kyiv time |
| :-- | :-- |
${[...stats.featured].sort((a, b) => b.pushedAt.localeCompare(a.pushedAt)).map((p) => `| [${p.name}](${p.url}) | ${lib.formatDate(p.pushedAt)}, ${kyivTime(p.pushedAt)} |`).join("\n")}

[Public pull requests](https://github.com/search?q=author%3A${config.login}+is%3Apr&type=pullrequests) ·
[All public repositories](https://github.com/${config.login}?tab=repositories)

</details>

### \`$ connect\`

<p>
${contact.items.map((it) => `  <a href="${it.href}"><img src="${base}link-${it.key}.svg" height="34" alt="${lib.esc(`${it.key}: ${it.label}`)}"></a>`).join("\n")}
</p>

\`\`\`console
${config.login}@github:~$ next
Keep building. Keep asking why.
\`\`\`

<sub>Every image here is an SVG drawn from the GitHub API by <code>scripts/build.mjs</code>. Last build: ${built}.</sub>
`;

  return { files, readme };
}
