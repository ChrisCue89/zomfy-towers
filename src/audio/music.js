// Musik (M10d): der Soundtrack, ganz aus dem Klang-Baukasten – keine Tondateien.
// Wunsch des Auftraggebers: tagsüber »slow cozy«, nachts beim Angriff
// »rhythmisch treibend«.
//
//   tag    »Morgen am See« – F-Dur, 76 Schläge pro Minute: E-Piano, gezupfte
//          Gitarre, weicher Bass, Flöte und Spieluhr, im Mittelteil Streicher,
//          dazu Besen. Ein Durchgang dauert knapp eine Minute, danach ist Ruhe
//          (Wind, Vögel, Wellen); beim nächsten Durchgang tauschen Flöte und
//          Spieluhr. Läuft auch auf dem Titelbild.
//   abend  »Laternenzeit« – d-Moll, 66 Schläge pro Minute: Streicherfläche,
//          E-Piano, einzelne Gitarrentöne, eine etwas wehmütige Flöte.
//   titel  »Herbstlied am Stillsee« (N2) – G-Dur, 72 Schläge pro Minute: Spieluhr
//          und Flöte im Wechsel über E-Piano, Gitarre und weichem Bass, im
//          Mittelteil Streicher. Läuft auf dem Titelbild, nach kurzer Pause
//          wieder von vorn. Davor, auf dem Startbild, die Spieluhr von Tales of
//          Cue (jingle): G–H–D–G aufwärts, ein warmer Akkord, ein Glitzern.
//   nacht  »Die Horde kommt« – d-Moll, 126 Schläge pro Minute, solange eine Welle
//          läuft. Stufe 0: Achtel-Bass, Kick, Hi-Hat. Stufe 1 (viele unterwegs,
//          Barrikaden unter Schlägen): Snare, Staccato-Streicher, tiefe Fläche.
//          Stufe 2 (am Haus oder hinter Mika her): Hörner, Becken, Tom-Wirbel.
//   boss   »Der Boss kommt« (M22) – c-Moll, 138 Schläge pro Minute, solange ein
//          Boss lebt: wie die Nacht auf Stufe 2, dazu eine Pauke und eine
//          eigene Hörnermelodie.
//   karten »Kartenabend« (M28) – G-Dur im Dreiertakt, 96 Schläge pro Minute:
//          Bass auf der Eins, E-Piano auf Zwei und Drei, gezupfte Gitarre,
//          Flöte und Spieluhr im Wechsel. Läuft am Kartentisch ohne Pause;
//          klopft jemand oder steht es 1 : 1 (»Letzte Runde«), legt sich eine
//          Streicherfläche mit leisem Ticken darunter (`tension`).
//
// Die Stücke sind Daten: Akkorde je Takt (»Gm7|C7« = je ein halber Takt) und
// Melodien als »Ton:Länge« in Sechzehnteln (»-« ist eine Pause). Gespielt wird
// mit Vorausplanung; zwischen den Stücken wird übergeblendet.

const LOOKAHEAD = 0.3; // Sekunden, die vorausgeplant werden
const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Notenname → Hz (»F#4«, »Bb3«, »C5«). */
export function hz(name) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  if (!m) throw new Error(`Musik: unbekannte Note »${name}«`);
  const midi = 12 * (Number(m[3]) + 1) + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}
const notes = (text) => text.trim().split(/\s+/).map(hz);

/**
 * Akkorde: Grundton für den Bass, Stimmen fürs E-Piano (tag, abend), fünf Töne
 * aufwärts für die Gitarre und sechs für die Staccato-Streicher (nacht).
 */
