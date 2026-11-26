import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { base64ToBytes, bytesToBase64 } from "../src/lib/base64.js";
import { deriveFilename, nameFromContentDisposition, resolveMime } from "../src/lib/filename.js";
import { chunkCount, sendFile } from "../src/background/transfer.js";
import { fetchResource, TooBigError } from "../src/background/fetch-resource.js";
import { FIT_CHOICES, fitForMenu, linkUrlPatterns, menuItems } from "../src/background/menus.js";
import { validateManifest } from "./validate-manifest.mjs";

const dist = new URL("../dist/", import.meta.url);
const FIVE_MB = 5 * 1024 * 1024;

test("base64 round trip of a 5 MB buffer (native and fallback paths)", () => {
  const bytes = new Uint8Array(randomBytes(FIVE_MB));
  const b64 = bytesToBase64(bytes);
  assert.equal(b64, Buffer.from(bytes).toString("base64"));
  assert.deepEqual(base64ToBytes(b64), bytes);

  const saved = [Uint8Array.prototype.toBase64, Uint8Array.fromBase64];
  delete Uint8Array.prototype.toBase64;
  delete Uint8Array.fromBase64;
  try {
    const fallback = bytesToBase64(bytes);
    assert.equal(fallback, b64);
    assert.deepEqual(base64ToBytes(fallback), bytes);
  } finally {
    if (saved[0]) Uint8Array.prototype.toBase64 = saved[0];
    if (saved[1]) Uint8Array.fromBase64 = saved[1];
  }
});

test("chunked transfer reassembles 5 MB exactly and stays JSON-safe", async () => {
  const bytes = new Uint8Array(randomBytes(FIVE_MB + 7));
  const sent = [];
  const send = async (msg) => {
    sent.push(JSON.parse(JSON.stringify(msg)));
    return { ok: true };
  };
  await sendFile(send, { bytes, name: "a.png", mime: "image/png", fit: { type: "size", bytes: 102400 } }, 1024 * 1024);
  assert.equal(sent[0].type, "squished:file-begin");
  assert.equal(sent[0].chunks, 6);
  const chunks = sent.filter((m) => m.type === "squished:file-chunk");
  assert.equal(chunks.length, 6);
  const joined = Buffer.concat(chunks.map((c) => base64ToBytes(c.data)));
  assert.deepEqual(new Uint8Array(joined), bytes);
  assert.deepEqual(sent.at(-1).fit, { type: "size", bytes: 102400 });
  assert.equal(chunkCount(32 * 1024 * 1024), 1);
  assert.equal(chunkCount(32 * 1024 * 1024 + 1), 2);
  assert.equal(chunkCount(0), 1);
});

test("filename derivation", () => {
  const cases = [
    [{ url: "https://x.com/photos/cat.jpg", mime: "image/jpeg" }, "cat.jpg"],
    [{ url: "https://x.com/photos/My%20Cat.PNG?w=200", mime: "image/png" }, "My Cat.PNG"],
    [{ url: "https://x.com/img/12345", mime: "image/webp" }, "12345.webp"],
    [{ url: "https://x.com/", mime: "image/png" }, "image.png"],
    [{ url: "data:image/gif;base64,R0lGOD", mime: "image/gif" }, "image.gif"],
    [{ url: "https://x.com/render.php?id=4", mime: "image/jpeg" }, "render.jpg"],
    [{ url: "https://cdn.x.com/a/photo.jpg", mime: "image/webp" }, "photo.webp"],
    [{ url: "https://x.com/dl?id=9", contentDisposition: 'attachment; filename="report final.pdf"', mime: "application/pdf" }, "report final.pdf"],
    [{ url: "https://x.com/dl", contentDisposition: "attachment; filename*=UTF-8''%E2%82%AC%20rates.pdf; filename=\"rates.pdf\"", mime: "application/pdf" }, "€ rates.pdf"],
    [{ url: "https://x.com/dl", contentDisposition: "inline; filename=song.mp3", mime: "audio/mpeg" }, "song.mp3"],
    [{ url: "https://x.com/a/..%2F..%2Fetc%2Fpasswd", mime: "image/png" }, "_.._etc_passwd.png"],
    [{ url: "https://x.com/clip", mime: "video/mp4" }, "clip.mp4"],
    [{ url: "https://x.com/", mime: "application/pdf" }, "file.pdf"],
    [{ url: "https://x.com/v1.2", mime: "image/png" }, "v1.2.png"],
  ];
  for (const [input, expected] of cases) assert.equal(deriveFilename(input), expected, JSON.stringify(input));
  assert.equal(nameFromContentDisposition('attachment; filename="a \\"b\\".png"'), 'a "b".png');
  assert.equal(resolveMime("application/octet-stream", "https://x.com/a.avif"), "image/avif");
  assert.equal(resolveMime("image/PNG; charset=binary", "https://x.com/a"), "image/png");
  assert.equal(resolveMime("", "https://x.com/a"), "application/octet-stream");
});

