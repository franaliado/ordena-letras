/**
 * words.js — Módulo de selección y desordenado de palabras
 *
 * Responsable de:
 *  - Cargar el diccionario JSON local con soporte de 4 a 12 letras
 *  - Progresión de niveles según longitud:
 *      Nivel 1 -> 4 letras
 *      Nivel 2 -> 5 letras
 *      Nivel 3 -> 6 letras
 *      Nivel 4 -> 7 letras
 *      Nivel 5 -> 8 letras
 *      Nivel 6 -> 9 letras
 *      Nivel 7 -> 10 letras
 *      Nivel 8 -> 11 letras
 *      Nivel 9+ -> 12 letras (máximo continuo e indefinido)
 *  - Seleccionar palabras sin repetición dentro de una partida
 *  - Barajar las letras garantizando que nunca coincidan con el original
 */

const Words = (() => {

  const VALID_LENGTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12];

  // ── Estado ──────────────────────────────────────────────────────────────────
  let _dictionary = {};      // { "4": [...], ..., "12": [...] }
  let _loaded     = false;
  let _usedWords  = new Set();  // palabras ya usadas en la partida actual

  // Diccionario de emergencia con palabras verificadas de 4 a 12 letras
  const EMERGENCY_DICTIONARY = {
    '4': ['AGUA', 'AIRE', 'ALMA', 'ALTO', 'AMOR', 'ARCO', 'ARTE', 'AZUL', 'BAJO', 'BESO', 'BOCA', 'CASA', 'LUNA', 'ROSA', 'VIDA'],
    '5': ['AMIGO', 'LIBRO', 'PLAYA', 'VERDE', 'NOCHE', 'CAMPO', 'FUEGO', 'MUNDO', 'ARBOL', 'PLAZA', 'BARCO', 'CANTO', 'CLIMA', 'DULCE', 'EXITO'],
    '6': ['CAMINO', 'CIUDAD', 'TIEMPO', 'PUERTA', 'VIENTO', 'MUSICA', 'PUEBLO', 'VERDAD', 'BLANCO', 'JARDIN', 'ABUELA', 'BOSQUE', 'CABEZA', 'FUENTE', 'MAGICO'],
    '7': ['PALABRA', 'CANCION', 'VENTANA', 'PLANETA', 'CORAZON', 'BELLEZA', 'TRABAJO', 'SOLDADO', 'TABLERO', 'CULTURA', 'BANDERA', 'CABALLO', 'ESTUDIO', 'ALEGRIA', 'MENSAJE'],
    '8': ['AVENTURA', 'VICTORIA', 'HISTORIA', 'TELEFONO', 'SILENCIO', 'PRACTICA', 'UNIFORME', 'ESTUDIOS', 'MAESTRIA', 'ACADEMIA', 'DESASTRE', 'ESTRELLA', 'ELEFANTE', 'PACIENCIA', 'PRINCESA'],
    '9': ['ABUNDANTE', 'ACTIVIDAD', 'AERONAVES', 'AGRADECER', 'AMBIENTAL', 'ANECDOTAS', 'ARBOLEDAS', 'ARGUMENTO', 'CHOCOLATE', 'CIUDADANO', 'DIRECTORA', 'ECOLOGICO', 'ESPERANZA', 'NATURALEZ', 'VOLUNTADES'],
    '10': ['ABUNDANCIA', 'ACTIVIDADES', 'AEROPUERTO', 'AFORTUNADO', 'ARQUITECTO', 'CALENDARIO', 'CHOCOLATES', 'DEMOCRACIA', 'DICCIONARIO', 'ESTUDIANTE', 'FOTOGRAFIA', 'IMPORTANTE', 'NACIMIENTO', 'TECNOLOGIA', 'VACACIONES'],
    '11': ['ABUNDANCIAS', 'ADOLESCENTE', 'AEROPUERTOS', 'AGRICULTURA', 'CALCULADORA', 'CELEBRACION', 'CIENTIFICOS', 'COMPUTADORA', 'CONOCIMIENTO', 'ELECTRICIDAD', 'ESPECTACULO', 'ESTABILIDAD', 'HUMANITARIO', 'LABORATORIO', 'UNIVERSIDAD'],
    '12': ['AGRICULTORES', 'ALIMENTACION', 'ARQUITECTURA', 'AUTOMATIZADO', 'BIBLIOTECAS', 'CALIFICACION', 'CELEBRACIONES', 'CIENTIFICOS', 'COMPUTADORAS', 'COMUNICACION', 'CONOCIMIENTO', 'ELECTRICIDAD', 'ESPECTACULAR', 'INVESTIGADOR', 'UNIVERSITARIO']
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
      
      const normalized = {};
      VALID_LENGTHS.forEach(len => {
        normalized[String(len)] = [];
      });

      for (const [lenKey, arr] of Object.entries(data)) {
        const requiredLen = parseInt(lenKey, 10);
        if (!VALID_LENGTHS.includes(requiredLen)) continue;
        if (!Array.isArray(arr)) continue;

        // Filtrado por longitud exacta y caracteres válidos A-Z
        normalized[String(requiredLen)] = arr
          .map(w => Utils.normalize(w))
          .filter(w => typeof w === 'string' && w.length === requiredLen && /^[A-Z]+$/.test(w))
          .filter((w, i, self) => self.indexOf(w) === i);
      }

      // Asegurar que ningún bucket quede vacío usando el de emergencia
      VALID_LENGTHS.forEach(len => {
        const key = String(len);
        if (!normalized[key] || normalized[key].length === 0) {
          normalized[key] = (EMERGENCY_DICTIONARY[key] || ['PALABRA']).map(w => Utils.normalize(w));
        }
      });

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
   * Nivel 1 = 4 letras
   * Nivel 2 = 5 letras
   * Nivel 3 = 6 letras
   * Nivel 4 = 7 letras
   * Nivel 5 = 8 letras
   * Nivel 6 = 9 letras
   * Nivel 7 = 10 letras
   * Nivel 8 = 11 letras
   * Nivel 9+ = 12 letras (tope máximo)
   *
   * @param {number} level - 1-indexed
   * @returns {number} Longitud requerida (4 a 12)
   */
  function getLengthForLevel(level) {
    const lvl = Math.max(1, parseInt(level, 10) || 1);
    return Math.min(12, 3 + lvl);
  }

  /**
   * Selecciona una palabra para el nivel dado de forma estricta según su longitud.
   * @param {number} level — 1-indexed
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

    // Red de seguridad absoluta si no se obtuvo una palabra adecuada
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

  // ── API pública ─────────────────────────────────────────────────────────────
  return {
    load,
    resetSession,
    getWord,
    scramble,
    hasRepeatedLetters,
    getLevelLength,
  };

})();
