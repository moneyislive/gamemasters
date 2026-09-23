/**
 * ¿ANDAN POR EL MISMO BURGO TODOS LOS DE UNA MESA, SEA CUAL SEA SU APARATO?
 *
 *   npm run verify:burgo-mundo
 *
 * ═══ POR QUÉ EXISTE ═══
 *
 * La ciudad del Burgo se levanta con `ciudadDelCodigo(código, recinto, calidad)`, y la `calidad`
 * la decide cada aparato con sus primeros 120 fotogramas: en sobria hay 2.808 obstáculos menos.
 * Si el mundo con el que se choca saliera de ahí, dos personas en la misma mesa andarían dos
 * Burgos distintos, cada uno coherente consigo mismo, y cualquier comprobador que mirara una sola
 * calidad pasaría en las dos. Por eso la ESTRUCTURA —la traza, los edificios, lo sólido de los
 * distritos— se mudó a `shared/` y el mundo (`mundoDelBurgo`) no recibe la calidad; y por eso
 * este comprobador saca el mundo de lo que la escena PINTA en plena y en sobria, y exige que las
 * dos coincidan con el declarado. Ésa es su razón de ser; lo demás es lo que hace falta para
 * creérsela.
 *
 * ═══ LO QUE AFIRMA, EN OCHO PASOS ═══
 *
 *  1. La ciudad de la escena es, bit a bit, la de ANTES de mudar la traza: la huella de diez
 *     ciudades (cinco mesas, dos calidades) está congelada aquí.
 *  2. El mundo es contrato: canoniza, y se dice cuánto pesa.
 *  3. El mundo que se deduce de lo que la escena pinta es el MISMO en plena y en sobria, y es el
 *     declarado, caja a caja. Toda clase de bulto que la escena pinte tiene que estar clasificada
 *     (suelo, aire, sólido, adorno): una nueva sin clasificar pone esto en rojo, porque es una
 *     decisión —¿se choca con ella?— que alguien tiene que tomar.
 *  4. Hay cuerpos, tantos como edificios y lo sólido de los distritos, y ninguno fuera del tablero.
 *  5. Donde se nace hay suelo y no hay cuerpo, los sitios están repartidos y ninguno mira a una
 *     pared.
 *  6. Un paseante que se echa encima de un edificio se queda en la fachada, y eso se cuenta.
 *  7. Los números que `shared/` tuvo que copiar de la escena siguen siendo los de la escena.
 *  8. El mundo de cuatro mesas —levantado DENTRO de cada motor— y un paseo largo por cada uno dan
 *     la misma huella en Node y en Hermes.
 *
 * ═══ LOS SUELOS ═══
 *
 * Un paseante al que no para nada da la misma huella en los dos motores y no se mete en ningún
 * edificio: el verde por conjunto vacío. Así que antes de dar nada por bueno se exige que los
 * cuerpos HAYAN PARADO al que anda —en el paseo y en las embestidas, contados aparte del borde—, y
 * que el borde también lo haya parado. Y el paso 3 lleva su vacuna dentro: la misma comparación,
 * con una nave quitada de la ciudad de sobria, tiene que salir distinta.
 *
 * ═══ CÓMO SE HA VISTO ROJO CADA PASO ═══ (rompiendo una copia y volviéndola a poner con `cp`)
 *
 *  1. Un color de la nave del centro comercial cambiado en `ciudad.ts` → las diez huellas rojas.
 *  2. Un cuerpo con `NaN` en `mundoDeLaSemilla` → «el mundo canoniza» rojo.
 *  3. El polígono sin su segunda nave en sobria (`ciudad.ts`) → plena y sobria difieren.
 *  4. El pedestal corrido 1.000 → «ninguno fuera del tablero» rojo.
 *  5. Un sitio de nacer en el centro de la glorieta, dentro del pedestal → rojo.
 *  6. El mundo sin cuerpos → las embestidas atraviesan las fachadas y los suelos caen.
 *  7. El filete del anillo a 8 en `shared/` → la línea de la marcha no es la de la escena.
 *  8. Una clausura sobre el `let` de un bucle en el paseo, que Hermes 0.12 no liga por iteración
 *     → Node y Hermes dan huellas distintas.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RADIO_DEL_PASEANTE, rumboDeRadianes } from '../../shared/mecanicas/andar';
import { canonico, porQueNoEsCanonico } from '../../shared/mecanicas/canonico';
import { arenaDe, chocaConCuerpo, hayPiso } from '../../shared/mecanicas/mundo';
import type { Arena, Cuerpo, MundoDeclarado } from '../../shared/mecanicas/mundo';
import { semillaDelCodigo } from '../../shared/mecanicas/semilla';
import {
  CASILLAS_POR_LADO_DEL_BURGO,
  FILETE_DE_LA_CASILLA,
  FONDO_DE_CASILLA_DEL_BURGO,
  FRANJA_DEL_BARRIO,
  ANCHO_DE_CASILLA_DEL_BURGO,
  LADO_DEL_TABLERO_DEL_BURGO,
  LINEA_DE_LA_MARCHA_DEL_BURGO,
  MEDIO_LADO_DEL_BURGO,
  NACE_EN_EL_BURGO,
  cajaDelEdificio,
  mundoDelBurgo,
  mundoDeLaSemilla,
} from '../../shared/arcade/juegos/burgo-mundo';
import { ALTURA_DE_PLANTA_DEL_BURGO, CUERPO_DEL_MODELO, RETICULA_DEL_BURGO, trazaDelBurgo, vectorDelRumbo } from '../../shared/arcade/juegos/burgo-traza';
import type { EdificioDelBurgo } from '../../shared/arcade/juegos/burgo-traza';
import { embestir, enFijo, paseoDelBurgo, CODIGOS_DEL_PASEO } from './paseo-del-burgo';
import type { MundoResumido } from './paseo-del-burgo';
import { ALTURA_DEL_BORDILLO, LADO_DEL_RECINTO, RECINTO_DEL_BURGO, ciudadDelCodigo, giraElPunto } from '../../escenas/burgo/ciudad';
import type { BultoPropio, LaCiudad } from '../../escenas/burgo/ciudad';
import { ALTURA_DE_PLANTA, PIEZA, RETICULA_DE_LA_CIUDAD } from '../../escenas/burgo/piezas';
import { BANDA, CASILLAS_POR_LADO, FONDO_DE_CASILLA, ANCHO_DE_CASILLA, LADO_INTERIOR, LINEA_DE_LA_MARCHA, MEDIO_LADO, marcoDeCasilla } from '../../escenas/burgo/anillo-en-3d';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(AQUI, '..', '..');

const fallos: string[] = [];
let hechas = 0;

function comprobar(que: string, bien: boolean, detalle?: unknown): void {
  hechas++;
  if (bien) return;
  const cola = detalle === undefined ? '' : ` — ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle).slice(0, 600)}`;
  fallos.push(`${que}${cola}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

const sha = (texto: string): string => createHash('sha256').update(texto).digest('hex').slice(0, 16);
const CALIDADES = ['plena', 'sobria'] as const;

// ---------------------------------------------------------------------------
paso('1 · La ciudad que pinta la escena es, bit a bit, la de antes de mudar la traza a shared/');
// ---------------------------------------------------------------------------

/*
 * LA HUELLA DE ANTES, congelada el 23-sep-2026 con `escenas/burgo/ciudad.ts` tal como estaba antes
 * de mudar la traza (sha-256 del JSON de la ciudad entera y de tres de sus partes, en sus 16
 * primeras cifras). Se sacaron 94 ciudades —27 mesas y las 20 semillas de `verify:la-ciudad`, en
 * las dos calidades— y las 94 salieron idénticas después; aquí se guardan diez.
 *
 * SI HAS CAMBIADO LA CIUDAD A PROPÓSITO, esto se pone rojo y tiene que ponerse: lo que dice es que
 * la ciudad de hoy ya no es aquélla. Mira qué parte ha cambiado —si es `celdas`, `edificios` o
 * `volumenes`, has movido la TRAZA, y con ella el mundo con el que se choca; si no, mira el paso
 * 3, que dice si lo que cambió es sólido—, y renueva las huellas con
 * `npm run verify:burgo-mundo -w server -- --huellas`, que las escribe listas para pegar,
 * diciéndolo en el mensaje del cambio.
 */
