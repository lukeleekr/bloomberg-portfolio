# Blog V2 — Image Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin embed inline images in blog post bodies via paste, drag-drop, or a toolbar button. Images are client-resized to ≤1920px wide JPEG, uploaded to a Supabase Storage public bucket, and inserted as markdown `![image](url)` at the cursor.

**Architecture:** New public Supabase Storage bucket `post-images`. New route handler `POST /api/images` authenticated by the existing HMAC admin cookie + a same-origin check. New client helpers for canvas-based resize and `multipart/form-data` upload. `PostEditor.tsx` gains three trigger handlers (paste / drop / button) that all funnel into a single upload pipeline with optimistic placeholders. No schema change to `posts`; URLs live inline in `body_md`.

**Tech Stack:** Next.js 16.2.2 · React 19.2.4 · TypeScript strict · Supabase Storage (service-role) · `nanoid` (already installed) · browser `OffscreenCanvas` + `FormData`.

**No test suite exists in this repo.** Each task's verification is a mix of `npm run build`, `npm run lint`, targeted SQL / curl checks, and a dev-server manual walkthrough. Do NOT invent `npm test` or add Vitest as part of this epic — V1 established this constraint and V2 inherits it.

**Canonical references (read before starting):**
- `docs/superpowers/specs/2026-04-18-blog-v2-image-upload-design.md` — V2 spec (source of truth)
- `docs/superpowers/specs/2026-04-18-blog-mvp-design.md` — V1 architectural design (patterns this plan extends)
- `CLAUDE.md` — project conventions (square design, color tokens, `supabase-server.ts` placeholder substitution)
- `AGENTS.md` — Next.js 16 is post-training-cutoff; read `node_modules/next/dist/docs/` for API questions
- Existing code to mirror:
  - `app/api/posts/route.ts` — error shape, headers, admin gate, content-type check
  - `app/lib/admin-session.ts` — `isAdminRequest(request)` signature
  - `app/lib/posts-shared.ts` / `app/lib/posts-server.ts` — client/server split pattern
  - `supabase/migrations/0002_posts.sql` — idempotent DDL conventions
  - `app/blog/_components/PostEditor.tsx` — the file being modified in Tasks 6–7

**Key invariants (do not regress):**
- `app/lib/supabase-server.ts` has an intentional build-time placeholder substitution. **Do not modify this file.** Import `supabaseServer` as-is and use its `.storage` API.
- `rehype-sanitize` default schema allows only `<img src="https://...">`. Bucket URLs are `https://...supabase.co/...` so they render unchanged. Do not alter the sanitize schema.
- Everything is square: `globals.css` forces `border-radius: 0 !important`. New UI (button, drop state, error line) must not reintroduce rounded corners.
- Bloomberg color tokens only (`bb-orange`, `bb-amber`, `bb-green`, `bb-red`, `bb-gray`, `bb-white`, `bb-dark`). No raw hex.
- Error shape matches `app/api/posts/route.ts`: `{ error: string, detail?: string }` with `Content-Type: application/json` and `Cache-Control: no-store`.

---

## File Structure Overview

| Action | Path | Purpose |
|---|---|---|
| Create | `supabase/migrations/0003_post_images_bucket.sql` | Idempotent bucket creation (public-read) |
| Create | `app/lib/images-shared.ts` | MIME allowlist, size/dimension constants, validators — client-safe |
| Create | `app/lib/images-client.ts` | Canvas resize + multipart upload helpers — client-only |
| Create | `app/lib/origin.ts` | `isSameOrigin(request)` helper — server-only, shared |
| Create | `app/api/images/route.ts` | `POST` handler for single-image upload |
| Modify | `app/blog/_components/PostEditor.tsx` | Add paste / drop / button triggers, cursor insertion, error state |

No schema change to `posts`. No new package dependencies (everything uses web platform + existing `@supabase/supabase-js` and `nanoid`).

---

## Task 1: Create the Supabase Storage bucket

**Files:**
- Create: `supabase/migrations/0003_post_images_bucket.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/0003_post_images_bucket.sql` with this exact content:

