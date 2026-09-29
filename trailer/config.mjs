// Pfade des Trailer-Projekts. Alles Große (Bilder, Töne) liegt außerhalb des Repos.
//
//   ZT_GAME  Arbeitskopie des Spiels (Branch mit dem Spielcode, siehe README.md)
//   ZT_WORK  Arbeitsordner für aufgenommene Bilder, Ton und Zwischenstände
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const TRAILER = HERE;
export const GAME_DIR = resolve(process.env.ZT_GAME || resolve(HERE, '../../zomfy-towers-game'));
export const WORK = resolve(process.env.ZT_WORK || resolve(HERE, '../.work'));
export const FRAMES = resolve(WORK, 'frames'); // aufgenommenes Gameplay: frames/<clip>/0000.png
export const AUDIO = resolve(WORK, 'audio');
export const RENDER = resolve(WORK, 'render');
export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION = 60; // Sekunden
export const FFMPEG = process.env.ZT_FFMPEG || 'ffmpeg';
