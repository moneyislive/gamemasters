/**
 * EL COMPROBADOR DE LA CIUDAD DEL QUIEBRO: `npx tsx scripts/verificar-quiebro-ciudad.ts`.
 *
 * ═══ QUÉ DEMUESTRA ═══
 *
 *   1. LA CIUDAD SE CONSTRUYE para 50 barrios de verdad (`barrioDeLaNoche`) en los cuatro niveles, sin
 *      lanzar y sin un solo NaN ni infinito en ningún atributo de ninguna geometría.
 *   2. CABE: lo que MIDE cada pieza (triángulos × instancias, una llamada por malla) cabe en el renglón
 *      que declara `presupuesto.ts`, y la suma —con la atmósfera y las pasadas de sombra— cabe en el
 *      50 % de los topes del juego (N0 150k/60 … N3 1,5M/250). Y lo declarado cabe en la cuota.
 *   3. LO PINTADO ES LA ESTRUCTURA, mirado en la GEOMETRÍA y no en las listas: se toman los triángulos
 *      de lo que estorba (fachadas, mobiliario, coches, cristal, luces) que caen en la franja de andar
 *      (de 0,2 a 1,9 m) dentro del barrio, y
 *        · ninguno queda fuera de las cajas de la estructura (nada pintado que estorbe sin chocar), y
 *        · toda caja tiene algo pintado: de 12 rayos que la buscan desde fuera (cuatro lados, tres
 *          alturas), alguno toca un triángulo dentro de ella (ninguna caja invisible).
 *   4. ES DETERMINISTA: el mismo barrio da la misma geometría dos veces (una huella de las posiciones).
 *   5. EL PARCHEO ENCUENTRA SUS TROZOS en los sombreadores de three r185: se aplica cada
 *      `onBeforeCompile` de verdad sobre el texto de `ShaderLib` y no se apunta ningún fallo.
 *   6. LA CIUDAD ABIERTA de 540 m (`docs/quiebro/CIUDAD-ABIERTA.md` §6.4), en sus 32 trazas × 25 cámaras
 *      × 4 niveles: la ventana cabe en el 50 %, lo pintado coincide celda a celda con las cajas, ningún
 *      trozo pasa su tope y las llamadas no cambian al cruzarla (ver su bloque, al final).
 *   7. EL JUEGO PINTA LO QUE CHOCA EN LA SALA: la ciudad que pinta el cliente (`ciudadParaPintar`, la que
 *      monta `LaCiudadDeNoche` con la traza, los Fallos y las «Plazas despejadas» de la vista) tiene las
 *      mismas cajas, en el mismo orden, que el mundo de la Liza de esa noche (`mundoDeLaLizaDeLaCiudad`).
 *   8. LA PRIMERA LUZ DE LA NOCHE es la de su ciudad desde el primer fotograma (nunca la de la noche
 *      anterior, ya liberada) y la plaza de la Bajada tiene luz antes de acabar la caída.
 *   9. EL RELEVO Y EL COSTE DE CADA FOTOGRAMA (revisión de rendimiento del 24-sep): la ciudad de otro nivel
 *      o de otra noche se prepara detrás, callada (otro nivel, sobre la misma base y sin prisa; otra noche,
 *      con su base a pasos), no se enseña hasta estar compilada, hereda la luz si tiene su téxel, y la vieja
 *      se suelta en el fotograma siguiente al relevo; la luz nace sin subir sus ceros; los reflejos ven lo
 *      mismo que un rayo de fuerza bruta; la ciudad quieta asigna menos de 1 KiB por fotograma; y la cortina
 *      del borde se apaga en el último metro (revisión «jugar de verdad»: tapaba la pantalla).
 *  10. LO QUE EL DETALLE DE LA CIUDAD VA A CAMBIAR, VIGILADO ANTES (plan del detalle, O1-VERIFICACION; los
 *      jueces viven en `quiebro-ciudad/comun.ts`, y cada uno tiene aquí su VACUNA, que tiene que salir roja):
 *        · (1) la franja y las cajas pintadas en CADA nivel y CADA grado de §3.1 (N0 {1}, N1 {1} con y sin el
 *          relieve del centro, N2 {2, 3}, N3 {2, 3}), con la celda construida con su grado y no la guardada que
 *          hubiera, con los neones y con las capas (lo que cada una declara de su estorbo, en su geometría);
 *        · (2) el sentido de las caras en las familias con material de una sola cara: el CONJUNTO de las caras
 *          al revés de hoy en la traza 0 (`quiebro-ciudad/caras-al-reves-de-hoy.json`), y ni una nueva; y en las
 *          demás trazas, ninguna sin la FIRMA de una de las de hoy (familia, normal y altura);
 *        · (3) la paridad GLSL ↔ JS de las reglas gemelas (`encendida`, `queTienda`, `colorDeLuz`, `huecoQ` y la
 *          tienda de 6 m), en sus literales; y la tienda contra el JS DEL JUEGO: los escaparates que pone
 *          `escaparatesDe` y el reparto de los toldos de `voladizos.ts` (en la GPU la mira `verify:quiebro-gl`);
 *        · (4) la Grafía es lo último del texto final de la fachada y de lo lejano, en N0-N3;
 *        · (5) la memoria: la de la GPU contra el tope de §7.3 y la de JS (las celdas guardadas y los moldes)
 *          contra la de hoy × 1,8;
 *        · (6) el relevo sube toda textura que referencia un material de la ciudad;
 *        · (11) las fuentes de luz de una celda no dependen de su grado;
 *        · (12) ningún escritor de pieza escribe más que el trozo entre dos pasos, en ningún grado ni nivel;
 *        · (13) las capas cuentan: cada una pinta las llamadas que declara;
 *      y las comprobaciones de cada paquete (`quiebro-ciudad/<paquete>.ts`), con su mínimo de inspeccionados.
 *
 * ═══ POR QUÉ LA GEOMETRÍA Y NO LAS HUELLAS QUE DEVUELVEN LOS CONSTRUCTORES ═══
 *
 * Los constructores apuntan en `estorba` las cajas del barrio que pintan; comparar eso con la
 * estructura sería comparar la lista consigo misma. Aquí se mira lo que de verdad se dibuja: si un
 * banco crece un respaldo fuera de su caja o un coche se pinta girado, sale en los triángulos.
 *
 * Cada comprobación se vio en ROJO rompiendo a propósito una copia (ver el informe del frente).
 */
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { arnes } from '../../server/scripts/arnes';
import { planoDelBarrio } from '../src/quiebro/ciudad/plano';
import { construirLaCiudad } from '../src/quiebro/ciudad/construir';
import type { CiudadConstruida } from '../src/quiebro/ciudad/construir';
import { atributoRoto } from '../src/quiebro/ciudad/geometria';
import { RENGLONES_DE_LA_CIUDAD_ABIERTA, presupuestoDeLaCiudad, sumaDeLoDeclarado, topeDeLaCiudad } from '../src/quiebro/ciudad/presupuesto';
import { LOSETAS_PARA_ENSENARSE, ciudadParaPintar, construirLaBase, construirLaCiudadAbierta } from '../src/quiebro/ciudad/abierta';
import type { CiudadAbiertaConstruida, OpcionesDeLaCiudadAbierta } from '../src/quiebro/ciudad/abierta';
import { BYTES_DE_SUBIDA_POR_FOTOGRAMA, RelevoDeLaCiudad, piezasPorSubir } from '../src/quiebro/ciudad/relevo';
import type { Compilador } from '../src/quiebro/calidad/precompilar';
import { materialesGuardados } from '../src/quiebro/calidad/precompilar';
import { UNIFORMES_DE_LA_VENTANA } from '../src/quiebro/ciudad/ventana';
import type { FuenteDeReflejo } from '../src/quiebro/ciudad/reflejos';
import { RejillaDeHuellas } from '../src/quiebro/ciudad/reflejos';
import { GLSL_DE_LA_CORTINA, brilloDeLaCortina } from '../src/quiebro/ciudad/borde';
import { ESCRITORES_DE_LA_CELDA, FAMILIAS, fuentesDeLaCelda } from '../src/quiebro/ciudad/celdas';
import type { EscritorDeLaCelda, Familia } from '../src/quiebro/ciudad/celdas';
import { CELDAS_GUARDADAS, FRANJA_DEL_FUNDIDO, PRESUPUESTO_DE_LA_VENTANA, rectanguloDeLaVentana } from '../src/quiebro/ciudad/ventana';
import type { SitioDeLaVentana } from '../src/quiebro/ciudad/ventana';
import { GRADOS_DEL_NIVEL, relieveDeHoy } from '../src/quiebro/ciudad/grados';
import type { CapaDeLaCiudad, FabricaDeCapa } from '../src/quiebro/ciudad/capas';
import type { FuentesDeLuz } from '../src/quiebro/ciudad/fuentes';
import { materialDeFachada } from '../src/quiebro/ciudad/fachadas';
import { materialDeLoLejano } from '../src/quiebro/ciudad/lejos';
import { GLSL_COMUN_DE_LA_FACHADA } from '../src/quiebro/ciudad/fachada/glsl-comun';
import { TRAMO_DEL_HUECO } from '../src/quiebro/ciudad/fachada/glsl-hueco';
import { TRAMO_DEL_BAJO } from '../src/quiebro/ciudad/fachada/glsl-bajo';
import { HUECO_DEL_ESTILO } from '../src/quiebro/ciudad/fachada/tipos-de-cara';
import type { CaraDelVolumen, ObraDeLaFachada, VentanaEncendida } from '../src/quiebro/ciudad/fachada/tipos-de-cara';
import { escaparatesDe } from '../src/quiebro/ciudad/fachada/bajo';
import { LARGO_DE_UNA_TIENDA, NUMERO_DEL_ESTILO, queTienda } from '../src/quiebro/ciudad/hash';
import type { EstiloDeFachada, GradoDeLaCelda } from '../src/quiebro/ciudad/tipos';
import type { Resultado, Tri } from './quiebro-ciudad/comun';
import {
  FRANJA,
  MARCA_DEL_FIN_DE_LA_GRAFIA,
  RejillaDeTriangulos,
  TROZO_POR_NIVEL,
  bytesDeLaCelda,
  bytesEnLaGpu,
  cajaPintada,
  carasAlReves,
  claveDeLaCara,
  contextoDeLaCiudad,
  dentroDeAlguna,
  diferenciasDeLasFuentes,
  estorboDeLaCapa,
  firmaDeLaCara,
  firmaDeLaClave,
  franjaDe,
  juzgarElRelevo,
  juzgarLaFranja,
  juzgarLaGrafia,
  juzgarLasLlamadas,
  juzgarLasTiendas,
  juzgarLosToldos,
  obraAPasos,
  paridadDeLasGemelas,
  pasosDeLaCelda,
  recortarALaFranja,
  textoDelFragmento,
  tiendaDelGlsl,
} from './quiebro-ciudad/comun';
import type { TextosDeLaParidad } from './quiebro-ciudad/comun';
import * as deParedes from './quiebro-ciudad/paredes';
import * as deSuelo from './quiebro-ciudad/suelo';
import * as deMobiliario from './quiebro-ciudad/mobiliario';
import * as dePiezas from './quiebro-ciudad/piezas';
import * as deVehiculos from './quiebro-ciudad/vehiculos';
import * as deSilueta from './quiebro-ciudad/silueta';
import * as deBajos from './quiebro-ciudad/bajos';
import * as deParidad from './quiebro-ciudad/paridad';
import * as deLejano from './quiebro-ciudad/lejano';
import * as deNeones from './quiebro-ciudad/neones';
import * as deLuces from './quiebro-ciudad/luces';
import * as deCercanos from './quiebro-ciudad/cercanos';
import * as deSemaforos from './quiebro-ciudad/semaforos';
import * as deRemates from './quiebro-ciudad/remates';

/**
 * LAS COMPROBACIONES DE CADA PAQUETE (plan del detalle, §5.2.8): el fichero de cada dueño, importado aquí. Un paquete
 * que no esté en esta lista no se corre: por eso se comprueba contra la lista del plan.
 */
const PAQUETES_DE_LA_CIUDAD: Readonly<Record<string, { readonly comprobar?: unknown }>> = {
  paredes: deParedes,
  suelo: deSuelo,
  mobiliario: deMobiliario,
  piezas: dePiezas,
  vehiculos: deVehiculos,
  silueta: deSilueta,
  bajos: deBajos,
  paridad: deParidad,
  lejano: deLejano,
  neones: deNeones,
  luces: deLuces,
  cercanos: deCercanos,
  semaforos: deSemaforos,
  remates: deRemates,
};
/** Los dueños que nombra el plan (§5.2.8). */
const PAQUETES_DEL_PLAN = ['paredes', 'suelo', 'mobiliario', 'piezas', 'vehiculos', 'silueta', 'bajos', 'paridad', 'lejano', 'neones', 'luces', 'cercanos', 'semaforos', 'remates'] as const;
import { CELDA_MAXIMA, CELDA_MINIMA, PLAZAS_POR_CIUDAD, ciudadDeLaMesa, ciudadDeLaNoche, mundoDeLaLizaDeLaCiudad, triosDeFallos } from '../../shared/arcade/juegos/quiebro-ciudad';
import type { FuenteHorneada } from '../src/quiebro/ciudad/luz-de-la-calle';
import { hornearLaLuz } from '../src/quiebro/ciudad/luz-de-la-calle';
import { UNIFORMES_DE_LA_CIUDAD } from '../src/quiebro/ciudad/retoques';
import type { CajaXZ, NivelDeLaCiudad, PlanoDeLaCiudad } from '../src/quiebro/ciudad/tipos';
import { NIVELES_DE_LA_CIUDAD } from '../src/quiebro/ciudad/tipos';
import { FALLOS_DEL_PARCHEO } from '../src/quiebro/atmosfera/parcheo';
import { materialesDe } from '../src/quiebro/atmosfera/parcheo';
import { luzDeLaHora, luzQueManda } from '../src/quiebro/atmosfera/luz-del-barrio';
import { nieblaEn } from '../src/quiebro/atmosfera/niebla';

const { comprobar, paso, nota, terminar } = arnes();

const SEMILLAS = 50;
/* La franja de andar (`FRANJA`) y la holgura con que se compara con las cajas (`HOLGURA`) son las de `quiebro-ciudad/comun.ts`. */
/** Lo que se considera «lo que estorba» al mirar la geometría. */
const MALLAS_QUE_ESTORBAN = new Set(['quiebro-fachadas', 'quiebro-mobiliario', 'quiebro-cristal', 'quiebro-emisivo']);

/** Los barrios que se miran: códigos distintos y noches distintas. */
function barrios(): { codigo: string; noche: number }[] {
  const salida: { codigo: string; noche: number }[] = [];
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (let i = 0; i < SEMILLAS; i++) {
    const codigo = [0, 1, 2, 3, 4].map((k) => letras[(i * 7 + k * 5 + k * k) % letras.length]).join('');
    salida.push({ codigo, noche: 1 + (i % 10) });
  }
  return salida;
}

/* ─────────────────────────── La geometría que estorba ─────────────────────────── */

/** Los triángulos (en mundo) de las mallas que estorban, que tocan la franja de andar. */
function triangulosQueEstorban(ciudad: CiudadConstruida): Tri[] {
  const salida: Tri[] = [];
  ciudad.grupo.updateMatrixWorld(true);
  ciudad.grupo.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !MALLAS_QUE_ESTORBAN.has(o.name)) return;
    const g = o.geometry as THREE.BufferGeometry;
    const pos = g.getAttribute('position');
    const idx = g.getIndex();
    const n = idx === null ? pos.count : idx.count;
    for (let i = 0; i < n; i += 3) {
      const v = [0, 1, 2].map((k) => {
        const j = idx === null ? i + k : idx.getX(i + k);
        return new THREE.Vector3(pos.getX(j), pos.getY(j), pos.getZ(j)).applyMatrix4(o.matrixWorld);
      }) as [THREE.Vector3, THREE.Vector3, THREE.Vector3];
      const y0 = Math.min(v[0].y, v[1].y, v[2].y);
      const y1 = Math.max(v[0].y, v[1].y, v[2].y);
      if (y1 < FRANJA[0] || y0 > FRANJA[1]) continue;
      salida.push({ a: v[0], b: v[1], c: v[2] });
    }
  });
  return salida;
}

/* `recortarALaFranja`, `dentroDeAlguna`, `RejillaDeTriangulos` y `cajaPintada` son los de `quiebro-ciudad/comun.ts`. */

/** ¿Está un punto dentro del barrio jugable (sin contar su borde)? */
function enElBarrio(x: number, z: number, limite: CajaXZ): boolean {
  return x > limite.x0 + 0.01 && x < limite.x1 - 0.01 && z > limite.z0 + 0.01 && z < limite.z1 - 0.01;
}

/** Lo pintado en la franja que queda fuera de toda caja, dentro del barrio. Devuelve ejemplos. */
function pintadoFueraDeLasCajas(tris: readonly Tri[], plano: PlanoDeLaCiudad): string[] {
  const malos: string[] = [];
  for (const t of tris) {
    const poli = recortarALaFranja(t);
    if (poli.length < 3) continue;
    const cx = poli.reduce((s, p) => s + p.x, 0) / poli.length;
    const cz = poli.reduce((s, p) => s + p.z, 0) / poli.length;
    const puntos = [...poli.map((p) => [p.x, p.z] as const), [cx, cz] as const];
    for (const [x, z] of puntos) {
      if (!enElBarrio(x, z, plano.limite)) continue;
      if (!dentroDeAlguna(x, z, plano.estructura)) {
        malos.push(`(${x.toFixed(2)}, ${z.toFixed(2)})`);
        break;
      }
    }
    if (malos.length >= 5) break;
  }
  return malos;
}

/* ─────────────────────────── La huella de una geometría ─────────────────────────── */

