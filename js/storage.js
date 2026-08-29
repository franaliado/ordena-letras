/**
 * Ordena Letras — V1.0
 * Módulo de Almacenamiento y Persistencia (js/storage.js)
 * Compatible con localStorage y MIT App Inventor (WebViewString)
 */

const Storage = {
  KEYS: {
    HIGH_SCORE: 'ol_high_score',
    STATS: 'ol_game_stats',
    SETTINGS: 'ol_settings',
    HISTORY: 'ol_history'
  },

  defaultStats: {
    gamesPlayed: 0,
    wordsSolved: 0,
    totalScore: 0,
    bestScore: 0,
    bestStreak: 0,
    easySolved: 0,
    mediumSolved: 0,
    hardSolved: 0
  },

  defaultSettings: {
    soundFx: true,
    music: true,
    vibration: true
  },

  /**
   * Guarda un valor en localStorage y notifica a App Inventor si está disponible
   */
  set(key, value) {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      
      // Integración con MIT App Inventor WebViewer
      if (typeof window !== 'undefined' && window.AppInventor) {
        window.AppInventor.setWebViewString(JSON.stringify({ event: 'save', key, value }));
      }
    } catch (e) {
      console.warn('Error guardando en Storage:', e);
    }
  },

  /**
   * Obtiene un valor desde localStorage con fallback
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (e) {
      console.warn('Error leyendo de Storage:', e);
      return defaultValue;
    }
  },

  /**
   * Obtiene las estadísticas acumuladas
   */
  getStats() {
    const saved = this.get(this.KEYS.STATS, {});
    return { ...this.defaultStats, ...saved };
  },

  /**
   * Guarda y actualiza las estadísticas
   */
  saveStats(stats) {
    this.set(this.KEYS.STATS, stats);
  },

  /**
   * Obtiene la mejor puntuación histórica
   */
  getHighScore() {
    return this.get(this.KEYS.HIGH_SCORE, 0);
  },

  /**
   * Actualiza el récord si la puntuación actual es mayor
   */
  updateHighScore(score) {
    const currentHigh = this.getHighScore();
    if (score > currentHigh) {
      this.set(this.KEYS.HIGH_SCORE, score);
      return score;
    }
    return currentHigh;
  },

  /**
   * Obtiene la configuración de audio y opciones
   */
  getSettings() {
    const saved = this.get(this.KEYS.SETTINGS, {});
    return { ...this.defaultSettings, ...saved };
  },

  /**
   * Guarda la configuración
   */
  saveSettings(settings) {
    this.set(this.KEYS.SETTINGS, settings);
  },

  /**
   * Registra una partida en el historial (máximo 10 últimas)
   */
  addHistoryRecord(record) {
    const history = this.get(this.KEYS.HISTORY, []);
    history.unshift({
      date: new Date().toLocaleDateString(),
      ...record
    });
    if (history.length > 10) history.pop();
    this.set(this.KEYS.HISTORY, history);
  },

  /**
   * Obtiene el historial reciente
   */
  getHistory() {
    return this.get(this.KEYS.HISTORY, []);
  },

  /**
   * Reinicia todas las estadísticas
   */
  resetAllStats() {
    this.set(this.KEYS.STATS, this.defaultStats);
    this.set(this.KEYS.HIGH_SCORE, 0);
    this.set(this.KEYS.HISTORY, []);
  }
};
