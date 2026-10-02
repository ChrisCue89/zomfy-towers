// Posten (M23, DESIGN 8): Eingezogene Überlebende beziehen nachts einen
// Hochsitz neben dem Weg und helfen dort auf ihre Art. Knopf braucht keinen
// Posten – er hütet den Hof. Niemand wird besiegt: Wer zu viel abbekommt, zieht
// sich ins Haus zurück. Hier wird balanciert.
//
// Seit M29 (OFFENE-FRAGEN 175) helfen Posten nur noch, ohne zu kämpfen: Bewohner
// sind keine kostenlosen Türme, die Horde wird ohne sie balanciert. Zu den Waffen
// greifen sie erst nach der Lagerglocke (M31).

/**
 * Rollen auf dem Posten:
 *   flicken      Bert: Barrikaden, Wall und Tor im Umkreis bekommen `heal` Leben je s
 *   glas         Hilde: alle `every` s ein Leimglas auf den nächsten Schlurfer im
 *                Umkreis – kein Schaden, nur klebrig (`slow` für `slowTime` s)
 *   leuchtfeuer  Juna: auf Tastendruck (J) ein heller Stoß – blendet `blind` s und
 *                holt aus dem Nebel (betäubt nicht); danach `cooldown` s Pause
 *   arzt         Dr. Yusuf: Mika im Umkreis heilt `heal` je s, Türme im Umkreis `towerHeal`
 */
export const POST_ROLES = {
  bert: { kind: 'flicken', radius: 4.5, heal: 6 },
  hilde: { kind: 'glas', radius: 5.5, every: 1.8, slow: 0.5, slowTime: 4 },
  juna: { kind: 'leuchtfeuer', radius: 6, blind: 5, cooldown: 30 },
  yusuf: { kind: 'arzt', radius: 6, heal: 3, towerHeal: 4 },
};
export const POST_ORDER = ['bert', 'hilde', 'juna', 'yusuf'];

/** Knopf hütet nachts den Hof: Schwärmer (und nur die) jagt er alle `every` s davon. */
export const KNOPF_GUARD = { radius: 5.5, every: 1.4, damage: 25, push: 1.5 };

/** So viel hält jemand auf dem Posten aus (Biss je s der Schlurfer, die am Hochsitz rütteln). */
export const POST_NERVE = 100;
/** So nah muss ein Schlurfer an den Hochsitz, um daran zu rütteln (m). */
export const POST_REACH = 1.4;
/** Höhe der Plattform (m) – dort steht die Figur. */
export const POST_HEIGHT = 1.4;

/**
 * Fest am Feuer (M23): Nach einer gehaltenen Bossnacht (jede fünfte) feiern alle
 * am Morgen bis `until` Uhr im Kreis (`radius` m) ums Lagerfeuer; in der Nacht
 * darauf treffen die Türme um so viel härter (`damage`).
 */
export const FEAST = { damage: 1.1, until: 12, radius: 1.7 };
