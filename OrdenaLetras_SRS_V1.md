# ESPECIFICACIÓN DE REQUERIMIENTOS DE SOFTWARE
# ORDENА LETRAS — V1.0

**Camino A:** Antigravity + HTML5/CSS3/JavaScript + MIT App Inventor (WebViewer)  
**Producto final:** Aplicación móvil Android  
**Versión web:** únicamente entorno de desarrollo y pruebas

---

## 1. Resumen ejecutivo

Ordena Letras es un juego móvil de palabras en español. El jugador debe reconstruir una palabra mostrada con sus letras desordenadas, introduciendo las letras una por una en el orden correcto.

La aplicación será siempre un **producto móvil**. El navegador de PC se utilizará como entorno de desarrollo y pruebas, no como producto web objetivo.

---

## 2. Objetivo

- Crear un juego entretenido, educativo y adictivo que ponga a prueba la ortografía y la agilidad mental.
- Ofrecer una experiencia visualmente atractiva y moderna, basada en la identidad del logo suministrado.
- Funcionar sin conexión a Internet en la versión móvil final.
- Permitir diferentes dificultades, puntuación, vidas, récords, estadísticas e historial.

---

## 3. Alcance y fuera de alcance

### Incluye

- Juego principal.
- Selección de dificultad.
- Vidas.
- Puntuación.
- Sonidos y efectos.
- Animaciones.
- Persistencia local.
- Estadísticas e historial.
- Ajustes.
- Recursos locales.
- Preparación para empaquetado Android mediante WebView.

### No incluye en V1

- Página web pública.
- Cuentas de usuario.
- Ranking mundial.
- Duelos.
- Partidas online.
- Torneos.
- Monetización.
- Dependencia de servicios de IA.
- Backend obligatorio.

---

## 4. Plataforma y arquitectura

### Arquitectura oficial

**Antigravity → HTML5 + CSS3 + JavaScript puro → juego terminado → MIT App Inventor + WebViewer → APK Android**

Antigravity debe desarrollar el **100% del juego** como aplicación web móvil offline.

MIT App Inventor se utilizará posteriormente como contenedor Android mediante WebViewer y para generar el APK.

### Tecnologías

- HTML5.
- CSS3.
- JavaScript.
- JSON para el diccionario.
- `localStorage` para persistencia durante las pruebas web.
- WebViewer para el empaquetado Android.
- WebViewString cuando sea necesaria comunicación entre JavaScript y App Inventor.

### Restricciones

No utilizar:

- Flutter.
- Dart.
- React.
- Vue.
- Angular.
- Unity.
- Frameworks innecesarios.
- CDN.
- Fuentes remotas.
- APIs externas necesarias para jugar.

Todos los recursos deben ser locales y funcionar sin Internet.

---

## 5. Público y orientación

### Público objetivo

Aproximadamente desde **8 años hasta adultos mayores**.

### Orientación

**Vertical / Portrait.**

La interfaz debe estar diseñada prioritariamente para teléfonos móviles y ser cómoda mediante interacción táctil.

---

## 6. Identidad visual

### Marca

**Nombre:** Ordena Letras  
**Eslogan:** El reto de las palabras

### Logo e icono

Utilizar **exactamente el logo/icono proporcionado por el usuario** como referencia oficial de identidad.

No diseñar ni sustituir el logo por otro.

### Estilo

- Arcade + Puzzle.
- Moderno.
- Colorido.
- Divertido.
- Atractivo.
- Con sensación de videojuego.
- Ligeramente 3D.
- No infantil.

### Paleta

| Uso | Color | Hex |
|---|---|---|
| Azul profundo | Fondo principal | `#0D1B2A` |
| Azul | Acciones/elementos principales | `#2563EB` |
| Dorado/amarillo | Puntos, CTA, acentos | `#FFC107` |
| Verde | Éxito/acierto | `#22C55E` |
| Rojo | Error/peligro | `#EF4444` |
| Blanco | Texto y fondos de tarjetas | `#FFFFFF` |

### Tipografía

- **Poppins ExtraBold/SemiBold:** títulos y encabezados.
- **Poppins Regular:** cuerpo e información.
- Mantener alta legibilidad en pantallas pequeñas.

