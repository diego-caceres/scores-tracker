import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Scores Recorder',
    short_name: 'Scores',
    description: 'Anota puntajes de partidas y lleva el historial de rondas.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d121a',
    theme_color: '#0f766e',
    lang: 'es-AR',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml'
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png'
      }
    ]
  };
}
