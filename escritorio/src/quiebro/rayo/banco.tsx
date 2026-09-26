/**
 * EL BANCO DEL RAYO (`docs/quiebro/EL-RAYO.md` §4): el rayo en la ciudad de verdad, con los cuerpos, la atmósfera y
 * el posproceso del nivel, parado en un instante EXACTO para juzgarlo a ojo fotograma a fotograma. Se abre con
 * `escritorio/banco-quiebro-rayo.html`.
 *
 * ═══ CÓMO ES DETERMINISTA ═══
 *
 * El reloj de los efectos, el de los cuerpos y el del adorno de la ciudad NO corren: se paran en el instante pedido
 * (`t`, en ms desde el disparo). Lo que el juego manda con los sucesos (empezar a cargar, cómo va la carga, soltar,
 * el `estalla` de la sala) se REHACE entero para ese instante sobre un sistema vaciado: una foto no depende de las
 * anteriores ni de lo que tarde la máquina en pintar. Las chispas se siembran, el canal también, y las luces de
 * verdad de N2-N3 se asientan con el paso fijo de las fotos (`fijarElPasoDeLasLuces`).
 *
 * ═══ MANDOS (en la dirección) ═══
 *
 *   nivel=0..3            el nivel de calidad (el camino del posproceso, las piezas, las luces)
 *   luz=madrugada|alba    la luz del barrio (la lee la ciudad en desarrollo)
 *   escena=cerca|lejos    el sitio y la cámara: `cerca`, al hombro de quien dispara (el ojo a unos 3 m de la mano);
 *                         `lejos`, desde la bocacalle, a unos 25 m del rayo, que la cruza. Por omisión, `cerca`.
 *   pos=x,z,rumbo         quien dispara (rumbo en radianes, 0 al norte, crece hacia el este) · distancia=D (m)
 *   ojo=x,y,z · mira=x,y,z  la cámara a mano (sustituye a la de la escena)
 *   apunta=0              al hombro, la cámara mira al frente del tirador (por omisión mira AL BLANCO, como en el
 *                         juego: al cargar, la cámara gira para poner al enemigo bajo la mira, EL-RAYO.md §1.1)
 *   zoom=0                sin el zoom de la carga (por omisión, el del juego, `camara/encuadre.ts` de MANDOS: el campo
 *                         se cierra hasta 10° con la carga y vuelve en ≈0,12 s al soltar, con el retroceso de −2°)
 *   encuadre=hombro       al hombro, sin EL ENCUADRE DE APUNTAR (por omisión, el del juego al cargar: ver
 *                         `encuadreDelBanco`); campo=GRADOS el campo de visión sin carga (por omisión 70, el de PC; 75
 *                         es el del móvil)
 *   carga=MS | c=0..1     la carga (ms del aparato; c × 1300). Por omisión, el pleno
 *   t=MS                  el instante, en ms desde el disparo (negativo: mientras carga)
 *   blanco=1|0            un Celador donde da (por omisión 1); con 0, da en lo que haya a esa distancia
 *   ajeno=1               el rayo es de OTRO (lo que ve quien no dispara): sale sin saber dónde da y lo dice el `estalla`;
 *                         como en `red/escenificar.ts`, su canal va hasta el cuerpo que se le cruza (lo predice)
 *   pasa=M                (con ajeno=1) el cuerpo NO se predijo: el canal sale M metros más allá del blanco (hasta la
 *                         estructura) y el `estalla` en el blanco lo recorta cuando llega (ver `retraso`)
 *   retraso=MS            cuándo llega el `estalla` de la sala tras el disparo (por omisión 60)
 *   traza, codigo, noche  la ciudad (por omisión traza 0, K7M2P, noche 1) · lluvia=1 (por omisión, sin lluvia)
 *   rayo=0                la misma escena SIN el rayo (las mismas poses, la misma cámara en cada instante): la foto con
 *                         la que se compara la de con rayo para medir lo que pone (la caja del haz)
 *   hoja=t1,t2,…          LA HOJA DE CONTACTOS: pinta cada instante (cuatro fotogramas cada uno, para que todo se
 *                         asiente) y deja cada foto en el DOM como `<img id="foto-K" data-t data-mano data-blanco>`
 *                         (PNG en base64; la mano y donde da, «x,y» en px de la foto), a `ancho`×`alto` (por omisión
 *                         960×540). `rayo/banco` + `--dump-dom` las saca a ficheros.
 *   panel=0               sin el rótulo de la esquina
 *   medir=1               (con hoja) MIDE cada foto en la página y deja las medidas en `#medidas-del-rayo` (JSON): la luz
 *                         en el camino del canal, la de abajo lejos del canal (lo que alumbra el estallido) y la de arriba
 *                         (el fogonazo de pantalla). Lo lee `verify:quiebro-gl` para saber que el rayo está ENCHUFADO:
 *                         que se pinta el canal, que el foco se enciende y que el posproceso recibe el fogonazo.
 *
 * EL DOM DICE DE QUÉ ÁRBOL SALE (`#banco-arbol`, `data-arbol`) y cuándo está listo (`data-listo="1"`: la ciudad
 * construida y los cuerpos cargados); con `hoja`, `data-hecha="1"` cuando están todas las fotos.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { NIVELES_DEL_RAYO } from '../../../../shared/arcade/juegos/quiebro-reglas';
import type { NivelDelRayo } from '../../../../shared/arcade/juegos/quiebro-reglas';
import { LaCiudadDeNoche } from '../ciudad/LaCiudadDeNoche';
import type { CiudadAbiertaConstruida } from '../ciudad/abierta';
import { EfectosDelQuiebro } from '../efectos/Efectos';
import { crearRelojDePresentacion } from '../efectos/reloj';
import { crearSistemaDeEfectos } from '../efectos/sistema';
import type { SistemaDeEfectos } from '../efectos/sistema';
import { CuerposDelQuiebro } from '../personajes/CuerposDelQuiebro';
import type { DirectorDeLosPersonajes } from '../personajes/director';
import type { CuerpoPintado, FuenteDeCuerpos, Gesto } from '../cuerpos';
import { Posproceso } from '../posproceso/Posproceso';
import { PASO_QUE_ASIENTA_LAS_LUCES, fijarElPasoDeLasLuces } from '../atmosfera/luz';
import { ALTO_DE_LA_BOCA_SIN_MANO, estadoDelRayoApagado, semillaDelRayo } from './contrato';
import type { PuntoDelRayo } from './contrato';

/* ─────────────────────────────── Los ajustes ─────────────────────────────── */

