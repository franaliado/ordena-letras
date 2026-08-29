/**
 * Ordena Letras — V1.0
 * Módulo de Gestión de Interfaz de Usuario (js/ui.js)
 * Controla pantallas, componentes visuales, animaciones y teclado virtual
 */

const UI = {
  elements: {},

  init() {
    this.cacheElements();
    this.renderKeyboard();
  },

  cacheElements() {
    this.elements = {
      screens: document.querySelectorAll('.screen'),
      modals: document.querySelectorAll('.modal-overlay'),
      
      // Partida
      livesCount: document.getElementById('lives-count'),
      scoreValue: document.getElementById('score-value'),
      scrambledContainer: document.getElementById('scrambled-letters-box'),
      targetSlotsContainer: document.getElementById('target-slots-box'),
      feedbackBanner: document.getElementById('feedback-banner'),
      keyboardContainer: document.getElementById('keyboard-box'),
      
      // Modales
      modalCompleted: document.getElementById('modal-completed'),
      completedWord: document.getElementById('completed-word-text'),
      completedPoints: document.getElementById('completed-points-text'),
      
      modalGameOver: document.getElementById('modal-gameover'),
      finalScore: document.getElementById('final-score-val'),
      finalBestScore: document.getElementById('final-best-score-val'),
      finalWordsCount: document.getElementById('final-words-val'),
      
      modalStats: document.getElementById('modal-stats'),
      statsGamesPlayed: document.getElementById('stat-games-played'),
      statsWordsSolved: document.getElementById('stat-words-solved'),
      statsBestScore: document.getElementById('stat-best-score'),
      statsBestStreak: document.getElementById('stat-best-streak'),
      statsHistoryList: document.getElementById('stats-history-list'),

      modalSettings: document.getElementById('modal-settings'),
      toggleSound: document.getElementById('toggle-sound'),
      toggleMusic: document.getElementById('toggle-music'),
      toggleVibration: document.getElementById('toggle-vibration')
    };
  },

  /**
   * Cambia la pantalla activa con transición suave
   */
  showScreen(screenId) {
    this.elements.screens.forEach(screen => {
      screen.classList.remove('active');
    });
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
    }
  },

  /**
   * Muestra un modal overlay
   */
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  },

  /**
   * Oculta un modal overlay
   */
  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  },

  /**
   * Cierra todos los modales abiertos
   */
  closeAllModals() {
    this.elements.modals.forEach(m => m.classList.remove('active'));
  },

  /**
   * Actualiza el marcador de vidas y puntuación
   */
  updateHUD(lives, score, maxLives = 15) {
    if (this.elements.livesCount) {
      this.elements.livesCount.textContent = lives;
      const livesContainer = this.elements.livesCount.parentElement;
      if (lives <= 3) {
        livesContainer.classList.add('lives-low');
      } else {
        livesContainer.classList.remove('lives-low');
      }
    }
    if (this.elements.scoreValue) {
      this.elements.scoreValue.textContent = score;
    }
  },

  /**
   * Renderiza las fichas 3D de la palabra desordenada
   */
  renderScrambledLetters(scrambledString) {
    if (!this.elements.scrambledContainer) return;
    this.elements.scrambledContainer.innerHTML = '';

    scrambledString.split('').forEach((letter, index) => {
      const tile = document.createElement('div');
      tile.className = 'scrambled-tile';
      tile.textContent = letter;
      tile.dataset.index = index;
      this.elements.scrambledContainer.appendChild(tile);
    });
  },

  /**
   * Renderiza las casillas de respuesta parcial (subrayadas/ranuras)
   */
  renderTargetSlots(wordLength, currentLetters = [], currentIndex = 0) {
    if (!this.elements.targetSlotsContainer) return;
    this.elements.targetSlotsContainer.innerHTML = '';

    for (let i = 0; i < wordLength; i++) {
      const slot = document.createElement('div');
      slot.className = 'target-slot';

      if (i < currentLetters.length && currentLetters[i]) {
        slot.textContent = currentLetters[i];
        slot.classList.add('filled');
      } else if (i === currentIndex) {
        slot.classList.add('active');
      }

      this.elements.targetSlotsContainer.appendChild(slot);
    }
  },

  /**
   * Muestra mensaje de feedback visual (error o acierto)
   */
  showFeedback(message, type = 'error') {
    const banner = this.elements.feedbackBanner;
    if (!banner) return;

    banner.textContent = message;
    banner.className = 'feedback-banner';

    if (type === 'error') {
      banner.classList.add('show-error');
    } else {
      banner.classList.add('show-success');
    }

    clearTimeout(this._feedbackTimer);
    this._feedbackTimer = setTimeout(() => {
      banner.className = 'feedback-banner';
    }, 1800);
  },

  /**
   * Renderiza el teclado virtual QWERTY completo adaptado al español
   */
  renderKeyboard() {
    if (!this.elements.keyboardContainer) return;
    this.elements.keyboardContainer.innerHTML = '';

    const rows = [
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
      ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
    ];

    rows.forEach(rowKeys => {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'keyboard-row';

      rowKeys.forEach(key => {
        const keyBtn = document.createElement('button');
        keyBtn.type = 'button';
        keyBtn.className = 'key-btn';
        keyBtn.textContent = key;
        keyBtn.dataset.key = key;

        keyBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (window.GameEngine && window.GameEngine.handleInput) {
            window.GameEngine.handleInput(key);
          }
        });

        rowDiv.appendChild(keyBtn);
      });

      this.elements.keyboardContainer.appendChild(rowDiv);
    });
  },

  /**
   * Anima brevemente una tecla al ser pulsada
   */
  flashKey(key, type = 'correct') {
    const keyBtn = this.elements.keyboardContainer.querySelector(`[data-key="${key}"]`);
    if (keyBtn) {
      const flashClass = type === 'correct' ? 'key-correct' : 'key-wrong';
      keyBtn.classList.add(flashClass);
      setTimeout(() => {
        keyBtn.classList.remove(flashClass);
      }, 350);
    }
  },

  /**
   * Muestra el modal de palabra completada
   */
  showWordCompletedModal(word, pointsEarned) {
    if (this.elements.completedWord) {
      this.elements.completedWord.textContent = word;
    }
    if (this.elements.completedPoints) {
      this.elements.completedPoints.textContent = `+${pointsEarned} PUNTOS`;
    }
    this.showModal('modal-completed');
    Utils.startConfetti('confetti-canvas', 2000);
  },

  /**
   * Muestra el modal de Game Over con estadísticas de la partida
   */
  showGameOverModal(score, bestScore, wordsSolved) {
    if (this.elements.finalScore) {
      this.elements.finalScore.textContent = score;
    }
    if (this.elements.finalBestScore) {
      this.elements.finalBestScore.textContent = bestScore;
    }
    if (this.elements.finalWordsCount) {
      this.elements.finalWordsCount.textContent = wordsSolved;
    }
    this.showModal('modal-gameover');
  },

  /**
   * Carga y muestra los datos en el modal de estadísticas
   */
  populateStats() {
    const stats = Storage.getStats();
    const history = Storage.getHistory();

    if (this.elements.statsGamesPlayed) this.elements.statsGamesPlayed.textContent = stats.gamesPlayed;
    if (this.elements.statsWordsSolved) this.elements.statsWordsSolved.textContent = stats.wordsSolved;
    if (this.elements.statsBestScore) this.elements.statsBestScore.textContent = stats.bestScore;
    if (this.elements.statsBestStreak) this.elements.statsBestStreak.textContent = stats.bestStreak;

    if (this.elements.statsHistoryList) {
      this.elements.statsHistoryList.innerHTML = '';
      if (history.length === 0) {
        this.elements.statsHistoryList.innerHTML = '<div class="stat-item" style="justify-content:center;color:#94A3B8;">Sin partidas registradas</div>';
      } else {
        history.forEach(item => {
          const row = document.createElement('div');
          row.className = 'stat-item';
          row.innerHTML = `
            <div>
              <span style="font-weight:700;color:#FFF;">${item.difficulty.toUpperCase()}</span>
              <span style="font-size:0.75rem;color:#94A3B8;margin-left:6px;">${item.date}</span>
            </div>
            <div style="font-weight:800;color:#FFC107;">${item.score} pts (${item.words} pal.)</div>
          `;
          this.elements.statsHistoryList.appendChild(row);
        });
      }
    }
  },

  /**
   * Sincroniza los switches con los ajustes guardados
   */
  populateSettings() {
    const settings = Storage.getSettings();
    if (this.elements.toggleSound) this.elements.toggleSound.checked = settings.soundFx;
    if (this.elements.toggleMusic) this.elements.toggleMusic.checked = settings.music;
    if (this.elements.toggleVibration) this.elements.toggleVibration.checked = settings.vibration;
  }
};
