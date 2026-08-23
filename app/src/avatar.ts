/**
 * El avatar: quién eres tú en la casa de juegos.
 *
 * QUÉ ES. Un personaje que el usuario compone a su gusto —piel, peinado, color,
 * atuendo, accesorio— y que la portada mete DENTRO de la escena del juego
 * activo: en el salón de CLUEDO sostiene una lupa, en el taller una pluma. No
 * es una foto de perfil: es su figura en el mundo.
 *
 * CÓMO SE COMPONE. Por piezas, no por «sexo». No se pregunta el género: se
 * eligen peinados, atuendos y rasgos, y cualquier combinación vale. Es más
 * flexible, más amable, y además es la única forma que no obliga a nadie a
 * encajar en una casilla.
 *
 * DÓNDE VIVE. En el dispositivo, igual que la credencial: SecureStore en el
 * móvil, localStorage en la web. No viaja al servidor todavía — cuando existan
 * las cuentas con proveedor se sincronizará con ellas, y este módulo es el
 * único sitio que habrá que tocar.
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface Avatar {
  /** Índices sobre los catálogos de abajo. */
  piel: number;
  peinado: number;
  colorPelo: number;
  atuendo: number;
  colorAtuendo: number;
  accesorio: number;
  /**
   * El modelo 3D generado desde una imagen (ruta firmada del servidor).
   *
   * Es LO QUE SE VE cuando existe: los índices de arriba pasan a ser el plan B
   * para cuando todavía no se ha generado ninguno. Se genera con Tripo a partir
   * de la foto que sube la persona; ver `app/avatar.tsx`.
   */
  modeloUrl?: string;
  /** La imagen de vista previa que renderiza el generador. */
  vistaPrevia?: string;
}

// ---------------------------------------------------------------------------
// Los catálogos. El editor los recorre; la figura los interpreta.
// ---------------------------------------------------------------------------

export const PIELES = ['#f6d7b8', '#ecc19a', '#d9a06f', '#b97a4e', '#8a5a3a', '#5f3d28'] as const;

export const PEINADOS = ['Clásico', 'Melena', 'Rizos', 'Coleta', 'Rapado'] as const;

export const COLORES_PELO = [
  '#1c1410',
  '#4a2f1d',
  '#8a5a24',
  '#c9a227',
  '#8c2337',
  '#5b6f7a',
  '#e8e2cf',
] as const;

export const ATUENDOS = ['Esmoquin', 'Gabardina', 'Capa', 'De diario'] as const;

/** Cada paleta trae su tela y su sombra: sin sombra no hay volumen. */
export const COLORES_ATUENDO: ReadonlyArray<{ tela: string; sombra: string; detalle: string }> = [
  { tela: '#23262e', sombra: '#15181f', detalle: '#c9a227' },
  { tela: '#6d1a2a', sombra: '#471120', detalle: '#e8cf7f' },
  { tela: '#1a4f3a', sombra: '#0f3527', detalle: '#d9b64a' },
  { tela: '#243447', sombra: '#161f2e', detalle: '#9b7fd4' },
  { tela: '#8a5a24', sombra: '#5c3b16', detalle: '#f1e5c9' },
];

export const ACCESORIOS = ['Ninguno', 'Monóculo', 'Gafas', 'Antifaz'] as const;

/** El atrezo lo decide la ESCENA, no el usuario: es lo que lo hace temático. */
export type Atrezo = 'lupa' | 'pluma' | 'ninguno';

// ---------------------------------------------------------------------------
// Persistencia
// ---------------------------------------------------------------------------

const CLAVE = 'gm_avatar';

const almacen = {
  async get(): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return globalThis.localStorage?.getItem(CLAVE) ?? null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(CLAVE);
  },
  async set(valor: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.setItem(CLAVE, valor);
      } catch {
        /* modo privado: se pierde al cerrar, y no pasa nada */
      }
      return;
    }
    await SecureStore.setItemAsync(CLAVE, valor);
  },
};

/**
 * EL ELENCO: diez identidades listas, para que nadie empiece sin cara.
 *
 * EL PROBLEMA QUE RESUELVE. La única forma de tener retrato era esculpir uno
 * con Tripo: subir una foto, esperar un par de minutos y confiar. Quien abría la
 * app por primera vez —a diez minutos de una cena, con prisa— no tenía identidad
 * ninguna, y la pantalla le ofrecía un botón en medio de la nada.
 *
 * Con esto, al primer arranque ya eres alguien. Cambiar de personaje es un
 * toque, y esculpir el tuyo sigue estando para quien quiera.
 *
 * SON COMBINACIONES DE LOS CATÁLOGOS, no dibujos aparte. Así el elenco entero
 * pesa unos cientos de bytes, se recolorea con el tema y añadir el undécimo es
 * escribir una línea. Los nombres son de la casa —arquetipos de misterio— y no
 * de personas: quien juega ya tendrá su personaje dentro de la velada, y este
 * retrato es quien es en la plataforma, no en la partida.
 */
export interface Personaje {
  id: string;
  nombre: string;
  /** Una línea que se lee bajo el nombre al elegir. */
  nota: string;
  rasgos: Avatar;
}

