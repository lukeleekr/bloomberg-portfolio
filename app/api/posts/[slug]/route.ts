import { isAdminRequest } from '../../../lib/admin-session'
import {
  isValidSlug,
  isValidStatus,
  isValidTitle,
  SLUG_MAX_LEN,
  TITLE_MAX_LEN,
  TITLE_MIN_LEN,
} from '../../../lib/posts-shared'
import { deletePost, getPostBySlug, updatePost } from '../../../lib/posts-server'

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

// Next.js 16: params is a Promise.
type RouteContext = { params: Promise<{ slug: string }> }

export async function GET(request: Request, ctx: RouteContext) {
  const { slug } = await ctx.params
  try {
    const post = await getPostBySlug(slug)
    if (!post) return jsonError('not_found', 404)

    const admin = isAdminRequest(request)
    if (post.status !== 'public' && !admin) {
      // Same 404 as non-existent — no enumeration.
      return jsonError('not_found', 404)
    }

    return new Response(JSON.stringify({ post }), {
      status: 200,
      headers: NO_STORE_JSON_HEADERS,
    })
  } catch (err) {
    console.error('GET /api/posts/[slug] failed', err)
    return Response.json({ error: 'db_error' }, { status: 500 })
  }
}

export async function PATCH(request: Request, ctx: RouteContext) {
  if (!isAdminRequest(request)) return jsonError('unauthorized', 401)

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
  if (typeof body !== 'object' || body === null)
    return jsonError('invalid_json', 400)

  const b = body as Record<string, unknown>
  const update: Record<string, unknown> = {}

  if (typeof b.title === 'string') {
    const t = b.title.trim()
    if (!isValidTitle(t)) {
      return jsonError(
        'invalid_title',
        400,
        `title must be ${TITLE_MIN_LEN}-${TITLE_MAX_LEN} chars`
      )
    }
    update.title = t
  }
  if (typeof b.slug === 'string') {
    const s = b.slug.trim()
    if (!isValidSlug(s) || /[\r\n]/.test(s)) {
      return jsonError(
        'invalid_slug',
        400,
        `lowercase a-z, 0-9, single hyphens, no leading/trailing hyphen; 1-${SLUG_MAX_LEN} chars`
      )
    }
    update.slug = s
  }
  if (typeof b.body_md === 'string') {
    update.body_md = b.body_md
  }
  if (b.status !== undefined) {
    if (!isValidStatus(b.status)) return jsonError('invalid_status', 400)
    update.status = b.status
  }

  const { slug: currentSlug } = await ctx.params

  try {
    const post = await updatePost(currentSlug, update)
    if (!post) return jsonError('not_found', 404)
    return new Response(JSON.stringify({ post }), {
      status: 200,
      headers: NO_STORE_JSON_HEADERS,
    })
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === '23505'
    ) {
      return jsonError('slug_taken', 409)
    }
    console.error('[api/posts PATCH] db_error', err)
    return jsonError('db_error', 500)
  }
}

export async function DELETE(request: Request, ctx: RouteContext) {
  if (!isAdminRequest(request)) return jsonError('unauthorized', 401)
  const { slug } = await ctx.params
  try {
    const deleted = await deletePost(slug)
    if (!deleted) return jsonError('not_found', 404)
    return new Response(null, {
      status: 204,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('[api/posts DELETE] db_error', err)
    return jsonError('db_error', 500)
  }
}
