// Ressourcen und Gegenstände. Anzeigenamen stehen in texts.js.

/** Reihenfolge der Ressourcen im HUD. */
export const RESOURCES = ['holz', 'stein', 'fasern', 'stoff', 'schrott', 'teile', 'zahnraeder', 'moderkerne'];

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
};

export const HOTBAR_SIZE = 8;
