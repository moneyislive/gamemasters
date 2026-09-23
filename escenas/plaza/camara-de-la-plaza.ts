/**
 * LA CÁMARA DE LA PLAZA: aritmética pura de poses, encuadre, mirada y grúa.
 *
 * ═══ POR QUÉ AQUÍ NO HAY `three` (y por qué esto no es `camara.ts` del Muelle) ═══
 *
 * Por lo mismo que en el Muelle: lo que se comprueba de una cámara no es que pinte, es
 * DÓNDE deja las cosas, y eso es una proyección que `verify:plaza` puede hacer en Node
 * con la MISMA cuenta que la escena. La proyección, la respiración, el amortiguado y
 * las mezclas de pose son las del Muelle (`embarcadero/camara.ts`), importadas y no
 * copiadas. Lo que cambia —y por eso hay un fichero— son las poses, el encuadre y las
 * dos coreografías, porque la plaza no es una cala:
 *
 *   · El Muelle mira una cala a ras de agua; la plaza se mira DESDE ARRIBA, 21° en
 *     retrato. Con la cámara baja, seis personas en un cono de móvil se tapan unas a
 *     otras: la altura es lo que reparte la profundidad por la pantalla.
 *   · El Muelle retrocede 0,1 por ocupado, porque sus amarres se alejan mar adentro.
 *     Aquí se retrocede 1,5 por PUESTO OCUPADO MÁS ALTO, que no es lo mismo que por
 *     cuántos hay: si el 5 está ocupado y los demás se han levantado, el encuadre
 *     tiene que seguir cabiendo. Con un solo aventurero la cámara está encima de él;
 *     con los seis, abierta a toda la plaza.
 *   · El zarpe del Muelle sube a una pose aérea suya; el de la plaza sube a la pose
 *     con la que ABRE EL TABLERO —55° de altura y el campo de `camara-del-burgo.ts`—
 *     para que el cambio de pantalla no sea un corte.
 *
 * ═══ LA HOJA MANDA, IGUAL QUE EN EL MUELLE ═══
 *
 * `Ventana.franjaInferior` es la fracción del alto que tapa la hoja del HUD. El local
 * tiene que quedar ENTERO por encima, y para subirlo la cámara INCLINA hacia abajo
 * —baja el punto al que mira—, que es lo contrario de lo que sugiere la intuición. Se
 * resuelve por bisección con la misma proyección que después lo comprueba, y el límite
 * (el 22 % del alto útil) es el del Muelle: `limiteDeLosPies`, importado.
 */
import {
  easeInOutQuart,
  limiteDeLosPies,
  mezclaDePoses,
  proyecta,
} from '../embarcadero/camara';
import type { Pose, Vec3 } from '../embarcadero/camara';
import { CAMPO_DE_LA_CAMARA } from '../burgo/camara-del-burgo';
import { PIE_DEL_LOCAL, SITIOS_DE_LOS_PUESTOS, SUELO_DE_LA_PLAZA } from './la-plaza';

const GRADOS = Math.PI / 180;

/* ───────────────────────────── Las dos poses de reposo ───────────────────────────── */

/** Una pose descrita como la vive quien la elige: a cuánto, a qué altura y con qué giro. */
export interface PoseDescrita {
  /** A cuántas unidades del local, por detrás de él. */
  readonly distancia: number;
  /** Cuánto se aparta del eje hacia la derecha. */
  readonly lado: number;
  /** A qué altura sobre el suelo de la plaza. */
  readonly ojo: number;
  /** Cuánto gira a la derecha la mirada, en grados. */
  readonly giro: number;
  /** Cuánto se inclina hacia abajo, en grados. */
  readonly cabeceo: number;
  readonly fov: number;
}

/**
 * RETRATO: encima del local y mirando a la plaza desde 21° de altura, con 68° de campo.
 *
 * El campo es ancho a propósito y no es gusto: en 9:19,5 el cono HORIZONTAL es el campo
 * vertical por la relación de aspecto, o sea ±15° con 68°. Con los 50° del Muelle serían
 * ±12°, y en ese cono los seis puestos no caben separados el 6 % del ancho que se exige.
 */