function huellaDeLasPosiciones(ciudad: CiudadConstruida): number {
  let h = 2166136261;
  ciudad.grupo.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const pos = (o.geometry as THREE.BufferGeometry).getAttribute('position');
    const arr = pos.array as ArrayLike<number>;
    for (let i = 0; i < arr.length; i += 7) {
      h ^= Math.round((arr[i] as number) * 1000) | 0;
      h = Math.imul(h, 16777619);
    }
  });
  return h >>> 0;
}

/* ═══════════════════════════════ LAS COMPROBACIONES ═══════════════════════════════ */

paso('lo declarado cabe en la cuota de cada nivel');
for (const n of NIVELES_DE_LA_CIUDAD) {
  const d = sumaDeLoDeclarado(n);
  const t = topeDeLaCiudad(n);
  comprobar(`N${String(n)}: lo declarado (${String(d.triangulos)} tri, ${String(d.llamadas)} llamadas) cabe en ${String(t.triangulos)}/${String(t.llamadas)}`, d.triangulos <= t.triangulos && d.llamadas <= t.llamadas, d);
}

paso(`${String(SEMILLAS)} barrios × 4 niveles: se construyen, sin NaN, y caben`);
const lista = barrios();
let construidas = 0;
const peor: Record<NivelDeLaCiudad, { triangulos: number; llamadas: number }> = {
  0: { triangulos: 0, llamadas: 0 },
  1: { triangulos: 0, llamadas: 0 },
  2: { triangulos: 0, llamadas: 0 },
  3: { triangulos: 0, llamadas: 0 },
};
const fallosDeConstruir: string[] = [];
const conNaN: string[] = [];
const noCaben: string[] = [];
const fueraDeCaja: string[] = [];
const cajasSinPintar: string[] = [];
let cajasMiradas = 0;
let triangulosMirados = 0;
const inicio = performance.now();
for (const { codigo, noche } of lista) {
  for (const n of NIVELES_DE_LA_CIUDAD) {
    let ciudad: CiudadConstruida;
    let plano: PlanoDeLaCiudad;
    try {
      plano = planoDelBarrio(codigo, noche);
      ciudad = construirLaCiudad(plano, n);
    } catch (e) {
      fallosDeConstruir.push(`${codigo}#${String(noche)} N${String(n)}: ${String(e)}`);
      continue;
    }
    construidas++;
    ciudad.grupo.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const roto = atributoRoto(o.geometry as THREE.BufferGeometry);
      if (roto !== null) conNaN.push(`${codigo}#${String(noche)} N${String(n)} ${o.name}.${roto}`);
    });
    const p = presupuestoDeLaCiudad(ciudad.piezas, n);
    if (!p.cabe) noCaben.push(`${codigo}#${String(noche)} N${String(n)}: ${String(p.triangulos)} tri, ${String(p.llamadas)} llamadas; ${p.excesos.join('; ')}`);
    peor[n] = { triangulos: Math.max(peor[n].triangulos, p.triangulos), llamadas: Math.max(peor[n].llamadas, p.llamadas) };
    /* La estructura contra lo pintado: en N0 y N3, que son los extremos del adorno. */
    if (n === 0 || n === 3) {
      const tris = triangulosQueEstorban(ciudad);
      triangulosMirados += tris.length;
      for (const m of pintadoFueraDeLasCajas(tris, plano)) fueraDeCaja.push(`${codigo}#${String(noche)} N${String(n)} ${m}`);
      const rejilla = new RejillaDeTriangulos(tris);
      for (const c of plano.estructura) {
        cajasMiradas++;
        if (!cajaPintada(c, rejilla)) cajasSinPintar.push(`${codigo}#${String(noche)} N${String(n)} [${c.x0}, ${c.z0}]-[${c.x1}, ${c.z1}]`);
      }
    }
    ciudad.liberar();
  }
}
nota(`${String(construidas)} ciudades en ${((performance.now() - inicio) / 1000).toFixed(1)} s; ${String(cajasMiradas)} cajas y ${String(triangulosMirados)} triángulos de la franja mirados`);
for (const n of NIVELES_DE_LA_CIUDAD) nota(`peor N${String(n)}: ${String(peor[n].triangulos)} tri, ${String(peor[n].llamadas)} llamadas (cuota ${String(topeDeLaCiudad(n).triangulos)}/${String(topeDeLaCiudad(n).llamadas)})`);
comprobar('todas las ciudades se construyen', fallosDeConstruir.length === 0 && construidas === SEMILLAS * 4, fallosDeConstruir.slice(0, 3));
comprobar('ninguna geometría lleva NaN ni infinitos', conNaN.length === 0, conNaN.slice(0, 5));
comprobar('todas caben en su cuota y cada pieza en su renglón', noCaben.length === 0, noCaben.slice(0, 3));
comprobar('se miraron cajas y triángulos de verdad (el filtro no se ha quedado vacío)', cajasMiradas > SEMILLAS * 2 * 150 && triangulosMirados > SEMILLAS * 2 * 2000, {
  cajasMiradas,
  triangulosMirados,
});
comprobar('nada pintado estorba fuera de las cajas de la estructura', fueraDeCaja.length === 0, fueraDeCaja.slice(0, 5));
comprobar('ninguna caja de la estructura queda sin pintar', cajasSinPintar.length === 0, cajasSinPintar.slice(0, 5));

paso('el mismo barrio da la misma ciudad');
{
  const plano = planoDelBarrio('QUIEB', 3);
  const a = construirLaCiudad(plano, 2);
  const b = construirLaCiudad(planoDelBarrio('QUIEB', 3), 2);
  comprobar('dos construcciones del mismo barrio dan la misma geometría', huellaDeLasPosiciones(a) === huellaDeLasPosiciones(b));
  const c = construirLaCiudad(planoDelBarrio('QUIEB', 4), 2);
  comprobar('y otro barrio da otra (la huella no es ciega)', huellaDeLasPosiciones(a) !== huellaDeLasPosiciones(c));
  for (const x of [a, b, c]) x.liberar();
}

paso('el parcheo encuentra sus trozos en los sombreadores de three');
{
  const ciudad = construirLaCiudad(planoDelBarrio('QUIEB', 1), 3);
  let aplicados = 0;
  const vistos = new Set<THREE.Material>();
  const sinNiebla: string[] = [];
  ciudad.grupo.traverse((o) => {
    for (const m of materialesDe(o)) {
      if (vistos.has(m)) continue;
      vistos.add(m);
      const base =
        m instanceof THREE.ShaderMaterial
          ? { vertexShader: m.vertexShader, fragmentShader: m.fragmentShader }
          : m instanceof THREE.MeshStandardMaterial
            ? THREE.ShaderLib.standard
            : m instanceof THREE.MeshBasicMaterial
              ? THREE.ShaderLib.basic
              : null;
      if (base === null) continue;
      const sombreador = { vertexShader: base.vertexShader, fragmentShader: base.fragmentShader, uniforms: {} } as unknown as Parameters<THREE.Material['onBeforeCompile']>[0];
      m.onBeforeCompile(sombreador, undefined as unknown as THREE.WebGLRenderer);
      aplicados++;
      if (!sombreador.fragmentShader.includes('factorDeNieblaQ')) sinNiebla.push(m.name);
    }
  });
  comprobar('se aplicaron los parcheos de todos los materiales de la ciudad', aplicados >= 12, aplicados);
  comprobar('ningún trozo buscado falta en three r185', FALLOS_DEL_PARCHEO.length === 0, FALLOS_DEL_PARCHEO);
  comprobar('todos los materiales llevan la niebla de altura', sinNiebla.length === 0, sinNiebla);
  ciudad.liberar();
}

paso('la luz del barrio sale de la hora de la noche, igual en todos los aparatos');
{
  comprobar(
    'de la 1:00 a las 2:59 es madrugada; de las 3:00 a las 4:59, alba, más clara cuanto más tarde',
    luzDeLaHora('1:00').luz === 'madrugada' &&
      luzDeLaHora('2:59').luz === 'madrugada' &&
      luzDeLaHora('3:00').luz === 'alba' &&
      luzDeLaHora('4:59').luz === 'alba' &&
      luzDeLaHora('3:00').claridad < luzDeLaHora('4:59').claridad &&
      luzDeLaHora('4:59').claridad <= 1,
  );
  const luces = new Map<string, number>();
  let iguales = true;
  for (let i = 0; i < 60; i++) {
    const codigo = `L${String(i * 7919 + 13)}`;
    const a = luzQueManda(planoDelBarrio(codigo, 1 + (i % 4)).hora, null);
    const b = luzQueManda(planoDelBarrio(codigo, 1 + (i % 4)).hora, null);
    if (a.luz !== b.luz || a.claridad !== b.claridad) iguales = false;
    luces.set(a.luz, (luces.get(a.luz) ?? 0) + 1);
  }
  nota(`en 60 noches: ${String(luces.get('madrugada') ?? 0)} de madrugada y ${String(luces.get('alba') ?? 0)} de alba`);
  comprobar('el mismo barrio da la misma luz, y en 60 noches salen las dos (ninguna por debajo de 15)', iguales && (luces.get('madrugada') ?? 0) >= 15 && (luces.get('alba') ?? 0) >= 15, [...luces]);
  comprobar('forzarla sólo cambia la luz pedida', luzQueManda('1:30', 'alba').luz === 'alba' && luzQueManda('4:10', 'madrugada').luz === 'madrugada' && luzQueManda('4:10', null).luz === 'alba');
}

paso('la niebla de altura no rompe a quien calcula su propia profundidad de niebla');
{
  /* Así eran las chispas y los trazos de los efectos: declaran la niebla de three y escriben
     `vFogDepth` a mano. Con el retoque, su programa no compilaba y no se pintaban nunca. */
  const propio = new THREE.ShaderMaterial({
    vertexShader: `#include <fog_pars_vertex>
void main() {
  #ifdef USE_FOG
  vFogDepth = 1.0;
  #endif
  gl_Position = vec4(0.0);
}`,
    fragmentShader: `#include <fog_pars_fragment>
void main() { gl_FragColor = vec4(1.0); }`,
    fog: true,
  });
  nieblaEn(propio);
  const deFabrica = new THREE.ShaderMaterial({
    vertexShader: `#include <fog_pars_vertex>
void main() {
  vec4 mvPosition = vec4(0.0);
  #include <fog_vertex>
  gl_Position = mvPosition;
}`,
    fragmentShader: `#include <fog_pars_fragment>
void main() { gl_FragColor = vec4(1.0);
#include <fog_fragment>
}`,
    fog: true,
  });
  nieblaEn(deFabrica);
  comprobar(
    'el que escribe su vFogDepth se queda con la niebla de three; el que incluye fog_vertex lleva la de altura',
    propio.userData['sinNieblaDeAltura'] === true && propio.userData['parcheoDelQuiebro'] === undefined && deFabrica.userData['parcheoDelQuiebro'] !== undefined,
  );
}

/* ═══════════════════════════════ LA CIUDAD ABIERTA ═══════════════════════════════ */

/*
 * LA CIUDAD DE 540 m (`docs/quiebro/CIUDAD-ABIERTA.md` §5.7 y §6.4): 32 trazas × 25 cámaras × 4 niveles.
 *
 *   · LA VENTANA CABE: en cada cámara, lo que se pinta (la ventana con lo que tiene dentro, lo lejano, el
 *     suelo, el borde, lo instanciado y la atmósfera) cabe en su renglón del libro de la ciudad abierta y
 *     en el 50 % de los topes; y cada familia cabe en lo que tiene reservado de salida (no crece).
 *   · LO PINTADO ES LA ESTRUCTURA, celda a celda: con TODAS las celdas de la ciudad construidas (y el borde
 *     de glifos), nada pintado en la franja de andar queda fuera de una caja dentro de ±270, y toda caja de
 *     la noche tiene algo pintado dentro.
 *   · NINGÚN TROZO PASA SU TOPE: ni al construir una celda ni al copiarla a la ventana.
 *   · LAS LLAMADAS NO CAMBIAN: en las 25 cámaras y fotograma a fotograma al cruzar la ciudad en escalera a
 *     7 m/s (1.056 m), las mallas que se pintan son las mismas; y ningún fotograma pasa sus topes de
 *     trabajo (triángulos, bytes subidos, téxeles de luz), y la ventana nueva se ve antes de llegar a ella.
 *   · LA LUZ POR LOSETAS es la misma que hornear la ventana de luz de una vez.
 *   · EL BORDE DE GLIFOS está en las tres salidas, cubriendo cada pasillo.
 */

const CODIGO_DE_LA_CIUDAD = 'K7M2P';
const TRAZAS_DE_LA_CIUDAD = 32;
/** Las 25 cámaras: una rejilla de 5 × 5 sobre la ciudad, en serpentina (la de al lado reutiliza celdas). */
const CAMARAS: readonly (readonly [number, number])[] = (() => {
  const v = [-240, -120, 0, 120, 240];
  const salida: [number, number][] = [];
  v.forEach((z, k) => {
    const fila = k % 2 === 0 ? v : [...v].reverse();
    for (const x of fila) salida.push([x, z]);
  });
  return salida;
})();

/** Las mallas que pinta la ciudad abierta ahora (una llamada cada una), sin el tren, que va y viene con su horario. */
function llamadasDeLaCiudad(grupo: THREE.Object3D): string[] {
  const nombres: string[] = [];
  const recorrer = (o: THREE.Object3D): void => {
    if (!o.visible) return;
    if ((o instanceof THREE.Mesh || o instanceof THREE.InstancedMesh) && o.name !== 'coches' && o.name !== 'ventanas') nombres.push(o.name);
    for (const h of o.children) recorrer(h);
  };
  recorrer(grupo);
  return nombres.sort();
}

/**
 * Lo que le queda a quien está en `(x, z)` hasta el canto de la ventana PINTADA (negativo si está fuera). Los
 * cantos que son los de la ciudad no cuentan: más allá de la última celda no hay nada que pintar.
 */
function margenEnLaVentana(s: SitioDeLaVentana, x: number, z: number): number {
  const r = rectanguloDeLaVentana(s);
  const m: number[] = [];
  if (s.i0 > CELDA_MINIMA) m.push(x - r.x0);
  if (s.i1 < CELDA_MAXIMA) m.push(r.x1 - x);
  if (s.j0 > CELDA_MINIMA) m.push(z - r.z0);
  if (s.j1 < CELDA_MAXIMA) m.push(r.z1 - z);
  return Math.min(Infinity, ...m);
}

/** Una cámara de mentira: la ciudad sólo le pregunta dónde está. */
function camaraEn(p: { x: number; z: number }): THREE.Camera {
  return { getWorldPosition: (v: THREE.Vector3) => v.set(p.x, 1.7, p.z) } as unknown as THREE.Camera;
}

/* `franjaDe` (los triángulos de una geometría volcada en la franja de andar) y la rejilla de las cajas son los de `quiebro-ciudad/comun.ts`. */

/*
 * ═══ LAS CELDAS DE CADA NIVEL Y CADA GRADO (plan del detalle, O1-VERIFICACION 1, 2, 5, 11 y 12) ═══
 *
 * Con la ciudad de cada traza y cada nivel ya montada en sus 25 cámaras, se construyen sus 169 celdas OTRA VEZ,
 * una por variante del nivel —cada grado de §3.1 (`GRADOS_DEL_NIVEL`) con el relieve de la celda del centro, y en
 * N1 también sin él, que es como la ventana construye las de fuera del centro (`relieveDeHoy`)—, con el grado
 * EXPLÍCITO y no la guardada que haya: la ventana guarda la que le toca, y así la franja miraba un solo grado.
 * Con cada celda:
 *   · (1) sus triángulos de la franja (las cinco familias, también los neones), para cruzarlos con las cajas;
 *   · (2) sus caras al revés en las familias con material de una sola cara: en la traza 0 contra el conjunto anotado, y en
 *     las demás contra sus firmas (`firmaDeLaCara`);
 *   · (5) sus bytes de JS (las 36 más pesadas de la traza en ese nivel son lo que la ventana puede guardar);
 *   · (11) sus fuentes de luz, contra las de `fuentesDeLaCelda` (grado 1);
 *   · (12) su paso mayor y su cola, contra el trozo del nivel.
 * La franja se mira en TODAS las variantes, también en N1 sin el relieve del centro (así construye la ventana 8 de sus 9
 * celdas en N1): «sin relieve lleva lo mismo y menos» no se da por hecho.
 */

interface VarianteDelNivel {
  readonly grado: GradoDeLaCelda;
  readonly relieve: boolean;
  readonly franja: boolean;
}

/** Las variantes con que la ventana de cada nivel puede construir una celda (ver arriba). */
const VARIANTES: Readonly<Record<NivelDeLaCiudad, readonly VarianteDelNivel[]>> = (() => {
  const v = {} as Record<NivelDeLaCiudad, VarianteDelNivel[]>;
  for (const n of NIVELES_DE_LA_CIUDAD) {
    v[n] = [];
    for (const grado of GRADOS_DEL_NIVEL[n]) {
      v[n].push({ grado, relieve: relieveDeHoy(n, true), franja: true });
      if (relieveDeHoy(n, false) !== relieveDeHoy(n, true)) v[n].push({ grado, relieve: relieveDeHoy(n, false), franja: true });
    }
  }
  return v;
})();

const nombreDeLaVariante = (n: NivelDeLaCiudad, v: VarianteDelNivel): string => `N${String(n)} g${String(v.grado)}${v.relieve ? '' : ' sin relieve'}`;

/** Lo que se cuenta de la franja en cada nivel y grado (1). */
interface CuentaDeLaFranja {
  triangulos: number;
  cajas: number;
  fuera: string[];
  sinPintar: string[];
}
const franjaPorGrado = new Map<string, CuentaDeLaFranja>();

/**
 * Los mínimos de inspeccionados de la franja en CADA nivel y grado, en las 32 trazas. Medido el 25-sep (`70fe237`):
 * 40.733 cajas en cada uno, y de 2,37 M triángulos de la franja (N0) a 6,11 M (N3).
 */
