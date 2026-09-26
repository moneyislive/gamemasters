/**
 * `<CamaraDelQuiebro>`: la cámara por defecto del lienzo, puesta cada fotograma donde dicen las cuentas
 * de `encuadre.ts`, y el oído del sonido pegado a ella.
 *
 * Es la cámara POR DEFECTO de r3f a propósito: el posproceso (`posproceso/Posproceso.tsx`) pinta con
 * «la escena y la cámara por defecto del lienzo», y una cámara propia montada aparte sería una segunda
 * cámara que nadie pinta.
 *
 * ═══ LOS TRES MODOS ═══
 *
 *   · `orbita`: sin noche en juego (la reunión, el final). La cámara da vueltas despacio sobre la plaza:
 *     la ciudad se ve viva detrás de las pantallas de la mesa.
 *   · `bajada`: la Bajada (diseño §2.1, §8), que ahora es la PREPARACIÓN: la cámara espera en lo alto,
 *     dando la vuelta despacio sobre la plaza mientras el barrio se escribe y cada cual elige, y cae entre
 *     fachadas hasta el hombro cuando están todos (o cuando ya sólo queda lo que tarda en caer). Cuándo y
 *     cuánto lo dice `red/bajada.ts` (`caida`), no un reloj de seis segundos: la Bajada dura hasta 15 s,
 *     y si acaba antes de haber caído, la caída sigue un par de segundos dentro de la oleada.
 *   · `juego`: al hombro, con todo lo de `encuadrar`; o Vigía si no tengo cuerpo.
 *
 * En la ciudad abierta (`red/lugar.ts`) la plaza no está siempre en el origen: la Bajada puede ser en
 * cualquiera de las seis plazas, así que lo alto de la Bajada da vueltas sobre la plaza de la Bajada (en el
 * barrio, el origen: lo de siempre), y la cámara no atraviesa las cajas de la ciudad entera.
 *
 * ═══ EL OJO NUNCA DENTRO DE UNA CAJA ═══
 *
 * `encuadrar` prueba el tramo del HOMBRO al ojo con las cajas ensanchadas 0,25 m. Con la espalda contra
 * una pared, el hombro ya cae dentro de ese margen: el tramo «entra» en la caja en su principio, el corte
 * sale 0 y la distancia se queda en la mínima (0,6 m detrás del hombro), que está al otro lado de la cara.
 * Visto el 24-sep en las tres salidas de avenida: la cámara a −270,17, dentro del cerco (−272..−270) y
 * metida en la cortina de glifos que se aviva al acercarse, con un cuarto de la pantalla en blanco; y en
 * cualquier fachada, 0,2 m dentro. Así que el ojo de `encuadrar` pasa por `ojoFueraDeLasCajas`: si ha
 * quedado dentro de una caja (ensanchada `HOLGURA_DEL_OJO`, más que el plano cercano), se acerca por el
 * tramo que sale del PECHO —el centro del cuerpo, a su radio de 0,35 m de cualquier cara y por tanto
 * siempre fuera— hasta quedar delante de la cara; pegado al pecho, sube para mirar por encima de la cabeza.
 * Si el ojo está fuera, no se toca: el acercarse en el acto y el alejarse suave de `encuadrar` siguen
 * mandando. Soltar la pared no da un salto: el ojo corregido está en el tramo del pecho al de `encuadrar`,
 * y al separarse la parte del tramo que queda dentro de la caja se acorta sin saltos hasta cero (medido al
 * separarse de 60 fachadas en 32 giros a 7 m/s: lo que la corrección suelta en un fotograma no pasa de
 * 0,3 m). La subida junto al pecho tampoco salta: el ojo de `encuadrar` nunca queda a menos de 0,85 m del
 * pecho en planta (0,7 de hombro, y 0,6 detrás con 35° de cabeceo como mucho), así que al salir de la caja
 * lo que suelta de subida son 2,5 cm como mucho.
 *
 * `verify:quiebro-juego` lo prueba con las cajas de la ciudad de verdad: en las tres salidas de las 32
 * trazas y pegado a las fachadas, el ojo de `encuadrar` queda dentro de una caja en más de un tercio de los
 * giros, y el que se pinta, en ninguno. El arreglo de fondo (el hombro dentro del margen) es de
 * `encuadre.ts`, que es de dirección de arte.
 *
 * Corre en su `useFrame` con prioridad −2: después del bucle de la partida (que ya puso mi cuerpo en su
 * sitio de este fotograma) y antes de los efectos y la ciudad, que leen la cámara.
 */
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { EstadoDeLosMandos } from '../mandos/estado';
import { cajasDelLugar, centroDeLaBajada } from '../red/lugar';
import type { CajaDelLugar, LugarDeLaNoche } from '../red/lugar';
import type { Partida } from '../red/partida';
import type { Escenificador } from '../red/escenificar';
import { GiroEnLoAlto } from '../red/bajada';
import type { SistemaDeEfectos } from '../efectos';
import type { Sonido } from '../sonido';
import { desvioDeGiro, empujeFueraDeLaSilueta, friccionDelIman, giroDeEntrada, giroParaApuntar, ojoNuevo, pasoDelGiroDeEntrada, tironDelIman } from '../mandos/rayo';
import type { GiroDeEntrada, OjoDelRayo } from '../mandos/rayo';
import type { CajaAlta, EncuadreDeLaCamara, Punto3 } from './encuadre';
import {
  ALTO_DEL_PIVOTE,
  CABECEO_MAXIMO,
  CABECEO_MINIMO,
  camaraNueva,
  encuadrar,
  FOV_MOVIL,
  FOV_PC,
  primerCorte,
  retrocesoDelDisparo,
  sensibilidadDelZoom,
  suavizarElZoom,
  zoomDeLaCarga,
} from './encuadre';

