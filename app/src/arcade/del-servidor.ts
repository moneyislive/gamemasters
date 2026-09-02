/**
 * EL CATÁLOGO DE ARCADES QUE MANDA EL SERVIDOR, y el juicio de qué se puede
 * jugar CON ESTE BINARIO.
 *
 * ═══ POR QUÉ EXISTE ESTE FICHERO ═══
 *
 * La Sala de la portada se componía de `arcadesInstalados()`, o sea del registro
 * que se llena importando `shared/arcade/juegos`: los que vienen DENTRO de la
 * app. Un arcade instalado sólo en el servidor con `ARCADES_EXTERNOS` no salía,
 * y sólo se llegaba a él por enlace directo — que es tanto como decir que no se
 * llegaba. La última cabecera de `pintados.ts` dejó el encargo escrito: leer el
 * catálogo del servidor, «y eso es una pantalla asíncrona con su modo sin red».
 *
 * ═══ Y POR QUÉ ES UN FICHERO PURO, SIN UN SOLO `import` DE EJECUCIÓN ═══
 *
 * Porque el juicio de abajo es la parte que se puede equivocar en silencio, y la
 * única forma de comprobarlo es EJECUTARLO. Si este módulo importara
 * `pintados.ts` —que trae dentro componentes de React Native y de Skia— ningún
 * comprobador de Node podría cargarlo, y acabaríamos con una regla de nueve
 * ramas verificada leyendo. Lo que este fichero necesita saber del binario
 * —qué muebles conoce, cuáles pinta, qué juegos trae— ENTRA POR PARÁMETRO, y se
 * lo pasa `vitrina.ts` desde las tablas de verdad.
 *
 * Es la misma disciplina que `servidor-elegido.ts` y `arcade/relojes.ts`, y por
 * el mismo motivo.
 */
import type { ManifiestoDeArcade, MuebleDeArcade } from '../../../shared/arcade';

/**
 * Lo que viene en el catálogo: el manifiesto y un campo que no está en él.
 *
 * `publicaOpciones` NO puede vivir en el manifiesto y por eso viaja aparte: el
 * manifiesto dice CON QUÉ se pinta un juego, no si el juego registró la función
 * que le da a ese mueble algo que pintar. Lo añade la ruta del catálogo
 * preguntándole a `hayOpciones()`, que consulta un registro que vive en el
 * proceso del servidor — y con `ARCADES_EXTERNOS` puede vivir SÓLO allí.
 *
 * Opcional a propósito: un servidor más viejo que este binario no lo manda, y
 * `undefined` NO ES `false`. No es «no publica nada»: es «este servidor no lo ha
 * dicho», y las dos cosas se contestan distinto.
 */
export type ArcadeDelCatalogo = ManifiestoDeArcade & { publicaOpciones?: boolean };

/**
 * LO QUE ESTE BINARIO SABE PINTAR, inyectado.
 *
 * Tres listas y no una porque son tres preguntas distintas, y confundirlas es
 * justo lo que apagaría un juego bueno:
 *
 *   · `juegos` — los arcades con pintor PROPIO dentro del binario. Que uno esté
 *     aquí gana a todo lo demás.
 *   · `muebles` — los muebles que este binario conoce Y sabe pintar.
 *   · `genericos` — los muebles que sabe pintar SIN conocer el juego.
 */
export interface LoQuePintaEsteBinario {
  readonly juegos: readonly string[];
  readonly muebles: readonly string[];
  /**
   * Los muebles que EL CONTRATO dice que pinta la plataforma, los pinte ya esta
   * versión o no.
   *
   * Separado de `genericos` porque son dos preguntas y la Sala las contesta
   * distinto, y fundirlas fue un fallo de verdad que cazó el comprobador: con una
   * sola lista, un `formulario` de un arcade de fuera —mueble genérico del
   * contrato que esta app todavía no pinta— salía como «sus píxeles viven en su
   * binario», que es falso y además manda a esperar algo que nunca va a pasar. Lo
   * que le pasa es que falta el pincel aquí, y eso llega con una versión nueva sin
   * que el juego haga nada.
   */
  readonly genericosDelContrato: readonly string[];
  /** Y los que esta versión pinta de verdad sin conocer el juego. */
  readonly genericos: readonly string[];
}

