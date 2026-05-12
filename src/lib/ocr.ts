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
      if (!onProgress) return
      const p = m.progress ?? 0
      // Phase 1 (0–30%): loading core + language data
      // Phase 2 (30–100%): actual recognition
      if (m.status === 'recognizing text') {
        onProgress(30 + Math.round(p * 70))
      } else if (m.status.includes('load') || m.status.includes('initializ')) {
        onProgress(Math.max(1, Math.round(p * 30)))
      }
    },
  })

  const { data } = await worker.recognize(imageSource)
  await worker.terminate()

  return { text: data.text.trim(), confidence: data.confidence }
}
