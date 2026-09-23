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
 *  1. La ciudad de la escena es, bit a bit, la de ANTES de mudar la traza con los muros del
 *     estadio enderezados: la huella de diez ciudades (cinco mesas, dos calidades) está congelada
 *     aquí, y la de antes del arreglo sale de ésta volviendo a girar esos dos muros y nada más.
 *  2. El mundo es contrato: canoniza, y se dice cuánto pesa y cuánto cuesta derivarlo, contado.
 *  3. El mundo que se deduce de lo que la escena pinta es el MISMO en plena y en sobria, y es el
 *     declarado, caja a caja. Toda clase de bulto que la escena pinte tiene que estar clasificada
 *     (suelo, aire, sólido, adorno): una nueva sin clasificar pone esto en rojo, porque es una
 *     decisión —¿se choca con ella?— que alguien tiene que tomar. Y las OBRAS DEL ANILLO (3b): la
 *     tabla de lo que para de ellas es la que miden sus caras en `obras.ts`, con la vara de la
 *     cintura y la cabeza; cada obra tiene algo que para, lo que se pasa por debajo y lo que se
 *     pisa es lo que dice la cabecera, y ninguna caja se mete en la ciudad ni pisa la marcha.
 *  4. Hay cuerpos, tantos como edificios, lo sólido de los distritos, el pedestal y las obras, y
 *     ninguno fuera del tablero. Y los cuatro muros del estadio van a lo largo de su lado: dentro
 *     de su distrito y sin pisar una celda de calle.
 *  5. Donde se nace hay suelo y no hay cuerpo, los sitios están repartidos, ninguno mira a una
 *     pared, los ocho primeros son los de entrar y en su orden, y los de renacer no pisan la
 *     marcha. Y SE RENACE BIEN (5b): desde cada punto donde se puede estar hay dos sitios de los de
 *     renacer a entre 52,8 y 132 —lejos de quien te tumbó, cerca de donde caíste—, todos se
 *     alcanzan andando, y el caso medido en `verify:botas` cae en el primer escalón.
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
 *  4. El pedestal corrido 1.000 → «ninguno fuera del tablero» rojo. Y el muro del estadio con la
 *     cuenta de antes en `burgo-distritos.ts` —el ancho y el fondo cambiados Y el giro— → «los
 *     muros del estadio» rojo en las doce mesas, y las huellas del paso 1 también.
 *  5. Un sitio de nacer en el centro de la glorieta, dentro del pedestal → rojo.
 *  6. El mundo sin cuerpos → las embestidas atraviesan las fachadas y los suelos caen.
 *  7. El filete del anillo a 8 en `shared/` → la línea de la marcha no es la de la escena.
 *  8. Una clausura sobre el `let` de un bucle en el paseo, que Hermes 0.12 no liga por iteración
 *     → Node y Hermes dan huellas distintas.
 *
 * Y lo del 24 de septiembre, igual:
 *
 *  3b. Una caja de la comisaría corrida una unidad en la tabla → la tabla no es la medida, y lo
 *      pintado no es lo declarado. El cuerpo del casino bajado a 1,0 en `obras.ts` → tres casillas
 *      sin nada que pare, los casinos no paran, y la tabla ya no es la medida.
 *  5.  Los de renacer delante de los de entrar → «los ocho primeros» rojo. La primera fila del
 *      anillo en el carril (a 25,5) → «ninguno sobre la marcha» rojo. Los de la ciudad mirando por
 *      donde menos calle hay → «ninguno mira a una pared» rojo.
 *  5b. Sin los de renacer —ni los del anillo ni los de la ciudad— → «dos a entre 52,8 y 132» y el
 *      caso medido, rojos. Un sitio dentro de la nave de Delicias → «ninguno en un bolsillo» rojo
 *      —y «mira a una pared»—; con la rejilla de tres, el bolsillo seguía verde: ver `puntosDeJuego`.
 *  2.  La búsqueda de la ciudad sin contar sus celdas → «cuesta lo contado» rojo.
 *  7.  La segunda fila del anillo a 95, en el marco → «las filas caen donde se escribieron» rojo.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RADIO_DEL_PASEANTE, rumboDeRadianes, VELOCIDAD_CORRIENDO } from '../../shared/mecanicas/andar';
import { canonico, porQueNoEsCanonico } from '../../shared/mecanicas/canonico';
import { arenaDe, chocaConCuerpo, hayPiso, sePuedeEstar } from '../../shared/mecanicas/mundo';
import type { Arena, Cuerpo, MundoDeclarado } from '../../shared/mecanicas/mundo';
import { semillaDelCodigo } from '../../shared/mecanicas/semilla';
import {
  CASILLAS_POR_LADO_DEL_BURGO,
  cuentasDelMundoDelBurgo,
  FILETE_DE_LA_CASILLA,
  FONDO_DE_CASILLA_DEL_BURGO,
  FRANJA_DEL_BARRIO,
  ANCHO_DE_CASILLA_DEL_BURGO,
  LADO_DEL_TABLERO_DEL_BURGO,
  LINEA_DE_LA_MARCHA_DEL_BURGO,
  MEDIO_LADO_DEL_BURGO,
  NACE_EN_EL_BURGO,
  cajaDelEdificio,
  cajaDelVolumen,
  mundoDelBurgo,
  mundoDeLaSemilla,
} from '../../shared/arcade/juegos/burgo-mundo';
import { cajaDelDistrito, estructuraDelEstadio } from '../../shared/arcade/juegos/burgo-distritos';
import type { VolumenDeEstructura } from '../../shared/arcade/juegos/burgo-distritos';
import { ALTURA_DE_PLANTA_DEL_BURGO, CUERPO_DEL_MODELO, RETICULA_DEL_BURGO, esClaseDeCalle, trazaDelBurgo, vectorDelRumbo } from '../../shared/arcade/juegos/burgo-traza';
import type { ClaseDeCelda, DistritoPuesto, EdificioDelBurgo } from '../../shared/arcade/juegos/burgo-traza';
import { embestir, enFijo, paseoDelBurgo, CODIGOS_DEL_PASEO } from './paseo-del-burgo';
import type { MundoResumido } from './paseo-del-burgo';
import { ALTURA_DEL_BORDILLO, LADO_DEL_RECINTO, RECINTO_DEL_BURGO, ciudadDelCodigo, giraElPunto } from '../../escenas/burgo/ciudad';
import type { BultoPropio, LaCiudad } from '../../escenas/burgo/ciudad';
import { ALTURA_DE_PLANTA, PIEZA, RETICULA_DE_LA_CIUDAD } from '../../escenas/burgo/piezas';
import { ATREZO, BANDA, BORDE_INTERIOR, CARRIL_DEL_AVATAR, CASILLAS_POR_LADO, FONDO_DE_CASILLA, ANCHO_DE_CASILLA, LADO_INTERIOR, LINEA_DE_LA_MARCHA, MEDIO_LADO, marcoDeCasilla } from '../../escenas/burgo/anillo-en-3d';
import { COLOR_DE_OBRA, DEL_MUNDO, carasDeLaObraEnElMundo, casillasConObra } from '../../escenas/burgo/obras';
import type { CaraEnElMundo } from '../../escenas/burgo/obras';
import { alturaEnElAnillo } from '../../escenas/burgo/a-pie';
import { ALTURA_DE_UNA_PERSONA } from '../../escenas/escala';
import { CAIDO_MS, INTOCABLE_MS } from '../../shared/mecanicas/canal-de-botas';
import { deNumero, por, UNO } from '../../shared/mecanicas/fijo';
import { OBRAS_QUE_PARAN, RENACE_EN_EL_ANILLO, SEPARACION_ENTRE_SITIOS_DEL_BURGO, V_DE_LA_PRIMERA_FILA, V_DE_LA_SEGUNDA_FILA } from '../../shared/arcade/juegos/burgo-mundo';
import type { ObraQueParaDelBurgo } from '../../shared/arcade/juegos/burgo-mundo';

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
 * ═══ Y SE RENOVÓ UNA VEZ, EL MISMO DÍA, POR LOS MUROS DEL ESTADIO ═══
 *
 * Los del este y del oeste se pintaban girados dos veces y cruzaban la calle (la cabecera de
 * `burgo-distritos.ts` lo cuenta con sus cifras); al enderezarlos cambió el `todo` de las diez
 * ciudades y NADA MÁS: `celdas`, `edificios` y `volumenes` son los de siempre. Que no se colara otra
 * cosa con el arreglo no se da por dicho: `HUELLAS_DE_ANTES_DEL_ESTADIO` guarda los `todo` de antes,
 * y el paso vuelve a girar esos dos muros en la ciudad de hoy —y sólo ésos— y exige que salga,
 * bit a bit, la de antes.
 *
 * SI HAS CAMBIADO LA CIUDAD A PROPÓSITO, esto se pone rojo y tiene que ponerse: lo que dice es que
 * la ciudad de hoy ya no es aquélla. Mira qué parte ha cambiado —si es `celdas`, `edificios` o
 * `volumenes`, has movido la TRAZA, y con ella el mundo con el que se choca; si no, mira el paso
 * 3, que dice si lo que cambió es sólido—, y renueva las huellas con
 * `npm run verify:burgo-mundo -w server -- --huellas`, que las escribe listas para pegar,
 * diciéndolo en el mensaje del cambio.
 */