const CHORDS = {
  Fmaj7: { bass: 'F2', ep: 'F3 A3 C4 E4', arp: 'F3 C4 E4 A4 C5' },
  FA: { bass: 'A2', ep: 'F3 A3 C4 E4', arp: 'F3 C4 E4 A4 C5' }, // F-Dur mit a im Bass
  Fadd9: { bass: 'F2', ep: 'F3 A3 C4 G4', arp: 'F3 C4 G4 A4 C5' },
  Am7: { bass: 'A2', ep: 'E3 G3 A3 C4', arp: 'A3 E4 G4 C5 E5' },
  Bbmaj7: { bass: 'Bb1', ep: 'F3 A3 D4', arp: 'Bb3 F4 A4 D5 F5' },
  Gm7: { bass: 'G2', ep: 'F3 Bb3 D4', arp: 'G3 D4 F4 Bb4 D5' },
  Dm7: { bass: 'D2', ep: 'F3 A3 C4', arp: 'D3 A3 C4 F4 A4' },
  Dm9: { bass: 'D2', ep: 'F3 A3 C4 E4', arp: 'D3 A3 E4 F4 A4' },
  C7sus: { bass: 'C2', ep: 'F3 Bb3 C4', arp: 'C3 G3 C4 F4 Bb4' },
  C7: { bass: 'C2', ep: 'E3 Bb3 C4', arp: 'C3 G3 C4 E4 Bb4' },
  C: { bass: 'C2', ep: 'E3 G3 C4', arp: 'C3 G3 C4 E4 G4' },
  A7sus: { bass: 'A1', ep: 'G3 D4 E4', arp: 'A2 E3 G3 D4 E4' },
  A7: { bass: 'A1', ep: 'G3 C#4 E4', arp: 'A2 E3 G3 C#4 E4' },
  // Titel (N2): G-Dur
  Gmaj7: { bass: 'G2', ep: 'F#3 B3 D4', arp: 'G3 D4 F#4 B4 D5' },
  Gadd9: { bass: 'G2', ep: 'B3 D4 A4', arp: 'G3 D4 A4 B4 D5' },
  GB: { bass: 'B1', ep: 'G3 B3 D4', arp: 'B2 G3 D4 G4 B4' }, // G-Dur mit h im Bass
  Em7: { bass: 'E2', ep: 'D3 G3 B3', arp: 'E3 B3 D4 G4 B4' },
  Cmaj7: { bass: 'C2', ep: 'E3 G3 B3', arp: 'C3 G3 B3 E4 G4' },
  Cadd9: { bass: 'C2', ep: 'E3 G3 D4', arp: 'C3 G3 D4 E4 G4' },
  Dsus: { bass: 'D2', ep: 'D3 G3 A3', arp: 'D3 A3 D4 G4 A4' },
  D: { bass: 'D2', ep: 'D3 F#3 A3', arp: 'D3 A3 D4 F#4 A4' },
  D7: { bass: 'D2', ep: 'C3 F#3 A3', arp: 'D3 A3 C4 F#4 A4' },
  // Nacht
  Dm: { bass: 'D2', ep: 'D3 F3 A3', str: 'D3 F3 A3 D4 F4 A4' },
  Bb: { bass: 'Bb1', ep: 'D3 F3 Bb3', str: 'D3 F3 Bb3 D4 F4 Bb4' },
  F: { bass: 'F2', ep: 'C3 F3 A3', str: 'C3 F3 A3 C4 F4 A4' },
  Cn: { bass: 'C2', ep: 'C3 E3 G3', str: 'C3 E3 G3 C4 E4 G4' },
  Gm: { bass: 'G1', ep: 'D3 G3 Bb3', str: 'D3 G3 Bb3 D4 G4 Bb4' },
  A: { bass: 'A1', ep: 'C#3 E3 A3', str: 'C#3 E3 A3 C#4 E4 A4' },
  // Boss (M22): c-Moll
  Cm: { bass: 'C2', ep: 'C3 Eb3 G3', str: 'C3 Eb3 G3 C4 Eb4 G4' },
  Ab: { bass: 'Ab1', ep: 'C3 Eb3 Ab3', str: 'C3 Eb3 Ab3 C4 Eb4 Ab4' },
  Eb: { bass: 'Eb2', ep: 'Eb3 G3 Bb3', str: 'Eb3 G3 Bb3 Eb4 G4 Bb4' },
  Fm: { bass: 'F1', ep: 'C3 F3 Ab3', str: 'C3 F3 Ab3 C4 F4 Ab4' },
  G: { bass: 'G1', ep: 'B2 D3 G3', str: 'B2 D3 G3 B3 D4 G4' },
};
for (const ch of Object.values(CHORDS)) {
  ch.bass = hz(ch.bass);
  ch.ep = notes(ch.ep);
  ch.arp = ch.arp ? notes(ch.arp) : null;
  ch.str = ch.str ? notes(ch.str) : null;
}

/** Gitarrenmuster in Achteln (Index in die fünf Töne, -1 = nichts). */
const ARP = {
  roll: [0, 1, 2, 3, 4, 3, 2, 1],
  wave: [0, 2, 4, 2, 1, 3, 4, 3],
  sparse: [0, -1, 2, -1, 3, -1, 2, -1],
};
/** Nacht: Achtel-Bass (1 = Oktave höher) und Staccato-Streicher in Sechzehnteln. */
const DRIVE = [0, 0, 1, 0, 0, 1, 0, 1];
const OSTINATO = [0, 3, 2, 3, 1, 3, 2, 3, 0, 3, 2, 3, 1, 4, 2, 5];

