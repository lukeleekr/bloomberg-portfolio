import { supabaseServer } from '../../lib/supabase-server'

const NO_STORE_JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

export async function GET() {
  const { data, error } = await supabaseServer
    .from('comments')
    .select('id, name, message, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return Response.json({ error: 'failed_to_fetch' }, { status: 500 })
  }

  return new Response(JSON.stringify({ comments: data ?? [] }), {
    status: 200,
    headers: NO_STORE_JSON_HEADERS,
  })
}

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null) {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const name = typeof b.name === 'string' ? b.name.trim() : ''
  const message = typeof b.message === 'string' ? b.message.trim() : ''
  const client_id =
    typeof b.client_id === 'string' ? b.client_id.slice(0, 64) : null

  if (name.length < 1 || name.length > 40) {
    return Response.json(
      { error: 'invalid_name', detail: 'name must be 1-40 chars' },
      { status: 400 },
    )
  }

  if (message.length < 1 || message.length > 500) {
    return Response.json(
      { error: 'invalid_message', detail: 'message must be 1-500 chars' },
      { status: 400 },
    )
  }

  const { data, error } = await supabaseServer
    .from('comments')
    .insert({ name, message, client_id })
    .select('id, name, message, created_at')
    .single()

  if (error || !data) {
    return Response.json({ error: 'failed_to_insert' }, { status: 500 })
  }

  return Response.json({ comment: data }, { status: 201 })
}