const HUELLAS_DE_ANTES: Readonly<Record<string, { todo: string; celdas: string; edificios: string; volumenes: string }>> = {
  'QWXYZ|plena': { todo: '5849033ae9f98ad2', celdas: '0b2153f60476c3d1', edificios: '8ec66b8f3bdd0039', volumenes: 'dd6b97a7ba21e036' },
  'QWXYZ|sobria': { todo: 'a8c793c393faa4bb', celdas: '0b2153f60476c3d1', edificios: '8ec66b8f3bdd0039', volumenes: 'dd6b97a7ba21e036' },
  '|plena': { todo: '58125bc9a5d55aff', celdas: '7bb3f8c7694a5032', edificios: '486fccb63b9be9e2', volumenes: 'a546a295e9f27923' },
  '|sobria': { todo: '6d48ff4b7c5a682d', celdas: '7bb3f8c7694a5032', edificios: '486fccb63b9be9e2', volumenes: 'a546a295e9f27923' },
  '39KG2|plena': { todo: 'eb3561f6c5e35dde', celdas: 'e6282ba9f4695c6c', edificios: 'f634678dd6efcea3', volumenes: '0c9ba32cba686b34' },
  '39KG2|sobria': { todo: '9fcd34649251f140', celdas: 'e6282ba9f4695c6c', edificios: 'f634678dd6efcea3', volumenes: '0c9ba32cba686b34' },
  '97L5F|plena': { todo: 'e67fd43902555159', celdas: '96412c72a374a90f', edificios: '9187e4cdabf0dd34', volumenes: 'b796c5f53cbe9bf0' },
  '97L5F|sobria': { todo: '3ebc3b26cb6a3ad4', celdas: '96412c72a374a90f', edificios: '9187e4cdabf0dd34', volumenes: 'b796c5f53cbe9bf0' },
  'GLM4N|plena': { todo: 'a7d36f630ec29e1c', celdas: '3185683a9cb35e81', edificios: 'f6f949460de52abb', volumenes: '8e2e95c910ecfffc' },
  'GLM4N|sobria': { todo: '3459c860505f76a1', celdas: '3185683a9cb35e81', edificios: 'f6f949460de52abb', volumenes: '8e2e95c910ecfffc' },
};

/** El `todo` de las mismas diez ciudades ANTES de enderezar los muros del estadio: los que hubo congelados hasta el arreglo. */
const HUELLAS_DE_ANTES_DEL_ESTADIO: Readonly<Record<string, string>> = {
  'QWXYZ|plena': '237f9f646b6dc4b9',
  'QWXYZ|sobria': 'f732922d7900ea4a',
  '|plena': '4884deb1e9521f1c',
  '|sobria': '4b1edfa62618bf38',
  '39KG2|plena': '05cf33e5782f70b3',
  '39KG2|sobria': 'b1caf689ef6c0e06',
  '97L5F|plena': 'd02365b48fc3ce50',
  '97L5F|sobria': 'a4d53fb7c0d5af12',
  'GLM4N|plena': 'a91412cc280e3b4b',
  'GLM4N|sobria': '869c1d4e131133fa',
};

/**
 * LA CIUDAD COMO ESTABA ANTES DEL ARREGLO, sacada de la de hoy: a cada muro del estadio que gira un
 * número IMPAR de cuartos —el del este y el del oeste— se le vuelven a cambiar el ancho y el fondo,
 * que es exactamente lo que los hacía girar dos veces. Se reconoce por lo que sólo él tiene: un
 * `cantil` sobre la acera (los del canal van por debajo, junto al agua). Devuelve la copia y
 * cuántas veces tocó un muro: cada uno sale en la lista entera de bultos y en sus niveles de detalle.
 */
function comoAntesDelEstadio(ciudad: LaCiudad): { readonly copia: unknown; readonly muros: number } {
  const copia: unknown = JSON.parse(JSON.stringify(ciudad));
  let muros = 0;
  const anda = (x: unknown): void => {
    if (Array.isArray(x)) {
      for (const y of x) anda(y);
      return;
    }
    if (x === null || typeof x !== 'object') return;
    const o = x as Record<string, unknown>;
    if (o.clase === 'cantil' && o.y === ALTURA_DEL_BORDILLO && typeof o.giro === 'number' && Math.round(o.giro / (Math.PI / 2)) % 2 !== 0) {
      const ancho = o.ancho;
      o.ancho = o.fondo;
      o.fondo = ancho;
      muros++;
    }
    for (const k of Object.keys(o)) anda(o[k]);
  };
  anda(copia);
  return { copia, muros };
}

const pedirHuellas = process.argv.includes('--huellas');
{
  const nuevas: string[] = [];
  const distintas: string[] = [];
  const noEsSoloElEstadio: string[] = [];
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
    const vieja = comoAntesDelEstadio(c);
    if (vieja.muros === 0 || sha(JSON.stringify(vieja.copia)) !== HUELLAS_DE_ANTES_DEL_ESTADIO[clave]) noEsSoloElEstadio.push(`${clave}: ${String(vieja.muros)} muros vueltos a girar, y sale ${sha(JSON.stringify(vieja.copia))}`);
  }
  if (pedirHuellas) console.log(`\n  Las huellas de hoy, para pegar en HUELLAS_DE_ANTES:\n${nuevas.join('\n')}\n`);
  comprobar(`las ${Object.keys(HUELLAS_DE_ANTES).length} ciudades congeladas (cinco mesas, plena y sobria) son las de antes de mudar la traza, con los muros del estadio enderezados`, distintas.length === 0, distintas);
  console.log(`  ${Object.keys(HUELLAS_DE_ANTES).length - distintas.length} de ${Object.keys(HUELLAS_DE_ANTES).length} ciudades idénticas a las de antes`);
  comprobar(
    'y lo ÚNICO que cambió al enderezarlos son esos dos muros: vueltos a girar dos veces en la ciudad de hoy, sale bit a bit la huella de antes del arreglo en las diez',
    noEsSoloElEstadio.length === 0,
    noEsSoloElEstadio,
  );
}

// ---------------------------------------------------------------------------
paso('2 · El mundo es contrato: canoniza, y se dice cuánto pesa');
// ---------------------------------------------------------------------------

/** Las mesas del comprobador: las congeladas, las del paseo y un puñado más, para que el reparto de distritos varíe. */
const CODIGOS: readonly string[] = [...new Set(['QWXYZ', '', '39KG2', '97L5F', 'GLM4N', ...CODIGOS_DEL_PASEO, 'ZZZZZ', 'AB12C', 'H8K3M', 'P2Q9R', 'T5V7W'])];

const mundos = new Map<string, MundoDeclarado>();
/*
 * Lo que cuesta derivar cada mundo, CONTADO: las celdas que mira la búsqueda de los sitios de renacer
 * de la ciudad. Se lee del mismo módulo que deriva los mundos de aquí abajo —el que importa este
 * guion—, y se exige que se haya movido: cero no puede ser verde.
 */
