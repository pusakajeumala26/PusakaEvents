'use client';

/** fetch JSON dengan pesan error berbahasa Indonesia dari server ({ error }). */
export async function api<T = Record<string, unknown>>(url: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error('Tidak ada koneksi internet. Coba lagi setelah tersambung.');
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* body kosong / bukan JSON */
  }
  if (!res.ok) {
    const body = data as { error?: string; code?: string } | null;
    const failure = new Error(body?.error || (res.status === 413 ? 'File terlalu besar.' : 'Terjadi kesalahan. Coba lagi.')) as Error & { code?: string };
    failure.code = body?.code;
    throw failure;
  }
  return data as T;
}

export const postJson = <T = Record<string, unknown>>(url: string, body: unknown) =>
  api<T>(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      try {
        ta.select();
        return document.execCommand('copy');
      } finally { ta.remove(); }
    } catch {
      return false;
    }
  }
}
