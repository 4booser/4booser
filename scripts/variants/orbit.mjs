// "orbit": the profile as data art. The last year is a ring of 365 rays, languages are
// orbits, the stack is a sky of constellations. Every image ships in a light and a dark
// version and the README switches between them with <picture>.

const THEMES = {
  dark: {
    bg: "#0e1024",
    panel: "#13163a",
    ink: "#ecebf5",
    muted: "#a3a2c4",
    faint: "#33365f",
    hair: "#22254b",
    empty: "#2d3060",
    dust: "#c9c8f0",
    // indigo → violet → magenta → rose → amber → pale gold
    ramp: ["#3d4296", "#5a46cf", "#8b3fd3", "#c13fb5", "#ea5583", "#f9894c", "#fcc35c", "#fff1c4"],
    accent: "#fcc35c",
    minContrast: 3.2,
  },
  light: {
    bg: "#f4f5f8",
    panel: "#ffffff",
    ink: "#17182a",
    muted: "#585a76",
    faint: "#cfd2e0",
    hair: "#e2e4ee",
    empty: "#d2d4e3",
    dust: "#8f92b8",
    // lightness runs the other way here, so heavy days read darkest on paper
    ramp: ["#c3c5ec", "#9a8de6", "#6f52d8", "#7b2fc0", "#a3239f", "#c01d6c", "#b3123f", "#7d0b2e"],
    accent: "#b0346f",
    minContrast: 3.2,
  },
};

const FONT = { serif: "instrument-serif-400", italic: "instrument-serif-italic", mono: "jetbrains-mono-400" };
const W = 848;
const TZ = "Europe/Kyiv";

// ── colour ──────────────────────────────────────────────────────────────────────────

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => hex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t));
const lum = (h) => {
  const [r, g, b] = rgb(h).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

function rampAt(stops, t) {
  const p = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(p));
  return mix(stops[i], stops[i + 1], p - i);
}

/** Nudge a language colour toward the ink until it separates from the background. */
function legible(color, T) {
  let c = color || T.muted;
  for (let k = 0; k < 12 && contrast(c, T.bg) < T.minContrast; k++) c = mix(c, T.ink, 0.12);
  return c;
}

// ── geometry and type ───────────────────────────────────────────────────────────────

const rad = (d) => (d * Math.PI) / 180;
/** Point at `r` from (cx, cy), angle in degrees clockwise from 12 o'clock. */
const P = (cx, cy, r, a) => [cx + r * Math.sin(rad(a)), cy - r * Math.cos(rad(a))];

function arc(lib, cx, cy, r, a0, a1) {
  const [x0, y0] = P(cx, cy, r, a0);
  const [x1, y1] = P(cx, cy, r, a1);
  const R = lib.r;
  return `M${R(x0)} ${R(y0)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${R(x1)} ${R(y1)}`;
}

function styles(lib, T, fonts) {
  const faces = [
    fonts.includes("serif") && lib.fontFace("OrbitSerif", FONT.serif),
    fonts.includes("italic") && lib.fontFace("OrbitSerif", FONT.italic, { style: "italic" }),
    fonts.includes("mono") && lib.fontFace("OrbitMono", FONT.mono),
  ].filter(Boolean);
  return `${faces.join("")}
text{fill:${T.ink}}
.s{font-family:OrbitSerif,Georgia,"Times New Roman",serif}
.i{font-family:OrbitSerif,Georgia,"Times New Roman",serif;font-style:italic}
.m{font-family:OrbitMono,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.mu{fill:${T.muted}}`;
}

function makeText(lib) {
  return (x, y, str, { cls = "m", size = 12, fill, anchor, extra = "" } = {}) =>
    `<text x="${lib.r(x)}" y="${lib.r(y)}" class="${cls}" font-size="${size}"` +
    (fill ? ` style="fill:${fill}"` : "") +
    (anchor ? ` text-anchor="${anchor}"` : "") +
    (extra ? " " + extra : "") +
    `>${lib.esc(str)}</text>`;
}

