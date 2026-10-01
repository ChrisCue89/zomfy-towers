// Pause-Menü: Weiter, Steuerung, Herbstbuch (M25), Notizbuch (M18),
// Werkstattbuch (M20), Einstellungen, Spielstand (S1: als Datei sichern und laden),
// Vollbild, Neues Spiel (mit Rückfrage).
// Layout wird einmal berechnet und von update() (Klicks) und draw() genutzt.
// Schutz vor versehentlichem Löschen: Nach jedem Seitenwechsel zählen Klicks
// kurz nicht, die Maus wählt nur aus, wenn sie bewegt wird, und in der
// Rückfrage liegt „Lieber nicht“ dort, wo eben noch „Neues Spiel“ stand.

import { PEOPLE, personOf } from '../core/survivors.js';
import { KEEPSAKES } from '../data/bonds.js';
import { SPRECHER } from '../data/dialogs.js';
import { T } from '../data/texts.js';
import { COLORS } from './ui.js';
import { measure, LINE_HEIGHT, wrap } from './font.js';
import { PIXEL_SIZES, UI_SIZES, TEXT_SPEEDS, VIEWS, SHAKES, FLASHES, HORDE_LOOKS, FIGURE_LOOKS } from '../core/settings.js';
import { DIFFICULTY_ORDER } from '../data/difficulty.js';
import { REACTION_ORDER, REACTION_COLORS } from '../data/reactions.js';
import { MIXES, MIX_ORDER, MIX_COLORS, MIX_HINTS } from '../data/mixes.js';
import { hexToCss } from '../render/palette.js';
import { DEEDS, KIND_ORDER, KIND_PICTURE } from '../data/book.js';
import { KindPictures } from './kindPictures.js';
import { PAGE_ORDER, pagesRead } from '../data/isles.js';
import { PLACES, placesKnown, placeLines, movedTo } from '../data/places.js';

/** Notizbuch (M18): Breite der Seite, Höhe einer Zeile der Liste, Breite der Beschreibung. */
const NOTES_W = 300;
const NOTE_ROW = 15;
const NOTE_TEXT_W = NOTES_W - 24;

/**
 * Herbstbuch (M25, Teil 2): drei Seiten, Breite, Zeilenhöhe, höchstens so viele
 * Zeilen je Spalte (mehr gehen in eine zweite Spalte), Mindesthöhe der
 * Beschreibung – so bleibt das Buch beim Blättern gleich groß.
 */
const BOOK_PAGES = ['taten', 'kunde', 'album', 'menschen', 'orte', 'post', 'funkbuch', 'erinnerung']; // M31: »Erinnerung« erst mit dem ersten Verlust, M32: »Post« mit dem ersten Brief, N8: »Funkbuch« mit der ersten Seite, G5: »Orte«
const BOOK_W = 420; // M32: Platz für sechs Reiter
const BOOK_ROW = 13;
const BOOK_ROWS = 8;
const BOOK_TEXT_W = BOOK_W - 24;
const BOOK_DETAIL_H = 6 * LINE_HEIGHT + 6;
/** G5: Höhe einer Reihe von Reitern (passen sie nicht in eine, brechen sie in zwei um). */
const BOOK_TAB_ROW = 15;

/** Einstellungen der Reihe nach; Zahlen gehen von 0 bis 10. */
const SETTING_KEYS = ['master', 'music', 'sfx', 'view', 'pixel', 'ui', 'text', 'shake', 'flashes', 'horde', 'figuren'];
const CHOICES = { pixel: Object.keys(PIXEL_SIZES), ui: Object.keys(UI_SIZES), text: Object.keys(TEXT_SPEEDS), view: VIEWS, shake: SHAKES, flashes: FLASHES, horde: HORDE_LOOKS, figuren: FIGURE_LOOKS };

/**
 * G5: Reiter auf Reihen verteilen – eine, wenn alle nebeneinander passen, sonst zwei, so
 * geteilt, dass die breitere Reihe möglichst schmal ist. Gibt je Reihe die Indizes zurück.
 */
function splitTabs(widths, maxW) {
  const width = (from, to) => widths.slice(from, to).reduce((a, w) => a + w + 4, -4);
  const all = widths.map((_, k) => k);
  if (width(0, widths.length) <= maxW || widths.length < 2) return [all];
  let best = 1;
  for (let k = 1; k < widths.length; k++) if (Math.max(width(0, k), width(k, widths.length)) < Math.max(width(0, best), width(best, widths.length))) best = k;
  return [all.slice(0, best), all.slice(best)];
}

const SPRECHER_NAMES = Object.fromEntries(Object.entries(SPRECHER).map(([k, v]) => [k, v.name]));

export class Menu {
  /** @param {import('../core/game.js').Game} game */
  constructor(game) {
    this.kindPictures = new KindPictures(); // F3d: Bilder der Schlurferkunde
    this.game = game;
    this.isOpen = false;
    this.screen = 'main';
    this.focus = 0;
    this.guard = 0;
    this.page = 'taten'; // Herbstbuch: aufgeschlagene Seite
    this.bookCache = null; // Zeilen und Beschreibungen der Seite (das Spiel steht, solange das Menü offen ist)
  }

  open() {
    this.isOpen = true;
    this.go('main');
  }

  close() {
    this.isOpen = false;
  }