const HUELLAS_DE_ANTES: Readonly<Record<string, { todo: string; celdas: string; edificios: string; volumenes: string }>> = {
  'QWXYZ|plena': { todo: '237f9f646b6dc4b9', celdas: '0b2153f60476c3d1', edificios: '8ec66b8f3bdd0039', volumenes: 'dd6b97a7ba21e036' },
  'QWXYZ|sobria': { todo: 'f732922d7900ea4a', celdas: '0b2153f60476c3d1', edificios: '8ec66b8f3bdd0039', volumenes: 'dd6b97a7ba21e036' },
  '|plena': { todo: '4884deb1e9521f1c', celdas: '7bb3f8c7694a5032', edificios: '486fccb63b9be9e2', volumenes: 'a546a295e9f27923' },
  '|sobria': { todo: '4b1edfa62618bf38', celdas: '7bb3f8c7694a5032', edificios: '486fccb63b9be9e2', volumenes: 'a546a295e9f27923' },
  '39KG2|plena': { todo: '05cf33e5782f70b3', celdas: 'e6282ba9f4695c6c', edificios: 'f634678dd6efcea3', volumenes: '0c9ba32cba686b34' },
  '39KG2|sobria': { todo: 'b1caf689ef6c0e06', celdas: 'e6282ba9f4695c6c', edificios: 'f634678dd6efcea3', volumenes: '0c9ba32cba686b34' },
  '97L5F|plena': { todo: 'd02365b48fc3ce50', celdas: '96412c72a374a90f', edificios: '9187e4cdabf0dd34', volumenes: 'b796c5f53cbe9bf0' },
  '97L5F|sobria': { todo: 'a4d53fb7c0d5af12', celdas: '96412c72a374a90f', edificios: '9187e4cdabf0dd34', volumenes: 'b796c5f53cbe9bf0' },
  'GLM4N|plena': { todo: 'a91412cc280e3b4b', celdas: '3185683a9cb35e81', edificios: 'f6f949460de52abb', volumenes: '8e2e95c910ecfffc' },
  'GLM4N|sobria': { todo: '869c1d4e131133fa', celdas: '3185683a9cb35e81', edificios: 'f6f949460de52abb', volumenes: '8e2e95c910ecfffc' },
};

const pedirHuellas = process.argv.includes('--huellas');
{
  const nuevas: string[] = [];
  const distintas: string[] = [];
  for (const clave of Object.keys(HUELLAS_DE_ANTES)) {
    const [codigo, calidad] = clave.split('|') as [string, 'plena' | 'sobria'];
    const c = ciudadDelCodigo(codigo === '' ? null : codigo, RECINTO_DEL_BURGO, calidad);
    const hoy = { todo: sha(JSON.stringify(c)), celdas: sha(JSON.stringify(c.celdas)), edificios: sha(JSON.stringify(c.edificios)), volumenes: sha(JSON.stringify(c.volumenes)) };
    nuevas.push(`  '${clave}': { todo: '${hoy.todo}', celdas: '${hoy.celdas}', edificios: '${hoy.edificios}', volumenes: '${hoy.volumenes}' },`);
    const antes = HUELLAS_DE_ANTES[clave] as { todo: string; celdas: string; edificios: string; volumenes: string };
    if (hoy.todo !== antes.todo) {
      const partes = (['celdas', 'edificios', 'volumenes'] as const).filter((p) => hoy[p] !== antes[p]);
      distintas.push(`${clave}: ${partes.length === 0 ? 'la traza y los edificios son los de antes; ha cambiado otra cosa —los distritos, el mobiliario, los coches—, y si es sólida lo dice el paso 3' : `ha cambiado la TRAZA: ${partes.join(', ')}`}`);
    }
  }
  if (pedirHuellas) console.log(`\n  Las huellas de hoy, para pegar en HUELLAS_DE_ANTES:\n${nuevas.join('\n')}\n`);
  comprobar(`las ${Object.keys(HUELLAS_DE_ANTES).length} ciudades congeladas (cinco mesas, plena y sobria) son las de antes de mudar la traza`, distintas.length === 0, distintas);
  console.log(`  ${Object.keys(HUELLAS_DE_ANTES).length - distintas.length} de ${Object.keys(HUELLAS_DE_ANTES).length} ciudades idénticas a las de antes`);
}

// ---------------------------------------------------------------------------
paso('2 · El mundo es contrato: canoniza, y se dice cuánto pesa');
// ---------------------------------------------------------------------------

