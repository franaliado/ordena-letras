/**
 * game.js — Motor del juego OrdenaLetras
 *
 * Responsable de:
 *  - Estado completo de la partida
 *  - Mecánica de letras (acierto/error)
 *  - Puntuación base por nivel (100 a 500)
 *  - Sistema de vidas (15 vidas, penalización de 1 vida por error, sin restar puntos)
 *  - Recuperación de vida extra según longitud de palabra y margen de error
 *  - Progresión ilimitada de niveles (4 a 12 letras)
 *
 * NO toca el DOM directamente; delega en UI.
 */

const Game = (() => {

  // ══════════════════════════════════════════════════════════════════════
  // CONFIGURACIÓN CENTRAL
  // ══════════════════════════════════════════════════════════════════════
  const CONFIG = {
    INITIAL_LIVES:           15,
    MAX_LIVES:               15,
    WORDS_PER_LEVEL:         5,

    // Puntuación por letra correcta
    POINTS_PER_LETTER:       10,   // +10 por letra correcta al escribir

    // Recuperación de vidas
    LIFE_BONUS:              1,    // +1 vida al cumplir condición de nivel

    MIN_SCORE:               0,    // La puntuación total no puede bajar de 0
  };

  /**
   * Puntuación base por palabra completada según el nivel:
   * Nivel 1 (4 letras): 100 pts
   * Nivel 2 (5 letras): 150 pts
   * Nivel 3 (6 letras): 200 pts
   * Nivel 4 (7 letras): 250 pts
   * Nivel 5 (8 letras): 300 pts
   * Nivel 6 (9 letras): 350 pts
   * Nivel 7 (10 letras): 400 pts
   * Nivel 8 (11 letras): 450 pts
   * Nivel 9+ (12 letras): 500 pts
   *
   * @param {number} level
   * @returns {number}
   */
  function getBasePointsForLevel(level) {
    const lvl = Math.max(1, parseInt(level, 10) || 1);
    return Math.min(500, 100 + (Math.min(lvl, 9) - 1) * 50);
  }

  /**
   * Determina si el jugador califica para ganar 1 vida extra según la longitud
   * de la palabra y los errores cometidos:
   * - De 4 a 6 letras: Exige 0 errores.
   * - De 7 a 8 letras: Permite hasta 1 error máximo.
   * - De 9 a 10 letras: Permite hasta 2 errores máximos.
   * - De 11 a 12 letras: Permite hasta 3 errores máximos.
   *
   * @param {number} wordLength
   * @param {number} wordErrors
   * @returns {boolean}
   */
  function checkExtraLifeEligibility(wordLength, wordErrors) {
    if (wordLength <= 6) {
      return wordErrors === 0;
    } else if (wordLength <= 8) {
      return wordErrors <= 1;
    } else if (wordLength <= 10) {
      return wordErrors <= 2;
    } else {
      // 11 a 12 letras
      return wordErrors <= 3;
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // ESTADO DE PARTIDA
  // ══════════════════════════════════════════════════════════════════════
  let _state = null;
  let _gameOverTimer = null;

  function _initialState() {
    return {
      isRunning:  false,
      isPaused:   false,
      isGameOver: false,

      // Progreso global
      level:       1,
      totalScore:  0,
      lives:       CONFIG.INITIAL_LIVES,

      // Progreso en el nivel
      wordsInLevel:      0,   // palabras completadas en el nivel actual
      levelPointsEarned: 0,   // puntos acumulados en este nivel

      // Partida global
      totalWords:  0,
      totalErrors: 0,
      maxStreak:   0,
      currentStreak: 0,

      // Palabra actual
      currentWord:     '',    // palabra objetivo (mayúsculas, sin tildes)
      scrambledLetters:[],    // array de letras barajadas
      answerProgress:  [],    // array paralelo a currentWord: char | null
      currentPosition: 0,     // índice de la siguiente letra a introducir
      wordErrors:      0,     // errores cometidos en esta palabra
      wordPoints:      0,     // puntos acumulados en esta palabra
      wordCompleted:   false, // indica si la palabra actual ya fue completada/validada
      hintUsedInWord:  false, // indica si ya se usó la pista en la palabra actual
    };
  }

  // ══════════════════════════════════════════════════════════════════════
  // ARRANQUE DE PARTIDA
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Inicia una nueva partida automáticamente desde el Nivel 1.
   */
  function startGame() {
    Audio.playButton();

    // Verificar si el jugador tiene nombre registrado
    if (!Storage.hasPlayerName()) {
      UI.showScreen('screen-player-name');
      return;
    }

    _launchGame();
  }

  function launchAfterName() {
    _launchGame();
  }

  // ══════════════════════════════════════════════════════════════════════
  // CARGA Y RESTAURACIÓN DE PARTIDA
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Restaura la partida guardada con validación automática, prevención de
   * estados fantasmas/bloqueos y aseguramiento de controladores de eventos sin duplicación.
   * @param {Object} saved — Estado persistido recuperado de localStorage
   */
  function _restoreGame(saved) {
    if (!saved || typeof saved !== 'object') return;

    // 1. Sanitizar y asegurar que las variables de control de vidas no se reinicien de forma defectuosa
    const savedLives = parseInt(saved.lives, 10);
    const lives = (!isNaN(savedLives) && savedLives >= 0)
      ? Math.min(CONFIG.MAX_LIVES, savedLives)
      : CONFIG.INITIAL_LIVES;

    // 2. Sanitizar palabra y array de progreso de aciertos
    const word = typeof saved.currentWord === 'string' ? saved.currentWord : '';
    const wordLen = word.length;
    let progress = Array.isArray(saved.answerProgress) ? [...saved.answerProgress] : [];
    if (progress.length !== wordLen) {
      progress = new Array(wordLen).fill(null);
    }

    // 3. Sincronizar posición actual estrictamente según los aciertos reales colocados
    let correctCount = 0;
    while (correctCount < wordLen && progress[correctCount] !== null && progress[correctCount] !== undefined && progress[correctCount] !== '') {
      correctCount++;
    }

    // 4. Reconstruir estado limpio preservando aciertos, vidas y estadísticas
    _state = {
      ..._initialState(),
      ...saved,
      lives: lives,
      currentWord: word,
      scrambledLetters: (Array.isArray(saved.scrambledLetters) && saved.scrambledLetters.length === wordLen)
        ? saved.scrambledLetters
        : (wordLen > 0 && typeof Words !== 'undefined' && Words.scramble ? Words.scramble(word) : []),
      answerProgress: progress,
      currentPosition: correctCount,
      wordErrors: parseInt(saved.wordErrors, 10) || 0,
      wordPoints: parseInt(saved.wordPoints, 10) || 0,
      totalScore: Math.max(0, parseInt(saved.totalScore, 10) || 0),
      level: Math.max(1, parseInt(saved.level, 10) || 1),
      wordsInLevel: parseInt(saved.wordsInLevel, 10) || 0,
      levelPointsEarned: parseInt(saved.levelPointsEarned, 10) || 0,
      totalWords: parseInt(saved.totalWords, 10) || 0,
      totalErrors: parseInt(saved.totalErrors, 10) || 0,
      maxStreak: parseInt(saved.maxStreak, 10) || 0,
      currentStreak: parseInt(saved.currentStreak, 10) || 0,
      wordCompleted: Boolean(saved.wordCompleted),
      isRunning:  true,
      isPaused:   false,
      isGameOver: false,
    };

    // 5. Cambiar a pantalla de juego y reanudar audio
    UI.showScreen('screen-game');
    Audio.startMusic();

    // 6. Control de eventos: evitar duplicación de listeners del teclado táctil o físico al restaurar.
    // Los eventos de entrada ya quedan vinculados de forma global en el arranque de la app;
    // marcamos el flag para evitar cualquier reinicialización o registro duplicado.
    window._olInputHandlersInitialized = true;

    const isCompletedOrFull = wordLen > 0 && (
      _state.currentPosition >= wordLen ||
      _state.wordCompleted === true ||
      (progress.length === wordLen && progress.every(ch => ch !== null && ch !== undefined && ch !== '')) ||
      (progress.length === wordLen && progress.join('') === word)
    );

    if (isCompletedOrFull) {
      // 1. Mostrar inicialmente el tablero con las letras colocadas en los slots (en verde)
      UI.renderGameBoard(_state);

      // 2. Prevención de estados fantasmas: Forzar un setTimeout de 100ms para ejecutar la validación
      // lógica y continuar el flujo normal (dar puntos si corresponde, limpiar slot y cargar siguiente palabra)
      setTimeout(() => {
        if (!_state || !_state.isRunning) return;

        if (_state.wordCompleted) {
          // Si la palabra ya había sido validada/puntuada en la sesión anterior,
          // limpiar slot y avanzar inmediatamente al siguiente turno
          if (_state.wordsInLevel >= CONFIG.WORDS_PER_LEVEL) {
            _handleLevelComplete();
          } else {
            UI.showScreen('screen-game');
            _loadNewWord();
            if (typeof Storage !== 'undefined' && Storage.saveGameState) {
              Storage.saveGameState(_state);
            }
          }
        } else {
          // Invocar de inmediato la función de validación de palabra
          _handleWordComplete();
        }
      }, 100);
    } else {
      // Si la palabra está en progreso normal (incompleta), renderizar el tablero
      // y continuar jugando de forma reactiva
      UI.renderGameBoard(_state);
    }
  }

  function _launchGame() {
    if (_gameOverTimer) {
      clearTimeout(_gameOverTimer);
      _gameOverTimer = null;
    }
    Words.resetSession();

    // Intentar cargar y restaurar partida guardada
    const saved = (typeof Storage !== 'undefined' && Storage.getGameState) ? Storage.getGameState() : null;
    if (saved && saved.currentWord && typeof saved.level === 'number') {
      _restoreGame(saved);
      return;
    }

    // No hay estado guardado válido, iniciar nuevo juego
    _state = _initialState();
    _state.isRunning = true;

    UI.showScreen('screen-game');
    Audio.startMusic();

    _loadNewWord();
  }

  // ══════════════════════════════════════════════════════════════════════
  // GESTIÓN DE PALABRAS
  // ══════════════════════════════════════════════════════════════════════

  function _loadNewWord() {
    const requiredLength = Words.getLevelLength ? Words.getLevelLength(_state.level) : Words.getLengthForLevel(_state.level);
    let word = Words.getWord(_state.level);

    if (!word || word.length !== requiredLength) {
      word = Words.getWord(_state.level);
    }

    const scrambled = Words.scramble(word);

    _state.currentWord      = word;
    _state.scrambledLetters = scrambled;
    _state.answerProgress   = new Array(word.length).fill(null);
    _state.currentPosition  = 0;
    _state.wordErrors       = 0;
    _state.wordPoints       = 0;
    _state.wordCompleted    = false;
    _state.hintUsedInWord   = false;

    UI.renderGameBoard(_state);
  }

  /**
   * Pista de ayuda: Revela la siguiente letra correcta a cambio de 100 puntos.
   * Requisitos: saldo >= 100 puntos y máx. 1 pista por palabra.
   */
  function useHint() {
    if (!_state || !_state.isRunning || _state.isPaused || _state.isGameOver || _state.wordCompleted) return;

    if (_state.totalScore < 100) {
      if (typeof UI !== 'undefined' && UI.showToast) {
        UI.showToast('⚠️ Requieres al menos 100 puntos para usar la ayuda.');
      }
      return;
    }

    if (_state.hintUsedInWord) {
      if (typeof UI !== 'undefined' && UI.showToast) {
        UI.showToast('⚠️ Ya usaste 1 ayuda para esta palabra.');
      }
      return;
    }

    // Restar 100 puntos y bloquear más pistas para esta palabra
    _state.totalScore = Math.max(0, _state.totalScore - 100);
    _state.hintUsedInWord = true;

    Audio.playButton();

    if (typeof UI !== 'undefined') {
      if (UI.showHintFeedback) UI.showHintFeedback('-100 💡');
      if (UI.updateHintButtonState) UI.updateHintButtonState(_state);
    }

    // Revelar la siguiente letra correcta en su posición
    const expected = _state.currentWord[_state.currentPosition];
    if (expected) {
      _handleCorrectLetter(expected);
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // MECÁNICA: PROCESAR LETRA
  // ══════════════════════════════════════════════════════════════════════

  // Variables de control para descartar disparos duplicados de eventos táctiles/teclado
  let _lastInputLetter = null;
  let _lastInputTimestamp = 0;

  /**
   * Procesa la pulsación de una tecla del teclado virtual o físico.
   * Validación estricta con independencia garantizada del contador de vidas.
   * @param {string} letter — letra en mayúsculas
   */
  function pressLetter(letter) {
    if (!_state || !_state.isRunning || _state.isPaused || _state.isGameOver || _gameOverTimer) return;
    if (_state.wordCompleted) return;
    if (_state.currentPosition >= _state.currentWord.length) return;

    // Descartar eventos duplicados inmediatos (mismo carácter en menos de 80ms)
    // para evitar que rebotes táctiles o listeners duplicados procesen la letra dos veces
    const now = Date.now();
    if (letter === _lastInputLetter && (now - _lastInputTimestamp) < 80) {
      return;
    }
    _lastInputLetter = letter;
    _lastInputTimestamp = now;

    const expected = _state.currentWord[_state.currentPosition];

    // Validación estricta: acierto vs error
    if (letter === expected) {
      _handleCorrectLetter(letter);
    } else {
      _handleWrongLetter(letter);
    }
  }

  function _handleCorrectLetter(letter) {
    const pos = _state.currentPosition;

    // Registrar la letra en el progreso
    _state.answerProgress[pos] = letter;
    _state.currentPosition++;

    // Puntuación por letra (+10 pts)
    const pts = CONFIG.POINTS_PER_LETTER;
    _state.wordPoints += pts;
    _state.totalScore += pts;

    // Animaciones / UI (las vidas permanecen estrictamente intactas en los aciertos)
    Audio.playCorrect();
    UI.onLetterCorrect(pos, letter, _state);

    // Guardar estado tras letra correcta
    if (typeof Storage !== 'undefined' && Storage.saveGameState) {
      Storage.saveGameState(_state);
    }

    // Comprobar si la palabra está completa
    if (_state.currentPosition === _state.currentWord.length) {
      _handleWordComplete();
    }
  }

  function _handleWrongLetter(letter) {
    _state.wordErrors++;
    _state.totalErrors++;

    Audio.playWrong();

    if (_state.lives > 0) {
      // Consume 1 vida de respaldo (los corazones representados son las vidas de respaldo)
      _state.lives--;
      UI.onLetterWrong(letter, _state);
    } else {
      // Vidas de respaldo en 0: falla su última oportunidad y pasa directo a Game Over
      UI.onLetterWrong(letter, _state);
      _triggerGameOver(false);
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // PALABRA COMPLETADA
  // ══════════════════════════════════════════════════════════════════════

  function _handleWordComplete() {
    _state.wordCompleted = true;

    // Puntos base según la tabla del nivel actual
    const baseWordPoints = getBasePointsForLevel(_state.level);

    // Sumar puntos base de la palabra al total
    _state.totalScore += baseWordPoints;
    _state.wordPoints += baseWordPoints;

    // Evaluar bonificación de vida extra
    const isEligibleForLife = checkExtraLifeEligibility(_state.currentWord.length, _state.wordErrors);
    let lifeGained = 0;

    if (isEligibleForLife) {
      if (_state.lives < CONFIG.MAX_LIVES) {
        _state.lives = Math.min(CONFIG.MAX_LIVES, _state.lives + CONFIG.LIFE_BONUS);
        lifeGained = CONFIG.LIFE_BONUS;
      }
    }

    const isPerfect = _state.wordErrors === 0;

    // Racha
    if (isPerfect) {
      _state.currentStreak++;
      if (_state.currentStreak > _state.maxStreak) {
        _state.maxStreak = _state.currentStreak;
      }
    } else {
      _state.currentStreak = 0;
    }

    _state.totalWords++;
    _state.wordsInLevel++;
    _state.levelPointsEarned += _state.wordPoints;

    // Desglose para la pantalla de palabra correcta
    const breakdown = {
      baseWordPoints,
      wordPoints: _state.wordPoints,
      isPerfect,
      isEligibleForLife,
      lifeGained,
      wordErrors: _state.wordErrors,
    };

    Audio.playWordComplete();
    UI.showWordComplete(_state, isPerfect, lifeGained, _state.wordPoints, breakdown);
    // Guardar estado tras completar palabra
    if (typeof Storage !== 'undefined' && Storage.saveGameState) {
      Storage.saveGameState(_state);
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // AVANZAR: nextWord / nextLevel
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Llamado cuando el jugador pulsa CONTINUAR en la pantalla de palabra correcta.
   */
  function nextWord() {
    if (!_state) return;
    Audio.playButton();

    if (_state.wordsInLevel >= CONFIG.WORDS_PER_LEVEL) {
      // Nivel completado (5 palabras)
      _handleLevelComplete();
    } else {
      UI.showScreen('screen-game');
      _loadNewWord();
      if (typeof Storage !== 'undefined' && Storage.saveGameState) {
        Storage.saveGameState(_state);
      }
    }
  }

  function _handleLevelComplete() {
    Audio.playLevelUp();
    UI.showLevelComplete(_state);
  }

  /**
   * Llamado cuando el jugador pulsa SIGUIENTE NIVEL.
   * Progresión infinita de niveles (1 al 9, y continúa indefinidamente en 9+).
   */
    function startNextLevel() {
      if (!_state) return;
      Audio.playButton();

      _state.level++;
      _state.wordsInLevel      = 0;
      _state.levelPointsEarned = 0;

      UI.showScreen('screen-game');
      _loadNewWord();
      // Guardar estado tras avanzar de nivel
      if (typeof Storage !== 'undefined' && Storage.saveGameState) {
        Storage.saveGameState(_state);
      }
    }

  // ══════════════════════════════════════════════════════════════════════
  // GAME OVER
  // ══════════════════════════════════════════════════════════════════════

  function _triggerGameOver(isVictory = false) {
    if (!_state) return;
    _state.isRunning  = false;
    _state.isGameOver = true;

    Audio.playGameOver();
    Audio.stopMusic();

    // Limpiar estado guardado al terminar la partida
    if (typeof Storage !== 'undefined' && Storage.clearGameState) {
      Storage.clearGameState();
    }

    // Guardar resultado (incluyendo el nivel alcanzado)
    const result = {
      score:          _state.totalScore,
      wordsCompleted: _state.totalWords,
      errors:         _state.totalErrors,
      level:          _state.level,
      streak:         _state.maxStreak,
    };
    Storage.recordGameResult(result);

    const prevBest = Storage.getBestScore();
    const isNewRecord = _state.totalScore > 0 && _state.totalScore >= prevBest;

    UI.showGameOver(_state, isNewRecord, isVictory);
  }

  // ══════════════════════════════════════════════════════════════════════
  // PAUSA / RESUME / REINICIAR
  // ══════════════════════════════════════════════════════════════════════

  function pause() {
    if (!_state || !_state.isRunning) return;
    _state.isPaused = true;
    Audio.pauseMusic();
  }

  function resume() {
    if (!_state) return;
    _state.isPaused = false;
    Audio.resumeMusic();
    UI.showScreen('screen-game');
  }

  function restartLevel() {
    if (!_state) return;
    if (_gameOverTimer) {
      clearTimeout(_gameOverTimer);
      _gameOverTimer = null;
    }
    Audio.playButton();
    _state.wordsInLevel      = 0;
    _state.levelPointsEarned = 0;
    _state.isPaused = false;
    UI.showScreen('screen-game');
    _loadNewWord();
    if (typeof Storage !== 'undefined' && Storage.saveGameState) {
      Storage.saveGameState(_state);
    }
  }

  function exitToMenu() {
    if (_gameOverTimer) {
      clearTimeout(_gameOverTimer);
      _gameOverTimer = null;
    }
    Audio.playButton();
    Audio.stopMusic();
    _state = null;
    UI.showScreen('screen-menu');
  }

  function playAgain() {
    if (_gameOverTimer) {
      clearTimeout(_gameOverTimer);
      _gameOverTimer = null;
    }
    Audio.playButton();
    if (typeof Storage !== 'undefined' && Storage.clearGameState) {
      Storage.clearGameState();
    }
    Words.resetSession();
    _state = _initialState();
    _state.isRunning = true;
    UI.showScreen('screen-game');
    Audio.startMusic();
    _loadNewWord();
    if (typeof Storage !== 'undefined' && Storage.saveGameState) {
      Storage.saveGameState(_state);
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // GETTERS DE ESTADO
  // ══════════════════════════════════════════════════════════════════════

  function getState()  { return _state; }
  function getConfig() { return CONFIG; }
  function getBasePoints(level) { return getBasePointsForLevel(level); }

  // ══════════════════════════════════════════════════════════════════════
  // TECLADO FÍSICO (PC)
  // ══════════════════════════════════════════════════════════════════════

  function handleKeyboard(e) {
    if (!_state || !_state.isRunning || _state.isPaused) return;
    const key = e.key.toUpperCase();
    if (/^[A-Z]$/.test(key)) {
      pressLetter(key);
      // Efecto visual en la tecla
      const keyEl = document.querySelector(`.key[data-key="${key}"]`);
      if (keyEl) Utils.flashClass(keyEl, 'pressed', 200);
    }
  }

  // ── API pública ────────────────────────────────────────────────────────────
  return {
    startGame,
    launchAfterName,
    pressLetter,
    useHint,
    nextWord,
    startNextLevel,
    resume,
    restartLevel,
    exitToMenu,
    playAgain,
    pause,
    getState,
    getConfig,
    getBasePoints,
    handleKeyboard,
    restoreGame: _restoreGame,
  };

})();
