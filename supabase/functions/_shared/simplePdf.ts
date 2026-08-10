// Minimal PDF-generator (utan externa beroenden) för Odlingskalenderns lead magnet.
// Använder de inbyggda Type1-fonterna Helvetica/Helvetica-Bold med WinAnsi-kodning,
// vilket täcker svenska tecken (å ä ö é).

const PAGE_W = 595.28 // A4
const PAGE_H = 841.89

interface TextOp {
  text: string
  x: number
  y: number
  size: number
  bold?: boolean
  gray?: number
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function latin1Bytes(value: string): Uint8Array {
  const out = new Uint8Array(value.length)
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    out[i] = code <= 0xff ? code : 0x3f // '?' för tecken utanför Latin-1
  }
  return out
}

function contentStream(ops: TextOp[]): string {
  const parts: string[] = []
  for (const op of ops) {
    const gray = op.gray ?? 0
    parts.push('BT')
    parts.push(`/${op.bold ? 'F2' : 'F1'} ${op.size} Tf`)
    parts.push(`${gray} g`)
    parts.push(`1 0 0 1 ${op.x.toFixed(2)} ${op.y.toFixed(2)} Tm`)
    parts.push(`(${escapePdfText(op.text)}) Tj`)
    parts.push('ET')
  }
  return parts.join('\n')
}

export function buildPdf(pages: TextOp[][]): Uint8Array {
  const objects: string[] = []
  const pageObjectNumbers: number[] = []
  // 1: Catalog, 2: Pages, 3: F1, 4: F2, sedan par av page/content
  const firstPageObject = 5
  pages.forEach((_, index) => pageObjectNumbers.push(firstPageObject + index * 2))

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[2] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((n) => `${n} 0 R`).join(' ')}] /Count ${pages.length} >>`
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'

  pages.forEach((ops, index) => {
    const pageNumber = firstPageObject + index * 2
    const contentNumber = pageNumber + 1
    const stream = contentStream(ops)
    objects[pageNumber] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W.toFixed(2)} ${PAGE_H.toFixed(2)}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNumber} 0 R >>`
    objects[contentNumber] = `<< /Length ${latin1Bytes(stream).length} >>\nstream\n${stream}\nendstream`
  })

  const chunks: Uint8Array[] = []
  let offset = 0
  const push = (value: string) => {
    const bytes = latin1Bytes(value)
    chunks.push(bytes)
    offset += bytes.length
  }

  push('%PDF-1.4\n')
  const offsets: number[] = []
  for (let i = 1; i < objects.length; i++) {
    if (!objects[i]) continue
    offsets[i] = offset
    push(`${i} 0 obj\n${objects[i]}\nendobj\n`)
  }

  const xrefOffset = offset
  const maxObject = objects.length
  let xref = `xref\n0 ${maxObject}\n0000000000 65535 f \n`
  for (let i = 1; i < maxObject; i++) {
    xref += `${String(offsets[i] ?? 0).padStart(10, '0')} 00000 n \n`
  }
  push(xref)
  push(`trailer\n<< /Size ${maxObject} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`)

  const total = chunks.reduce((sum, c) => sum + c.length, 0)
  const result = new Uint8Array(total)
  let cursor = 0
  for (const chunk of chunks) {
    result.set(chunk, cursor)
    cursor += chunk.length
  }
  return result
}

export const pdfPageSize = { width: PAGE_W, height: PAGE_H }
export type { TextOp }