const SONGS = {
  tag: {
    bpm: 76,
    verb: 0.3,
    bellOctave: 2, // die Spieluhr klingt eine Oktave höher
    rest: [22, 45], // Sekunden Ruhe nach einem Durchgang
    end: { chord: 'Fadd9', note: 'F5' },
    sections: [
      // Vorspiel: E-Piano und Gitarre
      { chords: ['Fmaj7', 'C7sus|C7'], ep: 'bar', arp: 'roll', bass: 'long' },
      { chords: ['Fmaj7', 'Am7', 'Bbmaj7', 'C7sus|C7'], ep: 'bar', arp: 'roll', bass: 'walk', lead: 0, mel: ['C5:6 A4:2 G4:4 A4:4', 'E4:4 G4:4 C5:8', 'D5:6 C5:2 A4:4 F4:4', 'G4:12 -:4'] },
      { chords: ['Fmaj7', 'Am7', 'Gm7', 'Bbmaj7|C7'], ep: 'comp', arp: 'roll', bass: 'walk', brush: true, lead: 0, mel: ['C5:6 A4:2 G4:4 F4:4', 'E4:6 F4:2 G4:8', 'Bb4:4 A4:4 G4:4 F4:4', 'G4:8 E4:8'] },
      // Mittelteil: die andere Stimme, Streicher darunter
      { chords: ['Dm7', 'Bbmaj7', 'FA', 'Gm7|C7'], ep: 'bar', arp: 'wave', bass: 'walk', brush: true, pad: true, lead: 1, mel: ['F5:4 E5:2 D5:2 C5:4 A4:4', 'D5:4 C5:4 Bb4:4 A4:4', 'C5:6 A4:2 C5:4 F5:4', 'D5:6 C5:2 Bb4:4 G4:4'] },
      { chords: ['Fmaj7', 'Am7', 'Bbmaj7', 'C7|Fadd9'], ep: 'comp', arp: 'roll', bass: 'walk', brush: true, lead: 0, mel: ['C5:6 A4:2 G4:4 A4:4', 'E4:4 G4:4 C5:6 D5:2', 'D5:4 F5:4 E5:4 D5:4', 'C5:4 G4:4 F4:8'] },
    ],
  },
  abend: {
    bpm: 66,
    verb: 0.36,
    bellOctave: 1,
    rest: [30, 60],
    end: { chord: 'Dm9', note: 'D5' },
    sections: [
      { chords: ['Dm9', 'A7sus|A7'], ep: 'bar', pad: true, bass: 'long' },
      { chords: ['Dm9', 'Bbmaj7', 'Fmaj7', 'C7sus|C'], ep: 'bar', arp: 'sparse', bass: 'long', pad: true, lead: 0, mel: ['A4:8 F4:4 E4:4', 'D4:12 F4:4', 'C5:8 A4:8', 'G4:12 -:4'] },
      { chords: ['Dm9', 'Gm7', 'Bbmaj7', 'A7sus|A7'], ep: 'bar', arp: 'sparse', bass: 'long', pad: true, lead: 0, mel: ['A4:6 C5:2 D5:8', 'Bb4:8 A4:4 G4:4', 'F4:8 D4:8', 'E4:16'] },
      { chords: ['Dm9', 'Bbmaj7', 'Fmaj7', 'C7sus|C'], ep: 'bar', arp: 'roll', bass: 'long', pad: true, lead: 1, mel: ['F5:6 E5:2 D5:4 A4:4', 'D5:8 F5:4 D5:4', 'C5:4 A4:4 G4:4 A4:4', 'G4:12 -:4'] },
      { chords: ['Dm9', 'Gm7', 'Bbmaj7', 'A7sus|A7'], ep: 'bar', arp: 'roll', bass: 'long', pad: true, lead: 0, mel: ['A4:8 D5:8', 'D5:6 C5:2 Bb4:8', 'A4:8 F4:8', 'E4:8 C#5:8'] },
    ],
  },
  titel: {
    bpm: 72,
    verb: 0.34,
    bellOctave: 2,
    rest: [4, 8], // auf dem Titelbild nur eine kurze Pause
    end: { chord: 'Gadd9', note: 'G5' },
    sections: [
      // Vorspiel: E-Piano und einzelne Gitarrentöne
      { chords: ['Gmaj7', 'Cadd9'], ep: 'bar', arp: 'sparse', bass: 'long' },
      // Thema – zuerst die Spieluhr, beim nächsten Durchgang die Flöte
      { chords: ['Gmaj7', 'Em7', 'Cmaj7', 'Dsus|D'], ep: 'bar', arp: 'roll', bass: 'long', lead: 1, mel: ['B4:6 A4:2 G4:4 D4:4', 'E4:4 G4:4 B4:8', 'C5:6 B4:2 A4:4 G4:4', 'A4:12 -:4'] },
      { chords: ['Gmaj7', 'Em7', 'Cmaj7', 'D7|Gmaj7'], ep: 'comp', arp: 'roll', bass: 'walk', brush: true, lead: 0, mel: ['B4:6 A4:2 G4:4 B4:4', 'D5:4 E5:4 D5:8', 'C5:4 B4:4 A4:4 C5:4', 'B4:8 G4:8'] },
      // Mittelteil mit Streichern
      { chords: ['Em7', 'Cmaj7', 'GB', 'D'], ep: 'bar', arp: 'wave', bass: 'walk', brush: true, pad: true, lead: 1, mel: ['E5:6 D5:2 B4:4 G4:4', 'C5:6 D5:2 E5:8', 'D5:6 B4:2 G4:4 B4:4', 'A4:8 F#4:4 A4:4'] },
      { chords: ['Gmaj7', 'Em7', 'Cadd9', 'Dsus|D'], ep: 'comp', arp: 'roll', bass: 'walk', pad: true, lead: 0, mel: ['B4:6 A4:2 G4:4 D4:4', 'E4:4 G4:4 B4:6 C5:2', 'D5:4 E5:4 D5:4 B4:4', 'A4:8 D5:8'] },
    ],
  },
  karten: {
    bpm: 96,
    verb: 0.32,
    bellOctave: 2,
    steps: 12, // Dreiertakt: zwölf Sechzehntel je Takt
    waltz: true,
    loop: true,
    sections: [
      { chords: ['Gadd9', 'Em7', 'Cadd9', 'D'], arp: true, lead: 0, mel: ['D5:4 B4:4 G4:4', 'E5:6 D5:2 B4:4', 'C5:4 E5:4 G5:4', 'F#5:8 -:4'] },
      { chords: ['Gmaj7', 'Em7', 'Am7', 'D7'], arp: true, lead: 0, mel: ['D5:4 B4:4 G4:4', 'G5:6 F#5:2 E5:4', 'C5:4 E5:4 A4:4', 'D5:12'] },
      { chords: ['Cmaj7', 'GB', 'Am7', 'D7'], arp: true, brush: true, lead: 1, mel: ['E5:4 G5:4 E5:4', 'D5:6 B4:2 G4:4', 'C5:4 A4:4 C5:4', 'B4:4 A4:4 F#4:4'] },
      { chords: ['Gadd9', 'Em7', 'D', 'Gadd9'], arp: true, brush: true, lead: 1, mel: ['G4:4 B4:4 D5:4', 'E5:6 G5:2 E5:4', 'D5:6 C5:2 A4:4', 'G4:12'] },
    ],
  },
  nacht: {
    bpm: 126,
    verb: 0.14,
    night: true,
    sections: [
      // Hörner (Stufe 2): acht Takte über i – VI – III – VII – i – VI – iv – V
      { chords: ['Dm', 'Bb', 'F', 'Cn', 'Dm', 'Bb', 'Gm', 'A'], mel: ['D4:6 F4:2 A4:8', 'Bb4:6 A4:2 F4:8', 'C5:6 A4:2 F4:4 A4:4', 'G4:12 -:4', 'D5:6 C5:2 A4:8', 'Bb4:6 C5:2 D5:8', 'D5:4 Bb4:4 G4:8', 'A4:8 C#5:4 E5:4'] },
    ],
  },
  // Boss (M22): acht Takte über i – VI – III – VII – i – VI – iv – V
  boss: {
    bpm: 138,
    verb: 0.16,
    night: true,
    boss: true,
    sections: [
      { chords: ['Cm', 'Ab', 'Eb', 'Bb', 'Cm', 'Ab', 'Fm', 'G'], mel: ['C4:4 Eb4:4 G4:8', 'Ab4:6 G4:2 Eb4:8', 'G4:4 Bb4:4 Eb5:8', 'D5:6 C5:2 Bb4:8', 'C5:6 Eb5:2 G5:8', 'F5:4 Eb5:4 C5:8', 'Ab4:4 C5:4 F5:4 Eb5:4', 'D5:8 B4:4 G4:4'] },
    ],
  },
};