const celdasPorMesa: number[] = [];
for (const codigo of CODIGOS) {
  const antes = cuentasDelMundoDelBurgo();
  mundos.set(codigo, mundoDelBurgo(codigo));
  const despues = cuentasDelMundoDelBurgo();
  if (despues.mundos !== antes.mundos + 1) celdasPorMesa.push(-1);
  else celdasPorMesa.push(despues.celdasMiradasParaRenacer - antes.celdasMiradasParaRenacer);
}

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
  /* 81 nudos de la rejilla de los sitios de la ciudad, y como mucho 49 celdas por nudo: los anillos de hasta tres. */
  const TOPE_DE_CELDAS = 81 * 49;
  console.log(`  la búsqueda de los sitios de renacer de la ciudad mira de ${String(Math.min(...celdasPorMesa))} a ${String(Math.max(...celdasPorMesa))} celdas por mesa (tope ${String(TOPE_DE_CELDAS)}; la retícula tiene 2.916)`);
  comprobar('y derivar el mundo cuesta lo contado: la búsqueda de los sitios de la ciudad mira celdas en cada mesa, y nunca más de 49 por nudo', celdasPorMesa.every((n) => n > 0 && n <= TOPE_DE_CELDAS), celdasPorMesa);
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
/**
 * Lo que no se declara aunque parezca estructura: el templete, que lo es pero sale en otro sitio en
 * sobria, y el estanque, agua a ras de la acera que no para a nadie. Ver `burgo-distritos.ts`.
 */
const ADORNO = new Set(['templete', 'estanque']);
/** El agua del canal, sus cantiles (los de cota baja) y sus puentes: se deduce la banda menos los puentes. */
const DEL_CANAL = new Set(['agua', 'puente']);

/** Lo más alto a lo que puede estar la base de algo para que se pise alrededor de ello: un andén sobre la acera. */
const COTA_DE_LO_QUE_SE_PISA = ALTURA_DEL_BORDILLO + 0.6 + 1e-9;

/*
 * ═══ LAS OBRAS DEL ANILLO, MEDIDAS EN SUS CARAS ═══
 *
 * `escenas/burgo/obras.ts` no describe cajas sino CARAS con su color, casilla a casilla, y la escena
 * las funde en una sola malla. `shared/` no puede leerlas —no importa de `escenas/`—, así que lo que
 * para de ellas vive en `burgo-mundo.ts` como tabla literal (`OBRAS_QUE_PARAN`), y aquí se vuelve a
 * medir y se exige la misma tabla, número a número. `--obras` la escribe lista para pegar.
 *
 * CÓMO SE MIDE. Las caras de cada casilla se parten en PIEZAS por el orden en que las escribe
 * `obras.ts`: seis caras seguidas del mismo color cuyos veinticuatro puntos son las ocho esquinas de
 * una caja son una caja —lo que sale de `caja()`—, y las demás caras seguidas del mismo color son una
 * tira: los troncos de las torres, los discos, los arcos. De cada pieza se mira su cota sobre el SUELO
 * QUE SE PINTA donde está (`alturaEnElAnillo`: la superficie a 0, el filete a 0,20, el marco a 0,30):
 *
 *   · si empieza por encima de la CABEZA de quien anda (2,543), SE PASA POR DEBAJO: las marquesinas,
 *     las viseras, el panel del cartel del aparcamiento, el depósito elevado, los tejadillos, los
 *     barrotes de la cárcel, las bóvedas de cristal;
 *   · si no pasa de la CINTURA (1,272), SE PISA o se salta: el asfalto, las rayas, el andén —0,60 sobre
 *     el marco—, su canto, la base del cofre (1,20), el primer peldaño de la oficina (0,80);
 *   · y lo que queda entre las dos PARA, con la caja de su planta por debajo de la cabeza.
 *
 * Es la vara de Las Lindes —la cintura y la cabeza de la misma persona—, puesta sobre el suelo del
 * anillo. Y la arena es plana: el segundo peldaño de la oficina sube a 1,60 y para, aunque de verdad
 * se subiría desde el primero; subir una escalera pediría alturas, que el mundo no contesta.
 *
 * Luego se quitan las cajas que caben enteras en otra de la misma obra, que no paran nada que la otra
 * no pare ya —la torre del reloj de Goya dentro de su edificio, las columnas y la puerta de la oficina
 * encima de su escalinata—, y lo que queda se redondea hacia fuera a cuatro decimales, como las
 * huellas de Las Lindes: la caja crece, nunca encoge.
 */
const CABEZA_DE_QUIEN_ANDA = ALTURA_DE_UNA_PERSONA;
const CINTURA_DE_QUIEN_ANDA = ALTURA_DE_UNA_PERSONA / 2;

type PuntoDeCara = readonly [number, number, number];

interface PiezaDeObra {
  readonly casilla: number;
  readonly tipo: 'caja' | 'tira';
  readonly color: string;
  readonly caras: readonly CaraEnElMundo[];
}

type LoQueHaceLaPieza = 'para' | 'se-pisa' | 'por-debajo';

interface PiezaMedida {
  readonly pieza: PiezaDeObra;
  readonly hace: LoQueHaceLaPieza;
  readonly suelo: number;
  readonly y0: number;
  readonly y1: number;
  /** La caja de su planta por debajo de la cabeza, en crudo; sólo de lo que para. */
  readonly caja: Cuerpo | null;
}

/** Seis caras del mismo color cuyos 24 puntos tienen dos valores en cada eje: las de una `caja()`. */
function sonUnaCaja(caras: readonly CaraEnElMundo[]): boolean {
  if (caras.length !== 6) return false;
  const color = (caras[0] as CaraEnElMundo).color;
  const xs = new Set<number>();
  const ys = new Set<number>();
  const zs = new Set<number>();
  for (const c of caras) {
    if (c.color !== color) return false;
    for (const p of c.puntos) {
      xs.add(p[0]);
      ys.add(p[1]);
      zs.add(p[2]);
    }
  }
  return xs.size === 2 && ys.size === 2 && zs.size === 2;
}

/** Las piezas de la obra de una casilla, en el orden de sus caras. */
function piezasDeLaObra(casilla: number): PiezaDeObra[] {
  const caras = carasDeLaObraEnElMundo(casilla);
  const salida: PiezaDeObra[] = [];
  let i = 0;
  while (i < caras.length) {
    if (sonUnaCaja(caras.slice(i, i + 6))) {
      salida.push({ casilla, tipo: 'caja', color: (caras[i] as CaraEnElMundo).color, caras: caras.slice(i, i + 6) });
      i += 6;
      continue;
    }
    const color = (caras[i] as CaraEnElMundo).color;
    const suyas: CaraEnElMundo[] = [];
    while (i < caras.length && (caras[i] as CaraEnElMundo).color === color && !sonUnaCaja(caras.slice(i, i + 6))) {
      suyas.push(caras[i] as CaraEnElMundo);
      i++;
    }
    salida.push({ casilla, tipo: 'tira', color, caras: suyas });
  }
  return salida;
}

/** Qué hace una pieza con quien anda, y la caja de su planta por debajo de la cabeza si para. */
function medirLaPieza(p: PiezaDeObra): PiezaMedida {
  let y0 = Infinity;
  let y1 = -Infinity;
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (const c of p.caras) {
    for (const q of c.puntos) {
      y0 = Math.min(y0, q[1]);
      y1 = Math.max(y1, q[1]);
      x0 = Math.min(x0, q[0]);
      x1 = Math.max(x1, q[0]);
      z0 = Math.min(z0, q[2]);
      z1 = Math.max(z1, q[2]);
    }
  }
  const suelo = alturaEnElAnillo((x0 + x1) / 2, (z0 + z1) / 2);
  if (y0 >= suelo + CABEZA_DE_QUIEN_ANDA) return { pieza: p, hace: 'por-debajo', suelo, y0, y1, caja: null };
  if (y1 <= suelo + CINTURA_DE_QUIEN_ANDA) return { pieza: p, hace: 'se-pisa', suelo, y0, y1, caja: null };
  if (p.tipo === 'caja') return { pieza: p, hace: 'para', suelo, y0, y1, caja: { x0, z0, x1, z1 } };
  /* Una tira: sólo lo que queda por debajo de la cabeza, con los cortes de sus lados con esa altura. */
  const h = suelo + CABEZA_DE_QUIEN_ANDA;
  let a0 = Infinity;
  let a1 = -Infinity;
  let b0 = Infinity;
  let b1 = -Infinity;
  const meter = (x: number, z: number): void => {
    a0 = Math.min(a0, x);
    a1 = Math.max(a1, x);
    b0 = Math.min(b0, z);
    b1 = Math.max(b1, z);
  };
  for (const c of p.caras) {
    for (let k = 0; k < 4; k++) {
      const q = c.puntos[k] as PuntoDeCara;
      const r = c.puntos[(k + 1) % 4] as PuntoDeCara;
      if (q[1] <= h) meter(q[0], q[2]);
      if ((q[1] <= h) !== (r[1] <= h)) {
        const s = (h - q[1]) / (r[1] - q[1]);
        meter(q[0] + s * (r[0] - q[0]), q[2] + s * (r[2] - q[2]));
      }
    }
  }
  return { pieza: p, hace: 'para', suelo, y0, y1, caja: { x0: a0, z0: b0, x1: a1, z1: b1 } };
}

