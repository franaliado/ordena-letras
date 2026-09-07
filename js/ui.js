/**
 * ui.js — Capa de interfaz de usuario para OrdenaLetras
 *
 * Responsable de:
 *  - Navegación entre pantallas
 *  - Renderizado de todos los elementos del juego
 *  - Animaciones visuales (acierto, error, partículas)
 *  - Feedback de puntos flotantes
 *  - Modales (dificultad, ayuda, confirmación de reset)
 */

const UI = (() => {
  let _inputHandlersInitialized = false;

  // ── Historial de pantallas (para botón "Volver" y navegación nativa) ───────
  let _screenHistory = [];
  let _currentScreen = 'screen-splash';
  let _isPopState    = false;

  // ══════════════════════════════════════════════════════════════════════
  // NAVEGACIÓN DE PANTALLAS CON HISTORIAL NATIVO (history.pushState)
  // ══════════════════════════════════════════════════════════════════════

  function showScreen(id, addToHistory = true) {
    const prev = document.getElementById(_currentScreen);
    const next = document.getElementById(id);
    if (!next) return;

    if (prev && prev !== next) {
      prev.classList.remove('active');
    }
    next.classList.add('active');

    if (addToHistory && _currentScreen !== id) {
      _screenHistory.push(_currentScreen);
      if (!_isPopState) {
        try {
          history.pushState({ screenId: id }, '', '');
        } catch (e) {
          // Ignorar si el entorno bloquea pushState
        }
      }
    }
    _currentScreen = id;

    // Acciones al mostrar cada pantalla
    _onScreenShow(id);
  }

  function goBack() {
    Audio.playButton();
    if (_screenHistory.length > 0) {
      try {
        history.back();
      } catch (e) {
        _applyLocalBack();
      }
    } else {
      showScreen('screen-menu', false);
    }
  }

  function _applyLocalBack() {
    const prev = _screenHistory.pop();
    if (prev) {
      showScreen(prev, false);
    } else {
      showScreen('screen-menu', false);
    }
  }

  function initHistory() {
    // Estado inicial en el historial
    try {
      history.replaceState({ screenId: _currentScreen }, '', '');
    } catch (e) {}

    window.addEventListener('popstate', (e) => {
      _isPopState = true;
      try {
        // El botón físico de atrás del teléfono dispara popstate.
        // Navegamos siempre hacia atrás en nuestro historial interno
        // en lugar de dejar que el navegador/WebView cierre la app.
        if (_screenHistory.length > 0) {
          _applyLocalBack();
        } else if (_currentScreen !== 'screen-menu' && _currentScreen !== 'screen-splash') {
          // Si no hay historial interno, volver al menú
          showScreen('screen-menu', false);
        } else {
          // Ya estamos en el menú: empujar un estado vacuo para que el siguiente
          // pulsado no cierre la app (el usuario tendría que pulsar dos veces).
          try { history.pushState({ screenId: 'screen-menu' }, '', ''); } catch (_) {}
        }
      } finally {
        _isPopState = false;
      }
    });
  }

  function initInputHandlers() {
    if (_inputHandlersInitialized) return;
    _inputHandlersInitialized = true;

    // Virtual keyboard (buttons .key)
    const gameKeyboard = document.getElementById('game-keyboard');
    if (gameKeyboard) {
      gameKeyboard.addEventListener('pointerdown', function(e) {
        const btn = e.target.closest('.key');
        if (!btn) return;
        const key = btn.dataset.key;
        if (!key) return;
        e.preventDefault();
        if (key === 'BACKSPACE') return;
        Game.pressLetter(key);
      }, { passive: false });
    }

    // Physical keyboard
    document.addEventListener('keydown', function(e) {
      if (e.target.tagName === 'INPUT') return;
      const key = e.key.toUpperCase();

      if (e.key === 'Escape') {
        const state = Game.getState();
        if (state && state.isRunning && !state.isPaused) {
          UI.showPause();
          return;
        }
      }

      if (e.key === 'Enter') {
        const screen = document.querySelector('.screen.active');
        if (screen && screen.id === 'screen-word-complete') {
          Game.nextWord();
          return;
        }
        if (screen && screen.id === 'screen-level-complete') {
          Game.startNextLevel();
          return;
        }
      }

      if (/^[A-Z]$/.test(key)) {
        Game.pressLetter(key);
        const keyEl = document.querySelector(`.key[data-key="${key}"]`);
        if (keyEl) Utils.flashClass(keyEl, 'pressed', 200);
      }
    });

    // Name input handlers
    const nameInput = document.getElementById('player-name-input');
    if (nameInput) {
      nameInput.addEventListener('input', function() {
        const start = this.selectionStart;
        const end = this.selectionEnd;
        this.value = this.value.toUpperCase();
        if (start !== null && end !== null) this.setSelectionRange(start, end);
        Audio.playButton();
      });
      nameInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') UI.confirmPlayerName();
      });
    }

    // Gesture and touchmove handlers
    document.addEventListener('gesturestart', function(e) {
      e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchmove', function(e) {
      const scrollable = e.target.closest('.records-list, .help-card, .stats-history, #screen-records, #screen-stats, #screen-help, #screen-player-name');
      if (!scrollable) {
        if (e.cancelable) e.preventDefault();
      }
    }, { passive: false });
  }

