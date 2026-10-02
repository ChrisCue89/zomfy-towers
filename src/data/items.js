// Ressourcen und Gegenstände. Anzeigenamen stehen in texts.js.

/** Reihenfolge der Ressourcen im HUD. */
export const RESOURCES = ['holz', 'stein', 'fasern', 'stoff', 'schrott', 'teile', 'zahnraeder', 'moderkerne'];

/**
 * Sondervorräte – im Vorrat, im HUD nur, solange man sie hat: N7 Nägel und Zucker für Marthes Kahn,
 * A5 Pilze für den Kessel.
 */
export const QUEST_ITEMS = ['naegel', 'zucker', 'pilze'];

/** Seltene Vorräte, die erst nach dem ersten Fund im HUD erscheinen. */
export const RARE_RESOURCES = ['moderkerne'];

/**
 * Zombieteile (Meilenstein 8): das Loot der Nacht. Man tauscht sie morgens beim
 * Händler gegen Schrott und anderes – was er damit macht, sagt er nicht.
 */
export const NIGHT_LOOT = 'teile';

/** Dinge für die Schnellleiste (rechte Hand). Die Laterne trägt Mika links (Taste F). */
export const ITEMS = {
  axt: { icon: 'axt', tool: true },
  spitzhacke: { icon: 'spitzhacke', tool: true },
  // Waffen (Meilenstein 4): ebenfalls in der rechten Hand
  schaufel: { icon: 'schaufel', tool: true, weapon: true },
  pfanne: { icon: 'pfanne', tool: true, weapon: true },
  rechen: { icon: 'rechen', tool: true, weapon: true },
  faeustlinge: { icon: 'faeustlinge', tool: true, weapon: true, plural: true },
  // M30: aus dem Waffenschrank – `gun`: schießt (Munition in data/arms.js)
  jagdgewehr: { icon: 'jagdgewehr', tool: true, weapon: true, gun: true },
  doppelflinte: { icon: 'doppelflinte', tool: true, weapon: true, gun: true },
  pistole: { icon: 'pistole', tool: true, weapon: true, gun: true },
  signalpistole: { icon: 'signalpistole', tool: true, weapon: true, gun: true },
  spaltaxt: { icon: 'spaltaxt', tool: true, weapon: true },
  mistgabel: { icon: 'mistgabel', tool: true, weapon: true },
  schlaeger: { icon: 'schlaeger', tool: true, weapon: true },
};

export const HOTBAR_SIZE = 8;
