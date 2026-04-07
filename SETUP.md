# Guestbook + Visits Setup

This project now expects a real Supabase project plus four environment variables.
The flow below is the shortest path to get the guestbook and visit counter ready
for local development and Vercel deployment.

## Warnings

- `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security. Never commit it.
- Never expose the service-role key to the browser or client-side code.
- The admin cookie is stateless and expires after 24 hours. Logout clears the
  browser cookie, but it cannot revoke a stolen cookie before expiry.

## 1. Create a Supabase Project

1. Go to `https://app.supabase.com`.
2. Create a new project on the free tier.
3. Wait for provisioning to finish before continuing.

## 2. Get Credentials

Open `Project Settings -> API` and copy:

- `Project URL`
- `service_role` key

Use the `service_role` key only on the server. It bypasses RLS and should never
be committed or exposed in browser code.

## 3. Run the Migration

1. Open `SQL Editor`.
2. Create a new query.
3. Paste the contents of `supabase/migrations/0001_init.sql`.
4. Run the query.

## 4. Verify the Tables Exist

Open `Table Editor` and confirm:

- `comments` exists
- `visits_daily` exists
- `visits_total` exists
- `visits_total` contains one row with `id = 1` and `count = 0`

## 5. Generate Local Secrets

Run:

```bash
openssl rand -base64 32   # ADMIN_PASSWORD
openssl rand -hex 32      # ADMIN_SESSION_SECRET
```

`ADMIN_SESSION_SECRET` must be at least 32 characters long.

## 6. Create `.env.local`

Copy the example file and fill in real values:

```bash
cp .env.local.example .env.local
```

Required variables:

```bash
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-real-service-role-key
ADMIN_PASSWORD=your-generated-password
ADMIN_SESSION_SECRET=your-generated-secret
```

## 7. Add Env Vars to Vercel

Either use the Vercel dashboard or the CLI:

```bash
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add ADMIN_PASSWORD production
vercel env add ADMIN_SESSION_SECRET production
```

Dashboard path: `Vercel project -> Settings -> Environment Variables`.

## 8. Local Development

Install dependencies and run the app:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

Once Wave 2 and Wave 3 route handlers are in place, the guestbook should work
end-to-end against your live Supabase project.

## 9. Admin Login

Wave 3 adds the admin login UI.

Use the `[ADMIN]` link inside the Contact Directory card, enter
`ADMIN_PASSWORD`, and confirm that `● ADMIN MODE` appears and delete buttons
show on every comment.

## Verification Matrix

After completing steps 1 through 8, use these commands to verify the wiring.

```bash
# Local dev server
npm run dev   # then in another terminal:

# 1. Visits API — increment + read
curl -s -X POST http://localhost:3000/api/visits | jq
# expected: {"today": 1, "total": 1}
curl -s http://localhost:3000/api/visits | jq
# expected: {"today": 1, "total": 1} (no change — GET does not increment)

# 2. Comments API — list (empty), create, list (with one)
curl -s http://localhost:3000/api/guestbook | jq
# expected: {"comments": []}
curl -s -X POST http://localhost:3000/api/guestbook \
  -H 'Content-Type: application/json' \
  -d '{"name":"test","message":"hello"}' | jq
# expected: {"comment": {"id":"...", "name":"test", "message":"hello", ...}}
curl -s http://localhost:3000/api/guestbook | jq
# expected: comments array with the new entry

# 3. Admin auth — wrong then right
curl -s -X POST http://localhost:3000/api/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"password":"wrong"}'
# expected: 401 {"error":"invalid_password"}, takes >= 200ms
curl -s -c /tmp/bb_cookie.txt -X POST http://localhost:3000/api/admin/login \
  -H 'Content-Type: application/json' \
  -d "{\"password\":\"$ADMIN_PASSWORD\"}"
# expected: 200 {"ok": true}, sets bb_admin cookie
curl -s -b /tmp/bb_cookie.txt http://localhost:3000/api/admin/me
# expected: {"isAdmin": true}

# 4. Admin delete (use a real comment id from step 2)
COMMENT_ID="<id-from-step-2>"
curl -s -b /tmp/bb_cookie.txt -X DELETE "http://localhost:3000/api/guestbook/${COMMENT_ID}"
# expected: {"ok": true}
curl -s -X DELETE "http://localhost:3000/api/guestbook/${COMMENT_ID}"
# expected: 401 {"error":"unauthorized"} (no cookie)

# 5. SQL — verify increment_visit() is locked down
psql "$SUPABASE_CONN_STRING" -c "select has_function_privilege('anon', 'public.increment_visit()', 'execute');"
# expected: f
```

## Known Limitations / Future Work

- No rate limiting exists yet for `POST /api/guestbook` or `POST /api/admin/login`.
  The planned 250ms artificial delay on login only partially mitigates brute-force
  attempts. For higher traffic, add an Edge Middleware limiter or a Supabase-side
  rate-limit table.
- The admin cookie cannot be revoked before its 24-hour TTL expires. See
  `app/lib/admin-session.ts` for the tradeoff.
- There is no profanity filter or captcha. If spam appears, use the admin
  moderation flow and consider adding a hidden honeypot field later.
