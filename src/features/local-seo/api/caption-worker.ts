/// <reference lib="webworker" />
// On-device photo captions with Florence-2 (transformers.js). The library loads from jsDelivr and
// the weights from Hugging Face, once, then the browser caches them; photos are read locally and never sent anywhere.
import type { PreTrainedModel, Processor, PreTrainedTokenizer } from "@huggingface/transformers";

// Loaded at runtime (like ffmpeg's core) so the build doesn't ship the ~27 MB ONNX runtime. Keep in step with package.json.
const LIB = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2/dist/transformers.min.js";
type Lib = typeof import("@huggingface/transformers");
let lib: Promise<Lib> | null = null;
const getLib = () => (lib ??= import(/* @vite-ignore */ LIB) as Promise<Lib>);

export type CaptionRequest = { type: "load" } | { type: "caption"; id: number; blob: Blob };
export type CaptionReply =
  | { type: "progress"; loaded: number; total: number }
  | { type: "ready"; device: "webgpu" | "wasm" }
  | { type: "caption"; id: number; text: string }
  | { type: "error"; id?: number; message: string };

const MODEL = "onnx-community/Florence-2-base-ft";
const TASK = "<CAPTION>";
const post = (m: CaptionReply) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(m);

let loading: Promise<{ model: PreTrainedModel; processor: Processor; tokenizer: PreTrainedTokenizer }> | null = null;

async function pickDevice(): Promise<{ device: "webgpu" | "wasm"; f16: boolean }> {
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<{ features: Set<string> } | null> } }).gpu;
    const adapter = await gpu?.requestAdapter();
    if (adapter) return { device: "webgpu", f16: adapter.features.has("shader-f16") };
  } catch { /* fall through */ }
  return { device: "wasm", f16: false };
}

function load() {
  loading ??= (async () => {
    const files = new Map<string, { loaded: number; total: number }>();
    const progress_callback = (p: { status: string; file?: string; loaded?: number; total?: number }) => {
      if (p.status !== "progress" || !p.file) return;
      files.set(p.file, { loaded: p.loaded ?? 0, total: p.total ?? 0 });
      let loaded = 0, total = 0;
      files.forEach((f) => { loaded += f.loaded; total += f.total; });
      post({ type: "progress", loaded, total });
    };
    const { AutoProcessor, AutoTokenizer, Florence2ForConditionalGeneration } = await getLib();
    const open = (device: "webgpu" | "wasm", f16: boolean) => Florence2ForConditionalGeneration.from_pretrained(MODEL, {
      device, progress_callback,
      dtype: device === "webgpu"
        ? { embed_tokens: f16 ? "fp16" : "fp32", vision_encoder: f16 ? "fp16" : "fp32", encoder_model: "q4", decoder_model_merged: "q4" }
        : { embed_tokens: "q8", vision_encoder: "q8", encoder_model: "q8", decoder_model_merged: "q8" },
    });
    let { device, f16 } = await pickDevice();
    let model: PreTrainedModel;
    try {
      model = await open(device, f16);
    } catch {
      if (device === "wasm") throw new Error("This browser couldn't start the on-device model.");
      device = "wasm"; f16 = false;
      model = await open(device, f16);
    }
    const [processor, tokenizer] = await Promise.all([
      AutoProcessor.from_pretrained(MODEL), AutoTokenizer.from_pretrained(MODEL),
    ]);
    post({ type: "ready", device });
    return { model, processor, tokenizer };
  })();
  loading.catch(() => { loading = null; });
  return loading;
}

async function caption(blob: Blob): Promise<string> {
  const { model, processor, tokenizer } = await load();
  const { RawImage } = await getLib();
  const image = await RawImage.fromBlob(blob);
  const vision = await processor(image);
  const text = tokenizer((processor as unknown as { construct_prompts(t: string): string[] }).construct_prompts(TASK));
  const ids = await model.generate({ ...text, ...vision, max_new_tokens: 40, num_beams: 1, do_sample: false });
  const raw = tokenizer.batch_decode(ids as Parameters<PreTrainedTokenizer["batch_decode"]>[0], { skip_special_tokens: false })[0];
  const out = (processor as unknown as { post_process_generation(t: string, task: string, size: [number, number]): Record<string, string> })
    .post_process_generation(raw, TASK, image.size as [number, number]);
  return (out[TASK] ?? "").trim();
}

self.onmessage = async (e: MessageEvent<CaptionRequest>) => {
  const msg = e.data;
  if (msg.type === "load") {
    try { await load(); } catch (err) { post({ type: "error", message: err instanceof Error ? err.message : String(err) }); }
    return;
  }
  try {
    post({ type: "caption", id: msg.id, text: await caption(msg.blob) });
  } catch (err) {
    post({ type: "error", id: msg.id, message: err instanceof Error ? err.message : String(err) });
  }
};