export type ModoDeLaCamara = 'orbita' | 'bajada' | 'juego';

export interface PropsDeLaCamara {
  readonly partida: Partida;
  readonly mandos: EstadoDeLosMandos;
  readonly escena: Escenificador;
  readonly sistema: SistemaDeEfectos;
  readonly sonido: Sonido;
  /** El lugar de la noche: sus cajas tapan a la cámara, y su plaza de la Bajada es lo que se ve desde lo alto. */
  readonly lugar: LugarDeLaNoche | null;
  readonly modo: ModoDeLaCamara;
  /**
   * Por dónde va la caída de la Bajada en `ahora`: 0 arriba, 1 al hombro, `null` si no hay caída que
   * pintar (`RelojDeLaBajada.caida`).
   */
  readonly caida: (ahora: number) => number | null;
  readonly tactil: boolean;
}

/**
 * LA CAJA CON QUE ALGO TAPA A LA CÁMARA. La caja de choque dice hasta dónde llega lo que PARA a quien
 * anda (la fuente, 1 m), pero lo que se PINTA encima puede subir más: el tejado del quiosco, el capó con
 * su luna, la columna de la fuente. Con la caja tal cual, la cámara quedaba flotando a 1,7 m sobre la
 * fuente y por dentro de su taza (visto en el navegador el 24-sep: media pantalla de piedra mojada).
 *
 *   · Lo que llega al pecho (0,9 m o más) tapa como una pared.
 *   · La FUENTE es la excepción, porque es ancha y baja: el pilón (0,7 m) no tapa, y lo que sí tapa es
 *     su columna con la taza, en el centro (`ciudad/mobiliario.ts`: taza de 0,85 m de radio a 1,5 m, y el
 *     surtidor hasta 2,4). Tratarla entera como pared pegaba la cámara al cogote de quien nace de
 *     espaldas a ella.
 *   · Un banco, no tapa.
 */
export function cajaParaLaCamara(c: CajaDelLugar): CajaAlta {
  if (c.tipo === 'fuente') {
    const cx = (c.x0 + c.x1) / 2;
    const cz = (c.z0 + c.z1) / 2;
    return { x0: cx - 0.95, z0: cz - 0.95, x1: cx + 0.95, z1: cz + 0.95, alto: 2.6 };
  }
  return { x0: c.x0, z0: c.z0, x1: c.x1, z1: c.z1, alto: c.alto >= 0.9 ? Math.max(c.alto, 6) : c.alto };
}

/** Lo que el ojo se queda fuera de cualquier caja como poco: más que el plano cercano de la cámara (0,1 m). */
export const HOLGURA_DEL_OJO = 0.15;

/** ¿Está el punto dentro de alguna caja ensanchada `margen` por los lados y por arriba? */
function dentroDeUnaCaja(p: Punto3, cajas: readonly CajaAlta[], margen: number): boolean {
  for (const c of cajas) {
    if (p.x > c.x0 - margen && p.x < c.x1 + margen && p.z > c.z0 - margen && p.z < c.z1 + margen && p.y < c.alto + margen) return true;
  }
  return false;
}