type Nivel = 0 | 1 | 2 | 3;

interface Punto3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

interface AjustesDelBanco {
  readonly nivel: Nivel;
  readonly traza: number;
  readonly codigo: string;
  readonly noche: number;
  readonly lluvia: boolean;
  /** Quien dispara: pies y hacia dónde mira. */
  readonly tirador: { readonly x: number; readonly z: number; readonly rumbo: number };
  readonly distancia: number;
  readonly ojo: Punto3;
  readonly mira: Punto3;
  /** Con el zoom de la carga del juego (ver `campoDelBanco`). */
  readonly zoom: boolean;
  /** Al hombro y con el encuadre de apuntar: adonde va el ojo mientras se carga (ver `encuadreDelBanco`); si no, null. */
  readonly ojoApuntando: Punto3 | null;
  /** El campo de visión sin carga, en grados. */
  readonly campo: number;
  readonly cargaMs: number;
  readonly t: number;
  readonly blanco: boolean;
  readonly ajeno: boolean;
  /** Con `ajeno`: cuánto más allá del blanco sale dibujado el canal antes del `estalla` (0: se predijo el cuerpo). */
  readonly pasa: number;
  readonly retraso: number;
  readonly hoja: readonly number[] | null;
  readonly ancho: number;
  readonly alto: number;
  readonly panel: boolean;
  /** Medir cada foto de la hoja (ver `medirLaFoto`). */
  readonly medir: boolean;
  /** Con el rayo (por omisión); sin él (`rayo=0`), la misma escena para compararla. */
  readonly conRayo: boolean;
  readonly errores: readonly string[];
}

/** Los dos sitios del protocolo del rayo (EL-RAYO.md §4): la calle `x = 24` al norte, y la bocacalle del cruce. */
const ESCENAS = {
  /* Al hombro: quien dispara en el eje de la calle `x = 24`, mirando al norte hacia el cruce (24, 24). */
  cerca: { tirador: { x: 23.4, z: 50, rumbo: 0 }, distancia: 12 },
  /*
   * Desde la calle `x = 24`, a unos 26 m: quien dispara está en el cruce (24, 24) y dispara por la calle `z = 24`
   * hacia el oeste, así que el rayo CRUZA el encuadre de derecha a izquierda (de cara no se le ve la forma).
   */
  lejos: { tirador: { x: 33, z: 24.4, rumbo: -Math.PI / 2 }, distancia: 12, ojo: { x: 25, y: 4.5, z: 48 }, mira: { x: 27, y: 0.6, z: 24.4 } },
} as const;

function numeroDe(texto: string | null): number {
  return texto === null || /^\s*$/.test(texto) ? Number.NaN : Number(texto);
}

function tres(texto: string | null): Punto3 | null {
  const v = texto?.split(',').map(numeroDe);
  return v !== undefined && v.length === 3 && v.every(Number.isFinite) ? { x: v[0] as number, y: v[1] as number, z: v[2] as number } : null;
}

