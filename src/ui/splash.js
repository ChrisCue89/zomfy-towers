// Startbild (N2, seit N11 von selbst): »Tales of Cue präsentiert« in Pixelschrift über einem
// offenen Buch, auf dem eine warme Laterne steht, dazu fallendes Laub. Wie ein Studio-Logo in
// einem fertigen Spiel läuft es ohne Zutun (recherche/praesentation.md): aus dem Dunkel
// einblenden, kurz stehen, ausblenden – beim ersten Mal rund dreieinhalb Sekunden, danach
// kürzer –, und jede Taste oder ein Klick springt sofort ins Titelbild.
// Klang darf erst nach einer echten Eingabe beginnen (CLAUDE.md, Regel 5). Hatte die Seite schon
// eine (der Browser erlaubt dann Klang), spielt zum Schriftzug die Spieluhr; sonst bleibt das Bild
// still, und die Titelmusik beginnt mit der ersten Taste im Titelbild.
// Alles im Code gezeichnet, keine fremden Assets. Tasten werden in update() ausgewertet.

import { T } from '../data/texts.js';
import { P, hexToCss } from '../render/palette.js';
import { COLORS } from './ui.js';
import { measure, drawText } from './font.js';
import { BAYER } from './bayer.js';

/**
 * Ablauf in Sekunden: einblenden, der Glanz (Laterne flammt auf, Funken, Glanz über dem
 * Schriftzug, die Spieluhr) kurz danach, stehen, ausblenden. Beim zweiten Mal in diesem Browser
 * die kurze Fassung (Spielekonsolen zeigen Studio-Logos nach dem ersten Mal gar nicht mehr).
 */
const TIMING = {
  lang: { fadeIn: 0.7, glow: 0.45, hold: 2.9, fadeOut: 0.6 },
  kurz: { fadeIn: 0.35, glow: 0.2, hold: 1.2, fadeOut: 0.4 },
};
const SKIP_FADE = 0.25; // eine Taste überspringt: kurz ausblenden
const SEEN_KEY = 'zomfy-towers.startbild'; // schon einmal gesehen (eigener Schlüssel, nicht im Spielstand)
const LOGO_SCALE = 3;
const LEAVES = 16;
const LEAF_COLORS = [P.f2, P.f3, P.f4, P.f5, P.e6, P.f4];

const css = (hex) => hexToCss(hex);

/** Offenes Buch (Pixelbild): Seiten wölben sich zum Rücken hin, darauf Zeilen und ein kleiner Kürbis. */
function bookCanvas() {
  const W = 78;
  const H = 34;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const px = (x, y, hex) => {
    ctx.fillStyle = css(hex);
    ctx.fillRect(x, y, 1, 1);
  };
  const mid = (W - 1) / 2;
  // Seitenober- und -unterkante: am Rücken tiefer (das Buch liegt offen)
  const top = (x) => 5 + Math.round(4 * (1 - Math.abs(x - mid) / mid) ** 2);
  const bottom = (x) => 26 + Math.round(2 * (1 - Math.abs(x - mid) / mid) ** 2);
  for (let x = 1; x < W - 1; x++) {
    const d = Math.abs(x - mid) / mid;
    const t = top(x);
    const b = bottom(x);
    for (let y = t; y <= b; y++) px(x, y, d < 0.07 ? P.s7 : d < 0.16 ? P.s8 : P.s9);
    // Seitenkanten (gestapelte Blätter) und der Einband darunter
    px(x, b + 1, P.s7);
    px(x, b + 2, P.s6);
    px(x, b + 3, P.e3);
    px(x, b + 4, P.e2);
    px(x, t - 1, d < 0.07 ? P.s6 : P.s7); // Schatten der oberen Kante
  }
  // Einband schaut links und rechts heraus
  for (let y = top(1) - 1; y <= bottom(1) + 4; y++) {
    px(0, y, P.e2);
    px(W - 1, y, P.e2);
  }
  // Buchrücken
  for (let y = top(mid); y <= bottom(mid) + 2; y++) {
    px(Math.floor(mid), y, P.s6);
    px(Math.ceil(mid), y, P.s7);
  }
  // Zeilen: links durchgehend Text, rechts ein Bild (Kürbis) mit Text darunter
  const line = (x0, x1, y0, seed) => {
    for (let x = x0; x <= x1; x++) {
      const gap = (x * 7 + seed * 13) % 11 === 0 || (x * 3 + seed) % 17 === 0;
      if (!gap) px(x, y0 + top(x) - 5, P.s5);
    }
  };
  for (let k = 0; k < 6; k++) line(5 + (k === 0 ? 3 : 0), 34 - (k === 5 ? 9 : 0), 9 + k * 3, k);
  for (let k = 0; k < 2; k++) line(43, 72 - (k === 1 ? 12 : 0), 21 + k * 3, k + 7);
  // Kürbis auf der rechten Seite
  const kx = 55;
  const ky = 9;
  const pumpkin = [
    '..g..',
    '.ooo.',
    'oOoOo',
    'oOoOo',
    '.ooo.',
  ];
  pumpkin.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === 'o') px(kx + x, ky + y + top(kx + x) - 5, P.f4);
      else if (ch === 'O') px(kx + x, ky + y + top(kx + x) - 5, P.f3);
      else if (ch === 'g') px(kx + x, ky + y + top(kx + x) - 5, P.g5);
    }),
  );
  return c;
}

