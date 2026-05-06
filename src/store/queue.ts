import { create } from "zustand";
import type { QueueItem, TargetFormat } from "@/lib/files";
import { detectKind } from "@/lib/files";

// Processors touch browser-only APIs (canvas, pdfjs worker, ffmpeg.wasm).
// Import them lazily so SSG/SSR renders don't try to evaluate that code.
const loadImage = () => import("@/lib/processors/image");
const loadAudio = () => import("@/lib/processors/audio");
const loadVideo = () => import("@/lib/processors/video");
const loadPdf = () => import("@/lib/processors/pdf");

interface QueueState {
  items: QueueItem[];
  addFiles: (files: FileList | File[], defaults?: { targetFormat?: TargetFormat }) => void;
  remove: (id: string) => void;
  clear: () => void;
  updateOptions: (
    id: string,
    patch: Partial<Pick<QueueItem, "targetFormat" | "quality" | "bitrate">>
  ) => void;
  process: (id: string) => Promise<void>;
  processAll: () => Promise<void>;
}

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
        if (item.targetFormat === "pdf") {
          result = await imageToPdf(item, onProgress);
        } else {
          result = await compressImage(item, onProgress);
        }
      } else if (item.kind === "audio") {
        result = await compressAudio(item, onProgress);
      } else if (item.kind === "video") {
        result = await compressVideo(item, onProgress);
      } else if (item.kind === "pdf") {
        if (item.targetFormat === "pdf-to-jpg") {
          result = await pdfToImages(item, "jpg", onProgress);
        } else if (item.targetFormat === "pdf-to-png") {
          result = await pdfToImages(item, "png", onProgress);
        } else {
          result = await compressPdf(item, onProgress);
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
}));
