import { supabaseServer } from '../../lib/supabase-server'

const NO_STORE_JSON = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

type IncrementVisitRow = {
  today?: number | string
  total?: number | string
}

export async function GET() {
  const today = new Date().toISOString().slice(0, 10)

  const [dailyRes, totalRes] = await Promise.all([
    supabaseServer.from('visits_daily').select('count').eq('day', today).maybeSingle(),
    supabaseServer.from('visits_total').select('count').eq('id', 1).maybeSingle(),
  ])

  if (dailyRes.error || totalRes.error) {
    return new Response(JSON.stringify({ error: 'failed_to_fetch' }), {
      status: 500,
      headers: NO_STORE_JSON,
    })
  }

  return new Response(
    JSON.stringify({
      today: Number(dailyRes.data?.count ?? 0),
      total: Number(totalRes.data?.count ?? 0),
    }),
    {
      status: 200,
      headers: NO_STORE_JSON,
    },
  )
}

export async function POST() {
  const { data, error } = await supabaseServer.rpc('increment_visit')

  if (error || !data) {
    return new Response(JSON.stringify({ error: 'failed_to_increment' }), {
      status: 500,
      headers: NO_STORE_JSON,
    })
  }

  let row: IncrementVisitRow | null = null

  if (Array.isArray(data)) {
    row = data[0] as IncrementVisitRow | undefined ?? null
  } else if (typeof data === 'object') {
    row = data as IncrementVisitRow
  }

  if (row?.today == null || row.total == null) {
    return new Response(JSON.stringify({ error: 'failed_to_increment' }), {
      status: 500,
      headers: NO_STORE_JSON,
    })
  }

  return new Response(
    JSON.stringify({
      today: Number(row.today),
      total: Number(row.total),
    }),
    {
      status: 200,
      headers: NO_STORE_JSON,
    },
  )
}
