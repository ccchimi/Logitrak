// ARCHIVO GENERADO por scripts/generar-cotizador.js a partir de
// frontend/src/services/botLogistica. No editar a mano: npm run generar:cotizador

// ../frontend/src/services/botLogistica/conocimiento.ts
var LOCALIDADES = [
  { id: "caba", nombre: "CABA", provincia: "CABA", lat: -34.6037, lng: -58.3816, radioKm: 11, indiceDemanda: 1.1, alias: ["caba", "capital federal", "capital", "ciudad autonoma de buenos aires", "ciudad de buenos aires", "baires", "bs as", "bsas", "buenos aires"] },
  { id: "la-plata", nombre: "La Plata", provincia: "Buenos Aires", lat: -34.9215, lng: -57.9545, radioKm: 8, indiceDemanda: 1.02, alias: ["la plata"] },
  { id: "mar-del-plata", nombre: "Mar del Plata", provincia: "Buenos Aires", lat: -38.0055, lng: -57.5426, radioKm: 9, indiceDemanda: 1.04, alias: ["mar del plata", "mardel", "mdq"] },
  { id: "bahia-blanca", nombre: "Bah\xEDa Blanca", provincia: "Buenos Aires", lat: -38.7183, lng: -62.2663, radioKm: 7, indiceDemanda: 1, alias: ["bahia blanca", "bahia"] },
  { id: "tandil", nombre: "Tandil", provincia: "Buenos Aires", lat: -37.3217, lng: -59.1332, radioKm: 5, indiceDemanda: 0.98, alias: ["tandil"] },
  { id: "junin", nombre: "Jun\xEDn", provincia: "Buenos Aires", lat: -34.5939, lng: -60.9466, radioKm: 5, indiceDemanda: 0.97, alias: ["junin"] },
  { id: "pergamino", nombre: "Pergamino", provincia: "Buenos Aires", lat: -33.8896, lng: -60.5733, radioKm: 5, indiceDemanda: 0.97, alias: ["pergamino"] },
  { id: "lujan", nombre: "Luj\xE1n", provincia: "Buenos Aires", lat: -34.5703, lng: -59.105, radioKm: 5, indiceDemanda: 0.98, alias: ["lujan"] },
  { id: "quilmes", nombre: "Quilmes", provincia: "Buenos Aires", lat: -34.7203, lng: -58.2546, radioKm: 6, indiceDemanda: 1.05, alias: ["quilmes"] },
  { id: "avellaneda", nombre: "Avellaneda", provincia: "Buenos Aires", lat: -34.6627, lng: -58.3656, radioKm: 5, indiceDemanda: 1.06, alias: ["avellaneda"] },
  { id: "lanus", nombre: "Lan\xFAs", provincia: "Buenos Aires", lat: -34.7033, lng: -58.3956, radioKm: 5, indiceDemanda: 1.05, alias: ["lanus"] },
  { id: "lomas-de-zamora", nombre: "Lomas de Zamora", provincia: "Buenos Aires", lat: -34.76, lng: -58.4, radioKm: 5, indiceDemanda: 1.04, alias: ["lomas de zamora", "lomas"] },
  { id: "moron", nombre: "Mor\xF3n", provincia: "Buenos Aires", lat: -34.6534, lng: -58.6198, radioKm: 5, indiceDemanda: 1.03, alias: ["moron"] },
  { id: "san-isidro", nombre: "San Isidro", provincia: "Buenos Aires", lat: -34.4708, lng: -58.5128, radioKm: 5, indiceDemanda: 1.05, alias: ["san isidro"] },
  { id: "vicente-lopez", nombre: "Vicente L\xF3pez", provincia: "Buenos Aires", lat: -34.5266, lng: -58.4796, radioKm: 4, indiceDemanda: 1.06, alias: ["vicente lopez", "vte lopez"] },
  { id: "tigre", nombre: "Tigre", provincia: "Buenos Aires", lat: -34.426, lng: -58.5797, radioKm: 6, indiceDemanda: 1.03, alias: ["tigre"] },
  { id: "pilar", nombre: "Pilar", provincia: "Buenos Aires", lat: -34.4587, lng: -58.9142, radioKm: 7, indiceDemanda: 1.02, alias: ["pilar"] },
  { id: "rosario", nombre: "Rosario", provincia: "Santa Fe", lat: -32.9468, lng: -60.6393, radioKm: 9, indiceDemanda: 1.06, alias: ["rosario"] },
  { id: "santa-fe", nombre: "Santa Fe", provincia: "Santa Fe", lat: -31.6333, lng: -60.7, radioKm: 7, indiceDemanda: 1, alias: ["santa fe", "santa fe capital"] },
  { id: "cordoba", nombre: "C\xF3rdoba", provincia: "C\xF3rdoba", lat: -31.4201, lng: -64.1888, radioKm: 10, indiceDemanda: 1.06, alias: ["cordoba", "cordoba capital"] },
  { id: "rio-cuarto", nombre: "R\xEDo Cuarto", provincia: "C\xF3rdoba", lat: -33.1232, lng: -64.3493, radioKm: 5, indiceDemanda: 0.98, alias: ["rio cuarto"] },
  { id: "villa-maria", nombre: "Villa Mar\xEDa", provincia: "C\xF3rdoba", lat: -32.4075, lng: -63.2406, radioKm: 4, indiceDemanda: 0.97, alias: ["villa maria"] },
  { id: "mendoza", nombre: "Mendoza", provincia: "Mendoza", lat: -32.8895, lng: -68.8458, radioKm: 8, indiceDemanda: 1.04, alias: ["mendoza", "mendoza capital"] },
  { id: "san-juan", nombre: "San Juan", provincia: "San Juan", lat: -31.5375, lng: -68.5364, radioKm: 6, indiceDemanda: 0.99, alias: ["san juan"] },
  { id: "san-luis", nombre: "San Luis", provincia: "San Luis", lat: -33.3017, lng: -66.3378, radioKm: 5, indiceDemanda: 0.97, alias: ["san luis"] },
  { id: "tucuman", nombre: "San Miguel de Tucum\xE1n", provincia: "Tucum\xE1n", lat: -26.8083, lng: -65.2176, radioKm: 7, indiceDemanda: 1.02, alias: ["tucuman", "san miguel de tucuman"] },
  { id: "salta", nombre: "Salta", provincia: "Salta", lat: -24.7821, lng: -65.4232, radioKm: 7, indiceDemanda: 1, alias: ["salta", "salta capital"] },
  { id: "jujuy", nombre: "San Salvador de Jujuy", provincia: "Jujuy", lat: -24.1858, lng: -65.2995, radioKm: 5, indiceDemanda: 0.98, alias: ["jujuy", "san salvador de jujuy"] },
  { id: "santiago", nombre: "Santiago del Estero", provincia: "Santiago del Estero", lat: -27.7834, lng: -64.2642, radioKm: 5, indiceDemanda: 0.96, alias: ["santiago del estero"] },
  { id: "catamarca", nombre: "San Fernando del Valle de Catamarca", provincia: "Catamarca", lat: -28.4696, lng: -65.7852, radioKm: 4, indiceDemanda: 0.95, alias: ["catamarca"] },
  { id: "la-rioja", nombre: "La Rioja", provincia: "La Rioja", lat: -29.4135, lng: -66.8565, radioKm: 4, indiceDemanda: 0.95, alias: ["la rioja"] },
  { id: "parana", nombre: "Paran\xE1", provincia: "Entre R\xEDos", lat: -31.7333, lng: -60.5333, radioKm: 5, indiceDemanda: 0.98, alias: ["parana"] },
  { id: "corrientes", nombre: "Corrientes", provincia: "Corrientes", lat: -27.4692, lng: -58.8306, radioKm: 5, indiceDemanda: 0.97, alias: ["corrientes", "corrientes capital"] },
  { id: "resistencia", nombre: "Resistencia", provincia: "Chaco", lat: -27.4514, lng: -58.9867, radioKm: 5, indiceDemanda: 0.96, alias: ["resistencia"] },
  { id: "posadas", nombre: "Posadas", provincia: "Misiones", lat: -27.3621, lng: -55.9007, radioKm: 5, indiceDemanda: 0.97, alias: ["posadas"] },
  { id: "formosa", nombre: "Formosa", provincia: "Formosa", lat: -26.1849, lng: -58.1731, radioKm: 4, indiceDemanda: 0.95, alias: ["formosa"] },
  { id: "neuquen", nombre: "Neuqu\xE9n", provincia: "Neuqu\xE9n", lat: -38.9516, lng: -68.0591, radioKm: 6, indiceDemanda: 1.05, alias: ["neuquen", "neuquen capital"] },
  { id: "bariloche", nombre: "San Carlos de Bariloche", provincia: "R\xEDo Negro", lat: -41.1335, lng: -71.3103, radioKm: 5, indiceDemanda: 1.08, alias: ["bariloche", "san carlos de bariloche"] },
  { id: "viedma", nombre: "Viedma", provincia: "R\xEDo Negro", lat: -40.8135, lng: -62.9967, radioKm: 4, indiceDemanda: 1, alias: ["viedma"] },
  { id: "santa-rosa", nombre: "Santa Rosa", provincia: "La Pampa", lat: -36.6167, lng: -64.2833, radioKm: 4, indiceDemanda: 0.97, alias: ["santa rosa"] },
  { id: "trelew", nombre: "Trelew", provincia: "Chubut", lat: -43.2531, lng: -65.309, radioKm: 4, indiceDemanda: 1.04, alias: ["trelew"] },
  { id: "comodoro", nombre: "Comodoro Rivadavia", provincia: "Chubut", lat: -45.8641, lng: -67.4966, radioKm: 5, indiceDemanda: 1.08, alias: ["comodoro rivadavia", "comodoro"] },
  { id: "rio-gallegos", nombre: "R\xEDo Gallegos", provincia: "Santa Cruz", lat: -51.623, lng: -69.2168, radioKm: 4, indiceDemanda: 1.1, alias: ["rio gallegos"] },
  { id: "ushuaia", nombre: "Ushuaia", provincia: "Tierra del Fuego", lat: -54.8019, lng: -68.303, radioKm: 4, indiceDemanda: 1.12, alias: ["ushuaia"] }
];
var TIPOS_VIA = [
  "avenida",
  "av",
  "avda",
  "calle",
  "ruta",
  "rn",
  "rp",
  "camino",
  "pasaje",
  "pje",
  "diagonal",
  "diag",
  "boulevard",
  "bulevar",
  "bv",
  "autopista",
  "au",
  "peatonal",
  "costanera"
];
var CATEGORIAS_CARGA = [
  {
    id: "documentos",
    etiqueta: "Documentaci\xF3n",
    indicadores: ["documento", "sobre", "papeles", "carpeta", "contrato", "escritura", "expediente", "titulo", "factura", "tramite"],
    recargoPct: 0,
    requisitos: ["Entrega bajo firma del receptor"],
    capacidadRequerida: null,
    perfilTipico: { pesoKg: [0.2, 2], bultos: [1, 2] }
  },
  {
    id: "electronica",
    etiqueta: "Electr\xF3nica",
    indicadores: ["tv", "televisor", "notebook", "computadora", "pc", "monitor", "consola", "celular", "tablet", "impresora", "repuesto electronico", "electronica", "parlante", "camara"],
    recargoPct: 8,
    requisitos: ["Embalaje antiest\xE1tico recomendado", "Manipuleo vertical, sin apilar"],
    capacidadRequerida: null,
    perfilTipico: { pesoKg: [2, 25], bultos: [1, 3] }
  },
  {
    id: "fragil",
    etiqueta: "Carga fr\xE1gil",
    indicadores: ["vidrio", "cristal", "porcelana", "espejo", "cuadro", "ceramica", "botella", "vajilla", "fragil", "copas", "jarron"],
    recargoPct: 12,
    requisitos: ["Embalaje reforzado obligatorio", "Traslado con sujeci\xF3n independiente"],
    capacidadRequerida: null,
    perfilTipico: { pesoKg: [3, 30], bultos: [1, 4] }
  },
  {
    id: "refrigerado",
    etiqueta: "Cadena de fr\xEDo",
    indicadores: ["refrigerado", "congelado", "frio", "perecedero", "lacteo", "carne", "pescado", "helado", "fresco"],
    recargoPct: 18,
    requisitos: ["Cadena de fr\xEDo activa de punta a punta", "Registro de temperatura al retirar y entregar"],
    capacidadRequerida: "cadena_frio",
    perfilTipico: { pesoKg: [5, 60], bultos: [1, 6] }
  },
  {
    id: "medicinal",
    etiqueta: "Insumos m\xE9dicos",
    indicadores: ["medicamento", "medicinal", "insumo medico", "insumos medicos", "farmacia", "vacuna", "ortopedia", "quirurgico", "laboratorio"],
    recargoPct: 15,
    requisitos: ["Prioridad de entrega sanitaria", "Cadena de custodia documentada"],
    capacidadRequerida: "cadena_frio",
    perfilTipico: { pesoKg: [1, 15], bultos: [1, 3] }
  },
  {
    id: "alimentos",
    etiqueta: "Alimentos",
    indicadores: ["comida", "gastronomico", "pizza", "vianda", "catering", "panaderia", "almacen", "bebida", "alimento", "verdura", "fruta"],
    recargoPct: 5,
    requisitos: ["Transporte separado de productos no alimenticios"],
    capacidadRequerida: null,
    perfilTipico: { pesoKg: [2, 25], bultos: [1, 5] }
  },
  {
    id: "peligroso",
    etiqueta: "Mercanc\xEDa regulada",
    indicadores: ["pintura", "solvente", "quimico", "bateria", "combustible", "gas", "aerosol", "inflamable", "corrosivo", "garrafa"],
    recargoPct: 30,
    requisitos: ["Documentaci\xF3n de mercanc\xEDa peligrosa", "Veh\xEDculo habilitado y ventilado", "Prohibido consolidar con otras cargas"],
    capacidadRequerida: "mercancia_peligrosa",
    perfilTipico: { pesoKg: [5, 80], bultos: [1, 6] }
  },
  {
    id: "voluminoso",
    etiqueta: "Carga voluminosa",
    indicadores: ["mueble", "sillon", "sofa", "colchon", "ropero", "placard", "mudanza", "escritorio", "mesa", "heladera", "lavarropas", "cocina", "freezer", "aire acondicionado", "bicicleta"],
    recargoPct: 10,
    requisitos: ["Se requiere ayudante de carga y descarga", "Verificar accesos y ascensor en destino"],
    capacidadRequerida: "carga_voluminosa",
    perfilTipico: { pesoKg: [25, 220], bultos: [1, 8] }
  },
  {
    id: "indumentaria",
    etiqueta: "Indumentaria y textil",
    indicadores: ["ropa", "indumentaria", "calzado", "zapatillas", "textil", "tela", "prendas", "lote mayorista"],
    recargoPct: 0,
    requisitos: ["Proteger de humedad"],
    capacidadRequerida: null,
    perfilTipico: { pesoKg: [5, 60], bultos: [2, 12] }
  },
  {
    id: "general",
    etiqueta: "Carga general",
    indicadores: [],
    recargoPct: 0,
    requisitos: [],
    capacidadRequerida: null,
    perfilTipico: { pesoKg: [2, 40], bultos: [1, 5] }
  }
];
var FLOTA = [
  {
    id: "moto",
    nombre: "Motomensajer\xEDa",
    maxKg: 6,
    maxBultos: 2,
    maxVolumenDm3: 45,
    tarifaBase: 1900,
    porKg: 130,
    porBulto: 160,
    porKm: 95,
    velocidadMediaKmH: 32,
    capacidades: []
  },
  {
    id: "utilitario",
    nombre: "Utilitario liviano",
    maxKg: 350,
    maxBultos: 15,
    maxVolumenDm3: 2500,
    tarifaBase: 4300,
    porKg: 85,
    porBulto: 120,
    porKm: 140,
    velocidadMediaKmH: 38,
    capacidades: ["cadena_frio"]
  },
  {
    id: "furgon",
    nombre: "Furg\xF3n mediano",
    maxKg: 1500,
    maxBultos: 40,
    maxVolumenDm3: 9e3,
    tarifaBase: 7800,
    porKg: 70,
    porBulto: 100,
    porKm: 185,
    velocidadMediaKmH: 42,
    capacidades: ["cadena_frio", "carga_voluminosa"]
  },
  {
    id: "camion",
    nombre: "Cami\xF3n de carga pesada",
    maxKg: 12e3,
    maxBultos: 200,
    maxVolumenDm3: 45e3,
    tarifaBase: 14500,
    porKg: 55,
    porBulto: 85,
    porKm: 260,
    velocidadMediaKmH: 58,
    capacidades: ["cadena_frio", "carga_voluminosa", "mercancia_peligrosa"]
  }
];
var CONFIG_OPERATIVA = {
  divisorVolumetrico: 5e3,
  redondeoARS: 50,
  factorRuta: 1.25,
  distanciaUrbanaPorDefectoKm: 8,
  peajeCada50KmARS: 950,
  umbralInterurbanoKm: 50,
  seguroPctValorDeclarado: 0.012,
  comisionChofer: 0.78,
  validezCotizacionMin: 15,
  limites: {
    pesoMinKg: 0.05,
    pesoMaxKg: 12e3,
    bultosMax: 200,
    dimensionMaxCm: 600,
    alturaCalleMax: 3e4
  },
  franjasHorarias: [
    { desde: 7, hasta: 10, nombre: "pico matutino", multiplicador: 1.12 },
    { desde: 17, hasta: 20, nombre: "pico vespertino", multiplicador: 1.15 },
    { desde: 22, hasta: 24, nombre: "nocturno", multiplicador: 1.25 },
    { desde: 0, hasta: 6, nombre: "nocturno", multiplicador: 1.25 }
  ],
  multiplicadorPorDia: [1.18, 1, 1, 1, 1, 1.05, 1.08]
};