/*
 * Hacia fuera, a cuatro decimales, con la milésima de escalón de holgura de las huellas de Las Lindes:
 * sin ella, un 412,40000000000003 de la cuenta del marco saldría 412,4001.
 */
const ESCALON_DE_LAS_OBRAS = 1e4;
const haciaFuera = (v: number, arriba: boolean): number =>
  (arriba ? Math.ceil(v * ESCALON_DE_LAS_OBRAS - 1e-3) : Math.floor(v * ESCALON_DE_LAS_OBRAS + 1e-3)) / ESCALON_DE_LAS_OBRAS;

interface ObrasMedidas {
  readonly obras: ObraQueParaDelBurgo[];
  readonly piezas: PiezaMedida[];
  /** Las cajas que se quitaron por caber enteras en otra de su obra. */
  readonly contenidas: number;
}

/** MIDE LAS OBRAS DEL ANILLO: ver la cabecera de esta sección. */
function medirLasObras(): ObrasMedidas {
  const obras: ObraQueParaDelBurgo[] = [];
  const piezas: PiezaMedida[] = [];
  let contenidas = 0;
  for (const casilla of casillasConObra()) {
    /* El ferrocarril da la vuelta por el campo, fuera del tablero: ahí no se anda. */
    if (casilla === DEL_MUNDO) continue;
    const suyas = piezasDeLaObra(casilla).map(medirLaPieza);
    for (const m of suyas) piezas.push(m);
    const cajas: Cuerpo[] = [];
    for (const m of suyas) {
      if (m.caja === null) continue;
      cajas.push({ x0: haciaFuera(m.caja.x0, false), z0: haciaFuera(m.caja.z0, false), x1: haciaFuera(m.caja.x1, true), z1: haciaFuera(m.caja.z1, true) });
    }
    const quedan = cajas.filter((b, k) => {
      const dentro = cajas.some((c, l) => l !== k && c.x0 <= b.x0 && c.z0 <= b.z0 && c.x1 >= b.x1 && c.z1 >= b.z1 && (l < k || c.x0 < b.x0 || c.z0 < b.z0 || c.x1 > b.x1 || c.z1 > b.z1));
      if (dentro) contenidas++;
      return !dentro;
    });
    if (quedan.length > 0) obras.push({ casilla, cajas: quedan });
  }
  return { obras, piezas, contenidas };
}

/** La tabla, tal cual se pega en `burgo-mundo.ts`. */
function textoDeLasObras(obras: readonly ObraQueParaDelBurgo[]): string {
  const filas: string[] = ['export const OBRAS_QUE_PARAN: readonly ObraQueParaDelBurgo[] = ['];
  for (const o of obras) {
    filas.push(`  {`);
    filas.push(`    casilla: ${String(o.casilla)},`);
    filas.push(`    cajas: [`);
    for (const c of o.cajas) filas.push(`      { x0: ${String(c.x0)}, z0: ${String(c.z0)}, x1: ${String(c.x1)}, z1: ${String(c.z1)} },`);
    filas.push(`    ],`);
    filas.push(`  },`);
  }
  filas.push('];');
  return filas.join('\n');
}

const LAS_OBRAS = medirLasObras();
const CAJAS_DE_LAS_OBRAS: readonly Cuerpo[] = LAS_OBRAS.obras.flatMap((o) => o.cajas);
if (process.argv.includes('--obras')) console.log(`\n  La tabla de las obras, para pegar en burgo-mundo.ts:\n\n${textoDeLasObras(LAS_OBRAS.obras)}\n`);

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
  /* Y las obras del anillo, medidas en las caras que pinta la escena: son las mismas en las dos calidades. */
  for (const b of CAJAS_DE_LAS_OBRAS) cuerpos.push(b);
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
  console.log(`  el templete y el estanque del parque cambian de sitio con la calidad en ${String(templetesQueSeMueven)} de ${String(CODIGOS.length)} mesas: por eso el templete no está`);
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
paso('3b · Las obras del anillo que paran son las que miden sus caras, y ninguna se mete en la ciudad ni en la marcha');
// ---------------------------------------------------------------------------

/**
 * ¿Toca esta caja el carril de la marcha, engordado un radio de quien anda? El carril es la banda en
 * la que `max(|x|, |z|)` cae entre 347 y 353 (`CARRIL_DEL_AVATAR` sobre el borde de dentro, 324): lo
 * que ninguna pieza puede pisar, y por donde andan los peones y se nace en las Puertas.
 */
function pisaLaMarcha(c: Cuerpo): boolean {
  const radio = RADIO_DEL_PASEANTE / UNO;
  const desde = BORDE_INTERIOR + CARRIL_DEL_AVATAR.desde - radio;
  const hasta = BORDE_INTERIOR + CARRIL_DEL_AVATAR.hasta + radio;
  const cercaX = c.x0 <= 0 && c.x1 >= 0 ? 0 : Math.min(Math.abs(c.x0), Math.abs(c.x1));
  const cercaZ = c.z0 <= 0 && c.z1 >= 0 ? 0 : Math.min(Math.abs(c.z0), Math.abs(c.z1));
  const lejosX = Math.max(Math.abs(c.x0), Math.abs(c.x1));
  const lejosZ = Math.max(Math.abs(c.z0), Math.abs(c.z1));
  /* Lo más cerca y lo más lejos del centro que llega la caja, en la cuenta del anillo. */
  const radialMenor = Math.max(cercaX, cercaZ);
  const radialMayor = Math.max(lejosX, lejosZ);
  return radialMenor <= hasta && radialMayor >= desde;
}

/** ¿Se mete en el recinto de la ciudad? */
const seMeteEnLaCiudad = (c: Cuerpo): boolean => c.x0 < LADO_DEL_RECINTO / 2 && c.x1 > -LADO_DEL_RECINTO / 2 && c.z0 < LADO_DEL_RECINTO / 2 && c.z1 > -LADO_DEL_RECINTO / 2;