/** Kleine Laterne (Pixelbild), die auf dem Buchrücken steht; das Glas leuchtet. */
function lanternCanvas(bright) {
  const rows = [
    '...sss...',
    '..s...s..',
    '..s...s..',
    'eeeeeeeee',
    '.eGGGGGe.',
    '.eGGFGGe.',
    '.eGFFFGe.',
    '.eGFFFGe.',
    '.eGGGGGe.',
    'eeeeeeeee',
    '..eeeee..',
  ];
  const c = document.createElement('canvas');
  c.width = rows[0].length;
  c.height = rows.length;
  const ctx = c.getContext('2d');
  const col = { s: P.s6, e: P.e2, G: bright ? P.f7 : P.f6, F: bright ? P.f8 : P.f7 };
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (!col[ch]) return;
      ctx.fillStyle = css(col[ch]);
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  return c;
}

/**
 * Runder, gerasterter Lichtschein (Bayer-Muster, wie die Durchsicht in der Welt):
 * innen dichter und gelber, außen dünner und röter. Je Radius einmal gezeichnet.
 */
const GLOWS = new Map();
function glowCanvas(r) {
  if (GLOWS.has(r)) return GLOWS.get(r);
  const w = r * 2 + 1;
  const h = Math.round(r * 1.5) * 2 + 1;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const inner = css(P.f5);
  const outer = css(P.f3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - r) / r;
      const dy = (y - (h - 1) / 2) / (r * 1.5);
      const d = Math.hypot(dx, dy);
      if (d >= 1) continue;
      const amount = 0.5 * (1 - d) ** 1.6;
      if (BAYER[(y % 4) * 4 + (x % 4)] >= amount * 16) continue;
      ctx.fillStyle = d < 0.35 ? inner : outer;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  GLOWS.set(r, c);
  return c;
}

function textCanvas(text, color) {
  const w = measure(text) + 4;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = 14;
  drawText(c.getContext('2d'), text, 2, 1, color, { outline: COLORS.outline });
  return c;
}

/** Schon einmal gesehen? (Speicher gesperrt: wie beim ersten Mal) */
function seenBefore() {
  try {
    return globalThis.localStorage?.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    globalThis.localStorage?.setItem(SEEN_KEY, '1');
  } catch {
    // privates Fenster: dann eben jedes Mal die lange Fassung
  }
}

export class SplashScreen {
  /** @param {import('../core/game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.isOpen = false;
    this.phase = 'ein'; // ein · glanz · aus
    this.t = 0; // seit dem Öffnen
    this.pt = 0; // seit dem letzten Phasenwechsel
    this.onDone = null;
    this.leaves = [];
    this.sparks = [];
    this.jinglePending = false;
    this.jinglePlayed = false;
    this.skipped = false;
    this.images = null;
    this.frames = 0;
    this.timing = TIMING.lang;
    this.fadeOut = this.timing.fadeOut;
  }

  /** Die Szene dahinter muss nicht gezeichnet werden (nach den ersten Bildern, bis zum Ausblenden). */
  get hidesScene() {
    return this.isOpen && this.frames > 3 && this.phase !== 'aus';
  }

