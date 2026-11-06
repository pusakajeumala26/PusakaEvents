import type { Metadata, Viewport } from 'next';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import { PwaRegister } from '@/components/PwaRegister';
import { Splash } from '@/components/Splash';
import { ToastProvider } from '@/components/ToastProvider';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'PusakaEvent', template: '%s · PusakaEvent' },
  description: 'Rekap kas leting Pusaka Jeumala dengan verifikasi struk.',
  applicationName: 'PusakaEvent',
  appleWebApp: { capable: true, title: 'PusakaEvent', statusBarStyle: 'default' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <ToastProvider>
          {children}
          <Splash />
          <PwaRegister />
        </ToastProvider>
      </body>
    </html>
  );
}
