/**
 * DÓNDE SE PONE A ALGUIEN EN EL MUNDO DE UNA MESA: al entrar, y cuando el mundo cambia debajo.
 *
 * ═══ AL ENTRAR: UN SITIO DE NACER, REPARTIDO Y LIBRE ═══
 *
 * El mundo declara dónde se nace (`MundoDeclarado.nace`): una lista, en el orden en que el juego
 * quiere que se reparta —las cuatro Puertas del Burgo y luego los brazos de su glorieta; en Las
 * Lindes, un sitio por losa puesta, en el orden en que se pusieron—. Aquí se reparte por el ORDEN
 * DEL ASIENTO en la mesa y no por el de llegada al canal: así quien se cae y vuelve cuando ya ha
 * pasado la gracia nace donde nació la primera vez, y dos personas no se disputan el primer sitio
 * según quién abrió antes la pestaña.
 *
 * «Libre» son dos cosas: que se pueda estar —el mundo cambia, y un sitio de nacer puede quedarse
 * debajo de una choza— y que no haya nadie encima. Los paseantes no chocan entre sí, pero nacer
 * dentro de otro se ve como un avatar con dos cabezas. Si el sitio del asiento no vale se prueban
 * los siguientes de la lista, y si ninguno vale se busca en anillos alrededor del suyo.
 *
 * ═══ CUANDO EL MUNDO CAMBIA: EL SITIO LIBRE MÁS CERCANO, EN ANILLOS ═══
 *
 * Una losa nueva, una choza fundada, el estiaje que se mueve: el mundo de una mesa cambia con la
 * partida, y un cuerpo puede aparecer ENCIMA de donde estaba alguien —o quitarle el suelo—. Desde
 * dentro de una caja no se sale andando: `seAndaEnRecta` mira los trozos de salida y el primero
 * sigue dentro, así que el servidor rechazaría todo intento y le dejaría clavado. Por eso la sala,
 * al rederivar el mundo, saca a quien haya quedado mal al sitio libre más cercano.
 *
 * La búsqueda es LA MISMA que el rescate del aparato (`sitioDondeCabe` en
 * `escenas/paseo/paseante.ts`): cuarenta y ocho anillos de dos radios, treinta y dos direcciones
 * de la tabla de rumbos de `andar.ts` y el alcance multiplicado con `por`. Entera de punta a punta:
 * con la misma estructura, el aparato y el servidor eligen el mismo sitio. Está escrita otra vez y
 * no importada porque `escenas/` no entra en la compilación del servidor; si un día sube a
 * `shared/mecanicas/`, esta copia se borra.
 */
import { COSENO, RADIO_DEL_PASEANTE, RUMBOS, rumboDeRadianes, SENO } from '../../../shared/mecanicas/andar';
import { TALLA_A_PIE } from '../../../shared/mecanicas/talla';
import { por } from '../../../shared/mecanicas/fijo';
import { sePuedeEstar } from '../../../shared/mecanicas/mundo';
import type { Andante, Arena } from '../../../shared/mecanicas/mundo';

/** Cuántos anillos se miran: 48 × 0,8 = 38,4 unidades. Los del rescate del aparato. */
export const ANILLOS_DEL_RESCATE = 48;

/** Cuántas direcciones por anillo: una de cada ocho de la tabla de rumbos. */
export const DIRECCIONES_DEL_RESCATE = 32;

/**
 * A qué distancia de otro no se nace, en Q16.16: 0,8 unidades. Juntos pero no encima.
 *
 * Eran cuatro radios, 1,6, con un cuerpo de 2,543 de alto y ~1,3 de ancho: dos hombros de holgura.
 * Desde que quien anda mide la mitad (`TALLA_A_PIE`, `shared/mecanicas/talla.ts`) va con la talla:
 * con 1,6 dos que nacen juntos quedaban a dos cuerpos y medio, y fuera del alcance del golpe (1,25),
 * que también encogió. Con 0,8 los dos cuerpos —de ~0,65 de ancho— quedan a un palmo. Sólo lo usa
 * el servidor para elegir dónde aparece alguien: ningún aparato lo sabe, así que cambiarlo no deja
 * fuera a la app instalada.
 */
export const SEPARACION_AL_NACER = Math.round(RADIO_DEL_PASEANTE * 4 * TALLA_A_PIE);

