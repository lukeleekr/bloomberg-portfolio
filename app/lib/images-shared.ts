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
