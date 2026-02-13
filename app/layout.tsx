import type { Metadata, Viewport } from 'next';
import { PWARegister } from '@/app/pwa-register';
import './globals.css';

const themeInitScript = `
(() => {
  const storageKey = 'scores-recorder:theme';

  try {
    const storedTheme = window.localStorage.getItem(storageKey);
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
    const theme = storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : systemTheme;
    document.documentElement.dataset.theme = theme;
  } catch {
    document.documentElement.dataset.theme = 'light';
  }
})();
`;

export const metadata: Metadata = {
  title: 'Scores Recorder',
  description: 'Anota puntajes de partidas y lleva el historial de rondas.',
  applicationName: 'Scores Recorder',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Scores Recorder'
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0f766e' },
    { media: '(prefers-color-scheme: dark)', color: '#0d121a' }
  ]
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
