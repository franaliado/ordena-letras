/**
 * Ordena Letras — V1.0
 * Módulo de Utilidades (js/utils.js)
 */

const Utils = {
  /**
   * Normaliza un texto eliminando tildes y diacríticos si es necesario,
   * manteniendo la Ñ en mayúsculas.
   */
  normalizeText(text) {
    if (!text) return '';
    return text
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u0302\u0304-\u036f]/g, '') // Elimina acentos pero preserva la virgulilla de la Ñ (\u0303)
      .trim();
  },

  /**
   * Mezcla las letras de una palabra asegurando que el resultado
   * no sea idéntico a la palabra original (salvo que tenga 1 letra).
   */
  scrambleWord(word) {
    if (!word || word.length <= 1) return word;
    const original = word.toUpperCase();
    let letters = original.split('');
    let attempts = 0;
    
    // Algoritmo Fisher-Yates con reintentos para evitar que quede igual
    do {
      for (let i = letters.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [letters[i], letters[j]] = [letters[j], letters[i]];
      }
      attempts++;
    } while (letters.join('') === original && attempts < 25);

    // Si aún coincide (ej: palabra con muchas letras iguales), forzar un intercambio
    if (letters.join('') === original && letters.length > 1) {
      [letters[0], letters[letters.length - 1]] = [letters[letters.length - 1], letters[0]];
    }

    return letters.join('');
  },

  /**
   * Vibración háptica en dispositivos móviles compatibles
   */
  vibrate(pattern = 40) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Ignorar si el navegador bloquea vibración
      }
    }
  },

  /**
   * Sistema ligero de confeti para celebraciones en canvas
   */
  startConfetti(canvasId = 'confetti-canvas', durationMs = 2500) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;

    const colors = ['#FFC107', '#2563EB', '#22C55E', '#EF4444', '#FFFFFF', '#F59E0B'];
    const particleCount = 60;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: canvas.width * 0.5 + (Math.random() - 0.5) * 40,
        y: canvas.height * 0.4 + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * -8 - 4,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    let animationFrameId;
    const startTime = Date.now();

    function render() {
      const elapsed = Date.now() - startTime;
      if (elapsed > durationMs) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        cancelAnimationFrame(animationFrameId);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // Gravedad
        p.rotation += p.rotSpeed;
        p.opacity = Math.max(0, 1 - elapsed / durationMs);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    }

    render();
  }
};