  buttons() {
    if (this.screen === 'main') {
      return [
        { label: T.menue.weiter, action: () => this.game.closeMenu() },
        { label: T.menue.steuerung, action: () => this.go('controls') },
        { label: T.buch.menue, action: () => this.go('buch') },
        { label: T.notizbuch.menue, action: () => this.go('notes') },
        { label: T.werkstattbuch.menue, action: () => this.go('recipes') },
        { label: T.menue.einstellungen, action: () => this.go('settings') },
        { label: T.menue.spielstand, action: () => this.go('spielstand') },
        { label: T.menue.vollbild, action: () => this.game.toggleFullscreen() },
        { label: T.menue.neuesSpiel, action: () => this.go('confirm') },
      ];
    }
    if (this.screen === 'settings') {
      const st = this.game.settings;
      const rows = SETTING_KEYS.map((key) => ({
        label: `${T.menue.einstellung[key]}: ${CHOICES[key] ? T.menue.wert[st[key]] : st[key]}${key === 'ui' ? this.uiNote() : ''}`,
        setting: key,
        action: () => this.change(key, 1, true),
      }));
      // M16: Die Schwierigkeit gehört zum Spielstand und gilt ab der nächsten Nacht
      if (!this.fromTitle) rows.push({ label: `${T.schwierigkeit.titel}: ${T.schwierigkeit[this.game.state.difficulty]}`, setting: 'difficulty', action: () => this.change('difficulty', 1) });
      // M31: »Verluste« gehört zum Spielstand und geht nur noch von »an« nach »aus«
      if (!this.fromTitle) rows.push({ label: `${T.glocke.verluste}: ${this.game.defense.losses ? T.glocke.an : T.glocke.aus}`, setting: 'losses', action: () => this.change('losses', 1) });
      return [...rows, { label: T.menue.zurueck, action: () => this.go('main') }];
    }
    // S1: der Spielstand als Datei – sichern, laden (mit Rückfrage), zurück
    if (this.screen === 'spielstand') {
      const list = [];
      if (!this.fromTitle || this.game.titleHasSave) list.push({ label: T.spielstand.sichern, action: () => this.game.exportSaveFile() });
      list.push({ label: T.spielstand.laden, action: () => this.game.importSaveFile() });
      return [...list, { label: T.menue.zurueck, action: () => this.go('main') }];
    }
    if (this.screen === 'importFrage') {
      return [
        { label: T.spielstand.ja, action: () => this.game.confirmImport() },
        { label: T.spielstand.nein, action: () => {
          this.game.pendingImport = null;
          this.go('spielstand');
        }, safe: true },
      ];
    }
    if (this.screen === 'confirm') {
      return [
        { label: T.menue.sicherJa, action: () => this.game.newGameFromMenu() },
        { label: T.menue.sicherNein, action: () => this.go('main'), safe: true },
      ];
    }
    if (this.screen === 'notes') {
      // Notizbuch (M18): je Reaktion eine Zeile, darunter steht, was die gewählte tut
      const notes = this.game.state.notes || {};
      return [
        ...REACTION_ORDER.map((k) => ({ label: notes[k] ? `${T.reaktionen[k][0]} · ${T.notizbuch.entdeckt(notes[k])}` : T.notizbuch.unbekannt, note: k, action: () => this.game.sound.play('klick') })),
        { label: T.menue.zurueck, action: () => this.go('main') },
      ];
    }
    if (this.screen === 'buch') {
      // Herbstbuch (M25): je Seite eine Liste, darunter die Beschreibung der gewählten Zeile
      return [...this.bookData().rows.map((row) => ({ label: row.label, row, action: () => this.game.sound.play('klick') })), { label: T.menue.zurueck, action: () => this.go('main') }];
    }
    if (this.screen === 'recipes') {
      // Werkstattbuch (M20): je Rezept eine Zeile, unentdeckte als »???«
      const recipes = this.game.state.recipes || {};
      return [
        ...MIX_ORDER.map((k) => ({ label: recipes[k] ? `${T.misch[k][0]} · ${T.werkstattbuch.entdeckt(recipes[k])}` : T.misch.unbekannt, note: k, action: () => this.game.sound.play('klick') })),
        { label: T.menue.zurueck, action: () => this.go('main') },
      ];
    }
    return [{ label: T.menue.zurueck, action: () => this.go('main') }];
  }

  /** H4: Lässt das Fenster die gewählte Oberflächengröße nicht zu, sagt die Zeile, was gilt. */
  uiNote() {
    const want = UI_SIZES[this.game.settings.ui] ?? 0;
    const applied = this.game.pixel.uiShiftApplied || 0;
    if (want === applied) return '';
    const name = Object.keys(UI_SIZES).find((k) => UI_SIZES[k] === applied) || 'mittel';
    return ` ${T.menue.hierWie(T.menue.wert[name])}`;
  }

  /**
   * Einen Wert ändern. A/D schieben Zahlen (0–10) bis zum Anschlag – eine
   * leise gestellte Lautstärke springt so nie auf voll (m7-r1). E/Enter geht
   * der Reihe nach weiter, auch mit Umlauf, sonst käme man per E nicht zurück.
   */
  change(key, dir, cycle = false) {
    if (key === 'losses') {
      // M31: nur von »an« nach »aus« (Nr. 166)
      const st = this.game.state;
      if (st.losses) {
        st.losses = false;
        this.game.hud.toast(T.glocke.verlusteInfo.aus, 'lagerglocke', 3);
        this.game.quietSave();
      } else this.game.hud.toast(st.difficulty === 'gemuetlich' ? T.glocke.verlusteInfo.gemuetlich : T.glocke.verlusteInfo.nurAus, 'lagerglocke', 2.6);
      this.game.sound.play('klick');
      return;
    }
    if (key === 'difficulty') {
      const n = DIFFICULTY_ORDER.length;
      const next = DIFFICULTY_ORDER[(DIFFICULTY_ORDER.indexOf(this.game.state.difficulty) + dir + n) % n];
      this.game.setDifficulty(next);
      this.game.sound.play('klick');
      return;
    }
    const st = this.game.settings;
    let value;
    if (CHOICES[key]) {
      const list = CHOICES[key];
      value = list[(list.indexOf(st[key]) + dir + list.length) % list.length];
    } else value = cycle ? (st[key] + dir + 11) % 11 : Math.max(0, Math.min(10, st[key] + dir));
    if (value === st[key]) return; // am Anschlag: kein Klick, nichts zu speichern
    this.game.applySettings({ [key]: value });
    this.game.sound.play('klick');
  }