/** Las mesas del comprobador: las congeladas, las del paseo y un puñado más, para que el reparto de distritos varíe. */
const CODIGOS: readonly string[] = [...new Set(['QWXYZ', '', '39KG2', '97L5F', 'GLM4N', ...CODIGOS_DEL_PASEO, 'ZZZZZ', 'AB12C', 'H8K3M', 'P2Q9R', 'T5V7W'])];

const mundos = new Map<string, MundoDeclarado>();
for (const codigo of CODIGOS) mundos.set(codigo, mundoDelBurgo(codigo));

/** El mundo canonizado, o `null` si no canoniza: un mundo roto tiene que salir en rojo, no tumbar el comprobador. */
function textoDe(mundo: MundoDeclarado): string | null {
  return porQueNoEsCanonico(mundo) === null ? canonico(mundo) : null;
}

{
  const noCanonizan: unknown[] = [];
  let peso = 0;
  let cuerposMin = Infinity;
  let cuerposMax = 0;
  for (const [codigo, mundo] of mundos) {
    const porQue = porQueNoEsCanonico(mundo);
    if (porQue !== null) noCanonizan.push({ codigo, porQue });
    else peso = Math.max(peso, canonico(mundo).length);
    cuerposMin = Math.min(cuerposMin, mundo.cuerpos.length);
    cuerposMax = Math.max(cuerposMax, mundo.cuerpos.length);
  }
  comprobar(`el mundo de las ${mundos.size} mesas canoniza`, noCanonizan.length === 0, noCanonizan.slice(0, 2));
  comprobar('y canonizado no es una cadena vacía', peso > 10000, { peso });
  console.log(`  de ${String(cuerposMin)} a ${String(cuerposMax)} cuerpos por mesa · el más pesado, ${(peso / 1024).toFixed(1)} kB canonizado`);
  const portada = mundos.get('') as MundoDeclarado;
  comprobar('el suelo es UNA casilla de 864 centrada en el origen: el tablero entero', portada.lado === 864 && portada.pisables.length === 1 && portada.pisables[0]?.x === 0 && portada.pisables[0]?.y === 0, { lado: portada.lado, pisables: portada.pisables });
  comprobar('y el Burgo no tiene vados: `vados: []`', portada.vados.length === 0);
  const deQwxyz = textoDe(mundos.get('QWXYZ') as MundoDeclarado);
  const deLaPortada = textoDe(portada);
  comprobar('la misma mesa da el mismo mundo: el código en minúsculas también', deQwxyz !== null && textoDe(mundoDelBurgo('qwxyz')) === deQwxyz);
  comprobar('y la portada es la semilla 1, la de `ciudadDelCodigo`', deLaPortada !== null && textoDe(mundoDeLaSemilla(1)) === deLaPortada && semillaDelCodigo('', 1) === 1);
  comprobar('y otra mesa, otro mundo', deQwxyz !== null && deLaPortada !== null && deQwxyz !== deLaPortada);
}

// ---------------------------------------------------------------------------
paso('3 · El mundo que se deduce de lo que PINTA la escena es el mismo en plena y en sobria, y es el declarado');
// ---------------------------------------------------------------------------

/**
 * LA CAJA DE LO QUE SE PINTA, con la cuenta de la ESCENA: los cuatro picos de su huella girados
 * con `giraElPunto` —el giro en radianes, con su seno y su coseno— y no con el rumbo exacto que
 * usa `burgo-mundo.ts`. Si las dos cuentas no coinciden, una de las dos se equivoca de giro.
 */
function cajaGirada(cx: number, cz: number, giro: number, ancho: number, desde: number, hasta: number): Cuerpo {
  const esquinas = [
    giraElPunto(-ancho / 2, desde, giro),
    giraElPunto(ancho / 2, desde, giro),
    giraElPunto(-ancho / 2, hasta, giro),
    giraElPunto(ancho / 2, hasta, giro),
  ];
  return {
    x0: cx + Math.min(...esquinas.map((p) => p.x)),
    z0: cz + Math.min(...esquinas.map((p) => p.z)),
    x1: cx + Math.max(...esquinas.map((p) => p.x)),
    z1: cz + Math.max(...esquinas.map((p) => p.z)),
  };
}

/**
 * QUÉ ES CADA CLASE DE BULTO QUE PINTA LA CIUDAD, para quien anda por ella. La lista es cerrada a
 * propósito: una clase nueva sin clasificar pone el paso en rojo.
 */
const SUELO = new Set(['pradera', 'tierra', 'asfalto', 'cesped', 'plaza-de-aparcamiento', 'pista-de-colegio', 'jardin', 'isleta', 'anden', 'forjado']);
const EN_EL_AIRE = new Set(['marquesina', 'porche', 'toldo', 'brazo-de-grua']);
const SOLIDO = new Set(['nave', 'gradas', 'pilar', 'surtidor', 'pedestal']);
/** Lo que es de pintar aunque parezca estructura: el templete y el estanque salen en otro sitio en sobria. */
const ADORNO = new Set(['templete', 'estanque']);
/** El agua del canal, sus cantiles (los de cota baja) y sus puentes: se deduce la banda menos los puentes. */
const DEL_CANAL = new Set(['agua', 'puente']);

/** Lo más alto a lo que puede estar la base de algo para que se pise alrededor de ello: un andén sobre la acera. */
const COTA_DE_LO_QUE_SE_PISA = ALTURA_DEL_BORDILLO + 0.6 + 1e-9;

interface Deduccion {
  readonly cuerpos: Cuerpo[];
  readonly sinClasificar: string[];
  readonly canales: number;
}

