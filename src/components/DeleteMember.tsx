'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api-client';
import { Ic } from './Ic';
import { Dialog } from './MemberForms';
import { useToast } from './ToastProvider';

export function DeleteMember({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const del = async () => {
    setBusy(true);
    try {
      await api(`/api/members/${id}`, { method: 'DELETE' });
      toast(`${name} dihapus.`);
      router.push('/');
      router.refresh();
    } catch (e) {
      toast((e as Error).message, 'error');
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className="btn ghost" onClick={() => setOpen(true)}><Ic n="i-x" />Hapus anggota</button>
      {open && (
        <Dialog
          title="Hapus anggota?"
          titleId="del-t"
          onClose={() => setOpen(false)}
          footer={
            <>
              <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Batal</button>
              <button type="button" className="btn pri" disabled={busy} onClick={del}>{busy ? 'Menghapus...' : 'Ya, hapus'}</button>
            </>
          }
        >
          <p className="sub">Data <b>{name}</b> beserta struknya akan dihapus permanen dan tidak bisa dikembalikan.</p>
        </Dialog>
      )}
    </>
  );
}
