# Ordena Letras — V1.0

> **El reto de las palabras**  
> Aplicación móvil offline de agilidad mental y vocabulario en español.

---

## 📱 Descripción del Proyecto

**Ordena Letras** es un juego móvil donde el jugador debe reconstruir palabras mostradas con sus letras desordenadas, introduciendo las letras una por una en el orden correcto usando un teclado táctil.

Desarrollado bajo la arquitectura **HTML5 / CSS3 / JavaScript Modular**, diseñado para ejecutarse 100% offline y listo para ser empaquetado en Android mediante **MIT App Inventor (WebViewer)**.

---

## 🎨 Identidad Visual y Paleta

Basada estrictamente en la Guía Visual oficial (`OrdenaLetras_Guia_Visual_V1.png`):

| Elemento | Color | Hexadecimal |
|---|---|---|
| **Fondo Principal** | Azul Profundo | `#0D1B2A` |
| **Acciones / Primario** | Azul | `#2563EB` |
| **Puntos / CTA / Acentos** | Dorado / Amarillo | `#FFC107` |
| **Aciertos / Éxito** | Verde | `#22C55E` |
| **Errores / Peligro** | Rojo | `#EF4444` |
| **Texto y Fichas 3D** | Blanco | `#FFFFFF` |

---

## 🕹️ Mecánica y Reglas de Juego

1. **Vidas:** 15 vidas por partida (`INITIAL_LIVES = 15`).
2. **Puntuación:**
   - **+10 puntos** por cada letra correcta.
   - **+50 puntos** por completar la palabra.
   - **−5 puntos** por cada letra incorrecta.
3. **Manejo de Errores:**
   - Cada fallo resta 1 vida y 5 puntos.
   - Se activa un feedback visual rojo con animación de sacudida (*shake*).
   - **La posición actual permanece pendiente** (no se revela la letra correcta automáticamente).
4. **Recuperación de Vidas:** Regla configurable que otorga +1 vida cada 3 palabras consecutivas resueltas sin errores (hasta el tope de 15 vidas).
5. **Fin de Partida (Game Over):** Ocurre al llegar a 0 vidas, guardando récords, estadísticas e historial en almacenamiento local.

---

## 📂 Estructura del Proyecto

```text
OrdenaLetras/
│
├── index.html                   # Estructura principal y contenedor SPA móvil
├── README.md                    # Documentación y guía técnica
├── OrdenaLetras_SRS_V1.md       # Especificación de Requerimientos de Software
├── OrdenaLetras_Guia_Visual_V1.png # Referencia de diseño de pantallas
├── OrdenaLetras_logo_icono_oficial.jpg # Logo oficial del juego
│
├── css/
│   └── style.css                # Estilos, paleta, fichas 3D, responsive y animaciones
│
├── js/
│   ├── utils.js                 # Algoritmo Fisher-Yates, normalización, hápticos y confeti
│   ├── storage.js               # Persistencia local y puente con App Inventor (WebViewString)
│   ├── audio.js                 # Sintetizador Web Audio API autónomo offline (sin dependencias)
│   ├── words.js                 # Gestor de palabras con respaldo offline embebido
│   ├── ui.js                    # Renderizado de HUD, teclado virtual, modales y fichas
│   ├── game.js                  # Motor principal del juego y lógica de puntuación
│   └── main.js                  # Punto de entrada y gestión de eventos
│
├── data/
│   └── words.json               # Diccionario clasificado en fácil (5), media (6-7) y difícil (8+)
│
├── assets/
│   ├── images/                  # Iconos y logotipos locales
│   └── audio/                   # Recursos de sonido locales
│
└── test/
    └── test_runner.html         # Suite de pruebas unitarias de la lógica crítica
```

---

## 🚀 Instrucciones de Ejecución

### 1. Pruebas en Navegador PC (Chrome)
1. Abrir el archivo [index.html](file:///d:/OrdenaLetras/index.html) directamente en Google Chrome o mediante un servidor estático local (como Live Server).
2. Presionar `F12` y activar el modo emulador de dispositivo móvil (seleccionar resolución vertical como Pixel 7, iPhone 14 o Galaxy S20).
3. Se puede jugar tanto con clics táctiles en el teclado virtual como con el teclado físico del ordenador.

### 2. Integración en MIT App Inventor (Generación de APK)
1. Crear un nuevo proyecto en **MIT App Inventor**.
2. En la pantalla principal (`Screen1`), arrastrar un componente **WebViewer**.
3. Subir todos los archivos del proyecto (`index.html`, carpetas `css/`, `js/`, `data/`, `assets/`) a los medios (*Assets*) de App Inventor.
4. Establecer la propiedad `HomeURL` del WebViewer en `index.html`.
5. *(Opcional)* Habilitar comunicación bidireccional mediante `WebViewString` si se desea sincronizar datos con bloques de App Inventor.
6. Compilar el proyecto en **Build > Android App (.apk)** e instalarlo en cualquier dispositivo Android.
