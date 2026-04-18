# Blog Roadmap

Running record of what's shipped and what's left for the `/blog` feature. Updated when an epic lands or when new scope is decided.

## Shipped

| Epic | Date | Commits | Notes |
|---|---|---|---|
| V1 MVP (post CRUD, three-state visibility, admin-only writes) | 2026-04-18 | up to `4b0e350` | Spec: `docs/superpowers/specs/2026-04-18-blog-mvp-design.md` (untracked). Plan: `.../2026-04-18-blog-mvp-plan.md` (untracked). |
| V2 Epic 1 — inline body image upload (paste / drag-drop / INSERT IMAGE button; client resize → Supabase public bucket) | 2026-04-19 | `527b726…8227ace` (14) | Spec: `docs/superpowers/specs/2026-04-18-blog-v2-image-upload-design.md`. Plan: `docs/superpowers/plans/2026-04-18-blog-v2-image-upload-plan.md`. |

## Remaining — not yet scoped

Each item below needs its own brainstorm + spec + plan before implementation. Priority order reflects likely author-pain, not a commitment.

1. **Tags / topics (categorization)** — flat label system on posts, filter-by-tag on `/blog`. Schema: new `post_tags` join table (or JSONB column on `posts`). URL shape: `/blog?tag=<slug>` or `/blog/tag/<slug>`. Main tradeoff: flat-flexible vs. hierarchical-rigid. Recommended first next epic.
2. **Folders (hierarchical organization)** — only if tags prove insufficient. Adds schema weight + UX complexity (tree navigation, move-between-folders). Defer until the flat-tags version is in use and the limitation is felt.
3. **Comments** — deferred from V1. Guestbook already exists as a separate feature; post-level comments would likely reuse the same pattern (public writes + admin moderation). Spam mitigation is the real design question.
4. **Search** — deferred from V1. Postgres full-text on `title + body_md` is the simplest path; Supabase supports `to_tsvector` + GIN index. Ranking tuning is the open question.
5. **RSS feed** — deferred from V1. Static generation at `/feed.xml` from `posts WHERE status='public'`. Low effort, worth pairing with search.
6. **Autosave / draft recovery** — deferred from V1. Current editor loses unsaved edits on accidental navigation. Simple path: `localStorage`-keyed by slug, restored on reload with a prompt.
7. **Syntax highlighting in rendered markdown** — deferred from V1. `rehype-highlight` or `shiki`. Shiki is heavier but produces better output for the Bloomberg monospace aesthetic.

## V2 Epic 1 follow-ups (known limitations, intentionally deferred)

From V2 spec §8 — worth revisiting only if they bite:

- **Orphan sweep script** — `scripts/sweep-orphans.ts` to delete unreferenced `post-images/*` blobs. Write when Storage cost or clutter becomes real.
- **Alt text UI** — currently inserts `![image](url)` with literal `image` as alt. Luke edits by hand. A prompt-on-insert would be nicer.
- **Upload progress bar** — placeholder text is the only feedback. Add only if uploads start taking noticeably long.
- **Drag-drop visual ring** — no "drop here" hover state on the textarea. Cosmetic.
- **Draft/private image privacy** — `post-images` is public-read; unguessable `nanoid(12)` path only. Switch to private bucket + signed URLs if regulated data ever enters scope.

## Deferred operational tasks (not features)

- **Post-merge Vercel origin verification** — commit `8227ace` logs `request.url` origin vs `Origin` header. After one prod hit confirms match, remove the log and redeploy. Tracked in the shipping handoff, not in a spec.
