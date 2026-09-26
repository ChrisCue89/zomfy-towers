// Ressourcen und Gegenstände. Anzeigenamen stehen in texts.js.

/** Reihenfolge der Ressourcen im HUD. */
export const RESOURCES = ['holz', 'stein', 'fasern', 'stoff', 'schrott', 'zahnraeder', 'moderkerne'];

/** Seltene Vorräte, die erst nach dem ersten Fund im HUD erscheinen. */
export const RARE_RESOURCES = ['moderkerne'];

/** Dinge für die Schnellleiste (rechte Hand). Die Laterne trägt Mika links (Taste F). */
export const ITEMS = {
  axt: { icon: 'axt', tool: true },
  spitzhacke: { icon: 'spitzhacke', tool: true },
};

export const HOTBAR_SIZE = 8;
