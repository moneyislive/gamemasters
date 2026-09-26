/**
 * ¿ESTÁ ENTERO EL CONTRATO DE LA LIZA? — la columna de la que cuelgan la sala, el servidor, las reglas
 * y el juego.
 *
 *   npm run verify:liza-protocolo
 *
 * ═══ QUÉ AFIRMA ═══
 *
 * Que los contratos que cuatro frentes implementan sin poder preguntarse dicen lo que prometen:
 *
 *   1. LA GEOMETRÍA (`geometria.ts`): `rumboHacia` da, en los 256 rumbos y en veinte mil direcciones al
 *      azar, lo mismo que `Math.atan2` (aquí sí se puede usar: esto no corre en ningún aparato); la
 *      prueba de losa da lo esperado en los casos que se saben de memoria y lo mismo que una versión en
 *      coma flotante escrita aparte; y el punto donde se para un empujón nunca está dentro de una caja
 *      según `chocaConCuerpo` de `mundo.ts`.
 *   2. LA DECLARACIÓN (`declaracion.ts`): una liza DE JUGUETE —que no es ningún juego— pasa
 *      `problemasDeLaDeclaracion`, y cada una de sus versiones rotas no, con el problema nombrado: entre
 *      ellas, las que el cable o la plataforma no podrían transportar (un aforo que no cabe en la foto, un
 *      suelo fuera de la liza o de lado nulo, un sitio de nacer dentro de una caja o fuera del límite) y
 *      las que tendrían dos jueces para un impacto (una esquiva con intocable). Y lo mismo con las
 *      declaraciones de la liza ABIERTA (L1-L12), que aún no están en la sala: dos ampliaciones de juguete
 *      pasan `problemasDeLaAmpliacion` y cada una de sus versiones rotas no; y la ronda más pesada con su
 *      zona (L7) sigue cabiendo en la mesa. L10 (el alcance de blanco y el olvido) ya entró en
 *      `LizaDeclarada`: la de juguete lo declara entero, su forma transitoria —sin ellos— también pasa y se
 *      lee como «sin tope, sin olvido», y sus versiones rotas no pasan. Y el tiro cargado (W), que entra con su
 *      forma antes que la sala: un arco de juguete con la forma entera saca UNA frase —que la sala todavía no
 *      lo cumple—, y cada versión rota, además, la suya.
 *   3. EL CABLE (`protocolo.ts`): cada mensaje, en los dos sentidos, va y vuelve igual por su escritor y
 *      su lector; los lectores tiran cualquier clave de más o de menos, cualquier tipo o rango
 *      equivocado; la subida más larga que el lector admite cabe en 256 bytes; y la bajada más larga —la
 *      foto llena y el `tic` lleno de los sucesos más largos— cabe en su tope. Con los sucesos de la liza
 *      abierta: `disparo`, `progreso` y el `ro` de `nace`, que viaja siempre (el `nace` que la sala escribe
 *      todavía sin él sale con 0). Y con el del tiro cargado: `estalla`.
 *   4. LOS VEREDICTOS, EL REGISTRO Y EL COSTE: los lectores de `arcade:*` son estrictos; el `arcade:ronda`
 *      más pesado que se puede declarar cabe en la carga que admite la mesa (`presupuesto.ts`); el
 *      registro de lizas se prueba con uno de juguete —cero filas no se leen como «vigilado»—; y el
 *      modelo de coste da lo que el diseño estimaba.
 *   5. LA VISTA DE EL QUIEBRO, SUS NOMBRES Y EL PUENTE: sus lectores estrictos aceptan lo bien formado y
 *      tiran lo demás, incluida la vista incoherente (una noche sin número, un historial del futuro); los
 *      nombres no dicen ninguna palabra de la franquicia vecina; y el puente no acepta un mensaje por lo
 *      que el propio mensaje diga de sí mismo.
 *   6. LA COLUMNA DE LA CIUDAD ABIERTA (`quiebro-ciudad.ts`, `orientacion.ts`): las medidas de 540 m
 *      caben en la Liza y en el cable; el molinete de distritos es el del diseño con las ocho simetrías,
 *      que son ocho permutaciones distintas con su inversa; la numeración de zonas, clases y límites es
 *      única y cabe en 255; las celdas reparten el plano y las cajas sin dejarse ni repetir nada; los
 *      campos de distancias dan lo de Bellman-Ford y el nudo más cercano lo de la fuerza bruta; los tríos
 *      de Fallos, los de la fuerza bruta; las firmas sin escribir lanzan `CiudadSinEscribir` y nada más
 *      (y en cuanto den una ciudad, se mira su forma); y el HUD pone el minimapa y el plano del derecho.
 *
 * Hay más muestras MALAS que buenas a propósito: la promesa de un lector estricto es `null` ante lo
 * que no sea exactamente un mensaje, y eso sólo se demuestra enseñándole lo que no es.
 *
 * ═══ POR QUÉ UNA VERSIÓN EN COMA FLOTANTE DE LA LOSA ═══
 *
 * Porque comprobar la prueba de losa con la misma aritmética en fracciones sería comprobarla consigo
 * misma. La de aquí divide en coma flotante, como el «slab test» de los libros; en una rejilla de
 * dieciseisavos de unidad los empates exactos (rozar una cara, pasar por una esquina) salen a menudo y
 * la división correctamente redondeada los ve igual. Si las dos discrepan en algo que no sea el último
 * dieciseismilésimo de la fracción, una de las dos está mal.
 *
 * Usa el arnés común (`arnes.ts`): una comprobación que no se hizo sale como bloque saltado (un 2), no
 * como verde.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { COSENO, SENO } from '../../shared/mecanicas/andar';
import { enteroEntre, sembrar } from '../../shared/mecanicas/azar';
import type { Azar } from '../../shared/mecanicas/azar';
import { canonico } from '../../shared/mecanicas/canonico';
import { UNO } from '../../shared/mecanicas/fijo';
import { arenaDe, chocaConCuerpo } from '../../shared/mecanicas/mundo';
import {
  accionesDelCable,
  alcanceDeBlancoDe,
  ampliacionDeHoy,
  arenaDeLaLiza,
  esClaveCorta,
  leerCargaDeAusente,
  leerCargaDeReloj,
  leerCargaDeRonda,
  numeroDelAsiento,
  olvidoDelEncuentro,
  pesoDeLaRondaMasLarga,
  problemasDeLaAmpliacion,
  problemasDeLaDeclaracion,
  TOPE_DE_ASIENTOS,
  TOPE_DE_CANTIDAD,
  TOPE_DE_CARGA_DE_LA_MESA,
  TOPE_DE_CASILLAS,
  TOPE_DE_COLUMNAS,
  TOPE_DE_ENTIDADES,
  TOPE_DE_GRUPOS,
  TOPE_DE_ID,
  TOPE_DE_MULTIPLICADOR,
  TOPE_DE_NUDOS,
  TOPE_DE_RONDAS,
  TOPE_DE_TICS,
  VERSION_DE_LA_DECLARACION,
} from '../../shared/mecanicas/liza/declaracion';
import type {
  AccionDeclarada,
  AmpliacionDeLaLiza,
  CargaDeRondaConZona,
  EfectoDeclarado,
  LizaDeclarada,
  PuestaDeEstado,
  ReglasDeAsiento,
} from '../../shared/mecanicas/liza/declaracion';
import {
  dentroDelCono,
  dentroDelRadio,
  desplazado,
  distanciaAlCuadrado,
  FueraDeLaLiza,
  giroEntre,
  hayLineaDeVista,
  primeraLosa,
  pruebaDeLosa,
  puntoDelTramo,
  rumboHacia,
  TOPE_DE_DIFERENCIA,
  TOPE_DE_LA_LIZA,
  tramoTocaCuerpo,
  trayectoria,
} from '../../shared/mecanicas/liza/geometria';
import {
  aCentesimas,
  CIERRE_DE_LA_LIZA,
  deCentesimas,
  RESULTADO,
  leerMensajeDeLaSala,
  leerMensajeDelAparato,
  leerSuceso,
  MOTIVO_DE_IRSE,
  rondaDelNace,
  rutaDeLaLiza,
  TOPE_DE_NUMERO,
  textoDeLaSala,
  textoDelAparato,
  TOPE_DE_AQUIS_DE_GOLPE,
  TOPE_DE_BAJADA_BYTES,
  TOPE_DE_CENTESIMAS,
  TOPE_DE_MS,
  TOPE_DE_SUBIDA_BYTES,
  TOPE_DE_SUCESOS,
  TOPE_DE_TUPLAS,
  VERSION_DE_LA_LIZA,
} from '../../shared/mecanicas/liza/protocolo';
import type { MensajeDeLaSala, MensajeDelAparato, SucesoDelTic, TuplaDeFoto } from '../../shared/mecanicas/liza/protocolo';
import { AQUIS_PARA_ESTAR } from '../../shared/mecanicas/liza/tipos-de-la-sala';
import { SalaVista } from '../../escritorio/src/quiebro/red/sala-vista';
import type { Novedad } from '../../escritorio/src/quiebro/red/sala-vista';
import { RelojDelCanal } from '../../escritorio/src/quiebro/red/reloj';
import { balaAcabada, recorridoDeLaBala } from '../../escritorio/src/quiebro/efectos/cuentas';
import {
  arcadesQueSeLidian,
  cabeOtraSala,
  costeDeLaLiza,
  lizaDeLaMesa,
  PRESUPUESTO_DE_LAS_LIZAS,
  registroDeLizas,
  sePuedeLidiar,
} from '../../shared/arcade/juegos/lizas';
import {
  IDS_DE_AVERIA,
  IDS_DE_CONTRAMEDIDA,
  IDS_DE_ESTILO,
  IDS_DE_RECETA,
  IDS_DE_RETOQUE,
  NOMBRES_DEL_QUIEBRO,
  nombreDelNivel,
} from '../../shared/arcade/juegos/quiebro-nombres';
import {
  COLUMNAS_DE_LA_RONDA,
  esCargaVacia,
  leerCargaDeElegir,
  leerCargaDeEstilo,
  leerRondaDelQuiebro,
  leerVistaDelQuiebro,
  MOVIMIENTO_DEL_QUIEBRO,
} from '../../shared/arcade/juegos/quiebro-vista';
import {
  leerMensajeDelAnfitrion,
  leerMensajeDelDocumento,
  origenDelAnfitrion,
  textoDelAnfitrion,
  textoDelDocumento,
  vieneDelAnfitrion,
} from '../../escritorio/src/quiebro/contrato';
import type { MensajeDelAnfitrion, MensajeDelDocumento } from '../../escritorio/src/quiebro/contrato';
import {
  ARCAS_POR_CIUDAD,
  BORDE_DE_LA_CIUDAD,
  CABINAS_POR_CIUDAD,
  cajasDeLaCelda,
  caminoPorElCampo,
  campoHasta,
  caraSimetrica,
  CASILLAS_DE_LA_CIUDAD,
  CASILLAS_DEL_CENTRO_AL_BORDE,
  celdaDe,
  celdaDelIndice,
  CELDAS,
  CERCO_DE_LA_CIUDAD,
  ciudadDeLaMesa,
  CiudadSinEscribir,
  CLASE_DE_ZONA_DE_CABINA,
  CLASE_DE_ZONA_DE_REFUGIO,
  claseDeZonaDeArca,
  claseDeZonaDePlaza,
  CRUCES,
  DISTRITOS,
  distanciaPorCalles,
  distritoDelHueco,
  EJES_DE_LA_CIUDAD,
  FALLO_MAS_CERCA,
  FALLO_MAS_LEJOS,
  huecoAntesDeLaSimetria,
  huecoDelIndice,
  HUECOS,
  huecoSimetrico,
  ID_DEL_LIMITE_DE_LA_CIUDAD,
  idDelLimiteDePlaza,
  idDeZonaDeArca,
  idDeZonaDeCabina,
  idDeZonaDePlaza,
  idDeZonaDeRefugio,
  indiceDeCelda,
  indiceDeHueco,
  LADO_DE_CASILLA_DE_LA_CIUDAD,
  LADO_DE_LA_CIUDAD,
  nudoMasCercano,
  partesDeLaTraza,
  PLAZAS_POR_CIUDAD,
  puntoAntesDeLaSimetria,
  puntoSimetrico,
  queZonaEs,
  rectanguloDeLaCelda,
  REFUGIOS_POR_CIUDAD,
  rumboSimetrico,
  SIMETRIAS,
  TRAMOS,
  TRAZAS,
  triosDeFallos,
  ULTIMA_ZONA_DE_LA_CIUDAD,
} from '../../shared/arcade/juegos/quiebro-ciudad';
import type { CajaDeLaCiudad, GrafoDeLaCiudad, IdDeDistrito, PlazaDeLaCiudad, TipoDeZonaDePlaza } from '../../shared/arcade/juegos/quiebro-ciudad';
import { barrioDeLaNoche } from '../../shared/arcade/juegos/quiebro-barrio';
import { alMinimapa, alPlano, delPlano, LADO_DEL_LIENZO, metrosQueSeEnsenan } from '../../escritorio/src/quiebro/orientacion';
import { TOPE_CARGA_BYTES } from '../src/arcade/presupuesto';
import { arnes } from './arnes';
import { sinComentarios } from './sin-comentarios';

const { comprobar, paso, nota, terminar } = arnes();

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const j = (v: unknown): string => JSON.stringify(v);
const u = (n: number): number => Math.round(n * UNO);
const igual = (a: unknown, b: unknown): boolean => canonico(a) === canonico(b);
const bytes = (texto: string): number => Buffer.byteLength(texto, 'utf8');

/** Un generador sembrado para los barridos: la misma tanda de casos en cada ejecución. */
let azar: Azar = sembrar(0x11a2a);
function entre(minimo: number, maximo: number): number {
  const t = enteroEntre(azar, minimo, maximo);
  azar = t.azar;
  return t.valor;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 1 · LA GEOMETRÍA
 * ═══════════════════════════════════════════════════════════════════════════ */

paso('rumboHacia contra Math.atan2');

/** El rumbo real, con decimales, de `(dx, dz)`: 0 al norte (−z), creciendo hacia el este. */
function rumboReal(dx: number, dz: number): number {
  let r = (Math.atan2(dx, -dz) / (2 * Math.PI)) * 256;
  if (r < 0) r += 256;
  return r;
}

{
  let malosTabla = 0;
  let malosSeno = 0;
  for (let r = 0; r < 256; r++) {
    const s = SENO[r] as number;
    const c = COSENO[r] as number;
    if (rumboHacia(s * 97, -c * 97) !== r) malosTabla++;
    const a = (2 * Math.PI * r) / 256;
    if (rumboHacia(Math.round(Math.sin(a) * 50 * UNO), Math.round(-Math.cos(a) * 50 * UNO)) !== r) malosSeno++;
  }
  comprobar('el vector de cada uno de los 256 rumbos de la tabla da ese rumbo', malosTabla === 0, { malosTabla });
  comprobar('y la dirección exacta de cada rumbo, sacada con Math.sin, también', malosSeno === 0, { malosSeno });

  let malos = 0;
  let enLaRaya = 0;
  const vistos = new Set<number>();
  const ejemplos: unknown[] = [];
  for (let i = 0; i < 20000; i++) {
    const dx = entre(-200 * UNO, 200 * UNO);
    const dz = entre(-200 * UNO, 200 * UNO);
    if (dx === 0 && dz === 0) continue;
    const real = rumboReal(dx, dz);
    const esperado = Math.round(real) % 256;
    const dado = rumboHacia(dx, dz);
    vistos.add(dado);
    if (dado === esperado) continue;
    /* Justo en la raya entre dos rumbos, la tabla redondeada puede decidir por el otro: se admite. */
    const fraccion = real - Math.floor(real);
    if (Math.abs(fraccion - 0.5) < 0.002 && (dado === Math.floor(real) % 256 || dado === Math.ceil(real) % 256)) {
      enLaRaya++;
      continue;
    }
    malos++;
    if (ejemplos.length < 5) ejemplos.push({ dx, dz, real, esperado, dado });
  }
  comprobar('en 20.000 direcciones al azar da el rumbo más cercano de Math.atan2', malos === 0, { malos, ejemplos });
  comprobar('y sale cada uno de los 256 rumbos alguna vez', vistos.size === 256, { distintos: vistos.size });
  nota(`${String(enLaRaya)} direcciones caían a menos de 0,002 rumbos de la raya entre dos`);

  comprobar(
    'los cuatro ejes: norte 0, este 64, sur 128, oeste 192; y sin dirección, 0',
    rumboHacia(0, -1) === 0 && rumboHacia(1, 0) === 64 && rumboHacia(0, 1) === 128 && rumboHacia(-1, 0) === 192 && rumboHacia(0, 0) === 0,
    [rumboHacia(0, -1), rumboHacia(1, 0), rumboHacia(0, 1), rumboHacia(-1, 0), rumboHacia(0, 0)],
  );
  comprobar(
    'giroEntre da la vuelta corta, con signo',
    giroEntre(0, 255) === -1 && giroEntre(255, 0) === 1 && giroEntre(10, 20) === 10 && giroEntre(0, 128) === -128,
    [giroEntre(0, 255), giroEntre(255, 0), giroEntre(10, 20), giroEntre(0, 128)],
  );
  const alEste = desplazado(0, 0, 64, u(3));
  comprobar('desplazado hacia el rumbo 64 va al este', alEste.x === u(3) && alEste.z === 0, alEste);
}

paso('Distancias y conos');
{
  comprobar('dentroDelRadio incluye el borde (3, 4) a 5', dentroDelRadio(u(3), u(4), u(5)));
  comprobar('y deja fuera lo que lo pasa por un dieciseismilésimo', !dentroDelRadio(u(3), u(4) + 1, u(5)));
  comprobar('y descarta por ejes sin mirar cuadrados', !dentroDelRadio(u(6), 0, u(5)) && dentroDelRadio(-u(5), 0, u(5)));
  const lejos = 67108864;
  comprobar('distanciaAlCuadrado es exacta en el tope: (2^26)² + (2^26)² = 2^53', distanciaAlCuadrado(lejos, lejos) === 9007199254740992);

  let malos = 0;
  const ejemplos: unknown[] = [];
  for (const medio of [10, 21, 43, 64]) {
    for (let i = 0; i < 3000; i++) {
      const mira = entre(0, 255);
      const dx = entre(-30 * UNO, 30 * UNO);
      const dz = entre(-30 * UNO, 30 * UNO);
      if (dx === 0 && dz === 0) continue;
      let giro = rumboReal(dx, dz) - mira;
      while (giro >= 128) giro -= 256;
      while (giro < -128) giro += 256;
      /* A menos de un cincuentavo de rumbo del borde, la tabla y el arcoseno pueden no coincidir: se salta. */
      if (Math.abs(Math.abs(giro) - medio) < 0.02) continue;
      const esperado = Math.abs(giro) <= medio;
      if (dentroDelCono(mira, dx, dz, medio) !== esperado) {
        malos++;
        if (ejemplos.length < 5) ejemplos.push({ medio, mira, dx, dz, giro });
      }
    }
  }
  comprobar('dentroDelCono coincide con el ángulo real en 12.000 casos (conos de 14°, 30°, 60° y 90°)', malos === 0, { malos, ejemplos });
  comprobar('lo que está justo encima está dentro de todo cono', dentroDelCono(0, 0, 0, 0));
  comprobar('el cono de ancho 0 es sólo el rayo', dentroDelCono(64, u(5), 0, 0) && !dentroDelCono(64, u(5), 1, 0));
  let lanzo = false;
  try {
    dentroDelCono(0, u(1), u(1), 65);
  } catch (error) {
    lanzo = error instanceof FueraDeLaLiza;
  }
  comprobar('un cono de más de un cuarto de vuelta lanza FueraDeLaLiza', lanzo);
}

paso('La prueba de losa, en los casos que se saben');
{
  const caja = [-u(1), -u(1), u(1), u(1)] as const;
  const L = (ax: number, az: number, bx: number, bz: number, radio = 0): number | null =>
    pruebaDeLosa(u(ax), u(az), u(bx), u(bz), caja[0], caja[1], caja[2], caja[3], u(radio));
  const casos: readonly [string, number | null, number | null][] = [
    ['atraviesa de lado a lado: entra a un cuarto', L(-2, 0, 2, 0), 16384],
    ['en diagonal, por la esquina de enfrente: a un cuarto', L(-2, -2, 2, 2), 16384],
    ['de derecha a izquierda: a un tercio (hacia abajo)', L(3, 0, -3, 0), 21845],
    ['paralelo a un eje y dentro de la otra losa: a un tercio', L(-0.5, -3, -0.5, 3), 21845],
    ['ensanchada 0,5: entra a un cuarto de 6', L(-3, 0, 3, 0, 0.5), 16384],
    ['empieza dentro: 0', L(0, 0, 3, 0), 0],
    ['el tramo nulo dentro: 0', L(0, 0, 0, 0), 0],
    ['pasa por encima: nada', L(-2, 2, 2, 2), null],
    ['roza la cara de arriba: no entra', L(-2, 1, 2, 1), null],
    ['pasa justo por una esquina: no entra', L(0, 2, 2, 0), null],
    ['acaba justo en la cara: no entra', L(-3, 0, -1, 0), null],
    ['empieza justo en la cara y se aleja: no entra', L(-1, 0, -3, 0), null],
    ['la caja queda detrás: nada', L(2, 0, 4, 0), null],
    ['el tramo nulo fuera: nada', L(3, 3, 3, 3), null],
  ];
  for (const [que, dado, esperado] of casos) comprobar(`losa: ${que}`, dado === esperado, { dado, esperado });

  /* Redondeo hacia abajo: el punto que sale queda de este lado de la entrada. */
  const f = pruebaDeLosa(0, 0, u(3), 0, u(1), -u(1), u(2), u(1), 0);
  const p = f === null ? null : puntoDelTramo(0, 0, u(3), 0, f);
  comprobar(
    'la fracción se redondea hacia abajo y el punto queda fuera de la caja',
    f === 21845 && p !== null && p.x < u(1) && p.x > u(1) - 4,
    { f, p },
  );
  comprobar('tramoTocaCuerpo: una bala que pasa a 0,5 de un cuerpo de radio 0,55 le toca', tramoTocaCuerpo(-u(3), u(0.5), u(3), u(0.5), 0, 0, u(0.55)));
  comprobar('y a 0,6, no', !tramoTocaCuerpo(-u(3), u(0.6), u(3), u(0.6), 0, 0, u(0.55)));

  const dos = [u(4), -u(1), u(5), u(1), -u(1), -u(1), u(1), u(1)];
  const primera = primeraLosa(dos, -u(4), 0, u(8), 0, 0);
  comprobar('primeraLosa da la más cercana aunque vaya detrás en la lista', primera !== null && primera.caja === 1, primera);
  const empate = primeraLosa([-u(1), -u(1), u(1), u(1), -u(1), -u(2), u(1), u(2)], -u(4), 0, u(4), 0, 0);
  comprobar('y con dos a la misma distancia, la de índice menor', empate !== null && empate.caja === 0, empate);
  comprobar('hayLineaDeVista: a través de la caja, no', !hayLineaDeVista(dos, -u(4), 0, u(8), 0));
  comprobar('y por un lado, sí', hayLineaDeVista(dos, -u(4), u(3), u(8), u(3)));

  let lanzo = false;
  try {
    pruebaDeLosa(TOPE_DE_LA_LIZA + 1, 0, 0, 0, 0, 0, 1, 1, 0);
  } catch (error) {
    lanzo = error instanceof FueraDeLaLiza;
  }
  comprobar('una coordenada fuera de la liza lanza FueraDeLaLiza en vez de dar un número', lanzo);
}

paso('La prueba de losa contra una versión en coma flotante');
{
  /** El «slab test» de los libros, dividiendo en coma flotante, con el interior abierto. */
  function losaFlotante(ax: number, az: number, bx: number, bz: number, x0: number, z0: number, x1: number, z1: number): number | null {
    let entra = 0;
    let sale = 1;
    for (const [a, b, lo, hi] of [
      [ax, bx, x0, x1],
      [az, bz, z0, z1],
    ] as const) {
      const d = b - a;
      if (d === 0) {
        if (!(a > lo && a < hi)) return null;
        continue;
      }
      let t0 = (lo - a) / d;
      let t1 = (hi - a) / d;
      if (t0 > t1) [t0, t1] = [t1, t0];
      if (t0 > entra) entra = t0;
      if (t1 < sale) sale = t1;
    }
    return entra < sale ? entra : null;
  }
  let distintos = 0;
  let conChoque = 0;
  const ejemplos: unknown[] = [];
  const paso16 = UNO / 16;
  for (let i = 0; i < 20000; i++) {
    const c = (): number => entre(-64, 64) * paso16;
    const ax = c();
    const az = c();
    const bx = c();
    const bz = c();
    const xa = c();
    const xb = c();
    const za = c();
    const zb = c();
    const x0 = Math.min(xa, xb);
    const x1 = Math.max(xa, xb);
    const z0 = Math.min(za, zb);
    const z1 = Math.max(za, zb);
    const dada = pruebaDeLosa(ax, az, bx, bz, x0, z0, x1, z1, 0);
    const t = x0 < x1 && z0 < z1 ? losaFlotante(ax, az, bx, bz, x0, z0, x1, z1) : null;
    const esperada = t === null ? null : Math.floor(t * UNO);
    if (dada !== null) conChoque++;
    const bien = dada === null ? esperada === null : esperada !== null && Math.abs(dada - esperada) <= 1;
    if (!bien) {
      distintos++;
      if (ejemplos.length < 5) ejemplos.push({ ax, az, bx, bz, x0, z0, x1, z1, dada, esperada });
    }
  }
  comprobar('en 20.000 tramos y cajas de la rejilla de dieciseisavos, las dos dicen lo mismo', distintos === 0, { distintos, ejemplos });
  comprobar('y el barrido tocó cajas de verdad (no son 20.000 «nada»)', conChoque > 2000, { conChoque });
}

paso('Los empujones se paran donde mundo.ts deja estar');
{
  const suelo = {
    lado: 2,
    pisables: [{ x: 0, y: 0 }],
    vados: [],
    cuerpos: [
      { x0: -1, z0: -1, x1: 1, z1: 1 },
      { x0: 4, z0: -2, x1: 5, z1: 2 },
      { x0: -6, z0: 3, x1: -2, z1: 3.5 },
    ],
    nace: [],
  };
  const arena = arenaDe(suelo);
  const radio = u(0.35);
  const t = trayectoria(arena.cuerpos, -u(4), 0, u(8), 0, radio);
  comprobar(
    'el empujón contra el pilar se para antes de él y dice contra qué caja',
    t.caja === 0 && t.x <= -u(1.35) && t.x > -u(1.35) - 8 && t.z === 0 && !chocaConCuerpo(arena, t.x, t.z, radio),
    t,
  );
  const libre = trayectoria(arena.cuerpos, -u(4), u(6), u(8), 0, radio);
  comprobar('y el que no toca nada llega entero', libre.caja === null && libre.fraccion === UNO && libre.x === u(4), libre);
  let dentro = 0;
  let paradas = 0;
  const ejemplos: unknown[] = [];
  for (let i = 0; i < 5000; i++) {
    const x = entre(-8 * UNO, 8 * UNO);
    const z = entre(-8 * UNO, 8 * UNO);
    if (chocaConCuerpo(arena, x, z, radio)) continue;
    const r = trayectoria(arena.cuerpos, x, z, entre(-10 * UNO, 10 * UNO), entre(-10 * UNO, 10 * UNO), radio);
    if (r.caja !== null) paradas++;
    if (chocaConCuerpo(arena, r.x, r.z, radio)) {
      dentro++;
      if (ejemplos.length < 5) ejemplos.push({ x, z, r });
    }
  }
  comprobar('en 5.000 empujones al azar, ninguno acaba dentro de una caja según chocaConCuerpo', dentro === 0, { dentro, ejemplos });
  comprobar('y el barrido chocó de verdad', paradas > 300, { paradas });
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 2 · LA DECLARACIÓN, CON UNA LIZA DE JUGUETE
 * ═══════════════════════════════════════════════════════════════════════════ */

paso('Una liza de juguete');

/** Una puesta de estado; si no se dice otra cosa, sin intocable, sin distancia y sin soltarse antes. */
const nada = (estado: number, tics: number, intocableTics = 0, distanciaExtra = 0, soltableDesdeTic = tics): PuestaDeEstado => ({
  estado,
  tics,
  intocableTics,
  distanciaExtra,
  soltableDesdeTic,
});

function efecto(dano: number, puesta: PuestaDeEstado | null, empuje = 0): EfectoDeclarado {
  return {
    dano,
    danoAlRitmo: dano,
    puntos: 10,
    puntosAlRitmo: 10,
    puesta,
    empuje,
    alChocar: { dano: empuje > 0 ? 15 : 0, tics: empuje > 0 && puesta !== null ? 10 : 0 },
    rompeGuardia: false,
  };
}

function golpe(id: number, extra: Partial<AccionDeclarada>): AccionDeclarada {
  return {
    id,
    anuncioTics: 8,
    alcance: u(1.1),
    holgura: u(1.2),
    enganche: { radio: u(7), conoRumbos: 43, holgura: u(0.5) },
    avance: 0,
    cadena: null,
    efecto: efecto(10, nada(2, 12)),
    imparable: false,
    recargaTics: 0,
    recuperacionTics: 0,
    soloEn: [],
    alFallar: nada(8, 8),
    ...extra,
  };
}

function reglas(asiento: string): ReglasDeAsiento {
  return {
    asiento,
    cuerpo: {
      radio: u(0.35),
      marchas: [u(2), u(5), u(7)],
      aceleracionTics: 3,
      presupuestoCorto: { velocidad: u(8.75), acumulaTics: 20 },
      presupuestoLargo: { distancia: u(80), enTics: 200 },
      vidaTope: 100,
      vidaAlRematar: 10,
      firmeCadaTics: 0,
      guardaTics: 3,
    },
    acciones: [
      golpe(1, { avance: u(5.5) }),
      golpe(2, {
        anuncioTics: 5,
        cadena: { tras: [1], antesMs: 100, despuesMs: 250, ritmoMs: 75, anuncioTicsAlRitmo: 4, soloSiDio: false },
        efecto: efecto(10, nada(2, 10), u(3)),
      }),
      golpe(3, { anuncioTics: 3, imparable: true, soloEn: [3], alFallar: null, efecto: efecto(25, nada(4, 30)) }),
    ],
    esquiva: {
      accion: 10,
      /* Nueve tics, se puede golpear desde el sexto, y sin intocable: lo que esquiva es la ventana. */
      puesta: nada(1, 9, 0, u(4), 6),
      ventanaMs: 200,
      esquivaHastaMs: 250,
      primeras: { cuantas: 3, ventanaMs: 300 },
      torpe: { cada: 3, enTics: 24 },
      alAcertar: { puesta: nada(3, 20, 20), alAutor: nada(8, 20) },
      contraProyectil: { distancia: u(10), tics: 8, accion: 3 },
      ruptura: { coste: 50, desde: [2], puesta: nada(1, 9, 6, u(4), 6) },
    },
    rescate: { accion: 11, radio: u(1.5), mantenerTics: 30, puesta: nada(5, 30), vidaAlVolver: 40, medidorAmbos: 0 },
    tiro: null,
    medidor: { tope: 100, porLimpia: 35, porRitmo: 5, porRemate: 20, porChoque: 10 },
    puntos: {
      factor: UNO,
      multiplicador: { paso: 6554, tope: 2 * UNO },
      porLimpia: 50,
      porChoque: 30,
      porRemate: 100,
      porRescate: 75,
      porSalir: 150,
    },
    alEmpezar: { vida: 100, medidor: 0, lleva: [{ portable: 1, n: 0 }] },
  };
}

function lizaDeJuguete(): LizaDeclarada {
  const pisables: { x: number; y: number }[] = [];
  for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) pisables.push({ x, y });
  const caja = (x0: number, z0: number, x1: number, z1: number): { x0: number; z0: number; x1: number; z1: number } => ({
    x0: u(x0),
    z0: u(z0),
    x1: u(x1),
    z1: u(z1),
  });
  const estado = (id: number, bloqueaPaso: boolean, bloqueaAccion: boolean, cancelaCon: number[], seCortaConDano = false) => ({
    id,
    bloqueaPaso,
    bloqueaAccion,
    cancelaCon,
    seCortaConDano,
  });
  return {
    version: VERSION_DE_LA_DECLARACION,
    mundo: {
      metrosPorUnidad: UNO,
      suelo: {
        lado: 2,
        pisables,
        vados: [],
        cuerpos: [
          { x0: -1, z0: -1, x1: 1, z1: 1 },
          { x0: 4, z0: -2, x1: 5, z1: 2 },
        ],
        nace: [],
      },
      clasesDeCaja: [1, 1],
      zonas: [
        { id: 1, clase: 1, caja: caja(8, 8, 10, 10) },
        { id: 2, clase: 1, caja: caja(-10, 8, -8, 10) },
        { id: 3, clase: 2, caja: caja(-1, 9, 1, 10) },
      ],
      limites: [{ id: 1, caja: caja(-12, -12, 12, 12) }],
      grafo: {
        nudos: [
          { x: u(-6), z: u(-6) },
          { x: u(6), z: u(-6) },
          { x: u(6), z: u(6) },
          { x: u(-6), z: u(6) },
        ],
        aristas: [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 0],
        ],
      },
      nace: [
        { papel: 'asiento', x: u(-3), z: u(-3), rumbo: 32 },
        { papel: 'asiento', x: u(3), z: u(-3), rumbo: 224 },
        { papel: 'reaparicion', x: 0, z: u(-8), rumbo: 0 },
      ],
    },
    fase: {
      clave: 'n1-o1',
      modo: 'encuentro',
      limite: 1,
      semilla: 12345,
      reloj: null,
      encuentro: {
        ronda: 1,
        presentes: 2,
        relojTics: 3000,
        vivasALaVez: [6, 8],
        grupos: [
          { clase: 2, cuantos: [4, 6], vivasALaVez: [4, 6], claseDeZona: 1, desdeTic: 0, cadaTics: 10, eleccion: 'azar' },
          { clase: 1, cuantos: [1, 1], vivasALaVez: [1, 1], claseDeZona: 1, desdeTic: 100, cadaTics: 0, eleccion: 'zonaDeAccion' },
        ],
        fin: {
          tipo: 'salida',
          zona: {
            claseDeZona: 2,
            accion: 13,
            radio: u(1.5),
            mantenerTics: 30,
            capacidad: 1,
            puesta: nada(5, 30),
            rompeConDano: true,
            activaTics: 1000,
            alApagarse: { coste: 1, siguienteTics: 800 },
          },
          salenComoMinimo: [1, 1],
        },
        olvido: { distancia: u(90), tics: 200 },
      },
    },
    asientos: [reglas('a1'), reglas('a2')],
    estados: [
      estado(1, false, true, []),
      estado(2, true, true, [10]),
      estado(3, false, false, []),
      estado(4, true, true, []),
      estado(5, true, true, [], true),
      estado(6, true, true, []),
      estado(7, true, true, []),
      estado(8, true, true, []),
      estado(9, true, true, []),
      estado(10, false, false, []),
    ],
    clases: [
      {
        id: 1,
        vida: 90,
        radio: u(0.35),
        velocidad: u(5.5),
        acciones: [golpe(40, { anuncioTics: 11, enganche: null, alFallar: null }), golpe(41, { anuncioTics: 6, enganche: null, alFallar: null })],
        proyectil: 1,
        guardia: {
          conoRumbos: 43,
          para: [1],
          salvoEn: [2, 8],
          alParar: nada(8, 8),
          respuesta: 41,
          esquivaAlAzar: { acciones: [2], probabilidad: UNO / 2 },
        },
        cerebro: { distanciaMinima: 0, distanciaMaxima: u(1.1), decideCadaTics: 4, costeCuerpoACuerpo: 2, costeDisparo: 1, sigueElGrafo: true, alcanceDeBlanco: u(45) },
        aparicion: { modo: 'imprimir', tics: 24 },
        alCaer: {
          tipo: 'rematable',
          puesta: nada(9, 60),
          remate: { accion: 12, radio: u(2.5), mantenerTics: 24, puesta: nada(5, 24, 24) },
          suelta: { portable: 1, n: 3 },
          siNo: { absorbe: 2, radio: u(12), absorbiendo: nada(9, 12), vida: 45, reapareceTras: 40, claseDeZona: 1, distanciaMinima: u(15) },
        },
      },
      {
        id: 2,
        vida: 20,
        radio: u(0.35),
        velocidad: u(4),
        acciones: [golpe(42, { anuncioTics: 14, enganche: null, alFallar: null, efecto: efecto(8, null) })],
        proyectil: 0,
        guardia: null,
        cerebro: { distanciaMinima: 0, distanciaMaxima: u(1.1), decideCadaTics: 4, costeCuerpoACuerpo: 1, costeDisparo: 0, sigueElGrafo: false, alcanceDeBlanco: u(45) },
        aparicion: { modo: 'desdePunto', tics: 10 },
        alCaer: { tipo: 'irse' },
      },
    ],
    proyectiles: [
      { id: 1, apuntarTics: 12, balas: 3, cadaTics: 3, velocidad: u(20), radio: u(0.2), alcance: u(30), efecto: efecto(12, nada(2, 10)) },
    ],
    turnos: { cuerpoACuerpo: 2, disparo: 1, anunciosALaVez: 3, excluyen: [3, 6, 7, 10], alargarConLaRed: true, repetirTrasTics: 20 },
    portables: [{ id: 1, tope: 12, radioDeRecogida: u(1.2), montonTics: 400, pago: { tipo: 'triangular', porUnidad: 10 } }],
    equipo: { recurso: 3, caida: nada(4, 240), reaparicion: { coste: 1, esperaTics: 160, vida: 60, puesta: nada(10, 40, 40) } },
    sinCuerpo: { estado: 6 },
    presencia: { ausenteTrasTics: 40, estadoAusente: 7, veredictoTrasTics: 1200 },
    avisos: {
      clases: [
        { id: 1, vidaTics: 80, objetivo: 'entidad' },
        { id: 2, vidaTics: 60, objetivo: 'asiento' },
        { id: 3, vidaTics: 60, objetivo: 'ninguno' },
      ],
      cadaTics: 20,
    },
    red: { compBaseMs: 25, compTopeMs: 150, esperaDeSitiosMs: 250 },
    veredictos: { columnas: [{ que: 'puntos' }, { que: 'lleva', portable: 1 }, { que: 'vida' }, { que: 'salio' }] },
    aforo: { entidades: 14, balas: 12, montones: 8 },
  };
}

