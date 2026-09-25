/**
 * LA CIUDAD ENTERA, CONSTRUIDA: de un plano y un nivel, las mallas, sus luces horneadas y lo que
 * cada pieza cuesta. Sin React y sin WebGL (el comprobador la construye en Node).
 *
 * ═══ EL ORDEN IMPORTA ═══
 *
 * Primero la geometría (fachadas, suelo, mobiliario, coches, rótulos, el anillo de fuera), porque de
 * ella salen las FUENTES DE LUZ: las cabezas de las farolas, los auriculares de las cabinas, las
 * ventanas encendidas y los escaparates (éstos, con la misma cuenta que el sombreador). Con todas las
 * fuentes se hornea el mapa de la luz de la calle y se colocan las tarjetas de reflejo y los halos.
 * Por último cada pieza queda en su renglón: nombre, llamadas de dibujo y triángulos MEDIDOS en la
 * geometría construida (no estimados), que es lo que `presupuesto.ts` compara con lo declarado.
 *
 * ═══ LO QUE ESTORBA ═══
 *
 * Cada constructor devuelve también las HUELLAS de lo que pinta y estorba al paso (un edificio, un
 * coche, un banco, el pie de una farola). El comprobador las cruza con la estructura del barrio en
 * los dos sentidos: ninguna caja sin algo pintado encima y nada pintado que estorbe fuera de una
 * caja. Lo que vuela por encima de la cabeza (cornisas, balcones, la viga del tren) no estorba.
 *
 * ═══ SU OBRA Y SU GRADO ═══
 *
 * Las piezas del barrio son las de la ciudad abierta (`EscritorDePieza` de `celdas.ts`): se escriben en una OBRA
 * del barrio (`obraNueva`), con su grado (`gradoDelBarrio`: 1 / 1 / 2 / 2). El barrio se construye entero y de una
 * vez (no tiene ventana de celdas), así que el grado alto en todo el barrio no cabe en su libro (§7.6 del plan
 * del detalle). Hoy el grado no cambia nada: el relieve sigue el del nivel y los coches, los de `cochesFinos`.
 */
import * as THREE from 'three';
import type { CajaXZ, GradoDeLaCelda, NivelDeLaCiudad, PlanoDeLaCiudad } from './tipos';
import { DETALLE_DEL_NIVEL } from './tipos';
import { escribirLasFachadas, huellasDeLasFachadas, materialDeFachada } from './fachadas';
import { construirElSuelo, islasDe, materialDeLaAcera, materialDelAsfalto } from './suelo';
import type { Oclusor } from './luz-de-la-calle';
import { hornearLaLuz, mapaDeAlturas, mapaDeOclusion, texturaDeAlturas, texturaDeLaLuz, texturaDeOclusion, uniformeDeLaCaja } from './luz-de-la-calle';
import { TarjetasDeReflejo, materialDeLasTarjetas } from './reflejos';
import { mallaDeHalos, materialDeLosHalos } from './halos';
import { UNIFORMES_DE_LA_CIUDAD } from './retoques';
import { Molde, triangulosDe } from './geometria';
import type { LuzDelMobiliario } from './mobiliario';
import { HORMIGON, banco, bloque, cabina, centro, fuente, quiosco, quioscoDePrensa, tono, valla } from './mobiliario';
import { farola } from './farolas';
import { alcantarillas } from './tapas';
import { escribirLosVoladizos } from './voladizos';
import { escribirLosCoches } from './coches';
import { ACABADO, ATRIBUTOS_DEL_MOBILIARIO, lineal, materialDelCristal, materialDelMobiliario, materialEmisivo } from './materiales';
import { anilloDe, CAJAS_LEJANAS, crearElHorizonte, crearLaCiudadLejana } from './anillo';
import type { AtlasDeGlifos } from './neones';
import { construirLosRotulos } from './neones';
import { Tren } from './tren';
import { Vapor } from './vapor';
import { Trafico } from './trafico';
import { crearLosHaces } from './haces';
import type { RenglonDeLaCiudad } from './presupuesto';
import type { CabezaDeFarola } from './fuentes';
import { repartirLasLuces } from './fuentes';
import type { ObraDeLaCelda, PartesDeLaCiudad } from './celdas';
import { deUnTiron, moldesDeLaObra, obraNueva } from './celdas';

