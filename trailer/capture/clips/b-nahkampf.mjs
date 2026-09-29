// Clip `nahkampf`: Mika schlägt nachts am Lagerfeuer mit der Axt zu (Ansicht `nah`, 160 px/m).
// Treffer-Blitz, Wackeln, Trefferstopp; der letzte Schlurfer fällt in Zeitlupe (die Nacht ist gehalten).
// Gespielt wird über die echten Eingaben des Spiels (Maus und Tasten werden je Bild gesetzt),
// nichts ist Kulisse. Kamera folgt Mika wie im Spiel.
//   node capture/clips/b-nahkampf.mjs            (ZT_NAME=_probe ZT_FRAMES=1 für Proben)
import { Rec } from '../lib.mjs';
import { prepare } from './b-common.mjs';

const NAME = process.env.ZT_NAME || 'nahkampf';
const FRAMES = Number(process.env.ZT_FRAMES || 75);

const rec = await Rec.open({ ui: 'world' });
await prepare(rec, { day: 4, hour: 21, minute: 0, view: 'nah' });
await rec.eval(() => {
  const Z = window.zomfy;
  const g = Z.game;
  g.state.tools.axt = true;
  g.addToHotbar('axt');
  Z.teleport(0.9, -0.1, 4.2); // Mika steht am Feuer und schaut nach Westen
  g.player.facing = -Math.PI / 2;
  // vier Schlurfer und ein Flitzer kommen aus dem Westen über den Hof
  const b = window.__b;
  const list = [['schlurfer', -1.5, -0.35], ['schlurfer', -1.8, 0.45], ['schlurfer', -2.6, -0.1], ['schlurfer', -3.3, 0.6], ['flitzer', -4.6, -0.3]];
  for (const [t, x, z] of list) b.zombie(t, x, z, { hp: t === 'flitzer' ? 1.0 : 0.6 });
  // Nacht gilt als schon geplant: nur diese Schlurfer sind noch übrig – fällt der letzte, ist sie gehalten
  g.nights.beginNight(g.state.time.day);
  g.state.night.wave = g.nights.plan.waves.length;
  g.nights.queue.length = 0;
  g.nights.enabled = true;
  // Autopilot über die echten Eingaben: hinlaufen, auf den nächsten zielen, zuschlagen, einmal ausweichen
  const inp = g.input;
  const keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
  let rolled = false;
  window.__b.pilot = (i) => {
    for (const k of keys) inp.down.delete(k);
    inp.mouse.down = false;
    const p = g.player.position;
    const zs = g.horde.list.filter((z) => z.state !== 'dying' && z.state !== 'enter');
    if (!zs.length) return;
    let best = zs[0];
    let bd = Infinity;
    for (const z of zs) {
      const d = Math.hypot(z.x - p.x, z.z - p.z);
      if (d < bd) { bd = d; best = z; }
    }
    const u = g.worldToUi(best.x, 0.9, best.z);
    Object.assign(inp.mouse, { x: u.x, y: u.y, inside: true, moved: true });
    const dx = best.x - p.x;
    const dz = best.z - p.z;
    // ausweichen: ein Zombie steht ganz nah und holt gerade aus
    if (!rolled && i >= 30 && g.combat.canRoll) {
      rolled = true;
      inp.down.add('KeyS'); // Ausweichrolle nach Süden
      inp.pressedCodes.add('Space');
      return;
    }
    if (bd > 1.9) {
      if (dx > 0.4) inp.down.add('KeyD');
      else if (dx < -0.4) inp.down.add('KeyA');
      if (dz > 0.4) inp.down.add('KeyS');
      else if (dz < -0.4) inp.down.add('KeyW');
    }
    if (bd < 2.3 && !g.player.action && g.player.swingReady) {
      inp.mouse.clicked = true;
      inp.mouse.down = true;
    }
  };
});
await rec.sim(0.2);
if (process.env.ZT_DRY) {
  // Trockenlauf ohne Bilder: Ablauf des Autopiloten protokollieren
  const log = await rec.eval((n) => {
    const g = window.zomfy.game;
    const out = [];
    for (let i = 0; i < n; i++) {
      window.__b.keep();
      window.__b.pilot(i);
      window.__sim(1);
      const zs = g.horde.list.filter((z) => z.state !== 'dying');
      out.push(`${i}: alive ${zs.length} hp ${Math.round(g.state.player.hp)} act ${g.player.action?.kind || '-'} slow ${g.slowT > 0 ? 1 : 0} stop ${g.hitstop > 0 ? 1 : 0} p ${g.player.position.x.toFixed(1)},${g.player.position.z.toFixed(1)} z ${zs.slice(0, 3).map((z) => `${z.x.toFixed(1)}/${z.z.toFixed(1)}/${Math.round(z.hp)}${z.state[0]}`).join(' ')} done ${g.state.night.done}`);
    }
    return out;
  }, FRAMES);
  console.log(log.filter((_, i) => i % 3 === 0).join('\n'));
  await rec.close();
  process.exit(0);
}
const r = await rec.clip(NAME, {
  frames: FRAMES,
  cam: null,
  each: (i) => { window.__b.keep(); window.__b.pilot(i); },
  description: 'Nacht am Lagerfeuer, Ansicht nah (160 px/m), Kamera folgt Mika. Mika (Axt, echte Eingaben) schlägt die Schlurfer zurück, Treffer-Blitz, Wackeln, Trefferstopp; der letzte Schlurfer fällt in Zeitlupe.',
});
console.log(r.problems);
const end = await rec.eval(() => ({ alive: window.zomfy.game.horde.alive, night: window.zomfy.state().night.done, hp: window.zomfy.state().player.hp, kills: window.zomfy.state().stats.kills }));
console.log(JSON.stringify(end));
await rec.close();
process.exit(0);
