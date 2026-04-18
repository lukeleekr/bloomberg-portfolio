'use client'

import { useEffect, useRef, useState } from 'react'
import { customAlphabet } from 'nanoid'
import { useRouter } from 'next/navigation'
import type { Post, PostStatus } from '../../lib/posts-shared'
import {
  SLUG_MAX_LEN,
  TITLE_MAX_LEN,
  generateSlug,
  isValidSlug,
  isValidTitle,
} from '../../lib/posts-shared'
import { uploadImage, ImageClientError } from '../../lib/images-client'
import { isAllowedInputMime } from '../../lib/images-shared'
import MarkdownView from './MarkdownView'

type Mode = 'create' | 'edit'

type Props = { mode: 'create' } | { mode: 'edit'; initial: Post }

type FormState = {
  title: string
  slug: string
  body_md: string
  status: PostStatus
}

function toForm(post: Post | null): FormState {
  return {
    title: post?.title ?? '',
    slug: post?.slug ?? '',
    body_md: post?.body_md ?? '',
    status: post?.status ?? 'draft',
  }
}

function snapshotsEqual(a: FormState, b: FormState) {
  return (
    a.title === b.title &&
    a.slug === b.slug &&
    a.body_md === b.body_md &&
    a.status === b.status
  )
}

// 8-char alphanumeric suffix for upload placeholders — prevents collision
// with user-typed text like `![uploading…](upload:1)`.
const placeholderId = customAlphabet(
  '0123456789abcdefghijklmnopqrstuvwxyz',
  8,
)

