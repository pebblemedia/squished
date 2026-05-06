import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist";
// @ts-expect-error - vite ?url import
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import JSZip from "jszip";
import type { QueueItem } from "../files";
import { replaceExt } from "../files";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

async function renderPdfPages(
  file: File,
  scale: number,
  onProgress: (p: number) => void
): Promise<{ blob: Blob; width: number; height: number }[]> {
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages: { blob: Blob; width: number; height: number }[] = [];
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
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.85)
    );
    pages.push({ blob, width: canvas.width, height: canvas.height });
    onProgress((i / doc.numPages) * 80);
  }
  await doc.destroy();
  return pages;
}

/** Compress a PDF by rasterising each page to a JPEG and rebuilding the PDF. */
export async function compressPdf(
  item: QueueItem,
  onProgress: (p: number) => void
): Promise<{ blob: Blob; name: string }> {
  // quality 0..1 → DPI scale (lower quality = lower DPI + lower JPEG quality)
  const q = item.quality;
  const scale = 0.9 + q * 1.6; // ~0.9 .. 2.5
  const jpegQ = 0.4 + q * 0.5; // 0.4 .. 0.9

  const buf = await item.file.arrayBuffer();
  const srcDoc = await pdfjs.getDocument({ data: buf.slice(0) }).promise;

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
    // Use original page size in points so visual size matches
    const orig = page.getViewport({ scale: 1 });
    const pdfPage = out.addPage([orig.width, orig.height]);
    pdfPage.drawImage(img, { x: 0, y: 0, width: orig.width, height: orig.height });
    onProgress((i / srcDoc.numPages) * 95);
  }
  await srcDoc.destroy();
  const bytes = await out.save();
  onProgress(100);
  return {
    blob: new Blob([bytes as BlobPart], { type: "application/pdf" }),
    name: replaceExt(item.name, "pdf"),
  };
}

/** Convert a PDF to a ZIP of images (jpg or png). */
export async function pdfToImages(
  item: QueueItem,
  format: "jpg" | "png",
  onProgress: (p: number) => void
): Promise<{ blob: Blob; name: string }> {
  const scale = 1.5 + item.quality * 1.5;
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
