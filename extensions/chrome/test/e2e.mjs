import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import puppeteer from "puppeteer";
import sharp from "sharp";

const extPath = fileURLToPath(new URL("../dist-test/", import.meta.url));
const MENU_IDS = ["squish-image", "fit", "fit-100kb", "fit-500kb", "fit-1mb", "fit-gmail", "fit-discord", "fit-etsy", "squish-link"];

const png = await sharp({ create: { width: 640, height: 480, channels: 3, background: "#f6fc7a" } }).png().toBuffer();
const big = randomBytes(40 * 1024 * 1024);
const sha = (b) => createHash("sha256").update(b).digest("hex");

const server = createServer((req, res) => {
  // Without a granted host permission the worker's credentialed fetch is CORS-checked.
  const headers = { "access-control-allow-origin": req.headers.origin || "*", "access-control-allow-credentials": "true", "access-control-expose-headers": "content-disposition" };
  if (req.url === "/photos/cat.png") res.writeHead(200, { ...headers, "content-type": "image/png" }).end(png);
  else if (req.url.startsWith("/download")) res.writeHead(200, { ...headers, "content-type": "image/jpeg", "content-disposition": 'attachment; filename="huge photo.jpg"' }).end(big);
  else res.writeHead(404).end();
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const FAKE_PAGE = `<!doctype html><title>fake squished</title><script>
  window.__received = [];
  const reply = (m) => window.postMessage({ source: "squished-page", ...m }, location.origin);
  window.addEventListener("message", async (e) => {
    const d = e.data;
    if (e.source !== window || e.origin !== location.origin || d?.source !== "squished-extension") return;
    if (d.type === "ping") reply({ type: "ready" });
    if (d.type === "add-files") {
      const files = [];
      for (const f of d.files) {
        const digest = await crypto.subtle.digest("SHA-256", await f.arrayBuffer());
        files.push({ isFile: f instanceof File, name: f.name, type: f.type, size: f.size,
          sha: [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("") });
      }
      window.__received.push({ keys: Object.keys(d).sort(), fit: d.fit ?? null, files });
      reply({ type: "files-added", count: d.files.length });
    }
  });
</script>`;

const results = [];
const check = async (label, fn) => {
  await fn();
  results.push(label);
  console.log(`ok - ${label}`);
};

const browser = await puppeteer.launch({
  headless: true,
  args: [`--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`],
});

try {
  const swTarget = await browser.waitForTarget((t) => t.type() === "service_worker" && t.url().endsWith("/service-worker.js"), { timeout: 15000 });
  const worker = await swTarget.worker();
  await check(`service worker registered (${swTarget.url()})`, async () => {
    assert.match(swTarget.url(), /^chrome-extension:\/\/[a-p]{32}\/service-worker\.js$/);
  });

  await check("all context menu items exist", async () => {
    const outcome = await worker.evaluate(async (ids) => {
      const found = [];
      for (let i = 0; i < 50 && found.length < ids.length; i++) {
        found.length = 0;
        for (const id of ids) {
          try {
            await chrome.contextMenus.update(id, {});
            found.push(id);
          } catch {}
        }
        if (found.length < ids.length) await new Promise((r) => setTimeout(r, 100));
      }
      let bogus = "accepted";
      try {
        await chrome.contextMenus.update("does-not-exist", {});
      } catch {
        bogus = "rejected";
      }
      return { found, bogus };
    }, MENU_IDS);
    assert.deepEqual(outcome.found, MENU_IDS);
    assert.equal(outcome.bogus, "rejected");
  });

  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on("request", (req) =>
    req.url().startsWith("https://squished.app/") ? req.respond({ status: 200, contentType: "text/html", body: FAKE_PAGE }) : req.continue(),
  );
  await page.goto("https://squished.app/");
  const tabsBefore = (await browser.pages()).length;

  await check("image + size fit arrives as a File with the exact protocol", async () => {
    await worker.evaluate((url) => __squishedTest.deliver(url, { type: "size", bytes: 102400 }), `${base}/photos/cat.png`);
    await page.waitForFunction(() => window.__received.length === 1, { timeout: 20000 });
    const [msg] = await page.evaluate(() => window.__received);
    assert.deepEqual(msg.keys, ["files", "fit", "source", "type"]);
    assert.deepEqual(msg.fit, { type: "size", bytes: 102400 });
    assert.deepEqual(msg.files, [{ isFile: true, name: "cat.png", type: "image/png", size: png.length, sha: sha(png) }]);
  });

  await check("40 MB download is chunked, reassembled byte-exact, named from Content-Disposition", async () => {
    await worker.evaluate((url) => __squishedTest.deliver(url, { type: "dest", slug: "gmail" }), `${base}/download?id=7`);
    await page.waitForFunction(() => window.__received.length === 2, { timeout: 60000 });
    const msg = (await page.evaluate(() => window.__received))[1];
    assert.deepEqual(msg.fit, { type: "dest", slug: "gmail" });
    assert.deepEqual(msg.files, [{ isFile: true, name: "huge photo.jpg", type: "image/jpeg", size: big.length, sha: sha(big) }]);
  });

  await check("existing squished.app tab was reused and badge cleared after files-added", async () => {
    assert.equal((await browser.pages()).length, tabsBefore);
    let badge = "x";
    for (let i = 0; i < 20 && badge !== ""; i++) {
      badge = await worker.evaluate(() => chrome.action.getBadgeText({}));
      if (badge) await new Promise((r) => setTimeout(r, 100));
    }
    assert.equal(badge, "");
  });
} finally {
  await browser.close();
  server.close();
}
console.log(`\n${results.length} e2e checks passed`);
