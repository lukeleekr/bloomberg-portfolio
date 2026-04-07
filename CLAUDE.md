# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Stack

Next.js **16.2.2** (App Router) + React **19.2.4** + TypeScript (strict) + Tailwind CSS 3 + framer-motion + recharts. See `AGENTS.md` above — these versions post-date most training data, so verify APIs against `node_modules/next/dist/docs/` before coding, especially around `app/`, metadata, and client/server boundaries.

## Commands

```bash
npm run dev          # next dev — http://localhost:3000
npm run build        # next build (also type-checks via Next's tsc pass)
npm run start        # serve production build
npm run lint         # eslint (flat config, eslint.config.mjs)
npx eslint app/page.tsx  # lint a single file
```

No test suite exists in this repo — do not invent `npm test`. If adding tests, discuss the framework choice first.

## Architecture

This is a **single-page Bloomberg-Terminal-styled Korean portfolio**. Despite the multi-section navigation, there is only one route (`/`) and one page component.

### State lives in one place

`app/page.tsx` is a ~690-line `"use client"` component (`BloombergPortfolio`) that owns *all* interactive state: active tab, active button, open project, typewriter text, guestbook messages, alert popup, scroll lock. The four files in `app/components/` are presentational/self-contained:

- `TerminalOverlay.tsx` — `/`-key-triggered fake terminal; command strings are a hardcoded `COMMANDS: Record<string, string>` table. Add new commands there, not via props.
- `FKeyPanel.tsx` — Bloomberg F1–F6 key detail panels; data is a hardcoded `FKEY_DATA` array.
- `ToolboxPanel.tsx` — daily-use tool cards; data is a hardcoded `tools` array.
- `RadarChart.tsx` — recharts `RadarChart` with **explicit `height: 280`** (don't regress to `height="100%"` — recent commit `082cb65` fixed a 0px-render bug).

### Navigation model

Eight sections (`profile`, `skills`, `projects`, `now`, `toolbox`, `journey`, `guestbook`, `contact`) are stacked in one `<main>`. Navigation is scroll-based:

- Tab highlighting: a `scroll` listener walks `sectionIds` and sets `activeTab` by `rect.top <= threshold`. Threshold grows near the page bottom so lower sections can still activate.
- Click navigation goes through `navigateTo(id)`, which sets `scrollLockRef.current = true` for 800ms to stop the scroll listener from fighting the smooth scroll.
- Keys `1`–`8` scroll to sections (disabled when an input/textarea is focused). Key `/` opens the terminal.
- Every section uses `scroll-mt-20` to offset the sticky header + nav.

**When adding a section:** update the `sectionIds` array in the scroll effect, the `sectionMap` in the keydown effect, and the `tabs` array — all three must stay in sync.

### Persistence

Client-only. No backend, no API routes, no database.

- `localStorage.bb_guestbook` — guestbook entries (capped at 50, newest first).
- `localStorage.bb_my_msgs` — Set of IDs the current browser authored (controls delete-button visibility).
- `sessionStorage.bb_alert_seen` — one-shot "Press / to open terminal" popup.

### Design system constraints

- **Everything is square.** `globals.css` forces `border-radius: 0 !important` on `*`, and `tailwind.config.ts` overrides *all* radius tokens (`sm`, `md`, `lg`, ..., `full`) to `0px`. Do not add rounded corners.
- Colors live under the `bb` namespace in Tailwind: `bb-black`, `bb-orange` (#FF6600, primary accent), `bb-amber` (#FFB800, headers), `bb-green`/`bb-red` (market state), `bb-border` (#333), `bb-rowHover`. Use these tokens instead of raw hex.
- Monospace font stack only (`font-mono` = `font-sans` here).
- `.flicker-target` class marks elements that the global flicker interval in `page.tsx` randomly animates every 6s — add it to stat numbers for the Bloomberg feel.
- `.panel-header` utility is the standard section header (amber, bordered, uppercase).

### Intentionally absent / gotchas

- `tsconfig.json` has `"paths": { "@/*": ["./src/*"] }` left over from `create-next-app`, but **there is no `src/` directory**. Use relative imports (`./components/...`) like the existing code does, or add a `src/` dir first if you want to use the alias.
- `tailwind.config.ts` content globs include `./pages/**` and `./components/**` at the repo root — neither exists. Only `./app/**` is scanned in practice.
- Page content is Korean (`<html lang="ko">`), but code identifiers and comments are English. Use `word-break: keep-all` (already on `body`) when adding Korean prose.
- Deployment target is Vercel (`.vercel/` is present); there is no custom `next.config.ts` beyond the default export.
