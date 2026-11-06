import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminGate } from '@/components/AdminGate';
import { PageHeader } from '@/components/AppShell';
import { DeleteMember } from '@/components/DeleteMember';
import { StatusChip } from '@/components/HomeView';
import { Ic } from '@/components/Ic';
import { ReviewPanel } from '@/components/ReviewPanel';
import { isAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDateTime, initials, whatsappLink } from '@/lib/format';
import { toEventView, toView } from '@/lib/members';
import { getSettings } from '@/lib/settings';
import type { EventType } from '@/lib/types';

export const metadata: Metadata = { title: 'Detail Anggota' };

const TL: Record<EventType, { label: string; cls: string; icon: string }> = {
  DAFTAR: { label: 'Mendaftar & upload struk', cls: 'ok', icon: 'i-upload' },
  IMPOR: { label: 'Ditambahkan admin (impor)', cls: 'pe', icon: 'i-plus' },
  UPLOAD: { label: 'Mengunggah struk', cls: 'pe', icon: 'i-upload' },
  KIRIM_ULANG: { label: 'Mengirim ulang struk', cls: 'pe', icon: 'i-upload' },
  DISETUJUI: { label: 'Struk disetujui', cls: 'ok', icon: 'i-check' },
  DITOLAK: { label: 'Struk ditolak', cls: 'rj', icon: 'i-x' },
};

export default async function DetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return <AdminGate title="Detail anggota" />;
  const { id } = await params;
  const [m, settings] = await Promise.all([
    db.member.findUnique({ where: { id }, include: { events: { orderBy: { createdAt: 'desc' } } } }),
    getSettings(),
  ]);
  if (!m) notFound();
  const view = toView(m, true);
  const events = m.events.map(toEventView);

  return (
    <>
      <PageHeader title="Detail anggota" sub="Data, struk, dan riwayat verifikasi" mobileSub="Data, struk, riwayat" admin />
      <div className="content">
        <Link className="back" href="/"><Ic n="i-back" />Kembali</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="av lg2">{initials(m.name)}</span>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 22, letterSpacing: '-.02em', fontWeight: 650, overflowWrap: 'anywhere' }}>{m.name}</h2>
            <div style={{ marginTop: 8 }}><StatusChip status={m.status} /></div>
          </div>
        </div>
        {m.status === 'DITOLAK' && (
          <>
            <div className="note" role="note"><Ic n="i-alert" /><div><b>Alasan penolakan</b><br />{m.rejectReason}</div></div>
            <a className="btn pri" style={{ alignSelf: 'flex-start' }} href={whatsappLink(m.countryCode, m.phone, `Halo ${m.name.split(' ')[0]}, struk kas kamu belum bisa disetujui: ${(m.rejectReason ?? '').replace(/[.\s]+$/, '').replace(/^./, (c) => c.toLowerCase())}. Mohon kirim ulang lewat PusakaEvent.`)} target="_blank" rel="noopener noreferrer">
              <Ic n="i-chat" />Kirim notifikasi WhatsApp
            </a>
          </>
        )}
        <div className="dgrid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
            <section className="card"><h2>Data anggota</h2>
              <dl className="kv">
                <dt>Nama</dt><dd>{m.name}</dd>
                <dt>No. HP / WA</dt><dd className="num">{view.phoneDisplay}</dd>
                <dt>Gender</dt><dd>{m.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</dd>
                <dt>Subjek</dt><dd>{m.subject || '-'}</dd>
                <dt>Struk diunggah</dt><dd className="num">{m.receiptAt ? formatDateTime(m.receiptAt.toISOString()) : 'Belum'}</dd>
                <dt>Akses anggota</dt><dd>{m.passwordHash ? 'Punya password' : 'Belum membuat password (impor admin)'}</dd>
              </dl>
            </section>
            <section className="card"><h2>Riwayat</h2>
              <ol className="tl">
                {events.map((e) => {
                  const t = TL[e.type];
                  return (
                    <li key={e.id}>
                      <span className={`pt ${t.cls}`}><Ic n={t.icon} size={15} /></span>
                      <div><b>{t.label}</b>{e.note && e.type === 'DITOLAK' && <span className="d" style={{ display: 'block' }}>{e.note}</span>}<span className="d num">{formatDateTime(e.createdAt)}</span></div>
                    </li>
                  );
                })}
              </ol>
            </section>
            <div><DeleteMember id={m.id} name={m.name} /></div>
          </div>
          {m.receiptKey ? (
            <ReviewPanel member={view} amount={settings.amount} sub={`${view.phoneDisplay}`} />
          ) : (
            <section className="card"><h2>Struk transfer</h2>
              <div className="rcpt"><Ic n="i-image" size={36} />Belum ada struk</div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