const MINIMO_DE_CAJAS_POR_GRADO = TRAZAS_DE_LA_CIUDAD * 1100;
const MINIMO_DE_TRIANGULOS_POR_GRADO = TRAZAS_DE_LA_CIUDAD * 30_000;

/** Las caras al revés de la traza 0 (2), por clave, y cuántas caras se miraron. */
const carasAlRevesDeHoy = new Set<string>();
const carasAlRevesVistas = new Map<string, string>();
let carasMiradas = 0;
/** Las familias que se miran (las de material de una sola cara) y las que no. */
const familiasDeUnaCara = new Set<Familia>();
const familiasDeDosCaras = new Set<Familia>();

/** Las fuentes (11): celdas comparadas y las que no casan. */
let celdasConFuentes = 0;
const fuentesQueCambian: string[] = [];

/** Los trozos (12): el paso mayor de cada nivel y grado, y quien se pasa. */
const pasoMayorPorGrado = new Map<string, number>();
const pasosQueSePasan: string[] = [];
let pasosMirados = 0;

/** La memoria (5): lo peor de cada nivel, en bytes. */
const memoriaDeJs: Record<NivelDeLaCiudad, { celdas: number; moldes: number }> = { 0: { celdas: 0, moldes: 0 }, 1: { celdas: 0, moldes: 0 }, 2: { celdas: 0, moldes: 0 }, 3: { celdas: 0, moldes: 0 } };
const memoriaDeLaGpu: Record<NivelDeLaCiudad, { total: number; geometrias: number; texturas: number; luz: number; materia: number }> = {
  0: { total: 0, geometrias: 0, texturas: 0, luz: 0, materia: 0 },
  1: { total: 0, geometrias: 0, texturas: 0, luz: 0, materia: 0 },
  2: { total: 0, geometrias: 0, texturas: 0, luz: 0, materia: 0 },
  3: { total: 0, geometrias: 0, texturas: 0, luz: 0, materia: 0 },
};

/** Las capas (1 y 13): lo que cada una declara de su estorbo y de sus llamadas. */
const problemasDeLasCapas: string[] = [];
let verticesDeLasCapas = 0;
const llamadasQueNoCasan: string[] = [];
let capasMiradas = 0;
/** El relevo (6): texturas miradas y las que no se suben. */
const texturasSinSubir: string[] = [];
let texturasMiradas = 0;
const almacenesVistos = new Set<string>();

/** Las caras al revés de hoy, anotadas (ver `quiebro-ciudad/caras-al-reves-de-hoy.json`). */
const CARAS_AL_REVES_ANOTADAS: { readonly traza: number; readonly codigo: string; readonly caras: readonly string[] } = JSON.parse(
  readFileSync(new URL('./quiebro-ciudad/caras-al-reves-de-hoy.json', import.meta.url), 'utf8'),
) as { traza: number; codigo: string; caras: string[] };
const CARAS_ANOTADAS = new Set(CARAS_AL_REVES_ANOTADAS.caras);
/** Las firmas de las caras al revés de hoy (familia, normal y altura: ver `firmaDeLaCara`), para las demás trazas. */
const FIRMAS_ANOTADAS = new Set(CARAS_AL_REVES_ANOTADAS.caras.map(firmaDeLaClave).filter((f): f is string => f !== null));
/** En las demás trazas: caras miradas, al revés, y las que no tienen la firma de ninguna de hoy. */
let carasMiradasFuera = 0;
let carasAlRevesFuera = 0;
let carasConOtraFirma = 0;
const ejemplosConOtraFirma: string[] = [];

/** Los triángulos del borde de glifos que tocan la franja. */
function franjaDelBorde(ciudad: CiudadAbiertaConstruida, tris: Tri[]): void {
  const borde = ciudad.borde.malla.geometry;
  const posB = borde.getAttribute('position');
  const idxB = borde.getIndex();
  if (idxB !== null) franjaDe({ vertices: posB.count, atributos: [], datos: new Map([['position', posB.array as Float32Array]]), indices: Uint32Array.from(idxB.array as ArrayLike<number>) }, tris);
}

/** Las celdas de una traza y un nivel, en cada variante (ver arriba). */
function mirarLasCeldas(traza: number, n: NivelDeLaCiudad, ciudad: CiudadAbiertaConstruida): void {
  const partes = ciudad.partes;
  const cajas = ciudad.fuente.noche.cajas;
  /* Las capas: su estorbo (1) y sus llamadas (13). */
  const trisDeLasCapas: Tri[] = [];
  for (const capa of ciudad.capas) {
    const e = estorboDeLaCapa(capa, cajas);
    trisDeLasCapas.push(...e.tris);
    verticesDeLasCapas += e.mirados;
    for (const p of e.problemas) if (problemasDeLasCapas.length < 6) problemasDeLasCapas.push(`traza ${String(traza)} N${String(n)}: ${p}`);
  }
  const ll = juzgarLasLlamadas(ciudad);
  capasMiradas += ll.capas;
  for (const p of ll.problemas) if (llamadasQueNoCasan.length < 6) llamadasQueNoCasan.push(`traza ${String(traza)} N${String(n)}: ${p}`);
  /* La memoria de la GPU (5), con la ventana de la última cámara montada. */
  const gpu = bytesEnLaGpu(ciudad);
  if (gpu.total > memoriaDeLaGpu[n].total) memoriaDeLaGpu[n] = { ...gpu };
  /* El relevo (6). */
  const r = juzgarElRelevo(ciudad);
  texturasMiradas += r.texturas;
  for (const a of r.deAlmacen) almacenesVistos.add(a);
  for (const p of r.problemas) if (texturasSinSubir.length < 6) texturasSinSubir.push(`traza ${String(traza)} N${String(n)}: ${p}`);
  /* Las familias de una cara (2): las del material con que la ventana las pinta. */
  const ladoDe = (f: Familia): THREE.Side => (ciudad.ventana.mallas[f].malla.material as THREE.Material).side;
  for (const f of FAMILIAS) (ladoDe(f) === THREE.DoubleSide ? familiasDeDosCaras : familiasDeUnaCara).add(f);

  const fuentesDeGrado1 = new Map<number, FuentesDeLuz>();
  const bytesDeLasCeldas: number[] = [];
  let moldesMayor = 0;
  for (const v of VARIANTES[n]) {
    const nombre = nombreDeLaVariante(n, v);
    const tris: Tri[] = v.franja ? [...trisDeLasCapas] : [];
    if (v.franja) franjaDelBorde(ciudad, tris);
    let pesada: { k: number; triangulos: number } = { k: -1, triangulos: -1 };
    for (let k = 0; k < partes.celdas.length; k++) {
      const parte = partes.celdas[k];
      if (parte === undefined) continue;
      const p = pasosDeLaCelda(parte, partes, n, v.grado, v.relieve);
      const celda = p.celda;
      /* (12) los trozos */
      pasosMirados += p.pasos + 1;
      pasoMayorPorGrado.set(nombre, Math.max(pasoMayorPorGrado.get(nombre) ?? 0, p.mayor));
      if (p.mayor > TROZO_POR_NIVEL[n] && pasosQueSePasan.length < 6) {
        const quien = obraAPasos(parte, partes, n, v.grado, v.relieve);
        pasosQueSePasan.push(`traza ${String(traza)} ${nombre} celda ${String(k)}: ${String(p.mayor)} triángulos entre dos pasos (${quien.deQuien}) > ${String(TROZO_POR_NIVEL[n])}`);
      }
      /* (5) la memoria de JS */
      bytesDeLasCeldas.push(bytesDeLaCelda(celda));
      if (celda.triangulos > pesada.triangulos) pesada = { k, triangulos: celda.triangulos };
      /* (11) las fuentes */
      let g1 = fuentesDeGrado1.get(k);
      if (g1 === undefined) {
        g1 = fuentesDeLaCelda(parte, partes, n);
        fuentesDeGrado1.set(k, g1);
      }
      celdasConFuentes++;
      const dif = diferenciasDeLasFuentes(g1, celda.fuentes);
      if (dif.length > 0 && fuentesQueCambian.length < 6) fuentesQueCambian.push(`traza ${String(traza)} ${nombre} celda ${String(k)}: ${dif.slice(0, 2).join('; ')}`);
      /* NaN, (1) la franja y (2) las caras al revés */
      for (const f of FAMILIAS) {
        const g = celda.familias[f];
        for (const [, datos] of g.datos) {
          for (let i = 0; i < datos.length; i++) {
            if (!Number.isFinite(datos[i] as number)) {
              conNaNAbierta.push(`traza ${String(traza)} ${nombre} celda ${String(k)} ${f}`);
              break;
            }
          }
        }
        if (v.franja) franjaDe(g, tris);
        if (traza === CARAS_AL_REVES_ANOTADAS.traza && familiasDeUnaCara.has(f)) {
          const alReves = carasAlReves(g, ladoDe(f));
          carasMiradas += alReves.mirados;
          for (const c of alReves.centros) {
            const clave = claveDeLaCara(k, f, c);
            carasAlRevesDeHoy.add(clave);
            if (!carasAlRevesVistas.has(clave)) carasAlRevesVistas.set(clave, nombre);
          }
        } else if (familiasDeUnaCara.has(f)) {
          /* (2) en las demás trazas: toda cara al revés con la firma de una de las de hoy (ver `firmaDeLaCara`). */
          const alReves = carasAlReves(g, ladoDe(f));
          carasMiradasFuera += alReves.mirados;
          carasAlRevesFuera += alReves.centros.length;
          for (const c of alReves.centros) {
            const firma = firmaDeLaCara(f, c);
            if (FIRMAS_ANOTADAS.has(firma)) continue;
            carasConOtraFirma++;
            if (ejemplosConOtraFirma.length < 5) ejemplosConOtraFirma.push(`traza ${String(traza)} ${nombre} celda ${String(k)}: ${firma} en (${c.centro.map((x) => x.toFixed(2)).join(', ')})`);
          }
        }
      }
    }
    if (pesada.k >= 0) {
      const parte = partes.celdas[pesada.k];
      if (parte !== undefined) moldesMayor = Math.max(moldesMayor, obraAPasos(parte, partes, n, v.grado, v.relieve).moldes);
    }
    if (!v.franja) continue;
    const j = juzgarLaFranja(tris, cajas);
    const cuenta = franjaPorGrado.get(nombre) ?? { triangulos: 0, cajas: 0, fuera: [], sinPintar: [] };
    cuenta.triangulos += j.triangulos;
    cuenta.cajas += j.cajas;
    for (const e of j.ejemplos) if (cuenta.fuera.length < 3) cuenta.fuera.push(`traza ${String(traza)} ${e}`);
    for (const c of j.sinPintar) if (cuenta.sinPintar.length < 3) cuenta.sinPintar.push(`traza ${String(traza)} [${String(c.x0)}, ${String(c.z0)}]-[${String(c.x1)}, ${String(c.z1)}]`);
    franjaPorGrado.set(nombre, cuenta);
  }
  /* Lo que la ventana puede guardar: las 36 celdas más pesadas de la traza en este nivel (de cualquier variante). */
  bytesDeLasCeldas.sort((a, b) => b - a);
  const guardadas = bytesDeLasCeldas.slice(0, CELDAS_GUARDADAS).reduce((s, b) => s + b, 0);
  memoriaDeJs[n] = { celdas: Math.max(memoriaDeJs[n].celdas, guardadas), moldes: Math.max(memoriaDeJs[n].moldes, moldesMayor) };
}

paso('lo declarado de la ciudad abierta cabe en la cuota del 50 %');
for (const n of NIVELES_DE_LA_CIUDAD) {
  const d = sumaDeLoDeclarado(n, RENGLONES_DE_LA_CIUDAD_ABIERTA);
  const t = topeDeLaCiudad(n);
  nota(`N${String(n)}: declarado ${String(d.triangulos)} tri / ${String(d.llamadas)} llamadas de ${String(t.triangulos)} / ${String(t.llamadas)}`);
  comprobar(`N${String(n)}: lo declarado de la ciudad abierta (${String(d.triangulos)} tri, ${String(d.llamadas)} llamadas) cabe en ${String(t.triangulos)}/${String(t.llamadas)}`, d.triangulos <= t.triangulos && d.llamadas <= t.llamadas, d);
}

paso(`la ciudad abierta: ${String(TRAZAS_DE_LA_CIUDAD)} trazas × ${String(CAMARAS.length)} cámaras × 4 niveles`);
const origenes = new Map<string, number>();
const noCabenLasVentanas: string[] = [];
const crecidas: string[] = [];
const trozosQueSePasan: string[] = [];
const llamadasPorNivel = new Map<NivelDeLaCiudad, Set<string>>();
const peorDeLaVentana: Record<NivelDeLaCiudad, Record<string, number>> = { 0: {}, 1: {}, 2: {}, 3: {} };
const peorTotal: Record<NivelDeLaCiudad, { triangulos: number; llamadas: number }> = {
  0: { triangulos: 0, llamadas: 0 },
  1: { triangulos: 0, llamadas: 0 },
  2: { triangulos: 0, llamadas: 0 },
  3: { triangulos: 0, llamadas: 0 },
};
const trozoMayorPorNivel: Record<NivelDeLaCiudad, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
const enUsoPorNivel: Record<NivelDeLaCiudad, Record<string, { vertices: number; indices: number }>> = { 0: {}, 1: {}, 2: {}, 3: {} };
const conNaNAbierta: string[] = [];
let camarasMiradas = 0;
const inicioAbierta = performance.now();
for (let traza = 0; traza < TRAZAS_DE_LA_CIUDAD; traza++) {
  const fuente = ciudadParaPintar(traza, CODIGO_DE_LA_CIUDAD, 1 + (traza % 10));
  origenes.set(fuente.origen, (origenes.get(fuente.origen) ?? 0) + 1);
  for (const n of NIVELES_DE_LA_CIUDAD) {
    const ciudad = construirLaCiudadAbierta(fuente, n, { celdasGuardadas: 400 });
    const llamadas = llamadasPorNivel.get(n) ?? new Set<string>();
    llamadasPorNivel.set(n, llamadas);
    for (const [x, z] of CAMARAS) {
      ciudad.ventana.montarYa(x, z);
      camarasMiradas++;
      const p = presupuestoDeLaCiudad(ciudad.piezas(), n, RENGLONES_DE_LA_CIUDAD_ABIERTA);
      if (!p.cabe && noCabenLasVentanas.length < 6) noCabenLasVentanas.push(`traza ${String(traza)} N${String(n)} (${String(x)}, ${String(z)}): ${String(p.triangulos)} tri, ${String(p.llamadas)} llamadas; ${p.excesos.join('; ')}`);
      if (p.triangulos > peorTotal[n].triangulos) peorTotal[n] = { triangulos: p.triangulos, llamadas: p.llamadas };
      for (const pieza of ciudad.piezas()) peorDeLaVentana[n][pieza.nombre] = Math.max(peorDeLaVentana[n][pieza.nombre] ?? 0, pieza.triangulos);
      llamadas.add(llamadasDeLaCiudad(ciudad.grupo).join(','));
      for (const f of FAMILIAS) {
        const u = ciudad.ventana.mallas[f].enUso;
        const antes = enUsoPorNivel[n][f] ?? { vertices: 0, indices: 0 };
        enUsoPorNivel[n][f] = { vertices: Math.max(antes.vertices, u.vertices), indices: Math.max(antes.indices, u.indices) };
      }
    }
    for (const f of FAMILIAS) if (ciudad.ventana.mallas[f].crecidas > 0) crecidas.push(`traza ${String(traza)} N${String(n)} ${f}`);
    trozoMayorPorNivel[n] = Math.max(trozoMayorPorNivel[n], ciudad.ventana.trozoMayor);
    if (ciudad.ventana.trozoMayor > PRESUPUESTO_DE_LA_VENTANA[n].trozo) trozosQueSePasan.push(`traza ${String(traza)} N${String(n)}: ${String(ciudad.ventana.trozoMayor)} > ${String(PRESUPUESTO_DE_LA_VENTANA[n].trozo)}`);
    /* Las celdas de este nivel en cada grado (y lo demás del detalle): ver `mirarLasCeldas`. */
    mirarLasCeldas(traza, n, ciudad);
    ciudad.liberar();
  }
}
nota(`${String(camarasMiradas)} ventanas en ${((performance.now() - inicioAbierta) / 1000).toFixed(1)} s; ciudades: ${[...origenes].map(([o, c]) => `${String(c)} de ${o === 'traza' ? 'la traza' : 'la SINTÉTICA'}`).join(', ')}`);
for (const n of NIVELES_DE_LA_CIUDAD) {
  const t = topeDeLaCiudad(n);
  nota(`N${String(n)}: peor ${String(peorTotal[n].triangulos)} tri, ${String(peorTotal[n].llamadas)} llamadas (cuota ${String(t.triangulos)}/${String(t.llamadas)}); trozo mayor ${String(trozoMayorPorNivel[n])} (tope ${String(PRESUPUESTO_DE_LA_VENTANA[n].trozo)})`);
  nota(`    ${FAMILIAS.map((f) => `${f} ${String(peorDeLaVentana[n][`ventana · ${f}`] ?? 0)}`).join(' · ')} · lejos ${String(peorDeLaVentana[n]['lejos'] ?? 0)} · tarjetas ${String(peorDeLaVentana[n]['tarjetas de reflejo'] ?? 0)} · halos ${String(peorDeLaVentana[n]['halos'] ?? 0)} · haces ${String(peorDeLaVentana[n]['haces de luz'] ?? 0)}`);
  nota(`    en uso (vértices/índices): ${FAMILIAS.map((f) => `${f} ${String(enUsoPorNivel[n][f]?.vertices ?? 0)}/${String(enUsoPorNivel[n][f]?.indices ?? 0)}`).join(' · ')}`);
}
comprobar('las 32 trazas son las de verdad (`ciudadDeLaMesa` de la columna), no la sintética', (origenes.get('traza') ?? 0) === TRAZAS_DE_LA_CIUDAD, [...origenes]);
comprobar('en todas las cámaras de todas las trazas la ventana y lo demás caben en su renglón y en la cuota', noCabenLasVentanas.length === 0, noCabenLasVentanas);
comprobar('ninguna familia de la ventana tuvo que crecer (cabe en lo reservado de salida)', crecidas.length === 0, crecidas.slice(0, 5));
comprobar('ningún trozo de construir o de copiar pasa su tope', trozosQueSePasan.length === 0, trozosQueSePasan.slice(0, 5));
comprobar(
  'las llamadas son las mismas en todas las cámaras de todas las trazas, en cada nivel',
  NIVELES_DE_LA_CIUDAD.every((n) => (llamadasPorNivel.get(n)?.size ?? 0) === 1),
  NIVELES_DE_LA_CIUDAD.map((n) => [n, llamadasPorNivel.get(n)?.size ?? 0]),
);
comprobar('ninguna celda lleva NaN ni infinitos, en ningún nivel ni grado', conNaNAbierta.length === 0, conNaNAbierta.slice(0, 5));

