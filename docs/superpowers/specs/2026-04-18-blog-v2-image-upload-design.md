# Blog V2 — Image Upload Design Spec

**Date:** 2026-04-18
**Author:** Luke (via Rocky)
**Status:** Draft — pending user review before plan
**Target:** `bloomberg-portfolio` (lukeyhlee.com) — first V2 epic on top of shipped V1 MVP
**Prior art:** `2026-04-18-blog-mvp-design.md` (V1 shipped on `main`, commit `4b0e350`)

## 1. Purpose

Let the blog author (admin only) embed images inline in blog post bodies. Deferred from V1 alongside tags, comments, search, RSS, autosave, syntax highlighting. This spec covers **only** inline body images.

**Non-goals for this epic:**
- Cover / hero / thumbnail image per post
- Image gallery or attached files
- Image editing (crop, filters, alt-text overlay)
- Responsive `srcset` / multiple size variants
- Cleanup of unreferenced images (orphans accepted — see §8)

## 2. Scope

In scope:

- New Supabase Storage bucket `post-images` (public-read, service-role-write)
- New route handler `POST /api/images` for authenticated upload
- New client helpers `images-shared.ts` / `images-client.ts` (resize + upload)
- PostEditor integration: paste, drag-drop, and toolbar button triggers
- Client-side resize to max 1920px wide, JPEG q=0.85
- MIME allowlist: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- MIME denylist: `image/svg+xml` (XSS risk)

Out of scope (may be revisited later):

- Server-side resize / image processing
- Signed upload URLs (direct-to-Storage PUT from client)
- Per-post image reference tracking or junction tables
- Automatic orphan cleanup

## 3. Architecture

### 3.1 Data flow

```
[Editor trigger: paste | drag-drop | INSERT IMAGE button]
   ↓
[Client: images-client.ts]
   - decode file via <img> element (browser handles PNG/JPEG/GIF/WebP/HEIC)
   - draw to offscreen canvas scaled to max 1920px wide
   - canvas.toBlob("image/jpeg", 0.85)
   - POST multipart/form-data to /api/images
   ↓
[Server: app/api/images/route.ts]
   - isAdminRequest(request) gate             → 401 unauthorized
   - Origin header same-origin check          → 403 forbidden
   - MIME whitelist check                     → 415 unsupported_media_type
   - Size ≤ IMAGE_MAX_UPLOAD_BYTES            → 413 payload_too_large
   - Upload to Supabase Storage bucket "post-images"
   - Path: post-images/{YYYY}/{MM}/{nanoid(12)}.jpg
   - Return { url } (201)
   ↓
[Client: splice `![image](url)` at textareaRef.selectionStart]
```

### 3.2 Routes

| Path | Method | Purpose | Access |
|---|---|---|---|
| `POST /api/images` | multipart/form-data | Upload single image | Admin only (401), same-origin (403) |

No new page routes. Editor integration is entirely within `PostEditor.tsx`.

### 3.3 File layout

**New files:**

| Path | Purpose |
|---|---|
| `supabase/migrations/0003_post_images_bucket.sql` | Idempotent bucket creation (public-read) |
| `app/lib/images-shared.ts` | Client-safe constants + MIME validation (mirrors `posts-shared.ts` pattern) |
| `app/lib/images-client.ts` | `'use client'` — resize helper + upload helper |
| `app/api/images/route.ts` | `POST` handler |

**Changed files:**

| Path | Change |
|---|---|
| `app/blog/_components/PostEditor.tsx` | Add paste / drop / button triggers + cursor insertion + upload state (~50 LOC added) |

No schema change to `posts`. No new columns. URLs live inside `body_md` as standard markdown.

### 3.4 Data model

No change to `public.posts`. The only DB-adjacent artifact is a Supabase Storage bucket:

```sql
-- supabase/migrations/0003_post_images_bucket.sql
-- Idempotent: matches 0001/0002 style.
insert into storage.buckets (id, name, public)
  values ('post-images', 'post-images', true)
  on conflict (id) do nothing;

-- No explicit RLS policies on storage.objects:
-- - service-role uploads bypass RLS by design
-- - bucket.public = true grants anon SELECT
```

