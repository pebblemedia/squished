import { create } from "zustand";
import type { QueueItem, TargetFormat } from "@/lib/files";
import { isImage } from "@/lib/files";
import { compressImage, makeThumbnail } from "@/lib/processors/image";

interface QueueState {
  items: QueueItem[];
  addFiles: (files: FileList | File[]) => void;
  remove: (id: string) => void;
  clear: () => void;
  updateOptions: (id: string, patch: Partial<Pick<QueueItem, "targetFormat" | "quality">>) => void;
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
    const newItems: QueueItem[] = list.map((file) => ({
      id: newId(),
      file,
      name: file.name,
      originalSize: file.size,
      status: "queued",
      progress: 0,
      targetFormat: "original",
      quality: 0.75,
    }));
    set({ items: [...get().items, ...newItems] });

    // generate thumbnails async
    newItems.forEach(async (it) => {
      const thumb = await makeThumbnail(it.file);
      set({
        items: get().items.map((x) => (x.id === it.id ? { ...x, thumbnail: thumb } : x)),
      });
    });

    // auto-process
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
      if (!isImage(item.file)) {
        throw new Error("Only image files are supported in this version. PDF, audio & video coming soon.");
      }

      const { blob, name } = await compressImage(item, (p) => {
        set({
          items: get().items.map((x) => (x.id === id ? { ...x, progress: p } : x)),
        });
      });

      set({
        items: get().items.map((x) =>
          x.id === id
            ? {
                ...x,
                status: "done",
                progress: 100,
                output: blob,
                outputName: name,
                outputSize: blob.size,
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
