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
  icons: {
    icon: [
      { url: '/icons/favicon.ico?v=3', sizes: '16x16 32x32 48x48', type: 'image/x-icon' },
      { url: '/icons/icon-32.png?v=3', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png?v=3', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png?v=3', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png?v=3',
  },
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
