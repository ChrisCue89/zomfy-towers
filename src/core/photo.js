// K1: Der Fotomodus (aus dem Pausenmenü). Die Uhr steht, die Welt lebt weiter (Wasser, Wind, Feuer,
// die Leute bei der Arbeit), die Oberfläche ist weg bis auf eine Hinweiszeile. WASD schiebt den
// Blickpunkt (in den Grenzen der Kamera, drinnen im Raum), Z geht nah heran und zurück, E nimmt das
// Bild auf, Esc kehrt ins Spiel zurück.
//
// Aufgenommen wird das fertige Bild der Nachbearbeitung in Spielauflösung (`pixel.postTarget`,
// pixelgenau, ohne Oberfläche) – asynchron gelesen (kein Anhalten der Grafikkarte, CLAUDE.md
// Regel 5), ganzzahlig vergrößert und mit Regen und Schnee der Oberfläche darüber als PNG.

import * as THREE from 'three';
import { T } from '../data/texts.js';
import { COLORS } from '../ui/ui.js';
import { hoursOf } from './state.js';

/** Tempo des Blickpunkts (m/s, nah halb so schnell), Mindesthöhe des Bildes (px), Blitz (s). */
export const PHOTO = { speed: 7, nearFactor: 0.5, minHeight: 1080, flash: 0.18 };

export class Photo {
  constructor(game) {
    this.game = game;
    this.focus = new THREE.Vector3();
    this.pending = false; // im nächsten Bild aufnehmen (ohne Hinweiszeile)
    this.busy = false; // das Lesen läuft
    this.flash = 0;
    this.note = null; // { text, t } – gespeichert oder Fehler
    this.saved = 0; // Prüfung: Zahl der Bilder
    this.last = null; // Prüfung: { name, width, height, scale }
  }

  /** Aus dem Pausenmenü: der Blickpunkt beginnt dort, wohin die Kamera gerade schaut. */
  start() {
    const g = this.game;
    g.menu.close();
    g.mode = 'foto';
    const off = g.rig.cfg.focusOffsetZ || 0;
    this.focus.set(g.rig.focus.x, 0, g.rig.focus.z - off);
    this.note = null;
    g.sound.play('klick');
  }

  stop() {
    this.game.mode = 'play';
    this.note = null;
  }

  update(input, dt) {
    const g = this.game;
    this.flash = Math.max(0, this.flash - dt);
    if (this.note) this.note.t -= dt;
    if (input.pressed('menu')) {
      this.stop();
      return;
    }
    if (input.pressed('zoom') && !g.viewInside) g.applySettings({ view: g.view === 'weit' ? 'nah' : 'weit' });
    const m = input.moveVector();
    if (m.x || m.z) {
      const speed = PHOTO.speed * (g.view === 'nah' || g.viewInside ? PHOTO.nearFactor : 1) * dt;
      const len = Math.hypot(m.x, m.z);
      this.focus.x += (m.x / len) * speed;
      this.focus.z += (m.z / len) * speed;
      // In den Grenzen der Kamera bleiben (wie ihr eigener Blickpunkt)
      const off = g.rig.cfg.focusOffsetZ || 0;
      const p = { x: this.focus.x, z: this.focus.z + off };
      g.rig.clampFocus(p);
      this.focus.x = p.x;
      this.focus.z = p.z - off;
    }
    if (input.pressed('use') && !this.busy) this.pending = true;
  }

  /** Nach dem Bild der Welt: aufnehmen (ohne Hinweis), dann Hinweis, Blitz und Meldung zeichnen. */
  draw(ui) {
    if (this.pending) {
      this.pending = false;
      this.capture(ui);
    }
    if (this.flash > 0) ui.ditherFill(Math.min(1, (this.flash / PHOTO.flash) * 0.9), COLORS.text);
    const text = this.note && this.note.t > 0 ? this.note.text : T.foto.hinweis;
    ui.textCentered(text, Math.round(ui.width / 2), ui.height - 16, this.note && this.note.t > 0 ? COLORS.gold : COLORS.textWarm, { outline: COLORS.outline });
  }

  /**
   * Das Bild aufnehmen: das Ziel der Nachbearbeitung asynchron lesen (es gilt, bis das nächste Bild
   * gezeichnet wird), die Oberfläche dieses Bildes (Regen, Schnee) gleich mitnehmen.
   */
  capture(ui) {
    const g = this.game;
    const target = g.pixel.postTarget;
    if (!target || this.busy) return;
    const w = target.width;
    const h = target.height;
    const scale = Math.max(1, Math.ceil(PHOTO.minHeight / h));
    const layer = document.createElement('canvas');
    layer.width = ui.canvas.width;
    layer.height = ui.canvas.height;
    layer.getContext('2d').drawImage(ui.canvas, 0, 0);
    const buffer = new Uint8Array(w * h * 4);
    this.busy = true;
    this.flash = PHOTO.flash;
    g.sound.play('klick');
    g.pixel.renderer
      .readRenderTargetPixelsAsync(target, 0, 0, w, h, buffer)
      .then(() => this.save(buffer, w, h, scale, layer))
      .catch(() => {
        this.busy = false;
        this.note = { text: T.foto.fehler, t: 3 };
      });
  }

  /** Zeilen umdrehen (die Grafikkarte zählt von unten), vergrößern, Regen darüber, als PNG laden. */
  save(buffer, w, h, scale, layer) {
    const g = this.game;
    const small = document.createElement('canvas');
    small.width = w;
    small.height = h;
    const sctx = small.getContext('2d');
    const img = sctx.createImageData(w, h);
    const row = w * 4;
    for (let y = 0; y < h; y++) img.data.set(buffer.subarray((h - 1 - y) * row, (h - y) * row), y * row);
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255; // die Kennung der Menschen (Alpha 0,5) ist kein Durchsehen
    sctx.putImageData(img, 0, 0);
    const big = document.createElement('canvas');
    big.width = w * scale;
    big.height = h * scale;
    const ctx = big.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(small, 0, 0, big.width, big.height);
    ctx.drawImage(layer, 0, 0, big.width, big.height);
    const st = g.state;
    const minute = Math.round(hoursOf(st.time.minute) * 60) % (24 * 60);
    const name = `zomfy-towers-tag${st.time.day}-${String(Math.floor(minute / 60)).padStart(2, '0')}${String(minute % 60).padStart(2, '0')}.png`;
    big.toBlob((blob) => {
      this.busy = false;
      if (!blob) {
        this.note = { text: T.foto.fehler, t: 3 };
        return;
      }
      try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        this.saved++;
        this.last = { name, width: big.width, height: big.height, scale };
        this.note = { text: T.foto.gespeichert(name), t: 3 };
      } catch {
        this.note = { text: T.foto.fehler, t: 3 };
      }
    }, 'image/png');
  }
}
