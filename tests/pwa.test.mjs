import { test } from "node:test";
import assert from "node:assert/strict";
import { preparePush, enablePush, disablePush } from "../src/admin/push.js";

function browser(t, { permission = "granted", configured = true, registrationFails = false, subscribeFails = false } = {}) {
  const calls = [];
  let subscribed = null;
  const sub = { endpoint: "https://push.example.test/device", toJSON: () => ({ endpoint: sub.endpoint, keys: {} }), unsubscribe: async () => { calls.push("unsubscribe"); subscribed = null; return true; } };
  const registration = {
    active: {},
    pushManager: {
      getSubscription: async () => subscribed,
      subscribe: async (options) => { calls.push({ subscribe: options }); subscribed = sub; return sub; },
    },
  };
  const notifications = { permission: "default", requestPermission: () => { calls.push("permission"); return Promise.resolve(permission); } };
  const values = {
    window: Object.assign(new EventTarget(), { Notification: notifications, PushManager: class {} }),
    Notification: notifications,
    navigator: { serviceWorker: {
      register: async (url, opts) => { calls.push({ register: url, scope: opts.scope }); if (registrationFails) throw Error("registration failed"); return registration; },
      getRegistration: async () => registration,
    } },
    fetch: async (url, opts = {}) => {
      calls.push({ url, opts });
      if (url.endsWith("/key")) return Response.json({ key: configured ? "AQID" : null });
      if (subscribeFails && url.endsWith("/subscribe")) return Response.json({ error: "Could not save device" }, { status: 500 });
      return Response.json({ ok: true });
    },
  };
  for (const [name, value] of Object.entries(values)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    t.after(() => descriptor ? Object.defineProperty(globalThis, name, descriptor) : delete globalThis[name]);
  }
  return { calls, registration, sub };
}

test("preparing push registers the admin worker and loads its key without requesting permission", async (t) => {
  const { calls, registration } = browser(t);
  const ready = await preparePush();
  assert.equal(ready.registration, registration);
  assert.deepEqual(calls.find((c) => c.register), { register: "/admin/sw.js", scope: "/admin/" });
  assert(!calls.includes("permission"));
});
test("enable requests permission synchronously from the click, then saves the device subscription", async (t) => {
  const { calls, sub } = browser(t);
  const ready = await preparePush();
  calls.length = 0;
  const enabling = enablePush(ready);
  assert.equal(calls[0], "permission");
  assert.equal(await enabling, sub);
  assert.equal(calls.find((c) => c.subscribe).subscribe.userVisibleOnly, true);
  const save = calls.find((c) => c.url?.endsWith("/subscribe"));
  assert.equal(save.opts.headers["x-requested-with"], "mb");
  assert.equal(JSON.parse(save.opts.body).endpoint, sub.endpoint);
});
test("denied permission does not subscribe the device", async (t) => {
  const { calls } = browser(t, { permission: "denied" });
  await assert.rejects(enablePush(await preparePush()), /blocked/);
  assert(!calls.some((c) => c.subscribe));
});
test("failed server registration rolls back a newly created device subscription", async (t) => {
  const { calls } = browser(t, { subscribeFails: true });
  await assert.rejects(enablePush(await preparePush()), /Could not save device/);
  assert(calls.includes("unsubscribe"));
});
test("missing configuration and failed service workers return useful errors", async (t) => {
  browser(t, { configured: false });
  await assert.rejects(preparePush(), /not configured/);
});
test("a failed service worker does not leave notification setup waiting forever", async (t) => {
  browser(t, { registrationFails: true });
  await assert.rejects(preparePush(), /could not start/);
});
test("turning off push removes the server record and unsubscribes this device", async (t) => {
  const { calls } = browser(t);
  await enablePush(await preparePush());
  calls.length = 0;
  await disablePush();
  assert(calls.find((c) => c.url?.endsWith("/unsubscribe")));
  assert(calls.includes("unsubscribe"));
});
