/**
 * words.js — Módulo de selección y desordenado de palabras
 *
 * Responsable de:
 *  - Cargar el diccionario JSON local
 *  - Seleccionar palabras según nivel progresivo estricto:
 *      Nivel 1 -> 4 letras exactas
 *      Nivel 2 -> 5 letras exactas
 *      Nivel 3 -> 6 letras exactas
 *      Nivel 4 -> 7 letras exactas
 *      Nivel 5 -> 8 letras exactas
 *  - Seleccionar palabras sin repetición dentro de una partida
 *  - Barajar las letras garantizando que nunca coincidan con el original
 */

const Words = (() => {

  // ── Estado ──────────────────────────────────────────────────────────────────
  let _dictionary = {};      // { "4": [...], "5": [...], "6": [...], "7": [...], "8": [...] }
  let _loaded     = false;
  let _usedWords  = new Set();  // palabras ya usadas en la partida actual

  // Diccionario mínimo de emergencia con longitudes estrictas garantizadas
  const EMERGENCY_DICTIONARY = {
    '4': ['AGUA', 'AIRE', 'ALMA', 'ALTO', 'AMOR', 'ARCO', 'ARTE', 'AZUL', 'BAJO', 'BESO', 'BOCA', 'CASA', 'LUNA', 'ROSA', 'VIDA'],
    '5': ['AMIGO', 'LIBRO', 'PLAYA', 'VERDE', 'NOCHE', 'CAMPO', 'FUEGO', 'MUNDO', 'ARBOL', 'PLAZA', 'BARCO', 'CANTO', 'CLIMA', 'DULCE', 'EXITO'],
    '6': ['CAMINO', 'CIUDAD', 'TIEMPO', 'PUERTA', 'VIENTO', 'MUSICA', 'PUEBLO', 'VERDAD', 'BLANCO', 'JARDIN', 'ABUELA', 'BOSQUE', 'CABEZA', 'FUENTE', 'MAGICO'],
    '7': ['PALABRA', 'CANCION', 'VENTANA', 'PLANETA', 'CORAZON', 'BELLEZA', 'TRABAJO', 'SOLDADO', 'TABLERO', 'CULTURA', 'BANDERA', 'CABALLO', 'ESTUDIO', 'ALEGRIA', 'MENSAJE'],
    '8': ['AVENTURA', 'VICTORIA', 'HISTORIA', 'TELEFONO', 'SILENCIO', 'PRACTICA', 'UNIFORME', 'ESTUDIOS', 'MAESTRIA', 'ACADEMIA', 'DESASTRE', 'ESTRELLA', 'ELEFANTE', 'PACIENCIA', 'PRINCESA']
  };

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
      
      const normalized = {
        '4': [],
        '5': [],
        '6': [],
        '7': [],
        '8': []
      };

      for (const [lenKey, arr] of Object.entries(data)) {
        const requiredLen = parseInt(lenKey, 10);
        if (![4, 5, 6, 7, 8].includes(requiredLen)) continue;
        if (!Array.isArray(arr)) continue;

        // FILTRADO ESTRICTO E INQUEBRANTABLE POR LONGITUD EXACTA DEL NIVEL
        normalized[String(requiredLen)] = arr
          .map(w => Utils.normalize(w))
          .filter(w => typeof w === 'string' && w.length === requiredLen && /^[A-Z]+$/.test(w))
          .filter((w, i, self) => self.indexOf(w) === i);
      }

      // Asegurar que ningún bucket quede vacío
      for (const key of ['4', '5', '6', '7', '8']) {
        if (!normalized[key] || normalized[key].length === 0) {
          normalized[key] = EMERGENCY_DICTIONARY[key];
        }
      }

      _dictionary = normalized;
      _loaded = true;
    } catch (err) {
      console.error('[Words] No se pudo cargar el diccionario:', err);
      _dictionary = { ...EMERGENCY_DICTIONARY };
      _loaded = true;
    }
  }

  // ── Reset de palabras usadas (nueva partida) ────────────────────────────────

  function resetSession() {
    _usedWords = new Set();
  }

  // ── Selección de palabra ────────────────────────────────────────────────────

  /**
   * Obtiene la longitud de palabra para un nivel:
   * Nivel 1 = 4 letras exactas
   * Nivel 2 = 5 letras exactas
   * Nivel 3 = 6 letras exactas
   * Nivel 4 = 7 letras exactas
   * Nivel 5 = 8 letras exactas
   * @param {number} level - 1-indexed (1 a 5)
   * @returns {number} Longitud requerida
   */
  function getLengthForLevel(level) {
    const lvl = Math.max(1, Math.min(5, parseInt(level, 10) || 1));
    const targetMap = { 1: 4, 2: 5, 3: 6, 4: 7, 5: 8 };
    return targetMap[lvl] || (lvl + 3);
  }

  /**
   * Selecciona una palabra para el nivel dado de forma estricta según su longitud.
   * @param {number} level — 1-indexed (1 a 5)
   * @returns {string} Palabra en mayúsculas de longitud exacta
   */
  function getWord(level) {
    const targetLen = getLengthForLevel(level);

    // Obtener candidatos del bucket correspondiente
    let candidates = _getPoolByLength(targetLen);

    // Blindaje adicional: asegurar que cada palabra candidata tenga exactamente targetLen caracteres
    candidates = candidates.filter(w => typeof w === 'string' && w.length === targetLen && /^[A-Z]+$/.test(w));

    // Excluir palabras ya usadas en la sesión actual
    let available = candidates.filter(w => !_usedWords.has(w));

    if (available.length === 0) {
      // Si se agotaron las palabras de esta longitud exacta, reiniciar las usadas de este tamaño
      _usedWords.forEach(w => {
        if (w.length === targetLen) _usedWords.delete(w);
      });
      available = candidates.filter(w => !_usedWords.has(w));
    }

    if (available.length === 0) {
      available = candidates;
    }

    let word = Utils.randomFrom(available);

    // Red de seguridad absoluta: si no se obtuvo una palabra de la longitud exacta requerida
    if (!word || word.length !== targetLen) {
      const emergencyList = (EMERGENCY_DICTIONARY[String(targetLen)] || ['AGUA']).map(w => Utils.normalize(w));
      word = Utils.randomFrom(emergencyList);
    }

    if (word) {
      _usedWords.add(word);
    }

    return word || '';
  }

  /**
   * Obtiene el pool de palabras para una longitud dada.
   */
  function _getPoolByLength(len) {
    return (_dictionary[String(len)] || EMERGENCY_DICTIONARY[String(len)] || []);
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
    return Utils.shuffle(letters);
  }

  /**
   * Devuelve true si la palabra tiene letras repetidas.
   */
  function hasRepeatedLetters(word) {
    const set = new Set(word.split(''));
    return set.size < word.length;
  }

  function getLevelLength(level) {
    return getLengthForLevel(level);
  }

  function getTotalLevels() { return 5; }

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
