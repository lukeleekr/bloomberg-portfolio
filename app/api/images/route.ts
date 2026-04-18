import { customAlphabet } from 'nanoid'
import { isAdminRequest } from '../../lib/admin-session'
import { isSameOrigin } from '../../lib/origin'
import {
  IMAGE_MAX_UPLOAD_BYTES,
  isAllowedInputMime,
} from '../../lib/images-shared'
import { supabaseServer } from '../../lib/supabase-server'
import { NO_STORE_JSON_HEADERS, jsonError } from '../../lib/api-response'

const BUCKET = 'post-images'
const nano = customAlphabet(
  '0123456789abcdefghijklmnopqrstuvwxyz',
  12,
)

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
  if (!isSameOrigin(request)) {
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
