// Admin session helpers for the guestbook moderation flow.
//
// SECURITY MODEL — accepted tradeoffs:
//   1. Stateless cookie. We sign `${expiry}.${hmac}` with HMAC-SHA256
//      using ADMIN_SESSION_SECRET. There is no server-side session store,
//      so logout cannot revoke a stolen cookie before expiry. We mitigate
//      this with a 24h TTL plus httpOnly, secure, and sameSite=lax cookies.
//      For a single-admin portfolio site this is an explicit, accepted
//      tradeoff. If this app grows into a higher-stakes surface, replace
//      this with a server-side session table and per-login nonces.
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'node:crypto'

export const ADMIN_COOKIE_NAME = 'bb_admin'

const TTL_SECONDS = 24 * 60 * 60
const HEX_DIGEST_LENGTH = 64

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET

  if (!secret || secret.length < 32) {
    throw new Error(
      'ADMIN_SESSION_SECRET env var missing or too short (min 32 chars)'
    )
  }

  return secret
}

function hmac(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

function isValidHexDigest(value: string): boolean {
  return value.length === HEX_DIGEST_LENGTH && /^[0-9a-f]+$/i.test(value)
}

function getCookieFromHeader(request: Request): string | undefined {
  const cookieHeader = request.headers.get('cookie') ?? ''
  let value: string | undefined

  for (const part of cookieHeader.split(';')) {
    const separatorIndex = part.indexOf('=')

    if (separatorIndex < 0) {
      continue
    }

    const key = part.slice(0, separatorIndex).trim()

    if (key !== ADMIN_COOKIE_NAME) {
      continue
    }

    const rawValue = part.slice(separatorIndex + 1).trim()

    try {
      value = decodeURIComponent(rawValue)
    } catch {
      value = undefined
    }
  }

  return value
}

export function signAdminCookie(): { value: string; maxAge: number } {
  const expiry = Math.floor(Date.now() / 1000) + TTL_SECONDS
  const payload = String(expiry)
  const signature = hmac(payload, getSecret())

  return {
    maxAge: TTL_SECONDS,
    value: `${payload}.${signature}`,
  }
}

export function verifyAdminCookie(cookieValue: string | undefined): boolean {
  if (!cookieValue) {
    return false
  }

  const separatorIndex = cookieValue.indexOf('.')

  if (separatorIndex < 0) {
    return false
  }

  const payload = cookieValue.slice(0, separatorIndex)
  const signature = cookieValue.slice(separatorIndex + 1)

  if (!isValidHexDigest(signature)) {
    return false
  }

  let expectedSignature: string

  try {
    expectedSignature = hmac(payload, getSecret())
  } catch {
    return false
  }

  const actualBuffer = Buffer.from(signature, 'hex')
  const expectedBuffer = Buffer.from(expectedSignature, 'hex')

  if (actualBuffer.length !== expectedBuffer.length) {
    return false
  }

  if (!timingSafeEqual(actualBuffer, expectedBuffer)) {
    return false
  }

  const expiry = Number(payload)

  if (!Number.isFinite(expiry)) {
    return false
  }

  return expiry >= Math.floor(Date.now() / 1000)
}

export function isAdminRequest(request: Request | NextRequest): boolean {
  const cookieJar = (request as NextRequest).cookies

  if (cookieJar && typeof cookieJar.get === 'function') {
    return verifyAdminCookie(cookieJar.get(ADMIN_COOKIE_NAME)?.value)
  }

  return verifyAdminCookie(getCookieFromHeader(request))
}

// Server Components (app/**/page.tsx without 'use client') have no request
// object; Next.js 16 exposes cookies via the async `cookies()` helper. This
// additive helper keeps the existing `isAdminRequest` path unchanged for
// Route Handlers.
export async function isAdminFromCookies(): Promise<boolean> {
  const store = await cookies()
  return verifyAdminCookie(store.get(ADMIN_COOKIE_NAME)?.value)
}
