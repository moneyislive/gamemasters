/**
 * ¿JUEGA LA SALA DE LA LIZA LO QUE PROMETE?
 *
 *   npm run verify:liza -w server
 *
 * ═══ QUÉ AFIRMA ═══
 *
 * Que la sala pura de la Liza (`shared/mecanicas/liza/sala.ts` y sus piezas) cumple su contrato
 * (`tipos-de-la-sala.ts`, `declaracion.ts`) jugada de verdad: con aparatos simulados que tienen su propio
 * reloj, su ida y vuelta y un desfase que la E/S estima MAL a propósito, y con robots que leen lo que les
 * llega por el cable —no el estado de la sala— para decidir cuándo esquivar.
 *
 * Todo se prueba con una LIZA DE JUGUETE que no es ningún juego: una plaza de 50 unidades con un quiosco,
 * un coche, un muro y un banco; una clase de entidad (que en una variante dispara); un proyectil; un
 * portable; dos zonas de acción. Es la regla del §11 del diseño: ninguna declaración entra sin un uso que
 * no sea el juego que la pidió.
 *
 * ═══ LOS BLOQUES ═══
 *
 *   0. La liza de juguete y sus variantes se declaran sin problemas.
 *   1. Nacer y empezar la fase: los seis pasos, la semilla.
 *   2. Conexión, bienvenida y puesta al día, con los instantes reescritos en el reloj nuevo; y quien
 *      conecta mientras otro golpea recibe cada anuncio una vez, en su orden.
 *   3. Validación del sitio y corrección: presupuestos corto y largo, estructura, escuadra, límite,
 *      silencio tras corregir (que calla lo que venía de camino y no la esquiva de después), distancia
 *      extra de la esquiva, y la escuadra para el tramo de un tic del aparato también al esquivar.
 *   4. EL JUICIO DE LA ESQUIVA NO DEPENDE DEL DESFASE (condición de aprobación del diseño): el mismo
 *      veredicto con el desfase estimado con 0, +40 y −40 ms de error, con 50, 150 y 250 ms de ida y
 *      vuelta y con el aparato en nueve puntos de su tic; y las primeras, la torpe, la imparable, la
 *      ruptura, el intocable y la repetición.
 *   5. Remanso y Réplica (esquivar dentro del premio no lo acaba); acometida tras una limpia contra una
 *      bala.
 *   6. La cadena y el «al ritmo», juzgados en el reloj del aparato.
 *   7. La guardia: de frente para y responde; por la espalda no; lo que la rompe pasa.
 *   8. El empujón: choque sólo con caja, y el premio del choque.
 *   9. Las balas contra los sitios DECLARADOS, esperados hasta 250 ms; paradas por la estructura.
 *  10. Los turnos: tope por asiento, ninguno a quien está en su premio, ni al ausente, y la ráfaga que se
 *      corta si su blanco entra en su premio.
 *  11. Lo que se lleva se conserva en todo tic; la zona de uno en uno; y (11 bis) quien cae suelta lo
 *      que lleva y otro lo recoge, el rescate, y la reaparición pagando el recurso.
 *  12. Los finales del encuentro y los veredictos (ronda, reloj una vez, ausente una vez); y un asiento
 *      vacío —sin canal, o ausente— no sostiene el encuentro pasados los `veredictoTrasTics`.
 *  13. Un robot que LEE saca al menos el doble que uno que APORREA.
 *  14. Determinismo: el mismo paso con la misma semilla, el estado de entrada intacto, la sala rehecha
 *      que reanuda, y la MISMA huella tic a tic en Node y en Hermes.
 *  15. El coste: microsegundos por tic de una sala llena (6 asientos, 14 entidades, 12 balas) en Node.
 *  16. Las declaraciones de El Quiebro, si su productor ya existe; y cada una de sus clases, sola contra
 *      un asiento quieto, ataca.
 *  17. Lo que las de arriba daban por supuesto: la foto cada dos tics, los presentes, un anuncio en el
 *      reloj de cada destinatario, el alargue del comp, soltar la esquiva, la línea de vista del
 *      enganche, el intocable al aparecer, el grafo, el trasvase, la reimpresión, los avisos, el pago
 *      triangular al salir, la zona que se enciende al pagar y la que se rompe con un golpe; y que rondar
 *      es esperar turno: quien puede golpear se acerca a su alcance, y quien dispara busca la vista.
 *  18. El Quiebro jugado de verdad —sus declaraciones de dos mesas, de 1 a 4 asientos y tres semillas,
 *      con robots que golpean, pasean y se quedan quietos—: ninguna entidad pasa más de 3 s junto a su
 *      blanco, con turno posible, sin anunciar y sin ir a ninguna parte, y todas entran en el límite de la
 *      fase antes de 5 s —también con los asientos caídos o ausentes, sin nadie a quien perseguir—, ninguna
 *      pasa más de 10 s acechando a su blanco lejos de él sin moverse (el bolsillo de la cabina); la
 *      Réplica tras el quiebro de lado de 3,5 m da con 100 y 250 ms de ida y vuelta, y el golpe tras el
 *      vuelo contra una bala con 60, 150 y 250; y cada ráfaga de sus tiradores sale con su línea de apuntado.
 *  19. El ausente momentáneo: el aparato frenado (la pestaña oculta, que manda sus `aqui` de golpe una
 *      vez por segundo) o congelado queda ausente a los 2 s, intocable e ignorado, y lo que venía contra él
 *      se corta sin daño; vuelve al primer `aqui` VIVO, con su intocable; y no es el que se fue.
 *  20. El golpe con avance llega aunque el paso del aparato llegue tarde; la respuesta de la guardia no
 *      abre; un reloj de fase nuevo dentro de la misma fase se vuelve a armar sin empezar la fase otra vez.
 *  21. La línea de apuntado (`apunta`): sale al empezar a apuntar, se fija en la salida exacta de la
 *      primera bala, se deja si el blanco se queda ausente, y llega en la puesta al día.
 *  22. Lo que encontró la revisión del pulido: quien juega saltándose tics no queda ausente (la sala sale
 *      igual que sin ausente); el ausente ni anda ni pega, y lo que lanzó se corta; su vuelta es corta y
 *      se acaba al golpear; el ausente se cuenta entero en la fase; el avance no se regala a quien no
 *      avanza; el golpe tras el vuelo contra una bala da si el aparato vuela y no si no; y las que nacen
 *      fuera sin nadie a quien perseguir entran, rodeando lo que las tapa.
 *  23. La Liza por dentro (el diseño de la ciudad abierta, §5.4), en ciudades de juguete de 300 × 300
 *      (`lizaAbierta`): `primeraLosa` por celdas contra la fuerza bruta en 100.000 tramos de cada uno de
 *      veinte mundos, empates incluidos; los K nudos más cercanos por celdas contra la lista; los campos por
 *      meta contra el Dijkstra entero; la MISMA sala tic a tic con y sin índices; y la validación del
 *      mundo, una vez por mundo y con las mismas frases con memoria y sin ella.
 *  24. L10, el alcance de blanco y el olvido (la ciudad abierta, §3.4 y §5.5): el alcance exacto en su
 *      frontera (1/65536 de más o de menos), el tirador que suelta su línea cuando el blanco se le va, el
 *      olvido al tic y en su frontera, la olvidada que vuelve a la cola (un `vaciar` no se gana alejándose),
 *      el ausente que no acompaña y el caído que sí, la caída y la deshecha sin reloj, la ciudad de juguete
 *      jugada contra la regla escrita aparte tic a tic, y la forma transitoria sin L10 igual a la de antes; y
 *      la franja entre el alcance y el olvido: la que se queda sin blanco acompañada se acerca, en la frontera
 *      exacta y en la ciudad, y ninguna se queda parada ahí.
 *  25. La revisión de la entrega 1 de la ciudad abierta: la entidad cuyo camino hasta su blanco rodea una
 *      manzana llega a anunciarle (en la ciudad de juguete y en la de El Quiebro), en los combates de El
 *      Quiebro con todos huyendo por las calles ninguna se queda parada en la franja, y un mundo nuevo —una
 *      fase nueva, o el mismo mundo cambiado dentro de la fase— no deja a ningún asiento dentro de una caja
 *      (también con las noches de verdad de El Quiebro).
 *
 * ═══ LO QUE ESTE COMPROBADOR ENCONTRÓ MIENTRAS SE ESCRIBÍA ═══
 *
 * No son adorno: cada uno es una comprobación de aquí que se puso roja con la sala de verdad.
 *   · El ausente sólo llegaba a quien estaba libre: a quien se le cae la red en mitad de un combate, cada
 *     golpe lo dejaba tocado y el ausente no llegaba nunca (bloque 10).
 *   · Las entidades que llegaban detrás de la primera no la rodeaban: seis encima de un asiento y UNA
 *     atacando (bloque 10).
 *   · El cerebro paraba en la distancia máxima de su banda y no en la mínima: con los números de un juego
 *     de verdad (banda de 1,0 a 1,8 y golpe de 1,1) no atacaba nunca (bloque 16).
 *   · Las que salían de una zona fuera del límite de la fase no daban un paso (bloque 16).
 *   · Una esquiva pronta pero dentro de su ventana salía «fallada», porque ya había sacado al asiento del
 *     alcance (bloque 4; ver `ticDelAlcance` en `combate.ts`).
 * Y dos del juego que se dicen en el informe del frente: la réplica sin avance no llega tras una esquiva
 * de lado, y la esquiva que desplaza sirve para huir aporreando aunque salga torpe.
 *
 * ═══ LO QUE ENCONTRÓ LA REVISIÓN, Y ESTE COMPROBADOR NO VEÍA ═══
 *
 * Una revisión adversaria de la primera entrega midió seis fallos con 131 comprobaciones en verde encima.
 * Cada uno tiene ahora la suya, y cada una se vio roja con la sala que se revisó (`rojos2.py`, fase A):
 *   · Un asiento sin canal (o que cerró la pestaña) no dejaba perder: intocable, nadie lo persigue, no cae,
 *     y contaba como alguien que podía seguir (bloque 12).
 *   · El duelista de El Quiebro rondaba mil tics a 1,25 m sin atacar: su banda empieza en 1,3 y su golpe
 *     llega a 1,1; y el tirador rondaba sin línea de vista sin buscarla (bloques 16 y 17).
 *   · Esquivar dentro del Remanso lo acababa, y con él su intocable y su Réplica (bloque 5).
 *   · La esquiva que empezaba justo tras un `corrige` se callaba entera y acababa en otro, y las de junto a
 *     una esquina se corregían porque la escuadra era sólo para pasos de andar (bloque 3).
 *   · Si una esquiva a tiempo salía limpia dependía de la fase del aparato dentro del tic: el bloque 4 sólo
 *     probaba una (bloque 4).
 *   · Quien conectaba en el paso en que otro golpeaba recibía el anuncio dos veces (bloque 2).
 * Y dos de sus observaciones: la ráfaga seguía contra quien entraba en su premio (bloque 10), y la
 * repetición sin autor se anunciaba contra quien ya estaba en el suelo (bloque 4).
 *
 * ═══ VISTO EN ROJO ═══
 *
 * Cada comprobación se vio fallar rompiendo a propósito la sala en una COPIA del árbol, nunca en los
 * ficheros de verdad (otros frentes compilan contra ellos a la vez): `scratchpad/sala/rojos.py` monta el
 * espejo, aplica cada rotura, corre este guion, exige salida distinta de 0 con la comprobación esperada
 * en rojo, restaura y compara con `cmp`; `scratchpad/sala/pasada2/rojos2.py` hace lo mismo con las
 * roturas de la segunda pasada, y antes pone en el espejo la sala que se revisó. La lista de roturas y
 * qué comprobación cazó cada una está en el informe del frente.
 *
 * La tercera pasada (el pulido de las reglas de la sala, 24-sep-2026: el ausente momentáneo, la Réplica
 * con avance, la respuesta que no abre, el reloj que se vuelve a armar, los NPC que no se quedan quietos
 * ni fuera, y la línea de apuntado) hizo lo mismo con `scratchpad/pulido-reglas-sala/roturas.py`: cada
 * comprobación nueva de los bloques 18 a 21 se vio roja con su rotura, y el cerebro de antes entero
 * (`npc-cerebro-viejo`) tumba las dos del bloque 18 que miden a los NPC.
 *
 * Y su revisión (la cuarta pasada) con `scratchpad/pulido-reglas-sala/p2/roturas2.py`: cada comprobación
 * del bloque 22 y las dos nuevas del 18 se vieron rojas con la regla de antes puesta otra vez en un espejo.
 *
 * Las de L10 (bloque 24), con `scratchpad/ciudad-liza/ola-b/rojos.py`: once roturas de la sala, cada una
 * con su comprobación en rojo. Dos no se vieron a la primera y cambió la comprobación, no la rotura: el
 * alcance que sólo se mira al repensar (cada cuatro tics) acababa el tic a 44,9 porque la entidad anda hacia
 * su blanco después de mirarlo —ahora se comprueba que lo suelta EN EL TIC, con la regla escrita aquí—; y
 * el olvido a la distancia menos uno no se veía porque la frontera se medía a la esquina de la zona y no al
 * sitio en que la entidad sale de verdad.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { arnes } from './arnes';
import { UNO } from '../../shared/mecanicas/fijo';
import { DT_DEL_TIC, COSENO, SENO } from '../../shared/mecanicas/andar';
import { arenaDe, seAndaEnRecta, sePuedeEstar, unPaso } from '../../shared/mecanicas/mundo';
import type { Arena } from '../../shared/mecanicas/mundo';
import {
  alcanceDeBlancoDe,
  arenaDeLaLiza,
  leerCargaDeRonda,
  olvidoDelEncuentro,
  problemasDeLaDeclaracion,
  validacionesDelMundo,
  VERSION_DE_LA_DECLARACION,
  VEREDICTO_DE_AUSENTE,
  VEREDICTO_DE_RELOJ,
  VEREDICTO_DE_RONDA,
} from '../../shared/mecanicas/liza/declaracion';
import type {
  AccionDeclarada,
  CargaDeRonda,
  ClaseDeEntidad,
  ColumnaDeCuenta,
  EfectoDeclarado,
  FaseDeLaLiza,
  GrupoDeclarado,
  LizaDeclarada,
  OlvidoDeclarado,
  PuestaDeEstado,
  ReglasDeAsiento,
} from '../../shared/mecanicas/liza/declaracion';
import { CLASE_DE_CAJA, CONTADORES_DE_ASIENTO } from '../../shared/mecanicas/liza/declaracion';
import { leerMensajeDeLaSala, MOTIVO_DE_IRSE, PRIMER_NUMERO_DE_ENTIDAD, RESULTADO, textoDeLaSala, TOPE_DE_AQUIS_DE_GOLPE } from '../../shared/mecanicas/liza/protocolo';
import type { SucesoDelTic, TuplaDeFoto } from '../../shared/mecanicas/liza/protocolo';
import type {
  AccionRecibida,
  EntradaDeLaSala,
  EstadoDeLaSala,
  PasoDeLaSala,
} from '../../shared/mecanicas/liza/tipos-de-la-sala';
import { AQUIS_PARA_ESTAR, TICS_DE_LA_VUELTA } from '../../shared/mecanicas/liza/tipos-de-la-sala';
import { avanzarLaSala, huellaDeLaSala, salaNueva } from '../../shared/mecanicas/liza/sala';
import { canonico, porQueNoEsCanonico } from '../../shared/mecanicas/canonico';
import { sitioDeLaBala } from '../../shared/mecanicas/liza/proyectiles';
import { rumboHacia } from '../../shared/mecanicas/liza/geometria';
import type { CuentasDeLosIndices } from '../../shared/mecanicas/liza/geometria';
import {
  A,
  accion,
  anunciosContraMi,
  Aparato,
  AzarDeJuguete,
  ALCANCE_DE_LA_ABIERTA,
  bancoDeLaCiudad,
  corredor,
  EJES_DEL_MUNDO_ABIERTO,
  lizaAbierta,
  lizaAbiertaConOlvido,
  OLVIDO_DE_LA_ABIERTA,
  aporreador,
  Banco,
  bancoLleno,
  caja,
  CAJAS,
  clase,
  claseTiradora,
  COLUMNAS,
  efecto,
  E,
  fnv,
  grupoFijo,
  guerrero,
  IDS_DEL_JUGUETE,
  idsDe,
  juguete,
  lector,
  lizaLlena,
  lizaSinBlanco,
  montarJuguete,
  paseante,
  TICS_PARA_ENTRAR,
  TICS_ATASCADA,
  TICS_QUIETA,
  vigilarLasLineas,
  vigilarLosNpc,
  por,
  porN,
  premioDe,
  puesta,
  quieto,
  reglas,
  salidasDe,
  u,
} from './liza-de-juguete';
import type { IdsDelRobot, OpcionesDelJuguete, Robot } from './liza-de-juguete';

const { comprobar, paso, nota, terminar } = arnes();

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(AQUI, '..', '..');


/* ─── AYUDAS PARA LEER LO QUE SALIÓ ──────────────────────────────────────── */

function sucesosDe<T extends SucesoDelTic['e']>(b: Banco, e: T): { k: number; s: Extract<SucesoDelTic, { e: T }> }[] {
  const t: { k: number; s: Extract<SucesoDelTic, { e: T }> }[] = [];
  for (const x of b.sucesos()) if (x.s.e === e) t.push({ k: x.k, s: x.s as Extract<SucesoDelTic, { e: T }> });
  return t;
}

/** Un banco de un asiento, con el aparato dado, conectado desde el primer tic. */
function bancoDeUno(d: LizaDeclarada, aparato: Aparato, semilla = 7): Banco {
  const b = new Banco(d, semilla, [aparato]);
  b.conectar(1);
  return b;
}

const NOMBRE_DEL_RESULTADO: Record<number, string> = {
  [RESULTADO.da]: 'da',
  [RESULTADO.limpia]: 'limpia',
  [RESULTADO.esquivada]: 'esquivada',
  [RESULTADO.parada]: 'parada',
  [RESULTADO.fallada]: 'fallada',
  [RESULTADO.cortada]: 'cortada',
};

/* ═══════════════════════════════════════════════════════════════════════════
 * 0 · LA LIZA DE JUGUETE SE DECLARA BIEN
 * ═══════════════════════════════════════════════════════════════════════════ */

paso('0 · La liza de juguete y sus variantes se declaran sin problemas');
{
  /*
   * `montarJuguete` y no `juguete`: éste revienta con una declaración rota, y entonces estas cuatro no
   * podrían salir rojas nunca (la campaña de roturas las vio así, siempre verdes). Aquí se dice CUÁL
   * está mal y por qué; las pruebas de después siguen usando `juguete`, que no las deja empezar.
   */
  const variantes: [string, LizaDeclarada][] = [
    ['la de dos asientos', montarJuguete({})],
    ['la llena (seis asientos, tirador)', montarJuguete({ asientos: 6, clase: claseTiradora() })],
    ['la de salida por zona', montarJuguete({ fin: 'salida' })],
    ['la de calma', montarJuguete({ modo: 'calma' })],
  ];
  for (const [nombre, d] of variantes) {
    const problemas = problemasDeLaDeclaracion(d);
    comprobar(`${nombre} no tiene problemas`, problemas.length === 0, problemas.slice(0, 5));
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 1 · NACER Y EMPEZAR LA FASE
 * ═══════════════════════════════════════════════════════════════════════════ */

paso('1 · Nacer y empezar la fase');
{
  const d = juguete();
  const s0 = salaNueva(d, 99);
  comprobar(
    'la sala nace en el tic 0, sin nadie conectado, sin cuerpos y con la fase sin empezar',
    s0.tic === 0 && s0.fase.clave === '' && s0.asientos.every((a) => !a.conectado && !a.conCuerpo) && s0.entidades.length === 0,
  );
  const p1 = avanzarLaSala(s0, []);
  const fase = p1.sucesos.find((x) => x.suceso.e === 'fase');
  comprobar(
    'el primer paso EMPIEZA la fase: cuenta la fase a todos con su clave y el reloj del encuentro entero',
    fase !== undefined && fase.para === 0 && fase.suceso.e === 'fase' && fase.suceso.clave === 'n1-e1' && fase.suceso.encuentroTics === 6000,
    fase,
  );
  comprobar(
    'todos tienen cuerpo en su sitio de nacer, con su punto de control, libres y con los contadores a cero',
    p1.sala.asientos.every((a, i) => a.conCuerpo && a.x === (d.mundo.nace[i] as { x: number }).x && a.vida === 100 && a.estado === null && a.contadores.esquivas === 0),
  );
  comprobar('el recurso es el del equipo y el encuentro empieza en este tic', p1.sala.recurso === 2 && p1.sala.encuentro !== null && p1.sala.encuentro.desdeTic === 1);
  comprobar('y salen ya las primeras entidades del grupo (con su nace)', p1.sala.entidades.length >= 1 && p1.sucesos.some((x) => x.suceso.e === 'nace'));
  comprobar('el estado que entra no se toca', huellaDeLaSala(s0) === huellaDeLaSala(salaNueva(d, 99)));
  const otra = avanzarLaSala(salaNueva(d, 100), []);
  const mismas = avanzarLaSala(salaNueva(d, 99), []);
  comprobar(
    'la semilla decide: con otra, las entidades salen en otro sitio; con la misma, en el mismo',
    huellaDeLaSala(otra.sala) !== huellaDeLaSala(p1.sala) && huellaDeLaSala(mismas.sala) === huellaDeLaSala(p1.sala),
  );
  const conOtraFase = { ...d, fase: { ...d.fase, clave: 'n1-p1', modo: 'calma' as const, encuentro: null } };
  let s = p1.sala;
  for (let i = 0; i < 5; i++) s = avanzarLaSala(s, []).sala;
  const p2 = avanzarLaSala(s, [{ tipo: 'vista', declaracion: conOtraFase }]);
  const sevas = p2.sucesos.filter((x) => x.suceso.e === 'seva');
  comprobar(
    'una vista con OTRA clave empieza otra fase: se va todo lo que vivía (seva disuelta), y la fase nueva sale',
    sevas.length === s.entidades.length && sevas.every((x) => x.suceso.e === 'seva' && x.suceso.por === MOTIVO_DE_IRSE.disuelta) && p2.sala.fase.clave === 'n1-p1' && p2.sala.entidades.length === 0,
    { sevas: sevas.length, entidades: s.entidades.length },
  );
  comprobar('y en la fase nueva el azar se vuelve a sembrar con SU semilla', p2.sala.azar.semilla === conOtraFase.fase.semilla && p2.sala.azar.tiradas === 0);
  const mismaClave = { ...d, fase: { ...d.fase, semilla: 777 } };
  const p3 = avanzarLaSala(s, [{ tipo: 'vista', declaracion: mismaClave }]);
  comprobar('una vista con la MISMA clave no empieza nada: las entidades siguen', p3.sala.entidades.length === s.entidades.length && !p3.sucesos.some((x) => x.suceso.e === 'seva'));
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 2 · CONEXIÓN, BIENVENIDA Y PUESTA AL DÍA
 * ═══════════════════════════════════════════════════════════════════════════ */

paso('2 · Conexión, bienvenida y puesta al día');
{
  const d = juguete({ asientos: 1, clase: claseTiradora(), grupos: (n) => [grupoFijo(n, 1, 8)], zonasExtra: [{ id: 8, clase: 8, caja: caja(18, -20, 20, -18) }], nace: [{ x: 14, z: -14 }] });
  const ap = new Aparato(1, 5000, 0, 100, 10, quieto);
  const b = new Banco(d, 3, [ap]);
  b.conectar(1);
  let conBala = -1;
  let conAnuncio = -1;
  for (let i = 0; i < 400 && (conBala < 0 || conAnuncio < 0); i++) {
    b.tic();
    if (conBala < 0 && b.sala.balas.length > 0) conBala = b.k;
    if (conAnuncio < 0 && b.sala.anuncios.length > 0) conAnuncio = b.k;
  }
  const primero = b.pasos[0] as PasoDeLaSala;
  const bienvenida = primero.bienvenidas[0];
  comprobar('la primera conexión da una bienvenida en el sitio de nacer', bienvenida !== undefined && bienvenida.asiento === 1 && bienvenida.x === u(14) && bienvenida.z === u(-14), bienvenida);
  comprobar('el tirador llegó a disparar a quien se queda quieto (hay bala en vuelo)', conBala > 0, conBala);
  /* Reconectar con OTRO desfase: todo lo pendiente tiene que llegar en el reloj nuevo. */
  while (b.sala.balas.length === 0 && b.k < 800) b.tic();
  const sala = b.sala;
  const bala = sala.balas[0];
  const nuevoDesfase = 777777;
  const p = avanzarLaSala(sala, [{ tipo: 'conexion', asiento: 1, rttMs: 60, desfaseMs: nuevoDesfase }]);
  const suyos = p.sucesos.filter((x) => x.para === 1).map((x) => x.suceso);
  const orden = suyos.map((s) => s.e);
  const clasesEnOrden = ['fase', 'recurso', 'cuenta', 'nace', 'bala'];
  let ultimo = -1;
  let enOrden = true;
  for (const c of clasesEnOrden) {
    const i = orden.indexOf(c as SucesoDelTic['e']);
    if (i < 0 || i < ultimo) enOrden = false;
    ultimo = i < 0 ? ultimo : i;
  }
  comprobar('quien reconecta recibe su dentro y la puesta al día EN ORDEN (fase, recurso, cuentas, nace, balas…)', p.bienvenidas.length === 1 && enOrden, orden);
  const sucesoBala = suyos.find((s) => s.e === 'bala');
  comprobar(
    'y la bala le llega con la salida en su reloj NUEVO (salida de la sala + desfase nuevo)',
    bala !== undefined && sucesoBala !== undefined && sucesoBala.e === 'bala' && sucesoBala.t === bala.salioEnTic * 50 + nuevoDesfase,
    { suceso: sucesoBala, salio: bala?.salioEnTic },
  );
  const salaTras = p.sala;
  comprobar(
    'la bala guardada en la sala se reescribió con el desfase nuevo',
    salaTras.balas.length > 0 && salaTras.balas[0]!.salidaEnSuReloj[0] === salaTras.balas[0]!.salioEnTic * 50 + nuevoDesfase,
  );
  const tras = avanzarLaSala(salaTras, [{ tipo: 'aqui', asiento: 1, n: 0, x: salaTras.asientos[0]!.x, z: salaTras.asientos[0]!.z, r: 0, m: 0, accion: null, desfaseMs: nuevoDesfase }]);
  comprobar(
    'un canal nuevo es un reloj nuevo: tras reconectar, su aqui con n = 0 se acepta (no se tira por viejo)',
    tras.sala.asientos[0]!.ultimoTicDelAparato === 0,
    tras.sala.asientos[0]!.ultimoTicDelAparato,
  );
  /* Un anuncio pendiente, reescrito para quien reconecta. */
  const dm = juguete({ asientos: 1, grupos: (n) => [grupoFijo(n, 1, 7)], zonasExtra: [{ id: 7, clase: 7, caja: caja(-0.2, -6.9, 0.2, -6.6) }], nace: [{ x: 0, z: -8 }] });
  const b2 = bancoDeUno(dm, new Aparato(1, 9000, 0, 100, 10, quieto));
  while (b2.sala.anuncios.length === 0 && b2.k < 300) b2.tic();
  const an = b2.sala.anuncios[0];
  const p4 = avanzarLaSala(b2.sala, [{ tipo: 'conexion', asiento: 1, rttMs: 100, desfaseMs: 4242 }]);
  const anuncioSuyo = p4.sucesos.find((x) => x.para === 1 && x.suceso.e === 'anuncio');
  comprobar(
    'un anuncio pendiente contra quien reconecta le llega con el impacto en su reloj nuevo, y así queda guardado (tBlanco)',
    an !== undefined &&
      anuncioSuyo !== undefined &&
      anuncioSuyo.suceso.e === 'anuncio' &&
      anuncioSuyo.suceso.t === an.impactoMs + 4242 &&
      p4.sala.anuncios[0]!.tBlanco === an.impactoMs + 4242,
    { an, anuncioSuyo },
  );
  comprobar('todo lo que sale por el cable lo admite el lector estricto del aparato', todoSeLee(b.pasos) && todoSeLee([p, p4]));

  /*
   * Quien conecta en el MISMO paso en que otro lanza un golpe, con su conexión delante del `aqui` del
   * golpe: lo encontró la revisión del frente. El anuncio le llegaba dos veces, y la primera antes de su
   * puesta al día (antes de saber en qué fase está).
   */
  const dd = juguete({ asientos: 2, clase: sacoQuieto(), grupos: (n) => [grupoFijo(n, 1, 9)], zonasExtra: [{ id: 9, clase: 9, caja: caja(-0.1, -6.6, 0.1, -6.4) }], nace: [{ x: 0, z: -8 }, { x: 6, z: -8 }] });
  /* A mano y sin `Mano` (que se declara más abajo, en el bloque 3). */
  let sd = avanzarLaSala(salaNueva(dd, 1), [{ tipo: 'conexion', asiento: 1, rttMs: 100, desfaseMs: 0 }]).sala;
  for (let i = 0; i < 20; i++) sd = avanzarLaSala(sd, [{ tipo: 'aqui', asiento: 1, n: sd.tic + 1, x: sd.asientos[0]!.x, z: sd.asientos[0]!.z, r: 0, m: 0, accion: null, desfaseMs: 0 }]).sala;
  const saco1 = sd.entidades[0]?.numero ?? 16;
  const golpe: EntradaDeLaSala = { tipo: 'aqui', asiento: 1, n: sd.tic + 1, x: sd.asientos[0]!.x, z: sd.asientos[0]!.z, r: 0, m: 0, accion: { id: A.entrada, msDelAparato: (sd.tic + 1) * 50, blanco: saco1 }, desfaseMs: 0 };
  const pd = avanzarLaSala(sd, [{ tipo: 'conexion', asiento: 2, rttMs: 100, desfaseMs: 777 }, golpe]);
  const suyosD = pd.sucesos.filter((x) => x.para === 2).map((x) => x.suceso.e);
  const anunciosD = suyosD.filter((e) => e === 'anuncio').length;
  comprobar(
    'quien conecta en el paso en que otro golpea recibe ese anuncio UNA vez, dentro de su puesta al día (detrás de su fase)',
    anunciosD === 1 && suyosD.indexOf('anuncio') > suyosD.indexOf('fase') && suyosD.indexOf('fase') >= 0,
    suyosD,
  );
  /*
   * Y lo que se lanza DESPUÉS de su puesta al día, en ese mismo paso —el golpe que una entidad decide al
   * simular—, le llega como a todos: callarle los anuncios mientras no está al día es sólo eso, mientras.
   */
  let sg = avanzarLaSala(salaNueva(dm, 1), [{ tipo: 'conexion', asiento: 1, rttMs: 100, desfaseMs: 0 }]).sala;
  let antesDelGolpe: EstadoDeLaSala | null = null;
  for (let i = 0; i < 300 && antesDelGolpe === null; i++) {
    const p = avanzarLaSala(sg, [{ tipo: 'aqui', asiento: 1, n: sg.tic + 1, x: sg.asientos[0]!.x, z: sg.asientos[0]!.z, r: 0, m: 0, accion: null, desfaseMs: 0 }]);
    if (p.sala.anuncios.some((an) => an.de >= 16 && an.lanzadoEnTic === p.sala.tic)) antesDelGolpe = sg;
    else sg = p.sala;
  }
  const pg = antesDelGolpe === null ? null : avanzarLaSala(antesDelGolpe, [{ tipo: 'conexion', asiento: 1, rttMs: 100, desfaseMs: 4242 }]);
  const nuevoG = pg === null ? undefined : pg.sala.anuncios.find((an) => an.de >= 16 && an.lanzadoEnTic === pg.sala.tic);
  const anunciosG = pg === null ? [] : pg.sucesos.filter((x) => x.para === 1 && x.suceso.e === 'anuncio').map((x) => x.suceso as { id: number; t: number });
  comprobar(
    'y el golpe que una entidad lanza en ese mismo paso, detrás de su puesta al día, le llega una vez y en su reloj nuevo',
    nuevoG !== undefined && anunciosG.length === 1 && anunciosG[0]!.id === nuevoG.id && anunciosG[0]!.t === nuevoG.impactoMs + 4242,
    { nuevoG, anunciosG },
  );
}

/** ¿Pasa por `leerMensajeDeLaSala` cada `tic` y cada foto que la E/S escribiría con estos pasos? */
function todoSeLee(pasos: readonly PasoDeLaSala[]): boolean {
  for (const p of pasos) {
    const k = p.sala.tic;
    for (let i = 0; i < p.sucesos.length; i += 200) {
      const ev = p.sucesos.slice(i, i + 200).map((s) => s.suceso);
      if (leerMensajeDeLaSala(textoDeLaSala({ t: 'tic', k, ev })) === null) {
        nota(`no se lee: ${JSON.stringify(ev).slice(0, 400)}`);
        return false;
      }
    }
    if (p.fotoDebida !== null && leerMensajeDeLaSala(textoDeLaSala({ t: 'foto', k, p: p.fotoDebida })) === null) return false;
    for (const c of p.correcciones) if (leerMensajeDeLaSala(textoDeLaSala({ t: 'corrige', n: c.n, x: c.x, z: c.z })) === null) return false;
    for (const w of p.bienvenidas) if (leerMensajeDeLaSala(textoDeLaSala({ t: 'dentro', yo: w.asiento, k, x: w.x, z: w.z, r: w.r, hz: 20 })) === null) return false;
  }
  return true;
}


/* ═══════════════════════════════════════════════════════════════════════════
 * 3 · VALIDACIÓN DEL SITIO Y CORRECCIÓN
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * UNA MANO que lleva a un asiento con `aqui` escritos a mano, uno por tic, con desfase 0 (su tic del
 * aparato es el de la sala). Sin red: aquí se prueba la validación, no el reloj.
 */
class Mano {
  sala: EstadoDeLaSala;
  readonly n: number;
  /** `rtt` es la ida y vuelta que la sala cree que tiene: dice cuántos `aqui` venían de camino tras un `corrige`. */
  constructor(d: LizaDeclarada, n = 1, rtt = 100) {
    this.n = n;
    this.sala = avanzarLaSala(salaNueva(d, 1), [{ tipo: 'conexion', asiento: n, rttMs: rtt, desfaseMs: 0 }]).sala;
  }
  get yo(): EstadoDeLaSala['asientos'][number] {
    return this.sala.asientos[this.n - 1] as EstadoDeLaSala['asientos'][number];
  }
  paso(entradas: EntradaDeLaSala[]): PasoDeLaSala {
    const p = avanzarLaSala(this.sala, entradas);
    this.sala = p.sala;
    return p;
  }
  ir(x: number, z: number, accion: AccionRecibida | null = null, n = this.sala.tic + 1): PasoDeLaSala {
    return this.paso([{ tipo: 'aqui', asiento: this.n, n, x, z, r: 0, m: 2, accion, desfaseMs: 0 }]);
  }
  /** Anda en línea recta hasta `(x, z)` a `paso` por tic. Devuelve cuántas correcciones hubo. */
  caminar(x: number, z: number, paso = u(0.25)): number {
    let correcciones = 0;
    for (let i = 0; i < 2000; i++) {
      const dx = x - this.yo.x;
      const dz = z - this.yo.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d <= paso) {
        correcciones += this.ir(x, z).correcciones.length;
        return correcciones;
      }
      correcciones += this.ir(this.yo.x + Math.round((dx * paso) / d), this.yo.z + Math.round((dz * paso) / d)).correcciones.length;
    }
    return correcciones;
  }
  esperar(tics: number): void {
    for (let i = 0; i < tics; i++) this.ir(this.yo.x, this.yo.z);
  }
}

paso('3 · Validación del sitio y corrección');
{
  const d = juguete({ asientos: 1, modo: 'calma', nace: [{ x: 0, z: -8 }] });
  /*
   * Con un segundo de ida y vuelta: lo que el aparato manda en los diez tics que siguen a un `corrige`
   * todavía salió desde el sitio malo (el `corrige` aún no le había llegado), y es lo que se calla.
   */
  const m = new Mano(d, 1, 1000);
  /*
   * 20 m y no 4: el presupuesto corto acumula 8,75 m (20 tics a 8,75 m/s), y con 4 m no se gastaba ni
   * la mitad aunque no se rellenara nunca (la campaña de roturas lo vio: rellenarlo a la cuarta parte
   * dejaba esto en verde). Ida y vuelta por la plaza, sin cajas en medio.
   */
  let correccionesAndando = 0;
  for (const z of [-4, -8, -4, -8, -4]) correccionesAndando += m.caminar(0, u(z));
  comprobar('andar a 5 m/s por la plaza (20 m, más de lo que acumula el presupuesto corto) no se corrige nunca', correccionesAndando === 0 && m.yo.z === u(-4), correccionesAndando);
  const antes = { x: m.yo.x, z: m.yo.z };
  const tele = m.ir(u(12), u(-4));
  comprobar(
    'saltar 12 m en un tic se corrige (presupuesto corto) y el sitio bueno no se mueve',
    tele.correcciones.length === 1 && tele.correcciones[0]!.x === antes.x && tele.correcciones[0]!.z === antes.z && m.yo.x === antes.x,
    tele.correcciones,
  );
  let callados = 0;
  for (let i = 0; i < 10; i++) callados += m.ir(u(12 + 0.25 * (i + 1)), u(-4)).correcciones.length;
  comprobar('lo que ya venía de camino desde el sitio malo se calla: ni una corrección más en el segundo siguiente', callados === 0, callados);
  let repetida = 0;
  for (let i = 0; i < 12; i++) repetida += m.ir(u(15), u(-4)).correcciones.length;
  comprobar('pasado el segundo, quien insiste desde el sitio malo se vuelve a corregir', repetida >= 1, repetida);
  const vuelta = m.ir(antes.x + u(0.2), antes.z);
  comprobar('desde el sitio corregido se sigue andando: se acepta y el silencio se acaba', vuelta.correcciones.length === 0 && m.yo.x === antes.x + u(0.2), vuelta.correcciones);

  m.caminar(0, u(3));
  m.esperar(25);
  const muro = m.ir(0, u(9));
  comprobar('cruzar el quiosco en recta se corrige (estructura) aunque el presupuesto dé para ello', muro.correcciones.length === 1 && m.yo.z === u(3), m.yo);
  m.caminar(u(2.4), u(3));
  m.caminar(u(2.4), u(3.75));
  const escuadra = m.ir(u(2.04), u(3.6));
  comprobar(
    'un paso de un tic que muerde la esquina del quiosco en recta pero no en escuadra se admite (la tolerancia de botas)',
    escuadra.correcciones.length === 0 && m.yo.x === u(2.04),
    escuadra.correcciones,
  );
  m.ir(u(2.4), u(3.75));
  /*
   * La escuadra es para el tramo de UN tic del aparato, sea del largo que sea (el de una esquiva también
   * muerde: ver abajo). Con un tic del aparato perdido por medio, y más largo que un tic de andar, ya no
   * es un paso de `unPaso`: en recta o nada.
   */
  const largoDeMas = m.ir(u(1.9), u(3.6), null, m.sala.tic + 2);
  comprobar('y el mismo mordisco más largo que un tic de andar y con un tic del aparato perdido por medio, no', largoDeMas.correcciones.length === 1, largoDeMas.correcciones);

  /*
   * Desde un sitio sin corrección pendiente (el aqui quieto la cierra): si no, el silencio tras
   * corregir se calla el viejo por su cuenta y esta comprobación saldría verde sin mirar el `n`. Lo
   * cazó verla en rojo: quitar la regla del `n` viejo no ponía nada rojo. (Con el tic del aparato que el
   * mordisco de arriba adelantó uno: si no, este `aqui` sería él mismo viejo.)
   */
  m.ir(u(2.4), u(3.75), null, m.sala.tic + 2);
  const vieja = m.ir(u(5), u(1), null, 3);
  comprobar('un aqui con un tic del aparato viejo se tira: ni corrige ni mueve', vieja.correcciones.length === 0 && m.yo.x === u(2.4) && m.yo.z === u(3.75));

  m.caminar(u(2.4), u(2));
  m.esperar(3);
  const x0 = m.yo.x;
  const juntos = m.paso([
    { tipo: 'aqui', asiento: 1, n: m.sala.tic + 1, x: x0 - u(0.4), z: m.yo.z, r: 0, m: 2, accion: null, desfaseMs: 0 },
    { tipo: 'aqui', asiento: 1, n: m.sala.tic + 2, x: x0 - u(0.8), z: m.yo.z, r: 0, m: 2, accion: null, desfaseMs: 0 },
    { tipo: 'aqui', asiento: 1, n: m.sala.tic + 3, x: x0 - u(1.2), z: m.yo.z, r: 0, m: 2, accion: null, desfaseMs: 0 },
  ]);
  comprobar('tres aqui que llegan juntos tras un tirón de red caben en el presupuesto acumulado', juntos.correcciones.length === 0 && m.yo.x === x0 - u(1.2), juntos.correcciones);

  const dl = juguete({ asientos: 1, modo: 'calma', limite: 2, nace: [{ x: 0, z: -8 }], reaparicion: { x: 0, z: -9 } });
  const ml = new Mano(dl);
  ml.caminar(u(9.8), u(-8));
  const fuera = ml.ir(u(10.3), u(-8));
  comprobar('salirse del límite de la fase se corrige, aunque haya suelo y presupuesto', fuera.correcciones.length === 1 && ml.yo.x === u(9.8), ml.yo.x);

  const dg = juguete({ asientos: 1, modo: 'calma', nace: [{ x: -18, z: -18 }] });
  const mg = new Mano(dg);
  const vuelta4 = [
    { x: 18, z: -18 },
    { x: 18, z: 18 },
    { x: -18, z: 18 },
    { x: -18, z: -18 },
  ];
  let primera = -1;
  let pasos = 0;
  for (let v = 0; v < 2 && primera < 0; v++) {
    for (const esquina of vuelta4) {
      for (let i = 0; i < 400 && primera < 0; i++) {
        const dx = u(esquina.x) - mg.yo.x;
        const dz = u(esquina.z) - mg.yo.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < u(0.425)) break;
        pasos++;
        const p = mg.ir(mg.yo.x + Math.round((dx * u(0.425)) / dist), mg.yo.z + Math.round((dz * u(0.425)) / dist));
        if (p.correcciones.length > 0) primera = pasos;
      }
      if (primera >= 0) break;
    }
  }
  comprobar(
    'correr a 8,5 m/s sin parar (dentro del presupuesto corto) se corrige al pasar de 80 m en 10 s: el presupuesto largo',
    primera >= 188 && primera <= 190,
    { primera, esperada: Math.ceil(80 / 0.425) },
  );

  const de = juguete({ asientos: 1, nace: [{ x: 0, z: -8 }], grupos: (n) => [{ ...grupoFijo(n, 1, 1), desdeTic: 5000 }] });
  for (const conEsquiva of [true, false]) {
    const me = new Mano(de);
    me.ir(u(8), u(-8));
    me.ir(u(8.1), u(-8), conEsquiva ? { id: A.esquiva, msDelAparato: me.sala.tic * 50 + 10, blanco: 0 } : null);
    const salto = me.ir(u(11.1), u(-8));
    if (conEsquiva) comprobar('con el presupuesto gastado, la distancia extra de la esquiva deja saltar 3 m en el tic siguiente', salto.correcciones.length === 0 && me.yo.x === u(11.1), salto.correcciones);
    else comprobar('y sin esquiva, el mismo salto se corrige (la extra es de la esquiva, no de la holgura)', salto.correcciones.length === 1, salto.correcciones);
  }

  /*
   * LA ESQUIVA QUE EMPIEZA JUSTO DESPUÉS DE UN CORRIGE (la encontró la revisión del frente). El aparato
   * aplica el `corrige` y esquiva de lado desde el sitio corregido: seis tics de 0,58 m, más que un paso
   * de andar. La primera versión decidía «ya venía de camino» por esa distancia: se callaba la esquiva
   * entera, y al segundo mandaba otro `corrige` que devolvía al asiento 3,5 m atrás. Ahora se callan sólo
   * los dos `aqui` que el aparato mandó antes de que el `corrige` le llegara (100 ms de ida y vuelta).
   */
  const dq = juguete({ asientos: 1, nace: [{ x: 0, z: 2 }], grupos: (n) => [{ ...grupoFijo(n, 1, 1), desdeTic: 5000 }] });
  const quiebroTrasCorregir = (conCorreccion: boolean): { aceptados: string; correcciones: number; sala: number; aparato: number } => {
    const mq = new Mano(dq);
    mq.esperar(25);
    /* Un paso que se mete en el quiosco (su caja va de z 4 a 8): se corrige. */
    let correcciones = conCorreccion ? mq.ir(mq.yo.x, u(3.9)).correcciones.length : 0;
    const z0 = mq.yo.z;
    let x = mq.yo.x;
    let aceptados = '';
    for (let t = 0; t < 30; t++) {
      if (t < 6) x += u(0.583);
      const p = mq.ir(x, z0, t === 0 ? { id: A.esquiva, msDelAparato: (mq.sala.tic + 1) * 50, blanco: 0 } : null);
      correcciones += p.correcciones.length;
      aceptados += mq.yo.x === x ? '1' : '0';
    }
    return { aceptados, correcciones, sala: mq.yo.x, aparato: x };
  };
  const sinCorrige = quiebroTrasCorregir(false);
  const conCorrige = quiebroTrasCorregir(true);
  comprobar(
    'tras un corrige, la esquiva que empieza desde el sitio corregido se admite: sólo se callan los dos aqui que venían de camino, sin otro corrige, y acaba donde el aparato',
    sinCorrige.correcciones === 0 && sinCorrige.aceptados === '1'.repeat(30) && conCorrige.correcciones === 1 && conCorrige.sala === conCorrige.aparato && conCorrige.aceptados === `00${'1'.repeat(28)}`,
    { sinCorrige, conCorrige },
  );

  /*
   * Y LAS ESQUIVAS JUNTO A UNA ESQUINA (también de la revisión): el aparato las hace con `unPaso`, que en
   * diagonal muerde la esquina como al andar, pero con pasos de 0,58 m. La escuadra era sólo para pasos
   * de un tic de andar, y de 2208 esquivas alrededor de la esquina del quiosco 13 se corregían (y el
   * silencio de después se las comía enteras). La escuadra es para el tramo de UN tic del aparato.
   */
  const arenaQ = arenaDeLaLiza(dq);
  const radioQ = u(0.35);
  const vQ = u(3.5 / 0.3);
  let esquivasQ = 0;
  let corregidasQ = 0;
  const ejemplosQ: string[] = [];
  for (let ix = 0; ix < 12; ix++) {
    for (let iz = 0; iz < 12; iz++) {
      for (let r = 0; r < 256; r += 16) {
        const sx = u(2.2) + ix * u(0.1);
        const sz = u(2.4) + iz * u(0.15);
        if (chocaAqui(arenaQ, sx, sz)) continue;
        const dEsquina = { ...dq, mundo: { ...dq.mundo, nace: [{ papel: 'asiento' as const, x: sx, z: sz, rumbo: 0 }, dq.mundo.nace[dq.mundo.nace.length - 1]!] } };
        const mx = new Mano(dEsquina);
        mx.esperar(3);
        if (mx.yo.x !== sx || mx.yo.z !== sz) continue;
        esquivasQ++;
        let q = { x: sx, z: sz };
        let corregidas = 0;
        for (let t = 0; t < 8; t++) {
          if (t < 6) q = unPaso(arenaQ, q, por(vQ, SENO[r] as number), -por(vQ, COSENO[r] as number), DT_DEL_TIC, radioQ);
          const p = mx.ir(q.x, q.z, t === 0 ? { id: A.esquiva, msDelAparato: (mx.sala.tic + 1) * 50, blanco: 0 } : null);
          corregidas += p.correcciones.length;
        }
        if (corregidas > 0) {
          corregidasQ++;
          if (ejemplosQ.length < 4) ejemplosQ.push(`(${(sx / UNO).toFixed(2)}, ${(sz / UNO).toFixed(2)}) rumbo ${String(r)}`);
        }
      }
    }
  }
  comprobar(
    `las esquivas que el aparato hace con unPaso alrededor de la esquina del quiosco (${String(esquivasQ)}) no se corrigen nunca: la escuadra vale para su tramo de un tic`,
    esquivasQ > 2000 && corregidasQ === 0,
    { esquivasQ, corregidasQ, ejemplosQ },
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 4 · EL JUICIO DE LA ESQUIVA, EN EL RELOJ DEL APARATO
 * ═══════════════════════════════════════════════════════════════════════════ */

const ZONA_DELANTE = { id: 7, clase: 7, caja: caja(-0.2, -6.9, 0.2, -6.6) };

/** La liza de un asiento en `(0, −8)` y una entidad que sale justo delante y le ataca. */
function lizaDelDuelo(o: OpcionesDelJuguete = {}): LizaDeclarada {
  return juguete({ asientos: 1, clase: clase({ guardia: null }), grupos: (n) => [grupoFijo(n, 1, 7)], zonasExtra: [ZONA_DELANTE], nace: [{ x: 0, z: -8 }], ...o });
}

/**
 * Juega hasta que se resuelvan `cuantos` anuncios contra el asiento 1 y devuelve cómo se resolvieron, en
 * orden. El id de cada anuncio contra él lo saca de LO QUE LE LLEGÓ (su `anuncio`), no del estado.
 */
function veredictosContraUno(d: LizaDeclarada, robot: Robot, error: number, rtt: number, desplaza: boolean, cuantos: number, semilla = 7, fase = 17): string[] {
  const ap = new Aparato(1, 123457, error, rtt, fase, robot);
  ap.desplazaAlEsquivar = desplaza;
  const b = bancoDeUno(d, ap, semilla);
  const contraMi = new Set<number>();
  const salen: string[] = [];
  for (let i = 0; i < 600 && salen.length < cuantos; i++) {
    const p = b.tic();
    for (const s of p.sucesos) {
      if (s.para === 1 && s.suceso.e === 'anuncio' && s.suceso.a === 1) contraMi.add(s.suceso.id);
      if (s.para === 0 && s.suceso.e === 'resuelve' && contraMi.has(s.suceso.id)) salen.push(NOMBRE_DEL_RESULTADO[s.suceso.r] ?? '?');
    }
  }
  return salen;
}

/** Esquiva el primer anuncio contra él a cada uno de estos ms antes del impacto (en su reloj), y nada más. */
function esquivasPlaneadas(antes: number[]): Robot {
  let hecho = false;
  return (a, _b, reloj) => {
    if (hecho) return;
    for (const x of a.oido) {
      const s = x.suceso;
      if (s.e !== 'anuncio' || s.a !== a.numero) continue;
      hecho = true;
      for (const ms of antes) a.planear(A.esquiva, s.t - ms < reloj ? reloj : s.t - ms, 0);
      return;
    }
  };
}

/**
 * Las fases del aparato dentro del tic de la sala (ms tras el paso en que despierta y manda su `aqui`).
 * La primera versión de este bloque sólo probaba la 17, y la revisión del frente vio que el veredicto de
 * una esquiva pulsada a tiempo cambiaba con ella: con la fase también, o el «no depende de la red» no
 * se ha probado.
 */
const FASES_DEL_APARATO = [0, 5, 10, 17, 25, 33, 40, 45, 49];

paso('4 · El juicio de la esquiva no depende del desfase ni de la red (condición de aprobación)');
{
  const d = lizaDelDuelo();
  const casos: [string, number | null, string][] = [
    ['a 20 ms del impacto', 20, 'limpia'],
    ['a 60 ms', 60, 'limpia'],
    ['a 100 ms', 100, 'limpia'],
    ['a 180 ms', 180, 'limpia'],
    ['a 225 ms (fuera de la limpia, dentro de la esquiva)', 225, 'esquivada'],
    ['sin esquivar', null, 'da'],
    ['a 400 ms (demasiado pronto: la esquiva ya lo sacó del alcance)', 400, 'fallada'],
  ];
  const errores = [0, 40, -40];
  const rtts = [50, 150, 250];
  const juiciosCon = (X: number | null): string[] => {
    const vistos: string[] = [];
    for (const error of errores) {
      for (const rtt of rtts) {
        for (const fase of FASES_DEL_APARATO) {
          const r = veredictosContraUno(d, X === null ? quieto : lector(X, { replica: false }), error, rtt, true, 1, 7, fase)[0] ?? 'nada';
          vistos.push(`${r}@${String(error)}/${String(rtt)}/f${String(fase)}`);
        }
      }
    }
    return vistos;
  };
  for (const [nombre, X, espera] of casos) {
    const vistos = juiciosCon(X);
    const otros = vistos.filter((v) => !v.startsWith(`${espera}@`));
    comprobar(
      `esquivar ${nombre} da «${espera}» con el desfase estimado con 0, +40 y −40 ms de error, con 50, 150 y 250 ms de ida y vuelta y con el aparato en cualquier punto de su tic (${String(vistos.length)} combinaciones)`,
      otros.length === 0,
      otros.slice(0, 12),
    );
  }
  let menorX = -1;
  for (const X of [5, 10, 15, 20]) if (menorX < 0 && juiciosCon(X).every((v) => v.startsWith('limpia@'))) menorX = X;
  nota(`la esquiva más tardía que sale limpia en las ${String(errores.length * rtts.length * FASES_DEL_APARATO.length)} combinaciones: ${menorX < 0 ? 'más de 20' : String(menorX)} ms antes del impacto (el error del desfase que el comp no cubre, sin el tic en que sale el aqui: ver TICS_DEL_AQUI)`);

  const dp = lizaDelDuelo({ primeras: { cuantas: 1, ventanaMs: 300 } });
  const primeras = veredictosContraUno(dp, lector(240, { replica: false }), 40, 150, false, 2);
  comprobar('las primeras de la fase usan su ventana: a 240 ms la primera sale limpia y la segunda sólo esquivada', primeras.join(',') === 'limpia,esquivada', primeras);
  const dLargo = lizaDelDuelo({ clase: clase({ guardia: null, acciones: [accion(A.golpe, { anuncioTics: 30, enganche: null, alFallar: null })] }) });
  const tresSeguidas = veredictosContraUno(dLargo, esquivasPlaneadas([700, 400, 100]), 0, 100, false, 1);
  const dosSeguidas = veredictosContraUno(dLargo, esquivasPlaneadas([700, 100]), 0, 100, false, 1);
  comprobar('la tercera esquiva en menos de 24 tics sale TORPE: pulsada a tiempo, no esquiva (da)', tresSeguidas[0] === 'da', tresSeguidas);
  comprobar('y con sólo dos, la segunda a tiempo sí sale limpia', dosSeguidas[0] === 'limpia', dosSeguidas);
  const di = lizaDelDuelo({ clase: clase({ guardia: null, acciones: [accion(A.golpe, { anuncioTics: 11, enganche: null, alFallar: null, imparable: true })] }) });
  const imparable = veredictosContraUno(di, lector(100, { replica: false }), 0, 100, false, 1);
  comprobar('un golpe imparable no mira la ventana: la esquiva perfecta no lo esquiva', imparable[0] === 'da', imparable);
  const dr = lizaDelDuelo({ medidor: 100, ruptura: puesta(E.esquivando, 14, 12, u(4), 6) });
  let rupturaHecha = false;
  const ruptura: Robot = (a, _b, reloj) => {
    if (rupturaHecha) return;
    for (const x of a.oido) {
      if (x.suceso.e === 'estado' && x.suceso.a === a.numero && x.suceso.est === E.tocado) {
        rupturaHecha = true;
        a.planear(A.esquiva, reloj, 0);
        return;
      }
    }
  };
  const apR = new Aparato(1, 5000, 0, 100, 17, ruptura);
  apR.desplazaAlEsquivar = false;
  const bR = bancoDeUno(dr, apR);
  const contraR: number[] = [];
  const idsR = new Set<number>();
  for (let i = 0; i < 400 && contraR.length < 2; i++) {
    const p = bR.tic();
    for (const s of p.sucesos) {
      if (s.para === 1 && s.suceso.e === 'anuncio' && s.suceso.a === 1) idsR.add(s.suceso.id);
      if (s.para === 0 && s.suceso.e === 'resuelve' && idsR.has(s.suceso.id)) contraR.push(s.suceso.r);
    }
  }
  comprobar(
    'la esquiva de RUPTURA saca del tocado con su intocable: el segundo golpe de la cadena sale esquivado y el medidor baja su coste',
    contraR[0] === RESULTADO.da && contraR[1] === RESULTADO.esquivada && bR.sala.asientos[0]!.medidor === 50,
    { contraR, medidor: bR.sala.asientos[0]!.medidor },
  );
  const dEco = lizaDelDuelo({ repetirTrasTics: 4 });
  const eco = veredictosContraUno(dEco, lector(100, { replica: false }), 0, 100, false, 2);
  comprobar('la repetición sin autor cae a los 4 tics, dentro del premio intocable de la limpia: esquivada', eco.join(',') === 'limpia,esquivada', eco);
  /*
   * Contra quien el golpe dejó sin vida, la repetición no sale: sería un anillo contra un caído (lo vio la
   * revisión). A los 30 tics, cuando el primero ya se resolvió (a los 4 sale antes de que el primero lo
   * tumbe, y ése sí es de alguien en pie). Con recurso para volver, para que el encuentro siga mientras
   * está en el suelo: sin él se pierde en ese tic, se disuelve todo y la repetición no saldría de ningún
   * modo.
   */
  const dEcoCaido = lizaDelDuelo({ repetirTrasTics: 30, clase: clase({ guardia: null, acciones: [accion(A.golpe, { anuncioTics: 11, enganche: null, alFallar: null, efecto: efecto(100, puesta(E.tocado, 12)) })] }) });
  const bEco = bancoDeUno(dEcoCaido, new Aparato(1, 5000, 0, 100, 17, quieto));
  bEco.correr(120);
  const golpesAlCaido = bEco.pasos.flatMap((p) => p.sucesos.filter((s) => s.para === 1 && s.suceso.e === 'anuncio' && s.suceso.a === 1).map((s) => (s.suceso as { de: number }).de));
  comprobar(
    'y contra quien el golpe dejó sin vida la repetición no se anuncia: un anuncio (el que lo tumbó) y ninguno sin autor',
    bEco.sala.asientos[0]!.vida === 0 && golpesAlCaido.length === 1 && golpesAlCaido[0]! >= 16,
    golpesAlCaido,
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 5 · REMANSO, RÉPLICA Y ACOMETIDA
 * ═══════════════════════════════════════════════════════════════════════════ */

paso('5 · El premio de la limpia, la réplica y la acometida tras una bala');
{
  const d = lizaDelDuelo();
  /*
   * Sin desplazarse al esquivar: la esquiva de lado deja al asiento a 3,6 m del autor, más allá del
   * alcance de una réplica sin avance (ver el informe del frente: la réplica de un juego necesita
   * `avance` si su esquiva desplaza). Aquí se prueba la réplica, no esa cuenta.
   */
  const ap = new Aparato(1, 8000, 0, 100, 17, lector(100, { replica: true }));
  ap.desplazaAlEsquivar = false;
  const b = bancoDeUno(d, ap);
  b.correr(300);
  const resueltos = sucesosDe(b, 'resuelve');
  const replicas = b.pasos.flatMap((p) => p.sucesos.filter((s) => s.para === 1 && s.suceso.e === 'anuncio' && s.suceso.de === 1 && s.suceso.acc === A.replica).map((s) => ({ k: p.sala.tic, s: s.suceso })));
  const premio = b.pasos.find((p) => p.sucesos.some((s) => s.suceso.e === 'estado' && s.suceso.a === 1 && s.suceso.est === E.premio));
  comprobar('tras la limpia el asiento entra en su premio (el estado que declara `alAcertar`)', premio !== undefined);
  /*
   * Lo que PAGA la limpia, mirado en el tic en que se resuelve y no en el total de la ronda: el que lee
   * sigue sacando más del doble que el que aporrea aunque la limpia no pagara nada (le basta el
   * multiplicador que sube con ella), así que el bloque 12 no vigila esto. Visto: quitar la suma de
   * puntos de `premiarLimpia` dejaba las demás en verde.
   */
  const iLimpia = b.pasos.findIndex((p) => p.sucesos.some((s) => s.suceso.e === 'resuelve' && s.suceso.r === RESULTADO.limpia));
  const antesDeLaLimpia = iLimpia > 0 ? b.pasos[iLimpia - 1]!.sala.asientos[0] : undefined;
  const trasLaLimpia = iLimpia > 0 ? b.pasos[iLimpia]!.sala.asientos[0] : undefined;
  const pago =
    antesDeLaLimpia !== undefined && trasLaLimpia !== undefined
      ? {
          puntos: trasLaLimpia.puntos - antesDeLaLimpia.puntos,
          multiplicador: [antesDeLaLimpia.multiplicador, trasLaLimpia.multiplicador],
          medidor: trasLaLimpia.medidor - antesDeLaLimpia.medidor,
        }
      : null;
  comprobar(
    'la limpia paga en su tic: 50 puntos por el multiplicador de antes (1), 35 de medidor, y el multiplicador sube un paso',
    pago !== null && pago.puntos === 50 && pago.medidor === 35 && pago.multiplicador[0] === UNO && pago.multiplicador[1] === UNO + 6554,
    pago,
  );
  const primeraReplica = replicas[0];
  const idReplica = primeraReplica !== undefined && primeraReplica.s.e === 'anuncio' ? primeraReplica.s.id : -1;
  const resuelta = resueltos.find((x) => x.s.id === idReplica);
  comprobar(
    'la réplica pulsada en el premio sale (anuncio corto) y, imparable, da contra el autor descolocado: 25',
    resuelta !== undefined && resuelta.s.r === RESULTADO.da && resuelta.s.dano === 25,
    { replicas: replicas.length, resuelta },
  );
  const enPremio = (k: number): boolean => {
    const p = b.pasos[k - 1];
    const e = p === undefined ? null : p.sala.asientos[0]!.estado;
    return e !== null && e.estado === E.premio && k >= e.desdeTic && k < e.hastaTic;
  };
  const fueraDelPremio = replicas.filter((x) => x.s.e === 'anuncio' && !enPremio(b.pasos[x.k - 1]!.sala.anuncios.find((an) => an.id === (x.s as { id: number }).id)?.lanzadoEnTic ?? x.k));
  comprobar('todas las réplicas que salieron se lanzaron dentro de un premio', replicas.length >= 1 && fueraDelPremio.length === 0, { replicas: replicas.length, fuera: fueraDelPremio.length });
  const mr = new Mano(d);
  while (mr.sala.entidades.length === 0 && mr.sala.tic < 50) mr.esperar(1);
  mr.esperar(12);
  const blancoR = mr.sala.entidades[0]?.numero ?? 16;
  const sinPremio = mr.ir(mr.yo.x, mr.yo.z, { id: A.replica, msDelAparato: mr.sala.tic * 50, blanco: blancoR });
  comprobar('y pulsada sin estar en el premio no sale (su `soloEn`)', !sinPremio.sucesos.some((s) => s.suceso.e === 'anuncio' && s.suceso.de === 1) && !mr.sala.anuncios.some((an) => an.de === 1), sinPremio.sucesos.map((s) => s.suceso.e));

  /*
   * ESQUIVAR DENTRO DEL PREMIO NO LO ACABA (lo encontró la revisión del frente). El premio no bloquea
   * acciones, y un estado así no se termina por empezar una (`EstadoDeclarado.bloqueaAccion`): la
   * esquiva tampoco. La primera versión ponía encima el estado de la esquiva, y quien quebraba 100 ms
   * después de entrar en su Remanso perdía el intocable y la Réplica.
   */
  const quiebraEnElPremio = (quiebra: boolean): { replica: boolean; esquivandoEnElPremio: boolean; premioHasta: number } => {
    let fase = 0;
    let premioLlega = -1;
    let atacante = 0;
    const robot: Robot = (a, _b, reloj) => {
      for (const x of a.oido) {
        const s = x.suceso;
        if (fase === 0 && s.e === 'anuncio' && s.a === a.numero) {
          fase = 1;
          atacante = s.de;
          a.planear(A.esquiva, Math.max(reloj, s.t - 100), 0);
        }
        if (fase === 1 && s.e === 'estado' && s.a === a.numero && s.est === E.premio) {
          fase = 2;
          premioLlega = reloj;
        }
      }
      a.oido = [];
      if (fase === 2 && reloj >= premioLlega + 100) {
        fase = 3;
        if (quiebra) a.planear(A.esquiva, reloj, 0);
      }
      if (fase === 3 && reloj >= premioLlega + 300) {
        fase = 4;
        a.planear(A.replica, reloj, atacante);
      }
    };
    const apQ = new Aparato(1, 5000, 0, 100, 17, robot);
    apQ.desplazaAlEsquivar = false;
    const bQ = bancoDeUno(d, apQ);
    let replica = false;
    let enPremioDesde = -1;
    let premioHasta = -1;
    let esquivandoEnElPremio = false;
    for (let i = 0; i < 200; i++) {
      const p = bQ.tic();
      for (const s of p.sucesos) {
        if (s.para === 0 && s.suceso.e === 'estado' && s.suceso.a === 1) {
          if (s.suceso.est === E.premio && enPremioDesde < 0) {
            enPremioDesde = p.sala.tic;
            premioHasta = p.sala.tic + s.suceso.tics;
          } else if (s.suceso.est === E.esquivando && enPremioDesde >= 0 && p.sala.tic < premioHasta) esquivandoEnElPremio = true;
        }
        if (s.para === 1 && s.suceso.e === 'anuncio' && s.suceso.de === 1 && s.suceso.acc === A.replica) replica = true;
      }
    }
    return { replica, esquivandoEnElPremio, premioHasta };
  };
  const sinQuebrar = quiebraEnElPremio(false);
  const quebrando = quiebraEnElPremio(true);
  comprobar(
    'esquivar dentro del premio no lo acaba: se sigue en él (ningún estado de esquiva encima) y la réplica sale igual que sin esquivar',
    sinQuebrar.replica && quebrando.replica && !quebrando.esquivandoEnElPremio && quebrando.premioHasta > 0,
    { sinQuebrar, quebrando },
  );

  const dt = juguete({ asientos: 1, clase: claseTiradora({ guardia: null }), grupos: (n) => [grupoFijo(n, 1, 8)], zonasExtra: [{ id: 8, clase: 8, caja: caja(-0.2, 1.8, 0.2, 2.2) }], nace: [{ x: 0, z: -8 }] });
  let yaEsquivo = false;
  const alaBala: Robot = (a, _b, reloj) => {
    for (const x of a.oido) {
      const s = x.suceso;
      if (s.e !== 'bala' || yaEsquivo) continue;
      yaEsquivo = true;
      a.oido = a.oido.filter((y) => y !== x);
      const bx = Math.round((s.x * UNO) / 100);
      const bz = Math.round((s.z * UNO) / 100);
      for (let t = 1; t < 60; t++) {
        const q = sitioDeLaBala(bx, bz, s.r, u(20), t, u(30));
        if (Math.abs(q.x - a.x) < u(0.55) && Math.abs(q.z - a.z) < u(0.55)) {
          a.planear(A.esquiva, Math.max(reloj, s.t + t * 50 - 60), 0);
          break;
        }
      }
      return;
    }
  };
  const apT = new Aparato(1, 3000, 0, 100, 17, alaBala);
  apT.desplazaAlEsquivar = false;
  const bT = bancoDeUno(dt, apT);
  bT.correr(260);
  const impactos = sucesosDe(bT, 'impacta');
  const limpia = impactos.find((x) => x.s.r === RESULTADO.limpia);
  const acometida = bT.pasos.flatMap((p) => p.sucesos.filter((s) => s.para === 1 && s.suceso.e === 'anuncio' && s.suceso.de === 1 && s.suceso.acc === A.replica).map((s) => ({ k: p.sala.tic, s: s.suceso })));
  comprobar('una esquiva limpia contra una bala sale `impacta` limpia (la bala sigue su camino)', limpia !== undefined, impactos.map((x) => x.s.r));
  /*
   * LA ACOMETIDA SALE EN EL ACTO (ver `lanzarLaAcometida`): la réplica contra el tirador, anunciada en el
   * mismo tic de la limpia, con el impacto al final del vuelo —lo que tarda el aparato en enterarse (100 ms
   * de ida y vuelta: un tic y el del `aqui`), los 8 del vuelo y los 3 de su anuncio— y el vuelo en su avance.
   */
  const pendienteT = bT.pasos.flatMap((p) => p.sala.anuncios.filter((an) => an.de === 1 && an.accion === A.replica))[0];
  comprobar(
    'y en ese mismo tic la sala lanza sola la acometida: la réplica contra el tirador, con el impacto tras enterarse, volar y su anuncio (2 + 8 + 3 tics) y el vuelo en su avance',
    limpia !== undefined &&
      acometida.length >= 1 &&
      acometida[0]!.k === limpia.k &&
      acometida[0]!.s.e === 'anuncio' &&
      acometida[0]!.s.a >= 16 &&
      pendienteT !== undefined &&
      pendienteT.impactoEnTic - pendienteT.lanzadoEnTic === 13 &&
      pendienteT.avance === u(10) + u(4),
    { limpia: limpia?.k, acometida: acometida.map((x) => x.k), pendienteT },
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 6 · LA CADENA Y EL «AL RITMO», EN EL RELOJ DEL APARATO
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Una entidad que no ataca ni guarda: un saco. */
function saco(vida = 200): ClaseDeEntidad {
  return clase({ vida, acciones: [], guardia: null, alCaer: { tipo: 'irse' } });
}

/**
 * GOLPEA Y ENCADENA: cuando la entidad que salió lleva `espera` tics fuera, entrada contra ella; y la
 * seguida a `delta` ms del impacto de la entrada EN SU RELOJ (el `t` de su propio anuncio).
 */
function encadenador(delta: number, espera = 15): Robot {
  let blanco = 0;
  let naceEn = -1;
  let entrada = false;
  let seguida = false;
  return (a, _b, reloj) => {
    for (const x of a.oido) {
      const s = x.suceso;
      if (s.e === 'nace' && blanco === 0) {
        blanco = s.id;
        naceEn = a.reloj(x.llega);
      }
      if (s.e === 'anuncio' && s.de === a.numero && s.acc === A.entrada && !seguida) {
        seguida = true;
        a.planear(A.seguida, s.t + delta, blanco);
      }
    }
    if (!entrada && blanco !== 0 && reloj >= naceEn + espera * 50) {
      entrada = true;
      a.planear(A.entrada, reloj, blanco);
    }
  };
}

paso('6 · La cadena y el «al ritmo», juzgados en el reloj del aparato');
{
  const d = lizaDelDuelo({ clase: saco() });
  const seguidaCon = (delta: number, error: number): { anuncio: number; dano: number; lanzadoTrasImpacto: boolean } | null => {
    const b = bancoDeUno(d, new Aparato(1, 7777, error, 120, 17, encadenador(delta)));
    b.correr(200);
    let impactoEntrada = -1;
    for (const p of b.pasos) for (const s of p.sucesos) if (s.para === 0 && s.suceso.e === 'resuelve' && impactoEntrada < 0) impactoEntrada = p.sala.tic;
    for (const p of b.pasos) {
      for (const s of p.sucesos) {
        if (s.para !== 1 || s.suceso.e !== 'anuncio' || s.suceso.acc !== A.seguida) continue;
        const id = s.suceso.id;
        const impacto = (s.suceso.t - (7777 + error)) / 50;
        const lanzado = p.sala.anuncios.find((an) => an.id === id)?.lanzadoEnTic ?? -1;
        const res = sucesosDe(b, 'resuelve').find((x) => x.s.id === id);
        return { anuncio: impacto - lanzado, dano: res?.s.dano ?? -1, lanzadoTrasImpacto: lanzado >= impactoEntrada };
      }
    }
    return null;
  };
  for (const error of [0, 40, -40]) {
    const alRitmo = seguidaCon(0, error);
    const tarde = seguidaCon(200, error);
    const fuera = seguidaCon(320, error);
    const antes = seguidaCon(-80, error);
    comprobar(
      `con ${String(error)} ms de error: la seguida AL RITMO (0 ms) sale con su anuncio corto y su daño al ritmo`,
      alRitmo !== null && alRitmo.anuncio === 4 && alRitmo.dano === 15,
      alRitmo,
    );
    comprobar(`con ${String(error)} ms: a +200 ms se encadena sin ritmo; a +320 ms ya no`, tarde !== null && tarde.anuncio === 5 && tarde.dano === 10 && fuera === null, { tarde, fuera });
    comprobar(
      `con ${String(error)} ms: pulsada 80 ms ANTES del impacto se guarda y sale al resolverse la entrada, nunca solapada`,
      antes !== null && antes.lanzadoTrasImpacto && antes.dano === 10,
      antes,
    );
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 7 · LA GUARDIA
 * ═══════════════════════════════════════════════════════════════════════════ */

paso('7 · La guardia: de frente para y contesta; por la espalda no; lo que la rompe pasa');
{
  const guardian = (probabilidad: number): ClaseDeEntidad =>
    clase({
      vida: 200,
      acciones: [accion(A.respuesta, { anuncioTics: 6, alcance: u(1.5), enganche: null, alFallar: null, soloEn: [E.premio], efecto: efecto(15, puesta(E.tocado, 12)) })],
      guardia: {
        conoRumbos: 43,
        /* El empellón también está en su lista: que pase de frente tiene que ser por romperla, no por no estar. */
        para: [A.entrada, A.empellon],
        salvoEn: [E.tocado, E.derribado, E.descolocado],
        alParar: puesta(E.descolocado, 8),
        respuesta: A.respuesta,
        esquivaAlAzar: { acciones: [A.empellon], probabilidad },
      },
      alCaer: { tipo: 'irse' },
    });
  /** Dos asientos: el 2 justo delante de la entidad (su blanco), el 1 a su espalda. Golpea `quien` con `golpe`. */
  const lance = (quien: number, golpe: number, probabilidad: number): { r: string; respuesta: boolean; descolocado: boolean } => {
    const d = juguete({ asientos: 2, clase: guardian(probabilidad), grupos: (n) => [grupoFijo(n, 1, 7)], zonasExtra: [ZONA_DELANTE], nace: [{ x: 0, z: -8 }, { x: 0, z: -5.9 }] });
    let blanco = 0;
    let hecho = false;
    const robot: Robot = (a, _b, reloj) => {
      for (const x of a.oido) if (x.suceso.e === 'nace' && blanco === 0) blanco = x.suceso.id;
      if (!hecho && blanco !== 0 && a.mandadas > 20) {
        hecho = true;
        a.planear(golpe, reloj, blanco);
      }
    };
    const b = new Banco(d, 5, [new Aparato(1, 1000, 0, 100, 13, quien === 1 ? robot : quieto), new Aparato(2, 2000, 0, 100, 29, quien === 2 ? robot : quieto)]);
    b.conectar(1);
    b.conectar(2);
    b.correr(90);
    let r = 'nada';
    let respuesta = false;
    let descolocado = false;
    const suyos = new Set<number>();
    for (const p of b.pasos) {
      for (const s of p.sucesos) {
        if (s.para === quien && s.suceso.e === 'anuncio' && s.suceso.de === quien) suyos.add(s.suceso.id);
        if (s.para === 0 && s.suceso.e === 'resuelve' && suyos.has(s.suceso.id)) r = NOMBRE_DEL_RESULTADO[s.suceso.r] ?? '?';
        if (s.para === quien && s.suceso.e === 'anuncio' && s.suceso.acc === A.respuesta && s.suceso.a === quien) respuesta = true;
        if (s.para === 0 && s.suceso.e === 'estado' && s.suceso.a === quien && s.suceso.est === E.descolocado) descolocado = true;
      }
    }
    return { r, respuesta, descolocado };
  };
  const frente = lance(2, A.entrada, 0);
  comprobar('una entrada DE FRENTE contra la guardia sale parada, descoloca al que golpea y la entidad contesta', frente.r === 'parada' && frente.descolocado && frente.respuesta, frente);
  const espalda = lance(1, A.entrada, 0);
  comprobar('la misma entrada POR LA ESPALDA da, sin respuesta', espalda.r === 'da' && !espalda.respuesta, espalda);
  const rompe = lance(2, A.empellon, 0);
  comprobar('lo que rompe la guardia (el empellón) da de frente', rompe.r === 'da', rompe);
  const azarFrente = lance(2, A.empellon, UNO);
  const azarEspalda = lance(1, A.empellon, UNO);
  comprobar('con la esquiva al azar al cien por cien, el empellón de frente sale esquivado y por la espalda da', azarFrente.r === 'esquivada' && azarEspalda.r === 'da', { azarFrente, azarEspalda });
}


/* ═══════════════════════════════════════════════════════════════════════════
 * 8 · EL EMPUJÓN Y EL CHOQUE CONTRA LA ESTRUCTURA
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Un saco que no se mueve de donde sale: velocidad 0. */
function sacoQuieto(vida = 200): ClaseDeEntidad {
  return clase({ vida, velocidad: 0, acciones: [], guardia: null, alCaer: { tipo: 'irse' } });
}

/** Golpea una vez con `golpe`, cuando la entidad lleva 15 tics fuera. */
function golpeaUnaVez(golpe: number): Robot {
  let blanco = 0;
  let naceEn = -1;
  let hecho = false;
  return (a, _b, reloj) => {
    for (const x of a.oido) {
      if (x.suceso.e === 'nace' && blanco === 0) {
        blanco = x.suceso.id;
        naceEn = a.reloj(x.llega);
      }
    }
    if (!hecho && blanco !== 0 && reloj >= naceEn + 750) {
      hecho = true;
      a.planear(golpe, reloj, blanco);
    }
  };
}

paso('8 · El empujón: choque sólo con caja, y su premio');
{
  const lanceDeEmpujon = (zona: { x0: number; z0: number; x1: number; z1: number }, nace: { x: number; z: number }) => {
    const d = juguete({ asientos: 1, clase: sacoQuieto(), grupos: (n) => [grupoFijo(n, 1, 9)], zonasExtra: [{ id: 9, clase: 9, caja: caja(zona.x0, zona.z0, zona.x1, zona.z1) }], nace: [nace] });
    const b = bancoDeUno(d, new Aparato(1, 4000, 0, 100, 17, golpeaUnaVez(A.empellon)));
    b.correr(80);
    const empuja = sucesosDe(b, 'empuja')[0];
    const resuelve = sucesosDe(b, 'resuelve').find((x) => x.s.r === RESULTADO.da);
    const e = b.sala.entidades[0];
    const yo = b.sala.asientos[0]!;
    return { empuja: empuja?.s, dano: resuelve?.s.dano ?? -1, x: e?.x ?? 0, z: e?.z ?? 0, choques: yo.contadores.choques, puntos: yo.puntos, medidor: yo.medidor };
  };
  const contraElCoche = lanceDeEmpujon({ x0: 6.9, z0: -0.1, x1: 7.1, z1: 0.1 }, { x: 5.2, z: 0 });
  comprobar(
    'un empellón que lleva a la entidad contra el coche CHOCA: `empuja` nombra la caja (índice + 1), y el daño suma el del choque',
    contraElCoche.empuja !== undefined && contraElCoche.empuja.e === 'empuja' && contraElCoche.empuja.caja === 2 && contraElCoche.dano === 8 + 15,
    contraElCoche,
  );
  const arena = arenaDe(juguete().mundo.suelo);
  comprobar(
    'la entidad se para ANTES de la caja, en un sitio donde se puede estar',
    contraElCoche.x <= u(8) - u(0.35) && contraElCoche.x > u(7) && !chocaAqui(arena, contraElCoche.x, contraElCoche.z),
    contraElCoche,
  );
  comprobar('y el autor se lleva el premio del choque: un choque, medidor y puntos (10 del golpe y 30 del choque)', contraElCoche.choques === 1 && contraElCoche.puntos === 40 && contraElCoche.medidor === 10, contraElCoche);
  const alAire = lanceDeEmpujon({ x0: -0.1, z0: -4.1, x1: 0.1, z1: -3.9 }, { x: -1.8, z: -4 });
  comprobar(
    'el mismo empellón en campo abierto no choca: caja 0, el daño del golpe y cuatro unidades de recorrido',
    alAire.empuja !== undefined && alAire.empuja.e === 'empuja' && alAire.empuja.caja === 0 && alAire.dano === 8 && alAire.choques === 0 && Math.abs(alAire.x - u(4)) < u(0.1),
    alAire,
  );
  const empujadora = clase({ guardia: null, acciones: [accion(A.golpe, { anuncioTics: 11, enganche: null, alFallar: null, efecto: efecto(10, puesta(E.tocado, 12), u(3)) })] });
  const dq = juguete({ asientos: 1, clase: empujadora, grupos: (n) => [grupoFijo(n, 1, 9)], zonasExtra: [{ id: 9, clase: 9, caja: caja(-0.1, 2.1, 0.1, 2.3) }], nace: [{ x: 0, z: 3.3 }] });
  const bq = bancoDeUno(dq, new Aparato(1, 4000, 0, 100, 17, quieto));
  bq.correr(80);
  const aLaPared = sucesosDe(bq, 'empuja').find((x) => x.s.a === 1);
  const golpeAMi = sucesosDe(bq, 'resuelve').find((x) => x.s.r === RESULTADO.da);
  comprobar(
    'un asiento empujado contra el quiosco también choca: caja 1 y el daño del choque sumado (lo empuja su aparato; la sala se lo admite)',
    aLaPared !== undefined && aLaPared.s.caja === 1 && golpeAMi !== undefined && golpeAMi.s.dano === 25,
    { aLaPared, golpeAMi },
  );
}

/** ¿Choca un cuerpo de radio 0,35 con la estructura en `(x, z)`? Cuatro comparaciones por caja. */
function chocaAqui(arena: Arena, x: number, z: number): boolean {
  const r = u(0.35);
  const c = arena.cuerpos;
  for (let i = 0; i < c.length; i += 4) {
    if (x + r > (c[i] as number) && x - r < (c[i + 2] as number) && z + r > (c[i + 1] as number) && z - r < (c[i + 3] as number)) return true;
  }
  return false;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 9 · LAS BALAS, CONTRA LOS SITIOS QUE DECLARÓ EL BLANCO
 * ═══════════════════════════════════════════════════════════════════════════ */

paso('9 · Las balas se juzgan contra los sitios que el blanco declaró, esperándolos');
{
  const dt = juguete({ asientos: 1, clase: claseTiradora({ guardia: null }), grupos: (n) => [grupoFijo(n, 1, 8)], zonasExtra: [{ id: 8, clase: 8, caja: caja(-0.2, 1.8, 0.2, 2.2) }], nace: [{ x: 0, z: -8 }] });
  const bQuieto = bancoDeUno(dt, new Aparato(1, 3000, 0, 100, 17, quieto));
  bQuieto.correr(120);
  const da = sucesosDe(bQuieto, 'impacta').find((x) => x.s.a === 1);
  comprobar('quien se queda en la línea recibe la bala: `impacta` da, 12 de daño', da !== undefined && da.s.r === RESULTADO.da && da.s.dano === 12 && da.s.vida === 88, da);

  /*
   * A 7 m la bala tarda 350 ms. Con 300 ms de ida y vuelta, el aparato oye la bala a los ~150 ms, se
   * aparta en dos tics (a 8 m/s) y ya no está en la línea cuando llega; pero la sala no lo sabe hasta
   * 150 ms después de que la bala haya pasado. Juzgarla con lo que la sala sabía al pasar sería un golpe.
   */
  const dL = juguete({ asientos: 1, clase: claseTiradora({ guardia: null }), grupos: (n) => [grupoFijo(n, 1, 8)], zonasExtra: [{ id: 8, clase: 8, caja: caja(-0.2, -1.2, 0.2, -0.8) }], nace: [{ x: 0, z: -8 }] });
  let aparta = false;
  const apartarse: Robot = (a) => {
    if (aparta) return;
    for (const x of a.oido) {
      if (x.suceso.e === 'bala') {
        aparta = true;
        a.meta = { x: a.x + u(2), z: a.z };
        return;
      }
    }
  };
  const apL = new Aparato(1, 3000, 0, 300, 17, apartarse);
  apL.velocidad = u(8);
  const bL = bancoDeUno(dL, apL);
  bL.correr(120);
  const rafaga = new Set<number>();
  let b0: { x: number; z: number; rumbo: number; salioEnTic: number } | null = null;
  for (const p of bL.pasos) {
    for (const bala of p.sala.balas) {
      if (rafaga.size < 3 && !rafaga.has(bala.numero)) rafaga.add(bala.numero);
      if (b0 === null) b0 = bala;
    }
  }
  let pasaPorElSitio = -1;
  if (b0 !== null) {
    for (let t = 1; t < 40 && pasaPorElSitio < 0; t++) {
      const q = sitioDeLaBala(b0.x, b0.z, b0.rumbo, u(20), t, u(30));
      if (q.z <= u(-8) + u(0.55)) pasaPorElSitio = b0.salioEnTic + t;
    }
  }
  const vistaEntonces = pasaPorElSitio > 0 ? bL.pasos[pasaPorElSitio - 1]?.sala.asientos[0]!.x : undefined;
  const impactaronL = sucesosDe(bL, 'impacta').filter((x) => x.s.a === 1 && rafaga.has(x.s.bala));
  comprobar(
    'quien se aparta a tiempo con 300 ms de ida y vuelta no recibe la primera ráfaga: sus sitios declarados ya estaban fuera',
    rafaga.size === 3 && impactaronL.length === 0,
    { rafaga: [...rafaga], impactos: impactaronL.map((x) => x.s) },
  );
  comprobar(
    'aunque cuando la bala pasó por su sitio la sala todavía lo tenía EN la línea (sus aqui llegaban 150 ms tarde): se esperaron',
    vistaEntonces !== undefined && Math.abs(vistaEntonces) < u(0.55),
    { pasaPorElSitio, vistaEntonces },
  );

  const tras: Robot = (a, _b, reloj) => {
    if (a.meta === null && reloj > a.D + 700) a.meta = { x: 0, z: u(2) };
  };
  const dk = juguete({ asientos: 1, clase: claseTiradora({ guardia: null }), grupos: (n) => [grupoFijo(n, 1, 8)], zonasExtra: [{ id: 8, clase: 8, caja: caja(-0.2, 14.8, 0.2, 15.2) }], nace: [{ x: 4, z: 2 }] });
  const apK = new Aparato(1, 1000, 0, 100, 17, tras);
  apK.velocidad = u(8);
  const bK = bancoDeUno(dk, apK);
  bK.correr(160);
  const chocadas = sucesosDe(bK, 'seva').filter((x) => x.s.por === MOTIVO_DE_IRSE.choca);
  const tocadas = sucesosDe(bK, 'impacta').filter((x) => x.s.a === 1);
  comprobar('quien se esconde tras el quiosco mientras le apuntan: las balas se paran contra la estructura (`seva` choca) y ninguna le toca', chocadas.length >= 1 && tocadas.length === 0, { chocadas: chocadas.length, tocadas: tocadas.length });
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 10 · LOS TURNOS DE ATAQUE
 * ═══════════════════════════════════════════════════════════════════════════ */

paso('10 · Los turnos: tope por asiento, ninguno a quien está en su premio, ni al ausente');
{
  const floja = clase({ guardia: null, acciones: [accion(A.golpe, { anuncioTics: 11, enganche: null, alFallar: null, efecto: efecto(1, puesta(E.tocado, 12)) })] });
  const zonaCerca = { id: 9, clase: 9, caja: caja(-1.5, -7, 1.5, -6.5) };
  const dT = juguete({ asientos: 1, clase: floja, grupos: (n) => [grupoFijo(n, 6, 9, 6)], zonasExtra: [zonaCerca], nace: [{ x: 0, z: -8 }] });
  const bT = bancoDeUno(dT, new Aparato(1, 2000, 0, 100, 17, quieto));
  let peorTurnos = 0;
  let peorAnuncios = 0;
  for (let i = 0; i < 400; i++) {
    bT.tic();
    let turnos = 0;
    for (const e of bT.sala.entidades) if (e.turno === 'cuerpoACuerpo' && e.blanco === 1) turnos++;
    let anuncios = 0;
    for (const an of bT.sala.anuncios) if (an.a === 1 && an.lanzadoEnTic <= bT.k) anuncios++;
    if (turnos > peorTurnos) peorTurnos = turnos;
    if (anuncios > peorAnuncios) peorAnuncios = anuncios;
  }
  comprobar(
    'con cuatro entidades encima (las vivas que admite el encuentro) nunca atacan a la vez más de las que caben en sus turnos (2) ni hay más de 3 anuncios contra él',
    peorTurnos === 2 && peorAnuncios <= 3 && bT.sala.entidades.length === 4,
    { peorTurnos, peorAnuncios, entidades: bT.sala.entidades.length },
  );

  const dP = juguete({ asientos: 1, clase: clase({ guardia: null }), grupos: (n) => [grupoFijo(n, 4, 9, 4)], zonasExtra: [zonaCerca], nace: [{ x: 0, z: -8 }] });
  const apP = new Aparato(1, 2000, 0, 100, 17, lector(100, { replica: false }));
  apP.desplazaAlEsquivar = false;
  const bP = bancoDeUno(dP, apP);
  bP.correr(600);
  const premios: { desde: number; hasta: number }[] = [];
  const lanzados: { k: number; de: number }[] = [];
  const vistos = new Set<number>();
  for (const p of bP.pasos) {
    const e = p.sala.asientos[0]!.estado;
    if (e !== null && e.estado === E.premio && premios.every((x) => x.desde !== e.desdeTic)) premios.push({ desde: e.desdeTic, hasta: e.hastaTic });
    for (const an of p.sala.anuncios) {
      if (an.a !== 1 || an.de < 16 || vistos.has(an.id)) continue;
      vistos.add(an.id);
      lanzados.push({ k: an.lanzadoEnTic, de: an.de });
    }
  }
  const enPremio = lanzados.filter((l) => premios.some((x) => l.k >= x.desde && l.k < x.hasta));
  comprobar(
    'NINGÚN golpe de entidad se lanza contra quien está en su premio (el estado de una limpia): los turnos lo excluyen',
    premios.length >= 2 && lanzados.length >= 8 && enPremio.length === 0,
    { premios: premios.length, lanzados: lanzados.length, enPremio },
  );

  /*
   * Con un tocado de 40 tics y dos que pegan, no está nunca libre: si el ausente esperara a que lo
   * estuviera, no llegaría a su tic (la segunda pasada lo vio: con el tocado de 12 había huecos, y la
   * rotura que sólo lo daba a quien estaba libre pasaba en verde).
   */
  const pegajosa = clase({ guardia: null, acciones: [accion(A.golpe, { anuncioTics: 11, enganche: null, alFallar: null, efecto: efecto(1, puesta(E.tocado, 40)) })] });
  const dAus = juguete({ asientos: 1, clase: pegajosa, grupos: (n) => [grupoFijo(n, 2, 9, 2)], zonasExtra: [zonaCerca], nace: [{ x: 0, z: -8 }] });
  const bA = bancoDeUno(dAus, new Aparato(1, 2000, 0, 100, 17, quieto));
  bA.correr(40);
  bA.desconectar(1);
  let ausenteDesde = -1;
  let tocadoAlIrse = false;
  for (let i = 0; i < 200; i++) {
    const antes = bA.sala.asientos[0]!.estado;
    bA.tic();
    const e = bA.sala.asientos[0]!.estado;
    if (ausenteDesde < 0 && e !== null && e.estado === E.ausente) {
      ausenteDesde = e.desdeTic;
      tocadoAlIrse = antes !== null && antes.estado === E.tocado && antes.hastaTic > ausenteDesde;
    }
  }
  const ultimoAqui = bA.sala.asientos[0]!.ultimoAquiEnTic;
  const trasAusente = bA.pasos.flatMap((p) => p.sala.anuncios.filter((an) => an.a === 1 && an.de >= 16 && ausenteDesde >= 0 && an.lanzadoEnTic >= ausenteDesde));
  const antesDeIrse = bA.pasos.slice(0, 40).some((p) => p.sala.anuncios.some((an) => an.a === 1));
  comprobar(
    'quien deja de mandar aqui pasa a ausente a los 40 tics justos de su último aqui AUNQUE le estén pegando (pisa el tocado), y ya nadie le lanza nada',
    ausenteDesde === ultimoAqui + 40 && tocadoAlIrse && trasAusente.length === 0 && antesDeIrse && bA.sala.asientos[0]!.vida > 0,
    { ausenteDesde, ultimoAqui, tocadoAlIrse, trasAusente: trasAusente.length, antesDeIrse },
  );

  /*
   * LA RÁFAGA SE CORTA si su blanco entra en su premio a medias (lo vio la revisión del frente: tres
   * balas de veintiuna contra quien ya estaba en su Remanso). El turno se le dio antes, pero «ningún
   * turno a quien está en su premio» es también no seguir disparándole, como no sigue la cadena.
   */
  const bB = bancoLleno(lizaLlena(), 33);
  const excluyenB = new Set<number>(bB.sala.declaracion.turnos.excluyen);
  let balasB = 0;
  const contraExcluidoB: string[] = [];
  for (let i = 0; i < 2000; i++) {
    const p = bB.tic();
    for (const bala of p.sala.balas) {
      if (bala.salioEnTic !== p.sala.tic) continue;
      balasB++;
      const tirador = p.sala.entidades.find((e) => e.numero === bala.de);
      const blanco = tirador === undefined ? undefined : p.sala.asientos[tirador.blanco - 1];
      const est = blanco === undefined ? null : blanco.estado;
      if (blanco !== undefined && est !== null && p.sala.tic >= est.desdeTic && p.sala.tic < est.hastaTic && excluyenB.has(est.estado)) {
        contraExcluidoB.push(`k${String(p.sala.tic)} bala ${String(bala.numero)} contra ${String(blanco.numero)} en ${String(est.estado)}`);
      }
    }
  }
  comprobar(
    'ninguna bala sale contra quien está en un estado que le quita los turnos (su premio, sobre todo): la ráfaga a medias se corta',
    balasB >= 100 && contraExcluidoB.length === 0,
    { balasB, contraExcluidoB: contraExcluidoB.slice(0, 6) },
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 11 · LO QUE SE LLEVA SE CONSERVA; LA ZONA, DE UNO EN UNO
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * LA CUENTA DE LO QUE SE LLEVA, tic a tic: lo que soltaron las rematadas tiene que ser lo que llevan
 * los asientos, más lo que hay en los montones, más lo cobrado, más lo perdido (montones que se fueron
 * sin vaciarse). Devuelve la primera discrepancia, o `null`.
 */
function vigilarLoQueSeLleva(b: Banco, suelta: number, inicial = 0): { creado: number; enAsientos: number; enMontones: number; cobrado: number; perdido: number; recogidas: number; rematadas: number; k: number } | null {
  let creado = inicial;
  let perdido = 0;
  let recogidas = 0;
  let rematadas = 0;
  let antes = new Map<number, number>();
  for (const p of b.pasos) {
    const vaciados = new Set<number>();
    for (const s of p.sucesos) {
      if (s.para !== 0) continue;
      if (s.suceso.e === 'seva' && s.suceso.por === MOTIVO_DE_IRSE.rematada) {
        creado += suelta;
        rematadas++;
      }
      if (s.suceso.e === 'recoge') {
        recogidas++;
        if (s.suceso.queda === 0) vaciados.add(s.suceso.id);
      }
    }
    const ahora = new Map<number, number>();
    for (const m of p.sala.montones) ahora.set(m.numero, m.n);
    for (const [id, n] of antes) if (!ahora.has(id) && !vaciados.has(id)) perdido += n;
    antes = ahora;
    let enAsientos = 0;
    let cobrado = 0;
    for (const a of p.sala.asientos) {
      for (const c of a.lleva) enAsientos += c.n;
      for (const c of a.contadores.cobrado) cobrado += c.n;
    }
    let enMontones = 0;
    for (const n of ahora.values()) enMontones += n;
    if (creado !== enAsientos + enMontones + cobrado + perdido) return { creado, enAsientos, enMontones, cobrado, perdido, recogidas, rematadas, k: p.sala.tic };
  }
  return null;
}

/**
 * EL RECOLECTOR: golpea a la entidad en pie más cercana que tenga a tiro, remata la que cae, se come el
 * montón que suelta, y cuando lleva algo va a la zona de acción encendida y la usa.
 */
function recolector(): Robot {
  let ultimoGolpe = -1e9;
  let zona = 0;
  let lleva = 0;
  return (a, b, reloj) => {
    for (const x of a.oido) {
      if (x.suceso.e === 'zona') zona = x.suceso.tics > 0 ? x.suceso.id : 0;
      if (x.suceso.e === 'carga' && x.suceso.a === a.numero) lleva = x.suceso.n;
    }
    a.oido = [];
    const sala = b.sala;
    let caida: { x: number; z: number; numero: number } | null = null;
    let enPie: { x: number; z: number; numero: number } | null = null;
    let dCaida = Infinity;
    let dPie = Infinity;
    for (const e of sala.entidades) {
      const d = Math.abs(e.x - a.x) + Math.abs(e.z - a.z);
      if (e.cerebro.modo === 'caida' && d < dCaida) {
        caida = e;
        dCaida = d;
      } else if (e.vida > 0 && e.cerebro.modo !== 'aparecer' && e.cerebro.modo !== 'deshecha' && d < dPie) {
        enPie = e;
        dPie = d;
      }
    }
    let monton: { x: number; z: number } | null = null;
    for (const m of sala.montones) if (monton === null) monton = m;
    if (caida !== null) {
      a.meta = { x: caida.x, z: caida.z - u(1.2) };
      if (dCaida < u(2.4)) {
        if (a.sosten === null || a.sosten.blanco !== caida.numero) a.sosten = { id: A.remate, ms: reloj, blanco: caida.numero };
      }
      return;
    }
    if (a.sosten !== null && a.sosten.id === A.remate) a.sosten = null;
    if (monton !== null) {
      a.meta = { x: monton.x, z: monton.z };
      return;
    }
    const zonaDeclarada = sala.declaracion.mundo.zonas.find((z) => z.id === zona);
    if (lleva > 0 && zonaDeclarada !== undefined) {
      const cx = Math.floor((zonaDeclarada.caja.x0 + zonaDeclarada.caja.x1) / 2);
      const cz = Math.floor((zonaDeclarada.caja.z0 + zonaDeclarada.caja.z1) / 2);
      a.meta = { x: cx, z: cz };
      if (Math.abs(cx - a.x) + Math.abs(cz - a.z) < u(1)) {
        if (a.sosten === null) a.sosten = { id: A.zona, ms: reloj, blanco: 0 };
      }
      return;
    }
    if (enPie !== null) {
      if (dPie > u(1.8)) a.meta = { x: enPie.x, z: enPie.z };
      else if (reloj - ultimoGolpe > 600) {
        ultimoGolpe = reloj;
        a.meta = null;
        a.planear(A.entrada, reloj, enPie.numero);
      }
    }
  };
}

paso('11 · Lo que se lleva se conserva en cada tic; la zona se usa de uno en uno');
{
  const blando = clase({ vida: 20, acciones: [], guardia: null });
  const dR = juguete({ asientos: 2, clase: blando, fin: 'salida', grupos: (n) => [grupoFijo(n, 3, 9, 3)], zonasExtra: [{ id: 9, clase: 9, caja: caja(-1, -12, 1, -11) }], nace: [{ x: -2, z: -9 }, { x: 2, z: -9 }] });
  const bR = new Banco(dR, 11, [new Aparato(1, 1500, 0, 100, 13, recolector()), new Aparato(2, 2500, 20, 150, 31, recolector())]);
  bR.conectar(1);
  bR.conectar(2);
  bR.correr(2400);
  const cuenta = vigilarLoQueSeLleva(bR, 3);
  let rematadas = 0;
  let recogidas = 0;
  let cobrado = 0;
  for (const s of bR.sucesos()) {
    if (s.s.e === 'seva' && s.s.por === MOTIVO_DE_IRSE.rematada) rematadas++;
    if (s.s.e === 'recoge') recogidas++;
  }
  for (const a of bR.sala.asientos) for (const c of a.contadores.cobrado) cobrado += c.n;
  comprobar('en cada tic, lo soltado es lo que llevan los asientos más lo de los montones, lo cobrado y lo perdido', cuenta === null, cuenta);
  comprobar('y no por vacío: hubo remates, recogidas y cobro al salir', rematadas >= 2 && recogidas >= 2 && cobrado >= 3, { rematadas, recogidas, cobrado });

  const aLaZona: Robot = (a, b, reloj) => {
    let zona = 0;
    for (const x of a.oido) if (x.suceso.e === 'zona') zona = x.suceso.tics > 0 ? x.suceso.id : 0;
    const z = b.sala.declaracion.mundo.zonas.find((q) => q.id === zona);
    if (z === undefined) return;
    const cx = Math.floor((z.caja.x0 + z.caja.x1) / 2);
    const cz = Math.floor((z.caja.z0 + z.caja.z1) / 2);
    a.meta = { x: cx + (a.numero === 1 ? u(-0.5) : u(0.5)), z: cz };
    if (Math.abs(cx - a.x) + Math.abs(cz - a.z) < u(1.2) && a.sosten === null) a.sosten = { id: A.zona, ms: reloj, blanco: 0 };
  };
  const dZ = juguete({ asientos: 2, fin: 'salida', grupos: () => [], nace: [{ x: -1, z: -17 }, { x: 1, z: -17 }] });
  const dZ5 = { ...dZ, mundo: { ...dZ.mundo, zonas: dZ.mundo.zonas.filter((z) => z.id !== 6) } };
  const bZ = new Banco(dZ5, 3, [new Aparato(1, 1500, 0, 100, 13, aLaZona), new Aparato(2, 2500, 0, 100, 31, aLaZona)]);
  bZ.conectar(1);
  bZ.conectar(2);
  let dosALaVez = false;
  let esperando = false;
  for (let i = 0; i < 300; i++) {
    bZ.tic();
    const zona = bZ.sala.encuentro?.zona ?? null;
    if (zona !== null && zona.usando.length > 1) dosALaVez = true;
    if (zona !== null && zona.usando.length === 1 && bZ.sala.asientos.every((a) => a.sostenida !== null)) esperando = true;
  }
  const salen = sucesosDe(bZ, 'sale');
  comprobar(
    'la zona de capacidad uno: nunca la usan dos a la vez, uno espera sosteniendo, y salen los dos con 30 tics o más de diferencia',
    !dosALaVez && esperando && salen.length === 2 && salen[1]!.k - salen[0]!.k >= 30,
    { dosALaVez, esperando, salen: salen.map((x) => x.k) },
  );
  const ronda = bZ.veredictos().find((v) => v.tipo === VEREDICTO_DE_RONDA);
  const carga = ronda === undefined ? null : leerCargaDeRonda(ronda.carga, null, COLUMNAS.length, 2);
  comprobar('y con los dos fuera ya no puede salir nadie más: el encuentro se cierra ganado', carga !== null && carga.resultado === 'ganada', ronda);
}

paso('11 bis · Caer: soltar lo que se lleva, que te rescaten, o pagar y volver');
{
  const brutal = clase({ guardia: null, acciones: [accion(A.golpe, { anuncioTics: 11, enganche: null, alFallar: null, efecto: efecto(100, puesta(E.tocado, 12)) })] });
  const dC = juguete({ asientos: 2, clase: brutal, lleva: 5, grupos: (n) => [grupoFijo(n, 1, 7)], zonasExtra: [ZONA_DELANTE], nace: [{ x: 0, z: -8 }, { x: 8, z: -8 }] });
  let fue = false;
  const recoge: Robot = (a, b) => {
    const m = b.sala.montones[0];
    if (m !== undefined) {
      fue = true;
      a.meta = { x: m.x, z: m.z };
    } else if (fue) a.meta = { x: u(8), z: u(-8) };
  };
  const bC = new Banco(dC, 4, [new Aparato(1, 1000, 0, 100, 13, quieto), new Aparato(2, 2000, 0, 100, 31, recoge)]);
  bC.conectar(1);
  bC.conectar(2);
  bC.correr(200);
  const suelto = sucesosDe(bC, 'monton')[0];
  const cogido = sucesosDe(bC, 'recoge').find((x) => x.s.a === 2);
  const cuenta = vigilarLoQueSeLleva(bC, 3, 10);
  comprobar(
    'el asiento que cae suelta sus 5 en un montón donde cayó, el otro pasa y se los lleva, y la cuenta cuadra en cada tic',
    suelto !== undefined && suelto.s.n === 5 && cogido !== undefined && cogido.s.n === 5 && cuenta === null,
    { suelto, cogido, cuenta },
  );

  /* EL RESCATE: el 2 mata a la entidad que tumbó al 1 y luego lo levanta manteniendo su acción al lado. */
  const fragil = clase({ vida: 10, guardia: null, alCaer: { tipo: 'irse' }, acciones: [accion(A.golpe, { anuncioTics: 11, enganche: null, alFallar: null, efecto: efecto(100, puesta(E.tocado, 12)) })] });
  /* Dos que salen de una en una y con 400 tics entre ellas: matar a la primera no vacía el encuentro (que se ganaría y acabaría el combate). */
  const dRes = juguete({ asientos: 2, clase: fragil, grupos: (n) => [grupoFijo(n, 2, 7, 1, 400)], zonasExtra: [ZONA_DELANTE], nace: [{ x: 0, z: -8 }, { x: 6, z: -8 }] });
  let ultimo = -1e9;
  const socorrista: Robot = (a, b, reloj) => {
    const e = b.sala.entidades.find((x) => x.vida > 0 && x.cerebro.modo !== 'aparecer');
    const caido = b.sala.asientos[0]!;
    if (e !== undefined && caido.vida <= 0) {
      const d = Math.abs(e.x - a.x) + Math.abs(e.z - a.z);
      if (d > u(2)) a.meta = { x: e.x + u(1.5), z: e.z };
      else if (reloj - ultimo > 500) {
        ultimo = reloj;
        a.meta = null;
        a.planear(A.entrada, reloj, e.numero);
      }
      return;
    }
    if (caido.conCuerpo && caido.vida <= 0) {
      a.meta = { x: caido.x + u(1), z: caido.z };
      if (Math.abs(caido.x + u(1) - a.x) + Math.abs(caido.z - a.z) < u(0.4) && a.sosten === null) a.sosten = { id: A.rescate, ms: reloj, blanco: 1 };
    } else a.sosten = null;
  };
  const bRes = new Banco(dRes, 4, [new Aparato(1, 1000, 0, 100, 13, quieto), new Aparato(2, 2000, 0, 100, 31, socorrista)]);
  bRes.conectar(1);
  bRes.conectar(2);
  let tumbado = false;
  let levantado = -1;
  for (let i = 0; i < 400 && levantado < 0; i++) {
    bRes.tic();
    const uno = bRes.sala.asientos[0]!;
    if (uno.vida <= 0) tumbado = true;
    if (tumbado && uno.vida > 0) levantado = bRes.k;
  }
  const rescatador = bRes.sala.asientos[1]!;
  comprobar(
    'el rescate: sostener la acción junto al caído los tics que pide lo levanta con su vida, y cuenta el rescate y sus puntos',
    tumbado && levantado > 0 && bRes.sala.asientos[0]!.vida === 40 && rescatador.contadores.rescates === 1 && rescatador.puntos >= 75,
    { tumbado, levantado, vida: bRes.sala.asientos[0]!.vida, rescates: rescatador.contadores.rescates, puntos: rescatador.puntos },
  );

  /* LA REAPARICIÓN: sin nadie que rescate, al acabar la caída se paga el recurso, se espera y se vuelve. */
  const dRe = juguete({ asientos: 1, clase: fragil, recurso: 1, grupos: (n) => [grupoFijo(n, 1, 7)], zonasExtra: [ZONA_DELANTE], nace: [{ x: 0, z: -8 }] });
  const bRe = bancoDeUno(dRe, new Aparato(1, 1000, 0, 100, 13, quieto));
  let vuelve = -1;
  let cayo = -1;
  for (let i = 0; i < 600 && vuelve < 0; i++) {
    const p = bRe.tic();
    const yo = bRe.sala.asientos[0]!;
    if (cayo < 0 && yo.vida <= 0) cayo = bRe.k;
    if (cayo > 0 && yo.conCuerpo && yo.vida > 0) {
      vuelve = bRe.k;
      const corrige = p.correcciones.find((c) => c.asiento === 1);
      comprobar(
        'la reaparición: acabada la caída sin rescate se paga el recurso, se espera sin cuerpo y se vuelve a su sitio con su vida, intocable, y el aparato recibe el corrige',
        vuelve - cayo === 240 + 160 && yo.vida === 60 && yo.x === 0 && yo.z === u(-15) && yo.estado !== null && yo.estado.estado === E.reaparecido && yo.contadores.reapariciones === 1 && bRe.sala.recurso === 0 && corrige !== undefined && corrige.z === u(-15),
        { cayo, vuelve, vida: yo.vida, estado: yo.estado, recurso: bRe.sala.recurso, corrige },
      );
    }
  }
  if (vuelve < 0) comprobar('la reaparición: acabada la caída sin rescate se paga el recurso, se espera sin cuerpo y se vuelve a su sitio con su vida, intocable, y el aparato recibe el corrige', false, { cayo });
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 12 · LOS FINALES Y LOS VEREDICTOS
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Cuántos veredictos de un tipo salieron, y la carga del primero. */
function veredictosDe(b: Banco, tipo: string): { cuantos: number; primero: unknown; k: number } {
  const v = b.veredictos().filter((x) => x.tipo === tipo);
  return { cuantos: v.length, primero: v[0]?.carga, k: v[0]?.k ?? -1 };
}

/** Tras cerrar, ¿sale algo de entidades? (No debería salir nada: la sala espera la fase siguiente.) */
function algoTrasCerrar(b: Banco, cerradoEn: number): number {
  let n = 0;
  for (const x of b.sucesos()) if (x.k > cerradoEn && (x.s.e === 'nace' || x.s.e === 'anuncio' || x.s.e === 'bala')) n++;
  return n;
}

paso('12 · Los finales del encuentro y los veredictos de la mesa');
{
  const blanda = clase({ vida: 10, acciones: [], guardia: null, alCaer: { tipo: 'irse' } });
  const dV = juguete({ asientos: 1, clase: blanda, grupos: (n) => [grupoFijo(n, 2, 9, 2)], zonasExtra: [{ id: 9, clase: 9, caja: caja(-1, -7, 1, -6.5) }], nace: [{ x: 0, z: -8 }] });
  const bV = bancoDeUno(dV, new Aparato(1, 1000, 0, 100, 17, recolector()));
  bV.correr(400);
  const rV = veredictosDe(bV, VEREDICTO_DE_RONDA);
  const cV = leerCargaDeRonda(rV.primero, null, COLUMNAS.length, 1);
  comprobar('vaciar: al irse la última entidad sale UNA ronda ganada, con la ronda declarada y cuentas que la mesa lee', rV.cuantos === 1 && cV !== null && cV.resultado === 'ganada' && cV.n === 1, rV);
  const faseCero = sucesosDe(bV, 'fase').find((x) => x.k === rV.k);
  comprobar('y al cerrar sale la fase con el reloj del encuentro a cero, y nada más de entidades', faseCero !== undefined && faseCero.s.encuentroTics === 0 && algoTrasCerrar(bV, rV.k) === 0, faseCero);

  const dA = juguete({ asientos: 1, clase: saco(), relojTics: 100, grupos: (n) => [grupoFijo(n, 1, 9, 1)], zonasExtra: [{ id: 9, clase: 9, caja: caja(-1, -3, 1, -2) }], nace: [{ x: 0, z: -8 }] });
  const bA = bancoDeUno(dA, new Aparato(1, 1000, 0, 100, 17, quieto));
  bA.correr(140);
  const rA = veredictosDe(bA, VEREDICTO_DE_RONDA);
  const cA = leerCargaDeRonda(rA.primero, null, COLUMNAS.length, 1);
  const disueltas = sucesosDe(bA, 'seva').filter((x) => x.s.por === MOTIVO_DE_IRSE.disuelta && x.k === rA.k);
  comprobar('vaciar con el reloj vencido y entidades vivas: aguantada en el tic 101, y lo que queda se disuelve', rA.cuantos === 1 && cA !== null && cA.resultado === 'aguantada' && rA.k === 101 && disueltas.length === 1, { rA, disueltas: disueltas.length });

  const brutal = clase({ guardia: null, acciones: [accion(A.golpe, { anuncioTics: 11, enganche: null, alFallar: null, efecto: efecto(100, puesta(E.tocado, 12)) })] });
  const dP = juguete({ asientos: 1, clase: brutal, recurso: 0, grupos: (n) => [grupoFijo(n, 1, 7)], zonasExtra: [ZONA_DELANTE], nace: [{ x: 0, z: -8 }] });
  const bP = bancoDeUno(dP, new Aparato(1, 1000, 0, 100, 17, quieto));
  bP.correr(200);
  const rP = veredictosDe(bP, VEREDICTO_DE_RONDA);
  const cP = leerCargaDeRonda(rP.primero, null, COLUMNAS.length, 1);
  const fila = cP?.cuentas[0] ?? [];
  const col = (que: string): number => fila[1 + COLUMNAS.findIndex((c) => c.que === que)] ?? -1;
  comprobar(
    'todos sin vida y sin recurso para volver: perdida, y la fila dice vida 0 y una caída',
    rP.cuantos === 1 && cP !== null && cP.resultado === 'perdida' && col('vida') === 0 && col('caidas') === 1 && cP.recurso === 0,
    { rP, fila },
  );

  const dS = juguete({ asientos: 1, fin: 'salida', grupos: () => [], nace: [{ x: 0, z: -17 }] });
  const dS5 = { ...dS, mundo: { ...dS.mundo, zonas: dS.mundo.zonas.filter((z) => z.id !== 6) } };
  const aLaCinco: Robot = (a, _b, reloj) => {
    a.meta = { x: 0, z: u(-20) };
    if (Math.abs(a.z - u(-20)) < u(1) && a.sosten === null) a.sosten = { id: A.zona, ms: reloj, blanco: 0 };
  };
  const bS = bancoDeUno(dS5, new Aparato(1, 1000, 0, 100, 17, aLaCinco));
  bS.correr(200);
  const rS = veredictosDe(bS, VEREDICTO_DE_RONDA);
  const cS = leerCargaDeRonda(rS.primero, null, COLUMNAS.length, 1);
  const filaS = cS?.cuentas[0] ?? [];
  const colS = (que: string): number => filaS[1 + COLUMNAS.findIndex((c) => c.que === que)] ?? -1;
  comprobar(
    'salida: quien sale cuenta `salio` y sus puntos de salir, y con él fuera el encuentro se gana',
    rS.cuantos === 1 && cS !== null && cS.resultado === 'ganada' && colS('salio') === 1 && colS('puntos') === 150,
    { rS, filaS },
  );

  const dN = juguete({ asientos: 1, fin: 'salida', recurso: 0, zonaTics: 60, grupos: () => [], nace: [{ x: 0, z: -8 }] });
  const bN = bancoDeUno(dN, new Aparato(1, 1000, 0, 100, 17, quieto));
  bN.correr(100);
  const rN = veredictosDe(bN, VEREDICTO_DE_RONDA);
  const cN = leerCargaDeRonda(rN.primero, null, COLUMNAS.length, 1);
  comprobar('salida: la zona se apaga sin recurso para encender otra y nadie salió: perdida', rN.cuantos === 1 && cN !== null && cN.resultado === 'perdida' && rN.k === 61, rN);

  const dR = juguete({ asientos: 1, modo: 'calma', reloj: { id: 'pausa-1', duraMs: 1000 }, nace: [{ x: 0, z: -8 }] });
  const bRe = bancoDeUno(dR, new Aparato(1, 1000, 0, 100, 17, quieto));
  bRe.correr(120);
  const rR = veredictosDe(bRe, VEREDICTO_DE_RELOJ);
  comprobar('el reloj de fase vence UNA vez, en el tic en que pasan sus ms desde que empezó la fase', rR.cuantos === 1 && rR.k === 21 && (rR.primero as { id: string }).id === 'pausa-1', rR);

  const dAu = juguete({ asientos: 2, clase: saco(), grupos: (n) => [grupoFijo(n, 1, 1, 1)], nace: [{ x: 0, z: -8 }, { x: 2, z: -8 }] });
  const bAu = new Banco(dAu, 3, [new Aparato(1, 1000, 0, 100, 17, quieto), new Aparato(2, 1000, 0, 100, 17, quieto)]);
  bAu.conectar(1);
  bAu.guardarPasos = false;
  const ausentes: { k: number; a: unknown }[] = [];
  for (let i = 0; i < 1300; i++) {
    const p = bAu.tic();
    for (const v of p.veredictos) if (v.tipo === VEREDICTO_DE_AUSENTE) ausentes.push({ k: p.sala.tic, a: v.carga });
  }
  comprobar(
    'quien nunca abre canal sale ausente UNA vez, a los `veredictoTrasTics` de nacer la sala; quien sí lo abrió, no',
    ausentes.length === 1 && ausentes[0]!.k === 1200 && (ausentes[0]!.a as { a: string }).a === 'a2',
    ausentes,
  );

  /*
   * UN ASIENTO VACÍO NO SOSTIENE EL ENCUENTRO (lo encontró la revisión del frente). Al empezar la fase
   * todos tienen cuerpo; el que no juega pasa al ausente, es intocable, nadie lo persigue y no cae nunca.
   * Contado como alguien que puede seguir, el encuentro no se perdía nunca: con uno solo se pierde en
   * cuanto cae, y con otro asiento vacío salía «aguantada» al vencer el reloj. Ahora quien se fue deja de
   * contar a los `veredictoTrasTics` (1200 en el juguete): ni antes —una recarga no puede perder un
   * encuentro— ni nunca.
   */
  const dF = juguete({ asientos: 2, clase: brutal, recurso: 0, relojTics: 3000, grupos: (n) => [grupoFijo(n, 1, 7)], zonasExtra: [ZONA_DELANTE], nace: [{ x: 0, z: -8 }, { x: 9, z: -8 }] });
  const fantasma = (como: 'nunca' | 'cierra' | 'mudo'): { cae: number; ronda: string } => {
    const ap2 = new Aparato(2, 2000, 0, 100, 31, quieto);
    ap2.mudo = como === 'mudo';
    const bF = new Banco(dF, 4, [new Aparato(1, 1000, 0, 100, 13, quieto), ap2]);
    bF.guardarPasos = false;
    bF.conectar(1);
    if (como !== 'nunca') bF.conectar(2);
    let cae = -1;
    let ronda = 'ninguna';
    for (let i = 0; i < 3100 && ronda === 'ninguna'; i++) {
      if (como === 'cierra' && bF.k === 5) bF.desconectar(2);
      const p = bF.tic();
      if (cae < 0 && p.sala.asientos[0]!.vida <= 0) cae = p.sala.tic;
      for (const v of p.veredictos) if (v.tipo === VEREDICTO_DE_RONDA) ronda = `${(v.carga as CargaDeRonda).resultado}@${String(p.sala.tic)}`;
    }
    return { cae, ronda };
  };
  const nunca = fantasma('nunca');
  const cierra = fantasma('cierra');
  const mudo = fantasma('mudo');
  comprobar(
    'con el otro asiento sin canal desde que nació la sala, el que juega cae y la ronda sale PERDIDA a los 1200 tics, no aguantada al vencer el reloj',
    nunca.cae > 0 && nunca.cae < 100 && nunca.ronda === 'perdida@1200',
    nunca,
  );
  /* Cierra con la sala en el tic 5: la desconexión entra en el paso siguiente, el 6, y de ahí cuentan los 1200. */
  comprobar(
    'con el otro que cierra la pestaña en el tic 5 (y ya ausente cuando le llegan), perdida a los 1200 tics de perder el canal: ni antes, ni nunca',
    cierra.cae > 0 && cierra.ronda === 'perdida@1206',
    cierra,
  );
  comprobar(
    'y con el canal abierto pero sin mandar aqui (la pestaña oculta que no vuelve), perdida a los 1200 tics de estar ausente',
    mudo.cae > 0 && mudo.ronda === `perdida@${String(1 + 40 + 1200)}`,
    mudo,
  );

  /*
   * Y con salida: la zona se paga por quien aún está en su gracia, no por quien se fue, y la ronda sale
   * cuando ya no puede salir nadie más. Dos zonas: una que se apaga a los 1000 tics (dentro de la gracia
   * del otro: se paga y se enciende otra) y otra que se apaga justo en el 1200, el tic en que el otro deja
   * de contar (no se paga: ya no queda nadie que pueda salir por ella).
   */
  const salidaConUnoVacio = (zonaTics: number): { k: number; resultado: string; recurso: number } | null => {
    const dSal = juguete({ asientos: 2, fin: 'salida', recurso: 2, presentes: 1, relojTics: 20000, zonaTics, grupos: () => [], nace: [{ x: -1, z: -17 }, { x: 1, z: -17 }] });
    const dSal5 = { ...dSal, mundo: { ...dSal.mundo, zonas: dSal.mundo.zonas.filter((z) => z.id !== 6) } };
    const bSal = new Banco(dSal5, 3, [new Aparato(1, 1500, 0, 100, 13, aLaCinco), new Aparato(2, 2500, 0, 100, 31, aLaCinco)]);
    bSal.conectar(1);
    bSal.guardarPasos = false;
    for (let i = 0; i < 3000; i++) {
      const p = bSal.tic();
      for (const v of p.veredictos) if (v.tipo === VEREDICTO_DE_RONDA) return { k: p.sala.tic, resultado: (v.carga as CargaDeRonda).resultado, recurso: (v.carga as CargaDeRonda).recurso };
    }
    return null;
  };
  const conPago = salidaConUnoVacio(1000);
  const sinPago = salidaConUnoVacio(1199);
  comprobar(
    'salida con el otro sin canal: la zona que se apaga en su gracia se paga, la que se apaga cuando deja de contar no, y a los 1200 tics la ronda sale ganada con el recurso que queda',
    conPago !== null && conPago.k === 1200 && conPago.resultado === 'ganada' && conPago.recurso === 1 && sinPago !== null && sinPago.k === 1200 && sinPago.resultado === 'ganada' && sinPago.recurso === 2,
    { conPago, sinPago },
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
 * 13 · EL QUE LEE CONTRA EL QUE APORREA
 * ═══════════════════════════════════════════════════════════════════════════ */


paso('13 · Un robot que LEE saca al menos el doble que uno que APORREA');
{
  const zonaAlrededor = { id: 9, clase: 9, caja: caja(-4, -4, 4, -3) };
  const d = juguete({
    asientos: 1,
    relojTics: 1200,
    grupos: (n) => [{ clase: 1, cuantos: porN(n, () => 40), vivasALaVez: porN(n, () => 3), claseDeZona: 9, desdeTic: 0, cadaTics: 20, eleccion: 'azar' }],
    zonasExtra: [zonaAlrededor],
    nace: [{ x: 0, z: -8 }],
  });
  const puntosDe = (robot: () => Robot, semilla: number): { puntos: number; limpias: number; rematadas: number } => {
    const b = bancoDeUno(d, new Aparato(1, 6000, 25, 150, 17, robot()), semilla);
    b.guardarPasos = false;
    for (let i = 0; i < 1201 && (b.sala.encuentro === null || b.sala.encuentro.resultado === null); i++) b.tic();
    const yo = b.sala.asientos[0]!;
    return { puntos: yo.puntos, limpias: yo.contadores.limpias, rematadas: yo.contadores.rematadas };
  };
  let lee = 0;
  let aporrea = 0;
  const detalle: unknown[] = [];
  for (const semilla of [21, 22]) {
    const l = puntosDe(() => guerrero(120), semilla);
    const p = puntosDe(aporreador, semilla);
    lee += l.puntos;
    aporrea += p.puntos;
    detalle.push({ semilla, lee: l, aporrea: p });
  }
  nota(`en dos minutos de encuentro, el que lee: ${String(lee)} puntos; el que aporrea: ${String(aporrea)}`);
  comprobar('el que lee saca al menos el doble de puntos que el que aporrea (condición del diseño)', lee > 0 && lee >= 2 * aporrea, detalle);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 14 · DETERMINISMO, SALA REHECHA Y NODE CONTRA HERMES
 * ═══════════════════════════════════════════════════════════════════════════ */


paso('14 · Determinismo: el mismo paso con la misma semilla, el estado intacto, la sala rehecha y Node contra Hermes');
const GRABACION = { tics: 300, entradas: [] as EntradaDeLaSala[][], huellas: [] as string[], salidas: [] as string[] };
{
  const d = lizaLlena();
  const b = bancoLleno(d, 77);
  for (let i = 0; i < GRABACION.tics; i++) {
    const p = b.tic();
    GRABACION.huellas.push(fnv(huellaDeLaSala(p.sala)));
    GRABACION.salidas.push(fnv(salidasDe(p)));
  }
  GRABACION.entradas = b.grabadas.slice(0, GRABACION.tics);
  const repetir = (semilla: number, vigilar: boolean): { difiere: number; intacto: boolean } => {
    let s = salaNueva(d, semilla);
    let difiere = -1;
    let intacto = true;
    for (let i = 0; i < GRABACION.tics; i++) {
      const antes = vigilar && i % 30 === 0 ? huellaDeLaSala(s) : '';
      const p = avanzarLaSala(s, GRABACION.entradas[i] as EntradaDeLaSala[]);
      if (vigilar && i % 30 === 0 && huellaDeLaSala(s) !== antes) intacto = false;
      if (difiere < 0 && (fnv(huellaDeLaSala(p.sala)) !== GRABACION.huellas[i] || fnv(salidasDe(p)) !== GRABACION.salidas[i])) difiere = i;
      s = p.sala;
    }
    return { difiere, intacto };
  };
  const otraVez = repetir(77, true);
  const yOtra = repetir(77, false);
  const otraSemilla = repetir(78, false);
  const entidades = b.sala.entidades.length;
  comprobar(
    `la misma declaración, semilla y entradas dan EL MISMO paso en cada uno de ${String(GRABACION.tics)} tics (estado y todo lo que sale, en forma canónica), dos veces`,
    otraVez.difiere === -1 && yOtra.difiere === -1 && entidades >= 10,
    { otraVez, yOtra, entidades },
  );
  comprobar('avanzarLaSala no toca el estado que recibe', otraVez.intacto);
  comprobar('y con otra semilla se separa (la semilla pesa de verdad)', otraSemilla.difiere >= 0, otraSemilla);

  /* LA SALA REHECHA: el proceso muere a media oleada y la sala renace con la misma llamada. */
  const dR = lizaLlena({ relojTics: 900, grupos: (n) => [{ clase: 1, cuantos: porN(n, () => 10), vivasALaVez: porN(n, () => 6), claseDeZona: 1, desdeTic: 0, cadaTics: 10, eleccion: 'azar' }] });
  const bR = bancoLleno(dR, 5);
  bR.guardarPasos = true;
  bR.correr(300);
  const mediaOleada = bR.sala.encuentro !== null && bR.sala.encuentro.resultado === null && bR.sala.encuentro.grupos[0]!.salidas > 0;
  const rondasAntes = bR.veredictos().filter((v) => v.tipo === VEREDICTO_DE_RONDA).length;
  bR.sala = salaNueva(dR, dR.fase.semilla);
  bR.enVuelo = [];
  bR.pasos = [];
  for (const a of bR.aparatos) {
    a.oido = [];
    a.planes = [];
    a.sosten = null;
    bR.conectar(a.numero);
  }
  const renace = bR.tic();
  const fase = renace.sucesos.find((s) => s.para === 0 && s.suceso.e === 'fase');
  comprobar(
    'la sala rehecha EMPIEZA la fase en curso desde su principio: la fase a todos con el reloj entero, y el encuentro vuelve a salir desde cero',
    mediaOleada && rondasAntes === 0 && fase !== undefined && fase.suceso.e === 'fase' && fase.suceso.encuentroTics === 900 && renace.sala.encuentro !== null && renace.sala.encuentro.grupos[0]!.salidas <= 1,
    { mediaOleada, rondasAntes, fase },
  );
  comprobar(
    'cada asiento que vuelve recibe su bienvenida y empieza desde su punto de control (vida entera, puntos a cero)',
    renace.bienvenidas.length === 6 && renace.sala.asientos.every((a) => a.vida === 100 && a.puntos === 0 && a.conCuerpo),
    renace.bienvenidas.length,
  );
  bR.correr(1000);
  const rondas = bR.veredictos().filter((v) => v.tipo === VEREDICTO_DE_RONDA);
  comprobar('y la reanudada acaba con UNA ronda, la misma que la mesa esperaba (n = 1)', rondas.length === 1 && (rondas[0]!.carga as CargaDeRonda).n === 1, rondas.map((r) => r.carga));
}

/* Node contra Hermes: la misma grabación, empaquetada, corrida en los dos motores y en este proceso. */
{
  const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'verificar-liza-'));
  const barra = (p: string): string => p.replace(/\\/g, '/');
  const SALA = barra(path.join(REPO, 'shared', 'mecanicas', 'liza', 'sala'));
  const CANONICO = barra(path.join(REPO, 'shared', 'mecanicas', 'canonico'));
  fs.writeFileSync(path.join(DIR, 'datos.json'), JSON.stringify({ liza: lizaLlena(), semilla: 77, entradas: GRABACION.entradas }), 'utf8');
  fs.writeFileSync(
    path.join(DIR, 'tanda.ts'),
    `import { canonico } from '${CANONICO}';\n` +
      `import { avanzarLaSala, huellaDeLaSala, salaNueva } from '${SALA}';\n` +
      "import datos from './datos.json';\n" +
      'function fnv(texto: string): string { let h = 0x811c9dc5; for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); }\n' +
      'export function tanda(): { motor: string; tics: number; salidas: string; huellas: string; final: string } {\n' +
      '  const d = datos as unknown as { liza: Parameters<typeof salaNueva>[0]; semilla: number; entradas: Parameters<typeof avanzarLaSala>[1][] };\n' +
      '  let s = salaNueva(d.liza, d.semilla);\n' +
      "  let salidas = '';\n" +
      "  let huellas = '';\n" +
      '  for (let i = 0; i < d.entradas.length; i++) {\n' +
      '    const p = avanzarLaSala(s, d.entradas[i] as Parameters<typeof avanzarLaSala>[1]);\n' +
      '    s = p.sala;\n' +
      '    salidas = fnv(salidas + canonico({ sucesos: p.sucesos, veredictos: p.veredictos, foto: p.fotoDebida, correcciones: p.correcciones, bienvenidas: p.bienvenidas }));\n' +
      '    if (i % 25 === 0) huellas = fnv(huellas + huellaDeLaSala(s));\n' +
      '  }\n' +
      "  const motor = (globalThis as unknown as { HermesInternal?: unknown }).HermesInternal === undefined ? 'node' : 'hermes';\n" +
      '  return { motor, tics: d.entradas.length, salidas, huellas, final: fnv(huellaDeLaSala(s)) };\n' +
      '}\n',
    'utf8',
  );
  fs.writeFileSync(path.join(DIR, 'entrada.ts'), "import { tanda } from './tanda';\nconst linea = JSON.stringify(tanda());\n// @ts-ignore\nif (typeof print === 'function') print(linea); else console.log(linea);\n", 'utf8');
  interface Tanda {
    motor: string;
    tics: number;
    salidas: string;
    huellas: string;
    final: string;
  }
  let enProceso: Tanda | null = null;
  try {
    const m = (await import(pathToFileURL(path.join(DIR, 'tanda.ts')).href)) as { tanda: () => Tanda };
    enProceso = m.tanda();
  } catch (e) {
    comprobar('la tanda corre en este proceso', false, e instanceof Error ? e.message : String(e));
  }
  const paquete = path.join(DIR, 'tanda.js');
  const ESBUILD = path.join(REPO, 'node_modules', 'esbuild', 'bin', 'esbuild');
  const hecho = spawnSync(process.execPath, [ESBUILD, path.join(DIR, 'entrada.ts'), '--bundle', '--format=iife', '--target=es2015', '--platform=neutral', `--outfile=${paquete}`, '--log-level=error'], { encoding: 'utf8' });
  let listo = hecho.status === 0;
  comprobar('la sala se empaqueta para los dos motores', listo, `${hecho.stderr}`.slice(0, 500));
  if (listo) {
    /* `class` se baja a funciones: Hermes 0.12 no la entiende, y `fijo.ts`, `canonico.ts` y `geometria.ts` declaran una cada uno. */
    const NOMBRE_DEL_COMPLEMENTO = '@babel/plugin-transform-classes';
    const bajarClases = (await import(NOMBRE_DEL_COMPLEMENTO)) as { default: unknown };
    const babel = await import('@babel/core');
    const transformado = babel.transformFileSync(paquete, { babelrc: false, configFile: false, compact: false, plugins: [bajarClases.default as babel.PluginItem] });
    const codigo = transformado?.code ?? '';
    listo = codigo.length > 0;
    if (listo) fs.writeFileSync(paquete, codigo, 'utf8');
  }
  const carpeta = path.join(REPO, 'node_modules', 'hermes-engine-cli');
  const hermes = process.platform === 'win32' ? path.join(carpeta, 'win64-bin', 'hermes.exe') : process.platform === 'darwin' ? path.join(carpeta, 'osx-bin', 'hermes') : path.join(carpeta, 'linux64-bin', 'hermes');
  comprobar('el intérprete de Hermes está instalado (sin él esto no compara dos motores y se pone rojo, no se salta)', fs.existsSync(hermes), hermes);
  if (listo && fs.existsSync(hermes)) {
    const leer = (s: string): Tanda | null => {
      try {
        return JSON.parse(s.trim().split('\n').pop() ?? '') as Tanda;
      } catch {
        return null;
      }
    };
    const enNode = spawnSync(process.execPath, [paquete], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const enHermes = spawnSync(hermes, [paquete], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const n = leer(enNode.stdout);
    const h = leer(enHermes.stdout);
    comprobar('Node y Hermes corren la sala empaquetada sin caerse, y son dos motores distintos', n !== null && h !== null && n.motor === 'node' && h.motor === 'hermes', { node: enNode.stderr.slice(0, 300), hermes: enHermes.stderr.slice(0, 300) });
    if (n !== null && h !== null && enProceso !== null) {
      nota(`Node: salidas ${n.salidas} · huellas ${n.huellas} · final ${n.final}; Hermes: salidas ${h.salidas} · huellas ${h.huellas} · final ${h.final}`);
      comprobar(
        `los ${String(GRABACION.tics)} tics de la sala llena dan LA MISMA cadena de salidas y de estados en Node, en Hermes y en este proceso`,
        n.tics === GRABACION.tics && n.salidas === h.salidas && n.huellas === h.huellas && n.final === h.final && n.final === enProceso.final && n.salidas === enProceso.salidas,
        { n, h, enProceso },
      );
    }
  }
  fs.rmSync(DIR, { recursive: true, force: true });
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 15 · EL COSTE DE UNA SALA LLENA
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * El tope de lo que puede costar un tic de una sala llena, en µs, en un PC de desarrollo. Es la parte de
 * simulación del §12 del diseño (validar, NPC, línea de vista, balas y juicios: unos 4,5 ms por segundo,
 * 225 µs por tic) con un poco de holgura; los envíos y la foto serializada son de la E/S y no entran aquí.
 */
const TOPE_DEL_TIC_US = 250;

paso('15 · El coste: microsegundos por tic de una sala llena (6 asientos, 14 entidades, 12 balas) en Node');
{
  const b = bancoLleno(lizaLlena(), 91);
  b.correr(300);
  const tomas: number[] = [];
  let entidades = 0;
  let balas = 0;
  let masBalas = 0;
  let sucesos = 0;
  for (let t = 0; t < 5; t++) {
    b.costeMs = 0;
    b.llamadas = 0;
    for (let i = 0; i < 400; i++) {
      const p = b.tic();
      entidades += p.sala.entidades.length;
      balas += p.sala.balas.length;
      sucesos += p.sucesos.length;
      if (p.sala.balas.length > masBalas) masBalas = p.sala.balas.length;
    }
    tomas.push((b.costeMs * 1000) / b.llamadas);
  }
  const mejor = Math.min(...tomas);
  const mediana = tomas.slice().sort((x, y) => x - y)[2] as number;
  nota(
    `por tic: mejor ${mejor.toFixed(1)} µs, mediana ${mediana.toFixed(1)} µs (cinco tomas de 400 tics); ` +
      `de media ${(entidades / 2000).toFixed(1)} entidades, ${(balas / 2000).toFixed(1)} balas (${String(masBalas)} a la vez como mucho) y ${(sucesos / 2000).toFixed(1)} sucesos por tic; ` +
      `${((mediana * 20) / 1000).toFixed(2)} ms de CPU por segundo de sala`,
  );
  comprobar('la sala está llena de verdad: 14 entidades casi siempre y el aforo de balas alcanzado', entidades / 2000 >= 13 && masBalas === 12 && b.sala.encuentro !== null && b.sala.encuentro.resultado === null, { entidades: entidades / 2000, masBalas });
  comprobar(`un tic de la sala llena cuesta ${String(TOPE_DEL_TIC_US)} µs o menos (la mejor de cinco tomas: la máquina puede estar ocupada con otros frentes)`, mejor <= TOPE_DEL_TIC_US, tomas);
  const b2 = bancoLleno(lizaLlena(), 92);
  const todas: PasoDeLaSala[] = [];
  b2.guardarPasos = false;
  for (let i = 0; i < 300; i++) todas.push(b2.tic());
  comprobar('y todo lo que sale de la sala llena lo admite el lector estricto del aparato', todoSeLee(todas));
  const cuenta = (() => {
    b2.pasos = todas;
    return vigilarLoQueSeLleva(b2, 3);
  })();
  comprobar('en la sala llena (con asientos que caen y sueltan lo que llevan), lo que se lleva también se conserva en cada tic', cuenta === null, cuenta);
}


/* ═══════════════════════════════════════════════════════════════════════════
 * 16 · LAS DECLARACIONES DE EL QUIEBRO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Si el productor del juego ya existe (lo escribe otro frente), la sala se juega también con sus
 * declaraciones de verdad, sacadas de las vistas que da el robot de su mesa: todas se aceptan, la sala
 * las juega fase a fase sin caerse y con todo lo que sale legible, y el juicio de la esquiva da lo
 * mismo con cualquier desfase y red también con sus números. Se importa en caliente y por ruta: este
 * comprobador es de la Liza, y la Liza no depende de ningún juego para compilar.
 */

paso('16 · Las declaraciones de El Quiebro, si su productor ya existe');
const RUTA_DEL_PRODUCTOR = path.join(REPO, 'shared', 'arcade', 'juegos', 'quiebro-liza.ts');
const RUTA_DEL_ROBOT = path.join(REPO, 'server', 'scripts', 'robot-de-quiebro.ts');
const HAY_QUIEBRO = fs.existsSync(RUTA_DEL_PRODUCTOR) && fs.existsSync(RUTA_DEL_ROBOT);
/** Las comprobaciones de este bloque cuando hay productor: el suelo las suma sólo entonces. */
const DEL_QUIEBRO = 7;
if (!HAY_QUIEBRO) nota('todavía no existe el productor de El Quiebro: este bloque no mira nada, y el suelo no cuenta con él');
else {
  await import(pathToFileURL(path.join(REPO, 'shared', 'arcade', 'juegos', 'index.ts')).href);
  const productor = (await import(pathToFileURL(RUTA_DEL_PRODUCTOR).href)) as { lizaDelQuiebro: (vista: unknown, codigo: string) => LizaDeclarada | null };
  const robotDeLaMesa = (await import(pathToFileURL(RUTA_DEL_ROBOT).href)) as {
    jugarAlQuiebro: (o: { asientos: number; semilla: number; noches: number; politica: 'gana' | 'pierde' | 'mezcla'; travesuras: boolean }) => { vistas: readonly unknown[] };
  };
  const CODIGO = 'K7M2P';
  const fases: LizaDeclarada[] = [];
  const claves = new Set<string>();
  const problemas: string[] = [];
  const aforos = new Set<string>();
  for (const asientos of [1, 3]) {
    const partida = robotDeLaMesa.jugarAlQuiebro({ asientos, semilla: 7, noches: 1, politica: 'gana', travesuras: false });
    for (const v of partida.vistas) {
      const l = productor.lizaDelQuiebro(v, CODIGO);
      if (l === null) continue;
      const llave = `${String(asientos)}:${l.fase.clave}`;
      if (claves.has(llave)) continue;
      claves.add(llave);
      fases.push(l);
      aforos.add(JSON.stringify(l.aforo));
      for (const x of problemasDeLaDeclaracion(l)) problemas.push(`${l.fase.clave}: ${x}`);
    }
  }
  const combates = fases.filter((l) => l.fase.modo === 'encuentro');
  nota(`${String(fases.length)} fases de El Quiebro (con 1 y con 3 asientos), ${String(combates.length)} de combate: ${fases.map((l) => l.fase.clave).join(' ')}`);
  comprobar('el productor da declaraciones para fases de combate, y la Liza las acepta todas', combates.length >= 2 && problemas.length === 0, problemas.slice(0, 5));

  let reventadas = 0;
  const legibles: boolean[] = [];
  for (const l of fases) {
    const aparatos: Aparato[] = [];
    for (let i = 1; i <= l.asientos.length; i++) aparatos.push(new Aparato(i, 3000 * i, 20 * i, 60 + 40 * i, (17 * i) % 50, guerrero(110, idsDe(l))));
    try {
      const b = new Banco(l, l.fase.semilla, aparatos);
      for (let i = 1; i <= l.asientos.length; i++) b.conectar(i);
      b.correr(160);
      legibles.push(todoSeLee(b.pasos));
    } catch (e) {
      reventadas++;
      nota(`${l.fase.clave} revienta: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  comprobar('la sala juega cada fase de El Quiebro con robots (160 tics) sin caerse', reventadas === 0, reventadas);
  comprobar('y todo lo que sale de sus fases lo admite el lector del aparato', legibles.length === fases.length && legibles.every((x) => x));

  /*
   * CADA CLASE ATACA. Jugar 160 tics sin caerse no dice si las entidades pelean: la revisión del frente
   * vio al duelista de este juego rondar mil tics a 1,25 m de un asiento quieto sin lanzar nada (su banda
   * empieza en 1,3 y su golpe llega a 1,1). Cada clase de cada combate de un asiento, SOLA —una entidad,
   * sin nadie que le quite el turno— contra un asiento que no se mueve: la que golpea tiene que lanzar su
   * anuncio, y la que dispara, su bala.
   */
  const atacan: string[] = [];
  const noAtacan: string[] = [];
  for (const l of combates) {
    const en = l.fase.encuentro;
    if (en === null || l.asientos.length !== 1) continue;
    const vistas = new Set<number>();
    for (const g of en.grupos) {
      const c = l.clases.find((x) => x.id === g.clase);
      if (c === undefined || vistas.has(g.clase)) continue;
      vistas.add(g.clase);
      const golpea = c.acciones.some((x) => x.cadena === null && x.soloEn.length === 0);
      const dispara = c.proyectil !== 0;
      if (!golpea && !dispara) continue;
      const sola: LizaDeclarada = { ...l, fase: { ...l.fase, encuentro: { ...en, grupos: [{ ...g, cuantos: g.cuantos.map(() => 1), vivasALaVez: g.vivasALaVez.map(() => 1), desdeTic: 0, cadaTics: 0 }] } } };
      const bs = bancoDeUno(sola, new Aparato(1, 3000, 0, 100, 17, quieto), sola.fase.semilla);
      bs.guardarPasos = false;
      let anuncios = 0;
      let balas = 0;
      for (let i = 0; i < 600 && (dispara ? balas === 0 : anuncios === 0); i++) {
        const p = bs.tic();
        for (const s of p.sucesos) {
          if (s.para === 1 && s.suceso.e === 'anuncio' && s.suceso.a === 1 && s.suceso.de >= 16) anuncios++;
          if (s.para === 1 && s.suceso.e === 'bala') balas++;
        }
      }
      const linea = `${l.fase.clave}/clase ${String(g.clase)}${dispara ? ' (dispara)' : ''}: ${String(anuncios)} anuncios, ${String(balas)} balas en ${String(bs.k)} tics`;
      if (dispara ? balas > 0 : anuncios > 0) atacan.push(linea);
      else noAtacan.push(linea);
    }
  }
  nota(`solas contra un asiento quieto: ${atacan.join(' · ')}`);
  comprobar('cada clase de El Quiebro, sola contra un asiento quieto, ataca: la que golpea lanza su anuncio, y la que dispara, su bala', atacan.length >= 3 && noAtacan.length === 0, noAtacan);

  const oleada = combates.find((l) => l.asientos.length === 1);
  const veredicto = (X: number | null, error: number, rtt: number): string => {
    if (oleada === undefined) return 'sin oleada';
    const ids = idsDe(oleada);
    const robot = X === null ? quieto : lector(X, { replica: false, ids });
    return veredictosContraUno(oleada, robot, error, rtt, true, 1, oleada.fase.semilla)[0] ?? 'nada';
  };
  for (const [X, espera] of [
    [100, 'limpia'],
    [null, 'da'],
  ] as const) {
    const vistos: string[] = [];
    for (const error of [0, 40, -40]) for (const rtt of [50, 150, 250]) vistos.push(`${veredicto(X, error, rtt)}@${String(error)}/${String(rtt)}`);
    comprobar(
      `con los números de El Quiebro, ${X === null ? 'no quebrar' : `quebrar a ${String(X)} ms del impacto`} da «${espera}» con 0, ±40 ms de error y 50/150/250 ms de red`,
      oleada !== undefined && vistos.every((v) => v.startsWith(`${espera}@`)),
      vistos,
    );
  }
  comprobar('y el aforo es el mismo en todas sus fases (la sala se admite por él al nacer)', aforos.size === 1, [...aforos]);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 18 · EL QUIEBRO JUGADO DE VERDAD: LOS NPC PELEAN Y ENTRAN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Jugando en el navegador, el frente del cliente vio Prestados quietos junto al jugador sin anunciar y
 * otros atascados donde nacían, fuera de la glorieta. Aquí se reproduce con la sala de verdad y las
 * declaraciones de verdad de El Quiebro —las de las vistas que da el robot de su mesa, noches 1 y 2, con
 * 1, 2, 3 y 4 asientos y tres semillas en dos barrios—, con un banco que juega: un guerrero que va a por
 * todo, un paseante que no se deja rodear, uno quieto y otro guerrero. Y se cuenta con la vigilancia de
 * `vigilarLosNpc` (en `liza-de-juguete.ts`), que mira la sala desde fuera, sin ninguna cuenta del cerebro:
 *
 *   · cuántas entidades pasan más de 3 s junto a su blanco, con turno posible, sin anunciar y sin ir a
 *     ninguna parte;
 *   · cuántas pasan más de 5 s desde que nacen sin entrar en el límite de la fase;
 *   · y, con la ciudad abierta (L10), cuántas pasan más de 3 s paradas sin nadie a su alcance y con alguien
 *     a la distancia del olvido: la franja que la primera versión de L10 dejaba sin salida;
 *   · cuántas pasan más de 10 s acechando a su blanco LEJOS de él sin moverse (`TICS_ATASCADA`): en la
 *     Llamada de la ciudad abierta, cuatro Prestados se quedaban 772 tics en el bolsillo de la cabina —entre
 *     su poste, un coche y la fachada, sin llegar a ninguno de sus seis nudos más cercanos— persiguiendo a
 *     su blanco a 85-92 m (ver `nudoParaSalir` en `cerebro.ts`).
 *
 * Las cuatro, a cero. Con el cerebro de la segunda oleada salían 4 y 43 aquí (el paso por el grafo contaba
 * saltos, no metros: se iban por la calle, un centímetro por fuera del borde; y la que llegaba detrás de
 * otra, o a la esquina de un pilar, temblaba a 1,4-1,8 m con turno sin rodear nada).
 *
 * La tercera SÓLO SE CUENTA si algún combate declara olvido: sin olvido no hay franja, y una comprobación que
 * no mira nada se leería como vigilada. En la entrega 1 su productor no lo declara (sus encuentros siguen a
 * la plaza), y la nota lo dice; la franja de su ciudad la juega el bloque 25, con el L10 del diseño.
 */
paso('18 · El Quiebro jugado de verdad: ninguna entidad quieta junto a su blanco con turno, y todas entran en el límite');
/** Ocho, y una más si algún combate de El Quiebro declara olvido (ver arriba): se suma al comprobarla. */
let DEL_QUIEBRO_JUGADO = 8;
if (HAY_QUIEBRO) {
  const productor = (await import(pathToFileURL(RUTA_DEL_PRODUCTOR).href)) as { lizaDelQuiebro: (vista: unknown, codigo: string) => LizaDeclarada | null };
  const robotDeLaMesa = (await import(pathToFileURL(RUTA_DEL_ROBOT).href)) as {
    jugarAlQuiebro: (o: { asientos: number; semilla: number; noches: number; politica: 'gana' | 'pierde' | 'mezcla'; travesuras: boolean }) => { vistas: readonly unknown[] };
  };
  let fases = 0;
  let nacidas = 0;
  let conCelador = 0;
  let conTirador = 0;
  let conOlvido = 0;
  const quietas: string[] = [];
  const fuera: string[] = [];
  const paradas: string[] = [];
  const atascadas: string[] = [];
  let peorQuieta = 0;
  let peorFuera = 0;
  let peorParada = 0;
  let peorAtascada = 0;
  let acercandose = 0;
  let lineasDelQuiebro = 0;
  let rafagasDelQuiebro = 0;
  let dejadasDelQuiebro = 0;
  const lineasMalas: string[] = [];
  for (const codigo of ['K7M2P', 'ABCDE']) {
    for (const asientos of [1, 2, 3, 4]) {
      for (const semilla of [3, 7, 11]) {
        const partida = robotDeLaMesa.jugarAlQuiebro({ asientos, semilla, noches: 2, politica: 'gana', travesuras: false });
        const vistas = new Map<string, LizaDeclarada>();
        for (const v of partida.vistas) {
          const l = productor.lizaDelQuiebro(v, codigo);
          if (l !== null && l.fase.modo === 'encuentro' && !vistas.has(l.fase.clave)) vistas.set(l.fase.clave, l);
        }
        for (const [clave, l] of vistas) {
          const ids = idsDe(l);
          const aparatos: Aparato[] = [];
          for (let i = 1; i <= l.asientos.length; i++) {
            const robot = i === 1 ? guerrero(110, ids) : i === 2 ? paseante(semilla * 31 + i, ids) : i === 3 ? quieto : guerrero(90, ids);
            aparatos.push(new Aparato(i, 3000 * i, 20 * i, 60 + 40 * i, (17 * i) % 50, robot));
          }
          const b = new Banco(l, l.fase.semilla, aparatos);
          b.guardarPasos = false;
          for (let i = 1; i <= l.asientos.length; i++) b.conectar(i);
          const v = vigilarLosNpc(l);
          const vl = vigilarLasLineas(l);
          for (let t = 0; t < 1500; t++) {
            const p = b.tic();
            v.mirar(p.sala);
            vl.mirar(p);
            if (p.sala.encuentro !== null && p.sala.encuentro.resultado !== null) break;
          }
          const r = v.resumen();
          const rl = vl.resumen();
          lineasDelQuiebro += rl.lineas;
          rafagasDelQuiebro += rl.rafagas;
          dejadasDelQuiebro += rl.dejadas;
          for (const x of rl.malas) lineasMalas.push(`${codigo} ${String(asientos)}a s${String(semilla)} ${clave}: ${x}`);
          fases++;
          nacidas += r.nacidas;
          if (l.fase.encuentro?.grupos.some((g) => g.clase === 2) === true) conCelador++;
          if (l.fase.encuentro?.grupos.some((g) => g.clase === 3) === true) conTirador++;
          if (l.fase.encuentro !== null && olvidoDelEncuentro(l.fase.encuentro) !== null) conOlvido++;
          if (r.peorQuieta > peorQuieta) peorQuieta = r.peorQuieta;
          if (r.peorFuera > peorFuera) peorFuera = r.peorFuera;
          if (r.peorParada > peorParada) peorParada = r.peorParada;
          if (r.peorAtascada > peorAtascada) peorAtascada = r.peorAtascada;
          acercandose += r.acercandose;
          for (const x of r.quietas) quietas.push(`${codigo} ${String(asientos)}a s${String(semilla)} ${clave}: ${x}`);
          for (const x of r.fuera) fuera.push(`${codigo} ${String(asientos)}a s${String(semilla)} ${clave}: ${x}`);
          for (const x of r.paradas) paradas.push(`${codigo} ${String(asientos)}a s${String(semilla)} ${clave}: ${x}`);
          for (const x of r.atascadas) atascadas.push(`${codigo} ${String(asientos)}a s${String(semilla)} ${clave}: ${x}`);
        }
      }
    }
  }
  nota(
    `${String(fases)} combates de El Quiebro (${String(conCelador)} con Celadores, ${String(conTirador)} con tiradores), ${String(nacidas)} entidades nacidas; ` +
      `la racha quieta más larga ${String(peorQuieta)} tics (tope ${String(TICS_QUIETA)}), lo más que tardó una en entrar ${String(peorFuera)} tics (tope ${String(TICS_PARA_ENTRAR)})`,
  );
  comprobar('se jugaron los combates de verdad: noches 1 y 2, con Celadores y con tiradores', fases >= 180 && conCelador >= 60 && conTirador >= 30 && nacidas >= 1800, { fases, conCelador, conTirador, nacidas });
  comprobar('ninguna entidad pasa más de 3 s junto a su blanco, con turno posible, sin anunciar y sin ir a ninguna parte', quietas.length === 0, quietas.slice(0, 6));
  comprobar('ninguna entidad pasa más de 5 s desde que nace sin entrar en el límite de la fase', fuera.length === 0, fuera.slice(0, 6));
  nota(`la racha más larga acechando a su blanco lejos de él sin moverse: ${String(peorAtascada)} tics (tope ${String(TICS_ATASCADA)})`);
  comprobar(
    'ninguna entidad pasa más de 10 s acechando a su blanco lejos de él sin moverse: la que no llega en recta a ningún nudo cercano (el bolsillo de la cabina) busca uno más lejos',
    atascadas.length === 0,
    atascadas.slice(0, 6),
  );
  if (conOlvido > 0) {
    nota(
      `la franja entre el alcance y el olvido (L10): ${String(conOlvido)} de ${String(fases)} combates con olvido, ` +
        `${String(acercandose)} tics de entidades acercándose sin blanco, la racha parada más larga ${String(peorParada)} tics (tope ${String(TICS_QUIETA)})`,
    );
    DEL_QUIEBRO_JUGADO++;
    comprobar(
      'ninguna entidad pasa más de 3 s parada sin nadie a su alcance y con alguien a la distancia del olvido (L10): la que se queda sin blanco acompañada se acerca',
      paradas.length === 0,
      paradas.slice(0, 6),
    );
  } else {
    nota(`la franja entre el alcance y el olvido (L10): ninguno de los ${String(fases)} combates declara olvido, así que aquí no hay franja que vigilar (la juega el bloque 25)`);
  }
  nota(`líneas de apuntado de sus tiradores: ${String(lineasDelQuiebro)} abiertas, ${String(rafagasDelQuiebro)} ráfagas, ${String(dejadasDelQuiebro)} dejadas sin disparar`);
  comprobar(
    'con El Quiebro, cada ráfaga de sus tiradores sale con su línea de apuntado, en el instante en que la línea se fija, y ninguna línea se queda colgada',
    lineasDelQuiebro >= 200 && rafagasDelQuiebro >= 150 && lineasMalas.length === 0,
    { lineasDelQuiebro, rafagasDelQuiebro, dejadasDelQuiebro, malas: lineasMalas.slice(0, 6) },
  );

  /*
   * LA RÉPLICA DE EL QUIEBRO TRAS UN QUIEBRO DE 3,5 M. La Réplica es de tres tics e imparable; tras el
   * quiebro de lado el que falló queda clavado a unos 3,6 m, fuera de su alcance (1,1 + 1,2): sin avance
   * salía `fallada` siempre (lo vio el frente del cliente jugando). Con el banco quebrando de verdad (3,5 m
   * de lado) y replicando en el Remanso contra quien falló, con 100 y 250 ms de ida y vuelta.
   */
  const partida1 = robotDeLaMesa.jugarAlQuiebro({ asientos: 1, semilla: 7, noches: 1, politica: 'gana', travesuras: false });
  let oleada1: LizaDeclarada | null = null;
  for (const v of partida1.vistas) {
    const l = productor.lizaDelQuiebro(v, 'K7M2P');
    if (l !== null && l.fase.modo === 'encuentro' && oleada1 === null) oleada1 = l;
  }
  const replicasDelQuiebro = (rtt: number): { lanzadas: number; dan: number; otras: string[] } => {
    if (oleada1 === null) return { lanzadas: 0, dan: 0, otras: ['sin oleada'] };
    const ids = idsDe(oleada1);
    const b = bancoDeUno(oleada1, new Aparato(1, 6000, 0, rtt, 17, lector(100, { replica: true, ids })), oleada1.fase.semilla);
    b.correr(900);
    const lanzadas = new Set<number>();
    for (const p of b.pasos) for (const x of p.sucesos) if (x.para === 1 && x.suceso.e === 'anuncio' && x.suceso.de === 1 && x.suceso.acc === ids.replica) lanzadas.add(x.suceso.id);
    let dan = 0;
    const otras: string[] = [];
    for (const x of sucesosDe(b, 'resuelve')) {
      if (!lanzadas.has(x.s.id)) continue;
      if (x.s.r === RESULTADO.da) dan++;
      else otras.push(NOMBRE_DEL_RESULTADO[x.s.r] ?? String(x.s.r));
    }
    return { lanzadas: lanzadas.size, dan, otras };
  };
  const q100 = replicasDelQuiebro(100);
  const q250 = replicasDelQuiebro(250);
  comprobar(
    'con los números de El Quiebro, la Réplica tras un quiebro de lado de 3,5 m da siempre contra quien quedó clavado (100 y 250 ms de ida y vuelta)',
    q100.lanzadas >= 2 && q250.lanzadas >= 2 && q100.otras.length === 0 && q250.otras.length === 0,
    { q100, q250 },
  );

  /*
   * SIN BLANCO, TAMBIÉN ENTRAN (la revisión del pulido). Los robots de arriba casi nunca mueren, y así no se
   * veía lo que pasaba sin nadie a quien perseguir: las que nacían mientras el único asiento estaba caído,
   * esperando volver o ausente se quedaban en la boca de la calle —veinte más de cinco segundos, la peor
   * quince—. Aquí los asientos no esquivan (caen) y uno se calla desde el principio (ausente).
   */
  const fueraSinBlanco: string[] = [];
  let peorSinBlanco = 0;
  let nacidasSinBlanco = 0;
  let ticsSinBlanco = 0;
  for (const codigo of ['K7M2P', 'ZX9QW']) {
    for (const asientos of [1, 2]) {
      for (const semilla of [3, 11]) {
        const partida = robotDeLaMesa.jugarAlQuiebro({ asientos, semilla, noches: 2, politica: 'gana', travesuras: false });
        const vistas = new Map<string, LizaDeclarada>();
        for (const v of partida.vistas) {
          const l = productor.lizaDelQuiebro(v, codigo);
          if (l !== null && l.fase.modo === 'encuentro' && !vistas.has(l.fase.clave)) vistas.set(l.fase.clave, l);
        }
        for (const [clave, l] of vistas) {
          const aparatos: Aparato[] = [];
          for (let i = 1; i <= l.asientos.length; i++) {
            const ap = new Aparato(i, 3000 * i, 20 * i, 60 + 40 * i, (17 * i) % 50, quieto);
            if (i === 2) ap.mudo = true;
            aparatos.push(ap);
          }
          const b = new Banco(l, l.fase.semilla, aparatos);
          b.guardarPasos = false;
          for (let i = 1; i <= l.asientos.length; i++) b.conectar(i);
          const v = vigilarLosNpc(l);
          for (let t = 0; t < 1500; t++) {
            const p = b.tic();
            v.mirar(p.sala);
            let alguno = false;
            for (const a of p.sala.asientos) {
              const e = a.estado;
              const est = e !== null && p.sala.tic >= e.desdeTic && p.sala.tic < e.hastaTic ? e.estado : 0;
              if (a.conCuerpo && a.vida > 0 && est !== l.presencia.estadoAusente) alguno = true;
            }
            if (!alguno) ticsSinBlanco++;
            if (p.sala.encuentro !== null && p.sala.encuentro.resultado !== null) break;
          }
          const r = v.resumen();
          nacidasSinBlanco += r.nacidas;
          if (r.peorFuera > peorSinBlanco) peorSinBlanco = r.peorFuera;
          for (const x of r.fuera) fueraSinBlanco.push(`${codigo} ${String(asientos)}a s${String(semilla)} ${clave}: ${x}`);
        }
      }
    }
  }
  nota(`con asientos que caen o se callan: ${String(nacidasSinBlanco)} nacidas, ${String(ticsSinBlanco)} tics sin ningún blanco, lo más que tardó una en entrar ${String(peorSinBlanco)} tics`);
  comprobar(
    'con los asientos caídos, esperando volver o ausentes (nadie a quien perseguir), ninguna entidad pasa tampoco más de 5 s sin entrar en el límite',
    nacidasSinBlanco >= 380 && ticsSinBlanco >= 30000 && fueraSinBlanco.length === 0,
    { nacidasSinBlanco, ticsSinBlanco, peorSinBlanco, fuera: fueraSinBlanco.slice(0, 6) },
  );

  /*
   * EL GOLPE TRAS EL VUELO CONTRA UNA BALA, CON LOS NÚMEROS DE EL QUIEBRO (la revisión del pulido: con 250 ms
   * de ida y vuelta fallaban 48 de 74 con el tirador a menos de 12 m). Un asiento que esquiva una bala de
   * cada tres de sus tiradores y, si sale limpia, vuela hacia el tirador —10 m en 8 tics, sin pasar de su
   * alcance— y hace el avance de la Réplica si aún no llega, como el cliente. Casi todas tienen que dar con
   * 60, 150 y 250 ms: las que no, son de un tirador que se aparta o una esquina en medio.
   *
   * SÓLO CUENTAN LAS QUE TIENEN LA LÍNEA LIBRE hasta el tirador al lanzarse. Con la Acometida de 14 m en 10
   * tics (24-sep) el robot, que nunca anda por su cuenta, se quedaba volando contra la misma esquina en una
   * fase entera (semilla 3, `n2.o3`: 33 de las 34 falladas a 60 ms), y eso mide al robot, no a la sala. Las
   * de tras una esquina se cuentan aparte y se enseñan.
   */
  const acometidas: Record<string, { da: number; otras: number; trasUnaEsquina: number }> = {};
  for (const semilla of [3, 7, 11]) {
    const partida = robotDeLaMesa.jugarAlQuiebro({ asientos: 1, semilla, noches: 2, politica: 'gana', travesuras: false });
    const vistas = new Map<string, LizaDeclarada>();
    for (const v of partida.vistas) {
      const l = productor.lizaDelQuiebro(v, 'K7M2P');
      if (l !== null && l.fase.modo === 'encuentro' && !vistas.has(l.fase.clave)) vistas.set(l.fase.clave, l);
    }
    for (const l0 of vistas.values()) {
      const en = l0.fase.encuentro;
      const g = en === null ? undefined : en.grupos.find((x) => (l0.clases.find((c) => c.id === x.clase)?.proyectil ?? 0) !== 0);
      if (en === null || g === undefined) continue;
      const l: LizaDeclarada = { ...l0, fase: { ...l0.fase, encuentro: { ...en, grupos: [{ ...g, cuantos: g.cuantos.map(() => 2), vivasALaVez: g.vivasALaVez.map(() => 1), desdeTic: 0, cadaTics: 0 }] } } };
      const reglasL = l.asientos[0] as ReglasDeAsiento;
      const cp = reglasL.esquiva.contraProyectil;
      const golpe = reglasL.acciones.find((x) => x.id === cp.accion) as AccionDeclarada;
      const proyectil = l.proyectiles[0] as LizaDeclarada['proyectiles'][number];
      for (const rtt of [60, 150, 250]) {
        const vistasBalas = new Set<number>();
        let leido = 0;
        let tramo: { dx: number; dz: number; quedan: number; luego: boolean; tirador: number } | null = null;
        const robot: Robot = (a, b, reloj) => {
          for (let i = leido; i < a.oido.length; i++) {
            const s = a.oido[i]!.suceso;
            if (s.e === 'bala' && !vistasBalas.has(s.id)) {
              vistasBalas.add(s.id);
              const ang = (s.r / 256) * 2 * Math.PI;
              const along = (a.x / UNO - s.x / 100) * Math.sin(ang) - (a.z / UNO - s.z / 100) * Math.cos(ang);
              if (vistasBalas.size % 3 === 1) a.planear(reglasL.esquiva.accion, s.t + (along / (proyectil.velocidad / UNO)) * 1000 - 90, 0);
            }
            if (s.e === 'impacta' && s.a === 1 && s.r === RESULTADO.limpia) {
              const e = b.sala.entidades.find((q) => q.cerebro.modo !== 'caida' && (l.clases.find((c) => c.id === q.clase)?.proyectil ?? 0) !== 0);
              if (e !== undefined) {
                const lejos = Math.hypot(e.x - a.x, e.z - a.z);
                const d1 = Math.max(0, Math.min(cp.distancia, lejos - golpe.alcance));
                tramo = { dx: ((e.x - a.x) / lejos) * (d1 / cp.tics), dz: ((e.z - a.z) / lejos) * (d1 / cp.tics), quedan: cp.tics, luego: true, tirador: e.numero };
                a.esquivaTics = 0;
              }
            }
          }
          leido = a.oido.length;
          if (tramo === null) return;
          a.esquivaTics = 0;
          if (tramo.quedan > 0) {
            const q = unPaso(b.arena, a, Math.round(tramo.dx), Math.round(tramo.dz), UNO, u(0.35));
            a.x = q.x;
            a.z = q.z;
            tramo.quedan--;
            return;
          }
          const numero = tramo.tirador;
          const e = b.sala.entidades.find((q) => q.numero === numero);
          if (!tramo.luego || e === undefined) {
            tramo = null;
            return;
          }
          const lejos = Math.hypot(e.x - a.x, e.z - a.z);
          const d2 = Math.max(0, Math.min(golpe.avance, lejos - golpe.alcance));
          tramo = { dx: ((e.x - a.x) / lejos) * (d2 / golpe.anuncioTics), dz: ((e.z - a.z) / lejos) * (d2 / golpe.anuncioTics), quedan: d2 > u(0.05) ? golpe.anuncioTics : 0, luego: false, tirador: numero };
        };
        const b = bancoDeUno(l, new Aparato(1, 5000, 0, rtt, 17, robot), l.fase.semilla);
        b.guardarPasos = false;
        const mias = new Set<number>();
        const cuenta = (acometidas[`${String(rtt)} ms`] ??= { da: 0, otras: 0, trasUnaEsquina: 0 });
        for (let t = 0; t < 1500; t++) {
          const p = b.tic();
          for (const x of p.sucesos) {
            if (x.para === 1 && x.suceso.e === 'anuncio' && x.suceso.de === 1 && x.suceso.acc === cp.accion) {
              const s = x.suceso;
              const tirador = b.sala.entidades.find((q) => q.numero === s.a);
              const desde = { x: Math.round((s.x / 100) * UNO), z: Math.round((s.z / 100) * UNO) };
              if (tirador !== undefined && seAndaEnRecta(b.arena, desde, tirador, u(0.35))) mias.add(s.id);
              else cuenta.trasUnaEsquina++;
            }
            if (x.para === 0 && x.suceso.e === 'resuelve' && mias.has(x.suceso.id)) {
              if (x.suceso.r === RESULTADO.da) cuenta.da++;
              else cuenta.otras++;
            }
          }
          if (p.sala.encuentro !== null && p.sala.encuentro.resultado !== null) break;
        }
      }
    }
  }
  const todasLasAcometidas = Object.values(acometidas);
  nota(`golpes tras el vuelo contra bala con los números de El Quiebro: ${JSON.stringify(acometidas)}`);
  comprobar(
    'con los números de El Quiebro, el golpe tras el vuelo contra una bala con la línea libre da en el 95 % o más con 60, 150 y 250 ms de ida y vuelta (y se lanza en todos)',
    todasLasAcometidas.length === 3 && todasLasAcometidas.every((c) => c.da + c.otras >= 40 && c.da * 100 >= (c.da + c.otras) * 95),
    acometidas,
  );
} else nota('todavía no existe el productor de El Quiebro: este bloque no mira nada, y el suelo no cuenta con él');

/* ═══════════════════════════════════════════════════════════════════════════
 * 19 · EL AUSENTE MOMENTÁNEO: LA PESTAÑA OCULTA, LA LLAMADA, EL WEBVIEW EN SEGUNDO PLANO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * El diseño (§5): «pestaña oculta o llamada entrante: a los 2 s sin `aqui` pasa a ausente momentáneo,
 * queda intocable y los NPC lo ignoran». Y el frente del cliente vio caer en la oleada 1 a un jugador con
 * la pestaña oculta. Lo que pasaba: el navegador no PARA una pestaña oculta, la FRENA —los temporizadores
 * a uno por segundo— y el aparato manda cada segundo sus ocho últimos tics de golpe. Nunca estaban dos
 * segundos sin `aqui`, así que nunca quedaba ausente; y si lo quedaba, el primer `aqui` de la ráfaga lo
 * devolvía. Aquí, con el aparato frenado de verdad (`Aparato.dormido`), con el aparato congelado (`mudo`,
 * el WebView parado) y con el que vuelve.
 */
paso('19 · El ausente momentáneo: frenado o congelado, intocable e ignorado; y vuelve al primer aqui vivo, con su intocable');
const DEL_AUSENTE = 5;
{
  const zonaCerca = { id: 9, clase: 9, caja: caja(-1.5, -7, 1.5, -6.5) };
  const pegona = clase({ guardia: null, acciones: [accion(A.golpe, { anuncioTics: 11, enganche: null, alFallar: null, efecto: efecto(3, puesta(E.tocado, 12)) })] });
  const d = juguete({ asientos: 1, clase: pegona, grupos: (n) => [grupoFijo(n, 2, 9, 2)], zonasExtra: [zonaCerca], nace: [{ x: 0, z: -8 }], relojTics: 4000 });
  const estadoDe = (b: Banco, k = b.k): number => {
    const e = b.sala.asientos[0]!.estado;
    return e !== null && k >= e.desdeTic && k < e.hastaTic ? e.estado : 0;
  };

  /* FRENADO: ocho tics de golpe cada veinte, durante treinta segundos. */
  const bF = bancoDeUno(d, new Aparato(1, 4000, 10, 100, 17, quieto));
  bF.correr(80);
  const vidaAntes = bF.sala.asientos[0]!.vida;
  const pegadoAntes = vidaAntes < 100;
  bF.aparato(1).dormido = { cada: 20, deGolpe: TOPE_DE_AQUIS_DE_GOLPE };
  let ausenteEn = -1;
  let seSalio = -1;
  let golpesDentro = 0;
  let anunciosDentro = 0;
  for (let i = 0; i < 600; i++) {
    const p = bF.tic();
    const est = estadoDe(bF);
    if (ausenteEn < 0 && est === E.ausente) ausenteEn = bF.k;
    if (ausenteEn >= 0 && seSalio < 0 && est !== E.ausente) seSalio = bF.k;
    if (ausenteEn >= 0) {
      for (const s of p.sucesos) if (s.suceso.e === 'resuelve' && s.suceso.r === RESULTADO.da && s.suceso.dano > 0) golpesDentro++;
      for (const an of p.sala.anuncios) if (an.a === 1 && an.lanzadoEnTic === bF.k) anunciosDentro++;
    }
  }
  const vidaDespues = bF.sala.asientos[0]!.vida;
  comprobar(
    'con la pestaña FRENADA (ocho aqui de golpe cada segundo) pasa al ausente en tres segundos como mucho y no sale mientras siga frenada',
    ausenteEn > 0 && ausenteEn - 80 <= 60 && seSalio < 0,
    { ausenteEn, seSalio },
  );
  comprobar(
    'y mientras está ausente nadie le lanza nada ni le quita vida (antes sí le pegaban)',
    pegadoAntes && anunciosDentro === 0 && golpesDentro === 0 && vidaDespues > 0,
    { vidaAntes, vidaDespues, anunciosDentro, golpesDentro },
  );

  /* VUELVE: la pestaña vuelve a estar a la vista, y al primer aqui VIVO sale del ausente con su intocable. */
  bF.aparato(1).dormido = null;
  let vuelveEn = -1;
  let vuelveCon: { est: number; into: number } | null = null;
  for (let i = 0; i < 80 && vuelveEn < 0; i++) {
    const p = bF.tic();
    if (estadoDe(bF) !== E.ausente) {
      vuelveEn = bF.k;
      const e = bF.sala.asientos[0]!.estado;
      vuelveCon = e === null ? { est: 0, into: 0 } : { est: e.estado, into: e.intocableHastaTic - bF.k };
      void p;
    }
  }
  const reaparece = d.equipo.reaparicion.puesta;
  comprobar(
    'al volver a la vista sale del ausente en un segundo como mucho, y con el intocable de quien reaparece',
    vuelveEn > 0 && vuelveEn - (80 + 600) <= 20 && vuelveCon !== null && vuelveCon.est === reaparece.estado && vuelveCon.into > 0,
    { vuelveEn, vuelveCon },
  );

  /* CONGELADO: el WebView en segundo plano no manda nada. Lo que tenía anunciado contra él se corta. */
  const bC = bancoDeUno(d, new Aparato(1, 4000, 10, 100, 17, quieto));
  bC.correr(80);
  bC.aparato(1).mudo = true;
  const ids = new Set<number>();
  let cortadas = 0;
  let otras = 0;
  let ausenteC = -1;
  for (let i = 0; i < 120; i++) {
    const antes = bC.sala.anuncios.filter((an) => an.a === 1).map((an) => an.id);
    const p = bC.tic();
    if (ausenteC < 0 && estadoDe(bC) === E.ausente) {
      ausenteC = bC.k;
      for (const id of antes) ids.add(id);
    }
    for (const s of p.sucesos) {
      if (s.suceso.e !== 'resuelve' || !ids.has(s.suceso.id)) continue;
      if (s.suceso.r === RESULTADO.cortada && bC.k === ausenteC) cortadas++;
      else otras++;
    }
  }
  const quedan = bC.sala.anuncios.filter((an) => an.a === 1).length;
  comprobar(
    'congelado (sin ningún aqui), al pasar al ausente los golpes que tenía anunciados se CORTAN en ese mismo tic, sin daño, y no queda ninguno contra él',
    ausenteC > 0 && ids.size > 0 && cortadas === ids.size && otras === 0 && quedan === 0,
    { ausenteC, anunciados: ids.size, cortadas, otras, quedan },
  );
  const turnos = bC.sala.entidades.filter((e) => e.blanco === 1 && e.turno !== 'ninguno').length;
  comprobar('y ninguna entidad se queda con un turno contra el ausente', ausenteC > 0 && turnos === 0, { turnos });
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 20 · LO QUE PIDIÓ EL PULIDO: EL ALCANCE CON AVANCE, LA RESPUESTA DE LA GUARDIA Y EL RELOJ QUE CAMBIA
 * ═══════════════════════════════════════════════════════════════════════════ */
paso('20 · El golpe con avance llega aunque el paso del aparato llegue tarde; la respuesta de la guardia no abre; un reloj nuevo vuelve a armarse');
const DEL_PULIDO = 4;
{
  /*
   * LA RÉPLICA TRAS UNA ESQUIVA QUE DESPLAZA. El bloque 5 la prueba sin desplazarse al esquivar, a
   * propósito; aquí con la esquiva de lado de 3,5 m y la acometida de su avance hecha por el aparato. Su
   * anuncio es de tres tics: los `aqui` de la acometida llegan media ida y vuelta después, y la sala la
   * resolvía con el sitio de ANTES de acometer (`fallada`). Lo que se mira ahora al resolver es lo que aún
   * podía acercarse con su avance (ver `AccionDeclarada.avance`).
   */
  const d = lizaDelDuelo();
  const replicasCon = (rtt: number): { lanzadas: number; dan: number; otras: string[] } => {
    const ap = new Aparato(1, 8000, 0, rtt, 17, lector(100, { replica: true }));
    const b = bancoDeUno(d, ap);
    b.correr(400);
    const ids = new Set<number>();
    for (const p of b.pasos) for (const x of p.sucesos) if (x.para === 1 && x.suceso.e === 'anuncio' && x.suceso.de === 1 && x.suceso.acc === A.replica) ids.add(x.suceso.id);
    let dan = 0;
    const otras: string[] = [];
    for (const x of sucesosDe(b, 'resuelve')) {
      if (!ids.has(x.s.id)) continue;
      if (x.s.r === RESULTADO.da) dan++;
      else otras.push(NOMBRE_DEL_RESULTADO[x.s.r] ?? String(x.s.r));
    }
    return { lanzadas: ids.size, dan, otras };
  };
  const r100 = replicasCon(100);
  const r250 = replicasCon(250);
  comprobar(
    'la réplica pulsada tras una esquiva de lado de 3,5 m, con su acometida, da siempre contra el que quedó clavado (con 100 y con 250 ms de ida y vuelta)',
    r100.lanzadas >= 2 && r250.lanzadas >= 2 && r100.otras.length === 0 && r250.otras.length === 0,
    { r100, r250 },
  );

  /*
   * LA RESPUESTA DE LA GUARDIA NO ABRE. La lanza la guardia al parar, sin turno; el cerebro no abre un
   * ataque con ella aunque vaya la primera de su clase y no lleve `soloEn` (el juguete la escondía con un
   * `soloEn` imposible; El Quiebro no: sólo el orden de su lista la dejaba detrás de la Entrada).
   */
  const base = clase();
  const golpe = base.acciones.find((x) => x.id === A.golpe)!;
  const respuesta = { ...base.acciones.find((x) => x.id === A.respuesta)!, soloEn: [] as number[] };
  const conLaRespuestaPrimero = clase({ acciones: [respuesta, golpe] });
  const dR = juguete({ asientos: 1, clase: conLaRespuestaPrimero, grupos: (n) => [grupoFijo(n, 2, 7, 2)], zonasExtra: [ZONA_DELANTE], nace: [{ x: 0, z: -8 }] });
  const bR = bancoDeUno(dR, new Aparato(1, 8000, 0, 100, 17, quieto));
  bR.correr(400);
  let conRespuesta = 0;
  let conGolpe = 0;
  for (const p of bR.pasos) {
    for (const x of p.sucesos) {
      if (x.para !== 1 || x.suceso.e !== 'anuncio' || x.suceso.de < 16) continue;
      if (x.suceso.acc === A.respuesta) conRespuesta++;
      if (x.suceso.acc === A.golpe) conGolpe++;
    }
  }
  comprobar('el cerebro no abre nunca con la respuesta de su guardia, aunque vaya la primera de su clase: abre con lo demás', conGolpe >= 3 && conRespuesta === 0, { conGolpe, conRespuesta });

  /*
   * UN RELOJ NUEVO EN LA MISMA FASE VUELVE A ARMARSE. La mesa acorta el reloj de una fase sin cambiarla
   * (la Bajada de El Quiebro, cuando ya están todos). Si el reloj viejo ya había vencido —y su veredicto
   * llegó tarde a una mesa que ya lo había cambiado—, el nuevo tiene que vencer igual: si no, la fase se
   * queda colgada hasta el tic perezoso de su plazo.
   */
  const dC = juguete({ asientos: 1, modo: 'calma', nace: [{ x: 0, z: -8 }], reloj: { id: 'r1', duraMs: 1000 } });
  const m = new Mano(dC);
  const relojes: string[] = [];
  for (let i = 0; i < 30; i++) for (const v of m.ir(m.yo.x, m.yo.z).veredictos) if (v.tipo === VEREDICTO_DE_RELOJ) relojes.push((v.carga as { id: string }).id);
  const conOtro = { ...dC, fase: { ...dC.fase, reloj: { id: 'r2', duraMs: 1000 } } };
  const apuntar = (paso: PasoDeLaSala): void => {
    for (const v of paso.veredictos) if (v.tipo === VEREDICTO_DE_RELOJ) relojes.push((v.carga as { id: string }).id);
  };
  apuntar(m.paso([{ tipo: 'vista', declaracion: conOtro }]));
  for (let i = 0; i < 5; i++) apuntar(m.ir(m.yo.x, m.yo.z));
  const igual = { ...conOtro, asientos: conOtro.asientos.slice() };
  apuntar(m.paso([{ tipo: 'vista', declaracion: igual }]));
  for (let i = 0; i < 5; i++) apuntar(m.ir(m.yo.x, m.yo.z));
  comprobar(
    'el reloj vence una vez; con otro id en la misma fase vence el nuevo (una vez), y la misma vista otra vez no lo repite',
    relojes.join(',') === 'r1,r2',
    relojes,
  );
  comprobar('y cambiar el reloj no empieza la fase otra vez', m.sala.fase.clave === dC.fase.clave && m.sala.fase.desdeTic <= 1, m.sala.fase);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 21 · LA LÍNEA DE APUNTADO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * El tirador apunta `apuntarTics` (12 en El Quiebro) antes de cada ráfaga. Eso pasaba en silencio: la
 * primera noticia era la bala, y la línea de apuntado del diseño (§4.6) no tenía de dónde salir en el
 * cliente. Ahora sale `apunta` al empezar —quién, a quién, desde dónde y el instante en que la línea se
 * fija, en el reloj de cada uno—, y `apunta` con `a` 0 si lo deja sin disparar. Ver `SucesoApunta`.
 */
paso('21 · La línea de apuntado: sale al empezar, se fija en la salida de la primera bala, y se deja si no dispara');
const DEL_APUNTADO = 5;
{
  const dA = juguete({ asientos: 1, clase: claseTiradora({ guardia: null }), grupos: (n) => [grupoFijo(n, 1, 8)], zonasExtra: [{ id: 8, clase: 8, caja: caja(-0.2, 1.8, 0.2, 2.2) }], nace: [{ x: 0, z: -8 }] });
  const bA = bancoDeUno(dA, new Aparato(1, 3000, 0, 100, 17, quieto));
  const vA = vigilarLasLineas(dA);
  for (let i = 0; i < 400; i++) vA.mirar(bA.tic());
  const rA = vA.resumen();
  comprobar(
    'contra quien se queda quieto, cada ráfaga del tirador sale con su línea: abierta 12 tics antes y fijada en el instante EXACTO de la primera bala, en el reloj de quien la recibe (y la que no dispara porque cayó, se deja)',
    rA.rafagas >= 3 && rA.lineas === rA.rafagas + rA.dejadas && rA.malas.length === 0,
    rA,
  );

  /* Con 3 s de apuntar, quien calla al ver la línea queda ausente a los 2 s: el tirador lo deja, y lo dice. */
  const pr = dA.proyectiles[0] as LizaDeclarada['proyectiles'][number];
  const dLargo: LizaDeclarada = { ...dA, proyectiles: [{ ...pr, apuntarTics: 60 }] };
  const callarAlVerLaLinea: Robot = (a) => {
    if (a.mudo) return;
    for (const x of a.oido) {
      if (x.suceso.e === 'apunta' && x.suceso.a === 1) {
        a.mudo = true;
        return;
      }
    }
  };
  const bC = bancoDeUno(dLargo, new Aparato(1, 3000, 0, 100, 17, callarAlVerLaLinea));
  const vC = vigilarLasLineas(dLargo);
  for (let i = 0; i < 400; i++) vC.mirar(bC.tic());
  const rC = vC.resumen();
  const lineasC = sucesosDe(bC, 'apunta');
  const propiasC: { k: number; a: number }[] = [];
  for (const p of bC.pasos) for (const x of p.sucesos) if (x.para === 1 && x.suceso.e === 'apunta') propiasC.push({ k: p.sala.tic, a: x.suceso.a });
  const ausenteEn = sucesosDe(bC, 'estado').find((x) => x.s.a === 1 && x.s.est === E.ausente)?.k ?? -1;
  const dejaEn = lineasC.find((x) => x.s.a === 0)?.k ?? -1;
  const abreEn = propiasC[0]?.k ?? -1;
  comprobar(
    'quien se queda ausente mientras le apuntan: la línea se deja (`apunta` con a 0) en cuanto está ausente, antes de fijarse, y no sale ninguna bala',
    abreEn >= 0 && ausenteEn > abreEn && dejaEn === ausenteEn && dejaEn < abreEn + 60 && sucesosDe(bC, 'bala').length === 0 && rC.dejadas === 1 && rC.malas.length === 0,
    { abreEn, ausenteEn, dejaEn, balas: sucesosDe(bC, 'bala').length, rC },
  );
  comprobar('y mientras sigue ausente nadie vuelve a apuntarle', propiasC.length === 1, propiasC);

  /* Quien reconecta con la línea en el aire la recibe en su puesta al día, en su reloj nuevo. */
  const bP = bancoDeUno(dA, new Aparato(1, 3000, 0, 100, 17, quieto));
  while (bP.k < 400 && !bP.sala.entidades.some((e) => e.cerebro.modo === 'apuntar')) bP.tic();
  bP.tic();
  const tirador = bP.sala.entidades.find((e) => e.cerebro.modo === 'apuntar');
  const pP = avanzarLaSala(bP.sala, [{ tipo: 'conexion', asiento: 1, rttMs: 60, desfaseMs: 777777 }]);
  const suyosP = pP.sucesos.filter((x) => x.para === 1).map((x) => x.suceso);
  const lineaP = suyosP.find((x) => x.e === 'apunta');
  const naceP = suyosP.findIndex((x) => x.e === 'nace' && tirador !== undefined && x.id === tirador.numero);
  comprobar(
    'quien reconecta con la línea en el aire la recibe en su puesta al día: detrás del `nace` de quien apunta, a su blanco y fijada en su reloj NUEVO',
    tirador !== undefined &&
      lineaP !== undefined &&
      lineaP.e === 'apunta' &&
      lineaP.de === tirador.numero &&
      lineaP.a === tirador.blanco &&
      lineaP.t === tirador.cerebro.repiensaEnTic * 50 + 777777 &&
      naceP >= 0 &&
      naceP < suyosP.indexOf(lineaP),
    { tirador: tirador === undefined ? null : { n: tirador.numero, blanco: tirador.blanco, fija: tirador.cerebro.repiensaEnTic }, lineaP },
  );
  comprobar('y todo lo que ha salido, las líneas incluidas, lo lee el aparato', todoSeLee(bA.pasos) && todoSeLee(bC.pasos) && todoSeLee([pP]) && propiasC.length >= 1 && lineasC.length >= 1);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 22 · LO QUE ENCONTRÓ LA REVISIÓN DEL PULIDO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La revisión adversaria del pulido (24-sep-2026) encontró seis fallos que la batería no veía. Cinco son
 * de la sala y se miran aquí con la liza de juguete (el sexto, que la tanda de dos motores no jugaba la
 * sala de un juego, es de `verify:determinismo`):
 *   1. Saltándose un `aqui` de cada diez se era intocable a voluntad sin dejar de jugar: el ausente no
 *      bloqueaba nada y la vuelta daba dos segundos de intocable.
 *   2. El golpe tras el vuelo contra una bala fallaba con red lenta: la sala lo lanzaba cuando veía al
 *      asiento a medio vuelo, y lo que le faltaba por volar se le contaba como avance ya hecho.
 *   3. El alcance con avance le daba el avance entero a quien no avanzaba: la entrada desde 7,5 m sin moverse.
 *   4. Sin nadie a quien perseguir, las entidades que nacían fuera del límite se quedaban fuera.
 *   5. Ocultar la pestaña 57 s de cada 58 aguantaba cualquier encuentro en solitario.
 */
paso('22 · La revisión del pulido: el ausente no es ventaja, el vuelo contra bala llega, el avance no se regala y las que nacen sin blanco entran');
const DE_LA_REVISION = 11;
{
  /** Envuelve la E/S del banco: el asiento `n` se salta el `aqui` de cada décimo tic mientras `cuando()`, y lleva su acción al siguiente. */
  const conHuecos = (b: Banco, n: number, cuando: () => boolean): void => {
    const meter = b.meter.bind(b);
    let pendiente: AccionRecibida | null = null;
    b.meter = (llega: number, e: EntradaDeLaSala): void => {
      if (e.tipo === 'aqui' && e.asiento === n) {
        if (cuando() && e.n % 10 === 9) {
          if (e.accion !== null) pendiente = e.accion;
          return;
        }
        if (e.accion === null && pendiente !== null) e = { ...e, accion: pendiente };
        pendiente = null;
      }
      meter(llega, e);
    };
  };
  const estadoDe = (b: Banco, n = 1): number => {
    const e = b.sala.asientos[n - 1]!.estado;
    return e !== null && b.k >= e.desdeTic && b.k < e.hastaTic ? e.estado : 0;
  };

  /*
   * 1a · QUIEN JUEGA NO QUEDA AUSENTE. Un guerrero que se salta un tic de cada diez —no hace nunca una serie
   * viva— pero que anda y pega: la sala tiene que ser LA MISMA, suceso a suceso, que si el ausente no
   * existiera (`ausenteTrasTics` enorme). Con la regla de antes quedaba ausente en cuanto pasaban dos
   * segundos, intocable y pegando.
   */
  const dT = juguete({
    asientos: 1,
    recurso: 50,
    relojTics: 20000,
    grupos: (n) => [{ clase: 1, cuantos: porN(n, () => 200), vivasALaVez: porN(n, () => 3), claseDeZona: 1, desdeTic: 0, cadaTics: 20, eleccion: 'azar' }],
  });
  const jugarConHuecos = (d: LizaDeclarada): { hilo: string; ausentes: number; maxSeguidos: number; anuncios: number } => {
    const b = bancoDeUno(d, new Aparato(1, 4000, 10, 100, 17, guerrero(110)));
    conHuecos(b, 1, () => true);
    b.guardarPasos = false;
    let hilo = '';
    let ausentes = 0;
    let maxSeguidos = 0;
    let anuncios = 0;
    for (let i = 0; i < 800; i++) {
      const p = b.tic();
      hilo = fnv(hilo + salidasDe(p));
      if (estadoDe(b) === E.ausente) ausentes++;
      const seguidos = p.sala.asientos[0]!.aquisSeguidos;
      if (seguidos > maxSeguidos) maxSeguidos = seguidos;
      for (const x of p.sucesos) if (x.para === 1 && x.suceso.e === 'anuncio' && x.suceso.de === 1) anuncios++;
    }
    return { hilo, ausentes, maxSeguidos, anuncios };
  };
  const conElAusente = jugarConHuecos(dT);
  const sinElAusente = jugarConHuecos({ ...dT, presencia: { ...dT.presencia, ausenteTrasTics: 1000000 } });
  comprobar(
    'quien se salta un tic de cada diez (nunca hace una serie viva) pero anda y pega no queda nunca ausente: la sala sale igual, suceso a suceso, que si el ausente no existiera',
    conElAusente.maxSeguidos < AQUIS_PARA_ESTAR && conElAusente.anuncios >= 20 && conElAusente.ausentes === 0 && conElAusente.hilo === sinElAusente.hilo,
    { conElAusente, sinElAusente: sinElAusente.hilo },
  );

  /*
   * 1b · EL AUSENTE NI ANDA NI PEGA, Y SU VUELTA NO SIRVE PARA PEGAR. Quieto y con huecos, queda ausente;
   * después intenta andar y golpear sin hacer serie: nada de eso entra. Al volver (serie viva), su vuelta
   * es corta, y en cuanto golpea se acaba, con su intocable, en ese mismo tic.
   */
  const dA = juguete({ asientos: 1, clase: sacoQuieto(), grupos: (n) => [grupoFijo(n, 1, 7)], zonasExtra: [ZONA_DELANTE], nace: [{ x: 0, z: -8 }] });
  let fase: 'quieto' | 'intenta' | 'vuelve' = 'quieto';
  let ultimoGolpe = -1e9;
  let yaVolvio = false;
  const tramposo: Robot = (a, b, reloj) => {
    const e = b.sala.entidades[0];
    if (fase === 'quieto') return;
    if (fase === 'intenta') {
      a.meta = { x: u(3), z: u(-8) };
      if (e !== undefined && reloj - ultimoGolpe >= 500) {
        a.planear(A.entrada, reloj, e.numero);
        ultimoGolpe = reloj;
      }
      return;
    }
    a.meta = null;
    if (!yaVolvio && b.sala.asientos[0]!.vueltaHastaTic > b.k && e !== undefined) {
      yaVolvio = true;
      a.planear(A.entrada, reloj, e.numero);
    }
  };
  const apA = new Aparato(1, 4000, 0, 100, 17, tramposo);
  const bA = bancoDeUno(dA, apA);
  conHuecos(bA, 1, () => fase !== 'vuelve');
  bA.correr(80);
  const quedoAusente = estadoDe(bA) === E.ausente;
  fase = 'intenta';
  const x0 = bA.sala.asientos[0]!.x;
  const z0 = bA.sala.asientos[0]!.z;
  const vida0 = bA.sala.entidades[0]?.vida ?? -1;
  let suyos = 0;
  for (let i = 0; i < 100; i++) for (const x of bA.tic().sucesos) if (x.para === 1 && x.suceso.e === 'anuncio' && x.suceso.de === 1) suyos++;
  const sigueAusente = estadoDe(bA) === E.ausente;
  const movido = bA.sala.asientos[0]!.x !== x0 || bA.sala.asientos[0]!.z !== z0;
  const vida1 = bA.sala.entidades[0]?.vida ?? -1;
  comprobar(
    'quien se calla sin jugar queda ausente, y ausente no anda ni pega aunque lo intente (sin hacer una serie viva): ni un anuncio suyo, su sitio no se mueve y su blanco no pierde vida',
    quedoAusente && sigueAusente && suyos === 0 && !movido && vida0 > 0 && vida1 === vida0,
    { quedoAusente, sigueAusente, suyos, movido, vida0, vida1 },
  );
  fase = 'vuelve';
  apA.meta = null;
  let vuelta: { k: number; est: number; dura: number; into: number } | null = null;
  let golpe: { k: number; libreEnElTic: boolean; intocable: boolean } | null = null;
  for (let i = 0; i < 40 && golpe === null; i++) {
    const p = bA.tic();
    const a = p.sala.asientos[0]!;
    if (vuelta === null && estadoDe(bA) !== E.ausente && a.estado !== null) {
      vuelta = { k: bA.k, est: a.estado.estado, dura: a.estado.hastaTic - a.estado.desdeTic, into: a.estado.intocableHastaTic - bA.k };
    }
    const lanzado = p.sucesos.some((x) => x.para === 1 && x.suceso.e === 'anuncio' && x.suceso.de === 1);
    if (lanzado) {
      const libre = p.sucesos.some((x) => x.suceso.e === 'estado' && x.suceso.a === 1 && x.suceso.est === 0);
      golpe = { k: bA.k, libreEnElTic: libre, intocable: a.estado !== null && bA.k < a.estado.intocableHastaTic && bA.k < a.estado.hastaTic };
    }
  }
  comprobar(
    'vuelve al primer aqui vivo con su vuelta —la puesta de reaparición, medio segundo como mucho— y su primer golpe la acaba en ese mismo tic, con su intocable: intocable y pegando a la vez, nunca',
    vuelta !== null &&
      vuelta.est === dA.equipo.reaparicion.puesta.estado &&
      vuelta.dura <= TICS_DE_LA_VUELTA &&
      vuelta.into > 0 &&
      golpe !== null &&
      golpe.k < vuelta.k + vuelta.dura &&
      golpe.libreEnElTic &&
      !golpe.intocable,
    { vuelta, golpe },
  );

  /*
   * 1d · LO QUE PULSA ESTANDO AUSENTE NO SALE AL VOLVER. A mano, `aqui` a `aqui`: se calla con huecos hasta
   * quedar ausente; después manda su serie, y en el `aqui` de justo antes del que la cierra —aún ausente—
   * pulsa la entrada. No cuenta, ni se guarda: guardada, saldría en el mismo tic en que vuelve, intocable.
   */
  const mD = new Mano(dA);
  for (let i = 0; i < 70; i++) {
    const n = mD.sala.tic + 1;
    if (n % 10 === 9) mD.paso([]);
    else mD.ir(mD.yo.x, mD.yo.z);
  }
  while ((mD.sala.tic + 1) % 10 !== 9) mD.ir(mD.yo.x, mD.yo.z);
  mD.paso([]);
  const ausenteD = mD.yo.estado !== null && mD.yo.estado.estado === E.ausente;
  const sacoD = mD.sala.entidades[0];
  let suyosD = 0;
  let volvioD = false;
  for (let i = 1; i <= AQUIS_PARA_ESTAR + 20; i++) {
    const accion = i === AQUIS_PARA_ESTAR - 1 && sacoD !== undefined ? { id: A.entrada, msDelAparato: (mD.sala.tic + 1) * 50, blanco: sacoD.numero } : null;
    const p = mD.ir(mD.yo.x, mD.yo.z, accion);
    if (i === AQUIS_PARA_ESTAR) volvioD = mD.yo.estado !== null && mD.yo.estado.estado === dA.equipo.reaparicion.puesta.estado;
    for (const x of p.sucesos) if (x.suceso.e === 'anuncio' && x.suceso.de === 1) suyosD++;
  }
  comprobar(
    'lo que pulsa estando ausente —en el aqui de justo antes del que cierra su serie viva— ni cuenta ni se guarda: vuelve con ese aqui y no sale ningún golpe suyo',
    ausenteD && sacoD !== undefined && volvioD && suyosD === 0,
    { ausenteD, volvioD, suyosD },
  );

  /* 1e · Y LA LIZA LO EXIGE: una declaración con un ausente que deja andar, pegar o cancelarse no se acepta. */
  const conOtroAusente = (cambio: Partial<{ bloqueaPaso: boolean; bloqueaAccion: boolean; cancelaCon: number[] }>): string[] =>
    problemasDeLaDeclaracion({ ...dA, estados: dA.estados.map((x) => (x.id === E.ausente ? { ...x, ...cambio } : x)) }).filter((x) => x.startsWith('presencia.estadoAusente'));
  const rechazos = [conOtroAusente({ bloqueaPaso: false }).length, conOtroAusente({ bloqueaAccion: false }).length, conOtroAusente({ cancelaCon: [A.esquiva] }).length, conOtroAusente({}).length];
  comprobar('la Liza no acepta un ausente que deje andar, pegar o cancelarse con una acción (y sí el que no)', rechazos.join(',') === '1,1,1,0', rechazos);

  /*
   * 1c · LO QUE LANZÓ Y NO HA LLEGADO SE CORTA. Con un golpe de tres segundos de anuncio: lo lanza, se calla,
   * y a los dos segundos queda ausente con el golpe en el aire. Sale `cortada` en ese tic, sin daño.
   */
  const dL = { ...dA, asientos: dA.asientos.map((r) => ({ ...r, acciones: r.acciones.map((x) => (x.id === A.entrada ? { ...x, anuncioTics: 60 } : x)) })) };
  let lanzo = false;
  const lanzaYCalla: Robot = (a, b, reloj) => {
    if (lanzo) {
      if (a.planes.length === 0) a.mudo = true;
      return;
    }
    const e = b.sala.entidades[0];
    if (e !== undefined && e.cerebro.modo !== 'aparecer' && b.k > 20) {
      lanzo = true;
      a.planear(A.entrada, reloj, e.numero);
    }
  };
  const bL = bancoDeUno(dL, new Aparato(1, 4000, 0, 100, 17, lanzaYCalla));
  bL.correr(160);
  const suyoL = bL.pasos.flatMap((p) => p.sala.anuncios.filter((an) => an.de === 1))[0];
  const ausenteL = sucesosDe(bL, 'estado').find((x) => x.s.a === 1 && x.s.est === E.ausente)?.k ?? -1;
  const resueltoL = suyoL === undefined ? undefined : sucesosDe(bL, 'resuelve').find((x) => x.s.id === suyoL.id);
  comprobar(
    'lo que lanzó y no ha llegado cuando queda ausente sale `cortada` en ese mismo tic, sin daño: el ausente no pega',
    suyoL !== undefined && ausenteL > 0 && ausenteL < suyoL.impactoEnTic && resueltoL !== undefined && resueltoL.k === ausenteL && resueltoL.s.r === RESULTADO.cortada && (bL.sala.entidades[0]?.vida ?? 0) === 200,
    { suyoL: suyoL === undefined ? null : { lanzado: suyoL.lanzadoEnTic, impacto: suyoL.impactoEnTic }, ausenteL, resueltoL },
  );

  /*
   * 5 · EL AUSENTE SE CUENTA ENTERO. Solo, contra entidades que no atacan, con la pestaña oculta 57 s y a
   * la vista 0,7 s, en bucle: con el ausente contado a trozos nunca se «iba» y el encuentro acababa
   * AGUANTADO al vencer su reloj. Ahora, a los `veredictoTrasTics` de ausente EN LA FASE, se fue, y el
   * encuentro se pierde. Quien se oculta treinta segundos una vez y vuelve, no.
   */
  const dV = juguete({ asientos: 1, clase: sacoQuieto(), grupos: (n) => [grupoFijo(n, 1, 7)], zonasExtra: [ZONA_DELANTE], nace: [{ x: 0, z: -8 }], relojTics: 3000 });
  const final = (vaiven: boolean): { resultado: string | null; k: number } => {
    const ap = new Aparato(1, 4000, 0, 100, 17, quieto);
    const b = bancoDeUno(dV, ap);
    b.guardarPasos = false;
    for (let t = 0; t < 3200; t++) {
      ap.mudo = vaiven ? t % 1154 >= 14 : t >= 100 && t < 700;
      const p = b.tic();
      if (p.sala.encuentro !== null && p.sala.encuentro.resultado !== null) return { resultado: p.sala.encuentro.resultado, k: b.k };
    }
    return { resultado: null, k: b.k };
  };
  const conVaiven = final(true);
  const unaVez = final(false);
  comprobar(
    'oculto 57 s y a la vista 0,7 s en bucle, a los 60 s de ausente EN LA FASE se fue: el encuentro en solitario se pierde antes de su reloj, no sale aguantado; oculto 30 s una vez, sigue y lo aguanta',
    conVaiven.resultado === 'perdida' && conVaiven.k < 3000 && unaVez.resultado === 'aguantada',
    { conVaiven, unaVez },
  );

  /*
   * 3 · EL AVANCE NO SE REGALA. La entrada del juguete avanza 2 m: contra un saco a 3,6 m (fuera de 1,1 +
   * 1,2) da si el aparato acomete, y NO si se queda quieto —la sala sólo le cuenta lo que puede ir de camino
   * en los tics que aún no ha visto—. Con la regla de antes, el quieto también daba.
   */
  const dE = juguete({ asientos: 1, clase: sacoQuieto(), grupos: (n) => [grupoFijo(n, 1, 7)], zonasExtra: [{ id: 7, clase: 7, caja: caja(-0.1, -4.5, 0.1, -4.3) }], nace: [{ x: 0, z: -8 }] });
  const entradaDesdeLejos = (acomete: boolean, rtt: number): string => {
    let hecho = false;
    const robot: Robot = (a, b, reloj) => {
      if (!acomete) a.acomete = null;
      const e = b.sala.entidades[0];
      if (!hecho && e !== undefined && e.cerebro.modo !== 'aparecer' && b.k > 20 && a.ultimaFoto.some((t) => t[0] === e.numero)) {
        hecho = true;
        a.planear(A.entrada, reloj, e.numero);
      }
    };
    const b = bancoDeUno(dE, new Aparato(1, 4000, 0, rtt, 17, robot));
    b.correr(80);
    const mia = b.pasos.flatMap((p) => p.sucesos.filter((x) => x.para === 1 && x.suceso.e === 'anuncio' && x.suceso.de === 1))[0];
    const r = mia === undefined || mia.suceso.e !== 'anuncio' ? undefined : sucesosDe(b, 'resuelve').find((x) => x.s.id === (mia.suceso as { id: number }).id);
    return r === undefined ? 'nada' : (NOMBRE_DEL_RESULTADO[r.s.r] ?? String(r.s.r));
  };
  const alcance = { acomete100: entradaDesdeLejos(true, 100), acomete250: entradaDesdeLejos(true, 250), quieto100: entradaDesdeLejos(false, 100), quieto250: entradaDesdeLejos(false, 250) };
  comprobar(
    'la entrada con 2 m de avance contra un saco a 3,6 m da si el aparato acomete y sale `fallada` si se queda quieto, con 100 y 250 ms de ida y vuelta: el avance no se le da a quien no avanza',
    alcance.acomete100 === 'da' && alcance.acomete250 === 'da' && alcance.quieto100 === 'fallada' && alcance.quieto250 === 'fallada',
    alcance,
  );

  /*
   * 2 · EL GOLPE TRAS EL VUELO CONTRA UNA BALA. Un tirador que no se mueve a 10 m y otro a 12,5 m; el
   * aparato esquiva limpio su bala, vuela hacia él 10 m en 8 tics (sin pasar de su alcance) y, si aún no
   * llega, hace el avance de su acción (lo que hace el cliente de El Quiebro). Tiene que dar con 60, 150 y
   * 250 ms de ida y vuelta; y quien no vuela, fallar: la sala no le regala el vuelo.
   */
  const conTirador = (zona: { x0: number; z0: number; x1: number; z1: number }): LizaDeclarada =>
    juguete({ asientos: 1, clase: claseTiradora({ guardia: null, velocidad: 0, vida: 500, acciones: [] }), grupos: (n) => [grupoFijo(n, 1, 8)], zonasExtra: [{ id: 8, clase: 8, caja: zona }], nace: [{ x: 0, z: -8 }] });
  const golpesTrasElVuelo = (d: LizaDeclarada, rtt: number, vuela: boolean): string[] => {
    const cp = (d.asientos[0] as ReglasDeAsiento).esquiva.contraProyectil;
    const golpe = (d.asientos[0] as ReglasDeAsiento).acciones.find((x) => x.id === cp.accion) as AccionDeclarada;
    const esquivadas = new Set<number>();
    let leido = 0;
    let ultimaEsquiva = -1e9;
    let tramo: { dx: number; dz: number; quedan: number; luego: boolean } | null = null;
    const robot: Robot = (a, b, reloj) => {
      /* Entre vuelo y vuelo, vuelve a su sitio: el tirador no dispara a quien tiene encima. */
      a.meta = tramo === null ? { x: 0, z: u(-8) } : null;
      for (let i = leido; i < a.oido.length; i++) {
        const s = a.oido[i]!.suceso;
        if (s.e === 'bala' && !esquivadas.has(s.id)) {
          esquivadas.add(s.id);
          const bx = Math.round((s.x * UNO) / 100);
          const bz = Math.round((s.z * UNO) / 100);
          for (let t = 1; t < 60; t++) {
            const q = sitioDeLaBala(bx, bz, s.r, u(20), t, u(30));
            if (Math.abs(q.x - a.x) < u(0.55) && Math.abs(q.z - a.z) < u(0.55)) {
              const cuando = Math.max(reloj, s.t + t * 50 - 60);
              if (cuando - ultimaEsquiva >= 450) {
                a.planear(A.esquiva, cuando, 0);
                ultimaEsquiva = cuando;
              }
              break;
            }
          }
        }
        if (vuela && s.e === 'impacta' && s.a === 1 && s.r === RESULTADO.limpia) {
          const e = b.sala.entidades[0];
          if (e !== undefined) {
            const lejos = Math.hypot(e.x - a.x, e.z - a.z);
            const d1 = Math.max(0, Math.min(cp.distancia, lejos - golpe.alcance));
            tramo = { dx: ((e.x - a.x) / lejos) * (d1 / cp.tics), dz: ((e.z - a.z) / lejos) * (d1 / cp.tics), quedan: cp.tics, luego: true };
          }
        }
      }
      leido = a.oido.length;
      if (tramo === null) return;
      if (tramo.quedan > 0) {
        const q = unPaso(b.arena, a, Math.round(tramo.dx), Math.round(tramo.dz), UNO, u(0.35));
        a.x = q.x;
        a.z = q.z;
        tramo.quedan--;
        return;
      }
      const e = b.sala.entidades[0];
      if (!tramo.luego || e === undefined) {
        tramo = null;
        return;
      }
      const lejos = Math.hypot(e.x - a.x, e.z - a.z);
      const d2 = Math.max(0, Math.min(golpe.avance, lejos - golpe.alcance));
      tramo = { dx: ((e.x - a.x) / lejos) * (d2 / golpe.anuncioTics), dz: ((e.z - a.z) / lejos) * (d2 / golpe.anuncioTics), quedan: d2 > u(0.05) ? golpe.anuncioTics : 0, luego: false };
    };
    const ap = new Aparato(1, 3000, 0, rtt, 17, robot);
    ap.desplazaAlEsquivar = false;
    const b = bancoDeUno(d, ap);
    b.correr(1200);
    const mias = new Set<number>();
    for (const p of b.pasos) for (const x of p.sucesos) if (x.para === 1 && x.suceso.e === 'anuncio' && x.suceso.de === 1 && x.suceso.acc === cp.accion) mias.add(x.suceso.id);
    return sucesosDe(b, 'resuelve')
      .filter((x) => mias.has(x.s.id))
      .map((x) => NOMBRE_DEL_RESULTADO[x.s.r] ?? String(x.s.r));
  };
  const a10 = conTirador(caja(-0.2, 1.8, 0.2, 2.2));
  const a12 = conTirador(caja(5.8, 2.8, 6.2, 3.2));
  const vuelos: Record<string, string[]> = {};
  for (const rtt of [60, 150, 250]) {
    vuelos[`10m@${String(rtt)}`] = golpesTrasElVuelo(a10, rtt, true);
    vuelos[`12,5m@${String(rtt)}`] = golpesTrasElVuelo(a12, rtt, true);
  }
  const todos = Object.values(vuelos);
  comprobar(
    'tras una limpia contra la bala de un tirador a 10 y a 12,5 m, el golpe tras el vuelo da siempre si el aparato vuela y avanza, con 60, 150 y 250 ms de ida y vuelta',
    todos.every((v) => v.length >= 2 && v.every((r) => r === 'da')),
    vuelos,
  );
  const sinVolar = [...golpesTrasElVuelo(a10, 60, false), ...golpesTrasElVuelo(a10, 250, false)];
  comprobar('y si el aparato no vuela, sale `fallada`: la sala no le da por hecho el vuelo', sinVolar.length >= 2 && sinVolar.every((r) => r === 'fallada'), sinVolar);

  /*
   * 4 · SIN NADIE A QUIEN PERSEGUIR, TAMBIÉN ENTRAN. Un asiento que se calla desde el principio (ausente a
   * los dos segundos: nadie lo persigue) y un límite de 20 × 20 con la zona de salida fuera, justo detrás
   * del muro que lo bordea: las que nacen tienen que entrar igual, rodeando el muro por el grafo. Con el
   * cerebro de antes se quedaban donde nacían; y yendo sólo en recta, contra el muro.
   */
  /* Nacen todas DESPUÉS de que el asiento quede ausente —sin blanco desde el primer tic— y detrás del muro (`lizaSinBlanco`, que juega también la tanda de dos motores). */
  const dF = lizaSinBlanco();
  const apF = new Aparato(1, 4000, 0, 100, 17, quieto);
  apF.mudo = true;
  const bF = bancoDeUno(dF, apF);
  bF.guardarPasos = false;
  const vF = vigilarLosNpc(dF);
  let ausenteF = 0;
  for (let i = 0; i < 400; i++) {
    const p = bF.tic();
    vF.mirar(p.sala);
    if (estadoDe(bF) === E.ausente) ausenteF++;
  }
  const rF = vF.resumen();
  comprobar(
    'con el único asiento ausente (nadie a quien perseguir), las entidades que nacen fuera del límite entran igual en menos de 5 s',
    ausenteF >= 300 && rF.nacidas >= 4 && rF.fuera.length === 0 && rF.peorFuera <= TICS_PARA_ENTRAR,
    { ausenteF, nacidas: rF.nacidas, peorFuera: rF.peorFuera, fuera: rF.fuera.slice(0, 4) },
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 23 · LA LIZA POR DENTRO: ÍNDICES QUE NO CAMBIAN NI UN RESULTADO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * El diseño de la ciudad abierta (§5.4) le pone a la Liza tres índices y una memoria: las losas y los
 * nudos por celdas, los campos de distancias por meta, y la validación del mundo guardada por su
 * identidad. Su contrato es no cambiar NI UN resultado, y aquí se mide contra la fuerza bruta, que es la
 * misma Liza con los índices apagados (`usarLosIndicesDeLaLiza`):
 *
 *   · 100.000 tramos en cada uno de veinte mundos abiertos (la caja y la fracción, empates incluidos);
 *   · los K nudos más cercanos a 50.000 puntos, a una malla barajada y al empate en la raya de una celda;
 *   · lo que falta andando por el grafo, preguntado a los campos (acotados, seguidos y rehechos);
 *   · la misma sala, tic a tic, con y sin índices;
 *   · y la validación: con y sin memoria, las mismas frases, y el mundo revisado UNA vez.
 *
 * ═══ POR QUÉ `createRequire` ═══
 *
 * Con `tsx`, `geometria.ts` importada desde este guion es OTRA copia del módulo que la que carga la sala por
 * dentro, y un interruptor puesto en ésa no apaga nada: la comparación saldría igual porque serían las
 * mismas respuestas. `createRequire` da la copia de la sala. Y las cuentas de cada índice van de suelo: con
 * el interruptor encendido tienen que moverse tantas veces como preguntas hubo, y apagado, ninguna.
 */
paso('23 · La Liza por dentro: índices contra la fuerza bruta, la misma sala tic a tic y el mundo validado una vez');
const POR_DENTRO = 12;
{
  const requerir = createRequire(import.meta.url);
  const GEO = requerir('../../shared/mecanicas/liza/geometria') as typeof import('../../shared/mecanicas/liza/geometria');
  const CER = requerir('../../shared/mecanicas/liza/cerebro') as typeof import('../../shared/mecanicas/liza/cerebro');
  const conIndices = <T>(si: boolean, f: () => T): T => {
    const antes = GEO.usarLosIndicesDeLaLiza(si);
    try {
      return f();
    } finally {
      GEO.usarLosIndicesDeLaLiza(antes);
    }
  };
  const resta = (a: CuentasDeLosIndices, b: CuentasDeLosIndices): CuentasDeLosIndices => ({
    losasPorCeldas: b.losasPorCeldas - a.losasPorCeldas,
    indicesDeLosas: b.indicesDeLosas - a.indicesDeLosas,
    nudosPorCeldas: b.nudosPorCeldas - a.nudosPorCeldas,
    indicesDeNudos: b.indicesDeNudos - a.indicesDeNudos,
    camposAcotados: b.camposAcotados - a.camposAcotados,
    camposReusados: b.camposReusados - a.camposReusados,
    camposSeguidos: b.camposSeguidos - a.camposSeguidos,
    camposRehechos: b.camposRehechos - a.camposRehechos,
  });
  const nada = (c: CuentasDeLosIndices): boolean => c.losasPorCeldas === 0 && c.nudosPorCeldas === 0 && c.camposAcotados === 0 && c.camposReusados === 0 && c.camposSeguidos === 0 && c.camposRehechos === 0;
  const TOPE = GEO.TOPE_DE_LA_LIZA - 1;
  const acotar = (v: number): number => (v > TOPE ? TOPE : v < -TOPE ? -TOPE : v);

  /* ── Los veinte mundos abiertos ─────────────────────────────────────────── */
  const DESPLAZAMIENTOS = [
    [0, 0], [-350, 340], [350, -350], [-200, -350], [340, 200], [0, -350], [-350, 0], [120, 340], [-60, -120], [350, 350],
    [-350, -350], [200, -60], [10, 20], [-340, 150], [260, -280], [-120, 280], [330, -10], [-280, -200], [70, -330], [-10, -10],
  ];
  const mundos: { d: LizaDeclarada; cuerpos: Int32Array; x0: number; z0: number }[] = [];
  for (let i = 0; i < DESPLAZAMIENTOS.length; i++) {
    const [dx, dz] = DESPLAZAMIENTOS[i] as number[];
    const d = lizaAbierta({ semilla: 101 + i, desplazamiento: { x: dx as number, z: dz as number }, repartidos: i % 2 === 1 });
    mundos.push({ d, cuerpos: arenaDeLaLiza(d).cuerpos, x0: u(-150 + (dx as number)), z0: u(-150 + (dz as number)) });
  }
  let minCajas = Infinity;
  let minNudos = Infinity;
  let extremo = 0;
  for (const m of mundos) {
    minCajas = Math.min(minCajas, m.d.mundo.suelo.cuerpos.length);
    minNudos = Math.min(minNudos, m.d.mundo.grafo.nudos.length);
    for (let i = 0; i < m.cuerpos.length; i++) extremo = Math.max(extremo, Math.abs(m.cuerpos[i] as number));
  }
  comprobar(
    `los ${mundos.length} mundos abiertos se declaran bien y encienden los índices (${GEO.CAJAS_PARA_INDEXAR} cajas y ${CER.NUDOS_PARA_INDEXAR} nudos o más), con cajas a ±500 unidades`,
    mundos.length === 20 && minCajas >= GEO.CAJAS_PARA_INDEXAR && minNudos >= CER.NUDOS_PARA_INDEXAR && extremo >= u(495),
    { minCajas, minNudos, extremo: extremo / UNO },
  );

  /* ── Las losas: 100.000 tramos por mundo ────────────────────────────────── */
  const TRAMOS = 100000;
  const RADIOS = [0, u(0.2), u(0.35), u(0.35), u(1), u(3), u(20)];
  const LARGOS = [1, 12, 30, 60, 160];
  const resolver = (cuerpos: Int32Array, t: Float64Array): Float64Array => {
    const r = new Float64Array((t.length / 5) * 2);
    for (let i = 0, j = 0; i < t.length; i += 5, j += 2) {
      const c = GEO.primeraLosa(cuerpos, t[i] as number, t[i + 1] as number, t[i + 2] as number, t[i + 3] as number, t[i + 4] as number);
      r[j] = c === null ? -1 : c.caja;
      r[j + 1] = c === null ? -1 : c.fraccion;
    }
    return r;
  };
  let distintasL = 0;
  let chocanL = 0;
  let empates = 0;
  let empatesMirados = 0;
  let menosParejas = Infinity;
  const ejemplosL: unknown[] = [];
  let msBruta = 0;
  let msCeldas = 0;
  const antesDeLasLosas = GEO.cuentasDeLosIndices();
  let apagadasL: CuentasDeLosIndices | null = null;
  for (let w = 0; w < mundos.length; w++) {
    const { cuerpos, x0, z0 } = mundos[w] as (typeof mundos)[number];
    const azar = new AzarDeJuguete(7000 + w);
    const t = new Float64Array(TRAMOS * 5);
    const cajas = cuerpos.length / 4;
    const deEmpate: number[] = [];
    /*
     * Las parejas de EMPATE: dos cajas con el mismo canto de entrada (`x0`, o `z0`) cuyas franjas ensanchadas
     * por un cuerpo se solapan (los bolardos de una valla). Un tramo por el solape que cruza ese canto entra
     * en las dos en la misma fracción, y tiene que ganar la de índice menor.
     */
    const RADIO_DEL_EMPATE = u(0.35);
    const parejas: { enX: boolean; canto: number; medio: number }[] = [];
    for (let a = 0; a < cuerpos.length; a += 4) {
      for (let b = a + 4; b < cuerpos.length; b += 4) {
        for (let eje = 0; eje < 2; eje++) {
          if (cuerpos[a + eje] !== cuerpos[b + eje]) continue;
          const otro = 1 - eje;
          const lo = Math.max(cuerpos[a + otro] as number, cuerpos[b + otro] as number) - RADIO_DEL_EMPATE;
          const hi = Math.min(cuerpos[a + otro + 2] as number, cuerpos[b + otro + 2] as number) + RADIO_DEL_EMPATE;
          const medio = Math.floor((lo + hi) / 2);
          if (lo < medio && medio < hi) parejas.push({ enX: eje === 0, canto: cuerpos[a + eje] as number, medio });
        }
      }
    }
    menosParejas = Math.min(menosParejas, parejas.length);
    for (let i = 0; i < TRAMOS; i++) {
      const familia = azar.entre(100);
      let ax: number;
      let az: number;
      let bx: number;
      let bz: number;
      let radio = RADIOS[azar.entre(RADIOS.length)] as number;
      if (familia < 30) {
        ax = x0 - u(10) + azar.entre(u(320) >>> 4) * 16;
        az = z0 - u(10) + azar.entre(u(320) >>> 4) * 16;
        const l = LARGOS[azar.entre(LARGOS.length)] as number;
        bx = ax + u(azar.entre(2 * l * 100 + 1) / 100 - l);
        bz = az + u(azar.entre(2 * l * 100 + 1) / 100 - l);
      } else if (familia < 50) {
        const e = u((EJES_DEL_MUNDO_ABIERTO[azar.entre(EJES_DEL_MUNDO_ABIERTO.length)] as number) + 150) + (azar.entre(121) - 60) * 6554;
        const s = azar.entre(u(300) >>> 4) * 16;
        const l = u(azar.entre(1201) / 10 - 60);
        if (azar.cien(50)) {
          ax = x0 + s;
          bx = ax + l;
          az = z0 + e;
          bz = az;
        } else {
          az = z0 + s;
          bz = az + l;
          ax = x0 + e;
          bx = ax;
        }
      } else if (familia < 60) {
        const raya = (v: number): number => Math.floor(v / GEO.CELDA_DEL_INDICE) * GEO.CELDA_DEL_INDICE + (azar.entre(3) - 1);
        ax = raya(x0 + azar.entre(u(300) >>> 4) * 16);
        az = raya(z0 + azar.entre(u(300) >>> 4) * 16);
        bx = azar.cien(50) ? raya(ax + u(azar.entre(61) - 30)) : ax + u(azar.entre(61) - 30);
        bz = azar.cien(50) ? raya(az + u(azar.entre(61) - 30)) : az;
      } else if (familia < 77) {
        const c = azar.entre(cajas) * 4;
        const cx0 = cuerpos[c] as number;
        const cz0 = cuerpos[c + 1] as number;
        const cx1 = cuerpos[c + 2] as number;
        const cz1 = cuerpos[c + 3] as number;
        const donde = azar.entre(4);
        ax = donde === 0 ? cx0 : donde === 1 ? Math.floor((cx0 + cx1) / 2) : donde === 2 ? cx0 - 1 : cx1;
        az = donde === 0 ? cz0 : Math.floor((cz0 + cz1) / 2);
        if (familia < 72) {
          bx = ax + u(azar.entre(61) - 30);
          bz = az + u(azar.entre(61) - 30);
        } else {
          bx = ax;
          bz = az;
        }
      } else {
        /* El empate: por el solape de una pareja, cruzando su canto común. */
        const par = parejas[azar.entre(parejas.length)] as (typeof parejas)[number];
        radio = RADIO_DEL_EMPATE;
        const l = u(1 + azar.entre(20));
        if (par.enX) {
          az = par.medio;
          bz = az;
          ax = par.canto - l;
          bx = par.canto + l;
        } else {
          ax = par.medio;
          bx = ax;
          az = par.canto - l;
          bz = par.canto + l;
        }
        if (deEmpate.length < 2000) deEmpate.push(i);
      }
      t[i * 5] = acotar(ax);
      t[i * 5 + 1] = acotar(az);
      t[i * 5 + 2] = acotar(bx);
      t[i * 5 + 3] = acotar(bz);
      t[i * 5 + 4] = radio;
    }
    let t0 = performance.now();
    const bruta = conIndices(false, () => resolver(cuerpos, t));
    msBruta += performance.now() - t0;
    if (w === 0) apagadasL = resta(antesDeLasLosas, GEO.cuentasDeLosIndices());
    t0 = performance.now();
    const celdas = conIndices(true, () => resolver(cuerpos, t));
    msCeldas += performance.now() - t0;
    for (let j = 0; j < bruta.length; j += 2) {
      if (bruta[j] !== -1) chocanL++;
      if (bruta[j] !== celdas[j] || bruta[j + 1] !== celdas[j + 1]) {
        distintasL++;
        if (ejemplosL.length < 4) ejemplosL.push({ mundo: w, tramo: Array.from(t.subarray((j / 2) * 5, (j / 2) * 5 + 5)), bruta: [bruta[j], bruta[j + 1]], celdas: [celdas[j], celdas[j + 1]] });
      }
    }
    /* Los empates de verdad: cuántas cajas entran en la fracción de la primera (sólo las que pasan el descarte). */
    for (const i of deEmpate) {
      const f = bruta[i * 2 + 1] as number;
      if (f < 0) continue;
      empatesMirados++;
      const ax = t[i * 5] as number;
      const az = t[i * 5 + 1] as number;
      const bx = t[i * 5 + 2] as number;
      const bz = t[i * 5 + 3] as number;
      const r = t[i * 5 + 4] as number;
      let iguales = 0;
      for (let c = 0; c < cuerpos.length; c += 4) {
        if ((cuerpos[c] as number) - r >= Math.max(ax, bx) || (cuerpos[c + 2] as number) + r <= Math.min(ax, bx)) continue;
        if ((cuerpos[c + 1] as number) - r >= Math.max(az, bz) || (cuerpos[c + 3] as number) + r <= Math.min(az, bz)) continue;
        if (GEO.pruebaDeLosa(ax, az, bx, bz, cuerpos[c] as number, cuerpos[c + 1] as number, cuerpos[c + 2] as number, cuerpos[c + 3] as number, r) === f) iguales++;
      }
      if (iguales >= 2) empates++;
    }
  }
  const lasLosas = resta(antesDeLasLosas, GEO.cuentasDeLosIndices());
  const preguntasL = TRAMOS * mundos.length;
  nota(
    `losas: ${preguntasL} tramos en ${mundos.length} mundos (${chocanL} chocan; ${empates} empates de verdad en ${empatesMirados} tramos de empate), ` +
      `fuerza bruta ${((msBruta * 1000) / preguntasL).toFixed(2)} µs y por celdas ${((msCeldas * 1000) / preguntasL).toFixed(2)} µs por tramo`,
  );
  comprobar(
    'primeraLosa por celdas da la MISMA caja y la MISMA fracción que la fuerza bruta en 100.000 tramos de cada uno de los 20 mundos (desde dentro, nulos, por las rayas de las celdas y en los empates)',
    distintasL === 0 && chocanL > preguntasL / 10 && chocanL < preguntasL && menosParejas > 0 && empates >= 20000,
    { distintasL, chocanL, empates, empatesMirados, menosParejas, ejemplos: ejemplosL },
  );
  comprobar(
    'y las contestó el índice —cada pregunta con él encendido, una cuenta, y un índice por mundo— y ninguna con él apagado',
    apagadasL !== null && nada(apagadasL) && lasLosas.losasPorCeldas === preguntasL && lasLosas.indicesDeLosas === mundos.length,
    { apagadas: apagadasL, encendidas: lasLosas },
  );

  /* ── Los K nudos más cercanos ───────────────────────────────────────────── */
  let preguntasN = 0;
  let distintasN = 0;
  const ejemplosN: unknown[] = [];
  const antesDeLosNudos = GEO.cuentasDeLosIndices();
  const compararNudos = (nudos: readonly { x: number; z: number }[], x: number, z: number, que: string): void => {
    const a = conIndices(false, () => CER.nudosMasCercanosParaProbar(nudos, x, z)).join(',');
    const b = conIndices(true, () => CER.nudosMasCercanosParaProbar(nudos, x, z)).join(',');
    preguntasN++;
    if (a !== b) {
      distintasN++;
      if (ejemplosN.length < 4) ejemplosN.push({ que, x: x / UNO, z: z / UNO, lista: a, celdas: b });
    }
  };
  for (let w = 0; w < 5; w++) {
    const { d, x0, z0 } = mundos[w] as (typeof mundos)[number];
    const nudos = d.mundo.grafo.nudos;
    const azar = new AzarDeJuguete(9100 + w);
    for (let i = 0; i < 10000; i++) {
      const familia = azar.entre(4);
      if (familia === 0) {
        const n = nudos[azar.entre(nudos.length)] as { x: number; z: number };
        compararNudos(nudos, n.x, n.z, 'en un nudo');
      } else if (familia === 1) {
        const n = nudos[azar.entre(nudos.length)] as { x: number; z: number };
        compararNudos(nudos, n.x + u(2.5), n.z, 'a medio camino entre dos');
      } else if (familia === 2) {
        const x = Math.floor((x0 + azar.entre(u(320) >>> 4) * 16) / GEO.CELDA_DEL_INDICE) * GEO.CELDA_DEL_INDICE;
        compararNudos(nudos, x, z0 + azar.entre(u(300) >>> 4) * 16, 'en una raya');
      } else compararNudos(nudos, x0 - u(20) + azar.entre(u(340) >>> 4) * 16, z0 - u(20) + azar.entre(u(340) >>> 4) * 16, 'donde sea');
    }
  }
  /* La malla barajada: nudos cada 8 (el índice menor puede estar en un anillo de fuera) y puntos cada 4. */
  {
    const azar = new AzarDeJuguete(77);
    const malla: { x: number; z: number }[] = [];
    for (let j = -12; j <= 12; j++) for (let i = -12; i <= 12; i++) malla.push({ x: u(i * 8), z: u(j * 8) });
    for (let i = malla.length - 1; i > 0; i--) {
      const k = azar.entre(i + 1);
      const t = malla[i] as { x: number; z: number };
      malla[i] = malla[k] as { x: number; z: number };
      malla[k] = t;
    }
    for (let j = -26; j <= 26; j++) for (let i = -26; i <= 26; i++) compararNudos(malla, u(i * 4), u(j * 4), 'la malla barajada');
  }
  /*
   * EL EMPATE EN LA RAYA, construido: el punto (11, 8) está a 5 de la raya x = 16, donde empieza la celda de
   * al lado; siete nudos de su celda a 5 justos, y uno a 5 justo EN la raya, con el índice menor. Tiene que
   * salir el primero (el anillo a la misma distancia que el sexto todavía se mira). En los cuatro giros, y
   * con seiscientos nudos lejos para que el índice se encienda.
   */
  for (let giro = 0; giro < 4; giro++) {
    const dibujo = [[16, 8], [6, 8], [11, 3], [11, 13], [14, 4], [14, 12], [15, 5], [15, 11], [40, 40], [-30, 20]];
    const girar = (x: number, z: number): number[] => (giro === 0 ? [x, z] : giro === 1 ? [z, x] : giro === 2 ? [x, 48 - z] : [48 - z, x]);
    const nudos: { x: number; z: number }[] = [];
    for (const [x, z] of dibujo) {
      const [gx, gz] = girar(x as number, z as number);
      nudos.push({ x: u(gx as number), z: u(gz as number) });
    }
    for (let i = 0; i < 600; i++) nudos.push({ x: u(200 + (i % 30) * 2), z: u(200 + Math.floor(i / 30) * 2) });
    const [px, pz] = girar(11, 8);
    compararNudos(nudos, u(px as number), u(pz as number), `el empate en la raya, giro ${String(giro)}`);
  }
  const losNudos = resta(antesDeLosNudos, GEO.cuentasDeLosIndices());
  nota(`nudos: ${preguntasN} preguntas de los ${String(6)} más cercanos, con el índice encendido y apagado`);
  comprobar(
    'los K nudos más cercanos por celdas son los MISMOS y en el mismo orden que en lista: 50.000 puntos de cinco mundos, una malla barajada y el empate en la raya en sus cuatro giros',
    distintasN === 0 && preguntasN === 50000 + 53 * 53 + 4,
    { distintasN, preguntasN, ejemplos: ejemplosN },
  );
  comprobar('y los contestó el índice: una cuenta por pregunta encendida, y ninguna apagada', losNudos.nudosPorCeldas === preguntasN, losNudos);

  /* ── Los campos por meta ────────────────────────────────────────────────── */
  {
    const { d } = mundos[3] as (typeof mundos)[number];
    const nudos = d.mundo.grafo.nudos;
    const N = nudos.length;
    /* Y un nudo suelto, sin aristas: nadie llega a él, y preguntarlo hace completar el campo. */
    const conSuelto: LizaDeclarada = { ...d, mundo: { ...d.mundo, grafo: { nudos: [...nudos, { x: nudos[0]!.x + u(3), z: nudos[0]!.z + u(3) }], aristas: d.mundo.grafo.aristas } } };
    const azar = new AzarDeJuguete(4242);
    const todos: number[] = [];
    for (let i = 0; i <= N; i++) todos.push(i);
    for (let i = todos.length - 1; i > 0; i--) {
      const k = azar.entre(i + 1);
      const t = todos[i] as number;
      todos[i] = todos[k] as number;
      todos[k] = t;
    }
    const cercanos = (m: number): number[] => {
      const c: number[] = [];
      for (let i = 0; i < N; i++) if (Math.abs(nudos[i]!.x - nudos[m]!.x) + Math.abs(nudos[i]!.z - nudos[m]!.z) <= u(40)) c.push(i);
      return c;
    };
    let preguntasC = 0;
    let distintasC = 0;
    const ejemplosC: unknown[] = [];
    const antesDeLosCampos = GEO.cuentasDeLosIndices();
    const compararCampo = (meta: number, leer: readonly number[]): void => {
      const a = conIndices(false, () => CER.faltaPorElGrafoParaProbar(conSuelto, meta, leer));
      const b = conIndices(true, () => CER.faltaPorElGrafoParaProbar(conSuelto, meta, leer));
      preguntasC++;
      for (let i = 0; i < a.length; i++) {
        if (a[i] === b[i]) continue;
        distintasC++;
        if (ejemplosC.length < 4) ejemplosC.push({ meta, nudo: leer[i], entero: a[i], campo: b[i] });
        break;
      }
    };
    let anterior = -1;
    for (let i = 0; i < 60; i++) {
      const m = azar.entre(N);
      compararCampo(m, cercanos(m));
      if (anterior >= 0) compararCampo(anterior, todos);
      compararCampo(m, todos);
      compararCampo(azar.entre(N), todos);
      anterior = m;
    }
    compararCampo(N, todos);
    const losCampos = resta(antesDeLosCampos, GEO.cuentasDeLosIndices());
    nota(`campos: ${preguntasC} metas leídas enteras o en parte; ${JSON.stringify(losCampos)}`);
    comprobar(
      'lo que falta andando hasta cada meta, preguntado a los campos guardados, es EXACTAMENTE lo del Dijkstra entero: dentro de la cota, fuera de ella y hasta un nudo al que no se llega',
      distintasC === 0 && preguntasC === 60 * 4 - 1 + 1,
      { distintasC, preguntasC, ejemplos: ejemplosC },
    );
    comprobar(
      'y los campos se hicieron acotados, se sacaron de la memoria, se completaron siguiendo su montículo y rehaciéndolo',
      losCampos.camposAcotados > 60 && losCampos.camposReusados > 60 && losCampos.camposSeguidos > 30 && losCampos.camposRehechos > 30,
      losCampos,
    );
  }

  /* ── La misma sala, tic a tic, con y sin los índices ───────────────────── */
  {
    const dA = lizaAbierta({ semilla: 7, repartidos: true });
    const ids = idsDe(dA);
    const aparatos: Aparato[] = [];
    for (let i = 1; i <= 6; i++) aparatos.push(new Aparato(i, 2000 * i, 15 * i, 50 + 35 * i, (11 * i) % 50, i % 2 === 0 ? paseante(31 * i + 5, ids, 130) : guerrero(90 + 10 * i, ids)));
    const bA = new Banco(dA, 777, aparatos);
    bA.guardarPasos = false;
    for (let i = 1; i <= 6; i++) bA.conectar(i);
    const TICS = 1200;
    const huellaDelEstado = (s: EstadoDeLaSala): string => fnv(canonico({ ...s, declaracion: null, arena: null }));
    const estados: string[] = [];
    const salidas: string[] = [];
    let anuncios = 0;
    let balas = 0;
    let nacidas = 0;
    const antesDelBanco = GEO.cuentasDeLosIndices();
    for (let k = 0; k < TICS; k++) {
      const p = bA.tic();
      estados.push(huellaDelEstado(p.sala));
      salidas.push(fnv(salidasDe(p)));
      for (const x of p.sucesos) {
        if (x.para === 1 && x.suceso.e === 'anuncio') anuncios++;
        else if (x.para === 1 && x.suceso.e === 'bala') balas++;
        else if (x.para === 0 && x.suceso.e === 'nace') nacidas++;
      }
    }
    const delBanco = resta(antesDelBanco, GEO.cuentasDeLosIndices());
    const reproducir = (indices: boolean): { malos: number; primera: number; ms: number; cuentas: CuentasDeLosIndices } => {
      const antes = GEO.cuentasDeLosIndices();
      let malos = 0;
      let primera = -1;
      let ms = 0;
      conIndices(indices, () => {
        let sala = salaNueva(dA, 777);
        for (let k = 0; k < TICS; k++) {
          const t0 = performance.now();
          const p = avanzarLaSala(sala, bA.grabadas[k] as EntradaDeLaSala[]);
          ms += performance.now() - t0;
          sala = p.sala;
          if (huellaDelEstado(p.sala) !== estados[k] || fnv(salidasDe(p)) !== salidas[k]) {
            malos++;
            if (primera < 0) primera = k;
          }
        }
      });
      return { malos, primera, ms, cuentas: resta(antes, GEO.cuentasDeLosIndices()) };
    };
    const apagados = reproducir(false);
    const encendidos = reproducir(true);
    nota(
      `la sala abierta, ${TICS} tics con seis asientos repartidos: ${anuncios} anuncios y ${balas} balas al asiento 1, ${nacidas} nacidas; ` +
        `sin índices ${((apagados.ms / TICS) * 1000).toFixed(0)} µs por tic, con índices ${((encendidos.ms / TICS) * 1000).toFixed(0)} µs`,
    );
    comprobar(
      'la MISMA sala tic a tic —cada estado y todo lo que sale— jugada con los índices, reproducida sin ellos y otra vez con ellos, en una ciudad de juguete con los asientos repartidos',
      apagados.malos === 0 && encendidos.malos === 0 && estados.length === TICS,
      { apagados: { malos: apagados.malos, primera: apagados.primera }, encendidos: { malos: encendidos.malos, primera: encendidos.primera } },
    );
    comprobar(
      'y se jugó de verdad y por los índices: golpes, balas y entidades que nacen; losas y nudos por celdas, y campos acotados, reusados y completados; y reproducida sin índices, ninguno',
      anuncios >= 20 &&
        balas >= 50 &&
        nacidas >= 15 &&
        delBanco.losasPorCeldas > 0 &&
        delBanco.nudosPorCeldas > 0 &&
        delBanco.camposAcotados > 0 &&
        delBanco.camposReusados > 0 &&
        delBanco.camposSeguidos + delBanco.camposRehechos > 0 &&
        nada(apagados.cuentas) &&
        encendidos.cuentas.losasPorCeldas === delBanco.losasPorCeldas,
      { anuncios, balas, nacidas, delBanco, apagados: apagados.cuentas, encendidos: encendidos.cuentas },
    );
  }

  /* ── La validación del mundo, una vez, y la misma con y sin memoria ──────── */
  {
    const dV = lizaAbierta({ semilla: 11 });
    problemasDeLaDeclaracion(dV);
    const v0 = validacionesDelMundo();
    let enLosVotos = 0;
    const tVoto: number[] = [];
    for (let i = 0; i < 30; i++) {
      const voto: LizaDeclarada = { ...dV, fase: { ...dV.fase, semilla: i + 1 }, asientos: dV.asientos.slice() };
      const t0 = performance.now();
      enLosVotos += problemasDeLaDeclaracion(voto).length;
      tVoto.push(performance.now() - t0);
    }
    const v1 = validacionesDelMundo();
    const t0 = performance.now();
    const deOtroMundo = problemasDeLaDeclaracion({ ...dV, mundo: { ...dV.mundo } });
    const tNoche = performance.now() - t0;
    const v2 = validacionesDelMundo();
    tVoto.sort((a, b) => a - b);
    nota(`validar la liza abierta: una vez por mundo ${tNoche.toFixed(2)} ms; por voto, mediana ${(tVoto[15] as number).toFixed(2)} ms y peor ${(tVoto[29] as number).toFixed(2)} ms`);
    comprobar(
      'treinta declaraciones nuevas con el MISMO mundo no lo revisan otra vez (0 revisiones), y un mundo nuevo igual se revisa una vez; ninguna tiene problemas',
      v1 - v0 === 0 && v2 - v1 === 1 && enLosVotos === 0 && deOtroMundo.length === 0,
      { enLosVotos: v1 - v0, otroMundo: v2 - v1, problemas: enLosVotos + deOtroMundo.length },
    );

    /* Las roturas, cada una con la frase que le toca (`null`: ninguna) y construida dos veces: dos identidades. */
    const clonarMundo = (): Record<string, unknown> => JSON.parse(JSON.stringify(dV.mundo)) as Record<string, unknown>;
    const conMundo = (f: (m: Record<string, unknown>) => void) => (): LizaDeclarada => {
      const m = clonarMundo();
      f(m);
      return { ...dV, mundo: m as unknown as LizaDeclarada['mundo'] };
    };
    const suelo = (m: Record<string, unknown>): Record<string, unknown[]> => m['suelo'] as Record<string, unknown[]>;
    const grafo = (m: Record<string, unknown>): Record<string, unknown[]> => m['grafo'] as Record<string, unknown[]>;
    class ListaRara extends Array<unknown> {}
    const LLANO = 'no es dato llano (no pasa por canonico.ts): ';
    const FORMA = 'la declaración no tiene la forma del contrato: ';
    const roturas: [string, () => LizaDeclarada, string | null][] = [
      ['la buena', () => ({ ...dV, mundo: clonarMundo() as unknown as LizaDeclarada['mundo'] }), null],
      ['una casilla con decimales', conMundo((m) => (suelo(m)['pisables']![5] = { x: 1.5, y: 0 })), 'una casilla son dos enteros'],
      ['una casilla con una clave de más', conMundo((m) => (suelo(m)['pisables']![7] = { x: 3, y: 1, z: 2 })), null],
      ['una casilla con una clave sin definir', conMundo((m) => (suelo(m)['pisables']![9] = { x: 3, y: 1, z: undefined })), LLANO],
      ['una casilla con NaN', conMundo((m) => (suelo(m)['pisables']![11] = { x: Number.NaN, y: 1 })), LLANO],
      ['una casilla que es una lista', conMundo((m) => (suelo(m)['pisables']![13] = [1, 2])), 'una casilla son dos enteros'],
      ['las casillas en una lista rara', conMundo((m) => (suelo(m)['pisables'] = ListaRara.from(suelo(m)['pisables']!))), null],
      ['una caja del revés', conMundo((m) => (suelo(m)['cuerpos']![20] = { x0: 5, z0: 5, x1: 4, z1: 6 })), 'la caja está del revés'],
      ['una caja con una fecha', conMundo((m) => (suelo(m)['cuerpos']![21] = { x0: 5, z0: 5, x1: 6, z1: new Date(0) })), LLANO],
      ['una caja fuera de la liza', conMundo((m) => (suelo(m)['cuerpos']![23] = { x0: 600, z0: 5, x1: 601, z1: 6 })), 'se sale de la liza'],
      ['una clase de caja de menos', conMundo((m) => (m['clasesDeCaja'] as unknown[]).pop()), 'una clase por caja'],
      ['un nudo con decimales', conMundo((m) => (grafo(m)['nudos']![30] = { x: 1.5, z: 0 })), 'mundo.grafo.nudos[30].x'],
      ['un nudo que es un Map', conMundo((m) => (grafo(m)['nudos']![31] = new Map())), LLANO],
      ['sin grafo (lanza a medias)', conMundo((m) => delete m['grafo']), FORMA],
      [
        'una casilla con decimales y sin grafo (lanza DESPUÉS de una frase: la frase se queda)',
        conMundo((m) => {
          suelo(m)['pisables']![5] = { x: 1.5, y: 0 };
          delete m['grafo'];
        }),
        'una casilla son dos enteros',
      ],
      ['sin suelo (lanza al principio)', conMundo((m) => delete m['suelo']), FORMA],
      ['una arista repetida', conMundo((m) => grafo(m)['aristas']!.push(grafo(m)['aristas']![0])), 'está dos veces'],
      ['una arista repetida del revés', conMundo((m) => grafo(m)['aristas']!.push([...(grafo(m)['aristas']![0] as number[])].reverse())), 'está dos veces'],
      ['una arista de tres', conMundo((m) => (grafo(m)['aristas']![3] = [1, 2, 3])), 'un par de índices de nudo'],
      ['una zona con una clave de más', conMundo((m) => ((m['zonas'] as Record<string, unknown>[])[2]!['otra'] = 1)), null],
      ['una zona con su caja con una fecha', conMundo((m) => ((m['zonas'] as Record<string, Record<string, unknown>>[])[3]!['caja']!['x0'] = new Date(0))), LLANO],
      ['un sitio sin papel', conMundo((m) => delete (m['nace'] as Record<string, unknown>[])[2]!['papel']), "tiene que ser 'asiento' o 'reaparicion'"],
      ['un sitio con el papel sin definir', conMundo((m) => ((m['nace'] as Record<string, unknown>[])[3]!['papel'] = undefined)), LLANO],
      ['un ciclo en el mundo', conMundo((m) => (m['yo'] = m)), LLANO],
      ['un ciclo por el suelo', conMundo((m) => (suelo(m)['atras'] = m as unknown as unknown[])), LLANO],
      ['el mundo nulo', () => ({ ...dV, mundo: null as unknown as LizaDeclarada['mundo'] }), FORMA],
      ['una declaración que no es llana', () => Object.assign(Object.create({ heredado: 1 }) as object, dV) as LizaDeclarada, LLANO],
    ];
    const malas: unknown[] = [];
    let canonicas = 0;
    let conFrase = 0;
    for (const [nombre, hacer, frase] of roturas) {
      const d1 = hacer();
      const primera = problemasDeLaDeclaracion(d1);
      const deMemoria = problemasDeLaDeclaracion(d1);
      const deOtra = problemasDeLaDeclaracion(hacer());
      const generico = porQueNoEsCanonico(d1);
      const igual = JSON.stringify(primera) === JSON.stringify(deMemoria) && JSON.stringify(primera) === JSON.stringify(deOtra);
      const canonicoBien = generico === null ? !primera.some((x) => x.startsWith(LLANO)) : primera[0] === `${LLANO}${generico}`;
      const fraseBien = frase === null ? primera.length === 0 : primera.some((x) => x.includes(frase));
      if (generico !== null) canonicas++;
      if (frase !== null) conFrase++;
      if (!igual || !canonicoBien || !fraseBien) malas.push({ nombre, igual, canonicoBien, fraseBien, primera: primera.slice(0, 2), deMemoria: igual ? undefined : deMemoria.slice(0, 2), deOtra: igual ? undefined : deOtra.slice(0, 2) });
    }
    comprobar(
      `las ${roturas.length} roturas del mundo dan la frase que les toca, la MISMA con memoria y sin ella, y el chequeo canónico deprisa dice exactamente lo del genérico`,
      malas.length === 0 && canonicas >= 8 && conFrase >= 20,
      { malas, canonicas, conFrase },
    );

    const mismoSuelo: LizaDeclarada = { ...dV, fase: { ...dV.fase, semilla: 99 } };
    const otroSuelo: LizaDeclarada = { ...dV, mundo: { ...dV.mundo, suelo: { ...dV.mundo.suelo } } };
    const a1 = arenaDeLaLiza(dV);
    const a2 = arenaDeLaLiza(mismoSuelo);
    const a3 = arenaDeLaLiza(otroSuelo);
    comprobar(
      'la arena se guarda por el suelo: el mismo suelo da la MISMA arena, y otro suelo igual, otra arena igual',
      a1 === a2 && a1 !== a3 && a1.cuerpos.join(',') === a3.cuerpos.join(',') && a1.pisable.join('') === a3.pisable.join(''),
    );
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 24 · L10: EL ALCANCE DE BLANCO Y EL OLVIDO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La primera declaración de la liza abierta que la sala cumple (el diseño de la ciudad abierta, §3.4 y §5.5),
 * con su segundo uso, que no es ningún juego: la plaza de juguete para las fronteras exactas, y la ciudad de
 * juguete de 300 × 300 (`lizaAbiertaConOlvido`: alcance de 45, olvido a 90 en 200 tics) para jugarla entera
 * contra la regla escrita aquí aparte, tic a tic.
 *
 *   · EL ALCANCE: con el alcance JUSTO a la distancia, la entidad toma al asiento y le anuncia; con 1/65536
 *     menos, ni lo toma, ni da un paso, ni anuncia. El tirador suelta su línea de apuntado cuando su blanco
 *     se le va, y nunca apunta a quien está más allá. En la ciudad nadie persigue más allá de su alcance, y
 *     sin el alcance la misma partida persigue a más de cien unidades.
 *   · EL OLVIDO: al tic, ni uno antes ni uno después, con el asiento a 1/65536 más de la distancia; nunca,
 *     justo a ella. La olvidada vuelve a la cola de su grupo y un `vaciar` no se gana alejándose. El ausente
 *     no acompaña, el caído sí y el que espera sin cuerpo no. Caída y deshecha no les corre el reloj. Y en la
 *     ciudad olvida EXACTAMENTE lo que la regla de aquí dice, tic a tic, con un asiento que se calla un rato.
 *   · LA FRANJA ENTRE LOS DOS (la revisión de la entrega 1): sin nadie a su alcance pero con alguien a la
 *     distancia del olvido, la entidad ANDA hacia él sin hacerlo su blanco; justo en la frontera, y en la
 *     ciudad, donde ninguna se queda parada ahí más de 3 s (la primera versión se quedaba para siempre).
 *   · LA FORMA TRANSITORIA —sin los dos campos, como la escriben los productores que aún no declaran L10— es
 *     la sala de antes, tic a tic.
 */
paso('24 · L10: el alcance de blanco y el olvido, exactos en sus fronteras y jugados en una ciudad');
const DEL_OLVIDO = 12;
{
  const DISUELTA = MOTIVO_DE_IRSE.disuelta;
  /** El menor entero `r` con `r² ≥ d2`: la distancia a la que un punto empieza a estar «a `r` o menos». */
  const raizPorArriba = (d2: number): number => {
    let r = Math.floor(Math.sqrt(d2));
    while (r * r < d2) r++;
    while (r > 0 && (r - 1) * (r - 1) >= d2) r--;
    return r;
  };
  const conAlcance = (c: ClaseDeEntidad, alcance: number): ClaseDeEntidad => ({
    ...c,
    cerebro: {
      distanciaMinima: c.cerebro.distanciaMinima,
      distanciaMaxima: c.cerebro.distanciaMaxima,
      decideCadaTics: c.cerebro.decideCadaTics,
      costeCuerpoACuerpo: c.cerebro.costeCuerpoACuerpo,
      costeDisparo: c.cerebro.costeDisparo,
      sigueElGrafo: c.cerebro.sigueElGrafo,
      alcanceDeBlanco: alcance,
    },
  });
  const unoQuieto = (d: LizaDeclarada, mudo = false): Banco => {
    const ap = new Aparato(1, 1000, 0, 100, 17, quieto);
    ap.mudo = mudo;
    return bancoDeUno(d, ap);
  };
  /** Lo que sale para todos de `tics` pasos de un banco: `nace`, `seva` (con su motivo), los `estado` del asiento 1 y las rondas. */
  interface Registro {
    naces: number[][];
    sevas: number[][];
    olvidos: number[][];
    estados: number[][];
    rondas: [number, string][];
  }
  const registro = (b: Banco, tics: number): Registro => {
    const r: Registro = { naces: [], sevas: [], olvidos: [], estados: [], rondas: [] };
    for (let i = 0; i < tics; i++) {
      const p = b.tic();
      const k = p.sala.tic;
      for (const x of p.sucesos) {
        if (x.para !== 0) continue;
        const s = x.suceso;
        if (s.e === 'nace') r.naces.push([k, s.id]);
        else if (s.e === 'seva') {
          r.sevas.push([k, s.id, s.por]);
          if (s.por === DISUELTA) r.olvidos.push([k, s.id]);
        } else if (s.e === 'estado' && s.a === 1) r.estados.push([k, s.est]);
      }
      for (const v of p.veredictos) if (v.tipo === VEREDICTO_DE_RONDA) r.rondas.push([k, (v.carga as CargaDeRonda).resultado]);
    }
    return r;
  };

  /* ── El alcance, justo en su frontera ───────────────────────────────────── */
  {
    const conUna = (alcance: number): LizaDeclarada => juguete({ asientos: 1, clase: conAlcance(clase(), alcance), grupos: (n) => [grupoFijo(n, 1, 1)] });
    /* Dónde sale la entidad: la misma salida con cualquier alcance (el azar de la sala no lo mira antes). */
    const b0 = unoQuieto(conUna(0));
    let sale: { x: number; z: number } | null = null;
    for (let i = 0; i < 5 && sale === null; i++) {
      b0.tic();
      const e = b0.sala.entidades[0];
      if (e !== undefined) sale = { x: e.x, z: e.z };
    }
    const a0 = b0.sala.asientos[0] as EstadoDeLaSala['asientos'][number];
    const r = sale === null ? 0 : raizPorArriba((a0.x - sale.x) * (a0.x - sale.x) + (a0.z - sale.z) * (a0.z - sale.z));
    const jugar = (alcance: number): { mismaSalida: boolean; tomo: boolean; anuncios: number; quieta: boolean } => {
      const b = unoQuieto(conUna(alcance));
      let primera: { x: number; z: number } | null = null;
      let mismaSalida = false;
      let tomo = false;
      let anuncios = 0;
      let quieta = true;
      for (let i = 0; i < 400; i++) {
        const p = b.tic();
        const e = p.sala.entidades[0];
        if (e !== undefined) {
          if (primera === null) {
            primera = { x: e.x, z: e.z };
            mismaSalida = sale !== null && e.x === sale.x && e.z === sale.z;
          }
          if (e.blanco === 1) tomo = true;
          if (e.x !== primera.x || e.z !== primera.z) quieta = false;
        }
        for (const x of p.sucesos) if (x.suceso.e === 'anuncio' && x.suceso.a === 1 && x.suceso.de >= 16) anuncios++;
      }
      return { mismaSalida, tomo, anuncios, quieta };
    };
    const justo = jugar(r);
    const menos = jugar(r - 1);
    nota(`alcance: la entidad sale a ${(r / UNO).toFixed(5)} unidades del asiento, y se juega con ese alcance y con 1/65536 menos`);
    comprobar(
      'con el alcance JUSTO a su distancia la entidad toma al asiento por blanco, va y le anuncia; con 1/65536 menos, en 400 tics ni lo toma, ni da un paso, ni anuncia',
      r > u(10) && justo.mismaSalida && menos.mismaSalida && justo.tomo && justo.anuncios >= 1 && !justo.quieta && !menos.tomo && menos.anuncios === 0 && menos.quieta,
      { r, justo, menos },
    );
  }

  /* ── El tirador suelta la línea cuando su blanco se le va ─────────────────── */
  {
    const ALCANCE = u(10);
    const tirador = claseTiradora({ guardia: null, acciones: [accion(A.golpe, { anuncioTics: 11, enganche: null, alFallar: null, efecto: efecto(1, puesta(E.tocado, 12)) })] });
    const d = juguete({
      asientos: 2,
      clase: conAlcance(tirador, ALCANCE),
      danoDeBala: 1,
      recurso: 50,
      relojTics: 20000,
      grupos: (n) => [{ clase: 1, cuantos: porN(n, () => 400), vivasALaVez: porN(n, () => 4), claseDeZona: 1, desdeTic: 0, cadaTics: 20, eleccion: 'azar' }],
    });
    /* El asiento 1 da vueltas a la plaza, al trote, pasando junto a las cuatro esquinas: de allí salen los tiradores. */
    const b = new Banco(d, 11, [new Aparato(1, 1000, 0, 100, 17, corredor(16)), new Aparato(2, 2000, 20, 150, 29, paseante(5, IDS_DEL_JUGUETE, 20))]);
    b.guardarPasos = false;
    b.conectar(1);
    b.conectar(2);
    let apuntes = 0;
    let soltadas = 0;
    const malos: unknown[] = [];
    let previas = b.sala.entidades;
    for (let i = 0; i < 3000; i++) {
      const p = b.tic();
      for (const x of p.sucesos) {
        const s = x.suceso;
        if (s.e !== 'apunta') continue;
        if (x.para === 1 && s.a !== 0) apuntes++;
        if (x.para === 0 && s.a === 0) {
          const antes = previas.find((e) => e.numero === s.de);
          const blanco = antes === undefined || antes.blanco < 1 ? undefined : p.sala.asientos[antes.blanco - 1];
          if (antes !== undefined && blanco !== undefined && (blanco.x - antes.x) * (blanco.x - antes.x) + (blanco.z - antes.z) * (blanco.z - antes.z) > ALCANCE * ALCANCE) soltadas++;
        }
      }
      for (const e of p.sala.entidades) {
        if (e.cerebro.modo !== 'apuntar') continue;
        const a = p.sala.asientos[e.blanco - 1];
        if (a === undefined || (a.x - e.x) * (a.x - e.x) + (a.z - e.z) * (a.z - e.z) > ALCANCE * ALCANCE) {
          if (malos.length < 4) malos.push({ k: p.sala.tic, entidad: e.numero, blanco: e.blanco });
          else malos.push(null);
        }
      }
      previas = p.sala.entidades;
    }
    nota(`el tirador de alcance 10: ${apuntes} líneas de apuntado contra el asiento 1, ${soltadas} soltadas porque el blanco se le fue`);
    comprobar(
      'ningún tirador apunta en ningún tic a un asiento a más de su alcance, y el que se le va a media línea la suelta (apunta 0)',
      malos.length === 0 && apuntes >= 20 && soltadas >= 3,
      { malos: malos.slice(0, 4), cuantosMalos: malos.length, apuntes, soltadas },
    );
  }

  /* ── El olvido, al tic y en la frontera ──────────────────────────────────── */
  /*
   * Una zona de 1/65536 de lado en (15, 15), con un grupo de uno que sale de ella; el asiento, quieto en
   * (−3, −8), a unas 29 unidades; alcance de 5: nadie lo persigue. Las cuatro esquinas de la zona están a
   * `rMin` o `rMax` redondeados hacia arriba, que difieren en uno como mucho.
   */
  const Z9 = { id: 9, clase: 9, caja: { x0: u(15), z0: u(15), x1: u(15) + 1, z1: u(15) + 1 } };
  const ASIENTO = { x: u(-3), z: u(-8) };
  const esquinas: number[] = [];
  for (const x of [Z9.caja.x0, Z9.caja.x1]) for (const z of [Z9.caja.z0, Z9.caja.z1]) esquinas.push((x - ASIENTO.x) * (x - ASIENTO.x) + (z - ASIENTO.z) * (z - ASIENTO.z));
  const rMin = raizPorArriba(Math.min(...esquinas));
  const rMax = raizPorArriba(Math.max(...esquinas));
  const T = 60;
  const enLaEsquina = (olvido: OlvidoDeclarado | null, o: OpcionesDelJuguete = {}, alcance = u(5), c: ClaseDeEntidad = clase()): LizaDeclarada =>
    juguete({ asientos: 1, zonasExtra: [Z9], clase: conAlcance(c, alcance), grupos: (n) => [grupoFijo(n, 1, 9)], olvido, ...o });
  {
    /* Seis vueltas con el asiento más allá de las cuatro esquinas: cada vez sale en una, y en todas se olvida. */
    const bFuera = unoQuieto(enLaEsquina({ distancia: rMin - 1, tics: T }));
    const fuera = registro(bFuera, 6 * T + 10);
    const k0 = fuera.naces[0]?.[0] ?? -1;
    let alTic = fuera.naces.length === 7 && fuera.olvidos.length === 6;
    for (let i = 0; i < 6 && alTic; i++) {
      const nace = fuera.naces[i] as number[];
      const olvido = fuera.olvidos[i] as number[];
      const otra = fuera.naces[i + 1] as number[];
      alTic = nace[0] === k0 + i * T && olvido[0] === k0 + (i + 1) * T && olvido[1] === nace[1] && otra[0] === olvido[0];
    }
    /*
     * Y la frontera EXACTA con el sitio en que sale de verdad (el mismo con cualquier olvido: el azar no lo
     * mira antes): justo a su distancia no se olvida nunca; con 1/65536 menos, a los T tics.
     */
    const b0 = unoQuieto(enLaEsquina(null));
    let sale: { x: number; z: number } | null = null;
    for (let i = 0; i < 5 && sale === null; i++) {
      b0.tic();
      const e = b0.sala.entidades[0];
      if (e !== undefined) sale = { x: e.x, z: e.z };
    }
    const r = sale === null ? 0 : raizPorArriba((sale.x - ASIENTO.x) * (sale.x - ASIENTO.x) + (sale.z - ASIENTO.z) * (sale.z - ASIENTO.z));
    const justo = registro(unoQuieto(enLaEsquina({ distancia: r, tics: T })), 6 * T + 10);
    const debajo = registro(unoQuieto(enLaEsquina({ distancia: r - 1, tics: T })), T + 10);
    const quieto0 = bFuera.sala.asientos[0];
    comprobar(
      'el olvido llega AL TIC: con el asiento a 1/65536 más de la distancia, la entidad se va a los T tics justos de nacer y su grupo la saca otra vez en ese mismo tic, seis veces; con el asiento JUSTO a la distancia, no se va nunca',
      rMax - rMin <= 1 &&
        r >= rMin &&
        r <= rMax &&
        quieto0 !== undefined &&
        quieto0.x === ASIENTO.x &&
        quieto0.z === ASIENTO.z &&
        alTic &&
        justo.olvidos.length === 0 &&
        justo.naces.length === 1 &&
        debajo.olvidos.length === 1 &&
        debajo.olvidos[0]?.[0] === (debajo.naces[0]?.[0] ?? -1) + T,
      { rMin, rMax, r, fuera: { naces: fuera.naces, olvidos: fuera.olvidos }, justo: { naces: justo.naces, olvidos: justo.olvidos }, debajo: { naces: debajo.naces, olvidos: debajo.olvidos } },
    );
  }

  /* ── Sin nadie a su alcance pero acompañada: se acerca ───────────────────── */
  {
    /*
     * La revisión de la entrega 1 de la ciudad abierta: entre el alcance y la distancia del olvido la primera
     * versión dejaba a la entidad sin blanco y sin olvidarse, quieta para siempre. En la misma esquina, con
     * alcance de 5 (el asiento, a unas 29, le queda lejos): con el olvido JUSTO a la distancia a la que sale,
     * está acompañada desde el primer tic, y tiene que ANDAR hacia el asiento sin hacerlo su blanco, tomarlo
     * al tenerlo a su alcance y anunciarle; con 1/65536 menos está sola, y ni da un paso: se olvida a los T.
     */
    const b0 = unoQuieto(enLaEsquina(null));
    let sale: { x: number; z: number } | null = null;
    for (let i = 0; i < 5 && sale === null; i++) {
      b0.tic();
      const e = b0.sala.entidades[0];
      if (e !== undefined) sale = { x: e.x, z: e.z };
    }
    const r = sale === null ? 0 : raizPorArriba((sale.x - ASIENTO.x) * (sale.x - ASIENTO.x) + (sale.z - ASIENTO.z) * (sale.z - ASIENTO.z));
    const jugar = (olvido: OlvidoDeclarado): { anda: boolean; sinBlancoAndando: number; tomo: number; anuncia: number; nace: number; olvidada: number; blancoLejos: boolean } => {
      const b = unoQuieto(enLaEsquina(olvido));
      let primera: { n: number; x: number; z: number } | null = null;
      let anda = false;
      let sinBlancoAndando = 0;
      let tomo = -1;
      let anuncia = -1;
      let nace = -1;
      let olvidada = -1;
      let blancoLejos = false;
      let antes: { x: number; z: number } | null = null;
      for (let i = 0; i < 400; i++) {
        const p = b.tic();
        const k = p.sala.tic;
        for (const x of p.sucesos) {
          const s = x.suceso;
          if (x.para === 0 && s.e === 'nace' && nace < 0) nace = k;
          if (x.para === 0 && s.e === 'seva' && s.por === DISUELTA && primera !== null && s.id === primera.n && olvidada < 0) olvidada = k;
          if (x.para === 1 && s.e === 'anuncio' && s.a === 1 && s.de >= 16 && anuncia < 0) anuncia = k;
        }
        const e = p.sala.entidades.find((x) => primera === null || x.numero === primera.n);
        if (e === undefined) continue;
        if (primera === null) primera = { n: e.numero, x: e.x, z: e.z };
        if (e.x !== primera.x || e.z !== primera.z) anda = true;
        if (antes !== null && (e.x !== antes.x || e.z !== antes.z) && e.blanco === 0) sinBlancoAndando++;
        antes = { x: e.x, z: e.z };
        if (e.blanco === 1) {
          if (tomo < 0) tomo = k;
          const a = p.sala.asientos[0] as EstadoDeLaSala['asientos'][number];
          if ((a.x - e.x) * (a.x - e.x) + (a.z - e.z) * (a.z - e.z) > u(5) * u(5) + u(1) * u(1) && e.cerebro.modo !== 'atacar') blancoLejos = true;
        }
      }
      return { anda, sinBlancoAndando, tomo, anuncia, nace, olvidada, blancoLejos };
    };
    const acompanada = jugar({ distancia: r, tics: T });
    const sola = jugar({ distancia: r - 1, tics: T });
    nota(`acompañada (olvido a ${(r / UNO).toFixed(5)}): ${acompanada.sinBlancoAndando} tics andando sin blanco, lo toma en el tic ${acompanada.tomo} y le anuncia en el ${acompanada.anuncia}`);
    comprobar(
      'sin nadie a su alcance pero ACOMPAÑADA (el asiento justo a la distancia del olvido), la entidad anda hacia él sin hacerlo su blanco, lo toma al tenerlo a su alcance y le anuncia, sin olvidarse; con 1/65536 menos, sola: ni un paso, y se olvida a los T tics',
      r > u(10) &&
        acompanada.anda &&
        acompanada.sinBlancoAndando >= 60 &&
        acompanada.tomo > 0 &&
        acompanada.anuncia > acompanada.tomo &&
        acompanada.olvidada < 0 &&
        !acompanada.blancoLejos &&
        !sola.anda &&
        sola.tomo < 0 &&
        sola.nace > 0 &&
        sola.olvidada === sola.nace + T,
      { r, acompanada, sola },
    );
  }

  /* ── La olvidada vuelve a la cola: un `vaciar` no se gana alejándose ─────── */
  {
    /* Los `seva … disuelta` del tic en que se cierra el encuentro son del cierre (se disuelve lo que queda), no olvidos. */
    const dos = (olvido: OlvidoDeclarado | null): { r: Registro; olvidos: number } => {
      const r = registro(unoQuieto(enLaEsquina(olvido, { relojTics: 400, grupos: (n) => [grupoFijo(n, 2, 9)] })), 420);
      const cierre = r.rondas[0]?.[0] ?? Infinity;
      return { r, olvidos: r.olvidos.filter((x) => (x[0] as number) < cierre).length };
    };
    const con = dos({ distancia: rMin - 1, tics: T });
    const sin = dos(null);
    comprobar(
      'la olvidada vuelve a la cola de su grupo: dos que se olvidan cada T tics no dejan ganar el vaciar lejos de ellas —se aguanta al vencer el reloj—, y sin olvido no se olvida ninguna',
      con.r.rondas.length === 1 &&
        con.r.rondas[0]?.[0] === 401 &&
        con.r.rondas[0]?.[1] === 'aguantada' &&
        con.olvidos >= 10 &&
        con.r.naces.length === con.olvidos + 2 &&
        sin.olvidos === 0 &&
        sin.r.naces.length === 2 &&
        sin.r.rondas.length === 1 &&
        sin.r.rondas[0]?.[1] === 'aguantada',
      { con: { rondas: con.r.rondas, olvidos: con.olvidos, naces: con.r.naces.length }, sin: { rondas: sin.r.rondas, olvidos: sin.olvidos, naces: sin.r.naces.length } },
    );
  }

  /* ── El ausente no acompaña ──────────────────────────────────────────────── */
  {
    const olvido = { distancia: u(60), tics: T };
    const presente = registro(unoQuieto(enLaEsquina(olvido)), 300);
    const ausente = registro(unoQuieto(enLaEsquina(olvido), true), 300);
    const ka = ausente.estados.find((x) => x[1] === E.ausente)?.[0] ?? -1;
    comprobar(
      'el ausente no acompaña: con el asiento presente a su lado (a 60) nada se olvida; ausente, la entidad se va a los T tics justos del último en que lo tuvo presente',
      presente.olvidos.length === 0 && ka > 0 && ausente.olvidos.length >= 1 && ausente.olvidos[0]?.[0] === ka - 1 + T,
      { presente: presente.olvidos, ka, ausente: ausente.olvidos.slice(0, 3) },
    );
  }

  /* ── El caído acompaña; el que espera sin cuerpo, no ─────────────────────── */
  {
    const fuerte = clase({ guardia: null, acciones: [accion(A.golpe, { anuncioTics: 11, enganche: null, alFallar: null, efecto: efecto(60, puesta(E.tocado, 12)) })] });
    const r = registro(unoQuieto(enLaEsquina({ distancia: u(40), tics: T }, {}, u(40), fuerte)), 600);
    const kc = r.estados.find((x) => x[1] === E.caidaAsiento)?.[0] ?? -1;
    const ks = r.estados.find((x) => x[1] === E.sinCuerpo && x[0] > kc)?.[0] ?? -1;
    const enLaCaida = r.olvidos.filter((x) => (x[0] as number) >= kc && (x[0] as number) < ks);
    const primeroTras = r.olvidos.find((x) => (x[0] as number) >= ks);
    comprobar(
      'el caído acompaña: mientras está en el suelo, a su lado, no se olvida nada; en cuanto espera sin cuerpo, la que tenía al lado se va a los T tics justos',
      kc > 0 && ks - kc === 240 && enLaCaida.length === 0 && primeroTras !== undefined && primeroTras[0] === ks - 1 + T,
      { kc, ks, enLaCaida, primeroTras, olvidos: r.olvidos.slice(0, 4) },
    );
  }

  /* ── Caída y deshecha: no les corre el reloj ─────────────────────────────── */
  {
    /*
     * Una entidad que lleva sola desde que nació (a 29 del único asiento, con olvido a 10) se deja CAÍDA por
     * dentro de la sala, sin nadie que la remate: a los 150 tics se deshace, a los 40 vuelve a salir con su
     * mismo número, y sólo entonces empieza a contar. Con el reloj corriendo en la caída, se habría ido a
     * los T tics de nacer, tendida.
     */
    const b = unoQuieto(enLaEsquina({ distancia: u(10), tics: T }));
    for (let i = 0; i < 30; i++) b.tic();
    const e0 = b.sala.entidades[0] as EstadoDeLaSala['entidades'][number];
    const k = b.sala.tic;
    b.sala = {
      ...b.sala,
      entidades: [
        {
          ...e0,
          vida: 0,
          turno: 'ninguno',
          blanco: 0,
          estado: { estado: E.caidaEntidad, desdeTic: k, hastaTic: k + 150, intocableHastaTic: k, soltableEnTic: k + 150, distanciaExtra: 0 },
          cerebro: { modo: 'caida', desdeTic: k, repiensaEnTic: k + 150, nudo: -1, apuntaX: e0.x, apuntaZ: e0.z, balasPorSalir: 0 },
        },
      ],
    };
    const r = registro(b, 400);
    const deshecha = r.sevas.find((x) => x[1] === e0.numero && x[2] === MOTIVO_DE_IRSE.seDeshace)?.[0] ?? -1;
    const vuelve = r.naces.find((x) => x[1] === e0.numero)?.[0] ?? -1;
    const olvido = r.olvidos[0];
    comprobar(
      'caída y deshecha no les corre el reloj: la que llevaba sola desde que nació no se olvida tendida ni deshecha, y al volver a salir se va a los T tics justos',
      deshecha === k + 150 && vuelve === deshecha + 40 && olvido !== undefined && olvido[1] === e0.numero && olvido[0] === vuelve + T && r.olvidos.filter((x) => (x[0] as number) < vuelve).length === 0,
      { k, deshecha, vuelve, olvidos: r.olvidos.slice(0, 3), sevas: r.sevas.slice(0, 3) },
    );
  }

  /* ── En la ciudad: nadie persigue más allá, y se olvida lo que dice la regla ── */
  {
    const TICS = 1500;
    const OLVIDO = OLVIDO_DE_LA_ABIERTA;
    const jugarLaCiudad = (d: LizaDeclarada, vigilar: boolean) => {
      const b = bancoDeLaCiudad(d, 29);
      const cuarto = b.aparato(4);
      /* La regla, escrita aquí: el último tic en que cada entidad no estaba sola (o nació). */
      const cerca = new Map<number, number>();
      let previas = b.sala.entidades;
      let masLejos = 0;
      let persiguiendo = 0;
      let seLeVan = 0;
      let siguen = 0;
      const ejemplosDeSiguen: unknown[] = [];
      let olvidos = 0;
      let distintos = 0;
      let juntoAUnAusente = 0;
      const ejemplos: unknown[] = [];
      /* Y la franja entre el alcance y el olvido, mirada desde fuera (ver `vigilarLosNpc`). */
      const v = vigilarLosNpc(d);
      for (let t = 0; t < TICS; t++) {
        if (t === 250) cuarto.mudo = true;
        if (t === 700) cuarto.mudo = false;
        const p = b.tic();
        v.mirar(p.sala);
        const k = p.sala.tic;
        const reales: number[] = [];
        for (const x of p.sucesos) if (x.para === 0 && x.suceso.e === 'seva' && x.suceso.por === DISUELTA) reales.push(x.suceso.id);
        olvidos += reales.length;
        const estadoEn = (a: EstadoDeLaSala['asientos'][number]): number => (a.estado !== null && k >= a.estado.desdeTic && k < a.estado.hastaTic ? a.estado.estado : 0);
        if (vigilar) {
          const esperadas: number[] = [];
          for (const e of previas) {
            const corre = e.cerebro.modo === 'aparecer' || e.cerebro.modo === 'acechar' || e.cerebro.modo === 'rondar';
            let acompanada = false;
            let ausenteCerca = false;
            for (const a of p.sala.asientos) {
              if (!a.conCuerpo) continue;
              const cerquita = (a.x - e.x) * (a.x - e.x) + (a.z - e.z) * (a.z - e.z) <= OLVIDO.distancia * OLVIDO.distancia;
              const est = estadoEn(a);
              if (est === E.ausente || est === E.sinCuerpo) {
                if (cerquita && est === E.ausente) ausenteCerca = true;
                continue;
              }
              if (cerquita) acompanada = true;
            }
            if (!corre || acompanada) cerca.set(e.numero, k);
            else if (k - (cerca.get(e.numero) ?? k) >= OLVIDO.tics) {
              esperadas.push(e.numero);
              if (ausenteCerca) juntoAUnAusente++;
            }
          }
          const a1 = reales.slice().sort((x, y) => x - y).join(',');
          const a2 = esperadas.slice().sort((x, y) => x - y).join(',');
          if (a1 !== a2) {
            distintos++;
            if (ejemplos.length < 4) ejemplos.push({ k, reales: a1, esperadas: a2 });
          }
        }
        for (const e of p.sala.entidades) if (!cerca.has(e.numero)) cerca.set(e.numero, k);
        for (const n of reales) cerca.delete(n);
        /*
         * Lo más lejos que una tiene a su blanco al acabar el tic: todas, y las que persiguen (sin golpe ni
         * ráfaga en curso, que siguen con su blanco aunque se vaya). Éstas lo miran en el tic antes de dar su
         * paso, así que acaban a su alcance más un paso como mucho: soltarlo sólo al repensar se pasaría.
         */
        for (const e of p.sala.entidades) {
          if (e.blanco < 1) continue;
          const a = p.sala.asientos[e.blanco - 1];
          if (a === undefined) continue;
          const lejos = Math.sqrt((a.x - e.x) * (a.x - e.x) + (a.z - e.z) * (a.z - e.z)) / UNO;
          if (lejos > masLejos) masLejos = lejos;
          if (e.cerebro.modo !== 'atacar' && e.cerebro.modo !== 'disparar' && lejos > persiguiendo) persiguiendo = lejos;
        }
        /*
         * SUELTA EN EL MISMO TIC, mirado desde fuera: la que acecha o ronda con blanco se pregunta en el tic
         * `k` con su sitio de antes de andar (el del tic anterior) y el de su blanco en `k` (ya validado). Si
         * ahí queda más allá de su alcance, al acabar `k` ya no es su blanco. Se miran sólo las que siguen
         * acechando, rondando o apuntando y sin estado en `k` (la aturdida no piensa, y con razón no suelta).
         */
        for (const antes of previas) {
          if (antes.blanco < 1 || (antes.cerebro.modo !== 'acechar' && antes.cerebro.modo !== 'rondar')) continue;
          const ahora = p.sala.entidades.find((e) => e.numero === antes.numero);
          const a = p.sala.asientos[antes.blanco - 1];
          if (ahora === undefined || a === undefined) continue;
          if (ahora.cerebro.modo !== 'acechar' && ahora.cerebro.modo !== 'rondar' && ahora.cerebro.modo !== 'apuntar') continue;
          if (ahora.estado !== null && k >= ahora.estado.desdeTic && k < ahora.estado.hastaTic) continue;
          if ((a.x - antes.x) * (a.x - antes.x) + (a.z - antes.z) * (a.z - antes.z) <= ALCANCE_DE_LA_ABIERTA * ALCANCE_DE_LA_ABIERTA) continue;
          seLeVan++;
          if (ahora.blanco === antes.blanco) {
            siguen++;
            if (ejemplosDeSiguen.length < 3) ejemplosDeSiguen.push({ k, entidad: antes.numero, blanco: antes.blanco });
          }
        }
        previas = p.sala.entidades;
      }
      return { masLejos, persiguiendo, seLeVan, siguen, ejemplosDeSiguen, olvidos, distintos, juntoAUnAusente, ejemplos, vigilancia: v.resumen() };
    };
    const con = jugarLaCiudad(lizaAbiertaConOlvido(29), true);
    const sin = jugarLaCiudad(lizaAbierta({ semilla: 29, repartidos: true }), false);
    const ALCANCE = ALCANCE_DE_LA_ABIERTA / UNO;
    nota(
      `la ciudad, ${TICS} tics con seis asientos repartidos: con L10, el blanco más lejano a ${con.masLejos.toFixed(2)} (persiguiendo, ${con.persiguiendo.toFixed(2)}), ` +
        `${con.seLeVan} veces que a una se le fue el blanco más allá de ${String(ALCANCE)} (${con.siguen} lo siguieron), ${con.olvidos} olvidos (${con.juntoAUnAusente} junto a un ausente); ` +
        `sin L10, el blanco más lejano a ${sin.masLejos.toFixed(1)}`,
    );
    comprobar(
      'en la ciudad nadie tiene por blanco a quien está más allá de su alcance: la que acecha suelta a su blanco EN EL TIC en que se le va más allá de 45, la que persigue acaba cada tic a 45 más un paso como mucho (y la que golpea, a lo que anda su golpe); sin el alcance, la misma partida persigue a más de cien',
      con.siguen === 0 && con.seLeVan >= 3 && con.persiguiendo <= ALCANCE + 0.25 && con.masLejos <= ALCANCE + 5 && sin.masLejos > 100,
      { con: { masLejos: con.masLejos, persiguiendo: con.persiguiendo, seLeVan: con.seLeVan, siguen: con.siguen, ejemplos: con.ejemplosDeSiguen }, sin: sin.masLejos },
    );
    const vg = con.vigilancia;
    nota(`la franja entre el alcance y el olvido en la ciudad: ${vg.acercandose} tics de entidades acercándose sin blanco, la racha parada más larga ${vg.peorParada} tics (tope ${TICS_QUIETA})`);
    comprobar(
      'y en la ciudad ninguna entidad pasa más de 3 s parada sin nadie a su alcance con alguien a la distancia del olvido: la que se queda sin blanco acompañada se ACERCA (y se vio acercarse)',
      vg.paradas.length === 0 && vg.acercandose >= 200,
      { paradas: vg.paradas.slice(0, 6), peorParada: vg.peorParada, acercandose: vg.acercandose },
    );
    comprobar(
      'y en la ciudad se olvida EXACTAMENTE lo que dice la regla escrita aquí aparte —ni una de más, ni una de menos, ni un tic antes ni después—, con un asiento que se calla un rato',
      con.distintos === 0 && con.olvidos >= 5,
      { distintos: con.distintos, olvidos: con.olvidos, ejemplos: con.ejemplos },
    );
  }

  /* ── La forma transitoria es la sala de antes ────────────────────────────── */
  {
    const d = lizaLlena();
    const b = bancoLleno(d, 99);
    const TICS = 600;
    const huellaDelEstado = (s: EstadoDeLaSala): string => fnv(canonico({ ...s, declaracion: null, arena: null }));
    const estados: string[] = [];
    const salidas: string[] = [];
    for (let k = 0; k < TICS; k++) {
      const p = b.tic();
      estados.push(huellaDelEstado(p.sala));
      salidas.push(fnv(salidasDe(p)));
    }
    const en = d.fase.encuentro;
    const transitoria: LizaDeclarada = {
      ...d,
      clases: d.clases.map((c) => ({
        ...c,
        cerebro: {
          distanciaMinima: c.cerebro.distanciaMinima,
          distanciaMaxima: c.cerebro.distanciaMaxima,
          decideCadaTics: c.cerebro.decideCadaTics,
          costeCuerpoACuerpo: c.cerebro.costeCuerpoACuerpo,
          costeDisparo: c.cerebro.costeDisparo,
          sigueElGrafo: c.cerebro.sigueElGrafo,
        },
      })),
      fase: {
        ...d.fase,
        encuentro: en === null ? null : { ronda: en.ronda, presentes: en.presentes, relojTics: en.relojTics, vivasALaVez: en.vivasALaVez, grupos: en.grupos, fin: en.fin },
      },
    };
    const problemas = problemasDeLaDeclaracion(transitoria);
    const entera = en !== null && 'olvido' in en && en.olvido === null && d.clases.every((c) => 'alcanceDeBlanco' in c.cerebro && c.cerebro.alcanceDeBlanco === 0);
    const sinLosCampos = transitoria.fase.encuentro !== null && !('olvido' in transitoria.fase.encuentro) && transitoria.clases.every((c) => !('alcanceDeBlanco' in c.cerebro));
    let sala = salaNueva(transitoria, 99);
    let malos = 0;
    let primera = -1;
    for (let k = 0; k < TICS; k++) {
      const p = avanzarLaSala(sala, b.grabadas[k] as EntradaDeLaSala[]);
      sala = p.sala;
      if (huellaDelEstado(p.sala) !== estados[k] || fnv(salidasDe(p)) !== salidas[k]) {
        malos++;
        if (primera < 0) primera = k;
      }
    }
    comprobar(
      'la forma transitoria (sin alcance de blanco ni olvido, como la escriben los productores que aún no declaran L10) es la sala de antes: la MISMA tic a tic que la entera neutra (alcance 0, olvido null), 600 tics de la sala llena',
      problemas.length === 0 && entera && sinLosCampos && malos === 0,
      { problemas: problemas.slice(0, 3), entera, sinLosCampos, malos, primera },
    );
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 25 · LA REVISIÓN DE LA ENTREGA 1 DE LA CIUDAD ABIERTA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Una revisión adversaria jugó la sala de verdad en la ciudad de verdad (540 m, unos 3.250 nudos) y encontró
 * dos fallos de la Liza con todo lo de arriba en verde:
 *
 *   · LAS QUE RODEAN UNA MANZANA SE QUEDABAN EN LA ESQUINA. Con el asiento a 37-42 m en recta y a 82-168 por
 *     las calles, el camino corto se aleja en recta: a los 45,1 m la entidad soltaba al asiento y, sin blanco y
 *     acompañada, ni se movía ni se olvidaba nunca (4 de 60 persecuciones; en partida, hasta diez así). Aquí se
 *     buscan en el grafo parejas de nudos así —a su alcance en recta, con el camino corto pasando por lo menos
 *     dos unidades más allá de su alcance— y se juega cada una: una entidad que sale de uno contra un asiento
 *     quieto en el otro, que tiene que recibir su anuncio, sin que la vigilancia la vea parada. En la ciudad de
 *     juguete siempre; en la de El Quiebro, con su Prestado, si su productor está. Y en la de El Quiebro, tres
 *     combates de verdad con todos HUYENDO por las calles, como los jugó la revisión: ni una parada en la franja.
 *   · UN MUNDO NUEVO LE CAÍA ENCIMA A UN ASIENTO. Al cambiar de noche un sitio libre podía quedar dentro de una
 *     caja nueva, y la sala dejaba allí al asiento: cada paso se le corregía de vuelta. Aquí, en la plaza de
 *     juguete con una fase nueva y con el mismo mundo cambiado dentro de la fase; y con las noches de verdad
 *     de El Quiebro (un sitio de la plaza de la Bajada que la noche de antes estaba libre y ésta es caja).
 */
paso('25 · La revisión de la entrega 1: las que rodean una manzana llegan, y a nadie le cae una caja encima');
const DE_LA_ENTREGA_1 = 3;
const DE_LA_ENTREGA_1_EN_EL_QUIEBRO = 3;

/** Una pareja de nudos para una persecución que rodea: el del asiento y el de la salida, y sus distancias en unidades. */
interface Rodeo {
  readonly asiento: number;
  readonly sale: number;
  readonly recta: number;
  readonly calles: number;
  /** Lo más lejos del asiento, en recta, a lo largo del camino corto por el grafo. */
  readonly lejos: number;
}

/** Las distancias andadas por el grafo hasta el nudo `hasta` (en unidades), y el siguiente nudo hacia él. */
function caminosHacia(nudos: readonly { x: number; z: number }[], vecinos: readonly number[][], hasta: number): { dist: Float64Array; siguiente: Int32Array } {
  const dist = new Float64Array(nudos.length).fill(Number.POSITIVE_INFINITY);
  const siguiente = new Int32Array(nudos.length).fill(-1);
  const monton: number[][] = [];
  const meter = (d: number, i: number): void => {
    monton.push([d, i]);
    let j = monton.length - 1;
    while (j > 0) {
      const pa = (j - 1) >> 1;
      if ((monton[pa] as number[])[0]! <= d) break;
      monton[j] = monton[pa] as number[];
      monton[pa] = [d, i];
      j = pa;
    }
  };
  const sacar = (): number[] => {
    const cima = monton[0] as number[];
    const ultimo = monton.pop() as number[];
    if (monton.length > 0) {
      monton[0] = ultimo;
      let j = 0;
      for (;;) {
        const iz = 2 * j + 1;
        const de = iz + 1;
        let m = j;
        if (iz < monton.length && (monton[iz] as number[])[0]! < (monton[m] as number[])[0]!) m = iz;
        if (de < monton.length && (monton[de] as number[])[0]! < (monton[m] as number[])[0]!) m = de;
        if (m === j) break;
        const t = monton[j] as number[];
        monton[j] = monton[m] as number[];
        monton[m] = t;
        j = m;
      }
    }
    return cima;
  };
  dist[hasta] = 0;
  meter(0, hasta);
  while (monton.length > 0) {
    const [du, i] = sacar() as [number, number];
    if (du > (dist[i] as number)) continue;
    const a = nudos[i] as { x: number; z: number };
    for (const v of vecinos[i] as number[]) {
      const b = nudos[v] as { x: number; z: number };
      const dv = du + Math.hypot(b.x - a.x, b.z - a.z) / UNO;
      if (dv < (dist[v] as number)) {
        dist[v] = dv;
        siguiente[v] = i;
        meter(dv, v);
      }
    }
  }
  return { dist, siguiente };
}

/**
 * HASTA `cuantos` PERSECUCIONES QUE RODEAN en el grafo de `d`, con alcance `alcance` (unidades): un nudo libre
 * para el asiento (sorteado con `semilla`) y, de los que le quedan a su alcance en recta (de 8 a `alcance − 1`)
 * y a 200 o menos por el grafo, uno cuyo camino corto pasa a `alcance + 2` o más en recta. Uno por asiento.
 */
function rodeosDelGrafo(d: LizaDeclarada, alcance: number, cuantos: number, semilla: number): Rodeo[] {
  const nudos = d.mundo.grafo.nudos;
  const vecinos: number[][] = nudos.map(() => []);
  for (const [a, b] of d.mundo.grafo.aristas) {
    (vecinos[a] as number[]).push(b);
    (vecinos[b] as number[]).push(a);
  }
  const arena = arenaDeLaLiza(d);
  const libre = (i: number): boolean => sePuedeEstar(arena, (nudos[i] as { x: number }).x, (nudos[i] as { z: number }).z, u(0.5));
  const azar = new AzarDeJuguete(semilla);
  const rodeos: Rodeo[] = [];
  const usados = new Set<number>();
  for (let intento = 0; intento < 3000 && rodeos.length < cuantos; intento++) {
    const P = azar.entre(nudos.length);
    if (usados.has(P) || !libre(P)) continue;
    usados.add(P);
    const p = nudos[P] as { x: number; z: number };
    const { dist, siguiente } = caminosHacia(nudos, vecinos, P);
    const valen: Rodeo[] = [];
    for (let S = 0; S < nudos.length; S++) {
      const s = nudos[S] as { x: number; z: number };
      const recta = Math.hypot(s.x - p.x, s.z - p.z) / UNO;
      const calles = dist[S] as number;
      if (recta < 8 || recta > alcance - 1 || !(calles <= 200)) continue;
      let lejos = 0;
      for (let v = S; v >= 0 && v !== P; v = siguiente[v] as number) {
        const q = nudos[v] as { x: number; z: number };
        const r = Math.hypot(q.x - p.x, q.z - p.z) / UNO;
        if (r > lejos) lejos = r;
      }
      if (lejos < alcance + 2 || !libre(S)) continue;
      valen.push({ asiento: P, sale: S, recta, calles, lejos });
    }
    if (valen.length > 0) rodeos.push(valen[azar.entre(valen.length)] as Rodeo);
  }
  return rodeos;
}

/**
 * UNA PERSECUCIÓN QUE RODEA, JUGADA: la declaración de `d` con una zona de un metro en el nudo de salida, un solo
 * grupo de UNA entidad de la clase `claseId` que sale de ella, y el asiento 1, quieto, naciendo en su nudo. Hasta
 * `tics` tics o hasta su primer anuncio contra el asiento; y lo que vio la vigilancia de los NPC.
 */
function jugarElRodeo(d: LizaDeclarada, r: Rodeo, claseId: number, tics: number): { llega: number; paradas: string[]; acercandose: number } {
  const nudos = d.mundo.grafo.nudos;
  const s = nudos[r.sale] as { x: number; z: number };
  const p = nudos[r.asiento] as { x: number; z: number };
  const ids = new Set(d.mundo.zonas.map((z) => z.id));
  const clases = new Set(d.mundo.zonas.map((z) => z.clase));
  let zid = 255;
  while (ids.has(zid)) zid--;
  let zc = 255;
  while (clases.has(zc)) zc--;
  const h = u(0.5);
  const en = d.fase.encuentro;
  if (en === null) throw new Error('el rodeo se juega en una fase con encuentro');
  const unos = en.vivasALaVez.map(() => 1);
  const dd: LizaDeclarada = {
    ...d,
    mundo: {
      ...d.mundo,
      zonas: [...d.mundo.zonas, { id: zid, clase: zc, caja: { x0: s.x - h, z0: s.z - h, x1: s.x + h, z1: s.z + h } }],
      nace: [{ papel: 'asiento', x: p.x, z: p.z, rumbo: 0 }, ...d.mundo.nace],
    },
    fase: {
      ...d.fase,
      encuentro: { ...en, vivasALaVez: unos, relojTics: tics + 200, fin: { tipo: 'vaciar' }, grupos: [{ clase: claseId, cuantos: unos, vivasALaVez: unos, claseDeZona: zc, desdeTic: 0, cadaTics: 0, eleccion: 'azar' }] },
    },
  };
  const problemas = problemasDeLaDeclaracion(dd);
  if (problemas.length > 0) throw new Error(`el rodeo está mal declarado: ${problemas.slice(0, 3).join(' | ')}`);
  const b = new Banco(dd, 777, [new Aparato(1, 3000, 20, 60, 7, quieto)]);
  b.guardarPasos = false;
  b.conectar(1);
  const v = vigilarLosNpc(dd);
  let llega = -1;
  for (let t = 0; t < tics && llega < 0; t++) {
    const paso = b.tic();
    v.mirar(paso.sala);
    for (const x of paso.sucesos) if (x.para === 1 && x.suceso.e === 'anuncio' && x.suceso.a === 1 && x.suceso.de >= PRIMER_NUMERO_DE_ENTIDAD) llega = paso.sala.tic;
  }
  const res = v.resumen();
  return { llega, paradas: res.paradas, acercandose: res.acercandose };
}

/** Todas las de una lista de rodeos, contadas: cuántas llegan, las que no y lo que vio la vigilancia. */
function jugarLosRodeos(d: LizaDeclarada, rodeos: readonly Rodeo[], claseId: number, tics: number): { llegan: number; noLlegan: string[]; paradas: string[]; acercandose: number; peorLlegada: number } {
  let llegan = 0;
  let acercandose = 0;
  let peorLlegada = 0;
  const noLlegan: string[] = [];
  const paradas: string[] = [];
  for (const r of rodeos) {
    const j = jugarElRodeo(d, r, claseId, tics);
    const donde = `asiento en el nudo ${String(r.asiento)}, sale del ${String(r.sale)} (${r.recta.toFixed(1)} en recta, ${r.calles.toFixed(1)} por el grafo, hasta ${r.lejos.toFixed(1)} de camino)`;
    if (j.llega >= 0) {
      llegan++;
      if (j.llega > peorLlegada) peorLlegada = j.llega;
    } else noLlegan.push(donde);
    for (const x of j.paradas) paradas.push(`${donde}: ${x}`);
    acercandose += j.acercandose;
  }
  return { llegan, noLlegan, paradas, acercandose, peorLlegada };
}

/**
 * LA DECLARACIÓN `l` CON L10: la suya si su productor declara el alcance de blanco de su clase 1 y el olvido
 * de su encuentro; si no (la entrega 1 de El Quiebro no los declara: sus encuentros siguen a la plaza), con los
 * números del diseño de la ciudad abierta (§3.4: 45 m de alcance a todas las clases, y 90 m en 10 s de olvido),
 * que son los que vuelven con la travesía. Lo que se prueba es la sala con L10 en SU ciudad, no el número.
 */
function conL10(l: LizaDeclarada): { liza: LizaDeclarada; delProductor: boolean } {
  const en = l.fase.encuentro;
  if (en === null) throw new Error('L10 se pone en una fase con encuentro');
  const clase1 = l.clases.find((c) => c.id === 1);
  if (clase1 !== undefined && alcanceDeBlancoDe(clase1.cerebro) > 0 && olvidoDelEncuentro(en) !== null) return { liza: l, delProductor: true };
  return {
    liza: {
      ...l,
      clases: l.clases.map((c) => ({ ...c, cerebro: { ...c.cerebro, alcanceDeBlanco: u(45) } })),
      fase: { ...l.fase, encuentro: { ...en, olvido: { distancia: u(90), tics: 200 } } },
    },
    delProductor: false,
  };
}

/**
 * EL QUE HUYE POR LAS CALLES (la revisión de la entrega 1 lo llamó así): elige un nudo del grafo a 60-200 en
 * recta de donde está —con un congruencial de su semilla— y va a él por el camino más corto del grafo, nudo a
 * nudo; al llegar, otro. Es el que deja atrás a lo que lo persigue y lo hace rodear manzanas: con él la
 * revisión vio de dos a diez entidades paradas en la franja entre el alcance y el olvido por combate.
 */
function huidorPorElGrafo(d: LizaDeclarada, semilla: number): Robot {
  const nudos = d.mundo.grafo.nudos;
  const vecinos: number[][] = nudos.map(() => []);
  for (const [a, b] of d.mundo.grafo.aristas) {
    (vecinos[a] as number[]).push(b);
    (vecinos[b] as number[]).push(a);
  }
  let s = semilla >>> 0;
  let camino: number[] = [];
  const cercano = (x: number, z: number): number => {
    let m = 0;
    let md = Number.POSITIVE_INFINITY;
    for (let i = 0; i < nudos.length; i++) {
      const n = nudos[i] as { x: number; z: number };
      const dd = (n.x - x) * (n.x - x) + (n.z - z) * (n.z - z);
      if (dd < md) {
        md = dd;
        m = i;
      }
    }
    return m;
  };
  return (a) => {
    if (camino.length === 0) {
      for (let k = 0; k < 50 && camino.length === 0; k++) {
        s = (Math.imul(s, 1103515245) + 12345) >>> 0;
        const i = (s >>> 4) % nudos.length;
        const n = nudos[i] as { x: number; z: number };
        const r = Math.hypot(n.x - a.x, n.z - a.z) / UNO;
        if (r < 60 || r > 200) continue;
        const { siguiente } = caminosHacia(nudos, vecinos, i);
        for (let v = cercano(a.x, a.z); v >= 0 && camino.length < 5000; v = siguiente[v] as number) {
          camino.push(v);
          if (v === i) break;
        }
      }
    }
    while (camino.length > 0) {
      const n = nudos[camino[0] as number] as { x: number; z: number };
      if (Math.abs(n.x - a.x) + Math.abs(n.z - a.z) < u(0.4)) camino.shift();
      else break;
    }
    const n = camino.length > 0 ? (nudos[camino[0] as number] as { x: number; z: number }) : null;
    a.meta = n === null ? null : { x: n.x, z: n.z };
  };
}

/**
 * UN COMBATE CON TODOS HUYENDO POR LAS CALLES (`huidorPorElGrafo`; el segundo, a 6,5 u/s): hasta `tics` tics o
 * hasta que el encuentro se resuelva, con la vigilancia de los NPC mirando cada tic.
 */
function jugarHuyendo(d: LizaDeclarada, semilla: number, tics: number): { tics: number; paradas: string[]; peorParada: number; acercandose: number; olvidadas: number } {
  const aparatos: Aparato[] = [];
  for (let i = 1; i <= d.asientos.length; i++) {
    const ap = new Aparato(i, 2000 * i, 15 * i, 50 + 35 * i, (11 * i) % 50, huidorPorElGrafo(d, semilla * 97 + i));
    if (i === 2) ap.velocidad = u(6.5);
    aparatos.push(ap);
  }
  const b = new Banco(d, d.fase.semilla, aparatos);
  b.guardarPasos = false;
  for (let i = 1; i <= d.asientos.length; i++) b.conectar(i);
  const v = vigilarLosNpc(d);
  let olvidadas = 0;
  let t = 0;
  for (; t < tics; t++) {
    const p = b.tic();
    v.mirar(p.sala);
    for (const x of p.sucesos) if (x.para === 0 && x.suceso.e === 'seva' && x.suceso.por === MOTIVO_DE_IRSE.disuelta && p.sala.encuentro?.resultado === null) olvidadas++;
    if (p.sala.encuentro !== null && p.sala.encuentro.resultado !== null) break;
  }
  const r = v.resumen();
  return { tics: t, paradas: r.paradas, peorParada: r.peorParada, acercandose: r.acercandose, olvidadas };
}

{
  /* ── En la ciudad de juguete, las que rodean una manzana llegan ─────────── */
  {
    const d = lizaAbierta({ semilla: 3, asientos: 1, alcanceDeBlanco: ALCANCE_DE_LA_ABIERTA, olvido: OLVIDO_DE_LA_ABIERTA });
    const rodeos = rodeosDelGrafo(d, ALCANCE_DE_LA_ABIERTA / UNO, 16, 5);
    const j = jugarLosRodeos(d, rodeos, 2, 1400);
    nota(
      `la ciudad de juguete: ${rodeos.length} persecuciones que rodean (de ${Math.min(...rodeos.map((x) => x.recta)).toFixed(1)} a ${Math.max(...rodeos.map((x) => x.recta)).toFixed(1)} en recta, ` +
        `hasta ${Math.max(...rodeos.map((x) => x.lejos)).toFixed(1)} de camino); llegan ${j.llegan}, la última en el tic ${j.peorLlegada}; ${j.acercandose} tics acercándose sin blanco`,
    );
    comprobar(
      'en la ciudad de juguete, la entidad que persigue a un asiento a su alcance en recta pero cuyo camino por las calles se aleja más allá de él (rodea una manzana) LLEGA a anunciarle, en todas, sin quedarse parada en la esquina',
      rodeos.length >= 12 && j.llegan === rodeos.length && j.paradas.length === 0 && j.acercandose >= 100,
      { rodeos: rodeos.length, llegan: j.llegan, noLlegan: j.noLlegan.slice(0, 4), paradas: j.paradas.slice(0, 4), acercandose: j.acercandose },
    );
  }

  /* ── Un mundo nuevo no deja a nadie dentro de una caja ──────────────────── */
  {
    const CAJA_NUEVA = { x0: 5, z0: -4, x1: 7, z1: -2 };
    const META = { x: u(6), z: u(-3) };
    const conLaCaja = (d: LizaDeclarada): LizaDeclarada => ({
      ...d,
      mundo: { ...d.mundo, suelo: { ...d.mundo.suelo, cuerpos: [...d.mundo.suelo.cuerpos, CAJA_NUEVA] }, clasesDeCaja: [...d.mundo.clasesDeCaja, 1] },
    });
    const dA = juguete({ asientos: 1, modo: 'calma', clave: 'n1-a' });
    const radio = (dA.asientos[0] as ReglasDeAsiento).cuerpo.radio;
    /*
     * El asiento anda a (6, −3), libre en el mundo de la fase A, y llega la vista nueva: `otra` es la fase B con
     * la caja (5, −4)-(7, −2) encima de él; `misma` es la fase A con esa caja (el mundo cambia sin cambiar la
     * fase). En las dos, al tomarla tiene que quedar en su sitio de nacer, donde cabe, avisado con un `corrige`,
     * y desde ahí andar sin que se le corrija nada.
     */
    const jugar = (nueva: LizaDeclarada): { llego: boolean; cabeAntes: boolean; cabeDespues: boolean; enSuSitio: boolean; corrigeAlTomar: number; corrigeAndando: number; anda: number } => {
      let meta: { x: number; z: number } | null = META;
      const robot: Robot = (a) => {
        a.meta = meta;
      };
      const b = new Banco(dA, 5, [new Aparato(1, 1000, 0, 100, 17, robot)]);
      b.guardarPasos = false;
      b.conectar(1);
      for (let i = 0; i < 160; i++) b.tic();
      const a0 = b.sala.asientos[0] as EstadoDeLaSala['asientos'][number];
      const llego = Math.abs(a0.x - META.x) + Math.abs(a0.z - META.z) < u(0.5);
      const cabeAntes = sePuedeEstar(arenaDeLaLiza(dA), a0.x, a0.z, radio);
      meta = null;
      b.meter(b.k * 50 + 1, { tipo: 'vista', declaracion: nueva });
      let corrigeAlTomar = 0;
      for (let i = 0; i < 10; i++) corrigeAlTomar += b.tic().correcciones.length;
      const a1 = b.sala.asientos[0] as EstadoDeLaSala['asientos'][number];
      const nace = nueva.mundo.nace.find((x) => x.papel === 'asiento') as { x: number; z: number };
      const cabeDespues = sePuedeEstar(arenaDeLaLiza(nueva), a1.x, a1.z, radio);
      const enSuSitio = a1.x === nace.x && a1.z === nace.z;
      meta = { x: u(0), z: u(-12) };
      let corrigeAndando = 0;
      for (let i = 0; i < 60; i++) corrigeAndando += b.tic().correcciones.length;
      const a2 = b.sala.asientos[0] as EstadoDeLaSala['asientos'][number];
      const anda = Math.hypot(a2.x - a1.x, a2.z - a1.z) / UNO;
      return { llego, cabeAntes, cabeDespues, enSuSitio, corrigeAlTomar, corrigeAndando, anda };
    };
    const otra = jugar(conLaCaja(juguete({ asientos: 1, modo: 'calma', clave: 'n1-b' })));
    const misma = jugar(conLaCaja(dA));
    const bien = (x: ReturnType<typeof jugar>): boolean => x.llego && x.cabeAntes && x.cabeDespues && x.enSuSitio && x.corrigeAlTomar >= 1 && x.corrigeAndando === 0 && x.anda >= 2;
    comprobar(
      'una FASE NUEVA con una caja encima del sitio del asiento lo saca a su sitio de nacer (con su `corrige`), donde cabe, y desde ahí anda sin correcciones',
      problemasDeLaDeclaracion(conLaCaja(juguete({ asientos: 1, modo: 'calma', clave: 'n1-b' }))).length === 0 && bien(otra),
      otra,
    );
    comprobar('y el MISMO mundo cambiado sin cambiar la fase, también', problemasDeLaDeclaracion(conLaCaja(dA)).length === 0 && bien(misma), misma);
  }

  /* ── Con El Quiebro: su ciudad y sus noches ─────────────────────────────── */
  if (HAY_QUIEBRO) {
    const productor = (await import(pathToFileURL(RUTA_DEL_PRODUCTOR).href)) as { lizaDelQuiebro: (vista: unknown, codigo: string) => LizaDeclarada | null };
    const robotDeLaMesa = (await import(pathToFileURL(RUTA_DEL_ROBOT).href)) as {
      jugarAlQuiebro: (o: { asientos: number; semilla: number; noches: number; politica: 'gana' | 'pierde' | 'mezcla'; travesuras: boolean }) => { vistas: readonly unknown[] };
    };
    type VistaLeida = { noche: { numero: number } | null; fase: { tipo: string } };

    /* Las persecuciones que rodean, en la ciudad de verdad, con su Prestado (la clase 1) y su alcance. */
    const partida = robotDeLaMesa.jugarAlQuiebro({ asientos: 1, semilla: 5, noches: 1, politica: 'gana', travesuras: false });
    let oleada: LizaDeclarada | null = null;
    for (const v of partida.vistas) {
      const l = productor.lizaDelQuiebro(v, 'K7M2P');
      if (oleada === null && l !== null && l.fase.modo === 'encuentro' && l.fase.encuentro !== null && (v as VistaLeida).fase.tipo === 'oleada') oleada = l;
    }
    /* Con el alcance y el olvido que declare su productor, o con los del diseño si no los declara (ver `conL10`). */
    const puesta = oleada === null ? null : conL10(oleada);
    const conElL10 = puesta === null ? null : puesta.liza;
    const delProductor = puesta !== null && puesta.delProductor;
    const prestadoConL10 = conElL10?.clases.find((c) => c.id === 1);
    const alcance = prestadoConL10 === undefined ? 0 : alcanceDeBlancoDe(prestadoConL10.cerebro) / UNO;
    const rodeos = conElL10 === null || alcance <= 0 ? [] : rodeosDelGrafo(conElL10, alcance, 16, 7);
    const j = conElL10 === null ? { llegan: 0, noLlegan: [], paradas: [], acercandose: 0, peorLlegada: 0 } : jugarLosRodeos(conElL10, rodeos, 1, 1400);
    const deQuien = delProductor ? 'L10 de su productor' : 'L10 con los números del diseño: su productor no lo declara en esta entrega';
    nota(
      `la ciudad de El Quiebro (${conElL10?.mundo.grafo.nudos.length ?? 0} nudos, alcance ${alcance} m, ${deQuien}): ${rodeos.length} persecuciones que rodean, ` +
        `hasta ${rodeos.length > 0 ? Math.max(...rodeos.map((x) => x.lejos)).toFixed(1) : '0'} m de camino; llegan ${j.llegan}, la última en el tic ${j.peorLlegada}`,
    );
    comprobar(
      'en la ciudad de El Quiebro, el Prestado que persigue a un asiento a su alcance en recta pero cuyo camino rodea la manzana LLEGA a anunciarle, en todas, sin quedarse parado en la esquina',
      rodeos.length >= 12 && j.llegan === rodeos.length && j.paradas.length === 0,
      { rodeos: rodeos.length, llegan: j.llegan, noLlegan: j.noLlegan.slice(0, 4), paradas: j.paradas.slice(0, 4) },
    );

    /*
     * Los combates de verdad con TODOS HUYENDO POR LAS CALLES (`huidorPorElGrafo`), como los jugó la revisión:
     * con la primera versión, de dos a diez entidades paradas por combate en la franja, la peor 1.868 tics. Las
     * tres fases de la revisión donde más salían (la oleada 3 con seis asientos, la 2 con cuatro, y la Llamada
     * con seis), con su L10 o con el del diseño; la vigilancia de los NPC mira cada tic.
     */
    const huidas: { nombre: string; tics: number; paradas: string[]; peorParada: number; acercandose: number; olvidadas: number }[] = [];
    for (const [nombre, asientos, semilla, tipo, numero] of [
      ['oleada 3, 6 asientos', 6, 11, 'oleada', 3],
      ['oleada 2, 4 asientos', 4, 77, 'oleada', 2],
      ['la Llamada, 6 asientos', 6, 91, 'llamada', 0],
    ] as const) {
      const pj = robotDeLaMesa.jugarAlQuiebro({ asientos, semilla, noches: 2, politica: 'gana', travesuras: false });
      let fase: LizaDeclarada | null = null;
      for (const v of pj.vistas) {
        const vl = v as VistaLeida & { fase: { oleada?: number } };
        if (fase !== null || vl.fase.tipo !== tipo || (tipo === 'oleada' && vl.fase.oleada !== numero)) continue;
        const l = productor.lizaDelQuiebro(v, 'K7M2P');
        if (l !== null && l.fase.encuentro !== null) fase = l;
      }
      if (fase === null) continue;
      const d = conL10(fase).liza;
      if (problemasDeLaDeclaracion(d).length > 0) continue;
      huidas.push({ nombre, ...jugarHuyendo(d, semilla, 2400) });
    }
    const paradasHuyendo = huidas.flatMap((h) => h.paradas.map((x) => `${h.nombre}: ${x}`));
    const acercandoseHuyendo = huidas.reduce((s, h) => s + h.acercandose, 0);
    nota(
      `la ciudad de El Quiebro con todos huyendo por las calles (${deQuien}): ` +
        huidas.map((h) => `${h.nombre}, ${h.tics} tics, ${h.olvidadas} olvidadas, la racha parada más larga ${h.peorParada}, ${h.acercandose} tics acercándose`).join('; '),
    );
    comprobar(
      'en los combates de El Quiebro con todos huyendo por las calles, ninguna entidad pasa más de 3 s parada sin nadie a su alcance y con alguien a la distancia del olvido: la que se queda sin blanco acompañada se ACERCA (y se vio acercarse)',
      huidas.length === 3 && paradasHuyendo.length === 0 && acercandoseHuyendo >= 1000,
      { jugadas: huidas.length, paradas: paradasHuyendo.slice(0, 6), acercandose: acercandoseHuyendo },
    );

    /*
     * Las noches de verdad: la pausa de la noche n (límite ciudad) y la Bajada de la n + 1 (la plaza nueva). Se
     * busca, con un paso de 1 m, un sitio de esa plaza libre en el mundo de la pausa y dentro de una caja en el de
     * la Bajada; el asiento nace ahí en la pausa (se puede estar), llega la vista de la Bajada, y tiene que quedar
     * donde cabe y andar. Se paran las semillas al tercer caso.
     *
     * Con la ciudad abierta la ciudad de una mesa es LA MISMA todas las noches (`docs/quiebro/CIUDAD-ABIERTA.md`),
     * así que el cambio de noche ya no pone cajas nuevas y la búsqueda sale en cero. El caso no ha dejado de poder
     * darse —cualquier vista que cambie el suelo bajo un asiento lo da, y la ciudad crecerá a 828 m—, así que si
     * las noches no lo traen se FABRICA sobre una pareja de verdad: la misma Bajada con una caja de 2 m más, puesta
     * encima de un sitio libre de su plaza con sitio libre alrededor. Contar cero casos y darlo por bueno sería
     * un verde que no mira nada.
     */
    let casos = 0;
    let buscadas = 0;
    let fabricados = 0;
    const malos: unknown[] = [];
    const parejas: { semilla: number; noche: number; pausa: LizaDeclarada; bajada: LizaDeclarada }[] = [];
    const probarElCambio = (pausa: LizaDeclarada, bajada: LizaDeclarada, sitio: { x: number; z: number }, quien: { semilla: number; noche: number; fabricado: boolean }): { x: number; z: number } => {
      const arB = arenaDeLaLiza(bajada);
      const radio = (bajada.asientos[0] as ReglasDeAsiento).cuerpo.radio;
      const aqui: LizaDeclarada = { ...pausa, mundo: { ...pausa.mundo, nace: [{ papel: 'asiento', x: sitio.x, z: sitio.z, rumbo: 0 }, ...pausa.mundo.nace] } };
      let meta: { x: number; z: number } | null = null;
      const robot: Robot = (a) => {
        a.meta = meta;
      };
      const b = new Banco(aqui, 5, [new Aparato(1, 3000, 20, 60, 7, robot)]);
      b.guardarPasos = false;
      b.conectar(1);
      for (let t = 0; t < 40; t++) b.tic();
      const a0 = b.sala.asientos[0] as EstadoDeLaSala['asientos'][number];
      const enElSitio = a0.x === sitio.x && a0.z === sitio.z;
      b.meter(b.k * 50 + 1, { tipo: 'vista', declaracion: bajada });
      for (let t = 0; t < 20; t++) b.tic();
      const a1 = b.sala.asientos[0] as EstadoDeLaSala['asientos'][number];
      const queda = { x: a1.x, z: a1.z };
      const cabe = sePuedeEstar(arB, a1.x, a1.z, radio);
      let andado = 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const desde = b.sala.asientos[0] as EstadoDeLaSala['asientos'][number];
        meta = { x: desde.x + dx * 6 * UNO, z: desde.z + dz * 6 * UNO };
        for (let t = 0; t < 40; t++) b.tic();
        const hasta = b.sala.asientos[0] as EstadoDeLaSala['asientos'][number];
        const d = Math.hypot(hasta.x - desde.x, hasta.z - desde.z) / UNO;
        if (d > andado) andado = d;
      }
      if (!enElSitio || !cabe || andado < 2) malos.push({ ...quien, sitio: { x: sitio.x / UNO, z: sitio.z / UNO }, enElSitio, cabe, andado, queda: { x: queda.x / UNO, z: queda.z / UNO } });
      return queda;
    };
    for (let semilla = 1; semilla <= 12 && casos < 3; semilla++) {
      const pj = robotDeLaMesa.jugarAlQuiebro({ asientos: 1, semilla, noches: 4, politica: 'gana', travesuras: false });
      const pausas = new Map<number, LizaDeclarada>();
      const bajadas = new Map<number, LizaDeclarada>();
      for (const v of pj.vistas) {
        const vl = v as VistaLeida;
        if (vl.noche === null) continue;
        const n = vl.noche.numero;
        if (vl.fase.tipo === 'pausa' && !pausas.has(n)) {
          const l = productor.lizaDelQuiebro(v, 'K7M2P');
          if (l !== null) pausas.set(n, l);
        }
        if (vl.fase.tipo === 'bajada' && !bajadas.has(n)) {
          const l = productor.lizaDelQuiebro(v, 'K7M2P');
          if (l !== null) bajadas.set(n, l);
        }
      }
      for (const [n, pausa] of pausas) {
        const bajada = bajadas.get(n + 1);
        if (bajada === undefined || casos >= 3) continue;
        buscadas++;
        parejas.push({ semilla, noche: n, pausa, bajada });
        const arA = arenaDeLaLiza(pausa);
        const arB = arenaDeLaLiza(bajada);
        const radio = (bajada.asientos[0] as ReglasDeAsiento).cuerpo.radio;
        const lim = bajada.mundo.limites.find((x) => x.id === bajada.fase.limite);
        if (lim === undefined) continue;
        let sitio: { x: number; z: number } | null = null;
        for (let x = lim.caja.x0; x <= lim.caja.x1 && sitio === null; x += UNO) {
          for (let z = lim.caja.z0; z <= lim.caja.z1; z += UNO) {
            if (sePuedeEstar(arA, x, z, radio) && !sePuedeEstar(arB, x, z, radio)) {
              sitio = { x, z };
              break;
            }
          }
        }
        if (sitio === null) continue;
        casos++;
        probarElCambio(pausa, bajada, sitio, { semilla, noche: n, fabricado: false });
      }
    }
    /*
     * El caso fabricado: en cada pareja, el primer sitio de la plaza de la Bajada (paso de 1 m) libre en los dos
     * mundos y con 4 m libres a los cuatro lados —para que haya adónde echarlo—, lejos de los sitios de nacer, se
     * tapa con una caja alta de 2 × 2 m. La Bajada así tiene que seguir siendo una declaración sin problemas; si
     * no, se prueba el siguiente sitio. Se exige además que el asiento SE MUEVA: si quedara en el sitio, la caja
     * no lo habría tapado y el caso no probaría nada.
     */
    const movidos: string[] = [];
    for (let i = 0; i < parejas.length && casos + fabricados < 1; i++) {
      const { semilla, noche, pausa, bajada } = parejas[i] as (typeof parejas)[number];
      const arA = arenaDeLaLiza(pausa);
      const arB = arenaDeLaLiza(bajada);
      const radio = (bajada.asientos[0] as ReglasDeAsiento).cuerpo.radio;
      const lim = bajada.mundo.limites.find((x) => x.id === bajada.fase.limite);
      if (lim === undefined) continue;
      const libre = (x: number, z: number): boolean => sePuedeEstar(arA, x, z, radio) && sePuedeEstar(arB, x, z, radio);
      const lejosDeNacer = (x: number, z: number): boolean =>
        bajada.mundo.nace.every((s) => Math.abs(s.x - x) > 4 * UNO || Math.abs(s.z - z) > 4 * UNO) &&
        pausa.mundo.nace.every((s) => Math.abs(s.x - x) > 4 * UNO || Math.abs(s.z - z) > 4 * UNO);
      for (let x = lim.caja.x0 + 4 * UNO; x <= lim.caja.x1 - 4 * UNO && casos + fabricados < 1; x += UNO) {
        for (let z = lim.caja.z0 + 4 * UNO; z <= lim.caja.z1 - 4 * UNO; z += UNO) {
          if (!libre(x, z) || !lejosDeNacer(x, z)) continue;
          if (![[4, 0], [-4, 0], [0, 4], [0, -4]].every(([dx, dz]) => libre(x + (dx as number) * UNO, z + (dz as number) * UNO))) continue;
          const caja = { x0: x / UNO - 1, z0: z / UNO - 1, x1: x / UNO + 1, z1: z / UNO + 1 };
          const tapada: LizaDeclarada = {
            ...bajada,
            mundo: {
              ...bajada.mundo,
              suelo: { ...bajada.mundo.suelo, cuerpos: [...bajada.mundo.suelo.cuerpos, caja] },
              clasesDeCaja: [...bajada.mundo.clasesDeCaja, CLASE_DE_CAJA.alta],
            },
          };
          if (sePuedeEstar(arenaDeLaLiza(tapada), x, z, radio)) continue;
          if (problemasDeLaDeclaracion(tapada).length > 0) continue;
          fabricados++;
          const queda = probarElCambio(pausa, tapada, { x, z }, { semilla, noche, fabricado: true });
          const movido = Math.hypot(queda.x - x, queda.z - z) / UNO;
          movidos.push(`semilla ${semilla}, noche ${noche}: tapado en (${x / UNO}, ${z / UNO}), queda a ${movido.toFixed(2)} m`);
          if (movido < radio / UNO) malos.push({ semilla, noche, fabricado: true, queda: { x: queda.x / UNO, z: queda.z / UNO }, porque: 'no se movió: la caja no lo tapaba' });
          break;
        }
      }
    }
    nota(
      `las noches de verdad de El Quiebro: ${buscadas} cambios de noche mirados, ${casos} con un sitio de la plaza nueva que la noche de antes estaba libre y ésta es caja` +
        (fabricados > 0 ? `; ${fabricados} fabricado (${movidos.join('; ')})` : ''),
    );
    comprobar(
      'con las noches de verdad de El Quiebro, el asiento que acaba una noche donde la Bajada de la siguiente pone una caja empieza donde cabe y anda (al menos un caso visto, de las noches o fabricado sobre una de ellas)',
      casos + fabricados >= 1 && malos.length === 0,
      { casos, fabricados, buscadas, malos: malos.slice(0, 4) },
    );
  }
}

/*
 * El suelo: 139 comprobaciones de la Liza sola, más las del ausente (bloque 19), las del pulido (20),
 * las de la línea de apuntado (21), las de su revisión (22), las de la Liza por dentro (23), las de L10
 * (24) y las de la revisión de la entrega 1 (25), y las de El Quiebro si su productor está (el bloque 16
 * lo dice en su nota cuando no). Escrito exacto: un bloque que deja de correr lo baja del suelo.
 */

/* ═══════════════════════════════════════════════════════════════════════════
 * 17 · LO QUE LAS PRUEBAS DE ARRIBA DABAN POR SUPUESTO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Cada una de éstas prueba una cosa que las de arriba USAN sin mirarla: si se rompiera, alguna de
 * arriba seguiría en verde por otro camino.
 */

paso('17 · La foto, los presentes, los relojes de cada destinatario y el alargue del comp');
{
  const d = juguete({ presentes: 1 });
  const b = new Banco(d, 3, [new Aparato(1, 1000, 0, 100, 13, quieto), new Aparato(2, 777777, 0, 250, 31, quieto)]);
  b.conectar(1);
  b.conectar(2);
  let fotosBien = true;
  for (let i = 0; i < 40; i++) {
    const p = b.tic();
    const tocaFoto = p.sala.tic % 2 === 0;
    if (tocaFoto !== (p.fotoDebida !== null)) fotosBien = false;
    if (p.fotoDebida !== null) {
      const vivas = p.sala.entidades.filter((e) => e.cerebro.modo !== 'deshecha').length;
      if (p.fotoDebida.length !== 2 + vivas) fotosBien = false;
    }
  }
  comprobar('la foto sale en los tics pares y sólo en ellos, con todos los asientos y todas las entidades que están', fotosBien);
  comprobar(
    'el encuentro se escala con los PRESENTES que declara (1), no con los canales abiertos (2)',
    b.sala.encuentro !== null && b.sala.encuentro.presentes === 1 && b.sala.encuentro.grupos[0]!.total === 4,
    b.sala.encuentro?.grupos,
  );
  let dosRelojes: { t1: number; t2: number; impactoMs: number } | null = null;
  for (let i = 0; i < 300 && dosRelojes === null; i++) {
    const p = b.tic();
    for (const s of p.sucesos) {
      if (s.suceso.e !== 'anuncio' || s.para !== 1) continue;
      const id = s.suceso.id;
      const otro = p.sucesos.find((x) => x.para === 2 && x.suceso.e === 'anuncio' && x.suceso.id === id);
      const an = p.sala.anuncios.find((x) => x.id === id);
      if (otro !== undefined && otro.suceso.e === 'anuncio' && an !== undefined) dosRelojes = { t1: s.suceso.t, t2: otro.suceso.t, impactoMs: an.impactoMs };
    }
  }
  comprobar(
    'el MISMO anuncio sale una vez por destinatario, cada uno con el impacto en su propio reloj',
    dosRelojes !== null && dosRelojes.t1 === dosRelojes.impactoMs + 1000 && dosRelojes.t2 === dosRelojes.impactoMs + 777777,
    dosRelojes,
  );
  const alargue = (rtt: number): number => {
    const bb = bancoDeUno(lizaDelDuelo(), new Aparato(1, 5000, 0, rtt, 17, quieto));
    for (let i = 0; i < 200; i++) {
      bb.tic();
      const an = bb.sala.anuncios.find((x) => x.a === 1 && x.de >= 16);
      if (an !== undefined) return an.impactoEnTic - an.lanzadoEnTic;
    }
    return -1;
  };
  const corto = alargue(50);
  const largo = alargue(250);
  comprobar('el golpe de una entidad se alarga en el comp de su blanco: 11 tics y 1 con 50 ms de red, 11 y 3 con 250', corto === 12 && largo === 14, { corto, largo });
}

paso('17 · Soltar la esquiva para golpear, la línea de vista del enganche y el intocable de quien aparece');
{
  const d = lizaDelDuelo({ clase: saco() });
  const golpeTrasEsquiva = (despues: number): { lanzada: boolean; libre: boolean } => {
    const m = new Mano(d);
    while (m.sala.entidades.length === 0 || m.sala.entidades[0]!.cerebro.modo === 'aparecer') m.esperar(1);
    const blanco = m.sala.entidades[0]!.numero;
    const t = m.sala.tic + 1;
    m.ir(m.yo.x, m.yo.z, { id: A.esquiva, msDelAparato: t * 50, blanco: 0 });
    for (let i = 1; i < despues; i++) m.ir(m.yo.x, m.yo.z);
    const tp = m.sala.tic + 1;
    m.ir(m.yo.x, m.yo.z, { id: A.entrada, msDelAparato: tp * 50, blanco });
    let lanzada = false;
    let libre = false;
    for (let i = 0; i < 8; i++) {
      const p = m.ir(m.yo.x, m.yo.z);
      if (m.sala.anuncios.some((an) => an.de === 1)) lanzada = true;
      if (p.sucesos.some((s) => s.suceso.e === 'estado' && s.suceso.a === 1 && s.suceso.est === 0)) libre = true;
    }
    if (m.sala.anuncios.some((an) => an.de === 1)) lanzada = true;
    return { lanzada, libre };
  };
  const pronto = golpeTrasEsquiva(2);
  const guardado = golpeTrasEsquiva(4);
  comprobar(
    'dentro de la esquiva no se golpea hasta su tic soltable: pulsada 2 tics dentro se pierde; 4 tics dentro se guarda y sale en el 6, y la esquiva se suelta',
    !pronto.lanzada && guardado.lanzada && guardado.libre,
    { pronto, guardado },
  );

  const tapado = (x: number): number => {
    const dd = juguete({ asientos: 1, clase: sacoQuieto(), grupos: (n) => [grupoFijo(n, 1, 9)], zonasExtra: [{ id: 9, clase: 9, caja: caja(x - 0.1, 9.4, x + 0.1, 9.6) }], nace: [{ x, z: 2.5 }] });
    const m = new Mano(dd);
    m.esperar(15);
    const e = m.sala.entidades[0];
    if (e === undefined) return -1;
    const p = m.ir(m.yo.x, m.yo.z, { id: A.entrada, msDelAparato: (m.sala.tic + 1) * 50, blanco: e.numero });
    const an = p.sucesos.find((s) => s.suceso.e === 'anuncio' && s.suceso.de === 1);
    return an !== undefined && an.suceso.e === 'anuncio' ? an.suceso.a : -1;
  };
  const conQuiosco = tapado(0);
  const sinQuiosco = tapado(4);
  comprobar('el enganche a 7 m se acepta con línea de vista y se rechaza con el quiosco en medio (el golpe sale al aire)', sinQuiosco >= 16 && conQuiosco === 0, { conQuiosco, sinQuiosco });

  const m = new Mano(d);
  while (m.sala.entidades.length === 0) m.esperar(1);
  const recienNacida = m.sala.entidades[0]!.numero;
  m.ir(m.yo.x, m.yo.z, { id: A.entrada, msDelAparato: (m.sala.tic + 1) * 50, blanco: recienNacida });
  let r = -1;
  for (let i = 0; i < 12 && r < 0; i++) {
    const p = m.ir(m.yo.x, m.yo.z);
    const res = p.sucesos.find((s) => s.suceso.e === 'resuelve');
    if (res !== undefined && res.suceso.e === 'resuelve') r = res.suceso.r;
  }
  comprobar('lo que acaba de aparecer es intocable mientras se imprime: el golpe sale esquivado', r === RESULTADO.esquivada, NOMBRE_DEL_RESULTADO[r] ?? r);
}

paso('17 · El grafo, el trasvase y la reimpresión');
{
  const perseguidora = (grafo: boolean): { llega: number; nudos: number } => {
    const c = clase({ acciones: [], guardia: null, alCaer: { tipo: 'irse' }, cerebro: { distanciaMinima: u(0.9), distanciaMaxima: u(1.5), decideCadaTics: 4, costeCuerpoACuerpo: 1, costeDisparo: 1, sigueElGrafo: grafo } });
    const dd = juguete({ asientos: 1, clase: c, grupos: (n) => [grupoFijo(n, 1, 9)], zonasExtra: [{ id: 9, clase: 9, caja: caja(-10.1, 6.9, -9.9, 7.1) }], nace: [{ x: -10, z: 13 }] });
    const bb = bancoDeUno(dd, new Aparato(1, 5000, 0, 100, 17, quieto));
    let nudos = 0;
    for (let i = 0; i < 300; i++) {
      bb.tic();
      const e = bb.sala.entidades[0];
      if (e !== undefined && e.cerebro.nudo >= 0) nudos++;
      if (e !== undefined && Math.abs(e.x - u(-10)) + Math.abs(e.z - u(13)) < u(2)) return { llega: bb.k, nudos };
    }
    return { llega: -1, nudos };
  };
  const conGrafo = perseguidora(true);
  const sinGrafo = perseguidora(false);
  comprobar(
    'con el muro en medio y sin línea de vista, la que sigue el grafo va por sus nudos y llega; la que no, nunca pisa un nudo (resbala contra el muro)',
    conGrafo.llega > 0 && conGrafo.nudos > 0 && sinGrafo.nudos === 0,
    { conGrafo, sinGrafo },
  );

  /*
   * RONDAR ES ESPERAR TURNO, NO QUEDARSE QUIETO (lo encontró la revisión del frente con las declaraciones
   * de un juego de verdad). Una que ronda entre 1,3 y 2,2 m con un golpe de 1,1 se quedaba a 1,25 m de un
   * asiento quieto sin atacar nunca; y un tirador que se paraba en su banda detrás de una caja no volvía a
   * buscar la línea de vista. Las dos, contra un asiento que no se mueve.
   */
  const primerAtaque = (c: ClaseDeEntidad, zona: { x0: number; z0: number; x1: number; z1: number }, nace: { x: number; z: number }): { anuncio: number; bala: number } => {
    const dd = juguete({ asientos: 1, clase: c, grupos: (n) => [grupoFijo(n, 1, 9)], zonasExtra: [{ id: 9, clase: 9, caja: caja(zona.x0, zona.z0, zona.x1, zona.z1) }], nace: [nace] });
    const bb = bancoDeUno(dd, new Aparato(1, 5000, 0, 100, 17, quieto));
    bb.guardarPasos = false;
    let anuncio = -1;
    let bala = -1;
    for (let i = 0; i < 400 && anuncio < 0 && bala < 0; i++) {
      const p = bb.tic();
      for (const s of p.sucesos) {
        if (s.para === 1 && s.suceso.e === 'anuncio' && s.suceso.a === 1 && anuncio < 0) anuncio = p.sala.tic;
        if (s.para === 1 && s.suceso.e === 'bala' && bala < 0) bala = p.sala.tic;
      }
    }
    return { anuncio, bala };
  };
  const bandaAncha = clase({ guardia: null, acciones: [accion(A.golpe, { anuncioTics: 11, enganche: null, alFallar: null, efecto: efecto(1, null) })], cerebro: { distanciaMinima: u(1.3), distanciaMaxima: u(2.2), decideCadaTics: 4, costeCuerpoACuerpo: 1, costeDisparo: 1, sigueElGrafo: true } });
  const deBanda = primerAtaque(bandaAncha, { x0: -0.1, z0: -3.1, x1: 0.1, z1: -2.9 }, { x: 0, z: -8 });
  comprobar('una entidad que ronda entre 1,3 y 2,2 m con un golpe de 1,1 se acerca a su alcance cuando tiene turno, y ataca a quien no se mueve', deBanda.anuncio > 0, deBanda);
  /* El asiento justo detrás del quiosco; el tirador sale delante, dentro de su banda y sin verlo. */
  const tras = primerAtaque(claseTiradora({ guardia: null, acciones: [] }), { x0: -0.1, z0: 1.9, x1: 0.1, z1: 2.1 }, { x: 0, z: 9.5 });
  comprobar('un tirador que se queda en su banda sin línea de vista (el quiosco en medio) se mueve hasta ver a su blanco, y dispara', tras.bala > 0, tras);

  const base = clase();
  const alCaerDebil = base.alCaer.tipo === 'rematable' ? { ...base.alCaer, siNo: { ...base.alCaer.siNo, vida: 10 } } : base.alCaer;
  const debil = clase({ vida: 10, acciones: [], guardia: null, alCaer: alCaerDebil });
  const dos = juguete({ asientos: 1, clase: debil, grupos: (n) => [grupoFijo(n, 2, 9)], zonasExtra: [{ id: 9, clase: 9, caja: caja(-1, -7, 1, -6.6) }], nace: [{ x: 0, z: -8 }] });
  let caida = 0;
  let hecho = false;
  const tumbaUna: Robot = (a, b, reloj) => {
    if (hecho) return;
    const e = b.sala.entidades.find((x) => x.cerebro.modo !== 'aparecer' && x.vida > 0);
    if (e !== undefined && a.mandadas > 15) {
      hecho = true;
      caida = e.numero;
      a.planear(A.entrada, reloj, e.numero);
    }
  };
  const bt = bancoDeUno(dos, new Aparato(1, 5000, 0, 100, 17, tumbaUna));
  bt.correr(150);
  const absorbida = sucesosDe(bt, 'seva').find((x) => x.s.por === MOTIVO_DE_IRSE.absorbida);
  const levantada = bt.sala.entidades.find((x) => x.numero === caida);
  comprobar(
    'el trasvase: la caída que nadie remata absorbe a la otra que tiene cerca (`seva` absorbida, con quien absorbe) y se levanta con su vida',
    absorbida !== undefined && absorbida.s.quien === caida && levantada !== undefined && levantada.vida === 10 && levantada.cerebro.modo !== 'caida',
    { absorbida, levantada: levantada === undefined ? null : { vida: levantada.vida, modo: levantada.cerebro.modo } },
  );

  const una = juguete({ asientos: 1, clase: debil, grupos: (n) => [grupoFijo(n, 1, 9)], zonasExtra: [{ id: 9, clase: 9, caja: caja(-1, -7, 1, -6.6) }], nace: [{ x: 0, z: -8 }] });
  caida = 0;
  hecho = false;
  const br = bancoDeUno(una, new Aparato(1, 5000, 0, 100, 17, tumbaUna));
  br.correr(200);
  const deshecha = sucesosDe(br, 'seva').find((x) => x.s.por === MOTIVO_DE_IRSE.seDeshace);
  const vuelve = sucesosDe(br, 'nace').filter((x) => x.s.id === caida);
  const yo = br.sala.asientos[0]!;
  const lejos = vuelve.length === 2 && Math.hypot(vuelve[1]!.s.x - (yo.x * 100) / UNO, vuelve[1]!.s.z - (yo.z * 100) / UNO) >= 1000;
  comprobar(
    'la reimpresión: sin nadie a quien absorber se deshace y vuelve a los `reapareceTras` tics con su MISMO número, lejos de los asientos',
    deshecha !== undefined && deshecha.s.id === caida && vuelve.length === 2 && vuelve[1]!.k - deshecha.k === 40 && lejos,
    { deshecha, vuelve },
  );
}

paso('17 · Los avisos, el pago de lo que se lleva, la zona que se enciende y la que se rompe');
{
  const d = juguete({ asientos: 2, clase: sacoQuieto(), grupos: (n) => [grupoFijo(n, 1, 9)], zonasExtra: [{ id: 9, clase: 9, caja: caja(-0.1, -4.1, 0.1, -3.9) }], nace: [{ x: 0, z: -8 }, { x: 2, z: -8 }] });
  const m = new Mano(d);
  m.esperar(3);
  const e = m.sala.entidades[0]!.numero;
  const aviso = (clase: number, objetivo: number): number => m.paso([{ tipo: 'aviso', asiento: 1, clase, objetivo }]).sucesos.filter((s) => s.suceso.e === 'aviso').length;
  const primero = aviso(1, e);
  const seguido = aviso(1, e);
  m.esperar(20);
  const malo = aviso(1, 999);
  const deAsiento = aviso(2, 2);
  comprobar(
    'los avisos se reenvían a todos, uno por asiento cada `cadaTics` como mucho, y sólo si apuntan a lo que su clase dice',
    primero === 1 && seguido === 0 && malo === 0 && deAsiento === 1,
    { primero, seguido, malo, deAsiento },
  );

  const dS = juguete({ asientos: 1, fin: 'salida', lleva: 3, grupos: () => [], nace: [{ x: 0, z: -17 }] });
  const dS5 = { ...dS, mundo: { ...dS.mundo, zonas: dS.mundo.zonas.filter((z) => z.id !== 6) } };
  const aLaCinco: Robot = (a, _b, reloj) => {
    a.meta = { x: 0, z: u(-20) };
    if (Math.abs(a.z - u(-20)) < u(1) && a.sosten === null) a.sosten = { id: A.zona, ms: reloj, blanco: 0 };
  };
  const bS = bancoDeUno(dS5, new Aparato(1, 1000, 0, 100, 17, aLaCinco));
  bS.correr(200);
  const yo = bS.sala.asientos[0]!;
  const cobrado = yo.contadores.cobrado.find((c) => c.portable === 1)?.n ?? 0;
  comprobar('al salir se cobra lo que se lleva en triangular: 3 valen 60, más los 150 de salir; y se queda sin ellos', yo.puntos === 210 && cobrado === 3 && (yo.lleva[0]?.n ?? -1) === 0, { puntos: yo.puntos, cobrado, lleva: yo.lleva });

  const dZ = juguete({ asientos: 1, fin: 'salida', zonaTics: 60, grupos: () => [], nace: [{ x: 0, z: -8 }] });
  const bZ = bancoDeUno(dZ, new Aparato(1, 1000, 0, 100, 17, quieto));
  bZ.correr(80);
  const zonas = sucesosDe(bZ, 'zona');
  comprobar(
    'la zona que se apaga con alguien dentro gasta el recurso y enciende OTRA de su clase, con sus tics',
    zonas.length === 3 && zonas[1]!.s.tics === 0 && zonas[2]!.s.id !== zonas[0]!.s.id && zonas[2]!.s.tics === 800 && bZ.sala.recurso === 1 && bZ.sala.encuentro?.resultado === null,
    zonas.map((x) => ({ k: x.k, ...x.s })),
  );

  const floja = clase({ guardia: null, acciones: [accion(A.golpe, { anuncioTics: 11, enganche: null, alFallar: null, efecto: efecto(1, null) })] });
  /* El guardián sale en la zona de acción encendida (`zonaDeAccion`): el que la usa está a su alcance. */
  const dR = juguete({ asientos: 1, fin: 'salida', clase: floja, grupos: (n) => [{ ...grupoFijo(n, 1, 2), eleccion: 'zonaDeAccion' }], nace: [{ x: 0, z: -18 }] });
  const dR5 = { ...dR, mundo: { ...dR.mundo, zonas: dR.mundo.zonas.filter((z) => z.id !== 6) } };
  const bR = bancoDeUno(dR5, new Aparato(1, 1000, 0, 100, 17, aLaCinco));
  let usandoAntes = false;
  let rota = false;
  for (let i = 0; i < 200 && !rota; i++) {
    const p = bR.tic();
    const usando = (bR.sala.encuentro?.zona?.usando.length ?? 0) > 0;
    const golpe = p.sucesos.some((s) => s.suceso.e === 'resuelve' && s.suceso.r === RESULTADO.da);
    if (golpe && usandoAntes && !usando) rota = true;
    usandoAntes = usando;
  }
  comprobar('un golpe corta el uso de una zona que se rompe con daño: sale de la zona y tiene que volver a empezar', rota);
}

terminar({
  escritas:
    139 + DEL_AUSENTE + DEL_PULIDO + DEL_APUNTADO + DE_LA_REVISION + POR_DENTRO + DEL_OLVIDO + DE_LA_ENTREGA_1 + (HAY_QUIEBRO ? DEL_QUIEBRO + DEL_QUIEBRO_JUGADO + DE_LA_ENTREGA_1_EN_EL_QUIEBRO : 0),
  enVerde:
    'La sala de la Liza nace y empieza cada fase como dice su contrato, valida el sitio y corrige lo que no cuadra,\n' +
    'juzga la esquiva en el reloj del aparato con el mismo veredicto con cualquier desfase y red, reparte los turnos,\n' +
    'juzga las balas contra los sitios declarados, conserva lo que se lleva, acaba sus encuentros con una ronda, da el\n' +
    'mismo paso en Node y en Hermes, renace reanudando la fase, y una sala llena cuesta menos de lo que el diseño estimó.\n' +
    'Y por dentro, con una ciudad: las losas y los nudos por celdas y los campos por meta dan lo mismo que la fuerza\n' +
    'bruta, la sala es la misma tic a tic con y sin ellos, y el mundo se valida una vez y dice lo mismo que sin memoria.\n' +
    'Y L10: nadie tiene por blanco ni apunta a quien está más allá de su alcance, la que se queda sin blanco con alguien a\n' +
    'la distancia del olvido se acerca, lo que se queda lejos de todos se olvida al tic y vuelve a la cola de su grupo, el\n' +
    'ausente no acompaña y el caído sí, y la forma transitoria sin L10 es la sala de antes. Y la revisión de la entrega 1:\n' +
    'las persecuciones que rodean una manzana llegan, con todos huyendo por las calles de El Quiebro nadie se queda parado\n' +
    'en la franja, y un mundo nuevo no deja a ningún asiento dentro de una caja.',
});