function cuerposPintados(c: LaCiudad, bultos: readonly BultoPropio[] = c.fachadas): Deduccion {
  const cuerpos: Cuerpo[] = [];
  const sinClasificar: string[] = [];
  /* Los edificios: su cáscara del pack con la caja medida del modelo, o su prisma si es torre. */
  let conCascara = 0;
  for (const e of c.edificios) {
    if (e.cascara === null) {
      cuerpos.push(cajaGirada(e.centro.x, e.centro.z, e.giro, e.ancho, -e.fondo / 2, e.fondo / 2));
      continue;
    }
    conCascara++;
    const m = CUERPO_DEL_MODELO[e.cascara] as { ancho: number; fondo: number; frente: number };
    cuerpos.push(cajaGirada(e.centro.x, e.centro.z, e.giro, m.ancho, m.frente - m.fondo, m.frente));
  }
  /*
   * Las cáscaras de los distritos: las que van detrás de las de los edificios en `volumenes`. Que
   * las de los edificios van primero y en su orden se comprueba, porque la deducción cuelga de ello.
   */
  const deEdificios = c.edificios.filter((e) => e.cascara !== null);
  for (let k = 0; k < deEdificios.length; k++) {
    const e = deEdificios[k] as LaCiudad['edificios'][number];
    const p = c.volumenes[k];
    if (p === undefined || p.pieza !== e.cascara || p.x !== e.centro.x || p.z !== e.centro.z) {
      sinClasificar.push(`la cáscara ${String(k)} de volumenes no es la del edificio ${String(e.indice)}`);
      break;
    }
  }
  for (const p of c.volumenes.slice(conCascara)) {
    const m = CUERPO_DEL_MODELO[p.pieza] as { ancho: number; fondo: number; frente: number } | undefined;
    if (m === undefined) {
      sinClasificar.push(`volumen ${p.pieza}`);
      continue;
    }
    cuerpos.push(cajaGirada(p.x, p.z, p.giro, m.ancho, m.frente - m.fondo, m.frente));
  }
  /* Los bultos. */
  const delCanal: BultoPropio[] = [];
  const puentes: BultoPropio[] = [];
  for (const b of bultos) {
    if (b.clase === 'torre' || SUELO.has(b.clase) || EN_EL_AIRE.has(b.clase) || ADORNO.has(b.clase)) continue;
    if (b.clase === 'cantil') {
      /* El muro del estadio va sobre la acera; los cantiles del canal, por debajo, junto al agua. */
      if (b.y < ALTURA_DEL_BORDILLO) delCanal.push(b);
      else cuerpos.push(cajaGirada(b.x, b.z, b.giro, b.ancho, -b.fondo / 2, b.fondo / 2));
      continue;
    }
    if (DEL_CANAL.has(b.clase)) {
      if (b.clase === 'puente') puentes.push(b);
      else delCanal.push(b);
      continue;
    }
    if (SOLIDO.has(b.clase)) {
      if (b.y <= COTA_DE_LO_QUE_SE_PISA) cuerpos.push(cajaGirada(b.x, b.z, b.giro, b.ancho, -b.fondo / 2, b.fondo / 2));
      continue;
    }
    sinClasificar.push(b.clase);
  }
  /* El canal: la banda de su agua y sus cantiles, menos lo que ocupan sus puentes a lo largo. */
  const canales = delCanal.filter((b) => b.clase === 'agua').length;
  if (delCanal.length > 0) {
    const cajas = delCanal.map((b) => cajaGirada(b.x, b.z, b.giro, b.ancho, -b.fondo / 2, b.fondo / 2));
    const banda = { x0: Math.min(...cajas.map((k) => k.x0)), z0: Math.min(...cajas.map((k) => k.z0)), x1: Math.max(...cajas.map((k) => k.x1)), z1: Math.max(...cajas.map((k) => k.z1)) };
    const enX = banda.x1 - banda.x0 >= banda.z1 - banda.z0;
    const cortes = puentes
      .map((b) => cajaGirada(b.x, b.z, b.giro, b.ancho, -b.fondo / 2, b.fondo / 2))
      .map((k) => (enX ? [k.x0, k.x1] : [k.z0, k.z1]) as [number, number])
      .sort((a, b) => a[0] - b[0]);
    let desde = enX ? banda.x0 : banda.z0;
    const trozo = (a: number, b: number): void => {
      if (b > a) cuerpos.push(enX ? { x0: a, z0: banda.z0, x1: b, z1: banda.z1 } : { x0: banda.x0, z0: a, x1: banda.x1, z1: b });
    };
    for (const [a, b] of cortes) {
      trozo(desde, a);
      desde = Math.max(desde, b);
    }
    trozo(desde, enX ? banda.x1 : banda.z1);
  }
  return { cuerpos, sinClasificar, canales };
}

/** Dos listas de cajas son la misma si se pueden emparejar una a una a menos de una millonésima. */
function mismasCajas(a: readonly Cuerpo[], b: readonly Cuerpo[]): { iguales: boolean; sobranEnA: Cuerpo[]; sobranEnB: Cuerpo[] } {
  const usada: boolean[] = b.map(() => false);
  const sobranEnA: Cuerpo[] = [];
  const cerca = (x: Cuerpo, y: Cuerpo): boolean => Math.abs(x.x0 - y.x0) < 1e-6 && Math.abs(x.z0 - y.z0) < 1e-6 && Math.abs(x.x1 - y.x1) < 1e-6 && Math.abs(x.z1 - y.z1) < 1e-6;
  for (const x of a) {
    let hallada = -1;
    for (let k = 0; k < b.length; k++) {
      if (usada[k] === true) continue;
      if (cerca(x, b[k] as Cuerpo)) {
        hallada = k;
        break;
      }
    }
    if (hallada < 0) sobranEnA.push(x);
    else usada[hallada] = true;
  }
  const sobranEnB = b.filter((_, k) => usada[k] !== true);
  return { iguales: sobranEnA.length === 0 && sobranEnB.length === 0, sobranEnA, sobranEnB };
}

