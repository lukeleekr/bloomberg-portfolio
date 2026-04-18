// Server-only same-origin check for routes that accept multipart/form-data
// (which is CORS-simple and cannot use the application/json CSRF trick).
//
// Uses `new URL(request.url).origin` as the expected origin. Next.js route
// handlers receive the full public URL (protocol + host + port) in
// request.url, so this works in dev (localhost, LAN IPs, IPv6), preview
// deployments, and production (Vercel) uniformly. No NEXT_PUBLIC_SITE_URL
// env var needed. Task 9 verifies this assumption on the first prod deploy.

export function isSameOrigin(request: Request): boolean {
  const originHeader = request.headers.get('origin')
  if (!originHeader) return false

  try {
    const expected = new URL(request.url).origin
    return originHeader === expected
  } catch {
    return false
  }
}
