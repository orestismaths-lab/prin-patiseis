import { createWorker } from 'tesseract.js'

export interface OcrResult {
  text: string
  confidence: number
}

export async function runOcr(
  imageSource: File | string,
  onProgress?: (pct: number) => void
): Promise<OcrResult> {
  const worker = await createWorker('ell+eng', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100))
      }
    },
  })

  const { data } = await worker.recognize(imageSource)
  await worker.terminate()

  return { text: data.text.trim(), confidence: data.confidence }
}
