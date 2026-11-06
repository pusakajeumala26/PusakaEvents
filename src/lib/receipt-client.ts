import { MAX_INPUT_BYTES, MAX_RECEIPT_BYTES, MAX_RECEIPT_SIDE } from './constants';

/**
 * Baca foto struk di browser, perkecil, lalu ubah ke WebP sebelum dikirim.
 * Hasilnya jauh lebih kecil sehingga muat di batas body request serverless.
 */
export async function compressReceipt(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('Struk harus berupa gambar (JPG, PNG, atau WebP).');
  if (file.size > MAX_INPUT_BYTES) throw new Error(`Ukuran file ${prettySize(file.size)}, maksimal 10 MB. Pilih file lain.`);

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    try {
      await img.decode();
    } catch {
      throw new Error('Gambar tidak bisa dibuka. Gunakan JPG, PNG, atau WebP.');
    }
    // <img> + drawImage menghormati orientasi EXIF di browser modern.
    const scale = Math.min(1, MAX_RECEIPT_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    let w = Math.max(1, Math.round(img.naturalWidth * scale));
    let h = Math.max(1, Math.round(img.naturalHeight * scale));
    let q = 0.85;
    for (let attempt = 0; attempt < 5; attempt++) {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Browser tidak mendukung pemrosesan gambar.');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', q));
      if (!blob) throw new Error('Gagal mengubah gambar ke WebP.');
      if (blob.size <= MAX_RECEIPT_BYTES) {
        const base = file.name.replace(/\.[^.]+$/, '') || 'struk';
        return new File([blob], `${base}.webp`, { type: 'image/webp' });
      }
      w = Math.round(w * 0.8);
      h = Math.round(h * 0.8);
      q = Math.max(0.7, q - 0.05);
    }
    throw new Error('Gambar masih terlalu besar setelah dikompres. Pilih foto lain.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const prettySize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
