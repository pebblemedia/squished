// Main-thread side: sends one image at a time to the worker and builds the
// replacement File. Any failure resolves to null so the original uploads untouched.
import { outputName } from "./file-name.js";

const HANDLED = /^image\/(jpeg|png|webp)$/;
const TIMEOUT_MS = 120000;
let worker = null;
let nextId = 0;
const pending = new Map();
let queue = Promise.resolve();

function config() {
  return window.squishedConfig || null;
}

function failAll(message) {
  pending.forEach((resolve) => resolve({ error: message }));
  pending.clear();
  if (worker) worker.terminate();
  worker = null;
}

function createWorker(url) {
  try {
    return new Worker(url);
  } catch (e) {
    // Plugin assets on another origin (e.g. a CDN): start the worker from a same-origin blob.
    const src = `importScripts(${JSON.stringify(url)});`;
    return new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
  }
}

function getWorker(cfg) {
  if (!worker) {
    worker = createWorker(cfg.workerUrl);
    worker.onmessage = (e) => {
      const resolve = pending.get(e.data.id);
      pending.delete(e.data.id);
      if (resolve) resolve(e.data);
    };
    worker.onerror = (e) => failAll(e.message || "Worker failed");
  }
  return worker;
}

function run(cfg, file) {
  return new Promise((resolve) => {
    const id = ++nextId;
    const timer = setTimeout(() => failAll("Timed out"), TIMEOUT_MS);
    pending.set(id, (r) => {
      clearTimeout(timer);
      resolve(r);
    });
    getWorker(cfg).postMessage({
      id,
      blob: file,
      type: file.type,
      maxSide: cfg.maxSide,
      format: cfg.format,
      quality: cfg.quality,
      keepGps: cfg.keepGps,
      wasmUrl: cfg.wasmUrl,
    });
  });
}

/** True when Squished should try this file. */
export function handles(file) {
  const cfg = config();
  return !!(cfg && file && HANDLED.test(file.type || "") && typeof Worker !== "undefined");
}

/**
 * Compresses one image. Resolves to { file, saved } with a smaller replacement,
 * or null to upload the original as-is.
 */
export function squish(file) {
  const cfg = config();
  if (!handles(file)) return Promise.resolve(null);
  const job = queue.then(async () => {
    try {
      const r = await run(cfg, file);
      if (r.error || r.skip || !r.buffer || r.buffer.byteLength >= file.size) return null;
      const name = outputName(file.name, r.type, cfg.seoNames);
      const out = new File([r.buffer], name, { type: r.type, lastModified: file.lastModified || Date.now() });
      return { file: out, saved: file.size - out.size, width: r.width, height: r.height };
    } catch (e) {
      return null;
    }
  });
  queue = job;
  return job;
}