{
  const distintos: unknown[] = [];
  const sinClasificar = new Set<string>();
  let comparadas = 0;
  let cuerposComparados = 0;
  let canales = 0;
  let templetesQueSeMueven = 0;
  for (const codigo of CODIGOS) {
    const mundo = mundos.get(codigo) as MundoDeclarado;
    const pintadas: Cuerpo[][] = [];
    const templetes: string[] = [];
    for (const calidad of CALIDADES) {
      const ciudad = ciudadDelCodigo(codigo === '' ? null : codigo, RECINTO_DEL_BURGO, calidad);
      const d = cuerposPintados(ciudad);
      for (const s of d.sinClasificar) sinClasificar.add(s);
      canales += d.canales;
      pintadas.push(d.cuerpos);
      templetes.push(JSON.stringify(ciudad.fachadas.filter((b) => ADORNO.has(b.clase)).map((b) => [b.x, b.z])));
      const m = mismasCajas(d.cuerpos, mundo.cuerpos);
      comparadas++;
      cuerposComparados += d.cuerpos.length;
      if (!m.iguales) distintos.push({ codigo, calidad, pintadas: d.cuerpos.length, declaradas: mundo.cuerpos.length, sobranPintadas: m.sobranEnA.slice(0, 2), sobranDeclaradas: m.sobranEnB.slice(0, 2) });
    }
    if (templetes[0] !== templetes[1]) templetesQueSeMueven++;
    const entreCalidades = mismasCajas(pintadas[0] as Cuerpo[], pintadas[1] as Cuerpo[]);
    if (!entreCalidades.iguales) distintos.push({ codigo, que: 'plena y sobria pintan estructuras distintas', soloEnPlena: entreCalidades.sobranEnA.slice(0, 2), soloEnSobria: entreCalidades.sobranEnB.slice(0, 2) });
  }
  console.log(`  ${String(comparadas)} ciudades pintadas (${String(CODIGOS.length)} mesas × plena y sobria) · ${String(cuerposComparados)} cajas deducidas y emparejadas · ${String(canales / 2)} canales`);
  console.log(`  el templete y el estanque del parque cambian de sitio con la calidad en ${String(templetesQueSeMueven)} de ${String(CODIGOS.length)} mesas: por eso no están`);
  comprobar('toda clase de bulto que pinta la ciudad está clasificada: suelo, aire, sólido, canal o adorno', sinClasificar.size === 0, [...sinClasificar]);
  comprobar(`en las ${String(CODIGOS.length)} mesas, lo sólido que pinta la escena en PLENA y en SOBRIA es lo mismo, y es el mundo declarado caja a caja`, distintos.length === 0, distintos.slice(0, 3));
  comprobar('y el reparto de las mesas trae canal en alguna: el recorte de los puentes se ha mirado', canales > 0, { canales });

  /*
   * LA VACUNA: la misma deducción sobre una ciudad de sobria a la que se le ha quitado una nave
   * —lo que pasaría si alguien pusiera la estructura a depender de la calidad— tiene que NO casar.
   */
  const sobria = ciudadDelCodigo('QWXYZ', RECINTO_DEL_BURGO, 'sobria');
  const primeraNave = sobria.fachadas.findIndex((b) => b.clase === 'nave');
  const sinNave = sobria.fachadas.filter((_, k) => k !== primeraNave);
  const vacunada = mismasCajas(cuerposPintados(sobria, sinNave).cuerpos, (mundos.get('QWXYZ') as MundoDeclarado).cuerpos);
  comprobar('se ve fallar: con una nave menos en sobria, lo pintado ya no es el mundo declarado', primeraNave >= 0 && !vacunada.iguales && vacunada.sobranEnB.length === 1, { primeraNave, sobran: vacunada.sobranEnB.length });
}

// ---------------------------------------------------------------------------
paso('4 · Los cuerpos: hay los que tiene que haber, y ninguno fuera del tablero');
// ---------------------------------------------------------------------------

{
  const malos: unknown[] = [];
  const cuentas: string[] = [];
  for (const codigo of CODIGOS) {
    const mundo = mundos.get(codigo) as MundoDeclarado;
    const traza = trazaDelBurgo(semillaDelCodigo(codigo, 1));
    const torres = traza.edificios.filter((e) => e.cascara === null).length;
    const deDistritos = mundo.cuerpos.length - traza.edificios.length - 1;
    if (codigo === 'QWXYZ' || codigo === '') cuentas.push(`${codigo === '' ? 'portada' : codigo}: ${String(mundo.cuerpos.length)} = ${String(traza.edificios.length)} edificios (${String(torres)} torres) + ${String(deDistritos)} de distritos + el pedestal`);
    const edificiosIguales = traza.edificios.every((e, k) => JSON.stringify(cajaDelEdificio(e)) === JSON.stringify(mundo.cuerpos[k]));
    if (!edificiosIguales) malos.push({ codigo, que: 'los primeros cuerpos no son los edificios, en su orden' });
    if (deDistritos < 20) malos.push({ codigo, que: 'pocos cuerpos de distrito', deDistritos });
    for (const c of mundo.cuerpos) {
      const finitos = [c.x0, c.z0, c.x1, c.z1].every((v) => Number.isFinite(v));
      if (!finitos || !(c.x0 < c.x1) || !(c.z0 < c.z1)) malos.push({ codigo, que: 'caja vacía o no finita', c });
      else if (c.x0 < -MEDIO_LADO_DEL_BURGO || c.z0 < -MEDIO_LADO_DEL_BURGO || c.x1 > MEDIO_LADO_DEL_BURGO || c.z1 > MEDIO_LADO_DEL_BURGO) malos.push({ codigo, que: 'fuera del tablero', c });
    }
  }
  for (const c of cuentas) console.log(`  ${c}`);
  comprobar(`en las ${String(CODIGOS.length)} mesas, los primeros cuerpos son los edificios en su orden, hay más de veinte de distritos, ninguna caja está vacía y ninguna se sale del tablero`, malos.length === 0, malos.slice(0, 4));
  comprobar(
    'se ve fallar: una caja corrida mil unidades cae fuera del tablero',
    [{ x0: 1000, z0: 0, x1: 1006, z1: 6 }].some((c) => c.x1 > MEDIO_LADO_DEL_BURGO),
  );
}

// ---------------------------------------------------------------------------
paso('5 · Donde se nace: con suelo, sin cuerpo, repartido y sin mirar a una pared');
// ---------------------------------------------------------------------------

/** Si se puede nacer en un sitio: hay piso debajo y el paseante, con su radio, no toca ningún cuerpo. */
function sePuedeNacer(arena: Arena, x: number, z: number): boolean {
  return hayPiso(arena, enFijo(x), enFijo(z)) && !chocaConCuerpo(arena, enFijo(x), enFijo(z), RADIO_DEL_PASEANTE);
}

