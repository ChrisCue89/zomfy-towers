// Clip `sammeln`: Mika fällt eine Birke (Axt, Holzspäne, Laub), nah (160 px/m), Tag.
import { openDay, installWalker, camAt } from './_common.mjs';

const FRAMES = 40;
const KEYS = [[0, -1.3, -12.3], [FRAMES - 1, -1.5, -12.3]];
const PROBE = process.env.PROBE;

const rec = await openDay({ hour: 10, minute: 30, day: 2, weather: 'wind', view: 'nah' });
await installWalker(rec);
const info = await rec.eval(() => {
  const z = window.zomfy;
  const g = z.game;
  // Axt aus dem Hackklotz genommen (echter Weg des Spiels), Beute-Zahlen später egal
  g.takeAxe();
  g.state.hotbar.selected = g.state.hotbar.slots.indexOf('axt');
  g.updateHeldItem(false);
  if (g.dialog.active) z.finishDialog();
  g.mode = 'play';
  const cr = g.world.crows;
  for (const c of cr.list) if (c.state === 'sitzt') cr.leave(c, true);
  const node = g.world.resources.byId.get('birke-1');
  node.hitsLeft = 2; // die Birke ist schon angeschlagen: zwei Hiebe fällen sie
  z.teleport(-0.7, -11.15, -Math.PI / 2); // Mika steht östlich der Birke und schaut nach Westen
  const p = g.player.position;
  return { tree: { x: node.x, z: node.z, kind: node.kind }, mika: { x: p.x, z: p.z }, axe: g.state.tools.axt, held: g.player.heldTool };
});
console.log(JSON.stringify(info));
await rec.sim(1);

if (PROBE) {
  await rec.eval(() => { const g = window.zomfy.game; g.input.pressedCodes.add('KeyE'); g.input.down.add('KeyE'); });
  let cur = 0;
  for (const f of PROBE.split(',').map(Number)) {
    await rec.sim((f - cur) / 30);
    const [x, z] = camAt(KEYS, f);
    await rec.clip('_p/sammeln-f' + f, { frames: 1, cam: { keys: [[0, x, z]] }, uiLayer: false });
    cur = f + 1;
  }
  console.log(JSON.stringify(await rec.eval(() => { const g = window.zomfy.game; const n = g.world.resources.byId.get('birke-1'); return { hits: n.hitsLeft, dep: n.depleted, inv: window.zomfy.state().inventory }; })));
} else {
  await rec.clip('sammeln', {
    frames: FRAMES,
    ui: 'world',
    cam: { keys: KEYS },
    each: (i) => {
      const g = window.zomfy.game;
      if (i === 2) { g.input.pressedCodes.add('KeyE'); g.input.down.add('KeyE'); } // E halten: hacken und weiterhacken (echte Taste)
    },
    description: 'Vormittag (10:30, Windwetter, Ansicht nah): Mika (im Profil, schaut nach links) fällt eine Birke mit der Axt: erster Hieb Bild ~9 (Holzspäne, Laub, Klang hacken), zweiter Hieb Bild ~26 (Baum fällt, Staub, Laubwolke). Klangereignisse "hacken" mit Bildnummer in events.json. Die Birke war vorher schon angeschlagen (2 statt 4 Hiebe), damit sie im Clip fällt.',
  });
}
console.log('problems', rec.problems);
await rec.close();
process.exit(0);
