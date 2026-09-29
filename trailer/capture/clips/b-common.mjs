// Gemeinsame Hilfen der Nacht-Clips (Gruppe B): Zustand vorbereiten, Türme setzen,
// Schlurfer stellen. Alles läuft über die Test-Schnittstelle des Spiels (window.zomfy) –
// gebaut und geschossen wird mit dem echten Spiel, nichts ist Kulisse.

/** Hinweise, die sonst Dialoge öffnen und das Spiel anhalten. */
const FLAGS = ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm', 'blitzHinweis', 'werkbankGebaut', 'lockeHinweis'];

/**
 * Zustand herstellen: Tag, Uhrzeit, Wetter, Vorrat; Horde aus (die Schlurfer stellen die Skripte selbst).
 * Danach steht `window.__b` (Hilfen im Spiel) zur Verfügung.
 */
export async function prepare(rec, { day = 4, hour = 21, minute = 0, weather = 'klar', view = null } = {}) {
  await rec.eval(({ day, hour, minute, weather, view, FLAGS }) => {
    const Z = window.zomfy;
    const g = Z.game;
    Z.quietChoices(true);
    for (const f of FLAGS) Z.setFlag(f);
    Z.setWeather(weather, true);
    Z.setHorde(false);
    Z.setDay(day);
    Z.setTime(hour, minute);
    Z.give({ holz: 400, stein: 150, schrott: 900, zahnraeder: 60, stoff: 30, moderkerne: 20, fasern: 60, teile: 30 });
    if (view) g.applySettings({ view });
    // Hilfen im Spiel
    window.__b = {
      /** vor jedem Bild: Dialoge und Wahlen wegräumen, damit die Zeit läuft */
      keep() {
        if (g.dialog.active) Z.finishDialog();
        if (g.mode === 'perk') {
          const id = g.perkChoice.options[0];
          if (g.perkChoice.kind === 'perk') Z.choosePerk(id);
          else if (g.perkChoice.kind === 'bauplan') Z.chooseBlueprint(id);
          else Z.chooseSkill(id);
        }
      },
      /** Uhrzeit festhalten (Minuten seit 06:00) */
      hold(h, m = 0) {
        Z.setTime(h, m);
      },
      /** Schlurfer mit Leben-Faktor, wie der Nachtplan sie stellt (spawnZombie kennt ihn nicht) */
      zombie(type, x, z, o = {}) {
        const zo = g.horde.spawn(type, { x, z, hpFactor: o.hp || 1, speedFactor: o.speed || 1, champion: o.champion || null, trait: o.trait || null });
        zo.state = 'walk';
        if (zo.champion) g.onChampion(zo);
        return zo.id;
      },
      /** Wege: Mittelpunkt des Weges an der Spalte x (Meter) */
      pathZ(x) {
        const col = Z.pathColumn(Math.floor(x));
        return col.length ? col.reduce((a, b) => a + b, 0) / col.length + 0.5 : null;
      },
    };
  }, { day, hour, minute, weather, view, FLAGS });
}

/**
 * Türme setzen: list = [{ type, i, j, level, spec, xp, parts }]. Gibt je Turm Id oder Grund zurück.
 * Bauen kostet wie im Spiel (der Vorrat ist gefüllt), Ausbau ebenso.
 */
export function placeTowers(rec, list) {
  return rec.eval((list) => {
    const Z = window.zomfy;
    const out = [];
    for (const t of list) {
      const check = Z.placeCheck(t.type, t.i, t.j, t.turns || 0);
      if (!check.ok) {
        out.push({ ...t, ok: false, why: check.reason });
        continue;
      }
      const r = Z.build(t.type, t.i, t.j, t.turns || 0);
      const b = Z.buildings().find((q) => q.type === t.type && q.i === t.i && q.j === t.j);
      if (r !== 'ok' || !b) {
        out.push({ ...t, ok: false, why: r });
        continue;
      }
      if ((t.level || 1) >= 2) Z.upgradeTower(b.id, 2, null);
      if ((t.level || 1) >= 3) Z.upgradeTower(b.id, 3, t.spec || 'A');
      if ((t.level || 1) >= 4) Z.upgradeTower(b.id, 4, t.spec || 'A');
      if ((t.level || 1) >= 5) Z.upgradeTower(b.id, 5, t.spec || 'A');
      if (t.xp) Z.giveTowerXp(b.id, t.xp);
      out.push({ ...t, ok: true, id: b.id });
    }
    return out;
  }, list);
}