const JUGUETE = lizaDeJuguete();
{
  const problemas = problemasDeLaDeclaracion(JUGUETE);
  comprobar('la liza de juguete no tiene problemas', problemas.length === 0, problemas);
  comprobar('y su arena sale de su suelo, con sus dos cajas', arenaDeLaLiza(JUGUETE).cuerpos.length === 8);
  comprobar('numeroDelAsiento cuenta desde 1 en el orden de la mesa', numeroDelAsiento(JUGUETE, 'a1') === 1 && numeroDelAsiento(JUGUETE, 'a2') === 2 && numeroDelAsiento(JUGUETE, 'zz') === 0);
  const cable = accionesDelCable(JUGUETE, JUGUETE.asientos[0] as ReglasDeAsiento);
  comprobar('accionesDelCable junta golpes, esquiva, rescate, remate y zona', igual(cable, [1, 2, 3, 10, 11, 12, 13]), cable);
  const conLasDelQuiebro = { ...JUGUETE, veredictos: { columnas: COLUMNAS_DE_LA_RONDA } };
  comprobar(
    'las columnas de la ronda de El Quiebro son columnas válidas de la liza',
    problemasDeLaDeclaracion(conLasDelQuiebro).length === 0,
    problemasDeLaDeclaracion(conLasDelQuiebro),
  );
  comprobar('las claves cortas: letras, cifras y _ . : - hasta 64', esClaveCorta('n1-o2') && esClaveCorta('a.b:c_d') && !esClaveCorta('') && !esClaveCorta('x'.repeat(65)) && !esClaveCorta('n1 o2') && !esClaveCorta('"'));
}

paso('Y sus versiones rotas');

const QUITAR = Symbol('quitar');

/** Una copia de `base` con el valor de `ruta` (claves separadas por puntos) cambiado o quitado. */
function conCambio(base: unknown, ruta: string, valor: unknown): unknown {
  const copia = JSON.parse(JSON.stringify(base)) as unknown;
  const partes = ruta.split('.');
  let aqui = copia as Record<string, unknown>;
  for (let i = 0; i < partes.length - 1; i++) aqui = aqui[partes[i] as string] as Record<string, unknown>;
  const ultima = partes[partes.length - 1] as string;
  if (valor === QUITAR) delete aqui[ultima];
  else aqui[ultima] = valor;
  return copia;
}

const cincoPortables = [1, 2, 3, 4, 5].map((id) => ({ id, tope: 12, radioDeRecogida: u(1.2), montonTics: 400, pago: { tipo: 'lineal', porUnidad: 1 } }));
const muchasCajas = Array.from({ length: 4097 }, () => ({ x0: -10, z0: -10, x1: -9.99, z1: -9.99 }));
const sueloEnorme = { lado: 1 / 16, pisables: [{ x: -8000, y: -8000 }, { x: 8000, y: 8000 }], vados: [], cuerpos: [], nace: [] };

