# OrdenaLetras — El reto de las palabras

**Versión:** 1.0  
**Plataforma objetivo:** Android (APK via MIT App Inventor + WebViewer)  
**Lenguaje del juego:** Español (sin tildes ni Ñ en las palabras del diccionario)

---

## 📁 Estructura del proyecto

```
OrdenaLetras/
├── index.html              ← App completa (11 pantallas)
├── manifest.json           ← PWA manifest (icono, orientación, colores)
├── sw.js                   ← Service Worker (caché offline)
│
├── css/
│   └── style.css           ← Sistema de diseño completo
│
├── js/
│   ├── main.js             ← Bootstrap, splash, conexión de eventos
│   ├── game.js             ← Motor del juego y estado
│   ├── words.js            ← Selección y barajado de palabras
│   ├── storage.js          ← Persistencia (localStorage + puente App Inventor)
│   ├── audio.js            ← Motor de audio
│   ├── ui.js               ← Renderizado, animaciones, navegación
│   └── utils.js            ← Utilidades puras
│
├── data/
│   └── words.json          ← Diccionario JSON por longitud (4–10 letras)
│
├── assets/
│   ├── images/
│   │   └── icon.jpg        ← Icono oficial (solo favicon/PWA)
│   └── audio/
│       ├── correct.mp3     ← Sonido letra correcta
│       ├── wrong.mp3       ← Sonido letra incorrecta
│       ├── word_complete.mp3 ← Sonido palabra completada
│       ├── game_over.mp3   ← Sonido game over
│       ├── button.mp3      ← Sonido de botones
│       └── music_bg.mp3    ← Música de fondo (opcional)
│
└── README.md               ← Este archivo
```

---

## 🎮 Mecánica de juego

1. El sistema selecciona una palabra y baraja sus letras.
2. El jugador debe reconstruir la palabra **letra por letra** usando el teclado QWERTY.
3. **Letra correcta:** +10 puntos, se coloca en la posición.
4. **Letra incorrecta:** −5 puntos, −1 vida, la posición no avanza.
5. **Palabra completada:** +100 puntos.
6. **Palabra perfecta (sin errores):** +50 puntos bonus + ❤️ +1 vida.
7. Quedan **7 niveles**, **5 palabras por nivel**.
8. La partida termina cuando se agotan las **15 vidas iniciales**.

---

## ⚙️ Parámetros configurables (`game.js → CONFIG`)

| Parámetro | Valor V1 | Descripción |
|---|---|---|
| `INITIAL_LIVES` | 15 | Vidas al inicio de partida |
| `MAX_LIVES` | 15 | Máximo de vidas posibles |
| `WORDS_PER_LEVEL` | 5 | Palabras por nivel |
| `TOTAL_LEVELS` | 7 | Número total de niveles |
| `POINTS_PER_LETTER` | 10 | Puntos por letra correcta |
| `POINTS_PER_WORD` | 100 | Puntos por palabra completada |
| `POINTS_PERFECT_BONUS` | 50 | Bonus por palabra perfecta |
| `POINTS_ERROR` | -5 | Penalización por error |
| `LIFE_ON_PERFECT` | 1 | Vidas recuperadas en palabra perfecta |
| `MIN_SCORE` | 0 | La puntuación no baja de 0 |

---

## 🌐 Pruebas en Chrome (PC)

1. Abre Chrome y navega a la carpeta del proyecto.
2. **Recomendado:** usa un servidor local para evitar restricciones de `fetch`:
   - Con VS Code: instala la extensión **Live Server** y ábrela.
   - Con Node.js: `npx serve .` en la carpeta raíz.
3. Abre `http://localhost:PORT/` en Chrome.
4. Usa **F12 → Toggle Device Toolbar** para simular un móvil (360×640 recomendado).

### Teclado físico (PC)
- Letras `A-Z`: introducir letras directamente
- `Escape`: pausar
- `Enter`: continuar en pantallas de éxito

---

## 📱 Pruebas en navegador móvil

1. Conecta el PC y el móvil a la misma red WiFi.
2. Levanta un servidor local: `npx serve .`
3. Desde el móvil, navega a `http://IP_DEL_PC:PORT/`
4. Verifica:
   - Orientación vertical (portrait)
   - Teclado táctil funciona
   - Animaciones fluidas
   - Sin overflow horizontal
   - Botones cómodos para el dedo

---

## 🤖 Integración con MIT App Inventor

### Pasos

1. Abre [MIT App Inventor](https://ai2.appinventor.mit.edu/)
2. Crea un nuevo proyecto → añade un componente **WebViewer**
3. Configura `WebViewer.HomeUrl` como la URL de tu servidor local (durante desarrollo) o como ruta local si los archivos están en el dispositivo.
4. Para producción: sube todos los archivos a un servidor HTTPS o incluye los assets como archivos en el proyecto.
5. Genera el APK desde **Build → Android App (.apk)**

### Comunicación JS ↔ App Inventor

El módulo `storage.js` incluye un puente listo para usar:

```javascript
// En JavaScript → App Inventor
window.AppInventor.setWebViewString(JSON.stringify({ key, value }));

// En App Inventor → JavaScript
WebViewer.WebViewStringChange → eval("window.onAppInventorMessage('" + WebViewString + "')");
```

---

## 🔊 Sonidos

Los archivos de audio **deben colocarse** en `assets/audio/` con estos nombres exactos:

| Archivo | Evento |
|---|---|
| `correct.mp3` | Letra correcta |
| `wrong.mp3` | Letra incorrecta |
| `word_complete.mp3` | Palabra completada |
| `game_over.mp3` | Game Over |
| `button.mp3` | Pulsación de botones |
| `music_bg.mp3` | Música de fondo (loop) |

Si los archivos no existen, el juego funciona igual pero sin sonido.

---

## 📚 Diccionario (`data/words.json`)

El diccionario está organizado por longitud de palabra:

```json
{
  "4": ["amor", "casa", ...],
  "5": ["amigo", "campo", ...],
  "6": ["camino", "ciudad", ...],
  ...
  "10": [...]
}
```

- Todas las palabras están en **mayúsculas y sin tildes**.
- Para ampliar el diccionario: añade palabras a los arrays correspondientes.
- Para cambiar dificultades: modifica `LEVEL_LENGTHS` en `words.js`.

---

## 🏗️ Arquitectura

```
main.js         ← Orquestador (arranque, eventos)
    │
    ├── Audio   ← Sonidos y música
    ├── Storage ← Persistencia (localStorage)
    ├── Words   ← Diccionario y selección de palabras
    ├── Utils   ← Funciones puras
    │
    ├── Game    ← Estado y reglas del juego
    │       └── llama a → UI (renderizado)
    │
    └── UI      ← DOM, animaciones, navegación
```

Cada módulo es un IIFE independiente. No hay dependencias de frameworks externos.

---

## ✅ Criterios de aceptación V1

- [x] Funciona completamente sin Internet
- [x] Palabras válidas en español
- [x] Letras desordenadas ≠ orden original
- [x] +10 puntos por letra correcta
- [x] −5 puntos y −1 vida por error
- [x] Posición no avanza en error
- [x] No revela la letra correcta
- [x] +100 puntos al completar palabra
- [x] Game Over al agotar vidas (15)
- [x] Datos guardados en localStorage
- [x] Icono oficial solo en favicon/PWA
- [x] Diseño vertical (portrait)
- [x] Compatible con MIT App Inventor WebViewer