{
  const malos: unknown[] = [];
  const contraLaPared: unknown[] = [];
  for (const codigo of CODIGOS) {
    const mundo = mundos.get(codigo) as MundoDeclarado;
    const arena = arenaDe(mundo);
    for (let k = 0; k < mundo.nace.length; k++) {
      const s = mundo.nace[k] as { x: number; z: number; rumbo: number };
      if (!sePuedeNacer(arena, s.x, s.z)) malos.push({ codigo, sitio: k, s });
      /* Sesenta tics andando al frente: si a los pocos pasos hay una pared, se nace mirándola. */
      const e = embestir(arena, { x0: 9999, z0: 9999, x1: 10000, z1: 10000 }, s, rumboDeRadianes(s.rumbo), 60);
      if (e.parado > 0 || e.avanzado < 30) contraLaPared.push({ codigo, sitio: k, parado: e.parado, avanzado: e.avanzado });
    }
  }
  let separacion = Infinity;
  for (let a = 0; a < NACE_EN_EL_BURGO.length; a++) {
    for (let b = a + 1; b < NACE_EN_EL_BURGO.length; b++) {
      const p = NACE_EN_EL_BURGO[a] as { x: number; z: number };
      const q = NACE_EN_EL_BURGO[b] as { x: number; z: number };
      separacion = Math.min(separacion, Math.sqrt((p.x - q.x) * (p.x - q.x) + (p.z - q.z) * (p.z - q.z)));
    }
  }
  console.log(`  ${String(NACE_EN_EL_BURGO.length)} sitios · los dos más cercanos, a ${separacion.toFixed(1)}`);
  comprobar('hay por lo menos seis sitios de nacer', NACE_EN_EL_BURGO.length >= 6, NACE_EN_EL_BURGO.length);
  comprobar(`en las ${String(CODIGOS.length)} mesas, todos tienen suelo debajo y ningún cuerpo a menos del radio del paseante`, malos.length === 0, malos.slice(0, 4));
  /*
   * Veinte es ocho veces la altura de una persona (2,543): dos que nacen a la vez no se pisan ni
   * se tapan. Los más cercanos son dos brazos de la glorieta, a 18 del centro y 25,5 entre sí; los
   * de las Puertas están a casi quinientos.
   */
  comprobar('están repartidos: ninguno a menos de 20 de otro', separacion >= 20, { separacion });
  comprobar('y ninguno mira a una pared: sesenta tics al frente se andan sin pararse', contraLaPared.length === 0, contraLaPared.slice(0, 4));
  /* La vacuna: nacer en el centro de la glorieta es nacer dentro del pedestal. */
  comprobar('se ve fallar: en el centro de la glorieta está el pedestal', !sePuedeNacer(arenaDe(mundos.get('QWXYZ') as MundoDeclarado), 0, 0));
}

// ---------------------------------------------------------------------------
paso('6 · El que se echa encima de un edificio se queda en su fachada');
// ---------------------------------------------------------------------------

/** El rumbo de tic (0 = norte … 64 = este) del rumbo del Burgo (0 = este, 1 = sur, 2 = oeste, 3 = norte). */
function ticDelRumbo(r: 0 | 1 | 2 | 3): number {
  return ((r + 1) % 4) * 64;
}

interface Embestidas {
  edificios: number;
  saltados: number;
  dentro: number;
  parado: number;
  lejosDeLaFachada: unknown[];
}

/**
 * De cada edificio elegido: se sale del centro de la celda de calle que tiene delante, andando
 * derecho hacia su portal durante ciento veinte tics —setenta y dos unidades, que cruzan de sobra
 * la calle y la acera—. El paseante no puede meterse ni una vez en la caja, tiene que quedarse
 * parado contra ella, y tiene que acabar pegado a la fachada: a menos de un paso.
 */
function embestirLosEdificios(mundo: MundoDeclarado, edificios: readonly EdificioDelBurgo[], cadaCuantos: number): Embestidas {
  const arena = arenaDe(mundo);
  const r: Embestidas = { edificios: 0, saltados: 0, dentro: 0, parado: 0, lejosDeLaFachada: [] };
  for (let k = 0; k < edificios.length; k++) {
    const e = edificios[k] as EdificioDelBurgo;
    if (k % cadaCuantos !== 0 && e.celdas.length === 1) continue;
    const v = vectorDelRumbo(e.frente);
    const salida = { x: e.portal.x + v.x * (RETICULA_DEL_BURGO / 2), z: e.portal.z + v.z * (RETICULA_DEL_BURGO / 2) };
    if (!sePuedeNacer(arena, salida.x, salida.z)) {
      r.saltados++;
      continue;
    }
    const caja = cajaDelEdificio(e);
    const hacia = ticDelRumbo(((e.frente + 2) % 4) as 0 | 1 | 2 | 3);
    const golpe = embestir(arena, caja, salida, hacia, 120);
    r.edificios++;
    r.dentro += golpe.dentro;
    r.parado += golpe.parado;
    if (golpe.aLaCaja > 0.7) r.lejosDeLaFachada.push({ indice: e.indice, aLaCaja: golpe.aLaCaja, avanzado: golpe.avanzado });
  }
  return r;
}

{
  let edificios = 0;
  let saltados = 0;
  let dentro = 0;
  let parado = 0;
  const lejos: unknown[] = [];
  for (const codigo of CODIGOS) {
    const mundo = mundos.get(codigo) as MundoDeclarado;
    const traza = trazaDelBurgo(semillaDelCodigo(codigo, 1));
    const r = embestirLosEdificios(mundo, traza.edificios, 11);
    edificios += r.edificios;
    saltados += r.saltados;
    dentro += r.dentro;
    parado += r.parado;
    lejos.push(...r.lejosDeLaFachada.map((x) => ({ codigo, ...(x as object) })));
  }
  console.log(`  ${String(edificios)} edificios embestidos (${String(saltados)} saltados por no poder salir de su calle) · ${String(parado)} tics parado contra una fachada · ${String(dentro)} dentro`);
  comprobar('SUELO: se han embestido más de quinientos edificios de todas las clases', edificios > 500, { edificios });
  comprobar('SUELO: y los cuerpos han parado al que embestía, decenas de miles de tics', parado > 20000, { parado });
  comprobar('nadie se ha metido en un edificio ni un solo tic', dentro === 0, { dentro });
  comprobar('y todos se han quedado pegados a la fachada, a menos de un paso', lejos.length === 0, lejos.slice(0, 4));
  /* La vacuna: el mismo mundo sin cuerpos deja atravesar las fachadas, y las embestidas lo cuentan. */
  const sinCuerpos: MundoDeclarado = { ...(mundos.get('QWXYZ') as MundoDeclarado), cuerpos: [] };
  const vacunada = embestirLosEdificios(sinCuerpos, trazaDelBurgo(semillaDelCodigo('QWXYZ', 1)).edificios, 11);
  comprobar('se ve fallar: sin cuerpos, el que embiste se mete en los edificios y no lo para nada', vacunada.dentro > 1000 && vacunada.parado === 0, { dentro: vacunada.dentro, parado: vacunada.parado });
}

// ---------------------------------------------------------------------------
paso('7 · Los números que shared/ tuvo que copiar siguen siendo los de la escena');
// ---------------------------------------------------------------------------

