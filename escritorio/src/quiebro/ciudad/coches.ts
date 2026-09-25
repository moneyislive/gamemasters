/**
 * LOS COCHES APARCADOS: turismos, taxis y furgonetas procedurales, dentro de la caja de cada uno.
 *
 * ═══ UN PERFIL, NO UNA CAJA ═══
 *
 * Un coche se reconoce por su silueta de lado: el capó que baja, el parabrisas tumbado, el techo, la
 * luna de atrás y las ruedas. Eso es un PERFIL extruido (`Molde.perfil`): la chapa de abajo a lo
 * ancho entero y el habitáculo algo más estrecho encima, con sus aristas repartidas entre la chapa
 * (techo) y el cristal (parabrisas, luna trasera y laterales). Cuarenta triángulos de carrocería,
 * más las ruedas y los pilotos: un barrio de treinta coches son unos seis mil. En N0 se quitan
 * retrovisores y detalles y las ruedas bajan a seis lados; la silueta es la misma.
 *
 * La pintura es metalizada y lisa (acabado `chapa`): con el cielo falso y el «cañón de la calle» del
 * retoque `entorno`, cada coche refleja la franja de ventanas encendidas de enfrente, que es lo que
 * lo hace parecer un coche de verdad de noche. El tipo y el color salen del hash del sitio: dos
 * aparatos ven el mismo taxi en el mismo hueco.
 *
 * Los faros de un coche aparcado están apagados; el taxi lleva encendida la luz verde de «libre».
 *
 * ═══ UN COCHE, UNA PIEZA QUE CEDE ═══
 *
 * `cocheAparcado` es un escritor de pieza (`EscritorDePieza` de `celdas.ts`): escribe un coche en los tres moldes
 * de su obra, apunta la luz de «libre» del taxi en `obra.cochesEncendidos` y cede. El detalle sale del grado de
 * los coches de la obra (`gradoDeLosCoches` de `grados.ts`): hoy, grado 2 o más es el coche fino (ruedas con
 * llanta, retrovisores y la banda del taxi), que es lo que `cochesFinos` daba en N1-N3.
 */
import * as THREE from 'three';
import type { Molde } from './geometria';
import { ACABADO, lineal } from './materiales';
import type { CocheDelPlano, Orientacion } from './tipos';
import { azarEn } from './azar';
import type { ObraDeLaCelda, ParteDeLaCelda } from './celdas';

const PINTURAS: readonly number[] = [0x243150, 0x9a9ea3, 0x1c1d1f, 0x5a1519, 0x2a4a36, 0x6d7278, 0xc4c7c9, 0x35507a, 0x7a5634, 0x8a1c1c];

type Rgb = readonly [number, number, number];

function tono(m: Molde, color: Rgb, acabado: readonly [number, number]): void {
  m.color(color[0], color[1], color[2]);
  m.poner('aAcabado', acabado[0], acabado[1]);
}

/** El ángulo que lleva el +x local (el morro) a mirar hacia `o`. */
function anguloDelMorro(o: Orientacion): number {
  return o === 'e' ? 0 : o === 'o' ? Math.PI : o === 'n' ? Math.PI / 2 : -Math.PI / 2;
}

interface Silueta {
  readonly chapa: readonly (readonly [number, number])[];
  readonly cabina: readonly (readonly [number, number])[];
  /** Qué aristas de la cabina son de chapa (el resto, cristal). */
  readonly cabinaDeChapa: readonly number[];
  /** La caja de carga de una furgoneta: chapa entera, sin ventanas. */
  readonly carga?: readonly (readonly [number, number])[];
  readonly medioAncho: number;
  readonly medioAnchoCabina: number;
  readonly ruedas: readonly number[];
}

