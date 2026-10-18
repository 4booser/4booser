// Everything personal lives here: edit this file, not the renderers.

export const config = {
  // Which design becomes README.md: "tty", "blueprint" or "orbit".
  variant: "tty",

  login: "4booser",
  name: "Alex",
  role: "Backend-first developer",
  location: "Kyiv, Ukraine",
  coords: "50.4501° N, 30.5234° E",
  experience: "3+ years",
  tagline: "Backend-first, full-stack when needed. Building things I can explain.",

  // `$ whoami` in the README, as key = value lines.
  whoami: [
    ["name", "Alex / 4booser"],
    ["location", "Kyiv, Ukraine"],
    ["focus", "backend engineering + full-stack applications"],
    ["building", "Shifter, Polypsy, and the tools around them"],
    ["interests", "API design, authentication, Linux, debugging"],
    ["approach", "follow the request; understand the failure"],
    ["offscreen", "basketball, music, making Linux feel like home"],
  ],
  about:
    "I build applications from the API and database up to the interface. " +
    "I like understanding what happens between a click, a request, and a saved record, " +
    "especially when one of those steps goes wrong.",

  // `$ cat engineering.notes`
  notes: [
    "Trace the request through the whole system before choosing where to fix it.",
    "Keep business rules in one place and make important assumptions testable.",
    "Treat authentication, migrations, and deployment as part of the product.",
    "Understand the trade-off well enough to explain it in plain language.",
  ],

  // What is on the bench right now. Shown in the hero of every variant.
  now: [
    "Shifter: shift planning and earnings for hourly work",
    "Polypsy: assessment platform pilot, in late beta",
    "4booser: this profile, drawn from the GitHub API",
  ],

  links: {
    email: "mailto:4booser@gmail.com",
    telegram: "https://t.me/abooser",
    linkedin: "https://linkedin.com/in/oleksii-chepurniak",
    github: "https://github.com/4booser",
  },

  // Public repositories shown as projects. Private ones are skipped automatically.
  // `blurb` (the card) and `stack` override what the API returns; `summary`, `notes`
  // and `docs` go into the README text under the cards.
  featured: [
    {
      repo: "Shifter",
      blurb: "Shift planning and earnings tracking for people paid by the hour.",
      stack: ["C#", "ASP.NET Core / .NET 10", "React / Next.js", "PostgreSQL", "Docker"],
      summary:
        "A calendar, overtime calculations, tips, deductions, and a clear picture of what a working day earns.",
      notes: [
        "Earnings rules live on the server, so the client displays the same calculation everywhere.",
        "Authentication uses rotating refresh tokens with reuse detection.",
        "Database changes have tests for unsafe migration operations and incorrect defaults.",
        "The repository includes application tests, CI, and a container deployment workflow.",
      ],
      docs: { "Architecture & setup": "https://github.com/4booser/Shifter#readme" },
    },
    {
      repo: "Polypsy",
      blurb: "A pilot platform for assessment workflows. In late beta: clinical validation is still ahead.",
      stack: ["TypeScript", "Bun / Hono", "React / React Native", "PostgreSQL", "Drizzle"],
      summary:
        "Questionnaires, scoring, appointments, role-based workspaces, and a shared web/mobile core. " +
        "Currently in late beta; clinical validation and clinical use are still ahead.",
      notes: [
        "Shared types, validation, and scoring logic connect the API, web, and mobile clients.",
        "PostgreSQL row-level security supports application access controls.",
        "Audit trails, revision checks, and automated tests cover sensitive workflows.",
        "Deployment and backup/restore tooling live alongside the application code.",
      ],
      docs: { Architecture: "https://github.com/4booser/Polypsy/blob/main/docs/ARCHITECTURE.md" },
    },
  ],

  // Build glue and generated code that would otherwise skew the language chart.
  ignoreLanguages: ["Makefile", "CMake", "Batchfile", "Dockerfile", "Objective-C", "Ruby", "Kotlin"],

  // The stack, grouped by layer. `icon` is a simple-icons slug (see scripts/icons.mjs).
  stack: [
    {
      layer: "backend",
      items: [
        { name: ".NET 10", icon: "dotnet" },
        { name: "ASP.NET Core", icon: "dotnet" },
        { name: "EF Core", icon: "dotnet" },
        { name: "MediatR" },
        { name: "NestJS", icon: "nestjs" },
        { name: "Hono", icon: "hono" },
        { name: "Bun", icon: "bun" },
        { name: "Drizzle", icon: "drizzle" },
      ],
    },
    {
      layer: "frontend",
      items: [
        { name: "React 19", icon: "react" },
        { name: "Next.js", icon: "nextdotjs" },
        { name: "TypeScript", icon: "typescript" },
        { name: "TanStack", icon: "tanstack" },
        { name: "Tailwind v4", icon: "tailwindcss" },
        { name: "Vite", icon: "vite" },
        { name: "Angular", icon: "angular" },
        { name: "RxJS", icon: "reactivex" },
      ],
    },
    {
      layer: "mobile",
      items: [
        { name: "Expo", icon: "expo" },
        { name: "React Native", icon: "react" },
        { name: "Flutter", icon: "flutter" },
        { name: "SwiftUI", icon: "swift" },
      ],
    },
    {
      layer: "data",
      items: [
        { name: "PostgreSQL", icon: "postgresql" },
        { name: "Row-level security", icon: "postgresql" },
        { name: "Zod", icon: "zod" },
      ],
    },
    {
      layer: "infra",
      items: [
        { name: "Docker", icon: "docker" },
        { name: "GitHub Actions", icon: "githubactions" },
        { name: "Turborepo", icon: "turborepo" },
        { name: "Vercel", icon: "vercel" },
        { name: "Serilog" },
      ],
    },
    {
      layer: "quality",
      items: [
        { name: "xUnit" },
        { name: "Vitest", icon: "vitest" },
        { name: "Jest", icon: "jest" },
        { name: "Playwright" },
      ],
    },
    {
      layer: "workstation",
      items: [
        { name: "Arch Linux", icon: "archlinux" },
        { name: "Hyprland", icon: "hyprland" },
        { name: "Quickshell" },
        { name: "kitty" },
        { name: "zsh", icon: "zsh" },
        { name: "Claude Code", icon: "claude" },
        { name: "Git", icon: "git" },
      ],
    },
  ],
};
