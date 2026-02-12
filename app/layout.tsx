import type { Metadata, Viewport } from 'next';
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
  description: 'Anota puntajes de partidas y lleva el historial de rondas.'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
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
        {children}
      </body>
    </html>
  );
}
