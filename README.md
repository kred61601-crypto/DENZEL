# REDTECH AI — Vercel website

This folder is the separate website deployment. It contains the existing public pages and a Vercel serverless API proxy. The proxy forwards `/api/*` requests to the separate bot server and relays session cookies, so browser code continues to call same-origin `/api/...` URLs.

## Deploy

1. Push this folder as the root of a separate GitHub repository, or set the Vercel project's Root Directory to `vercel-website` in the combined repository.
2. Import that repository into Vercel. Framework preset: **Other**. Build command: leave empty. Output directory: `public` (if Vercel asks for one).
3. In Vercel → Project → Settings → Environment Variables, add `BOT_API_URL` with the HTTPS public origin of the KataBump bot server, e.g. `https://your-server.example` (no `/api` suffix and no trailing slash).
4. Redeploy after setting the variable.
5. Open the Vercel URL. `/` and `/code` show the pairing page.

Do not put MongoDB URLs, session secrets, admin passcodes, WhatsApp credentials, or bot API secrets in Vercel's public environment variables. Only `BOT_API_URL` belongs here.