/** Greedy word wrap using the embedded fonts' advance widths. */
function wrap(lib, str, file, size, maxW) {
  const lines = [];
  let line = "";
  for (const word of String(str).split(/\s+/).filter(Boolean)) {
    const next = line ? line + " " + word : word;
    if (line && lib.measure(next, file, size) > maxW) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Wrap mixed-style runs ({ text, cls, file, size, fill }) into lines of <text>/<tspan>.
 * Returns { svg, height }.
 */
function richText(lib, runs, { x, y, maxW, lineHeight }) {
  const words = [];
  for (const run of runs) {
    const parts = run.text.split(/(\s+)/);
    for (const p of parts) {
      if (!p) continue;
      if (/^\s+$/.test(p)) {
        if (words.length) words[words.length - 1].space = lib.measure(" ", run.file, run.size);
      } else words.push({ ...run, text: p, w: lib.measure(p, run.file, run.size), space: 0 });
    }
  }
  const lines = [[]];
  let cur = 0;
  for (const w of words) {
    const line = lines[lines.length - 1];
    const prev = line[line.length - 1];
    const add = (prev ? prev.space : 0) + w.w;
    if (line.length && cur + add > maxW) {
      lines.push([w]);
      cur = w.w;
    } else {
      line.push(w);
      cur += add;
    }
  }
  const out = lines.map((line, li) => {
    const spans = [];
    line.forEach((w, wi) => {
      const sep = wi < line.length - 1 && w.space ? " " : "";
      const last = spans[spans.length - 1];
      if (last && last.cls === w.cls && last.size === w.size && last.fill === w.fill) last.text += w.text + sep;
      else spans.push({ cls: w.cls, size: w.size, fill: w.fill, text: w.text + sep });
    });
    return `<text x="${x}" y="${lib.r(y + li * lineHeight)}" xml:space="preserve">` +
      spans.map((s) => `<tspan class="${s.cls}" font-size="${s.size}"${s.fill ? ` style="fill:${s.fill}"` : ""}>${lib.esc(s.text)}</tspan>`).join("") +
      `</text>`;
  });
  return { svg: out.join("\n"), height: lines.length * lineHeight };
}

const fmt = (n) => Math.round(n).toLocaleString("en-US");
const sentence = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "2026-09-26" or an ISO timestamp → "26 Sep 2026" in Kyiv time. */
function dateIn(iso, { year = true, long = false } = {}) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "numeric", year: "numeric" })
    .formatToParts(new Date(iso.length === 10 ? iso + "T12:00:00Z" : iso));
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return `${get("day")} ${(long ? LONG : MONTHS)[get("month") - 1]}${year ? " " + get("year") : ""}`;
}

// ── hero: the year as a ring ────────────────────────────────────────────────────────

// Wide: ring left, caption column right. Narrow (served below 600px): ring on top, caption under it.
const HERO = {
  wide: { W: 848, cx: 282, cy: 290, R0: 100, LEN: 110, name: 38, x0: 574, cw: 250, y0: 70 },
  narrow: { W: 420, cx: 210, cy: 262, R0: 74, LEN: 86, name: 30, x0: 24, cw: 372, y0: 500 },
};

