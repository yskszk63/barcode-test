import { BrowserMultiFormatOneDReader } from "@zxing/browser";
import type { Result } from "@zxing/library";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";
import { useEffect, useRef } from "react";

type ZxingProps = {
  scan?: boolean | undefined;
  onResult?: ((result: Result) => void) | undefined;
}

export default function ZxingScanner({ scan, onResult }: ZxingProps): JSX.Element {
  const video = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (!scan || !video.current) {
      return void 0;
    }

    const abort = new AbortController();

    (async (signal, video) => {
      const hints = new Map([
        [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_8, BarcodeFormat.EAN_13]],
      ]);
      const reader = new BrowserMultiFormatOneDReader(hints);
      const control = await reader.decodeFromVideoDevice(void 0, video, (result) => {
        if (result) {
          onResult?.(result);
        }
      });
      if (signal.aborted) {
        return void control.stop();
      }
      signal.addEventListener("abort", () => control.stop());
      return;
    })(abort.signal, video.current);

    return () => abort.abort();
  }, [scan, video, onResult]);

  return (
    <div>
      <video ref={video} />
    </div>
  );
}