  go(screen) {
    // Vom Titelbild aus: »Zurück« führt wieder dorthin, nicht ins Pausenmenü
    if (screen === 'main' && this.fromTitle) {
      this.game.closeMenu();
      return;
    }
    this.screen = screen;
    this.bookCache = null;
    const safe = this.buttons().findIndex((b) => b.safe);
    this.focus = Math.max(0, safe);
    this.guard = 0.35;
  }

  /**
   * Übersicht des Notizbuchs (M18): wie viele entdeckt sind, dann je Reaktion
   * eine Zeile – Name und Tag, unentdeckte als »???«.
   */
  noteLines() {
    if (this.screen === 'recipes') {
      const recipes = this.game.state.recipes || {};
      return [{ text: T.werkstattbuch.zaehler(MIX_ORDER.filter((k) => recipes[k]).length, MIX_ORDER.length) }];
    }
    const notes = this.game.state.notes || {};
    const found = REACTION_ORDER.filter((k) => notes[k]);
    return [{ text: T.notizbuch.zaehler(found.length, REACTION_ORDER.length) }, ...this.buttons().filter((b) => b.note).map((b) => ({ text: b.label }))];
  }

  /**
   * Beschreibung einer Reaktion im Notizbuch: was geschieht und Dr. Yusufs
   * Notiz – unentdeckt nur ein Hinweis.
   */
  noteDetail(k) {
    if (this.screen === 'recipes') return this.recipeDetail(k);
    const [, info, note] = T.reaktionen[k];
    if (!this.game.state.notes?.[k]) return wrap(T.notizbuch.hinweis[k], NOTE_TEXT_W).map((text) => ({ text, color: COLORS.textDim }));
    return [
      ...wrap(info, NOTE_TEXT_W).map((text) => ({ text, color: COLORS.text })),
      ...wrap(T.notizbuch.notiz(note), NOTE_TEXT_W).map((text, i) => ({ text, color: COLORS.textWarm, gap: i === 0 })),
    ];
  }

  /**
   * Eintrag im Werkstattbuch (M20): was der Mischturm tut und woraus er
   * entsteht – unentdeckt die Regel und ein Hinweis von Bert oder Juna, wenn
   * sie eingezogen sind.
   */
  recipeDetail(k) {
    const [, info, hint] = T.misch[k];
    const [a, b] = MIXES[k].parts;
    const parts = T.werkstattbuch.zutaten(T.bauten[a], T.bauten[b]);
    if (this.game.state.recipes?.[k]) {
      return [
        ...wrap(info, NOTE_TEXT_W).map((text) => ({ text, color: COLORS.text })),
        { text: parts, color: COLORS.textWarm, gap: true },
      ];
    }
    const helper = this.game.survivors?.resident(MIX_HINTS[k]);
    return [
      ...wrap(T.werkstattbuch.regel, NOTE_TEXT_W).map((text) => ({ text, color: COLORS.textDim })),
      ...wrap(helper ? hint : T.werkstattbuch.keinHinweis, NOTE_TEXT_W).map((text, i) => ({ text, color: helper ? COLORS.textWarm : COLORS.textDim, gap: i === 0 })),
    ];
  }

  // --- Herbstbuch (M25, Teil 2) ----------------------------------------------------

  /** Umblättern: dir ±1 (A/D) oder direkt auf eine Seite (Klick auf den Reiter). */
  turnPage(dir, page = null) {
    const pages = this.bookPages();
    const n = pages.length;
    const next = page || pages[(pages.indexOf(this.page) + dir + n) % n];
    if (next === this.page) return;
    this.page = next;
    this.bookCache = null;
    this.bookFocus = null;
    this.focus = 0;
    this.game.sound.play('klick');
  }

  /** Die Seiten des Herbstbuchs – »Erinnerung« (M31) erst, wenn jemand gefallen ist, »Post« (M32) mit dem ersten Brief. */
  bookPages() {
    const st = this.game.state;
    return BOOK_PAGES.filter((p) => (p !== 'erinnerung' || st.fallen?.length) && (p !== 'post' || st.post?.read?.length) && (p !== 'funkbuch' || pagesRead(st).length));
  }