/** »C5:6 A4:2 -:4« → 16 (bzw. `steps`) Plätze je Takt: [Hz, Länge] oder null. */
function bar16(text, steps = 16) {
  const out = new Array(steps).fill(null);
  let step = 0;
  for (const tok of text.trim().split(/\s+/)) {
    const [name, l] = tok.split(':');
    const len = Number(l);
    if (name !== '-') out[step] = [hz(name), len];
    step += len;
  }
  if (step !== steps) throw new Error(`Musik: Takt »${text}« hat ${step} statt ${steps} Sechzehntel`);
  return out;
}

for (const song of Object.values(SONGS)) {
  for (const sec of song.sections) {
    sec.chords = sec.chords.map((name) =>
      name.split('|').map((n) => {
        if (!CHORDS[n]) throw new Error(`Musik: unbekannter Akkord »${n}«`);
        return CHORDS[n];
      }),
    );
    sec.mel = sec.mel ? sec.mel.map((b) => bar16(b, song.steps || 16)) : null;
  }
  if (song.end) song.end = { chord: CHORDS[song.end.chord], note: hz(song.end.note) };
}

export const SONG_IDS = Object.keys(SONGS);
const rand = (a, b) => a + Math.random() * (b - a);

export class Music {
  /**
   * @param {object} sound Klang-Baukasten (ctx, tone, noise, brass)
   * @param {AudioNode} dest Ausgang (Musik-Regler)
   */
  constructor(sound, dest) {
    this.s = sound;
    this.ctx = sound.ctx;
    const c = this.ctx;
    this.out = c.createGain(); // Ausblenden beim Schlafen, Ducken für Balduins Fanfare
    this.out.connect(dest);
    this.verb = this.makeVerb();
    this.cur = null; // laufendes Stück
    this.old = []; // ausklingende Stücke (werden später abgehängt)
    this.restUntil = 0;
    this.duckUntil = 0;
    this.level = 1;
    this.passes = { tag: 0, abend: 0, nacht: 0, titel: 0, boss: 0 };
    this.plucks = new Map();
  }

  /** Welches Stück gerade läuft (für die Prüfung). */
  get mode() {
    return this.cur ? this.cur.id : null;
  }

  /** Balduins Fanfare: die Musik so lange leise stellen. */
  duck(seconds) {
    this.duckUntil = this.ctx.currentTime + seconds;
  }

  /**
   * Jedes Bild: Stück wählen, überblenden, vorausplanen.
   * @param {{hours:number, fight:boolean, quiet:boolean, title:boolean, threat:number}} s
   */
  update(dt, s) {
    const t = this.ctx.currentTime;
    // Startbild: noch keine Musik (nur die Spieluhr); Titelbild: das Titelstück (N2)
    const want = s.splash ? null : s.title ? 'titel' : s.quiet ? null : s.fight ? (s.boss ? 'boss' : 'nacht') : s.cards ? 'karten' : s.hours >= 6 && s.hours < 17 ? 'tag' : s.hours >= 17 && s.hours < 20.5 ? 'abend' : null;
    this.tension = s.cards ? s.cardTension || 0 : 0; // M28: Klopfen, Letzte Runde
    const level = t < this.duckUntil ? 0.15 : 1;
    if (level !== this.level) {
      this.level = level;
      this.out.gain.setTargetAtTime(level, t, level < 1 ? 0.3 : 1.5);
    }
    const cur = this.cur;
    // Nacht kommt sofort, sonst darf ein Durchgang zu Ende spielen – nur das
    // Titelstück wechselt gleich (ins Spiel hinein oder zurück zum Titelbild)
    const titleSwitch = cur && want !== cur.id && (cur.id === 'titel' || want === 'titel' || cur.id === 'karten' || want === 'karten');
    // Nacht und Boss (M22) kommen sofort und wechseln gleich
    const fightWant = want === 'nacht' || want === 'boss';
    const fightCur = cur && SONGS[cur.id].night;
    if (cur && (titleSwitch || (fightWant ? cur.id !== want : fightCur || !want))) this.stop(t, fightCur ? 2.5 : titleSwitch ? 2 : 1.5);
    if (!this.cur && want && (fightWant || t >= this.restUntil)) this.begin(want, t + 0.08);
    if (this.cur) this.schedule(t + LOOKAHEAD, this.cur.song.boss ? 2 : s.threat || 0, t);
    for (let k = this.old.length - 1; k >= 0; k--) {
      const o = this.old[k];
      if (t < o.until) continue;
      o.bus.disconnect();
      this.old.splice(k, 1);
    }
  }

  /** Ein Stück ab Zeitpunkt t0 beginnen. */
  begin(id, t0) {
    const c = this.ctx;
    const song = SONGS[id];
    const bus = c.createGain();
    bus.gain.value = 1;
    bus.connect(this.out);
    const send = c.createGain();
    send.gain.value = song.verb;
    bus.connect(send).connect(this.verb);
    // Filter, die sich alle Töne einer Stimme teilen (spart je Ton einen Knoten)
    const filter = (type, freq) => {
      const f = c.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.connect(bus);
      return f;
    };
    const fx = song.night ? { strings: filter('lowpass', 1700), bass: filter('lowpass', 460), hat: filter('highpass', 7500) } : { brush: filter('bandpass', 3600) };
    if (fx.brush) fx.brush.Q.value = 0.5;
    this.cur = { id, song, bus, fx, pass: this.passes[id]++, sec: 0, bar: 0, step: 0, next: t0, stepDur: 60 / song.bpm / 4, level: 0, calm: 0, first: true };
    return this.cur;
  }

