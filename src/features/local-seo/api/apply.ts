import type { QueueItem } from "@/lib/files";
import { isHeic } from "@/lib/files";
import type { SeoPatch } from "@/lib/seo-fields";
import { useQueue } from "@/store/queue";

/** Whether this image's download will be a JPEG (the only format photo details are embedded into). */
export function writesJpeg(item: QueueItem): boolean {
  const jpegIn = item.file.type === "image/jpeg" || /\.jpe?g$/i.test(item.name);
  switch (item.targetFormat) {
    case "jpeg": return true;
    case "original":
    case "strip": return jpegIn || isHeic(item.file);
    default: return false;
  }
}

/** Writes SEO fields onto queue images (validated by the shared photo-details schema); optionally re-saves them as JPEG. */
export function applySeo(patches: { id: string; fields: SeoPatch }[], toJpeg: boolean): number {
  const { savePhotoDetails, updateOptions, process, items } = useQueue.getState();
  let applied = 0;
  for (const { id, fields } of patches) {
    const item = items.find((x) => x.id === id);
    if (!item || item.kind !== "image") continue;
    savePhotoDetails(id, fields);
    applied++;
    if (toJpeg && !writesJpeg(item)) {
      updateOptions(id, { targetFormat: "jpeg" });
      void process(id);
    }
  }
  return applied;
}
