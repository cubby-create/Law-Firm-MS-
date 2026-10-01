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