### Lenguaje visual

Utilizar:

- Sombras suaves.
- Tarjetas redondeadas.
- Botones grandes.
- Iconos grandes.
- Alto contraste.
- Elementos visuales tipo juego.
- Animaciones breves.
- Feedback visual inmediato.

---

## 7. Mecánica de juego

1. El sistema selecciona una palabra válida.
2. La palabra se presenta con sus letras desordenadas.
3. El jugador debe reconstruirla letra por letra.
4. Se utiliza un teclado QWERTY completo.
5. El jugador puede pulsar cualquier letra.
6. Si la letra coincide con la siguiente letra esperada:
   - Se coloca en la posición correspondiente.
   - Se avanza a la siguiente posición.
7. Si la letra es incorrecta:
   - Se pierde 1 vida.
   - Se restan 5 puntos.
   - Se muestra feedback visual rojo breve.
   - La posición actual permanece sin completar.
   - El jugador debe intentarlo nuevamente.
8. El juego **NO debe revelar automáticamente la letra correcta**.
9. Cuando se completa la palabra:
   - Se muestra una celebración breve.
   - Se contabilizan los puntos.
   - Se pasa a la siguiente palabra.
10. Cuando se agotan las vidas:
   - Se termina la partida.
   - Se muestra Game Over.
   - Se presentan los resultados.

---

## 8. Vidas

La V1 utilizará:

**15 vidas por partida.**

La cantidad de vidas debe mantenerse como un parámetro configurable y no estar hard-coded dentro de los componentes de interfaz.

### Recuperación de vida

La aplicación contempla recuperación de vida según la lógica de juego definida para la partida.

La regla concreta de recuperación debe estar encapsulada en una función/configuración independiente para que pueda modificarse sin rediseñar la interfaz.

---

## 9. Dificultad

| Nivel | Longitud | Descripción |
|---|---:|---|
| Fácil | 5 letras | Palabras cortas y comunes |
| Media | 6–7 letras | Palabras de longitud media |
| Difícil | 8+ letras | Palabras largas |

La dificultad controla:

- Longitud de las palabras.
- Selección del diccionario.
- Cantidad de puntos obtenidos cuando corresponda.

---

## 10. Puntuación

### Base

**+10 puntos por cada letra correcta.**

### Bono

**+50 puntos por completar una palabra.**

### Error

**−5 puntos por letra incorrecta.**

### Vidas restantes

El sistema debe permitir incorporar bonos relacionados con las vidas restantes mediante configuración, sin tener que modificar el motor principal.

### Racha

La arquitectura debe quedar preparada para implementar posteriormente un sistema de `streak` o racha.

La racha no debe ser una dependencia necesaria para que la V1 funcione.

---

## 11. Diccionario de palabras

La V1 utilizará un diccionario **local en JSON**.

### Requisitos

- Conjunto amplio de palabras comunes en español.
- Mínimo recomendado para desarrollo: **5.000 palabras comunes**.
- Clasificación por longitud.
- Soporte para palabras con letras repetidas.
- Evitar repetir palabras innecesariamente durante una partida.

### Excluir

- Nombres propios.
- Abreviaturas.
- Palabras inexistentes.
- Tokens extraños.
- Términos excesivamente raros.
- Entradas que no correspondan a palabras válidas para el juego.

El diccionario debe poder ampliarse o sustituirse fácilmente en futuras versiones.

---

## 12. Pantallas

### 12.1 Splash

Debe mostrar:

- Logo oficial.
- Nombre del juego.
- Carga inicial breve.

### 12.2 Menú principal

Debe incluir:

- Logo.
- Jugar.
- Selección de dificultad.
- Estadísticas.
- Ajustes.
- Controles de sonido/música.

### 12.3 Selección de dificultad

Opciones:

- Fácil.
- Media.
- Difícil.

Cada opción debe explicar brevemente su longitud de palabras.

### 12.4 Juego

Debe mostrar claramente:

- Palabra desordenada.
- Respuesta parcial.
- Vidas.
- Puntuación.
- Teclado QWERTY.
- Feedback de acierto/error.

### 12.5 Error

Mostrar:

