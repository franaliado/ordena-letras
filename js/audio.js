/**
 * Ordena Letras — V1.0
 * Módulo de Audio y Efectos Sonoros (js/audio.js)
 * Con sintetizador Web Audio API autónomo (100% offline y sin dependencias externas)
 * y soporte para archivos MP3 locales.
 */

const SoundEngine = {
  ctx: null,
  enabled: true,

  /**
   * Inicializa el contexto de Web Audio en la primera interacción de usuario
   */
  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    const settings = Storage.getSettings();
    this.enabled = settings.soundFx;
  },

  /**
   * Generador de ondas sonoras sintéticas retro arcade
   */
  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.15) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio tone error:', e);
    }
  },

  /**
   * Sonido de Acierto (Campanita melódica brillante)
   */
  playCorrect() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc2.frequency.setValueAtTime(1046.50, now + 0.08); // C6

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.08);
      osc1.stop(now + 0.28);
      osc2.stop(now + 0.28);
    } catch (e) {
      this.playTone(880, 'sine', 0.15);
    }
  },

  /**
   * Sonido de Error (Zumbido / Tono grave)
   */
  playWrong() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.22);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {
      this.playTone(120, 'sawtooth', 0.2);
    }
  },

  /**
   * Sonido de Palabra Completada (Fanfarria ascendente victoriosa)
   */
  playWordComplete() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
      const now = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const noteStart = now + (idx * 0.07);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.2, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.35);
      });
    } catch (e) {
      this.playTone(660, 'triangle', 0.4);
    }
  },

  /**
   * Sonido de Game Over (Secuencia descendente)
   */
  playGameOver() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const notes = [400, 350, 300, 220];
      const now = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const noteStart = now + (idx * 0.14);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.2, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.3);
      });
    } catch (e) {
      this.playTone(200, 'sawtooth', 0.5);
    }
  },

  /**
   * Sonido de Pulsación de Botón
   */
  playButton() {
    this.playTone(600, 'sine', 0.05, 0.08);
  }
};