{
  const medidas = LAS_OBRAS;
  const cuenta = (hace: LoQueHaceLaPieza): number => medidas.piezas.filter((m) => m.hace === hace).length;
  const cajas = CAJAS_DE_LAS_OBRAS;
  console.log(
    `  ${String(medidas.piezas.length)} piezas en ${String(casillasConObra().filter((c) => c !== DEL_MUNDO).length)} casillas: ${String(cuenta('para'))} paran, ` +
      `${String(cuenta('se-pisa'))} se pisan, ${String(cuenta('por-debajo'))} se pasan por debajo · ${String(medidas.contenidas)} cajas dentro de otra de su obra · ` +
      `${String(cajas.length)} cuerpos en el mundo`,
  );
  comprobar(
    'la tabla de `burgo-mundo.ts` es, número a número, la que miden las caras de `obras.ts` (si no, `npm run verify:burgo-mundo -w server -- --obras`)',
    JSON.stringify(OBRAS_QUE_PARAN) === JSON.stringify(medidas.obras),
    { tabla: OBRAS_QUE_PARAN.length, medidas: medidas.obras.length },
  );
  const conObra = casillasConObra().filter((c) => c !== DEL_MUNDO);
  const sinNadaQuePare = conObra.filter((c) => !medidas.obras.some((o) => o.casilla === c));
  comprobar(
    `las ${String(conObra.length)} casillas con obra tienen algo que para: la cárcel, la comisaría, el cartel del aparcamiento, los cofres, la oficina, los casinos, la central, las aguas, la tasa y las cuatro estaciones`,
    conObra.length === 17 && sinNadaQuePare.length === 0,
    { conObra, sinNadaQuePare },
  );
  comprobar('y se han mirado de verdad: decenas de piezas que paran, que se pisan y que se pasan por debajo', cuenta('para') >= 80 && cuenta('se-pisa') >= 10 && cuenta('por-debajo') >= 30, {
    para: cuenta('para'),
    sePisa: cuenta('se-pisa'),
    porDebajo: cuenta('por-debajo'),
  });
  /*
   * LA VARA, CON NOMBRES. Que la regla diga lo que la cabecera dice que dice: una regla con la cabeza
   * o la cintura cambiadas, o con el suelo de otra banda, cambiaría alguna de éstas.
   */
  const deColor = (color: string): PiezaMedida[] => medidas.piezas.filter((m) => m.pieza.color === color);
  const todasHacen = (l: readonly PiezaMedida[], hace: LoQueHaceLaPieza, cuantas: number): boolean => l.length >= cuantas && l.every((m) => m.hace === hace);
  comprobar('las marquesinas de los casinos y de los andenes y el panel del aparcamiento se pasan por debajo', todasHacen(deColor(COLOR_DE_OBRA.marquesina), 'por-debajo', 3) && todasHacen(deColor(COLOR_DE_OBRA.marquesinaTren), 'por-debajo', 4) && todasHacen(deColor(COLOR_DE_OBRA.carteloAzul), 'por-debajo', 1));
  comprobar('los andenes se pisan, y también el asfalto del aparcamiento y la alfombra de la tasa', todasHacen(deColor(COLOR_DE_OBRA.anden), 'se-pisa', 4) && todasHacen(deColor(COLOR_DE_OBRA.asfalto), 'se-pisa', 1) && todasHacen(deColor(COLOR_DE_OBRA.alfombra), 'se-pisa', 1));
  comprobar(
    'y paran las paredes de la cárcel y sus torretas, los cuerpos de la comisaría, los casinos y los cofres, las torres de la central y el pedestal de la joya',
    todasHacen(deColor(COLOR_DE_OBRA.muro), 'para', 7) &&
      todasHacen(deColor(COLOR_DE_OBRA.comisaria), 'para', 1) &&
      todasHacen(deColor(COLOR_DE_OBRA.casino), 'para', 3) &&
      todasHacen(deColor(COLOR_DE_OBRA.madera), 'para', 3) &&
      todasHacen(deColor(COLOR_DE_OBRA.marmol), 'para', 1),
  );
  const malas: unknown[] = [];
  for (const c of cajas) {
    if (!(c.x0 < c.x1 && c.z0 < c.z1) || [c.x0, c.z0, c.x1, c.z1].some((v) => !Number.isFinite(v))) malas.push({ que: 'vacía o no finita', c });
    else if (c.x0 < -MEDIO_LADO_DEL_BURGO || c.z0 < -MEDIO_LADO_DEL_BURGO || c.x1 > MEDIO_LADO_DEL_BURGO || c.z1 > MEDIO_LADO_DEL_BURGO) malas.push({ que: 'fuera del tablero', c });
    else if (seMeteEnLaCiudad(c)) malas.push({ que: 'dentro de la ciudad', c });
    else if (pisaLaMarcha(c)) malas.push({ que: 'sobre el carril de la marcha', c });
  }
  comprobar('ninguna caja de las obras se sale del tablero, se mete en la ciudad —ni en una calle— ni pisa el carril de la marcha', malas.length === 0, malas.slice(0, 4));
  comprobar(
    'se ve fallar: una caja en la línea de la marcha la pisa, y una en la ciudad se mete en ella',
    pisaLaMarcha({ x0: -2, z0: 348, x1: 2, z1: 351 }) && pisaLaMarcha({ x0: 360, z0: -10, x1: 380, z1: 10 }) === false && seMeteEnLaCiudad({ x0: 300, z0: 0, x1: 330, z1: 5 }),
  );
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
    const obras = CAJAS_DE_LAS_OBRAS.length;
    const deDistritos = mundo.cuerpos.length - traza.edificios.length - 1 - obras;
    if (codigo === 'QWXYZ' || codigo === '') cuentas.push(`${codigo === '' ? 'portada' : codigo}: ${String(mundo.cuerpos.length)} = ${String(traza.edificios.length)} edificios (${String(torres)} torres) + ${String(deDistritos)} de distritos + el pedestal + ${String(obras)} de las obras del anillo`);
    const edificiosIguales = traza.edificios.every((e, k) => JSON.stringify(cajaDelEdificio(e)) === JSON.stringify(mundo.cuerpos[k]));
    if (!edificiosIguales) malos.push({ codigo, que: 'los primeros cuerpos no son los edificios, en su orden' });
    if (JSON.stringify(mundo.cuerpos.slice(mundo.cuerpos.length - obras)) !== JSON.stringify(CAJAS_DE_LAS_OBRAS)) malos.push({ codigo, que: 'los últimos cuerpos no son las obras del anillo, en su orden' });
    if (deDistritos < 20) malos.push({ codigo, que: 'pocos cuerpos de distrito', deDistritos });
    for (const c of mundo.cuerpos) {
      const finitos = [c.x0, c.z0, c.x1, c.z1].every((v) => Number.isFinite(v));
      if (!finitos || !(c.x0 < c.x1) || !(c.z0 < c.z1)) malos.push({ codigo, que: 'caja vacía o no finita', c });
      else if (c.x0 < -MEDIO_LADO_DEL_BURGO || c.z0 < -MEDIO_LADO_DEL_BURGO || c.x1 > MEDIO_LADO_DEL_BURGO || c.z1 > MEDIO_LADO_DEL_BURGO) malos.push({ codigo, que: 'fuera del tablero', c });
    }
  }
  for (const c of cuentas) console.log(`  ${c}`);
  comprobar(`en las ${String(CODIGOS.length)} mesas, los primeros cuerpos son los edificios en su orden y los últimos las obras del anillo, hay más de veinte de distritos, ninguna caja está vacía y ninguna se sale del tablero`, malos.length === 0, malos.slice(0, 4));
  comprobar(
    'se ve fallar: una caja corrida mil unidades cae fuera del tablero',
    [{ x0: 1000, z0: 0, x1: 1006, z1: 6 }].some((c) => c.x1 > MEDIO_LADO_DEL_BURGO),
  );
}