function hero({ stats, config, lib }, T, layout = HERO.wide) {
  const text = makeText(lib);
  const R = lib.r;
  const { W, cx, cy, R0, LEN } = layout;
  const narrow = W < 600;
  const RL = R0 + LEN + (narrow ? 14 : 18);
  const cal = stats.calendar;
  const n = cal.length;
  const max = Math.max(1, ...cal.map((d) => d.count));
  const GAP = 7;
  const step = (360 - GAP) / n;
  const ang = (i) => GAP / 2 + (i + 0.5) * step;
  const rayLen = (c) => (c ? 4 + (LEN - 4) * Math.sqrt(c / max) : 2.4);

  // Rays, grouped by colour so the markup stays small.
  const groups = new Map();
  cal.forEach((d, i) => {
    const a = ang(i);
    const t = d.count ? Math.sqrt(d.count / max) : -1;
    const color = t < 0 ? T.empty : rampAt(T.ramp, 0.08 + 0.92 * t);
    const [x0, y0] = P(cx, cy, R0, a);
    const [x1, y1] = P(cx, cy, R0 + rayLen(d.count), a);
    const delay = (0.2 + (i / n) * 2.6).toFixed(2);
    if (!groups.has(color)) groups.set(color, []);
    groups.get(color).push(`<line x1="${R(x0)}" y1="${R(y0)}" x2="${R(x1)}" y2="${R(y1)}" pathLength="1" style="animation-delay:${delay}s"/>`);
  });
  const rays = [...groups].map(([c, ls]) => `<g stroke="${c}">${ls.join("")}</g>`).join("\n");

  // Month ticks inside the ring, month names outside it.
  const months = [];
  cal.forEach((d, i) => {
    const key = d.date.slice(0, 7);
    if (!months.length || months[months.length - 1].key !== key) months.push({ key, start: i, end: i });
    else months[months.length - 1].end = i;
  });
  const ticks = months.slice(1).map((m) => {
    const a = ang(m.start) - step / 2;
    const [x0, y0] = P(cx, cy, R0 - 11, a);
    const [x1, y1] = P(cx, cy, R0 - 4, a);
    return `<line x1="${R(x0)}" y1="${R(y0)}" x2="${R(x1)}" y2="${R(y1)}"/>`;
  }).join("");
  const monthLabels = months.filter((m) => {
    const a = ang((m.start + m.end) / 2);
    return m.end - m.start >= 14 && a > 14 && a < 346;
  }).map((m) => {
    const a = ang((m.start + m.end) / 2);
    const [x, y] = P(cx, cy, RL, a);
    const s = Math.sin(rad(a)), c = Math.cos(rad(a));
    const anchor = s > 0.3 ? "start" : s < -0.3 ? "end" : "middle";
    const mi = Number(m.key.slice(5, 7)) - 1;
    const label = mi === 0 && !narrow ? `${MONTHS[mi]} ${m.key.slice(0, 4)}` : MONTHS[mi];
    return text(x, y + 4 - c * 3, label, { cls: "m mu", size: 12, anchor });
  }).join("\n");

  // Today sits in the seam at 12 o'clock.
  const todayIso = cal[n - 1].date;
  const [tx0, ty0] = P(cx, cy, R0 - 14, 0);
  const [tx1, ty1] = P(cx, cy, R0 + LEN + 8, 0);
  const today = `<line x1="${R(tx0)}" y1="${R(ty0)}" x2="${R(tx1)}" y2="${R(ty1)}" stroke="${T.muted}" stroke-width="1" stroke-dasharray="2 3"/>` +
    text(cx, ty1 - 10, `today, ${dateIn(todayIso, { year: false })}`, { cls: "m mu", size: 12, anchor: "middle" });

  // The busiest day gets a callout in the nearest free corner.
  let bi = cal.findIndex((d) => d.date === stats.busiestDay.date);
  if (bi < 0) bi = cal.reduce((m, d, i) => (d.count > cal[m].count ? i : m), 0);
  const busy = cal[bi];
  const ba = ang(bi);
  const [bx, by] = P(cx, cy, R0 + rayLen(busy.count), ba);
  const [lx, ly] = P(cx, cy, R0 + rayLen(busy.count) + 7, ba);
  const top = Math.cos(rad(ba)) >= -0.2;
  const l1 = dateIn(busy.date);
  const l2 = `${fmt(busy.count)} contributions in one day`;
  const labelX = 24, labelY = top ? 34 : cy + RL + 20;
  const textEnd = labelX + Math.max(lib.measure(l1, FONT.mono, 12), lib.measure(l2, FONT.italic, 17));
  const lineY = labelY + 30;
  // Underline the label, then drop to the ray tip at 45°.
  const elbow = Math.min(Math.max(labelX + 40, lx - Math.abs(ly - lineY)), textEnd + 10);
  const callout = `<g class="late">
<polyline points="${labelX},${R(lineY)} ${R(elbow)},${R(lineY)} ${R(lx)},${R(ly)}" fill="none" stroke="${T.muted}" stroke-width="1"/>
<circle cx="${R(bx)}" cy="${R(by)}" r="3" fill="${T.ink}"/>
${text(labelX, labelY, l1, { cls: "m mu", size: 12 })}
${text(labelX, labelY + 21, l2, { cls: "i", size: 17 })}
</g>`;

  // Centre: the name.
  const [first, ...rest] = config.name.split(" ");
  const centre = [
    text(cx, cy - layout.name * 0.2, first, { cls: "s", size: layout.name, anchor: "middle" }),
    text(cx, cy + layout.name * 0.75, rest.join(" "), { cls: "s", size: layout.name, anchor: "middle" }),
    text(cx, cy + layout.name * 0.75 + 26, config.location.split(",")[0], { cls: "m mu", size: 12, anchor: "middle" }),
  ].join("\n");

  // The editorial caption: beside the ring when wide, under it when narrow.
  const { x0, cw } = layout;
  const col = [];
  let y = layout.y0;
  for (const line of wrap(lib, sentence(config.role), FONT.serif, 28, cw)) {
    col.push(text(x0, y, line, { cls: "s", size: 28 }));
    y += 30;
  }
  y += 2;
  col.push(text(x0, y, `${config.experience} of experience`, { cls: "m mu", size: 12 }));
  col.push(text(x0, y + 17, config.coords, { cls: "m mu", size: 12 }));
  y += 52;
  for (const line of wrap(lib, config.tagline, FONT.italic, 18, cw)) {
    col.push(text(x0, y, line, { cls: "i", size: 18 }));
    y += 23;
  }
  y += 22;
  col.push(text(x0, y, "Currently building", { cls: "m mu", size: 12 }));
  y += 26;
  config.now.forEach((item, k) => {
    const [name, ...desc] = item.split(":");
    const dot = rampAt(T.ramp, 0.55 + 0.2 * k);
    col.push(`<circle cx="${x0 + 4}" cy="${R(y - 6)}" r="4" fill="${dot}"/>`);
    col.push(text(x0 + 16, y, name.trim(), { cls: "s", size: 20 }));
    y += 18;
    for (const line of wrap(lib, desc.join(":").trim(), FONT.mono, 12, cw - 16)) {
      col.push(text(x0 + 16, y, line, { cls: "m mu", size: 12 }));
      y += 16;
    }
    y += 12;
  });

  // Legend for the ray scale, along the bottom of the column.
  const H = narrow ? Math.ceil(y + 48) : 560;
  const ly0 = narrow ? y + 6 : H - 40;
  const grad = `<linearGradient id="rampg" x1="0" x2="1">${T.ramp.map((c, i) => `<stop offset="${R(i / (T.ramp.length - 1), 3)}" stop-color="${c}"/>`).join("")}</linearGradient>`;
  const legend = [
    `<rect x="${x0}" y="${ly0}" width="120" height="5" rx="2.5" fill="url(#rampg)"/>`,
    text(x0, ly0 + 22, "0", { cls: "m mu", size: 12 }),
    text(x0 + 120, ly0 + 22, fmt(max), { cls: "m mu", size: 12, anchor: "end" }),
    text(x0 + 136, ly0 + 7, "one ray per day,", { cls: "m mu", size: 12 }),
    text(x0 + 136, ly0 + 23, "length by √count", { cls: "m mu", size: 12 }),
  ].join("\n");

  const style = styles(lib, T, ["serif", "italic", "mono"]) + `
.ray line{stroke-width:1.5;stroke-linecap:round;stroke-dasharray:1;animation:grow .55s cubic-bezier(.2,.7,.3,1) both}
@keyframes grow{from{stroke-dashoffset:1}}
.late{animation:fade .6s ease-out 2.9s both}
@keyframes fade{from{opacity:0}}`;

  const body = `<defs>${grad}</defs>
<rect width="${W}" height="${H}" rx="18" fill="${T.bg}"/>
<circle cx="${cx}" cy="${cy}" r="${R0 + LEN}" fill="none" stroke="${T.faint}" stroke-width="1" stroke-dasharray="1 5"/>
<circle cx="${cx}" cy="${cy}" r="${R0 - 4}" fill="none" stroke="${T.hair}" stroke-width="1"/>
<g stroke="${T.muted}" stroke-width="1">${ticks}</g>
<g class="ray">${rays}</g>
${monthLabels}
${today}
${callout}
${centre}
${col.join("\n")}
${legend}`;

  return lib.svg({
    width: W,
    height: H,
    title: `${config.name}, ${config.role}`,
    desc: `A ring of ${n} rays, one per day from ${cal[0].date} to ${todayIso}; ${fmt(stats.totals.contributionsLastYear)} contributions, busiest day ${busy.date} with ${busy.count}.`,
    style,
    body,
  });
}

