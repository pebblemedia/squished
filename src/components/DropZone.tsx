import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Upload } from "lucide-react";
import Lottie from "lottie-react";
import { cn } from "@/lib/utils";
import { useQueue } from "@/store/queue";
import bunnyAnimation from "@/assets/bunny-storm.json";

interface DropZoneProps {
  onFiles: (files: FileList | File[]) => void;
  accept?: string;
  hint?: string;
  title?: string;
}

// Recolor the Lottie JSON to match brand tokens.
// Lottie colors are normalized RGB arrays [r, g, b, a] (0–1).
function recolorLottie(data: unknown, color: [number, number, number]): unknown {
  const clone = JSON.parse(JSON.stringify(data));
  const walk = (node: any) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    // Solid fill / stroke color: { a: 0, k: [r,g,b,a] } or animated { a:1, k:[{s:[r,g,b,a]}] }
    if (node.ty === "fl" || node.ty === "st") {
      if (node.c) {
        if (node.c.a === 0 && Array.isArray(node.c.k)) {
          node.c.k = [color[0], color[1], color[2], node.c.k[3] ?? 1];
        } else if (node.c.a === 1 && Array.isArray(node.c.k)) {
          node.c.k.forEach((kf: any) => {
            if (Array.isArray(kf.s)) kf.s = [color[0], color[1], color[2], kf.s[3] ?? 1];
          });
        }
      }
    }
    Object.values(node).forEach(walk);
  };
  walk(clone);
  return clone;
}

// Brand primary lime: hsl(84 81% 44%) ≈ rgb(149, 203, 20)
const BRAND_RGB: [number, number, number] = [149 / 255, 203 / 255, 20 / 255];

export function DropZone({ onFiles, accept, hint, title }: DropZoneProps) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useQueue((s) => s.items);
  const isProcessing = items.some(
    (i) => i.status === "processing" || i.status === "queued"
  );

  const recolored = useMemo(() => recolorLottie(bunnyAnimation, BRAND_RGB), []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setOver(false);
      if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
    },
    [onFiles]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed bg-card/60 px-6 py-14 text-center transition-all",
        "hover:border-primary hover:bg-card",
        over ? "border-primary bg-card shadow-drop scale-[1.01]" : "border-border"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept ?? "image/*,audio/*,video/*,application/pdf,.pdf,.mp3,.wav,.m4a,.ogg,.flac,.aac,.opus,.mp4,.webm,.mov,.mkv"}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {isProcessing && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-card/85 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col items-center">
            <div className="size-48 sm:size-56">
              <Lottie animationData={recolored} loop autoplay />
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">
              Squishing your files…
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary transition-transform group-hover:scale-110">
        <Upload className="size-7" strokeWidth={2.25} />
      </div>
      <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {title ?? "Drop files here"}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        or <span className="font-medium text-foreground underline-offset-4 group-hover:underline">click to browse</span>
      </p>
      <p className="mt-6 text-xs text-muted-foreground">
        {hint ?? "Images, audio & video — processed entirely in your browser"}
      </p>
    </div>
  );
}
