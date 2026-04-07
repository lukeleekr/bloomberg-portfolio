import type { NextRequest } from 'next/server'

import { isAdminRequest } from '../../../lib/admin-session'
import { supabaseServer } from '../../../lib/supabase-server'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await context.params

  if (!id || typeof id !== 'string' || id.length > 64) {
    return Response.json({ error: 'invalid_id' }, { status: 400 })
  }

  const { error } = await supabaseServer.from('comments').delete().eq('id', id)

  if (error) {
    return Response.json({ error: 'failed_to_delete' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
