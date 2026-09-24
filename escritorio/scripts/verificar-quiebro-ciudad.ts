/**
 * EL COMPROBADOR DE LA CIUDAD DEL QUIEBRO: `npx tsx scripts/verificar-quiebro-ciudad.ts`.
 *
 * ═══ QUÉ DEMUESTRA ═══
 *
 *   1. LA CIUDAD SE CONSTRUYE para 50 barrios de verdad (`barrioDeLaNoche`) en los cuatro niveles, sin
 *      lanzar y sin un solo NaN ni infinito en ningún atributo de ninguna geometría.
 *   2. CABE: lo que MIDE cada pieza (triángulos × instancias, una llamada por malla) cabe en el renglón
 *      que declara `presupuesto.ts`, y la suma —con la atmósfera y las pasadas de sombra— cabe en el
 *      60 % de los topes del juego (N0 150k/60 … N3 1,5M/250). Y lo declarado cabe en la cuota.
 *   3. LO PINTADO ES LA ESTRUCTURA, mirado en la GEOMETRÍA y no en las listas: se toman los triángulos
 *      de lo que estorba (fachadas, mobiliario, coches, cristal, luces) que caen en la franja de andar
 *      (de 0,2 a 1,9 m) dentro del barrio, y
 *        · ninguno queda fuera de las cajas de la estructura (nada pintado que estorbe sin chocar), y
 *        · toda caja tiene algo pintado: de 12 rayos que la buscan desde fuera (cuatro lados, tres
 *          alturas), alguno toca un triángulo dentro de ella (ninguna caja invisible).
 *   4. ES DETERMINISTA: el mismo barrio da la misma geometría dos veces (una huella de las posiciones).
 *   5. EL PARCHEO ENCUENTRA SUS TROZOS en los sombreadores de three r185: se aplica cada
 *      `onBeforeCompile` de verdad sobre el texto de `ShaderLib` y no se apunta ningún fallo.
 *
 * ═══ POR QUÉ LA GEOMETRÍA Y NO LAS HUELLAS QUE DEVUELVEN LOS CONSTRUCTORES ═══
 *
 * Los constructores apuntan en `estorba` las cajas del barrio que pintan; comparar eso con la
 * estructura sería comparar la lista consigo misma. Aquí se mira lo que de verdad se dibuja: si un
 * banco crece un respaldo fuera de su caja o un coche se pinta girado, sale en los triángulos.
 *
 * Cada comprobación se vio en ROJO rompiendo a propósito una copia (ver el informe del frente).
 */
import * as THREE from 'three';
import { arnes } from '../../server/scripts/arnes';
import { planoDelBarrio } from '../src/quiebro/ciudad/plano';
import { construirLaCiudad } from '../src/quiebro/ciudad/construir';
import type { CiudadConstruida } from '../src/quiebro/ciudad/construir';
import { atributoRoto } from '../src/quiebro/ciudad/geometria';
import { presupuestoDeLaCiudad, sumaDeLoDeclarado, topeDeLaCiudad } from '../src/quiebro/ciudad/presupuesto';
import type { CajaXZ, NivelDeLaCiudad, PlanoDeLaCiudad } from '../src/quiebro/ciudad/tipos';
import { NIVELES_DE_LA_CIUDAD } from '../src/quiebro/ciudad/tipos';
import { FALLOS_DEL_PARCHEO } from '../src/quiebro/atmosfera/parcheo';
import { materialesDe } from '../src/quiebro/atmosfera/parcheo';

const { comprobar, paso, nota, terminar } = arnes();

const SEMILLAS = 50;
/** La franja de andar: por encima del bordillo y por debajo de la cabeza. */
const FRANJA: readonly [number, number] = [0.2, 1.9];
/** Tolerancia al comparar con las cajas (las caras de un muro caen justo en el borde). */
const HOLGURA = 0.03;
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

interface Tri {
  readonly a: THREE.Vector3;
  readonly b: THREE.Vector3;
  readonly c: THREE.Vector3;
}

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