  /** Zeilen, Beschreibungen und Zähler der aufgeschlagenen Seite (einmal je Seite berechnet). */
  bookData() {
    if (this.bookCache?.page === this.page) return this.bookCache;
    const book = this.game.book;
    const W = BOOK_TEXT_W;
    const lines = (text, color, gap = false) => wrap(text, W).map((t, i) => ({ text: t, color, gap: gap && i === 0 }));
    let rows = [];
    let count = '';
    let empty = [];
    if (this.page === 'taten') {
      const next = book.nextDeco();
      const deco = lines(next ? T.buch.naechsterSchmuck(next.left, T.bauten[next.type]) : T.buch.allerSchmuck, COLORS.textWarm, true);
      rows = book.deedRows().map((d) => ({
        id: d.id,
        label: d.name,
        right: d.done ? T.buch.geschafft(d.day) : T.buch.stand(d.have, d.need),
        color: d.done ? COLORS.gold : COLORS.text,
        rightColor: d.done ? COLORS.textWarm : COLORS.textDim,
        detail: [...lines(d.info, COLORS.text), ...lines(d.done ? T.buch.geschafftAm(d.day) : T.buch.bisher(d.have, d.need), d.done ? COLORS.gold : COLORS.textDim), ...deco],
      }));
      count = T.buch.tatenZaehler(book.doneCount, DEEDS.length, book.totalStars);
    } else if (this.page === 'kunde') {
      // Schlurferkunde: Dr. Yusufs Notizen erst, wenn er in der Bucht ist. F3d: rechts daneben das
      // Bild der Art (unbekannt als Schattenriss) – der Text läuft schmaler
      const narrow = (text, color, gap = false) => wrap(text, W - KIND_PICTURE.col).map((t, i) => ({ text: t, color, gap: gap && i === 0 }));
      rows = book.kindRows().map((k) =>
        k.n
          ? {
              id: k.id,
              label: k.name,
              right: String(k.n),
              color: COLORS.text,
              rightColor: COLORS.textDim,
              picture: { type: k.id, known: true },
              detail: [
                ...narrow(k.info, COLORS.text),
                ...(book.yusufWrites ? narrow(T.buch.notiz(k.note), COLORS.textWarm, true) : narrow(T.buch.ohneYusuf, COLORS.textDim, true)),
                ...(book.yusufWrites && k.id === 'schlurfer' && this.game.state.autumn?.frost ? narrow(T.buch.notiz(T.buch.nachFrost), COLORS.textWarm, true) : []), // G4
                ...narrow(T.buch.erledigt(k.n), COLORS.textDim, true),
              ],
            }
          : { id: k.id, label: T.buch.unbekannt, right: '', color: COLORS.textDim, picture: { type: k.id, known: false }, detail: narrow(T.buch.nieErledigt, COLORS.textDim) }
      );
      count = T.buch.kundeZaehler(book.kindsKnown, KIND_ORDER.length);
    } else if (this.page === 'menschen') {
      // M28/M29: Menschenkunde – je Mensch, wie nah ihr euch seid (ein Wort, keine Zahl), das
      // Erinnerungsstück, die Kartenabende und Mikas Verdacht
      const kt = T.karten;
      const tb = T.bindung.buch;
      const g = this.game;
      const cardRows = Object.fromEntries(g.cardNight.bookRows().map((r) => [r.id, r]));
      const ids = [...PEOPLE.filter((id) => g.survivors.resident(id)), ...Object.keys(cardRows).filter((id) => !PEOPLE.includes(id))];
      rows = ids.map((id) => {
        const r = cardRows[id];
        const resident = PEOPLE.includes(id);
        const stage = resident ? g.bonds.stage(id) : 0;
        const k = KEEPSAKES[id];
        const gift = k && (g.state.bonds?.[id]?.moment || 0) >= 3;
        return {
          id,
          label: SPRECHER_NAMES[id] || personOf(id)?.name || id,
          right: resident ? T.bindung.stufen[stage] : `${r.won} : ${r.lost}`,
          color: COLORS.text,
          rightColor: resident && stage >= 2 ? COLORS.gold : COLORS.textDim,
          detail: [
            ...(resident ? lines(tb.stufe[stage], stage ? COLORS.text : COLORS.textDim) : []),
            ...(gift ? lines(tb.stueck(T.bindung.stuecke[k.item]), COLORS.gold) : []),
            ...(r ? lines(kt.buch.abende(r.played, r.won, r.lost), COLORS.text) : []),
            ...(r ? lines(`${kt.buch.stueck(kt.stuecke[r.stake])}${r.stakeWon ? ` – ${kt.buch.stueckDa}` : ''}`, r.stakeWon ? COLORS.gold : COLORS.textDim) : []),
            ...(r ? lines(r.note || kt.buch.unbekannt, r.note ? COLORS.textWarm : COLORS.textDim, true) : []),
            // M31: Wunden und Narben von der Nacht mit der Glocke
            ...(resident && g.defense.wound(id) ? lines(T.glocke.wundeBuch(g.defense.wound(id), Math.max(1, (g.state.wounds[id]?.until || 0) - g.state.time.day)), COLORS.red, true) : []),
            ...(resident && g.state.scars?.[id] ? lines(T.glocke.narbe, COLORS.textDim) : []),
          ],
        };
      });
      empty = lines(tb.leer, COLORS.textDim);
    } else if (this.page === 'post') {
      // M32: Briefe von unterwegs – Absender, Tag, der Brief selbst, der Ort
      const N = T.netz;
      rows = [...(this.game.state.post?.read || [])].reverse().map((m, k) => {
        const who = personOf(m.from);
        const place = T.wanderer.vomOrt[who?.place] || '';
        const text = m.kind === 'brief2' ? N.zweite[m.from] : T.wanderer.briefe[m.from];
        return {
          id: `post-${k}`,
          label: `${who?.name || m.from}${m.kind === 'brief2' ? ' (2)' : ''}`,
          right: N.tag(m.day),
          color: COLORS.text,
          rightColor: COLORS.textDim,
          detail: [...lines(text || N.stimmeAlle, COLORS.textWarm), ...lines(N.buchOrt(place, m.day), COLORS.textDim, true)],
        };
      });
      count = N.buchTitel;
      empty = lines(N.buchLeer, COLORS.textDim);
    } else if (this.page === 'funkbuch') {
      // N8: Eddas Funkbuch – die gefundenen Seiten nach Datum, wo sie lagen
      const F = T.funkbuch;
      const read = pagesRead(this.game.state);
      rows = PAGE_ORDER.filter((id) => read.includes(id)).map((id) => ({
        id: `funkbuch-${id}`,
        label: F.seite(PAGE_ORDER.indexOf(id) + 1),
        right: F.tage[id],
        color: COLORS.text,
        rightColor: COLORS.textDim,
        detail: [...lines(id === 'marthe' ? T.nebel.seite : T.inseln.notizen[id], COLORS.textWarm), ...lines(F.orte[id], COLORS.textDim, true)],
      }));
      count = F.titel(read.length, PAGE_ORDER.length);
    } else if (this.page === 'orte') {
      // G5: Ortskunde – jeder Ort, den Mika kennt, mit der Herkunft seines Namens und dem, was
      // Mika seitdem über ihn erfahren hat
      const O = T.ortskunde;
      const st = this.game.state;
      const known = placesKnown(st);
      rows = known.map((id) => {
        const place = PLACES[id];
        const t = O.orte[id];
        const named = !place.named || place.named(st);
        const more = placeLines(st, id).map((k) => (typeof t[k] === 'function' ? t[k](st.player?.name || 'Mika') : t[k]));
        const moved = place.place ? movedTo(st, place.place).map((w) => personOf(w)?.name || w) : [];
        return {
          id: `ort-${id}`,
          label: named ? t.name : t.nameNebel,
          right: O.art[place.art],
          color: COLORS.text,
          rightColor: COLORS.textDim,
          detail: [
            ...lines(named ? t.herkunft : t.herkunftNebel, COLORS.textWarm),
            ...more.flatMap((text, i) => lines(text, COLORS.text, i === 0)),
            ...(moved.length ? lines(O.dorthin(moved), COLORS.textDim, true) : []),
          ],
        };
      });
      count = O.titel(known.length);
    } else if (this.page === 'erinnerung') {
      // M31: Die mit uns waren – Name, Tage in der Bucht, die Zeile, die bleibt, das Erinnerungsstück
      const E = T.erinnerung;
      rows = (this.game.state.fallen || []).map((f) => {
        const name = personOf(f.id)?.name || f.id;
        return {
          id: `erinnerung-${f.id}`,
          label: name,
          right: E.tage(f.from, f.to),
          color: COLORS.text,
          rightColor: COLORS.textDim,
          detail: [...lines(E.zeilen[f.id] || E.zeile(name), COLORS.textWarm), ...(f.item ? lines(E.stueck(T.bindung.karte.namen[f.item] || f.item), COLORS.textDim, true) : [])],
        };
      });
      count = E.seite;
      empty = lines(E.leer, COLORS.textDim);
    } else {
      rows = book.album().map((a) => ({
        id: String(a.id),
        label: a.name,
        right: String(a.kills),
        color: COLORS.text,
        rightColor: COLORS.textDim,
        detail: [
          ...lines(T.turmrang.titel(a.name, a.art), COLORS.textWarm),
          ...lines(T.buch.albumRang(a.rang, a.kills), COLORS.text),
          ...(a.best ? lines(T.buch.albumNacht(a.best), COLORS.gold) : []),
          ...(a.day ? lines(T.buch.albumSeit(a.day), COLORS.textDim) : []),
        ],
      }));
      count = rows.length ? T.buch.albumZaehler(rows.length) : '';
      empty = lines(T.buch.albumLeer, COLORS.textDim);
    }
    this.bookCache = { page: this.page, rows, count, empty };
    return this.bookCache;
  }