/**
 * ¿SE PUEDE JUGAR AQUÍ, Y SI NO, POR QUÉ NO?
 *
 * Unión cerrada y con el motivo dentro: una tarjeta apagada sin explicación es
 * la misma mentira que una tarjeta muerta, sólo que más callada.
 */
export type DondeSePinta =
  | { aqui: true; porComponentePropio: boolean }
  | {
      aqui: false;
      razon:
        | 'mueble-desconocido'
        | 'mueble-sin-pincel'
        | 'pixeles-en-el-binario'
        | 'ni-mesa-ni-reductor'
        | 'no-publica-nada'
        | 'el-servidor-no-lo-dice';
      porque: string;
    };

/**
 * EL JUICIO. Seis preguntas EN ESTE ORDEN, y el orden es la mitad de la regla.
 *
 * ═══ POR QUÉ EL COMPONENTE PROPIO VA EL PRIMERO ═══
 *
 * Porque si no, se apaga «La Frente», que es el arcade insignia de esta app.
 *
 * No es una hipótesis: `GET /api/arcade` publica hoy `publicaOpciones: false`
 * para La Frente, El Arcade y La Peonza, porque ninguno de los tres registra
 * `opciones()` — y no les falta, pintan su propia pantalla. Un juicio que
 * preguntara «¿publica algo?» antes que «¿lo traigo dentro?» apagaría las tres
 * tarjetas con una frase perfectamente razonada y perfectamente falsa.
 *
 * El cliente de escritorio hace las mismas preguntas en OTRO orden y también
 * acierta, porque allí la primera es «¿hay mesa?» y La Frente sale por ahí. Aquí
 * esa pregunta no vale: `sede: 'dispositivo'` en la app SÍ se juega —el reductor
 * está en este binario y no hace falta ninguna mesa—, que es la diferencia de
 * fondo entre los dos clientes. Copiar el orden del otro es el error que este
 * comentario existe para impedir.
 *
 * ═══ Y POR QUÉ NINGUNA BÚSQUEDA EN TABLA SE HACE SIN GUARDIA ═══
 *
 * Porque lo que entra aquí viene POR LA RED. `MuebleDeArcade` es una unión
 * cerrada, así que TypeScript cree que `MUEBLES[m.mueble]` siempre existe y no
 * pide comprobarlo —`noUncheckedIndexedAccess` sólo actúa sobre firmas de
 * índice, no sobre claves finitas—. En ejecución, un servidor más nuevo que este
 * empaquetado manda un mueble que no está en la tabla, el índice da `undefined`
 * y el `.seSabePintar` de después revienta. Y como esto se evalúa al componer la
 * lista, no revienta una tarjeta: revienta LA PORTADA ENTERA, antes de que
 * exista ninguna. El contrato ya lo tiene escrito en `shared/arcade/tipos.ts`
 * con este mismo nombre.
 *
 * Por eso aquí se pregunta con `includes` sobre listas de cadenas y no se
 * indexa nada.
 */
