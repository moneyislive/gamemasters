/**
 * LA PALETA DE CADA LUZ DEL BARRIO: los números con que se pintan la madrugada de sodio y el alba gris.
 *
 * ═══ UN SOLO SITIO PARA TODO LO QUE CAMBIA CON LA LUZ ═══
 *
 * La luz no es un filtro que se pone encima: cambia el cielo, lo que el cielo refleja en los charcos y
 * en los cristales, la niebla y sus capas, el hemisferio y la direccional, cuántas ventanas siguen
 * encendidas, cuánto brillan los halos y las tarjetas de reflejo de las farolas, de qué color es la
 * lluvia y con qué luz se recortan los cuerpos. Si cada pieza decidiera lo suyo, el charco reflejaría
 * un cielo y la cúpula enseñaría otro. Así que todo sale de aquí, en dos tablas, y se reparte por
 * uniformes COMPARTIDOS (`UNIFORMES_DE_LA_LUZ`): cambiar de luz es escribir unos valores, sin
 * recompilar un solo sombreador.
 *
 * ═══ LOS COLORES VAN EN LINEAL ═══
 *
 * Lo que va a un sombreador (cielo, reflejo, ambiente de la lluvia, borde de los cuerpos) está en
 * lineal, que es como se suma luz. Lo que va a un objeto de three que ya convierte (el color de la
 * niebla, el de las luces) va en hexadecimal sRGB, que es como se elige a ojo.
 *
 * ═══ CUÁNTO DE CADA COSA (los porqués de las cifras) ═══
 *
 *   · MADRUGADA: la calle la pintan las farolas y los rótulos; el cielo es la panza de las nubes teñida
 *     por la ciudad. El hemisferio sube de 0,22 a 0,5 respecto de la primera versión: con 0,22 las
 *     plantas de arriba eran cajas negras vistas desde la calle y desde el aire, y una ciudad de noche
 *     nunca es negra (el resplandor de la propia ciudad lo impide). El horizonte y la panza de las
 *     nubes, más claros (`resplandor`): con el cielo más oscuro que la calle, las torres no se
 *     recortaban contra él.
 *   · ALBA: el cielo cubierto hace de caja de luz y es LO MÁS CLARO de la imagen (el horizonte, a 1,0 en
 *     lineal; era 0,5 y el cielo salía gris). Lo de abajo, en cambio, oscuro: el suelo del hemisferio es
 *     asfalto mojado casi negro y el hemisferio y la direccional bajan (0,5 y 0,9), para que queden
 *     negros de verdad cerca (una farola, un banco, un cuerpo) y la luz se lea por contraste, como en las
 *     referencias. La bruma empieza a 28 m y es poco densa (×0,3 la del tiempo): cerca todo es nítido y
 *     lejos todo se funde en un aire claro. Las farolas siguen encendidas (sus halos, a la mitad) y
 *     quedan pocas ventanas con luz.
 *
 * Medido en capturas del juego real contra las tres referencias (luminancia de 0 a 255): las
 * referencias tienen negros de 2-13, altas de 176-254 y el tercio de arriba el doble de claro que el
 * de abajo; la primera alba tenía negros de 32-89 y altas de 136-170.
 *
 * La paleta NO toca la partida: la niebla de cada TIEMPO sigue siendo la misma visibilidad en todos
 * los aparatos (ver `niebla.ts`), y la luz sale de la hora del barrio, igual para todos.
 */
import * as THREE from 'three';
import type { LuzDelBarrio } from './luz-del-barrio';

type Rgb = readonly [number, number, number];

