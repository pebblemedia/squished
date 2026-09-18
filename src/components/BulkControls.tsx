import { useState } from "react";
import { Layers } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useQueue } from "@/store/queue";
import type { TargetFormat } from "@/lib/files";

/**
 * "Apply to all" bar — lets the user change the target format and quality
 * for every file in the queue at once. Formats are filtered per file kind
 * in the store, so picking e.g. WebP only touches the images.
 */
export function BulkControls() {
  const items = useQueue((s) => s.items);
  const applyToAll = useQueue((s) => s.applyToAll);

  const hasImage = items.some((i) => i.kind === "image");
  const hasAudio = items.some((i) => i.kind === "audio");
  const hasVideo = items.some((i) => i.kind === "video");
  const hasPdf = items.some((i) => i.kind === "pdf");
  const onlyAudio = hasAudio && !hasImage && !hasVideo && !hasPdf;

  const [format, setFormat] = useState<string>("");
  const [quality, setQuality] = useState(75);
  const [bitrate, setBitrate] = useState(128);

  if (items.length < 2) return null;

  const applyFormat = (v: string) => {
    setFormat(v);
    applyToAll({ targetFormat: v as TargetFormat });
  };

  const commitQuality = ([v]: number[]) => {
    applyToAll({ quality: v / 100 });
  };

  const applyBitrate = (v: string) => {
    const b = Number(v);
    setBitrate(b);
    applyToAll({ bitrate: b });
  };

  return (
    <div className="mt-3 rounded-xl border bg-muted/40 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Layers className="size-3.5" />
        Apply to all {items.length} files
      </div>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[150px_1fr] sm:items-center">
        <Select value={format} onValueChange={applyFormat}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Set format…" />
          </SelectTrigger>
          <SelectContent>
            {hasImage && (
              <>
                <SelectItem value="original">Keep format (images)</SelectItem>
                <SelectItem value="jpeg">All to JPEG</SelectItem>
                <SelectItem value="png">All to PNG</SelectItem>
                <SelectItem value="webp">All to WebP</SelectItem>
                <SelectItem value="pdf">All to PDF</SelectItem>
              </>
            )}
            {hasAudio && (
              <>
                <SelectItem value="mp3">All to MP3</SelectItem>
                <SelectItem value="m4a">All to M4A (AAC)</SelectItem>
                <SelectItem value="ogg">All to OGG</SelectItem>
                <SelectItem value="wav">All to WAV</SelectItem>
              </>
            )}
            {hasVideo && (
              <>
                <SelectItem value="mp4">All to MP4 (H.264)</SelectItem>
                <SelectItem value="webm">All to WebM (VP9)</SelectItem>
              </>
            )}
            {hasPdf && (
              <>
                <SelectItem value="pdf">Compress PDFs</SelectItem>
                <SelectItem value="pdf-to-jpg">PDFs → JPG (zip)</SelectItem>
                <SelectItem value="pdf-to-png">PDFs → PNG (zip)</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>

        {onlyAudio ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Bitrate
            </span>
            <Select value={String(bitrate)} onValueChange={applyBitrate}>
              <SelectTrigger className="h-9 flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16">16 kbps (tiny, mono speech)</SelectItem>
                <SelectItem value="24">24 kbps</SelectItem>
                <SelectItem value="32">32 kbps</SelectItem>
                <SelectItem value="48">48 kbps</SelectItem>
                <SelectItem value="64">64 kbps</SelectItem>
                <SelectItem value="96">96 kbps</SelectItem>
                <SelectItem value="128">128 kbps (recommended)</SelectItem>
                <SelectItem value="192">192 kbps</SelectItem>
                <SelectItem value="256">256 kbps</SelectItem>
                <SelectItem value="320">320 kbps (best)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Quality
            </span>
            <Slider
              value={[quality]}
              min={20}
              max={100}
              step={5}
              onValueChange={([v]) => setQuality(v)}
              onValueCommit={commitQuality}
              className="flex-1"
            />
            <span className="w-8 text-right text-xs font-medium tabular-nums">{quality}</span>
          </div>
        )}
      </div>
    </div>
  );
}
