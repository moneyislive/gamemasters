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
 */
import * as THREE from 'three';
import type { CajaXZ, NivelDeLaCiudad, PlanoDeLaCiudad } from './tipos';
import { DETALLE_DEL_NIVEL } from './tipos';
import { ATRIBUTOS_DE_LA_FACHADA, escribirLasFachadas, huellasDeLasFachadas, materialDeFachada } from './fachadas';
import { construirElSuelo, islasDe, materialDeLaAcera, materialDelAsfalto } from './suelo';
import type { FuenteHorneada } from './luz-de-la-calle';
import { hornearLaLuz, mapaDeAlturas, texturaDeAlturas, texturaDeLaLuz, uniformeDeLaCaja } from './luz-de-la-calle';
import type { FuenteDeReflejo } from './reflejos';
import { TarjetasDeReflejo, materialDeLasTarjetas } from './reflejos';
import type { FuenteDeHalo } from './halos';
import { mallaDeHalos, materialDeLosHalos } from './halos';
import { UNIFORMES_DE_LA_CIUDAD } from './retoques';
import { Molde, triangulosDe } from './geometria';
import { construirElMobiliario } from './mobiliario';
import { escribirLosCoches } from './coches';
import { materialDelCristal, materialDelMobiliario, materialEmisivo } from './materiales';
import { anilloDe, crearElHorizonte } from './anillo';
import { construirLosRotulos } from './neones';
import { Tren } from './tren';
import { Vapor } from './vapor';
import { Trafico } from './trafico';
import { crearLosHaces } from './haces';
import type { RenglonDeLaCiudad } from './presupuesto';
import { INTENSIDAD_DE_FAROLA } from '../atmosfera/luz';

/** Un renglón de lo que se pinta, con su objeto. */
export interface PiezaDeLaCiudad extends RenglonDeLaCiudad {
  readonly objeto: THREE.Object3D;
}

