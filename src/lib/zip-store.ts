import { Zip, ZipPassThrough } from 'fflate';

/** Build a ZIP in the browser while fflate emits the archive in incremental chunks. */
export function createZip(files: { name: string; data: string | Uint8Array }[]): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const chunks: ArrayBuffer[] = [];
    const zip = new Zip((error, chunk, final) => {
      if (error) { reject(error); return; }
      const copy = new Uint8Array(chunk.byteLength);
      copy.set(chunk);
      chunks.push(copy.buffer);
      if (final) resolve(new Blob(chunks, { type: 'application/zip' }));
    });
    try {
      for (const file of files) {
        const entry = new ZipPassThrough(file.name);
        zip.add(entry);
        entry.push(typeof file.data === 'string' ? new TextEncoder().encode(file.data) : file.data, true);
      }
      zip.end();
    } catch (error) { reject(error); }
  });
}