function leer(): AjustesDelBanco {
  const p = new URLSearchParams(window.location.search);
  const errores: string[] = [];
  const nivelPedido = p.get('nivel') ?? '3';
  if (!/^[0-3]$/.test(nivelPedido)) errores.push(`nivel=«${nivelPedido}»: de 0 a 3`);
  const nivel = (/^[0-3]$/.test(nivelPedido) ? Number(nivelPedido) : 3) as Nivel;
  const escena = p.get('escena') === 'lejos' ? ESCENAS.lejos : ESCENAS.cerca;
  const pos = p.get('pos')?.split(',').map(numeroDe);
  const tirador = pos !== undefined && pos.length === 3 && pos.every(Number.isFinite) ? { x: pos[0] as number, z: pos[1] as number, rumbo: pos[2] as number } : escena.tirador;
  if (p.has('pos') && tirador === escena.tirador) errores.push(`pos=«${p.get('pos') ?? ''}»: x,z,rumbo`);
  const distancia = p.has('distancia') ? numeroDe(p.get('distancia')) : escena.distancia;
  if (!(distancia > 0.5 && distancia < 60)) errores.push('distancia: de 0,5 a 60 m');
  /*
   * La cámara: la de la escena lejana, la pedida, o al hombro (3,2 m detrás, 0,7 m a la derecha, 1,75 m) mirando AL
   * BLANCO (donde da el rayo: `rehacer`), como la deja el juego al cargar; con `apunta=0`, al frente. Al hombro, y
   * mientras se carga, EL ENCUADRE DE APUNTAR (`encuadreDelBanco`): 2,6 m detrás, 1,05 m a la derecha, 1,55 m.
   */
  const f = { x: Math.sin(tirador.rumbo), z: -Math.cos(tirador.rumbo) };
  const d = { x: Math.cos(tirador.rumbo), z: Math.sin(tirador.rumbo) };
  const alHombro = { x: tirador.x - f.x * 3.2 + d.x * 0.7, y: 1.75, z: tirador.z - f.z * 3.2 + d.z * 0.7 };
  const alApuntar = {
    x: tirador.x - f.x * ENCUADRE_DE_APUNTAR.detras + d.x * ENCUADRE_DE_APUNTAR.hombro,
    y: ENCUADRE_DE_APUNTAR.alto,
    z: tirador.z - f.z * ENCUADRE_DE_APUNTAR.detras + d.z * ENCUADRE_DE_APUNTAR.hombro,
  };
  const campo = p.has('campo') ? numeroDe(p.get('campo')) : CAMPO_SIN_CARGA;
  if (!(campo >= 30 && campo <= 100)) errores.push('campo: de 30 a 100 grados');
  const hasta = Number.isFinite(distancia) ? distancia : 12;
  const dondeDa = p.get('blanco') !== '0' ? hasta - 0.3 : hasta;
  const miraAlHombro =
    p.get('apunta') === '0'
      ? { x: tirador.x + f.x * 8 + d.x * 0.7, y: 1.45, z: tirador.z + f.z * 8 + d.z * 0.7 }
      : { x: tirador.x + f.x * dondeDa, y: 1.3, z: tirador.z + f.z * dondeDa };
  const ojo = tres(p.get('ojo')) ?? ('ojo' in escena && !p.has('pos') ? escena.ojo : alHombro);
  const mira = tres(p.get('mira')) ?? ('mira' in escena && !p.has('pos') ? escena.mira : miraAlHombro);
  const c = numeroDe(p.get('c'));
  const cargaMs = p.has('carga') ? numeroDe(p.get('carga')) : p.has('c') ? c * cargaLlenaMs() : cargaLlenaMs();
  if (!(cargaMs >= 0 && cargaMs <= 2000)) errores.push('carga: de 0 a 2000 ms (o c de 0 a 1)');
  const t = p.has('t') ? numeroDe(p.get('t')) : 40;
  if (!Number.isFinite(t)) errores.push('t: un número de ms');
  const hoja = p.has('hoja') ? (p.get('hoja') ?? '').split(',').map(numeroDe) : null;
  if (hoja !== null && (hoja.length === 0 || !hoja.every(Number.isFinite))) errores.push('hoja: instantes separados por comas');
  const retraso = p.has('retraso') ? numeroDe(p.get('retraso')) : 60;
  return {
    nivel,
    traza: Math.max(0, Math.min(31, Math.floor(numeroDe(p.get('traza') ?? '0')) || 0)),
    codigo: (p.get('codigo') ?? 'K7M2P').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'K7M2P',
    noche: Math.max(1, Math.floor(numeroDe(p.get('noche') ?? '1')) || 1),
    lluvia: p.get('lluvia') === '1',
    tirador,
    distancia: Number.isFinite(distancia) ? distancia : 12,
    ojo,
    mira,
    /* El zoom es de la cámara de quien dispara: al hombro y con su rayo (no desde fuera, ni con el rayo de otro). */
    zoom: p.get('zoom') !== '0' && ojo === alHombro && p.get('ajeno') !== '1',
    /* El encuadre de apuntar, también: sólo al hombro y con su rayo. */
    ojoApuntando: p.get('encuadre') !== 'hombro' && ojo === alHombro && p.get('ajeno') !== '1' ? alApuntar : null,
    campo: Number.isFinite(campo) ? campo : CAMPO_SIN_CARGA,
    cargaMs: Number.isFinite(cargaMs) ? cargaMs : cargaLlenaMs(),
    t: Number.isFinite(t) ? t : 40,
    blanco: p.get('blanco') !== '0',
    ajeno: p.get('ajeno') === '1',
    pasa: Math.max(0, Math.min(40, numeroDe(p.get('pasa') ?? '0') || 0)),
    retraso: Number.isFinite(retraso) ? Math.max(0, retraso) : 60,
    hoja: hoja !== null && hoja.every(Number.isFinite) && hoja.length > 0 ? hoja : null,
    ancho: Math.max(160, Math.min(1920, Math.floor(numeroDe(p.get('ancho') ?? '960')) || 960)),
    alto: Math.max(90, Math.min(1080, Math.floor(numeroDe(p.get('alto') ?? '540')) || 540)),
    panel: p.get('panel') !== '0',
    medir: p.get('medir') === '1',
    conRayo: p.get('rayo') !== '0',
    errores,
  };
}

/* ─────────────────────────────── El tiro del banco ─────────────────────────────── */

/**
 * La tabla del §1.2 que declara El Quiebro (`NIVELES_DEL_RAYO`): el banco no tiene sala ni diccionario, y la lee de
 * donde la lee la declaración. El juego NO: el cliente saca sus números de `lectura.tiro` (`leerElTiro`).
 */
function cargaLlenaMs(): number {
  return (NIVELES_DEL_RAYO[NIVELES_DEL_RAYO.length - 1] as NivelDelRayo).desdeMs;
}
function nivelDeLaCargaDelBanco(ms: number): NivelDelRayo {
  let n = NIVELES_DEL_RAYO[0] as NivelDelRayo;
  for (const x of NIVELES_DEL_RAYO) if (x.desdeMs <= ms) n = x;
  return n;
}

/** El instante del disparo, en el reloj de los efectos (lejos del cero). */
const T_DISPARO = 1_000_000;
/** Los números de la escena: quien dispara es el asiento 1 (o el 2 si es ajeno); el Celador, la entidad 20. */
const TIRADOR = 1;
const AJENO = 2;
const CELADOR = 20;

/* ─────────────────────────────── La escena ─────────────────────────────── */

