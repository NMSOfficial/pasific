import type { jsPDF } from 'jspdf';

// Noto Sans (SIL OFL) is fetched at runtime rather than bundled, since jsPDF's
// built-in Helvetica has no Turkish glyphs (ş ğ ı İ) — WinAnsi encoding only.
export const PDF_FONT_FAMILY = 'NotoSans';

let cachedRegular: string | null = null;
let cachedBold: string | null = null;
const registeredForDoc: WeakSet<jsPDF> = new WeakSet();

async function fetchAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buf);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function ensurePasificFont(doc: jsPDF): Promise<void> {
  if (!cachedRegular) cachedRegular = await fetchAsBase64('/fonts/NotoSans-Regular.ttf');
  if (!cachedBold) cachedBold = await fetchAsBase64('/fonts/NotoSans-Bold.ttf');

  if (!registeredForDoc.has(doc)) {
    doc.addFileToVFS('NotoSans-Regular.ttf', cachedRegular);
    doc.addFont('NotoSans-Regular.ttf', PDF_FONT_FAMILY, 'normal');
    doc.addFileToVFS('NotoSans-Bold.ttf', cachedBold);
    doc.addFont('NotoSans-Bold.ttf', PDF_FONT_FAMILY, 'bold');
    registeredForDoc.add(doc);
  }
  doc.setFont(PDF_FONT_FAMILY, 'normal');
}