/** El polígono del triángulo recortado a la franja de andar (Sutherland-Hodgman en y). */
function recortarALaFranja(t: Tri): THREE.Vector3[] {
  let poli = [t.a, t.b, t.c];
  for (const [limite, dentroSi] of [
    [FRANJA[0], (y: number) => y >= FRANJA[0]],
    [FRANJA[1], (y: number) => y <= FRANJA[1]],
  ] as const) {
    const nuevo: THREE.Vector3[] = [];
    for (let i = 0; i < poli.length; i++) {
      const p = poli[i] as THREE.Vector3;
      const q = poli[(i + 1) % poli.length] as THREE.Vector3;
      const pd = dentroSi(p.y);
      const qd = dentroSi(q.y);
      if (pd) nuevo.push(p);
      if (pd !== qd && Math.abs(q.y - p.y) > 1e-9) nuevo.push(p.clone().lerp(q, (limite - p.y) / (q.y - p.y)));
    }
    poli = nuevo;
    if (poli.length === 0) break;
  }
  return poli;
}

function dentroDeAlguna(x: number, z: number, cajas: readonly CajaXZ[]): boolean {
  for (const c of cajas) {
    if (x >= c.x0 - HOLGURA && x <= c.x1 + HOLGURA && z >= c.z0 - HOLGURA && z <= c.z1 + HOLGURA) return true;
  }
  return false;
}

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

/* ─────────────────────────── Los rayos que buscan cada caja ─────────────────────────── */

class RejillaDeTriangulos {
  private readonly celda = 4;
  private readonly mapa = new Map<string, Tri[]>();

  constructor(tris: readonly Tri[]) {
    for (const t of tris) {
      const x0 = Math.floor(Math.min(t.a.x, t.b.x, t.c.x) / this.celda);
      const x1 = Math.floor(Math.max(t.a.x, t.b.x, t.c.x) / this.celda);
      const z0 = Math.floor(Math.min(t.a.z, t.b.z, t.c.z) / this.celda);
      const z1 = Math.floor(Math.max(t.a.z, t.b.z, t.c.z) / this.celda);
      for (let i = x0; i <= x1; i++) {
        for (let k = z0; k <= z1; k++) {
          const clave = `${String(i)},${String(k)}`;
          const lista = this.mapa.get(clave);
          if (lista === undefined) this.mapa.set(clave, [t]);
          else lista.push(t);
        }
      }
    }
  }

  cerca(x0: number, z0: number, x1: number, z1: number): Set<Tri> {
    const salida = new Set<Tri>();
    for (let i = Math.floor(Math.min(x0, x1) / this.celda); i <= Math.floor(Math.max(x0, x1) / this.celda); i++) {
      for (let k = Math.floor(Math.min(z0, z1) / this.celda); k <= Math.floor(Math.max(z0, z1) / this.celda); k++) {
        for (const t of this.mapa.get(`${String(i)},${String(k)}`) ?? []) salida.add(t);
      }
    }
    return salida;
  }
}

const rayo = new THREE.Ray();
const golpe = new THREE.Vector3();

/** ¿Tiene esta caja algo pintado? 12 rayos desde fuera hacia su centro, a tres alturas. */
function cajaPintada(c: CajaXZ, rejilla: RejillaDeTriangulos): boolean {
  const cx = (c.x0 + c.x1) / 2;
  const cz = (c.z0 + c.z1) / 2;
  const salidas: readonly (readonly [number, number])[] = [
    [c.x0 - 0.6, cz],
    [c.x1 + 0.6, cz],
    [cx, c.z0 - 0.6],
    [cx, c.z1 + 0.6],
  ];
  const cercanos = rejilla.cerca(c.x0 - 1, c.z0 - 1, c.x1 + 1, c.z1 + 1);
  for (const y of [0.3, 0.9, 1.5]) {
    for (const [sx, sz] of salidas) {
      rayo.origin.set(sx, y, sz);
      rayo.direction.set(cx - sx, 0, cz - sz).normalize();
      for (const t of cercanos) {
        const p = rayo.intersectTriangle(t.a, t.b, t.c, false, golpe);
        if (p === null) continue;
        if (p.x >= c.x0 - HOLGURA && p.x <= c.x1 + HOLGURA && p.z >= c.z0 - HOLGURA && p.z <= c.z1 + HOLGURA) return true;
      }
    }
  }
  return false;
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

terminar({ escritas: 16, enVerde: 'La ciudad se construye, cabe, pinta su estructura y nada más, y es la misma en todos los aparatos.' });