/**
 * Con la espalda contra la pared el ojo acaba casi en el pecho, dentro de la cabeza (la malla no se ve
 * desde dentro, pero el encuadre queda a la altura de los ojos y sin cuerpo). Así que, a menos de
 * `CERCA_DEL_PECHO` de él, el ojo sube hasta `SUBIDA_JUNTO_AL_PECHO` y mira por encima de la cabeza,
 * algo hacia abajo. Subir no mete el ojo en ninguna caja: son columnas desde el suelo.
 */
export const CERCA_DEL_PECHO = 0.9;
export const SUBIDA_JUNTO_AL_PECHO = 0.5;

/**
 * EL OJO FUERA DE LAS CAJAS (ver la cabecera): el `ojo` tal cual si está fuera de todas; si no, el punto del
 * tramo del pecho de quien está en `(x, z)` al ojo donde ese tramo entra en la primera caja, ensanchada
 * `HOLGURA_DEL_OJO` (y, pegado al pecho, más alto). Pura, para que el comprobador la pruebe con las cajas
 * de la ciudad.
 */
export function ojoFueraDeLasCajas(x: number, z: number, ojo: Punto3, cajas: readonly CajaAlta[]): Punto3 {
  if (!dentroDeUnaCaja(ojo, cajas, HOLGURA_DEL_OJO)) return ojo;
  const pecho: Punto3 = { x, y: ALTO_DEL_PIVOTE, z };
  const f = Math.max(0, Math.min(1, primerCorte(pecho, ojo, cajas, HOLGURA_DEL_OJO)));
  const ox = pecho.x + (ojo.x - pecho.x) * f;
  const oz = pecho.z + (ojo.z - pecho.z) * f;
  const cerca = Math.hypot(ox - x, oz - z);
  const subida = cerca < CERCA_DEL_PECHO ? (1 - cerca / CERCA_DEL_PECHO) * SUBIDA_JUNTO_AL_PECHO : 0;
  return { x: ox, y: pecho.y + (ojo.y - pecho.y) * f + subida, z: oz };
}

