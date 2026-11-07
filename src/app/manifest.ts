import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'PusakaEvent',
    short_name: 'PusakaEvent',
    description: 'Rekap kas leting Pusaka Jeumala dengan verifikasi struk.',
    lang: 'id',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    categories: ['finance', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png?v=3', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png?v=3', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/apple-touch-icon.png?v=3', sizes: '180x180', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png?v=3', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      {
        name: 'Upload struk',
        short_name: 'Upload',
        description: 'Langsung buka form upload',
        url: '/?upload=1',
        icons: [{ src: '/icons/icon-192.png?v=3', sizes: '192x192', type: 'image/png' }],
      },
    ],
  };
}