```sql
-- Public bucket for inline blog-post images. Idempotent like 0001/0002.
-- Uploads are service-role only (from /api/images); anon has SELECT via
-- the public=true flag. No explicit RLS policy rows needed — service-role
-- bypasses RLS by design, matching the comments/posts pattern.
insert into storage.buckets (id, name, public)
  values ('post-images', 'post-images', true)
  on conflict (id) do nothing;
```

- [ ] **Step 2: Apply the migration against the dev Supabase project**

Paste the SQL above into the Supabase dashboard → SQL editor → Run. Alternative via CLI if configured:
```bash
supabase db push
```

Expected: no errors. Verify in the dashboard → Storage that bucket `post-images` now exists and is marked Public.

- [ ] **Step 3: Verify the bucket is actually public-read**

In a terminal (no auth):
```bash
curl -sI "https://<project-ref>.supabase.co/storage/v1/object/public/post-images/does-not-exist.jpg" | head -1
```

Expected: `HTTP/2 400` or `HTTP/2 404` (the object doesn't exist). **NOT** `HTTP/2 401` — that would mean the bucket is private. If you get 401, re-check the `public=true` flag on the bucket row.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0003_post_images_bucket.sql
git commit -m "feat(blog): add post-images storage bucket migration"
```

---

## Task 2: `images-shared.ts` — constants and validators

**Files:**
- Create: `app/lib/images-shared.ts`

This is a client-safe module mirroring the pattern of `posts-shared.ts`. It must NEVER import `supabase-server` or anything that does.

- [ ] **Step 1: Write the file**

Create `app/lib/images-shared.ts` with this exact content:

```ts
// Client-safe helpers for blog image upload. NEVER import `supabase-server`
// from here — this module must be importable from PostEditor (Client Component).

export const IMAGE_ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const

export type AllowedImageMime = (typeof IMAGE_ALLOWED_MIMES)[number]

/** Raw file size ceiling accepted by the client (pre-resize). */
export const IMAGE_MAX_INPUT_BYTES = 10 * 1024 * 1024 // 10 MB

/** Post-resize upload ceiling (server re-checks as defense-in-depth). */
export const IMAGE_MAX_UPLOAD_BYTES = 2 * 1024 * 1024 // 2 MB

/** Max image width after resize; height scales proportionally. */
export const IMAGE_MAX_WIDTH_PX = 1920

/** Output format + quality for client-side re-encode. */
export const IMAGE_OUTPUT_MIME = 'image/jpeg' as const
export const IMAGE_OUTPUT_QUALITY = 0.85

export function isAllowedInputMime(mime: string): mime is AllowedImageMime {
  return (IMAGE_ALLOWED_MIMES as readonly string[]).includes(mime)
}
```

- [ ] **Step 2: Verify the file compiles**

Run:
```bash
npm run build
```

Expected: PASS. The file isn't imported yet, but TypeScript still type-checks it.

- [ ] **Step 3: Commit**

```bash
git add app/lib/images-shared.ts
git commit -m "feat(blog): add images-shared constants + validators"
```

---

## Task 3: `origin.ts` — same-origin check helper

**Files:**
- Create: `app/lib/origin.ts`

This is the CSRF replacement for multipart uploads that can't use the `Content-Type: application/json` trick.

- [ ] **Step 1: Write the file**

Create `app/lib/origin.ts` with this exact content:

```ts
// Server-only same-origin check for routes that accept multipart/form-data
// (which is CORS-simple and cannot use the application/json CSRF trick).
//
// Resolution order for the expected site origin:
//   1. process.env.NEXT_PUBLIC_SITE_URL (production path)
//   2. NODE_ENV !== 'production' fallback: derive from request Host header
//   3. production without NEXT_PUBLIC_SITE_URL: reject with misconfigured
//
// Trusting the Host header in production is a known CSRF footgun. We fail
// loudly instead of silently.

export type OriginCheckResult =
  | { ok: true }
  | { ok: false; reason: 'misconfigured' | 'bad_origin' }

function normalize(raw: string): string {
  return raw.replace(/\/$/, '').toLowerCase()
}

function expectedOrigin(request: Request): string | null {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (envUrl) return normalize(envUrl)

  if (process.env.NODE_ENV !== 'production') {
    const host = request.headers.get('host')
    if (!host) return null
    // Dev-only: assume http for localhost, https otherwise. Good enough for
    // `npm run dev` and preview deployments that set Host.
    const proto = host.startsWith('localhost') || host.startsWith('127.')
      ? 'http'
      : 'https'
    return normalize(`${proto}://${host}`)
  }

  return null
}

export function isSameOrigin(request: Request): OriginCheckResult {
  const expected = expectedOrigin(request)
  if (!expected) return { ok: false, reason: 'misconfigured' }

  const origin = request.headers.get('origin')
  if (!origin) return { ok: false, reason: 'bad_origin' }

  return normalize(origin) === expected
    ? { ok: true }
    : { ok: false, reason: 'bad_origin' }
}
```

- [ ] **Step 2: Verify the file compiles**

Run:
```bash
npm run build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/lib/origin.ts
git commit -m "feat: add isSameOrigin helper for multipart CSRF mitigation"
```

---

## Task 4: `POST /api/images` route handler

**Files:**
- Create: `app/api/images/route.ts`

- [ ] **Step 1: Write the file**

Create `app/api/images/route.ts` with this exact content:

```ts
import { customAlphabet } from 'nanoid'
import { isAdminRequest } from '../../lib/admin-session'
import { isSameOrigin } from '../../lib/origin'
import {
  IMAGE_MAX_UPLOAD_BYTES,
  isAllowedInputMime,
} from '../../lib/images-shared'
import { supabaseServer } from '../../lib/supabase-server'

const NO_STORE_JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

const BUCKET = 'post-images'
const nano = customAlphabet(
  '0123456789abcdefghijklmnopqrstuvwxyz',
  12,
)

function jsonError(code: string, status: number, detail?: string) {
  const body = detail ? { error: code, detail } : { error: code }
  return new Response(JSON.stringify(body), {
    status,
    headers: NO_STORE_JSON_HEADERS,
  })
}

function buildObjectPath(): string {
  const now = new Date()
  const yyyy = String(now.getUTCFullYear())
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${yyyy}/${mm}/${nano()}.jpg`
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonError('unauthorized', 401)
  }

  const origin = isSameOrigin(request)
  if (!origin.ok) {
    if (origin.reason === 'misconfigured') {
      return jsonError(
        'origin_misconfigured',
        500,
        'NEXT_PUBLIC_SITE_URL is required in production',
      )
    }
    return jsonError('bad_origin', 403)
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return jsonError('invalid_multipart', 400)
  }

  const file = form.get('file')
  if (!(file instanceof File)) return jsonError('missing_file', 400)
  if (file.size === 0) return jsonError('empty_file', 400)
  if (file.size > IMAGE_MAX_UPLOAD_BYTES) {
    return jsonError('payload_too_large', 413)
  }
  if (!isAllowedInputMime(file.type)) {
    return jsonError('unsupported_media_type', 415)
  }

  const path = buildObjectPath()
  const { error: uploadErr } = await supabaseServer.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: 'image/jpeg',
      upsert: false,
    })
  if (uploadErr) {
    console.error('[api/images POST] storage_error', uploadErr)
    return jsonError('storage_error', 500)
  }

  const { data: pub } = supabaseServer.storage.from(BUCKET).getPublicUrl(path)
  if (!pub?.publicUrl) {
    console.error('[api/images POST] public_url_missing', { path })
    return jsonError('storage_error', 500)
  }

  return new Response(JSON.stringify({ url: pub.publicUrl }), {
    status: 201,
    headers: NO_STORE_JSON_HEADERS,
  })
}
```

- [ ] **Step 2: Verify it compiles and the route is registered**

Run:
```bash
npm run build
```

Expected: PASS. In the route table output, confirm `ƒ /api/images` appears alongside the existing `ƒ /api/posts` entries.

- [ ] **Step 3: Verify the 401 / 403 / 415 paths with curl (no image required)**

Start dev server in another terminal:
```bash
npm run dev
```

Then, still in the repo directory:

```bash
# Unauthenticated → 401
curl -s -o /dev/stderr -w "%{http_code}\n" \
  -X POST http://localhost:3000/api/images \
  -F "file=@package.json"
```

Expected: `{"error":"unauthorized"}` then `401`.

```bash
# Authenticated but missing Origin → 403
# (Manual admin login needed first. Open http://localhost:3000, unlock admin,
#  then copy the bb_admin cookie from browser devtools.)
curl -s -o /dev/stderr -w "%{http_code}\n" \
  -X POST http://localhost:3000/api/images \
  -H "Cookie: bb_admin=<paste-value>" \
  -F "file=@package.json"
```

Expected: `{"error":"bad_origin"}` then `403`. (`curl -F` omits `Origin` by default.)

```bash
# Authenticated + Origin + wrong MIME → 415
curl -s -o /dev/stderr -w "%{http_code}\n" \
  -X POST http://localhost:3000/api/images \
  -H "Cookie: bb_admin=<paste-value>" \
  -H "Origin: http://localhost:3000" \
  -F "file=@package.json"
```

Expected: `{"error":"unsupported_media_type"}` then `415`. (`package.json` has MIME `application/json`.)

- [ ] **Step 4: Commit**

```bash
git add app/api/images/route.ts
git commit -m "feat(blog): add POST /api/images upload handler"
```

---

## Task 5: `images-client.ts` — resize + upload helpers

**Files:**
- Create: `app/lib/images-client.ts`

- [ ] **Step 1: Write the file**

Create `app/lib/images-client.ts` with this exact content:

```ts
'use client'

import {
  IMAGE_MAX_WIDTH_PX,
  IMAGE_OUTPUT_MIME,
  IMAGE_OUTPUT_QUALITY,
  IMAGE_MAX_INPUT_BYTES,
  isAllowedInputMime,
} from './images-shared'

export class ImageClientError extends Error {
  constructor(
    public readonly code: string,
    message?: string,
  ) {
    super(message ?? code)
    this.name = 'ImageClientError'
  }
}

async function decodeToImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    // Revoke immediately — the canvas snapshot is already held in memory.
    URL.revokeObjectURL(url)
  }
}

function computeTarget(
  srcW: number,
  srcH: number,
): { w: number; h: number } {
  if (srcW <= IMAGE_MAX_WIDTH_PX) return { w: srcW, h: srcH }
  const scale = IMAGE_MAX_WIDTH_PX / srcW
  return { w: IMAGE_MAX_WIDTH_PX, h: Math.round(srcH * scale) }
}

async function renderToBlob(
  img: HTMLImageElement,
  w: number,
  h: number,
): Promise<Blob> {
  // OffscreenCanvas where available; fall back to DOM canvas for Safari
  // versions that only got OffscreenCanvas convertToBlob in 16.4+.
  if (typeof OffscreenCanvas !== 'undefined') {
    const oc = new OffscreenCanvas(w, h)
    const ctx = oc.getContext('2d')
    if (!ctx) throw new ImageClientError('canvas_unavailable')
    ctx.drawImage(img, 0, 0, w, h)
    return oc.convertToBlob({
      type: IMAGE_OUTPUT_MIME,
      quality: IMAGE_OUTPUT_QUALITY,
    })
  }

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ImageClientError('canvas_unavailable')
  ctx.drawImage(img, 0, 0, w, h)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new ImageClientError('canvas_encode_failed'))
      },
      IMAGE_OUTPUT_MIME,
      IMAGE_OUTPUT_QUALITY,
    )
  })
}

/** Resize a File to a JPEG Blob capped at IMAGE_MAX_WIDTH_PX wide. */
export async function resizeImage(file: File): Promise<Blob> {
  if (file.size > IMAGE_MAX_INPUT_BYTES) {
    throw new ImageClientError('file_too_large')
  }
  // Allow any image/* including HEIC — the canvas decode path converts it.
  if (!file.type.startsWith('image/')) {
    throw new ImageClientError('not_an_image')
  }
  // Reject SVG explicitly even though it's image/*.
  if (file.type === 'image/svg+xml') {
    throw new ImageClientError('svg_not_allowed')
  }

  const img = await decodeToImage(file)
  const { w, h } = computeTarget(img.naturalWidth, img.naturalHeight)
  return renderToBlob(img, w, h)
}

/** Resize + upload. Returns the public URL on success. */
export async function uploadImage(file: File): Promise<string> {
  // Parity with server allowlist — fail before the network roundtrip.
  if (!isAllowedInputMime(file.type)) {
    throw new ImageClientError('unsupported_media_type')
  }

  const blob = await resizeImage(file)

  const fd = new FormData()
  fd.append('file', blob, 'image.jpg')

  const res = await fetch('/api/images', { method: 'POST', body: fd })
  if (!res.ok) {
    let code = 'upload_failed'
    try {
      const body = (await res.json()) as { error?: string }
      if (typeof body.error === 'string') code = body.error
    } catch {
      // body wasn't JSON, keep fallback code
    }
    throw new ImageClientError(code)
  }

  const data = (await res.json()) as { url?: string }
  if (typeof data.url !== 'string' || !data.url) {
    throw new ImageClientError('no_url_in_response')
  }
  return data.url
}
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npm run build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/lib/images-client.ts
git commit -m "feat(blog): add images-client resize + upload helpers"
```

---

## Task 6: PostEditor — cursor insertion + `handleFiles` pipeline

**Files:**
- Modify: `app/blog/_components/PostEditor.tsx`

This task adds the shared upload pipeline and a single trigger (paste) so we can verify the pipeline end-to-end before adding the other two triggers.

- [ ] **Step 1: Add new imports**

At the top of `app/blog/_components/PostEditor.tsx`, add after the existing `posts-shared` import block (around line 12):

```ts
import { uploadImage, ImageClientError } from '../../lib/images-client'
import { isAllowedInputMime } from '../../lib/images-shared'
```

- [ ] **Step 2: Add upload state + helpers inside the component body**

Insert the following inside the `PostEditor` function, after the `slugTakenHint` state declaration (around line 55, before `const isDirty = ...`):

```ts
  const [uploadError, setUploadError] = useState<string | null>(null)
  const uploadCounterRef = useRef(0)

  function insertAtCursor(insertion: string) {
    const el = textareaRef.current
    if (!el) {
      setForm((f) => ({ ...f, body_md: f.body_md + insertion }))
      return
    }
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? start
    setForm((f) => {
      const next =
        f.body_md.slice(0, start) + insertion + f.body_md.slice(end)
      return { ...f, body_md: next }
    })
    // Restore cursor to end of insertion on next tick.
    queueMicrotask(() => {
      el.focus()
      const pos = start + insertion.length
      el.setSelectionRange(pos, pos)
    })
  }

  function replaceInBody(needle: string, replacement: string) {
    setForm((f) => ({
      ...f,
      body_md: f.body_md.split(needle).join(replacement),
    }))
  }

  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((f) =>
      isAllowedInputMime(f.type),
    )
    if (files.length === 0) {
      setUploadError('unsupported_media_type')
      return
    }
    setUploadError(null)

    for (const file of files) {
      const id = ++uploadCounterRef.current
      const placeholder = `![uploading…](upload:${id})`
      insertAtCursor(placeholder)

      try {
        const url = await uploadImage(file)
        replaceInBody(placeholder, `![image](${url})`)
      } catch (err) {
        const code =
          err instanceof ImageClientError ? err.code : 'upload_failed'
        console.error('[PostEditor] upload failed', err)
        replaceInBody(placeholder, `![upload failed: ${code}](upload:${id})`)
        setUploadError(code)
      }
    }
  }
```

- [ ] **Step 3: Wire the paste handler onto the textarea**

Find the existing `<textarea>` element in the editor body (around line 293 — the one with `ref={textareaRef}` inside the `<section className='grid ...'>` preview split). Add an `onPaste` handler to it:

```tsx
        <textarea
          ref={textareaRef}
          value={form.body_md}
          onChange={(e) => setForm((f) => ({ ...f, body_md: e.target.value }))}
          onPaste={(e) => {
            const items = e.clipboardData?.items
            if (!items) return
            const files: File[] = []
            for (let i = 0; i < items.length; i++) {
              const item = items[i]
              if (item.kind === 'file') {
                const file = item.getAsFile()
                if (file) files.push(file)
              }
            }
            if (files.length > 0) {
              e.preventDefault()
              void handleFiles(files)
            }
          }}
          placeholder='# Your markdown…'
          className='min-h-[50vh] resize-none border-bb-gray/30 bg-black p-4 font-mono text-bb-white outline-none md:h-[100dvh] md:border-r'
        />
```

- [ ] **Step 4: Surface the upload error in the footer**

Find the footer error display near the bottom of the return (search for `error ? <span className='text-sm text-bb-red'>SAVE FAILED`). Add a second line next to it that shows upload errors. Change:

```tsx
        {error ? <span className='text-sm text-bb-red'>SAVE FAILED — {error}</span> : null}
```

to:

```tsx
        <div className='flex flex-col items-end gap-1'>
          {error ? (
            <span className='text-sm text-bb-red'>SAVE FAILED — {error}</span>
          ) : null}
          {uploadError ? (
            <span className='text-xs text-bb-red'>
              UPLOAD FAILED — {uploadError}
            </span>
          ) : null}
        </div>
```

- [ ] **Step 5: Verify build + lint**

Run:
```bash
npm run build
npm run lint
```

Expected: PASS on both. `npm run lint` should still show only the 3 pre-existing warnings.

- [ ] **Step 6: Manual smoke — paste an image**

In a terminal:
```bash
npm run dev
```

Open http://localhost:3000, unlock admin, navigate to `/blog/new`. Focus the textarea. Take a screenshot (macOS: Cmd+Shift+Ctrl+4, select a region → it goes to the clipboard). Paste with Cmd+V into the textarea.

Expected:
1. A `![uploading…](upload:1)` placeholder appears at the cursor immediately.
2. Within ~1 second, it is replaced with `![image](https://<project>.supabase.co/storage/v1/object/public/post-images/2026/04/<nanoid>.jpg)`.
3. The preview pane on the right renders the image.
4. No upload error appears.

If the preview doesn't render, open devtools → Network and inspect the image URL. Copy it into a new tab — it must return the image directly (not a 401). If 401, the bucket is not public — revisit Task 1 Step 3.

- [ ] **Step 7: Commit**

```bash
git add app/blog/_components/PostEditor.tsx
git commit -m "feat(blog): add paste-to-upload for inline images"
```

---

## Task 7: PostEditor — drag-drop + toolbar button triggers

**Files:**
- Modify: `app/blog/_components/PostEditor.tsx`

- [ ] **Step 1: Add drag-drop handlers to the textarea**

Find the `<textarea>` element modified in Task 6. Add `onDragOver` and `onDrop` handlers alongside the existing `onPaste`:

```tsx
        <textarea
          ref={textareaRef}
          value={form.body_md}
          onChange={(e) => setForm((f) => ({ ...f, body_md: e.target.value }))}
          onPaste={(e) => {
            const items = e.clipboardData?.items
            if (!items) return
            const files: File[] = []
            for (let i = 0; i < items.length; i++) {
              const item = items[i]
              if (item.kind === 'file') {
                const file = item.getAsFile()
                if (file) files.push(file)
              }
            }
            if (files.length > 0) {
              e.preventDefault()
              void handleFiles(files)
            }
          }}
          onDragOver={(e) => {
            if (e.dataTransfer?.types?.includes('Files')) {
              e.preventDefault()
            }
          }}
          onDrop={(e) => {
            const files = e.dataTransfer?.files
            if (files && files.length > 0) {
              e.preventDefault()
              void handleFiles(files)
            }
          }}
          placeholder='# Your markdown…'
          className='min-h-[50vh] resize-none border-bb-gray/30 bg-black p-4 font-mono text-bb-white outline-none md:h-[100dvh] md:border-r'
        />
```

- [ ] **Step 2: Add a hidden file input + button to the editor header**

The header row currently shows `BLOG`, the mode label, and the Cmd+S hint (around lines 215-222). Add a ref and the button to the header. First, add the ref declaration near the other refs (around line 52):

```ts
  const fileInputRef = useRef<HTMLInputElement | null>(null)
```

Then, change the header JSX from:

```tsx
      <header className='flex items-center justify-between border-b border-bb-gray/30 px-6 py-4'>
        <span className='text-bb-orange'>BLOG</span>
        <span className='text-sm text-bb-amber'>
          {mode === 'create' ? 'NEW POST' : 'EDIT POST'}
          {isDirty ? <span className='ml-3 text-bb-amber'>● UNSAVED</span> : null}
        </span>
        <span className='text-xs text-bb-gray'>Cmd/Ctrl+S to save</span>
      </header>
```

to:

```tsx
      <header className='flex items-center justify-between border-b border-bb-gray/30 px-6 py-4'>
        <span className='text-bb-orange'>BLOG</span>
        <span className='text-sm text-bb-amber'>
          {mode === 'create' ? 'NEW POST' : 'EDIT POST'}
          {isDirty ? <span className='ml-3 text-bb-amber'>● UNSAVED</span> : null}
        </span>
        <div className='flex items-center gap-3'>
          <input
            ref={fileInputRef}
            type='file'
            accept='image/jpeg,image/png,image/gif,image/webp'
            multiple
            className='hidden'
            onChange={(e) => {
              const files = e.target.files
              if (files && files.length > 0) {
                void handleFiles(files)
              }
              e.target.value = ''
            }}
          />
          <button
            type='button'
            onClick={() => fileInputRef.current?.click()}
            className='border border-bb-gray/40 px-3 py-1 text-xs text-bb-gray hover:border-bb-orange hover:text-bb-orange'
          >
            INSERT IMAGE
          </button>
          <span className='text-xs text-bb-gray'>Cmd/Ctrl+S to save</span>
        </div>
      </header>
```

- [ ] **Step 3: Verify build + lint**

Run:
```bash
npm run build
npm run lint
```

Expected: PASS on both. No new lint warnings.

- [ ] **Step 4: Manual smoke — drag-drop**

With `npm run dev` running, open `/blog/new`. From Finder or another app, drag a PNG or JPEG file onto the textarea.

Expected: placeholder appears, swapped with `![image](url)` within ~1s, preview renders.

- [ ] **Step 5: Manual smoke — INSERT IMAGE button**

Click the `INSERT IMAGE` button in the editor header. The OS file picker opens, filtered to images. Select a PNG.

Expected: same outcome as drag-drop.

- [ ] **Step 6: Manual smoke — multi-file paste**

Copy two images (macOS: open Preview, select two images in a folder, Cmd+C is NOT how this works — instead, take two screenshots in quick succession: Cmd+Shift+Ctrl+4 twice, each clipboard replaces the previous. This is a single-image workflow.). For a true multi-file test, drag-drop two files at once from Finder onto the textarea.

Expected: two placeholders `upload:N` and `upload:N+1` appear in order, each replaced with its resolved `![image](url)` as uploads complete. Completion order may differ from start order.

- [ ] **Step 7: Manual smoke — error path**

Drag an SVG file onto the textarea.

Expected: the textarea gets no placeholder (filter rejects it before work starts), `UPLOAD FAILED — unsupported_media_type` appears in the footer.

Next, quit `npm run dev`, edit `.env.local` to remove `SUPABASE_URL` (or set to an invalid value), restart dev, retry an upload.

Expected: placeholder appears, then gets replaced by `![upload failed: storage_error](upload:N)`, `UPLOAD FAILED — storage_error` appears in footer.

Restore the env var before proceeding.

- [ ] **Step 8: Commit**

```bash
git add app/blog/_components/PostEditor.tsx
git commit -m "feat(blog): add drag-drop + INSERT IMAGE button triggers"
```

---

## Task 8: End-to-end verification + cleanup

**Files:** (none modified)

- [ ] **Step 1: Save a post with inline images and reload**

With `npm run dev` running:
1. Open `/blog/new`, type a title, paste an image, save as `draft`.
2. Navigate away and back: the saved post should appear in `/blog` admin view (not public view for drafts).
3. Open the post at `/blog/<slug>` — image renders from the Storage URL.
4. Click `EDIT`, change something, save again.
5. Delete the post via the `DELETE` button. Confirm the image URL still resolves in a separate browser tab (orphan accepted per spec §8).

- [ ] **Step 2: Confirm the built route table is unchanged except for the new route**

Run:
```bash
npm run build
```

In the route table output, confirm:
- `ƒ /api/images` is listed.
- All V1 routes (`/blog`, `/blog/[slug]`, `/blog/[slug]/edit`, `/blog/new`, `/api/posts`, `/api/posts/[slug]`) are still listed.
- No route is missing.
- Build exit code is 0.

- [ ] **Step 3: Lint clean**

Run:
```bash
npm run lint
```

Expected: same 3 pre-existing warnings, no new warnings.

- [ ] **Step 4: Grep for regressions of key invariants**

Run:
```bash
# No raw hex colors added in new code
grep -rn "#[0-9a-fA-F]\{3,6\}" app/api/images app/lib/images-shared.ts app/lib/images-client.ts app/lib/origin.ts
# Expected: no matches.

# No border-radius overrides in new code
grep -rn "border-radius\|rounded" app/lib/images-client.ts app/blog/_components/PostEditor.tsx
# Expected: no new rounded classes (the existing textarea file should not have any).

# supabase-server.ts not modified
git diff --name-only origin/main..HEAD | grep "supabase-server.ts"
# Expected: no output.
```

- [ ] **Step 5: Confirm no placeholder markdown leaks into saved posts**

This is the dangerous regression. In the dev editor:
1. Paste an image.
2. **Immediately** press Cmd+S before the upload resolves (race the placeholder).
3. Expected behaviour: the placeholder is saved as `![uploading…](upload:N)` into `body_md`. The detail page will render it as broken markdown (literally shows "uploading…" as alt text, broken image icon).

This IS the accepted behaviour per spec §6.3 — the save path does not wait for pending uploads. Document this in the commit message if you hit it. If you feel strongly that this should block the save, that is a spec change, not an implementation bug — flag it in the PR description and let Luke decide.

- [ ] **Step 6: Push if V1 is already deployed**

Check origin status:
```bash
git log --oneline origin/main..HEAD
```

If the list includes V1 commits too, push only when ready for the Vercel redeploy. If V1 already shipped and V2 is a separate release, this may be its own push. Coordinate with Luke — do not push automatically.

- [ ] **Step 7: Final commit (nothing to change; this is a checklist task only)**

No code change. The verification above is the task's deliverable. If you found issues in any step, fix them and add a commit describing the fix. If no issues, move on without a no-op commit.

---

## Post-implementation checklist (for Luke)

- [ ] Set `NEXT_PUBLIC_SITE_URL=https://lukeyhlee.com` in Vercel project env (Production + Preview). Without this, the V2 `/api/images` route returns `500 origin_misconfigured` on prod uploads.
- [ ] Verify the `post-images` bucket exists in the **production** Supabase project (not just dev). Run the Task 1 migration against prod via the dashboard SQL editor if this is a separate project.
- [ ] After the Vercel deploy, open the production editor at `https://lukeyhlee.com/blog/new` (admin-login first) and paste one image end-to-end to confirm the production path works.
- [ ] Optional: add a nightly log-grep on Vercel Functions for `[api/images POST] storage_error` to catch silent upload failures.

---

## Known follow-ups (explicitly NOT in this plan)

- Orphan cleanup script `scripts/sweep-orphans.ts` — deferred per spec §8.
- Drag-drop visual highlight (drop-target ring). UX nice-to-have.
- Progress bar per upload. Placeholder text is the feedback; revisit if uploads get slow.
- Save-path wait-for-pending-uploads guard. Spec §6.3 accepts the race; revisit only if it bites in practice.
- Alt-text prompt UI. Current default `![image]` is user-editable in markdown.
- Cover/hero image per post (Epic-level deferred).
- Tag / theme classification (V2 Epic 2 — separate spec + plan).
