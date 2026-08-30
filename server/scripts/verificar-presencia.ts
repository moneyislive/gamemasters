/**
 * La presencia, ahora que ya no se escribe.
 *
 * Marcar «sigo aquí» dejó de ser una escritura con candado y pasó a ser un
 * número en memoria. Lo que hay que demostrar es que ESO NO SE NOTA: que el
 * punto verde sigue verde, que el trofeo se sigue ganando, que una partida
 * vieja leída de la base de datos se comporta igual que antes, y que el mapa
 * nuevo no se convierte en la fuga que ya tuvimos con los candados.
 */
import {
  marcarPresencia,
  olvidarPresencia,
  presenciasVivas,
  senalEnMemoria,
  volcarPresencia,
} from '../src/live/presencia';
import { estaConectado, ultimaSenal } from '../src/live/sesion';
import type { LivePlayer, LiveSession } from '../../shared/live';

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, bien: boolean, detalle?: unknown): void {
  hechas += 1;
  if (bien) {
    console.log(`  ✔ ${que}`);
    return;
  }
  console.log(`  ✘ ${que}`);
  if (detalle !== undefined) console.log(`      ${JSON.stringify(detalle)}`);
  fallos.push(que);
}

function seccion(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

function jugador(participanteId: string, lastSeenAt?: string): LivePlayer {
  return { participanteId, displayName: participanteId, joinCode: 'AAAAAA', joined: true, lastSeenAt } as unknown as LivePlayer;
}

const haceUnRato = (ms: number): string => new Date(Date.now() - ms).toISOString();

// ---------------------------------------------------------------------------

console.log('\nLa presencia sin escribir\n');

seccion('Lo que ve el panel');
{
  const p = jugador('e1');
  comprobar('sin señal de ningún sitio, gris', estaConectado(p, 'p1') === false);

  marcarPresencia('p1', 'e1');
  comprobar('con solo la memoria, verde', estaConectado(p, 'p1') === true);
  comprobar('pero el documento sigue sin tocarse', p.lastSeenAt === undefined);

  // Sin gameId se lee el documento y solo el documento: es el camino de los
  // sitios que únicamente tienen el jugador delante.
  comprobar('sin partida no se inventa presencia', estaConectado(p) === false);
}

seccion('Una partida vieja, leída de la base de datos');
{
  // Nadie ha marcado nada en memoria para esta: tiene que comportarse igual que
  // antes de que existiera el registro.
  const reciente = jugador('v1', haceUnRato(10_000));
  const viejo = jugador('v2', haceUnRato(90_000));
  comprobar('la señal fresca del documento, verde', estaConectado(reciente, 'vieja') === true);
  comprobar('la señal rancia del documento, gris', estaConectado(viejo, 'vieja') === false);
  comprobar('y sin partida, lo mismo', estaConectado(reciente) === true && estaConectado(viejo) === false);
}

seccion('La más reciente de las dos, nunca la que toque');
{
  // El documento por delante: pasó algo hace un instante y la memoria es vieja.
  const p = jugador('m1', haceUnRato(1_000));
  marcarPresencia('mixta', 'm1');
  const anotado = senalEnMemoria('mixta', 'm1');
  // Se envejece la memoria a mano para que el documento sea el más reciente.
  const doc = jugador('m1', new Date(anotado + 30_000).toISOString());
  comprobar('gana el documento cuando va por delante', ultimaSenal(doc, 'mixta') === anotado + 30_000, {
    memoria: anotado,
    documento: Date.parse(doc.lastSeenAt!),
    salida: ultimaSenal(doc, 'mixta'),
  });

  // La memoria por delante: nadie ha escrito nada en un buen rato.
  const rancio = jugador('m1', haceUnRato(10 * 60_000));
  comprobar('gana la memoria cuando va por delante', ultimaSenal(rancio, 'mixta') === anotado);
  comprobar('y con eso sigue conectado', estaConectado(rancio, 'mixta') === true);
  comprobar('sin memoria estaría gris', estaConectado(rancio) === false);

  // Una fecha corrupta no puede envenenar la lectura.
  const roto = jugador('m1', 'no-es-una-fecha');
  comprobar('una fecha ilegible no borra la memoria', ultimaSenal(roto, 'mixta') === anotado);
  comprobar('y sin memoria, ilegible es lo mismo que nada', ultimaSenal(roto) === 0);
}

seccion('El volcado se sube a las escrituras que ya iban a ocurrir');
{
  const sesion = {
    id: 'volcado',
    players: [jugador('a', haceUnRato(10 * 60_000)), jugador('b', haceUnRato(1_000)), jugador('c')],
  } as unknown as LiveSession;

  const antes = sesion.players.map((p) => p.lastSeenAt);
  volcarPresencia(sesion);
  comprobar('sin nada en memoria no toca nada', JSON.stringify(sesion.players.map((p) => p.lastSeenAt)) === JSON.stringify(antes));

  marcarPresencia('volcado', 'a');
  marcarPresencia('volcado', 'c');
  const bAntes = sesion.players[1]!.lastSeenAt;
  volcarPresencia(sesion);

  comprobar('adelanta al que la memoria tenía más fresco', Date.parse(sesion.players[0]!.lastSeenAt!) === senalEnMemoria('volcado', 'a'));
  comprobar('estrena al que no tenía nada', sesion.players[2]!.lastSeenAt !== undefined);
  comprobar('y no retrocede al que el documento tenía por delante', sesion.players[1]!.lastSeenAt === bAntes);

  // Quien no está en la sesión no rompe el volcado.
  marcarPresencia('volcado', 'fantasma');
  volcarPresencia(sesion);
  comprobar('un id que no juega no añade jugadores', sesion.players.length === 3);
}

seccion('El trofeo del superviviente');
{
  // El caso que el cambio podría haber roto: sigue delante del móvil, pero en
  // los últimos cinco minutos no ha pasado NADA que escribir en el documento.
  const p = jugador('s1', haceUnRato(20 * 60_000));
  marcarPresencia('final', 's1');
  const dentro = Date.now() - ultimaSenal(p, 'final') < 5 * 60_000;
  comprobar('lo gana quien estaba ahí aunque no se escribiera nada', dentro);

  const ido = jugador('s2', haceUnRato(20 * 60_000));
  comprobar('no lo gana quien se fue de verdad', Date.now() - ultimaSenal(ido, 'final') >= 5 * 60_000);
}

seccion('Y el mapa no crece sin fin');
{
  const partida = presenciasVivas();
  comprobar('se recuerdan las partidas con señales', partida > 0, partida);

  for (const id of ['p1', 'mixta', 'volcado', 'final']) olvidarPresencia(id);
  comprobar('cerrar una partida la olvida', presenciasVivas() === 0, presenciasVivas());

  // Y el barrido, que es lo que salva de la fuga cuando nadie cierra nada.
  // No se puede adelantar el reloj, así que se comprueba la propiedad que
  // importa: marcar mil veces a las mismas personas no acumula entradas.
  for (let i = 0; i < 500; i++) {
    marcarPresencia('una', `e${i % 8}`);
    marcarPresencia('otra', `e${i % 8}`);
  }
  comprobar('mil señales, dos partidas', presenciasVivas() === 2, presenciasVivas());
  olvidarPresencia('una');
  olvidarPresencia('otra');
  comprobar('y al final no queda nada', presenciasVivas() === 0);
}

console.log(`\n${hechas} comprobaciones`);
if (fallos.length > 0) {
  console.log(`\n${fallos.length} sin pasar:`);
  for (const f of fallos) console.log(`  ✘ ${f}`);
  process.exit(1);
}
console.log('La presencia se nota igual y ya no cuesta una escritura.');