/**
 * EL PRIMER SITIO QUE `admite`, en anillos alrededor de `(x, z)`; el propio sitio primero. `null`
 * si no hay ninguno a menos de 38,4 unidades. Todo en Q16.16.
 */
export function buscarEnAnillos(
  x: number,
  z: number,
  admite: (x: number, z: number) => boolean,
  radio: number = RADIO_DEL_PASEANTE,
): Andante | null {
  if (admite(x, z)) return { x, z };
  /* Anillos de dos radios: más finos no encuentran nada que éstos no encuentren. */
  const paso = radio * 2;
  for (let k = 1; k <= ANILLOS_DEL_RESCATE; k++) {
    const lejos = paso * k;
    for (let i = 0; i < DIRECCIONES_DEL_RESCATE; i++) {
      const r = (i * RUMBOS) / DIRECCIONES_DEL_RESCATE;
      const cx = x + por(lejos, SENO[r] as number);
      const cz = z - por(lejos, COSENO[r] as number);
      if (admite(cx, cz)) return { x: cx, z: cz };
    }
  }
  return null;
}

/** EL SITIO MÁS CERCANO DONDE SE CABE, o `null`. El rescate del aparato, tal cual. */
export function sitioDondeCabe(
  arena: Arena,
  x: number,
  z: number,
  radio: number = RADIO_DEL_PASEANTE,
): Andante | null {
  return buscarEnAnillos(x, z, (cx, cz) => sePuedeEstar(arena, cx, cz, radio), radio);
}

/** Un sitio donde alguien aparece: dónde, y hacia qué rumbo de la tabla (0 a 255) mira. */
export interface Aparicion {
  readonly x: number;
  readonly z: number;
  readonly r: number;
}

/**
 * Un punto donde se puede estar aunque el mundo no declare dónde se nace: el centro de la primera
 * casilla pisable. Un mundo sin `nace` es un fallo de quien lo declara, pero no es motivo para no
 * dejar entrar a nadie.
 */
function centroDeAlgunaCasilla(arena: Arena): Andante | null {
  for (let j = 0; j < arena.fondo; j++) {
    for (let i = 0; i < arena.anchura; i++) {
      if (arena.pisable[j * arena.anchura + i] === 0) continue;
      return { x: (arena.desdeX + i) * arena.lado, z: -(arena.desdeY + j) * arena.lado };
    }
  }
  return null;
}

/**
 * DÓNDE APARECE QUIEN ENTRA POR PRIMERA VEZ.
 *
 * `turno` es el orden de su asiento en la mesa (o, si no se sabe, cuántos hay ya dentro), y
 * `hayAlguien` dice si un punto está ocupado por otro paseante. Ver la cabecera.
 */
export function dondeSeNace(
  arena: Arena,
  turno: number,
  hayAlguien: (x: number, z: number) => boolean,
  radio: number = RADIO_DEL_PASEANTE,
): Aparicion {
  const cuantos = arena.nace.length / 2;
  const libre = (x: number, z: number): boolean => sePuedeEstar(arena, x, z, radio) && !hayAlguien(x, z);

  if (cuantos === 0) {
    const algo = centroDeAlgunaCasilla(arena);
    if (algo === null) return { x: 0, z: 0, r: 0 };
    const donde = buscarEnAnillos(algo.x, algo.z, libre, radio) ?? sitioDondeCabe(arena, algo.x, algo.z, radio) ?? algo;
    return { ...donde, r: 0 };
  }

  const primero = ((turno % cuantos) + cuantos) % cuantos;
  for (let j = 0; j < cuantos; j++) {
    const i = (primero + j) % cuantos;
    const x = arena.nace[i * 2] as number;
    const z = arena.nace[i * 2 + 1] as number;
    if (libre(x, z)) return { x, z, r: rumboDeRadianes(arena.rumbos[i] as number) };
  }

  /* Ninguno de la lista vale: en anillos alrededor del suyo, primero sin nadie encima y luego como sea. */
  const x = arena.nace[primero * 2] as number;
  const z = arena.nace[primero * 2 + 1] as number;
  const r = rumboDeRadianes(arena.rumbos[primero] as number);
  const donde = buscarEnAnillos(x, z, libre, radio) ?? sitioDondeCabe(arena, x, z, radio) ?? { x, z };
  return { ...donde, r };
}