- Feedback visual rojo.
- −5 puntos.
- Pérdida de una vida.
- Mensaje breve.
- Posición actual pendiente.

### 12.6 Palabra completada

Mostrar:

- Celebración.
- Palabra correcta.
- Puntos obtenidos.
- Botón/avance a la siguiente palabra.

### 12.7 Game Over

Mostrar:

- Puntuación final.
- Mejor puntuación.
- Jugar de nuevo.
- Volver al menú.

### 12.8 Estadísticas

Mostrar como mínimo:

- Partidas jugadas.
- Palabras correctas.
- Puntuación máxima.
- Racha máxima cuando esté disponible.
- Métricas por dificultad.
- Historial básico.

### 12.9 Ajustes

Preparar:

- Sonido.
- Efectos.
- Música.
- Idioma preparado para futuras versiones.
- Opciones visuales futuras si fueran necesarias.

---

## 13. Sonido y animaciones

### Sonidos locales

Preparar recursos para:

- `correct.mp3`
- `wrong.mp3`
- `word_complete.mp3`
- `game_over.mp3`
- `button.mp3`
- Música de fondo opcional.

Todos los sonidos deben poder activarse/desactivarse.

### Animaciones

Utilizar animaciones suaves para:

- Acierto.
- Error.
- Palabra completada.
- Transiciones.
- Botones.

Ejemplos:

- Escala.
- Rebote.
- Temblor.
- Partículas ligeras.

Las animaciones deben ser cortas y nunca bloquear la interacción.

---

## 14. Almacenamiento y persistencia

Guardar localmente:

- Mejor puntuación.
- Estadísticas.
- Historial.
- Preferencias de sonido.
- Preferencias de efectos.
- Preferencias de música.
- Configuración relevante.

### Web

Usar `localStorage`.

### Android

Diseñar una capa de almacenamiento que permita, cuando sea necesario, comunicación mediante `WebViewString` con MIT App Inventor.

El juego debe continuar funcionando aunque dicha comunicación no esté disponible.

---

## 15. Estructura del proyecto

La estructura mínima esperada es:

```text
OrdenaLetras/
│
├── index.html
│
├── css/
│   └── style.css
│
├── js/
│   ├── main.js
│   ├── game.js
│   ├── words.js
│   ├── storage.js
│   ├── audio.js
│   ├── ui.js
│   └── utils.js
│
├── data/
│   └── words.json
│
├── assets/
│   ├── images/
│   └── audio/
│
└── README.md
```

La arquitectura debe mantener separadas:

- Interfaz.
- Estado del juego.
- Motor de reglas.
- Palabras.
- Persistencia.
- Audio.
- Utilidades.

---

## 16. Comunicación con MIT App Inventor

El juego debe quedar preparado para integrarse en un WebViewer.

La comunicación futura puede utilizar:

```text
WebViewString
```

Ejemplos de eventos/datos que podrían comunicarse:

- Guardar preferencias.
- Cargar preferencias.
- Guardar estadísticas.
- Cargar estadísticas.
- Informar eventos relevantes al contenedor.

La aplicación web debe seguir siendo completamente funcional por sí misma.

---

## 17. Responsive y compatibilidad

Priorizar las siguientes resoluciones aproximadas:

- `360 × 640`
- `375 × 667`
- `393 × 852`
- `412 × 915`

También debe funcionar en Chrome en PC para depuración.

### Requisitos

- No debe existir overflow horizontal.
- No debe existir contenido cortado.
- Los botones deben ser suficientemente grandes para tocar.
- El teclado debe ser cómodo.
- Los textos deben mantenerse legibles.
- La interfaz debe adaptarse a diferentes tamaños de pantalla.

Todos los recursos deben utilizar rutas relativas.

---

## 18. Pruebas

### Navegador PC

Usar Chrome como entorno principal de pruebas durante el desarrollo.

### Navegador móvil

Validar:

- Responsive.
- Interacción táctil.
- Teclado.
- Animaciones.
- Sonido.
- Legibilidad.

### APK Android

Después de validar la versión web:

1. Integrar en MIT App Inventor.
2. Utilizar WebViewer.
3. Generar APK.
4. Instalar en dispositivo Android.
5. Probar nuevamente todas las funciones.