  /**
   * Herbstbuch: Reiter der Seiten, Zähler, Zeilen (bei mehr als acht in zwei
   * Spalten, wählbar wie Knöpfe), die Beschreibung der gewählten, »Zurück«.
   * G5: Passen die Reiter nicht in eine Reihe, brechen sie in zwei um; hat eine Seite mehr
   * Zeilen als zwei Spalten fassen, blättert die Liste spaltenweise mit der Auswahl.
   */
  bookLayout(ui) {
    const data = this.bookData();
    const buttons = this.buttons();
    const rows = buttons.filter((b) => b.row);
    const lineH = (list) => list.reduce((h, l) => h + LINE_HEIGHT + (l.gap ? 3 : 0), 0);
    const detailH = Math.max(BOOK_DETAIL_H, ...rows.map((b) => lineH(b.row.detail)));
    const w = BOOK_W;
    const pages = this.bookPages();
    const tabW = pages.map((p) => measure(T.buch.seiten[p]) + 12);
    const tabLines = splitTabs(tabW, w - 20);
    // H4: so viele Zeilen je Spalte, wie in die Höhe der Oberfläche passen (höchstens acht)
    const fixedH = 28 + tabLines.length * BOOK_TAB_ROW + 1 + LINE_HEIGHT + 4 + 6 + detailH + 8 + 22 + 20;
    const colRows = Math.max(3, Math.min(BOOK_ROWS, Math.floor((ui.height - 8 - fixedH) / BOOK_ROW)));
    const cols = rows.length > colRows ? 2 : 1;
    const paged = rows.length > colRows * 2;
    const perCol = paged ? colRows : Math.max(1, Math.ceil(rows.length / cols));
    const h = fixedH + colRows * BOOK_ROW;
    const x = Math.round((ui.width - w) / 2);
    const y = Math.round((ui.height - h) / 2);
    // Reiter der Seiten, mittig unter dem Titel – je Reihe für sich zentriert
    const tabs = [];
    tabLines.forEach((line, r) => {
      let tx = Math.round(x + (w - line.reduce((a, k) => a + tabW[k] + 4, -4)) / 2);
      for (const k of line) {
        tabs.push({ page: pages[k], rect: { x: tx, y: y + 25 + r * BOOK_TAB_ROW, w: tabW[k], h: 13 } });
        tx += tabW[k] + 4;
      }
    });
    const countY = y + 25 + tabLines.length * BOOK_TAB_ROW + 1;
    const rowsY = countY + LINE_HEIGHT + 4;
    const colW = Math.floor((w - 20) / cols);
    // Die gewählte Zeile – steht »Zurück« im Fokus, die zuletzt gewählte
    const focused = buttons[Math.min(this.focus, buttons.length - 1)];
    if (focused?.row) this.bookFocus = focused.row.id;
    const shownAt = Math.max(0, rows.findIndex((b) => b.row.id === this.bookFocus));
    // Lange Seiten: zwei Spalten sichtbar, die gewählte Zeile möglichst in der rechten
    const lastStart = Math.ceil(rows.length / colRows) * colRows - colRows * 2;
    const start = paged ? Math.max(0, Math.min(lastStart, (Math.floor(shownAt / colRows) - 1) * colRows)) : 0;
    const end = paged ? start + colRows * 2 : rows.length;
    let k = 0;
    const rects = buttons.map((b) => {
      if (b.row) {
        const i = k - start;
        k += 1;
        if (i < 0 || k > end) return { ...b, hidden: true, rect: { x: -1000, y: -1000, w: 0, h: 0 } };
        const c = Math.floor(i / perCol);
        const r = i % perCol;
        return { ...b, rect: { x: x + 10 + c * colW, y: rowsY + r * BOOK_ROW, w: colW - (cols > 1 ? 4 : 0), h: BOOK_ROW - 1 } };
      }
      return { ...b, rect: { x: x + 20, y: y + h - 20 - 22, w: w - 40, h: 19 } };
    });
    const shown = rows[shownAt]?.row || null;
    // Pfeile an den Rändern der Liste, wenn davor oder danach noch Zeilen liegen (anklickbar)
    const arrowH = colRows * BOOK_ROW;
    const arrows = [];
    if (start > 0) arrows.push({ dir: -1, rect: { x: x + 1, y: rowsY, w: 8, h: arrowH } });
    if (end < rows.length) arrows.push({ dir: 1, rect: { x: x + w - 9, y: rowsY, w: 8, h: arrowH } });
    return { x, y, w, h, controls: [], confirmText: [], buttons: rects, book: { tabs, count: data.count, countY, detail: shown ? shown.detail : data.empty, detailY: rowsY + colRows * BOOK_ROW + 6, detailH, picture: shown?.picture || null, shown: shown?.id ?? null, arrows, start, colRows } };
  }

