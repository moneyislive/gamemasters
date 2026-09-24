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
 *      las que tendrían dos jueces para un impacto (una esquiva con intocable).
 *   3. EL CABLE (`protocolo.ts`): cada mensaje, en los dos sentidos, va y vuelve igual por su escritor y
 *      su lector; los lectores tiran cualquier clave de más o de menos, cualquier tipo o rango
 *      equivocado; la subida más larga que el lector admite cabe en 256 bytes; y la bajada más larga —la
 *      foto llena y el `tic` lleno de los sucesos más largos— cabe en su tope.
 *   4. LOS VEREDICTOS, EL REGISTRO Y EL COSTE: los lectores de `arcade:*` son estrictos; el `arcade:ronda`
 *      más pesado que se puede declarar cabe en la carga que admite la mesa (`presupuesto.ts`); el
 *      registro de lizas se prueba con uno de juguete —cero filas no se leen como «vigilado»—; y el
 *      modelo de coste da lo que el diseño estimaba.
 *   5. LA VISTA DE EL QUIEBRO, SUS NOMBRES Y EL PUENTE: sus lectores estrictos aceptan lo bien formado y
 *      tiran lo demás, incluida la vista incoherente (una noche sin número, un historial del futuro); los
 *      nombres no dicen ninguna palabra de la franquicia vecina; y el puente no acepta un mensaje por lo
 *      que el propio mensaje diga de sí mismo.
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
import { fileURLToPath } from 'node:url';
import { COSENO, SENO } from '../../shared/mecanicas/andar';
import { enteroEntre, sembrar } from '../../shared/mecanicas/azar';
import type { Azar } from '../../shared/mecanicas/azar';
import { canonico } from '../../shared/mecanicas/canonico';
import { UNO } from '../../shared/mecanicas/fijo';
import { arenaDe, chocaConCuerpo } from '../../shared/mecanicas/mundo';
import {
  accionesDelCable,
  arenaDeLaLiza,
  esClaveCorta,
  leerCargaDeAusente,
  leerCargaDeReloj,
  leerCargaDeRonda,
  numeroDelAsiento,
  pesoDeLaRondaMasLarga,
  problemasDeLaDeclaracion,
  TOPE_DE_ASIENTOS,
  TOPE_DE_CARGA_DE_LA_MESA,
  TOPE_DE_COLUMNAS,
  TOPE_DE_ENTIDADES,
  TOPE_DE_MULTIPLICADOR,
  VERSION_DE_LA_DECLARACION,
} from '../../shared/mecanicas/liza/declaracion';
import type {
  AccionDeclarada,
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
  TOPE_DE_LA_LIZA,
  tramoTocaCuerpo,
  trayectoria,
} from '../../shared/mecanicas/liza/geometria';
import {
  aCentesimas,
  CIERRE_DE_LA_LIZA,
  deCentesimas,
  leerMensajeDeLaSala,
  leerMensajeDelAparato,
  leerSuceso,
  rutaDeLaLiza,
  textoDeLaSala,
  textoDelAparato,
  TOPE_DE_BAJADA_BYTES,
  TOPE_DE_CENTESIMAS,
  TOPE_DE_MS,
  TOPE_DE_SUBIDA_BYTES,
  TOPE_DE_SUCESOS,
  TOPE_DE_TUPLAS,
  VERSION_DE_LA_LIZA,
} from '../../shared/mecanicas/liza/protocolo';
import type { MensajeDeLaSala, MensajeDelAparato, SucesoDelTic, TuplaDeFoto } from '../../shared/mecanicas/liza/protocolo';
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
        cerebro: { distanciaMinima: 0, distanciaMaxima: u(1.1), decideCadaTics: 4, costeCuerpoACuerpo: 2, costeDisparo: 1, sigueElGrafo: true },
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
        cerebro: { distanciaMinima: 0, distanciaMaxima: u(1.1), decideCadaTics: 4, costeCuerpoACuerpo: 1, costeDisparo: 0, sigueElGrafo: false },
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
  { e: 'nace', id: 17, clase: 1, x: -1200, z: 51200, r: 128 },
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
];
{
  const clases = new Set(SUCESOS.map((s) => s.e));
  comprobar('la lista de muestra lleva las diecisiete clases de suceso', clases.size === 17, [...clases]);
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
  const conSobras = textoDeLaSala({ t: 'tic', k: 1, ev: [{ ...(SUCESOS[4] as SucesoDelTic), sobra: 1 } as unknown as SucesoDelTic] });
  comprobar('el escritor de la sala no deja pasar claves de más en un suceso', leerMensajeDeLaSala(conSobras) !== null, conSobras);
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
    { e: 'nace', id: 65535, clase: 255, x: C, z: C, r: 255 },
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
  ];
  const noLeidos = LARGOS.filter((s) => leerSuceso(JSON.parse(j(s))) === null);
  comprobar('el más largo de cada una de las diecisiete clases se lee (son de verdad los topes)', noLeidos.length === 0 && new Set(LARGOS.map((s) => s.e)).size === 17, noLeidos);
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
  const coste = costeDeLaLiza(JUGUETE);
  comprobar('la liza de juguete (2 asientos, 14 entidades, 12 balas) cuesta 4.580 µs/s', coste === 4580, coste);
  const llena = { ...JUGUETE, asientos: Array.from({ length: 6 }, (_, i) => reglas(`s${String(i)}`)), aforo: { entidades: 14, balas: 12, montones: 8 } };
  const sola = { ...JUGUETE, asientos: [reglas('s0')], aforo: { entidades: 6, balas: 6, montones: 8 } };
  const [cLlena, cSola] = [costeDeLaLiza(llena), costeDeLaLiza(sola)];
  comprobar(
    'y lo que el diseño estimaba (§12): la sala llena unos 5,9 ms/s y la solitaria unos 1,9, con un 10 % de margen',
    Math.abs(cLlena - 5900) <= 590 && Math.abs(cSola - 1900) <= 190,
    { llena: cLlena, sola: cSola },
  );
  comprobar(
    'caben unas trece salas llenas y no veinte; y unas cuarenta solitarias y no cincuenta',
    cabeOtraSala(Array.from({ length: 12 }, () => cLlena), cLlena) &&
      !cabeOtraSala(Array.from({ length: 19 }, () => cLlena), cLlena) &&
      cabeOtraSala(Array.from({ length: 34 }, () => cSola), cSola) &&
      !cabeOtraSala(Array.from({ length: 49 }, () => cSola), cSola),
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
  const NOMBRES_DE_JUEGO =
    /\b(quiebr\w*|celador\w*|prestad[oa]s?|esquirlas?|desvelad[oa]s?|durmientes?|remanso|glorieta|tandas?|gabardina|cabinas?|estampad\w*|acometid\w*|rachas?|r[ée]plicas?|empell[oó]n\w*|desaloj\w*|trasvase|vig[ií]as?|monedas?|oleadas?|aver[ií]as?|retoques?|contramedidas?|foco|aguante|noches?|glifos?|graf[ií]a)\b/i;
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
const VISTA = {
  fase: { tipo: 'pausa', oleada: 3 },
  reloj: { id: 'n2-p3', duraMs: 15000 },
  noche: { numero: 2, receta: 'pinza', plantilla: 'glorieta' },
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
    'los movimientos de asiento son los del diseño más «aprendiz», sin repetir y sin el prefijo de la plataforma',
    tipos.length === 8 && new Set(tipos).size === 8 && tipos.every((t) => !t.startsWith('arcade:')) && tipos.indexOf('aprendiz') >= 0,
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
 * El suelo: cada comprobación de arriba —339 y ésta, 340—, contada con la tabla del registro de la
 * plataforma VACÍA (con cada juego que se dé de alta salen dos más, y eso no es un fallo: el arnés lo
 * dice). Si un bloque deja de correr, sale 2 y no verde.
 */
terminar({
  escritas: 340,
  enVerde:
    'El cable de la Liza va y vuelve en los dos sentidos, rechaza lo que no es exactamente un mensaje y lo\n' +
    '  más largo cabe; la liza de juguete se declara sin problemas y sus versiones rotas no; rumboHacia y la\n' +
    '  prueba de losa coinciden con Math.atan2 y con la coma flotante; la ronda más pesada cabe en la mesa, el\n' +
    '  registro y el coste se prueban con uno de juguete; y la vista, los nombres y el puente se leen estrictos.',
});
