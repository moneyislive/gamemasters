/**
 * EL PASEO COMÚN, MEDIDO.
 *
 *   npm run verify:paseo -w escenas
 *
 * ═══ POR QUÉ HACE FALTA, SI EL PASO YA LO MIDE `verify:mundo` ═══
 *
 * `verify:mundo` mide el PASO: que la arena para a quien anda en los mismos sitios en Node y en
 * Hermes. Lo que no mira nadie es lo que hay entre ese paso y la pantalla, y ahí es donde se
 * rompía el paseo sin dar un error: un paso por fotograma en vez de por tic, teclas que en el
 * móvil no existen, una marioneta que corría con las piernas de andar y andaba contra las
 * paredes. Esto mide esa capa, sin `three` y sin WebGL:
 *
 *  1. EL RELOJ. `N` fotogramas dan exactamente `⌊total / tic⌋` tics, y ninguno más de cinco.
 *  2. LA INTERPOLACIÓN. Lo que se pinta está siempre entre el tic anterior y el último, a la
 *     fracción del reloj, y nunca por delante.
 *  3. LAS TECLAS Y LA PALANCA. Lo que se pulsa da el rumbo y la marcha que tiene que dar; hacia
 *     atrás es media vuelta, `+128`, y anda de verdad hacia atrás.
 *  4. LOS CHOQUES. Contra un cuerpo del mundo se para sin meterse, y de lado resbala.
 *  5. LA MARIONETA. Quieta contra la pared aunque se pulse, corriendo al correr, y con el clip a
 *     la velocidad del suelo.
 *  6. LA COSTURA CON LA RED. Un aviso por tic con lo pedido, que basta para rehacer el camino;
 *     y una corrección que no se pinta como un salto a la carrera.
 *  7. NACER. Nadie se queda encerrado dentro de una caja; y si acaba dentro de algo por otra puerta,
 *     el primer tic lo saca (no se queda clavado, como se vio en el Burgo el 27-sep-2026).
 *  7b. UN PASO NO SALTA RENDIJAS: entre dos esquinas más juntas que quien anda no se pasa, ni en una
 *     prueba ni junto a las torres del centro del Burgo de verdad.
 *  7c. LA CÁMARA NO SE QUEDA DETRÁS DEL ADORNO: una señal o un semáforo declarados la acercan, por
 *     debajo del brazo de un semáforo no, y en el Burgo ABCD con su adorno ninguno se le pone delante.
 *  7d. EL ADORNO CHOCA (`paseo-con-adorno.ts`): por el poste de un semáforo sí y bajo su brazo no, lo
 *     que se pisa no, nadie nace ni queda encerrado en el adorno de los tres mundos, del adorno se sale
 *     andando por donde el servidor acepta, a los brotes se llega, y la cámara ya no da el tirón.
 *  8. EL GOLPE Y EL SUELO. La G golpea y no se come la de un campo de texto; un toque es un golpe,
 *     en el primer tic que se dé y en uno solo; y en el suelo no se da ni un tic.
 *  9. EL MONTAJE. Que la escena y la app usan esto y no otra cosa: se mira en el fuente, que es
 *     lo único que hay sin WebGL.
 *
 * Cada comprobación lleva su vacuna: una cuenta hecha a propósito del revés tiene que salir
 * roja, o la comprobación no está mirando lo que dice.
 */
import fs from 'node:fs';
import {
  ANDANDO,
  CORRIENDO,
  pasoDelTic,
  QUIETO,
  RADIO_DEL_PASEANTE,
  RUMBOS,
  rumboDeRadianes,
  rumboValido,
  TICS_POR_SEGUNDO,
  VELOCIDAD_ANDANDO,
  VELOCIDAD_CORRIENDO,
} from '../../shared/mecanicas/andar';
import type { Marcha } from '../../shared/mecanicas/andar';
import { aNumero, deNumero } from '../../shared/mecanicas/fijo';
import { arenaDe, seAndaEnRecta, sePuedeEstar } from '../../shared/mecanicas/mundo';
import type { Andante, Arena, Casilla, Cuerpo, MundoDeclarado } from '../../shared/mecanicas/mundo';
import { mundoDelBurgo } from '../../shared/arcade/juegos/burgo-mundo';
import { acercarElHombro, camaraDeHombro, hastaDondeCabeElHombro, hastaDondeNoTapa, LO_QUE_HAY_QUE_VER } from '../paseo/camaras';
import { estorbosDePiezas, indiceDeEstorbos, rodajasDeUnaMalla, SIN_ESTORBOS, tapaLaVista } from '../paseo/estorbos';
import type { Estorbo } from '../paseo/estorbos';
import { ciudadDelCodigo } from '../burgo/ciudad';
import { estorbosDelBurgo } from '../burgo/estorbos-del-burgo';
import { estorbosDelDelta } from '../estorbos-del-delta';
import { CLIP } from '../embarcadero/figuras';
import {
  COMO_SE_GOLPEA,
  GIRO_POR_SEGUNDO,
  girar,
  golpesVistosTras,
  mandosDelFotograma,
  pedidoDelTic,
  SIN_MANDOS,
  SIN_MANDOS_DE_FUERA,
  SIN_TECLAS,
  esTeclaDeOtro,
  esUnGolpe,
  TECLA_DE_GOLPEAR,
  teclaDelPaseo,
  TOPE_DEL_GIRO,
  ZONA_MUERTA,
} from '../paseo/mandos';
import type { DestinoDeLaTecla, EntradaDelTic, MandoDeLaTecla, Mandos, MandosDeFuera, Teclas } from '../paseo/mandos';
import {
  corregirElPaseo,
  fotogramaDelPaseo,
  fotogramaDeQuienPasea,
  MICROS_POR_TIC,
  mudarDeMundo,
  nacerEnElPaseo,
  poseDelPaseo,
  ticDelPaseo,
  ticsDelFotograma,
  TOPE_DE_TICS_POR_FOTOGRAMA,
} from '../paseo/paseante';
import type { EstadoDelPaseo } from '../paseo/paseante';
import { clipDelPaso, CORRE_A_PARTIR_DE, ritmoDelClip, ZANCADA_DE_ANDAR, ZANCADA_DE_CORRER } from '../paseo/zancada';
import { TALLA_A_PIE } from '../paseo/talla';
import { medirElAdornoQueChoca } from './paseo-con-adorno';
import { medirLaTallaAPie } from './talla-a-pie';

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 300)}`}`);
}
function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

