import { ScamResult, RiskLevel } from '@/types/scam'

const COLORS: Record<RiskLevel, { bg: string; header: string; dot: string; bar: string }> = {
  low:       { bg: '#f0fdf4', header: '#059669', dot: '#34d399', bar: '#10b981' },
  suspicious:{ bg: '#fffbeb', header: '#d97706', dot: '#fbbf24', bar: '#f59e0b' },
  dangerous: { bg: '#fef2f2', header: '#dc2626', dot: '#f87171', bar: '#ef4444' },
}

const LABELS: Record<RiskLevel, string> = {
  low: 'Χαμηλός κίνδυνος',
  suspicious: 'Ύποπτο μήνυμα',
  dangerous: 'Επικίνδυνο!',
}

// Wraps text to fit within maxWidth, returns array of lines
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

export async function buildShareImage(result: ScamResult, riskLabel: string, recommendation: string): Promise<Blob> {
  const W = 640
  const palette = COLORS[result.riskLevel]

  // First pass: measure height
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = 100 // placeholder
  const ctx = canvas.getContext('2d')!

  const PAD = 36
  const INNER = W - PAD * 2
  let y = 0

  // Header band
  const HEADER_H = 100
  y += HEADER_H

  // Score bar section
  y += 56

  // Recommendation
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif'
  const recLines = wrapText(ctx, recommendation, INNER)
  y += recLines.length * 30 + 28

  // Signals
  const topSignals = result.signals.slice(0, 5)
  if (topSignals.length > 0) {
    y += 28 // section label
    ctx.font = '20px system-ui, -apple-system, sans-serif'
    for (const s of topSignals) {
      const lines = wrapText(ctx, `• ${s.label}`, INNER - 16)
      y += lines.length * 26 + 4
    }
    y += 12
  }

  // Footer
  y += 56

  const H = y + PAD

  // Second pass: draw
  canvas.height = H
  ctx.clearRect(0, 0, W, H)

  // Background
  ctx.fillStyle = palette.bg
  roundRect(ctx, 0, 0, W, H, 24)
  ctx.fill()

  // Header band
  ctx.fillStyle = palette.header
  roundRectTop(ctx, 0, 0, W, HEADER_H, 24)
  ctx.fill()

  // Icon circle
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.beginPath()
  ctx.arc(PAD + 28, 50, 28, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 30px system-ui'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(result.riskLevel === 'low' ? '✓' : result.riskLevel === 'suspicious' ? '⚠' : '✕', PAD + 28, 50)

  // Risk label
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 26px system-ui, -apple-system, sans-serif'
  ctx.fillText(LABELS[result.riskLevel], PAD + 72, 20)
  ctx.font = '18px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.fillText(`Σκορ κινδύνου: ${result.totalScore} / 100`, PAD + 72, 54)

  // App name top right
  ctx.textAlign = 'right'
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = '15px system-ui'
  ctx.fillText('Πριν Πατήσεις', W - PAD, 20)
  ctx.textAlign = 'left'

  let curY = HEADER_H + 20

  // Score bar background
  ctx.fillStyle = 'rgba(0,0,0,0.08)'
  roundRect(ctx, PAD, curY, INNER, 12, 6)
  ctx.fill()

  // Score bar fill
  ctx.fillStyle = palette.bar
  roundRect(ctx, PAD, curY, Math.round(INNER * result.totalScore / 100), 12, 6)
  ctx.fill()
  curY += 36

  // Recommendation
  ctx.fillStyle = palette.header
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif'
  for (const line of recLines) {
    ctx.fillText(line, PAD, curY)
    curY += 30
  }
  curY += 16

  // Signals
  if (topSignals.length > 0) {
    ctx.fillStyle = '#6b7280'
    ctx.font = 'bold 13px system-ui'
    ctx.fillText('ΤΙ ΕΝΤΟΠΊΣΤΗΚΕ', PAD, curY)
    curY += 24

    ctx.font = '20px system-ui, -apple-system, sans-serif'
    for (const s of topSignals) {
      const lines = wrapText(ctx, `• ${s.label}`, INNER - 16)
      // dot
      ctx.fillStyle = palette.dot
      ctx.beginPath()
      ctx.arc(PAD + 6, curY + 10, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#374151'
      for (const line of lines) {
        const cleanLine = line.startsWith('•') ? '  ' + line.slice(1).trim() : line
        ctx.fillText(cleanLine, PAD + 16, curY)
        curY += 26
      }
      curY += 4
    }
  }

  // Footer
  curY = H - 44
  ctx.fillStyle = '#d1d5db'
  ctx.fillRect(PAD, curY, INNER, 1)
  curY += 12
  ctx.fillStyle = '#9ca3af'
  ctx.font = '15px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText('Ελέγχθηκε με την εφαρμογή "Πριν Πατήσεις" — prin-patiseis.vercel.app', W / 2, curY)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('canvas toBlob failed')), 'image/png')
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function roundRectTop(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h)
  ctx.lineTo(x, y + h)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