{
  comprobar('la retícula (12) y la altura de planta (4,5) son las de `piezas.ts`', RETICULA_DEL_BURGO === RETICULA_DE_LA_CIUDAD && ALTURA_DE_PLANTA_DEL_BURGO === ALTURA_DE_PLANTA, { RETICULA_DEL_BURGO, RETICULA_DE_LA_CIUDAD, ALTURA_DE_PLANTA_DEL_BURGO, ALTURA_DE_PLANTA });
  comprobar(
    'la casilla, las bandas y el tablero son los de `anillo-en-3d.ts`',
    ANCHO_DE_CASILLA_DEL_BURGO === ANCHO_DE_CASILLA &&
      FONDO_DE_CASILLA_DEL_BURGO === FONDO_DE_CASILLA &&
      CASILLAS_POR_LADO_DEL_BURGO === CASILLAS_POR_LADO &&
      FRANJA_DEL_BARRIO === BANDA.franja &&
      FILETE_DE_LA_CASILLA === BANDA.filete &&
      MEDIO_LADO_DEL_BURGO === MEDIO_LADO &&
      LADO_DEL_TABLERO_DEL_BURGO === 2 * MEDIO_LADO,
    { MEDIO_LADO_DEL_BURGO, MEDIO_LADO },
  );
  comprobar('y la línea de la marcha (349,5) es la de la escena', LINEA_DE_LA_MARCHA_DEL_BURGO === LINEA_DE_LA_MARCHA, { LINEA_DE_LA_MARCHA_DEL_BURGO, LINEA_DE_LA_MARCHA });
  comprobar('el recinto de la traza es el hueco que el anillo le deja a la ciudad', LADO_DEL_RECINTO === LADO_INTERIOR, { LADO_DEL_RECINTO, LADO_INTERIOR });
  /* Los cuatro primeros sitios son las Puertas: el punto de la marcha de las casillas 5, 25, 15 y 35, mirando a la ciudad. */
  const puertas = [5, 25, 15, 35];
  const malos: unknown[] = [];
  for (let k = 0; k < puertas.length; k++) {
    const m = marcoDeCasilla(puertas[k] as number);
    const s = NACE_EN_EL_BURGO[k] as { x: number; z: number; rumbo: number };
    /* La dirección del paseante con ese rumbo es (sen, −cos): tiene que ser −fuera, hacia la ciudad. */
    const d = { x: Math.sin(s.rumbo), z: -Math.cos(s.rumbo) };
    if (Math.abs(s.x - m.centro.x) > 1e-9 || Math.abs(s.z - m.centro.z) > 1e-9 || Math.abs(d.x + m.fuera.x) > 1e-9 || Math.abs(d.z + m.fuera.z) > 1e-9) malos.push({ casilla: puertas[k], sitio: s, centro: m.centro, fuera: m.fuera });
  }
  comprobar('los cuatro primeros sitios de nacer son el punto de la marcha de las cuatro Puertas, mirando a la ciudad', malos.length === 0, malos);
  const piezas = new Set<string>(Object.values(PIEZA));
  const sinPieza = Object.keys(CUERPO_DEL_MODELO).filter((n) => !piezas.has(n));
  comprobar('las dieciséis cáscaras de la traza son piezas de `burgo.glb` con ese mismo nombre', Object.keys(CUERPO_DEL_MODELO).length === 16 && sinPieza.length === 0, sinPieza);
}

// ---------------------------------------------------------------------------
paso('8 · El mismo mundo y el mismo paseo, levantados y andados en Node y en Hermes');
// ---------------------------------------------------------------------------

let enProceso: MundoResumido[] = [];
try {
  enProceso = paseoDelBurgo();
} catch (e) {
  comprobar('el banco del paseo corre en proceso sin caerse', false, e instanceof Error ? e.message.slice(0, 300) : String(e));
}
{
  for (const m of enProceso) {
    console.log(`  ${m.codigo === '' ? 'portada' : m.codigo}: ${String(m.cuerpos)} cuerpos · ${(m.peso / 1024).toFixed(1)} kB · mundo ${String(m.huellaDelMundo)} · paseo ${String(m.paseo.huella)} · cuerpo ${String(m.paseo.porCuerpo)} · borde ${String(m.paseo.porBorde)} · resbalando ${String(m.paseo.resbalados)}`);
  }
  /*
   * LOS SUELOS del paseo, antes de comparar una sola huella. Y el primero es que haya paseos: un
   * `every` sobre una lista vacía es verdad, y un banco que no devuelve nada pasaría los demás.
   */
  const todos = (que: (m: MundoResumido) => boolean): boolean => enProceso.length === CODIGOS_DEL_PASEO.length && enProceso.every(que);
  comprobar(`el banco devuelve un paseo por cada una de sus ${String(CODIGOS_DEL_PASEO.length)} mesas`, enProceso.length === CODIGOS_DEL_PASEO.length, enProceso.length);
  comprobar('SUELO: a los cuatro paseantes los han parado los CUERPOS, más de quinientas veces a cada uno', todos((m) => m.paseo.porCuerpo >= 500), enProceso.map((m) => m.paseo.porCuerpo));
  comprobar('SUELO: y el BORDE del tablero también, más de cien veces a cada uno', todos((m) => m.paseo.porBorde >= 100), enProceso.map((m) => m.paseo.porBorde));
  comprobar('y han resbalado pegados a algo, que es la otra mitad del paso', todos((m) => m.paseo.resbalados >= 1000), enProceso.map((m) => m.paseo.resbalados));
  comprobar('y ninguno se ha salido del tablero ni un tic', todos((m) => m.paseo.fuera === 0), enProceso.map((m) => m.paseo.fuera));
  comprobar('y han andado rumbos de toda la tabla', todos((m) => m.paseo.rumbosAndados >= 60), enProceso.map((m) => m.paseo.rumbosAndados));
}

function dondeEstaHermes(): string | null {
  const carpeta = path.join(REPO, 'node_modules', 'hermes-engine-cli');
  const candidato =
    process.platform === 'win32'
      ? path.join(carpeta, 'win64-bin', 'hermes.exe')
      : process.platform === 'darwin'
        ? path.join(carpeta, 'osx-bin', 'hermes')
        : path.join(carpeta, 'linux64-bin', 'hermes');
  return fs.existsSync(candidato) ? candidato : null;
}