/*
 * ═══ LOS MUROS DEL ESTADIO, A LO LARGO DE SU LADO ═══
 *
 * El del este y el del oeste se pintaban —y se declaraban— girados dos veces: una pared de 107 × 1
 * CRUZADA a su lado, que se salía 53 del distrito y en seis de estas siete primeras mesas pisaba
 * de una a cinco celdas de calle. A pie era una pared en mitad del asfalto. Lo que se afirma es lo
 * que un muro perimetral tiene que ser: su caja dentro de la del distrito, ni una celda de calle
 * debajo, lo largo a lo largo de su lado, y la misma caja en el mundo declarado. La vacuna es la
 * cuenta de antes —el ancho y el fondo cambiados encima del giro— sobre los mismos muros.
 */
{
  const CALLE = RETICULA_DEL_BURGO;
  /** Lo que tiene de malo un muro: fuera del distrito, sobre una calle, cruzado o sin su caja en el mundo. */
  const malDelMuro = (codigo: string, cambia: (m: VolumenDeEstructura, r: number) => VolumenDeEstructura): unknown[] => {
    const traza = trazaDelBurgo(semillaDelCodigo(codigo, 1));
    const d = traza.trazado.distritos.find((x) => x.nombre === 'estadio');
    if (d === undefined) return [{ codigo, que: 'la mesa no tiene estadio' }];
    const caja = cajaDelDistrito(RECINTO_DEL_BURGO, d);
    const mundo = mundos.get(codigo) ?? mundoDelBurgo(codigo);
    const n = traza.trazado.n;
    const malos: unknown[] = [];
    estructuraDelEstadio(caja).muros.forEach((original, r) => {
      const m = cambia(original, r);
      const c = cajaDelVolumen(m);
      const fuera = Math.max(caja.x0 - c.x0, c.x1 - caja.x1, caja.z0 - c.z0, c.z1 - caja.z1, 0);
      if (fuera > 1e-9) malos.push({ codigo, muro: r, que: 'se sale del distrito', fuera });
      let calles = 0;
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          if (!esClaseDeCalle(traza.trazado.clase[j * n + i] as ClaseDeCelda)) continue;
          const x0 = -LADO_DEL_RECINTO / 2 + CALLE * i;
          const z0 = -LADO_DEL_RECINTO / 2 + CALLE * j;
          if (c.x0 < x0 + CALLE && c.x1 > x0 && c.z0 < z0 + CALLE && c.z1 > z0) calles++;
        }
      }
      if (calles > 0) malos.push({ codigo, muro: r, que: 'pisa celdas de calle', calles });
      /* Los rumbos pares son el este y el oeste: su lado corre en z. */
      const aLoLargo = r % 2 === 0 ? c.z1 - c.z0 > c.x1 - c.x0 : c.x1 - c.x0 > c.z1 - c.z0;
      if (!aLoLargo) malos.push({ codigo, muro: r, que: 'va cruzado a su lado', caja: c });
      if (!mundo.cuerpos.some((k) => Math.abs(k.x0 - c.x0) < 1e-9 && Math.abs(k.z0 - c.z0) < 1e-9 && Math.abs(k.x1 - c.x1) < 1e-9 && Math.abs(k.z1 - c.z1) < 1e-9)) malos.push({ codigo, muro: r, que: 'su caja no está en el mundo declarado' });
    });
    return malos;
  };
  const tal = (m: VolumenDeEstructura): VolumenDeEstructura => m;
  /* La cuenta de antes: a los de rumbo par (este y oeste) se les volvían a cambiar el ancho y el fondo. */
  const comoAntes = (m: VolumenDeEstructura, r: number): VolumenDeEstructura => (r % 2 === 0 ? { ...m, ancho: m.fondo, fondo: m.ancho } : m);
  const malos = CODIGOS.flatMap((codigo) => malDelMuro(codigo, tal));
  const portada = estructuraDelEstadio(cajaDelDistrito(RECINTO_DEL_BURGO, trazaDelBurgo(1).trazado.distritos.find((x) => x.nombre === 'estadio') as DistritoPuesto)).muros.map((m) => cajaDelVolumen(m));
  console.log(`  los cuatro muros del estadio de la portada, en planta: ${portada.map((c) => `${(c.x1 - c.x0).toFixed(0)} × ${(c.z1 - c.z0).toFixed(0)}`).join(' · ')}`);
  comprobar(`en las ${String(CODIGOS.length)} mesas los cuatro muros del estadio van a lo largo de su lado, dentro de su distrito, sin pisar una celda de calle, y con su caja en el mundo`, malos.length === 0, malos.slice(0, 4));
  const vacunados = CODIGOS.flatMap((codigo) => malDelMuro(codigo, comoAntes));
  const seSalian = vacunados.filter((x) => (x as { que: string }).que === 'se sale del distrito').length;
  const pisaban = vacunados.filter((x) => (x as { que: string }).que === 'pisa celdas de calle').length;
  comprobar(
    `se ve fallar: con la cuenta de antes —girados dos veces— los muros del este y del oeste se salen del distrito en las ${String(CODIGOS.length)} mesas y pisan calle en ${String(pisaban)} muros`,
    seSalian === 2 * CODIGOS.length && pisaban > 0,
    { seSalian, pisaban },
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
  const noSonLosDeEntrar: unknown[] = [];
  const enLaMarcha: unknown[] = [];
  let separacion = Infinity;
  let dondeSeparacion = '';
  let sitiosMin = Infinity;
  let sitiosMax = 0;
  for (const codigo of CODIGOS) {
    const mundo = mundos.get(codigo) as MundoDeclarado;
    const arena = arenaDe(mundo);
    sitiosMin = Math.min(sitiosMin, mundo.nace.length);
    sitiosMax = Math.max(sitiosMax, mundo.nace.length);
    /* Los ocho primeros son los de entrar, los MISMOS y en su orden: el servidor reparte por el orden del asiento. */
    for (let k = 0; k < NACE_EN_EL_BURGO.length; k++) if (mundo.nace[k] !== NACE_EN_EL_BURGO[k]) noSonLosDeEntrar.push({ codigo, sitio: k });
    /* Y detrás, los del anillo, los mismos en todas las mesas; los de la ciudad, al final. */
    for (let k = 0; k < RENACE_EN_EL_ANILLO.length; k++) if (mundo.nace[NACE_EN_EL_BURGO.length + k] !== RENACE_EN_EL_ANILLO[k]) noSonLosDeEntrar.push({ codigo, sitio: NACE_EN_EL_BURGO.length + k, que: 'no es el del anillo' });
    for (let k = 0; k < mundo.nace.length; k++) {
      const s = mundo.nace[k] as { x: number; z: number; rumbo: number };
      if (!sePuedeNacer(arena, s.x, s.z)) malos.push({ codigo, sitio: k, s });
      /* Sesenta tics andando al frente: si a los pocos pasos hay una pared, se nace mirándola. */
      const e = embestir(arena, { x0: 9999, z0: 9999, x1: 10000, z1: 10000 }, s, rumboDeRadianes(s.rumbo), 60);
      if (e.parado > 0 || e.avanzado < 30) contraLaPared.push({ codigo, sitio: k, parado: e.parado, avanzado: e.avanzado });
      /* Los de renacer, fuera del carril de la marcha: allí sólo las cuatro Puertas, que son de entrar. */
      if (k >= NACE_EN_EL_BURGO.length && pisaLaMarcha({ x0: s.x, z0: s.z, x1: s.x, z1: s.z })) enLaMarcha.push({ codigo, sitio: k, s });
      for (let l = k + 1; l < mundo.nace.length; l++) {
        const q = mundo.nace[l] as { x: number; z: number };
        const d = Math.sqrt((s.x - q.x) * (s.x - q.x) + (s.z - q.z) * (s.z - q.z));
        if (d < separacion) {
          separacion = d;
          dondeSeparacion = `${codigo === '' ? 'portada' : codigo}, ${String(k)} y ${String(l)}`;
        }
      }
    }
  }
  console.log(`  de ${String(sitiosMin)} a ${String(sitiosMax)} sitios por mesa: los ${String(NACE_EN_EL_BURGO.length)} de entrar y los de renacer · los dos más cercanos, a ${separacion.toFixed(1)} (${dondeSeparacion})`);
  comprobar('hay por lo menos seis sitios de nacer', NACE_EN_EL_BURGO.length >= 6, NACE_EN_EL_BURGO.length);
  comprobar(
    `en las ${String(CODIGOS.length)} mesas, los ${String(NACE_EN_EL_BURGO.length)} primeros sitios son los de entrar, los mismos y en su orden, y detrás los ${String(RENACE_EN_EL_ANILLO.length)} del anillo`,
    noSonLosDeEntrar.length === 0 && RENACE_EN_EL_ANILLO.length === 76,
    noSonLosDeEntrar.slice(0, 4),
  );
  comprobar(`en las ${String(CODIGOS.length)} mesas, todos tienen suelo debajo y ningún cuerpo a menos del radio del paseante`, malos.length === 0, malos.slice(0, 4));
  /*
   * Veinte es ocho veces la altura de una persona (2,543): dos que nacen a la vez no se pisan ni
   * se tapan. Los más cercanos son dos brazos de la glorieta, a 18 del centro y 25,5 entre sí; los
   * de las Puertas están a casi quinientos; los de renacer se apartan `SEPARACION_ENTRE_SITIOS_DEL_BURGO`
   * de los que ya hay. El veinte se escribe aquí y no se toma de allí: si alguien baja aquélla, esto
   * tiene que ponerse rojo, no bajar con ella.
   */
  comprobar('están repartidos: en ninguna mesa hay dos a menos de 20', separacion >= 20 && SEPARACION_ENTRE_SITIOS_DEL_BURGO >= 20, { separacion, dondeSeparacion });
  comprobar('y ninguno mira a una pared: sesenta tics al frente se andan sin pararse', contraLaPared.length === 0, contraLaPared.slice(0, 4));
  comprobar('y ninguno de los de renacer está sobre el carril de la marcha', enLaMarcha.length === 0, enLaMarcha.slice(0, 4));
  /* La vacuna: nacer en el centro de la glorieta es nacer dentro del pedestal. */
  comprobar('se ve fallar: en el centro de la glorieta está el pedestal', !sePuedeNacer(arenaDe(mundos.get('QWXYZ') as MundoDeclarado), 0, 0));
}