export interface PaletaDeLaLuz {
  readonly cielo: {
    /** Cénit y horizonte de la cúpula (lineal). */
    readonly cenit: Rgb;
    readonly horizonte: Rgb;
    /** La panza de las nubes: la parte en sombra y la parte clara (lineal). */
    readonly nubeOscura: Rgb;
    readonly nubeClara: Rgb;
    /** Cuánto cielo cubren las nubes (0 despejado … 1 cubierto). */
    readonly cobertura: number;
    /** Las columnas tenues que suben (0-1). */
    readonly columnas: number;
    /**
     * El resplandor de la ciudad en la panza de las nubes, cerca del horizonte (lineal). De madrugada
     * es lo que recorta las torres: sin él, el cielo quedaba más oscuro que la calle y las siluetas se
     * perdían contra él.
     */
    readonly resplandor: Rgb;
    /** Cuánto se aclara el cielo cubierto hacia donde viene la direccional (0-1): el sol tras las nubes. */
    readonly claro: number;
  };
  /** El cielo falso que reflejan los charcos, los cristales y la pintura (lineal). */
  readonly reflejo: {
    readonly cenit: Rgb;
    readonly horizonte: Rgb;
    /** El muro del «cañón de la calle». */
    readonly muro: Rgb;
    /** Cuánto se ven sus ventanas encendidas. */
    readonly ventanas: number;
    /** El promedio para lo rugoso. */
    readonly media: Rgb;
  };
  readonly hemisferio: { readonly cielo: string; readonly suelo: string; readonly intensidad: number };
  readonly direccional: {
    readonly color: string;
    readonly intensidad: number;
    /** De dónde viene (se suma al foco de la sombra). */
    readonly desde: Rgb;
    /** Lo oscura que es su sombra (0-1). */
    readonly sombra: number;
  };
  /** Multiplica la luz de todas las ventanas y escaparates. */
  readonly ventanas: number;
  /** De cada ventana que la regla encendería, cuántas siguen encendidas (0-1). */
  readonly ventanasEncendidas: number;
  /** Multiplica las tarjetas de reflejo (farolas, neones, ventanas en el charco). */
  readonly tarjetas: number;
  /** Multiplica los halos de las farolas y los rótulos. */
  readonly halos: number;
  /** Las farolas de verdad (N2+): cuánto de su intensidad, y cuánto de su brillo en la ciudad. */
  readonly farolasReales: { readonly intensidad: number; readonly brillo: number };
  /** La luz del aire que ilumina la lluvia y las salpicaduras, además de la de la calle (lineal). */
  readonly ambienteDeLaLluvia: Rgb;
  /** La luz de borde de los cuerpos: el cielo o la niebla que los recorta por detrás (lineal). */
  readonly bordeDeLosCuerpos: Rgb;
  /** La niebla: su color (sRGB), cuánto más espesa y cuánto sube respecto del tiempo. */
  readonly niebla: {
    readonly color: string;
    /** Multiplica la densidad de la capa baja y la lejana del tiempo. */
    readonly densidad: number;
    readonly lejana: number;
    /** La capa alta: densidad (1/m) y caída por metro. Pone las torres lejanas en silueta. */
    readonly alta: { readonly densidad: number; readonly caida: number };
    /** Factor por canal al mirar hacia arriba. */
    readonly haciaArriba: Rgb;
    /**
     * A partir de qué distancia empieza la bruma (m). Lo de cerca queda limpio y con sus negros: la
     * niebla de las referencias empieza lejos, y una bruma que vela los primeros cinco metros lava la
     * imagen entera (el alba de la primera versión no tenía un solo negro). Igual para todos los
     * jugadores de una noche: sale de la luz, que sale de la hora del barrio.
     */
    readonly inicio: number;
  };
  /** Las ventanas encendidas del horizonte lejano (0-1). */
  readonly lucesDelHorizonte: number;
  /** Los conos de luz de las farolas en la niebla (0-1): de día casi no se ven. */
  readonly haces: number;
  /** Cuánto más oscura es la mancha de contacto bajo los cuerpos (1 = la de siempre, 60 %). */
  readonly contacto: number;
}

