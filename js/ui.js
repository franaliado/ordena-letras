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
        if (_screenHistory.length > 0) {
          _applyLocalBack();
        } else if (e.state && e.state.screenId && e.state.screenId !== _currentScreen) {
          showScreen(e.state.screenId, false);
        } else if (_currentScreen !== 'screen-menu' && _currentScreen !== 'screen-splash') {
          showScreen('screen-menu', false);
        }
      } finally {
        _isPopState = false;
      }
    });
  }

  function _onScreenShow(id) {
    switch (id) {
      case 'screen-records':
        renderRecords('top10');
        break;
      case 'screen-stats':
        renderStats();
        break;
      case 'screen-settings':
        renderSettings();
        break;
      case 'screen-player-name':
        // Rellenar con nombre actual si existe
        const input = document.getElementById('player-name-input');
        const name  = Storage.getPlayerName();
        if (input && name !== 'Jugador') input.value = name;
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

  function confirmPlayerName() {
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
    }

    const name = Storage.setPlayerName(validation.sanitized);
    showToast(`¡Hola, ${name}! 👋`);
    Game.launchAfterName();
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
    Utils.clearElement(container);
    for (let i = 0; i < maxLives; i++) {
      const heart = Utils.createElement('span', 'life-heart', '❤️');
      if (i >= lives) {
        heart.classList.add('lost');
        heart.textContent = '🖤';
      }
      container.appendChild(heart);
    }
  }

  function _renderScrambled(scrambled, progress, word) {
    const container = document.getElementById('scrambled-tiles');
    if (!container) return;
    Utils.clearElement(container);

    // Marcar letras ya usadas (coincidencia de posición con las correctas)
    // Para mostrar qué letras ya se colocaron en la respuesta
    const usedMap = _buildUsedMap(word, progress);

    scrambled.forEach((letter, i) => {
      const tile = Utils.createElement('div', 'letter-tile', letter);
      tile.dataset.index = i;
      // Si la letra ya fue colocada en una posición correspondiente, marcarla
      if (usedMap[i]) tile.classList.add('used');
      container.appendChild(tile);
    });
  }

  /**
   * Construye un mapa indicando qué índices del scrambled ya fueron "usados".
   * Hace un matching greedy letra por letra con las posiciones completadas.
   */
  function _buildUsedMap(word, progress) {
    const usedMap   = {};
    // Contadores de cuántas veces aparece cada letra en las posiciones completadas
    const needed    = {};
    for (let i = 0; i < progress.length; i++) {
      if (progress[i] !== null) {
        needed[progress[i]] = (needed[progress[i]] || 0) + 1;
      }
    }
    // Marcar en el scrambled
    const _scrambled = document.querySelectorAll('.letter-tile');
    const used       = { ...needed };
    _scrambled.forEach((_, i) => {
      // Se usa el parámetro de la función, no el DOM (al llamar esta función aún no existe el DOM)
    });

    // Implementación más simple: devolver objeto vacío, se maneja en renderScrambled
    // El marcado visual se hace tracking qué posiciones completadas existen
    const scrambledArr = Array.from(document.querySelectorAll('.letter-tile'));

    // Recuento de letras completadas
    const completedCount = {};
    for (const ch of progress) {
      if (ch !== null) completedCount[ch] = (completedCount[ch] || 0) + 1;
    }

    // Marcar tiles del scrambled que correspondan
    const localUsed = {};
    for (let idx = 0; idx < scrambledArr.length; idx++) {
      const ch = scrambledArr[idx].textContent;
      if (completedCount[ch] && (localUsed[ch] || 0) < completedCount[ch]) {
        usedMap[idx]   = true;
        localUsed[ch]  = (localUsed[ch] || 0) + 1;
      }
    }
    return usedMap;
  }

  function _renderAnswerSlots(word, progress, currentPos) {
    const container = document.getElementById('answer-slots');
    if (!container) return;
    Utils.clearElement(container);

    for (let i = 0; i < word.length; i++) {
      const slot = Utils.createElement('div', 'answer-slot');
      slot.id = `slot-${i}`;

      if (progress[i] !== null) {
        slot.textContent = progress[i];
        slot.classList.add('filled');
      } else if (i === currentPos) {
        slot.classList.add('current');
      }
      container.appendChild(slot);
    }
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
   */
  function onLetterWrong(letter, state) {
    // Flash rojo en el slot actual
    const slot = document.getElementById(`slot-${state.currentPosition}`);
    if (slot) Utils.flashClass(slot, 'error-flash', 500);

    // Feedback textual
    const fb = document.getElementById('game-feedback-text');
    if (fb) {
      fb.textContent = `❌ -5 puntos`;
      fb.className   = 'feedback-text show-error';
      setTimeout(() => { fb.className = 'feedback-text'; }, 1000);
    }

    // Efecto en la tecla
    const keyEl = document.querySelector(`.key[data-key="${letter}"]`);
    if (keyEl) Utils.flashClass(keyEl, 'key-error-flash', 400);

    // Puntos flotantes negativos
    _showFloatingPoints(`${Game.getConfig().POINTS_ERROR}`, slot, 'negative');

    // Actualizar HUD de puntos y vidas
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

  function showWordComplete(state, isPerfect, lifeGained, wordPoints) {
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
    if (pointsEl) pointsEl.textContent = `+${Utils.formatScore(wordPoints)} PUNTOS`;

    // Bonus de vida
    const lifeEl = document.getElementById('wc-life-bonus');
    if (lifeEl) {
      lifeEl.style.display = lifeGained > 0 ? 'flex' : 'none';
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

    // Si es el último nivel, cambiar el botón
    const btn = document.getElementById('btn-next-level');
    const isLast = state.level >= cfg.TOTAL_LEVELS;
    if (btn) btn.textContent = isLast ? '🏆 ¡JUEGO COMPLETO!' : 'SIGUIENTE NIVEL ➡️';

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
    const livesEl  = document.getElementById('go-lives');
    const recEl    = document.getElementById('go-new-record');

    if (scoreEl)  scoreEl.textContent  = Utils.formatScore(state.totalScore);
    if (bestEl)   bestEl.textContent   = Utils.formatScore(bestScore);
    if (levelEl)  levelEl.textContent  = state.level;
    if (wordsEl)  wordsEl.textContent  = state.totalWords;
    if (errorsEl) errorsEl.textContent = state.totalErrors;
    if (livesEl)  livesEl.textContent  = state.lives;

    if (recEl) {
      recEl.classList.toggle('hidden', !isNewRecord);
    }

    // Si es victoria, cambiar título
    const skull = document.querySelector('.game-over-skull');
    const goTitle = document.querySelector('.game-over-title');
    if (isVictory) {
      if (skull)   skull.textContent   = '🏆';
      if (goTitle) goTitle.textContent = '¡VICTORIA!';
      if (goTitle) goTitle.style.color = 'var(--color-gold)';
    } else {
      if (skull)   skull.textContent   = '💀';
      if (goTitle) goTitle.textContent = 'GAME OVER';
      if (goTitle) goTitle.style.color = '';
    }

    showScreen('screen-game-over');
    if (isVictory) _spawnParticles('toast-container');
  }

  // ══════════════════════════════════════════════════════════════════════
  // PANTALLA: RÉCORDS
  // ══════════════════════════════════════════════════════════════════════

  function renderRecords(tab) {
    const list = document.getElementById('records-list');
    if (!list) return;
    Utils.clearElement(list);

    const records    = Storage.getRecords();
    const playerName = Storage.getPlayerName();

    if (records.length === 0) {
      const empty = Utils.createElement('p', '', '¡Aún no hay récords! Sé el primero. 🎮');
      empty.style.cssText = 'color:var(--color-text-dim);text-align:center;padding:var(--gap-xl) 0;font-size:var(--fs-sm);';
      list.appendChild(empty);
      return;
    }

    records.forEach((rec, i) => {
      const item = Utils.createElement('div', 'record-item');
      const rank = i + 1;

      // Badge de posición
      const badge = Utils.createElement('div', `record-rank ${_rankClass(rank)}`, String(rank));
      item.appendChild(badge);

      const name  = Utils.createElement('span', 'record-name', rec.name || 'Jugador');
      const score = Utils.createElement('span', 'record-score', Utils.formatScore(rec.score));

      item.appendChild(name);
      item.appendChild(score);

      if (rec.name === playerName) item.classList.add('highlight');

      list.appendChild(item);
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

  function renderSettings() {
    const settings = Storage.getSettings();

    const tSound = document.getElementById('toggle-sounds');
    const tMusic = document.getElementById('toggle-music');
    const nameEl = document.getElementById('settings-name-display');

    if (tSound) tSound.checked = settings.soundsEnabled;
    if (tMusic) tMusic.checked = settings.musicEnabled;
    if (nameEl) nameEl.textContent = Storage.getPlayerName();
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
    const container = document.getElementById(containerId);
    if (!container) return;

    // Limpia partículas anteriores
    container.querySelectorAll('.particle').forEach(p => p.remove());

    const count = 30;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.cssText = `
        left: ${Math.random() * 100}%;
        top: ${-10 + Math.random() * 30}%;
        background: ${COLORS[Math.floor(Math.random() * COLORS.length)]};
        width: ${4 + Math.random() * 8}px;
        height: ${4 + Math.random() * 8}px;
        animation-delay: ${Math.random() * 0.8}s;
        animation-duration: ${1 + Math.random() * 1.5}s;
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      `;
      container.appendChild(p);

      // Limpiar después
      p.addEventListener('animationend', () => p.remove());
    }
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
    fp.style.transform = 'translateX(-50%)';

    document.body.appendChild(fp);
    fp.addEventListener('animationend', () => fp.remove());
  }

  // ══════════════════════════════════════════════════════════════════════
  // TOAST
  // ══════════════════════════════════════════════════════════════════════

  function showToast(msg, durationMs = 2000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = Utils.createElement('div', 'toast', msg);
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      toast.addEventListener('animationend', () => toast.remove());
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
    initHistory,
  };

})();