/* ═══════════════════ LO QUE EL DETALLE VA A CAMBIAR, VIGILADO ANTES (plan del detalle, O1-VERIFICACION) ═══════════════════ */

/** Un contexto para las vacunas y las comprobaciones de los paquetes (la traza 0, la de las fotos). */
const contexto = contextoDeLaCiudad(CODIGO_DE_LA_CIUDAD, TRAZAS_DE_LA_CIUDAD, nota);
const MiB = 1024 * 1024;

/** El tope de la memoria de la GPU de la ciudad, por nivel, en MiB (§7.3 del plan: la columna que vigila VERIFICACION). */
const TOPE_DE_LA_GPU_POR_NIVEL: Readonly<Record<NivelDeLaCiudad, number>> = { 0: 24, 1: 48, 2: 128, 3: 256 };
/**
 * LA MEMORIA DE JS DE HOY, en MiB, medida por este comprobador en la ola 1b (25-sep, `70fe237`): las 36 celdas más
 * pesadas de la peor traza (lo que la ventana puede guardar, con las claves por grado) y los moldes de la celda más
 * pesada. Hasta el cierre, el tope es esto × 1,8 (§7.3); O4-CIERRE lo fija.
 */
const MEMORIA_DE_JS_DE_HOY: Readonly<Record<NivelDeLaCiudad, number>> = { 0: 7.9, 1: 47.4, 2: 57.6, 3: 58.4 };
const CRECIMIENTO_DE_LA_MEMORIA_DE_JS = 1.8;

/**
 * ¿Está en verde un resultado de un paquete? En verde Y con lo mirado en su mínimo, que tiene que ser al menos 1:
 * un filtro sin mínimo, con cero inspeccionados, daría cero fallos y se leería como vigilado.
 */
function resultadoEnVerde(r: Resultado): boolean {
  return r.bien && r.minimo >= 1 && r.inspeccionados >= r.minimo;
}

/** Un escritor de prueba que escribe una caja de pie en `(x, z)` (0,6 m de lado, de 0,2 a 1,5 m) en los grados dados. */
function cajaDePrueba(x: number, z: number, grados: readonly GradoDeLaCelda[]): { readonly nombre: string; readonly escribir: EscritorDeLaCelda } {
  return {
    nombre: 'pieza de prueba',
    *escribir(obra) {
      if (!grados.includes(obra.grado)) return;
      obra.m.mobiliario.caja(x - 0.3, 0.2, z - 0.3, x + 0.3, 1.5, z + 0.3);
      yield;
    },
  };
}

/** Un punto de la franja de una celda que no cae en ninguna caja (en su calle), para poner ahí lo que estorba. */
function puntoLibre(caja: CajaXZ, cajas: readonly CajaXZ[]): [number, number] | null {
  for (let i = 1; i < 12; i++) {
    for (let k = 1; k < 12; k++) {
      const x = caja.x0 + ((caja.x1 - caja.x0) * i) / 12;
      const z = caja.z0 + ((caja.z1 - caja.z0) * k) / 12;
      if (!dentroDeAlguna(x, z, cajas, 1) && Math.abs(x) < 260 && Math.abs(z) < 260) return [x, z];
    }
  }
  return null;
}

/** Una capa de prueba: una malla con los vértices dados, lo que declare de su estorbo y sus renglones. */
function capaDePrueba(
  nombre: string,
  posiciones: readonly number[],
  estorbo: CapaDeLaCiudad['estorbo'],
  renglones: CapaDeLaCiudad['renglones'] = () => [],
  material: THREE.Material = new THREE.MeshBasicMaterial(),
): CapaDeLaCiudad {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...posiciones], 3));
  const malla = new THREE.Mesh(g, material);
  malla.name = nombre;
  malla.frustumCulled = false;
  return { nombre, objeto: malla, renglones, estorbo, soltar: () => g.dispose() };
}

paso('(1) la franja y las cajas pintadas, en cada nivel y cada grado, con los neones y las capas');
{
  for (const n of NIVELES_DE_LA_CIUDAD) {
    for (const v of VARIANTES[n]) {
      if (!v.franja) continue;
      const nombre = nombreDeLaVariante(n, v);
      const c = franjaPorGrado.get(nombre) ?? { triangulos: 0, cajas: 0, fuera: [], sinPintar: [] };
      nota(`${nombre}: ${String(c.triangulos)} triángulos de la franja y ${String(c.cajas)} cajas mirados en ${String(TRAZAS_DE_LA_CIUDAD)} trazas (mínimos ${String(MINIMO_DE_TRIANGULOS_POR_GRADO)} y ${String(MINIMO_DE_CAJAS_POR_GRADO)})`);
      comprobar(`${nombre}: se miraron triángulos y cajas de verdad (el filtro no se ha quedado vacío)`, c.triangulos >= MINIMO_DE_TRIANGULOS_POR_GRADO && c.cajas >= MINIMO_DE_CAJAS_POR_GRADO, c);
      comprobar(`${nombre}: nada pintado estorba fuera de las cajas de la ciudad (celda a celda, dentro de ±270)`, c.fuera.length === 0, c.fuera);
      comprobar(`${nombre}: ninguna caja de la ciudad queda sin pintar (celda a celda, con el borde de glifos)`, c.sinPintar.length === 0, c.sinPintar);
    }
  }
  const grados = NIVELES_DE_LA_CIUDAD.map((n) => `N${String(n)} {${GRADOS_DEL_NIVEL[n].join(', ')}}`).join(', ');
  comprobar(`los grados mirados son los de §3.1: ${grados}`, grados === 'N0 {1}, N1 {1}, N2 {2, 3}, N3 {2, 3}' && franjaPorGrado.size === 7 && franjaPorGrado.has('N1 g1 sin relieve'), [...franjaPorGrado.keys()]);
  nota(`capas: ${String(verticesDeLasCapas)} vértices mirados contra lo que declaran de su estorbo`);
  comprobar('cada capa cumple lo que declara de su estorbo (por encima de 1,9 m, fuera de la ciudad, pegada al muro o en la franja)', problemasDeLasCapas.length === 0 && verticesDeLasCapas > 0, { problemasDeLasCapas, verticesDeLasCapas });

  /* LAS VACUNAS: una pieza que sólo sale en g3 y se sale de su caja; y una capa con un triángulo a 1 m dentro de ±270. */
  const base = contexto.base(0);
  const cajas = base.fuente.noche.cajas;
  const parte = base.partes.celdas.find((p) => p.edificios.length > 0 && Math.abs(p.caja.x0) < 200 && Math.abs(p.caja.z0) < 200);
  const punto = parte === undefined ? null : puntoLibre(parte.caja, cajas);
  let g3 = -1;
  let g2 = -1;
  if (parte !== undefined && punto !== null) {
    const escritores = [...ESCRITORES_DE_LA_CELDA, cajaDePrueba(punto[0], punto[1], [3])];
    for (const grado of [2, 3] as const) {
      const tris: Tri[] = [];
      const volcadas = obraAPasos(parte, base.partes, 3, grado, true, escritores).volcar();
      for (const f of FAMILIAS) franjaDe(volcadas[f], tris);
      const j = juzgarLaFranja(tris, cajas, false);
      if (grado === 3) g3 = j.fuera;
      else g2 = j.fuera;
    }
  }
  comprobar('vacuna: una pieza de prueba que sólo sale en g3, fuera de su caja, sale roja en g3 y no en g2', g3 > 0 && g2 === 0, { g3, g2, punto });
  const fuera = estorboDeLaCapa(capaDePrueba('capa de prueba', [269, 5, 0, 269, 6, 0, 269, 5, 1], 'fuera-de-la-ciudad'), cajas);
  const deVerdadFuera = estorboDeLaCapa(capaDePrueba('capa de prueba', [271, 5, 0, 271, 6, 0, 271, 5, 1], 'fuera-de-la-ciudad'), cajas);
  const encima = estorboDeLaCapa(capaDePrueba('capa de prueba', [0, 1.5, 0, 1, 2.5, 0, 0, 2.5, 1], 'por-encima-de-1,9'), cajas);
  const enLaFranja = (s: Tri[]): void => {
    if (punto !== null) s.push({ a: new THREE.Vector3(punto[0], 0.5, punto[1]), b: new THREE.Vector3(punto[0] + 0.3, 0.5, punto[1]), c: new THREE.Vector3(punto[0], 1.2, punto[1]) });
  };
  const conFuncion = punto === null ? null : estorboDeLaCapa(capaDePrueba('capa de prueba', [], enLaFranja), cajas);
  const fueraConFuncion = conFuncion === null ? -1 : juzgarLaFranja(conFuncion.tris, cajas, false).fuera;
  comprobar(
    'vacuna: una capa con un triángulo a 1 m dentro de ±270 que dice ir fuera de la ciudad sale roja (y a 1 m fuera, no); lo mismo por debajo de 1,9 m, y con su estorbo metido en la franja',
    fuera.problemas.length > 0 && deVerdadFuera.problemas.length === 0 && encima.problemas.length > 0 && fueraConFuncion > 0,
    { fuera: fuera.problemas, deVerdadFuera: deVerdadFuera.problemas, encima: encima.problemas, fueraConFuncion },
  );
}

paso('(2) las caras al revés: el conjunto de hoy, y ni una nueva');
{
  const nuevas = [...carasAlRevesDeHoy].filter((c) => !CARAS_ANOTADAS.has(c));
  const arregladas = [...CARAS_ANOTADAS].filter((c) => !carasAlRevesDeHoy.has(c));
  nota(`traza ${String(CARAS_AL_REVES_ANOTADAS.traza)}: ${String(carasMiradas)} caras miradas en ${[...familiasDeUnaCara].join(', ')} (de una cara; ${[...familiasDeDosCaras].join(', ')} son de dos); ${String(carasAlRevesDeHoy.size)} al revés, ${String(CARAS_ANOTADAS.size)} anotadas, ${String(arregladas.length)} arregladas desde que se anotaron`);
  comprobar('las familias de una sola cara son al menos las fachadas, el mobiliario y lo emisivo, y se miraron de verdad', ['fachadas', 'mobiliario', 'emisivo'].every((f) => familiasDeUnaCara.has(f as Familia)) && carasMiradas > 1_000_000, { unaCara: [...familiasDeUnaCara], carasMiradas });
  comprobar('ninguna cara al revés nueva: el conjunto de las de hoy (celda, familia y sitio) no gana ninguna', nuevas.length === 0 && CARAS_AL_REVES_ANOTADAS.codigo === CODIGO_DE_LA_CIUDAD, nuevas.slice(0, 5).map((c) => `${c} (${carasAlRevesVistas.get(c) ?? '?'})`));
  /* LA VACUNA: arreglar una y romper otra deja el NÚMERO igual; el conjunto, no. (Sobre el conjunto ANOTADO y no sobre el visto: así la vacuna no depende de cómo esté hoy el árbol.) */
  const vistas = new Set(CARAS_ANOTADAS);
  const quitada = vistas.values().next().value;
  if (quitada !== undefined) vistas.delete(quitada);
  vistas.add('84|mobiliario|0,100,0|0,10,0');
  const nuevasDeLaVacuna = [...vistas].filter((c) => !CARAS_ANOTADAS.has(c));
  comprobar('vacuna: arreglar una cara y romper otra (el mismo número) sale rojo, con la nueva nombrada', vistas.size === CARAS_ANOTADAS.size && nuevasDeLaVacuna.length === 1 && nuevasDeLaVacuna[0] === '84|mobiliario|0,100,0|0,10,0', nuevasDeLaVacuna);
  const g = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
  const pos = g.getAttribute('position').array as Float32Array;
  const nor = g.getAttribute('normal').array as Float32Array;
  const indices = Uint32Array.from({ length: pos.length / 3 }, (_v, i) => i);
  const bien = carasAlReves({ vertices: pos.length / 3, atributos: [], datos: new Map([['position', pos], ['normal', nor]]), indices }, THREE.FrontSide);
  const volteada = Uint32Array.from(indices);
  volteada[1] = 2;
  volteada[2] = 1;
  const mal = carasAlReves({ vertices: pos.length / 3, atributos: [], datos: new Map([['position', pos], ['normal', nor]]), indices: volteada }, THREE.FrontSide);
  comprobar('vacuna: en una caja de three, ninguna cara al revés; con un triángulo volteado, ése y sólo ése', bien.centros.length === 0 && bien.mirados === 12 && mal.centros.length === 1, { bien: bien.centros.length, mal: mal.centros.length });

  /* EN LAS DEMÁS TRAZAS: el conjunto no se puede exigir (otras calles), la FIRMA sí (ver `firmaDeLaCara`). */
  const trazasFuera = TRAZAS_DE_LA_CIUDAD - 1;
  nota(`las otras ${String(trazasFuera)} trazas: ${String(carasMiradasFuera)} caras miradas, ${String(carasAlRevesFuera)} al revés, ${String(carasConOtraFirma)} sin la firma de ninguna de hoy (las de hoy: ${[...FIRMAS_ANOTADAS].join(' · ')})`);
  comprobar(
    `en las otras ${String(trazasFuera)} trazas, toda cara al revés tiene la firma de una de las de hoy (familia, normal y altura: el costado de los toldos), y se miraron de verdad`,
    carasConOtraFirma === 0 && FIRMAS_ANOTADAS.size >= 1 && carasMiradasFuera >= trazasFuera * 1_000_000 && carasAlRevesFuera > 0,
    ejemplosConOtraFirma,
  );
  /* LA VACUNA: el triángulo volteado de la caja (otra altura y otra normal) no tiene firma de hoy; una cara como las del costado de un toldo, sí. */
  const firmaDelVolteado = mal.centros[0] === undefined ? null : firmaDeLaCara('mobiliario', mal.centros[0]);
  const deUnToldo = [...CARAS_ANOTADAS][0];
  const firmaDelToldo = deUnToldo === undefined ? null : firmaDeLaClave(deUnToldo);
  comprobar(
    'vacuna: una cara al revés de otra pieza (el triángulo volteado de la caja) no tiene la firma de ninguna de hoy, y la de un costado de toldo sí',
    firmaDelVolteado !== null && !FIRMAS_ANOTADAS.has(firmaDelVolteado) && firmaDelToldo !== null && FIRMAS_ANOTADAS.has(firmaDelToldo),
    { firmaDelVolteado, firmaDelToldo },
  );
}

paso('(5) la memoria: la de la GPU contra §7.3 y la de JS contra la de hoy × 1,8');
{
  for (const n of NIVELES_DE_LA_CIUDAD) {
    const g = memoriaDeLaGpu[n];
    const j = memoriaDeJs[n];
    nota(
      `N${String(n)}: GPU ${(g.total / MiB).toFixed(1)} MiB (geometrías ${(g.geometrias / MiB).toFixed(1)}, texturas ${(g.texturas / MiB).toFixed(1)}, luz ${(g.luz / MiB).toFixed(1)}, materia ${(g.materia / MiB).toFixed(2)}) de ${String(TOPE_DE_LA_GPU_POR_NIVEL[n])}; JS ${((j.celdas + j.moldes) / MiB).toFixed(1)} MiB (${String(CELDAS_GUARDADAS)} celdas ${(j.celdas / MiB).toFixed(1)}, moldes ${(j.moldes / MiB).toFixed(1)}; hoy ${String(MEMORIA_DE_JS_DE_HOY[n])}, tope ${(MEMORIA_DE_JS_DE_HOY[n] * CRECIMIENTO_DE_LA_MEMORIA_DE_JS).toFixed(1)})`,
    );
    comprobar(`N${String(n)}: la ciudad cabe en la memoria de la GPU (${(g.total / MiB).toFixed(1)} de ${String(TOPE_DE_LA_GPU_POR_NIVEL[n])} MiB)`, g.total > 0 && g.total <= TOPE_DE_LA_GPU_POR_NIVEL[n] * MiB, g);
    comprobar(
      `N${String(n)}: la memoria de JS (celdas guardadas y moldes, ${((j.celdas + j.moldes) / MiB).toFixed(1)} MiB) no pasa de la de hoy × ${String(CRECIMIENTO_DE_LA_MEMORIA_DE_JS)}`,
      j.celdas > 0 && j.moldes > 0 && j.celdas + j.moldes <= MEMORIA_DE_JS_DE_HOY[n] * CRECIMIENTO_DE_LA_MEMORIA_DE_JS * MiB,
      j,
    );
  }
}

