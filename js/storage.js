/**
 * storage.js — Capa de persistencia para OrdenaLetras
 *
 * Prioridades:
 *  1. localStorage (web / desarrollo)
 *  2. Puente futuro con MIT App Inventor vía window.AppInventor / WebViewString
 *
 * Todos los datos se serializan como JSON.
 * La aplicación funciona completa aunque el puente de App Inventor no esté disponible.
 */

const Storage = (() => {

  // ── Claves de localStorage ──────────────────────────────────────────────────
  const KEYS = {
    PLAYER_NAME:  'ol_player_name',
    BEST_SCORE:   'ol_best_score',
    STATS:        'ol_stats',
    HISTORY:      'ol_history',
    SETTINGS:     'ol_settings',
    RECORDS:      'ol_records',     // historial completo de récords del dispositivo
    NAME_SET:     'ol_name_set',    // flag: el jugador ya eligió su nombre alguna vez
  };

  // ── Estado de configuración (cacheado en memoria) ───────────────────────────
  let _settings = null;

  // ── Estado de estadísticas (cacheado en memoria) ───────────────────────────
  let _stats = null;

  // ── Defaults ────────────────────────────────────────────────────────────────
  const DEFAULT_SETTINGS = {
    soundsEnabled:    true,
    musicEnabled:     true,
  };

  const DEFAULT_STATS = {
    gamesPlayed:    0,
    wordsCompleted: 0,
    totalErrors:    0,
    bestScore:      0,
    maxStreak:      0,
    byDifficulty: {
      easy:   { games: 0, words: 0, bestScore: 0 },
      medium: { games: 0, words: 0, bestScore: 0 },
      hard:   { games: 0, words: 0, bestScore: 0 },
    },
  };

  // ── Helpers de bajo nivel ──────────────────────────────────────────────────

  function _read(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function _write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      _notifyAppInventor(key, value);
    } catch (_) { /* localStorage lleno o no disponible */ }
  }

  /**
   * Intenta notificar a MIT App Inventor si el puente está disponible.
   * No lanza excepciones; el juego funciona sin él.
   */
  function _notifyAppInventor(key, value) {
    try {
      if (window.AppInventor) {
        window.AppInventor.setWebViewString(JSON.stringify({ key, value }));
      }
    } catch (_) { /* puente no disponible */ }
  }

  // ── API: Nombre del jugador ────────────────────────────────────────────────

  function getPlayerName() {
    return _read(KEYS.PLAYER_NAME) || 'Jugador';
  }

  /**
   * Devuelve true si el jugador ya registró su nombre al menos una vez.
   * Permite distinguir primer registro vs. cambio de nombre desde ajustes.
   */
  function hasPlayerName() {
    return _read(KEYS.NAME_SET) === true;
  }

  function setPlayerName(name) {
    const clean = String(name || '').trim().toUpperCase().slice(0, 10) || 'Jugador';
    _write(KEYS.PLAYER_NAME, clean);
    _write(KEYS.NAME_SET, true);   // marcar que el jugador ya eligió nombre
    return clean;
  }

  // ── API: Configuración ─────────────────────────────────────────────────────

  function getSettings() {
    if (_settings) return _settings;
    const saved = _read(KEYS.SETTINGS);
    _settings = { ...DEFAULT_SETTINGS, ...(saved || {}) };
    return _settings;
  }

  function saveSettings(partial) {
    _settings = { ...getSettings(), ...partial };
    _write(KEYS.SETTINGS, _settings);
  }

  // ── API: Estadísticas ──────────────────────────────────────────────────────

  function getStats() {
    if (_stats) return _stats;
    const saved = _read(KEYS.STATS);
    if (!saved) {
      _stats = Utils.deepClone(DEFAULT_STATS);
    } else {
      // Merge para retrocompatibilidad con versiones anteriores
      _stats = {
        ...Utils.deepClone(DEFAULT_STATS),
        ...saved,
        byDifficulty: {
          ...Utils.deepClone(DEFAULT_STATS.byDifficulty),
          ...(saved.byDifficulty || {}),
        },
      };
    }
    return _stats;
  }

  function saveStats() {
    if (_stats) _write(KEYS.STATS, _stats);
  }

  /**
   * Registra una partida finalizada.
   * @param {Object} result
   *   - score       {number}
   *   - wordsCompleted {number}
   *   - errors      {number}
   *   - difficulty  {string} 'easy' | 'medium' | 'hard'
   *   - streak      {number} (racha máxima de la partida, opcional)
   */
  function recordGameResult(result) {
    const stats = getStats();
    stats.gamesPlayed++;
    stats.wordsCompleted += result.wordsCompleted || 0;
    stats.totalErrors    += result.errors || 0;

    if ((result.score || 0) > stats.bestScore) {
      stats.bestScore = result.score;
    }
    if ((result.streak || 0) > stats.maxStreak) {
      stats.maxStreak = result.streak;
    }

    // Por dificultad
    const diff = result.difficulty;
    if (diff && stats.byDifficulty[diff]) {
      stats.byDifficulty[diff].games++;
      stats.byDifficulty[diff].words += result.wordsCompleted || 0;
      if ((result.score || 0) > stats.byDifficulty[diff].bestScore) {
        stats.byDifficulty[diff].bestScore = result.score;
      }
    }

    saveStats();

    // Historial
    addHistoryEntry({
      score:      result.score || 0,
      words:      result.wordsCompleted || 0,
      errors:     result.errors || 0,
      difficulty: result.difficulty || 'easy',
      date:       Utils.todayString(),
    });

    // Top 10 récords
    addRecord({
      name:  getPlayerName(),
      score: result.score || 0,
    });
  }

  // ── API: Historial de partidas ─────────────────────────────────────────────

  function getHistory() {
    return _read(KEYS.HISTORY) || [];
  }

  function addHistoryEntry(entry) {
    const history = getHistory();
    history.unshift(entry);           // más reciente primero
    const trimmed = history.slice(0, 50);  // máximo 50 entradas
    _write(KEYS.HISTORY, trimmed);
  }

  // ── API: Historial de récords (todos los del dispositivo) ─────────────────

  function getRecords() {
    return _read(KEYS.RECORDS) || [];
  }

  /**
   * Añade una entrada al historial de récords del dispositivo.
   * El historial es ilimitado: cada partida genera una entrada con el nombre
   * con el que se jugó (aunque luego se cambie el nombre, esas entradas conservan
   * el nombre original). Solo se pierden al desinstalar la app.
   * @param {{ name: string, score: number }}
   */
  function addRecord(entry) {
    const records = getRecords();
    records.push({
      name:  entry.name,
      score: entry.score,
      date:  Utils.todayString ? Utils.todayString() : new Date().toLocaleDateString('es-ES'),
    });
    // Ordenar de mayor a menor puntuación (para renderizado eficiente)
    records.sort((a, b) => b.score - a.score);
    _write(KEYS.RECORDS, records);
  }

  /**
   * Devuelve solo los récords del jugador actual (por nombre).
   * @param {string} playerName
   */
  function getPersonalRecords(playerName) {
    return getRecords().filter(r => r.name === playerName);
  }

  // ── API: Mejor puntuación (acceso rápido) ─────────────────────────────────

  function getBestScore() {
    return getStats().bestScore;
  }

  // ── API: Reset total ───────────────────────────────────────────────────────

  function resetAll() {
    const name = getPlayerName(); // conserva el nombre
    try {
      Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    } catch (_) {}
    _settings = null;
    _stats = null;
    setPlayerName(name); // restaura nombre (y mantiene NAME_SET=true)
  }

  // ── Puente App Inventor: listener de WebViewString ─────────────────────────
  // MIT App Inventor puede llamar a esta función para pasar datos al JS.
  window.onAppInventorMessage = function(jsonStr) {
    try {
      const msg = JSON.parse(jsonStr);
      if (msg && msg.key && msg.value !== undefined) {
        _write(msg.key, msg.value);
      }
    } catch (_) { /* mensaje mal formado */ }
  };

  // ── API pública ────────────────────────────────────────────────────────────
  return {
    getPlayerName,
    hasPlayerName,
    setPlayerName,
    getSettings,
    saveSettings,
    getStats,
    saveStats,
    recordGameResult,
    getHistory,
    getRecords,
    getPersonalRecords,
    getBestScore,
    resetAll,
  };

})();