const ROTAS: readonly [string, string, unknown, string][] = [
  ['otra versión', 'version', 2, 'version'],
  ['un estado repetido', 'estados.1.id', 1, 'se repite'],
  ['la esquiva pone un estado que no existe', 'asientos.0.esquiva.puesta.estado', 99, 'no está declarado'],
  ['más intocable que estado', 'equipo.reaparicion.puesta.intocableTics', 41, 'intocableTics'],
  ['una zona del revés', 'mundo.zonas.0.caja.x1', u(7), 'del revés'],
  ['una zona fuera de la liza', 'mundo.zonas.0.caja.x1', TOPE_DE_LA_LIZA + 1, 'entero de'],
  ['una clase de caja de menos', 'mundo.clasesDeCaja', [1], 'una clase por caja'],
  ['sitios de nacer en el suelo', 'mundo.suelo.nace', [{ x: 0, z: 0, rumbo: 0 }], 'va vacío'],
  ['una caja del suelo fuera de la liza', 'mundo.suelo.cuerpos.1.x1', 600, 'se sale de la liza'],
  ['nadie nace de asiento', 'mundo.nace', [{ papel: 'reaparicion', x: 0, z: u(-8), rumbo: 0 }], "'asiento'"],
  ['nadie reaparece', 'mundo.nace', [{ papel: 'asiento', x: u(-3), z: u(-3), rumbo: 0 }], "'reaparicion'"],
  ['un sitio de nacer de un papel que no existe', 'mundo.nace.2.papel', 'vigia', 'papel'],
  ['un sitio de nacer dentro de una caja', 'mundo.nace.0', { papel: 'asiento', x: 0, z: 0, rumbo: 0 }, 'no se puede estar'],
  ['un sitio de nacer sin suelo', 'mundo.nace.1', { papel: 'asiento', x: u(100), z: 0, rumbo: 0 }, 'no se puede estar'],
  ['un sitio de nacer con suelo pero fuera del límite de la fase', 'mundo.nace.1', { papel: 'asiento', x: u(12.5), z: 0, rumbo: 0 }, 'fuera del límite'],
  ['un lado de casilla que redondea a nada', 'mundo.suelo.lado', 1e-6, 'mundo.suelo.lado'],
  ['una casilla del suelo fuera de la liza', 'mundo.suelo.pisables.0', { x: 5000, y: 0 }, 'se sale de la liza'],
  ['una casilla que no es de enteros', 'mundo.suelo.pisables.0', { x: 0.5, y: 0 }, 'dos enteros'],
  ['un suelo cuyo rectángulo no cabe en memoria', 'mundo.suelo', sueloEnorme, 'casillas y caben'],
  ['más cajas de las que la losa recorre', 'mundo.suelo.cuerpos', muchasCajas, 'caben 4096'],
  ['una arista a un nudo que no hay', 'mundo.grafo.aristas.0', [0, 9], 'entero de'],
  ['una arista repetida', 'mundo.grafo.aristas.1', [1, 0], 'dos veces'],
  ['una cadena tras una acción que no hay', 'asientos.0.acciones.1.cadena.tras', [7], 'no está declarado'],
  ['un cono de más de un cuarto de vuelta', 'asientos.0.acciones.0.enganche.conoRumbos', 70, 'conoRumbos'],
  ['un golpe de asiento con el id de uno de entidad', 'asientos.1.acciones.0.id', 40, 'clase de entidad'],
  ['la esquiva con el id de un golpe', 'asientos.0.esquiva.accion', 1, 'se repite'],
  ['la esquiva con intocable: dos jueces para un impacto', 'asientos.0.esquiva.puesta.intocableTics', 1, 'no tiene intocable'],
  ['una recuperación que se suelta después de acabar', 'asientos.0.esquiva.puesta.soltableDesdeTic', 10, 'soltableDesdeTic'],
  ['un estado que no bloquea y dice soltarse antes', 'asientos.0.esquiva.alAcertar.puesta.soltableDesdeTic', 5, 'no bloquea acciones'],
  ['un límite de fase que no existe', 'fase.limite', 9, 'el límite'],
  ['una clave de fase con espacios', 'fase.clave', 'noche 1', 'clave corta'],
  ['el modo encuentro sin encuentro', 'fase.encuentro', null, 'tiene que haber encuentro'],
  ['el modo calma con encuentro', 'fase.modo', 'calma', 'va a null'],
  ['un encuentro sin presentes', 'fase.encuentro.presentes', 0, 'presentes'],
  ['más presentes que asientos', 'fase.encuentro.presentes', 3, 'presentes'],
  ['una tabla por presentes de más', 'fase.encuentro.vivasALaVez', [6, 8, 10], 'uno por cada número de presentes'],
  ['más vivas que el aforo', 'fase.encuentro.vivasALaVez', [6, 20], 'aforo'],
  ['un grupo de una clase que no hay', 'fase.encuentro.grupos.0.clase', 7, 'la clase'],
  ['un grupo que sale de una clase de zona sin zonas', 'fase.encuentro.grupos.0.claseDeZona', 9, 'ninguna zona'],
  ['más vida al empezar que el tope', 'asientos.0.alEmpezar.vida', 101, 'alEmpezar.vida'],
  ['lleva más de lo que cabe', 'asientos.0.alEmpezar.lleva.0.n', 13, 'el tope'],
  ['una ruptura desde un estado que no la admite', 'asientos.0.esquiva.ruptura.desde', [4], 'cancelaCon'],
  ['un número que no es dato llano (undefined)', 'asientos.0.cuerpo.guardaTics', undefined, 'canonico'],
  ['un daño con decimales', 'asientos.0.acciones.0.efecto.dano', 1.5, 'efecto.dano'],
  ['una columna de un portable que no hay', 'veredictos.columnas.1.portable', 4, 'el portable'],
  ['una columna que no es un contador', 'veredictos.columnas.0', { que: 'estampados' }, 'no es un contador'],
  ['una columna repetida', 'veredictos.columnas', [{ que: 'puntos' }, { que: 'puntos' }], 'está dos veces'],
  ['sesenta columnas', 'veredictos.columnas', Array.from({ length: 60 }, () => ({ que: 'puntos' })), `de 1 a ${String(TOPE_DE_COLUMNAS)}`],
  ['que salgan más de los que hay', 'fase.encuentro.fin.salenComoMinimo', [2, 1], 'no pueden salir'],
  ['un asiento repetido', 'asientos.1.asiento', 'a1', 'dos veces'],
  ['la ventana limpia más ancha que la de esquivar', 'asientos.0.esquiva.ventanaMs', 300, 'ventana limpia'],
  ['un choque que alarga un estado que no hay', 'clases.1.acciones.0.efecto.alChocar.tics', 5, 'no hay estado que alargar'],
  ['una marcha más lenta que la anterior', 'asientos.0.cuerpo.marchas', [u(5), u(2)], 'de menos a más'],
  ['un presupuesto corto que no deja correr', 'asientos.0.cuerpo.presupuestoCorto.velocidad', u(6), 'marcha más rápida'],
  ['un factor de puntos de ×100 (por() daría la vuelta)', 'asientos.0.puntos.factor', 100 * UNO, 'puntos.factor'],
  ['un pago que lleno pasa del tope de una suma', 'portables.0.pago.porUnidad', 100000, 'darían la vuelta'],
  ['cinco portables', 'portables', cincoPortables, 'caben 4'],
  ['una clase que se levanta con más vida que la suya', 'clases.0.alCaer.siNo.vida', 91, 'más vida'],
  ['una absorción en un estado que no hay', 'clases.0.alCaer.siNo.absorbiendo.estado', 99, 'no está declarado'],
  ['una forma de elegir zona que no existe', 'fase.encuentro.grupos.0.eleccion', 'cerca', 'eleccion'],
  ['un guardián de la zona de acción en un encuentro sin ella', 'fase.encuentro.fin', { tipo: 'vaciar' }, 'no saldría nunca'],
  ['un aforo que no cabe en la foto ni en el cable', 'aforo.entidades', 2000, 'aforo.entidades'],
  ['cien mil balas', 'aforo.balas', 100000, 'aforo.balas'],
  ['portables sin sitio para sus montones', 'aforo.montones', 0, 'ningún montón cabe'],
  ['una lista que falta', 'mundo.limites', QUITAR, 'tiene que ser una lista'],
  ['el catálogo de estados entero, que falta', 'estados', QUITAR, 'la forma del contrato'],
  /* L10, ya en la declaración: el alcance de blanco de cada clase y el olvido del encuentro. */
  ['un olvido a distancia 0', 'fase.encuentro.olvido.distancia', 0, 'olvido.distancia'],
  ['un olvido sin su distancia', 'fase.encuentro.olvido.distancia', QUITAR, 'olvido.distancia'],
  ['un olvido que no espera nada (0 tics)', 'fase.encuentro.olvido.tics', 0, 'olvido.tics'],
  ['un olvido de más de una hora', 'fase.encuentro.olvido.tics', TOPE_DE_TICS + 1, 'olvido.tics'],
  ['un olvido que es un número', 'fase.encuentro.olvido', 90, '{distancia, tics} o null'],
  ['un olvido sin definir (undefined)', 'fase.encuentro.olvido', undefined, '{distancia, tics} o null'],
  /* «alcanceDeBlanco: vale» es la frase del rango; la de «cabe en el olvido» dice «alcanceDeBlanco: es». */
  ['un alcance de blanco negativo', 'clases.1.cerebro.alcanceDeBlanco', -u(1), 'alcanceDeBlanco: vale'],
  ['un alcance de blanco con decimales', 'clases.0.cerebro.alcanceDeBlanco', 1.5, 'alcanceDeBlanco: vale'],
  ['un alcance de blanco más allá de la liza', 'clases.0.cerebro.alcanceDeBlanco', 2 * TOPE_DE_LA_LIZA + 1, 'alcanceDeBlanco: vale'],
  ['un alcance de blanco más largo que el olvido', 'clases.0.cerebro.alcanceDeBlanco', u(91), 'se olvidaría persiguiendo'],
  ['una clase sin tope (0) en un encuentro con olvido', 'clases.1.cerebro.alcanceDeBlanco', 0, 'sin tope (0)'],
  ['una clase sin alcance (la forma transitoria) en un encuentro con olvido', 'clases.1.cerebro.alcanceDeBlanco', QUITAR, 'sin tope (0)'],
];
for (const [que, ruta, valor, dice] of ROTAS) {
  const rota = conCambio(JUGUETE, ruta, valor) as LizaDeclarada;
  let problemas: string[] = [];
  let lanzo: unknown = null;
  try {
    problemas = problemasDeLaDeclaracion(rota);
  } catch (error) {
    lanzo = error;
  }
  comprobar(
    `rota (${que}): tiene problemas, sin lanzar, y alguno dice «${dice}»`,
    lanzo === null && problemas.some((p) => p.includes(dice)),
    lanzo === null ? problemas.slice(0, 4) : String(lanzo),
  );
}
{
  /* La que la revisión encontró en verde: ventana de 250 ms y 1 tic de intocable, con torpe. */
  const doble = conCambio(conCambio(JUGUETE, 'asientos.0.esquiva.esquivaHastaMs', 250), 'asientos.0.esquiva.puesta.intocableTics', 1) as LizaDeclarada;
  comprobar('una esquiva que se juzgaría dos veces (ventana e intocable) no pasa', problemasDeLaDeclaracion(doble).some((p) => p.includes('no tiene intocable')));
}
{
  /*
   * L10 · LA FORMA TRANSITORIA Y LA NEUTRA. La de juguete declara L10 entero (alcance de 45 en las dos
   * clases, olvido a 90 en 200 tics). Sin alcance en ningún cerebro ni olvido en el encuentro —como la
   * escriben los productores que aún no declaran L10— no tiene problemas y se lee como «sin tope, sin
   * olvido»; y la entera con alcance 0 y olvido `null`, igual. Lo que se comprueba jugando, en `verify:liza`.
   */
  const sinL10 = conCambio(conCambio(conCambio(JUGUETE, 'fase.encuentro.olvido', QUITAR), 'clases.0.cerebro.alcanceDeBlanco', QUITAR), 'clases.1.cerebro.alcanceDeBlanco', QUITAR) as LizaDeclarada;
  const neutra = conCambio(conCambio(conCambio(JUGUETE, 'fase.encuentro.olvido', null), 'clases.0.cerebro.alcanceDeBlanco', 0), 'clases.1.cerebro.alcanceDeBlanco', 0) as LizaDeclarada;
  comprobar(
    'L10: la forma transitoria (sin alcance de blanco ni olvido) y la neutra (alcance 0, olvido null) no tienen problemas',
    problemasDeLaDeclaracion(sinL10).length === 0 && problemasDeLaDeclaracion(neutra).length === 0,
    [...problemasDeLaDeclaracion(sinL10), ...problemasDeLaDeclaracion(neutra)],
  );
  const enSinL10 = sinL10.fase.encuentro;
  const enNeutra = neutra.fase.encuentro;
  const enEntera = JUGUETE.fase.encuentro;
  comprobar(
    'L10: la transitoria se lee como la neutra —sin tope y sin olvido— y la entera con sus números',
    enSinL10 !== null &&
      enNeutra !== null &&
      enEntera !== null &&
      !('olvido' in enSinL10) &&
      olvidoDelEncuentro(enSinL10) === null &&
      olvidoDelEncuentro(enNeutra) === null &&
      igual(olvidoDelEncuentro(enEntera), { distancia: u(90), tics: 200 }) &&
      sinL10.clases.every((c) => !('alcanceDeBlanco' in c.cerebro) && alcanceDeBlancoDe(c.cerebro) === 0) &&
      neutra.clases.every((c) => alcanceDeBlancoDe(c.cerebro) === 0) &&
      JUGUETE.clases.every((c) => alcanceDeBlancoDe(c.cerebro) === u(45)),
  );
  const hoy = ampliacionDeHoy(JUGUETE);
  comprobar(
    'L10 ya no está en la ampliación: ni olvido ni alcance de blanco en la de hoy (entró en la declaración)',
    !('olvido' in hoy) && hoy.clases.length === 2 && hoy.clases.every((c) => Object.keys(c).join(',') === 'desprevenida'),
    hoy,
  );
}

/*
 * ═══ W · EL TIRO CARGADO: LA FORMA, ANTES DE QUE LA SALA LO CUMPLA ═══
 *
 * El arco de juguete: se tensa manteniendo la 20 y se suelta con la 21, con cuatro niveles (de un disparo corto
 * con área a uno largo sin ella), una bala de un solo disparo por nivel y el estado 11 mientras se tensa. Su forma
 * está entera —la única frase que le saca la revisión es la de hoy: que la sala todavía no lo cumple— y cada una
 * de sus versiones rotas saca además la suya. Quien cablee el tiro en la sala quita esa frase y este bloque se
 * queda con la forma (y la comprobación de la frase, a «ningún problema»).
 */
paso('El tiro cargado (W): su forma entera, que hoy la sala todavía rechaza, y sus versiones rotas');

const TIRO_DE_JUGUETE = {
  apuntar: 20,
  soltar: 21,
  puesta: nada(11, 40),
  niveles: [
    { desdeMs: 0, proyectil: 2, ancho: u(0.3), area: u(3), efectoDelArea: efecto(8, nada(8, 10), u(1)), recargaTics: 60 },
    { desdeMs: 300, proyectil: 3, ancho: u(0.2), area: u(2), efectoDelArea: efecto(15, nada(2, 10), u(1)), recargaTics: 72 },
    { desdeMs: 750, proyectil: 4, ancho: u(0.15), area: u(1), efectoDelArea: efecto(25, nada(2, 12), u(1.5)), recargaTics: 86 },
    { desdeMs: 1300, proyectil: 5, ancho: u(0.1), area: 0, efectoDelArea: null, recargaTics: 100 },
  ],
  enganche: { radio: u(40), conoRumbos: 8, holgura: u(0.5) },
  holgura: u(0.6),
  cargaMaximaMs: 2000,
};
/** Una bala de un solo disparo, la de un nivel del tiro. */
const balaDeTiro = (id: number, alcance: number, dano: number): Record<string, unknown> => ({
  id,
  apuntarTics: 1,
  balas: 1,
  cadaTics: 0,
  velocidad: u(400),
  radio: u(0.05),
  alcance: u(alcance),
  efecto: efecto(dano, nada(2, 10)),
});
const JUGUETE_CON_TIRO = conCambio(
  conCambio(
    conCambio(JUGUETE, 'asientos.0.tiro', TIRO_DE_JUGUETE),
    'estados',
    [...JUGUETE.estados, { id: 11, bloqueaPaso: true, bloqueaAccion: false, cancelaCon: [], seCortaConDano: true }],
  ),
  'proyectiles',
  [...JUGUETE.proyectiles, balaDeTiro(2, 16, 8), balaDeTiro(3, 24, 15), balaDeTiro(4, 32, 25), balaDeTiro(5, 45, 40)],
) as LizaDeclarada;
{
  const problemas = problemasDeLaDeclaracion(JUGUETE_CON_TIRO);
  comprobar(
    'el arco de juguete tiene su forma entera: la única frase que le saca la revisión es la de hoy (la sala todavía no cumple el tiro)',
    problemas.length === 1 && (problemas[0] ?? '').startsWith('asientos[0].tiro: la sala todavía no cumple el tiro cargado'),
    problemas,
  );
  const cable = accionesDelCable(JUGUETE_CON_TIRO, JUGUETE_CON_TIRO.asientos[0] as ReglasDeAsiento);
  comprobar('y accionesDelCable pone sus dos ids (tensar y soltar) tras el rescate', igual(cable, [1, 2, 3, 10, 11, 20, 21, 12, 13]), cable);
}
const ROTAS_DEL_TIRO: readonly [string, string, unknown, string][] = [
  ['tensar con el id de un golpe del asiento', 'asientos.0.tiro.apuntar', 1, 'se repite'],
  ['soltar con el mismo id que tensar', 'asientos.0.tiro.soltar', 20, 'se repite'],
  ['soltar con el id de una acción de entidad', 'asientos.0.tiro.soltar', 40, 'clase de entidad'],
  ['tensar con el id 0', 'asientos.0.tiro.apuntar', 0, 'tiro.apuntar'],
  ['un estado de tensar que no existe', 'asientos.0.tiro.puesta.estado', 99, 'no está declarado'],
  ['un estado de tensar más corto que la carga máxima', 'asientos.0.tiro.puesta.tics', 10, 'la cortaría'],
  ['un tiro sin niveles', 'asientos.0.tiro.niveles', [], 'de 1 a 8'],
  ['un tiro con nueve niveles', 'asientos.0.tiro.niveles', Array.from({ length: 9 }, (_, i) => ({ ...TIRO_DE_JUGUETE.niveles[3], desdeMs: i * 10 })), 'de 1 a 8'],
  ['un primer nivel que no empieza en 0', 'asientos.0.tiro.niveles.0.desdeMs', 100, 'empieza en 0'],
  ['niveles que no van de menos a más carga', 'asientos.0.tiro.niveles.2.desdeMs', 300, 'de menos a más carga'],
  ['un nivel con una bala que no está', 'asientos.0.tiro.niveles.1.proyectil', 9, 'no está declarado'],
  ['un nivel con la bala de una ráfaga', 'asientos.0.tiro.niveles.1.proyectil', 1, 'un solo disparo'],
  ['dos niveles con la misma bala', 'asientos.0.tiro.niveles.1.proyectil', 2, 'cada nivel con su bala'],
  ['un área con decimales', 'asientos.0.tiro.niveles.0.area', 1.5, 'niveles[0].area'],
  ['un ancho negativo', 'asientos.0.tiro.niveles.0.ancho', -1, 'niveles[0].ancho'],
  ['un área sin efecto', 'asientos.0.tiro.niveles.0.efectoDelArea', null, 'lleva efecto'],
  ['un efecto de área sin área', 'asientos.0.tiro.niveles.3.efectoDelArea', efecto(8, null), 'sin área no alcanza'],
  ['un efecto de área con un estado que no existe', 'asientos.0.tiro.niveles.0.efectoDelArea.puesta.estado', 99, 'no está declarado'],
  ['una recarga negativa', 'asientos.0.tiro.niveles.0.recargaTics', -1, 'recargaTics'],
  ['una carga máxima que no llega al último nivel', 'asientos.0.tiro.cargaMaximaMs', 1000, 'no se llegaría nunca'],
  ['una carga máxima de más de diez segundos', 'asientos.0.tiro.cargaMaximaMs', 20000, 'cargaMaximaMs'],
  ['un enganche de más de un cuarto de vuelta', 'asientos.0.tiro.enganche.conoRumbos', 70, 'conoRumbos'],
  ['una holgura negativa', 'asientos.0.tiro.holgura', -1, 'tiro.holgura'],
  ['un asiento sin el campo del tiro', 'asientos.0.tiro', QUITAR, 'falta'],
];
for (const [que, ruta, valor, dice] of ROTAS_DEL_TIRO) {
  const rota = conCambio(JUGUETE_CON_TIRO, ruta, valor) as LizaDeclarada;
  let problemas: string[] = [];
  let lanzo: unknown = null;
  try {
    problemas = problemasDeLaDeclaracion(rota);
  } catch (error) {
    lanzo = error;
  }
  comprobar(
    `tiro roto (${que}): sin lanzar, y alguna frase dice «${dice}»`,
    lanzo === null && problemas.some((p) => p.includes(dice)),
    lanzo === null ? problemas.slice(0, 4) : String(lanzo),
  );
}

/*
 * ═══ LA LIZA ABIERTA: L1-L12, ANTES DE QUE LA SALA LAS CUMPLA ═══
 *
 * (L10 ya la cumple: está arriba, con la declaración.)
 *
 * Las declaraciones nuevas viven con su forma en `AmpliacionDeLaLiza` hasta que la sala las cumpla (ver
 * «Lo que entra» en `declaracion.ts`). Aquí se revisan contra dos lizas de juguete: la de arriba con cuatro
 * grupos (se sale por una zona de acción con dos bandas, hay una ronda, una calma y un rezagado) y la
 * misma con un encuentro que se gana cumpliendo un objetivo (dos grupos que se abren al entrar, excluyentes).
 * Las dos ampliaciones buenas no tienen problemas, y cada una de sus versiones rotas sí, con el problema
 * nombrado.
 */
paso('La liza abierta (L1-L12): las ampliaciones buenas y sus versiones rotas');

/** El juguete con cuatro grupos: los dos de arriba, uno para el rezagado y otro para el refuerzo de la ronda. */
const JUGUETE_ABIERTO = conCambio(JUGUETE, 'fase.encuentro.grupos', [
  ...(JUGUETE.fase.encuentro?.grupos ?? []),
  { clase: 2, cuantos: [2, 2], vivasALaVez: [2, 2], claseDeZona: 1, desdeTic: 0, cadaTics: 20, eleccion: 'azar' },
  { clase: 2, cuantos: [2, 2], vivasALaVez: [2, 2], claseDeZona: 1, desdeTic: 40, cadaTics: 0, eleccion: 'azar' },
]) as LizaDeclarada;
/** Y el mismo con un encuentro que acaba al vaciarse (el objetivo de la ampliación lo sustituye). */
const JUGUETE_CON_OBJETIVO = conCambio(conCambio(JUGUETE_ABIERTO, 'fase.encuentro.fin', { tipo: 'vaciar' }), 'fase.encuentro.grupos.1.eleccion', 'azar') as LizaDeclarada;

const AMPLIADA: AmpliacionDeLaLiza = {
  grupos: [
    {
      eleccion: { tipo: 'nudo', desde: u(2), hasta: u(6), sesgo: 'delante', conoRumbos: 43, sinVista: true },
      disparo: { tipo: 'calma', tics: 400, radioDeCombate: u(15), lejosDeZonas: { conjunto: 0, distancia: u(60) }, veces: 2, secundarios: { racimos: 1, miembros: 2, minimo: 3 } },
    },
    { eleccion: { tipo: 'zonaDeAccion', banda: 1 }, disparo: { tipo: 'tic' } },
    { eleccion: { tipo: 'nudo', desde: u(2), hasta: u(5), sesgo: 'detras', conoRumbos: 43, sinVista: true }, disparo: { tipo: 'rezagado', distancia: u(70), tics: 200, cadaTics: 300, vivas: 2 } },
    { eleccion: { tipo: 'nudo', desde: u(2), hasta: u(6), sesgo: 'cualquiera', conoRumbos: 0, sinVista: true }, disparo: { tipo: 'ronda' } },
  ],
  rondas: {
    aLaVez: 1,
    lista: [
      {
        miembros: [2, 2],
        ruta: [0, 1, 2, 3],
        paso: u(1.4),
        separacion: u(1.5),
        desfaseTics: 17,
        materializa: u(60),
        alOlvidarse: 'guion',
        vista: { radio: u(20), conoRumbos: 43 },
        oido: { radio: u(6), aLaCarrera: u(12) },
        alarmaTics: 40,
        refuerzo: 4,
      },
    ],
  },
  fin: null,
  salida: {
    claseDeZona: 2,
    accion: 13,
    radio: u(1.5),
    mantenerTics: 30,
    capacidad: 1,
    puesta: nada(5, 30),
    rompeConDano: true,
    activaTics: 1000,
    alApagarse: { coste: 1, siguienteTics: 800 },
    activasALaVez: 2,
    bandas: [
      { desde: u(5), hasta: u(8), puntos: 0 },
      { desde: u(9), hasta: u(13), puntos: 100 },
    ],
    relevo: { desde: u(5), hasta: u(10), puntos: 0 },
    efecto: { tipo: 'salir' },
  },
  zonasDeAccion: [
    {
      claseDeZona: 1,
      accion: 14,
      radio: u(1.5),
      mantenerTics: 20,
      capacidad: 1,
      puesta: nada(5, 20),
      rompeConDano: true,
      activaTics: 1000,
      alApagarse: { coste: 0, siguienteTics: 1 },
      activasALaVez: 1,
      bandas: [],
      relevo: null,
      efecto: { tipo: 'soltar', portable: 1, cuantos: 2 },
    },
  ],
  racimos: { une: u(35), separa: u(45), cadaTics: 10, rumboTics: 40 },
  puntoDeControl: { x: u(-3), z: u(-3) },
  reaparicion: 'cercaDelGrupo',
  avisos: ['entidad', 'asiento', 'nudo'],
  clases: [{ desprevenida: { factor: 2 * UNO, puntos: 40 } }, { desprevenida: null }],
};