// ---------------------------------------------------------------------------
paso('5b · Se renace lejos de quien te tumbó y cerca de donde caíste, aunque los sitios de entrar estén ocupados');
// ---------------------------------------------------------------------------

/*
 * ═══ POR QUÉ HAY SITIOS DE RENACER, Y QUÉ SE LES PIDE ═══
 *
 * Quien cae renace en el sitio de nacer LIBRE más cercano a donde cayó de entre los que están a
 * `LEJOS` o más de quien lo tumbó —lo que éste corre en los dos segundos de intocable, 52,8—; si
 * ninguno libre está tan lejos, en el libre más lejano (la regla del servidor, `sitioDeRenacer`).
 * Con sólo los ocho de entrar, en el Burgo eso no funcionaba: las cuatro Puertas están a 330 de la
 * glorieta y los cuatro brazos de la glorieta a 25 entre sí, y con las Puertas ocupadas —cuatro que
 * no bajan de su asiento— quien cae en la glorieta renace a veinte y pico de quien lo tumbó: el
 * segundo escalón, siempre. Medido en `verify:botas`: a 22.
 *
 * Así que se pide, desde CADA punto donde se puede estar y al que se llega andando desde una Puerta,
 * que haya por lo menos DOS sitios de los de renacer —no de los de entrar, que pueden estar
 * ocupados— a entre `LEJOS` y `CERCA`: lejos de quien te tumbó, y a no más de lo que se corre en
 * los cinco segundos que se está caído (132), que es no perder más de lo que ya se ha perdido. Dos y
 * no uno porque el primero puede estar ocupado. Y que todos los sitios de nacer estén en ese trozo
 * andable: uno en un bolsillo sería renacer preso.
 *
 * Se mira en una rejilla de tres unidades sobre el tablero entero, en todas las mesas del comprobador,
 * con los puntos a los que se llega andando buscados en una de una (ver `puntosDeJuego`). La vacuna
 * es la de siempre: con sólo los de entrar, en la mayor parte del tablero no hay ninguno. Y el caso
 * medido, tal cual: cuatro en las Puertas que no bajan, y una pelea en la glorieta.
 */
const LEJOS_AL_RENACER = por(VELOCIDAD_CORRIENDO, deNumero(INTOCABLE_MS / 1000)) / UNO;
const CERCA_AL_RENACER = por(VELOCIDAD_CORRIENDO, deNumero(CAIDO_MS / 1000)) / UNO;

/**
 * LOS PUNTOS DE JUEGO: los de una rejilla de `paso` donde se puede estar y a los que se llega andando
 * desde la primera Puerta, a cuatro vecinas.
 *
 * El paso es UNA unidad, y no más, porque una rejilla salta las paredes más finas que su paso: con
 * tres, las testeras de Delicias —dos de grueso, 2,8 con el radio de quien anda— quedaban entre dos
 * puntos libres, y la nave cerrada salía abierta. Se vio poniendo un sitio de nacer dentro: con tres,
 * «ninguno en un bolsillo» seguía verde. La pared más fina que encierra algo, la de la celda de la
 * comisaría, mide 1,2 (2,0 con el radio). Para la corona de los de renacer se usa uno de cada nueve
 * de estos puntos, que es la rejilla de tres, pero sólo los que se alcanzan de verdad.
 */
function puntosDeJuego(arena: Arena, paso: number): { readonly x: Float64Array; readonly z: Float64Array; readonly deLaRejillaDeTres: Uint8Array; readonly alcanzable: (x: number, z: number) => boolean } {
  const lado = Math.floor((2 * MEDIO_LADO_DEL_BURGO) / paso);
  const libre = new Uint8Array(lado * lado);
  for (let j = 0; j < lado; j++) {
    for (let i = 0; i < lado; i++) {
      const x = -MEDIO_LADO_DEL_BURGO + (i + 0.5) * paso;
      const z = -MEDIO_LADO_DEL_BURGO + (j + 0.5) * paso;
      if (sePuedeEstar(arena, enFijo(x), enFijo(z), RADIO_DEL_PASEANTE)) libre[j * lado + i] = 1;
    }
  }
  const puerta = NACE_EN_EL_BURGO[0] as { x: number; z: number };
  const inicio = Math.floor((puerta.z + MEDIO_LADO_DEL_BURGO) / paso) * lado + Math.floor((puerta.x + MEDIO_LADO_DEL_BURGO) / paso);
  const visto = new Uint8Array(lado * lado);
  const cola = new Int32Array(lado * lado);
  let puesta = 0;
  if (libre[inicio] === 1) {
    cola[puesta++] = inicio;
    visto[inicio] = 1;
  }
  for (let leida = 0; leida < puesta; leida++) {
    const k = cola[leida] as number;
    const i = k % lado;
    if (i > 0 && libre[k - 1] === 1 && visto[k - 1] === 0) {
      visto[k - 1] = 1;
      cola[puesta++] = k - 1;
    }
    if (i < lado - 1 && libre[k + 1] === 1 && visto[k + 1] === 0) {
      visto[k + 1] = 1;
      cola[puesta++] = k + 1;
    }
    if (k >= lado && libre[k - lado] === 1 && visto[k - lado] === 0) {
      visto[k - lado] = 1;
      cola[puesta++] = k - lado;
    }
    if (k < lado * (lado - 1) && libre[k + lado] === 1 && visto[k + lado] === 0) {
      visto[k + lado] = 1;
      cola[puesta++] = k + lado;
    }
  }
  const x = new Float64Array(puesta);
  const z = new Float64Array(puesta);
  const deLaRejillaDeTres = new Uint8Array(puesta);
  for (let n = 0; n < puesta; n++) {
    const k = cola[n] as number;
    const i = k % lado;
    const j = Math.floor(k / lado);
    x[n] = -MEDIO_LADO_DEL_BURGO + (i + 0.5) * paso;
    z[n] = -MEDIO_LADO_DEL_BURGO + (j + 0.5) * paso;
    if (i % 3 === 1 && j % 3 === 1) deLaRejillaDeTres[n] = 1;
  }
  const alcanzable = (px: number, pz: number): boolean => {
    const i = Math.floor((px + MEDIO_LADO_DEL_BURGO) / paso);
    const j = Math.floor((pz + MEDIO_LADO_DEL_BURGO) / paso);
    return i >= 0 && j >= 0 && i < lado && j < lado && visto[j * lado + i] === 1;
  };
  return { x, z, deLaRejillaDeTres, alcanzable };
}

/** Cuántos de `sitios` quedan a entre `LEJOS` y `CERCA` de `(x, z)`, contando hasta dos. */
function cuantosEnLaCorona(sitios: readonly { readonly x: number; readonly z: number }[], x: number, z: number): number {
  const lejos2 = LEJOS_AL_RENACER * LEJOS_AL_RENACER;
  const cerca2 = CERCA_AL_RENACER * CERCA_AL_RENACER;
  let n = 0;
  for (const s of sitios) {
    const d = (s.x - x) * (s.x - x) + (s.z - z) * (s.z - z);
    if (d >= lejos2 && d <= cerca2 && ++n >= 2) return n;
  }
  return n;
}

/**
 * LA REGLA DEL SERVIDOR PARA RENACER, escrita aquí con sus palabras (`sitioDeRenacer`): de los sitios
 * LIBRES —se puede estar y no hay otro a menos de cuatro radios en los dos ejes—, los que están a
 * `LEJOS` o más de quien tumbó; de ésos, el más cercano a donde se cayó. Si no hay ninguno tan lejos,
 * el libre más lejano de quien tumbó. Devuelve el elegido y su escalón.
 */