interface Montaje {
  readonly ajustes: AjustesDelBanco;
  readonly sistema: SistemaDeEfectos;
  /** El instante de ahora, en ms desde el disparo (lo mueve la hoja). */
  readonly instante: { t: number };
  readonly director: { actual: DirectorDeLosPersonajes | null };
  /** De dónde a dónde va el rayo en el instante de ahora (la mano y donde da): lo pone `rehacer`. */
  readonly trazo: { origen: PuntoDelRayo | null; destino: PuntoDelRayo | null };
}

/** Los cuerpos: quien dispara y, si se pide, el Celador donde da. Con sus gestos para el instante de ahora. */
function crearLaFuente(m: Montaje): FuenteDeCuerpos {
  const a = m.ajustes;
  const quien = a.ajeno ? AJENO : TIRADOR;
  const f = { x: Math.sin(a.tirador.rumbo), z: -Math.cos(a.tirador.rumbo) };
  const tirador: CuerpoPintado = {
    id: quien,
    clase: 'desvelado',
    variante: 0,
    color: '#ff9a3c',
    x: a.tirador.x,
    z: a.tirador.z,
    rumbo: a.tirador.rumbo,
    velocidad: 0,
    gesto: 'reposo',
    gestoDesdeMs: 0,
    impactoMs: null,
    direccionDelGesto: null,
    contorno: false,
    tenue: false,
  };
  const celador: CuerpoPintado = {
    id: CELADOR,
    clase: 'celador',
    variante: 1,
    color: null,
    x: a.tirador.x + f.x * a.distancia,
    z: a.tirador.z + f.z * a.distancia,
    rumbo: a.tirador.rumbo + Math.PI,
    velocidad: 0,
    gesto: 'reposo',
    gestoDesdeMs: 0,
    impactoMs: null,
    direccionDelGesto: null,
    contorno: true,
    tenue: false,
  };
  const lista: CuerpoPintado[] = a.blanco ? [tirador, celador] : [tirador];
  const nadie = new Set<number>();
  return {
    cuerpos: () => {
      const t = m.instante.t;
      const ahora = T_DISPARO + t;
      const inicio = T_DISPARO - a.cargaMs;
      const n = nivelDeLaCargaDelBanco(a.cargaMs);
      if (t < 0 && ahora >= inicio) {
        tirador.gesto = 'cargar-rayo';
        tirador.gestoDesdeMs = inicio;
        tirador.impactoMs = null;
        tirador.carga = Math.min(1, (ahora - inicio) / cargaLlenaMs());
      } else if (t >= 0) {
        tirador.gesto = 'lanzar-rayo';
        tirador.gestoDesdeMs = T_DISPARO;
        tirador.impactoMs = T_DISPARO;
        tirador.carga = 0;
      } else {
        tirador.gesto = 'reposo';
        tirador.gestoDesdeMs = 0;
        tirador.carga = 0;
      }
      const golpe: Gesto = n.deja === 'derribado' ? 'derribado' : n.deja === 'tocado' ? 'tocado' : 'descolocado';
      const llega = T_DISPARO + 40;
      celador.gesto = ahora >= llega ? golpe : 'reposo';
      celador.gestoDesdeMs = ahora >= llega ? llega : 0;
      return lista;
    },
    prestados: () => nadie,
    ticDeLosDurmientes: () => 1100,
    yo: () => null,
  };
}

/**
 * LA MANO: la de los personajes si ya la dan (ANIMACIÓN cambia el pivote de la fase 0 por la mano de verdad); si
 * todavía dan el pivote, una mano aproximada: la derecha, extendida hacia delante a la altura del hombro (el gesto
 * de cargar es un brazo estirado).
 */
function crearLaBoca(m: Montaje, fuente: FuenteDeCuerpos): (id: number, salida: PuntoDelRayo) => boolean {
  return (id, salida) => {
    const d = m.director.actual;
    let c: CuerpoPintado | null = null;
    for (const x of fuente.cuerpos()) if (x.id === id) c = x;
    if (c === null) return false;
    if (d !== null && d.bocaDe(id, salida)) {
      const dx = salida.x - c.x;
      const dz = salida.z - c.z;
      if (dx * dx + dz * dz > 0.01 || Math.abs(salida.y - ALTO_DE_LA_BOCA_SIN_MANO) > 0.01) return true;
    }
    const fx = Math.sin(c.rumbo);
    const fz = -Math.cos(c.rumbo);
    salida.x = c.x + fx * 0.5 + Math.cos(c.rumbo) * 0.16;
    salida.y = 1.38;
    salida.z = c.z + fz * 0.5 + Math.sin(c.rumbo) * 0.16;
    return true;
  };
}

/**
 * REHACE LO QUE PASÓ HASTA EL INSTANTE `t` (ms desde el disparo) sobre el sistema vaciado: la carga, el disparo y el
 * `estalla` de la sala, como los mandarían MANDOS y `escenificar.ts`. Ver «cómo es determinista» en la cabecera.
 */
