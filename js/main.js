/**
 * Ordena Letras — V1.0
 * Punto de Entrada y Coordinación Principal (js/main.js)
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Inicializar UI y módulos
  UI.init();
  await WordsManager.loadWords();

  // Gestión de eventos globales de teclado físico
  window.addEventListener('keydown', (e) => {
    // Si la tecla es una letra o Ñ
    const key = e.key.toUpperCase();
    if (/^[A-ZÑ]$/.test(key)) {
      GameEngine.handleInput(key);
    }
  });

  // Configurar listeners de botones de la interfaz
  setupUIEvents();

  // Transición del Splash al Menú Principal tras 1.6s
  setTimeout(() => {
    UI.showScreen('screen-menu');
  }, 1600);
});

function setupUIEvents() {
  // Menú Principal -> Dificultad
  const btnPlay = document.getElementById('btn-play-main');
  if (btnPlay) {
    btnPlay.addEventListener('click', () => {
      SoundEngine.playButton();
      UI.showScreen('screen-difficulty');
    });
  }

  // Menú -> Estadísticas
  const btnStats = document.getElementById('btn-stats-main');
  if (btnStats) {
    btnStats.addEventListener('click', () => {
      SoundEngine.playButton();
      UI.populateStats();
      UI.showModal('modal-stats');
    });
  }

  // Menú -> Ajustes
  const btnSettings = document.getElementById('btn-settings-main');
  if (btnSettings) {
    btnSettings.addEventListener('click', () => {
      SoundEngine.playButton();
      UI.populateSettings();
      UI.showModal('modal-settings');
    });
  }

  // Pantalla Dificultad -> Botón Volver
  const btnBackDiff = document.getElementById('btn-back-difficulty');
  if (btnBackDiff) {
    btnBackDiff.addEventListener('click', () => {
      SoundEngine.playButton();
      UI.showScreen('screen-menu');
    });
  }

  // Opciones de Dificultad
  const btnDiffFacil = document.getElementById('btn-diff-facil');
  if (btnDiffFacil) {
    btnDiffFacil.addEventListener('click', () => {
      SoundEngine.playButton();
      GameEngine.startNewGame('facil');
    });
  }

  const btnDiffMedia = document.getElementById('btn-diff-media');
  if (btnDiffMedia) {
    btnDiffMedia.addEventListener('click', () => {
      SoundEngine.playButton();
      GameEngine.startNewGame('media');
    });
  }

  const btnDiffDificil = document.getElementById('btn-diff-dificil');
  if (btnDiffDificil) {
    btnDiffDificil.addEventListener('click', () => {
      SoundEngine.playButton();
      GameEngine.startNewGame('dificil');
    });
  }

  // Controles en barra superior de Partida
  const btnHomeGame = document.getElementById('btn-game-home');
  if (btnHomeGame) {
    btnHomeGame.addEventListener('click', () => {
      SoundEngine.playButton();
      GameEngine.exitToMenu();
    });
  }

  const btnMuteGame = document.getElementById('btn-game-mute');
  if (btnMuteGame) {
    btnMuteGame.addEventListener('click', () => {
      const settings = Storage.getSettings();
      settings.soundFx = !settings.soundFx;
      Storage.saveSettings(settings);
      SoundEngine.enabled = settings.soundFx;
      btnMuteGame.textContent = settings.soundFx ? '🔊' : '🔇';
    });
  }

  // Modal Palabra Completada -> Siguiente Palabra
  const btnNextWord = document.getElementById('btn-next-word');
  if (btnNextWord) {
    btnNextWord.addEventListener('click', () => {
      SoundEngine.playButton();
      GameEngine.continueNextWord();
    });
  }

  // Modal Game Over -> Jugar de Nuevo
  const btnRetry = document.getElementById('btn-retry-game');
  if (btnRetry) {
    btnRetry.addEventListener('click', () => {
      SoundEngine.playButton();
      GameEngine.restartGame();
    });
  }

  // Modal Game Over -> Menú Principal
  const btnGameOverMenu = document.getElementById('btn-gameover-menu');
  if (btnGameOverMenu) {
    btnGameOverMenu.addEventListener('click', () => {
      SoundEngine.playButton();
      GameEngine.exitToMenu();
    });
  }

  // Cerrar modales (Stats, Ajustes)
  const btnCloseStats = document.getElementById('btn-close-stats');
  if (btnCloseStats) {
    btnCloseStats.addEventListener('click', () => {
      SoundEngine.playButton();
      UI.hideModal('modal-stats');
    });
  }

  const btnResetStats = document.getElementById('btn-reset-stats');
  if (btnResetStats) {
    btnResetStats.addEventListener('click', () => {
      SoundEngine.playButton();
      if (confirm('¿Deseas reiniciar todas las estadísticas y récords?')) {
        Storage.resetAllStats();
        UI.populateStats();
      }
    });
  }

  const btnCloseSettings = document.getElementById('btn-close-settings');
  if (btnCloseSettings) {
    btnCloseSettings.addEventListener('click', () => {
      SoundEngine.playButton();
      UI.hideModal('modal-settings');
    });
  }

  // Switches de Ajustes
  const toggleSound = document.getElementById('toggle-sound');
  if (toggleSound) {
    toggleSound.addEventListener('change', (e) => {
      const settings = Storage.getSettings();
      settings.soundFx = e.target.checked;
      Storage.saveSettings(settings);
      SoundEngine.enabled = settings.soundFx;
    });
  }

  const toggleMusic = document.getElementById('toggle-music');
  if (toggleMusic) {
    toggleMusic.addEventListener('change', (e) => {
      const settings = Storage.getSettings();
      settings.music = e.target.checked;
      Storage.saveSettings(settings);
    });
  }

  const toggleVibration = document.getElementById('toggle-vibration');
  if (toggleVibration) {
    toggleVibration.addEventListener('change', (e) => {
      const settings = Storage.getSettings();
      settings.vibration = e.target.checked;
      Storage.saveSettings(settings);
    });
  }
}