  /** Herbstbuch zeichnen: Reiter, Zähler, Zeilen mit Wert rechts, Beschreibung, »Zurück«. */
  drawBook(ui, L) {
    for (const t of L.book.tabs) {
      const open = t.page === this.page;
      if (open) ui.rect(t.rect.x, t.rect.y, t.rect.w, t.rect.h, COLORS.fillLight);
      ui.textCentered(T.buch.seiten[t.page], t.rect.x + t.rect.w / 2, t.rect.y + 1, open ? COLORS.gold : COLORS.textDim);
    }
    if (L.book.count) ui.textCentered(L.book.count, L.x + L.w / 2, L.book.countY, COLORS.textDim);
    L.buttons.forEach((b, i) => {
      const focused = i === this.focus;
      if (!b.row) {
        ui.button(b.label, b.rect.x, b.rect.y, b.rect.w, b.rect.h, { focused, hoverHighlight: false });
        return;
      }
      if (b.hidden) return; // G5: auf einer anderen Spalte der langen Liste
      const shown = b.row.id === L.book.shown;
      if (focused || shown) ui.rect(b.rect.x, b.rect.y, b.rect.w, b.rect.h, focused ? COLORS.fillHover : COLORS.fillLight);
      if (focused) for (let k = 0; k < 3; k++) ui.rect(b.rect.x + 3 + k, b.rect.y + 2 + k, 1, 7 - 2 * k, COLORS.gold); // kleiner Pfeil
      ui.text(b.row.label, b.rect.x + 12, b.rect.y, b.row.color);
      if (b.row.right) ui.text(b.row.right, b.rect.x + b.rect.w - 4 - measure(b.row.right), b.rect.y, b.row.rightColor);
    });
    // G5: kleine Pfeile, wenn die Liste weitergeht
    for (const a of L.book.arrows) {
      const cx = a.rect.x + (a.dir < 0 ? 2 : 5);
      const my = a.rect.y + Math.round(a.rect.h / 2);
      for (let k = 0; k < 3; k++) ui.rect(cx + (a.dir < 0 ? k : -k), my - 2 + k, 1, 5 - 2 * k, COLORS.gold);
    }
    let cy = L.book.detailY;
    ui.rect(L.x + 10, cy - 4, L.w - 20, 1, COLORS.frameDark);
    for (const l of L.book.detail) {
      if (l.gap) cy += 3;
      ui.text(l.text, L.x + 12, cy, l.color);
      cy += LINE_HEIGHT;
    }
    // F3d: das Bild der Art rechts neben der Beschreibung, auf der Unterkante stehend
    const p = L.book.picture;
    if (p) {
      this.kindPictures.pump();
      const pic = this.kindPictures.get(p.type, p.known);
      this.kindShown = pic ? { type: p.type, known: p.known, w: pic.w, h: pic.h, f: pic.f, silhouette: pic.silhouette } : { type: p.type, known: p.known, pending: true };
      if (pic) {
        const px = L.x + L.w - 12 - KIND_PICTURE.col + Math.floor((KIND_PICTURE.col - pic.w) / 2);
        const py = L.book.detailY - 2 + Math.max(pic.h, L.book.detailH) - pic.h;
        ui.ctx.drawImage(pic.canvas, px, py);
        this.kindShown.at = { x: px, y: py };
      }
    } else this.kindShown = null;
    ui.textCentered(T.buch.fuss, L.x + L.w / 2, L.y + L.h - 15, COLORS.textDim);
  }