// ── rhythm: the totals, the week, the streak ────────────────────────────────────────

function rhythm({ stats, lib }, T) {
  const H = 340;
  const text = makeText(lib);
  const R = lib.r;
  const t = stats.totals;

  // Totals as one typeset sentence.
  const big = { cls: "s", file: FONT.serif, size: 34, fill: T.accent };
  const reg = { cls: "s", file: FONT.serif, size: 23 };
  const runs = [
    { ...big, text: fmt(t.contributionsLastYear) },
    { ...reg, text: " contributions in the last twelve months, " },
    { ...big, text: fmt(t.commits) },
    { ...reg, text: " of them commits. " },
    { ...big, text: fmt(t.mergedPullRequests) },
    { ...reg, text: " of " },
    { ...big, text: fmt(t.pullRequests) },
    { ...reg, text: " pull requests merged, " },
    { ...big, text: fmt(t.issues) },
    { ...reg, text: " issues opened, " },
    { ...big, text: fmt(t.repositories) },
    { ...reg, text: " repositories in play." },
  ];
  const prose = richText(lib, runs, { x: 32, y: 70, maxW: 330, lineHeight: 40 });

  // Weekday petals, Monday at 12 o'clock.
  const order = [1, 2, 3, 4, 5, 6, 0];
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const pcx = 540, pcy = 162, PL = 88;
  const wmax = Math.max(1, ...stats.weekdays);
  const petals = [];
  const plabels = [];
  order.forEach((d, k) => {
    const a = k * (360 / 7);
    const v = stats.weekdays[d];
    const tt = Math.sqrt(v / wmax);
    const L = 16 + (PL - 16) * tt;
    const pt = (r, da) => P(pcx, pcy, r, a + da).map((q) => R(q)).join(" ");
    petals.push(`<path d="M${pcx} ${pcy}C${pt(L * 0.5, -26)} ${pt(L * 0.98, -12)} ${pt(L, 0)}C${pt(L * 0.98, 12)} ${pt(L * 0.5, 26)} ${pcx} ${pcy}Z" fill="${rampAt(T.ramp, 0.15 + 0.8 * tt)}" style="animation-delay:${(0.1 + k * 0.08).toFixed(2)}s"/>`);
    const [x, y] = P(pcx, pcy, PL + 20, a);
    const s = Math.sin(rad(a));
    const anchor = s > 0.3 ? "start" : s < -0.3 ? "end" : "middle";
    const yy = y + (Math.cos(rad(a)) > 0.5 ? -10 : 0);
    plabels.push(text(x, yy, names[d], { cls: "m mu", size: 12, anchor }));
    plabels.push(text(x, yy + 17, fmt(v), { cls: "s", size: 17, anchor }));
  });
  const guides = [0.25, 0.5, 1].map((f) => `<circle cx="${pcx}" cy="${pcy}" r="${R(16 + (PL - 16) * Math.sqrt(f))}" fill="none" stroke="${T.faint}" stroke-dasharray="1 4"/>`).join("");
  const peak = order.reduce((m, d) => (stats.weekdays[d] > stats.weekdays[m] ? d : m), order[0]);
  const fullDay = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][peak];

  // Streak dial: outer ticks are the longest run, the inner arc is the current one.
  const dcx = 764, dcy = 146, DR = 54, SPAN = 300;
  const { current, longest } = stats.streak;
  const scale = Math.max(longest, current, 1);
  const tickEvery = scale > 90 ? Math.ceil(scale / 90) : 1;
  const dticks = [];
  for (let k = 0; k < scale; k += tickEvery) {
    const a = -SPAN / 2 + ((k + 0.5) / scale) * SPAN;
    const [x0, y0] = P(dcx, dcy, DR + 2, a);
    const [x1, y1] = P(dcx, dcy, DR + 10, a);
    dticks.push(`<line x1="${R(x0)}" y1="${R(y0)}" x2="${R(x1)}" y2="${R(y1)}"/>`);
  }
  const curEnd = -SPAN / 2 + (current / scale) * SPAN;
  const dial = [
    `<path d="${arc(lib, dcx, dcy, DR - 8, -SPAN / 2, SPAN / 2)}" fill="none" stroke="${T.hair}" stroke-width="7" stroke-linecap="round"/>`,
    current > 0
      ? `<path class="draw" d="${arc(lib, dcx, dcy, DR - 8, -SPAN / 2, Math.max(curEnd, -SPAN / 2 + 0.5))}" fill="none" stroke="url(#streakg)" stroke-width="7" stroke-linecap="round" pathLength="1"/>`
      : "",
    `<g stroke="${T.muted}" stroke-width="1.2">${dticks.join("")}</g>`,
    text(dcx, dcy + 10, String(current), { cls: "s", size: 42, anchor: "middle" }),
    text(dcx, dcy + 29, current === 1 ? "day" : "days", { cls: "m mu", size: 12, anchor: "middle" }),
  ].join("\n");
  const streakNote = current >= longest && current > 0
    ? ["The current run is", "the longest so far"]
    : [`Longest run: ${longest} days`, `now ${current} and counting`];
  const streakg = `<linearGradient id="streakg" x1="0" x2="1">${[0.35, 0.6, 0.85].map((f, i) => `<stop offset="${i / 2}" stop-color="${rampAt(T.ramp, f)}"/>`).join("")}</linearGradient>`;

  const style = styles(lib, T, ["serif", "italic", "mono"]) + `
.petal path{transform-origin:${pcx}px ${pcy}px;animation:bloom .9s cubic-bezier(.2,.8,.3,1) both}
@keyframes bloom{from{transform:scale(0);opacity:0}}
.draw{stroke-dasharray:1;animation:sweep 1.6s cubic-bezier(.3,.6,.2,1) .5s both}
@keyframes sweep{from{stroke-dashoffset:1}}`;

  const body = `<defs>${streakg}</defs>
<rect width="${W}" height="${H}" rx="18" fill="${T.bg}"/>
${prose.svg}
${text(32, H - 30, `Counted from the contribution calendar, up to ${dateIn(stats.generatedAt)}.`, { cls: "m mu", size: 12 })}
<line x1="404" y1="40" x2="404" y2="${H - 40}" stroke="${T.hair}"/>
${guides}
<g class="petal">${petals.join("")}</g>
<circle cx="${pcx}" cy="${pcy}" r="3" fill="${T.bg}"/>
${plabels.join("\n")}
${text(pcx, H - 18, `${fullDay}s carry the most`, { cls: "i", size: 16, anchor: "middle" })}
${dial}
${text(dcx, dcy + DR + 50, streakNote[0], { cls: "i", size: 16, anchor: "middle" })}
${text(dcx, dcy + DR + 69, streakNote[1], { cls: "i", size: 16, anchor: "middle" })}
${text(dcx, dcy + DR + 92, `${longest} days at most`, { cls: "m mu", size: 12, anchor: "middle" })}`;

  return lib.svg({
    width: W,
    height: H,
    title: "Contribution totals, weekday rhythm and streak",
    desc: `${fmt(t.contributionsLastYear)} contributions in the last year, ${fmt(t.commits)} commits, ${t.mergedPullRequests} of ${t.pullRequests} pull requests merged, ${t.issues} issues, ${t.repositories} repositories. Busiest weekday: ${fullDay}. Current streak ${current} days, longest ${longest}.`,
    style,
    body,
  });
}

