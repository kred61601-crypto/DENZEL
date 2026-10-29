/**
 * REDTECH AI website -> private bot-server API proxy.
 * Set BOT_API_URL in Vercel to the public HTTPS origin of the KataBump bot server.
 * Browser requests stay same-origin (Vercel), so the bot server's session cookie
 * is safely relayed without exposing the bot API URL in frontend JavaScript.
 */

module.exports.config = { api: { bodyParser: false } };

async function readBody(req) {
  if (["GET", "HEAD"].includes(req.method || "GET")) return undefined;
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

module.exports = async function handler(req, res) {
  const configured = String(process.env.BOT_API_URL || "").trim().replace(/\/+$/, "");
  if (!configured) return res.status(503).json({ error: "Bot server is not configured. Set BOT_API_URL in Vercel." });

  let base;
  try { base = new URL(configured); }
  catch { return res.status(500).json({ error: "BOT_API_URL must be a valid HTTPS URL." }); }
  if (base.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(base.hostname)) {
    return res.status(500).json({ error: "BOT_API_URL must use HTTPS." });
  }

  const incomingUrl = new URL(req.url || "/api", "https://vercel.local");
  const target = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, `${base.origin}/`);
  const headers = new Headers();
  for (const name of ["accept", "content-type", "cookie", "user-agent", "x-forwarded-for", "x-request-id"]) {
    const value = req.headers[name];
    if (typeof value === "string") headers.set(name, value);
  }
  headers.set("x-forwarded-host", req.headers["x-forwarded-host"] || req.headers.host || "");
  headers.set("x-forwarded-proto", "https");

  try {
    const body = await readBody(req);
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(55000),
    });

    const passHeaders = ["content-type", "cache-control", "content-disposition", "location", "retry-after"];
    for (const name of passHeaders) {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    }
    const cookies = typeof upstream.headers.getSetCookie === "function"
      ? upstream.headers.getSetCookie()
      : (upstream.headers.get("set-cookie") ? [upstream.headers.get("set-cookie")] : []);
    if (cookies.length) res.setHeader("set-cookie", cookies);
    res.setHeader("cache-control", "no-store, no-cache, must-revalidate");
    res.status(upstream.status);
    if (req.method === "HEAD" || upstream.status === 204 || upstream.status === 304) return res.end();
    const payload = Buffer.from(await upstream.arrayBuffer());
    return res.send(payload);
  } catch (error) {
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    return res.status(timedOut ? 504 : 502).json({
      error: timedOut ? "Bot server request timed out. Check that the bot server is awake." : `Could not reach the bot server: ${error.message}`,
    });
  }
}
