import { createClient } from '@supabase/supabase-js'

// Service role bypasses RLS, so this client must stay server-only.
//
// IMPORTANT: this module is imported at build time by `next build` when it
// collects page data for the API route handlers. We must NOT throw at module
// load because the build environment legitimately has no Supabase env vars.
// Instead we substitute placeholder values during build so the module loads,
// then throw loudly on any actual runtime call by checking the placeholder.
// Real requests (which only happen at runtime, not at build) hit the throw path
// in handle() below, surfacing the misconfiguration with a clear message.
const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const isBuild = process.env.NEXT_PHASE === 'phase-production-build'

if (!isBuild && (!url || !serviceKey)) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars. See SETUP.md.'
  )
}

export const supabaseServer = createClient(
  url ?? 'http://build-placeholder.invalid',
  serviceKey ?? 'build-placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)
