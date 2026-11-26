import { useEffect } from "react";
import type { FitChoice } from "@/lib/fit";
import { takeSharedFiles } from "../api/shared-files";

type AddFiles = (files: File[], defaults?: { fit?: FitChoice }) => void;

interface LaunchParams { files: { getFile(): Promise<File> }[] }
type WithLaunchQueue = Window & { launchQueue?: { setConsumer(cb: (p: LaunchParams) => void): void } };

const MAX_FILES = 200;

function validFit(fit: unknown): FitChoice | undefined {
  if (!fit || typeof fit !== "object") return undefined;
  const f = fit as Record<string, unknown>;
  if (f.type === "size" && typeof f.bytes === "number" && f.bytes > 0) return { type: "size", bytes: Math.round(f.bytes) };
  if (f.type === "dest" && typeof f.slug === "string" && /^[a-z0-9-]{1,60}$/.test(f.slug)) return { type: "dest", slug: f.slug };
  return undefined;
}

/**
 * Files arriving from outside the page: the OS share sheet (installed app), "Open with Squished"
 * (file handlers), and the Squished browser extension. Everything stays on this device.
 */
export function useIncomingFiles(addFiles: AddFiles) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("shared")) {
      void takeSharedFiles().then((files) => { if (files.length) addFiles(files.slice(0, MAX_FILES)); });
      params.delete("shared");
      const q = params.toString();
      history.replaceState(null, "", window.location.pathname + (q ? `?${q}` : "") + window.location.hash);
    }

    (window as WithLaunchQueue).launchQueue?.setConsumer(async ({ files }) => {
      const list = await Promise.all(files.slice(0, MAX_FILES).map((h) => h.getFile()));
      if (list.length) addFiles(list);
    });

    // Extension protocol: only messages posted from this window, on this origin.
    const onMessage = (e: MessageEvent) => {
      if (e.source !== window || e.origin !== window.location.origin) return;
      const d = e.data as { source?: string; type?: string; files?: unknown; fit?: unknown } | null;
      if (d?.source !== "squished-extension") return;
      if (d.type === "ping") {
        window.postMessage({ source: "squished-page", type: "ready" }, window.location.origin);
        return;
      }
      if (d.type !== "add-files" || !Array.isArray(d.files)) return;
      const files = d.files.filter((f): f is File => f instanceof File).slice(0, MAX_FILES);
      if (!files.length) return;
      const fit = validFit(d.fit);
      addFiles(files, fit ? { fit } : undefined);
      window.postMessage({ source: "squished-page", type: "files-added", count: files.length }, window.location.origin);
    };
    window.addEventListener("message", onMessage);
    window.postMessage({ source: "squished-page", type: "ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, [addFiles]);
}
