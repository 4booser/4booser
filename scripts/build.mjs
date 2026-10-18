// Renders the profile from data/stats.json.
//
//   node scripts/build.mjs              config.variant → assets/*.svg + README.md
//   node scripts/build.mjs --all        every design → preview/<id>.md + preview/<id>/*.svg (git-ignored)
//   node scripts/build.mjs --dry-run    render without writing; add --all to check every design

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { config } from "./config.mjs";
import * as lib from "./lib/svg.mjs";

const ALL = ["tty", "blueprint", "orbit"];
const args = new Set(process.argv.slice(2));
const all = args.has("--all");
const dryRun = args.has("--dry-run");

if (!ALL.includes(config.variant)) throw new Error(`config.variant must be one of ${ALL.join(", ")}`);

const root = new URL("../", import.meta.url);
const stats = JSON.parse(await readFile(new URL("data/stats.json", root), "utf8"));

for (const id of all ? ALL : [config.variant]) {
  const variant = await import(`./variants/${id}.mjs`);
  const { files, readme } = await variant.render({ stats, config, lib });
  const kb = Object.values(files).reduce((n, s) => n + Buffer.byteLength(s), 0) / 1024;
  console.log(`${id}: ${Object.keys(files).length} images, ${kb.toFixed(0)} KB${dryRun ? " (dry run)" : ""}`);
  if (dryRun) continue;

  const dir = new URL(all ? `preview/${id}/` : "assets/", root);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) await writeFile(new URL(name, dir), content);
  await writeFile(new URL(all ? `preview/${id}.md` : "README.md", root), all ? readme(`${id}/`) : readme("assets/"));
}
