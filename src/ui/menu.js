// Pause-Menü: Weiter, Steuerung, Herbstbuch (M25), Notizbuch (M18),
// Werkstattbuch (M20), Einstellungen, Vollbild, Neues Spiel (mit Rückfrage).
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
import { PIXEL_SIZES, TEXT_SPEEDS, VIEWS, SHAKES, FLASHES, HORDE_LOOKS } from '../core/settings.js';
import { DIFFICULTY_ORDER } from '../data/difficulty.js';
import { REACTION_ORDER, REACTION_COLORS } from '../data/reactions.js';
import { MIXES, MIX_ORDER, MIX_COLORS, MIX_HINTS } from '../data/mixes.js';
import { hexToCss } from '../render/palette.js';
import { DEEDS, KIND_ORDER } from '../data/book.js';
import { PAGE_ORDER, pagesRead } from '../data/isles.js';

/** Notizbuch (M18): Breite der Seite, Höhe einer Zeile der Liste, Breite der Beschreibung. */
const NOTES_W = 300;
const NOTE_ROW = 15;
const NOTE_TEXT_W = NOTES_W - 24;

/**
 * Herbstbuch (M25, Teil 2): drei Seiten, Breite, Zeilenhöhe, höchstens so viele
 * Zeilen je Spalte (mehr gehen in eine zweite Spalte), Mindesthöhe der
 * Beschreibung – so bleibt das Buch beim Blättern gleich groß.
 */
const BOOK_PAGES = ['taten', 'kunde', 'album', 'menschen', 'post', 'funkbuch', 'erinnerung']; // M31: »Erinnerung« erst mit dem ersten Verlust, M32: »Post« mit dem ersten Brief, N8: »Funkbuch« mit der ersten Seite
const BOOK_W = 420; // M32: Platz für sechs Reiter
const BOOK_ROW = 13;
const BOOK_ROWS = 8;
const BOOK_TEXT_W = BOOK_W - 24;
const BOOK_DETAIL_H = 6 * LINE_HEIGHT + 6;

/** Einstellungen der Reihe nach; Zahlen gehen von 0 bis 10. */
const SETTING_KEYS = ['master', 'music', 'sfx', 'view', 'pixel', 'text', 'shake', 'flashes', 'horde'];
const CHOICES = { pixel: Object.keys(PIXEL_SIZES), text: Object.keys(TEXT_SPEEDS), view: VIEWS, shake: SHAKES, flashes: FLASHES, horde: HORDE_LOOKS };

const SPRECHER_NAMES = Object.fromEntries(Object.entries(SPRECHER).map(([k, v]) => [k, v.name]));