// ── languages: one orbit per language ───────────────────────────────────────────────

function languages({ stats, lib }, T) {
  const H = 400;
  const text = makeText(lib);
  const R = lib.r;
  const top = lib.topLanguages(stats.languages, 6, T.muted);
  // Outermost orbit is the biggest language; "Other" always sits innermost.
  const rings = [...top].reverse();
  const cx = 236, cy = 212, R0 = 54, STEP = 20, SPAN = 270;
  const outer = R0 + (rings.length - 1) * STEP;

  const tracks = [], arcs = [], dots = [], labels = [];
  rings.forEach((l, i) => {
    const r = R0 + i * STEP;
    const color = l.name === "Other" ? T.muted : legible(l.color, T);
    const end = Math.max(1.2, l.share * SPAN);
    tracks.push(`<path d="${arc(lib, cx, cy, r, 0, SPAN)}"/>`);
    arcs.push(`<path d="${arc(lib, cx, cy, r, 0, end)}" stroke="${color}" pathLength="1" style="animation-delay:${(0.15 + (rings.length - i) * 0.07).toFixed(2)}s"/>`);
    const [dx, dy] = P(cx, cy, r, end);
    dots.push(`<circle cx="${R(dx)}" cy="${R(dy)}" r="6" fill="${color}" stroke="${T.bg}" stroke-width="2.5"/>`);
    const y = cy - r + 4;
    const p = lib.pct(l.share);
    labels.push(text(cx - 14, y, p, { cls: "m mu", size: 12, anchor: "end" }));
    labels.push(text(cx - 20 - lib.measure(p, FONT.mono, 12), y, l.name, { cls: "m", size: 12, anchor: "end" }));
  });
  const scale = [25, 50, 75, 100].map((v) => {
    const a = (v / 100) * SPAN;
    const [x, y] = P(cx, cy, outer + 18, a);
    const s = Math.sin(rad(a));
    return text(x, y + 4, `${v}%`, { cls: "m mu", size: 12, anchor: s > 0.3 ? "start" : s < -0.3 ? "end" : "middle" });
  }).join("\n");

  // Right: what it means, plus the long tail that didn't get an orbit.
  const x0 = 474, cw = 344;
  const [a, b, c, d] = stats.languages;
  const headline = `${a.name} carries ${lib.pct(a.share, 0)} of the code; ${b.name}, ${c.name} and ${d.name} follow.`;
  const col = [];
  let y = 70;
  for (const line of wrap(lib, headline, FONT.serif, 27, cw)) {
    col.push(text(x0, y, line, { cls: "s", size: 27 }));
    y += 32;
  }
  y += 4;
  for (const line of wrap(lib, `Bytes of source across ${stats.totals.repositories} repositories, build files and generated code left out.`, FONT.mono, 12, cw)) {
    col.push(text(x0, y, line, { cls: "m mu", size: 12 }));
    y += 17;
  }
  const tail = stats.languages.slice(6);
  if (tail.length) {
    y += 24;
    col.push(text(x0, y, "Inside the innermost orbit", { cls: "i", size: 17 }));
    y += 24;
    const colW = (cw - 24) / 2;
    const perCol = Math.ceil(tail.length / 2);
    tail.forEach((l, k) => {
      const cxk = x0 + (k >= perCol ? colW + 24 : 0);
      const yk = y + (k % perCol) * 19;
      const p = l.share >= 0.001 ? lib.pct(l.share, 2) : "<0.1%";
      const nameW = lib.measure(l.name, FONT.mono, 12);
      const pW = lib.measure(p, FONT.mono, 12);
      col.push(text(cxk, yk, l.name, { cls: "m", size: 12 }));
      col.push(`<line x1="${R(cxk + nameW + 6)}" y1="${yk - 3}" x2="${R(cxk + colW - pW - 6)}" y2="${yk - 3}" stroke="${T.faint}" stroke-dasharray="1 3"/>`);
      col.push(text(cxk + colW, yk, p, { cls: "m mu", size: 12, anchor: "end" }));
    });
  }

  const style = styles(lib, T, ["serif", "italic", "mono"]) + `
.orb path{stroke-dasharray:1;animation:sweep 1.5s cubic-bezier(.3,.6,.2,1) both}
@keyframes sweep{from{stroke-dashoffset:1}}
.dot{animation:fade .5s ease-out 1.5s both}
@keyframes fade{from{opacity:0}}`;

  const body = `<rect width="${W}" height="${H}" rx="18" fill="${T.bg}"/>
<g fill="none" stroke="${T.faint}" stroke-width="1">${tracks.join("")}</g>
<g class="orb" fill="none" stroke-width="9" stroke-linecap="round">${arcs.join("")}</g>
<g class="dot">${dots.join("")}</g>
<circle cx="${cx}" cy="${cy}" r="4" fill="${T.ink}"/>
${labels.join("\n")}
${scale}
${col.join("\n")}`;

  return lib.svg({
    width: W,
    height: H,
    title: "Languages by share of code",
    desc: top.map((l) => `${l.name} ${lib.pct(l.share)}`).join(", "),
    style,
    body,
  });
}

