import { useState } from "react";
import type { QueueItem } from "@/lib/files";
import { isHeic } from "@/lib/files";
import { describePhoto, loadCaptioner, tidyCaption } from "../api/caption";

/** Something the browser can decode: the processed output when ready, else the original (HEIC needs the output). */
const sourceFor = (it: QueueItem): Blob | null =>
  it.output && it.output.type.startsWith("image/") ? it.output : isHeic(it.file) ? null : it.file;

/** Captions each photo with the on-device model. Returns id → caption; photos it can't read are skipped. */
export function useAutopilot() {
  const [status, setStatus] = useState("");

  const run = async (images: QueueItem[]): Promise<Map<string, string>> => {
    setStatus("Starting the on-device model…");
    try {
      await loadCaptioner((f) => setStatus(`Downloading the on-device model (one time)… ${Math.round(f * 100)}%`));
      const out = new Map<string, string>();
      for (let i = 0; i < images.length; i++) {
        setStatus(`Describing photo ${i + 1} of ${images.length}…`);
        const src = sourceFor(images[i]);
        if (!src) continue;
        try {
          const text = tidyCaption(await describePhoto(src));
          if (text) out.set(images[i].id, text);
        } catch (err) {
          console.warn("[squished] couldn't describe photo:", err);
        }
      }
      return out;
    } finally {
      setStatus("");
    }
  };

  return { status, run };
}
