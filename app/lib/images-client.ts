'use client'

import {
  IMAGE_MAX_WIDTH_PX,
  IMAGE_OUTPUT_MIME,
  IMAGE_OUTPUT_QUALITY,
  IMAGE_MAX_INPUT_BYTES,
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
  if (!file.type.startsWith('image/')) {
    throw new ImageClientError('not_an_image')
  }

  const img = await decodeToImage(file)
  const { w, h } = computeTarget(img.naturalWidth, img.naturalHeight)
  return renderToBlob(img, w, h)
}

/**
 * Resize + upload. Returns the public URL on success.
 *
 * Caller is responsible for gating on isAllowedInputMime before calling this
 * — the current caller (PostEditor.handleFiles) filters the FileList first.
 * If the server disagrees it returns 415 and we surface that verbatim.
 */
export async function uploadImage(file: File): Promise<string> {
  const blob = await resizeImage(file)

  const fd = new FormData()
  fd.append('file', blob, 'image.jpg')

  const res = await fetch('/api/images', { method: 'POST', body: fd })
  if (!res.ok) {
    // Default fallback surfaces the HTTP status when the body is absent or
    // non-JSON (e.g., edge proxy 502). Concrete codes like 'bad_origin' or
    // 'unsupported_media_type' come from the JSON body when present.
    let code = `http_${res.status}`
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