paso('(6) el relevo sube toda textura de un material de la ciudad, y (13) las capas pintan las llamadas que declaran');
{
  nota(`${String(texturasMiradas)} texturas miradas; de almacenes ya subidos: ${[...almacenesVistos].join(', ')}`);
  comprobar('toda textura que referencia un material de la ciudad está en piezasPorSubir o es de un almacén ya subido', texturasSinSubir.length === 0 && texturasMiradas >= TRAZAS_DE_LA_CIUDAD * 4 * 3, { texturasSinSubir, texturasMiradas });
  comprobar('cada capa pinta las llamadas que declara, y la ciudad las que suman sus piezas', llamadasQueNoCasan.length === 0 && capasMiradas >= TRAZAS_DE_LA_CIUDAD * 4, { llamadasQueNoCasan, capasMiradas });
  /* LAS VACUNAS, en una ciudad con dos capas de prueba: una cuelga una malla sin declararla, con una textura que nadie sube; otra declara un renglón que el libro no tiene. */
  const perdida = new THREE.DataTexture(new Uint8Array(4), 1, 1);
  perdida.name = 'textura de prueba';
  const sinRenglon: FabricaDeCapa = () => capaDePrueba('capa sin renglón', [0, 30, 0, 1, 30, 0, 0, 30, 1], 'por-encima-de-1,9', () => [], new THREE.ShaderMaterial({ uniforms: { uPrueba: { value: perdida } } }));
  const renglonAjeno: FabricaDeCapa = () => capaDePrueba('capa con renglón ajeno', [0, 31, 0, 1, 31, 0, 0, 31, 1], 'por-encima-de-1,9', () => [{ nombre: 'capa de prueba', llamadas: 1, triangulos: 1, sombra: false }]);
  const base = contexto.base(0);
  const c = construirLaCiudadAbierta(base.fuente, 0, { base, capasDeMas: [sinRenglon, renglonAjeno] });
  c.montarYa(0, 0);
  const llamadas = juzgarLasLlamadas(c);
  const relevo = juzgarElRelevo(c);
  const libro = presupuestoDeLaCiudad(c.piezas(), 0, RENGLONES_DE_LA_CIUDAD_ABIERTA);
  c.liberar();
  comprobar('vacuna: una capa de prueba que cuelga una malla sin declararla pone roja la cuenta de llamadas', llamadas.problemas.some((p) => p.includes('capa sin renglón')), llamadas.problemas);
  comprobar('vacuna: una textura de una capa que no está en sus `texturas()` pone rojo el relevo', relevo.problemas.some((p) => p.includes('textura de prueba')), relevo.problemas);
  comprobar('vacuna: una capa con un renglón que el libro no tiene no cabe', libro.excesos.some((e) => e.includes('capa de prueba')), libro.excesos);
}

paso('(11) las fuentes de luz de una celda no dependen de su grado');
{
  nota(`${String(celdasConFuentes)} celdas (de cada nivel, grado y relieve) contra sus fuentes en grado 1`);
  comprobar('las fuentes de cada celda (horneadas, reflejos, halos y cabezas) son las de grado 1, a ±1 cm, en todo nivel y grado', fuentesQueCambian.length === 0 && celdasConFuentes >= TRAZAS_DE_LA_CIUDAD * 169 * 7, { fuentesQueCambian, celdasConFuentes });
  /* LA VACUNA: una farola de prueba cuya luz sube 10 cm con el grado. Y sin ella, lo de prueba da lo de verdad. */
  const base = contexto.base(0);
  const parte = base.partes.celdas.find((p) => p.farolas.length > 0 && p.edificios.length > 0);
  let vacuna: string[] = [];
  let sinVacuna: string[] = ['sin celda'];
  let comoLaDeVerdad: string[] = ['sin celda'];
  if (parte !== undefined) {
    const farola = { nombre: 'farola de prueba', *escribir(obra: Parameters<EscritorDeLaCelda>[0]) {
      obra.luces.push({ tipo: 'farola', x: parte.caja.x0 + 3, y: 6 + 0.1 * obra.grado, z: parte.caja.z0 + 3 });
      yield;
    } };
    const conFarola = [...ESCRITORES_DE_LA_CELDA, farola];
    vacuna = diferenciasDeLasFuentes(obraAPasos(parte, base.partes, 3, 2, true, conFarola).fuentes(), obraAPasos(parte, base.partes, 3, 3, true, conFarola).fuentes());
    sinVacuna = diferenciasDeLasFuentes(obraAPasos(parte, base.partes, 3, 2, true).fuentes(), obraAPasos(parte, base.partes, 3, 3, true).fuentes());
    comoLaDeVerdad = diferenciasDeLasFuentes(obraAPasos(parte, base.partes, 3, 3, true).fuentes(), pasosDeLaCelda(parte, base.partes, 3, 3, true).celda.fuentes, 1e-6);
  }
  comprobar('vacuna: una farola de prueba que sube 10 cm con el grado sale roja (y sin ella, nada; y la obra de prueba da las fuentes de la celda de verdad)', vacuna.length > 0 && sinVacuna.length === 0 && comoLaDeVerdad.length === 0, { vacuna, sinVacuna, comoLaDeVerdad });
}

paso('(12) los trozos: ningún escritor de pieza escribe más que el trozo entre dos pasos, en ningún nivel ni grado');
{
  for (const n of NIVELES_DE_LA_CIUDAD) {
    nota(`N${String(n)} (trozo ${String(TROZO_POR_NIVEL[n])}): ${VARIANTES[n].map((v) => `${nombreDeLaVariante(n, v)} paso mayor ${String(pasoMayorPorGrado.get(nombreDeLaVariante(n, v)) ?? 0)}`).join(' · ')}`);
  }
  comprobar(
    'ningún escritor de pieza pasa del trozo de su nivel (600 en N0, 1.000 en N1-N3) entre dos pasos, contando la cola de cada celda',
    pasosQueSePasan.length === 0 && pasoMayorPorGrado.size === NIVELES_DE_LA_CIUDAD.reduce<number>((s, n) => s + VARIANTES[n].length, 0) && pasosMirados > TRAZAS_DE_LA_CIUDAD * 169 * 7,
    { pasosQueSePasan, pasosMirados },
  );
  /* LA VACUNA: un coche g3 escrito sin ceder (1.000 de chapa, 60 de lunas y 20 de faros), y el mismo cediendo. */
  const base = contexto.base(0);
  const parte = base.partes.celdas.find((p) => p.coches.length > 0);
  const cochePrueba = (cede: boolean): { readonly nombre: string; readonly escribir: EscritorDeLaCelda } => ({
    nombre: 'coche de prueba',
    *escribir(obra) {
      if (obra.grado !== 3) return;
      const triangulos = (m: typeof obra.m.mobiliario, cuantos: number): void => {
        for (let t = 0; t < cuantos; t++) {
          const a = m.vertice(0, 30 + t * 0.001, 0, 0, 1, 0, 0, 0);
          const b = m.vertice(1, 30 + t * 0.001, 0, 0, 1, 0, 1, 0);
          const c = m.vertice(0, 30 + t * 0.001, 1, 0, 1, 0, 0, 1);
          m.tri(a, c, b);
        }
      };
      triangulos(obra.m.mobiliario, 1000);
      if (cede) yield;
      triangulos(obra.m.cristal, 60);
      triangulos(obra.m.emisivo, 20);
      yield;
    },
  });
  const sinCeder = parte === undefined ? null : obraAPasos(parte, base.partes, 3, 3, true, [...ESCRITORES_DE_LA_CELDA, cochePrueba(false)]);
  const cediendo = parte === undefined ? null : obraAPasos(parte, base.partes, 3, 3, true, [...ESCRITORES_DE_LA_CELDA, cochePrueba(true)]);
  const enG2 = parte === undefined ? null : obraAPasos(parte, base.partes, 3, 2, true, [...ESCRITORES_DE_LA_CELDA, cochePrueba(false)]);
  comprobar(
    'vacuna: un coche g3 escrito sin ceder (1.080 triángulos en un paso) sale rojo y nombrado; cediendo tras la chapa, no; y en g2 no escribe',
    sinCeder !== null && sinCeder.mayor > TROZO_POR_NIVEL[3] && sinCeder.deQuien === 'coche de prueba' && cediendo !== null && cediendo.mayor <= TROZO_POR_NIVEL[3] && enG2 !== null && enG2.mayor <= TROZO_POR_NIVEL[3],
    { sinCeder: sinCeder?.mayor, quien: sinCeder?.deQuien, cediendo: cediendo?.mayor, enG2: enG2?.mayor },
  );
}

paso('(3) la paridad GLSL ↔ JS de las reglas gemelas, en sus literales');
{
  const estilos = (Object.entries(NUMERO_DEL_ESTILO) as [EstiloDeFachada, number][]).sort((a, b) => a[1] - b[1]);
  const textos: TextosDeLaParidad = {
    hashJs: readFileSync(new URL('../src/quiebro/ciudad/hash.ts', import.meta.url), 'utf8'),
    glslComun: GLSL_COMUN_DE_LA_FACHADA,
    tramoDelHueco: TRAMO_DEL_HUECO,
    tramoDelBajo: TRAMO_DEL_BAJO,
    huecoDelEstilo: estilos.map(([e]) => HUECO_DEL_ESTILO[e]),
    largoDeUnaTienda: LARGO_DE_UNA_TIENDA,
  };
  const p = paridadDeLasGemelas(textos);
  nota(`${String(p.comparados)} números comparados entre hash.ts, HUECO_DEL_ESTILO, LARGO_DE_UNA_TIENDA y el GLSL de la fachada`);
  comprobar('encendida, queTienda, colorDeLuz, huecoQ y la tienda de 6 m dicen lo mismo en GLSL y en JS', p.problemas.length === 0 && p.comparados >= 60, p);
  /* LAS VACUNAS: un umbral cambiado en una copia del GLSL de cada gemela. */
  const vacunas: readonly [string, keyof TextosDeLaParidad, string, string][] = [
    ['encendidaQ', 'glslComun', 'hp < 0.16 ? 0.8 : 0.04', 'hp < 0.17 ? 0.8 : 0.04'],
    ['queTiendaQ', 'glslComun', 'ht < 0.34 ? 0', 'ht < 0.35 ? 0'],
    ['colorDeLuzQ', 'glslComun', 'if (h < 0.45)', 'if (h < 0.46)'],
    ['la semilla del color', 'tramoDelHueco', 'semilla + 17.0);', 'semilla + 18.0);'],
    ['huecoQ', 'glslComun', 'vec4(0.28, 0.72, 0.22, 0.80)', 'vec4(0.28, 0.72, 0.23, 0.80)'],
    ['la tienda de 6 m', 'tramoDelBajo', 'floor(anchoCara / 6.0)', 'floor(anchoCara / 7.0)'],
  ];
  const sinRojo: string[] = [];
  for (const [nombre, clave, antes, despues] of vacunas) {
    const original = textos[clave] as string;
    const roto = original.replace(antes, despues);
    if (roto === original) {
      sinRojo.push(`${nombre}: la vacuna no encuentra «${antes}»`);
      continue;
    }
    if (paridadDeLasGemelas({ ...textos, [clave]: roto }).problemas.length === 0) sinRojo.push(`${nombre}: con «${despues}» sale verde`);
  }
  comprobar('vacuna: un umbral cambiado en una copia del GLSL de cada gemela sale rojo', sinRojo.length === 0, sinRojo);

  /* LA TIENDA DE 6 M CONTRA EL JS DEL JUEGO: `escaparatesDe` llamado de verdad, y los toldos con sus mismas cuentas. */
  const escaparates = (ancho: number, semilla: number): number[] => {
    const puestas: VentanaEncendida[] = [];
    escaparatesDe({ cara: { desde: 0, hasta: ancho, mira: 's', plano: 0 }, semilla, toques: [] } as unknown as CaraDelVolumen, puestas, {} as ObraDeLaFachada);
    return puestas.map((v) => v.x);
  };
  const enciende = (t: number, semilla: number): boolean => queTienda(t, semilla, false) === 1;
  const muestras: { ancho: number; semilla: number }[] = [];
  for (let ancho = 2; ancho <= 40; ancho += 0.75) for (let semilla = 1; semilla <= 60_000; semilla += 2_999) muestras.push({ ancho, semilla });
  const glsl = tiendaDelGlsl(TRAMO_DEL_BAJO);
  const tiendas = glsl === null ? null : juzgarLasTiendas(glsl, escaparates, enciende, muestras);
  const bajoJs = readFileSync(new URL('../src/quiebro/ciudad/fachada/bajo.ts', import.meta.url), 'utf8');
  const voladizosJs = readFileSync(new URL('../src/quiebro/ciudad/voladizos.ts', import.meta.url), 'utf8');
  const toldos = juzgarLosToldos(bajoJs, voladizosJs);
  nota(tiendas === null ? 'la tienda: no se encuentran sus cuentas en el GLSL del bajo' : `la tienda de 6 m: ${String(tiendas.caras)} caras y ${String(tiendas.tiendas)} tiendas del GLSL contra los escaparates de escaparatesDe; toldos: ${toldos.length === 0 ? 'las mismas cuentas que los escaparates' : toldos.join('; ')}`);
  comprobar(
    'la tienda de 6 m del JS del juego: escaparatesDe pone sus escaparates en el centro de las tiendas del GLSL que queTienda enciende, y ninguno más; y los toldos de voladizos.ts reparten las tiendas con las mismas cuentas',
    tiendas !== null && tiendas.problemas.length === 0 && tiendas.caras >= 1000 && tiendas.tiendas >= 3000 && toldos.length === 0,
    { tiendas: tiendas?.problemas, toldos },
  );
  /* LAS VACUNAS: la tienda del GLSL a 7 m (en una copia de su texto), escaparates de otra cara y toldos con otra cuenta (en una copia de voladizos.ts). */
  const glslDe7 = tiendaDelGlsl(TRAMO_DEL_BAJO.replace('floor(anchoCara / 6.0)', 'floor(anchoCara / 7.0)'));
  const conOtroGlsl = glslDe7 === null ? null : juzgarLasTiendas(glslDe7, escaparates, enciende, muestras);
  const conOtroEscaparate = glsl === null ? null : juzgarLasTiendas(glsl, (ancho, semilla) => escaparates(ancho + 0.25, semilla), enciende, muestras);
  const toldosRotos = juzgarLosToldos(bajoJs, voladizosJs.replace('t0 + LARGO_DE_UNA_TIENDA', 't0 + LARGO_DE_UNA_TIENDA + 1'));
  const sinToldos = juzgarLosToldos(bajoJs, voladizosJs.replace(/const\s+t1\s*=/, 'let t1 ='));
  comprobar(
    'vacuna: la tienda del GLSL a 7 m, los escaparates de otra cara y unos toldos con otra cuenta (o sin ella) salen rojos',
    conOtroGlsl !== null && conOtroGlsl.problemas.length > 0 && conOtroEscaparate !== null && conOtroEscaparate.problemas.length > 0 && toldosRotos.length > 0 && sinToldos.length > 0 && voladizosJs.includes('t0 + LARGO_DE_UNA_TIENDA'),
    { conOtroGlsl: conOtroGlsl?.problemas.length, conOtroEscaparate: conOtroEscaparate?.problemas.length, toldosRotos, sinToldos },
  );
}

paso('(4) la Grafía es lo último del texto final de la fachada y de lo lejano, en N0-N3');
{
  const malos: string[] = [];
  let textos = 0;
  const fachadaDeHoy = textoDelFragmento(materialDeFachada(1));
  for (const n of NIVELES_DE_LA_CIUDAD) {
    const materiales: [string, THREE.Material][] = [
      ['la fachada', materialDeFachada(n)],
      ['la fachada de la ventana', contexto.ciudad(0, n).ventana.mallas.fachadas.malla.material as THREE.Material],
      ['lo lejano', materialDeLoLejano(n, n >= 1)],
    ];
    for (const [nombre, m] of materiales) {
      const t = textoDelFragmento(m);
      if (t === '') {
        malos.push(`N${String(n)} ${nombre}: no se pudo montar su texto`);
        continue;
      }
      textos++;
      for (const p of juzgarLaGrafia(t)) malos.push(`N${String(n)} ${nombre}: ${p}`);
    }
  }
  comprobar('en N0-N3 (la fachada, la de la ventana y lo lejano), detrás del bloque de uRejillaDeGlifos va la marca y nadie escribe albedo ni emision', malos.length === 0 && textos === 12, { malos, textos });
  /* LAS VACUNAS: una línea de la Grafía movida detrás de la marca; una escritura del color detrás; sin la marca. */
  const lineaDeLaGrafia = /\n[ \t]*albedo \*= 1\.0 - 0\.85 \* uRejillaDeGlifos;/;
  const movida = fachadaDeHoy.replace(lineaDeLaGrafia, '').replace(MARCA_DEL_FIN_DE_LA_GRAFIA, `${MARCA_DEL_FIN_DE_LA_GRAFIA}\n  albedo *= 1.0 - 0.85 * uRejillaDeGlifos;`);
  const escritaDetras = fachadaDeHoy.replace(MARCA_DEL_FIN_DE_LA_GRAFIA, `${MARCA_DEL_FIN_DE_LA_GRAFIA}\n  emision.g += 0.1;`);
  const sinMarca = fachadaDeHoy.replace(MARCA_DEL_FIN_DE_LA_GRAFIA, '');
  const comentada = fachadaDeHoy.replace(MARCA_DEL_FIN_DE_LA_GRAFIA, `${MARCA_DEL_FIN_DE_LA_GRAFIA}\n  /* aquí antes se hacía albedo = vec3(1.0); */`);
  comprobar(
    'vacuna: una línea de la Grafía movida detrás de la marca, una escritura de emision detrás y la marca quitada salen rojas; un comentario que cite albedo, no',
    lineaDeLaGrafia.test(fachadaDeHoy) && juzgarLaGrafia(movida).length > 0 && juzgarLaGrafia(escritaDetras).length > 0 && juzgarLaGrafia(sinMarca).length > 0 && juzgarLaGrafia(comentada).length === 0,
    { movida: juzgarLaGrafia(movida), escritaDetras: juzgarLaGrafia(escritaDetras), sinMarca: juzgarLaGrafia(sinMarca), comentada: juzgarLaGrafia(comentada) },
  );
}