/** El grado de las piezas del barrio viejo en cada nivel (§7.6 del plan del detalle). */
export const GRADO_DEL_BARRIO_POR_NIVEL: Readonly<Record<NivelDeLaCiudad, GradoDeLaCelda>> = { 0: 1, 1: 1, 2: 2, 3: 2 };

/** El grado de las piezas del barrio viejo en un nivel. */
export function gradoDelBarrio(nivel: NivelDeLaCiudad): GradoDeLaCelda {
  return GRADO_DEL_BARRIO_POR_NIVEL[nivel];
}

/**
 * El atlas de letras de la obra del barrio: el barrio no escribe rótulos de glifos (los suyos van en un atlas de
 * huecos, `construirLosRotulos`), así que éste no lo lee nadie y su textura nunca se sube.
 */
const ATLAS_DEL_BARRIO: AtlasDeGlifos = { textura: new THREE.Texture(), columnas: 1, filas: 1, avance: new Map(), puesto: new Map(), liberar: () => undefined };

/** Lo que la obra del barrio sabe de su ciudad: sus calles, su límite y su semilla (no tiene celdas). */
function ciudadDelBarrio(plano: PlanoDeLaCiudad): PartesDeLaCiudad {
  return { celdas: [], atlas: ATLAS_DEL_BARRIO, calles: plano.calles, semilla: plano.semilla, limite: plano.limite, salidas: [] };
}

/** Los pilares del tren, la viga de un lado a otro y las bocas donde se mete en las fachadas. */
function viaDelTren(obra: ObraDeLaCelda, plano: PlanoDeLaCiudad): void {
  const mo = obra.m.mobiliario;
  const t = plano.tren;
  if (t === null) return;
  tono(mo, HORMIGON, ACABADO.hormigon);
  for (const p of t.pilares) {
    const [x, z] = centro(p);
    const lado = Math.min(p.x1 - p.x0, p.z1 - p.z0);
    bloque(mo, x, 0, z, lado, 0.35, lado);
    bloque(mo, x, 0.35, z, lado - 0.15, t.alto - 0.35 - 0.45, lado - 0.15);
    bloque(mo, x, t.alto - 0.45, z, lado + 0.4, 0.45, lado + 0.4);
  }
  const enX = t.eje === 'x';
  const [x0, x1, z0, z1] = enX ? [t.desde, t.hasta, t.linea - 1.9, t.linea + 1.9] : [t.linea - 1.9, t.linea + 1.9, t.desde, t.hasta];
  /* La viga: el cajón de hormigón y, encima, los petos y los carriles de acero. */
  mo.caja(x0, t.alto, z0, x1, t.alto + 0.9, z1, enX ? 'nsab' : 'eoab');
  tono(mo, lineal(0x3a3d3f), ACABADO.hierroViejo);
  if (enX) {
    mo.caja(x0, t.alto + 0.9, z0, x1, t.alto + 1.45, z0 + 0.12, 'nsa');
    mo.caja(x0, t.alto + 0.9, z1 - 0.12, x1, t.alto + 1.45, z1, 'nsa');
    for (const r of [-0.72, 0.72]) mo.caja(x0, t.alto + 0.9, t.linea + r - 0.04, x1, t.alto + 1.02, t.linea + r + 0.04, 'nsa');
  } else {
    mo.caja(x0, t.alto + 0.9, z0, x0 + 0.12, t.alto + 1.45, z1, 'eoa');
    mo.caja(x1 - 0.12, t.alto + 0.9, z0, x1, t.alto + 1.45, z1, 'eoa');
    for (const r of [-0.72, 0.72]) mo.caja(t.linea + r - 0.04, t.alto + 0.9, z0, t.linea + r + 0.04, t.alto + 1.02, z1, 'eoa');
  }
  /* Las bocas: un hueco negro con marco donde la vía entra en cada fachada. */
  for (const extremo of [t.desde, t.hasta]) {
    /* `hacia`: hacia dónde queda el edificio desde la plaza. La boca va 3 cm por DELANTE de la fachada. */
    const hacia = extremo === t.desde ? -1 : 1;
    const a = extremo - hacia * 0.03;
    tono(mo, lineal(0x020303), [1, 0]);
    if (enX) {
      if (hacia < 0) mo.muro(a, z1 + 0.2, a, z0 - 0.2, t.alto, t.alto + 4.8);
      else mo.muro(a, z0 - 0.2, a, z1 + 0.2, t.alto, t.alto + 4.8);
    } else if (hacia < 0) {
      mo.muro(x0 - 0.2, a, x1 + 0.2, a, t.alto, t.alto + 4.8);
    } else {
      mo.muro(x1 + 0.2, a, x0 - 0.2, a, t.alto, t.alto + 4.8);
    }
    tono(mo, HORMIGON, ACABADO.hormigon);
    const b = extremo - hacia * 0.3;
    if (enX) {
      mo.caja(Math.min(a, b) - 0.25, t.alto + 4.8, z0 - 0.5, Math.max(a, b), t.alto + 5.3, z1 + 0.5, 'nseoab');
      mo.caja(Math.min(a, b) - 0.25, t.alto, z0 - 0.5, Math.max(a, b), t.alto + 4.8, z0 - 0.2, 'nseoab');
      mo.caja(Math.min(a, b) - 0.25, t.alto, z1 + 0.2, Math.max(a, b), t.alto + 4.8, z1 + 0.5, 'nseoab');
    } else {
      mo.caja(x0 - 0.5, t.alto + 4.8, Math.min(a, b) - 0.25, x1 + 0.5, t.alto + 5.3, Math.max(a, b), 'nseoab');
      mo.caja(x0 - 0.5, t.alto, Math.min(a, b) - 0.25, x0 - 0.2, t.alto + 4.8, Math.max(a, b), 'nseoab');
      mo.caja(x1 + 0.2, t.alto, Math.min(a, b) - 0.25, x1 + 0.5, t.alto + 4.8, Math.max(a, b), 'nseoab');
    }
  }
}

