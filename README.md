# Scores Recorder

Aplicación web para registrar puntajes de partidas (cartas y juegos similares), pensada para desplegar en Vercel sin costo.

## Stack

- Next.js (App Router)
- TypeScript
- Persistencia inicial en `localStorage`

## Features incluidas

- Crear partida con nombre opcional.
- Alta de jugadores con nombre y color opcional.
- Sugerencias de jugadores recientes (selección con click/tap).
- Vista de partida con totales por jugador.
- Carga de puntajes por ronda en dos modos:
  - `Sumar`: agrega valor al total actual.
  - `Fijar total`: establece el total directamente.
- Conteo de rondas.
- Finalizar partida.
- Home con listas separadas de partidas abiertas y terminadas.

## Arquitectura para futuro backend

La app usa un contrato de repositorio (`lib/storage/repository.ts`) y hoy implementa `LocalStorageGameRepository`.

Cuando quieras migrar a DB/Redis:

1. Crear una nueva implementación del repositorio (por ejemplo `CloudGameRepository`).
2. Cambiar la fábrica en `lib/storage/index.ts` para devolver esa implementación.
3. Mantener UI y lógica de pantallas sin cambios.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Deploy en Vercel

1. Sube el repo a GitHub/GitLab/Bitbucket.
2. Importa el proyecto en Vercel.
3. Framework detectado: Next.js.
4. Deploy.

No se requieren servicios externos para esta versión.