// ── stack: constellations ───────────────────────────────────────────────────────────

function stack({ config, lib }, T) {
  const H = 610;
  const text = makeText(lib);
  const R = lib.r;
  const rand = lib.rng(4242);
  const layers = config.stack;
  const rows = [layers.slice(0, 4), layers.slice(4)];
  const rowY = [26, 316];
  const rowH = [270, 248];

  // Faint dust first, so everything else sits on top.
  const dust = [];
  for (let k = 0; k < 140; k++) {
    const x = 10 + rand() * (W - 20), y = 10 + rand() * (H - 20);
    dust.push(`<circle cx="${R(x)}" cy="${R(y)}" r="${R(0.5 + rand() * 0.9)}" opacity="${R(0.15 + rand() * 0.4)}"/>`);
  }

  const parts = [];
  let li = 0;
  rows.forEach((row, ri) => {
    const colW = (W - 32) / row.length;
    row.forEach((layer, ci) => {
      const hue = rampAt(T.ramp, 0.3 + 0.6 * (li / Math.max(1, layers.length - 1)));
      const x0 = 16 + ci * colW + 18;
      const y0 = rowY[ri];
      const n = layer.items.length;
      const stepY = Math.min(44, (rowH[ri] - 66) / Math.max(1, n - 1));
      const right = 16 + (ci + 1) * colW - 10;
      const stars = layer.items.map((item, k) => {
        const x = x0 + 12 + (k % 2 ? 22 : 0) + rand() * 12;
        const room = right - (x + 20 + lib.measure(item.name, FONT.mono, 12));
        return { item, x: room < 0 ? x + room : x, y: y0 + 58 + k * stepY + (rand() - 0.5) * 4 };
      });
      const lines = [];
      for (let k = 0; k < stars.length - 1; k++) {
        const a = stars[k], b = stars[k + 1];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d < 26) continue;
        const ux = dx / d, uy = dy / d;
        lines.push(`<line x1="${R(a.x + ux * 12)}" y1="${R(a.y + uy * 12)}" x2="${R(b.x - ux * 12)}" y2="${R(b.y - uy * 12)}" pathLength="1" style="animation-delay:${(0.2 + li * 0.12 + k * 0.06).toFixed(2)}s"/>`);
      }
      parts.push(`<g class="links" stroke="${hue}">${lines.join("")}</g>`);
      parts.push(text(x0, y0 + 22, sentence(layer.layer), { cls: "i", size: 24 }));
      for (const s of stars) {
        parts.push(`<circle cx="${R(s.x)}" cy="${R(s.y)}" r="13" fill="${hue}" opacity="${T === THEMES.dark ? 0.16 : 0.14}"/>`);
        const glyph = s.item.icon && lib.hasIcon(s.item.icon)
          ? lib.icon(s.item.icon, s.x - 7.5, s.y - 7.5, 15, T.ink)
          : sparkle(s.x, s.y, 6.5, hue);
        parts.push(glyph);
        parts.push(text(s.x + 20, s.y + 4.5, s.item.name, { cls: "m", size: 12 }));
      }
      li++;
    });
  });

  const style = styles(lib, T, ["italic", "mono"]) + `
.links line{stroke-width:1;stroke-dasharray:1;opacity:.75;animation:sweep .7s ease-out both}
@keyframes sweep{from{stroke-dashoffset:1}}`;

  const body = `<rect width="${W}" height="${H}" rx="18" fill="${T.bg}"/>
<g fill="${T.dust}">${dust.join("")}</g>
${parts.join("\n")}
${text(34, H - 26, "The stack, one constellation per layer. A star without a glyph is a tool without a logo.", { cls: "m mu", size: 12 })}`;

  return lib.svg({
    width: W,
    height: H,
    title: "Tools and technologies, grouped by layer",
    desc: layers.map((l) => `${sentence(l.layer)}: ${l.items.map((i) => i.name).join(", ")}`).join(". "),
    style,
    body,
  });
}

