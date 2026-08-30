/**
 * utils.js — Utilidades generales para OrdenaLetras
 * Funciones puras, sin dependencias externas.
 */

const Utils = (() => {

  /**
   * Baraja un array usando Fisher-Yates (garantiza permutación real).
   * Si el resultado es igual al original, vuelve a barajar.
   * @param {Array} arr
   * @returns {Array} Nueva copia barajada
   */
  function shuffle(arr) {
    const a = [...arr];
    let attempts = 0;
    do {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      attempts++;
    } while (arraysEqual(a, arr) && attempts < 20);
    return a;
  }

  /**
   * Compara dos arrays elemento a elemento.
   */
  function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  /**
   * Normaliza una cadena: mayúsculas, sin tildes, sin Ñ→N.
   * La guía visual indica que NO se usan tildes ni Ñ.
   */
  function normalize(str) {
    return str
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')  // elimina diacríticos
      .replace(/Ñ/g, 'N')
      .replace(/[^A-Z]/g, '');
  }

  /**
   * Valida el formato y reglas del nombre del jugador:
   * - Longitud: 3 a 10 caracteres
   * - Primer carácter: DEBE ser una letra (A-Z)
   * - Caracteres permitidos: Solo letras mayúsculas (A-Z), números (0-9) y guion medio (-)
   * @param {string} str
   * @returns {{valid: boolean, error?: string, sanitized: string}}
   */
  function validatePlayerName(str) {
    const raw = String(str || '').trim().toUpperCase();
    if (!raw || raw.length < 3) {
      return { valid: false, error: 'El nombre debe tener al menos 3 caracteres.', sanitized: raw };
    }
    if (raw.length > 10) {
      return { valid: false, error: 'El nombre no puede tener más de 10 caracteres.', sanitized: raw };
    }
    if (!/^[A-Z]/.test(raw)) {
      return { valid: false, error: 'El primer carácter debe ser una letra (A-Z).', sanitized: raw };
    }
    if (!/^[A-Z0-9-]+$/.test(raw)) {
      return { valid: false, error: 'Solo se permiten letras (A-Z), números (0-9) y guiones (-).', sanitized: raw };
    }
    return { valid: true, sanitized: raw };
  }

  /**
   * Clamp: restringe un valor entre min y max.
   */
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Elige un elemento aleatorio de un array.
   */
  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Formatea un número con separador de miles (punto).
   * Ejemplo: 1250 → "1.250"
   */
  function formatScore(n) {
    return n.toLocaleString('es-ES');
  }

  /**
   * Devuelve la fecha actual como string legible.
   * Ejemplo: "29/08/2026"
   */
  function todayString() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }

  /**
   * Genera un vibrado corto si la API lo permite.
   * @param {number} ms — duración en ms (por defecto 50)
   */
  function vibrate(ms = 50) {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(ms);
      }
    } catch (_) { /* silencioso */ }
  }

  /**
   * Espera n milisegundos (Promise).
   */
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Elimina todos los hijos de un elemento del DOM.
   */
  function clearElement(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  /**
   * Crea un elemento con clase y contenido de texto opcionales.
   */
  function createElement(tag, className = '', text = '') {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  }

  /**
   * Muestra/oculta un elemento según el booleano.
   */
  function setVisible(el, visible) {
    if (!el) return;
    el.style.display = visible ? '' : 'none';
  }

  /**
   * Añade una clase por un tiempo determinado y la quita.
   * Útil para animaciones one-shot.
   */
  function flashClass(el, className, durationMs = 500) {
    if (!el) return;
    el.classList.add(className);
    setTimeout(() => el.classList.remove(className), durationMs);
  }

  /**
   * Devuelve si dos strings son anagramas entre sí
   * (mismas letras, distinto orden).
   */
  function isAnagram(a, b) {
    const na = normalize(a).split('').sort().join('');
    const nb = normalize(b).split('').sort().join('');
    return na === nb;
  }

  /**
   * Deep clone de un objeto simple (sin funciones ni referencias circulares).
   */
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // API pública
  return {
    shuffle,
    arraysEqual,
    normalize,
    clamp,
    randomFrom,
    formatScore,
    todayString,
    vibrate,
    delay,
    clearElement,
    createElement,
    setVisible,
    flashClass,
    isAnagram,
    deepClone,
    validatePlayerName,
  };

})();
