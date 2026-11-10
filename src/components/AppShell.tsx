'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api-client';
import { useDialog } from '@/lib/use-dialog';
import { Ic } from './Ic';
import { InstallButton } from './InstallButton';
import { useToast } from './ToastProvider';
import { AdminSessionGuard } from './AdminSessionGuard';
import { ContactsModal } from './ContactsModal';

const MenuCtx = createContext<() => void>(() => {});

type NavItem = { href: string; label: string; icon: string; admin?: boolean; badge?: number; action?: 'contacts' };

export function AppShell({
  admin, pending, letingName, children,
}: {
  admin: boolean;
  pending: number;
  letingName: string;
  children: ReactNode;
}) {
  const path = usePathname();
  const [menuPhase, setMenuPhase] = useState<'closed' | 'opening' | 'open' | 'closing'>('closed');
  const [contactsOpen, setContactsOpen] = useState(false);

  const openMenu = () => setMenuPhase('opening');
  const closeMenu = () => setMenuPhase((phase) => phase === 'closed' ? phase : 'closing');
  const showContacts = () => {
    if (menuPhase !== 'closed') {
      closeMenu();
      window.setTimeout(() => setContactsOpen(true), 270);
    } else {
      setContactsOpen(true);
    }
  };

  useEffect(() => {
    if (menuPhase === 'opening') {
      const frame = requestAnimationFrame(() => setMenuPhase('open'));
      return () => cancelAnimationFrame(frame);
    }
    if (menuPhase === 'closing') {
      const timer = window.setTimeout(() => setMenuPhase('closed'), 260);
      return () => window.clearTimeout(timer);
    }
  }, [menuPhase]);

  useEffect(() => {
    setMenuPhase((phase) => phase === 'closed' ? phase : 'closing');
  }, [path]);

  const items: NavItem[] = [
    { href: '/', label: 'Beranda', icon: 'i-home' },
    { href: '/anggota', label: 'Data anggota', icon: 'i-user' },
    { href: '/masukan', label: 'Kirim masukan', icon: 'i-chat' },
    { href: '#contacts', label: 'Hubungi pengurus', icon: 'i-chat', action: 'contacts' },
    { href: '/verifikasi', label: 'Verifikasi Struk', icon: 'i-shield', admin: true, badge: admin ? pending : 0 },
    { href: '/rekap', label: 'Rekap Kas', icon: 'i-wallet', admin: true },
    { href: '/pengaturan', label: 'Pengaturan', icon: 'i-sliders', admin: true },
  ];

  return (
    <MenuCtx.Provider value={openMenu}>
      <div className="dj">
        <div className="app">
          <aside className="side">
            <Brand letingName={letingName} />
            <Nav items={items} admin={admin} path={path} onContacts={showContacts} />
            <Foot admin={admin} />
          </aside>
          <div className="main route-enter" key={path}>{children}</div>
        </div>
        {menuPhase !== 'closed' && (
          <Drawer
            items={items}
            admin={admin}
            path={path}
            letingName={letingName}
            open={menuPhase === 'open'}
            onClose={closeMenu}
            onContacts={showContacts}
          />
        )}
        {contactsOpen && <ContactsModal onClose={() => setContactsOpen(false)} />}
        {admin && <AdminSessionGuard />}
      </div>
    </MenuCtx.Provider>
  );
}

function Brand({ letingName }: { letingName: string }) {
  return (
    <div className="brand">
      <img className="logo" src="/brand/logo.webp?v=3" alt="" width={44} height={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <b>PusakaEvent</b>
        <span className="s">Leting {letingName}</span>
      </div>
    </div>
  );
}

function Nav({ items, admin, path, onContacts }: { items: NavItem[]; admin: boolean; path: string; onContacts: () => void }) {
  const on = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
  const content = (it: NavItem) => (
    <>
      <Ic n={it.icon} />
      {it.label}
      {!!it.badge && <span className="cnt" aria-label={`${it.badge} menunggu`}>{it.badge}</span>}
      {it.admin && !admin && (
        <span className="lk"><Ic n="i-lock" size={16} /><span className="sr"> (khusus admin)</span></span>
      )}
    </>
  );
  const link = (it: NavItem) => it.action === 'contacts' ? (
    <button key={it.href} type="button" className="nav nav-action" onClick={onContacts}>{content(it)}</button>
  ) : (
    <Link key={it.href} className={`nav${on(it.href) ? ' on' : ''}`} href={it.href} aria-current={on(it.href) ? 'page' : undefined}>
      {content(it)}
    </Link>
  );
  return (
    <>
      <nav className="ng" aria-label="Umum">
        <div className="cap">Umum</div>
        {items.filter((i) => !i.admin).map(link)}
      </nav>
      <nav className="ng" aria-label="Admin">
        <div className="cap">Admin</div>
        {items.filter((i) => i.admin).map(link)}
      </nav>
    </>
  );
}

function Foot({ admin }: { admin: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const logout = async () => {
    try {
      await api('/api/admin/logout', { method: 'POST' });
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel('pusakaevent-admin-session');
        channel.postMessage({ type: 'logout' });
        channel.close();
      }
      router.push('/');
      router.refresh();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  return (
    <div className="foot">
      <InstallButton />
      {admin ? (
        <>
          <div className="adm"><span className="dot" aria-hidden="true" />Mode admin aktif</div>
          <button type="button" className="btn ghost blk" onClick={logout}><Ic n="i-lock" />Keluar admin</button>
        </>
      ) : (
        <Link className="btn ghost blk" href="/verifikasi"><Ic n="i-lock" />Masuk admin</Link>
      )}
    </div>
  );
}

function Drawer({
  items, admin, path, letingName, open, onClose, onContacts,
}: {
  items: NavItem[];
  admin: boolean;
  path: string;
  letingName: string;
  open: boolean;
  onClose: () => void;
  onContacts: () => void;
}) {
  const ref = useDialog<HTMLElement>(onClose);
  return (
    <div className={`scrim l${open ? ' is-open' : ''}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <nav className="drawer" aria-label="Menu utama" ref={ref} tabIndex={-1}>
        <div className="brand">
          <img className="logo" src="/brand/logo.webp?v=3" alt="" width={44} height={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>PusakaEvent</b>
            <span className="s">Leting {letingName}</span>
          </div>
          <button type="button" className="ib ol" aria-label="Tutup menu" onClick={onClose}><Ic n="i-x" /></button>
        </div>
        <Nav items={items} admin={admin} path={path} onContacts={onContacts} />
        <Foot admin={admin} />
      </nav>
    </div>
  );
}

/** Judul halaman: header desktop + bilah atas mobile (dengan tombol menu). */
export function PageHeader({ title, sub, mobileSub, admin }: { title: string; sub: string; mobileSub?: string; admin?: boolean }) {
  const open = useContext(MenuCtx);
  return (
    <>
      <header className="top-m">
        <img className="logo" src="/brand/logo.webp?v=3" alt="" width={44} height={44} />
        <div className="tt"><h1>{title}</h1><div className="sub">{mobileSub ?? sub}</div></div>
        <button type="button" className="ib" aria-label="Buka menu" onClick={open}><Ic n="i-menu" /></button>
      </header>
      <header className="top-d">
        <div className="tt"><h1>{title}</h1><div className="sub">{sub}</div></div>
        {admin && <span className="badge"><span className="dot" aria-hidden="true" />Admin</span>}
      </header>
    </>
  );
}
