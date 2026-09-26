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
 *  7. NACER. Nadie se queda encerrado dentro de una caja.
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
  QUIETO,
  RADIO_DEL_PASEANTE,
  RUMBOS,
  rumboDeRadianes,
  rumboValido,
  VELOCIDAD_ANDANDO,
  VELOCIDAD_CORRIENDO,
} from '../../shared/mecanicas/andar';
import { aNumero, deNumero } from '../../shared/mecanicas/fijo';
import { arenaDe, sePuedeEstar } from '../../shared/mecanicas/mundo';
import type { Andante, Arena, Casilla, Cuerpo, MundoDeclarado } from '../../shared/mecanicas/mundo';
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

  const enDiagonal = andar(CON_MURALLA, nacerEnElPaseo(CON_MURALLA, { x: 0, z: 0, rumbo: Math.PI / 4 }), conTeclas(ADELANTE), 120);
  const cola = enDiagonal.sitios.slice(-15);
  let resbalaMal = 0;
  for (let i = 1; i < cola.length; i++) {
    const a = cola[i - 1] as Andante;
    const b = cola[i] as Andante;
    if (b.z !== a.z || aNumero(b.x - a.x) < 0.3) resbalaMal++;
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
  const sale = andar(CON_MURALLA, enElMuro, conTeclas(alNorteDelMuro ? ADELANTE : ATRAS), 20).estado;
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
   * LA VACUNA: quien está dentro de una caja no sale andando. `unPaso` sólo acepta sitios donde
   * se cabe, y desde dentro no hay ninguno a un paso: por eso hace falta el rescate.
   */
  const encerrado: EstadoDelPaseo = { ...enElMuro, antes: { x: 0, z: deNumero(-11) }, ahora: { x: 0, z: deNumero(-11) } };
  const intenta = andar(CON_MURALLA, encerrado, conTeclas(ATRAS), 60).estado;
  comprobar(
    'y sin el rescate, quien nace dentro de la muralla no da un paso en sesenta fotogramas',
    intenta.ahora.x === 0 && intenta.ahora.z === deNumero(-11),
    intenta.ahora,
  );
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
    'el gancho deriva la arena UNA vez por mundo, con `useMemo`, y sin mundo no la deriva',
    /useMemo\(\(\) => \(o\.mundo === null \? null : arenaDe\(o\.mundo\)\), \[o\.mundo\]\)/.test(gancho),
  );
  comprobar(
    'y corre antes que nadie: su `useFrame` lleva prioridad −1',
    /useFrame\(\(_, dt\) => \{[\s\S]*\}, -1\);/.test(gancho),
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
    /* Detrás de `mandos` puede ir el aviso de los hallazgos (`alRecoger`, docs/AVATARES-JUGABLES.md §6), y nada más. */
    /<MandosDelPaseo mandos=\{mandos\} visibles=\{modo !== 'mesa'\} \/>/.test(pantalla) &&
      /\bmandos=\{mandos\}\s*\n\s*(?:alRecoger=\{alRecoger\}\s*\n\s*)?\/>/.test(pantalla),
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
console.log('se queda encerrado, la G golpea sin comerse la de un campo y un toque es un golpe en un solo');
console.log('tic, en el suelo no se anda, y la escena y la app montan justo esto.');