Object path convention: `{YYYY}/{MM}/{nanoid(12)}.jpg`
- Year/month prefix makes the Supabase dashboard browsable chronologically
- `nanoid(12)` gives ~71 bits of entropy — collision-free at any realistic scale
- Always `.jpg` because client-side resize re-encodes to JPEG

## 4. Module interfaces

### 4.1 `images-shared.ts` (client-safe)

```ts
export const IMAGE_ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const

export type AllowedImageMime = (typeof IMAGE_ALLOWED_MIMES)[number]

/** Raw file size ceiling — resize runs on anything under this. */
export const IMAGE_MAX_INPUT_BYTES = 10 * 1024 * 1024

/** Post-resize upload ceiling (server re-checks as defense in depth). */
export const IMAGE_MAX_UPLOAD_BYTES = 2 * 1024 * 1024

/** Max image width after resize. Height scales proportionally. */
export const IMAGE_MAX_WIDTH_PX = 1920

/** Resize output format + quality. */
export const IMAGE_OUTPUT_MIME = 'image/jpeg' as const
export const IMAGE_OUTPUT_QUALITY = 0.85

export function isAllowedInputMime(mime: string): mime is AllowedImageMime {
  return (IMAGE_ALLOWED_MIMES as readonly string[]).includes(mime)
}
```

### 4.2 `images-client.ts` (`'use client'`)

```ts
/** Resize a File to a JPEG Blob capped at IMAGE_MAX_WIDTH_PX wide. */
export async function resizeImage(file: File): Promise<Blob>

/** Resize + upload. Returns public URL on success. Throws on failure. */
export async function uploadImage(file: File): Promise<string>
```

**Resize implementation sketch:**
1. `const img = new Image(); img.src = URL.createObjectURL(file); await img.decode()`
2. Compute target dimensions: if `img.naturalWidth <= MAX` keep original; else scale.
3. `const canvas = new OffscreenCanvas(w, h); const ctx = canvas.getContext('2d')!; ctx.drawImage(img, 0, 0, w, h)`
4. `return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 })`
5. `URL.revokeObjectURL(img.src)` in `finally`

`OffscreenCanvas` is supported in all modern browsers. Fallback to `document.createElement('canvas')` if needed — negligible difference.

**Upload implementation:**
```ts
const blob = await resizeImage(file)
const fd = new FormData()
fd.append('file', blob, 'image.jpg')
const res = await fetch('/api/images', { method: 'POST', body: fd })
if (!res.ok) throw new Error(await res.text())
const { url } = await res.json()
return url
```

### 4.3 `POST /api/images`

**Request:** `multipart/form-data` with a single `file` field.

**Response codes:**

| Code | Body | When |
|---|---|---|
| 201 | `{ url: string }` | Upload succeeded |
| 400 | `{ error: 'missing_file' }` | No `file` field in form data |
| 400 | `{ error: 'empty_file' }` | File is 0 bytes |
| 401 | `{ error: 'unauthorized' }` | Not admin |
| 403 | `{ error: 'bad_origin' }` | Origin header missing or cross-origin |
| 413 | `{ error: 'payload_too_large' }` | File > `IMAGE_MAX_UPLOAD_BYTES` |
| 415 | `{ error: 'unsupported_media_type' }` | MIME not in allowlist |
| 500 | `{ error: 'origin_misconfigured' }` | Production deploy has no `NEXT_PUBLIC_SITE_URL` (see §5.1) |
| 500 | `{ error: 'storage_error' }` | Supabase Storage upload failed |

**Handler shape:**
```ts
export async function POST(request: Request) {
  if (!isAdminRequest(request)) return jsonError('unauthorized', 401)
  if (!isSameOrigin(request)) return jsonError('bad_origin', 403)

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return jsonError('missing_file', 400)
  if (file.size === 0) return jsonError('empty_file', 400)
  if (file.size > IMAGE_MAX_UPLOAD_BYTES) return jsonError('payload_too_large', 413)
  if (!isAllowedInputMime(file.type)) return jsonError('unsupported_media_type', 415)

  const path = buildObjectPath()  // {YYYY}/{MM}/{nanoid(12)}.jpg
  const { data, error } = await supabaseServer.storage
    .from('post-images')
    .upload(path, file, { contentType: 'image/jpeg', upsert: false })
  if (error) return jsonError('storage_error', 500)

  const { data: pub } = supabaseServer.storage.from('post-images').getPublicUrl(path)
  return Response.json({ url: pub.publicUrl }, { status: 201 })
}
```