paso('las comprobaciones de cada paquete (`quiebro-ciudad/<paquete>.ts`), con su mínimo de inspeccionados');
{
  const faltan = PAQUETES_DEL_PLAN.filter((p) => typeof PAQUETES_DE_LA_CIUDAD[p]?.comprobar !== 'function');
  const deMas = Object.keys(PAQUETES_DE_LA_CIUDAD).filter((p) => !(PAQUETES_DEL_PLAN as readonly string[]).includes(p));
  comprobar(`los ${String(PAQUETES_DEL_PLAN.length)} paquetes del plan están importados y exportan comprobar(ctx)`, faltan.length === 0 && deMas.length === 0, { faltan, deMas });
  const resumen: string[] = [];
  for (const nombre of PAQUETES_DEL_PLAN) {
    const comprobarElPaquete = PAQUETES_DE_LA_CIUDAD[nombre]?.comprobar as ((ctx: typeof contexto) => Resultado[]) | undefined;
    if (comprobarElPaquete === undefined) continue;
    let resultados: Resultado[];
    try {
      resultados = comprobarElPaquete(contexto);
    } catch (e) {
      comprobar(`${nombre}: sus comprobaciones no revientan`, false, String(e));
      continue;
    }
    let inspeccionados = 0;
    for (const r of resultados) {
      inspeccionados += r.inspeccionados;
      comprobar(`${nombre} · ${r.que} (${String(r.inspeccionados)} inspeccionados, mínimo ${String(r.minimo)})`, resultadoEnVerde(r), r.detalle);
    }
    resumen.push(`${nombre} ${String(resultados.length)}${resultados.length > 0 ? ` (${String(inspeccionados)} inspeccionados)` : ''}`);
  }
  nota(`resultados por paquete: ${resumen.join(' · ')}`);
  comprobar(
    'vacuna: un resultado en verde que miró menos que su mínimo (o cero con mínimo cero y algo que mirar) sale rojo',
    !resultadoEnVerde({ que: 'prueba', bien: true, inspeccionados: 3, minimo: 4 }) && !resultadoEnVerde({ que: 'prueba', bien: true, inspeccionados: 0, minimo: 0 }) && resultadoEnVerde({ que: 'prueba', bien: true, inspeccionados: 4, minimo: 4 }) && !resultadoEnVerde({ que: 'prueba', bien: false, inspeccionados: 9, minimo: 4 }),
  );
}
contexto.soltar();

paso('el juego pinta lo que choca en la sala: las cajas de la ciudad pintada son las del mundo de la Liza');
{
  /*
   * Lo de arriba demuestra que lo pintado coincide con `fuente.noche.cajas`. Esto cierra la cadena hasta la
   * sala: esas cajas son, en número, orden y sitio, los cuerpos del mundo de la Liza de la misma noche (el que
   * el productor le da a la sala y con el que el aparato predice cada paso), con sus Fallos y con y sin las
   * «Plazas despejadas». Si el cliente pintara otra noche, otros Fallos o se olvidara de despejar, el jugador
   * chocaría con cajas que no ve o atravesaría las que ve.
   */
  const malos: string[] = [];
  let noches = 0;
  let cajasComparadas = 0;
  let despejadasQueQuitan = 0;
  for (let traza = 0; traza < TRAZAS_DE_LA_CIUDAD; traza++) {
    const mesa = ciudadDeLaMesa(traza, CODIGO_DE_LA_CIUDAD);
    const bajada = 1 + (traza % PLAZAS_POR_CIUDAD);
    const trio = triosDeFallos(mesa, bajada)[0];
    const fallos = trio === undefined ? [bajada] : [bajada, trio[0], trio[1]];
    const numero = 1 + ((traza * 3) % 10);
    for (const despejadas of [false, true]) {
      const pintada = ciudadParaPintar(traza, CODIGO_DE_LA_CIUDAD, numero, fallos, despejadas);
      const mundo = mundoDeLaLizaDeLaCiudad(ciudadDeLaNoche(mesa, CODIGO_DE_LA_CIUDAD, numero, fallos), despejadas);
      const a = pintada.noche.cajas;
      const b = mundo.suelo.cuerpos;
      noches++;
      if (despejadas && a.length < ciudadParaPintar(traza, CODIGO_DE_LA_CIUDAD, numero, fallos, false).noche.cajas.length) despejadasQueQuitan++;
      if (pintada.origen !== 'traza') malos.push(`traza ${String(traza)}: se pinta la ciudad ${pintada.origen}`);
      if (a.length !== b.length) {
        malos.push(`traza ${String(traza)} noche ${String(numero)} ${despejadas ? 'despejada' : 'entera'}: ${String(a.length)} cajas pintadas y ${String(b.length)} en la sala`);
        continue;
      }
      for (let i = 0; i < a.length; i++) {
        const p = a[i];
        const q = b[i];
        cajasComparadas++;
        if (p === undefined || q === undefined || p.x0 !== q.x0 || p.z0 !== q.z0 || p.x1 !== q.x1 || p.z1 !== q.z1) {
          malos.push(`traza ${String(traza)} noche ${String(numero)} ${despejadas ? 'despejada' : 'entera'}: la caja ${String(i)} no es la de la sala`);
          break;
        }
      }
    }
  }
  nota(`${String(noches)} noches, ${String(cajasComparadas)} cajas comparadas; en ${String(despejadasQueQuitan)} de ${String(TRAZAS_DE_LA_CIUDAD)} despejar quitó cajas`);
  comprobar(
    'en las 32 trazas, con sus Fallos, enteras y despejadas, la ciudad que pinta el juego tiene las cajas del mundo de la Liza, en su orden',
    malos.length === 0 && cajasComparadas > TRAZAS_DE_LA_CIUDAD * 2 * 1000 && despejadasQueQuitan === TRAZAS_DE_LA_CIUDAD,
    { malos: malos.slice(0, 5), cajasComparadas, despejadasQueQuitan },
  );
}

paso('cruzar la ciudad en escalera a 7 m/s: las llamadas no cambian y ningún fotograma pasa su tope');
{
  const { puntos: esquinas } = (() => {
    const puntos: [number, number][] = [[-264, -264]];
    for (let k = 0; k < 11; k++) {
      const [x, z] = puntos[puntos.length - 1] as [number, number];
      puntos.push([x + 48, z]);
      puntos.push([x + 48, z + 48]);
    }
    return { puntos };
  })();
  const pasosDelCruce: { x: number; z: number }[] = [];
  for (let k = 1; k < esquinas.length; k++) {
    const [ax, az] = esquinas[k - 1] as [number, number];
    const [bx, bz] = esquinas[k] as [number, number];
    const cuantos = Math.ceil((Math.abs(bx - ax) + Math.abs(bz - az)) / (7 / 30));
    for (let f = 0; f < cuantos; f++) pasosDelCruce.push({ x: ax + ((bx - ax) * f) / cuantos, z: az + ((bz - az) * f) / cuantos });
  }
  /* Lo que cuesta cruzar media celda al trote: la ventana nueva tiene que verse antes (§5.7: 6,9 s). */
  const LATENCIA_MAXIMA = Math.floor(6.9 * 30);
  const malos: string[] = [];
  const resumen: string[] = [];
  let cambiosDeVentana = 0;
  let cambiosDeLuz = 0;
  for (const traza of [0, 13, 22, 31]) {
    const fuente = ciudadParaPintar(traza, CODIGO_DE_LA_CIUDAD, 2);
    for (const n of NIVELES_DE_LA_CIUDAD) {
      const ciudad = construirLaCiudadAbierta(fuente, n);
      const p = PRESUPUESTO_DE_LA_VENTANA[n];
      const llamadas = new Set<string>();
      let peorEscritos = 0;
      let peorSubidos = 0;
      let peorLuz = 0;
      let peorFilasDeLuz = 0;
      let margenMinimo = Infinity;
      const pos = { x: pasosDelCruce[0]?.x ?? 0, z: pasosDelCruce[0]?.z ?? 0 };
      const camara = camaraEn(pos);
      pasosDelCruce.forEach((q, f) => {
        pos.x = q.x;
        pos.z = q.z;
        /* Hasta que hay ventana y luz pintadas se trabaja con prisa (PRISA_DEL_PRINCIPIO); desde ahí, con los topes. */
        const conPrisa = ciudad.ventana.ahora === null || !ciudad.luz.lista;
        const r = ciudad.actualizar(camara, f / 30, f);
        if (!conPrisa) {
          peorEscritos = Math.max(peorEscritos, r.ventana.escritos);
          peorSubidos = Math.max(peorSubidos, r.ventana.subidos);
          peorLuz = Math.max(peorLuz, r.luz.texeles);
          peorFilasDeLuz = Math.max(peorFilasDeLuz, r.luz.filas);
          const s = ciudad.ventana.ahora;
          if (s !== null) margenMinimo = Math.min(margenMinimo, margenEnLaVentana(s, q.x, q.z));
        }
        if (f % 10 === 0 || r.ventana.cambio) llamadas.add(llamadasDeLaCiudad(ciudad.grupo).join(','));
      });
      /* El primer cambio es el del principio (con prisa); los demás, al andar. */
      const latencias = ciudad.ventana.latencias.slice(1);
      const latencia = Math.max(0, ...latencias);
      cambiosDeVentana += ciudad.ventana.cambios;
      cambiosDeLuz += ciudad.luz.cambios;
      const t = ciudad.luz;
      if (llamadas.size !== 1) malos.push(`traza ${String(traza)} N${String(n)}: ${String(llamadas.size)} juegos de llamadas distintos`);
      if (peorEscritos > p.porFotograma) malos.push(`traza ${String(traza)} N${String(n)}: ${String(peorEscritos)} triángulos en un fotograma > ${String(p.porFotograma)}`);
      if (peorSubidos > p.bytesPorFotograma) malos.push(`traza ${String(traza)} N${String(n)}: ${String(peorSubidos)} bytes en un fotograma > ${String(p.bytesPorFotograma)}`);
      if (peorLuz > t.topeDelFotograma) malos.push(`traza ${String(traza)} N${String(n)}: ${String(peorLuz)} téxeles de luz en un fotograma > ${String(t.topeDelFotograma)}`);
      if (peorFilasDeLuz > t.filasDelFotograma) malos.push(`traza ${String(traza)} N${String(n)}: ${String(peorFilasDeLuz)} filas de luz subidas en un fotograma > ${String(t.filasDelFotograma)}`);
      if (latencia > LATENCIA_MAXIMA) malos.push(`traza ${String(traza)} N${String(n)}: la ventana nueva tardó ${String(latencia)} fotogramas`);
      /*
       * La latencia sólo mide las ventanas que LLEGARON: una que se queda atrás se abandona por la siguiente y
       * no sale en ella. Lo que no se puede esconder es dónde anda quien cruza: nunca en la franja del fundido.
       */
      if (margenMinimo < FRANJA_DEL_FUNDIDO) malos.push(`traza ${String(traza)} N${String(n)}: quien cruza llegó a ${margenMinimo.toFixed(1)} m del canto de la ventana pintada (< ${String(FRANJA_DEL_FUNDIDO)})`);
      if (traza === 0) {
        const kB = (b: number): string => String(Math.round(b / 1024));
        resumen.push(
          `N${String(n)}: ${String(llamadas.values().next().value?.split(',').length ?? 0)} llamadas, ${String(ciudad.ventana.cambios)} ventanas, latencia ${String(latencia)} fot., margen ${margenMinimo.toFixed(1)} m, peor ${String(peorEscritos)} tri / ${kB(peorSubidos)} kB; luz ${String(t.cambios)} cambios, peor ${String(peorLuz)} téxeles / ${String(peorFilasDeLuz)} filas (${kB(peorFilasDeLuz * t.texeles * 8)} kB)`,
        );
      }
      ciudad.liberar();
    }
  }
  for (const r of resumen) nota(r);
  comprobar('al cruzar, la ventana y la luz se movieron de verdad (el cruce no es un paseo en el sitio)', cambiosDeVentana >= 4 * 4 * 10 && cambiosDeLuz >= 4 * 4 * 5, { cambiosDeVentana, cambiosDeLuz });
  comprobar('al cruzar, las llamadas no cambian, ningún fotograma pasa sus topes, la ventana nueva llega a tiempo y quien cruza no pisa la franja del fundido', malos.length === 0, malos.slice(0, 6));
}

paso('una ventana que se pidió y ya no se quiere no llega a pintarse');
{
  /*
   * El primer fotograma la cámara puede estar donde la dejó el lienzo (el banco la pone en (0, 30) y el juego,
   * donde la deje el rig) antes de que la coloque quien la maneja. Eso pide la ventana y la luz de allí; si
   * quien mira ya está de vuelta en su celda, ese trabajo se deja: si no, al acabarlo se pintaba una ventana
   * donde no hay nadie (el sitio de quien mira, sin detalle y sin luz, un par de segundos) y luego otra vez
   * la suya. Lo mismo al volver sobre sus pasos pasado el umbral del recentrado.
   */
  const malos: string[] = [];
  for (const n of NIVELES_DE_LA_CIUDAD) {
    const ciudad = construirLaCiudadAbierta(ciudadParaPintar(4, CODIGO_DE_LA_CIUDAD, 2), n);
    ciudad.montarYa(20, -120);
    const ventanaAntes = ciudad.ventana.cambios;
    const luzAntes = ciudad.luz.cambios;
    const pos = { x: 0, z: 30 };
    const camara = camaraEn(pos);
    ciudad.actualizar(camara, 0, 0);
    pos.x = 20;
    pos.z = -120;
    for (let f = 1; f < 600; f++) ciudad.actualizar(camara, f / 30, f);
    if (ciudad.ventana.cambios !== ventanaAntes) malos.push(`N${String(n)}: la ventana cambió ${String(ciudad.ventana.cambios - ventanaAntes)} veces sin que quien mira saliera de su celda`);
    if (ciudad.luz.cambios !== luzAntes) malos.push(`N${String(n)}: la luz cambió ${String(ciudad.luz.cambios - luzAntes)} veces sin que quien mira saliera de su centro`);
    ciudad.liberar();
  }
  comprobar('un fotograma con la cámara en otro sitio no deja pintadas una ventana ni una luz que ya nadie quiere', malos.length === 0, malos);
}

paso('la primera luz de la noche: la de su ciudad, nunca luz de otro sitio, y la plaza de la Bajada con luz en seguida');
{
  /*
   * Montada en el juego (24-sep), la primera ventana de luz tardaba 226 fotogramas en N0 (7,5 s a 30 fps) y,
   * mientras, el uniforme seguía apuntando a la luz de la ciudad de la noche ANTERIOR, ya liberada: three la
   * volvía a subir y se pintaba la luz de otra noche en el sitio de otra ventana, o nada. La Bajada entera caía
   * sobre una plaza negra. Ahora la primera se escribe en la que se pinta, loseta a loseta y de dentro afuera
   * (`losetas.ts`).
   *
   * Aquí, como en «Otra noche»: una ciudad que se libera y otra que se construye detrás; la cámara empieza
   * donde acabó la noche anterior (lejos) y a los 15 fotogramas salta a lo alto de la plaza de la Bajada.
   *   · Desde recién construida, el uniforme es la luz de la ciudad nueva.
   *   · Nunca se enseña luz de otro sitio: todo téxel encendido de lo que se pinta es el del horneado de una
   *     vez de su caja (lo escrito para la cámara de antes se borra antes de mover la caja).
   *   · La plaza tiene luz en 60 fotogramas como mucho desde el salto (2 s a 30 fps: antes de acabar la caída)
   *     y en menos de un tercio de lo que tarda la ventana entera (el centro va primero).
   */
  const LADO_DE_LA_VENTANA_DE_LUZ = 256;
  const origenDeLaLuz = (x: number, z: number): CajaXZ => {
    const x0 = Math.round(x / 64) * 64 - LADO_DE_LA_VENTANA_DE_LUZ / 2;
    const z0 = Math.round(z / 64) * 64 - LADO_DE_LA_VENTANA_DE_LUZ / 2;
    return { x0, z0, x1: x0 + LADO_DE_LA_VENTANA_DE_LUZ, z1: z0 + LADO_DE_LA_VENTANA_DE_LUZ };
  };
  const luzCerca = (x: number, z: number, r: number): number => {
    const t = UNIFORMES_DE_LA_CIUDAD.uLuzCalle.value as THREE.DataTexture;
    const c = UNIFORMES_DE_LA_CIUDAD.uLuzCalleCaja.value;
    const d = t.image.data as unknown;
    if (!(d instanceof Uint16Array)) return 0;
    const W = t.image.width;
    let suma = 0;
    for (let zz = z - r; zz <= z + r; zz += 1) {
      for (let xx = x - r; xx <= x + r; xx += 1) {
        const u = (xx - c.x) * c.z;
        const v = (zz - c.y) * c.w;
        if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
        suma += THREE.DataUtils.fromHalfFloat(d[(Math.floor(v * W) * W + Math.floor(u * W)) * 4] as number);
      }
    }
    return suma;
  };
  const malos: string[] = [];
  const resumen: string[] = [];
  let texelesComparados = 0;
  for (const n of NIVELES_DE_LA_CIUDAD) {
    const antes = construirLaCiudadAbierta(ciudadParaPintar(0, CODIGO_DE_LA_CIUDAD, 1, [1]), n);
    antes.montarYa(100, 100);
    antes.liberar();
    const ciudad = construirLaCiudadAbierta(ciudadParaPintar(0, CODIGO_DE_LA_CIUDAD, 2, [1]), n);
    /* Recién construida, antes de su primer fotograma, el uniforme ya no es la luz de la ciudad liberada. */
    let ajenos = UNIFORMES_DE_LA_CIUDAD.uLuzCalle.value !== ciudad.luz.textura_ ? 1 : 0;
    const plazaDeLaBajada = ciudad.fuente.noche.ciudad.plazas[0];
    const px = plazaDeLaBajada?.centro.x ?? 0;
    const pz = plazaDeLaBajada?.centro.z ?? 0;
    const ojo = { x: 200, z: 200 };
    const camara = camaraEn(ojo);
    /* El horneado de una vez de la ventana de luz de la Bajada: lo único que se puede ver encendido allí. */
    const cajaFinal = origenDeLaLuz(px, pz + 24);
    const fuentes: FuenteHorneada[] = [];
    for (const parte of ciudad.partes.celdas) fuentes.push(...fuentesDeLaCelda(parte, ciudad.partes, n).horneadas);
    const directa = hornearLaLuz(fuentes, cajaFinal, ciudad.luz.texeles);
    const cada = n >= 2 ? 8 : 4;
    let deOtroSitio = 0;
    let plaza = -1;
    let entera = -1;
    const SALTO = 15;
    for (let f = 0; f < 3000 && entera < 0; f++) {
      if (f === SALTO) {
        ojo.x = px;
        ojo.z = pz + 24;
      }
      ciudad.actualizar(camara, f / 30, f);
      if (UNIFORMES_DE_LA_CIUDAD.uLuzCalle.value !== ciudad.luz.textura_) ajenos++;
      if (f < SALTO) continue;
      const c = UNIFORMES_DE_LA_CIUDAD.uLuzCalleCaja.value;
      const W = ciudad.luz.texeles;
      if (Math.abs(c.x - cajaFinal.x0) < 1e-6 && Math.abs(c.y - cajaFinal.z0) < 1e-6) {
        const d = ciudad.luz.textura_.image.data as Uint16Array;
        let mal = false;
        for (let k = 0; k < W && !mal; k += cada) {
          for (let i = 0; i < W; i += cada) {
            const j = (k * W + i) * 4;
            const visto = THREE.DataUtils.fromHalfFloat(d[j] as number);
            texelesComparados++;
            if (visto === 0) continue;
            const bueno = Math.min(60000, directa.datos[j] as number);
            if (Math.abs(visto - bueno) / Math.max(1, Math.abs(bueno)) > 2e-3) {
              mal = true;
              break;
            }
          }
        }
        if (mal) deOtroSitio++;
      }
      if (plaza < 0 && luzCerca(px, pz, 30) > 0) plaza = f - SALTO;
      if (ciudad.luz.lista) entera = f - SALTO;
    }
    resumen.push(`N${String(n)}: la plaza con luz ${String(plaza)} fot. tras el salto, la ventana entera en ${String(entera)}`);
    if (ajenos > 0) malos.push(`N${String(n)}: ${String(ajenos)} fotogramas con otra luz en el uniforme`);
    if (deOtroSitio > 0) malos.push(`N${String(n)}: ${String(deOtroSitio)} fotogramas enseñando luz que no es la de su sitio`);
    if (plaza < 0 || plaza > 60) malos.push(`N${String(n)}: la plaza de la Bajada sin luz hasta el fotograma ${String(plaza)} tras el salto`);
    if (entera < 0 || plaza * 3 > entera) malos.push(`N${String(n)}: la plaza en ${String(plaza)} fot. y la ventana entera en ${String(entera)}: el centro no va primero`);
    ciudad.liberar();
  }
  for (const r of resumen) nota(r);
  comprobar(
    'la primera luz de la noche es la de su ciudad desde que se construye, nunca enseña luz de otro sitio, y la plaza de la Bajada tiene luz en seguida y antes que lo de fuera',
    malos.length === 0 && texelesComparados > 100_000,
    { malos, texelesComparados },
  );
}