export function dondeSePinta(
  arcade: ArcadeDelCatalogo,
  binario: LoQuePintaEsteBinario,
): DondeSePinta {
  /* 1. ¿Lo traigo dentro con pintor propio? Gana a todo, y su `sede` da igual. */
  if (binario.juegos.includes(arcade.id)) return { aqui: true, porComponentePropio: true };

  const mueble = String(arcade.mueble);

  /* 2. ¿Conozco siquiera ese mueble? */
  if (!binario.muebles.includes(mueble)) {
    return {
      aqui: false,
      razon: 'mueble-desconocido',
      porque:
        `Esta versión de la app no conoce el mueble «${mueble}». El servidor va por delante ` +
        'del teléfono: actualiza la app y aparecerá.',
    };
  }

  /*
   * 3. ¿ES DE LOS QUE PINTA LA PLATAFORMA? Y si no, es un «nunca por esta vía».
   *
   * Un mueble PROPIO —`lienzo`, `escena`— no tendrá pintor genérico jamás, y no
   * por falta de tiempo: es la decisión del §7, el enchufe alcanza a las reglas y
   * no a los píxeles. Un juego así sólo se puede jugar si viene DENTRO, y la
   * pregunta 1 ya ha dicho que no viene.
   *
   * Y la frase no puede ser «se juega en la app», que es lo que dice el cliente
   * de escritorio para este mismo caso: esto ES la app. Mandar a alguien a donde
   * ya está es la peor clase de mensaje honrado.
   */
  if (!binario.genericosDelContrato.includes(mueble)) {
    return {
      aqui: false,
      razon: 'pixeles-en-el-binario',
      porque:
        'Este juego dibuja sus propios píxeles y viven dentro de la app. Hace falta una ' +
        'versión más nueva para que venga con ellos.',
    };
  }

  /*
   * 4. ¿LO PINTA ESTA VERSIÓN? Y si no, es un «todavía no», que es otra cosa.
   *
   * El mueble está en el contrato y la plataforma es quien lo pinta, pero este
   * binario aún no trae ese pincel. Llegará con una versión nueva y el juego no
   * tiene que cambiar nada, que es justo lo contrario del caso de arriba.
   *
   * HOY NO LE PASA A NINGUNO, y conviene decirlo porque durante un tiempo le pasó
   * a `formulario` —y eso significaba que un arcade de fuera de formulario se
   * jugaba en el PC y no aquí, que es la regla de la casa rota—. Esta rama se
   * queda: el contrato tiene cuatro muebles y el día que entre un quinto, entra
   * por aquí y con una frase que no culpa al juego.
   */
  if (!binario.genericos.includes(mueble)) {
    return {
      aqui: false,
      razon: 'mueble-sin-pincel',
      porque:
        `Este juego se pinta con «${mueble}», y esta versión de la app todavía no lo pinta ` +
        'sin conocer el juego. No le falta nada al juego: le falta a la app.',
    };
  }

  /* 5. ¿Hay dónde jugar? Sin pintor propio, el reductor no está aquí. */
  if (arcade.sede === 'dispositivo') {
    return {
      aqui: false,
      razon: 'ni-mesa-ni-reductor',
      porque:
        'Este juego corre dentro del aparato, y sus reglas no vienen en esta versión de la ' +
        'app. En el servidor no hay ninguna mesa a la que sentarse.',
    };
  }

  /* 6. ¿Tiene algo declarado que un mueble genérico pueda pintar? */
  if (mueble === 'tablero') return { aqui: true, porComponentePropio: false };

  if (arcade.publicaOpciones === true) return { aqui: true, porComponentePropio: false };

  /*
   * `undefined` NO se contesta como `false`. Un servidor más viejo que este
   * binario no manda el campo, y desde aquí no se sabe si el juego publica algo
   * o no. No saber se dice; fingir que se sabe es de las dos la mentira.
   */
  if (arcade.publicaOpciones === undefined) {
    return {
      aqui: false,
      razon: 'el-servidor-no-lo-dice',
      porque:
        'Este servidor no dice si el juego publica algo que se pueda pintar, así que desde ' +
        'aquí no se sabe si se podría jugar.',
    };
  }

  return {
    aqui: false,
    razon: 'no-publica-nada',
    porque:
      'Este juego usa un mueble que se pinta con la lista de lo que se puede hacer, y no ' +
      'publica ninguna. No es que falte esta pantalla: es que no hay nada que enseñar.',
  };
}

// ---------------------------------------------------------------------------
// LO QUE LLEGA POR EL CABLE
// ---------------------------------------------------------------------------

