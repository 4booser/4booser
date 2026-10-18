# Profile generator

Every image on the profile page is an SVG drawn from `data/stats.json`. No third-party
stat widgets: nothing to rate-limit, nothing to go down.

```bash
GITHUB_TOKEN=$(gh auth token) node scripts/fetch-stats.mjs   # GraphQL → data/stats.json
node scripts/build.mjs                                       # → assets/*.svg + README.md
```

Node 22+ and no dependencies. `.github/workflows/profile.yml` renders every design as a check,
then refreshes the stats every six hours and commits the result.

## Changing things

- **Text, links, stack, projects**: `config.mjs`. Renderers read everything personal from there.
- **Design**: `variant` in `config.mjs` picks `tty`, `blueprint` or `orbit`.
  `node scripts/build.mjs --all` renders all three into `preview/` (git-ignored) to compare.
- **What gets counted**: languages, repositories and stars come from public, own, non-fork,
  non-archived repositories, excluding this one. The contribution calendar is GitHub's own and
  includes private activity only while the profile is set to show it.

## Layout

| Path | What |
|---|---|
| `fetch-stats.mjs` | Contributions, streaks, languages, featured repos |
| `build.mjs` | Runs the selected renderer and writes the files |
| `variants/<id>.mjs` | One design each; `render()` returns SVG files and README markdown |
| `lib/svg.mjs` | Font embedding, text measuring, icons, formatting |
| `icons.mjs` | [simple-icons](https://simpleicons.org) glyphs (CC0) |
| `fonts/` | woff2 subsets embedded into the SVGs; licenses in `fonts/licenses` (SIL OFL 1.1) |