/**
 * EL MOBILIARIO DEL BARRIO VIEJO, de un tirón y en su orden de siempre (farolas, bancos, fuente, quiosco, quioscos
 * de prensa, cabinas, vallas, la vía del tren y las alcantarillas): sus luces a `obra.luces` y lo que estorba a
 * `obra.estorba`. Devuelve las bocas de las alcantarillas (para el vapor).
 */
function mobiliarioDelBarrio(obra: ObraDeLaCelda, plano: PlanoDeLaCiudad): { readonly x: number; readonly z: number }[] {
  const apuntar = (l: LuzDelMobiliario | readonly LuzDelMobiliario[]): void => {
    if (Array.isArray(l)) obra.luces.push(...(l as readonly LuzDelMobiliario[]));
    else obra.luces.push(l as LuzDelMobiliario);
  };
  for (const f of plano.farolas) {
    apuntar(deUnTiron(farola(obra, f)));
    obra.estorba.push(f.caja);
  }
  for (const b of plano.glorieta.bancos) {
    deUnTiron(banco(obra, b));
    obra.estorba.push(b.caja);
  }
  const fu = plano.glorieta.fuente;
  if (fu !== null) {
    deUnTiron(fuente(obra, fu));
    obra.estorba.push(fu.caja);
  }
  const qu = plano.glorieta.quiosco;
  if (qu !== null) {
    apuntar(deUnTiron(quiosco(obra, qu)));
    obra.estorba.push(qu.caja);
  }
  for (const q of plano.quioscosDePrensa) {
    apuntar(deUnTiron(quioscoDePrensa(obra, q)));
    obra.estorba.push(q.caja);
  }
  for (const c of plano.cabinas) {
    apuntar(deUnTiron(cabina(obra, c)));
    obra.estorba.push(c.caja);
  }
  for (const v of plano.vallas) {
    apuntar(deUnTiron(valla(obra, v)));
    obra.estorba.push(v);
  }
  if (plano.tren !== null) {
    viaDelTren(obra, plano);
    obra.estorba.push(...plano.tren.pilares);
  }
  return deUnTiron(alcantarillas(obra, { calles: plano.calles, limite: plano.limite }));
}

/** Un renglón de lo que se pinta, con su objeto. */
export interface PiezaDeLaCiudad extends RenglonDeLaCiudad {
  readonly objeto: THREE.Object3D;
}

