import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

import {
  ADMIN_COOKIE_NAME,
  signAdminCookie,
} from '../../../lib/admin-session'

const COMPARE_KEY = randomBytes(32)

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

function constantTimeStringEquals(a: string, b: string): boolean {
  const aDigest = createHmac('sha256', COMPARE_KEY).update(a).digest()
  const bDigest = createHmac('sha256', COMPARE_KEY).update(b).digest()

  return timingSafeEqual(aDigest, bDigest)
}

export async function POST(request: Request) {
  const expectedPassword = process.env.ADMIN_PASSWORD

  if (!expectedPassword) {
    return new Response(JSON.stringify({ error: 'admin_not_configured' }), {
      status: 500,
      headers: JSON_HEADERS,
    })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  const providedPassword =
    typeof body === 'object' &&
    body !== null &&
    typeof (body as Record<string, unknown>).password === 'string'
      ? ((body as Record<string, unknown>).password as string)
      : ''

  await new Promise((resolve) => setTimeout(resolve, 250))

  if (
    !providedPassword ||
    !constantTimeStringEquals(providedPassword, expectedPassword)
  ) {
    return new Response(JSON.stringify({ error: 'invalid_password' }), {
      status: 401,
      headers: JSON_HEADERS,
    })
  }

  const { value, maxAge } = signAdminCookie()
  const cookieParts = [
    `${ADMIN_COOKIE_NAME}=${value}`,
    `Max-Age=${maxAge}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ]

  if (process.env.NODE_ENV === 'production') {
    cookieParts.push('Secure')
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      ...JSON_HEADERS,
      'Set-Cookie': cookieParts.join('; '),
    },
  })
}
