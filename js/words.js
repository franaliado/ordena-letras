/**
 * words.js — Módulo de selección y desordenado de palabras
 *
 * Responsable de:
 *  - Cargar el diccionario JSON local
 *  - Seleccionar palabras según nivel progresivo estricto:
 *      Nivel 1 -> 4 letras
 *      Nivel 2 -> 5 letras
 *      Nivel 3 -> 6 letras
 *      Nivel 4 -> 7 letras
 *      Nivel 5 -> 8 letras
 *  - Seleccionar palabras sin repetición dentro de una partida
 *  - Barajar las letras garantizando que nunca coincidan con el original
 */

const Words = (() => {

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
        '4': ['AMOR','CASA','LUNA','ROSA','VINO','LAGO','MANO','ROCA','PALO','GATO','AZUL','ALMA','FLOR','SOLO','MESA'],
        '5': ['AMIGO','LIBRO','CAMPO','FONDO','MUNDO','BANCO','PLAZA','CLIMA','PARTE','LUGAR','PLAYA','ARBOL','NOCHE','VERDE','FUEGO'],
        '6': ['CAMINO','CIUDAD','TIEMPO','FUENTE','CABEZA','JARDIN','FLORES','PUERTA','VIENTO','ESCUELA','PUEBLO','MUSICA','VERDAD','ABUELA','BLANCO'],
        '7': ['PALABRA','CABALLO','CANCION','FUTBOL','ALEGRIA','CULTURA','TABLERO','ESTRELLA','HERMANO','VENTANA','PLANETA','CORAZON','BELLEZA','SOLDADO','TRABAJO'],
        '8': ['AVENTURA','FANTASIA','VICTORIA','BELLEZA','MELODIA','CARACTER','MILAGROS','UNIVERSO','ELEFANTE','HISTORIA','JUVENTUD','MONTANAS','PRACTICA','TELEFONO','SILENCIO']
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
   * Obtiene la longitud de palabra para un nivel:
   * Nivel 1 = 4 letras
   * Nivel 2 = 5 letras
   * Nivel 3 = 6 letras
   * Nivel 4 = 7 letras
   * Nivel 5 = 8 letras
   * @param {number} level - 1-indexed
   */
  function getLengthForLevel(level) {
    const lvl = Math.max(1, Math.min(5, parseInt(level, 10) || 1));
    return lvl + 3; // 1->4, 2->5, 3->6, 4->7, 5->8
  }

  /**
   * Selecciona una palabra para el nivel dado de forma estricta según su longitud.
   * @param {number} level — 1-indexed (1 a 5)
   * @returns {string} Palabra en mayúsculas
   */
  function getWord(level) {
    const targetLen = getLengthForLevel(level);

    // Buscar en el bucket de longitud exacta
    let candidates = _getPoolByLength(targetLen);

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

    const word = Utils.randomFrom(available);
    if (word) {
      _usedWords.add(word);
    }
    return word || '';
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