const hermes = dondeEstaHermes();
comprobar('el intérprete de Hermes está instalado', hermes !== null, 'falta `hermes-engine-cli`: sin él esto NO compara dos motores, y se pone rojo en vez de saltárselo.');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'burgo-mundo-'));
const entrada = path.join(dir, 'entrada.ts');
const crudo = path.join(dir, 'crudo.js');
/*
 * Se empaqueta el MISMO módulo que acaba de correr en proceso: la entrada importa `paseoDelBurgo`
 * de `paseo-del-burgo.ts` y escribe lo que devuelve. Lo que corre en Hermes es el mismo código, y
 * dentro va la traza entera del Burgo: el mundo se levanta en cada motor.
 */
fs.writeFileSync(
  entrada,
  `import { paseoDelBurgo } from ${JSON.stringify(path.join(AQUI, 'paseo-del-burgo.ts').replace(/\\/g, '/'))};\n` +
    'const linea = JSON.stringify(paseoDelBurgo());\n' +
    "if (typeof print === 'function') print(linea); else console.log(linea);\n",
  'utf8',
);

let paqueteListo = false;
if (hermes !== null) {
  const esbuild = path.join(REPO, 'node_modules', 'esbuild', 'bin', 'esbuild');
  const hecho = spawnSync(process.execPath, [esbuild, entrada, '--bundle', '--format=iife', '--target=es2015', '--platform=neutral', `--outfile=${crudo}`], { encoding: 'utf8' });
  paqueteListo = hecho.status === 0;
  comprobar('el mundo del Burgo y su paseo se empaquetan para los dos motores', paqueteListo, hecho.stderr.slice(0, 500));
  /*
   * `class` se baja a funciones UNA vez, sobre el paquete que corren los dos: Hermes 0.12 no la
   * entiende y `fijo.ts` y `canonico.ts` declaran una cada uno. Es la misma pasada que hace
   * `verify:mundo`, por la misma razón.
   */
  if (paqueteListo) {
    const antes = fs.readFileSync(crudo, 'utf8');
    comprobar('el paquete crudo trae alguna `class`, o la pasada sobra', /\bclass\s/.test(antes));
    const NOMBRE_DEL_COMPLEMENTO = '@babel/plugin-transform-classes';
    const bajarClases = (await import(NOMBRE_DEL_COMPLEMENTO)) as { default: unknown };
    const babel = await import('@babel/core');
    const transformado = babel.transformFileSync(crudo, { babelrc: false, configFile: false, compact: false, plugins: [bajarClases.default as babel.PluginItem] });
    const codigo = transformado?.code ?? '';
    comprobar('y se bajan a funciones', codigo.length > 0);
    if (codigo.length > 0) fs.writeFileSync(crudo, codigo, 'utf8');
  }
}

if (paqueteListo && hermes !== null) {
  const enNode = spawnSync(process.execPath, [crudo], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const enHermes = spawnSync(hermes, [crudo], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  comprobar('Node ejecuta el paquete sin caerse', enNode.status === 0, enNode.stderr.slice(0, 400));
  comprobar('Hermes ejecuta el paquete sin caerse', enHermes.status === 0, enHermes.stderr.slice(0, 400));
  const leer = (s: string): MundoResumido[] | null => {
    const linea = s.trim().split('\n').pop() ?? '';
    try {
      return JSON.parse(linea) as MundoResumido[];
    } catch {
      return null;
    }
  };
  const a = leer(enNode.stdout);
  const b = leer(enHermes.stdout);
  comprobar('las dos tandas dicen algo', a !== null && b !== null, { node: enNode.stdout.slice(-200), hermes: enHermes.stdout.slice(-200) });
  if (a !== null && b !== null) {
    for (let k = 0; k < a.length; k++) {
      const x = a[k] as MundoResumido;
      const y = b[k] as MundoResumido | undefined;
      console.log(`  ${x.codigo === '' ? 'portada' : x.codigo} · Node mundo ${String(x.huellaDelMundo)} paseo ${String(x.paseo.huella)} · Hermes mundo ${String(y?.huellaDelMundo)} paseo ${String(y?.paseo.huella)}`);
    }
    const enteras = a.length === CODIGOS_DEL_PASEO.length && b.length === CODIGOS_DEL_PASEO.length;
    comprobar(`los dos motores devuelven las ${String(CODIGOS_DEL_PASEO.length)} mesas`, enteras, { node: a.length, hermes: b.length });
    comprobar('SUELO del paquete: a los paseantes de los dos motores los paran los cuerpos', enteras && a.every((m) => m.paseo.porCuerpo >= 500) && b.every((m) => m.paseo.porCuerpo >= 500), { node: a.map((m) => m.paseo.porCuerpo), hermes: b.map((m) => m.paseo.porCuerpo) });
    comprobar('el mundo de las cuatro mesas, levantado en cada motor, es el MISMO en Node y en Hermes', enteras && a.every((m, k) => m.huellaDelMundo === b[k]?.huellaDelMundo && m.cuerpos === b[k]?.cuerpos && m.peso === b[k]?.peso), { node: a.map((m) => m.huellaDelMundo), hermes: b.map((m) => m.huellaDelMundo) });
    comprobar('y el paseo por cada uno deja la MISMA huella, y se paró las mismas veces contra lo mismo', enteras && JSON.stringify(a.map((m) => m.paseo)) === JSON.stringify(b.map((m) => m.paseo)), { node: a.map((m) => m.paseo.huella), hermes: b.map((m) => m.paseo.huella) });
    comprobar('y el paquete da lo mismo que el código sin empaquetar', enteras && enProceso.length === a.length && JSON.stringify(a) === JSON.stringify(enProceso), { empaquetado: a.map((m) => m.huellaDelMundo), enProceso: enProceso.map((m) => m.huellaDelMundo) });
  }
}

fs.rmSync(dir, { recursive: true, force: true });

// ---------------------------------------------------------------------------

console.log('');
if (fallos.length > 0) {
  console.log(`${String(fallos.length)} de ${String(hechas)} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`  ✗ ${f}`);
  process.exit(1);
}

console.log(`${String(hechas)} comprobaciones`);
console.log('\nEl Burgo con el que se choca es uno solo: la traza y lo sólido de los distritos, declarados en');
console.log('shared/, sin la calidad del aparato. Lo que la escena pinta en plena y en sobria es ese mismo mundo');
console.log('caja a caja, la ciudad es la de antes de la mudanza, quien se echa encima de una fachada se queda');
console.log('en ella, y el mundo levantado y andado en Node y en Hermes deja la misma huella.');
