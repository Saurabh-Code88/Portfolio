export type SeekRange = readonly [number, number];
export function clampSeekTime(target: number, ranges: readonly SeekRange[]) {
  let nearest: number | null = null;
  for (const [start, end] of ranges) {
    const candidate = Math.max(start, Math.min(end, target));
    if (
      nearest === null ||
      Math.abs(candidate - target) < Math.abs(nearest - target)
    )
      nearest = candidate;
  }
  return nearest;
}
/** Exactly one in-flight seek and one overwritten latest target; no FIFO or frame loop. */
export class LatestVideoSeek {
  target = 0;
  busy = false;
  coalesced = 0;
  offer(time: number) {
    if (!Number.isFinite(time)) return;
    if (this.busy && Math.abs(time - this.target) > 1e-6) this.coalesced++;
    this.target = Math.max(0, time);
  }
  begin(current: number, ready: boolean, ranges: readonly SeekRange[]) {
    if (this.busy || !ready) return null;
    const time = clampSeekTime(this.target, ranges);
    if (time === null || Math.abs(time - current) < 1 / 60) return null;
    this.busy = true;
    return time;
  }
  complete() {
    this.busy = false;
  }
}
export type ScrubMeasurement = {
  target: number;
  decoded: number;
  lag: number;
  seekMs: number;
  seeks: number;
  coalesced: number;
  by: string;
};
export function attachVideoScrubber(
  video: HTMLVideoElement,
  report: (sample: ScrubMeasurement) => void,
  ready: () => void,
  fail: (recoverable?: boolean) => void,
) {
  const queue = new LatestVideoSeek();
  let disposed = false,
    failed = false,
    started = 0,
    seeks = 0,
    seekMs = 0,
    decoded = 0,
    issued = 0;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let frame: number | undefined;
  const emit = (by: string) =>
    report({
      target: queue.target,
      decoded,
      lag: Math.abs(queue.target - decoded),
      seekMs,
      seeks,
      coalesced: queue.coalesced,
      by,
    });
  const cancelFrame = () => {
    if (frame !== undefined && video.cancelVideoFrameCallback)
      video.cancelVideoFrameCallback(frame);
    frame = undefined;
  };
  const watchDecoded = () => {
    if (frame !== undefined || !video.requestVideoFrameCallback) return;
    frame = video.requestVideoFrameCallback((_now, metadata) => {
      frame = undefined;
      if (disposed || failed) return;
      decoded = metadata.mediaTime;
      emit("decoded frame");
      ready();
      // Subscribe to the next decoded frame, never advance playback or the master clock.
      watchDecoded();
    });
  };
  const error = () => {
    if (disposed || failed) return;
    failed = true;
    queue.complete();
    clearTimeout(timeout);
    cancelFrame();
    video.pause();
    fail(false);
  };
  const drain = () => {
    if (disposed || failed || document.hidden) return;
    const ranges: SeekRange[] = [];
    for (let i = 0; i < video.seekable.length; i++)
      ranges.push([video.seekable.start(i), video.seekable.end(i)]);
    const next = queue.begin(
      video.currentTime,
      video.readyState >= 2 && !video.seeking,
      ranges,
    );
    emit("target");
    if (next === null) return;
    issued = next;
    started = performance.now();
    seeks++;
    watchDecoded();
    try {
      video.currentTime = next;
    } catch {
      error();
      return;
    }
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      if (video.seeking) {
        // A slow decoder keeps the single seek; the eventual seeked event drains the latest target.
        // Do not issue overlapping retries or permanently disable a healthy, delayed decoder.
        emit("seek pending");
        fail(true);
      }
      else if (video.readyState >= 2 && Math.abs(video.currentTime-issued)<1/30) settled();
      else error();
    }, 5000);
  };
  const settled = () => {
    if (disposed || failed || video.seeking) return;
    clearTimeout(timeout);
    if (queue.busy) seekMs = performance.now() - started;
    queue.complete();
    if (video.readyState >= 2) {
      // seeked/loadeddata is the compatibility readiness signal, not a claimed RVFC timestamp.
      decoded = video.currentTime;
      emit("seeked fallback");
      ready();
    }
    watchDecoded();
    drain();
  };
  const keepPaused = () => video.pause();
  video.pause();
  video.autoplay = false;
  video.loop = false;
  video.addEventListener("play", keepPaused);
  video.addEventListener("seeked", settled);
  video.addEventListener("loadeddata", settled);
  video.addEventListener("progress", drain);
  video.addEventListener("canplay", drain);
  watchDecoded();
  return {
    target(time: number) {
      queue.offer(time);
      drain();
    },
    reset() {
      queue.complete();
      clearTimeout(timeout);
      cancelFrame();
      failed = false;
      decoded = 0;
      issued = 0;
    },
    dispose() {
      disposed = true;
      clearTimeout(timeout);
      cancelFrame();
      video.pause();
      video.removeEventListener("play", keepPaused);
      video.removeEventListener("seeked", settled);
      video.removeEventListener("loadeddata", settled);
      video.removeEventListener("progress", drain);
      video.removeEventListener("canplay", drain);
    },
  };
}
