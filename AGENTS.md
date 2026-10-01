# Base44 Dev Environment — CalAdvoc (Law Firm Management System)

## What this is
A static HTML/CSS/JS web application (no build step) in the `Law Firm MS/` directory.
Optional Supabase integration for auth/data is configured in `Law Firm MS/supabase-config.js`
with credentials already committed (publishable/anon key — safe for browser use).

## How it runs
- Served by `nginx:alpine` via `docker-compose.base44.yml`.
- The `Law Firm MS/` directory is bind-mounted read-only into nginx's web root.
- No build step, no live-reload server needed — edits to HTML/CSS/JS are reflected
  immediately on the next request (just refresh the preview).
- Web entry point: host port 3000 → nginx port 80.

## Verification
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/index.html` → 200
- `docker compose -f docker-compose.base44.yml ps` → web service healthy

## Secrets
None required. Supabase URL and anon key are committed in `supabase-config.js`.
No external credentials are needed to boot or view the site.

## Management system (system.html)
The full management system lives in `system.html` + `system-data.js` (data layer),
`system-ui.js` (shell, case files, clients, court attendance, letterhead) and
`system-finance.js` (income, expenses, invoices, debtors, creditors, budget, reports).
- Auth: `ensureSystemSession()` in `system-data.js` reuses the Supabase session from
  `supabase-config.js`; account.html now redirects signed-in users to `system.html`.
- Storage: `Store` tries Supabase first (per-firm isolation via RLS on `user_id`) and
  automatically falls back to per-user localStorage when the tables don't exist yet.
  The mode probe runs once per page load (`Store.probe()` on `clients`).
- Server-side persistence of the new tables requires running
  `Law Firm MS/supabase-storage-setup.sql` in the user's Supabase SQL editor —
  the sandbox shell has no outbound internet, so table existence can't be verified here.
- File numbers: `OCA/<AREA-PREFIX>/<YEAR>/<SEQ>` from `PRACTICE_AREAS` (29 areas) in
  `system-data.js`. Invoice numbers `INV-####`, receipts `RCP-####` via `nextNumber()`.
- Letterhead exports (receipts, invoices, client update letters, reports) render into
  `#printArea` and use `window.print()`; letterhead details are saved per user in
  localStorage (`calAdvoc.letterhead.<userId>`).
- Colors: burgundy `#7B1A2E` + gold `#B8960C` on white, geometric gold strip accents.