// ../frontend/src/services/botLogistica/nlp.ts
function normalizar(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}
function tokenizar(texto) {
  return normalizar(texto).split(/[^a-z0-9ñ]+/).filter(Boolean);
}
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let fila = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const nueva = [i];
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      nueva[j] = Math.min(nueva[j - 1] + 1, fila[j] + 1, fila[j - 1] + costo);
    }
    fila = nueva;
  }
  return fila[b.length];
}
function similitud(a, b) {
  const na = normalizar(a);
  const nb = normalizar(b);
  const max = Math.max(na.length, nb.length);
  if (max === 0) return 1;
  return 1 - levenshtein(na, nb) / max;
}
var SECUENCIAS_TECLADO = [
  "qwert",
  "werty",
  "asdf",
  "sdfg",
  "dfgh",
  "zxcv",
  "xcvb",
  "hjkl",
  "12345",
  "23456",
  "98765",
  "qazwsx",
  "poiuy",
  "mnbvc"
];
var PLACEHOLDERS = [
  "test",
  "prueba",
  "ejemplo",
  "asd",
  "asdasd",
  "qwerty",
  "nose",
  "no se",
  "cualquiera",
  "cualquier cosa",
  "nada",
  "ninguna",
  "xxx",
  "aaa",
  "abc",
  "lorem ipsum",
  "direccion",
  "calle falsa"
];
function esTextoDePrueba(texto) {
  const n = normalizar(texto).replace(/\d+/g, "").trim();
  return PLACEHOLDERS.some((p) => n === p || p.length > 3 && n.includes(p));
}
function esTextoIlegible(texto) {
  const n = normalizar(texto);
  const letras = n.replace(/[^a-zñ]/g, "");
  if (letras.length === 0) return true;
  if (/([a-zñ])\1{3,}/.test(n)) return true;
  if (SECUENCIAS_TECLADO.some((s) => n.includes(s))) return true;
  const palabras = n.split(/[^a-zñ]+/).filter((p) => p.length >= 4);
  if (palabras.length === 0) return false;
  let sospechosas = 0;
  for (const palabra of palabras) {
    const vocales = (palabra.match(/[aeiou]/g) || []).length;
    const ratioVocales = vocales / palabra.length;
    const consonantesSeguidas = /[^aeiou]{5,}/.test(palabra);
    if (ratioVocales < 0.22 || consonantesSeguidas) sospechosas++;
  }
  return sospechosas / palabras.length > 0.5;
}