const TURISMO: Silueta = {
  chapa: [
    [-2.2, 0.32], [2.2, 0.32], [2.22, 0.55], [2.15, 0.76], [1.9, 0.85], [0.95, 0.92],
    [-1.4, 0.95], [-2.1, 0.9], [-2.22, 0.72], [-2.22, 0.45],
  ],
  cabina: [[0.95, 0.92], [0.22, 1.37], [-0.92, 1.4], [-1.52, 0.95]],
  cabinaDeChapa: [1],
  medioAncho: 0.86,
  medioAnchoCabina: 0.72,
  ruedas: [1.38, -1.36],
};

const FURGONETA: Silueta = {
  chapa: [
    [-2.2, 0.32], [2.2, 0.32], [2.22, 0.6], [2.12, 0.94], [1.6, 1.1], [1.55, 1.1], [-2.17, 1.1],
    [-2.22, 0.95], [-2.22, 0.45],
  ],
  cabina: [[1.55, 1.1], [0.98, 1.78], [0.35, 1.8], [0.35, 1.1]],
  cabinaDeChapa: [1, 2],
  carga: [[0.35, 1.1], [0.35, 1.8], [-2.12, 1.82], [-2.17, 1.1]],
  medioAncho: 0.86,
  medioAnchoCabina: 0.84,
  ruedas: [1.45, -1.4],
};