function rehacer(m: Montaje, fuente: FuenteDeCuerpos): void {
  const a = m.ajustes;
  const s = m.sistema;
  const t = m.instante.t;
  const ahora = T_DISPARO + t;
  s.vaciar();
  s.chispas.reiniciar();
  /* Quien mira es siempre el asiento 1: con `ajeno=1` dispara el 2 (y el fogonazo de pantalla no es suyo). */
  s.rayos.yo = TIRADOR;
  const quien = a.ajeno ? AJENO : TIRADOR;
  const inicio = T_DISPARO - a.cargaMs;
  const n = nivelDeLaCargaDelBanco(a.cargaMs);
  const c = Math.min(1, a.cargaMs / cargaLlenaMs());
  const boca = crearLaBoca(m, fuente);
  const origen: PuntoDelRayo = { x: 0, y: 0, z: 0 };
  boca(quien, origen);
  const f = { x: Math.sin(a.tirador.rumbo), z: -Math.cos(a.tirador.rumbo) };
  /* Donde da: el pecho del Celador (su cara de delante), o a esa distancia. */
  const da = a.blanco ? a.distancia - 0.3 : a.distancia;
  const destino = { x: a.tirador.x + f.x * da, y: 1.3, z: a.tirador.z + f.z * da };
  /* De dónde a dónde va (o iría) el rayo en este instante: lo apunta cada foto de la hoja (`data-mano`, `data-blanco`). */
  m.trazo.origen = origen;
  m.trazo.destino = destino;
  /* Sin rayo (`rayo=0`): la misma escena, las mismas poses y la misma cámara, para medir lo que el rayo pone. */
  if (!a.conRayo) return;
  if (ahora >= inicio && t < 0) {
    s.rayo.empezarCarga(quien, inicio);
    const e = estadoDelRayoApagado();
    e.activo = true;
    e.desdeMs = inicio;
    e.c = Math.min(1, (ahora - inicio) / cargaLlenaMs());
    e.nivel = nivelDeLaCargaDelBanco(ahora - inicio).nivel;
    s.rayo.actualizarCarga(quien, e, ahora);
    return;
  }
  if (t < 0) return;
  /* El de otro con `pasa`: sale dibujado hasta más allá (la estructura), y el `estalla` en el blanco lo recorta. */
  const hasta = a.ajeno && a.pasa > 0 ? { x: destino.x + f.x * a.pasa, y: origen.y, z: destino.z + f.z * a.pasa } : destino;
  const bala = 40;
  s.rayo.soltar({
    quien,
    bala: a.ajeno ? bala : 0,
    origen,
    destino: hasta,
    nivel: n.nivel,
    c,
    area: n.areaMetros,
    dio: a.ajeno ? null : true,
    semilla: a.ajeno ? semillaDelRayo(quien, bala) : semillaDelRayo(quien, Math.round(T_DISPARO)),
    t: T_DISPARO,
  });
  if (t >= a.retraso) s.rayo.estallar({ quien, bala, x: destino.x, y: destino.y, z: destino.z, nivel: n.nivel, area: n.areaMetros, t: T_DISPARO + a.retraso });
}

/**
 * EL CAMPO DE LA CÁMARA en el instante `t` (ms desde el disparo), el del juego (`camara/encuadre.ts`, de MANDOS: aquí
 * se repiten sus cifras, porque el banco no monta la cámara del juego): 70° sin cargar; al cargar, se cierra hacia
 * `10 · (¼ + ¾ · c^1,5)` grados entrando en ≈0,25 s; al soltar vuelve en ≈0,12 s, y el disparo lo cierra 2° más, que
 * vuelven en 150 ms. Es lo que ve quien dispara justo cuando sale el rayo.
 */
const CAMPO_SIN_CARGA = 70;
const entrado = (ms: number): number => 1 - Math.exp(-ms / (250 / 3));
function campoDelBanco(a: AjustesDelBanco, t: number): number {
  if (!a.zoom) return a.campo;
  const quiere = (c: number): number => 0.25 + 0.75 * c * Math.sqrt(c);
  if (t < 0) {
    const e = t + a.cargaMs;
    if (e < 0) return a.campo;
    return a.campo - 10 * quiere(Math.min(1, e / cargaLlenaMs())) * entrado(e);
  }
  const alSoltar = quiere(Math.min(1, a.cargaMs / cargaLlenaMs())) * entrado(a.cargaMs);
  const queda = Math.max(0, 1 - t / 150);
  return a.campo - 10 * alSoltar * Math.exp(-t / (120 / 3)) - 2 * queda * queda;
}

/**
 * EL ENCUADRE DE APUNTAR (la decisión del coordinador para MANDOS y EFECTOS, que MANDOS pone en `camara/`): mientras
 * se carga, la cámara al hombro pasa, con la misma exponencial que el zoom (entrar ≈0,25 s, salir ≈0,12 s), de 3,2 m
 * detrás, 0,7 m a la derecha y 1,75 m de alto a 2,6 m, 1,05 m y 1,55 m: la línea de tiro de la mano al blanco y el
 * blanco quedan LIBRES del cuerpo en la pantalla. Aquí, lo que se ha movido en el instante `t` (0 al hombro, 1 del
 * todo): no depende de la carga (el zoom sí), sólo de cuánto lleva cargando; y el chispazo (sin carga) no se mueve.
 */
const ENCUADRE_DE_APUNTAR = { detras: 2.6, hombro: 1.05, alto: 1.55 } as const;
function encuadreDelBanco(a: AjustesDelBanco, t: number): number {
  if (a.ojoApuntando === null) return 0;
  if (t < 0) {
    const e = t + a.cargaMs;
    return e < 0 ? 0 : entrado(e);
  }
  return entrado(a.cargaMs) * Math.exp(-t / (120 / 3));
}

/** Cuántos fotogramas lleva pintados la página (el DOM lo dice: en Edge sin ventana, el tiempo es virtual). */
const CUADROS = { n: 0 };

/**
 * LO QUE SE MIDE DE UNA FOTO (`medir=1`), en luminancia de pantalla (0-255):
 *
 *   · `canal`: en diez puntos de la recta del rayo (del 20 % al 65 % del camino: ni la mano ni el blanco), lo que MÁS
 *     ha subido la luz respecto de la primera foto de la hoja (la de referencia, antes de cargar) en un palmo alrededor
 *     de la recta (±1,2 m en vertical: el canal es quebrado), y de los diez la mediana. Con la estela a medio enfriar,
 *     el canal está ahí y lo demás (luz, fogonazo) ya se ha ido. (Lo más claro a secas no vale: un coche blanco
 *     detrás del canal ya es claro sin rayo.) En la foto de referencia, 0.
 *   · `abajo`: la media de la mitad de abajo de la foto, sin lo que queda a menos de 40 px del camino del rayo ni a
 *     menos de 80 px del blanco: el suelo, los coches y las fachadas bajas, que alumbra el estallido.
 *   · `arriba`: la media de la franja de arriba (el 22 % de la foto: fachadas altas y cielo, donde no llega el foco,
 *     que cuelga mirando al suelo): lo que sube ahí en el destello es el fogonazo de pantalla.
 *   · `media`: la de toda la foto.
 */