export const PALETAS: Readonly<Record<LuzDelBarrio, PaletaDeLaLuz>> = {
  madrugada: {
    cielo: {
      cenit: [0.004, 0.0065, 0.0075],
      horizonte: [0.08, 0.105, 0.094],
      nubeOscura: [0.02, 0.027, 0.025],
      nubeClara: [0.1, 0.098, 0.08],
      cobertura: 0.6,
      columnas: 0.55,
      resplandor: [0.07, 0.075, 0.055],
      claro: 0,
    },
    reflejo: {
      cenit: [0.004, 0.0065, 0.007],
      horizonte: [0.05, 0.072, 0.066],
      muro: [0.012, 0.015, 0.015],
      ventanas: 1,
      media: [0.02, 0.027, 0.026],
    },
    hemisferio: { cielo: '#5d8a82', suelo: '#3a2c22', intensidad: 0.5 },
    direccional: { color: '#9fb4c2', intensidad: 0.16, desde: [18, 60, 26], sombra: 0.75 },
    ventanas: 1,
    ventanasEncendidas: 1,
    tarjetas: 1,
    halos: 1,
    /* El brillo de la farola cercana en el suelo mojado, templado: con 0,5 era una mancha que quemaba
       la esquina de la imagen en cuanto la cámara pasaba junto a una. */
    farolasReales: { intensidad: 1, brillo: 0.3 },
    ambienteDeLaLluvia: [0.03, 0.042, 0.038],
    bordeDeLosCuerpos: [0.05, 0.11, 0.1],
    niebla: {
      color: '#1f3a34',
      densidad: 1,
      lejana: 1,
      alta: { densidad: 0.0012, caida: 0.01 },
      haciaArriba: [0.6, 0.7, 0.72],
      inicio: 16,
    },
    lucesDelHorizonte: 1,
    haces: 1,
    contacto: 1,
  },
  alba: {
    cielo: {
      cenit: [0.15, 0.2, 0.18],
      horizonte: [1.0, 1.14, 1.0],
      nubeOscura: [0.17, 0.22, 0.2],
      nubeClara: [0.78, 0.9, 0.8],
      cobertura: 0.9,
      columnas: 0.2,
      resplandor: [0, 0, 0],
      claro: 0.6,
    },
    reflejo: {
      cenit: [0.2, 0.26, 0.24],
      horizonte: [0.8, 0.92, 0.82],
      muro: [0.045, 0.055, 0.052],
      ventanas: 0.3,
      media: [0.15, 0.19, 0.17],
    },
    /*
     * El suelo del hemisferio, oscuro: bajo un cielo cubierto lo que ilumina desde abajo es asfalto
     * mojado, casi negro. Con el pardo claro de antes todo recibía luz por todas partes y no quedaba
     * ninguna sombra en la imagen.
     */
    hemisferio: { cielo: '#a9c4b8', suelo: '#2a2c28', intensidad: 0.5 },
    direccional: { color: '#efe8d6', intensidad: 0.9, desde: [-30, 62, 30], sombra: 0.5 },
    ventanas: 0.6,
    ventanasEncendidas: 0.3,
    tarjetas: 0.45,
    halos: 0.55,
    farolasReales: { intensidad: 0.45, brillo: 0.3 },
    ambienteDeLaLluvia: [0.05, 0.06, 0.056],
    bordeDeLosCuerpos: [0.2, 0.25, 0.23],
    niebla: {
      /* Más oscura abajo que el cielo del horizonte y aclarándose al subir: la bruma del alba vela la
         calle sin lavarla, y arriba se funde con el cielo. */
      color: '#c6d5cb',
      densidad: 0.3,
      lejana: 0.25,
      alta: { densidad: 0.0009, caida: 0.006 },
      haciaArriba: [1.15, 1.15, 1.13],
      inicio: 28,
    },
    lucesDelHorizonte: 0.25,
    haces: 0.3,
    contacto: 1.6,
  },
};

const v3 = (c: Rgb): THREE.Vector3 => new THREE.Vector3(c[0], c[1], c[2]);

/**
 * LOS UNIFORMES DE LA LUZ, compartidos por referencia con todos los materiales que los usan (el cielo,
 * los retoques de la ciudad, la lluvia, los cuerpos). Arrancan en la madrugada.
 */