  /** Laufendes Stück ausblenden. */
  stop(t, fade) {
    const cur = this.cur;
    cur.bus.gain.setTargetAtTime(0.0001, t, fade / 4);
    this.old.push({ bus: cur.bus, until: t + fade + 1 });
    this.cur = null;
    this.restUntil = t + 4;
  }

  /**
   * Alles bis `until` planen. threat: 0..2 (nur nachts). Hat das Spiel gestockt
   * (langes Bild), fallen verpasste Schritte aus, statt auf einmal nachzuklingen.
   */
  schedule(until, threat, now = 0) {
    const cur = this.cur;
    const song = cur.song;
    while (this.cur === cur && cur.next < until) {
      const t = cur.next;
      if (t >= now - 0.05) {
        if (song.night) this.nightStep(cur, t, threat);
        else if (song.waltz) this.waltzStep(cur, t);
        else this.cozyStep(cur, t);
      }
      cur.next += cur.stepDur;
      if (++cur.step < (song.steps || 16)) continue;
      cur.step = 0;
      cur.first = false;
      if (++cur.bar < song.sections[cur.sec].chords.length) continue;
      cur.bar = 0;
      if (++cur.sec < song.sections.length) continue;
      if (song.night || song.loop) cur.sec = 0;
      else this.finish(cur, Math.max(cur.next, now));
    }
  }

  /** Ende eines ruhigen Stücks: Schlussakkord, dann Ruhe. */
  finish(cur, t) {
    const { chord, note } = cur.song.end;
    const beat = cur.stepDur * 4;
    chord.ep.forEach((f, k) => this.ep(f, t + k * 0.03, beat * 5, 0.04, cur.bus));
    chord.arp.forEach((f, k) => this.pluck(f, t + 0.02 + k * 0.045, 0.045, cur.bus));
    this.bass(chord.bass, t, beat * 5, 0.11, cur.bus);
    this.flute(note, t + 0.05, beat * 3, 0.05, cur.bus);
    this.old.push({ bus: cur.bus, until: t + beat * 5 + 3 });
    this.restUntil = t + beat * 3 + rand(...cur.song.rest);
    this.cur = null;
  }

  /**
   * Startbild (N2): die Spieluhr von Tales of Cue – aufwärts G–H–D–G, dann ein
   * warmer Akkord mit gezupfter Gitarre und Streichern, zum Schluss ein
   * Glitzern. Rund drei Sekunden; danach darf das Titelstück beginnen.
   */
  jingle() {
    const c = this.ctx;
    const t = c.currentTime + 0.06;
    const bus = c.createGain();
    bus.gain.value = 1;
    bus.connect(this.out);
    const send = c.createGain();
    send.gain.value = 0.42;
    bus.connect(send).connect(this.verb);
    const eighth = 0.15;
    ['G5', 'B5', 'D6', 'G6'].forEach((n, k) => this.bell(hz(n), t + k * eighth, 0.05, bus));
    const chord = CHORDS.Gmaj7;
    const at = t + 4 * eighth;
    chord.ep.forEach((f, k) => this.ep(f, at + k * 0.02, 2.6, 0.04, bus));
    chord.arp.forEach((f, k) => this.pluck(f, at + 0.02 + k * 0.05, 0.045, bus));
    this.bass(chord.bass, at, 2.4, 0.1, bus);
    this.pad(chord.ep, at, 2.6, 0.02, 1100, bus);
    ['D6', 'B5', 'G6'].forEach((n, k) => this.bell(hz(n), at + 0.55 + k * 0.16, 0.035, bus));
    this.old.push({ bus, until: at + 5 });
    this.restUntil = Math.max(this.restUntil, at + 2.4);
  }

  /**
   * M31: Die Spieluhr am Erinnerungsbrett – eine leise, langsame Melodie über warmen
   * Akkorden (e-Moll mit Septime, C, G), je Person eine eigene Wendung (M32: ihre Motive).
   */
  memorial(variant = 0) {
    const c = this.ctx;
    const t = c.currentTime + 0.08;
    const bus = c.createGain();
    bus.gain.value = 0.9;
    bus.connect(this.out);
    const send = c.createGain();
    send.gain.value = 0.5;
    bus.connect(send).connect(this.verb);
    const beat = 0.42;
    const tunes = [
      ['B5', 'G5', 'E5', 'G5', 'A5', 'G5', 'E5', 'D5'],
      ['E6', 'D6', 'B5', 'G5', 'A5', 'B5', 'G5', 'E5'],
      ['G5', 'A5', 'B5', 'D6', 'B5', 'A5', 'G5', 'E5'],
    ];
    const tune = tunes[Math.abs(variant) % tunes.length];
    tune.forEach((n, k) => this.bell(hz(n), t + k * beat, 0.04, bus));
    [CHORDS.Em7, CHORDS.Cmaj7, CHORDS.Gmaj7].forEach((ch, k) => {
      const at = t + k * beat * 3;
      ch.ep.forEach((f, i) => this.ep(f, at + i * 0.03, beat * 3.2, 0.025, bus));
      this.bass(ch.bass, at, beat * 3, 0.06, bus);
    });
    const end = t + tune.length * beat;
    this.bell(hz('G5'), end + 0.2, 0.03, bus);
    this.old.push({ bus, until: end + 4 });
    this.restUntil = Math.max(this.restUntil, end + 2);
    this.duck(end - c.currentTime + 1);
  }

