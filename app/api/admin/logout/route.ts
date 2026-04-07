import { ADMIN_COOKIE_NAME } from '../../../lib/admin-session'

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

export async function POST() {
  const cookieParts = [
    `${ADMIN_COOKIE_NAME}=`,
    'Max-Age=0',
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