paso('la luz por losetas es la misma que hornear su ventana de una vez');
{
  const ciudad = construirLaCiudadAbierta(ciudadParaPintar(5, CODIGO_DE_LA_CIUDAD, 3), 0);
  ciudad.montarYa(40, -30);
  const caja = ciudad.luz.caja;
  let peor = 0;
  let encendidos = 0;
  if (caja !== null) {
    const fuentes: FuenteHorneada[] = [];
    for (const parte of ciudad.partes.celdas) fuentes.push(...fuentesDeLaCelda(parte, ciudad.partes, 0).horneadas);
    const directa = hornearLaLuz(fuentes, caja, ciudad.luz.texeles);
    const hecha = ciudad.luz.textura_.image.data as Uint16Array;
    for (let i = 0; i < directa.datos.length; i++) {
      const a = THREE.DataUtils.fromHalfFloat(hecha[i] as number);
      const b = Math.min(60000, directa.datos[i] as number);
      if (b > 0.01) encendidos++;
      peor = Math.max(peor, Math.abs(a - b) / Math.max(1, Math.abs(b)));
    }
  }
  nota(`${String(encendidos)} téxeles con luz; peor diferencia relativa ${peor.toExponential(2)}`);
  comprobar('la ventana de luz compuesta de losetas es la del horneado de una vez (medio punto flotante)', caja !== null && encendidos > 10000 && peor < 2e-3, { peor, encendidos });
  ciudad.liberar();
}

paso('el borde de glifos está en las tres salidas y cubre cada pasillo');
{
  const malos: string[] = [];
  for (let traza = 0; traza < TRAZAS_DE_LA_CIUDAD; traza += 3) {
    const ciudad = construirLaCiudadAbierta(ciudadParaPintar(traza, CODIGO_DE_LA_CIUDAD, 1), 0);
    const salidas = ciudad.partes.salidas;
    const pos = ciudad.borde.malla.geometry.getAttribute('position');
    if (salidas.length !== 3) malos.push(`traza ${String(traza)}: ${String(salidas.length)} salidas`);
    for (const s of salidas) {
      /* La cortina: vértices en la raya del cerco (±270) que llegan a los dos lados del pasillo. */
      let desde = Infinity;
      let hasta = -Infinity;
      for (let i = 0; i < pos.count; i++) {
        const d = s.eje === 'x' ? pos.getX(i) : pos.getZ(i);
        const t = s.eje === 'x' ? pos.getZ(i) : pos.getX(i);
        if (Math.abs(d - s.sentido * 270) > 0.01) continue;
        desde = Math.min(desde, t);
        hasta = Math.max(hasta, t);
      }
      if (!(desde <= s.linea - 12 + 0.01 && hasta >= s.linea + 12 - 0.01)) malos.push(`traza ${String(traza)}: la salida ${s.eje}${String(s.sentido)} en ${String(s.linea)} va de ${String(desde)} a ${String(hasta)}`);
    }
    ciudad.liberar();
  }
  comprobar('en cada traza hay tres salidas, y la cortina de glifos cubre cada pasillo de canto a canto', malos.length === 0, malos.slice(0, 5));
}

paso('la misma traza da la misma ventana');
{
  const huella = (): number => {
    const ciudad = construirLaCiudadAbierta(ciudadParaPintar(9, CODIGO_DE_LA_CIUDAD, 4), 2);
    ciudad.ventana.montarYa(-100, 60);
    const h = huellaDeLasPosiciones({ grupo: ciudad.ventana.grupo } as unknown as CiudadConstruida);
    ciudad.liberar();
    return h;
  };
  const a = huella();
  const b = huella();
  const otra = construirLaCiudadAbierta(ciudadParaPintar(10, CODIGO_DE_LA_CIUDAD, 4), 2);
  otra.ventana.montarYa(-100, 60);
  const c = huellaDeLasPosiciones({ grupo: otra.ventana.grupo } as unknown as CiudadConstruida);
  otra.liberar();
  comprobar('dos construcciones de la misma traza dan la misma ventana, y otra traza da otra', a === b && a !== c, { a, b, c });
}

/* ═══════════════════ EL RELEVO Y EL COSTE DE CADA FOTOGRAMA (revisión de rendimiento del 24-sep) ═══════════════════ */

/**
 * Un renderizador falso para el relevo: un «programa» nuevo por material que no ha visto, y `compileAsync`
 * no acaba hasta que se le dice (`acabar`). Lo que se prueba es CUÁNDO se enseña y se suelta cada ciudad, no
 * three: que three comparte los programas iguales por su clave es cosa suya.
 */
class CompiladorFalso implements Compilador {
  readonly info: { programs: { id: number }[] } = { programs: [] };
  private readonly vistos = new Set<THREE.Material>();
  private readonly pendientes: (() => void)[] = [];
  compile(objeto: THREE.Object3D): unknown {
    objeto.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      for (const x of m === undefined ? [] : Array.isArray(m) ? m : [m]) {
        if (this.vistos.has(x)) continue;
        this.vistos.add(x);
        this.info.programs.push({ id: this.info.programs.length });
      }
    });
    return undefined;
  }
  compileAsync(objeto: THREE.Object3D): Promise<unknown> {
    this.compile(objeto);
    return new Promise((r) => this.pendientes.push(() => r(undefined)));
  }
  get esperando(): number {
    return this.pendientes.length;
  }
  acabar(): void {
    for (const f of this.pendientes.splice(0)) f();
  }
}
const unaVuelta = (): Promise<void> => new Promise((r) => setImmediate(r));

/** Lo que dicen los uniformes compartidos de la ciudad y de la ventana (para ver quién los toca). */
function uniformesCompartidos(): string {
  const U = UNIFORMES_DE_LA_CIUDAD;
  const V = UNIFORMES_DE_LA_VENTANA;
  return [U.uLuzCalle.value.uuid, U.uLuzCalleCaja.value.toArray().join(','), U.uAlturas.value.uuid, U.uOclusionSuelo.value.uuid, V.uVentanaQ.value.toArray().join(','), V.uCeldasSinLejosQ.value.toArray().join(','), String(V.uFundidoQ.value)].join('|');
}

/**
 * Se entera de cuándo se suelta una ciudad: el `dispose` de las geometrías de su ventana, que son suyas (sus
 * materiales no se sueltan: se guardan con sus programas, ver `guardarLosProgramas`).
 */
function alSoltarse(c: CiudadAbiertaConstruida): { soltada: boolean } {
  const r = { soltada: false };
  for (const f of FAMILIAS) {
    c.ventana.mallas[f].malla.geometry.addEventListener('dispose', () => {
      r.soltada = true;
    });
  }
  return r;
}

paso('otro nivel a media noche y otra noche: la ciudad que viene se prepara detrás, callada, y releva compilada');
{
  /*
   * Lo que midió la revisión (24-sep): cada cambio de nivel del gobernador y cada comienzo de noche paraban el
   * juego 150-400 ms en un PC de sobremesa. Se construía la ciudad entera de golpe, se soltaba la vieja ANTES
   * de pintar la nueva (three volvía a compilar los mismos programas, esperando al compilador), se subía la
   * luz entera en un fotograma y la ventana nueva se llenaba con la prisa del principio de la noche.
   *
   * Aquí, con el relevo de verdad (`relevo.ts`) y un renderizador falso: N0 → N1 (el mismo téxel de luz),
   * N1 → N2 (otro téxel), otra noche, y una petición que se deja a medias.
   */
  const opciones: { nivel: NivelDeLaCiudad; o: OpcionesDeLaCiudadAbierta }[] = [];
  const relevo = new RelevoDeLaCiudad({
    construir: (f, n, o) => {
      opciones.push({ nivel: n, o });
      return construirLaCiudadAbierta(f, n, o);
    },
  });
  const gl = new CompiladorFalso();
  const escena = new THREE.Scene();
  escena.add(relevo.grupo);
  const pos = { x: 36, z: -52 };
  const camara = camaraEn(pos);
  let f = 0;
  /* Un subidor falso: apunta qué se sube y si fue dentro del pintado (no debe). */
  let pintando = false;
  const subidas: { readonly objeto: THREE.Object3D | THREE.Texture; readonly enElPintado: boolean }[] = [];
  relevo.ponerElSubidor({
    subirMalla: (m) => subidas.push({ objeto: m, enElPintado: pintando }),
    subirTextura: (t) => subidas.push({ objeto: t, enElPintado: pintando }),
  });
  let mayorPieza = 0;
  const fotograma = async (): Promise<void> => {
    relevo.actualizar(camara, f / 30, f);
    pintando = true;
    relevo.enElPintado(gl, escena, camara);
    pintando = false;
    f++;
    await unaVuelta();
  };
  interface Relevado {
    readonly tocados: number;
    readonly fotogramas: number;
    readonly lista: boolean;
    readonly primerasVistas: number;
    readonly esperoALaCompilacion: boolean;
    readonly soltadaEnElRelevo: boolean;
    readonly soltadaDespues: boolean;
    readonly subidaAntes: boolean;
    readonly fotogramasDeSubida: number;
    readonly nueva: CiudadAbiertaConstruida | null;
  }
  /* Prepara la pedida hasta que pide compilarse (está lista), la tiene 30 fotogramas sin que acabe de compilarse, y la deja relevar. */
  const relevar = async (): Promise<Relevado> => {
    const vieja = relevo.actual as CiudadAbiertaConstruida;
    const soltada = alSoltarse(vieja);
    const relevosAntes = relevo.relevos;
    const antes = uniformesCompartidos();
    let tocados = 0;
    let fotogramas = 0;
    while (gl.esperando === 0 && fotogramas < 3000) {
      await fotograma();
      fotogramas++;
      if (uniformesCompartidos() !== antes) tocados++;
    }
    const preparada = relevo.preparando;
    const lista = preparada?.lista === true;
    const primerasVistas = preparada?.conLuz === true ? preparada.luz.primerasVistas : -1;
    for (let k = 0; k < 30; k++) {
      await fotograma();
      if (uniformesCompartidos() !== antes) tocados++;
    }
    const esperoALaCompilacion = relevo.actual === vieja && relevo.relevos === relevosAntes;
    gl.acabar();
    await unaVuelta();
    /*
     * Compilada, se sube a trozos (en `actualizar`) y se releva en el pintado: ahí la vieja deja de pintarse, y se
     * suelta en el fotograma siguiente.
     */
    let soltadaEnElRelevo = true;
    let subidaAntes = false;
    let fotogramasDeSubida = 0;
    const desde = subidas.length;
    while (relevo.relevos === relevosAntes && fotogramasDeSubida < 400) {
      relevo.actualizar(camara, f / 30, f);
      pintando = true;
      relevo.enElPintado(gl, escena, camara);
      pintando = false;
      f++;
      fotogramasDeSubida++;
      const ya = relevo.actual;
      if (relevo.relevos !== relevosAntes && ya !== null) {
        soltadaEnElRelevo = soltada.soltada;
        const hechas = new Set(subidas.slice(desde).map((x) => x.objeto));
        const piezas = piezasPorSubir(ya);
        subidaAntes = piezas.length > FAMILIAS.length && piezas.every((q) => hechas.has('malla' in q ? q.malla : q.textura));
        for (const q of piezas) mayorPieza = Math.max(mayorPieza, q.bytes);
      }
      await unaVuelta();
    }
    const nueva = relevo.tomarLaNueva();
    await fotograma();
    return { tocados, fotogramas, lista, primerasVistas, esperoALaCompilacion, soltadaEnElRelevo, soltadaDespues: soltada.soltada, subidaAntes, fotogramasDeSubida, nueva };
  };

  const noche2 = ciudadParaPintar(6, CODIGO_DE_LA_CIUDAD, 2);
  relevo.pedir(noche2, 0);
  const a = relevo.tomarLaNueva();
  if (a === null) throw new Error('la primera ciudad no se enseñó en seguida');
  a.montarYa(pos.x, pos.z);
  for (let k = 0; k < 20; k++) await fotograma();
  const baseDeLaNoche = a.base;
  const luzDeA = a.luz;
  let luzDeASoltada = false;
  luzDeA.textura_.addEventListener('dispose', () => {
    luzDeASoltada = true;
  });
  /* Sus materiales, que al soltarla se guardan con sus programas (y el de los neones sin su atlas). */
  let materialDeASoltado = false;
  for (const f of FAMILIAS) {
    (a.ventana.mallas[f].malla.material as THREE.Material).addEventListener('dispose', () => {
      materialDeASoltado = true;
    });
  }
  const neonesDeA = a.ventana.mallas.neones.malla.material as THREE.ShaderMaterial;

  /* N0 → N1: el mismo téxel de luz. */
  relevo.pedir(noche2, 1);
  const r1 = await relevar();
  const b = r1.nueva;
  const fundidoDeN1 = UNIFORMES_DE_LA_VENTANA.uFundidoQ.value;
  /* La luz heredada no se suelta con la ciudad que la entregó (N0), sino con la última que la usa (N1). */
  const luzDeASoltadaConA = luzDeASoltada;
  const guardadosDeA = materialesGuardados('ciudad-n0');
  const atlasDeASoltado = neonesDeA.uniforms.uAtlas?.value === null;
  /* Mirado ya: cuando se suelta, una ciudad ya no tiene luz que enseñar. */
  const heredoLaLuz = b !== null && b.conLuz && b.luz === luzDeA && luzDeA.lista;
  const hablaTrasRelevar = b !== null && !b.callada;
  /* N1 → N2: otro téxel. */
  relevo.pedir(noche2, 2);
  const r2 = await relevar();
  const c = r2.nueva;
  /* Con otro téxel, la suya: en el uniforme desde el relevo. */
  const luzDeC = c !== null && c.conLuz && c.luz !== luzDeA && UNIFORMES_DE_LA_CIUDAD.uLuzCalle.value === c.luz.textura_;
  /* Otra noche, al mismo nivel. */
  const noche3 = ciudadParaPintar(6, CODIGO_DE_LA_CIUDAD, 3);
  const pasosAntes = relevo.pasosDeBase;
  relevo.pedir(noche3, 2);
  const r3 = await relevar();
  const d = r3.nueva;
  const pasosDeLaBase = relevo.pasosDeBase - pasosAntes;
  /* Una petición que se deja a medias: otro nivel, y enseguida otra vez el que se pinta. */
  const dejadasAntes = relevo.dejadas;
  relevo.pedir(noche3, 3);
  for (let k = 0; k < 3; k++) await fotograma();
  const aMedias = relevo.preparando;
  const soltadaAMedias = aMedias !== null ? alSoltarse(aMedias) : { soltada: false };
  relevo.pedir(noche3, 2);
  await fotograma();
  const usosTrasDejar = d?.base.usos ?? -1;
  const baseFinal = d?.base ?? null;
  relevo.liberar();

  const o1 = opciones[1];
  const o2 = opciones[2];
  const o3 = opciones[3];
  const resumen = [r1, r2, r3].map((r, i) => `relevo ${String(i + 1)}: lista en ${String(r.fotogramas)} fot., ${String(r.primerasVistas)} losetas del centro, uniformes tocados ${String(r.tocados)}`);
  for (const r of resumen) nota(r);
  nota(`la base de otra noche en ${String(pasosDeLaBase)} pasos; subido antes de enseñar: ${(relevo.subidos / 1048576).toFixed(1)} MB en ${[r1, r2, r3].map((r) => String(r.fotogramasDeSubida)).join(' + ')} fotogramas, ${(relevo.mayorSubida / 1048576).toFixed(1)} MB el que más`);
  comprobar(
    'otro nivel a media noche se prepara sobre la MISMA base, sin la prisa del principio y callado: no toca ningún uniforme compartido hasta relevar',
    o1?.nivel === 1 && o1.o.base === baseDeLaNoche && o1.o.prisa === false && o1.o.callada === true &&
      o2?.nivel === 2 && o2.o.base === baseDeLaNoche && o2.o.prisa === false && o2.o.callada === true &&
      baseDeLaNoche.ciudades === 3 && r1.tocados === 0 && r2.tocados === 0 && r3.tocados === 0,
    { o1: o1 && { ...o1.o, base: o1.o.base === baseDeLaNoche }, o2: o2 && { ...o2.o, base: o2.o.base === baseDeLaNoche }, ciudades: baseDeLaNoche.ciudades, tocados: [r1.tocados, r2.tocados, r3.tocados] },
  );
  comprobar(
    'la que viene no se enseña hasta estar lista (con su luz propia, las cuatro losetas del centro) y COMPILADA; la vieja deja de pintarse en el relevo y se suelta en el fotograma siguiente',
    [r1, r2, r3].every((r) => r.lista && r.esperoALaCompilacion && !r.soltadaEnElRelevo && r.soltadaDespues && r.nueva !== null) &&
      r2.primerasVistas >= LOSETAS_PARA_ENSENARSE && r3.primerasVistas >= LOSETAS_PARA_ENSENARSE && relevo.forzados === 0 &&
      relevo.grupo.children.length === 0,
    [r1, r2, r3].map((r) => ({ lista: r.lista, espero: r.esperoALaCompilacion, enElRelevo: r.soltadaEnElRelevo, despues: r.soltadaDespues, losetas: r.primerasVistas })),
  );
  comprobar(
    'compilada, la que viene se SUBE entera antes de enseñarse (sus geometrías y los mapas de su base), a trozos de 12 MB como mucho (o una pieza mayor sola) y nunca dentro del pintado',
    [r1, r2, r3].every((r) => r.subidaAntes && r.fotogramasDeSubida > 1) && subidas.length > 0 && subidas.every((x) => !x.enElPintado) &&
      relevo.mayorSubida <= Math.max(BYTES_DE_SUBIDA_POR_FOTOGRAMA, mayorPieza),
    { subidaAntes: [r1, r2, r3].map((r) => r.subidaAntes), fotogramas: [r1, r2, r3].map((r) => r.fotogramasDeSubida), enElPintado: subidas.filter((x) => x.enElPintado).length, mayorSubida: relevo.mayorSubida, mayorPieza },
  );
  comprobar(
    'con el mismo téxel la ciudad nueva HEREDA la luz entera (N0 → N1: ni se apaga ni se vuelve a hornear); con otro la hornea callada y la pone al relevar, y la luz vieja se suelta con su última ciudad',
    heredoLaLuz && !luzDeASoltadaConA && hablaTrasRelevar && fundidoDeN1 === FRANJA_DEL_FUNDIDO && o1?.o.luz === 'despues' &&
      c !== null && luzDeC && o2?.o.luz === 'propia' && luzDeASoltada,
    { heredoLaLuz, hablaTrasRelevar, luzDeASoltadaConA, fundidoDeN1, luzDeC, luzDeASoltada },
  );
  comprobar(
    'otra noche: su base se hace a pasos (uno por fotograma) mientras se pinta la de antes, su ventana con la prisa que tapa la Bajada, y la base de la noche vieja se suelta con su última ciudad',
    pasosDeLaBase >= 6 && o3?.o.base !== undefined && o3.o.base !== baseDeLaNoche && o3.o.base.fuente === noche3 && o3.o.prisa === true && o3.o.callada === true &&
      d !== null && d.fuente === noche3 && baseDeLaNoche.liberada,
    { pasosDeLaBase, prisa: o3?.o.prisa, callada: o3?.o.callada, deOtraNoche: o3?.o.base?.fuente === noche3, viejaSoltada: baseDeLaNoche.liberada },
  );
  comprobar(
    'lo que se preparaba y ya no se quiere se suelta (y deja de usar la base), y al desmontar no queda ninguna base viva',
    relevo.dejadas === dejadasAntes + 1 && aMedias !== null && soltadaAMedias.soltada && usosTrasDejar === 1 && baseFinal?.liberada === true,
    { dejadas: relevo.dejadas - dejadasAntes, aMedias: aMedias !== null, soltada: soltadaAMedias.soltada, usosTrasDejar, baseFinal: baseFinal?.liberada },
  );
  /*
   * Medido en el juego (24-sep): con lo de arriba, cada cambio de nivel aún enlazaba 22-25 programas (la ciudad y
   * el cielo), 30-40 ms esperando al compilador: three los soltaba con los materiales de la ciudad vieja.
   */
  comprobar(
    'la ciudad que se suelta GUARDA sus materiales con sus programas para la próxima de su nivel (sin soltarlos, y el de los neones sin retener el atlas de su noche)',
    guardadosDeA >= FAMILIAS.length && !materialDeASoltado && atlasDeASoltado,
    { guardadosDeA, materialDeASoltado, atlasDeASoltado },
  );
}

