import { useEffect, useRef, useState } from "react";
import Quagga from "quagga";

class DetectEvent extends Event {
  data?: unknown | undefined;

  constructor(type: string, opts: { data: unknown }) {
    super(type);
    this.data = opts.data;
  }
}

interface QuaggaEventTarget extends EventTarget {
  addEventListener(type: "detect", callback: ((this: QuaggaEventTarget, event: DetectEvent) => void) | null): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;

  removeEventListener(type: "detect", callback: ((this: QuaggaEventTarget, event: DetectEvent) => void) | null): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}

let queue = Promise.resolve<unknown>(void 0);
function queued<T>(task: () => T | PromiseLike<T>): Promise<T> {
  const result = queue.catch(() => void 0).then(task);
  queue = result;
  return result;
}

type QuaggaProps = {
  scan?: boolean | undefined;
  onResult?: ((result: unknown) => void) | undefined;
}

export default function QuaggaScanner({scan, onResult}: QuaggaProps): React.ReactElement {
  const [events] = useState<QuaggaEventTarget>(() => new EventTarget() as QuaggaEventTarget);
  const div = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!scan) {
      return;
    }

    const target = div.current;
    if (!target) {
      throw new Error();
    }

    const abort = new AbortController();
    const signal = abort.signal;
    signal.addEventListener("abort", () => queued(() => Quagga.stop()));

    queued(() => new Promise<void>((resolve, reject) => {
      const handler = (data: unknown) => {
        events.dispatchEvent(new DetectEvent("detect", { data }));
      }
      Quagga.onDetected(handler);
      signal.addEventListener("abort", () => queued(() => Quagga.offDetected(handler)));

      const conf = {
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target, // missing type declaration!
          constraints: {
            facingMode: "environment",
          },
        },
        decoder: {
          readers: ["ean_reader", "ean_8_reader"],
        },
      }
      Quagga.init(conf, (err) => {
        if (err) {
          return void reject(err);
        }
        Quagga.start();
        return void resolve();
      });
    })).catch(console.error);

    return () => abort.abort();
  }, [scan, div, events]);

  useEffect(() => {
    const handler = (event: DetectEvent) => {
      onResult?.(event.data);
    };
    events.addEventListener("detect", handler);

    return () => events.removeEventListener("detect", handler);
  }, [onResult, events]);

  return (
    <>
      <div ref={div}/>
    </>
  );
}
