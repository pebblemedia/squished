import { Upload, Wand2, Download } from "lucide-react";

const steps = [
  { icon: Upload, title: "1. Drop your file", body: "Pick or drag a file into the box. Nothing is uploaded." },
  { icon: Wand2, title: "2. Process locally", body: "Squished compresses or converts it on your device with WebAssembly." },
  { icon: Download, title: "3. Download", body: "Save the result. We never see it — there's no server in between." },
];

export function HowItWorks() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {steps.map((s) => (
        <div key={s.title} className="rounded-xl border bg-card p-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <s.icon className="size-4" strokeWidth={2.25} />
          </div>
          <h3 className="mt-3 font-display text-sm font-semibold">{s.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{s.body}</p>
        </div>
      ))}
    </div>
  );
}