  /** Maße und Knopf-Rechtecke für die aktuelle Seite. */
  layout(ui) {
    if (this.screen === 'buch') return this.bookLayout(ui);
    if (this.screen === 'notes' || this.screen === 'recipes') return this.notesLayout(ui);
    const buttons = this.buttons();
    const controls = this.screen === 'controls' ? T.steuerung : [];
    const pending = this.game.pendingImport;
    const confirmText =
      this.screen === 'confirm'
        ? wrap(T.menue.sicherFrage, 190)
        : this.screen === 'settings'
          ? [T.menue.einstellungenHinweis]
          : this.screen === 'spielstand'
            ? wrap(T.spielstand.hinweis, 190)
            : this.screen === 'importFrage' && pending
              ? wrap(T.spielstand.frage(pending.name, pending.day), 190)
              : [];
    // m16-r1: Die Steuerung wird so breit, dass Taste und Text nie aneinanderstoßen
    // H4: Die Einstellungen werden so breit wie ihre längste Zeile (»Oberfläche: groß (hier wie mittel)«)
    const w = this.screen === 'controls' ? Math.max(250, ...controls.map(([key, what]) => measure(key) + measure(what) + 36)) : this.screen === 'settings' ? Math.max(220, ...buttons.map((b) => measure(b.label) + 50)) : 220;
    const bodyH = controls.length ? controls.length * LINE_HEIGHT + 8 : confirmText.length ? confirmText.length * LINE_HEIGHT + 8 : 0;
    // M26: Mit Wackeln und Blitzen hat die Einstellungsseite zehn Zeilen – etwas enger;
    // H4: bei großer Oberfläche (wenige Zeilen) so eng, dass alles ins Bild passt (F4: mit
    // »Figuren« vierzehn Zeilen – bei 270 Zeilen 14 Pixel je Knopf)
    const room = Math.floor((ui.height - 16 - 30 - bodyH - 20) / Math.max(1, buttons.length));
    const step = Math.max(14, Math.min(buttons.length > 9 ? 20 : 22, room));
    const h = 30 + bodyH + buttons.length * step + 20;
    const x = Math.round((ui.width - w) / 2);
    const y = Math.round((ui.height - h) / 2);
    let cy = y + 28 + bodyH;
    const rects = buttons.map((b) => {
      const rect = { x: x + 20, y: cy, w: w - 40, h: step - 3 };
      cy += step;
      return { ...b, rect };
    });
    return { x, y, w, h, controls, confirmText, buttons: rects };
  }

  /**
   * Notizbuch (M18): Zähler, eine Zeile je Reaktion (wählbar wie Knöpfe),
   * darunter die Beschreibung der gewählten, unten »Zurück«. Die Höhe richtet
   * sich nach der längsten Beschreibung – so springt die Seite beim Blättern nicht.
   */
  notesLayout(ui) {
    const buttons = this.buttons();
    const rows = buttons.filter((b) => b.note);
    const lineH = (list) => list.reduce((h, l) => h + LINE_HEIGHT + (l.gap ? 3 : 0), 0);
    const detailH = Math.max(...rows.map((b) => lineH(this.noteDetail(b.note))));
    // H4: Bei wenigen Zeilen der Oberfläche stehen die Einträge in zwei Spalten (breiter)
    const fixedH = 28 + LINE_HEIGHT + 4 + 6 + detailH + 8 + 22 + 20;
    const cols = fixedH + rows.length * NOTE_ROW > ui.height - 8 && rows.length > 4 ? 2 : 1;
    const perCol = Math.ceil(rows.length / cols);
    const w = cols > 1 ? NOTES_W + 60 : NOTES_W;
    const h = fixedH + perCol * NOTE_ROW;
    const x = Math.round((ui.width - w) / 2);
    const y = Math.round((ui.height - h) / 2);
    const top = y + 28 + LINE_HEIGHT + 4;
    const colW = Math.floor((w - 20) / cols);
    let k = 0;
    const rects = buttons.map((b) => {
      if (b.note) {
        const c = Math.floor(k / perCol);
        const r = k % perCol;
        k += 1;
        return { ...b, rect: { x: x + 10 + c * colW, y: top + r * NOTE_ROW, w: colW - (cols > 1 ? 4 : 0), h: NOTE_ROW - 1 } };
      }
      return { ...b, rect: { x: x + 20, y: y + h - 20 - 22, w: w - 40, h: 19 } };
    });
    const cy = top + perCol * NOTE_ROW;
    // Beschreibung der gewählten Zeile – steht »Zurück« im Fokus, die zuletzt gewählte
    const focused = buttons[Math.min(this.focus, buttons.length - 1)];
    if (focused?.note) this.noteFocus = focused.note;
    const shown = this.noteFocus && rows.some((b) => b.note === this.noteFocus) ? this.noteFocus : rows[0].note;
    return { x, y, w, h, controls: [], confirmText: [], buttons: rects, notes: { count: this.noteLines()[0].text, detail: this.noteDetail(shown), detailY: cy + 6, shown } };
  }