  /** @param {() => void} onDone wird aufgerufen, wenn das Startbild ausgeblendet ist */
  open(onDone) {
    this.isOpen = true;
    this.phase = 'ein';
    this.t = 0;
    this.pt = 0;
    this.onDone = onDone;
    this.leaves = Array.from({ length: LEAVES }, (_, i) => this.leaf(i, true));
    this.sparks = [];
    this.jinglePending = false;
    this.jinglePlayed = false;
    this.skipped = false;
    this.frames = 0;
    this.short = seenBefore();
    this.timing = this.short ? TIMING.kurz : TIMING.lang;
    this.fadeOut = this.timing.fadeOut;
    markSeen();
  }

  close() {
    this.isOpen = false;
    const done = this.onDone;
    this.onDone = null;
    if (done) done();
  }

  leaf(i, anywhere) {
    const r = (k) => {
      const v = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453;
      return v - Math.floor(v);
    };
    return {
      x: r(1),
      y: anywhere ? r(2) : -0.05,
      speed: 0.035 + r(3) * 0.03, // Bildhöhen pro Sekunde
      sway: 6 + r(4) * 10,
      phase: r(5) * 6.28,
      color: LEAF_COLORS[Math.floor(r(6) * LEAF_COLORS.length)],
      turn: r(7) < 0.5,
    };
  }

  /** @param {import('../core/input.js').Input} input */
  update(input, dt) {
    if (!this.isOpen) return;
    this.t += dt;
    this.pt += dt;
    const T0 = this.timing;
    // Jede Taste, jeder Klick: sofort weiter (die Eingabe weckt nebenbei den Klang für das Titelbild).
    // Auch gleich zu Beginn – wer schon beim Laden drückt, will weiter.
    if (this.phase !== 'aus' && input.anyPressed) {
      this.phase = 'aus';
      this.pt = 0;
      this.fadeOut = SKIP_FADE;
      this.skipped = true;
      input.consumeClick();
    }
    // Der Glanz: die Laterne flammt auf, Funken steigen, ein Glanz läuft über den Schriftzug – und
    // hatte die Seite schon eine Eingabe, spielt die Spieluhr dazu
    if (this.phase === 'ein' && this.t >= T0.glow) {
      this.phase = 'glanz';
      this.pt = 0;
      if (this.game.sound.allowed()) {
        this.game.sound.unlock();
        this.jinglePending = true;
      }
    }
    if (this.jinglePending) {
      // Der Klang entsteht gerade erst; läuft er noch nicht, im nächsten Bild noch einmal
      if (this.game.sound.jingle()) {
        this.jinglePending = false;
        this.jinglePlayed = true;
      } else if (this.pt > 0.6) this.jinglePending = false;
    }
    if (this.phase === 'glanz' && this.t >= T0.hold) {
      this.phase = 'aus';
      this.pt = 0;
      this.fadeOut = T0.fadeOut;
    }
    // Laub fällt, Funken steigen
    for (let i = 0; i < this.leaves.length; i++) {
      const l = this.leaves[i];
      l.y += l.speed * dt;
      if (l.y > 1.05) this.leaves[i] = this.leaf(i + Math.floor(this.t * 10), false);
    }
    if (this.phase === 'glanz' && this.pt < 1.4) {
      for (let k = 0; k < 2; k++) {
        if (Math.random() < dt * 22) this.sparks.push({ x: (Math.random() - 0.5) * 60, y: 0, vy: 18 + Math.random() * 22, vx: (Math.random() - 0.5) * 6, life: 1.1 + Math.random() * 0.9, age: 0 });
      }
    }
    for (let k = this.sparks.length - 1; k >= 0; k--) {
      const s = this.sparks[k];
      s.age += dt;
      s.y -= s.vy * dt;
      s.x += s.vx * dt;
      if (s.age >= s.life) this.sparks.splice(k, 1);
    }
    if (this.phase === 'aus' && this.pt >= this.fadeOut) this.close();
  }

  /** Stand für die Playtest-Brücke und die Prüfung. */
  view() {
    const T0 = this.timing;
    return {
      phase: this.phase,
      t: +this.t.toFixed(2),
      texte: [T.startbild.studio, T.startbild.praesentiert],
      spieluhr: this.jinglePlayed,
      kurz: this.short,
      dauer: +(T0.hold + T0.fadeOut).toFixed(2),
      uebersprungen: this.skipped,
    };
  }

