/**
 * main.js — Bootstrap y punto de entrada de OrdenaLetras
 *
 * Responsable de:
 *  - Inicializar todos los módulos en orden
 *  - Cargar el diccionario
 *  - Gestionar el splash screen
 *  - Conectar el teclado virtual y físico
 *  - Registrar el service worker (offline / PWA)
 */

(async function main() {

  // ── 1. Inicializar Audio (lee configuración de Storage) ──────────────────
  Audio.init();

  // ── 2. Animar barra de carga del splash ──────────────────────────────────
  const splashBar = document.getElementById('splash-progress');
  let progress = 0;

  function advanceProgress(to, durationMs) {
    return new Promise(resolve => {
      const start = Date.now();
      const from  = progress;
      function step() {
        const elapsed = Date.now() - start;
        const t = Math.min(elapsed / durationMs, 1);
        progress = from + (to - from) * t;
        if (splashBar) splashBar.style.width = `${progress}%`;
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(step);
    });
  }

  // Fase 1: carga rápida inicial
  await advanceProgress(30, 300);

  // ── 3. Cargar diccionario de palabras ─────────────────────────────────────
  await Words.load();
  await advanceProgress(80, 400);

  // ── 4. Cargar preferencias guardadas ──────────────────────────────────────
  const settings = Storage.getSettings();
  // Sincronizar toggles de ajustes
  const tSound = document.getElementById('toggle-sounds');
  const tMusic = document.getElementById('toggle-music');
  if (tSound) tSound.checked = settings.soundsEnabled;
  if (tMusic) tMusic.checked = settings.musicEnabled;

  // ── 5. Completar barra ────────────────────────────────────────────────────
  await advanceProgress(100, 200);
  await Utils.delay(300);

  // ── 6. Inicializar historial nativo e ir al menú principal ───────────────
  UI.initHistory();
  UI.showScreen('screen-menu', false);

  // ── 7. Conectar teclado virtual (botones .key) ────────────────────────────
  document.getElementById('game-keyboard').addEventListener('click', function(e) {
    const btn = e.target.closest('.key');
    if (!btn) return;
    const key = btn.dataset.key;
    if (!key) return;

    Audio.playButton();

    if (key === 'BACKSPACE') {
      // Backspace no tiene función en la mecánica actual
      // (posición no retrocede — el jugador solo puede avanzar)
      return;
    }

    Game.pressLetter(key);
  });

  // ── 8. Teclado físico (para pruebas en PC) ────────────────────────────────
  document.addEventListener('keydown', function(e) {
    // Evitar conflictos con inputs
    if (e.target.tagName === 'INPUT') return;

    const key = e.key.toUpperCase();

    // Escape = Pausa si estamos en el juego
    if (e.key === 'Escape') {
      const state = Game.getState();
      if (state && state.isRunning && !state.isPaused) {
        UI.showPause();
        return;
      }
    }

    // Enter = Continuar en pantallas de éxito
    if (e.key === 'Enter') {
      const screen = document.querySelector('.screen.active');
      if (screen && screen.id === 'screen-word-complete') {
        Game.nextWord();
        return;
      }
      if (screen && screen.id === 'screen-level-complete') {
        Game.startNextLevel();
        return;
      }
    }

    if (/^[A-Z]$/.test(key)) {
      Game.pressLetter(key);
      // Highlight visual de la tecla
      const keyEl = document.querySelector(`.key[data-key="${key}"]`);
      if (keyEl) Utils.flashClass(keyEl, 'pressed', 200);
    }
  });

  // ── 9. Input de nombre: Enter para confirmar y transformación a mayúsculas ──
  const nameInput = document.getElementById('player-name-input');
  if (nameInput) {
    nameInput.addEventListener('input', function() {
      const start = this.selectionStart;
      const end = this.selectionEnd;
      this.value = this.value.toUpperCase();
      if (start !== null && end !== null) {
        this.setSelectionRange(start, end);
      }
    });

    nameInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') UI.confirmPlayerName();
    });
  }

  // ── 10. Prevenir scroll y zoom en dispositivos móviles ────────────────────
  document.addEventListener('touchmove', function(e) {
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
  });

  // ── 11. Visibilidad: pausar/reanudar música al minimizar ──────────────────
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      Audio.pauseMusic();
    } else {
      const state = Game.getState();
      if (state && state.isRunning && !state.isPaused) {
        Audio.resumeMusic();
      }
    }
  });

  // ── 12. Registrar Service Worker (PWA / offline) ──────────────────────────
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('sw.js');
    } catch (_) {
      // Service worker no crítico; el juego funciona sin él
    }
  }

  console.log('[OrdenaLetras] ✅ Iniciado correctamente');

})();
