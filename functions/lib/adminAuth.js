import { json, sha256 } from "./util.js";

// Fixed windows are persisted in D1 so attempts cannot bypass the limit by
// reaching a different Worker isolate. UPSERT + RETURNING increments atomically.
export async function consumeAuthLimit(env, key, maximum, now = Date.now()) {
  const expires = now + 15 * 60 * 1000;
  const row = await env.DB.prepare(
    `
    INSERT INTO auth_rate_limits (key, attempts, expires) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET
      attempts = CASE WHEN auth_rate_limits.expires <= ? THEN 1 ELSE auth_rate_limits.attempts + 1 END,
      expires = CASE WHEN auth_rate_limits.expires <= ? THEN excluded.expires ELSE auth_rate_limits.expires END
    RETURNING attempts, expires
  `,
  )
    .bind(await sha256(key), expires, now, now)
    .first();
  if (row.attempts <= maximum) return null;
  return json(
    { error: "Too many attempts. Please try again in 15 minutes." },
    429,
    {
      "retry-after": String(Math.max(1, Math.ceil((row.expires - now) / 1000))),
    },
  );
}

export function validAdminRequest(request) {
  const origin = request.headers.get("origin");
  return (
    request.headers.get("x-requested-with") === "mb" &&
    (!origin || origin === new URL(request.url).origin)
  );
}