  /** @param {import('../core/input.js').Input} input */
  update(input, dt = 0) {
    if (!this.isOpen) return;
    this.guard = Math.max(0, this.guard - dt);
    const ui = this.game.ui;
    const L = this.layout(ui);
    const { buttons } = L;
    // Herbstbuch (M25): A/D blättern, ein Klick auf einen Reiter schlägt die Seite auf
    if (L.book) {
      if (input.pressed('left') || input.pressed('right')) {
        this.turnPage(input.pressed('left') ? -1 : 1);
        return;
      }
      const tab = L.book.tabs.find((t) => ui.hover(t.rect.x, t.rect.y, t.rect.w, t.rect.h));
      if (tab && input.mouse.clicked) {
        input.consumeClick();
        if (this.guard <= 0) this.turnPage(0, tab.page);
        return;
      }
      // G5: Pfeil am Rand einer langen Liste – die Auswahl springt eine Spalte weiter
      const arrow = L.book.arrows.find((a) => ui.hover(a.rect.x, a.rect.y, a.rect.w, a.rect.h));
      if (arrow && input.mouse.clicked) {
        input.consumeClick();
        const rows = buttons.filter((b) => b.row);
        const at = Math.max(0, rows.findIndex((b) => b.row.id === L.book.shown));
        const next = rows[Math.max(0, Math.min(rows.length - 1, at + arrow.dir * L.book.colRows))];
        this.focus = buttons.indexOf(next);
        this.game.sound.play('klick');
        return;
      }
    }
    const hovered = buttons.findIndex((b) => ui.hover(b.rect.x, b.rect.y, b.rect.w, b.rect.h));
    if (hovered >= 0 && input.mouse.moved) this.focus = hovered;
    if (input.pressed('up')) this.focus = (this.focus + buttons.length - 1) % buttons.length;
    if (input.pressed('down')) this.focus = (this.focus + 1) % buttons.length;
    // Einstellungen: A/D bzw. Pfeile ändern den Wert der gewählten Zeile
    const focused = buttons[Math.min(this.focus, buttons.length - 1)];
    if (focused?.setting && (input.pressed('left') || input.pressed('right'))) this.change(focused.setting, input.pressed('left') ? -1 : 1);
    if (input.mouse.clicked && this.guard > 0) {
      input.consumeClick();
    } else if (hovered >= 0 && input.mouse.clicked) {
      input.consumeClick();
      buttons[hovered].action();
    } else if (input.pressed('confirm')) {
      buttons[Math.min(this.focus, buttons.length - 1)].action();
    } else if (input.pressed('menu')) {
      if (this.screen === 'main') this.game.closeMenu();
      else this.go('main');
    }
  }

  /** @param {import('./ui.js').UICanvas} ui */
  draw(ui) {
    if (!this.isOpen) return;
    ui.ditherFill(0.5);
    const L = this.layout(ui);
    ui.panel(L.x, L.y, L.w, L.h);
    const title = { controls: T.menue.steuerung, confirm: T.menue.neuesSpiel, settings: T.menue.einstellungen, notes: T.notizbuch.titel, recipes: T.werkstattbuch.titel, buch: T.buch.titel, spielstand: T.menue.spielstand, importFrage: T.menue.spielstand }[this.screen] || T.menue.titel;
    ui.textCentered(title, L.x + L.w / 2, L.y + 7, COLORS.gold);
    ui.rect(L.x + 10, L.y + 21, L.w - 20, 1, COLORS.frameDark);
    let cy = L.y + 28;
    for (const [key, what] of L.controls) {
      ui.text(key, L.x + 12, cy, COLORS.textWarm);
      ui.text(what, L.x + L.w - 12 - measure(what), cy, COLORS.text);
      cy += LINE_HEIGHT;
    }
    if (L.notes) {
      this.drawNotes(ui, L);
      return;
    }
    if (L.book) {
      this.drawBook(ui, L);
      return;
    }
    for (const line of L.confirmText) {
      ui.textCentered(line, L.x + L.w / 2, cy, COLORS.text);
      cy += LINE_HEIGHT;
    }
    L.buttons.forEach((b, i) => ui.button(b.label, b.rect.x, b.rect.y, b.rect.w, b.rect.h, { focused: i === this.focus, hoverHighlight: false }));
    ui.textCentered(T.menue.fusszeile, L.x + L.w / 2, L.y + L.h - 15, COLORS.textDim);
  }

  /** Notizbuch (M18): Zähler, Zeilen der Reaktionen, Beschreibung, »Zurück«. */
  drawNotes(ui, L) {
    // Dieselbe Seite trägt das Werkstattbuch (M20)
    const recipes = this.screen === 'recipes';
    const notes = (recipes ? this.game.state.recipes : this.game.state.notes) || {};
    const colors = recipes ? MIX_COLORS : REACTION_COLORS;
    ui.textCentered(L.notes.count, L.x + L.w / 2, L.y + 28, COLORS.textDim);
    L.buttons.forEach((b, i) => {
      const focused = i === this.focus;
      if (!b.note) {
        ui.button(b.label, b.rect.x, b.rect.y, b.rect.w, b.rect.h, { focused, hoverHighlight: false });
        return;
      }
      const shown = b.note === L.notes.shown;
      if (focused || shown) ui.rect(b.rect.x, b.rect.y, b.rect.w, b.rect.h, focused ? COLORS.fillHover : COLORS.fillLight);
      const color = notes[b.note] ? hexToCss(colors[b.note]) : COLORS.textDim;
      if (focused) for (let k = 0; k < 3; k++) ui.rect(b.rect.x + 3 + k, b.rect.y + 3 + k, 1, 7 - 2 * k, COLORS.gold); // kleiner Pfeil
      ui.text(b.label, b.rect.x + 12, b.rect.y + 1, color);
    });
    let cy = L.notes.detailY;
    ui.rect(L.x + 10, cy - 4, L.w - 20, 1, COLORS.frameDark);
    for (const l of L.notes.detail) {
      if (l.gap) cy += 3;
      ui.text(l.text, L.x + 12, cy, l.color);
      cy += LINE_HEIGHT;
    }
    ui.textCentered(T.menue.fusszeile, L.x + L.w / 2, L.y + L.h - 15, COLORS.textDim);
  }
}
