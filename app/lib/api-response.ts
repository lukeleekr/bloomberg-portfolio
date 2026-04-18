// Shared JSON response helpers for write-oriented route handlers.
// All POST/PATCH/DELETE handlers should use these to keep headers + error
// shape consistent.

export const NO_STORE_JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

export function jsonError(code: string, status: number, detail?: string) {
  const body = detail ? { error: code, detail } : { error: code }
  return new Response(JSON.stringify(body), {
    status,
    headers: NO_STORE_JSON_HEADERS,
  })
}

export function jsonOk(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: NO_STORE_JSON_HEADERS,
  })
}