export const RETRATO: PoseDescrita = { distancia: 13, lado: 0, ojo: 4, giro: 0, cabeceo: 22, fov: 68 };

/**
 * PANORÁMICA: a catorce del local, ojo a 7,5, apartada metro y medio a la derecha, girada
 * 5° y con 34° de campo.
 *
 * El local cae en el TERCIO IZQUIERDO, que es donde tiene que estar en el PC: el raíl del
 * HUD son 22 rem de vidrio a la derecha, y lo que se mira no puede quedar debajo. El campo
 * es estrecho por la misma razón que en el Muelle: con dieciséis novenos, uno ancho junta a
 * los seis en una franja del centro.
 *
 * ═══ POR QUÉ SE RETIRÓ, Y ES LO QUE SE VIO EN EL BANCO ═══
 *
 * Estuvo a diez unidades con el ojo a seis y 21° de inclinación, y las tres cosas estaban
 * mal a la vez en una pantalla de PC: con 21° y 32° de campo el horizonte queda POR ENCIMA
 * del borde de arriba —o sea, una plaza sin nada de cielo—, y a diez unidades el local y su
 * estandarte se comían el cuadro con el monumento fuera de él. Bajar la inclinación a 14
 * devolvió el cielo; retirar la cámara a catorce y subir el ojo a 7,5 devuelve la PLAZA: el
 * monumento al fondo, las fachadas cerrándola y los seis puestos leyéndose como un arco.
 * En retrato no hacía falta —allí el campo es de 68° y el horizonte entra solo—, y por eso
 * las dos poses no se parecen tanto como uno esperaría.
 */
export const PANORAMICA: PoseDescrita = { distancia: 14, lado: 1.5, ojo: 7.5, giro: 5, cabeceo: 16, fov: 34 };

/** Entre qué relaciones de aspecto se mezclan las dos: igual que el Muelle. */
export const ASPECTO_RETRATO = 0.5;
export const ASPECTO_PANORAMICO = 1.6;

/** Cuánto retrocede la cámara por cada puesto ocupado más allá del local. */
export const RETROCESO_POR_PUESTO = 1.5;
export const RETROCESO_PANORAMICO_POR_PUESTO = 0.3;

/**
 * LO QUE SE LE EXIGE AL ENCUADRE, y lo que el comprobador vuelve a medir.
 *
 * `BORDE_DEL_ENCUADRE` deja un 3 % de margen contra el canto del lienzo para que la
 * respiración no saque a nadie; `SEPARACION_ENTRE_PUESTOS` es el 6 % del ancho que pide
 * el encargo, medido entre los pies proyectados de dos aventureros; y
 * `SEPARACION_RESPIRANDO` es lo mismo con la cámara en cualquier punto de su
 * respiración, que es menos porque la órbita de ±3° acerca a dos puestos que están a
 * distinta profundidad.
 */
export const BORDE_DEL_ENCUADRE = 0.97;
export const SEPARACION_ENTRE_PUESTOS = 0.12;
export const SEPARACION_RESPIRANDO = 0.09;

/** El arrastre: ±22° con el dedo, ±2° con el ratón, como en el Muelle. */
export const ARRASTRE = { dedo: 22 * GRADOS, raton: 2 * GRADOS } as const;

/** Cuánto dura la mirada hacia quien llega, y cuánto el zarpe (el del Muelle, 3,2 s). */
export const DURACION_DE_LA_MIRADA = 1.6;
export { DURACION_DEL_ZARPE } from '../embarcadero/camara';

/* ───────────────────────────── De la descripción a la pose ───────────────────────────── */

const pinza = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));
const suave = (t: number): number => t * t * (3 - 2 * t);

