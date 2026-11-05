import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { onRequest } from "../functions/api/[[path]].js";
import { onRequest as middleware } from "../functions/_middleware.js";
import {
  hashPassword,
  sha256,
  randomToken,
  ADMIN_SESSION_SECONDS,
} from "../functions/lib/util.js";
import { consumeAuthLimit } from "../functions/lib/adminAuth.js";

function database() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(
    fs.readFileSync(new URL("../schema.sql", import.meta.url), "utf8"),
  );
  class Statement {
    constructor(sql, values = []) {
      this.sql = sql;
      this.values = values;
    }
    bind(...values) {
      return new Statement(this.sql, values);
    }
    async first() {
      return sqlite.prepare(this.sql).get(...this.values) || null;
    }
    async all() {
      return { results: sqlite.prepare(this.sql).all(...this.values) };
    }
    async run() {
      const r = sqlite.prepare(this.sql).run(...this.values);
      return {
        success: true,
        meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) },
      };
    }
  }
  const DB = {
    prepare: (sql) => new Statement(sql),
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
  return { DB, sqlite };
}
const email = "owner@example.invalid";
const password = "A-local-test-password!";
async function fixture() {
  const { DB, sqlite } = database();
  const { hash, salt } = await hashPassword(password);
  sqlite
    .prepare("INSERT INTO admins (email,password_hash,salt) VALUES (?,?,?)")
    .run(email, hash, salt);
  const env = { DB, ADMIN_EMAIL: email, SITE_URL: "https://example.invalid" };
  const call = (
    path,
    {
      method = "GET",
      body,
      cookie,
      origin = "https://example.invalid",
      ip = "192.0.2.1",
      header = true,
    } = {},
  ) => {
    const headers = {
      "content-type": "application/json",
      origin,
      "cf-connecting-ip": ip,
    };
    if (header) headers["x-requested-with"] = "mb";
    if (cookie) headers.cookie = cookie;
    return onRequest({
      request: new Request("https://example.invalid/api/" + path, {
        method,
        headers,
        body: method === "GET" ? undefined : JSON.stringify(body || {}),
      }),
      env,
      params: { path: path.split("/") },
    });
  };
  const login = async () => {
    const res = await call("admin/login", {
      method: "POST",
      body: { email, password },
    });
    assert.equal(res.status, 200);
    return res.headers.get("set-cookie").split(";")[0];
  };
  return { DB, sqlite, env, call, login };
}

