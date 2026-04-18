# bloomberg-portfolio

## Project Overview

Bloomberg-Terminal-styled Korean personal portfolio at lukeyhlee.com (Vercel). Single-page portfolio (`/`) + admin-authored blog (`/blog`) + guestbook + visit counter. Supabase backs persistence; admin auth via stateless HMAC cookie.

@AGENTS.md

## Stack

Next.js **16.2.2** (App Router) + React **19.2.4** + TypeScript (strict) + Tailwind CSS 3 + framer-motion + recharts + Supabase JS SDK (service-role) + nanoid. Versions post-date most training data — verify APIs against `node_modules/next/dist/docs/` before coding.

## Commands

```bash
npm run dev          # next dev — http://localhost:3000
npm run build        # next build (also type-checks)
npm run lint         # eslint (flat config, eslint.config.mjs)
```

No test suite exists — do not invent `npm test`.

## Architecture

**Portfolio (`/`)** — single `"use client"` component (`BloombergPortfolio` in `app/page.tsx`, ~800 lines) owning all interactive state. Four presentational components in `app/components/`:

- `TerminalOverlay.tsx` — `/`-key triggered; commands in hardcoded `COMMANDS` table
- `FKeyPanel.tsx` — F1-F6 detail panels; data in `FKEY_DATA` array
- `ToolboxPanel.tsx` — tool cards; data in `tools` array
- `RadarChart.tsx` — recharts `RadarChart` with **explicit `height: 280`** (don't regress — commit `082cb65` fixed a 0px-render bug)

**When adding a section to `/`:** update `sectionIds`, `sectionMap`, and `tabs` — all three must stay in sync.

**Blog (`/blog`)** — admin-authored markdown posts with three-state visibility (`draft`/`private`/`public`). Routes: `/blog` (admin list), `/blog/new`, `/blog/[slug]` (public detail), `/blog/[slug]/edit`. Components in `app/blog/_components/`: `PostEditor.tsx` (split-view editor; paste/drag-drop/INSERT-IMAGE button → uploads to Supabase Storage), `MarkdownView.tsx`, `PostListItem.tsx`, `StatusChip.tsx`. The editor textarea uses `setRangeText` for cursor-stable insertion and optimistic placeholder swap on upload.

**Lib boundary (client/server split — strict):**

- Client-safe: `posts-shared.ts`, `images-shared.ts`, `images-client.ts`, `api-response.ts`
- Server-only: `supabase-server.ts`, `admin-session.ts`, `posts-server.ts`, `origin.ts`
- *Never import a server-only file from a Client Component.* `*-shared.ts` modules exist precisely to keep this boundary clean.

**API routes** (`app/api/`): `admin/{login,logout,me}`, `guestbook` + `guestbook/[id]`, `visits`, `posts` + `posts/[slug]`, `images`. All write-handlers use shared `NO_STORE_JSON_HEADERS` + `jsonError`/`jsonOk` from `app/lib/api-response.ts` — error shape is `{ error: string, detail?: string }` with `Cache-Control: no-store`.

**Auth:** admin-only writes. `bb_admin` cookie is a stateless HMAC-SHA256 over `${expiry}.${hmac}` signed with `ADMIN_SESSION_SECRET` (≥32 chars), 24h TTL, `httpOnly`+`secure`+`sameSite=lax`. No server-side session store — cannot revoke a stolen cookie before expiry (accepted tradeoff for a single-admin site). Multipart endpoints (`/api/images`) add a same-origin check on top via `app/lib/origin.ts` (`new URL(request.url).origin`).

## Design System Constraints

- **Everything is square.** `globals.css` forces `border-radius: 0 !important`. Do not add rounded corners.
- Colors in `bb-*` Tailwind namespace: `bb-orange` (#FF6600 accent), `bb-amber` (#FFB800 headers), `bb-green`/`bb-red` (market state). Use tokens, not raw hex.
- Monospace font stack only.

## Gotchas

- `app/lib/supabase-server.ts` **intentionally** substitutes placeholder env vars during `NEXT_PHASE === 'phase-production-build'` — do NOT "fix" this, it will break Vercel builds. The module also throws at load time when env vars are missing in any other phase, so don't try the env-removal trick to simulate failures (rename the bucket constant instead).
- `tsconfig.json` has `@/*` path alias but **no `src/` directory** — use relative imports.
- `tailwind.config.ts` content globs include `./pages/**` and `./components/**` at repo root — neither exists; only `./app/**` is scanned.
- Old `localStorage.bb_guestbook` / `bb_my_msgs` keys are gone — don't reintroduce.
- Image-upload bucket `post-images` is **public-read**. Draft/private post images ARE URL-reachable via their unguessable `nanoid(12)` path. Documented in V2 spec §8; switch to signed URLs if private-by-default becomes a requirement.
- `rehype-sanitize` default schema constrains rendered `<img src>` to `https://`. Supabase Storage URLs match; do not alter the schema.

## References

- `SETUP.md` — Supabase setup + env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` ≥32 chars)
- `supabase/migrations/` — `0001_init.sql` (comments + visits_daily + visits_total + `increment_visit` RPC), `0002_posts.sql` (posts table; slug regex + status enum), `0003_post_images_bucket.sql` (public Storage bucket)
- `docs/superpowers/specs/2026-04-18-blog-v2-image-upload-design.md` — V2 image-upload design (threat model, error lifecycle, parallel upload contract)
- `docs/superpowers/plans/2026-04-18-blog-v2-image-upload-plan.md` — V2 implementation plan with literal code per task
