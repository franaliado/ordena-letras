/**
 * game.js — Motor del juego OrdenaLetras
 *
 * Responsable de:
 *  - Estado completo de la partida
 *  - Mecánica de letras (acierto/error)
 *  - Puntuación, vidas, niveles
 *  - Transiciones entre pantallas de juego
 *
 * NO toca el DOM directamente; delega en UI.
 */

const Game = (() => {

  // ══════════════════════════════════════════════════════════════════════
  // CONFIGURACIÓN CENTRAL — todos los parámetros ajustables aquí
  // ══════════════════════════════════════════════════════════════════════
  const CONFIG = {
    INITIAL_LIVES:           15,
    MAX_LIVES:               15,
    WORDS_PER_LEVEL:         5,
    TOTAL_LEVELS:            5,

    // Puntuación base por completar una palabra (según nivel)
    // Nivel 1: 4 letras → base 150 | Nivel 2: 5 letras → 200 | ...
    // Simplificado: premio base fijo por letra correcta + bonus de palabra
    POINTS_PER_LETTER:       10,   // +10 por letra correcta (se acumula en totalScore al escribir)
    POINTS_PER_WORD:         100,  // bonus al completar la palabra
    POINTS_PERFECT_BONUS:    50,   // bonus adicional si sin errores

    // Penalización por fallo (sobre el premio potencial de la palabra)
    PENALTY_NORMAL:          4,    // -4 pts del premio potencial (niveles 1-4)
    PENALTY_LAST_LEVEL:      3,    // -3 pts del premio potencial (nivel 5)
    MIN_WORD_PRIZE:          4,    // El premio de la palabra no puede bajar de 4 pts

    POINTS_ERROR:            -5,   // Referencia legacy (UI feedback)
    MIN_SCORE:               0,    // La puntuación total no puede bajar de 0

    // Recuperación de vida: al completar palabra perfecta (sin errores)
    LIFE_ON_PERFECT:         1,

    // Preparado para racha (streak) — no activo en V1
    STREAK_ENABLED:          false,
  };

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
      wordPoints:      0,     // puntos por letras correctas acumulados
      wordPenalty:     0,     // penalización acumulada sobre el premio de la palabra
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
    const requiredLength = Words.getLevelLength ? Words.getLevelLength(_state.level) : (_state.level + 3);
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
    _state.wordPenalty      = 0;  // penalización acumulada para esta palabra

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

    // Puntuación por letra (se suma al total y a los puntos de la palabra)
    const pts = CONFIG.POINTS_PER_LETTER;
    _state.wordPoints  += pts;
    _state.totalScore   = Math.max(CONFIG.MIN_SCORE, _state.totalScore + pts);

    // Animaciones / UI
    Audio.playCorrect();
    UI.onLetterCorrect(pos, letter, _state);

    // Comprobar si la palabra está completa
    if (_state.currentPosition === _state.currentWord.length) {
      _handleWordComplete();
    }
  }

  function _handleWrongLetter(letter) {
    // Restar vida
    _state.lives = Math.max(0, _state.lives - 1);
    _state.wordErrors++;
    _state.totalErrors++;

    // La penalización se acumula sobre el PREMIO POTENCIAL de la palabra,
    // NO se descuenta del totalScore acumulado previo.
    // Nivel 5 (último) = -3 pts; resto de niveles = -4 pts.
    const isLastLevel = _state.level >= CONFIG.TOTAL_LEVELS;
    const penalty = isLastLevel ? CONFIG.PENALTY_LAST_LEVEL : CONFIG.PENALTY_NORMAL;
    _state.wordPenalty += penalty;

    // Animaciones / UI
    Audio.playWrong();
    UI.onLetterWrong(letter, _state, penalty);

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
    // Premio base por completar la palabra
    const wordBonus   = CONFIG.POINTS_PER_WORD;       // 100 pts fijos
    const maxPrize    = wordBonus;                     // máximo aplicable a esta palabra

    // Calcular penalización total acumulada (nunca baja el premio de MIN_WORD_PRIZE)
    const totalPenalty = _state.wordPenalty;
    const prizAfterPen = Math.max(CONFIG.MIN_WORD_PRIZE, maxPrize - totalPenalty);

    // Bonus perfecto (sin errores en esta palabra)
    let isPerfect  = _state.wordErrors === 0;
    let lifeGained = 0;
    let perfectBonus = 0;

    if (isPerfect) {
      perfectBonus = CONFIG.POINTS_PERFECT_BONUS;  // +50
    }

    // Premio final de la palabra
    const finalWordPrize = prizAfterPen + (isPerfect ? perfectBonus : 0);

    // Sumar al totalScore solo el premio por palabra (los pts por letra ya se sumaron al escribir)
    _state.totalScore = Math.max(CONFIG.MIN_SCORE, _state.totalScore + finalWordPrize);
    _state.wordPoints += finalWordPrize;

    // Vida extra solo si perfecto
    if (isPerfect) {
      if (_state.lives < CONFIG.MAX_LIVES) {
        _state.lives = Math.min(CONFIG.MAX_LIVES, _state.lives + CONFIG.LIFE_ON_PERFECT);
        lifeGained = CONFIG.LIFE_ON_PERFECT;
      }
    }

    // Racha (preparado para V2)
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

    // Datos para el desglose en UI
    const breakdown = {
      maxPrize,
      totalPenalty,
      prizAfterPen,
      perfectBonus,
      finalWordPrize,
      isPerfect,
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
      // Nivel completado
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
   */
  function startNextLevel() {
    if (!_state) return;
    Audio.playButton();

    if (_state.level >= CONFIG.TOTAL_LEVELS) {
      // ¡Juego completo! — tratarlo como victoria (Game Over con todos los niveles)
      _triggerGameOver(true);
      return;
    }

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

    // Guardar resultado
    const result = {
      score:          _state.totalScore,
      wordsCompleted: _state.totalWords,
      errors:         _state.totalErrors,
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
    handleKeyboard,
  };

})();
