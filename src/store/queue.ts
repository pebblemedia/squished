import { create } from "zustand";
import type { QueueItem, TargetFormat } from "@/lib/files";
import { detectKind } from "@/lib/files";
import { photoDetailsPatch } from "@/lib/seo-fields";
import type { FitChoice } from "@/lib/fit";
import { fitFieldsFor } from "@/lib/fit";

// Processors touch browser-only APIs (canvas, pdfjs worker, ffmpeg.wasm).
// Import them lazily so SSG/SSR renders don't try to evaluate that code.
const loadImage = () => import("@/lib/processors/image");
const loadAudio = () => import("@/lib/processors/audio");
const loadVideo = () => import("@/lib/processors/video");
const loadPdf = () => import("@/lib/processors/pdf");

interface QueueState {
  items: QueueItem[];
  addFiles: (files: FileList | File[], defaults?: { targetFormat?: TargetFormat; fit?: FitChoice }) => void;
  remove: (id: string) => void;
  clear: () => void;
  updateOptions: (
    id: string,
    patch: Partial<Pick<QueueItem, "targetFormat" | "quality" | "bitrate" | "customName" | "meta" | "savedSeoId" | "savedSeoOwner" | "savedSeoRevision" | FitField>>
  ) => void;
  savePhotoDetails: (id: string, fields: unknown) => void;
  process: (id: string) => Promise<void>;
  processAll: () => Promise<void>;
  applyToAll: (
    patch: Partial<Pick<QueueItem, "targetFormat" | "quality" | "bitrate">> & { fit?: FitChoice }
  ) => void;
}

type FitField = "targetBytes" | "maxWidth" | "maxHeight" | "fitLabel";

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export const useQueue = create<QueueState>((set, get) => ({
  items: [],

  addFiles: (files, defaults) => {
    const list = Array.from(files);
    const newItems: QueueItem[] = list.map((file) => {
      const kind = detectKind(file);
      let targetFormat: TargetFormat = defaults?.targetFormat ?? "original";
      if (kind === "pdf" && !defaults?.targetFormat) targetFormat = "pdf";
      return {
        id: newId(),
        file,
        name: file.name,
        kind,
        originalSize: file.size,
        status: "queued",
        progress: 0,
        targetFormat,
        quality: 0.75,
        bitrate: kind === "audio" ? 128 : undefined,
        ...(defaults?.fit ? fitFieldsFor(defaults.fit, kind) : {}),
      };
    });
    set({ items: [...get().items, ...newItems] });

    newItems.forEach(async (it) => {
      if (it.kind !== "image") return;
      const { makeThumbnail } = await loadImage();
      const thumb = await makeThumbnail(it.file);
      set({
        items: get().items.map((x) => (x.id === it.id ? { ...x, thumbnail: thumb } : x)),
      });
    });

    newItems.forEach((it) => void get().process(it.id));
  },

  remove: (id) => {
    set({ items: get().items.filter((x) => x.id !== id) });
  },

  clear: () => set({ items: [] }),

  updateOptions: (id, patch) => {
    set({
      items: get().items.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    });
  },

  savePhotoDetails: (id, fields) => {
    const item = get().items.find((x) => x.id === id);
    if (!item) throw new Error("The file is not in the current view.");
    if (item.kind !== "image") throw new Error("Photo SEO fields are available for images only.");
    const patch = photoDetailsPatch(item.name, item.meta, fields);
    get().updateOptions(id, patch);
  },

  process: async (id) => {
    const item = get().items.find((x) => x.id === id);
    if (!item) return;

    set({
      items: get().items.map((x) =>
        x.id === id ? { ...x, status: "processing", progress: 0, error: undefined } : x
      ),
    });

    try {
      const onProgress = (p: number) => {
        set({
          items: get().items.map((x) => (x.id === id ? { ...x, progress: p } : x)),
        });
      };

      let result: { blob: Blob; name: string };
      if (item.kind === "image") {
        const mod = await loadImage();
        if (item.targetFormat === "pdf") {
          const pdfMod = await loadPdf();
          result = await pdfMod.imageToPdf(item, onProgress);
        } else {
          result = await mod.compressImage(item, onProgress);
        }
      } else if (item.kind === "audio") {
        const mod = await loadAudio();
        result = await mod.compressAudio(item, onProgress);
      } else if (item.kind === "video") {
        const mod = await loadVideo();
        result = await mod.compressVideo(item, onProgress);
      } else if (item.kind === "pdf") {
        const mod = await loadPdf();
        if (item.targetFormat === "pdf-to-jpg") {
          result = await mod.pdfToImages(item, "jpg", onProgress);
        } else if (item.targetFormat === "pdf-to-png") {
          result = await mod.pdfToImages(item, "png", onProgress);
        } else {
          result = await mod.compressPdf(item, onProgress);
        }
      } else {
        throw new Error("Unsupported file type.");
      }

      set({
        items: get().items.map((x) =>
          x.id === id
            ? {
                ...x,
                status: "done",
                progress: 100,
                output: result.blob,
                outputName: result.name,
                outputSize: result.blob.size,
              }
            : x
        ),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to process file";
      set({
        items: get().items.map((x) =>
          x.id === id ? { ...x, status: "error", error: message } : x
        ),
      });
    }
  },

  processAll: async () => {
    const ids = get().items.map((x) => x.id);
    for (const id of ids) {
      const it = get().items.find((x) => x.id === id);
      if (it && it.status !== "done" && it.status !== "processing") {
        await get().process(id);
      }
    }
  },

  applyToAll: ({ fit, ...patch }) => {
    set({
      items: get().items.map((x) => {
        // Only apply a targetFormat that the item's kind actually supports.
        let targetFormat = x.targetFormat;
        if (patch.targetFormat) {
          const f = patch.targetFormat;
          const ok =
            (x.kind === "image" && ["original", "jpeg", "png", "webp", "avif", "strip", "pdf"].includes(f)) ||
            (x.kind === "audio" && ["original", "mp3", "m4a", "ogg", "wav"].includes(f)) ||
            (x.kind === "video" && ["original", "mp4", "webm"].includes(f)) ||
            (x.kind === "pdf" && ["pdf", "pdf-to-jpg", "pdf-to-png"].includes(f));
          if (ok) targetFormat = f;
        }
        return {
          ...x,
          ...patch,
          ...(fit ? fitFieldsFor(fit, x.kind) : {}),
          targetFormat,
        };
      }),
    });
    for (const it of get().items) {
      void get().process(it.id);
    }
  },
}));