  // --- Tag und Abend --------------------------------------------------------------------

  cozyStep(cur, t) {
    const song = cur.song;
    const sec = song.sections[cur.sec];
    const k = cur.step;
    const [first, second] = sec.chords[cur.bar];
    const chord = k >= 8 && second ? second : first;
    const beat = cur.stepDur * 4;
    const out = cur.bus;
    // E-Piano: Akkord auf die Eins (leicht gebrochen), bei »comp« leise nachgeschlagen
    if (k === 0 || (k === 8 && second)) {
      const len = second ? beat * 2 : beat * 3.2;
      chord.ep.forEach((f, n) => this.ep(f, t + n * 0.012, len, 0.036, out));
    }
    if (sec.ep === 'comp' && k === 10 && !second) chord.ep.forEach((f, n) => this.ep(f, t + n * 0.01, beat * 1.2, 0.018, out));
    // Streicherfläche unter dem Takt
    if (sec.pad && k === 0) this.pad(first.ep, t, beat * 4, 0.017, 950, out);
    // Bass
    if (sec.bass === 'long') {
      if (k === 0) this.bass(first.bass, t, second ? beat * 2 : beat * 3.8, 0.1, out);
      if (k === 8 && second) this.bass(second.bass, t, beat * 1.9, 0.1, out);
    } else if (sec.bass === 'walk') {
      if (k === 0) this.bass(first.bass, t, beat * 1.8, 0.11, out);
      if (k === 8) this.bass(second ? second.bass : first.bass * 1.5, t, beat * 1.5, 0.09, out);
      if (k === 14 && !second) this.bass(first.bass, t, beat * 0.45, 0.05, out);
    }
    // Gitarre in Achteln, ein wenig menschlich ungenau
    if (sec.arp && k % 2 === 0) {
      const i = ARP[sec.arp][k / 2];
      if (i >= 0) this.pluck(chord.arp[i], t + rand(0, 0.012), (k % 8 === 0 ? 0.044 : 0.035) * rand(0.85, 1.1), out);
    }
    // Melodie: Flöte oder Spieluhr, beim nächsten Durchgang getauscht
    const n = sec.mel ? sec.mel[cur.bar][k] : null;
    if (n) {
      if ((sec.lead + cur.pass) % 2 === 0) this.flute(n[0], t, n[1] * cur.stepDur, 0.062, out);
      else this.bell(n[0] * song.bellOctave, t, 0.045, out);
    }
    // Besen: weiche Kick auf 1 und 3+, Wischer auf 2 und 4
    if (sec.brush) {
      if (k === 0 || k === 10) this.s.tone('sine', 88, t, 0.22, { freqEnd: 46, peak: 0.1, attack: 0.004, out });
      if (k === 4 || k === 12) this.hit(t, 0.14, 0.028, cur.fx.brush, 0.03);
      else if (k % 4 === 2) this.hit(t, 0.05, 0.01, cur.fx.brush, 0.01);
    }
  }

  // --- Kartenabend (M28) -------------------------------------------------------------------

  /** Dreiertakt: Bass auf der Eins, E-Piano auf Zwei und Drei, Gitarre, Melodie; darunter die Spannung. */
  waltzStep(cur, t) {
    const song = cur.song;
    const sec = song.sections[cur.sec];
    const k = cur.step;
    const [chord] = sec.chords[cur.bar];
    const beat = cur.stepDur * 4;
    const out = cur.bus;
    if (k === 0) this.bass(chord.bass, t, beat * 1.6, 0.1, out);
    if (k === 4 || k === 8) chord.ep.forEach((f, n) => this.ep(f, t + n * 0.01, beat * 0.7, 0.024, out));
    if (sec.arp && k % 2 === 0) {
      const pattern = [0, -1, 2, 3, 4, 2];
      const i = pattern[k / 2];
      if (i >= 0) this.pluck(chord.arp[i], t + rand(0, 0.01), (k === 0 ? 0.04 : 0.028) * rand(0.85, 1.1), out);
    }
    const n = sec.mel ? sec.mel[cur.bar][k] : null;
    if (n) {
      if ((sec.lead + cur.pass) % 2 === 0) this.flute(n[0], t, n[1] * cur.stepDur, 0.058, out);
      else this.bell(n[0] * song.bellOctave, t, 0.042, out);
    }
    if (sec.brush) {
      if (k === 0) this.s.tone('sine', 88, t, 0.2, { freqEnd: 46, peak: 0.08, attack: 0.004, out });
      if (k === 4 || k === 8) this.hit(t, 0.08, 0.016, cur.fx.brush, 0.02);
    }
    // Spannung: Streicher unter jedem Takt, leises Ticken auf den Achteln dazwischen
    const tension = this.tension || 0;
    if (tension > 0) {
      if (k === 0) this.pad(chord.ep, t, beat * 3, 0.014 * tension, 800, out);
      if (k % 4 === 2) this.hit(t, 0.03, 0.012 * tension, cur.fx.brush, 0.008);
    }
  }

  // --- Nacht ------------------------------------------------------------------------------

