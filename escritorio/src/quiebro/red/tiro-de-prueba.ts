/**
 * EL TIRO DE JUGUETE, SÓLO EN DESARROLLO (contrato del rayo §4): mientras la sala no cumpla el tiro cargado, el
 * Quiebro declara `tiro: null` y el rayo no se puede probar en el juego. Con `?rayo=juguete` en la dirección (y
 * sólo con Vite en desarrollo: `Quiebro.tsx` lo carga con un `import()` dentro de `import.meta.env.DEV`, así que el
 * empaquetado ni lo lleva), la liza que lee ESTE aparato recibe un tiro como el de `verify:quiebro-rayo`: los ids
 * reservados del Quiebro, la tabla del §1.2 (`NIVELES_DEL_RAYO`), un estado de cargar y una bala por nivel con ids
 * libres. Todo el camino del cliente corre con él —el botón, la carga, la mira, la cámara, el cable, los efectos—
 * y la sala, que no lo conoce, ignora las acciones del tiro (un id sin tipo no hace nada en `atenderLaAccionDelAqui`):
 * no hay rayo en la sala, ni recarga que venga de ella.
 *
 * Es el ÚNICO sitio del cliente que lee `NIVELES_DEL_RAYO`: el juego lee la declaración (`leerElTiro`), y
 * `verify:quiebro-juego` mira que nadie más la importe.
 */
import { ACCION_DEL_QUIEBRO, ESTADO_DEL_QUIEBRO, NIVELES_DEL_RAYO } from '../../../../shared/arcade/juegos/quiebro-reglas';
import type { NivelDelRayo } from '../../../../shared/arcade/juegos/quiebro-reglas';
import { deNumero } from '../../../../shared/mecanicas/fijo';
import type { EfectoDeclarado, LizaDeclarada, PuestaDeEstado, TiroDeclarado } from '../../../../shared/mecanicas/liza/declaracion';

const puesta = (estado: number, tics: number): PuestaDeEstado => ({ estado, tics, intocableTics: 0, soltableDesdeTic: tics, distanciaExtra: 0 });
const efecto = (dano: number, p: PuestaDeEstado | null, empuje: number): EfectoDeclarado => ({
  dano,
  danoAlRitmo: dano,
  puntos: 10,
  puntosAlRitmo: 10,
  puesta: p,
  empuje,
  alChocar: { dano: 0, tics: 0 },
  rompeGuardia: false,
});

/** La liza de la mesa, con el tiro de juguete en cada asiento (si ya declara uno de verdad, tal cual). */
export function conTiroDeJuguete(l: LizaDeclarada): LizaDeclarada {
  if (l.asientos.some((a) => a.tiro !== null)) return l;
  let estado = 0;
  for (const e of l.estados) estado = Math.max(estado, e.id);
  estado++;
  let primera = 0;
  for (const p of l.proyectiles) primera = Math.max(primera, p.id);
  primera++;
  const deja = (n: NivelDelRayo): PuestaDeEstado => puesta(ESTADO_DEL_QUIEBRO[n.deja], n.dejaTics);
  const tiro: TiroDeclarado = {
    apuntar: ACCION_DEL_QUIEBRO.apuntarRayo,
    soltar: ACCION_DEL_QUIEBRO.soltarRayo,
    puesta: puesta(estado, 40),
    niveles: NIVELES_DEL_RAYO.map((n, i) => ({
      desdeMs: n.desdeMs,
      proyectil: primera + i,
      ancho: deNumero(0.2),
      area: deNumero(n.areaMetros),
      efectoDelArea: n.areaMetros === 0 ? null : efecto(n.dano, deja(n), deNumero(n.empujeMetros)),
      recargaTics: n.recargaTics,
    })),
    enganche: { radio: deNumero(45), conoRumbos: 8, holgura: deNumero(0.5) },
    holgura: deNumero(0.6),
    cargaMaximaMs: 2000,
  };
  const balas = NIVELES_DEL_RAYO.map((n, i) => ({
    id: primera + i,
    apuntarTics: 1,
    balas: 1,
    cadaTics: 0,
    velocidad: deNumero(400),
    radio: deNumero(0.05),
    alcance: deNumero(n.alcanceMetros),
    efecto: efecto(n.dano, deja(n), deNumero(n.empujeMetros)),
  }));
  return {
    ...l,
    asientos: l.asientos.map((a) => ({ ...a, tiro })),
    estados: [...l.estados, { id: estado, bloqueaPaso: true, bloqueaAccion: false, cancelaCon: [], seCortaConDano: true }],
    proyectiles: [...l.proyectiles, ...balas],
  };
}