### 4.4 PostEditor integration

Three event handlers added, all delegating to a shared `handleFiles(files: FileList)`:

- **Paste:** `onPaste` on the textarea — iterate `e.clipboardData.items`, collect files, call `handleFiles`.
- **Drag-drop:** `onDragOver` (preventDefault to enable drop) + `onDrop` on the textarea.
- **Button:** `<button type="button" onClick>` opens a hidden `<input type="file" accept="image/*" />`; `onChange` calls `handleFiles`.

`handleFiles` logic:
1. Filter to allowed MIMEs client-side (early exit on unsupported).
2. For each file: insert a placeholder `![uploading...](){n}` at the current cursor position (captured from `textareaRef.current.selectionStart` before async work).
3. `await uploadImage(file)` — on success, replace the placeholder with `![image](url)`; on failure, replace with `![upload failed: <reason>]()` and log.
4. Keep the editor dirty-tracking working: every textarea change already runs through `setForm`, so placeholder swaps flow through the same path.

Placeholder uses an incrementing counter so simultaneous uploads don't collide. Example: 3 pasted screenshots get `![uploading...](){0}`, `![uploading...](){1}`, `![uploading...](){2}` and are swapped in order of completion.

## 5. Security

### 5.1 CSRF mitigation

Existing write routes (`POST /api/posts`, `PATCH`, `DELETE`) use the `Content-Type: application/json` check as the CSRF signal. Multipart uploads can't reuse that — `multipart/form-data` is a CORS-simple content type and can be submitted cross-origin by forms.

Replacement strategy, both required:

1. **Admin cookie gate** (`isAdminRequest`) — unauthenticated requests are rejected before any work happens.
2. **Same-origin Origin header check** — compare `request.headers.get('origin')` to the configured site origin. Reject if missing or mismatched.

The site origin resolves as follows:

1. If `process.env.NEXT_PUBLIC_SITE_URL` is set, use it verbatim (production path — set this in Vercel env).
2. Else if `process.env.NODE_ENV !== 'production'`, derive from the request's `Host` header as a dev-only fallback (e.g. `http://localhost:3000`).
3. Else (production without `NEXT_PUBLIC_SITE_URL`) — reject the request with 500 `origin_misconfigured`. Trusting the Host header in production is a known CSRF footgun; fail loudly instead.

Missing `Origin` header → 403 (browsers always set it for cross-site POSTs; native clients can fake it but would still need the admin cookie).

### 5.2 Input validation

- MIME allowlist enforced server-side via `file.type` (from multipart) AND content-sniffing not required at our scale.
- SVG is explicitly denied. SVG can contain `<script>` and CSS expressions; `rehype-sanitize` would strip those on render but the image would still live in Storage as a served `.svg` that any direct URL visitor could execute. Simpler to reject at upload.
- Size limit enforced BEFORE the Storage call (early return).
- Path is server-constructed. Client never provides or influences the object path.

### 5.3 Existing guarantees preserved

- `rehype-sanitize` default schema (used by `MarkdownView`) allows `<img src="https://...">` only — data URLs are stripped. Our bucket URLs are `https://` so they render. SVG being denied at upload means none can appear in `body_md` → no bypass.
- Bucket is public-read only (SELECT). Anon cannot PUT/DELETE — only service-role can, and service-role is only used server-side inside the admin-gated route handler.

## 6. Error handling

### 6.1 Server errors

All errors return JSON matching the `{ error: string, detail?: string }` shape used by `app/api/posts/route.ts`. Codes are stable strings (not HTTP status codes alone) so the client can match on them. `Cache-Control: no-store` header on all responses (success and error).

### 6.2 Client errors

Shown inline below the textarea as `upload failed — <code>`. Not a modal. Editor stays usable. Placeholder markdown `![upload failed: <code>]()` stays in body until user deletes it or re-uploads.

