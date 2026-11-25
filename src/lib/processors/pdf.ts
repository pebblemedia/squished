import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import JSZip from "jszip";
import type { QueueItem } from "../files";
import { replaceExt } from "../files";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;



/** Rasterise every page to JPEG and rebuild the PDF. `q` drives render scale + JPEG quality. */
async function rasterizePdf(
  originalBytes: Uint8Array,
  q: number,
  onProgress: (p: number) => void
): Promise<Uint8Array> {
  const scale = Math.max(0.4, 0.7 + q * 1.4); // 0.7 .. 2.1 DPI scale (lower in fit mode)
  const jpegQ = Math.max(0.2, 0.35 + q * 0.5); // 0.35 .. 0.85
  const srcDoc = await pdfjs.getDocument({ data: originalBytes.slice(0) }).promise;
  const out = await PDFDocument.create();
  for (let i = 1; i <= srcDoc.numPages; i++) {
    const page = await srcDoc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas } as unknown as Parameters<typeof page.render>[0]).promise;
    const jpgBlob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/jpeg", jpegQ)
    );
    const jpgBytes = new Uint8Array(await jpgBlob.arrayBuffer());
    const img = await out.embedJpg(jpgBytes);
    const orig = page.getViewport({ scale: 1 });
    const pdfPage = out.addPage([orig.width, orig.height]);
    pdfPage.drawImage(img, { x: 0, y: 0, width: orig.width, height: orig.height });
    onProgress(i / srcDoc.numPages);
  }
  await srcDoc.destroy();
  return out.save({ useObjectStreams: true });
}

/** Compress a PDF by rasterising each page to a JPEG and rebuilding the PDF.
 *  Tries multiple strategies and returns the smallest. If nothing beats the
 *  original, returns the original bytes untouched. In "fit" mode, searches for
 *  the sharpest version under the size limit. */
export async function compressPdf(
  item: QueueItem,
  onProgress: (p: number) => void
): Promise<{ blob: Blob; name: string }> {
  const originalBytes = new Uint8Array(await item.file.arrayBuffer());
  const originalSize = originalBytes.byteLength;
  const done = (bytes: Uint8Array) => {
    onProgress(100);
    return {
      blob: new Blob([bytes as BlobPart], { type: "application/pdf" }),
      name: replaceExt(item.name, "pdf"),
    };
  };

  // Strategy A: pdf-lib resave with object streams (lossless, helps vector PDFs)
  let bestBytes: Uint8Array = originalBytes;
  let bestSize = originalSize;
  try {
    const reloaded = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
    const resaved = await reloaded.save({ useObjectStreams: true });
    if (resaved.byteLength < bestSize) {
      bestBytes = resaved;
      bestSize = resaved.byteLength;
    }
  } catch {
    /* ignore */
  }
  onProgress(15);

  const limit = item.targetBytes;
  if (limit) {
    // Lossless already fits? Keep text selectable and sharp.
    if (bestSize <= limit) return done(bestBytes);
    let lo = -0.2;
    let hi = 1;
    let best: Uint8Array | undefined;
    const steps = 5;
    for (let i = 0; i < steps; i++) {
      const q = i === 0 ? lo : (lo + hi) / 2;
      const base = 15 + (i / steps) * 80;
      const bytes = await rasterizePdf(originalBytes, q, (f) => onProgress(base + (f * 80) / steps));
      if (bytes.byteLength <= limit) { best = bytes; lo = q; } else if (i === 0) { break; } else { hi = q; }
    }
    if (best) return done(best);
    throw new Error("Couldn't get this PDF under the size limit. Try a bigger limit or fewer pages.");
  }

  // Strategy B: rasterize pages to JPEG. Only worthwhile when there's enough
  // image content to compress. Quality controls render scale + JPEG quality.
  try {
    const rasterized = await rasterizePdf(originalBytes, item.quality, (f) => onProgress(15 + f * 80));
    if (rasterized.byteLength < bestSize) {
      bestBytes = rasterized;
      bestSize = rasterized.byteLength;
    }
  } catch {
    /* ignore */
  }

  return done(bestBytes);
}

/** Convert a PDF to a ZIP of images (jpg or png). */
export async function pdfToImages(
  item: QueueItem,
  format: "jpg" | "png",
  onProgress: (p: number) => void
): Promise<{ blob: Blob; name: string }> {
  const scale = 1.0 + item.quality * 1.5; // 1.0× .. 2.5×
  const buf = await item.file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const zip = new JSZip();
  const baseName = item.name.replace(/\.pdf$/i, "");
  const mime = format === "png" ? "image/png" : "image/jpeg";
  const ext = format === "png" ? "png" : "jpg";
  const q = format === "png" ? undefined : 0.5 + item.quality * 0.45;

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas } as unknown as Parameters<typeof page.render>[0]).promise;
    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b!), mime, q)
    );
    const padded = String(i).padStart(String(doc.numPages).length, "0");
    zip.file(`${baseName}-${padded}.${ext}`, blob);
    onProgress((i / doc.numPages) * 90);
  }
  await doc.destroy();
  const out = await zip.generateAsync({ type: "blob" });
  onProgress(100);
  return { blob: out, name: `${baseName}-${format}.zip` };
}

/** Convert a single image (JPG/PNG/WebP) to a one-page PDF. */
export async function imageToPdf(
  item: QueueItem,
  onProgress: (p: number) => void
): Promise<{ blob: Blob; name: string }> {
  onProgress(10);
  const bytes = new Uint8Array(await item.file.arrayBuffer());
  const doc = await PDFDocument.create();
  const type = item.file.type.toLowerCase();

  let img;
  if (type.includes("png")) {
    img = await doc.embedPng(bytes);
  } else if (type.includes("jpeg") || type.includes("jpg")) {
    img = await doc.embedJpg(bytes);
  } else {
    // Re-encode to JPEG via canvas (e.g. WebP)
    const url = URL.createObjectURL(item.file);
    const el = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = el.naturalWidth;
    canvas.height = el.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(el, 0, 0);
    URL.revokeObjectURL(url);
    const jpgBlob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.92)
    );
    img = await doc.embedJpg(new Uint8Array(await jpgBlob.arrayBuffer()));
  }

  onProgress(70);
  const page = doc.addPage([img.width, img.height]);
  page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  const out = await doc.save();
  onProgress(100);
  return {
    blob: new Blob([out as BlobPart], { type: "application/pdf" }),
    name: replaceExt(item.name, "pdf"),
  };
}
