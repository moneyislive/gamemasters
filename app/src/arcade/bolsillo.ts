/**
 * EL BOLSILLO: dónde guarda este aparato el sitio que ocupa en una mesa.
 *
 * ═══ QUÉ FALLO CIERRA, Y POR QUÉ NO ES UNA COMODIDAD ═══
 *
 * Sin esto, el código de la mesa y la llave del asiento vivían en dos referencias
 * dentro del componente. O sea: recargar la página, o que el sistema mate la app
 * —lo normal en un móvil, y el supuesto ENTERO de la fase 4 bis: «se entra, se
 * juega uno, se cierra la app»— borraba las dos.
 *
 * Y no era «hay que volver a entrar». Era peor y era mudo: volver a entrar con el
 * código llama a `POST /mesas/:codigo/asientos`, que crea un asiento NUEVO. En una
 * partida ya repartida ese asiento no está entre los jugadores, así que el juego no
 * le ofrece un solo movimiento y la persona se queda de ESPECTADORA DE SU PROPIA
 * PARTIDA, sin un mensaje que lo explique. La mesa, además, tiene aforo: el asiento
 * fantasma ocupa sitio.
 *
 * ═══ POR QUÉ UN FICHERO PROPIO Y NO EL ALMACÉN DE `api.ts` ═══
 *
 * `api.ts` es el cliente de las VELADAS y tiene su propio almacén ahí dentro, sin
 * exportar. La regla de la que cuelga todo el motor de arcade es que los dos
 * motores no se conocen, y colar una segunda cosa por esa puerta —hoy la dirección
 * del servidor, mañana el almacén, pasado un reintento compartido— es la primera de
 * las cien banderas que acaban deshaciendo la separación.
 *
 * Lo que se repite son veinte líneas de FONTANERÍA DE PLATAFORMA, que es lo único
 * que se puede repetir sin coste: no hay ni una decisión aquí que pueda
 * desincronizarse con la del otro lado. Vocabulario, cero.
 *
 * ═══ POR QUÉ `SecureStore` Y NO ALGO MÁS SIMPLE ═══
 *
 * Porque la llave de un asiento ES una credencial: quien la tenga mueve por ti. No
 * es la credencial de una cuenta —un asiento no tiene cuenta, correo ni obligaciones
 * de datos (§5.7)— pero tampoco es un ajuste. En la web no existe `SecureStore` y se
 * cae a `localStorage`, que es lo que hay, exactamente igual que hace el resto de
 * esta app con su credencial.
 *
 * Y todo va envuelto en `try`: en un navegador en modo privado el acceso al almacén
 * LANZA en vez de devolver vacío, y una pantalla de juego que revienta al abrirse
 * porque no pudo leer un código guardado sería un fallo peor que el que se arregla.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/** Lo que hay que recordar para volver a un sitio de una mesa. */
export interface SitioGuardado {
  codigo: string;
  llave: string;
}

/**
 * La llave del almacén, una por arcade.
 *
 * Una por arcade y no una sola: se puede tener una partida de un juego a medias y
 * abrir otra de otro, y con una llave única la segunda pisaría a la primera sin que
 * nadie se enterara. El identificador del arcade va tal cual porque es un
 * identificador de los nuestros, no un texto de fuera.
 */
function llaveDelBolsillo(arcade: string): string {
  return `arcade.sitio.${arcade}`;
}

/** Guarda dónde estamos sentados. Si el almacén no quiere, se sigue jugando. */
export async function guardarElSitio(arcade: string, sitio: SitioGuardado): Promise<void> {
  const valor = `${sitio.codigo}:${sitio.llave}`;
  try {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(llaveDelBolsillo(arcade), valor);
      return;
    }
    await SecureStore.setItemAsync(llaveDelBolsillo(arcade), valor);
  } catch {
    /*
     * Modo privado, almacén lleno, o un dispositivo sin llavero. Se pierde la
     * sesión al recargar y se vuelve al comportamiento de antes, que es exactamente
     * lo que hay que hacer: no se puede impedir jugar por no poder recordar.
     */
  }
}