One-shot error state; cleared on the next successful upload or manual edit.

### 6.3 Concurrency

Two+ uploads in flight simultaneously (paste + drop, or multi-file paste) each get their own placeholder ID. Swaps happen in resolution order, not start order. The textarea's textContent is the source of truth — placeholders are matched and replaced by literal string match on the exact placeholder tag.

## 7. Verification plan

No automated test suite in this repo. Manual smoke, same pattern as V1:

1. **Paste screenshot:** Cmd+Shift+Ctrl+4, Cmd+V in editor → image inserts at cursor, renders in preview pane.
2. **Drag-drop:** drag a PNG from Finder onto the textarea → same outcome.
3. **Button:** click INSERT IMAGE → file picker opens → pick a PNG → same outcome.
4. **Multiple uploads:** paste 3 screenshots in quick succession → all three insert in order of completion, no collisions.
5. **HEIC:** drop a HEIC file from iPhone → canvas converts to JPEG, uploads, renders.
6. **SVG rejection:** drop an SVG → client-side filter rejects with inline error, no network request made.
7. **Large file:** drop a 15MB RAW → rejected client-side (raw > `IMAGE_MAX_INPUT_BYTES`).
8. **Save roundtrip:** save post after upload → reload detail page → image still renders from Storage URL.
9. **Unauthenticated:** open editor in incognito (no admin cookie) → server returns 401 → client shows error.
10. **Build + lint:** `npm run build` passes, `npm run lint` stays at 3 pre-existing warnings with no new ones.

## 8. Known limitations & deferred work

- **Orphans.** Uploaded-then-abandoned images and images removed from posts stay in Storage forever. Acceptable at this scale. Future escape hatch: a one-shot `scripts/sweep-orphans.ts` that scans all `post-images/*` against all `body_md` contents and deletes the unreferenced.
- **No alt text UI.** Inserted markdown defaults to `![image](url)`. Luke can edit the alt text manually in the markdown. A UI prompt could come later.
- **No progress bar.** Placeholder text is the feedback signal. Single upload typically completes in <1s; a spinner seems like overkill. Revisit if uploads get slow.
- **No drag-drop highlight.** Dropping on the textarea works but there's no visual "drop here" ring. Keeps the UI clean; can be added if users miss the cue.
- **No request/response logging.** Errors `console.error` client-side; server `console.error('[api/images] storage_error', err)` only. Vercel logs are the inspection surface.
- **`NEXT_PUBLIC_SITE_URL` required in production.** The origin check refuses to run in production without it (returns 500 `origin_misconfigured`). Set this in Vercel env vars to `https://lukeyhlee.com` before shipping V2. Dev (`NODE_ENV !== 'production'`) falls back to the Host header so localhost works out of the box.

## 9. Key decisions (retained from brainstorm)

1. **Scope:** inline body images only; no cover image, no gallery.
2. **Storage:** Supabase Storage public bucket — stays on existing infra.
3. **Triggers:** paste + drag-drop + toolbar button (all three, one shared pipeline).
4. **Processing:** client-side resize to 1920px + re-encode to JPEG q=0.85. No server-side processing.
5. **Orphan policy:** never clean up automatically. Manual sweep script if needed later.
6. **MIME:** `image/jpeg`, `image/png`, `image/gif`, `image/webp` allowed; `image/svg+xml` denied.
7. **API shape:** multipart/form-data POST, not signed URL. CSRF via admin cookie + Origin check.
8. **Path:** `post-images/{YYYY}/{MM}/{nanoid(12)}.jpg`.

## 10. References

- V1 spec: `docs/superpowers/specs/2026-04-18-blog-mvp-design.md`
- V1 plan: `docs/superpowers/plans/2026-04-18-blog-mvp-plan.md`
- Existing patterns to follow:
  - `app/api/posts/route.ts` — error shape, headers, admin gate
  - `app/lib/posts-shared.ts` / `app/lib/posts-server.ts` — client/server split
  - `supabase/migrations/0002_posts.sql` — idempotent DDL style
  - `supabase/migrations/0001_init.sql` — RLS-on, no-anon-policy convention
