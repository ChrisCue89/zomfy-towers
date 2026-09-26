// Rechnen mit dem Vorrat: Kosten prüfen, bezahlen, zurückgeben, gutschreiben.
// Kosten und Gewinne sind Objekte wie { holz: 3, schrott: 1 }.

export function canAfford(inventory, cost = {}) {
  for (const [res, n] of Object.entries(cost)) if ((inventory[res] || 0) < n) return false;
  return true;
}

export function pay(inventory, cost = {}) {
  if (!canAfford(inventory, cost)) return false;
  for (const [res, n] of Object.entries(cost)) inventory[res] -= n;
  return true;
}

export function gain(inventory, gains = {}) {
  for (const [res, n] of Object.entries(gains)) inventory[res] = (inventory[res] || 0) + n;
}

/**
 * Wie nah bin ich dran? 0..1 – Anteil der Kosten, der schon im Vorrat liegt
 * (jede Einheit zählt gleich).
 */
export function progressToward(inventory, cost = {}) {
  let need = 0;
  let have = 0;
  for (const [res, n] of Object.entries(cost)) {
    need += n;
    have += Math.min(n, inventory[res] || 0);
  }
  return need ? have / need : 1;
}

/** Was fehlt noch? { holz: 2 } */
export function missing(inventory, cost = {}) {
  const out = {};
  for (const [res, n] of Object.entries(cost)) {
    const lack = n - (inventory[res] || 0);
    if (lack > 0) out[res] = lack;
  }
  return out;
}