  /** @param {import('./ui.js').UICanvas} ui */
  draw(ui) {
    if (!this.isOpen) return;
    this.frames++;
    const ctx = ui.ctx;
    const W = ui.width;
    const H = ui.height;
    if (!this.images) {
      this.images = {
        book: bookCanvas(),
        lantern: lanternCanvas(false),
        lanternBright: lanternCanvas(true),
        logo: textCanvas(T.startbild.studio, COLORS.gold),
        logoBright: textCanvas(T.startbild.studio, css(P.f8)),
      };
    }
    const img = this.images;
    ctx.imageSmoothingEnabled = false;
    // Nachthimmel
    ctx.fillStyle = css(P.n1);
    ctx.fillRect(0, 0, W, H);
    // Laub
    for (const l of this.leaves) {
      const x = Math.round(l.x * W + Math.sin(this.t * 1.1 + l.phase) * l.sway);
      const y = Math.round(l.y * H);
      ctx.fillStyle = css(l.color);
      ctx.fillRect(x, y, 2, 2);
      ctx.fillRect(l.turn ? x + 2 : x - 1, y + (l.turn ? 0 : 1), 1, 1);
      ctx.fillStyle = css(P.e3);
      ctx.fillRect(l.turn ? x - 1 : x + 2, y + 2, 1, 1); // Stiel
    }
    // Buch, darauf die Laterne mit flackerndem Schein
    const book = img.book;
    const bx = Math.round((W - book.width) / 2);
    const by = Math.round(H * 0.3);
    const lantern = img.lantern;
    const lx = Math.round(W / 2 - lantern.width / 2);
    const ly = by - lantern.height + 5;
    const glowT = this.t - this.timing.glow; // seit dem Glanz
    const burst = glowT >= 0 ? Math.max(0, 1 - glowT / 1.6) : 0;
    const flicker = Math.sin(this.t * 7.3) * 0.6 + Math.sin(this.t * 13.1) * 0.4;
    const glow = glowCanvas(Math.round(30 + flicker * 1.5 + burst * 16));
    // Der Schein liegt über dem Buch, nicht darunter
    const gx = Math.round(W / 2 - glow.width / 2);
    const gy = Math.round(ly + 6 - glow.height / 2);
    const cut = Math.max(0, Math.min(glow.height, by + book.height - 6 - gy));
    if (cut > 0) ctx.drawImage(glow, 0, 0, glow.width, cut, gx, gy, glow.width, cut);
    ctx.drawImage(book, bx, by);
    ctx.drawImage(burst > 0.2 || flicker > 0.75 ? img.lanternBright : img.lantern, lx, ly);
    // Funken über dem Buch (mit dem Glanz)
    for (const s of this.sparks) {
      const k = s.age / s.life;
      ctx.fillStyle = css(k < 0.4 ? P.f8 : k < 0.75 ? P.f7 : P.f5);
      ctx.fillRect(Math.round(W / 2 + s.x), Math.round(by + 6 + s.y), 1, 1);
    }
    // Schriftzug, beim Klang läuft ein Glanz darüber
    const logo = img.logo;
    const lw = logo.width * LOGO_SCALE;
    const lh = logo.height * LOGO_SCALE;
    const tx = Math.round((W - lw) / 2);
    const ty = by + book.width * 0 + book.height + 10;
    ctx.globalAlpha = 0.5;
    ctx.drawImage(logo, tx + LOGO_SCALE, ty + LOGO_SCALE, lw, lh);
    ctx.globalAlpha = 1;
    ctx.drawImage(logo, tx, ty, lw, lh);
    if (glowT >= 0 && glowT < 1.8) {
      const sweep = Math.floor((glowT / 1.8) * (logo.width + 8)) - 4;
      for (let k = 0; k < 3; k++) {
        const sx = sweep + k;
        if (sx < 0 || sx >= logo.width) continue;
        ctx.drawImage(img.logoBright, sx, 0, 1, logo.height, tx + sx * LOGO_SCALE, ty, LOGO_SCALE, lh);
      }
    }
    ui.textCentered(T.startbild.praesentiert, W / 2, ty + lh + 4, COLORS.textWarm, { outline: COLORS.outline });
    // Ein- und Ausblenden (kein »Taste drücken« mehr: das Bild läuft von selbst, N11)
    const fade = Math.max(Math.max(0, 1 - this.t / this.timing.fadeIn), this.phase === 'aus' ? Math.min(1, this.pt / this.fadeOut) : 0);
    ui.ditherFill(fade);
  }
}
