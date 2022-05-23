import type { Result } from "@zxing/library";
import { RGBLuminanceSource, BinaryBitmap, HybridBinarizer, MultiFormatOneDReader, NotFoundException } from "@zxing/library";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";
import { useEffect, useRef, useState } from "react";
function interval(ms: number, signal: AbortSignal): AsyncIterable<void> & AsyncIterator<void> {
  return {
    [Symbol.asyncIterator]() {
      return this;
    },
    next(): Promise<IteratorResult<void>> {
      return new Promise((resolve) => setTimeout(() => resolve({ done: signal.aborted, value: void 0 }), ms));
    },
  }
}

async function* stream(video: HTMLVideoElement, canvas: HTMLCanvasElement, ms: number, signal: AbortSignal): AsyncGenerator<ImageData, void> {
  const media = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "environment",
    },
  });
  try {
    video.srcObject = media;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;

    await new Promise<void>((resolve, reject) => {
      const onplay = () => {
        video.removeEventListener("play", onplay);
        video.removeEventListener("error", onerror);
        resolve();
      };
      const onerror = (err: unknown) => {
        video.removeEventListener("play", onplay);
        video.removeEventListener("error", onerror);
        reject(err);
      };

      video.addEventListener("play", onplay, { once: true} );
      video.addEventListener("error", onerror, { once: true });
    });

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    for await (const _ of interval(ms, signal)) {
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error();
      }

      ctx.drawImage(video, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      yield data;
    }

  } finally {
    video.srcObject = null;
    for (const track of media.getTracks()) {
      track.stop();
    }
  }
}

type ZxingProps = {
  scan?: boolean | undefined;
  onResult?: ((result: Result) => void) | undefined;
}

export default function ZxingScanner({ scan, onResult }: ZxingProps): JSX.Element {
  const [events] = useState(() => new EventTarget());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!scan) {
      return void 0;
    }

    if (!videoRef.current || !canvasRef.current) {
      throw new Error();
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const abort = new AbortController();

    (async (signal) => {
      const hints = new Map([
        [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_8, BarcodeFormat.EAN_13]],
      ]);

      const reader = new MultiFormatOneDReader(hints);
      for await (const image of stream(video, canvas, 500, signal)) {
        const luminanceSource = new RGBLuminanceSource(image.data, image.width, image.height);
        const binmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
        try {
          const result = reader.decode(binmap, hints);
          events.dispatchEvent(new CustomEvent("detect", {
            detail: result,
          }));
          console.log(result);
        } catch (e) {
          if (e instanceof NotFoundException) {
            continue;
          }
          throw e;
        }
      }
    })(abort.signal);

    return () => abort.abort();
  }, [scan, videoRef, canvasRef, events]);

  useEffect(() => {
    if (!onResult) {
      return;
    }

    const handler = (event: Event) => {
      if (!(event instanceof CustomEvent)) {
        throw new Error();
      }
      onResult(event.detail);
    };

    events.addEventListener("detect", handler);
    return () => events.removeEventListener("detect", handler);

  }, [onResult, events]);

  return (
    <div>
      <video ref={videoRef} />
      <canvas ref={canvasRef}/>
    </div>
  );
}