function suave(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/** La sacudida del disparo propio: poca con un chispazo, entera con el pleno (`c²`). */
function sacudidaDelDisparo(c: number): number {
  return 0.22 + 0.78 * c * c;
}

/** Escribe en `o` la cámara de este fotograma, en números (`mandos/rayo.ts` no sabe de three). */
function escribirElOjo(cam: THREE.PerspectiveCamera, ancho: number, alto: number, o: OjoDelRayo, eje: THREE.Vector3): void {
  o.x = cam.position.x;
  o.y = cam.position.y;
  o.z = cam.position.z;
  eje.set(0, 0, -1).applyQuaternion(cam.quaternion);
  o.fx = eje.x;
  o.fy = eje.y;
  o.fz = eje.z;
  eje.set(1, 0, 0).applyQuaternion(cam.quaternion);
  o.rx = eje.x;
  o.ry = eje.y;
  o.rz = eje.z;
  eje.set(0, 1, 0).applyQuaternion(cam.quaternion);
  o.ux = eje.x;
  o.uy = eje.y;
  o.uz = eje.z;
  o.tanMedio = Math.tan((cam.fov * Math.PI) / 360);
  o.aspecto = alto > 0 ? ancho / alto : 16 / 9;
}

export function CamaraDelQuiebro(p: PropsDeLaCamara): null {
  const camara = useThree((s) => s.camera);
  const tamano = useThree((s) => s.size);
  const cajas = useMemo<readonly CajaAlta[]>(() => cajasDelLugar(p.lugar).map(cajaParaLaCamara), [p.lugar]);
  const plaza = useMemo(() => centroDeLaBajada(p.lugar), [p.lugar]);
  const estado = useRef(camaraNueva(0));
  const primera = useRef(true);
  /* Al volver a tener cuerpo (reaparecer), la cámara se pone como la primera vez: detrás, mirando hacia donde mira. */
  const teniaCuerpo = useRef(true);
  const mirar = useRef(new THREE.Vector3());
  const adelante = useRef(new THREE.Vector3());
  const vuelta = useRef(new GiroEnLoAlto());
  /*
   * EL RAYO (`docs/quiebro/EL-RAYO.md` §1.1 y §3): el zoom suavizado, el giro de entrada al blanco más a mano,
   * el último disparo visto (para su golpe de campo y su sacudida) y la cámara en números para apuntar.
   */
  const zoom = useRef(0);
  const entrada = useRef<GiroDeEntrada | null>(null);
  const cargabaAntes = useRef(false);
  const disparoVisto = useRef<number>(Number.NEGATIVE_INFINITY);
  const ojoDelRayo = useRef<OjoDelRayo>(ojoNuevo());
  const eje = useRef(new THREE.Vector3());

  useFrame((_s, dt) => {
    const ahora = performance.now();
    const cam = camara as THREE.PerspectiveCamera;
    const e = estado.current;
    const rayo = p.partida.rayo;
    const cargando = rayo.activo;
    const paso = Math.min(0.1, dt);
    const giro = p.mandos.tomarMirada();
    /*
     * LA MANO CON ZOOM: el arrastre gira en la proporción del campo (con 10° menos, un 15 % menos), y con un blanco
     * enganchado, el imán: el dedo frena al cruzarlo y la vista se deja caer hacia él. Sin carga, lo de siempre.
     */
    const base = p.tactil ? FOV_MOVIL : FOV_PC;
    const sensibilidad = cargando ? sensibilidadDelZoom(cam.fov, base) : 1;
    const yo = p.partida.yo();
    const cuerpo = yo === null ? null : p.partida.pintadoDe(yo);
    const blancoDelRayo = cargando && rayo.blanco !== 0 ? p.partida.pintadoDe(rayo.blanco) : null;
    /* El hombro del fotograma anterior: el del encuadre de apuntar mientras entra (de 0,7 a 1,05 m). */
    const quiereGiro = cuerpo !== null && blancoDelRayo !== null ? giroParaApuntar(cuerpo.x, cuerpo.z, blancoDelRayo.x, blancoDelRayo.z, e.hombro) : null;
    const desvio = quiereGiro === null ? Number.POSITIVE_INFINITY : desvioDeGiro(e.giro, quiereGiro);
    e.giro += giro.giro * sensibilidad * (cargando ? friccionDelIman(desvio) : 1);
    e.cabeceo = Math.max(CABECEO_MINIMO, Math.min(CABECEO_MAXIMO, e.cabeceo + giro.cabeceo * sensibilidad));
    /* Al empezar a cargar, el blanco más a mano en toda la pantalla, y la cámara gira hacia él en ≈0,18 s, en curva suave. */
    if (cargando && !cargabaAntes.current) {
      entrada.current = giroDeEntrada(ahora);
      p.partida.apuntarElRayo(ojoDelRayo.current, ahora, true);
    }
    if (!cargando) entrada.current = null;
    cargabaAntes.current = cargando;
    const girando = entrada.current !== null && ahora < entrada.current.hastaMs;
    if (quiereGiro !== null && Number.isFinite(desvio)) {
      const deLaEntrada = entrada.current === null ? null : pasoDelGiroDeEntrada(entrada.current, rayo.blanco, desvio, ahora);
      e.giro += deLaEntrada ?? tironDelIman(desvio, paso);
    }
    /* Y el blanco enganchado, nunca detrás de mí: si entra en la franja de mi silueta, la vista lo saca de ella (`mandos/rayo.ts`). */
    if (cuerpo !== null && blancoDelRayo !== null) e.giro += empujeFueraDeLaSilueta(ojoDelRayo.current, cuerpo.x, cuerpo.z, blancoDelRayo.x, blancoDelRayo.z, paso);
    let encuadre: EncuadreDeLaCamara;

    if (p.modo === 'orbita' || cuerpo === null) {
      const a = (ahora / 1000) * 0.05;
      encuadre = {
        ojo: { x: plaza.x + Math.sin(a) * 34, y: 22, z: plaza.z + Math.cos(a) * 34 },
        mira: { x: plaza.x, y: 2, z: plaza.z },
        fov: p.tactil ? FOV_MOVIL : FOV_PC,
      };
    } else {
      const conCuerpoAhora = p.partida.conCuerpo();
      if (conCuerpoAhora && !teniaCuerpo.current) primera.current = true;
      teniaCuerpo.current = conCuerpoAhora;
      if (primera.current) {
        /* La primera vez, detrás de mí: mirando hacia donde miro al aparecer. */
        e.giro = cuerpo.rumbo;
        primera.current = false;
      }
      const blanco = p.partida.blanco === 0 ? null : p.partida.pintadoDe(p.partida.blanco);
      const vigia = !p.partida.conCuerpo();
      /* El zoom del rayo: entra en ≈0,25 s al pulsar y sigue con la carga; sale en ≈0,12 s al soltar o dejarlo. */
      zoom.current = suavizarElZoom(zoom.current, zoomDeLaCarga(cargando, rayo.c), paso);
      const encuadrado = encuadrar(e, {
        x: cuerpo.x,
        z: cuerpo.z,
        dt: paso,
        enemigosCerca: p.partida.enemigosCerca(),
        blanco,
        /* Cargando, la cámara automática no pelea con quien apunta (EL-RAYO.md §3). */
        mandaElDedo: p.mandos.mandaElDedo(ahora) || cargando,
        remanso: p.sistema.reloj.intensidad(ahora),
        carga: zoom.current,
        /* Y el encuadre de apuntar: el hombro a 1,05 m, 0,15 m más baja y 0,6 m más cerca, con la misma curva (`encuadre.ts`). */
        apuntando: cargando,
        tactil: p.tactil,
        vigia,
        cajas,
      });
      /* El ojo, nunca dentro de una caja (ver la cabecera); el Vigía va a 25 m, por encima de todo. */
      const ojo = vigia ? encuadrado.ojo : ojoFueraDeLasCajas(cuerpo.x, cuerpo.z, encuadrado.ojo, cajas);
      const alHombro: EncuadreDeLaCamara = ojo === encuadrado.ojo ? encuadrado : { ...encuadrado, ojo };
      const caida = p.caida(ahora);
      if (p.modo === 'bajada' || (caida !== null && caida < 1)) {
        /*
         * LA CAÍDA: desde muy arriba sobre la plaza hasta el hombro, frenando al final. Mientras se espera
         * (0), en lo alto y dando la vuelta despacio: la ciudad se escribe debajo y se ve entera.
         */
        const f = suave(caida ?? 0);
        /* El giro, sumado y no sacado del reloj de la página (ver `GiroEnLoAlto`). */
        const a = vuelta.current.avanzar(ahora, caida ?? 0);
        const alto = { x: plaza.x + (cuerpo.x - plaza.x) * 0.4 + Math.sin(a) * 26, y: 70, z: plaza.z + (cuerpo.z - plaza.z) * 0.4 + Math.cos(a) * 26 };
        encuadre = {
          ojo: {
            x: alto.x + (alHombro.ojo.x - alto.x) * f,
            y: alto.y + (alHombro.ojo.y - alto.y) * f * f,
            z: alto.z + (alHombro.ojo.z - alto.z) * f,
          },
          mira: {
            x: alHombro.mira.x * f + cuerpo.x * (1 - f),
            y: alHombro.mira.y * f,
            z: alHombro.mira.z * f + cuerpo.z * (1 - f),
          },
          fov: alHombro.fov + 10 * (1 - f),
        };
      } else encuadre = alHombro;
    }

    /* EL DISPARO PROPIO: su sacudida, una vez por disparo, y un golpe de campo de −2° que vuelve en 150 ms. */
    const disparo = p.partida.ultimoDisparo;
    if (disparo !== null && disparo.t !== disparoVisto.current) {
      disparoVisto.current = disparo.t;
      p.escena.sacudida = Math.max(p.escena.sacudida, sacudidaDelDisparo(disparo.c));
    }
    const golpeDeCampo = disparo === null ? 0 : retrocesoDelDisparo(ahora - disparo.t);
    /* La sacudida de un golpe: unos centímetros, y se apaga en un cuarto de segundo. */
    const s = p.escena.sacudida;
    const temblor = s > 0.01 ? s * 0.07 : 0;
    p.escena.sacudida = s * Math.exp(-Math.min(0.1, dt) / 0.08);
    cam.position.set(
      encuadre.ojo.x + (temblor === 0 ? 0 : Math.sin(ahora * 0.09) * temblor),
      encuadre.ojo.y + (temblor === 0 ? 0 : Math.sin(ahora * 0.13 + 1.7) * temblor),
      encuadre.ojo.z,
    );
    mirar.current.set(encuadre.mira.x, encuadre.mira.y, encuadre.mira.z);
    cam.lookAt(mirar.current);
    const fov = encuadre.fov + golpeDeCampo;
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    /* La palanca empuja relativa a hacia donde mira la cámara (su giro sin la órbita del Remanso). */
    p.partida.giroDeLaCamara = e.giro;
    /* Y el rayo apunta con ESTA cámara: el blanco bajo la mira y el punto que toca (ver `Partida.apuntarElRayo`). */
    escribirElOjo(cam, tamano.width, tamano.height, ojoDelRayo.current, eje.current);
    if (cargando) p.partida.apuntarElRayo(ojoDelRayo.current, ahora, girando);
    /* El oído, en la cámara. */
    cam.getWorldDirection(adelante.current);
    p.sonido.oyente({ x: cam.position.x, y: cam.position.y, z: cam.position.z }, { x: adelante.current.x, y: adelante.current.y, z: adelante.current.z });
  }, -2);

  return null;
}
