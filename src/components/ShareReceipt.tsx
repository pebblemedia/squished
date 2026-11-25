import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueue } from "@/store/queue";
import { formatBytes } from "@/lib/files";
import mascotUrl from "@/assets/squished-icon.svg";

const W = 1200;
const H = 630;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function drawReceipt(count: number, before: number, after: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const display = "'Space Grotesk', ui-sans-serif, system-ui, sans-serif";
  const saved = Math.round((1 - after / before) * 100);

  ctx.fillStyle = "#faf8f3";
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.8, 0, 0, W * 0.8, 0, W * 0.7);
  glow.addColorStop(0, "rgba(160, 205, 20, 0.28)");
  glow.addColorStop(1, "rgba(160, 205, 20, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  try {
    const mascot = await loadImage(mascotUrl);
    ctx.drawImage(mascot, 72, 64, 96, 73);
  } catch {
    /* card still works without the mascot */
  }
  ctx.fillStyle = "#1a1d23";
  ctx.font = `700 44px ${display}`;
  ctx.fillText("Squished", 188, 116);

  ctx.font = `700 200px ${display}`;
  ctx.fillText(`−${saved}%`, 64, 360);

  ctx.font = `500 40px ${display}`;
  ctx.fillStyle = "#3b4150";
  ctx.fillText(`${count} ${count === 1 ? "file" : "files"} · ${formatBytes(before)} → ${formatBytes(after)}`, 72, 440);

  ctx.font = `500 32px ${display}`;
  ctx.fillStyle = "#5b8f00";
  ctx.fillText("0 bytes uploaded. Squished on my own device.", 72, 510);

  ctx.font = `600 30px ${display}`;
  ctx.fillStyle = "#1a1d23";
  ctx.fillText("squished.app", 72, 572);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
}

/** One-tap shareable card of what was saved. Shares the image, or downloads it where sharing isn't supported. */
export function ShareReceipt() {
  const items = useQueue((s) => s.items);
  const [busy, setBusy] = useState(false);
  const done = items.filter((i) => i.status === "done" && i.outputSize);
  const before = done.reduce((n, i) => n + i.originalSize, 0);
  const after = done.reduce((n, i) => n + (i.outputSize ?? 0), 0);
  if (!done.length || done.length < items.length || after >= before) return null;

  const share = async () => {
    setBusy(true);
    try {
      const blob = await drawReceipt(done.length, before, after);
      const file = new File([blob], "squished.png", { type: "image/png" });
      const text = `Squished ${formatBytes(before)} down to ${formatBytes(after)} without uploading a thing.`;
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text, url: "https://squished.app" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "squished.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      /* user closed the share sheet */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={share} disabled={busy} className="text-muted-foreground">
      <Share2 className="size-4" /> Share
    </Button>
  );
}