export const ELENCO: ReadonlyArray<Personaje> = [
  {
    id: 'anfitriona',
    nombre: 'La Anfitriona',
    nota: 'Sonríe mientras cuenta los cubiertos.',
    rasgos: { piel: 0, peinado: 1, colorPelo: 4, atuendo: 1, colorAtuendo: 1, accesorio: 0 },
  },
  {
    id: 'inspector',
    nombre: 'El Inspector',
    nota: 'Ya sabe la respuesta; quiere ver si tú también.',
    rasgos: { piel: 2, peinado: 0, colorPelo: 0, atuendo: 1, colorAtuendo: 4, accesorio: 2 },
  },
  {
    id: 'heredero',
    nombre: 'El Heredero',
    nota: 'Nunca ha pagado una cuenta en su vida.',
    rasgos: { piel: 1, peinado: 0, colorPelo: 3, atuendo: 0, colorAtuendo: 0, accesorio: 1 },
  },
  {
    id: 'viuda',
    nombre: 'La Viuda',
    nota: 'De luto desde antes del entierro.',
    rasgos: { piel: 0, peinado: 3, colorPelo: 0, atuendo: 2, colorAtuendo: 0, accesorio: 3 },
  },
  {
    id: 'doctora',
    nombre: 'La Doctora',
    nota: 'Sabe exactamente cuánto tarda cada cosa.',
    rasgos: { piel: 3, peinado: 3, colorPelo: 1, atuendo: 3, colorAtuendo: 2, accesorio: 2 },
  },
  {
    id: 'crupier',
    nombre: 'El Crupier',
    nota: 'Reparte las cartas y también los rumores.',
    rasgos: { piel: 4, peinado: 4, colorPelo: 0, atuendo: 0, colorAtuendo: 3, accesorio: 0 },
  },
  {
    id: 'cantante',
    nombre: 'La Cantante',
    nota: 'Llegó tarde y con una coartada preciosa.',
    rasgos: { piel: 1, peinado: 2, colorPelo: 6, atuendo: 2, colorAtuendo: 1, accesorio: 0 },
  },
  {
    id: 'jardinero',
    nombre: 'El Jardinero',
    nota: 'Conoce los rincones de la casa mejor que nadie.',
    rasgos: { piel: 5, peinado: 2, colorPelo: 0, atuendo: 3, colorAtuendo: 4, accesorio: 0 },
  },
  {
    id: 'profesor',
    nombre: 'El Profesor',
    nota: 'Corrige a todo el mundo, incluso cuando acierta.',
    rasgos: { piel: 2, peinado: 0, colorPelo: 6, atuendo: 0, colorAtuendo: 2, accesorio: 2 },
  },
  {
    id: 'forastera',
    nombre: 'La Forastera',
    nota: 'Nadie recuerda quién la invitó.',
    rasgos: { piel: 4, peinado: 1, colorPelo: 5, atuendo: 2, colorAtuendo: 3, accesorio: 3 },
  },
];

/**
 * Un personaje del elenco al azar, para el primer arranque.
 *
 * AL AZAR Y NO SIEMPRE EL PRIMERO: si todo el mundo empezara siendo La
 * Anfitriona, en una mesa de doce habría doce anfitrionas idénticas y el
 * retrato dejaría de distinguir a nadie, que es justo para lo que está.
 */
export function personajeDeEstreno(): Avatar {
  const elegido = ELENCO[Math.floor(Math.random() * ELENCO.length)];
  return { ...(elegido ?? ELENCO[0])!.rasgos };
}

export const AVATAR_POR_DEFECTO: Avatar = {
  piel: 1,
  peinado: 0,
  colorPelo: 1,
  atuendo: 0,
  colorAtuendo: 0,
  accesorio: 0,
};

/** Deja cada índice dentro de su catálogo: un avatar guardado nunca revienta. */
function acotar(a: Avatar): Avatar {
  const entre = (v: unknown, tope: number): number => {
    const n = typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : 0;
    return Math.min(Math.max(n, 0), tope - 1);
  };
  return {
    piel: entre(a.piel, PIELES.length),
    peinado: entre(a.peinado, PEINADOS.length),
    colorPelo: entre(a.colorPelo, COLORES_PELO.length),
    atuendo: entre(a.atuendo, ATUENDOS.length),
    colorAtuendo: entre(a.colorAtuendo, COLORES_ATUENDO.length),
    accesorio: entre(a.accesorio, ACCESORIOS.length),
    ...(typeof a.modeloUrl === 'string' && a.modeloUrl.startsWith('/api/')
      ? { modeloUrl: a.modeloUrl }
      : {}),
    ...(typeof a.vistaPrevia === 'string' ? { vistaPrevia: a.vistaPrevia } : {}),
  };
}

/**
 * El avatar guardado o, la primera vez, uno del elenco.
 *
 * SE GUARDA EN EL PRIMER ARRANQUE, y no basta con devolverlo: si solo se
 * devolviera, cada pantalla que preguntara sacaría un personaje distinto al
 * azar y la identidad cambiaría sola al navegar. Al escribirlo, quien abre la
 * app ya es alguien concreto y lo sigue siendo mañana.
 */
export async function cargarAvatar(): Promise<Avatar> {
  try {
    const bruto = await almacen.get();
    if (bruto) return acotar(JSON.parse(bruto) as Avatar);
    const estreno = personajeDeEstreno();
    await almacen.set(JSON.stringify(estreno));
    return estreno;
  } catch {
    return AVATAR_POR_DEFECTO;
  }
}

export async function guardarAvatar(avatar: Avatar): Promise<void> {
  await almacen.set(JSON.stringify(acotar(avatar)));
}