const CON_OBJETIVO: AmpliacionDeLaLiza = {
  ...ampliacionDeHoy(JUGUETE_CON_OBJETIVO),
  grupos: [
    { eleccion: 'azar', disparo: { tipo: 'entrar', zona: 1, radio: u(30), minimo: [1, 1], conjunto: 1 } },
    { eleccion: 'azar', disparo: { tipo: 'entrar', zona: 2, radio: u(30), minimo: [1, 2], conjunto: 1 } },
    { eleccion: { tipo: 'nudo', desde: u(2), hasta: u(6), sesgo: 'cualquiera', conoRumbos: 0, sinVista: false }, disparo: { tipo: 'tic' } },
    { eleccion: 'azar', disparo: { tipo: 'tic' } },
  ],
  fin: { tipo: 'objetivo', conjunto: 1, como: { tipo: 'leer', accion: 20, radio: u(1.5), tics: 240, capacidad: 2, rompeConDano: true, puesta: nada(5, 20) }, disuelveTrasTics: 60 },
};
{
  comprobar('(control: el juguete de cuatro grupos y el del objetivo son declaraciones sin problemas)', problemasDeLaDeclaracion(JUGUETE_ABIERTO).length === 0 && problemasDeLaDeclaracion(JUGUETE_CON_OBJETIVO).length === 0, [
    ...problemasDeLaDeclaracion(JUGUETE_ABIERTO),
    ...problemasDeLaDeclaracion(JUGUETE_CON_OBJETIVO),
  ]);
  const hoy = ampliacionDeHoy(JUGUETE);
  comprobar(
    'la ampliación de hoy (todo sale por tic, nada de lo nuevo) no tiene problemas, y dice lo de hoy con la forma de mañana',
    problemasDeLaAmpliacion(JUGUETE, hoy).length === 0 && hoy.grupos.length === 2 && hoy.grupos.every((g) => g.disparo.tipo === 'tic') && hoy.salida?.activasALaVez === 1 && hoy.reaparicion === 'orden',
    problemasDeLaAmpliacion(JUGUETE, hoy),
  );
  comprobar('la ampliada (nudos, calma, rezagado, una ronda, dos bandas, un arca, racimos…) no tiene problemas', problemasDeLaAmpliacion(JUGUETE_ABIERTO, AMPLIADA).length === 0, problemasDeLaAmpliacion(JUGUETE_ABIERTO, AMPLIADA));
  const comos: readonly [string, unknown][] = [
    ['leyendo', CON_OBJETIVO.fin?.como],
    ['rematando', { tipo: 'rematar', clase: 1 }],
    ['vaciando', { tipo: 'vaciar' }],
  ];
  for (const [que, como] of comos) {
    const a = conCambio(CON_OBJETIVO, 'fin.como', como) as AmpliacionDeLaLiza;
    comprobar(`la de un objetivo que se cumple ${que} no tiene problemas`, problemasDeLaAmpliacion(JUGUETE_CON_OBJETIVO, a).length === 0, problemasDeLaAmpliacion(JUGUETE_CON_OBJETIVO, a));
  }
}
{
  const grafoEnorme = { nudos: Array.from({ length: TOPE_DE_NUDOS + 1 }, () => ({ x: 0, z: 0 })), aristas: [] };
  const sesentaYCinco = Array.from({ length: TOPE_DE_GRUPOS + 1 }, () => ({ clase: 2, cuantos: [1, 1], vivasALaVez: [1, 1], claseDeZona: 1, desdeTic: 0, cadaTics: 0, eleccion: 'azar' }));
  const conGruposDeMas = conCambio(JUGUETE_CON_OBJETIVO, 'fase.encuentro.grupos', sesentaYCinco) as LizaDeclarada;
  const ROTAS_DE_LA_AMPLIACION: readonly [string, LizaDeclarada, AmpliacionDeLaLiza, string, unknown, string][] = [
    ['un grupo de menos', JUGUETE_ABIERTO, AMPLIADA, 'grupos', AMPLIADA.grupos.slice(0, 3), 'uno por grupo'],
    ['un nudo con la banda del revés', JUGUETE_ABIERTO, AMPLIADA, 'grupos.0.eleccion.hasta', u(1), 'de menos a más'],
    ['un sesgo que no existe', JUGUETE_ABIERTO, AMPLIADA, 'grupos.0.eleccion.sesgo', 'arriba', 'sesgo'],
    ['un cono en un nudo sin sesgo', JUGUETE_CON_OBJETIVO, CON_OBJETIVO, 'grupos.2.eleccion.conoRumbos', 10, 'sin sesgo no hay cono'],
    ['la zona de una banda que no hay', JUGUETE_ABIERTO, AMPLIADA, 'grupos.1.eleccion.banda', 2, 'eleccion.banda'],
    ['la zona de una banda sin bandas', JUGUETE_CON_OBJETIVO, CON_OBJETIVO, 'grupos.3.eleccion', { tipo: 'zonaDeAccion', banda: 0 }, 'no tiene bandas'],
    ['un disparo que no existe', JUGUETE_ABIERTO, AMPLIADA, 'grupos.1.disparo', { tipo: 'pronto' }, "tiene que ser 'tic'"],
    ['entrar en una zona que no hay', JUGUETE_CON_OBJETIVO, CON_OBJETIVO, 'grupos.0.disparo.zona', 9, 'no está declarado'],
    ['un mínimo para entrar que no se puede cumplir', JUGUETE_CON_OBJETIVO, CON_OBJETIVO, 'grupos.1.disparo.minimo', [2, 2], 'no saltaría nunca'],
    ['un mínimo que no es uno por presentes', JUGUETE_CON_OBJETIVO, CON_OBJETIVO, 'grupos.1.disparo.minimo', [1], 'uno por cada número de presentes'],
    ['una calma con racimos secundarios y sin racimos', JUGUETE_ABIERTO, AMPLIADA, 'racimos', null, 'no hay secundarios'],
    ['una calma que no salta nunca (0 veces)', JUGUETE_ABIERTO, AMPLIADA, 'grupos.0.disparo.veces', 0, 'disparo.veces'],
    ['un rezagado a distancia 0', JUGUETE_ABIERTO, AMPLIADA, 'grupos.2.disparo.distancia', 0, 'disparo.distancia'],
    ['un grupo que salta con una ronda y ninguna lo nombra', JUGUETE_ABIERTO, AMPLIADA, 'rondas', null, 'ninguna ronda lo nombra'],
    ['una ronda cuyo circuito salta por encima de lo que se anda', JUGUETE_ABIERTO, AMPLIADA, 'rondas.lista.0.ruta', [0, 2], 'no hay arista'],
    ['una ronda por un nudo que no hay', JUGUETE_ABIERTO, AMPLIADA, 'rondas.lista.0.ruta', [0, 1, 7], 'ruta[2]'],
    ['una ronda de una clase que no hay', JUGUETE_ABIERTO, AMPLIADA, 'rondas.lista.0.miembros', [7], 'la clase'],
    ['una ronda de siete miembros', JUGUETE_ABIERTO, AMPLIADA, 'rondas.lista.0.miembros', [2, 2, 2, 2, 2, 2, 2], 'de 1 a 6'],
    ['una ronda que oye menos a la carrera', JUGUETE_ABIERTO, AMPLIADA, 'rondas.lista.0.oido.aLaCarrera', u(3), 'a la carrera'],
    ['una ronda que llama a un grupo que no salta con ella', JUGUETE_ABIERTO, AMPLIADA, 'rondas.lista.0.refuerzo', 3, 'no salta con el aviso'],
    ['rondas que no caben en el aforo', JUGUETE_ABIERTO, AMPLIADA, 'rondas.aLaVez', 4, 'el aforo es'],
    ['treinta y tres rondas', JUGUETE_ABIERTO, AMPLIADA, 'rondas.lista', Array.from({ length: TOPE_DE_RONDAS + 1 }, () => AMPLIADA.rondas?.lista[0]), `de 1 a ${String(TOPE_DE_RONDAS)}`],
    ['un objetivo que ningún grupo abre', JUGUETE_CON_OBJETIVO, CON_OBJETIVO, 'fin.conjunto', 2, 'no se abriría nunca'],
    ['rematar una clase que no se remata', JUGUETE_CON_OBJETIVO, CON_OBJETIVO, 'fin.como', { tipo: 'rematar', clase: 2 }, 'no se remata'],
    ['leer con el id de otra acción', JUGUETE_CON_OBJETIVO, CON_OBJETIVO, 'fin.como.accion', 12, 'ya lo usa otra acción'],
    ['leer con capacidad 0', JUGUETE_CON_OBJETIVO, CON_OBJETIVO, 'fin.como.capacidad', 0, 'fin.como.capacidad'],
    ['un objetivo que no se cumple de ninguna forma conocida', JUGUETE_CON_OBJETIVO, CON_OBJETIVO, 'fin.como', { tipo: 'aguantar' }, "tiene que ser 'vaciar'"],
    ['un objetivo en un encuentro que acaba por una salida', JUGUETE_ABIERTO, AMPLIADA, 'fin', CON_OBJETIVO.fin, 'acaba de una forma'],
    ['dos zonas activas con una banda', JUGUETE_ABIERTO, AMPLIADA, 'salida.bandas', AMPLIADA.salida?.bandas.slice(0, 1), 'una banda por cada una'],
    ['una banda del revés', JUGUETE_ABIERTO, AMPLIADA, 'salida.bandas.0.hasta', u(1), 'de menos a más'],
    ['cuatro zonas activas a la vez', JUGUETE_ABIERTO, AMPLIADA, 'salida.activasALaVez', 4, 'activasALaVez'],
    ['la ampliación de otra zona que la del fin', JUGUETE_ABIERTO, AMPLIADA, 'salida.accion', 99, 'se amplía la que hay'],
    ['una zona del fin que suelta', JUGUETE_ABIERTO, AMPLIADA, 'salida.efecto', { tipo: 'soltar', portable: 1, cuantos: 1 }, 'la zona del fin hace salir'],
    ['sin la ampliación de la zona del fin', JUGUETE_ABIERTO, AMPLIADA, 'salida', null, 'falta su ampliación'],
    ['una zona que suelta un portable que no hay', JUGUETE_ABIERTO, AMPLIADA, 'zonasDeAccion.0.efecto.portable', 3, 'el portable'],
    ['una zona que suelta con el id de otra acción', JUGUETE_ABIERTO, AMPLIADA, 'zonasDeAccion.0.accion', 13, 'ya lo usa otra acción'],
    ['una zona de acción del encuentro que hace salir', JUGUETE_ABIERTO, AMPLIADA, 'zonasDeAccion.0.efecto', { tipo: 'salir' }, "'salir' es de la zona del fin"],
    ['racimos que se separan antes de unirse', JUGUETE_ABIERTO, AMPLIADA, 'racimos.une', u(50), 'se separan antes de unirse'],
    ['un punto de control fuera del límite de la fase', JUGUETE_ABIERTO, AMPLIADA, 'puntoDeControl', { x: u(13), z: 0 }, 'fuera del límite'],
    ['una forma de reaparecer que no existe', JUGUETE_ABIERTO, AMPLIADA, 'reaparicion', 'lejos', 'reaparicion'],
    ['un aviso de más', JUGUETE_ABIERTO, AMPLIADA, 'avisos', ['entidad', 'asiento', 'nudo', 'nudo'], 'una por clase'],
    ['un aviso que apunta a algo que no existe', JUGUETE_ABIERTO, AMPLIADA, 'avisos.2', 'plaza', "'nudo'"],
    ['una clase de entidad de menos', JUGUETE_ABIERTO, AMPLIADA, 'clases', AMPLIADA.clases.slice(0, 1), 'clases de entidad'],
    ['un golpe al desprevenido que hace la mitad', JUGUETE_ABIERTO, AMPLIADA, 'clases.0.desprevenida.factor', UNO / 2, 'desprevenida.factor'],
    ['una ampliación que no es dato llano', JUGUETE_ABIERTO, AMPLIADA, 'racimos.cadaTics', undefined, 'canonico'],
    ['más nudos de los que el aviso lleva en el cable', conCambio(JUGUETE_ABIERTO, 'mundo.grafo', grafoEnorme) as LizaDeclarada, AMPLIADA, 'rondas', null, `caben ${String(TOPE_DE_NUDOS)}`],
    ['sesenta y cinco grupos', conGruposDeMas, { ...ampliacionDeHoy(conGruposDeMas) }, 'reaparicion', 'orden', `caben ${String(TOPE_DE_GRUPOS)}`],
  ];
  for (const [que, base, buena, ruta, valor, dice] of ROTAS_DE_LA_AMPLIACION) {
    const rota = conCambio(buena, ruta, valor) as AmpliacionDeLaLiza;
    let problemas: string[] = [];
    let lanzo: unknown = null;
    try {
      problemas = problemasDeLaAmpliacion(base, rota);
    } catch (error) {
      lanzo = error;
    }
    comprobar(`ampliación rota (${que}): tiene problemas, sin lanzar, y alguno dice «${dice}»`, lanzo === null && problemas.some((p) => p.includes(dice)), lanzo === null ? problemas.slice(0, 4) : String(lanzo));
  }
}
{
  /* L7: la ronda más pesada, con su zona, sigue cabiendo en la carga de la mesa. */
  const cuentas: number[][] = [];
  for (let i = 0; i < TOPE_DE_ASIENTOS; i++) cuentas.push([TOPE_DE_ASIENTOS, ...Array.from({ length: TOPE_DE_COLUMNAS }, () => Number.MAX_SAFE_INTEGER)]);
  const conZona: CargaDeRondaConZona = { n: TOPE_DE_CANTIDAD, resultado: 'aguantada', cuentas, recurso: TOPE_DE_CANTIDAD, zona: TOPE_DE_ID };
  const pesa = canonico(conZona).length;
  comprobar(
    'L7: el arcade:ronda más pesado CON su zona (quince asientos, veinticuatro columnas, la zona 255) cabe en la carga de la mesa, y pesa 11 bytes más que sin ella',
    pesa <= TOPE_CARGA_BYTES && pesa - pesoDeLaRondaMasLarga(TOPE_DE_ASIENTOS, TOPE_DE_COLUMNAS) === 11,
    { pesa, tope: TOPE_CARGA_BYTES, sin: pesoDeLaRondaMasLarga(TOPE_DE_ASIENTOS, TOPE_DE_COLUMNAS) },
  );
  comprobar('L8: el índice de un nudo más uno cabe en el objetivo de un aviso del cable (hasta 65.535)', TOPE_DE_NUDOS === TOPE_DE_NUMERO, { TOPE_DE_NUDOS, TOPE_DE_NUMERO });
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 3 · EL CABLE
 * ═══════════════════════════════════════════════════════════════════════════ */

paso('Lo que dice el aparato: ida y vuelta');

const HOLA: MensajeDelAparato = { t: 'hola', v: VERSION_DE_LA_LIZA, llave: 'k'.repeat(24), c: 37 };
const AQUI: MensajeDelAparato = { t: 'aqui', n: 123456, x: u(3.5), z: -u(12), r: 64, m: 2, a: 0 };
const AQUI_PRIMERO: MensajeDelAparato = { t: 'aqui', n: 0, x: 0, z: 0, r: 0, m: 0, a: 0 };
const AQUI_CON_ACCION: MensajeDelAparato = { t: 'aqui', n: 123457, x: -u(40), z: u(0.25), r: 255, m: 0, a: [10, 987654, 17] };
const ECO_AP: MensajeDelAparato = { t: 'eco', c: 61234 };
const AVISO_AP: MensajeDelAparato = { t: 'aviso', clase: 2, objetivo: 0 };
for (const [que, m] of [
  ['hola', HOLA],
  ['aqui', AQUI],
  ['aqui (el primero del canal, con n 0)', AQUI_PRIMERO],
  ['aqui (con una acción)', AQUI_CON_ACCION],
  ['eco', ECO_AP],
  ['aviso', AVISO_AP],
] as const) {
  const texto = textoDelAparato(m);
  comprobar(`el aparato: \`${que}\` va y vuelve igual`, igual(leerMensajeDelAparato(texto), m), texto);
}
{
  const conSobras = textoDelAparato({ ...AQUI, sobra: 1 } as MensajeDelAparato);
  comprobar('el escritor del aparato no deja pasar claves de más', leerMensajeDelAparato(conSobras) !== null, conSobras);
}

paso('Lo que dice el aparato: el tope de 256 bytes');
{
  /* Los más largos que el lector ADMITE: cada número en su tope y la llave con lo que JSON escapa. */
  const largos: [string, MensajeDelAparato][] = [
    ['hola con 64 comillas de llave y el reloj en el tope', { t: 'hola', v: 65535, llave: '"'.repeat(64), c: TOPE_DE_MS }],
    ['aqui con todo en el tope y una acción', { t: 'aqui', n: 2147483647, x: -TOPE_DE_LA_LIZA, z: -TOPE_DE_LA_LIZA, r: 255, m: 7, a: [255, 2147483647, 65535] }],
    ['eco en el tope', { t: 'eco', c: 2147483647 }],
    ['aviso en el tope', { t: 'aviso', clase: 255, objetivo: 65535 }],
  ];
  let mayor = 0;
  for (const [que, m] of largos) {
    const texto = textoDelAparato(m);
    mayor = Math.max(mayor, bytes(texto));
    comprobar(`el más largo (${que}) cabe en el tope de subida y se lee`, bytes(texto) <= TOPE_DE_SUBIDA_BYTES && leerMensajeDelAparato(texto) !== null, {
      bytes: bytes(texto),
      texto,
    });
  }
  nota(`la subida más larga que se admite ocupa ${String(mayor)} bytes`);
}

paso('Lo que dice el aparato: lo que se rechaza');
{
  const aqui = { t: 'aqui', n: 5, x: 0, z: 0, r: 0, m: 1, a: 0 };
  const MALOS: readonly [string, string][] = [
    ['no es JSON', '{t:"hola"'],
    ['es una lista', j([HOLA])],
    ['es null', 'null'],
    ['hola con una clave de más', j({ ...HOLA, admin: true })],
    ['hola sin llave', j({ t: 'hola', v: 1, c: 5 })],
    ['hola sin su reloj (la forma vieja)', j({ t: 'hola', v: 1, llave: 'k' })],
    ['hola con el reloj negativo', j({ ...HOLA, c: -1 })],
    ['hola con la llave vacía', j({ ...HOLA, llave: '' })],
    ['hola con una llave de 65', j({ ...HOLA, llave: 'k'.repeat(65) })],
    ['hola con una eñe en la llave (no es ASCII)', j({ ...HOLA, llave: 'llaveñ' })],
    ['hola con la versión con decimales', j({ ...HOLA, v: 1.5 })],
    ['aqui sin la clave de la acción', j({ t: 'aqui', n: 5, x: 0, z: 0, r: 0, m: 1 })],
    ['aqui con una clave de más', j({ ...aqui, vida: 99 })],
    ['aqui con x con decimales', j({ ...aqui, x: 1.5 })],
    ['aqui con x fuera de la liza', j({ ...aqui, x: TOPE_DE_LA_LIZA + 1 })],
    ['aqui con z en texto', j({ ...aqui, z: '0' })],
    ['aqui con el rumbo 256', j({ ...aqui, r: 256 })],
    ['aqui con la marcha 8', j({ ...aqui, m: 8 })],
    ['aqui con el tic negativo', j({ ...aqui, n: -1 })],
    ['aqui con la acción null en vez de 0', j({ ...aqui, a: null })],
    ['aqui con la acción 1 en vez de 0', j({ ...aqui, a: 1 })],
    ['aqui con una acción de dos', j({ ...aqui, a: [1, 100] })],
    ['aqui con la acción 0 dentro de la lista', j({ ...aqui, a: [0, 100, 0] })],
    ['aqui con la acción 256', j({ ...aqui, a: [256, 100, 0] })],
    ['aqui con los ms negativos (una pulsación de antes de abrir el canal)', j({ ...aqui, a: [1, -1, 0] })],
    ['aqui con los ms con decimales (sin redondear el timeStamp)', j({ ...aqui, a: [1, 100.5, 0] })],
    ['aqui con el blanco 65536', j({ ...aqui, a: [1, 100, 65536] })],
    ['un tipo que no existe con la forma de un aqui', j({ ...aqui, t: 'golpe' })],
    ['eco con una clave de más', j({ t: 'eco', c: 1, k: 2 })],
    ['eco con c negativo', j({ t: 'eco', c: -1 })],
    ['aviso de la clase 0', j({ t: 'aviso', clase: 0, objetivo: 0 })],
    ['aviso con el objetivo en texto', j({ t: 'aviso', clase: 1, objetivo: '16' })],
    ['más largo que el tope', j({ ...HOLA, llave: 'k'.repeat(40) }) + ' '.repeat(TOPE_DE_SUBIDA_BYTES)],
    ['un salto de línea (no imprimible)', `${j(HOLA)}\n`],
  ];
  for (const [que, texto] of MALOS) comprobar(`se rechaza del aparato: ${que}`, leerMensajeDelAparato(texto) === null, texto.slice(0, 140));
}

paso('Lo que dice la sala: ida y vuelta, con todos los sucesos');

const SUCESOS: readonly SucesoDelTic[] = [
  { e: 'anuncio', id: 7, de: 16, a: 1, acc: 40, t: 123456, x: -300, z: 1250 },
  { e: 'anuncio', id: 8, de: 0, a: 1, acc: 40, t: 124456, x: -300, z: 1250 },
  { e: 'resuelve', id: 7, r: 2, dano: 0, vida: 100 },
  { e: 'impacta', bala: 30, a: 2, r: 1, dano: 12, vida: 48 },
  { e: 'estado', a: 1, est: 3, tics: 20, into: 20 },
  { e: 'estado', a: 16, est: 0, tics: 0, into: 0 },
  { e: 'empuja', a: 17, r: 64, d: 300, caja: 2 },
  { e: 'empuja', a: 18, r: 0, d: 500, caja: 0 },
  { e: 'nace', id: 17, clase: 1, x: -1200, z: 51200, r: 128, ro: 0 },
  { e: 'seva', id: 17, por: 2, quien: 1 },
  { e: 'seva', id: 19, por: 3, quien: 17 },
  { e: 'bala', id: 30, de: 18, p: 1, x: 100, z: -100, r: 200, t: -5 },
  { e: 'carga', a: 1, p: 1, n: 3 },
  { e: 'monton', id: 31, p: 1, n: 3, x: 0, z: 0 },
  { e: 'recoge', id: 31, a: 2, n: 3, queda: 0 },
  { e: 'sale', a: 1, zona: 3 },
  { e: 'aviso', de: 2, clase: 1, obj: 17 },
  { e: 'fase', clave: 'n1-o2', modo: 2, limite: 1, relojMs: 0, encuentroTics: 2990 },
  { e: 'fase', clave: 'n1-p2', modo: 1, limite: 1, relojMs: 14950, encuentroTics: 0 },
  { e: 'zona', id: 3, tics: 1000 },
  { e: 'cuenta', a: 1, vida: 80, medidor: 35, puntos: 1250, mult: 72090 },
  { e: 'recurso', n: 2 },
  { e: 'apunta', de: 18, a: 1, p: 1, x: 100, z: -100, t: 123000 },
  { e: 'apunta', de: 18, a: 0, p: 1, x: 100, z: -100, t: 0 },
  { e: 'nace', id: 40, clase: 2, x: 300, z: -700, r: 64, ro: 3 },
  { e: 'disparo', g: 2, ro: 0, x: -2400, z: 1800 },
  { e: 'disparo', g: 4, ro: 1, x: 300, z: -700 },
  { e: 'disparo', g: 0, ro: 3, x: 300, z: -700 },
  { e: 'progreso', zona: 1, tics: 120 },
  /* W · el tiro cargado: donde se para la bala de un tiro (el centro de su área). */
  { e: 'estalla', bala: 30, x: 250, z: -125 },
];
{
  const clases = new Set(SUCESOS.map((s) => s.e));
  comprobar('la lista de muestra lleva las veintiuna clases de suceso (las dieciocho de hoy, `disparo`, `progreso` y `estalla`)', clases.size === 21, [...clases]);
}
const DE_LA_SALA: readonly MensajeDeLaSala[] = [
  { t: 'dentro', yo: 1, k: 400, x: -u(3), z: -u(3), r: 32, hz: 20 },
  { t: 'foto', k: 402, p: [[1, 350, -1200, 64, 2, 0], [16, -51200, 51200, 255, 1, 2]] },
  { t: 'tic', k: 403, ev: SUCESOS },
  { t: 'eco', c: 61234, k: 403, ms: 20160 },
  { t: 'corrige', n: 123456, x: u(1), z: -u(2) },
  { t: 'fuera', motivo: 'Se ha abierto otro canal con tu asiento.' },
];
for (const m of DE_LA_SALA) {
  const texto = textoDeLaSala(m);
  comprobar(`la sala: \`${m.t}\` va y vuelve igual`, igual(leerMensajeDeLaSala(texto), m), texto.slice(0, 300));
}
{
  /* La sala recoloca a quien acaba de conectar y aún no ha dicho nada: le corrige su tic 0, como el del `aqui`. */
  const cero: MensajeDeLaSala = { t: 'corrige', n: 0, x: -u(3), z: u(2) };
  comprobar('un `corrige` del tic 0 del aparato va y vuelve igual (antes se mandaba como del 1)', igual(leerMensajeDeLaSala(textoDeLaSala(cero)), cero));
  comprobar(
    'ninguna ráfaga de `aqui` que el aparato manda tras un parón basta sola para volver de ausente: el tope de golpe es menor que los seguidos que hacen falta',
    TOPE_DE_AQUIS_DE_GOLPE < AQUIS_PARA_ESTAR && TOPE_DE_AQUIS_DE_GOLPE >= 1,
    { TOPE_DE_AQUIS_DE_GOLPE, AQUIS_PARA_ESTAR },
  );
}
{
  const conSobras = textoDeLaSala({ t: 'tic', k: 1, ev: [{ ...(SUCESOS[4] as SucesoDelTic), sobra: 1 } as unknown as SucesoDelTic] });
  comprobar('el escritor de la sala no deja pasar claves de más en un suceso', leerMensajeDeLaSala(conSobras) !== null, conSobras);
  /* El `nace` que la sala escribe hoy, sin ronda: al cable sale con `ro` 0, y el lector lo lee con él. */
  const deHoy = textoDeLaSala({ t: 'tic', k: 1, ev: [{ e: 'nace', id: 17, clase: 1, x: 0, z: 0, r: 0 }] });
  const leido = leerMensajeDeLaSala(deHoy);
  const nace = leido?.t === 'tic' ? leido.ev[0] : undefined;
  comprobar(
    'un `nace` escrito sin ronda (el de la sala de hoy) sale al cable con `ro` 0, se lee con él, y `rondaDelNace` da 0 de los dos',
    deHoy.includes('"ro":0') && nace !== undefined && nace.e === 'nace' && rondaDelNace(nace) === 0 && rondaDelNace({ e: 'nace', id: 17, clase: 1, x: 0, z: 0, r: 0 }) === 0,
    deHoy,
  );
  comprobar('y uno con ronda la conserva', rondaDelNace({ e: 'nace', id: 40, clase: 2, x: 0, z: 0, r: 0, ro: 3 }) === 3);
}

paso('Lo que dice la sala: lo que se rechaza');
{
  const tic = (ev: unknown): string => j({ t: 'tic', k: 1, ev: [ev] });
  const MALOS: readonly [string, string][] = [
    ['un tic sin sucesos', j({ t: 'tic', k: 1, ev: [] })],
    ['un suceso de una clase que no existe', tic({ e: 'explota', id: 1 })],
    ['un anuncio con una clave de más', tic({ ...SUCESOS[0], hueso: 1 })],
    ['un anuncio sin su instante', tic({ e: 'anuncio', id: 7, de: 16, a: 1, acc: 40, x: 0, z: 0 })],
    ['un anuncio sin su sitio (la forma vieja)', tic({ e: 'anuncio', id: 7, de: 16, a: 1, acc: 40, t: 5 })],
    ['un anuncio con el instante con decimales', tic({ ...SUCESOS[0], t: 1.5 })],
    ['un anuncio de la acción 0', tic({ ...SUCESOS[0], acc: 0 })],
    ['un anuncio desde fuera de la liza', tic({ ...SUCESOS[0], x: TOPE_DE_CENTESIMAS + 1 })],
    ['un resuelve con un resultado que no existe', tic({ ...SUCESOS[2], r: 9 })],
    ['un estado libre que dura', tic({ e: 'estado', a: 1, est: 0, tics: 5, into: 0 })],
    ['un estado con más intocable que duración', tic({ e: 'estado', a: 1, est: 3, tics: 5, into: 6 })],
    ['un nace con número de asiento', tic({ ...SUCESOS[8], id: 3 })],
    ['un nace fuera de la liza', tic({ ...SUCESOS[8], x: TOPE_DE_CENTESIMAS + 1 })],
    ['un nace sin `ro` (la forma de antes, que ya no viaja)', tic({ e: 'nace', id: 17, clase: 1, x: 0, z: 0, r: 0 })],
    ['un nace con un `ro` fuera de rango (33)', tic({ ...SUCESOS[8], ro: TOPE_DE_RONDAS + 1 })],
    ['un nace con un `ro` negativo', tic({ ...SUCESOS[8], ro: -1 })],
    ['un nace con un `ro` con decimales', tic({ ...SUCESOS[8], ro: 1.5 })],
    ['un disparo sin `ro` (le falta una clave)', tic({ e: 'disparo', g: 2, x: 0, z: 0 })],
    ['un disparo sin `g` (le falta una clave)', tic({ e: 'disparo', ro: 1, x: 0, z: 0 })],
    ['un disparo con una clave de más', tic({ e: 'disparo', g: 2, ro: 0, x: 0, z: 0, t: 5 })],
    ['un disparo de nada (grupo y ronda a 0)', tic({ e: 'disparo', g: 0, ro: 0, x: 0, z: 0 })],
    ['un disparo de un grupo que no cabe (65)', tic({ e: 'disparo', g: TOPE_DE_GRUPOS + 1, ro: 0, x: 0, z: 0 })],
    ['un disparo de una ronda que no cabe (33)', tic({ e: 'disparo', g: 0, ro: TOPE_DE_RONDAS + 1, x: 0, z: 0 })],
    ['un disparo fuera de la liza', tic({ e: 'disparo', g: 1, ro: 0, x: TOPE_DE_CENTESIMAS + 1, z: 0 })],
    ['un progreso de la zona 0', tic({ e: 'progreso', zona: 0, tics: 5 })],
    ['un progreso de más de una hora', tic({ e: 'progreso', zona: 1, tics: TOPE_DE_TICS + 1 })],
    ['un progreso sin tics', tic({ e: 'progreso', zona: 1 })],
    ['un estalla sin su sitio', tic({ e: 'estalla', bala: 30, x: 0 })],
    ['un estalla con una clave de más', tic({ e: 'estalla', bala: 30, x: 0, z: 0, r: 5 })],
    ['un estalla de un número de asiento (sólo estallan balas)', tic({ e: 'estalla', bala: 3, x: 0, z: 0 })],
    ['un estalla de una bala que no cabe (65536)', tic({ e: 'estalla', bala: 65536, x: 0, z: 0 })],
    ['un estalla fuera de la liza', tic({ e: 'estalla', bala: 30, x: TOPE_DE_CENTESIMAS + 1, z: 0 })],
    ['un estalla con el sitio con decimales', tic({ e: 'estalla', bala: 30, x: 0.5, z: 0 })],
    ['un seva por un motivo que no existe', tic({ e: 'seva', id: 17, por: 0, quien: 0 })],
    ['un seva sin quién (la forma vieja)', tic({ e: 'seva', id: 17, por: 2 })],
    ['una carga de una entidad (sólo llevan los asientos)', tic({ ...SUCESOS[12], a: 16 })],
    ['un montón vacío', tic({ ...SUCESOS[13], n: 0 })],
    ['un empuja con «choca» (la forma vieja)', tic({ e: 'empuja', a: 17, r: 64, d: 300, choca: 1 })],
    ['un empuja contra una caja que no puede haber', tic({ ...SUCESOS[6], caja: 4097 })],
    ['una fase de un modo que no existe', tic({ ...SUCESOS[17], modo: 3 })],
    ['una fase con la clave vacía', tic({ ...SUCESOS[17], clave: '' })],
    ['una fase con comillas en la clave', tic({ ...SUCESOS[17], clave: 'n1"o2' })],
    ['una fase con «reanuda» (la forma vieja)', tic({ e: 'fase', clave: 'n1-o2', modo: 2, limite: 1, reanuda: 0 })],
    ['una fase en calma con reloj de encuentro', tic({ ...SUCESOS[18], encuentroTics: 5 })],
    ['una cuenta con el multiplicador por debajo de ×1', tic({ ...SUCESOS[20], mult: 1000 })],
    ['una cuenta con el multiplicador por encima del tope', tic({ ...SUCESOS[20], mult: TOPE_DE_MULTIPLICADOR + 1 })],
    ['una cuenta con «racha» (la forma vieja)', tic({ e: 'cuenta', a: 1, vida: 80, medidor: 35, puntos: 1250, racha: UNO })],
    ['una foto con una tupla de cinco', j({ t: 'foto', k: 1, p: [[1, 0, 0, 0, 0]] })],
    ['una foto con el mismo cuerpo dos veces', j({ t: 'foto', k: 1, p: [[1, 0, 0, 0, 0, 0], [1, 5, 0, 0, 0, 0]] })],
    ['una foto con la marcha 8', j({ t: 'foto', k: 1, p: [[1, 0, 0, 0, 8, 0]] })],
    ['un dentro con el asiento 16', j({ t: 'dentro', yo: 16, k: 1, x: 0, z: 0, r: 0, hz: 20 })],
    ['un dentro sin hz', j({ t: 'dentro', yo: 1, k: 1, x: 0, z: 0, r: 0 })],
    ['un corrige con la x con decimales', j({ t: 'corrige', n: 1, x: 0.5, z: 0 })],
    ['un corrige de un tic negativo', j({ t: 'corrige', n: -1, x: 0, z: 0 })],
    ['un apunta que lo deja con instante (dejarlo no tiene)', tic({ e: 'apunta', de: 18, a: 0, p: 1, x: 0, z: 0, t: 5 })],
    ['un apunta desde un asiento (sólo apuntan las entidades)', tic({ e: 'apunta', de: 3, a: 1, p: 1, x: 0, z: 0, t: 5 })],
    ['un apunta sin proyectil', tic({ e: 'apunta', de: 18, a: 1, p: 0, x: 0, z: 0, t: 5 })],
    ['un apunta sin su sitio', tic({ e: 'apunta', de: 18, a: 1, p: 1, t: 5 })],
    ['un apunta con una clave de más', tic({ e: 'apunta', de: 18, a: 1, p: 1, x: 0, z: 0, t: 5, r: 3 })],
    ['un eco sin ms', j({ t: 'eco', c: 1, k: 1 })],
    ['un fuera con una clave de más', j({ t: 'fuera', motivo: 'x', codigo: 4104 })],
    ['un mensaje sin t', j({ k: 1, ev: [SUCESOS[0]] })],
  ];
  for (const [que, texto] of MALOS) comprobar(`se rechaza de la sala: ${que}`, leerMensajeDeLaSala(texto) === null, texto.slice(0, 160));
}

paso('Lo que dice la sala: lo que cabe en el cable');
{
  /* El más largo que el lector admite de cada clase de suceso: cada número en su tope. */
  const T = TOPE_DE_MS;
  const C = -TOPE_DE_CENTESIMAS;
  const LARGOS: readonly SucesoDelTic[] = [
    { e: 'anuncio', id: T, de: 65535, a: 65535, acc: 255, t: -T, x: C, z: C },
    { e: 'resuelve', id: T, r: 6, dano: 1000000, vida: 1000000 },
    { e: 'impacta', bala: 65535, a: 65535, r: 6, dano: 1000000, vida: 1000000 },
    { e: 'estado', a: 65535, est: 255, tics: 72000, into: 72000 },
    { e: 'empuja', a: 65535, r: 255, d: 2 * TOPE_DE_CENTESIMAS, caja: 4096 },
    { e: 'nace', id: 65535, clase: 255, x: C, z: C, r: 255, ro: TOPE_DE_RONDAS },
    { e: 'seva', id: 65535, por: 8, quien: 65535 },
    { e: 'bala', id: 65535, de: 65535, p: 255, x: C, z: C, r: 255, t: -T },
    { e: 'carga', a: 15, p: 255, n: 1000000 },
    { e: 'monton', id: 65535, p: 255, n: 1000000, x: C, z: C },
    { e: 'recoge', id: 65535, a: 15, n: 1000000, queda: 1000000 },
    { e: 'sale', a: 15, zona: 255 },
    { e: 'aviso', de: 15, clase: 255, obj: 65535 },
    { e: 'fase', clave: 'x'.repeat(64), modo: 2, limite: 255, relojMs: 3600000, encuentroTics: 72000 },
    { e: 'zona', id: 255, tics: 72000 },
    { e: 'cuenta', a: 15, vida: 1000000, medidor: 1000000, puntos: Number.MAX_SAFE_INTEGER, mult: TOPE_DE_MULTIPLICADOR },
    { e: 'recurso', n: 1000000 },
    { e: 'apunta', de: 65535, a: 65535, p: 255, x: C, z: C, t: -T },
    { e: 'disparo', g: TOPE_DE_GRUPOS, ro: TOPE_DE_RONDAS, x: C, z: C },
    { e: 'progreso', zona: 255, tics: TOPE_DE_TICS },
    { e: 'estalla', bala: 65535, x: C, z: C },
  ];
  const noLeidos = LARGOS.filter((s) => leerSuceso(JSON.parse(j(s))) === null);
  comprobar('el más largo de cada una de las veintiuna clases se lee (son de verdad los topes)', noLeidos.length === 0 && new Set(LARGOS.map((s) => s.e)).size === 21, noLeidos);
  let peor = LARGOS[0] as SucesoDelTic;
  for (const s of LARGOS) if (bytes(j(s)) > bytes(j(peor))) peor = s;
  const lleno = textoDeLaSala({ t: 'tic', k: Number.MAX_SAFE_INTEGER, ev: Array.from({ length: TOPE_DE_SUCESOS }, () => peor) });
  comprobar(
    'un tic con el tope de sucesos, todos del más largo, cabe en el tope de bajada y se lee',
    bytes(lleno) <= TOPE_DE_BAJADA_BYTES && leerMensajeDeLaSala(lleno) !== null,
    { bytes: bytes(lleno), peor: peor.e },
  );
  comprobar(
    'y uno con un suceso más se rechaza (lo que no cabe va en otro tic con el mismo k)',
    leerMensajeDeLaSala(textoDeLaSala({ t: 'tic', k: 1, ev: Array.from({ length: TOPE_DE_SUCESOS + 1 }, () => SUCESOS[21] as SucesoDelTic) })) === null,
  );
  nota(`el suceso más largo (${peor.e}) ocupa ${String(bytes(j(peor)))} bytes; el tic lleno, ${String(bytes(lleno))}`);

  comprobar('en una foto caben todos los asientos y todas las entidades del aforo más grande', TOPE_DE_TUPLAS === TOPE_DE_ASIENTOS + TOPE_DE_ENTIDADES, TOPE_DE_TUPLAS);
  const tuplas: TuplaDeFoto[] = Array.from({ length: TOPE_DE_TUPLAS }, (_, i) => [65535 - i, C, C, 255, 7, 255] as const);
  const foto = textoDeLaSala({ t: 'foto', k: Number.MAX_SAFE_INTEGER, p: tuplas });
  comprobar('y la foto llena, con cada número en su tope, cabe en el tope de bajada y se lee', bytes(foto) <= TOPE_DE_BAJADA_BYTES && leerMensajeDeLaSala(foto) !== null, { bytes: bytes(foto) });
  const deMas = textoDeLaSala({ t: 'foto', k: 1, p: [...tuplas, [1, 0, 0, 0, 0, 0] as const] });
  comprobar('una foto con un cuerpo más de los que caben en una sala se rechaza', leerMensajeDeLaSala(deMas) === null);
}

paso('La ruta, los cierres y las centésimas');
{
  comprobar('la ruta cuelga de la mesa, bajo /api, y termina en /liza', rutaDeLaLiza('AB2CD') === '/api/arcade/mesas/AB2CD/liza', rutaDeLaLiza('AB2CD'));
  comprobar('y escapa lo que no es un código', rutaDeLaLiza('A/B?c') === '/api/arcade/mesas/A%2FB%3Fc/liza', rutaDeLaLiza('A/B?c'));
  comprobar('la versión de la liza es la 1, la suya', VERSION_DE_LA_LIZA === 1);
  const codigos = Object.values(CIERRE_DE_LA_LIZA);
  comprobar(
    'los cierres son del 4100 al 4199 (no pisan los de botas) y no se repiten',
    codigos.every((c) => c >= 4100 && c <= 4199) && new Set(codigos).size === codigos.length,
    codigos,
  );
  comprobar(
    'las centésimas: el tope de la liza son 51.200 y van y vuelven sin perder un centímetro',
    TOPE_DE_CENTESIMAS === 51200 && aCentesimas(TOPE_DE_LA_LIZA) === 51200 && aCentesimas(deCentesimas(-12345)) === -12345 && aCentesimas(u(0.35)) === 35,
    { tope: TOPE_DE_CENTESIMAS, ida: aCentesimas(deCentesimas(-12345)) },
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 4 · VEREDICTOS, REGISTRO Y COSTE
 * ═══════════════════════════════════════════════════════════════════════════ */

paso('Los veredictos de la plataforma');
{
  const ronda = { n: 2, resultado: 'aguantada', cuentas: [[1, 120, 3], [2, 0, 0]], recurso: 1 };
  comprobar('un arcade:ronda bien formado se lee', igual(leerCargaDeRonda(ronda, null, 2, 2), ronda));
  const MALAS: readonly [string, unknown, string | null][] = [
    ['lo manda un asiento', ronda, 'a1'],
    ['con una clave de más', { ...ronda, extra: 1 }, null],
    ['con la ronda 0', { ...ronda, n: 0 }, null],
    ['con un resultado que no existe', { ...ronda, resultado: 'empate' }, null],
    ['con una fila de menos', { ...ronda, cuentas: [[1, 120, 3]] }, null],
    ['con las filas desordenadas', { ...ronda, cuentas: [[2, 0, 0], [1, 120, 3]] }, null],
    ['con una columna de menos', { ...ronda, cuentas: [[1, 120], [2, 0]] }, null],
    ['con una cuenta negativa', { ...ronda, cuentas: [[1, -120, 3], [2, 0, 0]] }, null],
    ['con el recurso con decimales', { ...ronda, recurso: 0.5 }, null],
  ];
  for (const [que, carga, quien] of MALAS) comprobar(`se rechaza un arcade:ronda ${que}`, leerCargaDeRonda(carga, quien, 2, 2) === null);
  comprobar('un arcade:reloj bien formado se lee', igual(leerCargaDeReloj({ id: 'n1-p2' }, null), { id: 'n1-p2' }));
  comprobar(
    'y se rechaza si lo manda un asiento, sin id, con el id vacío, de 65 o con espacios',
    leerCargaDeReloj({ id: 'n1-p2' }, 'a1') === null &&
      leerCargaDeReloj({}, null) === null &&
      leerCargaDeReloj({ id: '' }, null) === null &&
      leerCargaDeReloj({ id: 'x'.repeat(65) }, null) === null &&
      leerCargaDeReloj({ id: 'n1 p2' }, null) === null,
  );
  comprobar('un arcade:ausente de un asiento sentado se lee', igual(leerCargaDeAusente({ a: 'a2' }, null, ['a1', 'a2']), { a: 'a2' }));
  comprobar(
    'y se rechaza el de uno que no está sentado, o si lo manda un asiento',
    leerCargaDeAusente({ a: 'a9' }, null, ['a1', 'a2']) === null && leerCargaDeAusente({ a: 'a2' }, 'a1', ['a1', 'a2']) === null,
  );
}

paso('El arcade:ronda más pesado cabe en la mesa');
{
  comprobar(
    'el tope de carga que copia la Liza es el de la mesa (server/src/arcade/presupuesto.ts)',
    TOPE_DE_CARGA_DE_LA_MESA === TOPE_CARGA_BYTES,
    { liza: TOPE_DE_CARGA_DE_LA_MESA, mesa: TOPE_CARGA_BYTES },
  );
  const pesa = pesoDeLaRondaMasLarga(TOPE_DE_ASIENTOS, TOPE_DE_COLUMNAS);
  comprobar(
    'con el tope de asientos y el de columnas, cada número en su tope, pesa menos que la carga de la mesa',
    pesa <= TOPE_CARGA_BYTES,
    { pesa, tope: TOPE_CARGA_BYTES },
  );
  /* Que la cuenta pesa de verdad: la ronda más pesada se escribe, se lee y pesa lo que dice. */
  const fila = (n: number): number[] => [n, ...Array.from({ length: 3 }, () => Number.MAX_SAFE_INTEGER)];
  const carga = { n: 1000000, resultado: 'aguantada', cuentas: [fila(1), fila(2)], recurso: 1000000 };
  comprobar(
    'y lo que pesa es lo que pesa la forma canónica de esa carga, que el lector admite',
    leerCargaDeRonda(carga, null, 3, 2) !== null && canonico(carga).length <= pesoDeLaRondaMasLarga(2, 3) && pesoDeLaRondaMasLarga(2, 3) - canonico(carga).length <= 2,
    { canonica: canonico(carga).length, calculada: pesoDeLaRondaMasLarga(2, 3) },
  );
  comprobar('y sesenta columnas con quince asientos NO cabrían (la cuenta no es de adorno)', pesoDeLaRondaMasLarga(TOPE_DE_ASIENTOS, 60) > TOPE_CARGA_BYTES);
  nota(`el arcade:ronda más pesado que se puede declarar ocupa ${String(pesa)} bytes`);
}

paso('El registro de lizas, con uno de juguete');
{
  const vistaDeJuguete = { de: 'juguete' };
  const deJuguete = registroDeLizas([['juguete', (vista, codigo) => (vista === vistaDeJuguete && codigo === 'ABCDE' ? JUGUETE : null)]]);
  comprobar(
    'un registro con una fila lidia ese arcade y ningún otro',
    deJuguete.sePuedeLidiar('juguete') && !deJuguete.sePuedeLidiar('otro') && igual(deJuguete.arcadesQueSeLidian(), ['juguete']),
  );
  comprobar(
    'y saca la liza de su vista, y null de otra vista o de otro arcade',
    deJuguete.lizaDeLaMesa('juguete', vistaDeJuguete, 'ABCDE') === JUGUETE &&
      deJuguete.lizaDeLaMesa('juguete', 42, 'ABCDE') === null &&
      deJuguete.lizaDeLaMesa('otro', vistaDeJuguete, 'ABCDE') === null,
  );
  let lanzo = false;
  try {
    registroDeLizas([
      ['juguete', () => null],
      ['juguete', () => null],
    ]);
  } catch {
    lanzo = true;
  }
  comprobar('un arcade dos veces en la tabla no se admite', lanzo);

  /* Y el registro de la plataforma, fila a fila: con cero filas no hay nada que dar por vigilado. */
  const lidiados = arcadesQueSeLidian();
  for (const a of lidiados) {
    comprobar(`el registro: «${a}» dice que se lidia`, sePuedeLidiar(a));
    let dio: unknown = null;
    let lanza = false;
    try {
      dio = lizaDeLaMesa(a, 42, 'ABCDE');
    } catch {
      lanza = true;
    }
    comprobar(`el registro: el productor de «${a}» no lanza ni se inventa una liza con una vista que no es la suya`, !lanza && dio === null);
  }
  comprobar('uno que no está en el registro no se lidia ni tiene liza', !sePuedeLidiar('no-existe') && lizaDeLaMesa('no-existe', {}, 'ABCDE') === null);
  nota(`${String(lidiados.length)} arcades en el registro de la plataforma (cada uno, dos comprobaciones más)`);
}

paso('El coste de una sala y la admisión');
{
  /*
   * Los coeficientes de la ciudad abierta (`docs/quiebro/CIUDAD-ABIERTA.md` §5.6: base 400, 250 por asiento,
   * 300 por entidad y 40 por bala). Antes eran los del barrio (base 100 y 250 por entidad), con la sala llena
   * en unos 5,9 ms/s y trece por proceso.
   */
  const coste = costeDeLaLiza(JUGUETE);
  comprobar('la liza de juguete (2 asientos, 14 entidades, 12 balas) cuesta 5.580 µs/s', coste === 5580, coste);
  const llena = { ...JUGUETE, asientos: Array.from({ length: 6 }, (_, i) => reglas(`s${String(i)}`)), aforo: { entidades: 20, balas: 12, montones: 8 } };
  const sola = { ...JUGUETE, asientos: [reglas('s0')], aforo: { entidades: 20, balas: 12, montones: 8 } };
  const [cLlena, cSola] = [costeDeLaLiza(llena), costeDeLaLiza(sola)];
  comprobar(
    'y lo que declara el diseño de la ciudad abierta (§5.6), con el aforo de 20 entidades y 12 balas: la sala llena de seis 8.380 µs/s y la solitaria 7.130',
    cLlena === 8380 && cSola === 7130,
    { llena: cLlena, sola: cSola },
  );
  comprobar(
    'caben nueve salas llenas y no diez; y once solitarias y no doce',
    cabeOtraSala(Array.from({ length: 8 }, () => cLlena), cLlena) &&
      !cabeOtraSala(Array.from({ length: 9 }, () => cLlena), cLlena) &&
      cabeOtraSala(Array.from({ length: 10 }, () => cSola), cSola) &&
      !cabeOtraSala(Array.from({ length: 11 }, () => cSola), cSola),
    { presupuesto: PRESUPUESTO_DE_LAS_LIZAS },
  );
  comprobar('y en un proceso vacío, una sala cabe', cabeOtraSala([], cLlena));
}

paso('La Liza es genérica');
{
  const carpeta = path.join(REPO, 'shared', 'mecanicas', 'liza');
  const ficheros = fs.readdirSync(carpeta).filter((f) => f.endsWith('.ts'));
  const importan: string[] = [];
  for (const f of ficheros) {
    const codigo = sinComentarios(fs.readFileSync(path.join(carpeta, f), 'utf8'));
    if (/from\s+['"][^'"]*arcade\/juegos/.test(codigo) || /from\s+['"][^'"]*\/juegos\//.test(codigo)) importan.push(f);
  }
  comprobar('ningún fichero de shared/mecanicas/liza importa de los juegos', importan.length === 0, importan);
  comprobar('y se han mirado los cuatro de la columna al menos', ficheros.length >= 4, ficheros);
  /*
   * El VOCABULARIO de un juego —sus nombres propios (glosario §15 del documento de diseño)— tampoco:
   * un campo que se llama como la mecánica de un juego es un campo que sólo ese juego usa. Se miran
   * también los comentarios: un comentario que cuenta el porqué con el juego es una puerta abierta.
   */
  /* `rayos?` y `chispazos?`: el ataque a distancia de El Quiebro entra en la Liza como «tiro cargado» (W), y su nombre no. */
  const NOMBRES_DE_JUEGO =
    /\b(quiebr\w*|celador\w*|prestad[oa]s?|esquirlas?|desvelad[oa]s?|durmientes?|remanso|glorieta|tandas?|gabardina|cabinas?|estampad\w*|acometid\w*|rachas?|r[ée]plicas?|empell[oó]n\w*|desaloj\w*|trasvase|vig[ií]as?|monedas?|oleadas?|aver[ií]as?|retoques?|contramedidas?|foco|aguante|noches?|glifos?|graf[ií]a|rayos?|chispazos?)\b/i;
  const nombran: string[] = [];
  for (const f of ['geometria.ts', 'declaracion.ts', 'protocolo.ts', 'tipos-de-la-sala.ts']) {
    const texto = fs.readFileSync(path.join(carpeta, f), 'utf8');
    const m = NOMBRES_DE_JUEGO.exec(texto);
    if (m !== null) nombran.push(`${f}: «${m[0]}»`);
  }
  comprobar('y los de la columna no dicen el vocabulario de ningún juego, ni en los comentarios', nombran.length === 0, nombran);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 5 · LOS NOMBRES, LA VISTA Y EL PUENTE DE EL QUIEBRO
 * ═══════════════════════════════════════════════════════════════════════════ */

paso('Los nombres de El Quiebro');
{
  const cadenas: string[] = [];
  const recoger = (v: unknown): void => {
    if (typeof v === 'string') cadenas.push(v);
    else if (Array.isArray(v)) for (const x of v) recoger(x);
    else if (typeof v === 'object' && v !== null) for (const k of Object.keys(v)) recoger((v as Record<string, unknown>)[k]);
  };
  recoger(NOMBRES_DEL_QUIEBRO);
  comprobar('todos los nombres son cadenas con algo dentro', cadenas.length > 100 && cadenas.every((c) => c.trim().length > 0), { cuantas: cadenas.length });
  /* La franquicia vecina, en las formas que no pueden salir (documento de diseño, §1). */
  const VECINA = /\b(matrix|neo|morpheus|morfeo|trinity|smith|or[aá]culo|zion|nabucodonosor|centinelas?|pastillas?|bullet[\s-]*time)\b/i;
  const delVecino = cadenas.filter((c) => VECINA.test(c));
  comprobar('ninguno dice una palabra de la franquicia vecina', delVecino.length === 0, delVecino);
  comprobar(
    'la v1 trae 3 estilos, 6 retoques, 3 averías (y ninguna), 6 recetas, 3 contramedidas (y ninguna) y 5 niveles',
    IDS_DE_ESTILO.length === 3 &&
      IDS_DE_RETOQUE.length === 6 &&
      IDS_DE_AVERIA.length === 4 &&
      IDS_DE_RECETA.length === 6 &&
      IDS_DE_CONTRAMEDIDA.length === 4 &&
      NOMBRES_DEL_QUIEBRO.niveles.length === 5,
  );
  const idsMalos = [...IDS_DE_ESTILO, ...IDS_DE_RETOQUE, ...IDS_DE_AVERIA, ...IDS_DE_RECETA, ...IDS_DE_CONTRAMEDIDA].filter((id) => !/^[a-z]+(-[a-z]+)*$/.test(id));
  comprobar('los ids son minúsculas ASCII con guiones (viajan y se guardan)', idsMalos.length === 0, idsMalos);
  comprobar('nombreDelNivel: 1 es Llovizna, 5 Tormenta, 6 nada', nombreDelNivel(1) === 'Llovizna' && nombreDelNivel(5) === 'Tormenta' && nombreDelNivel(6) === '');
}

paso('La vista de El Quiebro');

const tablero = { vista: { x: 0, y: 0, ancho: 10, alto: 10 }, caras: [], lineas: [], nudos: [], acciones: [], paneles: [], aviso: '' };
const asientoDeVista = (asiento: string): Record<string, unknown> => ({
  asiento,
  ofrecidos: ['iman', 'enlace', 'paso-largo'],
  haElegido: false,
  voto: null,
  ausente: false,
  salio: false,
  aprendiz: 2,
  puntos: 450,
  control: { aguante: 70, foco: 35, esquirlas: 6 },
  contadores: { limpios: 4, rachaMasLarga: 3, amenazas: 9, desalojos: 1, estampados: 2, rescates: 0, caidas: 1, reapariciones: 0, esquirlasCobradas: 0 },
});
/*
 * Con la ciudad abierta (§5.2 de `docs/quiebro/CIUDAD-ABIERTA.md`) la vista lleva la `traza` de la mesa en la
 * raíz —`null` si y sólo si no hay noche— y la noche, sus Fallos (la plaza de la Bajada la primera) en vez de
 * su plantilla.
 */
const VISTA = {
  fase: { tipo: 'pausa', oleada: 3 },
  reloj: { id: 'n2-p3', duraMs: 15000 },
  traza: 7,
  noche: { numero: 2, receta: 'pinza', fallos: [3, 1, 5] },
  asientos: [asientoDeVista('a1'), { ...asientoDeVista('a2'), haElegido: true, voto: 'aguantar' }],
  monedas: 3,
  historial: [
    {
      noche: 1,
      nivel: 2,
      resultado: 'ganada',
      puntos: [
        { asiento: 'a1', puntos: 900 },
        { asiento: 'a2', puntos: 700 },
      ],
      titulos: [{ titulo: 'el-avaro', asiento: 'a2' }],
    },
  ],
  mejorNoche: { noche: 1, asiento: 'a1', puntos: 900 },
  reglamento: {
    base: 'v1',
    nivel: 2,
    averia: 'ninguna',
    contramedida: 'tiradores',
    asientos: [
      { asiento: 'a1', estilo: 'mole', retoques: ['iman'] },
      { asiento: 'a2', estilo: 'ligera', retoques: [] },
    ],
  },
  tablero,
};
/** La misma vista en otra fase: sin nada de la pausa en los asientos. */
const enFase = (fase: unknown, noche: unknown = VISTA.noche): unknown => ({
  ...VISTA,
  fase,
  traza: noche === null ? null : VISTA.traza,
  noche,
  asientos: [
    { ...asientoDeVista('a1'), ofrecidos: [] },
    { ...asientoDeVista('a2'), ofrecidos: [] },
  ],
});
{
  comprobar('una vista bien formada se lee tal cual', igual(leerVistaDelQuiebro(JSON.parse(j(VISTA))), VISTA), leerVistaDelQuiebro(JSON.parse(j(VISTA))));
  const FASES: readonly unknown[] = [
    { tipo: 'reunion' },
    { tipo: 'bajada' },
    { tipo: 'oleada', oleada: 5 },
    { tipo: 'llamada' },
    { tipo: 'recuento', resultado: 'rendida' },
    { tipo: 'interrumpida', en: { tipo: 'oleada', oleada: 2 } },
    { tipo: 'interrumpida', en: { tipo: 'llamada' } },
    { tipo: 'final' },
    { tipo: 'cerrada' },
  ];
  const noLeidas = FASES.filter((f) => leerVistaDelQuiebro(enFase(f)) === null);
  comprobar('se leen las nueve clases de fase (la pausa arriba, y las dos formas de la interrumpida)', noLeidas.length === 0, noLeidas);
  comprobar('en la reunión y en la mesa cerrada la noche puede faltar', leerVistaDelQuiebro(enFase({ tipo: 'reunion' }, null)) !== null && leerVistaDelQuiebro(enFase({ tipo: 'cerrada' }, null)) !== null);
  const MALAS: readonly [string, unknown][] = [
    ['con una clave de más', conCambio(VISTA, 'sobra', 1)],
    ['sin tablero', conCambio(VISTA, 'tablero', QUITAR)],
    ['con el número de noche también en la fase (dos sitios para un dato)', conCambio(VISTA, 'fase', { tipo: 'pausa', noche: 7, oleada: 3 })],
    ['en oleada sin noche', enFase({ tipo: 'oleada', oleada: 1 }, null)],
    ['en la bajada sin noche', enFase({ tipo: 'bajada' }, null)],
    ['con la noche 11', conCambio(VISTA, 'noche.numero', 11)],
    ['con la oleada 6', enFase({ tipo: 'oleada', oleada: 6 })],
    ['con una fase con una clave de más', enFase({ tipo: 'reunion', oleada: 1 })],
    ['interrumpida en una fase que no es de juego', enFase({ tipo: 'interrumpida', en: { tipo: 'bajada' } })],
    ['con un reloj de 0 ms', conCambio(VISTA, 'reloj', { id: 'x', duraMs: 0 })],
    ['con un reloj de id con espacios (no pasaría a la liza)', conCambio(VISTA, 'reloj', { id: 'noche 2', duraMs: 1000 })],
    ['con una receta que no existe', conCambio(VISTA, 'noche.receta', 'tormenta')],
    ['con un asiento repetido', conCambio(VISTA, 'asientos.1.asiento', 'a1')],
    ['con un retoque ofrecido que no existe', conCambio(VISTA, 'asientos.0.ofrecidos', ['iman', 'capa'])],
    ['con un retoque ofrecido dos veces', conCambio(VISTA, 'asientos.0.ofrecidos', ['iman', 'iman', 'iman'])],
    ['con cuatro retoques ofrecidos', conCambio(VISTA, 'asientos.0.ofrecidos', ['iman', 'enlace', 'paso-largo', 'enlace'])],
    ['en pausa sin nada que ofrecer', conCambio(VISTA, 'asientos.0.ofrecidos', [])],
    ['con retoques ofrecidos fuera de pausa', conCambio(enFase({ tipo: 'oleada', oleada: 1 }), 'asientos.0.ofrecidos', ['iman'])],
    ['con una elección hecha fuera de pausa', conCambio(enFase({ tipo: 'oleada', oleada: 1 }), 'asientos.0.haElegido', true)],
    ['con un voto que no existe', conCambio(VISTA, 'asientos.0.voto', 'quizas')],
    ['con un voto en una pausa que no vota', conCambio(conCambio(VISTA, 'fase', { tipo: 'pausa', oleada: 2 }), 'asientos.0.voto', 'llamar')],
    ['con un voto fuera de pausa', conCambio(enFase({ tipo: 'oleada', oleada: 4 }), 'asientos.0.voto', 'llamar')],
    ['con 13 esquirlas en el punto de control', conCambio(VISTA, 'asientos.0.control.esquirlas', 13)],
    ['con el punto de control sin Foco', conCambio(VISTA, 'asientos.0.control.foco', QUITAR)],
    ['con 4 quiebros de aprender', conCambio(VISTA, 'asientos.0.aprendiz', 4)],
    ['sin la cuenta de aprender', conCambio(VISTA, 'asientos.0.aprendiz', QUITAR)],
    ['con las monedas con decimales', conCambio(VISTA, 'monedas', 1.5)],
    ['sin asientos', conCambio(VISTA, 'asientos', [])],
    ['con un estilo que no existe', conCambio(VISTA, 'reglamento.asientos.0.estilo', 'capa')],
    ['con el nivel 0', conCambio(VISTA, 'reglamento.nivel', 0)],
    ['con una avería que no existe', conCambio(VISTA, 'reglamento.averia', 'niebla')],
    ['con el reglamento en otro orden que los asientos', conCambio(VISTA, 'reglamento.asientos', [{ asiento: 'a2', estilo: 'ligera', retoques: [] }, { asiento: 'a1', estilo: 'mole', retoques: ['iman'] }])],
    ['con un título que no existe en el historial', conCambio(VISTA, 'historial.0.titulos.0.titulo', 'el-mejor')],
    ['con un título dado dos veces', conCambio(VISTA, 'historial.0.titulos', [{ titulo: 'el-avaro', asiento: 'a1' }, { titulo: 'el-avaro', asiento: 'a2' }])],
    ['con un historial de una noche que aún no ha pasado', conCambio(VISTA, 'historial.0.noche', 3)],
    ['con el historial desordenado', conCambio(VISTA, 'historial', [VISTA.historial[0], VISTA.historial[0]])],
    ['con un historial que nombra a quien no está sentado', conCambio(VISTA, 'historial.0.puntos.1.asiento', 'a9')],
    ['con la mejor noche de quien no está sentado', conCambio(VISTA, 'mejorNoche.asiento', 'a9')],
    ['con la mejor noche en negativo', conCambio(VISTA, 'mejorNoche.puntos', -1)],
    ['con un tablero sin aviso', conCambio(VISTA, 'tablero.aviso', QUITAR)],
    ['con los contadores sin caídas', conCambio(VISTA, 'asientos.0.contadores.caidas', QUITAR)],
    ['con los contadores de antes (sin racha ni amenazas)', conCambio(VISTA, 'asientos.0.contadores', { limpios: 4, desalojos: 1, estampados: 2, rescates: 0, caidas: 1 })],
  ];
  for (const [que, vista] of MALAS) comprobar(`se rechaza una vista ${que}`, leerVistaDelQuiebro(vista) === null);
  /*
   * El asiento repetido también en el reglamento, y sin historial que nombre al que ya no está: si no, la
   * tira la comprobación del orden o la del historial, y la de los repetidos no se prueba (la mutación que
   * la quita salía en verde).
   */
  const repetido = conCambio(
    conCambio(conCambio(VISTA, 'asientos.1.asiento', 'a1'), 'reglamento.asientos.1.asiento', 'a1'),
    'historial',
    [],
  );
  comprobar('(control: sin el asiento repetido, esa misma vista se lee)', leerVistaDelQuiebro(conCambio(VISTA, 'historial', [])) !== null);
  comprobar('se rechaza una vista con un asiento repetido, aunque el reglamento lo repita igual', leerVistaDelQuiebro(repetido) === null);

  comprobar('la carga de estilo con un estilo que existe se lee', igual(leerCargaDeEstilo({ id: 'mole' }), { id: 'mole' }));
  comprobar('y no con uno que no existe, ni con una clave de más', leerCargaDeEstilo({ id: 'capa' }) === null && leerCargaDeEstilo({ id: 'mole', x: 1 }) === null);
  comprobar(
    'la carga de elegir se lee con voto y sin él',
    igual(leerCargaDeElegir({ retoque: 'iman', voto: 'aguantar' }), { retoque: 'iman', voto: 'aguantar' }) && igual(leerCargaDeElegir({ retoque: 'enlace', voto: null }), { retoque: 'enlace', voto: null }),
  );
  comprobar(
    'y se rechaza sin voto, con un voto que no existe o con un retoque que no existe',
    leerCargaDeElegir({ retoque: 'iman' }) === null && leerCargaDeElegir({ retoque: 'iman', voto: 'no' }) === null && leerCargaDeElegir({ retoque: 'capa', voto: null }) === null,
  );
  comprobar('los movimientos sin carga llevan null (o nada), y un objeto no es «sin carga»', esCargaVacia(null) && esCargaVacia(undefined) && !esCargaVacia({}));
  const tipos = Object.values(MOVIMIENTO_DEL_QUIEBRO);
  comprobar(
    'los movimientos de asiento son los del diseño más «aprendiz» y «listo» (la Bajada es la preparación), sin repetir y sin el prefijo de la plataforma',
    tipos.length === 9 && new Set(tipos).size === 9 && tipos.every((t) => !t.startsWith('arcade:')) && tipos.indexOf('aprendiz') >= 0 && tipos.indexOf('listo') >= 0,
    tipos,
  );
  const fila = (n: number, salio: number): number[] => [n, 300, 6, 0, 70, 35, 4, 3, 9, 1, 2, 0, 1, 0, 2, salio];
  const ronda = leerRondaDelQuiebro({ n: 3, resultado: 'ganada', cuentas: [fila(1, 1), fila(2, 0)], recurso: 2 }, null, 2);
  comprobar(
    'un arcade:ronda de El Quiebro se lee con nombres, cada columna en su sitio',
    ronda !== null &&
      ronda.monedas === 2 &&
      ronda.cuentas[0]?.esquirlas === 6 &&
      ronda.cuentas[0]?.foco === 35 &&
      ronda.cuentas[0]?.rachaMasLarga === 3 &&
      ronda.cuentas[0]?.amenazas === 9 &&
      ronda.cuentas[0]?.quiebros === 2 &&
      ronda.cuentas[0]?.salio === true &&
      ronda.cuentas[1]?.salio === false,
    ronda,
  );
  comprobar('y se rechaza con un «salió» que no es 0 ni 1', leerRondaDelQuiebro({ n: 3, resultado: 'ganada', cuentas: [fila(1, 2), fila(2, 0)], recurso: 2 }, null, 2) === null);
  comprobar(
    'y con más esquirlas de las que caben',
    leerRondaDelQuiebro({ n: 3, resultado: 'ganada', cuentas: [[1, 300, 13, 0, 70, 35, 4, 3, 9, 1, 2, 0, 1, 0, 2, 0], fila(2, 0)], recurso: 2 }, null, 2) === null,
  );
}

paso('El puente entre el anfitrión y el documento');
{
  const MESA: MensajeDelAnfitrion = {
    t: 'mesa',
    v: 1,
    codigo: 'AB2CD',
    yo: 'a1',
    llave: 'k'.repeat(24),
    servidor: 'https://harkania.onrender.com',
    vista: VISTA,
    opciones: [
      { id: 'elegir-iman', tipo: 'elegir', carga: { retoque: 'iman', voto: null }, rotulo: 'Imán', ayuda: '' },
      { id: 'puerta', tipo: 'elegir', carga: { topes: 3 }, rotulo: 'Elegir', ayuda: '', declaracion: true },
    ],
    rev: 17,
  };
  const DEL_ANFITRION: readonly MensajeDelAnfitrion[] = [MESA, { t: 'movido', v: 1, id: 4, resultado: 'rechazado', motivo: 'Ya elegiste en esta pausa.' }];
  for (const m of DEL_ANFITRION) comprobar(`el anfitrión: \`${m.t}\` va y vuelve igual`, igual(leerMensajeDelAnfitrion(textoDelAnfitrion(m)), m));
  const DEL_DOCUMENTO: readonly MensajeDelDocumento[] = [
    { t: 'listo', v: 1 },
    { t: 'mover', v: 1, id: 4, movimiento: { tipo: 'elegir', carga: { retoque: 'iman', voto: null } } },
    { t: 'mover', v: 1, id: 5, movimiento: { tipo: 'empezar', carga: null } },
    { t: 'salir', v: 1 },
    { t: 'medida', v: 1, calidad: 'plena', nivel: 2 },
  ];
  for (const m of DEL_DOCUMENTO) {
    const cual = m.t === 'mover' ? `mover ${m.movimiento.tipo}` : m.t;
    comprobar(`el documento: \`${cual}\` va y vuelve igual`, igual(leerMensajeDelDocumento(textoDelDocumento(m)), m));
  }

  const MALOS_DEL_ANFITRION: readonly [string, unknown][] = [
    ['un objeto en vez de texto', MESA],
    ['no es JSON', '{t:mesa'],
    ['otra versión del puente', j({ ...MESA, v: 2 })],
    ['una clave de más', j({ ...MESA, sobra: 1 })],
    ['sin vista', j({ ...MESA, vista: undefined })],
    ['una llave sin asiento', j({ ...MESA, yo: null })],
    ['un servidor con ruta', j({ ...MESA, servidor: 'https://harkania.onrender.com/api' })],
    ['un servidor que no es http', j({ ...MESA, servidor: 'javascript:alert(1)' })],
    ['una revisión negativa', j({ ...MESA, rev: -1 })],
    ['una opción con una clave de más', j({ ...MESA, opciones: [{ id: 'x', tipo: 'y', carga: null, rotulo: '', ayuda: '', z: 1 }] })],
    ['una opción con la marca en falso', j({ ...MESA, opciones: [{ id: 'x', tipo: 'y', carga: null, rotulo: '', ayuda: '', declaracion: false }] })],
    ['un movido con un resultado que no existe', j({ t: 'movido', v: 1, id: 4, resultado: 'quizas', motivo: '' })],
    ['un movido con el id 0', j({ t: 'movido', v: 1, id: 0, resultado: 'hecho', motivo: '' })],
  ];
  for (const [que, dato] of MALOS_DEL_ANFITRION) comprobar(`el documento rechaza del anfitrión: ${que}`, leerMensajeDelAnfitrion(dato) === null);
  const MALOS_DEL_DOCUMENTO: readonly [string, unknown][] = [
    ['un objeto en vez de texto', { t: 'listo', v: 1 }],
    ['otra versión', j({ t: 'listo', v: 2 })],
    ['un tipo que no existe', j({ t: 'hola', v: 1 })],
    ['un movimiento de la plataforma', j({ t: 'mover', v: 1, id: 1, movimiento: { tipo: 'arcade:ronda', carga: null } })],
    ['un movimiento sin la clave de la carga', j({ t: 'mover', v: 1, id: 1, movimiento: { tipo: 'empezar' } })],
    ['un movimiento con el id 0', j({ t: 'mover', v: 1, id: 0, movimiento: { tipo: 'empezar', carga: null } })],
    ['una medida que se contradice (N0 plena)', j({ t: 'medida', v: 1, calidad: 'plena', nivel: 0 })],
    ['una medida del nivel 4', j({ t: 'medida', v: 1, calidad: 'plena', nivel: 4 })],
    ['un salir con una clave de más', j({ t: 'salir', v: 1, porque: 'x' })],
  ];
  for (const [que, dato] of MALOS_DEL_DOCUMENTO) comprobar(`el anfitrión rechaza del documento: ${que}`, leerMensajeDelDocumento(dato) === null);

  const PROPIO = 'https://harkania.onrender.com';
  comprobar('el anfitrión de un documento es su propio origen; sin origen propio, ninguno', origenDelAnfitrion(PROPIO) === PROPIO && origenDelAnfitrion('null') === null && origenDelAnfitrion('') === null);
  /*
   * El agujero que encontró la revisión: una página ajena enmarca el documento y manda un `mesa` con SU
   * origen como `servidor`. El mensaje es de forma perfecta —se lee—, y el origen tiene que decir que no.
   */
  const trampa = textoDelAnfitrion({ ...MESA, servidor: 'https://atacante.example' });
  comprobar(
    'un mesa de una página ajena que se dice servidor se LEE (la forma es buena) pero NO VIENE del anfitrión',
    leerMensajeDelAnfitrion(trampa) !== null && !vieneDelAnfitrion('https://atacante.example', PROPIO, []),
  );
  comprobar('el propio origen sí viene; y un documento aislado (origen «null») no acepta ni al «null»', vieneDelAnfitrion(PROPIO, PROPIO, []) && !vieneDelAnfitrion('null', 'null', []) && !vieneDelAnfitrion('null', PROPIO, []));
  comprobar(
    'los fijados al compilar entran, y se comparan orígenes enteros, nunca prefijos',
    vieneDelAnfitrion('http://localhost:8131', 'http://localhost:5291', ['http://localhost:8131']) &&
      !vieneDelAnfitrion('http://localhost:81310', 'http://localhost:5291', ['http://localhost:8131']) &&
      !vieneDelAnfitrion('https://harkania.onrender.com.trampa.net', PROPIO, []) &&
      !vieneDelAnfitrion('https://harkania.onrender.com/', PROPIO, []),
  );
}

/*
/*
 * ═══ LO QUE EL APARATO HACE CON LA LÍNEA DE APUNTADO Y CON LA BALA ═══
 *
 * Del otro lado del cable: la memoria del aparato (`sala-vista.ts`) guarda la línea de un `apunta` con su
 * instante pasado a su reloj, la quita con `a` 0 o con el `seva` de quien apuntaba; el puente a los efectos
 * (`escenificar.ts`) la pinta con ese instante y la retira; y la bala vuela con la velocidad y el alcance de
 * SU proyectil en la declaración, no con los 20 m/s escritos en los efectos. `escenificar.ts` se carga en
 * tiempo de ejecución por su ruta: arrastra tipos de piezas de React que el `tsc` del servidor no compila, y
 * con los efectos y el sonido de mentira no los necesita.
 */
paso('El aparato: la línea de apuntado y la bala de su proyectil');
{
  const reloj = new RelojDelCanal(1000);
  const sv = new SalaVista();
  sv.aplicar({ t: 'dentro', yo: 1, k: 40, x: 0, z: 0, r: 0, hz: 20 }, 1000, reloj);
  sv.aplicar({ t: 'tic', k: 41, ev: [{ e: 'nace', id: 18, clase: 3, x: 0, z: 800, r: 128 }] }, 1050, reloj);
  sv.aplicar({ t: 'tic', k: 42, ev: [{ e: 'apunta', de: 18, a: 1, p: 1, x: 0, z: 800, t: 2600 }] }, 1100, reloj);
  const linea = sv.apuntados.get(18);
  const novedadDeLinea = sv.novedades.find((n) => n.tipo === 'suceso' && n.suceso.e === 'apunta');
  comprobar(
    'la memoria del aparato guarda la línea con su instante pasado a su reloj, y la novedad la lleva',
    linea !== undefined && linea.a === 1 && linea.finMs === reloj.aPerformance(2600) && linea.x === 0 && linea.z === 8 && novedadDeLinea?.tipo === 'suceso' && novedadDeLinea.apuntado === linea,
    { linea, finMs: reloj.aPerformance(2600) },
  );
  sv.aplicar({ t: 'tic', k: 43, ev: [{ e: 'apunta', de: 18, a: 0, p: 1, x: 0, z: 800, t: 0 }] }, 1150, reloj);
  const seQuita = !sv.apuntados.has(18);
  sv.aplicar({ t: 'tic', k: 44, ev: [{ e: 'apunta', de: 18, a: 1, p: 1, x: 0, z: 800, t: 3000 }] }, 1200, reloj);
  sv.aplicar({ t: 'tic', k: 45, ev: [{ e: 'seva', id: 18, por: MOTIVO_DE_IRSE.cae, quien: 0 }] }, 1250, reloj);
  comprobar('y la quita cuando quien apunta lo deja (`a` 0) y cuando se va (`seva`)', seQuita && !sv.apuntados.has(18), [...sv.apuntados.keys()]);

  /* El puente a los efectos, con los efectos y el sonido de mentira: lo que pide pintar. */
  const pedidos: { que: string; datos: unknown }[] = [];
  const partida = {
    pulsacionesAtendidas: [] as unknown[],
    paraLaEscena: [] as Novedad[],
    lectura: { proyectil: (id: number) => (id === 1 ? { velocidad: u(12), alcance: u(18) } : null), gestoDeLaAccion: () => 'entrada', amenazaDeLaAccion: () => 'prestado', clase: () => null },
    sala: { yo: 1 },
    sitioDe: () => ({ x: 0, z: 0 }),
    pintadoDe: () => null,
    ticDeLosDurmientes: () => 0,
  };
  let asas = 0;
  const sistema = {
    localizar: null as unknown,
    vaciar: () => {},
    apuntados: {
      apuntar: (a: unknown) => {
        pedidos.push({ que: 'apuntar', datos: a });
        return ++asas;
      },
      retirar: (asa: number) => {
        pedidos.push({ que: 'retirar', datos: asa });
        return true;
      },
    },
    balas: {
      disparar: (b: unknown) => {
        pedidos.push({ que: 'disparar', datos: b });
        return ++asas;
      },
      acabar: () => true,
    },
  };
  const sonido = { sonar: () => undefined, cabina: () => undefined };
  const RUTA_DEL_PUENTE = path.join(REPO, 'escritorio', 'src', 'quiebro', 'red', 'escenificar.ts');
  let puente: { drenar(ahora: number): void } | null = null;
  try {
    const m = (await import(pathToFileURL(RUTA_DEL_PUENTE).href)) as { Escenificador: new (p: unknown, s: unknown, so: unknown) => { drenar(ahora: number): void } };
    puente = new m.Escenificador(partida, sistema, sonido);
  } catch (e) {
    nota(`el puente no se carga: ${e instanceof Error ? e.message : String(e)}`);
  }
  const sv2 = new SalaVista();
  const pasar = (m: Parameters<SalaVista['aplicar']>[0], ahora: number): void => {
    sv2.aplicar(m, ahora, reloj);
    partida.paraLaEscena.push(...sv2.novedades.splice(0));
    puente?.drenar(ahora);
  };
  pasar({ t: 'dentro', yo: 1, k: 40, x: 0, z: 0, r: 0, hz: 20 }, 1000);
  pasar({ t: 'tic', k: 41, ev: [{ e: 'nace', id: 18, clase: 3, x: 0, z: 800, r: 128 }] }, 1050);
  pasar({ t: 'tic', k: 42, ev: [{ e: 'apunta', de: 18, a: 1, p: 1, x: 0, z: 800, t: 2600 }] }, 1100);
  const apuntar = pedidos.find((x) => x.que === 'apuntar')?.datos as { inicio: number; fin: number; desde: unknown; hacia: unknown } | undefined;
  comprobar(
    'el puente pinta la línea desde quien apunta hasta su blanco, fijada en el instante que dijo la sala',
    puente !== null && apuntar !== undefined && apuntar.inicio === 1100 && apuntar.fin === reloj.aPerformance(2600) && apuntar.desde === 18 && apuntar.hacia === 1,
    pedidos,
  );
  pasar({ t: 'tic', k: 43, ev: [{ e: 'apunta', de: 18, a: 0, p: 1, x: 0, z: 800, t: 0 }] }, 1150);
  const retirada = pedidos.some((x) => x.que === 'retirar' && x.datos === 1);
  pasar({ t: 'tic', k: 44, ev: [{ e: 'bala', id: 30, de: 18, p: 1, x: 0, z: 800, r: 128, t: 2700 }] }, 1200);
  const disparo = pedidos.find((x) => x.que === 'disparar')?.datos as { velocidad?: number; alcance?: number } | undefined;
  comprobar('y la quita cuando la sala dice que lo deja', retirada, pedidos);
  comprobar(
    'la bala vuela con la velocidad y el alcance de SU proyectil (12 m/s y 18 m aquí), no con los del diseño escritos en los efectos',
    disparo !== undefined && disparo.velocidad === 12 && disparo.alcance === 18,
    disparo,
  );
  const bala = { salida: 0, x: 0, y: 1.35, z: 0, rumbo: 0, fin: null };
  comprobar(
    'y los efectos la mueven con ellos: a 12 m/s y 24 m, 6 m a los 500 ms (10 sin ellos), parada en sus 24 m (no en 30) y viva hasta los 2 s (no 1,5)',
    recorridoDeLaBala({ ...bala, velocidad: 12, alcance: 24 }, 500) === 6 &&
      recorridoDeLaBala(bala, 500) === 10 &&
      recorridoDeLaBala({ ...bala, velocidad: 12, alcance: 24 }, 5000) === 24 &&
      recorridoDeLaBala(bala, 5000) === 30 &&
      !balaAcabada({ ...bala, velocidad: 12, alcance: 24 }, 1800) &&
      balaAcabada(bala, 1800) &&
      balaAcabada({ ...bala, velocidad: 12, alcance: 24 }, 2200),
  );
}

/*
 * ═══ EL APARATO, TRAS UNA LIMPIA CONTRA UNA BALA: VUELA Y, SI NO LLEGA, AVANZA ═══
 *
 * La sala juzga el golpe tras el vuelo como un golpe con avance: el vuelo y el avance de la acción, contados
 * sólo lo que puede ir de camino (la revisión del pulido: antes regalaba el avance a quien no lo andaba).
 * Así que el aparato tiene que hacerlos los dos: 10 m hacia el tirador en 8 tics sin pasar de su alcance
 * y, si aún no llega, el avance de la Réplica. Con la partida del cliente de verdad (`partida.ts`, cargada
 * por su ruta, como el puente de arriba) contra un enchufe y unos relojes de mentira, con los números de
 * El Quiebro: un tirador a 13 m y otro a 8 m, y el aparato tiene que acabar a su alcance de los dos.
 */
paso('El aparato: tras una limpia contra una bala vuela hacia el tirador y, si aún no llega, avanza; y acomete en todo estado en que la sala lanza');
{
  class EnchufeDeMentira {
    readyState = 0;
    readonly mandado: string[] = [];
    onopen: ((e: unknown) => void) | null = null;
    onmessage: ((e: { readonly data: unknown }) => void) | null = null;
    onclose: ((e: { readonly code: number; readonly reason: string }) => void) | null = null;
    onerror: ((e: unknown) => void) | null = null;
    constructor(readonly direccion: string) {}
    send(texto: string): void {
      this.mandado.push(texto);
    }
    close(): void {
      this.readyState = 3;
    }
    abrir(): void {
      this.readyState = 1;
      this.onopen?.({});
    }
    llega(m: MensajeDeLaSala): void {
      this.onmessage?.({ data: textoDeLaSala(m) });
    }
  }
  class RelojesDeMentira {
    t = 5_000;
    ahora(): number {
      return this.t;
    }
    despues(): unknown {
      return 0;
    }
    cancelar(): void {}
    azar(): number {
      return 0.5;
    }
  }
  type PartidaDelCliente = {
    paso: { x: number; z: number } | null;
    giroDeLaCamara: number;
    ponerLaDeclaracion(l: LizaDeclarada, lugar: unknown, asiento: string): void;
    asegurarElCanal(si: boolean): void;
    fotograma(ahora: number, dt: number): void;
    cerrar(): void;
  };
  type MandosDelCliente = { pulsar(boton: string, t: number): void };
  const cargar = async <T>(...ruta: string[]): Promise<T | null> => {
    try {
      return (await import(pathToFileURL(path.join(REPO, ...ruta)).href)) as T;
    } catch (e) {
      nota(`${ruta.join('/')} no se carga: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  };
  const P = await cargar<{ Partida: new (o: unknown) => PartidaDelCliente }>('escritorio', 'src', 'quiebro', 'red', 'partida.ts');
  const M = await cargar<{ EstadoDeLosMandos: new () => MandosDelCliente }>('escritorio', 'src', 'quiebro', 'mandos', 'estado.ts');
  const R = await cargar<{ jugarAlQuiebro: (o: { asientos: number; semilla: number; noches: number; politica: 'gana'; travesuras: boolean }) => { vistas: readonly unknown[] } }>('server', 'scripts', 'robot-de-quiebro.ts');
  const Q = await cargar<{ lizaDelQuiebro: (v: unknown, c: string) => LizaDeclarada | null }>('shared', 'arcade', 'juegos', 'quiebro-liza.ts');
  const L = await cargar<{ lugarDeLaMesa: (v: unknown, c: string, l: LizaDeclarada | null) => { lugar: unknown; aviso: string | null } }>('escritorio', 'src', 'quiebro', 'red', 'lugar.ts');
  const MU = await cargar<{ seAndaEnRecta: (a: unknown, d: { x: number; z: number }, h: { x: number; z: number }, r: number) => boolean }>('shared', 'mecanicas', 'mundo.ts');
  let liza: LizaDeclarada | null = null;
  /* La vista de la que sale `liza`: el aparato la lee con su lugar (`lugarDeLaMesa`), como el juego. */
  let vistaDeLaLiza: unknown = null;
  if (R !== null && Q !== null) {
    for (const v of R.jugarAlQuiebro({ asientos: 1, semilla: 7, noches: 1, politica: 'gana', travesuras: false }).vistas) {
      const l = Q.lizaDelQuiebro(v, 'K7M2P');
      if (liza === null && l !== null && l.fase.modo === 'encuentro') {
        liza = l;
        vistaDeLaLiza = v;
      }
    }
  }
  /*
   * EL LUGAR DE LA NOCHE, el que el juego le da al aparato con la misma vista y la misma liza (`lugarDeLaMesa`
   * en `red/lugar.ts`): la ciudad de esa noche. Hasta la entrega 1 de la ciudad abierta se le daba el barrio de
   * la noche a secas; desde que `ponerLaDeclaracion` toma un `LugarDeLaNoche`, aquel barrio suelto reventaba
   * dentro de la gente de la noche, y con el lugar de verdad el aparato pisa el mismo mundo que su liza.
   */
  const leido = L === null || liza === null ? null : L.lugarDeLaMesa(vistaDeLaLiza, 'K7M2P', liza);
  if (leido !== null && leido.aviso !== null) nota(`el lugar de la noche no cuadra con su liza: ${leido.aviso}`);
  const lugar = leido === null ? null : leido.lugar;
  /**
   * El aparato de verdad en su sitio de nacer, con una entidad de la `clase` a `lejos` metros en una dirección
   * por la que se anda en recta (y la cámara mirando hacia ella), ya pintada. `null` si falta algo.
   */
  const montar = (lejos: number, clase: number) => {
    if (P === null || M === null || lugar === null || MU === null || liza === null) return null;
    const l = liza;
    const reglas = l.asientos[0] as ReglasDeAsiento;
    const nace = l.mundo.nace.find((n) => n.papel === 'asiento') as { x: number; z: number };
    const arena = arenaDeLaLiza(l);
    let dx = 0;
    let dz = 0;
    for (const [ax, az] of [[0, -1], [1, 0], [0, 1], [-1, 0], [0.7071, -0.7071], [0.7071, 0.7071], [-0.7071, 0.7071], [-0.7071, -0.7071]] as const) {
      if (dx === 0 && dz === 0 && MU.seAndaEnRecta(arena, nace, { x: nace.x + Math.round(ax * u(lejos + 0.5)), z: nace.z + Math.round(az * u(lejos + 0.5)) }, reglas.cuerpo.radio)) {
        dx = ax;
        dz = az;
      }
    }
    if (dx === 0 && dz === 0) return null;
    const tx = nace.x + Math.round(dx * u(lejos));
    const tz = nace.z + Math.round(dz * u(lejos));
    const relojes = new RelojesDeMentira();
    const enchufes: EnchufeDeMentira[] = [];
    const mandos = new M.EstadoDeLosMandos();
    const partida = new P.Partida({
      direccion: 'ws://x/api/arcade/mesas/K7M2P/liza',
      llave: 'k1',
      fabrica: (d: string) => {
        const e = new EnchufeDeMentira(d);
        enchufes.push(e);
        return e;
      },
      relojes,
      mandos,
    });
    partida.ponerLaDeclaracion(l, lugar, reglas.asiento);
    partida.asegurarElCanal(true);
    partida.giroDeLaCamara = Math.atan2(dx, -dz);
    const e = enchufes[0] as EnchufeDeMentira;
    e.abrir();
    const fotograma = (ms: number): void => {
      relojes.t += ms;
      partida.fotograma(relojes.t, ms / 1000);
    };
    e.llega({ t: 'dentro', yo: 1, k: 1000, x: nace.x, z: nace.z, r: 0, hz: 20 });
    e.llega({ t: 'tic', k: 1000, ev: [{ e: 'fase', clave: l.fase.clave, modo: 2, limite: l.fase.limite, relojMs: 0, encuentroTics: 3000 }] });
    e.llega({ t: 'eco', c: 0, k: 1000, ms: 50_000 });
    fotograma(1);
    const cx = aCentesimas(tx);
    const cz = aCentesimas(tz);
    e.llega({ t: 'tic', k: 1002, ev: [{ e: 'nace', id: 16, clase, x: cx, z: cz, r: 0 }] });
    for (let k = 1002; k <= 1012; k += 2) {
      e.llega({ t: 'foto', k, p: [[16, cx, cz, 0, 0, 0]] });
      fotograma(100);
    }
    return { l, reglas, partida, mandos, e, relojes, fotograma, tx, tz, cx, cz };
  };
  const volar = (lejos: number): { recorrido: number; alFinal: number; alcance: number } | null => {
    const m = montar(lejos, 3);
    if (m === null || m.partida.paso === null) return null;
    const golpe = m.reglas.acciones.find((x) => x.id === m.reglas.esquiva.contraProyectil.accion) as AccionDeclarada;
    const x0 = m.partida.paso.x;
    const z0 = m.partida.paso.z;
    m.e.llega({
      t: 'tic',
      k: 1014,
      ev: [
        { e: 'bala', id: 30, de: 16, p: 1, x: m.cx, z: m.cz, r: 0, t: 0 },
        { e: 'impacta', bala: 30, a: 1, r: RESULTADO.limpia, dano: 0, vida: 100 },
      ],
    });
    for (let i = 0; i < 60; i++) m.fotograma(16);
    const paso1 = m.partida.paso;
    m.partida.cerrar();
    if (paso1 === null) return null;
    return { recorrido: Math.hypot(paso1.x - x0, paso1.z - z0) / UNO, alFinal: Math.hypot(m.tx - paso1.x, m.tz - paso1.z) / UNO, alcance: golpe.alcance / UNO };
  };
  const a13 = volar(13);
  const a8 = volar(8);
  nota(`tirador a 13 m: ${j(a13)} · a 8 m: ${j(a8)}`);
  comprobar(
    'tras una limpia contra la bala de un tirador a 13 m, el aparato vuela 10 m y avanza lo que le falta: acaba a su alcance; y a 8 m, vuela hasta su alcance sin más',
    a13 !== null && a8 !== null && a13.recorrido > 11.5 && Math.abs(a13.alFinal - a13.alcance) < 0.2 && Math.abs(a8.alFinal - a8.alcance) < 0.2 && a8.recorrido < 7.2,
    { a13, a8 },
  );

  /*
   * Y LA ACOMETIDA DE UN GOLPE PULSADO, EN CUALQUIER ESTADO EN QUE LA SALA LO LANZA: libre y también en el
   * intocable de quien reaparece o vuelve de estar ausente, que no bloquea las acciones. El aparato la hacía
   * sólo libre o en el Remanso, y no se notaba porque la sala le daba el avance entero; ya no se lo da.
   */
  const entradaEn = (estado: number): { recorrido: number; alFinal: number } | null => {
    const m = montar(5, 2);
    if (m === null || m.partida.paso === null) return null;
    if (estado !== 0) m.e.llega({ t: 'tic', k: 1014, ev: [{ e: 'estado', a: 1, est: estado, tics: 10, into: 10 }] });
    m.fotograma(16);
    const x0 = m.partida.paso.x;
    const z0 = m.partida.paso.z;
    m.mandos.pulsar('golpe', m.relojes.t);
    for (let i = 0; i < 40; i++) m.fotograma(16);
    const paso1 = m.partida.paso;
    m.partida.cerrar();
    if (paso1 === null) return null;
    return { recorrido: Math.hypot(paso1.x - x0, paso1.z - z0) / UNO, alFinal: Math.hypot(m.tx - paso1.x, m.tz - paso1.z) / UNO };
  };
  const libre = entradaEn(0);
  const enLaVuelta = liza === null ? null : entradaEn(liza.equipo.reaparicion.puesta.estado);
  const alcanceDeLaEntrada = liza === null ? 0 : ((liza.asientos[0] as ReglasDeAsiento).acciones.find((x) => x.cadena === null && x.soloEn.length === 0 && !x.efecto.rompeGuardia)?.alcance ?? 0) / UNO;
  nota(`la Entrada contra un Celador a 5 m: libre ${j(libre)} · en la vuelta ${j(enLaVuelta)} · su alcance ${alcanceDeLaEntrada}`);
  comprobar(
    'la Entrada pulsada contra un Celador a 5 m acomete hasta su alcance libre y también en la vuelta de quien estuvo ausente (la reaparición no bloquea las acciones)',
    libre !== null && enLaVuelta !== null && alcanceDeLaEntrada > 0 && Math.abs(libre.alFinal - alcanceDeLaEntrada) < 0.2 && Math.abs(enLaVuelta.alFinal - alcanceDeLaEntrada) < 0.2,
    { libre, enLaVuelta, alcanceDeLaEntrada },
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 6 · LA COLUMNA DE LA CIUDAD ABIERTA (docs/quiebro/CIUDAD-ABIERTA.md)
 * ═══════════════════════════════════════════════════════════════════════════ */

/** ¿Lanza `f` un error de la clase `clase`? */
function lanza(f: () => unknown, clase: new (...a: never[]) => Error = RangeError): boolean {
  try {
    f();
  } catch (error) {
    return error instanceof clase;
  }
  return false;
}

/** Un múltiplo de 0,25 m entre `a` y `b` metros, del generador sembrado. */
const cuarto = (a: number, b: number): number => entre(a * 4, b * 4) / 4;

paso('La ciudad: las medidas del §2.1 caben en la Liza y en el cable');
{
  comprobar(
    'los ejes de calle son los doce de 24 + 48k, de −264 a 264: 144 cruces, 264 tramos y 11 × 11 = 121 huecos',
    EJES_DE_LA_CIUDAD.length === 12 && EJES_DE_LA_CIUDAD.every((e, k) => e === 24 + 48 * (k - 6)) && CRUCES === 144 && TRAMOS === 264 && HUECOS === 121,
    EJES_DE_LA_CIUDAD,
  );
  comprobar('540 m de acera a acera, y el cerco hasta ±272', LADO_DE_LA_CIUDAD === 540 && BORDE_DE_LA_CIUDAD === 270 && CERCO_DE_LA_CIUDAD === 272);
  comprobar(
    'las casillas de 8 m son 69 × 69 = 4.761, cubren el cerco entero y caben en el tope de casillas del suelo',
    CASILLAS_DE_LA_CIUDAD === 4761 && LADO_DE_CASILLA_DE_LA_CIUDAD * (CASILLAS_DEL_CENTRO_AL_BORDE + 0.5) >= CERCO_DE_LA_CIUDAD && CASILLAS_DE_LA_CIUDAD <= TOPE_DE_CASILLAS,
  );
  const q = CERCO_DE_LA_CIUDAD * UNO;
  comprobar(
    '±272 m caben en la liza, los 544 de diferencia en el tope de diferencias y la diagonal al cuadrado por debajo de 2^53',
    q <= TOPE_DE_LA_LIZA && 2 * q <= TOPE_DE_DIFERENCIA && distanciaAlCuadrado(2 * q, 2 * q) <= 9007199254740992,
    { q, TOPE_DE_LA_LIZA, TOPE_DE_DIFERENCIA },
  );
  comprobar('y en el cable son ±27.200 centésimas, con un tope de 51.200', aCentesimas(q) === 27200 && aCentesimas(q) <= TOPE_DE_CENTESIMAS);
}

paso('La ciudad: los distritos del molinete y las ocho simetrías');
{
  const MAPA = [...Array.from({ length: 3 }, () => 'OOONNNNNNNN'), ...Array.from({ length: 5 }, () => 'OOOCCCCCEEE'), ...Array.from({ length: 3 }, () => 'SSSSSSSSEEE')];
  const letra: Readonly<Record<IdDeDistrito, string>> = { casco: 'C', ensanche: 'S', lonja: 'O', naves: 'N', torres: 'E' };
  let distintas = 0;
  for (let j = -5; j <= 5; j++) for (let i = -5; i <= 5; i++) if (letra[distritoDelHueco(0, i, j)] !== (MAPA[j + 5] as string)[i + 5]) distintas++;
  comprobar('el molinete dibujado es el mapa del §2.2, hueco a hueco', distintas === 0, { distintas });
  let malasCuentas = 0;
  const firmas = new Set<string>();
  let sinInversa = 0;
  let noBiyectivas = 0;
  let glorietaMovida = 0;
  for (let s = 0; s < SIMETRIAS; s++) {
    const cuentas: Record<string, number> = {};
    const imagen = new Set<number>();
    let firma = '';
    for (let n = 0; n < HUECOS; n++) {
      const { i, j } = huecoDelIndice(n);
      const d = distritoDelHueco(s, i, j);
      cuentas[d] = (cuentas[d] ?? 0) + 1;
      const h = huecoSimetrico(s, i, j);
      imagen.add(indiceDeHueco(h.i, h.j));
      firma += `${String(indiceDeHueco(h.i, h.j))},`;
      const v = huecoAntesDeLaSimetria(s, h.i, h.j);
      if (v.i !== i || v.j !== j) sinInversa++;
    }
    if (cuentas.casco !== 25 || DISTRITOS.some((d) => d !== 'casco' && cuentas[d] !== 24)) malasCuentas++;
    if (imagen.size !== HUECOS) noBiyectivas++;
    const g = huecoSimetrico(s, 0, 0);
    if (g.i !== 0 || g.j !== 0 || distritoDelHueco(s, 0, 0) !== 'casco') glorietaMovida++;
    firmas.add(firma);
  }
  comprobar('con cada simetría, el Casco tiene 25 huecos y cada distrito de fuera 24', malasCuentas === 0, { malasCuentas });
  comprobar(
    'las ocho simetrías son ocho permutaciones DISTINTAS de los 121 huecos, cada una con su inversa, y ninguna mueve la Glorieta ni la saca del Casco',
    firmas.size === 8 && noBiyectivas === 0 && sinInversa === 0 && glorietaMovida === 0,
    { distintas: firmas.size, noBiyectivas, sinInversa, glorietaMovida },
  );
  let malosPuntos = 0;
  for (let k = 0; k < 4000; k++) {
    const s = entre(0, 7);
    const x = cuarto(-272, 272);
    const z = cuarto(-272, 272);
    const x2 = cuarto(-272, 272);
    const z2 = cuarto(-272, 272);
    const p = puntoSimetrico(s, x, z);
    const p2 = puntoSimetrico(s, x2, z2);
    const v = puntoAntesDeLaSimetria(s, p.x, p.z);
    if (v.x !== x || v.z !== z || Math.abs(p.x - p2.x) + Math.abs(p.z - p2.z) !== Math.abs(x - x2) + Math.abs(z - z2)) malosPuntos++;
  }
  comprobar('en 4.000 puntos al azar, la inversa deshace la simetría y la distancia por los ejes entre dos no cambia', malosPuntos === 0, { malosPuntos });
  let malosRumbos = 0;
  let malasCaras = 0;
  for (let s = 0; s < SIMETRIAS; s++) {
    for (let r = 0; r < 256; r++) {
      const v = puntoSimetrico(s, SENO[r] as number, -(COSENO[r] as number));
      if (rumboHacia(v.x, v.z) !== rumboSimetrico(s, r)) malosRumbos++;
    }
    for (const [cara, rumbo] of [['norte', 0], ['este', 64], ['sur', 128], ['oeste', 192]] as const) {
      const r = rumboSimetrico(s, rumbo);
      const esperada = r === 0 ? 'norte' : r === 64 ? 'este' : r === 128 ? 'sur' : 'oeste';
      if (caraSimetrica(s, cara) !== esperada) malasCaras++;
    }
  }
  comprobar('rumboSimetrico lleva cada uno de los 256 rumbos a donde apunta su vector llevado por la simetría, y las caras con ellos', malosRumbos === 0 && malasCaras === 0, { malosRumbos, malasCaras });
  const partes = new Set<string>();
  for (let t = 0; t < TRAZAS; t++) {
    const pa = partesDeLaTraza(t);
    partes.add(`${String(pa.dibujo)}·${String(pa.simetria)}`);
  }
  comprobar(
    'las 32 trazas son cada dibujo con cada simetría una vez, y una traza fuera de 0-31 lanza',
    partes.size === 32 && lanza(() => partesDeLaTraza(32)) && lanza(() => partesDeLaTraza(-1)) && lanza(() => partesDeLaTraza(1.5)),
  );
}

paso('La ciudad: la numeración que ve la Liza');
{
  const TIPOS: readonly [TipoDeZonaDePlaza, number][] = [['fallo', 1], ['impresion', 8], ['boca', 8]];
  const ids: number[] = [];
  let malasInversas = 0;
  for (let plaza = 1; plaza <= PLAZAS_POR_CIUDAD; plaza++) {
    for (const [tipo, cuantas] of TIPOS) {
      for (let k = 0; k < cuantas; k++) {
        const id = idDeZonaDePlaza(plaza, tipo, k);
        ids.push(id);
        const q = queZonaEs(id);
        if (q === null || q.que !== 'plaza' || q.plaza !== plaza || q.tipo !== tipo || q.k !== k) malasInversas++;
      }
    }
  }
  const otras: readonly [string, number, (k: number) => number][] = [
    ['cabina', CABINAS_POR_CIUDAD, idDeZonaDeCabina],
    ['refugio', REFUGIOS_POR_CIUDAD, idDeZonaDeRefugio],
    ['arca', ARCAS_POR_CIUDAD, idDeZonaDeArca],
  ];
  for (const [que, cuantas, id] of otras) {
    for (let k = 0; k < cuantas; k++) {
      ids.push(id(k));
      const q = queZonaEs(id(k));
      if (q === null || q.que !== que || q.k !== k) malasInversas++;
    }
  }
  comprobar(
    'las 148 zonas de una ciudad llevan ids distintos del 1 al 148, dentro de los 255 de la Liza',
    ids.length === 148 && new Set(ids).size === 148 && Math.min(...ids) === 1 && Math.max(...ids) === ULTIMA_ZONA_DE_LA_CIUDAD && ULTIMA_ZONA_DE_LA_CIUDAD <= TOPE_DE_ID,
    { cuantas: ids.length, distintas: new Set(ids).size, ULTIMA_ZONA_DE_LA_CIUDAD },
  );
  comprobar('queZonaEs es la inversa de las cuatro, y no reconoce ni el 0 ni el 149', malasInversas === 0 && queZonaEs(0) === null && queZonaEs(149) === null && queZonaEs(1.5) === null, { malasInversas });
  const clases: number[] = [CLASE_DE_ZONA_DE_CABINA, CLASE_DE_ZONA_DE_REFUGIO];
  for (let plaza = 1; plaza <= PLAZAS_POR_CIUDAD; plaza++) for (const [tipo] of TIPOS) clases.push(claseDeZonaDePlaza(plaza, tipo));
  for (let k = 0; k < ARCAS_POR_CIUDAD; k++) clases.push(claseDeZonaDeArca(k));
  comprobar('las clases de zona (18 de plaza, la de cabina, la de refugio y 16 de arca) son distintas y de 1 a 255', new Set(clases).size === clases.length && clases.length === 36 && clases.every((c) => c >= 1 && c <= TOPE_DE_ID), clases);
  const limites = [ID_DEL_LIMITE_DE_LA_CIUDAD, ...Array.from({ length: PLAZAS_POR_CIUDAD }, (_, k) => idDelLimiteDePlaza(k + 1))];
  comprobar('los límites: la ciudad el 1 y las plazas del 2 al 7', igual(limites, [1, 2, 3, 4, 5, 6, 7]), limites);
  comprobar(
    'y lo que no es de ninguna ciudad lanza en vez de dar un número',
    lanza(() => idDeZonaDePlaza(7, 'fallo', 0)) && lanza(() => idDeZonaDePlaza(1, 'fallo', 1)) && lanza(() => idDeZonaDePlaza(1, 'boca', 8)) && lanza(() => idDeZonaDeCabina(20)) && lanza(() => idDelLimiteDePlaza(0)) && lanza(() => claseDeZonaDeArca(16)),
  );
}

paso('La ciudad: las celdas del cliente');
{
  let idas = 0;
  for (let k = 0; k < CELDAS; k++) {
    const c = celdaDelIndice(k);
    if (indiceDeCelda(c.i, c.j) !== k) idas++;
  }
  comprobar('169 celdas de 48 m, de −6 a 6, y cada índice va y vuelve', CELDAS === 169 && idas === 0, { idas });
  let fuera = 0;
  const ejemplos: unknown[] = [];
  for (let k = 0; k < 20000; k++) {
    /* Un cuarto de los puntos, justo en una raya entre celdas: es donde se equivoca una división. */
    const x = k % 4 === 0 ? 48 * entre(-6, 6) - 24 : cuarto(-312, 311.75);
    const z = cuarto(-312, 311.75);
    const c = celdaDe(x, z);
    const r = c === null ? null : rectanguloDeLaCelda(c.i, c.j);
    if (r === null || !(r.x0 <= x && x < r.x1 && r.z0 <= z && z < r.z1)) {
      fuera++;
      if (ejemplos.length < 5) ejemplos.push({ x, z, c, r });
    }
  }
  comprobar('cada punto de ±312 cae en una celda, la que lo cubre (medio abierta: la raya es de la de la derecha)', fuera === 0 && celdaDe(24, 0)?.i === 1 && celdaDe(-24, 0)?.i === 0 && celdaDe(23.75, 0)?.i === 0, { fuera, ejemplos });
  let descentrados = 0;
  for (let n = 0; n < HUECOS; n++) {
    const { i, j } = huecoDelIndice(n);
    const c = celdaDe(48 * i, 48 * j);
    if (c === null || c.i !== i || c.j !== j) descentrados++;
  }
  comprobar('cada hueco es el centro de su celda, y el cerco cae en el anillo de ±6', descentrados === 0 && celdaDe(271, 0)?.i === 6 && celdaDe(-272, 0)?.i === -6, { descentrados });
  comprobar('fuera de ±312 no hay celda, ni para lo que no es un número', celdaDe(312, 0) === null && celdaDe(-312.25, 0) === null && celdaDe(Number.NaN, 0) === null && lanza(() => indiceDeCelda(7, 0)));

  const cajas: CajaDeLaCiudad[] = [];
  const caja = (x0: number, z0: number, x1: number, z1: number): CajaDeLaCiudad => ({ x0, z0, x1, z1, tipo: 'coche', clase: 'alta', alto: 1.5, mira: 0, edificio: null, despejable: false, hueco: null, plaza: 0 });
  for (let k = 0; k < 3000; k++) {
    const x0 = cuarto(-272, 270);
    const z0 = cuarto(-272, 270);
    cajas.push(caja(x0, z0, x0 + cuarto(0.25, 2), z0 + cuarto(0.25, 2)));
  }
  /* Y los que cruzan una raya: un pilar de la mediana en el eje −120, y una caja justo encima de un cruce. */
  cajas.push(caja(-120.5, -80, -119.5, -79), caja(23.5, 23.5, 24.5, 24.5));
  const veces = new Array<number>(cajas.length).fill(0);
  let desordenadas = 0;
  let enOtra = 0;
  for (let k = 0; k < CELDAS; k++) {
    const { i, j } = celdaDelIndice(k);
    const lista = cajasDeLaCelda({ cajas }, i, j);
    for (let n = 0; n < lista.length; n++) {
      const c = cajas[lista[n] as number] as CajaDeLaCiudad;
      veces[lista[n] as number] = (veces[lista[n] as number] as number) + 1;
      if (n > 0 && (lista[n] as number) <= (lista[n - 1] as number)) desordenadas++;
      const r = rectanguloDeLaCelda(i, j);
      const cx = (c.x0 + c.x1) / 2;
      const cz = (c.z0 + c.z1) / 2;
      if (!(r.x0 <= cx && cx < r.x1 && r.z0 <= cz && cz < r.z1)) enOtra++;
    }
  }
  comprobar(
    'cajasDeLaCelda reparte: cada caja en una celda y sólo en una, la de su centro, en orden de índice (el pilar de la raya −120, en la de −2)',
    veces.every((v) => v === 1) && desordenadas === 0 && enOtra === 0 && cajasDeLaCelda({ cajas }, -2, -2).includes(3000) && cajasDeLaCelda({ cajas }, 1, 1).includes(3001),
    { sinCelda: veces.filter((v) => v !== 1).length, desordenadas, enOtra },
  );
}

paso('La ciudad: los campos de distancias contra la fuerza bruta');
{
  /** Un grafo por los ejes: una rejilla de `n × n` con pasos de cuartos al azar, sin algunas aristas (rodeos e islas). */
  const rejilla = (n: number, quitar: number): GrafoDeLaCiudad => {
    const xs: number[] = [0];
    const zs: number[] = [0];
    for (let k = 1; k < n; k++) {
      xs.push((xs[k - 1] as number) + cuarto(1, 12));
      zs.push((zs[k - 1] as number) + cuarto(1, 12));
    }
    const nudos: { x: number; z: number }[] = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) nudos.push({ x: (xs[i] as number) - 100, z: (zs[j] as number) - 100 });
    const aristas: { a: number; b: number; largo: number; tramo: null }[] = [];
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const a = j * n + i;
        if (i + 1 < n && entre(0, 99) >= quitar) aristas.push({ a, b: a + 1, largo: (xs[i + 1] as number) - (xs[i] as number), tramo: null });
        if (j + 1 < n && entre(0, 99) >= quitar) aristas.push({ a, b: a + n, largo: (zs[j + 1] as number) - (zs[j] as number), tramo: null });
      }
    }
    return { nudos, aristas };
  };
  const bellmanFord = (g: GrafoDeLaCiudad, meta: number): number[] => {
    const d = new Array<number>(g.nudos.length).fill(-1);
    d[meta] = 0;
    for (let vuelta = 0; vuelta < g.nudos.length; vuelta++) {
      let cambio = false;
      for (const a of g.aristas) {
        const p = g.nudos[a.a] as { x: number; z: number };
        const q2 = g.nudos[a.b] as { x: number; z: number };
        const l = Math.abs(q2.x - p.x) + Math.abs(q2.z - p.z);
        for (const [u, v] of [[a.a, a.b], [a.b, a.a]] as const) {
          const du = d[u] as number;
          if (du < 0) continue;
          const dv = d[v] as number;
          if (dv < 0 || du + l < dv) {
            d[v] = du + l;
            cambio = true;
          }
        }
      }
      if (!cambio) break;
    }
    return d;
  };
  const grafos: GrafoDeLaCiudad[] = [rejilla(12, 0), rejilla(15, 15), rejilla(18, 35), rejilla(10, 60), barrioDeLaNoche('K7M2P', 1).grafo];
  let campos = 0;
  let distintos = 0;
  let noLlegan = 0;
  let noEnteros = 0;
  for (const g of grafos) {
    for (let k = 0; k < 6; k++) {
      const meta = entre(0, g.nudos.length - 1);
      const campo = campoHasta(g, meta);
      const bf = bellmanFord(g, meta);
      campos++;
      for (let n = 0; n < g.nudos.length; n++) {
        if (campo.metros[n] !== bf[n]) distintos++;
        if (bf[n] === -1) noLlegan++;
        if (!Number.isInteger((campo.metros[n] as number) * UNO)) noEnteros++;
      }
    }
  }
  comprobar(
    `campoHasta da lo mismo que Bellman-Ford en ${String(campos)} campos (rejillas con rodeos e islas, y el grafo del barrio), con −1 donde no se llega`,
    distintos === 0 && noLlegan > 0,
    { distintos, noLlegan },
  );
  comprobar('y sus metros por UNO son enteros exactos: los mismos que mide la sala en Q16.16 por el mismo grafo', noEnteros === 0, { noEnteros });

  let malosCercanos = 0;
  const ejemplos: unknown[] = [];
  for (const g of grafos) {
    for (let k = 0; k < 4000; k++) {
      let x: number;
      let z: number;
      const n0 = g.nudos[entre(0, g.nudos.length - 1)] as { x: number; z: number };
      const n1 = g.nudos[entre(0, g.nudos.length - 1)] as { x: number; z: number };
      if (k % 4 === 0) {
        /* A medio camino entre dos nudos: empates exactos a menudo. */
        x = (n0.x + n1.x) / 2;
        z = (n0.z + n1.z) / 2;
      } else if (k % 4 === 1) {
        x = n0.x;
        z = n0.z;
      } else {
        x = cuarto(-400, 400);
        z = cuarto(-400, 400);
      }
      let mejor = -1;
      let mejorD = 0;
      for (let n = 0; n < g.nudos.length; n++) {
        const p = g.nudos[n] as { x: number; z: number };
        const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
        if (mejor < 0 || d < mejorD) {
          mejor = n;
          mejorD = d;
        }
      }
      if (nudoMasCercano(g, x, z) !== mejor) {
        malosCercanos++;
        if (ejemplos.length < 5) ejemplos.push({ x, z, dado: nudoMasCercano(g, x, z), mejor });
      }
    }
  }
  comprobar('nudoMasCercano da el de la fuerza bruta (y a igual distancia, el menor) en 20.000 puntos, dentro, encima y lejos del grafo', malosCercanos === 0 && nudoMasCercano({ nudos: [], aristas: [] }, 0, 0) === -1, { malosCercanos, ejemplos });

  const g = grafos[2] as GrafoDeLaCiudad;
  const meta = 0;
  const campo = campoHasta(g, meta);
  let malasSumas = 0;
  let malosCaminos = 0;
  let sinCamino = -1;
  for (let k = 0; k < 500; k++) {
    const x = cuarto(-110, 60);
    const z = cuarto(-110, 60);
    const n = nudoMasCercano(g, x, z);
    const p = g.nudos[n] as { x: number; z: number };
    const esperada = (campo.metros[n] as number) < 0 ? -1 : (campo.metros[n] as number) + Math.abs(p.x - x) + Math.abs(p.z - z);
    if (distanciaPorCalles(g, campo, x, z) !== esperada) malasSumas++;
  }
  for (let n = 0; n < g.nudos.length; n++) {
    const hasta = campo.metros[n] as number;
    if (hasta < 0) {
      sinCamino = n;
      continue;
    }
    const entero = caminoPorElCampo(g, campo, n, Number.POSITIVE_INFINITY);
    let bien = entero[0] === n && entero[entero.length - 1] === meta;
    let andado = 0;
    for (let s = 1; s < entero.length && bien; s++) {
      const u = entero[s - 1] as number;
      const v = entero[s] as number;
      const pu = g.nudos[u] as { x: number; z: number };
      const pv = g.nudos[v] as { x: number; z: number };
      const l = Math.abs(pu.x - pv.x) + Math.abs(pu.z - pv.z);
      const arista = g.aristas.some((a) => (a.a === u && a.b === v) || (a.a === v && a.b === u));
      if (!arista || (campo.metros[u] as number) - (campo.metros[v] as number) !== l) bien = false;
      andado += l;
    }
    if (bien && andado !== hasta) bien = false;
    const corto = caminoPorElCampo(g, campo, n, 20);
    let andadoCorto = 0;
    for (let s = 1; s < corto.length; s++) andadoCorto += (campo.metros[corto[s - 1] as number] as number) - (campo.metros[corto[s] as number] as number);
    const ultimo = corto.length < 2 ? 0 : (campo.metros[corto[corto.length - 2] as number] as number) - (campo.metros[corto[corto.length - 1] as number] as number);
    if (corto[corto.length - 1] !== meta && (andadoCorto < 20 || andadoCorto - ultimo >= 20)) bien = false;
    if (!bien) malosCaminos++;
  }
  comprobar('distanciaPorCalles suma al campo del nudo más cercano lo que falta hasta él por los ejes (−1 si no se llega)', malasSumas === 0, { malasSumas });
  comprobar(
    'caminoPorElCampo baja arista a arista por un camino corto hasta la meta, lo que mide el campo, y se para en cuanto pasa los metros pedidos',
    malosCaminos === 0 && sinCamino >= 0 && caminoPorElCampo(g, campo, sinCamino, 60).length === 0,
    { malosCaminos, sinCamino },
  );
}

paso('La ciudad: los tríos de Fallos');
{
  const distritos: readonly IdDeDistrito[] = ['casco', 'casco', 'naves', 'lonja', 'torres', 'ensanche'];
  let tablas = 0;
  let distintas = 0;
  let conTrio = 0;
  for (let t = 0; t < 200; t++) {
    const d: number[][] = Array.from({ length: 6 }, () => new Array<number>(6).fill(0));
    for (let a = 0; a < 6; a++) {
      for (let b = a + 1; b < 6; b++) {
        const m = 2 * entre(40, 150);
        (d[a] as number[])[b] = m;
        (d[b] as number[])[a] = m;
      }
    }
    const plazas = distritos.map((distrito, k) => ({ numero: k + 1, distrito }) as unknown as PlazaDeLaCiudad);
    for (let bajada = 1; bajada <= 6; bajada++) {
      tablas++;
      const dados = triosDeFallos({ plazas, distancias: d }, bajada);
      const esperados: [number, number][] = [];
      const bien = (a: number, b: number): boolean => {
        const m = (d[a - 1] as number[])[b - 1] as number;
        return m >= FALLO_MAS_CERCA && m <= FALLO_MAS_LEJOS;
      };
      for (let f2 = 1; f2 <= 6; f2++) {
        for (let f3 = f2 + 1; f3 <= 6; f3++) {
          const tres = [distritos[bajada - 1], distritos[f2 - 1], distritos[f3 - 1]];
          if (f2 === bajada || f3 === bajada || new Set(tres).size !== 3) continue;
          if (bien(bajada, f2) && bien(bajada, f3) && bien(f2, f3)) esperados.push([f2, f3]);
        }
      }
      if (!igual(dados, esperados)) distintas++;
      if (esperados.length > 0) conTrio++;
    }
  }
  comprobar(`triosDeFallos da exactamente los de la fuerza bruta, en orden, en ${String(tablas)} Bajadas (y no son todas vacías)`, distintas === 0 && conTrio > 50, { distintas, conTrio });
  comprobar('y con una Bajada que no es una plaza, lanza', lanza(() => triosDeFallos({ plazas: [], distancias: [] }, 0)) && lanza(() => triosDeFallos({ plazas: [], distancias: [] }, 7)));
}

paso('La ciudad: las firmas que escribe el frente Traza');
{
  let ciudad: ReturnType<typeof ciudadDeLaMesa> | null = null;
  let error: unknown = null;
  try {
    ciudad = ciudadDeLaMesa(0, 'K7M2P');
  } catch (e) {
    error = e;
  }
  comprobar(
    'ciudadDeLaMesa da una ciudad o lanza CiudadSinEscribir, y nada más; con una traza fuera de 0-31 lanza RangeError',
    ((ciudad !== null && error === null) || error instanceof CiudadSinEscribir) && lanza(() => ciudadDeLaMesa(32, 'K7M2P')) && lanza(() => ciudadDeLaMesa(-1, 'K7M2P')),
    error instanceof Error ? error.message : error,
  );
  if (ciudad === null) {
    nota('ciudadDeLaMesa aún no está escrita (la escribe Traza en la ola A): su forma se mirará aquí en cuanto dé una ciudad');
  } else {
    const c = ciudad;
    const huecosEnOrden = c.huecos.length === HUECOS && c.huecos.every((h, n) => h.indice === n && indiceDeHueco(h.i, h.j) === n && h.distrito === distritoDelHueco(c.simetria, h.i, h.j));
    const plaza1 = c.plazas[0];
    comprobar(
      'la ciudad de la mesa: 121 huecos en orden con el distrito de su simetría, 6 plazas con la Glorieta del Relojero la 1 en (0, 0), 144 cruces, 264 tramos, 169 celdas, 20 cabinas y 10 refugios',
      huecosEnOrden &&
        c.plazas.length === PLAZAS_POR_CIUDAD &&
        c.plazas.every((p, k) => p.numero === k + 1) &&
        plaza1 !== undefined &&
        plaza1.hueco === indiceDeHueco(0, 0) &&
        c.cruces.length === CRUCES &&
        c.tramos.length === TRAMOS &&
        c.celdas.length === CELDAS &&
        c.cabinas.length === CABINAS_POR_CIUDAD &&
        c.refugios.length === REFUGIOS_POR_CIUDAD &&
        partesDeLaTraza(c.traza).simetria === c.simetria,
    );
    comprobar('y sus zonas van en orden de id (su puesto más uno) y caben en 255', c.zonas.every((z, k) => z.id === k + 1) && c.zonas.length <= ULTIMA_ZONA_DE_LA_CIUDAD);
  }
}

paso('El HUD: del mundo al minimapa y al plano');
{
  const cerca = (p: { u: number; v: number }, u: number, v: number): boolean => Math.abs(p.u - u) < 1e-9 && Math.abs(p.v - v) < 1e-9;
  comprobar('mirando al norte, lo del norte sale arriba y lo del este a la derecha', cerca(alMinimapa(0, -10, 0), 0, -10) && cerca(alMinimapa(10, 0, 0), 10, 0), [alMinimapa(0, -10, 0), alMinimapa(10, 0, 0)]);
  comprobar(
    'mirando al este, lo del este sale arriba y lo del norte a la izquierda',
    cerca(alMinimapa(10, 0, Math.PI / 2), 0, -10) && cerca(alMinimapa(0, -10, Math.PI / 2), -10, 0),
    [alMinimapa(10, 0, Math.PI / 2), alMinimapa(0, -10, Math.PI / 2)],
  );
  let malas = 0;
  for (let k = 0; k < 1000; k++) {
    const x = cuarto(-270, 270);
    const z = cuarto(-270, 270);
    const p = alPlano(x, z);
    const w = delPlano(p.u, p.v);
    if (w.x !== x || w.z !== z) malas++;
  }
  comprobar(
    'el plano pone el norte arriba: el noroeste en (0, 0), el sureste en el lado del lienzo (540), y delPlano lo deshace',
    malas === 0 && LADO_DEL_LIENZO === 540 && cerca(alPlano(-270, -270), 0, 0) && cerca(alPlano(270, 270), 540, 540),
    { malas },
  );
  comprobar('los metros se enseñan al metro, y −1 si no se llega', metrosQueSeEnsenan(123.4) === 123 && metrosQueSeEnsenan(123.5) === 124 && metrosQueSeEnsenan(-1) === -1 && metrosQueSeEnsenan(Number.NaN) === -1);
}

/*
 * El suelo: cada comprobación de este fichero —479—, contada con un arcade en el registro de la plataforma
 * (El Quiebro: con cada juego que se dé de alta salen dos más, y eso no es un fallo: el arnés lo dice) y
 * con `ciudadDeLaMesa` ya escrita (su forma: dos). Las de L10 en la declaración son quince: doce roturas y
 * tres de su forma transitoria y de la ampliación, que pierde las dos suyas. Si un bloque deja de correr,
 * sale 2 y no verde. El tiro cargado (W) trae treinta y dos: su forma y su cable (dos), sus veinticuatro
 * roturas y los seis `estalla` que se rechazan.
 */
terminar({
  escritas: 511,
  enVerde:
    'El cable de la Liza va y vuelve en los dos sentidos, rechaza lo que no es exactamente un mensaje y lo\n' +
    '  más largo cabe; la liza de juguete se declara sin problemas y sus versiones rotas no, y lo mismo las\n' +
    '  declaraciones de la liza abierta (L1-L12) y el tiro cargado (W), que la sala aún no cumple; rumboHacia\n' +
    '  y la prueba de losa coinciden con Math.atan2 y con\n' +
    '  la coma flotante; la ronda más pesada cabe en la mesa, el registro y el coste se prueban con uno de\n' +
    '  juguete; la vista, los nombres y el puente se leen estrictos; y la columna de la ciudad abierta cuenta,\n' +
    '  numera, reparte y mide como dice.',
});