/** Un sorteo sembrado, para que los tirones de reloj sean los mismos en cada pasada. */
function sorteo(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ─── Un mundo de prueba: siete por siete casillas de diez, y lo que se le ponga ─── */

const LADO = 10;

function mundoDePrueba(cuerpos: readonly Cuerpo[], vados: readonly Casilla[] = []): MundoDeclarado {
  const pisables: Casilla[] = [];
  for (let x = -3; x <= 3; x++) for (let y = -3; y <= 3; y++) pisables.push({ x, y });
  return { lado: LADO, pisables, vados, cuerpos, nace: [{ x: 0, z: 0, rumbo: 0 }] };
}

/** Una muralla al norte de donde se nace: de −30 a 30 en `x`, de −12 a −10 en `z`. */
const MURALLA: Cuerpo = { x0: -30, z0: -12, x1: 30, z1: -10 };

const ABIERTO = arenaDe(mundoDePrueba([]));
const CON_MURALLA = arenaDe(mundoDePrueba([MURALLA]));

/** Andando y corriendo, con su tipo: una lista suelta de las dos sale `number[]`. */
const LAS_DOS_MARCHAS: readonly Marcha[] = [ANDANDO, CORRIENDO];

const ADELANTE: Teclas = { ...SIN_TECLAS, adelante: true };
const ATRAS: Teclas = { ...SIN_TECLAS, atras: true };

/** Mandos de sólo teclado. */
function conTeclas(t: Teclas): Mandos {
  return mandosDelFotograma(t, SIN_MANDOS_DE_FUERA);
}

/** Da `n` fotogramas de `dt` con los mismos mandos, y devuelve el estado y los sitios de cada tic. */
function andar(
  arena: Arena,
  desde: EstadoDelPaseo,
  mandos: Mandos,
  n: number,
  dt = 1 / 60,
): { estado: EstadoDelPaseo; sitios: Andante[] } {
  let e = desde;
  const sitios: Andante[] = [];
  const apunta = (_: EntradaDelTic, s: Andante): void => {
    sitios.push(s);
  };
  for (let i = 0; i < n; i++) e = fotogramaDelPaseo(arena, e, dt, mandos, apunta);
  return { estado: e, sitios };
}

// ---------------------------------------------------------------------------
paso('El reloj: los fotogramas se cuentan en tics enteros, y ninguno da más de cinco');
// ---------------------------------------------------------------------------

/*
 * ═══ LO QUE ESTO CIERRA ═══
 *
 * El paseo de antes daba un paso por fotograma con el `dt` que tocara: a 30 fotogramas por
 * segundo se andaba a zancadas del doble que a 60, y ningún otro aparato podía repetir el
 * camino. Ahora se anda por tics, y lo que hay que prometer es que el reloj no pierde ni inventa
 * ninguno, ni en los ritmos de pantalla de siempre ni a tirones.
 */
{
  const aTirones = sorteo(0x7ac1);
  const RITMOS: readonly (readonly [string, readonly number[]])[] = [
    ['60 por segundo', new Array<number>(600).fill(1 / 60)],
    ['30 por segundo', new Array<number>(300).fill(1 / 30)],
    ['144 por segundo', new Array<number>(1440).fill(1 / 144)],
    ['una vigésima justa', new Array<number>(120).fill(0.05)],
    ['a tirones, entre 4 y 70 ms', Array.from({ length: 900 }, () => 0.004 + aTirones() * 0.066)],
  ];
  for (const [nombre, dts] of RITMOS) {
    let sobra = 0;
    let tics = 0;
    let micros = 0;
    let fueraDeRango = 0;
    for (const dt of dts) {
      const r = ticsDelFotograma(sobra, dt);
      sobra = r.sobra;
      tics += r.tics + r.tirados;
      micros += Math.round(dt * 1_000_000);
      if (r.sobra < 0 || r.sobra >= MICROS_POR_TIC || r.tirados !== 0) fueraDeRango++;
    }
    const esperados = Math.floor(micros / MICROS_POR_TIC);
    console.log(`  a ${nombre}: ${String(dts.length)} fotogramas, ${String(tics)} tics`);
    comprobar(`a ${nombre}, ${dts.length} fotogramas dan ⌊total / tic⌋ tics, ni uno más ni uno menos`, tics === esperados, {
      tics,
      esperados,
    });
    comprobar(`y a ${nombre} lo que sobra es siempre menos de un tic, sin tirar ninguno`, fueraDeRango === 0, {
      fueraDeRango,
    });
  }

  /*
   * ═══ NI MÁS DE CINCO POR FOTOGRAMA ═══
   *
   * Un fotograma de dos segundos —la pestaña oculta, el bucle bajado a uno por segundo— pediría
   * cuarenta tics. Se dan cinco y el resto se tira; lo que sobra sigue siendo menos de un tic.
   */
  const largo = ticsDelFotograma(0, 2);
  comprobar(
    'el tope no pasa de un cuarto de segundo: más allá, un tirón de reloj ya es un salto que se ve',
    TOPE_DE_TICS_POR_FOTOGRAMA >= 1 && TOPE_DE_TICS_POR_FOTOGRAMA * MICROS_POR_TIC <= 250_000,
    { tope: TOPE_DE_TICS_POR_FOTOGRAMA },
  );
  comprobar(
    `un fotograma de dos segundos da ${TOPE_DE_TICS_POR_FOTOGRAMA} tics y tira el resto, en vez de teletransportar`,
    largo.tics === TOPE_DE_TICS_POR_FOTOGRAMA && largo.tics + largo.tirados === 40 && largo.sobra < MICROS_POR_TIC,
    largo,
  );
  let peorFotograma = 0;
  const salvaje = sorteo(0xbad);
  let sobra = 0;
  for (let i = 0; i < 2000; i++) {
    const r = ticsDelFotograma(sobra, salvaje() * 3);
    sobra = r.sobra;
    if (r.tics > peorFotograma) peorFotograma = r.tics;
  }
  comprobar('con fotogramas de hasta tres segundos, ninguno da más del tope', peorFotograma === TOPE_DE_TICS_POR_FOTOGRAMA, {
    peorFotograma,
  });
  const raros = [Number.NaN, -0.5, 0, Number.POSITIVE_INFINITY].map((dt) => ticsDelFotograma(100, dt));
  comprobar(
    'y un `dt` que no es un número positivo no da ningún tic ni mueve el reloj',
    raros.every((r) => r.tics === 0 && r.sobra === 100),
    raros,
  );

  /*
   * ═══ LA VACUNA: POR QUÉ EL RELOJ CUENTA MICROSEGUNDOS ═══
   *
   * La misma cuenta en segundos de coma flotante —sumar el `dt` y mirar `⌊suma / 0,05⌋`— se
   * equivoca en seiscientos fotogramas a 60 por segundo: seis de 1/60 suman
   * 0,09999999999999999 y dan UN tic donde había dos. Si esto saliera en verde, la comprobación
   * de arriba no distinguiría un reloj entero de uno que pierde tics.
   */
  let enSegundos = 0;
  let equivocados = 0;
  for (let n = 1; n <= 600; n++) {
    enSegundos += 1 / 60;
    if (Math.floor(enSegundos / 0.05) !== Math.floor(n / 3)) equivocados++;
  }
  console.log(`  la cuenta en segundos se equivoca en ${String(equivocados)} de 600 fotogramas a 60 por segundo`);
  comprobar('y la cuenta en segundos SÍ pierde tics: por eso el reloj es entero', equivocados > 100, { equivocados });
}

// ---------------------------------------------------------------------------
paso('La interpolación: se pinta entre el tic anterior y el último, y nunca por delante');
// ---------------------------------------------------------------------------

/*
 * Un paseo en diagonal, a tirones de reloj, por un suelo abierto. En cada fotograma se mira que
 * lo pintado sea EXACTAMENTE el punto del segmento entre los dos últimos tics a la fracción del
 * reloj, que esos dos tics sean los que se dieron —apuntados uno a uno por la costura de la
 * red—, y que lo pintado no adelante nunca al último.
 */
{
  const tirones = sorteo(0x1e7e);
  const diagonal = conTeclas(ADELANTE);
  let e = nacerEnElPaseo(ABIERTO, { x: -20, z: 20, rumbo: Math.PI / 4 });
  const sitios: Andante[] = [e.ahora];
  let fuera = 0;
  let noEsElTic = 0;
  let porDelante = 0;
  let haciaAtras = 0;
  let recorridoAntes = 0;
  const inicio = { x: aNumero(e.ahora.x), z: aNumero(e.ahora.z) };
  /* Doscientos fotogramas son unos siete segundos: cuarenta unidades de diagonal, sin llegar al borde. */
  for (let i = 0; i < 200; i++) {
    e = fotogramaDelPaseo(ABIERTO, e, 0.004 + tirones() * 0.06, diagonal, (_, s) => {
      sitios.push(s);
    });
    const p = poseDelPaseo(e);
    const alfa = e.sobra / MICROS_POR_TIC;
    const a = sitios[e.tic - 1] ?? sitios[0];
    const b = sitios[e.tic];
    if (a === undefined || b === undefined || e.antes !== a || e.ahora !== b) noEsElTic++;
    const x = aNumero(e.antes.x) + (aNumero(e.ahora.x) - aNumero(e.antes.x)) * alfa;
    const z = aNumero(e.antes.z) + (aNumero(e.ahora.z) - aNumero(e.antes.z)) * alfa;
    if (alfa < 0 || alfa >= 1 || Math.abs(p.x - x) > 1e-9 || Math.abs(p.z - z) > 1e-9) fuera++;
    /* Nunca por delante: lo pintado no ha recorrido más que el último tic. */
    const recorrido = Math.hypot(p.x - inicio.x, p.z - inicio.z);
    const hastaElTic = Math.hypot(aNumero(e.ahora.x) - inicio.x, aNumero(e.ahora.z) - inicio.z);
    if (recorrido > hastaElTic + 1e-9) porDelante++;
    if (recorrido < recorridoAntes - 1e-9) haciaAtras++;
    recorridoAntes = recorrido;
  }
  comprobar('en 200 fotogramas a tirones se dieron tics, y cada uno quedó apuntado', e.tic > 100 && sitios.length === e.tic + 1, {
    tics: e.tic,
    apuntados: sitios.length - 1,
  });
  comprobar('lo que se pinta está siempre en el segmento entre los dos últimos tics, a la fracción del reloj', fuera === 0, {
    fuera,
  });
  comprobar('y esos dos son los dos últimos tics que se dieron, no otros', noEsElTic === 0, { noEsElTic });
  comprobar('y nunca va por delante del último tic: interpolar no inventa', porDelante === 0, { porDelante });
  comprobar('y andando recto, lo pintado no da un paso atrás entre fotogramas', haciaAtras === 0, { haciaAtras });

  /*
   * LA VACUNA: pintar un tic por delante —extrapolar, que es lo que haría quien quisiera
   * «quitar el retraso»— tiene que salir por delante del último tic. Si no, la comprobación de
   * arriba no estaría mirando nada.
   */
  let extrapolados = 0;
  const f = nacerEnElPaseo(ABIERTO, { x: 0, z: 0, rumbo: 0 });
  let g = f;
  for (let i = 0; i < 30; i++) {
    g = fotogramaDelPaseo(ABIERTO, g, 1 / 60, diagonal);
    const alfa = g.sobra / MICROS_POR_TIC;
    const zDelante = aNumero(g.ahora.z) + (aNumero(g.ahora.z) - aNumero(g.antes.z)) * alfa;
    if (alfa > 0 && zDelante < aNumero(g.ahora.z)) extrapolados++;
  }
  comprobar('y pintando un tic por delante, sí se pasa del último: la guarda distingue', extrapolados > 5, { extrapolados });
}

// ---------------------------------------------------------------------------
paso('Las teclas y la palanca dan el rumbo y la marcha que tienen que dar');
// ---------------------------------------------------------------------------

{
  const TECLAS: readonly (readonly [string, MandoDeLaTecla | null])[] = [
    ['w', 'adelante'],
    ['W', 'adelante'],
    ['ArrowUp', 'adelante'],
    ['s', 'atras'],
    ['S', 'atras'],
    ['ArrowDown', 'atras'],
    ['a', 'izquierda'],
    ['ArrowLeft', 'izquierda'],
    ['d', 'derecha'],
    ['D', 'derecha'],
    ['ArrowRight', 'derecha'],
    ['Shift', 'deprisa'],
    ['g', 'golpe'],
    ['G', 'golpe'],
    ['x', null],
    ['Enter', null],
    [' ', null],
  ];
  const malas = TECLAS.filter(([tecla, mando]) => teclaDelPaseo(tecla) !== mando).map(([tecla]) => tecla);
  comprobar('W A S D, las flechas y Mayúsculas van a su mando, y la G a golpear, también con Mayúsculas pulsada', malas.length === 0, malas);

  /*
   * Y NO SE QUEDA CON LO QUE VA A OTRO: escribiendo en un campo mientras se anda, W A S D y las
   * flechas son letras y cursor, no pasos; y con Ctrl, Alt o Meta son atajos.
   */
  const DE_OTRO: readonly [string, DestinoDeLaTecla | null, boolean, boolean][] = [
    ['un campo de texto', { tagName: 'INPUT' }, false, true],
    ['un área de texto', { tagName: 'textarea' }, false, true],
    ['un desplegable', { tagName: 'SELECT' }, false, true],
    ['algo editable', { tagName: 'DIV', isContentEditable: true }, false, true],
    ['Ctrl sobre el lienzo', { tagName: 'CANVAS' }, true, true],
    ['el lienzo', { tagName: 'CANVAS' }, false, false],
    ['el cuerpo del documento', { tagName: 'BODY' }, false, false],
    ['sin destino', null, false, false],
  ];
  const confundidas = DE_OTRO.filter(([, destino, mod, esperado]) => esTeclaDeOtro(destino, mod) !== esperado).map(
    ([que]) => que,
  );
  comprobar(
    'las teclas que van a un campo, a algo editable o con Ctrl/Alt/Meta son de otro; las del lienzo, del paseo',
    confundidas.length === 0,
    confundidas,
  );

  let pedidosMalos = 0;
  const ejemplos: unknown[] = [];
  for (let k = 0; k <= 36; k++) {
    const r = -Math.PI + (k * Math.PI * 2) / 36;
    const delante = rumboDeRadianes(r);
    const casos: readonly (readonly [string, Teclas, number, number])[] = [
      ['nada', SIN_TECLAS, delante, QUIETO],
      ['adelante', ADELANTE, delante, ANDANDO],
      ['adelante corriendo', { ...ADELANTE, deprisa: true }, delante, CORRIENDO],
      ['atrás', ATRAS, rumboValido(delante + 128), ANDANDO],
      ['atrás corriendo', { ...ATRAS, deprisa: true }, rumboValido(delante + 128), CORRIENDO],
      ['adelante y atrás a la vez', { ...ADELANTE, atras: true }, delante, QUIETO],
    ];
    for (const [nombre, teclas, rumbo, marcha] of casos) {
      const p = pedidoDelTic(conTeclas(teclas), r);
      if (p.rumbo !== rumbo || p.marcha !== marcha || !Number.isInteger(p.rumbo) || p.rumbo < 0 || p.rumbo >= RUMBOS) {
        pedidosMalos++;
        if (ejemplos.length < 3) ejemplos.push({ nombre, r, p, esperado: { rumbo, marcha } });
      }
    }
  }
  comprobar(
    'en 37 rumbos, cada combinación de teclas pide su rumbo entero y su marcha; hacia atrás, media vuelta (+128)',
    pedidosMalos === 0,
    ejemplos,
  );

  /*
   * Y HACIA ATRÁS SE ANDA HACIA ATRÁS DE VERDAD, no sólo en el número: un tic con W y otro con S,
   * mirando al este, van en sentidos contrarios del eje `x`. Es lo que faltaría si alguien se
   * dejara el `+128` por el camino: el número saldría bien en su tabla y el paseante avanzaría
   * pulsando atrás.
   */
  const alEste = nacerEnElPaseo(ABIERTO, { x: 0, z: 0, rumbo: Math.PI / 2 });
  const conW = ticDelPaseo(ABIERTO, alEste, pedidoDelTic(conTeclas(ADELANTE), Math.PI / 2));
  const conS = ticDelPaseo(ABIERTO, alEste, pedidoDelTic(conTeclas(ATRAS), Math.PI / 2));
  comprobar(
    'mirando al este, W anda hacia el este y S hacia el oeste, la misma distancia',
    conW.ahora.x > 0 && conS.ahora.x === -conW.ahora.x && conW.ahora.z === 0 && conS.ahora.z === 0,
    { conW: conW.ahora, conS: conS.ahora },
  );
  const alNorte = nacerEnElPaseo(ABIERTO, { x: 0, z: 0, rumbo: 0 });
  const alNorteConW = ticDelPaseo(ABIERTO, alNorte, pedidoDelTic(conTeclas(ADELANTE), 0));
  comprobar('y mirando al norte, W anda hacia la z negativa, que es el norte de la casa', alNorteConW.ahora.z < 0, alNorteConW.ahora);

  /* LA PALANCA: hacia delante anda, hacia atrás retrocede, y lo que cae en la zona muerta no hace nada. */
  const palanca = (x: number, y: number): Mandos => mandosDelFotograma(SIN_TECLAS, { palanca: { x, y }, deprisa: false, golpes: 0 });
  comprobar('la palanca hacia delante anda hacia delante', pedidoDelTic(palanca(0, 1), 0.3).marcha === ANDANDO && pedidoDelTic(palanca(0, 1), 0.3).rumbo === rumboDeRadianes(0.3));
  comprobar(
    'y hacia atrás retrocede, con la misma media vuelta que la S',
    pedidoDelTic(palanca(0, -1), 0.3).rumbo === rumboValido(rumboDeRadianes(0.3) + 128) && pedidoDelTic(palanca(0, -1), 0.3).marcha === ANDANDO,
  );
  comprobar(
    `y en la zona muerta —${String(ZONA_MUERTA)} de su recorrido— el pulgar descansa sin andar ni girar`,
    pedidoDelTic(palanca(ZONA_MUERTA * 0.9, ZONA_MUERTA * 0.9), 0).marcha === QUIETO && palanca(ZONA_MUERTA * 0.9, 0).giro === 0,
  );
  comprobar(
    'y el botón de correr de la app corre',
    pedidoDelTic(mandosDelFotograma(SIN_TECLAS, { palanca: { x: 0, y: 1 }, deprisa: true, golpes: 0 }), 0).marcha === CORRIENDO,
  );
  comprobar('y una palanca rota —sin número— no anda ni gira', pedidoDelTic(palanca(Number.NaN, Number.NaN), 0).marcha === QUIETO && palanca(Number.NaN, 0).giro === 0);

  /* EL GIRO: la derecha —tecla o palanca— lleva el rumbo hacia el este, y un tirón no da media vuelta. */
  const aLaDerecha = girar(0, conTeclas({ ...SIN_TECLAS, derecha: true }), 0.05);
  const conLaPalanca = girar(0, palanca(1, 0), 0.05);
  const aLaIzquierda = girar(0, conTeclas({ ...SIN_TECLAS, izquierda: true }), 0.05);
  comprobar(
    'la D y la palanca a la derecha giran hacia el este, lo mismo; la A hacia el oeste',
    aLaDerecha > 0 && Math.abs(conLaPalanca - aLaDerecha) < 1e-12 && Math.abs(aLaIzquierda + aLaDerecha) < 1e-12,
    { aLaDerecha, conLaPalanca, aLaIzquierda },
  );
  comprobar(
    'y un fotograma de dos segundos no gira más que el tope: un tirón no da media vuelta',
    Math.abs(girar(0, conTeclas({ ...SIN_TECLAS, derecha: true }), 2) - GIRO_POR_SEGUNDO * TOPE_DEL_GIRO) < 1e-12,
  );
  let fueraDeVuelta = 0;
  let r = 0;
  for (let i = 0; i < 5000; i++) {
    r = girar(r, conTeclas({ ...SIN_TECLAS, derecha: true }), 0.05);
    if (r > Math.PI || r <= -Math.PI) fueraDeVuelta++;
  }
  comprobar('y el rumbo se queda en una vuelta, por muchas que se den', fueraDeVuelta === 0, { fueraDeVuelta });
  comprobar('y sin mandos no gira ni anda', girar(1, SIN_MANDOS, 0.05) === 1 && pedidoDelTic(SIN_MANDOS, 1).marcha === QUIETO);
}

// ---------------------------------------------------------------------------
paso('Contra un cuerpo del mundo se para sin meterse, y de lado resbala');
// ---------------------------------------------------------------------------

/*
 * ═══ LO QUE ESTO CIERRA ═══
 *
 * El paso de Las Lindes sólo preguntaba si había losa: las casas y las murallas se atravesaban.
 * Aquí se anda contra una muralla de prueba con el paseo entero —mandos, reloj y tics— y se
 * mira cada tic: ninguno se mete, de frente se para, y en diagonal resbala a lo largo del muro
 * en vez de engancharse, que es la mitad de que andar se sienta bien.
 */
{
  const bordeDelMuro = deNumero(MURALLA.z1);
  const deFrente = andar(CON_MURALLA, nacerEnElPaseo(CON_MURALLA, { x: 0, z: 0, rumbo: 0 }), conTeclas(ADELANTE), 180);
  const dentro = deFrente.sitios.filter((s) => s.z - RADIO_DEL_PASEANTE < bordeDelMuro || !sePuedeEstar(CON_MURALLA, s.x, s.z, RADIO_DEL_PASEANTE));
  comprobar('de frente contra la muralla, ningún tic se mete en ella', dentro.length === 0 && deFrente.sitios.length > 40, {
    dentro: dentro.length,
    tics: deFrente.sitios.length,
  });
  const ultimos = deFrente.sitios.slice(-20);
  const quieto = ultimos.every((s) => s.x === ultimos[0]?.x && s.z === ultimos[0]?.z);
  const pegado = aNumero((ultimos[0]?.z ?? 0) - RADIO_DEL_PASEANTE - bordeDelMuro);
  console.log(`  de frente se para a ${pegado.toFixed(3)} de la cara de la muralla, contando su radio`);
  comprobar('y se queda pegado a ella, a menos de un paso, sin temblar', quieto && pegado >= 0 && pegado < 0.61, {
    pegado: pegado.toFixed(3),
    quieto,
  });

  /* Cuatro segundos: a 6 u/s en diagonal se llega a la muralla hacia el tic 46, y quedan treinta y tantos resbalando. */
  const enDiagonal = andar(CON_MURALLA, nacerEnElPaseo(CON_MURALLA, { x: 0, z: 0, rumbo: Math.PI / 4 }), conTeclas(ADELANTE), 240);
  const cola = enDiagonal.sitios.slice(-15);
  let resbalaMal = 0;
  for (let i = 1; i < cola.length; i++) {
    const a = cola[i - 1] as Andante;
    const b = cola[i] as Andante;
    /* Resbala si avanza hacia el este por lo menos medio tic de andar: 0,15 a 6 u/s (0,3 cuando se andaba a 12). */
    if (b.z !== a.z || aNumero(b.x - a.x) < aNumero(VELOCIDAD_ANDANDO) / TICS_POR_SEGUNDO / 2) resbalaMal++;
  }
  const seMete = enDiagonal.sitios.some((s) => s.z - RADIO_DEL_PASEANTE < bordeDelMuro);
  comprobar(
    'en diagonal contra la muralla resbala hacia el este tic a tic, sin meterse y sin engancharse',
    resbalaMal === 0 && !seMete && cola.length === 15,
    { resbalaMal, seMete },
  );

  /* LA VACUNA: sin la muralla, el mismo paseo la cruza. Lo que para es el cuerpo, no otra cosa. */
  const sinMuralla = andar(ABIERTO, nacerEnElPaseo(ABIERTO, { x: 0, z: 0, rumbo: 0 }), conTeclas(ADELANTE), 180);
  comprobar(
    'y sin la muralla, el mismo paseo pasa de largo por donde estaba',
    sinMuralla.sitios.some((s) => s.z < deNumero(MURALLA.z0)),
    { ultimo: sinMuralla.estado.ahora },
  );
}

// ---------------------------------------------------------------------------
paso('La marioneta: quieta contra la pared aunque se pulse, corriendo al correr, y sin patinar');
// ---------------------------------------------------------------------------

/*
 * ═══ LOS DOS FALLOS ═══
 *
 * La marioneta elegía el clip con la derivada de `andando`, que contaba SEGUNDOS pulsando: nunca
 * pasaba del umbral de correr, y contra una pared seguía creciendo, así que se andaba en el
 * sitio. Y el clip sonaba a su velocidad de serie mientras el suelo iba al triple. Ahora el clip
 * y su ritmo salen de la velocidad MEDIDA entre tics (`poseDelPaseo`, `zancada.ts`).
 */
{
  const contraLaPared = andar(CON_MURALLA, nacerEnElPaseo(CON_MURALLA, { x: 0, z: 0, rumbo: 0 }), conTeclas(ADELANTE), 180);
  const pose = poseDelPaseo(contraLaPared.estado);
  comprobar(
    'contra la pared, con la W pulsada —se pide ANDAR—, la velocidad medida es cero y el clip es el de quieto',
    contraLaPared.estado.pedido.marcha === ANDANDO && pose.velocidad === 0 && clipDelPaso(pose.velocidad) === CLIP.reposoA,
    { marcha: contraLaPared.estado.pedido.marcha, velocidad: pose.velocidad, clip: clipDelPaso(pose.velocidad) },
  );
  const andadoAntes = poseDelPaseo(andar(CON_MURALLA, nacerEnElPaseo(CON_MURALLA, { x: 0, z: 0, rumbo: 0 }), conTeclas(ADELANTE), 120).estado).andado;
  comprobar(
    'y lo andado no crece mientras se empuja la pared: sesenta fotogramas más, la misma distancia',
    Math.abs(pose.andado - andadoAntes) < 1e-9 && pose.andado > 5,
    { antes: andadoAntes, despues: pose.andado },
  );

  const libre = poseDelPaseo(andar(ABIERTO, nacerEnElPaseo(ABIERTO, { x: 0, z: 20, rumbo: 0 }), conTeclas(ADELANTE), 30).estado);
  const corre = poseDelPaseo(
    andar(ABIERTO, nacerEnElPaseo(ABIERTO, { x: 0, z: 20, rumbo: 0 }), conTeclas({ ...ADELANTE, deprisa: true }), 30).estado,
  );
  const vuelve = poseDelPaseo(andar(ABIERTO, nacerEnElPaseo(ABIERTO, { x: 0, z: -20, rumbo: 0 }), conTeclas(ATRAS), 30).estado);
  console.log(
    `  medido: andando ${libre.velocidad.toFixed(3)} u/s → andar a ${ritmoDelClip(CLIP.andar, libre.velocidad).toFixed(3)}; ` +
      `corriendo ${corre.velocidad.toFixed(3)} u/s → correr a ${ritmoDelClip(CLIP.correr, corre.velocidad).toFixed(3)}; ` +
      `hacia atrás ${vuelve.velocidad.toFixed(3)} u/s`,
  );
  comprobar(
    `andando suelta el clip de andar, a ${aNumero(VELOCIDAD_ANDANDO).toFixed(1)} por segundo medidos`,
    clipDelPaso(libre.velocidad) === CLIP.andar && Math.abs(libre.velocidad - aNumero(VELOCIDAD_ANDANDO)) < 0.01,
    { velocidad: libre.velocidad, clip: clipDelPaso(libre.velocidad) },
  );
  comprobar(
    `y corriendo, el de correr: el que no sonaba nunca`,
    clipDelPaso(corre.velocidad) === CLIP.correr && Math.abs(corre.velocidad - aNumero(VELOCIDAD_CORRIENDO)) < 0.01,
    { velocidad: corre.velocidad, clip: clipDelPaso(corre.velocidad), umbral: CORRE_A_PARTIR_DE },
  );
  comprobar(
    'y hacia atrás, el de andar con el ritmo del revés: no hace el paso de la luna',
    vuelve.velocidad < 0 && clipDelPaso(vuelve.velocidad) === CLIP.andar && ritmoDelClip(CLIP.andar, vuelve.velocidad) < 0,
    { velocidad: vuelve.velocidad },
  );

  /*
   * LOS PIES NO PATINAN: el clip a su ritmo cubre exactamente lo que cubre el suelo. Es la
   * definición de no patinar, y con el ritmo fijo en uno el suelo iba al triple de las piernas.
   */
  const pies = (clip: typeof CLIP.andar | typeof CLIP.correr, v: number): number =>
    ritmoDelClip(clip, v) * (clip === CLIP.andar ? ZANCADA_DE_ANDAR : ZANCADA_DE_CORRER);
  comprobar(
    'andando y corriendo, los pies cubren lo mismo que el suelo: el ritmo es la velocidad partida por la zancada',
    Math.abs(pies(CLIP.andar, libre.velocidad) - libre.velocidad) < 1e-9 && Math.abs(pies(CLIP.correr, corre.velocidad) - corre.velocidad) < 1e-9,
    { andar: ritmoDelClip(CLIP.andar, libre.velocidad), correr: ritmoDelClip(CLIP.correr, corre.velocidad) },
  );
  comprobar('y quieto suena a su velocidad de serie', ritmoDelClip(CLIP.reposoA, 0) === 1);

  /*
   * LA VACUNA. Con el ritmo fijo en uno —lo de antes—, el suelo iba a más del doble de lo que
   * cubren los pies andando y corriendo: si esto no saliera, el ritmo proporcional no estaría
   * arreglando nada. (La otra mitad del fallo de antes —la derivada de un contador de segundos
   * contra 1,6, que no pasaba nunca de uno— no se puede comprobar aquí porque ya no existe: lo
   * que la sustituye es la comprobación de la pared, arriba, que pide QUIETO con la W pulsada.)
   */
  comprobar(
    'y con el ritmo fijo en uno, el suelo iba a más del doble que los pies: patinaban',
    libre.velocidad / ZANCADA_DE_ANDAR > 2.5 && corre.velocidad / ZANCADA_DE_CORRER > 2.5,
    { andando: libre.velocidad / ZANCADA_DE_ANDAR, corriendo: corre.velocidad / ZANCADA_DE_CORRER },
  );
}

// ---------------------------------------------------------------------------
paso('La costura con la red: lo pedido tic a tic basta, y una corrección no se pinta como un salto');
// ---------------------------------------------------------------------------

{
  const entradas: EntradaDelTic[] = [];
  const sitios: Andante[] = [];
  const tirones = sorteo(0x5eed);
  let e = nacerEnElPaseo(CON_MURALLA, { x: -5, z: 8, rumbo: 0.2 });
  const inicio = e;
  /* Fotogramas de hasta 124 ms: los hay de dos tics, que es donde un aviso por fotograma se nota. */
  let conVariosTics = 0;
  for (let i = 0; i < 600; i++) {
    const ticAntes = e.tic;
    const t = i % 200;
    const teclas: Teclas = {
      ...SIN_TECLAS,
      adelante: t < 120,
      atras: t >= 150,
      derecha: t % 50 < 10,
      izquierda: t % 70 > 60,
      deprisa: t > 80 && t < 110,
    };
    e = fotogramaDelPaseo(CON_MURALLA, e, 0.004 + tirones() * 0.12, conTeclas(teclas), (entrada, sitio) => {
      entradas.push(entrada);
      sitios.push(sitio);
    });
    if (e.tic - ticAntes >= 2) conVariosTics++;
  }
  comprobar('el paseo de prueba tiene fotogramas de varios tics, que es donde los avisos se pueden perder', conVariosTics > 20, {
    conVariosTics,
  });
  const consecutivos = entradas.every((en, i) => en.tic === i + 1);
  const enteros = entradas.every(
    (en) => Number.isInteger(en.rumbo) && en.rumbo >= 0 && en.rumbo < RUMBOS && (en.marcha === QUIETO || en.marcha === ANDANDO || en.marcha === CORRIENDO),
  );
  comprobar('un aviso por tic, numerados sin huecos desde el primero', consecutivos && entradas.length === e.tic && e.tic > 300, {
    avisos: entradas.length,
    tics: e.tic,
  });
  comprobar('y cada uno con un rumbo entero de 0 a 255 y una marcha: lo que viajaría, sin coma flotante', enteros);
  comprobar(
    'y el sitio del último aviso es donde está quien pasea',
    sitios[sitios.length - 1]?.x === e.ahora.x && sitios[sitios.length - 1]?.z === e.ahora.z,
  );
  const hubo = new Set(entradas.map((en) => en.marcha));
  comprobar('y el paseo de prueba pidió las tres marchas', hubo.size === 3, [...hubo]);

  /* LO PEDIDO BASTA: repitiendo los avisos desde el mismo nacimiento sale el mismo camino, bit a bit. */
  let otra = inicio;
  let distintos = 0;
  for (let i = 0; i < entradas.length; i++) {
    const en = entradas[i] as EntradaDelTic;
    otra = ticDelPaseo(CON_MURALLA, otra, { rumbo: en.rumbo, marcha: en.marcha });
    const s = sitios[i] as Andante;
    if (otra.ahora.x !== s.x || otra.ahora.z !== s.z) distintos++;
  }
  comprobar('rehaciendo el camino con los avisos, sale el mismo tic a tic, bit a bit', distintos === 0, { distintos });

  /* LA CORRECCIÓN: pone al paseante en su sitio, y ese tic no se pinta como una carrera. */
  const corriendo = andar(ABIERTO, nacerEnElPaseo(ABIERTO, { x: 0, z: 20, rumbo: 0 }), conTeclas({ ...ADELANTE, deprisa: true }), 30).estado;
  const sitioBueno: Andante = { x: deNumero(-25), z: deNumero(25) };
  const corregido = corregirElPaseo(corriendo, sitioBueno);
  const suPose = poseDelPaseo(corregido);
  comprobar(
    'corregido, está donde dijeron, se pinta ahí y no a medio camino',
    corregido.ahora === sitioBueno && Math.abs(suPose.x + 25) < 1e-9 && Math.abs(suPose.z - 25) < 1e-9,
    { x: suPose.x, z: suPose.z },
  );
  comprobar(
    'y la marioneta no echa a correr por un salto que no ha dado: velocidad cero, quieto',
    suPose.velocidad === 0 && clipDelPaso(suPose.velocidad) === CLIP.reposoA,
    { velocidad: suPose.velocidad },
  );
  const sigue = andar(ABIERTO, corregido, conTeclas(ADELANTE), 10).estado;
  comprobar('y sigue andando desde ahí', sigue.ahora.x === sitioBueno.x && sigue.ahora.z < sitioBueno.z, sigue.ahora);

  /*
   * LA VACUNA: una corrección que moviera sólo el último sitio dejaría el anterior donde estaba,
   * y la velocidad medida de ese tic sería la del salto: decenas de unidades en una vigésima.
   */
  const aMedias = poseDelPaseo({ ...corriendo, ahora: sitioBueno });
  comprobar(
    'y moviendo sólo el último sitio, el salto se leería como una carrera: la guarda distingue',
    Math.abs(aMedias.velocidad) > CORRE_A_PARTIR_DE,
    { velocidad: aMedias.velocidad },
  );
}

// ---------------------------------------------------------------------------
paso('Nadie se queda encerrado: si donde se nace no se cabe, se nace en el sitio libre más cercano');
// ---------------------------------------------------------------------------

{
  const libre = nacerEnElPaseo(CON_MURALLA, { x: 3, z: 4, rumbo: 1 });
  comprobar(
    'donde se cabe, se nace donde dice el mundo, mirando a donde dice',
    libre.ahora.x === deNumero(3) && libre.ahora.z === deNumero(4) && libre.rumbo === 1 && libre.tic === 0,
  );
  const enElMuro = nacerEnElPaseo(CON_MURALLA, { x: 0, z: -11, rumbo: 0 });
  const separacion = Math.hypot(aNumero(enElMuro.ahora.x), aNumero(enElMuro.ahora.z) + 11);
  console.log(
    `  quien nacía dentro de la muralla nace en (${aNumero(enElMuro.ahora.x).toFixed(2)}, ${aNumero(enElMuro.ahora.z).toFixed(2)}), a ${separacion.toFixed(2)}`,
  );
  comprobar(
    'dentro de la muralla, se nace fuera de ella y a menos de dos unidades de donde se quería',
    sePuedeEstar(CON_MURALLA, enElMuro.ahora.x, enElMuro.ahora.z, RADIO_DEL_PASEANTE) && separacion < 2,
    { x: aNumero(enElMuro.ahora.x), z: aNumero(enElMuro.ahora.z), separacion },
  );
  /* Y desde ahí se anda: hacia fuera de la muralla, que según el lado es delante o detrás. */
  const alNorteDelMuro = aNumero(enElMuro.ahora.z) < MURALLA.z0;
  /* Cuarenta tics: dos segundos, que hacia atrás y a la velocidad de la talla a pie (`andar.ts`) pasan de dos unidades. */
  const sale = andar(CON_MURALLA, enElMuro, conTeclas(alNorteDelMuro ? ADELANTE : ATRAS), 40).estado;
  comprobar('y desde ahí se puede andar, alejándose de la muralla', Math.abs(aNumero(sale.ahora.z - enElMuro.ahora.z)) > 2, {
    alNorteDelMuro,
    desde: aNumero(enElMuro.ahora.z),
    hasta: aNumero(sale.ahora.z),
  });

  /* CUANDO CAMBIA EL MUNDO: si ya no se cabe, se aparta; si se cabe, ni se toca. */
  const fuera = nacerEnElPaseo(ABIERTO, { x: 0, z: -11, rumbo: 0 });
  const mudado = mudarDeMundo(CON_MURALLA, fuera);
  comprobar(
    'si el mundo nuevo pone una caja donde se estaba, se aparta al sitio libre más cercano',
    sePuedeEstar(CON_MURALLA, mudado.ahora.x, mudado.ahora.z, RADIO_DEL_PASEANTE) && mudado.antes === mudado.ahora,
    mudado.ahora,
  );
  const tranquilo = nacerEnElPaseo(ABIERTO, { x: 5, z: 5, rumbo: 0 });
  comprobar('y si se cabe, sigue siendo el mismo estado, sin tocarlo', mudarDeMundo(CON_MURALLA, tranquilo) === tranquilo);

  /*
   * ═══ Y SI YA ESTÁ DENTRO, EL PASEO LO SACA: NO SE QUEDA CLAVADO ═══
   *
   * Nacer y mudar de mundo rescatan, pero hay más puertas por las que se acaba dentro de algo: una
   * corrección de la red que llega con un mundo que ha cambiado, un mundo que se deriva tarde, un
   * estado que se guardó con otro mundo. Desde dentro de una caja `unPaso` no deja salir —sólo
   * acepta sitios donde se cabe, y a un paso no hay ninguno—, así que quien acababa ahí se quedaba
   * CLAVADO: ni adelante ni atrás, que es lo que se vio el 27-sep-2026 en el Burgo. Ahora cada tic
   * mira antes si se puede estar donde se está, y si no, empieza desde el sitio libre más cercano.
   *
   * LA VACUNA es el paso de `shared/` a secas, que es lo que daba el paseo antes: desde dentro de la
   * muralla, ni un paso en ningún rumbo. La red de verdad —el servidor— valida con la estructura, que
   * es la misma arena, así que un sitio dentro de un cuerpo tampoco se lo acepta nunca.
   */
  const encerrado: EstadoDelPaseo = { ...enElMuro, antes: { x: 0, z: deNumero(-11) }, ahora: { x: 0, z: deNumero(-11) } };
  let rumbosQueSalen = 0;
  for (let r = 0; r < RUMBOS; r += 4) {
    for (const m of LAS_DOS_MARCHAS) {
      const s = pasoDelTic(CON_MURALLA, encerrado.ahora, r, m);
      if (s.x !== encerrado.ahora.x || s.z !== encerrado.ahora.z) rumbosQueSalen++;
    }
  }
  comprobar('la vacuna: con el paso de `shared/` a secas, desde dentro de la muralla no se da un paso en ningún rumbo', rumbosQueSalen === 0, {
    rumbosQueSalen,
  });
  /* Mirando al norte: sale por el lado del muro que tenga más cerca, y desde ahí se aleja andando hacia ese lado. */
  let seAleja = 0;
  for (const [nombre, teclas] of [
    ['hacia atrás', ATRAS],
    ['hacia delante', ADELANTE],
  ] as const) {
    const intenta = andar(CON_MURALLA, encerrado, conTeclas(teclas), 60);
    const primero = intenta.sitios[0];
    comprobar(
      `y el paseo, desde dentro de la muralla y pulsando ${nombre}, sale en el primer tic y ningún tic vuelve a meterse`,
      primero !== undefined &&
        sePuedeEstar(CON_MURALLA, primero.x, primero.z, RADIO_DEL_PASEANTE) &&
        intenta.sitios.every((s) => sePuedeEstar(CON_MURALLA, s.x, s.z, RADIO_DEL_PASEANTE)),
      { primero, ultimo: intenta.estado.ahora },
    );
    if (Math.abs(aNumero(intenta.estado.ahora.z) + 11) > 3) seAleja++;
  }
  comprobar('y hacia el lado por el que salió se aleja de la muralla: ya no está clavado', seAleja === 1, { seAleja });
  const quieto = ticDelPaseo(CON_MURALLA, encerrado, { rumbo: 0, marcha: QUIETO });
  comprobar(
    'y aunque no se pulse nada: el tic lo saca y lo pinta ya fuera, sin deslizarlo por dentro del muro',
    sePuedeEstar(CON_MURALLA, quieto.ahora.x, quieto.ahora.z, RADIO_DEL_PASEANTE) && quieto.antes === quieto.ahora,
    quieto.ahora,
  );
}

// ---------------------------------------------------------------------------
paso('Un paso no cruza por donde no se cabe: ni entre dos esquinas, ni en el Burgo de verdad');
// ---------------------------------------------------------------------------

/*
 * ═══ LO QUE ESTO CIERRA ═══
 *
 * `unPaso` mira sólo el sitio de LLEGADA. Entre dos cajas que se tocan por las esquinas con un
 * hueco más estrecho que quien anda, las dos orillas son sitios buenos y en medio no se cabe; un
 * paso en diagonal de 0,6 —o de 1,32 corriendo— salta de una a otra sin pasar por ningún sitio
 * donde se quepa. El servidor lo rechaza (su recta y su escuadra muerden las dos esquinas) y
 * devuelve atrás; el aparato, con la tecla pulsada, lo vuelve a dar. En el Burgo pasa en las
 * rendijas de 0,6 entre las torres del centro, junto a la glorieta: medido con `pasoDelTic` al azar,
 * 3 pasos así de cada 160.000 en la mesa ABCD, y otros tantos en Las Lindes entre sus casas.
 *
 * El paseo da ahora el paso de `shared/` y, si su tramo cruza un cuerpo ensanchado por el radio
 * —con una cuenta exacta y entera, sin muestrear: una rendija puede ser más fina que cualquier
 * muestreo—, lo rehace eje a eje con el tramo de cada eje mirado. Casi siempre no cruza nada y el
 * paso es EL MISMO de `shared/`.
 */
{
  /* Dos cajas que se tocan por las esquinas: un hueco de 0,6 por eje, y quien anda mide 0,8. */
  const ESQUINAS = arenaDe(
    mundoDePrueba([
      { x0: -20, z0: -20, x1: -0.3, z1: -0.3 },
      { x0: 0.3, z0: 0.3, x1: 20, z1: 20 },
    ]),
  );
  const alOtroLado = (s: Andante): boolean => aNumero(s.x) > 0 && aNumero(s.z) < 0;
  let cruzanAntes = 0;
  let cruzanAhora = 0;
  let pruebas = 0;
  for (let k = 0; k < 24; k++) {
    for (const m of LAS_DOS_MARCHAS) {
      /* Desde el suroeste de la rendija, hacia el noreste (rumbo 32 de 256: 45°), corriendo y andando. */
      const desde: Andante = { x: deNumero(-3 - k * 0.025), z: deNumero(3 + k * 0.025) };
      let viejo = desde;
      let e: EstadoDelPaseo = nacerEnElPaseo(ESQUINAS, { x: aNumero(desde.x), z: aNumero(desde.z), rumbo: Math.PI / 4 });
      for (let t = 0; t < 40; t++) {
        viejo = pasoDelTic(ESQUINAS, viejo, 32, m);
        e = ticDelPaseo(ESQUINAS, e, { rumbo: 32, marcha: m });
      }
      pruebas++;
      if (alOtroLado(viejo)) cruzanAntes++;
      if (alOtroLado(e.ahora)) cruzanAhora++;
    }
  }
  console.log(`  entre dos esquinas a 0,6: el paso de shared/ cruza en ${String(cruzanAntes)} de ${String(pruebas)}, el del paseo en ${String(cruzanAhora)}`);
  comprobar('la vacuna: con el paso de `shared/` a secas, se cruza la rendija de 0,6 entre dos esquinas', cruzanAntes > 0, { cruzanAntes });
  comprobar('y con el paso del paseo, en ninguna de las pruebas', cruzanAhora === 0, { cruzanAhora, pruebas });

  /* Y sin rendija —las mismas cajas separadas 1,2—, sí se pasa: lo que para es el hueco, no la diagonal. */
  const ANCHO = arenaDe(
    mundoDePrueba([
      { x0: -20, z0: -20, x1: -0.6, z1: -0.6 },
      { x0: 0.6, z0: 0.6, x1: 20, z1: 20 },
    ]),
  );
  let e: EstadoDelPaseo = nacerEnElPaseo(ANCHO, { x: -3, z: 3, rumbo: Math.PI / 4 });
  for (let t = 0; t < 40; t++) e = ticDelPaseo(ANCHO, e, { rumbo: 32, marcha: ANDANDO });
  comprobar('y con un hueco de 1,2, donde se cabe, el paseo pasa al otro lado', alOtroLado(e.ahora), e.ahora);

  /*
   * EN EL BURGO DE VERDAD, en las rendijas de 0,6 entre las torres del centro de la mesa ABCD: desde
   * cada punto de una rejilla alrededor de las dos esquinas, en 128 rumbos, andando y corriendo. Se
   * juzga con lo que juzga el servidor: que el tramo se ande en recta o en escuadra
   * (`seAndaEnRecta`, en `mundo.ts`), y que se llegue a un sitio donde se pueda estar.
   */
  const burgo = arenaDe(mundoDelBurgo('ABCD'));
  const seAnda = (a: Andante, b: Andante): boolean => {
    if (seAndaEnRecta(burgo, a, b, RADIO_DEL_PASEANTE)) return true;
    const x = { x: b.x, z: a.z };
    const z = { x: a.x, z: b.z };
    return (
      (seAndaEnRecta(burgo, a, x, RADIO_DEL_PASEANTE) && seAndaEnRecta(burgo, x, b, RADIO_DEL_PASEANTE)) ||
      (seAndaEnRecta(burgo, a, z, RADIO_DEL_PASEANTE) && seAndaEnRecta(burgo, z, b, RADIO_DEL_PASEANTE))
    );
  };
  let malosAntes = 0;
  let malosAhora = 0;
  let dentroAhora = 0;
  let movidos = 0;
  let distintos = 0;
  for (const [cx, cz] of [
    [-48.3, -48.3],
    [-48.3, -24.3],
  ] as const) {
    for (let i = -10; i <= 10; i++) {
      for (let j = -10; j <= 10; j++) {
        const q: Andante = { x: deNumero(cx + i * 0.1), z: deNumero(cz + j * 0.1) };
        if (!sePuedeEstar(burgo, q.x, q.z, RADIO_DEL_PASEANTE)) continue;
        const e0: EstadoDelPaseo = { ...nacerEnElPaseo(burgo, { x: aNumero(q.x), z: aNumero(q.z), rumbo: 0 }), antes: q, ahora: q };
        for (let r = 0; r < RUMBOS; r += 2) {
          for (const m of LAS_DOS_MARCHAS) {
            const viejo = pasoDelTic(burgo, q, r, m);
            const viejoMalo = (viejo.x !== q.x || viejo.z !== q.z) && !seAnda(q, viejo);
            if (viejoMalo) malosAntes++;
            const nuevo = ticDelPaseo(burgo, e0, { rumbo: r, marcha: m }).ahora;
            if (nuevo.x !== q.x || nuevo.z !== q.z) movidos++;
            /* Los que cambian sin que el de `shared/` fuera malo: la recta del servidor muestrea, la cuenta del paseo es exacta. */
            if (!viejoMalo && (nuevo.x !== viejo.x || nuevo.z !== viejo.z)) distintos++;
            if ((nuevo.x !== q.x || nuevo.z !== q.z) && !seAnda(q, nuevo)) malosAhora++;
            if (!sePuedeEstar(burgo, nuevo.x, nuevo.z, RADIO_DEL_PASEANTE)) dentroAhora++;
          }
        }
      }
    }
  }
  console.log(
    `  en el Burgo ABCD, junto a las rendijas del centro: ${String(malosAntes)} pasos de shared/ que el servidor no aceptaría; del paseo, ${String(malosAhora)} de ${String(movidos)} que se mueven, y ${String(distintos)} buenos que cambian`,
  );
  comprobar('la vacuna: en el Burgo ABCD, el paso de `shared/` a secas cruza alguna rendija entre torres', malosAntes > 0, { malosAntes });
  comprobar(
    'y el del paseo no da ninguno que el servidor no aceptase, ni acaba nunca dentro de un cuerpo',
    malosAhora === 0 && dentroAhora === 0 && movidos > 10_000,
    { malosAhora, dentroAhora, movidos },
  );
  /*
   * Y LOS BUENOS SE QUEDAN COMO ESTABAN: un paso de `shared/` que el servidor acepta sale igual del
   * paseo, salvo los poquísimos que rozan una esquina por dentro de lo que la recta del servidor
   * muestrea (a trozos de un radio) y que la cuenta exacta ve cruzar.
   */
  comprobar('y casi siempre es el mismo paso de `shared/`: de los que el servidor acepta, cambia menos de uno por mil', distintos < movidos / 1000, {
    distintos,
    malosAntes,
    movidos,
  });
}

// ---------------------------------------------------------------------------
paso('La cámara de hombro no se queda detrás del adorno: ni de una señal, ni de un semáforo');
// ---------------------------------------------------------------------------

/*
 * ═══ LO QUE ESTO CIERRA ═══
 *
 * El 27-sep-2026, andando por una calle del Burgo, la cámara de hombro se quedó detrás de una
 * señal de tráfico que tapaba media pantalla. `hastaDondeCabeElHombro` sólo pregunta a la arena, que
 * es la estructura, y el mobiliario es adorno. Aquí se pone una señal de prueba detrás de quien
 * pasea —un panel en alto, entre él y donde iría la cámara— y se mira desde dónde queda la vista.
 */
{
  const quien = { x: 0, z: 0, rumbo: 0 };
  const pecho = { x: 0, y: LO_QUE_HAY_QUE_VER, z: 0 };
  /*
   * El panel: dos de ancho, de 2,5 a 4,5 de alto, a cuatro por detrás (al sur: la cámara mira al norte),
   * medido para quien anda a la talla de la persona del mundo. Las cámaras van en alturas de quien anda
   * (`camaras.ts`), así que la escena de prueba encoge con `TALLA_A_PIE` y el encuadre es el mismo.
   */
  const T = TALLA_A_PIE;
  const SENAL: Estorbo = { x0: -1 * T, y0: 2.5 * T, z0: 3.95 * T, x1: 1 * T, y1: 4.5 * T, z1: 4.05 * T };
  const conSenal = indiceDeEstorbos([SENAL]);
  const soloArena = hastaDondeCabeElHombro(ABIERTO, quien);
  const antes = camaraDeHombro(quien, 0, acercarElHombro(null, soloArena, 1 / 60));
  console.log(`  con la arena sola la cámara se queda a ${soloArena.toFixed(2)} por detrás; la señal está a ${(3.95 * T).toFixed(2)}`);
  comprobar(
    'la vacuna: con la arena sola, la cámara se queda detrás de la señal, que le tapa a quien pasea',
    tapaLaVista(conSenal, pecho, { x: antes.x, y: antes.y, z: antes.z }),
    { soloArena },
  );
  const noTapa = hastaDondeNoTapa(conSenal, quien, 0, soloArena);
  let atras: number | null = null;
  let peor = 0;
  for (let f = 0; f < 60; f++) {
    atras = acercarElHombro(atras, Math.min(soloArena, hastaDondeNoTapa(conSenal, quien, 0, soloArena)), 1 / 60);
    const c = camaraDeHombro(quien, 0, atras);
    if (f > 6 && tapaLaVista(conSenal, pecho, { x: c.x, y: c.y, z: c.z })) peor++;
  }
  console.log(`  con la señal declarada: hasta ${noTapa.toFixed(2)} no tapa, y la cámara acaba a ${(atras ?? 0).toFixed(2)}`);
  comprobar(
    'y declarándola, la cámara se pone delante de la señal: a partir del primer fotograma a pie no la tiene delante nunca',
    noTapa < 3.95 * T && noTapa >= 3 * T && peor === 0 && atras !== null && atras < 3.95 * T,
    { noTapa, atras, peor },
  );

  /*
   * Y POR DEBAJO DEL BRAZO DE UN SEMÁFORO NO SE ACERCA. La pieza se corta en rodajas: el poste
   * fino, el brazo arriba. Una caja entera —poste, brazo y el aire de debajo— se echaría la cámara
   * a la nuca cada vez que se pasa por debajo; las rodajas, no.
   */
  const caja = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): number[] => {
    /* Doce triángulos de una caja, sin índice. */
    const v = [
      [x0, y0, z0],
      [x1, y0, z0],
      [x1, y1, z0],
      [x0, y1, z0],
      [x0, y0, z1],
      [x1, y0, z1],
      [x1, y1, z1],
      [x0, y1, z1],
    ] as const;
    const caras = [
      [0, 1, 2, 0, 2, 3],
      [4, 6, 5, 4, 7, 6],
      [0, 4, 5, 0, 5, 1],
      [3, 2, 6, 3, 6, 7],
      [0, 3, 7, 0, 7, 4],
      [1, 5, 6, 1, 6, 2],
    ];
    const salida: number[] = [];
    for (const c of caras) for (const k of c) salida.push(...(v[k] as readonly number[]));
    return salida;
  };
  /* Un semáforo de brazo en sus ejes: poste de 0,3 hasta 6, y un brazo de ocho hacia +x entre 5,4 y 6. */
  const semaforo = [...caja(-0.15, 0, -0.15, 0.15, 6, 0.15), ...caja(0, 5.4, -0.2, 8, 6, 0.2)];
  const rodajas = rodajasDeUnaMalla(semaforo, null);
  const anchas = rodajas.filter((r) => r.x1 - r.x0 > 1);
  comprobar(
    'las rodajas de un semáforo de brazo: el poste fino abajo, el brazo ancho sólo arriba',
    rodajas.length >= 2 && anchas.length >= 1 && anchas.every((r) => r.y0 >= 4.5) && rodajas.every((r) => r.y1 - r.y0 > 0),
    rodajas,
  );
  /* Puesto en el mundo con el brazo cruzando por encima de donde está quien pasea, de este a oeste. */
  const puesto = estorbosDePiezas([{ pieza: 'semaforo', x: -4, y: 0, z: 2, giro: 0, talla: 1 }], (p) => (p === 'semaforo' ? rodajas : null));
  const porDebajo = hastaDondeNoTapa(indiceDeEstorbos(puesto), quien, 0, soloArena);
  const deUnaPieza = indiceDeEstorbos(
    estorbosDePiezas([{ pieza: 'semaforo', x: -4, y: 0, z: 2, giro: 0, talla: 1 }], () => [{ x0: -0.15, y0: 0, z0: -0.2, x1: 8, y1: 6, z1: 0.2 }]),
  );
  comprobar(
    'y pasando por debajo del brazo, la cámara no se acerca; con una sola caja por pieza, sí se echaría encima',
    porDebajo === soloArena && hastaDondeNoTapa(deUnaPieza, quien, 0, soloArena) < 2.5,
    { porDebajo, soloArena },
  );
  /* Girado un cuarto (brazo hacia −z), la caja girada va donde va la pieza. */
  const girado = estorbosDePiezas([{ pieza: 'semaforo', x: 0, y: 0, z: 0, giro: Math.PI / 2, talla: 1 }], () => [
    { x0: 0, y0: 0, z0: -0.2, x1: 8, y1: 1, z1: 0.2 },
  ]);
  const g = girado[0];
  comprobar(
    'y una pieza girada un cuarto lleva su caja girada como la gira `rotation.y`: +x pasa a −z',
    g !== undefined && Math.abs(g.z0 + 8) < 1e-9 && Math.abs(g.z1) < 1e-9 && Math.abs(g.x0 + 0.2) < 1e-9 && Math.abs(g.x1 - 0.2) < 1e-9,
    g,
  );

  /* Una copa que envuelve a quien pasea no se mete entre él y la cámara: la tiene encima. */
  const copa = indiceDeEstorbos([{ x0: -3 * T, y0: 1 * T, z0: -3 * T, x1: 3 * T, y1: 5 * T, z1: 3 * T }]);
  comprobar(
    'y bajo la copa de un árbol que le envuelve el pecho, la cámara no se echa a la nuca por ella',
    hastaDondeNoTapa(copa, quien, 0, soloArena) === soloArena,
  );
  comprobar('y sin estorbos declarados, lo que diga la arena', hastaDondeNoTapa(SIN_ESTORBOS, quien, 0, soloArena) === soloArena);

  /* Y un índice con muchas cajas contesta lo mismo que mirarlas todas, en tramos al azar. */
  const azar = sorteo(0x5e5a1);
  const muchas: Estorbo[] = [];
  for (let k = 0; k < 400; k++) {
    const x = (azar() - 0.5) * 120;
    const z = (azar() - 0.5) * 120;
    const y = azar() * 6;
    muchas.push({ x0: x, y0: y, z0: z, x1: x + 0.2 + azar() * 10, y1: y + 0.2 + azar() * 3, z1: z + 0.2 + azar() * 10 });
  }
  const indice = indiceDeEstorbos(muchas);
  const unaAUna = muchas.map((c) => indiceDeEstorbos([c]));
  let difieren = 0;
  let tapados = 0;
  for (let k = 0; k < 3000; k++) {
    const a = { x: (azar() - 0.5) * 130, y: azar() * 5, z: (azar() - 0.5) * 130 };
    const ang = azar() * Math.PI * 2;
    const b = { x: a.x + Math.cos(ang) * 7, y: a.y + azar() * 3, z: a.z + Math.sin(ang) * 7 };
    const aMano = unaAUna.some((i) => tapaLaVista(i, a, b));
    const conIndice = tapaLaVista(indice, a, b);
    if (conIndice) tapados++;
    if (aMano !== conIndice) difieren++;
  }
  comprobar('y con cuatrocientas cajas indexadas, el índice contesta lo mismo que mirarlas una a una', difieren === 0 && tapados > 100, {
    difieren,
    tapados,
  });

  /*
   * EN EL BURGO DE VERDAD: el adorno de la mesa ABCD, con una rodaja de prueba por pieza (sin WebGL
   * no hay catálogo que medir; en la escena salen del `.glb`). Cada semáforo, cada farola y cada
   * coche aparcado tiene su caja donde se pinta, y detrás de cada semáforo, mirando a su poste desde
   * tres unidades, la cámara no se queda al otro lado de él.
   */
  const ciudad = ciudadDelCodigo('ABCD');
  const POSTE: readonly Estorbo[] = [{ x0: -0.3, y0: 0, z0: -0.3, x1: 0.3, y1: 6, z1: 0.3 }];
  const delBurgo = estorbosDelBurgo(ciudad, () => POSTE);
  const semaforos = ciudad.mobiliario.filter((p) => p.pieza === 'semaforo-c');
  const esperadas = ciudad.mobiliario.length + ciudad.coches.aparcados.length;
  comprobar(
    'el adorno del Burgo trae una caja por pieza de mobiliario y por coche aparcado, más sus bultos que se levantan',
    semaforos.length > 50 && delBurgo.length >= esperadas && delBurgo.length < esperadas + ciudad.fachadas.length + 1,
    { cajas: delBurgo.length, esperadas, semaforos: semaforos.length },
  );
  const indiceDelBurgo = indiceDeEstorbos(delBurgo);
  const arenaDelBurgo = arenaDe(mundoDelBurgo('ABCD'));
  let detras = 0;
  let conArena = 0;
  for (const s of semaforos) {
    /* Quien pasea a tres del poste, de espaldas a él (el poste le queda al sur): la cámara iría a 6,6 por detrás. */
    const suyo = { x: s.x, z: s.z - 3, rumbo: 0 };
    const cabe = hastaDondeCabeElHombro(arenaDelBurgo, suyo);
    const noTapa = hastaDondeNoTapa(indiceDelBurgo, suyo, s.y, cabe);
    const c = camaraDeHombro(suyo, s.y, Math.min(cabe, noTapa));
    const cSolo = camaraDeHombro(suyo, s.y, cabe);
    const ver = { x: suyo.x, y: s.y + LO_QUE_HAY_QUE_VER, z: suyo.z };
    if (tapaLaVista(indiceDelBurgo, ver, { x: cSolo.x, y: cSolo.y, z: cSolo.z })) conArena++;
    if (tapaLaVista(indiceDelBurgo, ver, { x: c.x, y: c.y, z: c.z })) detras++;
  }
  console.log(`  de ${String(semaforos.length)} semáforos del Burgo ABCD, con tres de espaldas al poste: la arena sola deja la cámara detrás en ${String(conArena)}, con el adorno en ${String(detras)}`);
  comprobar('la vacuna: en el Burgo ABCD, con la arena sola la cámara se queda detrás del poste del semáforo', conArena > semaforos.length / 2, { conArena });
  comprobar('y con su adorno declarado, detrás de ninguno', detras === 0, { detras });
}