/** Dónde estábamos sentados, o `null` si no hay nada guardado o no se puede leer. */
export async function elSitioGuardado(arcade: string): Promise<SitioGuardado | null> {
  let crudo: string | null = null;
  try {
    crudo =
      Platform.OS === 'web'
        ? (globalThis.localStorage?.getItem(llaveDelBolsillo(arcade)) ?? null)
        : await SecureStore.getItemAsync(llaveDelBolsillo(arcade));
  } catch {
    return null;
  }
  if (crudo === null) return null;

  /*
   * Se parte por el PRIMER `:` y no por todos: el código de mesa no lleva ninguno,
   * pero la llave es opaca y un día podría llevarlos. Partir por todos convertiría
   * una llave con dos puntos en una llave truncada, y el síntoma sería un 403 que
   * nadie relacionaría con esto.
   */
  const corte = crudo.indexOf(':');
  if (corte <= 0 || corte === crudo.length - 1) return null;
  return { codigo: crudo.slice(0, corte), llave: crudo.slice(corte + 1) };
}

/**
 * ═══ Y LO SEGUNDO QUE ESTE BOLSILLO GUARDA: POR DÓNDE ESTABA MIRANDO ═══
 *
 * La hoja del Burgo tiene ocho secciones y sólo una abierta a la vez (§6.3 de
 * `docs/burgo/DISENO-2.md`). Cuál estaba abierta NO es estado del juego ni una
 * credencial: es dónde tenía puesto el ojo esta persona en ESTA mesa. Y se guarda
 * POR MESA y no por arcade, porque una partida de días se abre y se cierra muchas
 * veces y volver siempre a la primera sección obliga a buscar «Lo mío» cada vez,
 * mientras que dos mesas del mismo juego pueden estar en momentos distintos.
 *
 * Va aquí y no en un fichero nuevo porque lo que se comparte son las MISMAS veinte
 * líneas de fontanería de plataforma —`SecureStore` en el aparato, `localStorage`
 * en la web, todo envuelto en `try`— y no una sola decisión que pueda
 * desincronizarse: vocabulario, cero. Que un almacén seguro sea de sobra para una
 * preferencia de interfaz es cierto y no cuesta nada; la alternativa era estrenar
 * una dependencia de almacenamiento para guardar ocho letras.
 *
 * Un valor que no se pueda leer, o que ya no sea una sección conocida, deja la
 * hoja como estaba: quien llama decide qué abre por defecto.
 */
function llaveDeLaSeccion(arcade: string, codigo: string): string {
  return `arcade.seccion.${arcade}.${codigo}`;
}

/** Recuerda qué sección de la hoja estaba abierta en esta mesa. */
export async function guardarLaSeccion(arcade: string, codigo: string, seccion: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(llaveDeLaSeccion(arcade, codigo), seccion);
      return;
    }
    await SecureStore.setItemAsync(llaveDeLaSeccion(arcade, codigo), seccion);
  } catch {
    /* Modo privado o almacén lleno: la hoja abre por donde diga quien llama. */
  }
}

/** Qué sección estaba abierta en esta mesa, o `null` si no hay nada guardado. */
export async function laSeccionGuardada(arcade: string, codigo: string): Promise<string | null> {
  try {
    return Platform.OS === 'web'
      ? (globalThis.localStorage?.getItem(llaveDeLaSeccion(arcade, codigo)) ?? null)
      : await SecureStore.getItemAsync(llaveDeLaSeccion(arcade, codigo));
  } catch {
    return null;
  }
}

/**
 * Olvida el sitio. Lo llaman TIRAR la mesa —tras la que no queda mesa a la que
 * volver— y el descubrir que la llave ya no vale.
 *
 * NO lo llama «salir», y eso es lo contrario de lo que decía esta línea: salir
 * cierra la pantalla y te deja el asiento. Olvidarlo ahí costaba la partida,
 * porque volver a entrar con el código pide silla NUEVA —y con la partida ya
 * empezada el servidor contesta 409—.
 */
export async function olvidarElSitio(arcade: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.removeItem(llaveDelBolsillo(arcade));
      return;
    }
    await SecureStore.deleteItemAsync(llaveDelBolsillo(arcade));
  } catch {
    /* Ídem: no poder olvidar no puede impedir salir. */
  }
}