/** UN COCHE APARCADO en los tres moldes de su obra, dentro de su caja (ver la cabecera). */
export function* cocheAparcado(obra: ObraDeLaCelda, c: CocheDelPlano): Generator<void, void, void> {
  const mo = obra.m.mobiliario;
  const em = obra.m.emisivo;
  const cr = obra.m.cristal;
  const lados = obra.lados;
  const finos = obra.gradoDeLosCoches >= 2;
  const luces = obra.cochesEncendidos;
  {
    const cx = (c.caja.x0 + c.caja.x1) / 2;
    const cz = (c.caja.z0 + c.caja.z1) / 2;
    const s: Silueta = c.tipo === 'furgoneta' ? FURGONETA : TURISMO;
    const matriz = new THREE.Matrix4().makeRotationY(anguloDelMorro(c.mira)).setPosition(cx, 0, cz);
    const h = azarEn(c.semilla, 3);
    const pintura: Rgb =
      c.tipo === 'taxi' ? lineal(0xd8d9d6) : c.tipo === 'furgoneta' ? lineal(h < 0.6 ? 0xc9cbcc : 0x2d3440) : lineal(PINTURAS[Math.floor(h * PINTURAS.length)] ?? 0x121314);
    mo.con(matriz, () => {
      tono(mo, pintura, ACABADO.chapa);
      mo.perfil(s.chapa, -s.medioAncho, s.medioAncho);
      mo.perfil(s.cabina, -s.medioAnchoCabina, s.medioAnchoCabina, { tapas: false, lados: (i) => s.cabinaDeChapa.includes(i) });
      if (s.carga !== undefined) mo.perfil(s.carga, -s.medioAnchoCabina, s.medioAnchoCabina);
      /* Bajos y paragolpes oscuros. */
      tono(mo, lineal(0x0a0b0c), ACABADO.plastico);
      mo.caja(-2.24, 0.3, -s.medioAncho, 2.24, 0.42, s.medioAncho, 'nseoab');
      /* Las ruedas: neumático y llanta. */
      for (const rx of s.ruedas) {
        for (const lado of [-1, 1]) {
          const rueda = new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(rx, 0.32, lado * (s.medioAncho - 0.12));
          mo.con(new THREE.Matrix4().copy(matriz).multiply(rueda), () => {
            tono(mo, lineal(0x080808), ACABADO.caucho);
            mo.cilindro(0, 0, -0.11, 0.11, 0.32, 0.32, finos ? lados + 4 : 6, true);
            if (finos) {
              tono(mo, lineal(0x6b6e70), ACABADO.cromo);
              mo.cilindro(0, 0, lado * 0.112 - 0.004, lado * 0.112 + 0.004, 0.2, 0.2, lados + 2, true);
            }
          });
        }
      }
      if (finos) {
        /* Retrovisores y manillas: lo que dice «coche» de cerca. */
        tono(mo, pintura, ACABADO.chapa);
        const xr = c.tipo === 'furgoneta' ? 1.4 : 0.85;
        const yr = c.tipo === 'furgoneta' ? 1.2 : 0.98;
        for (const lado of [-1, 1]) {
          const za = lado * (s.medioAncho - 0.03);
          const zb = lado * (s.medioAncho + 0.012);
          mo.caja(xr - 0.08, yr, Math.min(za, zb), xr + 0.08, yr + 0.1, Math.max(za, zb), 'nseoab');
        }
        if (c.tipo === 'taxi') {
          /* La banda roja en diagonal de las puertas delanteras. */
          tono(mo, lineal(0x9a1a1a), ACABADO.chapa);
          for (const lado of [-1, 1]) {
            const z = lado * (s.medioAncho + 0.003);
            const n: readonly [number, number, number] = [0, 0, lado];
            const q: [number, number, number][] = [
              [0.1, 0.46, z],
              [0.45, 0.46, z],
              [0.9, 0.86, z],
              [0.55, 0.86, z],
            ];
            if (lado > 0) mo.quad(q[0] as [number, number, number], q[1] as [number, number, number], q[2] as [number, number, number], q[3] as [number, number, number], n, [0, 0, 1, 0, 1, 1, 0, 1]);
            else mo.quad(q[1] as [number, number, number], q[0] as [number, number, number], q[3] as [number, number, number], q[2] as [number, number, number], n, [0, 0, 1, 0, 1, 1, 0, 1]);
          }
        }
      }
    });
    cr.con(matriz, () => {
      cr.perfil(s.cabina, -s.medioAnchoCabina + 0.004, s.medioAnchoCabina - 0.004, { lados: (i) => !s.cabinaDeChapa.includes(i) && i !== s.cabina.length - 1 });
    });
    em.con(matriz, () => {
      em.poner('aEmisor', 0, 0);
      /* Faros apagados (un gris cálido) y pilotos rojos apagados. */
      em.color(0.18, 0.17, 0.15);
      for (const lado of [-1, 1]) em.caja(2.2, 0.6, lado * 0.62 - 0.12, 2.235, 0.72, lado * 0.62 + 0.12, 'e');
      em.color(0.22, 0.01, 0.01);
      for (const lado of [-1, 1]) em.caja(-2.235, 0.66, lado * 0.66 - 0.1, -2.2, 0.78, lado * 0.66 + 0.1, 'o');
      if (c.tipo === 'taxi') {
        em.color(0.3, 3.2, 0.9);
        em.caja(-0.45, 1.4, -0.14, -0.15, 1.5, 0.14, 'nseoa');
      }
    });
    if (c.tipo === 'taxi') {
      const p = new THREE.Vector3(-0.3, 1.46, 0).applyMatrix4(matriz);
      luces.push({ x: p.x, y: p.y, z: p.z, color: [0.1, 1.0, 0.3] });
    }
  }
  yield;
}

/** LOS COCHES DE UNA CELDA (el escritor de su familia, ver `celdas.ts`): uno por paso, y cada caja estorba. */
export function* cochesDeLaCelda(obra: ObraDeLaCelda, parte: ParteDeLaCelda): Generator<void, void, void> {
  for (const c of parte.coches) {
    yield* cocheAparcado(obra, c);
    obra.estorba.push(c.caja);
  }
}

/** Los coches del barrio viejo, de un tirón (`construir.ts`): sus luces van a `obra.cochesEncendidos`. */
export function escribirLosCoches(obra: ObraDeLaCelda, coches: readonly CocheDelPlano[]): void {
  for (const c of coches) {
    for (const _ of cocheAparcado(obra, c)) {
      /* de un tirón */
    }
  }
}