export type { CabezaDeFarola };

export interface CiudadConstruida {
  readonly grupo: THREE.Group;
  readonly piezas: readonly PiezaDeLaCiudad[];
  /** Lo pintado que estorba al paso, en planta (del barrio y del anillo). */
  readonly estorba: readonly CajaXZ[];
  readonly farolas: readonly CabezaDeFarola[];
  readonly fuentes: { readonly horneadas: number; readonly reflejos: number; readonly halos: number };
  /** Por fotograma: la cámara, el tiempo del adorno y el tic del barrio (el del tren). */
  actualizar(camara: THREE.Camera, tiempo: number, tic: number): void;
  liberar(): void;
}

function pieza(nombre: string, objeto: THREE.Mesh | THREE.InstancedMesh, sombra = false): PiezaDeLaCiudad {
  const t = triangulosDe(objeto.geometry);
  const instancias = objeto instanceof THREE.InstancedMesh ? objeto.count : 1;
  return { nombre, objeto, llamadas: instancias > 0 && t > 0 ? 1 : 0, triangulos: t * instancias, sombra };
}

export function construirLaCiudad(plano: PlanoDeLaCiudad, nivel: NivelDeLaCiudad): CiudadConstruida {
  const detalle = DETALLE_DEL_NIVEL[nivel];
  const conSombras = detalle.sombras > 0;
  const grupo = new THREE.Group();
  grupo.name = `quiebro-ciudad-n${String(nivel)}`;
  const piezas: PiezaDeLaCiudad[] = [];
  const estorba: CajaXZ[] = [];
  const liberar: (() => void)[] = [];
  const poner = (p: PiezaDeLaCiudad): void => {
    piezas.push(p);
    grupo.add(p.objeto);
  };
  const malla = (nombre: string, g: THREE.BufferGeometry, m: THREE.Material, sombra: boolean, recibe: boolean): THREE.Mesh => {
    const x = new THREE.Mesh(g, m);
    x.name = `quiebro-${nombre}`;
    x.castShadow = sombra && conSombras;
    x.receiveShadow = recibe && conSombras;
    liberar.push(() => g.dispose());
    return x;
  };
  const anillo = anilloDe(plano);
  /* La obra del barrio (ver la cabecera): sus moldes, su grado y el relieve del nivel. */
  const obra = obraNueva({ nivel, grado: gradoDelBarrio(nivel), relieveDeHoy: detalle.relieve, ciudad: ciudadDelBarrio(plano), m: moldesDeLaObra(true) });

  /* ─── Fachadas: el barrio con su relieve y el anillo de fuera, en la misma geometría ─── */
  const moldeFachadas = obra.m.fachadas;
  const ventanas = escribirLasFachadas(moldeFachadas, plano.edificios, { relieve: detalle.relieve, ventanas: true });
  escribirLasFachadas(moldeFachadas, anillo.edificios, { relieve: nivel >= 2, ventanas: false });
  const materialFachada = materialDeFachada(nivel);
  liberar.push(() => materialFachada.dispose());
  poner(pieza('fachadas', malla('fachadas', moldeFachadas.geometria(), materialFachada, true, true), true));
  estorba.push(...huellasDeLasFachadas(plano.edificios), ...huellasDeLasFachadas(anillo.edificios));

  /* ─── Suelo ─── */
  const acera = plano.calles[0]?.acera ?? 3;
  const islas = [...islasDe(plano.manzanas, plano.glorieta.caja, acera), ...islasDe(anillo.solares, null, acera)];
  const suelo = construirElSuelo(islas, [...plano.calles, ...anillo.calles], anillo.extension);
  const materialAsfalto = materialDelAsfalto(nivel);
  const materialAcera = materialDeLaAcera(nivel);
  liberar.push(() => {
    materialAsfalto.dispose();
    materialAcera.dispose();
  });
  poner(pieza('asfalto', malla('asfalto', suelo.asfalto, materialAsfalto, false, true)));
  poner(pieza('aceras', malla('aceras', suelo.islas, materialAcera, false, true)));

  /* ─── Mobiliario, coches y rótulos: tres moldes (los de la obra), tres llamadas ─── */
  const bocas = mobiliarioDelBarrio(obra, plano);
  /* Lo que estorba del mobiliario (los coches no lo apuntan en la obra: van aparte, abajo). */
  const estorbaDelMobiliario: readonly CajaXZ[] = [...obra.estorba];
  escribirLosCoches(obra, plano.coches);
  estorba.push(...estorbaDelMobiliario, ...plano.coches.map((c) => c.caja));
  const rotulos = construirLosRotulos(plano.rotulos, obra.m.mobiliario);
  const materialMobiliario = materialDelMobiliario(nivel);
  const materialLuz = materialEmisivo(nivel);
  const materialCristal = materialDelCristal(nivel);
  liberar.push(() => {
    materialMobiliario.dispose();
    materialLuz.dispose();
    materialCristal.dispose();
    rotulos.liberar();
  });
  poner(pieza('mobiliario y coches', malla('mobiliario', obra.m.mobiliario.geometria(), materialMobiliario, true, true), true));
  /* Lo que cuelga por encima de la cabeza: toldos, aparatos de aire, escaleras de incendios, cables y
     banderolas. Mismo material que el mobiliario, su propia llamada (ver `voladizos.ts`): su propio molde, en una
     obra como la del barrio. */
  const voladizos = new Molde(ATRIBUTOS_DEL_MOBILIARIO, true);
  escribirLosVoladizos(obraNueva({ nivel, grado: obra.grado, relieveDeHoy: obra.relieveDeHoy, ciudad: obra.ciudad, m: { ...obra.m, mobiliario: voladizos } }), plano);
  poner(pieza('voladizos', malla('voladizos', voladizos.geometria(), materialMobiliario, true, true), true));
  poner(pieza('luces del mobiliario', malla('emisivo', obra.m.emisivo.geometria(), materialLuz, false, false)));
  const cristal = malla('cristal', obra.m.cristal.geometria(), materialCristal, false, false);
  cristal.renderOrder = 1;
  poner(pieza('cristal', cristal));
  poner(pieza('rótulos de neón', rotulos.malla));

  /* ─── El horizonte ─── */
  const horizonte = crearElHorizonte();
  liberar.push(() => {
    horizonte.geometry.dispose();
    (horizonte.material as THREE.Material).dispose();
  });
  poner(pieza('horizonte', horizonte));
  const lejana = crearLaCiudadLejana(plano.semilla, CAJAS_LEJANAS[nivel]);
  liberar.push(() => {
    lejana.geometry.dispose();
    (lejana.material as THREE.Material).dispose();
  });
  poner(pieza('ciudad lejana', lejana));

  /* ─── Las fuentes de luz ─── */
  const { horneadas, reflejos, halos, cabezas } = repartirLasLuces(obra.luces, rotulos.fuentes, obra.cochesEncendidos, ventanas, detalle.reflejosDeVentanas);

  /* ─── La luz horneada y el mapa de alturas ─── */
  const luz = hornearLaLuz(horneadas, anillo.extension);
  const texturaLuz = texturaDeLaLuz(luz);
  const alturas = mapaDeAlturas(
    islas.map((i) => i.caja),
    anillo.extension,
  );
  const texturaAlturas = texturaDeAlturas(alturas);
  /*
   * La oclusión del suelo: el pie de cada edificio (metro y medio), y el hueco bajo coches, bancos,
   * quioscos, cabinas y farolas. Lo que estorba ya está en `estorba`; los edificios son lo grande.
   */
  const oclusores: Oclusor[] = [
    ...[...huellasDeLasFachadas(plano.edificios), ...huellasDeLasFachadas(anillo.edificios)].map((c) => ({ caja: c, fuerza: 0.55, alcance: 1.6, debajo: 0.3 })),
    ...estorbaDelMobiliario.map((c) => ({ caja: c, fuerza: 0.5, alcance: 0.7, debajo: 0.4 })),
    ...plano.coches.map((c) => ({ caja: c.caja, fuerza: 0.6, alcance: 0.7, debajo: 0.25 })),
  ];
  const texturaOclusion = texturaDeOclusion(mapaDeOclusion(oclusores, anillo.extension));
  const caja = uniformeDeLaCaja(anillo.extension);
  const humedad = plano.tiempo === 'aguacero' ? 0.9 : plano.tiempo === 'niebla' ? 0.35 : 0.55;
  /*
   * Los uniformes son de todo el programa. Se toman al construir y OTRA VEZ en cada fotograma: si se
   * construye la ciudad de la noche siguiente mientras ésta sigue en pantalla (o React construye dos
   * en desarrollo), la que se pinta es la que manda en el mapa de luz, no la última que se construyó.
   */
  const tomarLosUniformes = (): void => {
    UNIFORMES_DE_LA_CIUDAD.uLuzCalle.value = texturaLuz;
    UNIFORMES_DE_LA_CIUDAD.uLuzCalleCaja.value.copy(caja);
    UNIFORMES_DE_LA_CIUDAD.uAlturas.value = texturaAlturas;
    UNIFORMES_DE_LA_CIUDAD.uAlturasCaja.value.copy(caja);
    UNIFORMES_DE_LA_CIUDAD.uOclusionSuelo.value = texturaOclusion;
    UNIFORMES_DE_LA_CIUDAD.uOclusionCaja.value.copy(caja);
    UNIFORMES_DE_LA_CIUDAD.uHumedad.value = humedad;
  };
  tomarLosUniformes();
  liberar.push(() => {
    texturaLuz.dispose();
    texturaAlturas.dispose();
    texturaOclusion.dispose();
  });

  /* ─── Tarjetas y halos ─── */
  const materialTarjetas = materialDeLasTarjetas();
  const tapan = [...huellasDeLasFachadas(plano.edificios), ...huellasDeLasFachadas(anillo.edificios)];
  const tarjetas = new TarjetasDeReflejo(reflejos, tapan, materialTarjetas);
  poner(pieza('tarjetas de reflejo', tarjetas.malla));
  const materialHalos = materialDeLosHalos();
  const mallaHalos = mallaDeHalos(halos, materialHalos);
  poner(pieza('halos', mallaHalos));
  liberar.push(() => {
    tarjetas.malla.geometry.dispose();
    materialTarjetas.dispose();
    mallaHalos.geometry.dispose();
    materialHalos.dispose();
  });

  /* ─── Lo que se mueve: el tren, el vapor, el tráfico de fuera y, en N3, los haces ─── */
  const tren = plano.tren === null ? null : new Tren(plano.tren, materialMobiliario, materialLuz, conSombras);
  if (tren !== null) {
    for (const m of tren.mallas) poner(pieza(`tren · ${m.name}`, m, true));
    liberar.push(() => tren.liberar());
  }
  const vapor = new Vapor(bocas, detalle.vapor, plano.semilla);
  poner(pieza('vapor', vapor.malla));
  liberar.push(() => vapor.liberar());
  const trafico = new Trafico(anillo.avenidas, detalle.trafico, plano.semilla, materialMobiliario, materialLuz, materialTarjetas);
  for (const m of trafico.mallas) poner(pieza(`tráfico · ${m.name}`, m));
  liberar.push(() => trafico.liberar());
  if (detalle.haces) {
    const haces = crearLosHaces(cabezas.map((c) => ({ ...c, y: c.y - 0.1 })));
    poner(pieza('haces de luz', haces));
    liberar.push(() => {
      haces.geometry.dispose();
      (haces.material as THREE.Material).dispose();
    });
  }

  const posicion = new THREE.Vector3();
  let primera = true;
  let antes = 0;
  return {
    grupo,
    piezas,
    estorba,
    farolas: cabezas,
    fuentes: { horneadas: horneadas.length, reflejos: reflejos.length, halos: halos.length },
    actualizar(camara: THREE.Camera, tiempo: number, tic: number): void {
      const dt = primera ? 0 : Math.max(0, Math.min(0.1, tiempo - antes));
      antes = tiempo;
      UNIFORMES_DE_LA_CIUDAD.uTiempo.value = tiempo;
      tomarLosUniformes();
      camara.getWorldPosition(posicion);
      tarjetas.actualizar(posicion, primera);
      tren?.actualizar(tic);
      trafico.actualizar(tiempo, dt);
      primera = false;
    },
    liberar(): void {
      for (const l of liberar) l();
    },
  };
}
