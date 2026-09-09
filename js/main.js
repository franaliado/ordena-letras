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

  // ── 6.1. Integración del botón físico de retroceso (Android / Capacitor) ──
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
    window.Capacitor.Plugins.App.addListener('backButton', ({ canGoBack }) => {
      // Si hay modales o pantallas secundarias abiertas, ciérralas primero
      const activeModal = document.querySelector('.screen.active');
      
      // Si estamos en el menú principal, salir de la app
      if (!activeModal || activeModal.id === 'screen-menu') {
        window.Capacitor.Plugins.App.exitApp();
      } else {
        // De lo contrario, usar el historial de navegación para volver atrás
        window.history.back();
      }
    });
  }

  // ── 7. Conectar teclado virtual (botones .key) ────────────────────────────────────
  // Usamos 'pointerdown' en vez de 'click' para eliminar el delay de 300ms
  // en Android WebView / Capacitor. El evento se dispara inmediatamente.
  const gameKeyboard = document.getElementById('game-keyboard');
  if (gameKeyboard) {
    gameKeyboard.addEventListener('pointerdown', function(e) {
      const btn = e.target.closest('.key');
      if (!btn) return;
      const key = btn.dataset.key;
      if (!key) return;

      // Evitar propagación o retraso de emulación táctil
      e.preventDefault();

      if (key === 'BACKSPACE') return;

      Game.pressLetter(key);
    }, { passive: false });
  }

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

  // ── 9. Input de nombre: Enter para confirmar, mayúsculas y sonido de tecleo ──
  const nameInput = document.getElementById('player-name-input');
  if (nameInput) {
    nameInput.addEventListener('input', function() {
      const start = this.selectionStart;
      const end = this.selectionEnd;
      this.value = this.value.toUpperCase();
      if (start !== null && end !== null) {
        this.setSelectionRange(start, end);
      }
      // Reproducir sonido de tecleo
      Audio.playButton();
    });

    nameInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') UI.confirmPlayerName();
    });
  }

  // ── 10. Prevenir gestos parásitos sin romper el scroll fluido de pantallas ──
  document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchmove', function(e) {
    const scrollable = e.target.closest('.records-list, .help-card, .stats-history, #screen-records, #screen-stats, #screen-help, #screen-player-name');
    if (!scrollable) {
      if (e.cancelable) e.preventDefault();
    }
  }, { passive: false });

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