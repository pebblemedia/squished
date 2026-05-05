import { create } from "zustand";
import type { QueueItem, TargetFormat } from "@/lib/files";
import { detectKind } from "@/lib/files";
import { compressImage, makeThumbnail } from "@/lib/processors/image";
import { compressAudio } from "@/lib/processors/audio";
import { compressVideo } from "@/lib/processors/video";

interface QueueState {
  items: QueueItem[];
  addFiles: (files: FileList | File[]) => void;
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

  addFiles: (files) => {
    const list = Array.from(files);
    const newItems: QueueItem[] = list.map((file) => {
      const kind = detectKind(file);
      return {
        id: newId(),
        file,
        name: file.name,
        kind,
        originalSize: file.size,
        status: "queued",
        progress: 0,
        targetFormat: "original",
        quality: 0.75,
        bitrate: kind === "audio" ? 128 : undefined,
      };
    });
    set({ items: [...get().items, ...newItems] });

    // generate thumbnails async (images only)
    newItems.forEach(async (it) => {
      if (it.kind !== "image") return;
      const thumb = await makeThumbnail(it.file);
      set({
        items: get().items.map((x) => (x.id === it.id ? { ...x, thumbnail: thumb } : x)),
      });
    });

    // auto-process sequentially for audio (ffmpeg single instance), parallel-ish for images
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
        result = await compressImage(item, onProgress);
      } else if (item.kind === "audio") {
        result = await compressAudio(item, onProgress);
      } else if (item.kind === "video") {
        result = await compressVideo(item, onProgress);
      } else {
        throw new Error("Unsupported file type. Images, audio & video supported; PDFs coming soon.");
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