export class Menu {
  /** @param {import('../core/game.js').Game} game */
  constructor(game) {
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
        { label: T.menue.vollbild, action: () => this.game.toggleFullscreen() },
        { label: T.menue.neuesSpiel, action: () => this.go('confirm') },
      ];
    }
    if (this.screen === 'settings') {
      const st = this.game.settings;
      const rows = SETTING_KEYS.map((key) => ({
        label: `${T.menue.einstellung[key]}: ${CHOICES[key] ? T.menue.wert[st[key]] : st[key]}`,
        setting: key,
        action: () => this.change(key, 1, true),
      }));
      // M16: Die Schwierigkeit gehört zum Spielstand und gilt ab der nächsten Nacht
      if (!this.fromTitle) rows.push({ label: `${T.schwierigkeit.titel}: ${T.schwierigkeit[this.game.state.difficulty]}`, setting: 'difficulty', action: () => this.change('difficulty', 1) });
      // M31: »Verluste« gehört zum Spielstand und geht nur noch von »an« nach »aus«
      if (!this.fromTitle) rows.push({ label: `${T.glocke.verluste}: ${this.game.defense.losses ? T.glocke.an : T.glocke.aus}`, setting: 'losses', action: () => this.change('losses', 1) });
      return [...rows, { label: T.menue.zurueck, action: () => this.go('main') }];
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
      // Schlurferkunde: Dr. Yusufs Notizen erst, wenn er in der Bucht ist
      rows = book.kindRows().map((k) =>
        k.n
          ? {
              id: k.id,
              label: k.name,
              right: String(k.n),
              color: COLORS.text,
              rightColor: COLORS.textDim,
              detail: [
                ...lines(k.info, COLORS.text),
                ...(book.yusufWrites ? lines(T.buch.notiz(k.note), COLORS.textWarm, true) : lines(T.buch.ohneYusuf, COLORS.textDim, true)),
                ...(book.yusufWrites && k.id === 'schlurfer' && this.game.state.autumn?.frost ? lines(T.buch.notiz(T.buch.nachFrost), COLORS.textWarm, true) : []), // G4
                ...lines(T.buch.erledigt(k.n), COLORS.textDim, true),
              ],
            }
          : { id: k.id, label: T.buch.unbekannt, right: '', color: COLORS.textDim, detail: lines(T.buch.nieErledigt, COLORS.textDim) }
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
   */
  bookLayout(ui) {
    const data = this.bookData();
    const buttons = this.buttons();
    const rows = buttons.filter((b) => b.row);
    const cols = rows.length > BOOK_ROWS ? 2 : 1;
    const perCol = Math.max(1, Math.ceil(rows.length / cols));
    const lineH = (list) => list.reduce((h, l) => h + LINE_HEIGHT + (l.gap ? 3 : 0), 0);
    const detailH = Math.max(BOOK_DETAIL_H, ...rows.map((b) => lineH(b.row.detail)));
    const w = BOOK_W;
    const h = 28 + 16 + LINE_HEIGHT + 4 + BOOK_ROWS * BOOK_ROW + 6 + detailH + 8 + 22 + 20;
    const x = Math.round((ui.width - w) / 2);
    const y = Math.round((ui.height - h) / 2);
    // Reiter der drei Seiten, mittig unter dem Titel
    const pages = this.bookPages();
    const tabW = pages.map((p) => measure(T.buch.seiten[p]) + 12);
    let tx = Math.round(x + (w - tabW.reduce((a, b) => a + b + 4, -4)) / 2);
    const tabs = pages.map((page, k) => {
      const rect = { x: tx, y: y + 25, w: tabW[k], h: 13 };
      tx += tabW[k] + 4;
      return { page, rect };
    });
    const countY = y + 25 + 16;
    const rowsY = countY + LINE_HEIGHT + 4;
    const colW = Math.floor((w - 20) / cols);
    let k = 0;
    const rects = buttons.map((b) => {
      if (b.row) {
        const c = Math.floor(k / perCol);
        const r = k % perCol;
        k += 1;
        return { ...b, rect: { x: x + 10 + c * colW, y: rowsY + r * BOOK_ROW, w: colW - (cols > 1 ? 4 : 0), h: BOOK_ROW - 1 } };
      }
      return { ...b, rect: { x: x + 20, y: y + h - 20 - 22, w: w - 40, h: 19 } };
    });
    // Beschreibung der gewählten Zeile – steht »Zurück« im Fokus, die zuletzt gewählte
    const focused = buttons[Math.min(this.focus, buttons.length - 1)];
    if (focused?.row) this.bookFocus = focused.row.id;
    const shown = rows.find((b) => b.row.id === this.bookFocus)?.row || rows[0]?.row || null;
    return { x, y, w, h, controls: [], confirmText: [], buttons: rects, book: { tabs, count: data.count, countY, detail: shown ? shown.detail : data.empty, detailY: rowsY + BOOK_ROWS * BOOK_ROW + 6, shown: shown?.id ?? null } };
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
      const shown = b.row.id === L.book.shown;
      if (focused || shown) ui.rect(b.rect.x, b.rect.y, b.rect.w, b.rect.h, focused ? COLORS.fillHover : COLORS.fillLight);
      if (focused) for (let k = 0; k < 3; k++) ui.rect(b.rect.x + 3 + k, b.rect.y + 2 + k, 1, 7 - 2 * k, COLORS.gold); // kleiner Pfeil
      ui.text(b.row.label, b.rect.x + 12, b.rect.y, b.row.color);
      if (b.row.right) ui.text(b.row.right, b.rect.x + b.rect.w - 4 - measure(b.row.right), b.rect.y, b.row.rightColor);
    });
    let cy = L.book.detailY;
    ui.rect(L.x + 10, cy - 4, L.w - 20, 1, COLORS.frameDark);
    for (const l of L.book.detail) {
      if (l.gap) cy += 3;
      ui.text(l.text, L.x + 12, cy, l.color);
      cy += LINE_HEIGHT;
    }
    ui.textCentered(T.buch.fuss, L.x + L.w / 2, L.y + L.h - 15, COLORS.textDim);
  }

  /** Maße und Knopf-Rechtecke für die aktuelle Seite. */
  layout(ui) {
    if (this.screen === 'buch') return this.bookLayout(ui);
    if (this.screen === 'notes' || this.screen === 'recipes') return this.notesLayout(ui);
    const buttons = this.buttons();
    const controls = this.screen === 'controls' ? T.steuerung : [];
    const confirmText = this.screen === 'confirm' ? wrap(T.menue.sicherFrage, 190) : this.screen === 'settings' ? [T.menue.einstellungenHinweis] : [];
    // m16-r1: Die Steuerung wird so breit, dass Taste und Text nie aneinanderstoßen
    const w = this.screen === 'controls' ? Math.max(250, ...controls.map(([key, what]) => measure(key) + measure(what) + 36)) : 220;
    const bodyH = controls.length ? controls.length * LINE_HEIGHT + 8 : confirmText.length ? confirmText.length * LINE_HEIGHT + 8 : 0;
    // M26: Mit Wackeln und Blitzen hat die Einstellungsseite zehn Zeilen – etwas enger
    const step = buttons.length > 9 ? 20 : 22;
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
    const w = NOTES_W;
    const h = 28 + LINE_HEIGHT + 4 + rows.length * NOTE_ROW + 6 + detailH + 8 + 22 + 20;
    const x = Math.round((ui.width - w) / 2);
    const y = Math.round((ui.height - h) / 2);
    let cy = y + 28 + LINE_HEIGHT + 4;
    const rects = buttons.map((b) => {
      if (b.note) {
        const rect = { x: x + 10, y: cy, w: w - 20, h: NOTE_ROW - 1 };
        cy += NOTE_ROW;
        return { ...b, rect };
      }
      return { ...b, rect: { x: x + 20, y: y + h - 20 - 22, w: w - 40, h: 19 } };
    });
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
    const title = { controls: T.menue.steuerung, confirm: T.menue.neuesSpiel, settings: T.menue.einstellungen, notes: T.notizbuch.titel, recipes: T.werkstattbuch.titel, buch: T.buch.titel }[this.screen] || T.menue.titel;
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
