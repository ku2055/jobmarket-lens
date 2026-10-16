export class AnalysisClient {
  private worker: Worker;
  private seq = 0;
  private pending = new Map<
    number,
    { resolve: (x: unknown) => void; reject: (e: Error) => void }
  >();
  constructor(onProgress: (s: string) => void) {
    this.worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    this.worker.onmessage = (e) => {
      const { id, result, error, type, loaded, total, computeMs } = e.data;
      if (typeof computeMs === "number")
        performance.measure("lens:worker-query", {
          start: Math.max(0, performance.now() - computeMs),
          duration: computeMs,
        });
      if (type === "progress") {
        onProgress(`Validating ${loaded} of ${total} data files…`);
        return;
      }
      const p = this.pending.get(id);
      if (!p) return;
      this.pending.delete(id);
      if (error) p.reject(new Error(error));
      else p.resolve(result);
    };
    this.worker.onerror = () => {
      for (const p of this.pending.values())
        p.reject(new Error("Analysis worker failed. Reload to retry."));
      this.pending.clear();
    };
  }
  request<T>(type: string, payload: unknown): Promise<T> {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (x: unknown) => void,
        reject,
      });
      this.worker.postMessage({ id, type, payload });
    });
  }
  dispose() {
    this.worker.terminate();
    for (const p of this.pending.values())
      p.reject(new Error("Analysis disposed"));
    this.pending.clear();
  }
}
