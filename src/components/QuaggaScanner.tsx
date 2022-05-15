import { useEffect, useRef } from "react";
import Quagga from "quagga";

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
  }, [scan, div]);

  useEffect(() => {
    if (!scan) {
      return;
    }

    const handler = (data: unknown) => {
      onResult?.(data);
    };
    queued(() => Quagga.onDetected(handler));

    return () => void queued(() => Quagga.offDetected(handler));
  }, [scan, onResult]);

  return (
    <>
      <div ref={div}/>
    </>
  );
}