test("fetchResource enforces the 200 MB cap and names the file", async () => {
  const headers = (h) => new Headers(h);
  const big = async () => new Response(new Uint8Array(4), { headers: headers({ "content-length": "300000000" }) });
  await assert.rejects(fetchResource("https://x.com/a.jpg", { fetchImpl: big }), TooBigError);

  const stream = async () => new Response(new Uint8Array(2048), { headers: headers({ "content-type": "image/png" }) });
  await assert.rejects(fetchResource("https://x.com/a.png", { fetchImpl: stream, max: 1024 }), TooBigError);

  const ok = async () =>
    new Response(new Uint8Array([1, 2, 3]), {
      headers: headers({ "content-type": "image/jpeg", "content-disposition": 'inline; filename="hero.jpg"' }),
    });
  const file = await fetchResource("https://x.com/i/9", { fetchImpl: ok });
  assert.deepEqual([file.name, file.mime, [...file.bytes]], ["hero.jpg", "image/jpeg", [1, 2, 3]]);

  const missing = async () => new Response("", { status: 404 });
  await assert.rejects(fetchResource("https://x.com/a.png", { fetchImpl: missing }), /404/);
});

test("menus: ids, fit payloads and link patterns", () => {
  const items = menuItems();
  const ids = items.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(items.filter((i) => i.parentId === "fit").length === 6);
  for (const choice of FIT_CHOICES) {
    const fit = fitForMenu(choice.id);
    if (fit.type === "size") assert.ok(Number.isInteger(fit.bytes) && fit.bytes > 0);
    else assert.match(fit.slug, /^[a-z0-9-]{1,60}$/);
  }
  assert.deepEqual(fitForMenu("fit-discord"), { type: "dest", slug: "discord" });
  assert.deepEqual(fitForMenu("fit-100kb"), { type: "size", bytes: 102400 });
  assert.equal(fitForMenu("squish-image"), undefined);
  for (const p of linkUrlPatterns()) assert.match(p, /^\*:\/\/\*\/\*\.[a-zA-Z0-9]+(\?\*)?$/);
});

test("built manifests pass MV3 checks", async () => {
  const prod = JSON.parse(await readFile(new URL("manifest.json", dist), "utf8"));
  assert.deepEqual(validateManifest(prod, { distUrl: dist }), []);
  assert.ok(!JSON.stringify(prod).includes("localhost"));
  assert.ok(!prod.host_permissions.includes("<all_urls>"));
});

function loadContentScript() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://squished.app/", runScripts: "outside-only" });
  const { window } = dom;
  const posted = [];
  window.postMessage = (data, targetOrigin) => {
    posted.push({ data, targetOrigin });
    // jsdom leaves event.source null; browsers set it to the posting window.
    setTimeout(() => window.dispatchEvent(new window.MessageEvent("message", { data, origin: window.location.origin, source: window })));
  };
  const listeners = [];
  const toWorker = [];
  window.chrome = {
    runtime: {
      onMessage: { addListener: (fn) => listeners.push(fn) },
      sendMessage: async (msg) => toWorker.push(JSON.parse(JSON.stringify(msg))),
    },
  };
  const deliver = (msg) => new Promise((resolve) => listeners.forEach((fn) => fn(JSON.parse(JSON.stringify(msg)), {}, (r) => resolve(JSON.parse(JSON.stringify(r))))));
  return { window, posted, toWorker, deliver };
}

const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

test("content script: ping handshake, File rebuild and exact postMessage payload", async () => {
  const { window, posted, toWorker, deliver } = loadContentScript();
  const page = [];
  window.addEventListener("message", (e) => {
    const d = e.data;
    if (d?.source !== "squished-extension") return;
    page.push(d);
    if (d.type === "ping") window.postMessage({ source: "squished-page", type: "ready" }, window.location.origin);
    if (d.type === "add-files") window.postMessage({ source: "squished-page", type: "files-added", count: d.files.length }, window.location.origin);
  });
  const script = await readFile(new URL("content-script.js", dist), "utf8");
  window.eval(script);
  window.eval(script);

  assert.deepEqual(await deliver({ type: "squished:ping" }), { ready: false });
  await tick(50);
  assert.deepEqual(await deliver({ type: "squished:ping" }), { ready: true });
  assert.equal(page.filter((m) => m.type === "ping").length, 1, "double injection must not double-ping");

  const bytes = new Uint8Array(randomBytes(300_000));
  const fit = { type: "dest", slug: "etsy" };
  await sendFile(deliver, { bytes, name: "cat.webp", mime: "image/webp", fit }, 100_000);
  await tick(50);

  const add = posted.find((p) => p.data.type === "add-files");
  assert.equal(add.targetOrigin, "https://squished.app");
  assert.deepEqual(Object.keys(add.data).sort(), ["files", "fit", "source", "type"]);
  assert.equal(add.data.source, "squished-extension");
  assert.deepEqual(add.data.fit, fit);
  assert.ok(Array.isArray(add.data.files) && add.data.files.length === 1);
  const [file] = add.data.files;
  assert.ok(file instanceof window.File);
  assert.deepEqual([file.name, file.type, file.size], ["cat.webp", "image/webp", bytes.length]);
  const roundTrip = new Uint8Array(await file.arrayBuffer());
  assert.deepEqual(Buffer.from(roundTrip), Buffer.from(bytes));
  assert.deepEqual(toWorker, [{ type: "squished:files-added", count: 1 }]);

  await sendFile(deliver, { bytes: new Uint8Array([9]), name: "x.png", mime: "image/png" });
  const plain = posted.filter((p) => p.data.type === "add-files").at(-1).data;
  assert.ok(!("fit" in plain));

  const bad = await deliver({ type: "squished:file-end", id: "nope" });
  assert.equal(bad.ok, false);
  await tick(400);
  window.close();
});