/** La pose que describe `PoseDescrita`, retirada `atras` unidades por su propio eje. */
export function poseDescrita(p: PoseDescrita, atras: number): Pose {
  const ojo: Vec3 = { x: PIE_DEL_LOCAL.x + p.lado, y: PIE_DEL_LOCAL.y + p.ojo, z: PIE_DEL_LOCAL.z + p.distancia };
  const dx = Math.sin(p.giro * GRADOS) * Math.cos(p.cabeceo * GRADOS);
  const dy = -Math.sin(p.cabeceo * GRADOS);
  const dz = -Math.cos(p.giro * GRADOS) * Math.cos(p.cabeceo * GRADOS);
  return {
    posicion: { x: ojo.x - dx * atras, y: ojo.y - dy * atras, z: ojo.z - dz * atras },
    objetivo: { x: ojo.x + dx * 30, y: ojo.y + dy * 30, z: ojo.z + dz * 30 },
    fov: p.fov,
  };
}

/** La mezcla de las dos poses por relación de aspecto, con el retroceso del puesto más alto. */
function poseBase(puestoMasAlto: number, aspecto: number): Pose {
  const t = suave(pinza((aspecto - ASPECTO_RETRATO) / (ASPECTO_PANORAMICO - ASPECTO_RETRATO), 0, 1));
  const k = pinza(puestoMasAlto, 0, SITIOS_DE_LOS_PUESTOS.length - 1);
  return mezclaDePoses(poseDescrita(RETRATO, k * RETROCESO_POR_PUESTO), poseDescrita(PANORAMICA, k * RETROCESO_PANORAMICO_POR_PUESTO), t);
}

/**
 * LA POSE DE REPOSO: aspecto, puesto ocupado más alto y hoja del HUD.
 *
 * La hoja baja el objetivo por bisección hasta que el pie del local queda en su límite.
 * Veinticuatro pasos dejan un error de una millonésima de unidad, que es nada.
 */
export function poseDeReposo(puestoMasAlto: number, aspecto: number, franjaInferior: number): Pose {
  const base = poseBase(puestoMasAlto, aspecto);
  const limite = limiteDeLosPies(franjaInferior);
  const pies: Vec3 = { x: PIE_DEL_LOCAL.x, y: PIE_DEL_LOCAL.y, z: PIE_DEL_LOCAL.z };
  if (proyecta(base, aspecto, pies).y >= limite) return base;
  let alto = base.objetivo.y;
  let bajo = base.objetivo.y - 40;
  for (let i = 0; i < 24; i++) {
    const medio = (alto + bajo) / 2;
    const prueba: Pose = { ...base, objetivo: { ...base.objetivo, y: medio } };
    if (proyecta(prueba, aspecto, pies).y >= limite) bajo = medio;
    else alto = medio;
  }
  return { ...base, objetivo: { ...base.objetivo, y: bajo } };
}

/* ───────────────────────────── Lo que ocupa un aventurero ───────────────────────────── */

/** Lo que mide de ancho un aventurero del pack a media altura, en unidades del mundo. */
export const MEDIO_ANCHO_DEL_AVENTURERO = 0.6;

/**
 * LA CAJA DE UN AVENTURERO EN PANTALLA: se proyectan las ocho esquinas de su volumen.
 *
 * Con una sola proyección del punto de pie no basta y es el error que ya se pagó en el
 * delta: un cuerpo tiene ancho y alto, y lo que hay que exigir es que quepa ENTERO. Vive
 * aquí y no en el comprobador porque es la cuenta con la que se eligieron los sitios de
 * los puestos: si viviera allí, serían dos verdades sobre lo mismo.
 */
