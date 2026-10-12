import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app';
import { openDb } from './db';

const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 3001);
const dbFile = process.env.FARM_DB ?? path.resolve(here, '../../data/farm.db');
const allEvents = process.env.FARM_ALL_EVENTS === '1';

const db = openDb(dbFile);
const app = createApp(db, { allEvents });

// In production, serve the built client from the same origin.
const clientDist = path.resolve(here, '../../client/dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist, { maxAge: '1h', index: 'index.html' }));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.listen(port, () => {
  console.log(`🌻 Farm server listening on http://localhost:${port} (db: ${dbFile}${allEvents ? ', all events on' : ''})`);
});