export const UNIFORMES_DE_LA_LUZ = {
  uCieloCenit: { value: v3(PALETAS.madrugada.cielo.cenit) },
  uCieloHorizonte: { value: v3(PALETAS.madrugada.cielo.horizonte) },
  uNubeOscura: { value: v3(PALETAS.madrugada.cielo.nubeOscura) },
  uNubeClara: { value: v3(PALETAS.madrugada.cielo.nubeClara) },
  uCobertura: { value: PALETAS.madrugada.cielo.cobertura },
  uResplandor: { value: v3(PALETAS.madrugada.cielo.resplandor) },
  uClaroDelCielo: { value: PALETAS.madrugada.cielo.claro },
  /** Hacia dónde está la parte clara del cielo cubierto: la dirección de la direccional (unitaria). */
  uLuzDelCielo: { value: v3(PALETAS.madrugada.direccional.desde).normalize() },
  uReflejoCenit: { value: v3(PALETAS.madrugada.reflejo.cenit) },
  uReflejoHorizonte: { value: v3(PALETAS.madrugada.reflejo.horizonte) },
  uReflejoMuro: { value: v3(PALETAS.madrugada.reflejo.muro) },
  uReflejoVentanas: { value: PALETAS.madrugada.reflejo.ventanas },
  uReflejoMedia: { value: v3(PALETAS.madrugada.reflejo.media) },
  /** Multiplica la luz de las ventanas (además de `uVentanas` de la ciudad, que es del Amanecer). */
  uLuzDeVentanas: { value: PALETAS.madrugada.ventanas },
  uVentanasEncendidas: { value: PALETAS.madrugada.ventanasEncendidas },
  uTarjetas: { value: PALETAS.madrugada.tarjetas },
  /** Cuánto brillo ponen las farolas de verdad en la ciudad (ver `solo-brillo` en `ciudad/retoques.ts`). */
  uBrilloDeLasFarolas: { value: PALETAS.madrugada.farolasReales.brillo },
  uAmbienteDeLaLluvia: { value: v3(PALETAS.madrugada.ambienteDeLaLluvia) },
  uBordeDeLosCuerpos: { value: v3(PALETAS.madrugada.bordeDeLosCuerpos) },
  uLucesDelHorizonte: { value: PALETAS.madrugada.lucesDelHorizonte },
  uHaces: { value: PALETAS.madrugada.haces },
  /** La fuerza de la mancha de contacto de los cuerpos (ver `personajes/sombras.ts`). */
  uSombraDeContacto: { value: PALETAS.madrugada.contacto },
  /** 0 madrugada … 1 alba avanzada: para lo poco que se mezcla en vez de elegirse. */
  uClaridad: { value: 0 },
  /**
   * Cuánto de las farolas HORNEADAS reciben los cuerpos (ver `personajes/material.ts`). En N0-N1 no
   * hay farolas de verdad y el mapa horneado es toda la luz que les llega; en N2+ la farola cercana ya
   * es una luz real y el mapa sólo pone lo que ésta no cubre (las de más lejos, los rótulos).
   */
  uFarolasEnLosCuerpos: { value: 1 },
};

function poner(v: THREE.Vector3, c: Rgb, k = 1): void {
  v.set(c[0] * k, c[1] * k, c[2] * k);
}

/**
 * Escribe la paleta en los uniformes compartidos. `claridad` (0-1) aclara el cielo del alba: a las
 * 3:05 todavía está más cerrado que a las 4:50 (ver `luz-del-barrio.ts`).
 */
export function ponerLaPaleta(luz: LuzDelBarrio, claridad: number): PaletaDeLaLuz {
  const p = PALETAS[luz];
  const u = UNIFORMES_DE_LA_LUZ;
  const k = luz === 'alba' ? 0.8 + 0.25 * Math.min(1, Math.max(0, claridad)) : 1;
  poner(u.uCieloCenit.value, p.cielo.cenit, k);
  poner(u.uCieloHorizonte.value, p.cielo.horizonte, k);
  poner(u.uNubeOscura.value, p.cielo.nubeOscura, k);
  poner(u.uNubeClara.value, p.cielo.nubeClara, k);
  u.uCobertura.value = p.cielo.cobertura;
  poner(u.uResplandor.value, p.cielo.resplandor, k);
  u.uClaroDelCielo.value = p.cielo.claro;
  u.uLuzDelCielo.value.set(p.direccional.desde[0], p.direccional.desde[1], p.direccional.desde[2]).normalize();
  poner(u.uReflejoCenit.value, p.reflejo.cenit, k);
  poner(u.uReflejoHorizonte.value, p.reflejo.horizonte, k);
  poner(u.uReflejoMuro.value, p.reflejo.muro, k);
  u.uReflejoVentanas.value = p.reflejo.ventanas;
  poner(u.uReflejoMedia.value, p.reflejo.media, k);
  u.uLuzDeVentanas.value = p.ventanas;
  u.uVentanasEncendidas.value = p.ventanasEncendidas;
  u.uTarjetas.value = p.tarjetas;
  u.uBrilloDeLasFarolas.value = p.farolasReales.brillo;
  poner(u.uAmbienteDeLaLluvia.value, p.ambienteDeLaLluvia, k);
  poner(u.uBordeDeLosCuerpos.value, p.bordeDeLosCuerpos, k);
  u.uLucesDelHorizonte.value = p.lucesDelHorizonte;
  u.uHaces.value = p.haces;
  u.uSombraDeContacto.value = p.contacto;
  u.uClaridad.value = luz === 'alba' ? claridad : 0;
  return p;
}
