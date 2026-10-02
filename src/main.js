// Einstieg: Spiel anlegen und starten, verständliche Fehlermeldung bei Problemen.

import { Game } from './core/game.js';
import { T } from './data/texts.js';

const loading = document.getElementById('loading');

function showMessage(text) {
  loading.textContent = text;
  loading.classList.remove('gone');
}

function hasWebGL2() {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
}

if (!hasWebGL2()) {
  showMessage(T.fehler.webgl);
} else {
  try {
    const game = new Game();
    game.init();
    game.start();
    loading.classList.add('gone');
  } catch (error) {
    showMessage(`${T.fehler.allgemein}\n${error.message}`);
    throw error;
  }
}