/**
 * ¿ESTO TIENE FORMA DE CATÁLOGO? Devuelve la lista, o `null` si no.
 *
 * ═══ SE VALIDA EL CONTENIDO Y NO SÓLO EL CONTINENTE ═══
 *
 * El cliente de escritorio comprueba `Array.isArray(datos.arcades)` y firma el
 * resto con un `as`. Allí cuesta poco —sólo lee `mueble`, y a la defensiva—;
 * aquí no vale, porque estos objetos acaban en `<Text>{nombre}</Text>` y en una
 * tabla de iconos. Un `nombre` que fuera un objeto lanza «Objects are not valid
 * as a React child» DURANTE el render, y esta pantalla no tiene `ErrorBoundary`:
 * el throw desmonta la raíz y deja el teléfono en blanco.
 *
 * Así que se miran los cuatro campos que la portada pinta o indexa, y lo que no
 * los tenga se descarta ENTERO. Descartar una tarjeta es un juego que no sale;
 * dejarla pasar es la app que no abre.
 *
 * Lo que NO se valida y no hace falta: `jugadores`, `tickHz`, `secretos` y demás
 * no los toca esta pantalla. Validarlos aquí sería copiar
 * `problemasDelManifiesto` a mano y quedarse desincronizado con él.
 */
export function loQueLlega(cuerpo: unknown): ArcadeDelCatalogo[] | null {
  if (typeof cuerpo !== 'object' || cuerpo === null) return null;
  const lista = (cuerpo as { arcades?: unknown }).arcades;
  if (!Array.isArray(lista)) return null;

  const buenos: ArcadeDelCatalogo[] = [];
  for (const suelto of lista) {
    if (typeof suelto !== 'object' || suelto === null) continue;
    const m = suelto as Partial<ArcadeDelCatalogo>;
    if (typeof m.id !== 'string' || m.id.length === 0) continue;
    if (typeof m.nombre !== 'string' || m.nombre.length === 0) continue;
    if (typeof m.gancho !== 'string') continue;
    if (typeof m.mueble !== 'string') continue;
    if (m.sede !== 'dispositivo' && m.sede !== 'servidor') continue;
    buenos.push(m as ArcadeDelCatalogo);
  }
  return buenos;
}

// ---------------------------------------------------------------------------
// LOS TRES MOMENTOS DE LA PANTALLA
// ---------------------------------------------------------------------------

/** Lo que se sabe del catálogo del servidor en cada instante. */
export type EstadoDelCatalogo =
  | { que: 'pidiendo' }
  | { que: 'puesto'; arcades: readonly ArcadeDelCatalogo[] }
  | { que: 'sin-servidor' };

/**
 * QUÉ SE ENSEÑA, fusionando lo que trae el binario con lo que dice el servidor.
 *
 * ═══ SE FUSIONA SIEMPRE, Y LO COMPILADO ES UN SUELO QUE NO SE QUITA ═══
 *
 * Las otras dos formas de hacer esto están mal, y conviene dejar dicho por qué
 * para que nadie las «arregle» de vuelta:
 *
 *   · ESPERAR AL SERVIDOR rompe la regla de la portada por omisión. La Frente,
 *     El Arcade y La Peonza corren dentro del aparato y se juegan en el metro,
 *     sin cobertura. Enseñar «no hay nada» teniendo tres cosas jugables a mano
 *     es tan mentira como una caja muerta.
 *   · SUSTITUIR lo compilado por lo del servidor borraría de la pantalla un
 *     arcade que sí se puede jugar, sólo porque una respuesta no habla de él.
 *
 * Fusionar es además UNA SOLA REGLA en los tres momentos: antes de contestar, la
 * mitad de servidor está vacía y sale lo compilado; si no contesta nunca, se
 * queda eso; cuando contesta, la unión. No hay transición ni parpadeo.
 *
 * La unión es POR `id` y gana lo compilado, que es lo que hay que hacer cuando
 * los dos hablan del mismo juego: el binario sabe su paleta, su pintor y su
 * ruta, y el servidor sólo su manifiesto.
 */
export function queSeEnsena(
  estado: EstadoDelCatalogo,
  delBinario: readonly ArcadeDelCatalogo[],
): { arcades: ArcadeDelCatalogo[]; sinServidor: boolean } {
  const fusionados = [...delBinario];
  const vistos = new Set(delBinario.map((m) => m.id));

  if (estado.que === 'puesto') {
    for (const suyo of estado.arcades) {
      if (vistos.has(suyo.id)) continue;
      vistos.add(suyo.id);
      fusionados.push(suyo);
    }
  }

  return { arcades: fusionados, sinServidor: estado.que === 'sin-servidor' };
}