// ../frontend/src/services/botLogistica/cargas.ts
function nivelDesdePuntaje(puntaje) {
  if (puntaje >= 75) return "alta";
  if (puntaje >= 50) return "media";
  return "baja";
}
function clasificarCarga(descripcion) {
  const texto = normalizar(descripcion);
  const tokens = new Set(tokenizar(descripcion));
  let mejor = CATEGORIAS_CARGA.find((c) => c.id === "general");
  let mejorEvidencia = 0;
  for (const categoria of CATEGORIAS_CARGA) {
    let evidencia = 0;
    for (const indicador of categoria.indicadores) {
      if (indicador.includes(" ")) {
        if (texto.includes(indicador)) evidencia += 2;
      } else if (tokens.has(indicador)) {
        evidencia += 2;
      } else if (indicador.length >= 5 && texto.includes(indicador)) {
        evidencia += 1;
      }
    }
    if (evidencia > mejorEvidencia) {
      mejorEvidencia = evidencia;
      mejor = categoria;
    }
  }
  const sinDescripcion = texto.length < 3;
  const puntaje = sinDescripcion ? 20 : mejorEvidencia === 0 ? 40 : Math.min(95, 55 + mejorEvidencia * 12);
  return {
    descripcion: descripcion.trim() || "Carga sin descripci\xF3n",
    categoria: mejor.id,
    etiqueta: mejor.etiqueta,
    recargoPct: mejor.recargoPct,
    requisitos: [...mejor.requisitos],
    capacidadRequerida: mejor.capacidadRequerida,
    puntaje,
    confianza: nivelDesdePuntaje(puntaje)
  };
}