function dondeRenace(
  arena: Arena,
  sitios: readonly { readonly x: number; readonly z: number }[],
  otros: readonly { readonly x: number; readonly z: number }[],
  quienTumba: { readonly x: number; readonly z: number },
  dondeCae: { readonly x: number; readonly z: number },
): { readonly sitio: { readonly x: number; readonly z: number } | null; readonly escalon: 1 | 2 | 3 } {
  const separacion = (RADIO_DEL_PASEANTE * 4) / UNO;
  let cercano: { x: number; z: number } | null = null;
  let menor = Infinity;
  let lejano: { x: number; z: number } | null = null;
  let mayor = -1;
  for (const s of sitios) {
    if (!sePuedeEstar(arena, enFijo(s.x), enFijo(s.z), RADIO_DEL_PASEANTE)) continue;
    let ocupado = false;
    for (const o of otros) if (Math.abs(o.x - s.x) < separacion && Math.abs(o.z - s.z) < separacion) ocupado = true;
    if (ocupado) continue;
    const lejos = Math.hypot(s.x - quienTumba.x, s.z - quienTumba.z);
    if (lejos >= LEJOS_AL_RENACER) {
      const cerca = Math.hypot(s.x - dondeCae.x, s.z - dondeCae.z);
      if (cerca < menor) {
        menor = cerca;
        cercano = s;
      }
    } else if (lejos > mayor) {
      mayor = lejos;
      lejano = s;
    }
  }
  if (cercano !== null) return { sitio: cercano, escalon: 1 };
  if (lejano !== null) return { sitio: lejano, escalon: 2 };
  return { sitio: null, escalon: 3 };
}

{
  const faltan: unknown[] = [];
  const presos: unknown[] = [];
  let puntos = 0;
  let sinDos = 0;
  let conSoloLosDeEntrar = 0;
  let puntosDeLaVacuna = 0;
  for (const codigo of CODIGOS) {
    const mundo = mundos.get(codigo) as MundoDeclarado;
    const arena = arenaDe(mundo);
    const deJuego = puntosDeJuego(arena, 1);
    const deRenacer = mundo.nace.slice(NACE_EN_EL_BURGO.length);
    for (let n = 0; n < deJuego.x.length; n++) {
      if (deJuego.deLaRejillaDeTres[n] !== 1) continue;
      const x = deJuego.x[n] as number;
      const z = deJuego.z[n] as number;
      puntos++;
      const hay = cuantosEnLaCorona(deRenacer, x, z);
      if (hay < 2) {
        sinDos++;
        if (faltan.length < 6) faltan.push({ codigo, x, z, hay });
      }
      /* La vacuna, en uno de cada siete puntos: con sólo los de entrar. */
      if (n % 7 === 0) {
        puntosDeLaVacuna++;
        if (cuantosEnLaCorona(NACE_EN_EL_BURGO, x, z) === 0) conSoloLosDeEntrar++;
      }
    }
    for (let k = 0; k < mundo.nace.length; k++) {
      const s = mundo.nace[k] as { x: number; z: number };
      if (!deJuego.alcanzable(s.x, s.z)) presos.push({ codigo, sitio: k, s });
    }
  }
  console.log(
    `  entre ${LEJOS_AL_RENACER.toFixed(1)} y ${CERCA_AL_RENACER.toFixed(1)}: ${String(puntos)} puntos de juego en ${String(CODIGOS.length)} mesas, a ${String(3)} u · ` +
      `sin dos de los de renacer ${String(sinDos)} · con sólo los de entrar, sin ninguno en ${String(conSoloLosDeEntrar)} de ${String(puntosDeLaVacuna)} (${((100 * conSoloLosDeEntrar) / Math.max(1, puntosDeLaVacuna)).toFixed(0)} %)`,
  );
  comprobar('los de lejos y cerca son los de la regla: lo que se corre en los dos segundos de intocable y en los cinco de caído', Math.abs(LEJOS_AL_RENACER - 52.8) < 0.01 && Math.abs(CERCA_AL_RENACER - 132) < 0.01, { LEJOS_AL_RENACER, CERCA_AL_RENACER });
  comprobar('se han mirado cientos de miles de puntos donde se puede estar', puntos > 500000, { puntos });
  comprobar(`desde cada punto de juego hay por lo menos dos sitios de renacer a entre ${LEJOS_AL_RENACER.toFixed(1)} y ${CERCA_AL_RENACER.toFixed(1)}`, sinDos === 0, { sinDos, faltan });
  comprobar('y todos los sitios de nacer se alcanzan andando desde la primera Puerta: ninguno en un bolsillo', presos.length === 0, presos.slice(0, 4));
  comprobar('se ve fallar: con sólo los ocho de entrar, en más de la mitad de los puntos no hay ninguno', conSoloLosDeEntrar > puntosDeLaVacuna / 2, { conSoloLosDeEntrar, puntosDeLaVacuna });

  /*
   * EL CASO MEDIDO: seis sentados, los cuatro primeros en las Puertas sin bajar, y los dos que pelean
   * en los brazos de la glorieta —(0, 18) y (0, −18)—. Cae el de (0, −18).
   */
  const mundo = mundos.get('QWXYZ') as MundoDeclarado;
  const arena = arenaDe(mundo);
  const estatuas = NACE_EN_EL_BURGO.slice(0, 4);
  const quienTumba = NACE_EN_EL_BURGO[4] as { x: number; z: number };
  const dondeCae = NACE_EN_EL_BURGO[5] as { x: number; z: number };
  const conTodos = dondeRenace(arena, mundo.nace, [...estatuas, quienTumba], quienTumba, dondeCae);
  const conLosDeEntrar = dondeRenace(arena, NACE_EN_EL_BURGO, [...estatuas, quienTumba], quienTumba, dondeCae);
  const lejosDe = (r: typeof conTodos): number => (r.sitio === null ? NaN : Math.hypot(r.sitio.x - quienTumba.x, r.sitio.z - quienTumba.z));
  const cercaDe = (r: typeof conTodos): number => (r.sitio === null ? NaN : Math.hypot(r.sitio.x - dondeCae.x, r.sitio.z - dondeCae.z));
  console.log(
    `  cuatro en las Puertas y una pelea en la glorieta: renace a ${lejosDe(conTodos).toFixed(1)} de quien lo tumbó y a ${cercaDe(conTodos).toFixed(1)} de donde cayó (escalón ${String(conTodos.escalon)}); ` +
      `con sólo los de entrar, a ${lejosDe(conLosDeEntrar).toFixed(1)} (escalón ${String(conLosDeEntrar.escalon)})`,
  );
  comprobar(
    'en el caso medido —cuatro que no bajan en las Puertas y una pelea en la glorieta— se renace en el primer escalón: lejos de quien tumbó y cerca de donde se cayó',
    conTodos.escalon === 1 && lejosDe(conTodos) >= LEJOS_AL_RENACER && cercaDe(conTodos) <= CERCA_AL_RENACER,
    { escalon: conTodos.escalon, lejos: lejosDe(conTodos), cerca: cercaDe(conTodos) },
  );
  comprobar('se ve fallar: con sólo los de entrar, el mismo caso cae en el segundo escalón, a menos de lo que protege', conLosDeEntrar.escalon === 2 && lejosDe(conLosDeEntrar) < LEJOS_AL_RENACER, {
    escalon: conLosDeEntrar.escalon,
    lejos: lejosDe(conLosDeEntrar),
  });
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
  /*
   * Las filas de renacer del anillo se escribieron con las bandas de la escena: la primera, pasado el
   * carril del avatar y antes del atrezo; la segunda, antes del marco de fuera (que empieza en 90).
   */
  comprobar(
    'y las filas de renacer del anillo caen donde se escribieron: la primera entre el carril del avatar y el atrezo, la segunda antes del marco',
    V_DE_LA_PRIMERA_FILA > CARRIL_DEL_AVATAR.hasta + 2 && V_DE_LA_PRIMERA_FILA < ATREZO.desde && V_DE_LA_SEGUNDA_FILA > ATREZO.desde && V_DE_LA_SEGUNDA_FILA < BANDA.franja + BANDA.filete + BANDA.superficie,
    { V_DE_LA_PRIMERA_FILA, V_DE_LA_SEGUNDA_FILA, CARRIL_DEL_AVATAR, ATREZO, marco: BANDA.franja + BANDA.filete + BANDA.superficie },
  );
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
console.log('\nEl Burgo con el que se choca es uno solo: la traza, lo sólido de los distritos y lo que para de las');
console.log('obras del anillo, declarados en shared/, sin la calidad del aparato. Lo que la escena pinta en plena y');
console.log('en sobria es ese mismo mundo caja a caja, la ciudad es la de antes de la mudanza, quien se echa encima');
console.log('de una fachada se queda en ella, quien cae renace lejos de quien lo tumbó y cerca de donde cayó, y el');
console.log('mundo levantado y andado en Node y en Hermes deja la misma huella.');