paso('la ciudad de otro nivel trabaja con sus topes desde el primer fotograma, y su luz nace sin subir sus ceros');
{
  /*
   * La revisión midió 2.700, 7.200, 15.500 y 31.000 triángulos por fotograma al cambiar de nivel (topes de 800,
   * 2.000, 4.000 y 8.000): la ventana nueva volvía a la prisa del principio de la noche. Y cada ciudad subía
   * sus dos texturas de luz enteras, a ceros, en su primer fotograma (2 MB en N0-N1, 8 en N2-N3).
   */
  const fuente = ciudadParaPintar(11, CODIGO_DE_LA_CIUDAD, 2);
  const base = construirLaBase(fuente);
  base.usos++;
  const malos: string[] = [];
  const conPrisa: string[] = [];
  const primeraSubida: string[] = [];
  const pos = { x: -60, z: 84 };
  const camara = camaraEn(pos);
  for (const n of NIVELES_DE_LA_CIUDAD) {
    const p = PRESUPUESTO_DE_LA_VENTANA[n];
    for (const prisa of [false, true]) {
      const ciudad = construirLaCiudadAbierta(fuente, n, { base, prisa });
      const r = ciudad.luz.textura_.updateRanges;
      if (!prisa && !(r.length === 1 && (r[0]?.count ?? Infinity) <= 4)) primeraSubida.push(`N${String(n)}: ${JSON.stringify(r)}`);
      let peor = 0;
      let peorBytes = 0;
      let peorLuz = 0;
      let peorFilas = 0;
      for (let k = 0; k < 90; k++) {
        const q = ciudad.actualizar(camara, k / 30, k);
        peor = Math.max(peor, q.ventana.escritos);
        peorBytes = Math.max(peorBytes, q.ventana.subidos);
        peorLuz = Math.max(peorLuz, q.luz.texeles);
        peorFilas = Math.max(peorFilas, q.luz.filas);
      }
      if (prisa) {
        /* La vacuna: con la prisa del principio sí se pasa del tope (si no, esto no mira nada). */
        if (peor > p.porFotograma) conPrisa.push(`N${String(n)}`);
      } else {
        if (peor > p.porFotograma) malos.push(`N${String(n)}: ${String(peor)} triángulos en un fotograma > ${String(p.porFotograma)}`);
        if (peorBytes > p.bytesPorFotograma) malos.push(`N${String(n)}: ${String(peorBytes)} bytes en un fotograma > ${String(p.bytesPorFotograma)}`);
        if (peorLuz > ciudad.luz.topeDelFotograma) malos.push(`N${String(n)}: ${String(peorLuz)} téxeles de luz > ${String(ciudad.luz.topeDelFotograma)}`);
        if (peorFilas > ciudad.luz.filasDelFotograma) malos.push(`N${String(n)}: ${String(peorFilas)} filas de luz > ${String(ciudad.luz.filasDelFotograma)}`);
      }
      ciudad.liberar();
    }
  }
  base.usos--;
  base.liberar();
  comprobar('sin prisa, la ciudad de otro nivel no pasa en ningún fotograma los topes de su ventana ni de su luz (y con la prisa del principio, sí: la vacuna)', malos.length === 0 && conPrisa.length === 4, { malos, conPrisa });
  comprobar('la luz nace con un rango de subida de un téxel: su primera subida no sube la textura entera a ceros', primeraSubida.length === 0, primeraSubida);
}

paso('los reflejos ven lo mismo que un rayo de fuerza bruta, y la ciudad quieta no deja basura');
{
  /* Cajas y fuentes al azar (con semilla) en la ciudad, y el rayo muestreado cada 2 m contra TODAS las cajas. */
  let s = 0x5eed;
  const azar = (): number => {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    return s / 4294967296;
  };
  const cajas: CajaXZ[] = [];
  for (let k = 0; k < 400; k++) {
    const x = azar() * 520 - 260;
    const z = azar() * 520 - 260;
    cajas.push({ x0: x, z0: z, x1: x + 4 + azar() * 20, z1: z + 4 + azar() * 20 });
  }
  const fuentes: FuenteDeReflejo[] = [];
  for (let k = 0; k < 500; k++) fuentes.push({ x: azar() * 540 - 270, y: 4, z: azar() * 540 - 270, tamano: 1, color: [1, 1, 1] } as unknown as FuenteDeReflejo);
  const ALCANCE = 110;
  const seVeDeVerdad = (ax: number, az: number, bx: number, bz: number): boolean => {
    const dd = Math.sqrt((bx - ax) ** 2 + (bz - az) ** 2);
    for (let i = 1; i <= Math.floor((dd - 0.8) / 2); i++) {
      const x = ax + ((bx - ax) * i * 2) / dd;
      const z = az + ((bz - az) * i * 2) / dd;
      if (cajas.some((q) => x > q.x0 && x < q.x1 && z > q.z0 && z < q.z1)) return false;
    }
    return true;
  };
  const rejilla = new RejillaDeHuellas(cajas);
  const visibles = new Float32Array(fuentes.length);
  let distintas = 0;
  let vistas = 0;
  let tapadas = 0;
  let cambiosMal = 0;
  for (let k = 0; k < 60; k++) {
    const ax = azar() * 500 - 250;
    const az = azar() * 500 - 250;
    rejilla.visibilidad(ax, az, fuentes, ALCANCE, visibles);
    if (rejilla.visibilidad(ax, az, fuentes, ALCANCE, visibles)) cambiosMal++;
    fuentes.forEach((q, i) => {
      const dentro = Math.sqrt((q.x - ax) ** 2 + (q.z - az) ** 2) < ALCANCE;
      const v = dentro && seVeDeVerdad(ax, az, q.x, q.z) ? 1 : 0;
      if (v === 1) vistas++;
      else if (dentro) tapadas++;
      if (visibles[i] !== v) distintas++;
    });
  }
  nota(`${String(vistas)} fuentes vistas y ${String(tapadas)} tapadas a su alcance, en 60 sitios`);
  comprobar('la visibilidad de los reflejos, de una vez, es la del rayo de fuerza bruta fuente a fuente (y no dice que cambió lo que no cambió)', distintas === 0 && cambiosMal === 0 && vistas > 500 && tapadas > 500, { distintas, cambiosMal, vistas, tapadas });

  /*
   * La revisión midió 3,1-10,5 KiB por fotograma con la cámara QUIETA en N0-N3 (casi todo de los reflejos:
   * números empaquetados en el montón); ahora son unos 0,2. Muestreo de V8, como `verify:quiebro-personajes`.
   */
  const { Session } = await import('node:inspector/promises');
  interface NodoDelPerfil {
    readonly selfSize: number;
    readonly children: readonly NodoDelPerfil[];
  }
  const sesion = new Session();
  sesion.connect();
  await sesion.post('HeapProfiler.enable');
  const porFotograma: string[] = [];
  const pesadas: string[] = [];
  for (const n of [0, 3] as const) {
    const ciudad = construirLaCiudadAbierta(ciudadParaPintar(5, CODIGO_DE_LA_CIUDAD, 1, [1]), n);
    const camara = camaraEn({ x: 40, z: -30 });
    /* Caliente de verdad: sin optimizar, V8 empaqueta números que optimizado no (medio KiB más de ruido). */
    let k = 0;
    for (; k < 1500; k++) ciudad.actualizar(camara, k / 30, k);
    const N = 900;
    await sesion.post('HeapProfiler.startSampling', { samplingInterval: 256, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
    for (let j = 0; j < N; j++, k++) ciudad.actualizar(camara, k / 30, k);
    const { profile } = (await sesion.post('HeapProfiler.stopSampling')) as unknown as { profile: { head: NodoDelPerfil } };
    let bytes = 0;
    const recorrer = (nodo: NodoDelPerfil): void => {
      bytes += nodo.selfSize;
      for (const h of nodo.children) recorrer(h);
    };
    recorrer(profile.head);
    const kib = bytes / N / 1024;
    porFotograma.push(`N${String(n)}: ${kib.toFixed(2)} KiB`);
    if (kib >= 1) pesadas.push(`N${String(n)}: ${kib.toFixed(2)} KiB por fotograma`);
    ciudad.liberar();
  }
  sesion.disconnect();
  nota(`quieta, por fotograma: ${porFotograma.join(', ')}`);
  comprobar('con la cámara quieta, la ciudad asigna menos de 1 KiB por fotograma (N0 y N3)', pesadas.length === 0 && porFotograma.length === 2, pesadas);
}

paso('la cortina del borde no tapa la pantalla a quien se arrima a ella');
{
  /*
   * Jugada de verdad (24-sep), con la espalda contra el borde la cámara acababa a un palmo de la cortina (o
   * dentro de su caja) y un 25 % de la imagen salía casi blanca. La ley de antes: 1,6 · (0,12 + 0,88 · cerca),
   * sin apagarse nunca. Ahora se apaga en el último metro y de cerca suma menos de la mitad.
   */
  const suave = (a0: number, a1: number, x: number): number => {
    const t = Math.min(1, Math.max(0, (x - a0) / (a1 - a0)));
    return t * t * (3 - 2 * t);
  };
  const antes = (dd: number): number => 1.6 * (0.12 + 0.88 * (1 - suave(4, 18, dd)));
  /* De pegado: la cámara acabó a 0,2 m de la cortina y el personaje a 0,9 (medido por la revisión); aquí, no de la ley. */
  const PEGADO = 0.9;
  let encendidaDePegado = 0;
  let mayor = 0;
  let mayorAntes = 0;
  for (let dd = 0; dd <= 40; dd += 0.01) {
    const v = brilloDeLaCortina(dd);
    if (dd <= PEGADO && v > 0) encendidaDePegado++;
    mayor = Math.max(mayor, v);
    mayorAntes = Math.max(mayorAntes, antes(dd));
  }
  const alHombro = brilloDeLaCortina(3.5);
  const lejos = brilloDeLaCortina(30);
  const ciudad = construirLaCiudadAbierta(ciudadParaPintar(2, CODIGO_DE_LA_CIUDAD, 1), 0);
  const sombreador = (ciudad.borde.malla.material as THREE.ShaderMaterial).fragmentShader;
  ciudad.liberar();
  const conLaLey = sombreador.includes(GLSL_DE_LA_CORTINA) && /luz = tinta \* brilloDeLaCortina\(lejos\)/.test(sombreador);
  nota(`de cerca ${mayor.toFixed(3)} (antes ${mayorAntes.toFixed(3)}), a 3,5 m ${alHombro.toFixed(3)}, a 30 m ${lejos.toFixed(3)}`);
  comprobar(
    'la cortina se apaga del todo en el último metro, de cerca suma menos de la mitad que antes, se sigue viendo desde la cámara al hombro y de lejos, y su sombreador lleva esa ley',
    encendidaDePegado === 0 && mayor <= mayorAntes / 2 && alHombro >= 0.9 * mayor && lejos > 0 && conLaLey,
    { encendidaDePegado, mayor, mayorAntes, alHombro, lejos, conLaLey },
  );
}

terminar({
  escritas: 106,
  enVerde:
    'El barrio se construye, cabe, pinta su estructura y nada más; la ciudad abierta cabe en el 50 % en sus 32 trazas, pinta celda a celda su estructura en cada nivel y cada grado (con los neones y las capas), trabaja a trozos contados con las llamadas quietas al cruzarla, su luz por losetas es la de una vez y su borde de glifos cubre las tres salidas sin tapar la pantalla; y la ciudad de otro nivel o de otra noche se prepara detrás, callada y sin prisa, y releva compilada, sin dejar basura quieta. Y lo que el detalle va a cambiar ya tiene quien lo mire: ni una cara al revés nueva, las reglas gemelas iguales en GLSL y JS, la Grafía la última, la memoria en sus topes, toda textura subida en el relevo, las fuentes de luz iguales en todo grado, ningún escritor de pieza por encima del trozo y cada capa con las llamadas que declara.',
});