  nightStep(cur, t, threat) {
    const sec = cur.song.sections[0];
    const k = cur.step;
    const out = cur.bus;
    if (k === 0) {
      // Stufe steigt sofort zum Taktanfang, sinkt erst nach zwei ruhigeren Takten
      if (threat > cur.level) {
        cur.level = threat;
        cur.calm = 0;
      } else if (threat < cur.level) {
        if (++cur.calm >= 2) {
          cur.level--;
          cur.calm = 0;
        }
      } else cur.calm = 0;
    }
    const L = cur.level;
    const chord = sec.chords[cur.bar][0];
    const barNo = cur.bar; // 0..7
    // Becken zum Einsatz und bei Stufe 2 alle vier Takte
    if (k === 0 && (cur.first || (L >= 2 && barNo % 4 === 0))) this.s.noise(t, 1.5, { type: 'highpass', freq: 4800, peak: 0.07, attack: 0.002, out });
    // Kick
    if (k === 0 || k === 8 || (L >= 1 && k === 10)) {
      this.s.tone('sine', 150, t, 0.22, { freqEnd: 42, peak: k === 0 ? 0.46 : 0.4, attack: 0.002, out });
      this.hit(t, 0.012, 0.08, cur.fx.hat);
    }
    // Snare, bei Stufe 2 am Ende jeder vierten Takts ein Tom-Wirbel
    const fill = L >= 2 && barNo % 4 === 3 && k >= 12;
    if (fill) {
      const f = [150, 132, 112, 92][k - 12];
      this.s.tone('sine', f, t, 0.3, { freqEnd: f * 0.62, peak: 0.3, attack: 0.002, out });
    } else if (L >= 1 && (k === 4 || k === 12)) {
      this.s.noise(t, 0.16, { type: 'bandpass', freq: 1900, q: 0.6, peak: 0.16, out });
      this.s.tone('triangle', 200, t, 0.08, { freqEnd: 140, peak: 0.1, attack: 0.002, out });
    }
    // Hi-Hat: Achtel, betont auf »und«; bei Stufe 2 leise Sechzehntel dazwischen
    if (k % 2 === 0) this.hit(t, 0.035, k % 4 === 2 ? 0.06 : 0.035, cur.fx.hat);
    else if (L >= 2) this.hit(t, 0.025, 0.018, cur.fx.hat);
    // Achtel-Bass mit Oktavsprüngen
    if (k % 2 === 0) {
      const f = chord.bass * (DRIVE[k / 2] ? 2 : 1);
      this.note('sawtooth', f, t, cur.stepDur * 1.7, 0.065, cur.fx.bass, 0.004);
      this.note('sine', f, t, cur.stepDur * 1.8, 0.09, out, 0.004);
    }
    if (L >= 1) {
      // Staccato-Streicher in Sechzehnteln und eine tiefe Fläche darunter
      this.note('sawtooth', chord.str[OSTINATO[k]], t, 0.12, 0.022, cur.fx.strings, 0.005, k % 2 ? 5 : -5);
      if (k === 0) this.pad(chord.ep, t, cur.stepDur * 16, 0.013, 700, out);
    }
    // Boss (M22): eine Pauke auf der Eins und vor der Drei
    if (cur.song.boss && (k === 0 || k === 6)) this.s.tone('sine', k === 0 ? 82 : 98, t, 0.45, { freqEnd: 52, peak: 0.24, attack: 0.003, out });
    // Hörner mit der Melodie
    const n = L >= 2 && sec.mel ? sec.mel[barNo][k] : null;
    if (n) this.s.brass(n[0], t, n[1] * cur.stepDur * 0.92, 0.05, out);
  }

  // --- Instrumente ------------------------------------------------------------------------