export interface MedidaDeLaFoto {
  readonly t: number;
  readonly canal: number;
  readonly abajo: number;
  readonly arriba: number;
  readonly media: number;
}

/** Los píxeles de la foto de referencia de la hoja (la primera), para `canal`. */
const REFERENCIA: { px: Uint8ClampedArray | null } = { px: null };

function medirLaFoto(t: number, lienzo: HTMLCanvasElement, camara: THREE.Camera, a: AjustesDelBanco): MedidaDeLaFoto {
  const w = lienzo.width;
  const h = lienzo.height;
  const copia = document.createElement('canvas');
  copia.width = w;
  copia.height = h;
  const ctx = copia.getContext('2d', { willReadFrequently: true });
  if (ctx === null) return { t, canal: Number.NaN, abajo: Number.NaN, arriba: Number.NaN, media: Number.NaN };
  ctx.drawImage(lienzo, 0, 0);
  const px = ctx.getImageData(0, 0, w, h).data;
  REFERENCIA.px ??= px;
  const ref = REFERENCIA.px;
  const luzDe = (datos: Uint8ClampedArray, x: number, y: number): number => {
    const i = (y * w + x) * 4;
    return 0.2126 * (datos[i] as number) + 0.7152 * (datos[i + 1] as number) + 0.0722 * (datos[i + 2] as number);
  };
  const luz = (x: number, y: number): number => luzDe(px, x, y);
  const v = new THREE.Vector3();
  const aPantalla = (x: number, y: number, z: number): [number, number] => {
    v.set(x, y, z).project(camara);
    return [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h];
  };
  /* La recta del rayo: de la mano (la de la cuenta de `crearLaBoca`, sin pose) al pecho del blanco. */
  const f = { x: Math.sin(a.tirador.rumbo), z: -Math.cos(a.tirador.rumbo) };
  const o = { x: a.tirador.x + f.x * 0.5 + Math.cos(a.tirador.rumbo) * 0.16, y: 1.38, z: a.tirador.z + f.z * 0.5 + Math.sin(a.tirador.rumbo) * 0.16 };
  const da = a.blanco ? a.distancia - 0.3 : a.distancia;
  const d = { x: a.tirador.x + f.x * da, y: 1.3, z: a.tirador.z + f.z * da };
  const maximos: number[] = [];
  for (let k = 0; k < 10; k++) {
    const q = 0.2 + 0.05 * k;
    const x = o.x + (d.x - o.x) * q;
    const y = o.y + (d.y - o.y) * q;
    const z = o.z + (d.z - o.z) * q;
    const [x0, y0] = aPantalla(x, y - 1.2, z);
    const [x1, y1] = aPantalla(x, y + 1.2, z);
    let max = 0;
    for (let yy = Math.max(0, Math.floor(Math.min(y0, y1))); yy <= Math.min(h - 1, Math.ceil(Math.max(y0, y1))); yy++) {
      for (let xx = Math.max(0, Math.floor(Math.min(x0, x1)) - 3); xx <= Math.min(w - 1, Math.ceil(Math.max(x0, x1)) + 3); xx++) max = Math.max(max, luz(xx, yy) - luzDe(ref, xx, yy));
    }
    maximos.push(max);
  }
  maximos.sort((p, q) => p - q);
  const canal = ((maximos[4] as number) + (maximos[5] as number)) / 2;
  /* Abajo, lejos del camino del rayo y del blanco. */
  const [ax, ay] = aPantalla(o.x, o.y, o.z);
  const [bx, by] = aPantalla(d.x, d.y, d.z);
  const lx = bx - ax;
  const ly = by - ay;
  const l2 = lx * lx + ly * ly || 1;
  let sumaAbajo = 0;
  let nAbajo = 0;
  let sumaArriba = 0;
  let nArriba = 0;
  let suma = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const l = luz(x, y);
      suma += l;
      if (y < h * 0.22) {
        sumaArriba += l;
        nArriba++;
      }
      if (y < h / 2) continue;
      const k = Math.max(0, Math.min(1, ((x - ax) * lx + (y - ay) * ly) / l2));
      const ex = ax + lx * k - x;
      const ey = ay + ly * k - y;
      if (ex * ex + ey * ey < 40 * 40 || (x - bx) * (x - bx) + (y - by) * (y - by) < 80 * 80) continue;
      sumaAbajo += l;
      nAbajo++;
    }
  }
  return { t, canal, abajo: nAbajo > 0 ? sumaAbajo / nAbajo : Number.NaN, arriba: nArriba > 0 ? sumaArriba / nArriba : Number.NaN, media: suma / (w * h) };
}

/** Una foto de la hoja: su instante, el PNG, lo medido y dónde caen en ella la mano y el blanco («x,y» en px). */
interface FotoDelBanco {
  readonly t: number;
  readonly datos: string;
  readonly medida: MedidaDeLaFoto | null;
  readonly mano: string;
  readonly blanco: string;
}

/** Un punto del mundo en la pantalla del lienzo, «x,y» en px (vacío sin punto). */
function enLaPantalla(p: PuntoDelRayo | null, camara: THREE.Camera, lienzo: HTMLCanvasElement): string {
  if (p === null) return '';
  const v = new THREE.Vector3(p.x, p.y, p.z).project(camara);
  return `${(((v.x + 1) / 2) * lienzo.width).toFixed(1)},${(((1 - v.y) / 2) * lienzo.height).toFixed(1)}`;
}

