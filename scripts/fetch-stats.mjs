// Collects profile stats from the GitHub GraphQL API and writes data/stats.json.
//
//   GITHUB_TOKEN=... node scripts/fetch-stats.mjs
//
// Repository figures (languages, counts, stars) come from public, owned, non-fork,
// non-archived repositories, excluding this profile repo, whatever the token can see.
// The contribution calendar is GitHub's own, so it includes private activity only
// when the profile is set to show it.

import { mkdir, writeFile } from "node:fs/promises";
import { config } from "./config.mjs";

const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error("GITHUB_TOKEN is not set");

async function gql(query, variables = {}) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

const { user } = await gql(
  `query($login: String!) {
    user(login: $login) {
      name login createdAt
      followers { totalCount }
      pullRequests { totalCount }
      mergedPRs: pullRequests(states: MERGED) { totalCount }
      issues { totalCount }
      contributionsCollection { contributionYears }
    }
  }`,
  { login: config.login },
);

// One contributionsCollection per year: the API caps a collection at one year.
const years = [];
for (const year of user.contributionsCollection.contributionYears.sort()) {
  const { user: u } = await gql(
    `query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          totalCommitContributions totalPullRequestContributions
          totalIssueContributions totalPullRequestReviewContributions
          restrictedContributionsCount
          contributionCalendar { weeks { contributionDays { date contributionCount } } }
        }
      }
    }`,
    { login: config.login, from: `${year}-01-01T00:00:00Z`, to: `${year}-12-31T23:59:59Z` },
  );
  years.push({ year, c: u.contributionsCollection });
}

const days = years
  .flatMap(({ c }) => c.contributionCalendar.weeks.flatMap((w) => w.contributionDays))
  .map((d) => ({ date: d.date, count: d.contributionCount }))
  .sort((a, b) => a.date.localeCompare(b.date));

const today = new Date().toISOString().slice(0, 10);
const pastDays = days.filter((d) => d.date <= today);

// Streaks: a day without contributions breaks the run; today may still be empty.
let longest = 0, run = 0;
for (const d of pastDays) {
  run = d.count > 0 ? run + 1 : 0;
  longest = Math.max(longest, run);
}
let current = 0;
for (let i = pastDays.length - 1; i >= 0; i--) {
  if (pastDays[i].count > 0) current++;
  else if (pastDays[i].date === today) continue;
  else break;
}

// Last 365 days, aligned to whole weeks (Sunday first) like the GitHub calendar.
const lastYear = pastDays.slice(-371);
while (lastYear.length && new Date(lastYear[0].date + "T00:00:00Z").getUTCDay() !== 0) lastYear.shift();

const weekdays = Array(7).fill(0);
for (const d of pastDays.slice(-365)) weekdays[new Date(d.date + "T00:00:00Z").getUTCDay()] += d.count;
const busiest = pastDays.slice(-365).reduce((a, b) => (b.count > a.count ? b : a), { count: 0 });

const sum = (pick) => years.reduce((n, y) => n + pick(y.c), 0);
const lastYearTotal = pastDays.slice(-365).reduce((n, d) => n + d.count, 0);

// Repositories and languages.
const repos = [];
let cursor = null;
do {
  const { user: u } = await gql(
    `query($login: String!, $after: String) {
      user(login: $login) {
        repositories(first: 100, after: $after, ownerAffiliations: OWNER, isFork: false) {
          pageInfo { hasNextPage endCursor }
          nodes {
            name isPrivate isArchived stargazerCount
            languages(first: 30) { edges { size node { name color } } }
          }
        }
      }
    }`,
    { login: config.login, after: cursor },
  );
  repos.push(...u.repositories.nodes);
  cursor = u.repositories.pageInfo.hasNextPage ? u.repositories.pageInfo.endCursor : null;
} while (cursor);

const counted = repos.filter(
  (r) => !r.isPrivate && !r.isArchived && r.name.toLowerCase() !== config.login.toLowerCase(),
);

const langs = new Map();
for (const repo of counted) {
  for (const { size, node } of repo.languages.edges) {
    if (config.ignoreLanguages.includes(node.name)) continue;
    const l = langs.get(node.name) ?? { name: node.name, color: node.color, size: 0 };
    l.size += size;
    langs.set(node.name, l);
  }
}
const langTotal = [...langs.values()].reduce((n, l) => n + l.size, 0);
const languages = [...langs.values()]
  .sort((a, b) => b.size - a.size)
  .map((l) => ({ name: l.name, color: l.color, share: l.size / langTotal }));

// Featured repositories are public by definition, so their details are fine to keep.
const featured = [];
for (const { repo: name, blurb, stack } of config.featured) {
  const { repository: r } = await gql(
    `query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        name description homepageUrl stargazerCount pushedAt isPrivate
        primaryLanguage { name color }
        defaultBranchRef { target { ... on Commit { history { totalCount } } } }
      }
    }`,
    { owner: config.login, name },
  );
  if (!r || r.isPrivate) continue;
  featured.push({
    name: r.name,
    description: blurb ?? r.description,
    stack: stack ?? [],
    url: `https://github.com/${config.login}/${r.name}`,
    homepage: r.homepageUrl || null,
    stars: r.stargazerCount,
    pushedAt: r.pushedAt,
    language: r.primaryLanguage,
    commits: r.defaultBranchRef?.target?.history?.totalCount ?? 0,
  });
}

const stats = {
  generatedAt: new Date().toISOString(),
  login: user.login,
  name: user.name,
  memberSince: user.createdAt,
  followers: user.followers.totalCount,
  totals: {
    contributionsAllTime: days.reduce((n, d) => n + d.count, 0),
    contributionsLastYear: lastYearTotal,
    commits: sum((c) => c.totalCommitContributions),
    privateContributions: sum((c) => c.restrictedContributionsCount),
    pullRequests: user.pullRequests.totalCount,
    mergedPullRequests: user.mergedPRs.totalCount,
    issues: user.issues.totalCount,
    reviews: sum((c) => c.totalPullRequestReviewContributions),
    repositories: counted.length,
    stars: counted.reduce((n, r) => n + r.stargazerCount, 0),
  },
  streak: { current, longest },
  busiestDay: busiest,
  weekdays,
  years: years.map(({ year, c }) => ({
    year,
    total: c.contributionCalendar.weeks.flatMap((w) => w.contributionDays).reduce((n, d) => n + d.contributionCount, 0),
  })),
  calendar: lastYear,
  languages,
  featured,
};

await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(new URL("../data/stats.json", import.meta.url), JSON.stringify(stats, null, 2) + "\n");
console.log(
  `stats: ${stats.totals.contributionsLastYear} contributions last year, ` +
    `${languages.length} languages, streak ${current}/${longest}`,
);