export default function PostEditor(props: Props) {
  const router = useRouter()
  const mode: Mode = props.mode
  const initial = props.mode === 'edit' ? props.initial : null

  const [form, setForm] = useState<FormState>(toForm(initial))
  const savedRef = useRef<FormState>(toForm(initial))
  const slugTouchedRef = useRef<boolean>(mode === 'edit')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slugTakenHint, setSlugTakenHint] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const isDirty = !snapshotsEqual(form, savedRef.current)

  /**
   * Imperatively insert text at the current selection and sync React state.
   *
   * Uses the native `setRangeText` API so the browser places the cursor at
   * end-of-insertion atomically with the DOM update. Then we `setForm` with
   * `el.value` so controlled-input state matches DOM and React's next render
   * doesn't fight the cursor we just set.
   *
   * React does not fire synthetic onChange for setRangeText, hence the
   * explicit setForm sync.
   */
  function insertAtCursor(insertion: string) {
    const el = textareaRef.current
    if (!el) {
      setForm((f) => ({ ...f, body_md: f.body_md + insertion }))
      return
    }
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? start
    el.setRangeText(insertion, start, end, 'end')
    el.focus()
    setForm((f) => ({ ...f, body_md: el.value }))
  }

  /**
   * Replace a placeholder substring with final markdown. Uses setRangeText
   * with 'preserve' mode so the browser shifts the user's selection past the
   * replaced range by the correct delta — keeps cursor stable when a user
   * has moved on to typing elsewhere while uploads resolve in the background.
   */
  function replaceInBody(needle: string, replacement: string) {
    const el = textareaRef.current
    if (el) {
      const idx = el.value.indexOf(needle)
      if (idx !== -1) {
        el.setRangeText(replacement, idx, idx + needle.length, 'preserve')
        setForm((f) => ({ ...f, body_md: el.value }))
        return
      }
    }
    // Fallback: no textarea ref or user deleted the placeholder mid-flight.
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

    // Phase 1: insert all placeholders sequentially — textarea cursor state
    // only updates synchronously so this has to be ordered.
    const pending = files.map((file) => {
      const id = placeholderId()
      const placeholder = `![uploading…](upload:${id})`
      insertAtCursor(placeholder)
      return { file, placeholder, id }
    })

    // Phase 2: dispatch uploads in parallel — swaps happen in resolution
    // order, not start order (matches spec §6.3).
    await Promise.all(
      pending.map(async ({ file, placeholder, id }) => {
        try {
          const url = await uploadImage(file)
          replaceInBody(placeholder, `![image](${url})`)
          // Clear stale error once any upload succeeds (spec §6.2).
          setUploadError((prev) => (prev ? null : prev))
        } catch (err) {
          const code =
            err instanceof ImageClientError ? err.code : 'upload_failed'
          console.error('[PostEditor] upload failed', err)
          replaceInBody(
            placeholder,
            `![upload failed: ${code}](upload:${id})`,
          )
          setUploadError(code)
        }
      }),
    )
  }

  // beforeunload: attach only while dirty; detach on unmount or clean.
  useEffect(() => {
    if (!isDirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  // Cmd/Ctrl+S = save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form])

  // Mobile = one document flow. Auto-grow the textarea there so the page keeps
  // a single scroll container; desktop uses the fixed split-pane height.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    if (!window.matchMedia('(max-width: 767px)').matches) {
      el.style.height = ''
      return
    }
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [form.body_md])

  function onTitleBlur() {
    if (mode === 'edit') return
    if (slugTouchedRef.current) return
    if (form.slug) return
    setForm((f) => ({ ...f, slug: generateSlug() }))
  }

  function onSlugChange(value: string) {
    slugTouchedRef.current = true
    setForm((f) => ({ ...f, slug: value.toLowerCase().trim() }))
    setSlugTakenHint(false)
  }

  function regenerateSlug() {
    setForm((f) => ({ ...f, slug: generateSlug() }))
    slugTouchedRef.current = true
    setSlugTakenHint(false)
  }

  function onCancel() {
    if (isDirty && !confirm('Discard unsaved changes and leave the editor?')) {
      return
    }
    savedRef.current = toForm(initial)
    setForm(toForm(initial))
    router.push('/blog')
  }

  async function save() {
    setError(null)
    setSlugTakenHint(false)

    if (!isValidTitle(form.title.trim())) {
      setError(`Title must be 1-${TITLE_MAX_LEN} chars`)
      return
    }
    if (!isValidSlug(form.slug)) {
      setError(
        `Slug must be lowercase a-z, 0-9, single hyphens; max ${SLUG_MAX_LEN} chars`,
      )
      return
    }

    setSaving(true)
    try {
      const endpoint = mode === 'create' ? '/api/posts' : `/api/posts/${initial!.slug}`
      const method = mode === 'create' ? 'POST' : 'PATCH'
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          slug: form.slug,
          body_md: form.body_md,
          status: form.status,
        }),
      })

      if (res.status === 401) {
        // router.push is a same-origin client nav; beforeunload does not fire.
        router.push('/?admin_expired=1')
        return
      }

      if (res.status === 409) {
        setSlugTakenHint(true)
        setSaving(false)
        return
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'save_failed')
        setSaving(false)
        return
      }

      const data = await res.json()
      const saved: Post = data.post

      // Update saved ref before navigate so the beforeunload effect sees
      // dirty=false and detaches its listener.
      savedRef.current = toForm(saved)
      setForm(toForm(saved))
      setSaving(false)
      router.push(`/blog/${saved.slug}`)
    } catch (err) {
      console.error(err)
      setError('network_error')
      setSaving(false)
    }
  }

  async function onDelete() {
    if (mode !== 'edit') return
    if (!confirm(`Delete "${initial!.title}"? This cannot be undone.`)) return

    try {
      const res = await fetch(`/api/posts/${initial!.slug}`, { method: 'DELETE' })
      if (res.status === 401) {
        router.push('/?admin_expired=1')
        return
      }
      if (!res.ok) {
        setError('delete_failed')
        return
      }
      // Treat as clean before navigating so listener detaches.
      savedRef.current = toForm(null)
      setForm(toForm(null))
      router.push('/blog')
    } catch (err) {
      console.error(err)
      setError('network_error')
    }
  }

  return (
    <main className='flex min-h-screen flex-col bg-bb-dark font-mono text-bb-white'>
      <header className='flex items-center justify-between border-b border-bb-gray/30 px-6 py-4'>
        <span className='text-bb-orange'>BLOG</span>
        <span className='text-sm text-bb-amber'>
          {mode === 'create' ? 'NEW POST' : 'EDIT POST'}
          {isDirty ? <span className='ml-3 text-bb-amber'>● UNSAVED</span> : null}
        </span>
        <span className='text-xs text-bb-gray'>Cmd/Ctrl+S to save</span>
      </header>

      <section className='grid gap-3 border-b border-bb-gray/30 px-6 py-4 md:grid-cols-[1fr_auto_auto] md:items-center'>
        <div>
          <label className='mb-1 block text-xs uppercase text-bb-gray'>Title</label>
          <input
            type='text'
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            onBlur={onTitleBlur}
            maxLength={TITLE_MAX_LEN}
            placeholder='Post title'
            className='w-full border border-bb-gray/40 bg-black px-3 py-2 text-bb-white outline-none focus:border-bb-orange'
          />
        </div>
        <div>
          <label className='mb-1 block text-xs uppercase text-bb-gray'>Slug</label>
          <div className='flex gap-2'>
            <input
              type='text'
              value={form.slug}
              onChange={(e) => onSlugChange(e.target.value)}
              maxLength={SLUG_MAX_LEN}
              placeholder='slug-here'
              className={`w-48 bg-black px-3 py-2 font-mono text-bb-white outline-none ${
                slugTakenHint
                  ? 'border border-bb-red'
                  : 'border border-bb-gray/40 focus:border-bb-orange'
              }`}
            />
            <button
              type='button'
              onClick={regenerateSlug}
              className='border border-bb-gray/40 px-3 py-2 text-xs text-bb-gray hover:border-bb-orange hover:text-bb-orange'
            >
              REGENERATE
            </button>
          </div>
          {slugTakenHint ? (
            <div className='mt-1 text-xs text-bb-red'>
              Slug taken — pick another or regenerate.
            </div>
          ) : (
            <div className='mt-1 text-xs text-bb-gray'>
              a-z 0-9, single hyphens; max 60 chars
            </div>
          )}
        </div>
        <div>
          <label className='mb-1 block text-xs uppercase text-bb-gray'>Status</label>
          <div className='flex items-center gap-3'>
            {(['draft', 'private', 'public'] as const).map((s) => (
              <label
                key={s}
                className='flex cursor-pointer items-center gap-1 text-sm text-bb-white'
              >
                <input
                  type='radio'
                  name='status'
                  value={s}
                  checked={form.status === s}
                  onChange={() => setForm((f) => ({ ...f, status: s }))}
                />
                {s.toUpperCase()}
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className='grid md:min-h-0 md:flex-1 md:grid-cols-2'>
        <textarea
          ref={textareaRef}
          value={form.body_md}
          onChange={(e) => {
            setForm((f) => ({ ...f, body_md: e.target.value }))
            // Clear any upload error once user starts editing (spec §6.2).
            setUploadError((prev) => (prev ? null : prev))
          }}
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
        <div className='min-h-[50vh] bg-[#0c0c0c] p-4 md:h-[100dvh] md:overflow-auto'>
          <MarkdownView source={form.body_md} />
        </div>
      </section>

      <footer className='flex items-center justify-between border-t border-bb-gray/30 bg-black px-6 py-3'>
        <div className='flex gap-2'>
          <button
            type='button'
            onClick={onCancel}
            className='border border-bb-gray/40 px-4 py-2 text-sm text-bb-gray hover:border-bb-orange hover:text-bb-orange'
          >
            CANCEL
          </button>
          <button
            type='button'
            onClick={() => void save()}
            disabled={saving}
            className='bg-bb-orange px-4 py-2 text-sm font-semibold text-black hover:bg-bb-amber disabled:opacity-50'
          >
            {saving ? 'SAVING…' : 'SAVE'}
          </button>
          {mode === 'edit' ? (
            <button
              type='button'
              onClick={() => void onDelete()}
              className='border border-bb-red px-4 py-2 text-sm text-bb-red hover:bg-bb-red hover:text-black'
            >
              DELETE
            </button>
          ) : null}
        </div>
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
      </footer>
    </main>
  )
}
