import { useEffect, useRef, useState } from "react";

declare global {
  // https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API#supported_barcode_formats
  type BarcodeDetectorFormats =
    | "aztec"
    | "code_128"
    | "code_39"
    | "code_93"
    | "codabar"
    | "data_matrix"
    | "ean_13"
    | "ean_8"
    | "itf"
    | "pdf417"
    | "qr_code"
    | "upc_a"
    | "upc_e"
    | "unknown"

  type BarcodeDetectorOptions = {
    formats: BarcodeDetectorFormats[];
  }

  type DetectedBarcode = {
    boundingBox: DOMRectReadOnly;
    cornerPoints: { x: number, y: number }[];
    format: BarcodeDetectorFormats[];
    rawValue: string;
  }

  export class BarcodeDetector {
    constructor(barcodeDetectorOptions?: BarcodeDetectorOptions | undefined);
    detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
  }

  export interface Window {
    BarcodeDetector?: typeof BarcodeDetector | undefined;
  }
}

function interval(ms: number): AsyncIterable<void> & AsyncIterator<void> {
  return {
    [Symbol.asyncIterator]() {
      return this;
    },
    next(): Promise<IteratorResult<void>> {
      return new Promise((resolve) => setTimeout(() => resolve({ done: false, value: void 0 }), ms));
    },
  }
}

type ZbarProps = {
  scan?: boolean | undefined;
  onResult?: ((result: unknown) => void) | undefined;
}

export default function NativeScanner({ scan, onResult }: ZbarProps): React.ReactElement {
  const [events] = useState<EventTarget>(() => new EventTarget());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!scan) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      throw new Error();
    }

    if (typeof window.BarcodeDetector === "undefined") {
      throw new Error();
    }

    const detector = new BarcodeDetector({
      formats: ["ean_8", "ean_13"],
    });
    const abort = new AbortController();

    (async (signal) => {
      if (signal.aborted) {
        return;
      }

      const media = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
        },
      });
      video.srcObject = media;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      signal.addEventListener("abort", () => {
        video.srcObject = null;
        for (const track of media.getTracks()) {
          track.stop();
        }
      });

      for await (const _ of interval(500)) {
        if (signal.aborted) {
          return;
        }

        const image = await createImageBitmap(video);
        const results = await detector.detect(image);
        for (const result of results) {
          events.dispatchEvent(new CustomEvent("detect", {
            detail: result,
          }));
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

    () => events.removeEventListener("detect", handler);

  }, [onResult, events]);

  return (
    <>
      <video ref={videoRef} />
      <canvas ref={canvasRef} />
    </>
  );
}