/** Lo que cada fotograma hace el banco: la cámara, los sucesos rehechos y, en la hoja, cuándo toca la foto. */
function Director({ m, fuente, alListo }: { m: Montaje; fuente: FuenteDeCuerpos; alListo: () => boolean }): null {
  const { camera } = useThree();
  const hecho = useRef<number>(Number.NaN);
  useFrame(() => {
    CUADROS.n++;
    const a = m.ajustes;
    const k = encuadreDelBanco(a, m.instante.t);
    const b = a.ojoApuntando ?? a.ojo;
    camera.position.set(a.ojo.x + (b.x - a.ojo.x) * k, a.ojo.y + (b.y - a.ojo.y) * k, a.ojo.z + (b.z - a.ojo.z) * k);
    camera.lookAt(a.mira.x, a.mira.y, a.mira.z);
    camera.updateMatrixWorld();
    const campo = campoDelBanco(a, m.instante.t);
    if (camera instanceof THREE.PerspectiveCamera && camera.fov !== campo) {
      camera.fov = campo;
      camera.updateProjectionMatrix();
    }
    if (!alListo()) return;
    if (hecho.current !== m.instante.t) {
      rehacer(m, fuente);
      hecho.current = m.instante.t;
    }
  }, -2);
  return null;
}

/**
 * EL MOTOR DE LAS FOTOS. Edge sin ventana, con el tiempo virtual, apenas pide fotogramas (ocho en noventa segundos
 * virtuales: lo midió `data-cuadros`), así que el banco los pinta él, con `advance` de r3f y un temporizador (los
 * temporizadores sí corren en el tiempo virtual). Sin hoja: hasta que todo está listo y seis fotogramas más, y se
 * para (la foto de Edge es el último). Con hoja: cada instante cinco fotogramas (se asientan las luces, la ventana
 * de la ciudad y las poses) y del quinto, ya pasado el posproceso, se copia el lienzo a un `<img>`.
 */
function Motor({ m, alListo, alHecha }: { m: Montaje; alListo: () => boolean; alHecha: (fotos: readonly FotoDelBanco[]) => void }): null {
  const avanzar = useThree((s) => s.advance);
  const gl = useThree((s) => s.gl);
  const camara = useThree((s) => s.camera);
  const listo = useRef(alListo);
  listo.current = alListo;
  const hecha = useRef(alHecha);
  hecha.current = alHecha;
  useEffect(() => {
    const hoja = m.ajustes.hoja;
    let vivo = true;
    let k = 0;
    let cuenta = 0;
    const fotos: FotoDelBanco[] = [];
    const paso = (): void => {
      if (!vivo) return;
      if (!listo.current()) {
        avanzar(performance.now());
        setTimeout(paso, 20);
        return;
      }
      if (hoja === null) {
        avanzar(performance.now());
        if (++cuenta < 6) setTimeout(paso, 20);
        return;
      }
      m.instante.t = hoja[k] as number;
      avanzar(performance.now());
      if (++cuenta >= 5) {
        fotos.push({
          t: m.instante.t,
          mano: enLaPantalla(m.trazo.origen, camara, gl.domElement),
          blanco: enLaPantalla(m.trazo.destino, camara, gl.domElement),
          datos: gl.domElement.toDataURL('image/png'),
          medida: m.ajustes.medir ? medirLaFoto(m.instante.t, gl.domElement, camara, m.ajustes) : null,
        });
        cuenta = 0;
        k++;
        if (k >= hoja.length) {
          hecha.current(fotos);
          return;
        }
      }
      setTimeout(paso, 5);
    };
    const id = setTimeout(paso, 50);
    return () => {
      vivo = false;
      clearTimeout(id);
    };
  }, [m, avanzar, gl, camara]);
  return null;
}

/**
 * «Listo»: la ciudad construida y los cuerpos pintados (con esqueleto o, de lejos, en el rebaño), y veinte llamadas
 * más por si acaso. Si los cuerpos no llegan en 600 llamadas (unos 10 s), se sigue sin ellos: el rayo es lo que se mira.
 */
function usarLoListo(ciudad: CiudadAbiertaConstruida | null, m: Montaje, cuerpos: number): () => boolean {
  const desde = useRef(0);
  const esperando = useRef(0);
  return () => {
    if (ciudad === null || ciudad.ventana.ocupada) return false;
    const d = m.director.actual;
    if (d === null) return false;
    esperando.current++;
    if (d.medida.conEsqueleto + d.medida.enRebano < cuerpos && esperando.current < 600) return false;
    desde.current++;
    return desde.current > 20;
  };
}