// ../frontend/src/services/botLogistica/direcciones.ts
var CONECTORES = /* @__PURE__ */ new Set(["de", "del", "la", "el", "los", "las", "y", "e", "al"]);
function capitalizar(texto) {
  return texto.split(" ").filter(Boolean).map(
    (palabra, i) => CONECTORES.has(palabra) && i > 0 ? palabra : palabra.charAt(0).toUpperCase() + palabra.slice(1)
  ).join(" ");
}
function resolverLocalidad(texto) {
  const n = ` ${normalizar(texto)} `;
  for (const localidad of LOCALIDADES) {
    for (const alias of localidad.alias) {
      if (n.includes(` ${alias} `) || n.includes(` ${alias},`) || n.endsWith(` ${alias}`)) {
        return { localidad, corregida: false };
      }
    }
  }
  const segmentos = normalizar(texto).split(",").map((s) => s.trim()).filter((s) => s.length >= 4 && !/\d/.test(s));
  let mejor = null;
  for (const segmento of segmentos) {
    for (const localidad of LOCALIDADES) {
      for (const alias of localidad.alias) {
        const s = similitud(segmento, alias);
        if (s >= 0.78 && (!mejor || s > mejor.puntaje)) {
          mejor = { localidad, puntaje: s };
        }
      }
    }
  }
  return mejor ? { localidad: mejor.localidad, corregida: true } : null;
}
function extraerComponentes(texto) {
  const n = normalizar(texto);
  const cpa = n.match(/\b[a-z]\d{4}[a-z]{3}\b/);
  const cpPrefijo = n.match(/\bc\.?p\.?\s*:?\s*(\d{4})\b/);
  const codigoPostal = cpa ? cpa[0].toUpperCase() : cpPrefijo ? cpPrefijo[1] : null;
  const piso = n.match(/\b(?:piso\s*\d+|\d+\s*[°º]\s*(?:piso)?|dpto\.?\s*[a-z0-9]|depto\.?\s*[a-z0-9]|departamento\s*[a-z0-9])\b/);
  const pisoDepto = piso ? piso[0] : null;
  const palabras = texto.split(",")[0].split(/\s+/).filter(Boolean).filter((p) => !codigoPostal || normalizar(p) !== normalizar(codigoPostal));
  let tipoVia = null;
  let nombreVia = null;
  let altura = null;
  let indiceAltura = -1;
  for (let i = 0; i < palabras.length; i++) {
    const hayViaPrevia = palabras.slice(0, i).some((p) => /[a-zñáéíóú]/i.test(p));
    if (hayViaPrevia && /^\d{1,5}$/.test(palabras[i])) {
      indiceAltura = i;
      altura = parseInt(palabras[i], 10);
      break;
    }
  }
  const palabrasVia = (indiceAltura >= 0 ? palabras.slice(0, indiceAltura) : palabras).filter(
    (p) => /[a-zñáéíóú0-9]/i.test(p)
  );
  const primera = palabrasVia[0] ? normalizar(palabrasVia[0]).replace(/\./g, "") : null;
  if (primera && TIPOS_VIA.includes(primera)) {
    tipoVia = primera;
    nombreVia = palabrasVia.slice(1).join(" ") || null;
  } else if (palabrasVia.length > 0) {
    nombreVia = palabrasVia.join(" ");
  }
  return { tipoVia, nombreVia, altura, pisoDepto, codigoPostal };
}
function nivelDesdePuntaje2(puntaje) {
  if (puntaje >= 75) return "alta";
  if (puntaje >= 50) return "media";
  return "baja";
}
function construirNormalizada(componentes, localidad, textoOriginal) {
  if (!componentes.nombreVia) return textoOriginal.trim();
  const ABREVIATURAS = {
    av: "Av.",
    avda: "Av.",
    avenida: "Av.",
    bv: "Bv.",
    bulevar: "Bv.",
    boulevard: "Bv.",
    diag: "Diag.",
    pje: "Pje.",
    au: "Au.",
    rn: "RN",
    rp: "RP"
  };
  const tipo = componentes.tipoVia ? ABREVIATURAS[componentes.tipoVia] ?? capitalizar(componentes.tipoVia) : "";
  const partes = [];
  const via = `${tipo} ${capitalizar(componentes.nombreVia)}`.trim();
  partes.push(componentes.altura ? `${via} ${componentes.altura}` : via);
  if (componentes.pisoDepto) partes.push(capitalizar(componentes.pisoDepto));
  if (localidad) {
    partes.push(localidad.nombre);
    if (localidad.provincia !== localidad.nombre) partes.push(localidad.provincia);
  }
  return partes.join(", ");
}
function analizarDireccion(textoOriginal) {
  const problemas = [];
  const texto = textoOriginal.trim();
  const base = {
    textoOriginal,
    textoNormalizado: texto,
    componentes: { tipoVia: null, nombreVia: null, altura: null, pisoDepto: null, codigoPostal: null },
    localidad: null,
    localidadCorregida: false,
    problemas
  };
  const invalida = (extra) => ({
    ...base,
    ...extra,
    veredicto: "invalida",
    puntaje: 0,
    confianza: "baja",
    problemas
  });
  if (!texto) {
    problemas.push({
      codigo: "direccion_vacia",
      severidad: "critica",
      mensaje: "No recib\xED ninguna direcci\xF3n.",
      sugerencia: 'Indic\xE1 calle, altura y localidad. Ej: "Av. Corrientes 1300, CABA".'
    });
    return invalida();
  }
  if (texto.length < 6) {
    problemas.push({
      codigo: "direccion_corta",
      severidad: "critica",
      mensaje: "La direcci\xF3n es demasiado corta para ser real.",
      sugerencia: 'Necesito al menos calle y altura. Ej: "Mitre 450, Quilmes".'
    });
    return invalida();
  }
  if (esTextoDePrueba(texto)) {
    problemas.push({
      codigo: "texto_de_prueba",
      severidad: "critica",
      mensaje: "Eso parece un texto de prueba, no una direcci\xF3n real.",
      sugerencia: "Escrib\xED la direcci\xF3n verdadera de retiro o entrega."
    });
    return invalida();
  }
  if (esTextoIlegible(texto)) {
    problemas.push({
      codigo: "texto_ilegible",
      severidad: "critica",
      mensaje: "No puedo reconocer una direcci\xF3n en ese texto.",
      sugerencia: "Revis\xE1 que est\xE9 bien escrita, con calle, altura y localidad."
    });
    return invalida();
  }
  const componentes = extraerComponentes(texto);
  const resolucion = resolverLocalidad(texto);
  const localidad = resolucion?.localidad ?? null;
  const localidadCorregida = resolucion?.corregida ?? false;
  let puntaje = 0;
  if (componentes.nombreVia && componentes.nombreVia.length >= 3 && /[aeiouáéíóú]/i.test(componentes.nombreVia)) {
    puntaje += 35;
  } else {
    problemas.push({
      codigo: "sin_nombre_de_via",
      severidad: "critica",
      mensaje: "No identifico el nombre de la calle o avenida.",
      sugerencia: 'Empez\xE1 por la calle. Ej: "Av. Santa Fe 3200".'
    });
  }
  if (componentes.altura !== null) {
    if (componentes.altura > 0 && componentes.altura <= CONFIG_OPERATIVA.limites.alturaCalleMax) {
      puntaje += 25;
    } else {
      problemas.push({
        codigo: "altura_implausible",
        severidad: "advertencia",
        mensaje: `La altura ${componentes.altura} no parece existir en una calle real.`,
        sugerencia: "Verific\xE1 el n\xFAmero de puerta."
      });
      puntaje += 5;
    }
  } else {
    problemas.push({
      codigo: "sin_altura",
      severidad: "advertencia",
      mensaje: "Falta la altura (n\xFAmero de puerta).",
      sugerencia: "Agreg\xE1 el n\xFAmero para que el chofer llegue sin demoras."
    });
  }
  if (localidad) {
    puntaje += localidadCorregida ? 15 : 25;
    if (localidadCorregida) {
      problemas.push({
        codigo: "localidad_corregida",
        severidad: "info",
        mensaje: `Interpret\xE9 la localidad como ${localidad.nombre} (${localidad.provincia}).`
      });
    }
  } else {
    problemas.push({
      codigo: "localidad_desconocida",
      severidad: "advertencia",
      mensaje: "No reconozco la localidad dentro de nuestra red de cobertura.",
      sugerencia: 'Sum\xE1 la ciudad al final. Ej: "..., Rosario" o "..., CABA".'
    });
  }
  if (componentes.tipoVia) puntaje += 10;
  if (componentes.codigoPostal) puntaje += 5;
  puntaje = Math.min(100, puntaje);
  let veredicto;
  if (puntaje >= 75 && localidad) veredicto = "verificada";
  else if (puntaje >= 55) veredicto = "plausible";
  else if (puntaje >= 35) veredicto = "dudosa";
  else veredicto = "invalida";
  return {
    ...base,
    textoNormalizado: construirNormalizada(componentes, localidad, texto),
    componentes,
    localidad,
    localidadCorregida,
    veredicto,
    puntaje,
    confianza: nivelDesdePuntaje2(puntaje),
    problemas
  };
}
function esMismaDireccion(a, b) {
  if (a.componentes.nombreVia && b.componentes.nombreVia && a.componentes.altura !== null && b.componentes.altura !== null) {
    const mismaVia = similitud(a.componentes.nombreVia, b.componentes.nombreVia) >= 0.85;
    const mismaLocalidad = !a.localidad || !b.localidad || a.localidad.id === b.localidad.id;
    return mismaVia && a.componentes.altura === b.componentes.altura && mismaLocalidad;
  }
  return similitud(a.textoNormalizado, b.textoNormalizado) >= 0.92;
}
function distanciaHaversineKm(a, b) {
  const R = 6371;
  const rad = (g) => g * Math.PI / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function estimarDistancia(origen, destino) {
  const { factorRuta, distanciaUrbanaPorDefectoKm } = CONFIG_OPERATIVA;
  if (origen.localidad && destino.localidad) {
    if (origen.localidad.id === destino.localidad.id) {
      const km2 = Math.max(2, origen.localidad.radioKm * 0.7);
      return {
        km: Math.round(km2 * 10) / 10,
        estimada: true,
        detalle: `tramo urbano dentro de ${origen.localidad.nombre}`
      };
    }
    const km = distanciaHaversineKm(origen.localidad, destino.localidad) * factorRuta;
    return {
      km: Math.round(km * 10) / 10,
      estimada: false,
      detalle: `${origen.localidad.nombre} \u2192 ${destino.localidad.nombre} por red vial estimada`
    };
  }
  return {
    km: distanciaUrbanaPorDefectoKm,
    estimada: true,
    detalle: "tramo urbano asumido por falta de localidad verificable"
  };
}

// ../frontend/src/services/botLogistica/tarifas.ts
function nivelDesdePuntaje3(puntaje) {
  if (puntaje >= 75) return "alta";
  if (puntaje >= 50) return "media";
  return "baja";
}
function generarId(prefijo) {
  const azar = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefijo}-${Date.now().toString(36).toUpperCase()}-${azar}`;
}
function calcularFactoresContexto(fecha, origen, destino) {
  const hora = fecha.getHours();
  const franja = CONFIG_OPERATIVA.franjasHorarias.find((f) => hora >= f.desde && hora < f.hasta);
  const multiplicadorHorario = franja?.multiplicador ?? 1;
  const multiplicadorDia = CONFIG_OPERATIVA.multiplicadorPorDia[fecha.getDay()] ?? 1;
  const demandas = [origen.localidad?.indiceDemanda, destino.localidad?.indiceDemanda].filter(
    (d) => typeof d === "number"
  );
  const multiplicadorDemanda = demandas.length ? demandas.reduce((a, b) => a + b, 0) / demandas.length : 1;
  const etiquetas = [];
  if (franja) etiquetas.push(`franja ${franja.nombre}`);
  const dia = fecha.getDay();
  if (dia === 0) etiquetas.push("operativa de domingo");
  else if (dia === 6) etiquetas.push("operativa de s\xE1bado");
  else if (dia === 5) etiquetas.push("viernes de alta rotaci\xF3n");
  if (multiplicadorDemanda > 1.02) etiquetas.push("plaza de alta demanda");
  if (multiplicadorDemanda < 0.98) etiquetas.push("plaza de baja demanda");
  return {
    descripcionFranja: etiquetas.length ? etiquetas.join(" + ") : "horario valle",
    multiplicadorHorario,
    multiplicadorDia,
    multiplicadorDemanda
  };
}
function seleccionarVehiculo(pesoFacturableKg, bultos, volumenDm3, carga, distanciaKm) {
  const candidatos = FLOTA.filter((v) => {
    if (pesoFacturableKg > v.maxKg || bultos > v.maxBultos || volumenDm3 > v.maxVolumenDm3) {
      return false;
    }
    if (carga.capacidadRequerida && !v.capacidades.includes(carga.capacidadRequerida)) {
      return false;
    }
    return true;
  });
  if (candidatos.length === 0) return null;
  let mejor = null;
  for (const vehiculo of candidatos) {
    const costo = vehiculo.tarifaBase + Math.ceil(pesoFacturableKg) * vehiculo.porKg + bultos * vehiculo.porBulto + distanciaKm * vehiculo.porKm;
    if (!mejor || costo < mejor.costoEstimado) {
      const razones = [`cubre ${Math.ceil(pesoFacturableKg)} kg facturables y ${bultos} bulto(s)`];
      if (carga.capacidadRequerida === "cadena_frio") razones.push("equipado con cadena de fr\xEDo");
      if (carga.capacidadRequerida === "carga_voluminosa") razones.push("apto carga voluminosa");
      if (carga.capacidadRequerida === "mercancia_peligrosa") razones.push("habilitado para mercanc\xEDa regulada");
      razones.push("es la unidad de menor costo para este tramo");
      mejor = { vehiculo, motivo: razones.join(", "), costoEstimado: costo };
    }
  }
  return mejor;
}
function formatearHora(fecha) {
  const h = fecha.getHours().toString().padStart(2, "0");
  const m = fecha.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}
function estimarTiempos(fecha, distanciaKm, vehiculo, factores) {
  const congestion = Math.max(factores.multiplicadorHorario, 1);
  const etaRetiroMin = Math.min(40, Math.round((10 + distanciaKm * 0.12) * congestion));
  const tiempoViajeMin = Math.round((distanciaKm / vehiculo.velocidadMediaKmH * 60 + 8) * congestion);
  const llegada = new Date(fecha.getTime() + (etaRetiroMin + tiempoViajeMin) * 6e4);
  const cierreVentana = new Date(llegada.getTime() + 30 * 6e4);
  const diasDespues = Math.floor((llegada.getTime() - fecha.getTime()) / 864e5);
  let ventanaEntrega;
  if (tiempoViajeMin >= 1440) {
    ventanaEntrega = `Entrega estimada en ${Math.round(tiempoViajeMin / 1440)} d\xEDa(s) (~${formatearHora(llegada)} h)`;
  } else if (diasDespues >= 1 || llegada.getDate() !== fecha.getDate()) {
    ventanaEntrega = `Ma\xF1ana, ${formatearHora(llegada)} \u2013 ${formatearHora(cierreVentana)} h`;
  } else {
    ventanaEntrega = `Hoy, ${formatearHora(llegada)} \u2013 ${formatearHora(cierreVentana)} h`;
  }
  return { etaRetiroMin, tiempoViajeMin, ventanaEntrega };
}
function redondear(monto) {
  const { redondeoARS } = CONFIG_OPERATIVA;
  return Math.round(monto / redondeoARS) * redondeoARS;
}
function cotizarSync(solicitud) {
  const fecha = solicitud.fecha ?? /* @__PURE__ */ new Date();
  const { limites } = CONFIG_OPERATIVA;
  const problemas = [];
  const origen = analizarDireccion(solicitud.origen);
  const destino = analizarDireccion(solicitud.destino);
  if (origen.veredicto === "invalida") {
    problemas.push(...origen.problemas.filter((p) => p.severidad === "critica"));
  }
  if (destino.veredicto === "invalida") {
    problemas.push(...destino.problemas.filter((p) => p.severidad === "critica"));
  }
  if (problemas.length > 0) {
    return {
      exito: false,
      motivo: "Necesito direcciones reales de retiro y entrega para cotizar.",
      problemas
    };
  }
  if (esMismaDireccion(origen, destino)) {
    return {
      exito: false,
      motivo: "El punto de retiro y el de entrega son el mismo lugar.",
      problemas: [
        {
          codigo: "origen_igual_destino",
          severidad: "critica",
          mensaje: "Origen y destino coinciden.",
          sugerencia: "Revis\xE1 una de las dos direcciones."
        }
      ]
    };
  }
  if (!isFinite(solicitud.pesoKg) || solicitud.pesoKg < limites.pesoMinKg) {
    return {
      exito: false,
      motivo: "El peso informado no es v\xE1lido.",
      problemas: [
        {
          codigo: "peso_invalido",
          severidad: "critica",
          mensaje: `Necesito un peso real en kg (m\xEDnimo ${limites.pesoMinKg} kg).`
        }
      ]
    };
  }
  if (solicitud.pesoKg > limites.pesoMaxKg) {
    return {
      exito: false,
      motivo: `El env\xEDo supera la capacidad m\xE1xima de la flota (${limites.pesoMaxKg} kg).`,
      problemas: [
        {
          codigo: "peso_fuera_de_rango",
          severidad: "critica",
          mensaje: "Carga fuera del rango operable.",
          sugerencia: "Para cargas industriales, contact\xE1 al \xE1rea comercial."
        }
      ]
    };
  }
  const bultos = Math.max(1, Math.floor(solicitud.bultos) || 1);
  if (bultos > limites.bultosMax) {
    return {
      exito: false,
      motivo: `Operamos hasta ${limites.bultosMax} bultos por viaje.`,
      problemas: [
        {
          codigo: "bultos_fuera_de_rango",
          severidad: "critica",
          mensaje: "Cantidad de bultos fuera de rango."
        }
      ]
    };
  }
  const carga = clasificarCarga(solicitud.descripcionCarga ?? "");
  const dim = solicitud.dimensiones;
  const volumenUnitarioCm3 = dim?.largo && dim?.ancho && dim?.alto ? dim.largo * dim.ancho * dim.alto : 0;
  const volumenTotalDm3 = volumenUnitarioCm3 * bultos / 1e3;
  const pesoRealKg = solicitud.pesoKg;
  const pesoVolumetricoKg = volumenUnitarioCm3 * bultos / CONFIG_OPERATIVA.divisorVolumetrico;
  const pesoFacturableKg = Math.max(pesoRealKg, pesoVolumetricoKg);
  const distancia = estimarDistancia(origen, destino);
  const factores = calcularFactoresContexto(fecha, origen, destino);
  const seleccion = seleccionarVehiculo(pesoFacturableKg, bultos, volumenTotalDm3, carga, distancia.km);
  if (!seleccion) {
    return {
      exito: false,
      motivo: "Ninguna unidad de la flota puede tomar esta carga con los requisitos indicados.",
      problemas: [
        {
          codigo: "peso_fuera_de_rango",
          severidad: "critica",
          mensaje: "La combinaci\xF3n de peso, volumen y tipo de carga excede la flota disponible.",
          sugerencia: "Divid\xED el env\xEDo en m\xE1s de un viaje o consult\xE1 al \xE1rea comercial."
        }
      ]
    };
  }
  const { vehiculo } = seleccion;
  const desglose = [];
  desglose.push({ concepto: `Cargo base \u2014 ${vehiculo.nombre}`, monto: vehiculo.tarifaBase, tipo: "base" });
  desglose.push({
    concepto: `Flete por peso facturable (${Math.ceil(pesoFacturableKg)} kg)`,
    monto: Math.ceil(pesoFacturableKg) * vehiculo.porKg,
    tipo: "variable"
  });
  desglose.push({
    concepto: `Manipuleo de ${bultos} bulto(s)`,
    monto: bultos * vehiculo.porBulto,
    tipo: "variable"
  });
  desglose.push({
    concepto: `Recorrido ${distancia.km} km${distancia.estimada ? " (estimado)" : ""}`,
    monto: Math.round(distancia.km * vehiculo.porKm),
    tipo: "variable"
  });
  if (distancia.km > CONFIG_OPERATIVA.umbralInterurbanoKm) {
    desglose.push({
      concepto: "Peajes y gastos de ruta estimados",
      monto: Math.ceil(distancia.km / 50) * CONFIG_OPERATIVA.peajeCada50KmARS,
      tipo: "recargo"
    });
  }
  const subtotal = desglose.reduce((acc, l) => acc + l.monto, 0);
  if (carga.recargoPct > 0) {
    desglose.push({
      concepto: `Manejo especial \u2014 ${carga.etiqueta} (+${carga.recargoPct}%)`,
      monto: Math.round(subtotal * carga.recargoPct / 100),
      tipo: "recargo"
    });
  }
  if (solicitud.valorDeclarado && solicitud.valorDeclarado > 0) {
    desglose.push({
      concepto: "Seguro de mercader\xEDa (valor declarado)",
      monto: Math.round(solicitud.valorDeclarado * CONFIG_OPERATIVA.seguroPctValorDeclarado),
      tipo: "recargo"
    });
  }
  const subtotalConRecargos = desglose.reduce((acc, l) => acc + l.monto, 0);
  const multiplicadorTotal = factores.multiplicadorHorario * factores.multiplicadorDia * factores.multiplicadorDemanda;
  const ajusteDinamico = Math.round(subtotalConRecargos * (multiplicadorTotal - 1));
  if (ajusteDinamico !== 0) {
    desglose.push({
      concepto: `Ajuste din\xE1mico (${factores.descripcionFranja})`,
      monto: ajusteDinamico,
      tipo: ajusteDinamico > 0 ? "recargo" : "descuento"
    });
  }
  const precio = redondear(desglose.reduce((acc, l) => acc + l.monto, 0));
  const tiempos = estimarTiempos(fecha, distancia.km, vehiculo, factores);
  const puntajeConfianza = Math.round(
    origen.puntaje * 0.32 + destino.puntaje * 0.32 + carga.puntaje * 0.2 + (distancia.estimada ? 45 : 95) * 0.16
  );
  const advertencias = [];
  for (const analisis of [origen, destino]) {
    for (const p of analisis.problemas) {
      if (p.severidad === "advertencia") {
        const lado = analisis === origen ? "Origen" : "Destino";
        advertencias.push(`${lado}: ${p.mensaje}`);
      }
    }
  }
  if (distancia.estimada && origen.localidad?.id !== destino.localidad?.id) {
    advertencias.push("La distancia se estim\xF3 sin localidad verificada; el precio puede ajustarse al confirmar.");
  }
  if (carga.confianza === "baja" && solicitud.descripcionCarga) {
    advertencias.push("No pude clasificar la carga con precisi\xF3n: se aplic\xF3 tratamiento de carga general.");
  }
  const explicacion = `Asign\xE9 ${vehiculo.nombre} porque ${seleccion.motivo}. Calcul\xE9 ${distancia.km} km (${distancia.detalle}) con ${Math.ceil(pesoFacturableKg)} kg facturables${pesoVolumetricoKg > pesoRealKg ? " \u2014domin\xF3 el peso volum\xE9trico\u2014" : ""} y apliqu\xE9 el ajuste de contexto por ${factores.descripcionFranja}.`;
  const sla = distancia.km > CONFIG_OPERATIVA.umbralInterurbanoKm ? `Retiro garantizado en menos de ${tiempos.etaRetiroMin + 10} min y seguimiento satelital de punta a punta.` : `Chofer en el punto de retiro en menos de ${tiempos.etaRetiroMin + 5} min o bonificamos el 10% del flete.`;
  const cotizacion = {
    id: generarId("COT"),
    emitidaEn: fecha.toISOString(),
    validezMin: CONFIG_OPERATIVA.validezCotizacionMin,
    moneda: "ARS",
    precio,
    desglose,
    vehiculo: { id: vehiculo.id, nombre: vehiculo.nombre, motivo: seleccion.motivo },
    distanciaKm: distancia.km,
    distanciaEstimada: distancia.estimada,
    pesoRealKg,
    pesoVolumetricoKg: Math.round(pesoVolumetricoKg * 10) / 10,
    pesoFacturableKg: Math.round(pesoFacturableKg * 10) / 10,
    carga,
    origen,
    destino,
    factores,
    tiempos,
    confianza: nivelDesdePuntaje3(puntajeConfianza),
    puntajeConfianza,
    advertencias,
    explicacion,
    sla
  };
  return { exito: true, cotizacion };
}
function cotizarEnvio(solicitud) {
  const respuesta = cotizarSync(solicitud);
  const latenciaMs = 500 + Math.random() * 500;
  return new Promise((res) => setTimeout(() => res(respuesta), latenciaMs));
}
export {
  calcularFactoresContexto,
  cotizarEnvio,
  cotizarSync,
  estimarTiempos,
  seleccionarVehiculo
};
