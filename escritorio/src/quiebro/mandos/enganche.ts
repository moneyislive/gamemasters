/**
 * EL ENGANCHE DEL BLANCO: a quién va el golpe que acabo de pulsar.
 *
 * ═══ EL APARATO ELIGE, LA SALA ACEPTA ═══
 *
 * Diseño §4.5: el aparato elige el blanco con MEJOR NOTA a la distancia del enganche o menos (7 m; 9 con
 * la Ligera o el Imán) y a ±60° de la palanca —sin palanca, de la cámara—, y manda su número. La sala lo
 * acepta hasta `radio + holgura` y con línea de vista. Así que aquí se elige con lo mismo que la sala va
 * a mirar: el radio y el cono de la PROPIA acción (`EngancheDeclarado`, que ya trae los retoques), y la
 * línea de vista con la prueba de losa de la Liza (`hayLineaDeVista`) sobre las cajas de la misma arena.
 * Un blanco detrás del quiosco no se elige aunque esté a tres metros: la sala lo rechazaría y el golpe
 * saldría al aire.
 *
 * ═══ LA NOTA ═══
 *
 * Cerca y de frente es mejor que lejos y de lado: la nota es la distancia relativa al radio más el
 * ángulo relativo al cono, a partes iguales. Un Celador a 2 m y 40° gana a uno a 6 m y 5°; uno a 6 m y
 * 0° gana a uno a 5 m y 55°. Y el blanco que ya estaba enganchado se lleva una ventaja pequeña, para que
 * la Tanda no salte de uno a otro por un paso de lado.
 *
 * Puro. Metros y radianes para elegir (es el aparato quien elige: no se arbitra), Q16.16 sólo para
 * preguntar a la losa, que es la de la sala.
 */
import { UNO } from '../../../../shared/mecanicas/fijo';
import { hayLineaDeVista } from '../../../../shared/mecanicas/liza/geometria';

/** Un candidato a blanco, en metros. */
export interface Candidato {
  readonly numero: number;
  readonly x: number;
  readonly z: number;
}

export interface PeticionDeEnganche {
  /** Dónde estoy (metros). */
  readonly x: number;
  readonly z: number;
  /** Hacia dónde apunto: la palanca o, sin ella, la cámara (radianes, 0 al norte, creciendo al este). */
  readonly direccion: number;
  /** El radio del enganche (metros) y su medio cono (radianes). */
  readonly radio: number;
  readonly medioCono: number;
  /** El blanco que ya tenía, para darle ventaja (0 = ninguno). */
  readonly anterior: number;
  /** Las cajas de la estructura, planas en Q16.16 (`Arena.cuerpos`), para la línea de vista. */
  readonly cuerpos: ArrayLike<number>;
}

/** La ventaja del blanco anterior, en puntos de nota. */
const VENTAJA_DEL_ANTERIOR = 0.15;

/** El ángulo más corto entre dos direcciones, en radianes (0..π). */
export function anguloEntre(a: number, b: number): number {
  const d = Math.abs((((b - a) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
  return d;
}

/** La dirección (convenio de `andar.ts`) de `(dx, dz)` en metros: 0 al norte (−z), creciendo al este. */
export function direccionHacia(dx: number, dz: number): number {
  return Math.atan2(dx, -dz);
}

function aFijo(m: number): number {
  return Math.round(m * UNO);
}

/**
 * EL MEJOR BLANCO, o 0 si ninguno cabe en el radio y el cono con línea de vista.
 */
export function elegirBlanco(p: PeticionDeEnganche, candidatos: Iterable<Candidato>): number {
  let mejor = 0;
  let mejorNota = Number.POSITIVE_INFINITY;
  const radio = Math.max(0.01, p.radio);
  const cono = Math.max(0.01, p.medioCono);
  for (const c of candidatos) {
    const dx = c.x - p.x;
    const dz = c.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d > radio) continue;
    /* Encima de mí está dentro de cualquier cono (lo mismo que dice `dentroDelCono` de la Liza). */
    const angulo = d < 1e-6 ? 0 : anguloEntre(p.direccion, direccionHacia(dx, dz));
    if (angulo > cono) continue;
    let nota = d / radio + angulo / cono;
    if (c.numero === p.anterior) nota -= VENTAJA_DEL_ANTERIOR;
    if (nota >= mejorNota) continue;
    if (!hayLineaDeVista(p.cuerpos, aFijo(p.x), aFijo(p.z), aFijo(c.x), aFijo(c.z))) continue;
    mejor = c.numero;
    mejorNota = nota;
  }
  return mejor;
}