/** Una farola con su cabeza de luz, para el banco de luces reales. */
export interface CabezaDeFarola {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

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

/** El sodio, lineal. */
const SODIO: readonly [number, number, number] = [1.0, 0.52, 0.16];

function escalar(c: readonly [number, number, number], k: number): [number, number, number] {
  return [c[0] * k, c[1] * k, c[2] * k];
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

  /* ─── Fachadas: el barrio con su relieve y el anillo de fuera, en la misma geometría ─── */
  const moldeFachadas = new Molde(ATRIBUTOS_DE_LA_FACHADA);
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
  const materialAcera = materialDeLaAcera();
  liberar.push(() => {
    materialAsfalto.dispose();
    materialAcera.dispose();
  });
  poner(pieza('asfalto', malla('asfalto', suelo.asfalto, materialAsfalto, false, true)));
  poner(pieza('aceras', malla('aceras', suelo.islas, materialAcera, false, true)));

  /* ─── Mobiliario, coches y rótulos: tres moldes, tres llamadas ─── */
  const mob = construirElMobiliario(plano, nivel);
  const coches = escribirLosCoches(plano.coches, mob.mobiliario, mob.emisivo, mob.cristal, detalle.cochesFinos, detalle.lados);
  estorba.push(...mob.estorba, ...plano.coches.map((c) => c.caja));
  const rotulos = construirLosRotulos(plano.rotulos, mob.mobiliario);
  const materialMobiliario = materialDelMobiliario();
  const materialLuz = materialEmisivo();
  const materialCristal = materialDelCristal();
  liberar.push(() => {
    materialMobiliario.dispose();
    materialLuz.dispose();
    materialCristal.dispose();
    rotulos.liberar();
  });
  poner(pieza('mobiliario y coches', malla('mobiliario', mob.mobiliario.geometria(), materialMobiliario, true, true), true));
  poner(pieza('luces del mobiliario', malla('emisivo', mob.emisivo.geometria(), materialLuz, false, false)));
  const cristal = malla('cristal', mob.cristal.geometria(), materialCristal, false, false);
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

  /* ─── Las fuentes de luz ─── */
  const horneadas: FuenteHorneada[] = [];
  const reflejos: FuenteDeReflejo[] = [];
  const halos: FuenteDeHalo[] = [];
  const cabezas: CabezaDeFarola[] = [];

  for (const l of mob.luces) {
    if (l.tipo === 'farola') {
      cabezas.push({ x: l.x, y: l.y, z: l.z });
      horneadas.push({ x: l.x, y: l.y, z: l.z, intensidad: INTENSIDAD_DE_FAROLA, color: null, alcance: 24 });
      reflejos.push({ x: l.x, y: l.y, z: l.z, tamano: 0.3, color: escalar(SODIO, 10), farola: true });
      halos.push({ x: l.x, y: l.y - 0.05, z: l.z, radio: 1.6, color: escalar(SODIO, 2.4), farola: true, parpadeo: 0 });
    } else if (l.tipo === 'cabina') {
      const ambar: [number, number, number] = [1.0, 0.45, 0.08];
      horneadas.push({ x: l.x, y: l.y, z: l.z, intensidad: 5, color: ambar, alcance: 5 });
      reflejos.push({ x: l.x, y: l.y, z: l.z, tamano: 0.15, color: escalar(ambar, 4), farola: false });
      halos.push({ x: l.x, y: l.y, z: l.z, radio: 0.7, color: escalar(ambar, 1.6), farola: false, parpadeo: 0 });
    } else if (l.tipo === 'quiosco') {
      const calida: [number, number, number] = [1.0, 0.72, 0.45];
      horneadas.push({ x: l.x, y: l.y, z: l.z, intensidad: 30, color: calida, alcance: 9 });
      reflejos.push({ x: l.x, y: l.y, z: l.z, tamano: 1.2, color: escalar(calida, 1.4), farola: false });
    } else if (l.tipo === 'prensa') {
      const blanca: [number, number, number] = [1.0, 0.9, 0.6];
      horneadas.push({ x: l.x, y: l.y, z: l.z, intensidad: 5, color: blanca, alcance: 5 });
      reflejos.push({ x: l.x, y: l.y, z: l.z, tamano: 0.6, color: escalar(blanca, 1.2), farola: false });
    } else {
      halos.push({ x: l.x, y: l.y, z: l.z, radio: 0.45, color: [1.2, 0.5, 0.05], farola: false, parpadeo: 0 });
    }
  }
  for (const r of rotulos.fuentes) {
    horneadas.push({ x: r.x, y: r.y, z: r.z, intensidad: 9 * r.tamano, color: r.color, alcance: 11, haciaFuera: r.normal });
    reflejos.push({ x: r.x, y: r.y, z: r.z, tamano: r.tamano * 0.4, color: escalar(r.color, 4.5), farola: false });
    halos.push({ x: r.x, y: r.y, z: r.z, radio: r.tamano * 0.7, color: escalar(r.color, 0.8), farola: false, parpadeo: r.parpadeo });
  }
  for (const c of coches.luces) halos.push({ x: c.x, y: c.y, z: c.z, radio: 0.35, color: escalar(c.color, 1.2), farola: false, parpadeo: 0 });
  let ventanasPuestas = 0;
  for (const v of [...ventanas].sort((a, b) => a.y - b.y)) {
    if (v.escaparate) {
      horneadas.push({ x: v.x + v.normal[0] * 0.3, y: 1.8, z: v.z + v.normal[1] * 0.3, intensidad: 14, color: v.color, alcance: 8, haciaFuera: v.normal });
      reflejos.push({ x: v.x, y: v.y, z: v.z, tamano: 1.1, color: escalar(v.color, 1.5), farola: false });
    } else if (ventanasPuestas < detalle.reflejosDeVentanas) {
      ventanasPuestas++;
      reflejos.push({ x: v.x, y: v.y, z: v.z, tamano: 0.4, color: escalar(v.color, 0.9), farola: false });
    }
  }

  /* ─── La luz horneada y el mapa de alturas ─── */
  const luz = hornearLaLuz(horneadas, anillo.extension);
  const texturaLuz = texturaDeLaLuz(luz);
  const alturas = mapaDeAlturas(
    islas.map((i) => i.caja),
    anillo.extension,
  );
  const texturaAlturas = texturaDeAlturas(alturas);
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
    UNIFORMES_DE_LA_CIUDAD.uHumedad.value = humedad;
  };
  tomarLosUniformes();
  liberar.push(() => {
    texturaLuz.dispose();
    texturaAlturas.dispose();
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
  const vapor = new Vapor(mob.alcantarillas, detalle.vapor, plano.semilla);
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