function ElBanco(): JSX.Element {
  const ajustes = useMemo(leer, []);
  const [ciudad, setCiudad] = useState<CiudadAbiertaConstruida | null>(null);
  const [fotos, setFotos] = useState<readonly FotoDelBanco[] | null>(null);
  const m = useMemo<Montaje>(
    () => ({
      ajustes,
      sistema: crearSistemaDeEfectos(crearRelojDePresentacion(), T_DISPARO - 120_000),
      instante: { t: ajustes.hoja?.[0] ?? ajustes.t },
      director: { actual: null },
      trazo: { origen: null, destino: null },
    }),
    [ajustes],
  );
  const fuente = useMemo(() => crearLaFuente(m), [m]);
  useEffect(() => {
    m.sistema.localizar = (quien, salida) => {
      for (const c of fuente.cuerpos()) {
        if (c.id !== quien) continue;
        salida.x = c.x;
        salida.y = 0;
        salida.z = c.z;
        return true;
      }
      return false;
    };
    m.sistema.boca = crearLaBoca(m, fuente);
  }, [m, fuente]);
  useLayoutEffect(() => {
    const antes = fijarElPasoDeLasLuces(PASO_QUE_ASIENTA_LAS_LUCES);
    return () => {
      fijarElPasoDeLasLuces(antes);
    };
  }, []);
  const listo = usarLoListo(ciudad, m, ajustes.blanco ? 2 : 1);
  const [listoVisto, setListoVisto] = useState(false);
  const [cuadros, setCuadros] = useState(0);
  const [cuerpos, setCuerpos] = useState('');
  useEffect(() => {
    const id = setInterval(() => {
      setListoVisto(listo());
      setCuadros(CUADROS.n);
      const d = m.director.actual;
      setCuerpos(d === null ? 'sin director' : `${String(d.medida.conEsqueleto)} con esqueleto, ${String(d.medida.enRebano)} en rebaño, ${String(d.medida.porHornear)} por hornear${d.medida.errores.length > 0 ? `, errores: ${d.medida.errores.join(' | ')}` : ''}`);
    }, 250);
    return () => clearInterval(id);
  }, [listo]);
  const arbol = usarElArbol();
  const reloj = useMemo(() => (): number => T_DISPARO + m.instante.t, [m]);
  const presentado = useMemo(() => (): number => T_DISPARO + m.instante.t, [m]);
  const adorno = useMemo(() => (): number => 55, []);
  const hoja = ajustes.hoja !== null;
  const marca = (
    <div
      id="banco-arbol"
      hidden
      data-arbol={arbol ?? ''}
      data-nivel={ajustes.nivel}
      data-error={ajustes.errores.join(' · ')}
      data-listo={listoVisto ? '1' : '0'}
      data-hecha={fotos !== null ? '1' : '0'}
      data-cuadros={cuadros}
      data-cuerpos={cuerpos}
    />
  );
  if (ajustes.errores.length > 0) {
    return (
      <div style={{ color: '#f88', font: '14px Consolas, monospace', padding: 16 }}>
        {marca}
        El banco no monta nada: {ajustes.errores.join(' · ')}
      </div>
    );
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#050807' }}>
      {marca}
      <div style={hoja ? { width: ajustes.ancho, height: ajustes.alto, position: 'absolute', left: 0, top: 0 } : { position: 'absolute', inset: 0 }}>
        <Canvas
          dpr={1}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
          camera={{ fov: 70, near: 0.1, far: 900, position: [ajustes.ojo.x, ajustes.ojo.y, ajustes.ojo.z] }}
          onCreated={({ gl }) => {
            gl.toneMappingExposure = 1.1;
          }}
        >
          <LaCiudadDeNoche codigo={ajustes.codigo} noche={ajustes.noche} nivel={ajustes.nivel} traza={ajustes.traza} reloj={adorno} montarYa={{ x: ajustes.tirador.x, z: ajustes.tirador.z }} lluvia={ajustes.lluvia} alConstruirLaAbierta={setCiudad} />
          <EfectosDelQuiebro sistema={m.sistema} nivel={ajustes.nivel} reloj={reloj} />
          <CuerposDelQuiebro
            fuente={fuente}
            nivel={ajustes.nivel}
            barrio={null}
            presentado={presentado}
            alDirector={(d) => {
              m.director.actual = d;
            }}
          />
          <Director m={m} fuente={fuente} alListo={listo} />
          <Posproceso nivel={ajustes.nivel} sistema={m.sistema} />
          <Motor m={m} alListo={listo} alHecha={setFotos} />
        </Canvas>
      </div>
      {fotos !== null ? (
        <div id="fotos" hidden>
          {fotos.map((f, i) => (
            <img key={f.t} id={`foto-${String(i)}`} data-t={f.t} data-mano={f.mano} data-blanco={f.blanco} alt={`t=${String(f.t)}`} src={f.datos} />
          ))}
        </div>
      ) : null}
      {fotos !== null && ajustes.medir ? (
        <pre id="medidas-del-rayo" hidden>
          {JSON.stringify(fotos.map((f) => f.medida))}
        </pre>
      ) : null}
      {ajustes.panel ? (
        <div style={{ position: 'absolute', right: 8, bottom: 8, color: '#cfe', font: '12px ui-monospace, Consolas, monospace', background: 'rgba(0,0,0,0.55)', padding: '4px 8px', borderRadius: 4 }}>
          N{ajustes.nivel} · carga {Math.round(ajustes.cargaMs)} ms · t {ajustes.hoja === null ? ajustes.t : 'hoja'} ms {ajustes.ajeno ? '· ajeno' : ''} · {listoVisto ? 'listo' : 'cargando…'}
        </div>
      ) : null}
    </div>
  );
}

/** De qué árbol sale este banco (la misma cuenta que el de la ciudad abierta: el `/@fs/` con que se sirve `shared/`). */
function usarElArbol(): string | null {
  const [arbol, setArbol] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    const env = import.meta.env as { readonly DEV?: boolean } | undefined;
    if (env?.DEV !== true) {
      setArbol('?');
      return;
    }
    fetch(import.meta.url)
      .then((r) => r.text())
      .then((texto) => {
        const x = /\/@fs\/([^"'\s]+?)\/shared\//.exec(texto);
        if (vivo) setArbol(x?.[1] ?? '?');
      })
      .catch(() => {
        if (vivo) setArbol('?');
      });
    return () => {
      vivo = false;
    };
  }, []);
  return arbol;
}

/* THREE se importa para que el banco comparta la copia de three del juego (y no otra, ver la memoria de la casa). */
void THREE;

const raiz = document.getElementById('raiz') as HTMLElement & { __raizDelBanco?: ReturnType<typeof createRoot> };
raiz.__raizDelBanco ??= createRoot(raiz);
raiz.__raizDelBanco.render(<ElBanco />);