/** Four-point star for tools that have no logo in simple-icons. */
function sparkle(x, y, r, fill) {
  const q = r * 0.28;
  const f = (n) => Number(n.toFixed(2));
  return `<path d="M${f(x)} ${f(y - r)}Q${f(x + q)} ${f(y - q)} ${f(x + r)} ${f(y)}Q${f(x + q)} ${f(y + q)} ${f(x)} ${f(y + r)}Q${f(x - q)} ${f(y + q)} ${f(x - r)} ${f(y)}Q${f(x - q)} ${f(y - q)} ${f(x)} ${f(y - r)}Z" fill="${fill}"/>`;
}

// ── project cards ───────────────────────────────────────────────────────────────────

function project({ lib }, T, repo) {
  const CW = 416, H = 270;
  const text = makeText(lib);
  const R = lib.r;
  const lang = legible(repo.language?.color, T);
  const parts = [];
  parts.push(text(26, 58, repo.name, { cls: "s", size: 36 }));

  // A small orbit: the planet is the primary language.
  const ox = CW - 52, oy = 46;
  parts.push(`<circle cx="${ox}" cy="${oy}" r="20" fill="none" stroke="${T.faint}"/>`);
  parts.push(`<circle cx="${ox}" cy="${oy}" r="3" fill="${T.ink}"/>`);
  const [px, py] = P(ox, oy, 20, 58);
  parts.push(`<circle cx="${R(px)}" cy="${R(py)}" r="5.5" fill="${lang}" stroke="${T.panel}" stroke-width="2.5"/>`);

  let y = 92;
  for (const line of wrap(lib, repo.description ?? "", FONT.serif, 18, CW - 52).slice(0, 5)) {
    parts.push(text(26, y, line, { cls: "s", size: 18 }));
    y += 23;
  }
  y += 10;
  for (const line of wrap(lib, repo.stack.join(" / "), FONT.mono, 12, CW - 52).slice(0, 2)) {
    parts.push(text(26, y, line, { cls: "m mu", size: 12 }));
    y += 17;
  }
  const facts = [
    `${fmt(repo.commits)} commits`,
    repo.language?.name,
    repo.homepage ? repo.homepage.replace(/^https?:\/\//, "").replace(/\/$/, "") : `pushed ${dateIn(repo.pushedAt, { year: false })}`,
  ].filter(Boolean);
  parts.push(`<line x1="26" y1="${H - 46}" x2="${CW - 26}" y2="${H - 46}" stroke="${T.hair}"/>`);
  let fx = 26;
  facts.forEach((f, k) => {
    const isLink = k === facts.length - 1 && repo.homepage;
    parts.push(text(fx, H - 22, f, { cls: "m", size: 12, fill: isLink ? T.accent : k === 0 ? T.ink : T.muted }));
    fx += lib.measure(f, FONT.mono, 12) + 22;
  });

  const body = `<rect x=".5" y=".5" width="${CW - 1}" height="${H - 1}" rx="16" fill="${T.panel}" stroke="${T.faint}"/>
${parts.join("\n")}`;
  return lib.svg({
    width: CW,
    height: H,
    title: repo.name,
    desc: `${repo.description ?? ""} Stack: ${repo.stack.join(", ")}. ${repo.commits} commits.`,
    style: styles(lib, T, ["serif", "mono"]),
    body,
  });
}

// ── README ──────────────────────────────────────────────────────────────────────────

export async function render(ctx) {
  const { stats, config } = ctx;
  const files = {};
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  for (const [mode, T] of Object.entries(THEMES)) {
    files[`hero-${mode}.svg`] = hero(ctx, T);
    files[`hero-narrow-${mode}.svg`] = hero(ctx, T, HERO.narrow);
    files[`rhythm-${mode}.svg`] = rhythm(ctx, T);
    files[`languages-${mode}.svg`] = languages(ctx, T);
    files[`stack-${mode}.svg`] = stack(ctx, T);
    for (const repo of stats.featured) files[`project-${slug(repo.name)}-${mode}.svg`] = project(ctx, T, repo);
  }

  const pic = (base, name, alt, width = "100%") =>
    `<picture><source media="(prefers-color-scheme: dark)" srcset="${base}${name}-dark.svg"><img src="${base}${name}-light.svg" width="${width}" alt="${alt.replace(/"/g, "&quot;")}"></picture>`;

  // Narrow screens get the portrait hero; the media queries are evaluated against the page.
  const heroPic = (base, alt) => `<picture>
  <source media="(max-width: 600px) and (prefers-color-scheme: dark)" srcset="${base}hero-narrow-dark.svg">
  <source media="(max-width: 600px)" srcset="${base}hero-narrow-light.svg">
  <source media="(prefers-color-scheme: dark)" srcset="${base}hero-dark.svg">
  <img src="${base}hero-light.svg" width="100%" alt="${alt.replace(/"/g, "&quot;")}">
</picture>`;

  const t = stats.totals;
  const busy = stats.busiestDay;
  const updated = dateIn(stats.generatedAt, { long: true });
  const host = (u) => u.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const open = stats.featured.map((r) => `[${r.name}](${r.url})${r.homepage ? `, live at [${host(r.homepage)}](${r.homepage})` : ""}`);
  const openLine = open.length > 1 ? `${open.slice(0, -1).join("; ")}; and ${open[open.length - 1]}` : open[0] ?? "";

  const readme = (base) => `<div align="center">

${heroPic(base, `${config.name}: ${config.role} in ${config.location}. A ring of rays, one per day, shows ${fmt(t.contributionsLastYear)} contributions over the last year; the busiest day was ${dateIn(busy.date, { year: false, long: true })} with ${busy.count}.`)}

</div>

I'm ${config.name}, a ${config.role.toLowerCase()} in ${config.location.split(",")[0]} with ${config.experience} of experience. ${config.tagline}${openLine ? ` Open source so far: ${openLine}.` : ""}

${pic(base, "rhythm", `${fmt(t.contributionsLastYear)} contributions in the last twelve months: ${fmt(t.commits)} commits, ${t.mergedPullRequests} of ${t.pullRequests} pull requests merged, ${t.issues} issues, ${t.repositories} repositories. Weekday rhythm and a ${stats.streak.current}-day streak.`)}

${pic(base, "languages", `Languages by share of code: ${stats.languages.slice(0, 6).map((l) => `${l.name} ${ctx.lib.pct(l.share)}`).join(", ")}.`)}

${pic(base, "stack", `Stack: ${config.stack.map((l) => `${l.layer}: ${l.items.map((i) => i.name).join(", ")}`).join("; ")}.`)}

<p align="center">
${stats.featured.map((r) => `<a href="${r.url}">${pic(base, `project-${slug(r.name)}`, `${r.name}: ${r.description ?? ""}`, "49%")}</a>`).join("\n")}
</p>

Write to [${config.links.email.replace("mailto:", "")}](${config.links.email}), or find me on [Telegram](${config.links.telegram}) and [LinkedIn](${config.links.linkedin}).

<sub>Every figure here is drawn from the GitHub API by a workflow in this repository and redrawn daily. Last drawn ${updated}.</sub>
`;

  return { files, readme };
}
