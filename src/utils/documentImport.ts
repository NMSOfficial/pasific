const MAX_ITEM_BYTES = 10 * 1024 * 1024;
const MAX_ZIP_ITEMS = 80;
const MAX_ZIP_TOTAL_BYTES = 100 * 1024 * 1024;
const IMAGE_MAX_DIMENSION = 2200;

const SUPPORTED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'pdf']);

function extensionOf(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

function mimeForName(name: string): string {
  switch (extensionOf(name)) {
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    case 'avif': return 'image/avif';
    case 'pdf': return 'application/pdf';
    default: return 'application/octet-stream';
  }
}

export function isSupportedDocument(file: Pick<File, 'name' | 'type' | 'size'>): boolean {
  const extension = extensionOf(file.name);
  const supportedMime = file.type.startsWith('image/') || file.type === 'application/pdf';
  return file.size > 0 && file.size <= MAX_ITEM_BYTES && SUPPORTED_EXTENSIONS.has(extension) && supportedMime;
}

export async function fileToBase64(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

export async function optimizeImageForOcr(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/avif') return file;
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 5 * 1024 * 1024) return file;

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return file;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob || blob.size >= file.size || blob.size > MAX_ITEM_BYTES) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}

function u16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function u32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

function findEndOfCentralDirectory(view: DataView): number {
  const minimum = Math.max(0, view.byteLength - 65_557);
  for (let offset = view.byteLength - 22; offset >= minimum; offset -= 1) {
    if (u32(view, offset) === 0x06054b50) return offset;
  }
  throw new Error('zip_directory_not_found');
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') throw new Error('zip_decompression_not_supported');
  const input = new Blob([bytes.slice().buffer]).stream();
  const output = input.pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(output).arrayBuffer());
}

interface ZipEntryMeta {
  name: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
  flags: number;
}

function parseZipEntries(buffer: ArrayBuffer): ZipEntryMeta[] {
  const view = new DataView(buffer);
  const eocd = findEndOfCentralDirectory(view);
  const entryCount = u16(view, eocd + 10);
  const centralDirectoryOffset = u32(view, eocd + 16);
  if (entryCount > MAX_ZIP_ITEMS) throw new Error('zip_too_many_files');

  const decoder = new TextDecoder('utf-8');
  const entries: ZipEntryMeta[] = [];
  let offset = centralDirectoryOffset;
  let totalUncompressed = 0;

  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > view.byteLength || u32(view, offset) !== 0x02014b50) throw new Error('zip_central_directory_invalid');
    const flags = u16(view, offset + 8);
    const method = u16(view, offset + 10);
    const compressedSize = u32(view, offset + 20);
    const uncompressedSize = u32(view, offset + 24);
    const fileNameLength = u16(view, offset + 28);
    const extraLength = u16(view, offset + 30);
    const commentLength = u16(view, offset + 32);
    const localHeaderOffset = u32(view, offset + 42);
    const nameBytes = new Uint8Array(buffer, offset + 46, fileNameLength);
    const name = decoder.decode(nameBytes);
    offset += 46 + fileNameLength + extraLength + commentLength;

    if (name.endsWith('/')) continue;
    if ((flags & 0x1) !== 0) throw new Error('zip_encrypted_files_not_supported');
    if (method !== 0 && method !== 8) throw new Error('zip_compression_not_supported');
    if (uncompressedSize > MAX_ITEM_BYTES) throw new Error('zip_file_too_large');
    totalUncompressed += uncompressedSize;
    if (totalUncompressed > MAX_ZIP_TOTAL_BYTES) throw new Error('zip_unpacked_size_too_large');
    if (!SUPPORTED_EXTENSIONS.has(extensionOf(name))) continue;

    entries.push({ name, method, compressedSize, uncompressedSize, localHeaderOffset, flags });
  }

  if (entries.length === 0) throw new Error('zip_has_no_supported_documents');
  return entries;
}

function safeBaseName(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  return normalized.split('/').filter(Boolean).pop()?.replace(/[\u0000-\u001f]/g, '') || 'document';
}

export async function extractSupportedFilesFromZip(zipFile: File): Promise<File[]> {
  if (zipFile.size > MAX_ZIP_TOTAL_BYTES) throw new Error('zip_file_too_large');
  const buffer = await zipFile.arrayBuffer();
  const view = new DataView(buffer);
  const entries = parseZipEntries(buffer);
  const files: File[] = [];

  for (const entry of entries) {
    const local = entry.localHeaderOffset;
    if (local + 30 > view.byteLength || u32(view, local) !== 0x04034b50) throw new Error('zip_local_header_invalid');
    const fileNameLength = u16(view, local + 26);
    const extraLength = u16(view, local + 28);
    const dataOffset = local + 30 + fileNameLength + extraLength;
    const dataEnd = dataOffset + entry.compressedSize;
    if (dataEnd > buffer.byteLength) throw new Error('zip_entry_out_of_bounds');

    const compressed = new Uint8Array(buffer, dataOffset, entry.compressedSize);
    const content = entry.method === 0 ? compressed.slice() : await inflateRaw(compressed);
    if (content.byteLength !== entry.uncompressedSize || content.byteLength > MAX_ITEM_BYTES) throw new Error('zip_entry_size_mismatch');

    files.push(new File([content.slice().buffer], safeBaseName(entry.name), {
      type: mimeForName(entry.name),
      lastModified: Date.now(),
    }));
  }
  return files;
}

export async function prepareDocumentFiles(files: File[]): Promise<File[]> {
  const prepared: File[] = [];
  for (const file of files) {
    if (!isSupportedDocument(file)) throw new Error(`unsupported_document:${file.name}`);
    prepared.push(file.type.startsWith('image/') ? await optimizeImageForOcr(file) : file);
  }
  return prepared;
}