// ---------------------------------------------------------------------------
paso('El golpe y el suelo: la G golpea sin comerse la de un campo, un toque es un golpe en un tic, y caído no se anda');
// ---------------------------------------------------------------------------

/*
 * ═══ LO QUE ESTO CIERRA ═══
 *
 * La refriega de Boots on Board se golpea con la G en el escritorio y con «Golpear» en la app, y
 * las dos cosas pueden fallar sin que falle nada: una G que se come la letra de un campo de texto
 * —escribiendo un trato, el nombre—, un toque que se pierde porque cayó en un fotograma sin tics
 * —a 144 por segundo son casi todos—, un toque que sale cinco veces porque el fotograma dio cinco,
 * o un golpe pedido tumbado que sale al levantarse. Y quien está en el suelo no puede andar: el
 * servidor no atiende sus pasos, y lo que anduviera en su pantalla volvería de golpe al renacer.
 * Todo se mide aquí con el fotograma del gancho de verdad (`fotogramaDeQuienPasea`), sin React.
 */
{
  /* ── La tecla ── */
  const CASOS: readonly (readonly [string, string, DestinoDeLaTecla | null, boolean, boolean, boolean])[] = [
    ['la G sobre el lienzo', 'g', { tagName: 'CANVAS' }, false, false, true],
    ['la G con Mayúsculas, corriendo', 'G', { tagName: 'CANVAS' }, false, false, true],
    ['la G sobre el cuerpo del documento', 'g', { tagName: 'BODY' }, false, false, true],
    ['la G sin destino', 'g', null, false, false, true],
    ['la G escrita en un campo de texto', 'g', { tagName: 'INPUT' }, false, false, false],
    ['la G escrita en un área de texto', 'g', { tagName: 'TEXTAREA' }, false, false, false],
    ['la G en un desplegable', 'g', { tagName: 'SELECT' }, false, false, false],
    ['la G en algo editable', 'g', { tagName: 'DIV', isContentEditable: true }, false, false, false],
    ['Ctrl+G, que es del navegador', 'g', { tagName: 'CANVAS' }, true, false, false],
    ['la G mantenida, que el teclado repite', 'g', { tagName: 'CANVAS' }, false, true, false],
    ['la W, que anda', 'w', { tagName: 'CANVAS' }, false, false, false],
  ];
  const mal = CASOS.filter(([, tecla, destino, mod, repetida, esperado]) => esUnGolpe(tecla, destino, mod, repetida) !== esperado).map(([que]) => que);
  comprobar(
    'la G golpea sobre el lienzo, y no se come la de un campo de texto, ni Ctrl+G, ni la repetición del teclado',
    mal.length === 0 && TECLA_DE_GOLPEAR === 'g' && COMO_SE_GOLPEA === 'G para golpear',
    mal,
  );

  /* ── La cuenta ── */
  comprobar(
    'la cuenta de golpes: pendiente mientras no salga un tic, vista cuando sale, y una cuenta que BAJA no es un golpe',
    golpesVistosTras(5, 3, false) === 3 &&
      golpesVistosTras(5, 3, true) === 5 &&
      golpesVistosTras(3, 3, false) === 3 &&
      golpesVistosTras(0, 4, false) === 0 &&
      golpesVistosTras(0, 4, true) === 0,
  );

  /* ── Un toque es un golpe, en el primer tic del fotograma ── */
  const entradasDe = (mandos: Mandos, dt: number): EntradaDelTic[] => {
    const salen: EntradaDelTic[] = [];
    fotogramaDelPaseo(ABIERTO, nacerEnElPaseo(ABIERTO, { x: 0, z: 0, rumbo: 0 }), dt, mandos, (en) => {
      salen.push(en);
    });
    return salen;
  };
  const deTres = entradasDe(mandosDelFotograma(ADELANTE, SIN_MANDOS_DE_FUERA, true), 0.15);
  const sinGolpe = entradasDe(mandosDelFotograma(ADELANTE, SIN_MANDOS_DE_FUERA, false), 0.15);
  comprobar(
    'un fotograma de tres tics con un golpe lo lleva en el primero y en ninguno más; sin golpe, en ninguno',
    deTres.length === 3 && deTres.map((en) => en.golpe).join() === 'true,false,false' && sinGolpe.length === 3 && sinGolpe.every((en) => !en.golpe),
    { deTres: deTres.map((en) => en.golpe), sinGolpe: sinGolpe.map((en) => en.golpe) },
  );

  /*
   * A 144 FOTOGRAMAS POR SEGUNDO, CON EL FOTOGRAMA DEL GANCHO: tres toques en fotogramas distintos,
   * y dos más en el MISMO fotograma. Tienen que salir cuatro golpes —los dos del mismo fotograma son
   * uno—, cada uno en el primer tic que se da desde que se pulsó.
   */
  const TOQUES: ReadonlyMap<number, number> = new Map([
    [3, 1],
    [101, 1],
    [250, 1],
    [400, 2],
  ]);
  const conLaCuenta = (perderLosDeSinTic: boolean): { golpes: number[]; pulsados: number[] } => {
    let e = nacerEnElPaseo(ABIERTO, { x: 0, z: 20, rumbo: 0 });
    let pedidos = 0;
    let vistos: number | null = null;
    const golpes: number[] = [];
    const pulsados: number[] = [];
    const fuera = (): MandosDeFuera => ({ ...SIN_MANDOS_DE_FUERA, golpes: pedidos });
    for (let i = 0; i < 520; i++) {
      const toques = TOQUES.get(i) ?? 0;
      if (toques > 0) {
        pedidos += toques;
        pulsados.push(e.tic);
      }
      const hecho = fotogramaDeQuienPasea(ABIERTO, e, 1 / 144, SIN_TECLAS, fuera(), pedidos, vistos, false, (en) => {
        if (en.golpe) golpes.push(en.tic);
      });
      e = hecho.paseo;
      /* LA VACUNA: dar por visto lo pedido en cada fotograma, salga tic o no, como haría un sí/no. */
      vistos = perderLosDeSinTic ? pedidos : hecho.golpesVistos;
    }
    return { golpes, pulsados };
  };
  const bien = conLaCuenta(false);
  const primerTicTras = bien.pulsados.every((t, k) => bien.golpes[k] === t + 1);
  comprobar(
    `a 144 por segundo, ${String(TOQUES.size)} fotogramas con toques —el último con dos— dan ${String(TOQUES.size)} golpes, cada uno en el primer tic tras el toque`,
    bien.golpes.length === TOQUES.size && primerTicTras,
    bien,
  );
  const perdidos = conLaCuenta(true);
  comprobar(
    'y dándolos por vistos en cada fotograma, salga tic o no, se pierden: la cuenta es lo que los guarda',
    perdidos.golpes.length < TOQUES.size,
    perdidos,
  );

  /* ── Caído ── */
  let e = nacerEnElPaseo(ABIERTO, { x: 0, z: 20, rumbo: 0 });
  const tics: EntradaDelTic[] = [];
  let pedidos = 0;
  let vistos: number | null = null;
  let movidoCaido = 0;
  for (let i = 0; i < 120; i++) {
    if (i === 30) pedidos += 1;
    const antes = e;
    const hecho = fotogramaDeQuienPasea(
      ABIERTO,
      e,
      1 / 60,
      { ...ADELANTE, derecha: true },
      { ...SIN_MANDOS_DE_FUERA, golpes: pedidos },
      pedidos,
      vistos,
      true,
      (en) => {
        tics.push(en);
      },
    );
    if (hecho.paseo !== antes) movidoCaido++;
    e = hecho.paseo;
    vistos = hecho.golpesVistos;
  }
  comprobar(
    'caído, con la W y la D pulsadas y un golpe pedido, en dos segundos no se da ni un tic, ni se anda, ni se gira, ni se le cuenta nada a la red',
    tics.length === 0 && movidoCaido === 0 && e.tic === 0 && e.rumbo === 0 && e.ahora.z === deNumero(20),
    { tics: tics.length, movidoCaido, tic: e.tic },
  );
  const levantado: EntradaDelTic[] = [];
  for (let i = 0; i < 30; i++) {
    const hecho = fotogramaDeQuienPasea(ABIERTO, e, 1 / 60, ADELANTE, { ...SIN_MANDOS_DE_FUERA, golpes: pedidos }, pedidos, vistos, false, (en) => {
      levantado.push(en);
    });
    e = hecho.paseo;
    vistos = hecho.golpesVistos;
  }
  comprobar(
    'y al levantarse se anda en el acto, y el golpe que se pidió tumbado no sale',
    levantado.length === 10 && levantado.every((en) => !en.golpe) && e.ahora.z < deNumero(20),
    { tics: levantado.length, golpes: levantado.filter((en) => en.golpe).length },
  );
  /* LA VACUNA: sin estar caído, los mismos fotogramas andan. Lo que para es el suelo, no otra cosa. */
  const deOtro = fotogramaDeQuienPasea(ABIERTO, nacerEnElPaseo(ABIERTO, { x: 0, z: 20, rumbo: 0 }), 1 / 60, ADELANTE, SIN_MANDOS_DE_FUERA, 0, 0, false);
  const deOtroMas = [0, 1, 2, 3, 4].reduce((f) => fotogramaDeQuienPasea(ABIERTO, f.paseo, 1 / 60, ADELANTE, SIN_MANDOS_DE_FUERA, 0, 0, false), deOtro);
  comprobar('y de pie, los mismos fotogramas sí dan tics y andan: la guarda distingue', deOtroMas.paseo.tic > 0 && deOtroMas.paseo.ahora.z < deNumero(20));

  /* ── Renacer mirando a donde dice ── */
  const corriendo = nacerEnElPaseo(ABIERTO, { x: 0, z: 0, rumbo: 0.4 });
  const sitio: Andante = { x: deNumero(-12), z: deNumero(7) };
  const renacido = corregirElPaseo(corriendo, sitio, 2 * Math.PI + 1);
  const alOtroLado = corregirElPaseo(corriendo, sitio, -2 * Math.PI - 0.5);
  const soloCorregido = corregirElPaseo(corriendo, sitio);
  comprobar(
    'renacer pone en el sitio Y mirando a donde dice —en una vuelta—; corregir sin rumbo no toca hacia dónde se mira',
    renacido.ahora === sitio &&
      renacido.antes === sitio &&
      Math.abs(renacido.rumbo - 1) < 1e-9 &&
      Math.abs(alOtroLado.rumbo + 0.5) < 1e-9 &&
      soloCorregido.rumbo === 0.4 &&
      soloCorregido.ahora === sitio,
    { renacido: renacido.rumbo, alOtroLado: alOtroLado.rumbo, soloCorregido: soloCorregido.rumbo },
  );
}

