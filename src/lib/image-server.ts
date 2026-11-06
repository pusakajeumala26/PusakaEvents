import sharp from 'sharp';
import { MAX_RECEIPT_BYTES, MAX_RECEIPT_SIDE } from './constants';
import { HttpError } from './http';

/**
 * Pastikan struk dari browser benar-benar gambar dan berformat WebP.
 * Browser normalnya sudah mengirim WebP terkompres (src/lib/receipt-client.ts); jika tidak,
 * server mengubahnya di sini (juga menghormati orientasi EXIF dan membuang metadata).
 */
export async function normalizeReceipt(value: FormDataEntryValue | null): Promise<Buffer> {
  if (!(value instanceof File) || value.size === 0) throw new HttpError(422, 'Struk transfer wajib diunggah.');
  if (value.size > MAX_RECEIPT_BYTES) throw new HttpError(413, 'Struk terlalu besar (maks. 4 MB setelah dikompres).');

  const input = Buffer.from(await value.arrayBuffer());
  const opts = { failOn: 'error' as const, limitInputPixels: 40_000_000 };

  let meta: sharp.Metadata;
  try {
    meta = await sharp(input, opts).metadata();
  } catch {
    throw new HttpError(422, 'Struk bukan gambar yang valid. Gunakan JPG, PNG, atau WebP.');
  }
  if (!meta.width || !meta.height) throw new HttpError(422, 'Struk bukan gambar yang valid.');
  if ((meta.pages ?? 1) > 1) throw new HttpError(422, 'Struk tidak boleh animasi.');

  try {
    return await sharp(input, opts)
      .rotate()
      .resize({ width: MAX_RECEIPT_SIDE, height: MAX_RECEIPT_SIDE * 3, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new HttpError(422, 'Struk tidak bisa diproses.');
  }
}