function _onScreenShow(id) { // existing code unchanged
    switch (id) {
      case 'screen-records':
        renderRecords('top10');
        // Resetear tab activo visualmente
        const t10 = document.getElementById('tab-top10');
        const tp  = document.getElementById('tab-personal');
        if (t10) t10.classList.add('active');
        if (tp)  tp.classList.remove('active');
        break;
      case 'screen-stats':
        renderStats();
        break;
      case 'screen-settings':
        renderSettings();
        break;
      case 'screen-player-name':
        // Distinguir contexto: primer registro vs. cambio de nombre
        const isChanging = Storage.hasPlayerName();
        const titleEl = document.getElementById('player-name-title');
        const subEl   = document.getElementById('player-name-sub');
        const btnEl   = document.getElementById('btn-name-continue');
        const input   = document.getElementById('player-name-input');
        if (isChanging) {
          if (titleEl) titleEl.textContent = '✏️ CAMBIAR NOMBRE';
          if (subEl)   subEl.textContent   = 'Tu nuevo nombre (partidas anteriores conservan el nombre original)';
          if (btnEl)   btnEl.textContent   = 'GUARDAR NOMBRE';
          // Rellenar con nombre actual
          const name = Storage.getPlayerName();
          if (input && name !== 'Jugador') input.value = name;
        } else {
          if (titleEl) titleEl.textContent = '¿CÓMO TE LLAMAS?';
          if (subEl)   subEl.textContent   = 'Ingresa tu apodo para empezar';
          if (btnEl)   btnEl.textContent   = 'CONTINUAR';
          if (input)   input.value = '';
        }
        if (input) input.focus();
        break;
    }
  }

  function showDifficulty() {
    // Arranque directo en nivel 1
    Game.startGame();
  }

  function closeDifficulty(event) {
    const overlay = document.getElementById('difficulty-overlay');
    if (overlay) {
      overlay.classList.remove('open');
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // NOMBRE DEL JUGADOR
  // ══════════════════════════════════════════════════════════════════════

  async function confirmPlayerName() {
    Audio.playButton();
    const input = document.getElementById('player-name-input');
    const raw   = input ? input.value : '';
    const validation = Utils.validatePlayerName(raw);

    if (!validation.valid) {
      if (input) {
        input.classList.remove('input-error');
        void input.offsetWidth; // Forzar reflujo para reiniciar la animación shake
        input.classList.add('input-error');
        input.focus();
      }
      showToast(`⚠️ ${validation.error}`, 3000);
      Audio.playWrong();
      return;
    }

    if (input) {
      input.classList.remove('input-error');
      input.disabled = true;
    }

    const btn = document.getElementById('btn-name-continue');
    const prevBtnText = btn ? btn.textContent : '';
    if (btn) btn.textContent = 'VALIDANDO...';

    try {
      // Validación y registro de unicidad en Supabase
      if (typeof SupabaseClient !== 'undefined' && SupabaseClient.validateAndRegisterPlayer) {
        const res = await SupabaseClient.validateAndRegisterPlayer(validation.sanitized);
        if (!res.success) {
          if (input) {
            input.classList.add('input-error');
            input.disabled = false;
            input.focus();
          }
          if (btn) btn.textContent = prevBtnText;
          showToast(`❌ ${res.error || 'Nombre no disponible.'}`, 3500);
          Audio.playWrong();
          return;
        }
      }

      // Detectar contexto: ¿el jugador ya tenía nombre registrado?
      const wasRegistered = Storage.hasPlayerName();
      const name = Storage.setPlayerName(validation.sanitized);

      if (wasRegistered) {
        // Vino desde Ajustes → solo guardar y volver
        showToast(`✅ Nombre actualizado: ${name}`);
        goBack();
      } else {
        // Primer registro → lanzar el juego
        showToast(`¡Hola, ${name}! 👋`);
        Game.launchAfterName();
      }
    } finally {
      if (input) input.disabled = false;
      if (btn) btn.textContent = prevBtnText;
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // RENDERIZADO DEL TABLERO DE JUEGO
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Renderiza el estado completo del tablero:
   * letras desordenadas, slots de respuesta y vidas.
   */
  function renderGameBoard(state) {
    _renderHUD(state);
    _renderLives(state.lives, Game.getConfig().MAX_LIVES);
    _renderScrambled(state.scrambledLetters, state.answerProgress, state.currentWord);
    _renderAnswerSlots(state.currentWord, state.answerProgress, state.currentPosition);
    _clearFeedback();
  }

  function _renderHUD(state) {
    const el = {
      level:    document.getElementById('hud-level'),
      progress: document.getElementById('hud-progress'),
      points:   document.getElementById('hud-points'),
    };
    if (el.level)    el.level.textContent    = `${state.level}`;
    if (el.progress) el.progress.textContent = `${state.wordsInLevel}/${Game.getConfig().WORDS_PER_LEVEL}`;
    if (el.points)   el.points.textContent   = Utils.formatScore(state.totalScore);
  }

  function _renderLives(lives, maxLives) {
    const container = document.getElementById('game-lives-bar');
    if (!container) return;

    const existing = container.children;
    if (existing.length === maxLives) {
      for (let i = 0; i < maxLives; i++) {
        const heart = existing[i];
        if (i >= lives) {
          if (!heart.classList.contains('lost')) {
            heart.classList.add('lost');
            heart.textContent = '🖤';
          }
        } else {
          if (heart.classList.contains('lost')) {
            heart.classList.remove('lost');
            heart.textContent = '❤️';
          }
        }
      }
      return;
    }

    Utils.clearElement(container);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < maxLives; i++) {
      const heart = Utils.createElement('span', 'life-heart', i >= lives ? '🖤' : '❤️');
      if (i >= lives) heart.classList.add('lost');
      frag.appendChild(heart);
    }
    container.appendChild(frag);
  }

  function _renderScrambled(scrambled, progress, word) {
    const container = document.getElementById('scrambled-tiles');
    if (!container) return;
    Utils.clearElement(container);

    // Marcar letras ya usadas mediante cálculo puro en memoria (sin tocar el DOM)
    const usedMap = _buildUsedMap(scrambled, progress);
    const frag = document.createDocumentFragment();

    scrambled.forEach((letter, i) => {
      const tile = Utils.createElement('div', 'letter-tile', letter);
      tile.dataset.index = i;
      if (usedMap[i]) tile.classList.add('used');
      frag.appendChild(tile);
    });

    container.appendChild(frag);
  }

  /**
   * Construye un mapa en memoria indicando qué índices del scrambled ya fueron colocados.
   * Cálculo 100% puro en memoria sin lecturas forzadas del DOM.
   */
  function _buildUsedMap(scrambled, progress) {
    const needed = {};
    for (let i = 0; i < progress.length; i++) {
      const ch = progress[i];
      if (ch !== null) {
        needed[ch] = (needed[ch] || 0) + 1;
      }
    }
    const usedMap = {};
    for (let i = 0; i < scrambled.length; i++) {
      const ch = scrambled[i];
      if (needed[ch] && needed[ch] > 0) {
        usedMap[i] = true;
        needed[ch]--;
      }
    }
    return usedMap;
  }

  function _renderAnswerSlots(word, progress, currentPos) {
    const container = document.getElementById('answer-slots');
    if (!container) return;
    Utils.clearElement(container);

    const frag = document.createDocumentFragment();
    for (let i = 0; i < word.length; i++) {
      const slot = Utils.createElement('div', 'answer-slot');
      slot.id = `slot-${i}`;

      if (progress[i] !== null) {
        slot.textContent = progress[i];
        slot.classList.add('filled');
      } else if (i === currentPos) {
        slot.classList.add('current');
      }
      frag.appendChild(slot);
    }
    container.appendChild(frag);
  }

  function _clearFeedback() {
    const fb = document.getElementById('game-feedback-text');
    if (fb) {
      fb.className = 'feedback-text';
      fb.textContent = '';
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // CALLBACKS DEL MOTOR DE JUEGO
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Reacción visual a una letra correcta.
   */
  function onLetterCorrect(pos, letter, state) {
    // Animar slot
    const slot = document.getElementById(`slot-${pos}`);
    if (slot) {
      slot.textContent = letter;
      slot.classList.remove('current');
      slot.classList.add('filled');
    }

    // Activar siguiente slot
    const nextSlot = document.getElementById(`slot-${pos + 1}`);
    if (nextSlot) {
      nextSlot.classList.add('current');
    }

    // Actualizar HUD de puntos con bump
    const pointsEl = document.getElementById('hud-points');
    if (pointsEl) {
      pointsEl.textContent = Utils.formatScore(state.totalScore);
      Utils.flashClass(pointsEl, 'bump', 300);
    }

    // Puntos flotantes
    _showFloatingPoints(`+${Game.getConfig().POINTS_PER_LETTER}`, slot || document.getElementById('answer-slots'), 'positive');

    // Efecto en la tecla
    const keyEl = document.querySelector(`.key[data-key="${letter}"]`);
    if (keyEl) Utils.flashClass(keyEl, 'key-correct-flash', 300);

    // Actualizar tiles del scrambled (marcar la que "se usó")
    _updateScrambledUsed(state);
  }

  function _updateScrambledUsed(state) {
    const tiles = document.querySelectorAll('.scrambled-tiles .letter-tile');
    const completedCount = {};
    for (const ch of state.answerProgress) {
      if (ch !== null) completedCount[ch] = (completedCount[ch] || 0) + 1;
    }
    const localUsed = {};
    tiles.forEach(tile => {
      const ch = tile.textContent;
      const needed = completedCount[ch] || 0;
      const alreadyUsed = localUsed[ch] || 0;
      if (alreadyUsed < needed) {
        tile.classList.add('used');
        localUsed[ch] = alreadyUsed + 1;
      } else {
        tile.classList.remove('used');
      }
    });
  }

  /**
   * Reacción visual a una letra incorrecta.
   * @param {string} letter
   * @param {object} state
   */
  function onLetterWrong(letter, state) {
    // Flash rojo en el slot actual
    const slot = document.getElementById(`slot-${state.currentPosition}`);
    if (slot) Utils.flashClass(slot, 'error-flash', 500);

    // Feedback textual: -1 vida (sin restar puntos)
    const fb = document.getElementById('game-feedback-text');
    if (fb) {
      fb.textContent = '❌ -1 VIDA';
      fb.className   = 'feedback-text show-error';
      setTimeout(() => { fb.className = 'feedback-text'; }, 1200);
    }

    // Efecto en la tecla
    const keyEl = document.querySelector(`.key[data-key="${letter}"]`);
    if (keyEl) Utils.flashClass(keyEl, 'key-error-flash', 400);

    // Puntos flotantes: vida perdida
    _showFloatingPoints('-1 ❤️', slot, 'negative');

    // Actualizar HUD
    const pointsEl = document.getElementById('hud-points');
    if (pointsEl) pointsEl.textContent = Utils.formatScore(state.totalScore);

    _updateHeartLost(state.lives, Game.getConfig().MAX_LIVES);
  }

  function _updateHeartLost(lives, maxLives) {
    const container = document.getElementById('game-lives-bar');
    if (!container) return;
    const hearts = container.querySelectorAll('.life-heart');
    hearts.forEach((h, i) => {
      if (i >= lives) {
        h.textContent = '🖤';
        h.classList.add('lost');
        if (i === lives) Utils.flashClass(h, 'shake', 400);  // anima el último perdido
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // PANTALLA: PALABRA CORRECTA
  // ══════════════════════════════════════════════════════════════════════

  function showWordComplete(state, isPerfect, lifeGained, wordPoints, breakdown) {
    // Título
    const title = document.getElementById('wc-title');
    if (title) title.textContent = isPerfect ? '¡PERFECTO!' : '¡CORRECTO!';

    // Estrellas según errores
    const starsContainer = document.getElementById('wc-stars');
    if (starsContainer) {
      const starCount = isPerfect ? 3 : (state.wordErrors <= 2 ? 2 : 1);
      Utils.clearElement(starsContainer);
      for (let i = 0; i < 3; i++) {
        const star = Utils.createElement('span', 'star-icon', i < starCount ? '⭐' : '☆');
        starsContainer.appendChild(star);
      }
    }

    // Tiles de la palabra correcta
    const tilesContainer = document.getElementById('wc-word-tiles');
    if (tilesContainer) {
      Utils.clearElement(tilesContainer);
      state.currentWord.split('').forEach(ch => {
        const tile = Utils.createElement('div', 'correct-tile', ch);
        tilesContainer.appendChild(tile);
      });
    }

    // Puntos
    const pointsEl = document.getElementById('wc-points');
    if (pointsEl) {
      const pts = breakdown && breakdown.baseWordPoints ? breakdown.baseWordPoints : wordPoints;
      pointsEl.textContent = `+${Utils.formatScore(pts)} PUNTOS`;
    }

    // Bonus de vida
    const lifeEl = document.getElementById('wc-life-bonus');
    if (lifeEl) {
      if (lifeGained > 0) {
        lifeEl.textContent = '❤️ +1 VIDA';
        lifeEl.style.display = 'flex';
      } else if (breakdown && breakdown.isEligibleForLife && state.lives >= Game.getConfig().MAX_LIVES) {
        lifeEl.textContent = '❤️ VIDAS AL MÁXIMO (15)';
        lifeEl.style.display = 'flex';
      } else {
        lifeEl.style.display = 'none';
      }
    }

    showScreen('screen-word-complete');
    _spawnParticles('particle-container-wc');
  }

  // ══════════════════════════════════════════════════════════════════════
  // PANTALLA: NIVEL COMPLETADO
  // ══════════════════════════════════════════════════════════════════════

  function showLevelComplete(state) {
    const cfg = Game.getConfig();

    const lvlEl  = document.getElementById('lc-level');
    const ptsEl  = document.getElementById('lc-points-earned');
    const totEl  = document.getElementById('lc-points-total');
    const wrdEl  = document.getElementById('lc-words');
    const errEl  = document.getElementById('lc-errors');
    const hrtEl  = document.getElementById('lc-hearts');

    if (lvlEl)  lvlEl.textContent  = `NIVEL ${state.level}`;
    if (ptsEl)  ptsEl.textContent  = Utils.formatScore(state.levelPointsEarned);
    if (totEl)  totEl.textContent  = Utils.formatScore(state.totalScore);
    if (wrdEl)  wrdEl.textContent  = `${state.wordsInLevel}/${cfg.WORDS_PER_LEVEL}`;
    if (errEl)  errEl.textContent  = state.totalErrors;

    // Corazones
    if (hrtEl) {
      Utils.clearElement(hrtEl);
      for (let i = 0; i < cfg.MAX_LIVES; i++) {
        const h = Utils.createElement('span', 'life-heart', i < state.lives ? '❤️' : '🖤');
        if (i >= state.lives) h.classList.add('lost');
        hrtEl.appendChild(h);
      }
    }

    const btn = document.getElementById('btn-next-level');
    if (btn) btn.textContent = 'SIGUIENTE NIVEL ➡️';

    showScreen('screen-level-complete');
    _spawnParticles('particle-container-lc');
  }

  // ══════════════════════════════════════════════════════════════════════
  // PANTALLA: PAUSA
  // ══════════════════════════════════════════════════════════════════════

  function showPause() {
    Game.pause();
    // Sincronizar iconos
    const sIcon = document.getElementById('pause-sound-icon');
    const mIcon = document.getElementById('pause-music-icon');
    if (sIcon) sIcon.textContent = Audio.isSoundsOn() ? '🔊' : '🔇';
    if (mIcon) mIcon.textContent = Audio.isMusicOn()  ? '🎵' : '🔕';
    showScreen('screen-pause');
  }

  // ══════════════════════════════════════════════════════════════════════
  // PANTALLA: GAME OVER
  // ══════════════════════════════════════════════════════════════════════

  function showGameOver(state, isNewRecord, isVictory) {
    const bestScore = Storage.getBestScore();

    const scoreEl  = document.getElementById('go-score');
    const bestEl   = document.getElementById('go-best');
    const levelEl  = document.getElementById('go-level');
    const wordsEl  = document.getElementById('go-words');
    const errorsEl = document.getElementById('go-errors');
    const recEl    = document.getElementById('go-new-record');

    if (scoreEl)  scoreEl.textContent  = Utils.formatScore(state.totalScore);
    if (bestEl)   bestEl.textContent   = Utils.formatScore(bestScore);
    if (levelEl)  levelEl.textContent  = state.level;
    if (wordsEl)  wordsEl.textContent  = state.totalWords;
    if (errorsEl) errorsEl.textContent = state.totalErrors;

    if (recEl) {
      recEl.classList.toggle('hidden', !isNewRecord);
    }

    const iconEl = document.getElementById('go-icon') || document.querySelector('.game-over-icon') || document.querySelector('.game-over-skull');
    const goTitle = document.getElementById('go-title') || document.querySelector('.game-over-title');

    if (isVictory) {
      if (iconEl)  iconEl.textContent  = '🏆';
      if (goTitle) {
        goTitle.textContent = '¡VICTORIA!';
        goTitle.style.color = 'var(--color-gold)';
      }
    } else if (isNewRecord) {
      if (iconEl)  iconEl.textContent  = '🏆';
      if (goTitle) {
        goTitle.textContent = '¡NUEVO RÉCORD!';
        goTitle.style.color = 'var(--color-gold)';
      }
    } else {
      if (iconEl)  iconEl.textContent  = '🎉';
      if (goTitle) {
        goTitle.textContent = 'PARTIDA FINALIZADA';
        goTitle.style.color = '';
      }
    }

    showScreen('screen-game-over');
    if (isVictory || isNewRecord) _spawnParticles('toast-container');
  }

  // ══════════════════════════════════════════════════════════════════════
  // PANTALLA: RÉCORDS (Conexión Supabase para TOP 10 Global)
  // ══════════════════════════════════════════════════════════════════════

  async function renderRecords(tab) {
    const list = document.getElementById('records-list');
    if (!list) return;
    Utils.clearElement(list);

    const playerName = Storage.getPlayerName();

    if (tab === 'personal') {
      const records = Storage.getPersonalRecords(playerName);
      const uniqueRecords = _deduplicatePersonalRecords(records);
      if (uniqueRecords.length === 0) {
        const empty = Utils.createElement('p', '', '¡Aún no tienes puntuaciones. ¡Juega tu primera partida! 🎮');
        empty.style.cssText = 'color:var(--color-text-dim);text-align:center;padding:var(--gap-xl) 0;font-size:var(--fs-sm);';
        list.appendChild(empty);
        return;
      }
      _renderRecordsList(uniqueRecords, list, playerName);
      return;
    }

    // Pestaña TOP 10 (Ranking Global Supabase / Local)
    const loadingEl = Utils.createElement('p', '', 'Cargando ranking global... 🌐');
    loadingEl.style.cssText = 'color:var(--color-text-dim);text-align:center;padding:var(--gap-lg) 0;font-size:var(--fs-sm);';
    list.appendChild(loadingEl);

    let globalRecords = null;
    if (typeof SupabaseClient !== 'undefined' && SupabaseClient.fetchTop10Leaderboard) {
      const res = await SupabaseClient.fetchTop10Leaderboard(50);
      if (res.success && res.data && res.data.length > 0) {
        globalRecords = _getTop10UniquePlayers(res.data);
      }
    }

    Utils.clearElement(list);

    if (globalRecords && globalRecords.length > 0) {
      _renderRecordsList(globalRecords, list, playerName);
    } else {
      // Fallback a récords locales si Supabase está offline
      const localRecords = _getTop10UniquePlayers(Storage.getRecords());
      if (localRecords.length === 0) {
        const empty = Utils.createElement('p', '', '¡Aún no hay récords! Sé el primero. 🎮');
        empty.style.cssText = 'color:var(--color-text-dim);text-align:center;padding:var(--gap-xl) 0;font-size:var(--fs-sm);';
        list.appendChild(empty);
      } else {
        _renderRecordsList(localRecords, list, playerName);
      }
    }
  }

  /**
   * TOP 10: Única aparición por jugador.
   * Filtra registros para que cada jugador aparezca una sola vez,
   * reflejando estrictamente su puntuación máxima histórica y descartando las menores.
   */
  function _getTop10UniquePlayers(records) {
    if (!Array.isArray(records)) return [];
    // Ordenar de mayor a menor puntuación por seguridad
    const sorted = [...records].sort((a, b) => (b.score || 0) - (a.score || 0));
    const seenPlayers = new Set();
    const topUnique = [];

    for (const rec of sorted) {
      const nameKey = (rec.name || 'Jugador').trim().toLowerCase();
      if (!seenPlayers.has(nameKey)) {
        seenPlayers.add(nameKey);
        topUnique.push(rec);
        if (topUnique.length === 10) break;
      }
    }
    return topUnique;
  }

  /**
   * PERSONAL: Historial del usuario limpio sin puntuaciones idénticas duplicadas innecesarias.
   * Si existen puntuaciones idénticas repetidas, se agrupan/deduplican.
   */
  function _deduplicatePersonalRecords(records) {
    if (!Array.isArray(records)) return [];
    const sorted = [...records].sort((a, b) => (b.score || 0) - (a.score || 0));
    const seenScores = new Set();
    const unique = [];

    for (const rec of sorted) {
      const scoreKey = rec.score || 0;
      if (!seenScores.has(scoreKey)) {
        seenScores.add(scoreKey);
        unique.push(rec);
      }
    }
    return unique;
  }

  function _renderRecordsList(records, container, currentPlayerName) {
    records.forEach((rec, i) => {
      const item = Utils.createElement('div', 'record-item');
      const rank = i + 1;

      // Columna izquierda: posición + nombre del jugador
      const leftCol = Utils.createElement('div', 'record-left');
      const badge = Utils.createElement('div', `record-rank ${_rankClass(rank)}`, String(rank));
      leftCol.appendChild(badge);

      const name = Utils.createElement('span', 'record-name', rec.name || 'Jugador');
      leftCol.appendChild(name);

      if (rec.name === currentPlayerName) {
        const youTag = Utils.createElement('span', 'record-you-tag', 'TÚ');
        leftCol.appendChild(youTag);
        item.classList.add('highlight');
      }

      // Columna derecha: puntuación numérica
      const rightCol = Utils.createElement('div', 'record-right');
      const score = Utils.createElement('span', 'record-score', Utils.formatScore(rec.score));
      const ptsLabel = Utils.createElement('span', 'record-pts-label', 'PTS');
      rightCol.appendChild(score);
      rightCol.appendChild(ptsLabel);

      item.appendChild(leftCol);
      item.appendChild(rightCol);

      container.appendChild(item);
    });
  }

  function _rankClass(rank) {
    if (rank === 1) return 'gold';
    if (rank === 2) return 'silver';
    if (rank === 3) return 'bronze';
    return 'normal';
  }

  function switchRecordsTab(tab) {
    document.getElementById('tab-top10')  .classList.toggle('active', tab === 'top10');
    document.getElementById('tab-personal').classList.toggle('active', tab === 'personal');
    renderRecords(tab);
    Audio.playButton();
  }

  function highlightMyPosition() {
    const playerName = Storage.getPlayerName();
    const items = document.querySelectorAll('.record-item');
    items.forEach(item => {
      const nameEl = item.querySelector('.record-name');
      if (nameEl && nameEl.textContent === playerName) {
        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        Utils.flashClass(item, 'highlight', 1500);
      }
    });
    Audio.playButton();
  }

  // ══════════════════════════════════════════════════════════════════════
  // PANTALLA: ESTADÍSTICAS
  // ══════════════════════════════════════════════════════════════════════

  function renderStats() {
    const stats = Storage.getStats();

    const els = {
      games:  document.getElementById('stat-games'),
      words:  document.getElementById('stat-words'),
      best:   document.getElementById('stat-best'),
      errors: document.getElementById('stat-errors'),
    };

    if (els.games)  els.games.textContent  = stats.gamesPlayed;
    if (els.words)  els.words.textContent  = stats.wordsCompleted;
    if (els.best)   els.best.textContent   = Utils.formatScore(stats.bestScore);
    if (els.errors) els.errors.textContent = stats.totalErrors;

    // Historial
    const historyContainer = document.getElementById('stats-history');
    if (!historyContainer) return;
    Utils.clearElement(historyContainer);

    const history = Storage.getHistory().slice(0, 10);
    if (history.length === 0) {
      const empty = Utils.createElement('p', '', 'Aún no hay partidas registradas');
      empty.style.cssText = 'color:var(--color-text-dim);font-size:var(--fs-sm);text-align:center;padding:var(--gap-md) 0;';
      historyContainer.appendChild(empty);
      return;
    }

    history.forEach(entry => {
      const item = Utils.createElement('div', 'history-item');
      const diffMap = { easy: 'Fácil', medium: 'Media', hard: 'Difícil' };
      const diffClass = entry.difficulty || 'easy';

      item.innerHTML = `
        <span class="history-date">${entry.date || ''}</span>
        <span class="history-difficulty ${diffClass}">${diffMap[diffClass] || diffClass}</span>
        <span class="history-score">${Utils.formatScore(entry.score)}</span>
      `;
      historyContainer.appendChild(item);
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // PANTALLA: AJUSTES
  // ══════════════════════════════════════════════════════════════════════

  function renderSettings() { // existing code unchanged
    const settings = Storage.getSettings();

    const tSound  = document.getElementById('toggle-sounds');
    const tMusic  = document.getElementById('toggle-music');
    const nameEl  = document.getElementById('settings-name-display');
    const btnName = document.getElementById('btn-change-name');

    if (tSound) tSound.checked = settings.soundsEnabled;
    if (tMusic) tMusic.checked = settings.musicEnabled;

    const hasName = Storage.hasPlayerName();
    const playerName = Storage.getPlayerName();

    if (nameEl) {
      if (hasName) {
        nameEl.textContent = playerName;
        nameEl.style.color = 'var(--color-white)';
        nameEl.style.fontStyle = 'normal';
      } else {
        nameEl.textContent = 'Sin registrar';
        nameEl.style.color = 'var(--color-text-dim)';
        nameEl.style.fontStyle = 'italic';
      }
    }

    if (btnName) {
      if (hasName) {
        btnName.textContent = '✏️ CAMBIAR NOMBRE';
      } else {
        btnName.textContent = '➕ AGREGAR NOMBRE';
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // RESET DE DATOS
  // ══════════════════════════════════════════════════════════════════════

  function confirmResetData() {
    // Modal nativo — simple y compatible con WebViewer
    if (window.confirm('¿Seguro? Se eliminarán todos los récords y estadísticas.')) {
      Storage.resetAll();
      renderSettings();
      showToast('✅ Datos restablecidos');
      Audio.playButton();
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // AYUDA
  // ══════════════════════════════════════════════════════════════════════

  function showHelp() {
    Audio.playButton();
    showScreen('screen-help');
  }

  // ══════════════════════════════════════════════════════════════════════
  // PARTÍCULAS DE CELEBRACIÓN
  // ══════════════════════════════════════════════════════════════════════

  const COLORS = ['#FFB703','#22C55E','#EF4444','#3B82F6','#FF7A00','#FFFFFF'];

  function _spawnParticles(containerId) {
    // Ignoramos containerId — creamos un overlay temporal directo en body
    // para escapar del contexto "contain: layout" de .screen, que impide
    // que position:fixed de los hijos funcione respecto al viewport real.
    const overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'width:100%',
      'height:100%',
      'pointer-events:none',
      'z-index:9999',
      'overflow:hidden',
    ].join(';');

    const frag = document.createDocumentFragment();
    const count = 28;

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');

      // Posición horizontal: distribuida uniformemente (0–100%)
      const leftPct = Math.random() * 100;
      const delay   = Math.random() * 0.7;
      const dur     = 1.0 + Math.random() * 1.2;
      const size    = 5 + Math.random() * 7;
      const color   = COLORS[Math.floor(Math.random() * COLORS.length)];
      const isCircle = Math.random() > 0.5;
      // Deriva horizontal durante la caída (–30px a +30px)
      const drift = Math.round((Math.random() - 0.5) * 60);

      p.style.cssText = [
        `position:absolute`,
        `top:-15px`,
        `left:${leftPct}%`,
        `width:${size}px`,
        `height:${size}px`,
        `background:${color}`,
        `border-radius:${isCircle ? '50%' : '2px'}`,
        `will-change:transform,opacity`,
        `animation-name:particleFall`,
        `animation-timing-function:ease-in`,
        `animation-fill-mode:forwards`,
        `animation-delay:${delay}s`,
        `animation-duration:${dur}s`,
        `--drift:${drift}px`,
      ].join(';');

      p.addEventListener('animationend', () => p.remove(), { once: true });
      frag.appendChild(p);
    }

    overlay.appendChild(frag);
    document.body.appendChild(overlay);

    // Limpieza de seguridad: elimina el overlay completo tras la animación más larga
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 2500);
  }

  // ══════════════════════════════════════════════════════════════════════
  // PUNTOS FLOTANTES
  // ══════════════════════════════════════════════════════════════════════

  function _showFloatingPoints(text, refEl, type) {
    const fp = document.createElement('div');
    fp.className = `floating-points ${type}`;
    fp.textContent = text;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    if (refEl) {
      const rect = refEl.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top;
    }

    fp.style.left = `${x}px`;
    fp.style.top  = `${y}px`;

    document.body.appendChild(fp);
    fp.addEventListener('animationend', () => fp.remove(), { once: true });

    // Limpieza de seguridad
    setTimeout(() => {
      if (fp.parentNode) fp.parentNode.removeChild(fp);
    }, 1500);
  }

  // ══════════════════════════════════════════════════════════════════════
  // TOAST
  // ══════════════════════════════════════════════════════════════════════

  function showToast(msg, durationMs = 2000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Limitar a máximo 3 toasts simultáneos para no saturar el DOM
    const existing = container.querySelectorAll('.toast');
    if (existing.length >= 3) existing[0].remove();

    const toast = Utils.createElement('div', 'toast', msg);
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, durationMs);
  }

  // ── API pública ────────────────────────────────────────────────────────────
  return {
    showScreen,
    goBack,
    showDifficulty,
    closeDifficulty,
    confirmPlayerName,
    renderGameBoard,
    onLetterCorrect,
    onLetterWrong,
    showWordComplete,
    showLevelComplete,
    showPause,
    showGameOver,
    renderRecords,
    switchRecordsTab,
    highlightMyPosition,
    renderStats,
    renderSettings,
    confirmResetData,
    showHelp,
    showToast,
    initInputHandlers,
    initHistory  };

})();
