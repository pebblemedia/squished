import { useCallback, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  onFiles: (files: FileList | File[]) => void;
  accept?: string;
  hint?: string;
  title?: string;
}

export function DropZone({ onFiles, accept, hint, title }: DropZoneProps) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
        "group relative cursor-pointer rounded-2xl border-2 border-dashed bg-card/60 px-6 py-14 text-center transition-all",
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
