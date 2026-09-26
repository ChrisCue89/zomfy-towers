// Tastatur und Maus. Tasten über event.code (unabhängig vom Tastaturlayout).
// "pressed" gilt genau ein Bild lang; endFrame() am Ende jedes Bildes aufrufen.

const BINDINGS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  run: ['ShiftLeft', 'ShiftRight'],
  use: ['KeyE', 'Enter', 'NumpadEnter'],
  confirm: ['KeyE', 'Space', 'Enter', 'NumpadEnter'], // Dialoge und Menüs (Leertaste wird später Ausweichen)
  lantern: ['KeyF'],
  menu: ['Escape', 'KeyP'],
  debug: ['F3'],
  buildTab: ['Tab'],
  cancel: ['Escape'],
  slot1: ['Digit1'],
  slot2: ['Digit2'],
  slot3: ['Digit3'],
  slot4: ['Digit4'],
  slot5: ['Digit5'],
  slot6: ['Digit6'],
  slot7: ['Digit7'],
  slot8: ['Digit8'],
};

const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'F3', 'Tab']);

export class Input {
  /**
   * @param {HTMLElement} element Ziel für Mausereignisse
   * @param {(x:number, y:number) => {x:number, y:number}} toGame Umrechnung in Spielpixel
   */
  constructor(element, toGame) {
    this.element = element;
    this.toGame = toGame;
    this.down = new Set();
    this.pressedCodes = new Set();
    this.mouse = { x: -1, y: -1, inside: false, down: false, clicked: false, rightClicked: false, moved: false, wheel: 0 };

    window.addEventListener('keydown', (e) => {
      if (PREVENT.has(e.code)) e.preventDefault();
      if (!e.repeat) this.pressedCodes.add(e.code);
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());

    element.addEventListener('pointermove', (e) => this.updatePointer(e));
    element.addEventListener('pointerdown', (e) => {
      this.updatePointer(e);
      if (e.button === 0) {
        this.mouse.down = true;
        this.mouse.clicked = true;
      } else if (e.button === 2) {
        this.mouse.rightClicked = true;
      }
    });
    window.addEventListener('pointerup', () => {
      this.mouse.down = false;
    });
    element.addEventListener('pointerleave', () => {
      this.mouse.inside = false;
    });
    element.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.mouse.wheel += Math.sign(e.deltaY);
      },
      { passive: false }
    );
    element.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  updatePointer(e) {
    const p = this.toGame(e.clientX, e.clientY);
    if (p.x !== this.mouse.x || p.y !== this.mouse.y) this.mouse.moved = true;
    this.mouse.x = p.x;
    this.mouse.y = p.y;
    this.mouse.inside = true;
  }

  isDown(action) {
    return BINDINGS[action].some((code) => this.down.has(code));
  }

  pressed(action) {
    return BINDINGS[action].some((code) => this.pressedCodes.has(code));
  }

  pressedCode(code) {
    return this.pressedCodes.has(code);
  }

  /** Bewegungsrichtung aus den Tasten (x = Osten, z = Süden). */
  moveVector() {
    return {
      x: (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0),
      z: (this.isDown('down') ? 1 : 0) - (this.isDown('up') ? 1 : 0),
    };
  }

  /** Gedrückter Schnellleistenplatz (0..7) oder -1. */
  slotPressed() {
    for (let i = 0; i < 8; i++) if (this.pressed(`slot${i + 1}`)) return i;
    return -1;
  }

  consumeWheel() {
    const w = this.mouse.wheel;
    this.mouse.wheel = 0;
    return w;
  }

  /** Klick verbrauchen, damit ihn nur ein Element bekommt. */
  consumeClick() {
    const c = this.mouse.clicked;
    this.mouse.clicked = false;
    return c;
  }

  endFrame() {
    this.pressedCodes.clear();
    this.mouse.clicked = false;
    this.mouse.rightClicked = false;
    this.mouse.moved = false;
    this.mouse.wheel = 0;
  }
}
