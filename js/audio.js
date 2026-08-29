/**
 * audio.js — Motor de audio 100% operativo para OrdenaLetras
 *
 * Utiliza Web Audio API para generar efectos de sonido arcade y música
 * de fondo polifónica retro en tiempo real, garantizando funcionamiento
 * sin depender de archivos de audio externos.
 */

const Audio = (() => {

  let _ctx = null;
  let _soundsOn = true;
  let _musicOn = true;
  let _musicTimer = null;
  let _musicStep = 0;
  let _musicGain = null;

  function _getAudioContext() {
    if (!_ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        _ctx = new AudioCtx();
      }
    }
    if (_ctx && _ctx.state === 'suspended') {
      _ctx.resume().catch(() => {});
    }
    return _ctx;
  }

  function init() {
    const settings = Storage.getSettings();
    _soundsOn = settings.soundsEnabled !== false;
    _musicOn  = settings.musicEnabled  !== false;

    // Desbloquear AudioContext con la primera interacción del usuario
    const unlock = () => {
      const ctx = _getAudioContext();
      if (ctx && ctx.state === 'running') {
        if (_musicOn && !_musicTimer) {
          startMusic();
        }
        window.removeEventListener('click', unlock);
        window.removeEventListener('touchstart', unlock);
        window.removeEventListener('keydown', unlock);
      }
    };
    window.addEventListener('click', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });

    _syncToggleIcons();
  }

  // ── Generación de Efectos de Sonido ─────────────────────────────────────────

  function playButton() {
    if (!_soundsOn) return;
    const ctx = _getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  function playCorrect() {
    if (!_soundsOn) return;
    const ctx = _getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.06); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.12); // G5

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  function playWrong() {
    if (!_soundsOn) return;
    const ctx = _getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now); // A3
    osc.frequency.linearRampToValueAtTime(110, now + 0.2); // A2

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  function playWordComplete() {
    if (!_soundsOn) return;
    const ctx = _getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime + i * 0.09;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    });
  }

  function playLevelUp() {
    if (!_soundsOn) return;
    const ctx = _getAudioContext();
    if (!ctx) return;

    const melody = [392.00, 523.25, 659.25, 783.99, 1046.50, 1318.51];
    melody.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime + i * 0.08;

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
    });
  }

  function playGameOver() {
    if (!_soundsOn) return;
    const ctx = _getAudioContext();
    if (!ctx) return;

    const notes = [349.23, 329.63, 293.66, 261.63]; // F4, E4, D4, C4
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime + i * 0.2;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.36);
    });
  }

  // ── Música de Fondo Procedural / Sintetizada ───────────────────────────────

  // Secuencia alegre y sutil estilo puzzle / chiptune
  const BGM_MELODY = [
    261.63, 0, 329.63, 0, 392.00, 523.25, 392.00, 0,
    293.66, 0, 349.23, 0, 440.00, 523.25, 440.00, 0,
    329.63, 0, 392.00, 0, 493.88, 587.33, 493.88, 0,
    392.00, 0, 329.63, 0, 261.63, 0, 0, 0
  ];
  const BGM_BASS = [
    130.81, 130.81, 130.81, 130.81,
    146.83, 146.83, 146.83, 146.83,
    164.81, 164.81, 164.81, 164.81,
    130.81, 130.81, 196.00, 130.81
  ];

  function _playMusicTick() {
    if (!_musicOn) return;
    const ctx = _getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const note = BGM_MELODY[_musicStep % BGM_MELODY.length];
    const bass = BGM_BASS[Math.floor(_musicStep / 2) % BGM_BASS.length];

    // Nota melódica
    if (note > 0) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note, now);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.19);
    }

    // Nota bajo en pasos pares
    if (_musicStep % 2 === 0 && bass > 0) {
      const bOsc = ctx.createOscillator();
      const bGain = ctx.createGain();
      bOsc.type = 'sine';
      bOsc.frequency.setValueAtTime(bass, now);

      bGain.gain.setValueAtTime(0.05, now);
      bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      bOsc.connect(bGain);
      bGain.connect(ctx.destination);

      bOsc.start(now);
      bOsc.stop(now + 0.36);
    }

    _musicStep = (_musicStep + 1) % BGM_MELODY.length;
  }

  function startMusic() {
    if (!_musicOn) return;
    if (_musicTimer) return;
    _musicStep = 0;
    _musicTimer = setInterval(_playMusicTick, 180);
  }

  function stopMusic() {
    if (_musicTimer) {
      clearInterval(_musicTimer);
      _musicTimer = null;
    }
    _musicStep = 0;
  }

  function pauseMusic() {
    if (_musicTimer) {
      clearInterval(_musicTimer);
      _musicTimer = null;
    }
  }

  function resumeMusic() {
    if (!_musicOn || _musicTimer) return;
    _musicTimer = setInterval(_playMusicTick, 180);
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

  // ── Sincronización de iconos ────────────────────────────────────────────────

  function _syncToggleIcons() {
    const sIcon = document.getElementById('pause-sound-icon');
    const mIcon = document.getElementById('pause-music-icon');
    if (sIcon) sIcon.textContent = _soundsOn ? '🔊' : '🔇';
    if (mIcon) mIcon.textContent = _musicOn  ? '🎵' : '🔕';
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

