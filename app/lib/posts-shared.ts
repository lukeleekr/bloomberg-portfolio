// Client-safe helpers for the blog. NEVER import `supabase-server` from here
// or anything that does — this module must be importable from Client
// Components (PostEditor).
import { customAlphabet } from 'nanoid'

export type PostStatus = 'draft' | 'private' | 'public'
export type PostTopic =
  | 'macro'
  | 'markets'
  | 'credit'
  | 'ai'
  | 'korea'
  | 'portfolio'
  | 'notes'

export type Post = {
  id: string
  slug: string
  title: string
  summary: string
  topic: PostTopic
  body_md: string
  status: PostStatus
  created_at: string
  updated_at: string
  published_at: string | null
}

export const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/
export const SLUG_MAX_LEN = 60
export const TITLE_MIN_LEN = 1
export const TITLE_MAX_LEN = 120
export const SUMMARY_MAX_LEN = 240
export const DEFAULT_TOPIC: PostTopic = 'notes'

export const POST_TOPICS: Array<{ value: PostTopic; label: string }> = [
  { value: 'macro', label: 'Macro' },
  { value: 'markets', label: 'Markets' },
  { value: 'credit', label: 'Credit' },
  { value: 'ai', label: 'AI' },
  { value: 'korea', label: 'Korea' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'notes', label: 'Notes' },
]

const TOPIC_COLOR_CLASSES: Record<PostTopic, string> = {
  macro:
    'border-bb-amber bg-[#1a1300] text-bb-amber hover:bg-bb-amber hover:text-black',
  markets:
    'border-bb-green bg-[#001a08] text-bb-green hover:bg-bb-green hover:text-black',
  credit:
    'border-bb-red bg-[#1a0000] text-bb-red hover:bg-bb-red hover:text-black',
  ai:
    'border-bb-orange bg-[#1a0a00] text-bb-orange hover:bg-bb-orange hover:text-black',
  korea:
    'border-[#66ccff] bg-[#00121a] text-[#66ccff] hover:bg-[#66ccff] hover:text-black',
  portfolio:
    'border-[#b388ff] bg-[#14001f] text-[#b388ff] hover:bg-[#b388ff] hover:text-black',
  notes:
    'border-bb-gray/50 bg-[#111111] text-bb-gray hover:border-bb-gray hover:text-bb-white',
}

// Lowercase alphanumeric only. No hyphens in auto-generated slugs — hyphens
// are legal in user-typed slugs but awkward when randomly placed.
export const generateSlug = customAlphabet(
  '0123456789abcdefghijklmnopqrstuvwxyz',
  8,
)

export function isValidSlug(slug: string): boolean {
  return slug.length <= SLUG_MAX_LEN && SLUG_REGEX.test(slug)
}

export function isValidTitle(title: string): boolean {
  const len = title.length
  return len >= TITLE_MIN_LEN && len <= TITLE_MAX_LEN
}

export function isValidSummary(summary: string): boolean {
  return summary.length <= SUMMARY_MAX_LEN
}

export function isValidStatus(s: unknown): s is PostStatus {
  return s === 'draft' || s === 'private' || s === 'public'
}

export function isValidTopic(topic: unknown): topic is PostTopic {
  return POST_TOPICS.some((t) => t.value === topic)
}

export function topicLabel(topic: PostTopic): string {
  return POST_TOPICS.find((t) => t.value === topic)?.label ?? 'Notes'
}

export function topicBadgeClassName(topic: PostTopic): string {
  return `border px-2 py-0.5 text-xs uppercase transition-colors ${TOPIC_COLOR_CLASSES[topic]}`
}

export function topicFilterClassName(topic: PostTopic, active: boolean): string {
  return `border px-2 py-1 text-xs transition-colors ${TOPIC_COLOR_CLASSES[topic]} ${
    active ? 'font-semibold ring-1 ring-current' : ''
  }`
}

// Strip common markdown syntax so a post body previews as plain-ish text.
// Lossy for code blocks and tables — acceptable for v1.
export function excerpt(bodyMd: string, maxLen = 200): string {
  const cleaned = bodyMd
    .replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
    .replace(/`([^`]*)`/g, '$1') // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → text
    .replace(/^#{1,6}\s+/gm, '') // heading hashes
    .replace(/[*_~>|#-]{1,}/g, '') // stray markdown tokens
    .replace(/\s+/g, ' ')
    .trim()

  if (cleaned.length <= maxLen) return cleaned
  return cleaned.slice(0, maxLen).trimEnd() + '…'
}

export function readingTimeMinutes(bodyMd: string): number {
  const cleaned = excerpt(bodyMd, Number.MAX_SAFE_INTEGER)
  if (!cleaned) return 1

  const wordCount = cleaned.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(wordCount / 220))
}