test("every private admin endpoint rejects unauthenticated access", async () => {
  const f = await fixture();
  for (const path of [
    "me",
    "stats",
    "products",
    "orders",
    "messages",
    "slides",
    "content",
    "notifications",
    "push/key",
  ]) {
    assert.equal((await f.call("admin/" + path)).status, 401, path);
  }
  for (const [path, method] of [
    ["products", "POST"],
    ["products/1", "DELETE"],
    ["content", "PUT"],
    ["password", "POST"],
  ]) {
    assert.equal((await f.call("admin/" + path, { method })).status, 401, path);
  }
  f.sqlite.close();
});
test("password login sets a secure eight-hour session; logout revokes it", async () => {
  const f = await fixture();
  const bad = await f.call("admin/login", {
    method: "POST",
    body: { email, password: "wrong" },
  });
  assert.equal(bad.status, 401);
  const res = await f.call("admin/login", {
    method: "POST",
    body: { email, password },
  });
  const header = res.headers.get("set-cookie");
  for (const flag of ["HttpOnly", "Secure", "SameSite=Strict", "Max-Age=28800"])
    assert.ok(header.includes(flag));
  const cookie = header.split(";")[0];
  assert.equal((await f.call("admin/me", { cookie })).status, 200);
  const session = f.sqlite.prepare("SELECT * FROM sessions").get();
  assert.ok(
    Math.abs(session.expires - Date.now() - ADMIN_SESSION_SECONDS * 1000) <
      2000,
  );
  await f.call("admin/logout", { method: "POST", cookie });
  assert.equal((await f.call("admin/me", { cookie })).status, 401);
  f.sqlite.close();
});
test("failed sign-ins are persistently limited by account and IP", async () => {
  const f = await fixture();
  for (let i = 0; i < 10; i++)
    assert.equal(
      (
        await f.call("admin/login", {
          method: "POST",
          body: { email, password: "wrong" },
          ip: "192.0.2." + (i + 1),
        })
      ).status,
      401,
    );
  assert.equal(
    (
      await f.call("admin/login", {
        method: "POST",
        body: { email, password },
        ip: "192.0.2.99",
      })
    ).status,
    429,
  );
  for (let i = 0; i < 20; i++)
    assert.equal(
      (
        await f.call("admin/login", {
          method: "POST",
          body: { email: `n${i}@example.invalid`, password: "wrong" },
          ip: "192.0.2.200",
        })
      ).status,
      401,
    );
  const blocked = await f.call("admin/login", {
    method: "POST",
    body: { email: "other@example.invalid", password },
    ip: "192.0.2.200",
  });
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get("retry-after")) > 0);
  assert.ok(
    !JSON.stringify(
      f.sqlite.prepare("SELECT key FROM auth_rate_limits").all(),
    ).includes(email),
  );
  f.sqlite.close();
});
test("rate-limit window expires and simultaneous attempts do not lose counts", async () => {
  const f = await fixture();
  const results = await Promise.all(
    Array.from({ length: 12 }, () =>
      consumeAuthLimit(f.env, "concurrent", 10, 1000),
    ),
  );
  assert.equal(results.filter(Boolean).length, 2);
  assert.equal(
    await consumeAuthLimit(f.env, "concurrent", 10, 1000 + 15 * 60000),
    null,
  );
  f.sqlite.close();
});
test("admin mutations reject cross-origin and missing custom header requests", async () => {
  const f = await fixture();
  for (const options of [
    { origin: "https://attacker.invalid" },
    { header: false },
  ])
    assert.equal(
      (
        await f.call("admin/login", {
          method: "POST",
          body: { email, password },
          ...options,
        })
      ).status,
      403,
    );
  f.sqlite.close();
});
test("password change revokes every session and outstanding reset token", async () => {
  const f = await fixture();
  const first = await f.login();
  const second = await f.login();
  f.sqlite
    .prepare("INSERT INTO reset_tokens VALUES (?,?,?,0)")
    .run(await sha256("old-reset"), 1, Date.now() + 3600000);
  const res = await f.call("admin/password", {
    method: "POST",
    cookie: first,
    body: { current: password, next: "A-new-local-password!" },
  });
  assert.equal(res.status, 200);
  assert.ok(res.headers.get("set-cookie").includes("Max-Age=0"));
  assert.equal((await f.call("admin/me", { cookie: first })).status, 401);
  assert.equal((await f.call("admin/me", { cookie: second })).status, 401);
  assert.equal(f.sqlite.prepare("SELECT used FROM reset_tokens").get().used, 1);
  f.sqlite.close();
});
test("reset tokens are single-use; production never returns a reset URL", async () => {
  const f = await fixture();
  const token = randomToken();
  f.sqlite
    .prepare("INSERT INTO reset_tokens VALUES (?,?,?,0)")
    .run(await sha256(token), 1, Date.now() + 3600000);
  const cookie = await f.login();
  const options = {
    method: "POST",
    body: { token, password: "A-new-reset-password!" },
  };
  assert.equal((await f.call("admin/reset", options)).status, 200);
  assert.equal((await f.call("admin/reset", options)).status, 400);
  assert.equal((await f.call("admin/me", { cookie })).status, 401);
  const forgot = await f.call("admin/forgot", {
    method: "POST",
    body: { email },
  });
  assert.equal((await forgot.json()).devLink, undefined);
  f.sqlite.close();
});
test("HTML dashboard navigation is gated and authenticated HTML is never cached", async () => {
  const f = await fixture();
  const next = async () =>
    new Response("<html></html>", { headers: { "content-type": "text/html" } });
  const request = new Request("https://example.invalid/admin/products");
  const redirect = await middleware({ request, env: f.env, next });
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get("location"), "/admin/login");
  globalThis.HTMLRewriter = class {
    on() {
      return this;
    }
    transform(response) {
      return response;
    }
  };
  const cookie = await f.login();
  const response = await middleware({
    request: new Request(request, { headers: { cookie } }),
    env: f.env,
    next,
  });
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.match(response.headers.get("x-robots-tag"), /noindex/);
  const signin = await middleware({
    request: new Request("https://example.invalid/admin/login"),
    env: f.env,
    next,
  });
  assert.equal(signin.status, 200);
  f.sqlite.close();
});

test("expired and malformed sessions cannot read protected data", async () => {
  const f = await fixture();
  const cookie = await f.login();
  f.sqlite.prepare("UPDATE sessions SET expires=?").run(Date.now() - 1000);
  assert.equal((await f.call("admin/stats", { cookie })).status, 401);
  assert.equal(
    (await f.call("admin/stats", { cookie: "mb_session=invalid" })).status,
    401,
  );
  f.sqlite.close();
});
test("security migration preserves catalogue and passwords while revoking old sessions", async () => {
  const f = await fixture();
  await f.login();
  f.sqlite
    .prepare("INSERT INTO products (slug,title,price_pence) VALUES (?,?,?)")
    .run("retained", "Retained artwork", 450);
  const before = f.sqlite
    .prepare("SELECT password_hash FROM admins")
    .get().password_hash;
  f.sqlite.exec(
    fs.readFileSync(
      new URL("../migrations/0001_admin_auth.sql", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM products").get().n, 1);
  assert.equal(
    f.sqlite.prepare("SELECT password_hash FROM admins").get().password_hash,
    before,
  );
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM sessions").get().n, 0);
  f.sqlite.close();
});

test('simple admin username authenticates the existing owner account', async () => {
  const f=await fixture();
  const response=await f.call('admin/login',{method:'POST',body:{username:'admin',password}});
  assert.equal(response.status,200);
  assert.equal((await response.json()).email,email);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM admins').get().n,1);
  f.sqlite.close();
});
test('username alias and email share the same sign-in rate limit', async () => {
  const f=await fixture();
  for(let i=0;i<10;i++) assert.equal((await f.call('admin/login',{method:'POST',body:{username:i%2?'admin':email,password:'wrong'}})).status,401);
  assert.equal((await f.call('admin/login',{method:'POST',body:{username:'admin',password}})).status,429);
  f.sqlite.close();
});
