import { Download, Loader2, Trash2, CheckCircle2, AlertTriangle, FileImage, Music, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { useQueue } from "@/store/queue";
import { formatBytes, type TargetFormat } from "@/lib/files";
import { cn } from "@/lib/utils";

export function FileRow({ id }: { id: string }) {
  const item = useQueue((s) => s.items.find((x) => x.id === id));
  const remove = useQueue((s) => s.remove);
  const update = useQueue((s) => s.updateOptions);
  const reprocess = useQueue((s) => s.process);

  if (!item) return null;

  const ratio =
    item.outputSize && item.originalSize
      ? Math.round((1 - item.outputSize / item.originalSize) * 100)
      : null;

  const download = () => {
    if (!item.output || !item.outputName) return;
    const url = URL.createObjectURL(item.output);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.outputName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const isAudio = item.kind === "audio";
  const isVideo = item.kind === "video";

  return (
    <div className="rounded-xl border bg-card p-3 shadow-soft sm:p-4">
      <div className="flex gap-3">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
          {item.thumbnail ? (
            <img src={item.thumbnail} alt="" className="size-full object-cover" />
          ) : isAudio ? (
            <Music className="size-6 text-muted-foreground" />
          ) : isVideo ? (
            <Film className="size-6 text-muted-foreground" />
          ) : (
            <FileImage className="size-6 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span>{formatBytes(item.originalSize)}</span>
                {item.outputSize ? (
                  <>
                    <span>→</span>
                    <span className="font-medium text-foreground">
                      {formatBytes(item.outputSize)}
                    </span>
                    {ratio !== null && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                          ratio > 0
                            ? "bg-primary/15 text-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {ratio > 0 ? `−${ratio}%` : `+${Math.abs(ratio)}%`}
                      </span>
                    )}
                  </>
                ) : null}
              </div>
            </div>
            <button
              onClick={() => remove(item.id)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Remove"
            >
              <Trash2 className="size-4" />
            </button>
          </div>

          {item.status === "processing" && (
            <div className="mt-2 flex items-center gap-2">
              <Loader2 className="size-3.5 animate-spin text-primary" />
              <Progress value={item.progress} className="h-1.5 flex-1" />
              {(isAudio || isVideo) && item.progress < 15 && (
                <span className="text-[10px] text-muted-foreground">loading engine…</span>
              )}
            </div>
          )}
          {item.status === "error" && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>{item.error}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[140px_1fr_auto] sm:items-center">
        <Select
          value={item.targetFormat}
          onValueChange={(v) => {
            update(item.id, { targetFormat: v as TargetFormat });
            void reprocess(item.id);
          }}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="original">Keep format</SelectItem>
            {isAudio ? (
              <>
                <SelectItem value="mp3">MP3</SelectItem>
                <SelectItem value="m4a">M4A (AAC)</SelectItem>
                <SelectItem value="ogg">OGG</SelectItem>
                <SelectItem value="wav">WAV</SelectItem>
              </>
            ) : isVideo ? (
              <>
                <SelectItem value="mp4">MP4 (H.264)</SelectItem>
                <SelectItem value="webm">WebM (VP9)</SelectItem>
              </>
            ) : (
              <>
                <SelectItem value="jpeg">JPEG</SelectItem>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="webp">WebP</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>

        {isAudio ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Bitrate
            </span>
            <Select
              value={String(item.bitrate ?? 128)}
              onValueChange={(v) => {
                update(item.id, { bitrate: Number(v) });
                void reprocess(item.id);
              }}
            >
              <SelectTrigger className="h-9 flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="64">64 kbps (smallest)</SelectItem>
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
              value={[Math.round(item.quality * 100)]}
              min={20}
              max={100}
              step={5}
              onValueChange={([v]) => update(item.id, { quality: v / 100 })}
              onValueCommit={() => void reprocess(item.id)}
              className="flex-1"
            />
            <span className="w-8 text-right text-xs font-medium tabular-nums">
              {Math.round(item.quality * 100)}
            </span>
          </div>
        )}

        <Button
          size="sm"
          onClick={download}
          disabled={item.status !== "done"}
          className="h-9"
        >
          {item.status === "done" ? (
            <>
              <CheckCircle2 className="size-4" /> Download
            </>
          ) : (
            <>
              <Download className="size-4" /> Download
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
