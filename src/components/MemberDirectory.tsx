'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from './AppShell';
import { MemberCard } from './HomeView';
import { Ic } from './Ic';
import { Select } from './Select';
import type { MemberView } from '@/lib/types';

const FILTERS = [
  { value: 'ALL', label: 'Semua status' },
  { value: 'TERVERIFIKASI', label: 'Terverifikasi' },
  { value: 'MENUNGGU', label: 'Menunggu' },
  { value: 'DITOLAK', label: 'Ditolak' },
  { value: 'BELUM', label: 'Belum input' },
] as const;

export function MemberDirectory({ members, admin, unavailable = false }: {
  members: MemberView[];
  admin: boolean;
  unavailable?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string>('ALL');
  const shown = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return members.filter((member) =>
      (filter === 'ALL' || member.status === filter) &&
      (!normalized || member.name.toLocaleLowerCase().includes(normalized)),
    );
  }, [filter, members, query]);

  return (
    <>
      <PageHeader title="Data anggota" sub="Daftar lengkap anggota dan status struk" mobileSub="Daftar lengkap anggota" admin={admin} />
      <div className="content">
        {unavailable && <div className="empty" role="alert"><b>Data anggota belum dapat dimuat.</b><p>Periksa koneksi database lalu muat ulang halaman.</p></div>}
        <div className="tools">
          <div className="search">
            <Ic n="i-search" />
            <label className="lbl sr" htmlFor="member-search">Cari anggota</label>
            <input className="inp" id="member-search" type="search" placeholder="Cari nama anggota" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <Select ariaLabel="Filter status" value={filter} options={FILTERS} onChange={setFilter} align="right" menuWidth={210} className="tools-sel" />
        </div>
        {shown.length === 0 ? (
          <section className="empty" aria-live="polite">
            <Ic n="i-search" size={32} />
            <h2>{members.length === 0 ? 'Belum ada anggota' : 'Anggota tidak ditemukan'}</h2>
            <p className="sub">{members.length === 0 ? 'Belum ada anggota yang terdaftar.' : 'Coba ubah nama atau filter status.'}</p>
            {(query || filter !== 'ALL') && <button type="button" className="btn ghost" onClick={() => { setQuery(''); setFilter('ALL'); }}>Hapus pencarian</button>}
          </section>
        ) : (
          <section className="list" aria-label="Daftar anggota">
            {shown.map((member) => <MemberCard key={member.id} m={member} admin={admin} />)}
          </section>
        )}
      </div>
    </>
  );
}
