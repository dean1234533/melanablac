import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { onRequest } from "../functions/api/[[path]].js";
import { verifyStripeSig } from "../functions/lib/util.js";

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

const SECRET = "whsec_test_secret";
function fixture({ stripe = true } = {}) {
  const { DB, sqlite } = database();
  sqlite.prepare("INSERT INTO products (slug,title,price_pence,category,images,stock) VALUES ('card-a','Card A',450,'Birthday Cards','[]',5)").run();
  const env = { DB, SITE_URL: "https://example.invalid", ADMIN_EMAIL: "owner@example.invalid", ...(stripe ? { STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: SECRET } : {}) };
  const stripeCalls = [];
  globalThis.fetch = async (url, init = {}) => {
    stripeCalls.push({ url: String(url), init });
    if (String(url).endsWith("/expire")) return Response.json({ id: "cs_1", status: "expired" });
    return Response.json({ id: "cs_1", url: "https://checkout.stripe.com/c/pay/cs_1" });
  };
  const call = (path, { method = "GET", body, headers = {}, raw } = {}) =>
    onRequest({
      request: new Request("https://example.invalid/api/" + path, { method, headers: { "content-type": "application/json", "cf-connecting-ip": "192.0.2.9", ...headers }, body: method === "GET" ? undefined : raw ?? JSON.stringify(body || {}) }),
      env,
      params: { path: path.split("/") },
    });
  const checkout = (qty = 2) => call("checkout", { method: "POST", body: { name: "Ada Test", email: "ada@example.invalid", address: { line1: "1 Road", city: "London", postcode: "E1 1AA" }, items: [{ id: 1, qty }] } });
  const event = (type, object, { t = Math.floor(Date.now() / 1000), secret = SECRET } = {}) => {
    const raw = JSON.stringify({ type, data: { object } });
    const v1 = crypto.createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
    return call("stripe-webhook", { method: "POST", raw, headers: { "stripe-signature": `t=${t},v1=${v1}` } });
  };
  const order = (n) => sqlite.prepare("SELECT * FROM orders WHERE number=?").get(n);
  const stock = () => sqlite.prepare("SELECT stock FROM products WHERE id=1").get().stock;
  return { env, sqlite, call, checkout, event, order, stock, stripeCalls };
}

