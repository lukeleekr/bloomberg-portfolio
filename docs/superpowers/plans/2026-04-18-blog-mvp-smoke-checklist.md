# Blog MVP Smoke-Test Walkthrough

Date: 2026-04-18
Scope: Task 19 from `docs/superpowers/plans/2026-04-18-blog-mvp-plan.md`

## Execution Context

- `npm run build`: passed in this repo state
- `npm run lint`: passed with the same 3 pre-existing warnings documented in the plan
- Live walkthrough: deferred in this task context
- Reason: task wrapper explicitly says `DOCUMENT ONLY (do not run live; no Supabase env)`

## Manual Checklist Status

- [ ] Create a draft and confirm `[DRAFT]` admin-only visibility
- [ ] Flip draft to private and confirm `[PRIVATE]` admin-only visibility
- [ ] Flip private to public and confirm public visibility plus `published_at`
- [ ] Flip public to private to public and confirm `published_at` is unchanged
- [ ] Create a new post with initial `public` status and confirm `published_at` on insert
- [ ] Edit body and confirm persistence plus `updated_at`
- [ ] Change status only and confirm `updated_at`
- [ ] Delete a post and confirm removal from the list
- [ ] Open a draft URL in incognito and confirm 404
- [ ] Create a Korean title and confirm ASCII slug plus correct rendering
- [ ] Paste `<script>alert(1)</script>` and confirm it does not execute
- [ ] Paste `<iframe>` or `<object>` and confirm it is stripped
- [ ] Paste a `data:` image markdown URL and confirm it is stripped
- [ ] Refresh with unsaved edits and confirm `beforeunload` warning
- [ ] Save and confirm no `beforeunload` warning during redirect
- [ ] Paste a public post URL into an OG-resolving messenger and confirm preview
- [ ] Open `/blog/new` on mobile/narrow width and confirm stacked single-scroll editor at device width
- [ ] Force a slug collision and confirm inline red hint plus working `REGENERATE`
- [ ] Expire the admin cookie and confirm homepage amber `admin_expired` banner, URL cleanup, and auto-hide
- [ ] Cancel delete once, then confirm successful delete on second attempt

## Notes

- This file records the required walkthrough steps without claiming live execution.
- Production rollout still requires the SPEC §5.7 checklist after Supabase migration and deploy.
