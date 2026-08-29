/**
 * Ordena Letras — V1.0
 * Motor Principal del Juego (js/game.js)
 * Implementa la mecánica completa, 15 vidas, puntuaciones, validación y recuperación de vidas
 */

const GameEngine = {
  // Parámetros de configuración desacoplados según SRS V1.0
  CONFIG: {
    INITIAL_LIVES: 15,
    MAX_LIVES: 15,
    POINTS_CORRECT_LETTER: 10,
    POINTS_WORD_BONUS: 50,
    POINTS_ERROR_PENALTY: 5,
    CONSECUTIVE_WORDS_FOR_LIFE_RECOVERY: 3
  },

  // Estado reactivo de la partida
  state: {
    difficulty: 'facil',
    lives: 15,
    score: 0,
    currentWord: '',
    scrambledWord: '',
    typedLetters: [],
    currentIndex: 0,
    wordsCompletedThisGame: 0,
    currentStreak: 0,
    errorsInCurrentWord: 0,
    isWordCompleted: false,
    isGameOver: false,
    isActive: false
  },

  /**
   * Inicia una nueva partida con la dificultad elegida
   */
  startNewGame(difficulty = 'facil') {
    this.state.difficulty = difficulty;
    this.state.lives = this.CONFIG.INITIAL_LIVES;
    this.state.score = 0;
    this.state.wordsCompletedThisGame = 0;
    this.state.currentStreak = 0;
    this.state.isGameOver = false;
    this.state.isActive = true;

    WordsManager.resetUsedWords();
    UI.closeAllModals();
    UI.showScreen('screen-game');
    
    this.loadNextWord();
  },

  /**
   * Carga una nueva palabra desordenada
   */
  loadNextWord() {
    this.state.currentWord = WordsManager.getWord(this.state.difficulty);
    this.state.scrambledWord = Utils.scrambleWord(this.state.currentWord);
    this.state.typedLetters = [];
    this.state.currentIndex = 0;
    this.state.errorsInCurrentWord = 0;
    this.state.isWordCompleted = false;

    UI.closeAllModals();
    UI.updateHUD(this.state.lives, this.state.score, this.CONFIG.MAX_LIVES);
    UI.renderScrambledLetters(this.state.scrambledWord);
    UI.renderTargetSlots(this.state.currentWord.length, this.state.typedLetters, this.state.currentIndex);
  },

  /**
   * Maneja la pulsación de una letra (desde teclado táctil o físico)
   */
  handleInput(rawLetter) {
    if (!this.state.isActive || this.state.isGameOver || this.state.isWordCompleted) {
      return;
    }

    const inputLetter = Utils.normalizeText(rawLetter);
    if (!inputLetter || inputLetter.length !== 1) return;

    const expectedLetter = this.state.currentWord[this.state.currentIndex];

    if (inputLetter === expectedLetter) {
      this.handleCorrectLetter(inputLetter);
    } else {
      this.handleIncorrectLetter(inputLetter);
    }
  },

  /**
   * Lógica al acertar la letra en la posición actual
   */
  handleCorrectLetter(letter) {
    this.state.typedLetters.push(letter);
    this.state.currentIndex++;
    this.state.score += this.CONFIG.POINTS_CORRECT_LETTER;

    SoundEngine.playCorrect();
    UI.flashKey(letter, 'correct');
    UI.updateHUD(this.state.lives, this.state.score, this.CONFIG.MAX_LIVES);
    UI.renderTargetSlots(this.state.currentWord.length, this.state.typedLetters, this.state.currentIndex);

    // ¿Palabra completada?
    if (this.state.currentIndex === this.state.currentWord.length) {
      this.handleWordCompleted();
    }
  },

  /**
   * Lógica al cometer un error en la letra introducida
   */
  handleIncorrectLetter(letter) {
    this.state.lives--;
    this.state.score = Math.max(0, this.state.score - this.CONFIG.POINTS_ERROR_PENALTY);
    this.state.errorsInCurrentWord++;
    this.state.currentStreak = 0; // Se reinicia la racha de palabras perfectas

    SoundEngine.playWrong();
    Utils.vibrate([60, 40, 60]);
    UI.flashKey(letter, 'wrong');
    UI.showFeedback('¡INCORRECTA! -5 pts', 'error');
    UI.updateHUD(this.state.lives, this.state.score, this.CONFIG.MAX_LIVES);

    // Comprobar Game Over al agotar vidas
    if (this.state.lives <= 0) {
      this.handleGameOver();
    }
  },

  /**
   * Lógica al completar exitosamente una palabra
   */
  handleWordCompleted() {
    this.state.isWordCompleted = true;
    this.state.wordsCompletedThisGame++;
    this.state.score += this.CONFIG.POINTS_WORD_BONUS;

    // Regla de recuperación de vida si no cometió errores en esta palabra
    if (this.state.errorsInCurrentWord === 0) {
      this.state.currentStreak++;
      this.evaluateLifeRecovery();
    }

    SoundEngine.playWordComplete();
    UI.updateHUD(this.state.lives, this.state.score, this.CONFIG.MAX_LIVES);
    
    const wordEarnedPoints = (this.state.currentWord.length * this.CONFIG.POINTS_CORRECT_LETTER) + this.CONFIG.POINTS_WORD_BONUS;
    UI.showWordCompletedModal(this.state.currentWord, wordEarnedPoints);
  },

  /**
   * Regla encapsulada y configurable de recuperación de vida
   */
  evaluateLifeRecovery() {
    if (this.state.currentStreak > 0 && this.state.currentStreak % this.CONFIG.CONSECUTIVE_WORDS_FOR_LIFE_RECOVERY === 0) {
      if (this.state.lives < this.CONFIG.MAX_LIVES) {
        this.state.lives = Math.min(this.CONFIG.MAX_LIVES, this.state.lives + 1);
        UI.showFeedback('¡VIDA RECUPERADA! (+1 ❤️)', 'success');
      }
    }
  },

  /**
   * Lógica de Game Over al llegar a 0 vidas
   */
  handleGameOver() {
    this.state.isGameOver = true;
    this.state.isActive = false;

    SoundEngine.playGameOver();
    Utils.vibrate([150, 80, 150]);

    // Actualizar almacenamiento y estadísticas
    const bestScore = Storage.updateHighScore(this.state.score);
    const stats = Storage.getStats();

    stats.gamesPlayed++;
    stats.wordsSolved += this.state.wordsCompletedThisGame;
    stats.totalScore += this.state.score;
    stats.bestScore = Math.max(stats.bestScore, this.state.score);
    stats.bestStreak = Math.max(stats.bestStreak, this.state.currentStreak);

    if (this.state.difficulty === 'facil') stats.easySolved += this.state.wordsCompletedThisGame;
    if (this.state.difficulty === 'media') stats.mediumSolved += this.state.wordsCompletedThisGame;
    if (this.state.difficulty === 'dificil') stats.hardSolved += this.state.wordsCompletedThisGame;

    Storage.saveStats(stats);
    Storage.addHistoryRecord({
      difficulty: this.state.difficulty,
      score: this.state.score,
      words: this.state.wordsCompletedThisGame
    });

    UI.showGameOverModal(this.state.score, bestScore, this.state.wordsCompletedThisGame);
  },

  /**
   * Avanza a la siguiente palabra tras celebrar
   */
  continueNextWord() {
    this.loadNextWord();
  },

  /**
   * Reintenta la partida con la misma dificultad
   */
  restartGame() {
    this.startNewGame(this.state.difficulty);
  },

  /**
   * Sale al menú principal
   */
  exitToMenu() {
    this.state.isActive = false;
    UI.closeAllModals();
    UI.showScreen('screen-menu');
  }
};