  /** Ein Ton ohne eigenen Filter: Oszillator → Hüllkurve → out (Filter teilen sich die Töne). */
  note(type, f, t, dur, peak, out, attack = 0.005, detune = 0) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = f;
    if (detune) o.detune.value = detune;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(attack + 0.01, dur));
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.03);
    o.onended = () => g.disconnect();
  }

  /** Ein Rauschstoß ohne eigenen Filter (Hi-Hat, Besen). */
  hit(t, dur, peak, out, attack = 0.002) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.s.noiseBuffer;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(attack + 0.01, dur));
    src.connect(g).connect(out);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.03);
    src.onended = () => g.disconnect();
  }

  /** E-Piano: Sinus, frequenzmoduliert mit abklingendem Index (heller Anschlag, weicher Ton). */
  ep(f, t, dur, peak, out) {
    const c = this.ctx;
    const car = c.createOscillator();
    car.frequency.value = f;
    const mod = c.createOscillator();
    mod.frequency.value = f;
    const idx = c.createGain();
    idx.gain.setValueAtTime(f * 1.6, t);
    idx.gain.exponentialRampToValueAtTime(f * 0.18, t + 0.9);
    mod.connect(idx).connect(car.frequency);
    const g = c.createGain();
    const end = t + Math.max(0.8, dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(peak * 0.45, t + 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    car.connect(g).connect(out);
    car.start(t);
    mod.start(t);
    car.stop(end + 0.05);
    mod.stop(end + 0.05);
    car.onended = () => g.disconnect();
  }

  /**
   * Gezupfte Saite (Karplus-Strong): ein kurzer, weicher Rauschstoß läuft durch
   * eine Verzögerung mit Mittelwert – so klingt er wie eine Nylonsaite aus.
   * Einmal je Tonhöhe berechnet und gemerkt.
   */
  pluckBuffer(f) {
    const key = Math.round(f * 10);
    let hit = this.plucks.get(key);
    if (hit) return hit;
    const sr = 44100;
    const period = Math.max(4, Math.floor(sr / f - 0.5));
    const len = Math.floor(sr * 1.7);
    const buffer = this.ctx.createBuffer(1, len, sr);
    const d = buffer.getChannelData(0);
    let a = 0;
    let b = 0;
    for (let i = 0; i < period; i++) {
      a += (Math.random() * 2 - 1 - a) * 0.38;
      b += (a - b) * 0.38;
      d[i] = b;
    }
    d[period] = 0.998 * 0.5 * d[0];
    for (let i = period + 1; i < len; i++) d[i] = 0.998 * 0.5 * (d[i - period] + d[i - period - 1]);
    let max = 0;
    for (let i = 0; i < len; i++) max = Math.max(max, Math.abs(d[i]));
    const fade = Math.floor(sr * 0.3);
    for (let i = 0; i < len; i++) d[i] = (d[i] / (max || 1)) * Math.min(1, (len - i) / fade);
    hit = { buffer, rate: (f * (period + 0.5)) / sr };
    this.plucks.set(key, hit);
    return hit;
  }

  pluck(f, t, peak, out) {
    const c = this.ctx;
    const { buffer, rate } = this.pluckBuffer(f);
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const g = c.createGain();
    g.gain.value = peak;
    src.connect(g).connect(out);
    src.start(t);
    src.onended = () => g.disconnect();
  }

  /** Flöte: Dreieck und Sinus, weich angeblasen, das Vibrato setzt spät ein. */
  flute(f, t, dur, peak, out) {
    const c = this.ctx;
    const len = Math.max(0.2, dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.07);
    g.gain.setValueAtTime(peak, t + Math.max(0.08, len - 0.1));
    g.gain.linearRampToValueAtTime(0.0001, t + len + 0.12);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = Math.min(5000, f * 3.5);
    lp.connect(g).connect(out);
    const lfo = c.createOscillator();
    lfo.frequency.value = 5.2;
    const vib = c.createGain();
    vib.gain.setValueAtTime(0, t);
    vib.gain.linearRampToValueAtTime(f * 0.006, t + Math.min(0.6, len * 0.7));
    lfo.connect(vib);
    for (const [type, level] of [['triangle', 0.6], ['sine', 0.55]]) {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = f;
      vib.connect(o.frequency);
      const m = c.createGain();
      m.gain.value = level;
      o.connect(m).connect(lp);
      o.start(t);
      o.stop(t + len + 0.15);
      o.onended = () => g.disconnect();
    }
    lfo.start(t);
    lfo.stop(t + len + 0.15);
    // Atem beim Anblasen
    this.s.noise(t, 0.09, { type: 'bandpass', freq: f * 2, q: 1.5, peak: peak * 0.22, attack: 0.02, out });
  }

  /** Spieluhr: klarer Sinus mit kurzem, hellem Anschlag. */
  bell(f, t, peak, out) {
    this.s.tone('sine', f, t, 1.5, { peak, attack: 0.002, out });
    this.s.tone('sine', f * 2, t, 0.6, { peak: peak * 0.12, attack: 0.002, out });
    this.s.tone('sine', f * 3, t, 0.25, { peak: peak * 0.16, attack: 0.001, out });
  }

  /** Weicher Bass: Sinus mit etwas Dreieck. */
  bass(f, t, dur, peak, out) {
    this.s.tone('sine', f, t, dur, { peak, attack: 0.012, out });
    this.s.tone('triangle', f, t, dur * 0.7, { peak: peak * 0.35, attack: 0.012, filter: 520, out });
  }

  /** Streicherfläche: je Ton ein leicht verstimmter Sägezahn, dunkel gefiltert, langsam. */
  pad(freqs, t, dur, peak, cutoff, out) {
    const c = this.ctx;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = cutoff;
    lp.Q.value = 0.4;
    const g = c.createGain();
    const rise = t + Math.min(1.2, dur * 0.4);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, rise);
    g.gain.setValueAtTime(peak, Math.max(rise + 0.01, t + dur * 0.85));
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.8);
    lp.connect(g).connect(out);
    freqs.forEach((f, n) => {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = n % 2 ? 6 : -6;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.9);
      o.onended = () => g.disconnect();
    });
  }

  /** Kleiner Hall: abklingendes, nach hinten dunkler werdendes Rauschen als Raumantwort. */
  makeVerb() {
    const c = this.ctx;
    const sr = c.sampleRate;
    const len = Math.floor(sr * 1.6);
    const ir = c.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const x = i / len;
        lp += (Math.random() * 2 - 1 - lp) * (0.6 - 0.45 * x);
        d[i] = lp * (1 - x) ** 2.6 * Math.min(1, i / (sr * 0.01));
      }
    }
    const conv = c.createConvolver();
    conv.buffer = ir;
    const back = c.createGain();
    back.gain.value = 0.7;
    conv.connect(back).connect(this.out);
    return conv;
  }
}

/**
 * Ein Stück ohne Lautsprecher berechnen (für die Prüfung und zum Anhören):
 * ergibt Spitzenpegel, mittleren Pegel und auf Wunsch die Samples (Mono).
 * @param {Function} SoundClass die Klasse `Sound` (für tone, noise, brass)
 */
export async function renderMusic(SoundClass, id, seconds, { threat = 0, sampleRate = 22050, samples = false } = {}) {
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  const s = Object.create(SoundClass.prototype);
  s.ctx = ctx;
  s.counting = false;
  s.voices = 0;
  s.pitchMul = 1; // M26: die Streuung der Effekte gilt nie für die Musik
  s.noiseBuffer = ctx.createBuffer(1, sampleRate * 2, sampleRate);
  const nd = s.noiseBuffer.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const music = new Music(s, ctx.destination);
  if (id === 'jingle') music.jingle(); // die Spieluhr des Startbilds (N2)
  else {
    music.begin(id, 0.05);
    music.schedule(seconds, threat);
  }
  const buf = await ctx.startRendering();
  const l = buf.getChannelData(0);
  const r = buf.getChannelData(1);
  let peak = 0;
  let sum = 0;
  let bad = 0;
  for (let i = 0; i < l.length; i++) {
    const v = Math.max(Math.abs(l[i]), Math.abs(r[i]));
    if (!Number.isFinite(v)) bad++;
    else {
      peak = Math.max(peak, v);
      sum += (l[i] * l[i] + r[i] * r[i]) / 2;
    }
  }
  const out = { id, seconds, peak, rms: Math.sqrt(sum / l.length), bad };
  if (samples) {
    const mono = new Float32Array(l.length);
    for (let i = 0; i < l.length; i++) mono[i] = (l[i] + r[i]) / 2;
    out.samples = mono;
  }
  return out;
}
