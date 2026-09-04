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

    // Verificar si el jugador tiene nombre
    const name = Storage.getPlayerName();
    if (!name || name === 'Jugador') {
      UI.showScreen('screen-player-name');
      return;
    }

    _launchGame();
  }

  function launchAfterName() {
    _launchGame();
  }

  function _launchGame() {
    Words.resetSession();
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

    UI.renderGameBoard(_state);
  }

  // ══════════════════════════════════════════════════════════════════════
  // MECÁNICA: PROCESAR LETRA
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Procesa la pulsación de una tecla del teclado virtual.
   * @param {string} letter — letra en mayúsculas
   */
  function pressLetter(letter) {
    if (!_state || !_state.isRunning || _state.isPaused || _state.isGameOver) return;
    if (_state.currentPosition >= _state.currentWord.length) return;

    const expected = _state.currentWord[_state.currentPosition];

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

    // Animaciones / UI
    Audio.playCorrect();
    UI.onLetterCorrect(pos, letter, _state);

    // Comprobar si la palabra está completa
    if (_state.currentPosition === _state.currentWord.length) {
      _handleWordComplete();
    }
  }

  function _handleWrongLetter(letter) {
    // Restar 1 vida
    _state.lives = Math.max(0, _state.lives - 1);
    _state.wordErrors++;
    _state.totalErrors++;

    // Los errores en letras incorrectas no quitan puntos

    // Animaciones / UI
    Audio.playWrong();
    UI.onLetterWrong(letter, _state);

    // Comprobar Game Over
    if (_state.lives <= 0) {
      // Esperar la animación de error antes de Game Over
      setTimeout(() => _triggerGameOver(), 600);
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // PALABRA COMPLETADA
  // ══════════════════════════════════════════════════════════════════════

  function _handleWordComplete() {
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
    Audio.playButton();
    _state.wordsInLevel      = 0;
    _state.levelPointsEarned = 0;
    _state.isPaused = false;
    UI.showScreen('screen-game');
    _loadNewWord();
  }

  function exitToMenu() {
    Audio.playButton();
    Audio.stopMusic();
    _state = null;
    UI.showScreen('screen-menu');
  }

  function playAgain() {
    Audio.playButton();
    Words.resetSession();
    _state = _initialState();
    _state.isRunning = true;
    UI.showScreen('screen-game');
    Audio.startMusic();
    _loadNewWord();
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
  };

})();
