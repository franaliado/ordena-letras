/**
 * audio.js — Motor de audio para OrdenaLetras
 *
 * Todos los sonidos son locales (.mp3 en assets/audio/).
 * Si los archivos no existen, las llamadas fallan silenciosamente.
 * Los controles se leen del localStorage vía Storage.
 */

const Audio = (() => {

  // ── Configuración de sonidos ────────────────────────────────────────────────
  const SOUNDS = {
    correct:       'assets/audio/correct.mp3',
    wrong:         'assets/audio/wrong.mp3',
    word_complete: 'assets/audio/word_complete.mp3',
    game_over:     'assets/audio/game_over.mp3',
    button:        'assets/audio/button.mp3',
    level_up:      'assets/audio/word_complete.mp3', // reutiliza
  };

  const MUSIC_SRC = 'assets/audio/music_bg.mp3';

  // ── Cache de objetos Audio ──────────────────────────────────────────────────
  const _cache = {};
  let _musicEl  = null;
  let _soundsOn = true;
  let _musicOn  = true;

  // ── Inicialización ──────────────────────────────────────────────────────────

  function init() {
    const settings = Storage.getSettings();
    _soundsOn = settings.soundsEnabled !== false;
    _musicOn  = settings.musicEnabled  !== false;

    // Pre-cargar sonidos
    Object.entries(SOUNDS).forEach(([key, src]) => {
      try {
        const el = new window.Audio(src);
        el.preload = 'auto';
        _cache[key] = el;
      } catch (_) { /* sin soporte */ }
    });

    // Crear elemento de música
    try {
      _musicEl = new window.Audio(MUSIC_SRC);
      _musicEl.loop   = true;
      _musicEl.volume = 0.3;
      _musicEl.preload = 'auto';
    } catch (_) {}

    _syncToggleIcons();
  }

  // ── Reproducción ────────────────────────────────────────────────────────────

  function _play(key) {
    if (!_soundsOn) return;
    try {
      const src = _cache[key];
      if (!src) return;
      // Clonar para permitir solapamiento
      const clone = src.cloneNode();
      clone.volume = 0.7;
      clone.play().catch(() => {});
    } catch (_) {}
  }

  function playCorrect()      { _play('correct'); }
  function playWrong()        { _play('wrong'); }
  function playWordComplete() { _play('word_complete'); }
  function playGameOver()     { _play('game_over'); }
  function playButton()       { _play('button'); }
  function playLevelUp()      { _play('level_up'); }

  // ── Música de fondo ─────────────────────────────────────────────────────────

  function startMusic() {
    if (!_musicOn || !_musicEl) return;
    _musicEl.play().catch(() => {});
  }

  function stopMusic() {
    if (!_musicEl) return;
    _musicEl.pause();
    _musicEl.currentTime = 0;
  }

  function pauseMusic() {
    if (!_musicEl) return;
    _musicEl.pause();
  }

  function resumeMusic() {
    if (!_musicOn || !_musicEl) return;
    _musicEl.play().catch(() => {});
  }

  // ── Controles de toggle ─────────────────────────────────────────────────────

  function setSounds(enabled) {
    _soundsOn = !!enabled;
    Storage.saveSettings({ soundsEnabled: _soundsOn });
    _syncToggleIcons();
    _syncSettingsToggles();
  }

  function setMusic(enabled) {
    _musicOn = !!enabled;
    Storage.saveSettings({ musicEnabled: _musicOn });
    if (_musicOn) {
      startMusic();
    } else {
      pauseMusic();
    }
    _syncToggleIcons();
    _syncSettingsToggles();
  }

  function toggleSounds() { setSounds(!_soundsOn); }
  function toggleMusic()  { setMusic(!_musicOn); }

  function isSoundsOn() { return _soundsOn; }
  function isMusicOn()  { return _musicOn; }

  // ── Sincronización de iconos de pausa ───────────────────────────────────────

  function _syncToggleIcons() {
    const sIcon = document.getElementById('pause-sound-icon');
    const mIcon = document.getElementById('pause-music-icon');
    if (sIcon) sIcon.textContent = _soundsOn ? '🔊' : '🔇';
    if (mIcon) mIcon.textContent = _musicOn  ? '🎵' : '🎵';
  }

  function _syncSettingsToggles() {
    const tSound = document.getElementById('toggle-sounds');
    const tMusic = document.getElementById('toggle-music');
    if (tSound) tSound.checked = _soundsOn;
    if (tMusic) tMusic.checked = _musicOn;
  }

  // ── API pública ─────────────────────────────────────────────────────────────
  return {
    init,
    playCorrect,
    playWrong,
    playWordComplete,
    playGameOver,
    playButton,
    playLevelUp,
    startMusic,
    stopMusic,
    pauseMusic,
    resumeMusic,
    setSounds,
    setMusic,
    toggleSounds,
    toggleMusic,
    isSoundsOn,
    isMusicOn,
  };

})();
