// Was auf den Inseln steht (N6): Netz an der Stange, Zelt, Steinbank, Kiste, wilde Kürbisse
// und die Katze – dazu, was mit nach Hause kommt: die Katze auf der Veranda und zwei
// Kürbisse vor der Tür. Fundstellen mit Einblendung (`isleFind`), die isles.js nur auf der
// Insel freigibt, auf der Mika steht.

import * as THREE from 'three';
import { createStaticVoxelObject } from '../render/staticMesh.js';
import { FINE32 } from './voxelKit.js';
import { FINDS, FIND_ORDER, CAT, HOME_PUMPKINS } from '../data/isles.js';
import { buildIsleTent, buildNetPole, buildNet, buildStoneBench, buildIsleChest, buildWildPumpkins, buildCat32, buildHomePumpkins } from './isleModels.js';

const MODELS = { netz: buildNet, zelt: buildIsleTent, bank: buildStoneBench, kiste: buildIsleChest, kuerbisse: buildWildPumpkins, katze: () => buildCat32() };
const PROMPTS = { netz: 'mitnehmen', zelt: 'durchsuchen', bank: 'hinsetzen', kiste: 'oeffnen', kuerbisse: 'ernten', katze: 'streicheln' };
const STAYS = { zelt: true, bank: true }; // bleiben stehen, wenn gefunden (nur die Einblendung geht)
const BLOCK = { zelt: 0.62, bank: 0.55, kiste: 0.32, netz: 0.16, kuerbisse: 0.3 }; // Kollision (die Katze hat keine)
const POLE = { netz: true }; // die Stange bleibt stehen, auch wenn das Netz mitgenommen ist

export function createIsleProps({ seed, materials, colliders }) {
  const group = new THREE.Group();
  group.name = 'Inseln';
  const objects = new Map();
  const blockers = new Map();
  const interactions = [];
  const add = (model, x, z, name) => {
    const object = createStaticVoxelObject(model, materials.world, { seed, size: FINE32, shadow: 'coarse4' });
    object.position.set(x, 0, z);
    object.name = name;
    group.add(object);
    return object;
  };
  FIND_ORDER.forEach((id, k) => {
    const f = FINDS[id];
    objects.set(id, add(MODELS[id](seed + 300 + k), f.x, f.z, `Insel: ${id}`));
    interactions.push({ id: `insel-${id}`, x: f.x, z: f.z + 0.55, radius: 1.0, prompt: PROMPTS[id], isleFind: id, enabled: true });
    if (BLOCK[id]) blockers.set(id, colliders.addCircle(f.x, f.z, BLOCK[id], 'insel'));
  });
  add(buildNetPole(), FINDS.netz.x, FINDS.netz.z, 'Insel: Netzstange'); // bleibt stehen
  // Was mit nach Hause kommt: die Katze rechts der Tür, die Kürbisse links davon
  const homeCat = add(buildCat32(), CAT.x, CAT.z, 'Mieze');
  homeCat.visible = false;
  const homePumpkins = add(buildHomePumpkins(seed + 320), HOME_PUMPKINS.x, HOME_PUMPKINS.z, 'Inselkürbisse');
  homePumpkins.visible = false;
  const catInteraction = { id: 'mieze', x: CAT.x, z: CAT.z + 0.5, radius: 0.9, prompt: 'streicheln', homeCat: true, enabled: false };
  interactions.push(catInteraction);

  return {
    group,
    interactions,
    homeCat,
    homePumpkins,
    /** Gefundenes verschwindet (Zelt und Bank bleiben stehen), was mitkam, steht zu Hause. */
    setFound(found, cat) {
      for (const [id, object] of objects) {
        const done = found.includes(id);
        object.visible = !done || Boolean(STAYS[id]);
        const block = blockers.get(id);
        if (block) block.enabled = !done || Boolean(STAYS[id] || POLE[id]);
        const it = interactions.find((q) => q.isleFind === id);
        it.enabled = !done || Boolean(FINDS[id].bench);
      }
      homeCat.visible = cat;
      catInteraction.enabled = cat;
      homePumpkins.visible = found.includes('kuerbisse');
    },
  };
}