// ---------------------------------------------------------------------------
await medirElAdornoQueChoca(comprobar, paso);
await medirLaTallaAPie(comprobar, paso);

paso('El montaje: la escena y la app usan esto, y no otra cosa');
// ---------------------------------------------------------------------------

/*
 * Se mira en el FUENTE, sin comentarios —las cabeceras cuentan lo que estaba mal con sus
 * nombres, y una regla que castigara nombrarlo enseñaría a no documentarlo—, porque sin WebGL y
 * sin React Native no hay otra cosa que mirar. Lo que se compra es que las piezas medidas arriba
 * sean las que se montan.
 */
{
  const leer = (ruta: string): string =>
    fs
      .readFileSync(new URL(ruta, import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
  const gancho = leer('../paseo/usar-el-paseo.ts');
  const marioneta = leer('../paseo/quien-anda.tsx');
  const mandos = leer('../../app/src/arcade/mandos-del-paseo.tsx');
  const pantalla = leer('../../app/src/arcade/lindes-en-tres-escena.tsx');

  comprobar(
    'el gancho pregunta si la tecla es de otro antes de quedársela, y al soltar suelta siempre',
    /if \(pulsada && esTeclaDeOtro\(/.test(gancho) && /if \(pulsada\) e\.preventDefault\(\);/.test(gancho),
  );
  comprobar(
    'el gancho deriva la arena UNA vez por mundo y adorno, con `useMemo`, y sin mundo no la deriva',
    /const estructura = useMemo\(\(\) => \(o\.mundo === null \? null : arenaDe\(o\.mundo\)\), \[o\.mundo\]\);/.test(gancho) &&
      /const abierto = useMemo\(\s*\(\) => \(o\.adorno === null \|\| o\.adorno === undefined \|\| estructura === null \? null : sinLoQueCierraElPaso\(o\.adorno, estructura\)\),\s*\[o\.adorno, estructura\],\s*\);/.test(gancho) &&
      /const adorno = useMemo\(\(\) => adornoQueDejaLlegarALosBrotes\(abierto, o\.brotes\), \[abierto, o\.brotes\]\);/.test(gancho) &&
      /const arena = useMemo\(\s*\(\) => \(o\.mundo === null \|\| estructura === null \? null : arenaDelPaseo\(o\.mundo, adorno, estructura, true\)\),\s*\[o\.mundo, estructura, adorno\],\s*\);/.test(gancho),
  );
  comprobar(
    'y corre antes que nadie: su `useFrame` lleva prioridad −1',
    /useFrame\(\(_, dt\) => \{[\s\S]*\}, -1\);/.test(gancho),
  );
  /*
   * LA CÁMARA DE HOMBRO MIRA TAMBIÉN LO QUE ESTORBA, Y EL BURGO SE LO DA. Con el gancho de antes —sólo
   * `hastaDondeCabeElHombro`— la cámara se quedaba detrás de la señal del Burgo; se ve caer quitando
   * el mínimo de los dos, o quitándole al Burgo la prop.
   */
  const burgo = leer('./../burgo/Burgo.tsx');
  const miraLoQueEstorba = (c: string): boolean =>
    /const cabe = hastaDondeCabeElHombro\(estructuraDe\(arena\), p\);\s*const noTapa = o\.estorbos === undefined \|\| o\.estorbos === null \? cabe : hastaDondeNoTapa\(o\.estorbos, p, suelo, cabe, y\);\s*atras = acercarElHombro\(atrasDelHombro\.current, Math\.min\(cabe, noTapa\), dt\);/.test(
      c,
    );
  const elBurgoLoDa = (c: string): boolean =>
    /indiceDeEstorbos\(estorbosDelBurgo\(ciudad, rodajasDelCatalogo\(catalogo\)\)\)/.test(c) &&
    /usarElPaseo\(\{[^}]*\bestorbos: estorbosAPie,[^}]*\}\)/.test(c);
  comprobar('la cámara de hombro se queda con lo menos de lo que cabe en la arena y de lo que no tapa el adorno', miraLoQueEstorba(gancho));
  comprobar('y el Burgo le da su adorno, medido en el catálogo que pinta', elBurgoLoDa(burgo));
  comprobar(
    'y se ve caer: con la cámara de antes, sólo con la arena, o con un Burgo que no pasa su adorno',
    !miraLoQueEstorba(gancho.replace('Math.min(cabe, noTapa)', 'cabe')) && !elBurgoLoDa(burgo.replace('estorbos: estorbosAPie,', '')),
  );
  /*
   * Y EN RIBERAS, CON EL ADORNO DEL DELTA (27-sep). La cámara de hombro atravesaba los pinos, las
   * casas del caserío y los barcos, que viven sólo en el plan del mundo de `delta.tsx`. Ahora
   * `estorbosDelDelta` los lee de ESE plan —la misma lista con la que se instancian— y la escena los
   * pasa al paseo por `AndarPorElDelta`. Se prueba con un pino de prueba (tronco y copa) al sur de
   * quien pasea, y se ve caer quitándole la prop al delta o al paseo.
   */
  const PINO: readonly Estorbo[] = [
    { x0: -0.3, y0: 0, z0: -0.3, x1: 0.3, y1: 2, z1: 0.3 },
    { x0: -1.5, y0: 2, z0: -1.5, x1: 1.5, y1: 6, z1: 1.5 },
  ];
  /*
   * El pino y su sitio van a `TALLA_A_PIE`: la escena se midió para quien anda a la talla de la persona
   * del mundo, y las cámaras van en alturas de quien anda (`camaras.ts`). Encogida con él, el pino queda
   * entre la nuca y donde iría la cámara igual que antes.
   */
  const TP = TALLA_A_PIE;
  const copia = (x: number, z: number, escala = 1): { posicion: { x: number; y: number; z: number }; giro: number; escala: { x: number } } => ({
    posicion: { x, y: 0, z },
    giro: 0,
    escala: { x: escala },
  });
  const delDelta = estorbosDelDelta(
    new Map([
      ['0,0|pino', [copia(0, 4.5 * TP, TP)]],
      ['mar|desconocido', [copia(30, 30)]],
    ]),
    [{ modelo: 'casa', puesta: copia(-20, -20) }],
    (p) => (p === 'pino' || p === 'casa' ? PINO : null),
  );
  const conElPino = indiceDeEstorbos(delDelta);
  const quienEnElDelta = { x: 0, z: 0, rumbo: 0 };
  const pechoEnElDelta = { x: 0, y: LO_QUE_HAY_QUE_VER, z: 0 };
  const cabeEnElDelta = hastaDondeCabeElHombro(ABIERTO, quienEnElDelta);
  const sinAdorno = camaraDeHombro(quienEnElDelta, 0, cabeEnElDelta);
  const conAdorno = camaraDeHombro(quienEnElDelta, 0, Math.min(cabeEnElDelta, hastaDondeNoTapa(conElPino, quienEnElDelta, 0, cabeEnElDelta)));
  comprobar(
    'el adorno del delta: las rodajas de cada copia del plan y del caserío, y nada de lo que el catálogo no conoce',
    delDelta.length === 4,
    delDelta,
  );
  comprobar(
    `y con un pino a ${(4.5 * TP).toFixed(2)} por detrás, la arena sola deja la cámara detrás de la copa; con el adorno del delta, delante`,
    tapaLaVista(conElPino, pechoEnElDelta, sinAdorno) && !tapaLaVista(conElPino, pechoEnElDelta, conAdorno),
    { cabeEnElDelta, sinAdorno, conAdorno },
  );
  const delta = leer('./../delta.tsx');
  const andar = leer('./../andar-por-el-delta.tsx');
  const elDeltaLoDa = (d: string, a: string): boolean =>
    /indiceDeEstorbos\(estorbosDelDelta\(plan\.cosas, plan\.caserio, rodajasDelCatalogo\(modelos\)\)\)/.test(d) &&
    /<AndarPorElDelta[^>]*\bestorbos=\{estorbosAPie\}/.test(d) &&
    /usarElPaseo\(\{[^}]*\bestorbos, adorno, brotes: elCanal\.brotes \}\)/.test(a);
  comprobar('y el delta se lo da al paseo, medido en el catálogo que pinta', elDeltaLoDa(delta, andar));
  comprobar(
    'y se ve caer: con un delta que no pasa su adorno, o con un paseo del delta que no lo recibe',
    !elDeltaLoDa(delta.replace('estorbos={estorbosAPie}', ''), andar) && !elDeltaLoDa(delta, andar.replace(', estorbos, adorno,', ', adorno,')),
  );
  /*
   * Y EL ADORNO QUE CHOCA (27-sep): los tres juegos que se andan le dan al paseo su adorno, cortado
   * fino, montado por trozos fuera del fotograma (`usarElAdorno`), con los brotes vivos del canal. Se
   * ve caer quitándole a cualquiera de los tres la prop, o montándolo de golpe con un `useMemo`.
   */
  const lindes = leer('./../lindes/Lindes.tsx');
  const losTresLoDan = (b: string, d: string, a: string, l: string): boolean =>
    /const trabajoDelAdorno = useMemo\(\s*\(\) =>\s*!aPie \|\| catalogo === null\s*\? null\s*: trozosDelAdornoDelBurgo\(ciudad, rodajasDelCatalogo\(catalogo, ALTO_DE_UNA_RODAJA_QUE_CHOCA, TOPE_DE_RODAJAS_QUE_CHOCAN\), alturaDelSuelo\),/.test(b) &&
    /const adornoAPie = usarElAdorno\(trabajoDelAdorno\);/.test(b) &&
    /usarElPaseo\(\{[^}]*\badorno: adornoAPie,\s*brotes: elCanal\.brotes,[^}]*\}\)/.test(b) &&
    /return trozosDelAdornoDelDelta\(plan\.cosas, plan\.caserio, rodajas, \(x, z\) => alturaAPie\(suelo, x, z\)\);/.test(d) &&
    /rodajasDelCatalogo\(modelos, ALTO_DE_UNA_RODAJA_QUE_CHOCA \/ ESCALA_DEL_PACK, TOPE_DE_RODAJAS_QUE_CHOCAN\)/.test(d) &&
    /const adornoAPie = usarElAdorno\(trabajoDelAdorno\);/.test(d) &&
    /<AndarPorElDelta[^>]*\badorno=\{adornoAPie\}/.test(d) &&
    /usarElPaseo\(\{[^}]*\badorno, brotes: elCanal\.brotes \}\)/.test(a) &&
    /: trozosDelAdornoDeLasLindes\(\s*tablero\.losas,\s*semilla,\s*rodajasQueChocanDelCatalogo\(catalogo\.partes\),\s*\(pieza\) => ejeDelLargo\(cajaDelModelo\(catalogo, pieza\)\),\s*sePintaLoMenudo\(calidad\),\s*\)/.test(l) &&
    /const adorno = usarElAdorno\(trabajoDelAdorno\);/.test(l) &&
    /usarElPaseo\(\{\s*mundo,\s*adorno,\s*brotes: elCanal\.brotes,/.test(l);
  comprobar('los tres juegos que se andan le dan al paseo su adorno que choca, por trozos y con los brotes vivos', losTresLoDan(burgo, delta, andar, lindes));
  comprobar(
    'y se ve caer: un Burgo, un delta o unas Lindes que no lo pasan, o que lo montan de golpe',
    !losTresLoDan(burgo.replace('    adorno: adornoAPie,\n', ''), delta, andar, lindes) &&
      !losTresLoDan(burgo, delta.replace('adorno={adornoAPie}', ''), andar, lindes) &&
      !losTresLoDan(burgo, delta, andar, lindes.replace('    adorno,\n    brotes', '    brotes')) &&
      !losTresLoDan(burgo.replace('usarElAdorno(trabajoDelAdorno)', 'useMemo(() => hacerLosTrozos(trabajoDelAdorno ?? []), [trabajoDelAdorno])'), delta, andar, lindes),
  );
  /* Y la corrección de la red, el nacer en lo que dijo y el cambio de mundo apartan por la ESTRUCTURA: del adorno se sale andando. */
  const apartaPorLaEstructura = (c: string): boolean =>
    /mudarDeMundo\(estructuraDe\(arena\), corregirElPaseo\(nacido, dicho\.sitio, dicho\.rumbo\)\)/.test(c) &&
    /paseo: mudarDeMundo\(estructuraDe\(arena\), actual\.paseo\)/.test(c) &&
    /mudarDeMundo\(estructuraDe\(actual\.arena\), corregirElPaseo\(actual\.paseo, sitio, rumbo\)\)/.test(c);
  comprobar('la corrección de la red y el cambio de mundo apartan sólo de la estructura, como el servidor', apartaPorLaEstructura(gancho));
  comprobar(
    'y se ve caer: una corrección que apartara también del adorno',
    !apartaPorLaEstructura(gancho.replace('mudarDeMundo(estructuraDe(actual.arena), corregirElPaseo', 'mudarDeMundo(actual.arena, corregirElPaseo')),
  );
  /*
   * EL FOTOGRAMA DEL GANCHO ES EL MEDIDO ARRIBA: `fotogramaDeQuienPasea`, con las teclas, los mandos
   * de fuera, las dos cuentas de golpes, si está caído según el canal y la costura con la red. Se ve
   * caer quitándole el suelo —el gancho andaría tumbado— y quitándole la cuenta del teclado.
   */
  const LA_LLAMADA =
    /fotogramaDeQuienPasea\(\s*arena,\s*actual\.paseo,\s*dt,\s*teclas\.current,\s*fuera,\s*golpesPedidos,\s*golpesVistos\.current,\s*o\.caido\?\.\(\) === true,\s*o\.alDarUnTic,?\s*\)/;
  const daLosTicsMedidos = (c: string): boolean =>
    LA_LLAMADA.test(c) &&
    /golpesVistos\.current = hecho\.golpesVistos;/.test(c) &&
    /const golpesPedidos = golpesDelTeclado\.current \+ fuera\.golpes;/.test(c) &&
    /poseDelPaseo\(paseo\)/.test(c) &&
    !/\bfotogramaDelPaseo\(/.test(c);
  comprobar('y da los tics con `fotogramaDeQuienPasea` —el golpe pendiente y el suelo— y pinta con `poseDelPaseo`, medidos aquí', daLosTicsMedidos(gancho));
  comprobar(
    'y se ve caer: sin preguntar si está caído, o sin la G en la cuenta, o dando tics por su cuenta',
    !daLosTicsMedidos(gancho.replace('o.caido?.() === true', 'false')) &&
      !daLosTicsMedidos(gancho.replace('golpesDelTeclado.current + fuera.golpes', 'fuera.golpes')) &&
      !daLosTicsMedidos(`${gancho}\nfotogramaDelPaseo(arena, e, dt, mandos);`),
  );
  comprobar(
    'y lee el teclado sólo donde hay `document`, y los mandos de fuera siempre',
    /typeof document === 'undefined'/.test(gancho) && /const fuera = o\.mandos\?\.current \?\? SIN_MANDOS_DE_FUERA;/.test(gancho),
  );
  /*
   * LA G, EN EL OYENTE: pulsada —no al soltar—, sólo con canal, y preguntando antes `esUnGolpe`, que
   * es lo que no se come la G de un campo de texto (medido arriba). Y sólo entonces `preventDefault`
   * y la cuenta: un oyente que contara antes de preguntar se llevaría la letra de cualquier campo.
   */
  const laG = (c: string): boolean =>
    /if \(mando === 'golpe'\) \{\s*const conModificador = e\.ctrlKey \|\| e\.altKey \|\| e\.metaKey;\s*if \(!pulsada \|\| !conCanal\.current \|\| !esUnGolpe\(e\.key, e\.target as DestinoDeLaTecla \| null, conModificador, e\.repeat\)\) return;\s*e\.preventDefault\(\);\s*golpesDelTeclado\.current \+= 1;\s*return;\s*\}/.test(
      c,
    ) && /conCanal\.current = o\.alDarUnTic !== undefined;/.test(c);
  comprobar('y la G cuenta un golpe sólo pulsada, con canal y si no es de otro; y sólo entonces se la queda', laG(gancho));
  comprobar(
    'y se ve caer: contando sin preguntar si es de otro, o también sin canal',
    !laG(gancho.replace('|| !esUnGolpe(e.key, e.target as DestinoDeLaTecla | null, conModificador, e.repeat)', '')) &&
      !laG(gancho.replace('if (!pulsada || !conCanal.current ||', 'if (!pulsada ||')),
  );
  comprobar(
    'la marioneta elige el clip por la velocidad medida y le pone su ritmo',
    /clipDelPaso\(quien\.velocidad\)/.test(marioneta) && /accion\.timeScale = ritmoDelClip\(clip, quien\.velocidad\)/.test(marioneta),
  );
  comprobar('y no mira ningún contador de lo andado en segundos', !/\bandando\b/.test(marioneta));

  /*
   * ═══ Y LA APP MONTA LOS MANDOS: SIN ELLOS, EN EL MÓVIL NO SE ANDA ═══
   *
   * Era el fallo de producto: el paseo sólo sabía de teclados, y en iOS y en Android no hay
   * `document`. Se mira que la pantalla de Las Lindes monte la palanca a pie y le pase la misma
   * referencia a la escena, y que la palanca responda al dedo sin `onClick`, que en la app no
   * llega.
   */
  comprobar(
    'la pantalla de Las Lindes de la app monta la palanca a pie, y le pasa a la escena la misma referencia',
    /*
     * Detrás de `mandos` puede ir el aviso de los hallazgos (`alRecoger`, docs/AVATARES-JUGABLES.md §6)
     * y la franja que tapan los mandos (`reservaAbajo`, docs/PANTALLAS.md: los rincones se apoyan
     * encima de la palanca), y nada más.
     */
    /<MandosDelPaseo mandos=\{mandos\} visibles=\{modo !== 'mesa'\} \/>/.test(pantalla) &&
      /\bmandos=\{mandos\}\s*\n\s*(?:alRecoger=\{alRecoger\}\s*\n\s*)?(?:reservaAbajo=\{reservaAbajo\}\s*\n\s*)?\/>/.test(pantalla),
  );
  comprobar(
    'y la palanca responde al dedo con `PanResponder` y escribe en esa referencia, sin `onClick`',
    /PanResponder\.create\(/.test(mandos) &&
      /onPanResponderMove: \(_, gesto\) => mover\(gesto\.dx, gesto\.dy\)/.test(mandos) &&
      !/onClick/.test(mandos),
  );
  /*
   * Y CON LA `y` DE LA PANTALLA DADA LA VUELTA: en la pantalla la `y` crece hacia ABAJO, y abajo
   * es atrás. Sin el signo, el pulgar hacia arriba haría retroceder, y ningún comprobador de
   * tipos lo vería.
   */
  comprobar(
    'y la palanca hacia arriba de la pantalla es hacia delante: la `y` va con el signo cambiado',
    /mandos\.current = \{ palanca: \{ x: x \/ RECORRIDO, y: -y \/ RECORRIDO \}/.test(mandos),
  );
  comprobar(
    'y al dejar de andar suelta la palanca y el correr',
    /if \(visibles\) return;[\s\S]{0,120}mandos\.current = SIN_MANDOS_DE_FUERA;/.test(mandos),
  );
}

console.log('');
if (fallos.length > 0) {
  console.log(`${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
  for (const f of fallos.slice(0, 25)) console.log(`  ✗ ${f}`);
  if (fallos.length > 25) console.log(`  … y ${fallos.length - 25} más`);
  process.exit(1);
}

console.log(`${hechas} comprobaciones`);
console.log('\nEl reloj cuenta tics enteros y no se desboca, se pinta entre los dos últimos, las teclas y la');
console.log('palanca piden lo que tienen que pedir, la muralla para y deja resbalar, la marioneta se queda');
console.log('quieta contra ella y corre al correr sin patinar, lo pedido basta para rehacer el camino, nadie');
console.log('se queda encerrado ni clavado, ningún paso salta una rendija, el adorno choca por lo que tiene a la');
console.log('altura del cuerpo y de él se sale andando, la cámara no se queda detrás del');
console.log('adorno, la G golpea sin comerse la de un campo y un toque es un golpe en un solo tic, en el suelo');
console.log('no se anda, y la escena y la app montan justo esto.');