export function cajaEnPantalla(
  pose: Pose,
  aspecto: number,
  pie: { readonly x: number; readonly z: number },
  alto: number,
  medioAncho = MEDIO_ANCHO_DEL_AVENTURERO,
): { readonly x0: number; readonly x1: number; readonly y0: number; readonly y1: number; readonly delante: boolean } {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  let delante = true;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      for (const y of [SUELO_DE_LA_PLAZA, SUELO_DE_LA_PLAZA + alto]) {
        const q = proyecta(pose, aspecto, { x: pie.x + sx * medioAncho, y, z: pie.z + sz * medioAncho });
        if (!q.delante) delante = false;
        x0 = Math.min(x0, q.x);
        x1 = Math.max(x1, q.x);
        y0 = Math.min(y0, q.y);
        y1 = Math.max(y1, q.y);
      }
    }
  }
  return { x0, x1, y0, y1, delante };
}

/** Dónde cae en pantalla el pie de un puesto: lo que se mide para la separación. */
export function pieEnPantalla(pose: Pose, aspecto: number, pie: { readonly x: number; readonly z: number }): number {
  return proyecta(pose, aspecto, { x: pie.x, y: SUELO_DE_LA_PLAZA, z: pie.z }).x;
}

/* ───────────────────────────── La mirada y la grúa ───────────────────────────── */

/**
 * AL LLEGAR ALGUIEN: la cámara gira un poco hacia su sitio y vuelve.
 *
 * Seis grados hacia su lado y metro y medio de apertura, con un seno para salir y volver
 * sin golpe, igual que `poseDeLlegada` del Muelle —pero hacia un PUNTO de la plaza y no
 * hacia un amarre, y durando 1,6 s en vez de 0,8: aquí quien llega ANDA, y una mirada de
 * ocho décimas no llega a verlo entrar.
 */
export function poseDeMirada(base: Pose, punto: { readonly x: number; readonly z: number }, u: number): Pose {
  const empuje = Math.sin(Math.PI * pinza(u, 0, 1));
  const rx = base.posicion.x - base.objetivo.x;
  const rz = base.posicion.z - base.objetivo.z;
  const largo = Math.hypot(rx, rz) || 1;
  const lado = Math.sign(punto.x - base.objetivo.x) || 1;
  const giro = 6 * GRADOS * empuje * lado;
  const cos = Math.cos(giro);
  const sin = Math.sin(giro);
  return {
    ...base,
    posicion: {
      x: base.objetivo.x + rx * cos + rz * sin + (rx / largo) * 1.5 * empuje,
      y: base.posicion.y,
      z: base.objetivo.z - rx * sin + rz * cos + (rz / largo) * 1.5 * empuje,
    },
  };
}

/**
 * LA POSE AÉREA DEL ZARPE, Y POR QUÉ ESTOS NÚMEROS Y NO OTROS.
 *
 * Es la pose con la que ABRE EL TABLERO, traída a la escala de la plaza: el mirador del
 * Burgo mira desde 55° de altura (`MIRADOR_DEL_BURGO`) con `CAMPO_DE_LA_CAMARA` grados
 * de campo, y desde aquí la grúa sube hasta 84 de alto y 58 de fondo, que son 54,7°
 * sobre el mismo eje. Lo que se ve en el último fotograma de la plaza es, salvo la
 * escala, lo que se ve en el primero del tablero; y el cielo y la niebla han llegado ya
 * a los del mediodía (`tarde.ts`). El corte deja de ser un corte.
 */
export const POSE_AEREA: Pose = {
  posicion: { x: 0, y: 84, z: 58 },
  objetivo: { x: 0, y: SUELO_DE_LA_PLAZA, z: -1 },
  fov: CAMPO_DE_LA_CAMARA,
};

/** AL ZARPAR: la grúa sube de la pose de reposo a la aérea con `easeInOutQuart`; `u` en 0…1. */
export function poseDeGrua(base: Pose, u: number): Pose {
  return mezclaDePoses(base, POSE_AEREA, easeInOutQuart(u));
}

/*
 * El giro del arrastre alrededor del objetivo estuvo aquí, copiado del Muelle. Es
 * `giraAlrededorDelObjetivo` de `comun/bucle-del-lobby.ts`: lo usa el bucle común de los lobbies, que
 * es quien arrastra, y esta escena ya no lo llama.
 */