### Casos de prueba

Probar específicamente:

- Los tres niveles.
- 15 vidas.
- Errores consecutivos.
- −5 puntos por error.
- Recuperación de vida.
- Game Over.
- Palabras repetidas.
- Palabras con letras repetidas.
- Puntuación.
- Récords.
- Estadísticas.
- Historial.
- Persistencia al cerrar y reabrir.
- Funcionamiento sin Internet.
- Diferentes tamaños de pantalla.

---

## 19. Criterios de aceptación

La V1 se considera aceptable cuando:

1. El juego puede iniciarse en Chrome.
2. El juego completo funciona sin Internet.
3. Las palabras son válidas.
4. Las letras desordenadas corresponden exactamente a la palabra objetivo.
5. Cada letra correcta ocupa la siguiente posición.
6. Cada error resta exactamente una vida y 5 puntos.
7. Después de un error se mantiene la posición actual.
8. La palabra no revela automáticamente la letra correcta.
9. Al completar una palabra se contabiliza la puntuación.
10. Se puede continuar con la siguiente palabra.
11. Game Over ocurre al agotar las vidas.
12. Los datos se guardan localmente.
13. El diseño utiliza el logo oficial proporcionado.
14. La interfaz funciona en teléfonos verticales.
15. El proyecto puede integrarse en MIT App Inventor mediante WebViewer.

---

## 20. Entregables para Antigravity

Antigravity debe entregar:

1. Código fuente completo.
2. `index.html`.
3. CSS modular.
4. JavaScript modular.
5. Diccionario JSON.
6. Logo/icono y demás recursos visuales.
7. Sonidos locales.
8. README.
9. Tests de la lógica crítica.
10. Instrucciones para ejecutar en Chrome.
11. Instrucciones para probar en navegador móvil.
12. Instrucciones para integrar en MIT App Inventor/WebViewer.
13. Estructura preparada para generar APK Android.
14. Explicación breve de la arquitectura.
15. Lista de parámetros que pueden modificarse fácilmente.

---

## 21. Flujo de desarrollo y pruebas

El orden correcto será:

```text
1. Antigravity desarrolla el juego
           ↓
2. Ejecutar y probar en Chrome/PC
           ↓
3. Corregir lógica y UI
           ↓
4. Probar en navegador móvil
           ↓
5. Corregir problemas responsive/táctiles
           ↓
6. Integrar en MIT App Inventor
           ↓
7. WebViewer
           ↓
8. Generar APK
           ↓
9. Instalar APK en Android
           ↓
10. Prueba final en dispositivo real
```

---

## 22. Regla fundamental del producto

**Ordena Letras es una aplicación móvil.**

La versión web existe únicamente como:

- entorno de desarrollo;
- entorno de depuración;
- entorno de pruebas.

No diseñar el producto alrededor de:

- una página web pública;
- una web tipo `ordenaletras.com`;
- navegación de escritorio;
- funcionalidades exclusivas de navegador.

El objetivo final es una **aplicación Android instalable mediante APK**.

---

## 23. Regla fundamental para Antigravity

No agregar funcionalidades fuera de este SRS solo porque parezcan interesantes.

Priorizar:

1. estabilidad;
2. jugabilidad;
3. rendimiento;
4. funcionamiento offline;
5. buena experiencia táctil;
6. fidelidad a la guía visual;
7. arquitectura limpia;
8. facilidad de mantenimiento.

No agregar en V1:

- cuentas;
- ranking mundial;
- multijugador;
- compras;
- anuncios;
- backend;
- web pública;
- dependencia de IA.

Primero debe existir una V1 **simple, estable, jugable y visualmente pulida**.

---

## 24. Material visual de referencia

Archivos asociados:

- `OrdenaLetras_logo_icono_oficial.jpg` — logo/icono oficial suministrado por el usuario.
- `OrdenaLetras_Guia_Visual_V1.png` — guía visual de pantallas, paleta, tipografía y estructura.

La guía visual debe utilizarse como referencia de diseño y composición.

El logo suministrado por el usuario tiene prioridad sobre cualquier logo generado previamente.
