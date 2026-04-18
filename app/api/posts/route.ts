import { isAdminRequest } from '../../lib/admin-session'
import {
  isValidSlug,
  isValidStatus,
  isValidTitle,
  SLUG_MAX_LEN,
  TITLE_MAX_LEN,
  TITLE_MIN_LEN,
} from '../../lib/posts-shared'
import { createPost } from '../../lib/posts-server'

const NO_STORE_JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

function jsonError(code: string, status: number, detail?: string) {
  const body = detail ? { error: code, detail } : { error: code }
  return new Response(JSON.stringify(body), {
    status,
    headers: NO_STORE_JSON_HEADERS,
  })
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonError('unauthorized', 401)
  }

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return jsonError('invalid_content_type', 400)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('invalid_json', 400)
  }

  if (typeof body !== 'object' || body === null) {
    return jsonError('invalid_json', 400)
  }

  const b = body as Record<string, unknown>
  const title = typeof b.title === 'string' ? b.title.trim() : ''
  const slug = typeof b.slug === 'string' ? b.slug.trim() : ''
  const body_md = typeof b.body_md === 'string' ? b.body_md : ''
  const status = b.status

  if (!isValidTitle(title)) {
    return jsonError(
      'invalid_title',
      400,
      `title must be ${TITLE_MIN_LEN}-${TITLE_MAX_LEN} chars`
    )
  }
  if (!isValidSlug(slug)) {
    return jsonError(
      'invalid_slug',
      400,
      `lowercase a-z, 0-9, single hyphens, no leading/trailing hyphen; 1-${SLUG_MAX_LEN} chars`
    )
  }
  if (!isValidStatus(status)) {
    return jsonError('invalid_status', 400)
  }
  if (/[\r\n]/.test(slug)) {
    return jsonError('invalid_slug', 400, 'slug must not contain newlines')
  }

  try {
    const post = await createPost({ title, slug, body_md, status })
    return new Response(JSON.stringify({ post }), {
      status: 201,
      headers: NO_STORE_JSON_HEADERS,
    })
  } catch (err: unknown) {
    // Postgres unique violation error code is '23505'
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === '23505'
    ) {
      return jsonError('slug_taken', 409)
    }
    console.error('[api/posts POST] db_error', err)
    return jsonError('db_error', 500)
  }
}
