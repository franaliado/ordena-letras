/**
 * Ordena Letras — V1.0
 * Gestor del Diccionario de Palabras (js/words.js)
 * Carga desde data/words.json con respaldo embebido 100% offline para WebViewer
 */

const WordsManager = {
  // Diccionario base embebido como respaldo de seguridad para entornos file:/// y WebView
  dictionary: {
    facil: [
      "BARCO", "PLAYA", "PERRO", "GATOS", "MUNDO", "NOCHE", "SILLA", "LIBRO", "ARBOL", "RATON",
      "FLORE", "VIAJE", "SABOR", "VERDE", "CALOR", "REGLA", "CIELO", "FUEGO", "LLAVE", "PLUMA",
      "DULCE", "CAMPO", "FRUTA", "AGUAS", "RADIO", "TORRE", "BOLSA", "CARRO", "HUEVO", "NIEVE",
      "PIANO", "RELOJ", "TIGRE", "ZAPATO", "BRAZO", "CARNE", "DISCO", "FIESTA", "FALDA", "GRANO",
      "HIELO", "ISLAS", "JABON", "LECHE", "MANOS", "NARIZ", "OREJA", "PAPEL", "QUESO", "SELVA"
    ],
    media: [
      "CABALLO", "CAMINOS", "PLANETA", "GUITAR", "PUERTAS", "JARDINES", "CIUDADES", "VENTANA",
      "BOSQUES", "ESTRELLA", "TIEMPOS", "FUERZAS", "DINEROS", "CUADERNO", "ESCUELA", "CORAZON",
      "PINTURA", "CASTILLO", "COLORES", "FAMILIA", "HISTORIA", "CANCION", "MERCADO", "SOLDADO",
      "CAMPEON", "DESTINO", "CARRERA", "PENSAR", "CULTURA", "BOTELLA", "CAMISA", "PANTAL"
    ],
    dificil: [
      "AVENTURA", "UNIVERSO", "BIBLIOTECA", "ELEFANTE", "MARIPOSA", "CARRETERA", "CHOCOLATE",
      "DINOSAURIO", "ESPERANZA", "FANTASIA", "GOLONDRINA", "HOSPITAL", "HORIZONTE", "MARAVILLA",
      "ORQUESTA", "TELEFONO", "VELOCIDAD", "TERREMOTO", "AEROPUERTO", "ASTRONAUTA", "BICICLETA",
      "CABALLERO", "COCINERO", "CORAZONES", "DESCUBRIR", "ESMERALDA", "FOTOGRAFIA", "GEOGRAFIA"
    ]
  },

  usedWords: {
    facil: new Set(),
    media: new Set(),
    dificil: new Set()
  },

  isLoaded: false,

  /**
   * Intenta cargar el archivo JSON externo si está disponible
   */
  async loadWords() {
    try {
      const response = await fetch('data/words.json');
      if (response.ok) {
        const data = await response.json();
        if (data.facil && data.media && data.dificil) {
          this.dictionary = data;
          this.isLoaded = true;
          return;
        }
      }
    } catch (e) {
      console.log('Modo offline autónomo activado (Diccionario local embebido).');
    }
    this.isLoaded = true;
  },

  /**
   * Obtiene una palabra aleatoria según la dificultad sin repetirla en la partida
   */
  getWord(difficulty = 'facil') {
    const list = this.dictionary[difficulty] || this.dictionary.facil;
    const used = this.usedWords[difficulty];

    // Si ya se usaron todas las palabras de este nivel, reiniciar la lista de usadas
    if (used.size >= list.length) {
      used.clear();
    }

    const available = list.filter(w => !used.has(w));
    const selected = available[Math.floor(Math.random() * available.length)];
    used.add(selected);

    return selected.toUpperCase();
  },

  /**
   * Reinicia el historial de palabras usadas
   */
  resetUsedWords() {
    this.usedWords.facil.clear();
    this.usedWords.media.clear();
    this.usedWords.dificil.clear();
  }
};
