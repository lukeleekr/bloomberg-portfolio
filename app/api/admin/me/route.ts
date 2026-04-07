import type { NextRequest } from 'next/server'

import { isAdminRequest } from '../../../lib/admin-session'

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

export async function GET(request: NextRequest) {
  return new Response(JSON.stringify({ isAdmin: isAdminRequest(request) }), {
    status: 200,
    headers: JSON_HEADERS,
  })
}
