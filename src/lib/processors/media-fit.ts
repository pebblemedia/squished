import type { FFmpeg } from "@ffmpeg/ffmpeg";

/** Reads the duration (seconds) ffmpeg prints when probing a file. */
export async function probeDuration(ff: FFmpeg, inputName: string): Promise<number> {
  let seconds = 0;
  const onLog = ({ message }: { message: string }) => {
    const m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(message);
    if (m) seconds = +m[1] * 3600 + +m[2] * 60 + +m[3];
  };
  ff.on("log", onLog);
  try {
    await ff.exec(["-hide_banner", "-i", inputName]);
  } catch {
    /* ffmpeg exits non-zero when given no output — the log is all we need */
  } finally {
    ff.off("log", onLog);
  }
  if (!seconds) throw new Error("Couldn't read this file's length to size it.");
  return seconds;
}

/** kbps that lands just under `bytes` for `seconds` of audio, leaving ~4% for container overhead. */
export const audioKbpsFor = (bytes: number, seconds: number) =>
  Math.floor((bytes * 8 * 0.96) / seconds / 1000);

export interface VideoPlan {
  videoKbps: number;
  audioKbps: number;
  /** Max output height; lower bitrates look better at lower resolutions. */
  maxHeight: number;
}

export function videoPlanFor(bytes: number, seconds: number): VideoPlan {
  const totalKbps = (bytes * 8 * 0.94) / seconds / 1000;
  const audioKbps = totalKbps > 1200 ? 128 : totalKbps > 400 ? 96 : totalKbps > 160 ? 48 : 32;
  const videoKbps = Math.floor(totalKbps - audioKbps);
  if (videoKbps < 60) {
    throw new Error("This video is too long to fit that size. Trim it or pick a bigger limit.");
  }
  const maxHeight = videoKbps < 350 ? 360 : videoKbps < 800 ? 480 : videoKbps < 2000 ? 720 : 1080;
  return { videoKbps, audioKbps, maxHeight };
}
