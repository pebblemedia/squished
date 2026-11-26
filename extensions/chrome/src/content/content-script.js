import { base64ToBytes } from "../lib/base64.js";

const PING_INTERVAL_MS = 300;
const PING_TIMEOUT_MS = 15000;
const ACK_TIMEOUT_MS = 30000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function start() {
  const origin = window.location.origin;
  const incoming = new Map();
  const awaitingAck = [];
  let pageReady = false;
  let pinging = false;

  const post = (msg) => window.postMessage({ source: "squished-extension", ...msg }, origin);
  const tellWorker = (msg) => chrome.runtime.sendMessage(msg).catch(() => {});

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== origin) return;
    const data = event.data;
    if (!data || data.source !== "squished-page") return;
    if (data.type === "ready") pageReady = true;
    if (data.type === "files-added") {
      const waiting = awaitingAck.shift();
      if (waiting) clearTimeout(waiting);
      tellWorker({ type: "squished:files-added", count: data.count });
    }
  });

  async function pingPage() {
    if (pageReady || pinging) return;
    pinging = true;
    const deadline = Date.now() + PING_TIMEOUT_MS;
    while (!pageReady && Date.now() < deadline) {
      post({ type: "ping" });
      await sleep(PING_INTERVAL_MS);
    }
    pinging = false;
  }

  function addFiles(files, fit) {
    post({ type: "add-files", files, ...(fit ? { fit } : {}) });
    const timer = setTimeout(() => {
      const i = awaitingAck.indexOf(timer);
      if (i !== -1) awaitingAck.splice(i, 1);
      tellWorker({ type: "squished:files-added", count: 0 });
    }, ACK_TIMEOUT_MS);
    awaitingAck.push(timer);
  }

  function finish(msg) {
    const entry = incoming.get(msg.id);
    incoming.delete(msg.id);
    if (!entry) return { ok: false, error: "Unknown transfer" };
    if (entry.parts.some((p) => !p)) return { ok: false, error: "Transfer incomplete" };
    const file = new File(entry.parts, entry.name, { type: entry.mime });
    if (file.size !== entry.size) return { ok: false, error: "Size mismatch" };
    addFiles([file], msg.fit);
    return { ok: true };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    switch (msg?.type) {
      case "squished:ping":
        if (!pageReady) pingPage();
        sendResponse({ ready: pageReady });
        break;
      case "squished:file-begin":
        incoming.set(msg.id, { name: msg.name, mime: msg.mime, size: msg.size, parts: Array.from({ length: msg.chunks }) });
        sendResponse({ ok: true });
        break;
      case "squished:file-chunk": {
        const entry = incoming.get(msg.id);
        if (entry) entry.parts[msg.index] = base64ToBytes(msg.data);
        sendResponse({ ok: Boolean(entry) });
        break;
      }
      case "squished:file-end":
        sendResponse(finish(msg));
        break;
    }
  });

  pingPage();
}

if (!globalThis.__squishedContentScript) {
  globalThis.__squishedContentScript = true;
  start();
}
