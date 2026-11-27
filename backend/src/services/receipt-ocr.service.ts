import { createWorker } from 'tesseract.js';

export const RECEIPT_OCR_TIMEOUT_MS = 30_000;

export interface ReceiptOcrResult {
  text: string;
  confidence: number | null;
}

export class ReceiptOcrTimeoutError extends Error {
  constructor() {
    super('Receipt OCR exceeded the 30-second time limit.');
    this.name = 'ReceiptOcrTimeoutError';
  }
}

type ReceiptOcrWorker = Awaited<ReturnType<typeof createWorker>>;
export type ReceiptOcrWorkerFactory = () => Promise<ReceiptOcrWorker>;

const createEnglishReceiptWorker: ReceiptOcrWorkerFactory = () => createWorker('eng');

export const recognizeReceipt = async (
  image: Buffer,
  timeoutMs = RECEIPT_OCR_TIMEOUT_MS,
  workerFactory: ReceiptOcrWorkerFactory = createEnglishReceiptWorker
): Promise<ReceiptOcrResult> => {
  let worker: ReceiptOcrWorker | undefined;
  let terminated = false;
  let timedOut = false;

  const terminateWorker = async () => {
    if (!worker || terminated) return;
    terminated = true;
    await worker.terminate();
  };

  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutHandle = setTimeout(() => {
      timedOut = true;
      void terminateWorker().catch((error: unknown) => {
        console.error('[ExpenseAI OCR] Failed to terminate timed-out worker:', error);
      });
      reject(new ReceiptOcrTimeoutError());
    }, timeoutMs);
  });

  const operation = (async (): Promise<ReceiptOcrResult> => {
    worker = await workerFactory();
    if (timedOut) {
      await terminateWorker();
      throw new ReceiptOcrTimeoutError();
    }

    try {
      const result = await worker.recognize(image);
      return {
        text: result.data.text.trim(),
        confidence: Number.isFinite(result.data.confidence)
          ? result.data.confidence
          : null,
      };
    } finally {
      await terminateWorker();
    }
  })();

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
};
