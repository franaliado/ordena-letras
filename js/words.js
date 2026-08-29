/**
 * words.js — Módulo de selección y desordenado de palabras
 *
 * Responsable de:
 *  - Cargar el diccionario JSON local
 *  - Filtrar palabras por dificultad
 *  - Seleccionar palabras sin repetición dentro de una partida
 *  - Barajar las letras garantizando que nunca coincidan con el original
 */

const Words = (() => {

  // ── Longitudes de palabras por nivel (7 niveles, 5 palabras c/u) ───────────
  // Basado en la guía visual: niveles 1-7, palabras de 4 a 10 letras
  const LEVEL_LENGTHS = {
    easy:   [4, 4, 5, 5, 5, 5, 6],   // 7 niveles fácil
    medium: [6, 6, 7, 7, 7, 7, 8],   // 7 niveles medio
    hard:   [8, 8, 8, 9, 9, 9, 10],  // 7 niveles difícil
  };

  // ── Estado ──────────────────────────────────────────────────────────────────
  let _dictionary = {};      // { "4": [...], "5": [...], ... }
  let _loaded     = false;
  let _usedWords  = new Set();  // palabras ya usadas en la partida actual

  // ── Carga del diccionario ───────────────────────────────────────────────────

  /**
   * Carga el diccionario desde data/words.json.
   * Retorna Promise que resuelve cuando el JSON está en memoria.
   */
  async function load() {
    if (_loaded) return;
    try {
      const res  = await fetch('data/words.json');
      const data = await res.json();
      // Normalizar todas las palabras al cargar
      const normalized = {};
      for (const [len, arr] of Object.entries(data)) {
        normalized[len] = arr
          .map(w => Utils.normalize(w))
          .filter(w => w.length >= 4 && /^[A-Z]+$/.test(w))
          // eliminar duplicados dentro del mismo bucket
          .filter((w, i, self) => self.indexOf(w) === i);
      }
      _dictionary = normalized;
      _loaded = true;
    } catch (err) {
      console.error('[Words] No se pudo cargar el diccionario:', err);
      // Diccionario mínimo de emergencia
      _dictionary = {
        '4': ['AMOR','CASA','LUNA','ROSA','VINO','LAGO','MANO','ROCA','PALO','GATO'],
        '5': ['AMIGO','LIBRO','CAMPO','FONDO','MUNDO','BANCO','PLAZA','CLIMA','PARTE','LUGAR'],
        '6': ['CAMINO','CIUDAD','TIEMPO','FUENTE','CABEZA','JARDIN','FLORES','PUERTA','VIENTO','ESCUELA'],
        '7': ['PALABRA','CABALLO','CANCION','FUTBOL','ALEGRIA','CULTURA','TABLERO','JARDINERO','ESPANOL'],
        '8': ['AVENTURA','FANTASIA','VICTORIA','BELLEZA','MELODIA','CARACTER','MILAGROS','UNIVERSO'],
        '9': ['CHOCOLATE','MARIPOSAS','PRIMAVERA','FELICIDAD','AVENTURAS','CONFIANZA'],
        '10': ['TELEVISION','ESTUDIANTE','APRENDIZAJE','COMPRENDER','REALIZARSE'],
      };
      _loaded = true;
    }
  }

  // ── Reset de palabras usadas (nueva partida) ────────────────────────────────

  function resetSession() {
    _usedWords = new Set();
  }

  // ── Selección de palabra ────────────────────────────────────────────────────

  /**
   * Selecciona una palabra para el nivel y dificultad dados.
   * @param {number} level  — 1-indexed (1 a 7)
   * @param {string} difficulty — 'easy' | 'medium' | 'hard'
   * @returns {string} Palabra en mayúsculas
   */
  function getWord(level, difficulty) {
    const levelIndex = Utils.clamp(level - 1, 0, 6);
    const lengths    = LEVEL_LENGTHS[difficulty] || LEVEL_LENGTHS.easy;
    const targetLen  = lengths[levelIndex];

    // Buscar en el bucket de longitud exacta; si no hay suficientes, buscar adyacentes
    let candidates = _getPoolByLength(targetLen);

    // Excluir palabras ya usadas
    candidates = candidates.filter(w => !_usedWords.has(w));

    if (candidates.length === 0) {
      // Fallback: buscar en longitudes cercanas
      for (let delta = 1; delta <= 3; delta++) {
        const longer  = _getPoolByLength(targetLen + delta).filter(w => !_usedWords.has(w));
        const shorter = _getPoolByLength(targetLen - delta).filter(w => !_usedWords.has(w));
        candidates = [...longer, ...shorter];
        if (candidates.length > 0) break;
      }
    }

    if (candidates.length === 0) {
      // Último recurso: resetear y volver a intentar
      _usedWords = new Set();
      candidates = _getPoolByLength(targetLen);
    }

    const word = Utils.randomFrom(candidates);
    _usedWords.add(word);
    return word;
  }

  /**
   * Obtiene el pool de palabras para una longitud dada.
   */
  function _getPoolByLength(len) {
    return (_dictionary[String(len)] || []);
  }

  // ── Barajado de letras ──────────────────────────────────────────────────────

  /**
   * Convierte una palabra en un array de letras barajadas.
   * Garantiza que el orden barajado NUNCA sea igual al original.
   * @param {string} word — Palabra normalizada
   * @returns {string[]} Array de letras barajadas
   */
  function scramble(word) {
    const letters = word.split('');
    if (letters.length <= 1) return letters;
    return Utils.shuffle(letters);  // Utils.shuffle ya garantiza diferencia
  }

  /**
   * Devuelve true si la palabra tiene letras repetidas.
   */
  function hasRepeatedLetters(word) {
    const set = new Set(word.split(''));
    return set.size < word.length;
  }

  // ── Información de nivel ────────────────────────────────────────────────────

  function getLevelLength(level, difficulty) {
    const idx = Utils.clamp(level - 1, 0, 6);
    return (LEVEL_LENGTHS[difficulty] || LEVEL_LENGTHS.easy)[idx];
  }

  function getTotalLevels() { return 7; }

  // ── API pública ─────────────────────────────────────────────────────────────
  return {
    load,
    resetSession,
    getWord,
    scramble,
    hasRepeatedLetters,
    getLevelLength,
    getTotalLevels,
  };

})();