test("checkout with Stripe holds stock and returns the hosted payment page", async () => {
  const f = fixture();
  const res = await f.checkout();
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.match(body.redirect, /^https:\/\/checkout\.stripe\.com\//);
  assert.equal(f.order(body.number).status, "awaiting_payment");
  assert.equal(f.order(body.number).stripe_session, "cs_1");
  assert.equal(f.stock(), 3);
  const sent = new URLSearchParams(f.stripeCalls[0].init.body);
  assert.equal(sent.get("line_items[0][price_data][unit_amount]"), "450");
  assert.equal(sent.get("line_items[0][quantity]"), "2");
  assert.equal(sent.get("line_items[1][price_data][unit_amount]"), "350"); // default UK delivery fee
  assert.equal(sent.get("line_items[1][price_data][product_data][name]"), "UK delivery");
  assert.equal(sent.get("client_reference_id"), body.number);
  assert.equal(sent.get("cancel_url"), `https://example.invalid/cart?cancelled=${body.number}`);
  assert.ok(Number(sent.get("expires_at")) > Date.now() / 1000 + 29 * 60);
  assert.ok(f.stripeCalls[0].init.headers["idempotency-key"]);
});

test("without Stripe keys the order is saved as new", async () => {
  const f = fixture({ stripe: false });
  const body = await (await f.checkout()).json();
  assert.equal(f.order(body.number).status, "new");
  assert.equal(body.redirect, undefined);
});

test("webhook rejects bad, missing and stale signatures", async () => {
  const f = fixture();
  assert.equal((await f.call("stripe-webhook", { method: "POST", body: {} })).status, 400);
  assert.equal((await f.event("checkout.session.completed", {}, { secret: "whsec_wrong" })).status, 400);
  assert.equal((await f.event("checkout.session.completed", {}, { t: Math.floor(Date.now() / 1000) - 3600 })).status, 400);
  assert.equal(await verifyStripeSig({ STRIPE_WEBHOOK_SECRET: SECRET }, "{}", "t=1,v1=00"), false);
});

test("a matching paid event marks the order paid once", async () => {
  const f = fixture();
  const { number } = await (await f.checkout()).json();
  const paid = { client_reference_id: number, payment_status: "paid", amount_total: 1250, currency: "gbp" };
  assert.equal((await f.event("checkout.session.completed", paid)).status, 200);
  assert.equal(f.order(number).status, "paid");
  assert.equal((await f.event("checkout.session.completed", paid)).status, 200); // Stripe retries are harmless
  assert.equal(f.order(number).status, "paid");
  assert.equal(f.stock(), 3);
});

test("a payment that does not match the order total is not accepted", async () => {
  const f = fixture();
  const { number } = await (await f.checkout()).json();
  await f.event("checkout.session.completed", { client_reference_id: number, payment_status: "paid", amount_total: 100, currency: "gbp" });
  assert.equal(f.order(number).status, "awaiting_payment");
  await f.event("checkout.session.completed", { client_reference_id: number, payment_status: "unpaid", amount_total: 1250, currency: "gbp" });
  assert.equal(f.order(number).status, "awaiting_payment");
});

test("an expired session cancels the order and returns the stock once", async () => {
  const f = fixture();
  const { number } = await (await f.checkout()).json();
  await f.event("checkout.session.expired", { client_reference_id: number });
  assert.equal(f.order(number).status, "cancelled");
  assert.equal(f.stock(), 5);
  await f.event("checkout.session.expired", { client_reference_id: number });
  assert.equal(f.stock(), 5);
});

test("backing out of Stripe expires the session and releases stock; a paid order is untouched", async () => {
  const f = fixture();
  const a = await (await f.checkout()).json();
  const res = await f.call(`order/${a.number}/cancel`, { method: "POST" });
  assert.equal((await res.json()).status, "cancelled");
  assert.ok(f.stripeCalls.some((c) => c.url.endsWith("/expire")));
  assert.equal(f.stock(), 5);
  const b = await (await f.checkout(1)).json();
  await f.event("checkout.session.completed", { client_reference_id: b.number, payment_status: "paid", amount_total: 800, currency: "gbp" });
  const again = await (await f.call(`order/${b.number}/cancel`, { method: "POST" })).json();
  assert.equal(again.status, "paid");
  assert.equal(f.stock(), 4);
});

test("delivery fee is editable, can be free over a threshold, and never restocks as a product", async () => {
  const f = fixture();
  f.sqlite.prepare("INSERT INTO content (key,value) VALUES ('shop.deliveryFee','5.00'),('shop.freeDeliveryOver','8')").run();
  const small = await (await f.checkout(1)).json(); // £4.50 < £8: pays £5 delivery
  assert.equal(f.order(small.number).total_pence, 950);
  const big = await (await f.checkout(2)).json(); // £9.00 >= £8: free
  assert.equal(f.order(big.number).total_pence, 900);
  assert.equal(JSON.parse(f.order(big.number).items).some((i) => i.title === "UK delivery"), false);
  f.sqlite.prepare("DELETE FROM content").run();
  f.sqlite.prepare("INSERT INTO content (key,value) VALUES ('shop.deliveryFee','0')").run();
  const free = await (await f.checkout(1)).json();
  assert.equal(f.order(free.number).total_pence, 450);
  const stockBefore = f.stock();
  await f.call(`order/${small.number}/cancel`, { method: "POST" });
  assert.equal(f.stock(), stockBefore + 1); // only the card returns to stock
});
