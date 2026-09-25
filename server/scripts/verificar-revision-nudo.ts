/**
 * La revisión adversaria del Nudo, sin gastar un céntimo.
 *
 *   npm run verify:revision-nudo -w server
 *
 * NO SALE A LA RED. Monta una noche de prueba con la trama de plantilla, le
 * escribe encima una prosa buena y le va metiendo, de uno en uno, los fallos
 * que estropean esta noche en concreto:
 *
 *   · una frase que ata un convoy a una hora, a un ordinal o a otro convoy,
 *     escrita como la escribe la prosa —«al mixto», «el mixto» a secas, «a la
 *     una y veinte»— y sin confundir «el Correo de Medianoche» con una hora;
 *   · un parte que nombra un convoy (se lee al abrir su franja y suena a «este
 *     es el de ahora») o que da por hecho cómo va la noche;
 *   · lo que no es de esta noche: un crimen, el suero en otro convoy, otro año,
 *     otro oficio; y lo que sí cabe en un secreto («se siente culpable»);
 *   · un cuadro que ha dejado de salir: tiras desalineadas por un renombrado,
 *     una tira quitada, una tira que no guarda nadie, una mano que lo resuelve
 *     sola.
 *
 * Y comprueba el otro lado, que es el que hace que una revisión no sea ruido:
 * la noche bien escrita sale LIMPIA. Un auditor que avisa de todo enseña al
 * Game Master a no leerlo.
 *
 * Los parches: que solo toquen la prosa —ni el cuadro, ni las tiras, ni los
 * oficios, ni lo que se intente colar—, que no empobrezcan y que rescaten una
 * noche entera de plantilla. Y el motor: que un cuadro roto no pague una
 * segunda pasada que no puede arreglar nada.
 *
 * Lo que esto NO prueba es si el modelo encuentra y arregla los fallos: eso
 * solo se ve llamando a la API, sabiendo lo que cuesta.
 */
/*
 * Sin clave, pase lo que pase en el `.env`. Un espacio y no una cadena vacía:
 * en Windows, vaciar una variable de entorno la BORRA, y entonces dotenv la
 * cargaría del fichero. El espacio la deja definida y `config.ts` la recorta.
 */
process.env.ANTHROPIC_API_KEY = ' ';

import fs from 'node:fs';
import path from 'node:path';
import type { GameSession, HallazgoDeRevision, Plot } from '../../shared/types';
import type { TramaNudo } from '../../shared/juegos/nudo-tipos';

const { generarTramaNudo, tramaDe } = await import('../src/juegos/nudo-trama');
const { auditarTramaNudo, convoyesEnLaProsa, franjaDeLaHora } = await import('../src/plot/nudo-auditoria');
const { aplicarParchesNudo } = await import('../src/plot/nudo-parches');
const { ADAPTADOR_NUDO, AVISOS_DEL_CUADRO, revisarTramaNudo } = await import('../src/plot/nudo-revision');
const { construirPromptDelRevisorNudo, NUDO_REVISION_SCHEMA } = await import('../src/plot/nudo-revisor');
const { construirPromptNudo } = await import('../src/plot/nudo-prompt');
const { mereceOtraPasada } = await import('../src/plot/revision-comun');
const { revisorDe } = await import('../src/juegos/revisores');
const { HORAS_DE_FRANJA, OFICIO_DE_PERSONA, OFICIOS, franjasDe } = await import('../../shared/juegos/nudo-tipos');

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle === undefined ? '' : `\n      ${JSON.stringify(detalle)?.slice(0, 500)}`}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

const tiene = (hs: HallazgoDeRevision[], codigo: string, gravedad?: string) =>
  hs.some((h) => h.codigo === codigo && (!gravedad || h.gravedad === gravedad));
const conCodigo = (hs: HallazgoDeRevision[], codigo: string) => hs.filter((h) => h.codigo === codigo);
const serios = (hs: HallazgoDeRevision[]) => hs.filter((h) => h.gravedad !== 'menor');
const nada = () => {};

// ---------------------------------------------------------------------------
// La mesa: cinco personas, los seis convoyes, cuatro puestos, tres cargas
// ---------------------------------------------------------------------------

const GENTE = [
  { name: 'Ana', description: 'Discute por deporte y no suelta una idea hasta que la ve caer.' },
  { name: 'Bruno', description: 'No para quieto: se ofrece a ir a por lo que haga falta.' },
  { name: 'Carla', description: 'Lleva las cuentas de una cooperativa y no se le escapa un número.' },
  { name: 'Dani', description: 'Callado; escucha mucho más de lo que habla.' },
  { name: 'Elena', description: 'Se ríe de todo y en cinco minutos lo ha organizado todo.' },
];
const CONVOYES = [
  'El Correo de Medianoche',
  'El mixto de Peñarroya',
  'El carbonero de la Cuenca',
  'El expreso de la frontera',
  'El tren de obras del 84',
  'El ganadero de Villaseca',
];
const PUESTOS = ['La garita del kilómetro 83', 'El cuarto del telégrafo', 'El muelle cubierto', 'La sala de aparatos'];
const MERCANCIAS = ['El suero antidiftérico', 'Hulla de la Cuenca', 'Reses para el matadero'];

function nuevaPartida(): GameSession {
  const ahora = '2027-01-14T22:00:00.000Z';
  return {
    id: 'revision-nudo',
    name: 'La estación de Valdehierro',
    status: 'ready',
    createdAt: ahora,
    updatedAt: ahora,
    entidades: {
      ferroviarios: GENTE.map((p, i) => ({ id: `f${i}`, name: p.name, description: p.description })),
      convoyes: CONVOYES.map((name, i) => ({ id: `c${i}`, name })),
      puestos: PUESTOS.map((name, i) => ({ id: `p${i}`, name })),
      mercancias: MERCANCIAS.map((name, i) => ({ id: `m${i}`, name })),
    },
    boardMode: 'generated',
    settings: { language: 'es', juego: 'nudo', model: 'claude-opus-5-5' },
  } as unknown as GameSession;
}

const game = nuevaPartida();
// La MISMA semilla con que la generación arma su base: así esto es, literalmente, la plantilla.
const plantilla = generarTramaNudo(game, { semilla: `${game.id}:${GENTE.length}` });
const trama = tramaDe(plantilla) as TramaNudo;
const donde = franjasDe(trama.cuadro);
const nombreDe = (id: string) => CONVOYES[Number(id.slice(1))]!;
const oficioDe = (id: string) => OFICIO_DE_PERSONA[trama.oficioDePersona[id]!];

// ---------------------------------------------------------------------------
// Una noche bien escrita: lo que tendría que salir de la API
// ---------------------------------------------------------------------------

const FICHAS = [
  {
    nombre: 'Ana Ferrández',
    cara: (o: string) =>
      `Es ${o} esta noche y lleva once inviernos en Valdehierro. Discute cada orden hasta que la ve caer, y casi siempre acaba teniendo razón.`,
    secreto: 'Pidió el traslado a la costa hace un mes y no se lo ha dicho a nadie del turno. Si la noche sale mal, se irá de aquí con esa mancha.',
    gancho: 'Pregunta «¿y por qué?» a cada propuesta, pero cede en cuanto una tira lo diga claro: tu terquedad es un servicio, no un muro.',
  },
  {
    nombre: 'Bruno Lacasa',
    cara: (o: string) =>
      `Hace de ${o} desde que entró en la compañía, hace seis años. No se sienta nunca: va y viene con la linterna aunque nadie se lo pida.`,
    secreto: 'Debe tres meses de pensión a la viuda que le alquila el cuarto. Cuenta con la gratificación de esta noche para ponerse al día.',
    gancho: 'Ofrécete a ir tú a cada puesto y vuelve con noticias: que la mesa sienta que la estación entera se mueve contigo.',
  },
  {
    nombre: 'Carla Montañés',
    cara: (o: string) =>
      `Es ${o} por oposición y la única del turno que lleva las cuentas a mano. Todo lo apunta en una libreta de tapas negras.`,
    secreto: 'Su hermano pequeño está en el valle, con fiebre, y ella lo sabe desde la tarde. No ha querido que nadie la mire con lástima.',
    gancho: 'Lleva tú la cuenta del retraso en voz alta y sin dramatismo: cuando alguien proponga adivinar, dile lo que cuesta.',
  },
  {
    nombre: 'Daniel Sobrarbe',
    cara: (o: string) =>
      `Lleva cuatro años de ${o} y habla poco, pero cuando habla lo hace despacio y con el dato en la mano. Tiene fama de no equivocarse dos veces.`,
    secreto: 'Hace dos inviernos firmó un parte sin comprobarlo y aquella noche un mercancías se quedó seis horas en la nieve. Nunca lo ha contado.',
    gancho: 'Escucha antes de hablar y, cuando lo tengas, dilo una sola vez y bien: tu silencio es lo que hace que te crean.',
  },
  {
    nombre: 'Elena Buil',
    cara: (o: string) =>
      `Es ${o} de refuerzo, llegada de Zaragoza la semana pasada. Se ríe de todo y en dos días ya ha puesto en orden media estación.`,
    secreto: 'La mandaron aquí por un encontronazo con un inspector. Esta noche es su oportunidad de volver con otra hoja de servicios.',
    gancho: 'Organiza sin mandar: reparte quién lee su tira y en qué orden, y celebra en voz alta cada paso que dé la mesa.',
  },
];

const PARTES_BUENOS = [
  'Entra el turno con las manos negras de apagar el fuego. La estufa del cuarto de aparatos tira mal y el hilo con la capital calla.',
  'La nieve ya cubre el borde del andén. Alguien ha puesto café en la estufa y el vapor empaña los cristales de la garita.',
  'Sopla el cierzo por el lado del puerto y las linternas tiemblan. Del hilo llega un tecleo suelto, sin nadie que lo firme.',
  'La noche está en lo más hondo. Los faroles del muelle apenas alumbran un palmo y el frío se mete por las botas.',
  'Ha dejado de nevar un momento y se oye la sierra entera. El reloj de la sala de espera adelanta, como siempre.',
  'Por encima de la sierra empieza a clarear. Quien tenga algo que decir, que lo diga ahora: el amanecer no espera a nadie.',
];

const GUION_BUENO = [
  'ACTO 1 · Lee el parte de apertura y deja que la mesa se organice sola. Si nadie propone juntar las tiras, espera: no lo propongas tú.',
  'ACTO 2 · Cuando empiecen a leer tiras en voz alta, apunta en la tabla de la noche cada orden rechazada: son dos minutos de retraso.',
  'ACTO 3 · A mitad de la noche, recuerda el tope y lo que cuesta cada franja perdida. Ahí se decide si alguien consulta el archivo.',
  'ACTO 4 · En la última franja, avisa de lo que suma al amanecer cada convoy que se quede en la vía. La decisión es de la mesa.',
  'CIERRE · Al amanecer se cierra la cuenta: si el Correo cruzó y el retraso no pasa del tope, gana el turno entero. Luego se lee el cuadro verdadero.',
];

const CAMBIOS_BUENOS = {
  titulo: 'La noche del puerto cerrado',
  lema: 'Seis trenes, un cuadro quemado y el valle esperando el suero.',
  sinopsis:
    'Madrugada del 14 de enero de 1927. El fuego se ha llevado la oficina del telégrafo de Valdehierro y, con ella, el papel ' +
    'que ordenaba la noche. En el valle esperan el suero antidiftérico, que viaja en el Correo de Medianoche, y la nieve ' +
    'sube por el puerto. El turno tiene lo que cada cual salvó del fuego y ni un minuto que perder.',
  ambientacion:
    'Valdehierro huele a hollín y a carbón mojado. La nieve borra las vías del apartadero y el hilo con la capital va y viene.',
  fichas: GENTE.map((_, i) => ({
    participanteId: `f${i}`,
    nombre: FICHAS[i]!.nombre,
    caraPublica: FICHAS[i]!.cara(oficioDe(`f${i}`)),
    secreto: FICHAS[i]!.secreto,
    gancho: FICHAS[i]!.gancho,
  })),
  partes: PARTES_BUENOS.map((texto, i) => ({ franja: i + 1, texto })),
  guion: GUION_BUENO,
};

const rescatada = aplicarParchesNudo(game, plantilla, CAMBIOS_BUENOS, false);
const buena = rescatada.plot;

/** Una copia de la buena con un cambio encima. */
function conCambio(cambiar: (p: Plot, t: TramaNudo) => void, base: Plot = buena): Plot {
  const p = structuredClone(base);
  cambiar(p, tramaDe(p) as TramaNudo);
  return p;
}
const auditar = (p: Plot, g: GameSession = game) => auditarTramaNudo(g, p).hallazgos;

// ---------------------------------------------------------------------------
// 1. La plantilla
// ---------------------------------------------------------------------------

paso('La plantilla: se juega, pero no es la velada que se ha pagado');
{
  const a = auditarTramaNudo(game, plantilla);
  comprobar('la prosa de plantilla es bloqueante', tiene(a.hallazgos, 'prosa-de-plantilla', 'bloqueante'), a.hallazgos);
  comprobar('el cuadro de la plantilla sale uno, y el guardado', a.cuadro?.unico === true, a.cuadro);
  comprobar('ninguna tira desalineada ni de sobra', a.cuadro?.desalineadas.length === 0 && a.cuadro?.redundantes.length === 0, a.cuadro);
  comprobar('todas las tiras en alguna mano', a.cuadro?.sinMano.length === 0, a.cuadro?.sinMano);
  comprobar('el cuadro sale a lápiz', a.cuadro?.aLapiz === true);
  comprobar(
    'nadie lo resuelve solo y nadie sobra',
    (a.cuadro?.porPersona ?? []).every((p) => p.tiras > 0 && p.cuadrosSolo > 1 && p.cuadrosSinEl > 1),
    a.cuadro?.porPersona,
  );
  comprobar(
    'ningún aviso del cuadro en una trama recién generada',
    !a.hallazgos.some((h) => AVISOS_DEL_CUADRO.has(h.codigo)),
    a.hallazgos.filter((h) => AVISOS_DEL_CUADRO.has(h.codigo)),
  );
  const { informe } = await revisarTramaNudo(game, plantilla, nada, 'completa');
  comprobar('sin clave, el informe de la plantilla es «no apta»', informe.veredicto === 'no-apta', informe.veredicto);
  comprobar('sin clave no hay pasadas del revisor', informe.pasadas === 0, informe.pasadas);
}

// ---------------------------------------------------------------------------
// 2. La noche bien escrita sale limpia
// ---------------------------------------------------------------------------

paso('Una noche bien escrita sale limpia: un auditor que avisa de todo no lo lee nadie');
{
  const a = auditarTramaNudo(game, buena);
  comprobar('ni un aviso grave ni bloqueante', serios(a.hallazgos).length === 0, serios(a.hallazgos));
  comprobar('ni siquiera menores', a.hallazgos.length === 0, a.hallazgos);
  comprobar('no queda nada de plantilla', a.deLaPlantilla.length === 0, a.deLaPlantilla);
  const { informe } = await revisarTramaNudo(game, buena, nada, 'completa');
  comprobar('sin clave, la noche bien escrita es «apta»', informe.veredicto === 'apta', informe);
}

// ---------------------------------------------------------------------------
// 3. Cómo nombra la prosa a los convoyes, y las horas
// ---------------------------------------------------------------------------

paso('Los convoyes como los escribe la prosa, y las horas como se dicen');
{
  const enLaProsa = convoyesEnLaProsa(game, trama.correo);
  const claves = (id: string) => enLaProsa.find((c) => c.id === id)?.claves ?? [];
  comprobar('«el mixto» a secas cuenta como el mixto de Peñarroya', claves('c1').includes('mixto'), claves('c1'));
  comprobar('el nombre sin artículo, para que «al mixto de Peñarroya» no se escape', claves('c1').includes('mixto de penarroya'), claves('c1'));
  comprobar('«tren» solo no se toma por el tren de obras: lo dice cualquiera', !claves('c4').includes('tren'), claves('c4'));
  comprobar('el Correo es «el Correo»', trama.correo === 'c0' && claves('c0').includes('correo'), claves('c0'));

  comprobar('«02:40» es la franja 5', franjaDeLaHora('sale a las 02:40') === 5);
  comprobar('«2:40» también', franjaDeLaHora('sale a las 2:40') === 5);
  comprobar('«a la una y veinte» es la franja 3', franjaDeLaHora('cruza a la una y veinte') === 3);
  comprobar('«las dos y cuarenta» es la 5 y no la 4', franjaDeLaHora('hasta las dos y cuarenta') === 5);
  comprobar('«a medianoche» es la franja 1', franjaDeLaHora('sale a medianoche') === 1);
  comprobar('«las dos vías» no es una hora', franjaDeLaHora('las dos vias del apartadero') === undefined);
}

// ---------------------------------------------------------------------------
// 4. Frases que insinúan un orden
// ---------------------------------------------------------------------------

paso('Una frase que ata un convoy a una franja, acierte o no');
{
  const franjaMixto = donde.c1!;
  const otra = franjaMixto === 1 ? 2 : 1;
  const conFrase = (frase: string) => conCambio((p) => (p.synopsis = `${p.synopsis} ${frase}`));

  const fuga = conCodigo(auditar(conFrase(`El mixto de Peñarroya sale a las ${HORAS_DE_FRANJA[franjaMixto - 1]}.`)), 'insinua-orden');
  comprobar('convoy + hora de su franja: se ve', fuga.length === 1, fuga);
  comprobar('y se dice que COINCIDE: es una fuga', /COINCIDE/.test(fuga[0]?.texto ?? ''), fuga[0]?.texto);

  const falsa = conCodigo(auditar(conFrase(`El mixto de Peñarroya sale a las ${HORAS_DE_FRANJA[otra - 1]}.`)), 'insinua-orden');
  comprobar('convoy + hora de otra franja: se ve', falsa.length === 1, falsa);
  comprobar('y se dice que no coincide: es una pista falsa', /No coincide/.test(falsa[0]?.texto ?? ''), falsa[0]?.texto);

  comprobar('«el mixto sale el primero»: el nombre corto y un ordinal', tiene(auditar(conFrase('El mixto sale el primero.')), 'insinua-orden'));
  comprobar(
    '«al mixto de Peñarroya … hasta las dos y cuarenta»: la contracción no lo esconde',
    tiene(auditar(conFrase('Nadie da vía al mixto de Peñarroya hasta las dos y cuarenta.')), 'insinua-orden'),
  );
  comprobar(
    '«a la una y veinte», con la hora en palabras',
    tiene(auditar(conFrase('El carbonero de la Cuenca cruza a la una y veinte.')), 'insinua-orden'),
  );
  comprobar(
    'dos convoyes y un «antes» entre ellos',
    tiene(auditar(conFrase('El expreso de la frontera cruza antes que el ganadero de Villaseca.')), 'insinua-orden'),
  );
  comprobar(
    '«el Correo de Medianoche lleva el suero» no es una hora',
    !tiene(auditar(conFrase('El Correo de Medianoche lleva el suero al valle.')), 'insinua-orden'),
  );
  comprobar(
    '«las dos vías del apartadero» con un convoy al lado no es una hora',
    !tiene(auditar(conFrase('Las dos vías del apartadero están heladas y el mixto de Peñarroya no cabe en la corta.')), 'insinua-orden'),
  );
  const enFicha = conCambio((p) => (p.characters[0]!.secret = `${p.characters[0]!.secret} Sabe que el ganadero de Villaseca cruza el último.`));
  comprobar('también en una ficha', tiene(auditar(enFicha), 'insinua-orden'));
}

// ---------------------------------------------------------------------------
// 5. Los partes
// ---------------------------------------------------------------------------

paso('Los partes se leen al abrir su franja, pase lo que pase en la mesa');
{
  const f = donde.c1!;
  const suya = conCodigo(
    auditar(conCambio((_, t) => (t.partes[f - 1] = 'Se oye pitar al mixto de Peñarroya al otro lado del túnel. La estufa sigue sin tirar.'))),
    'parte-nombra-convoy',
  );
  comprobar('un parte que nombra un convoy: se ve', suya.length === 1 && suya[0]?.sobre === `parte-${f}`, suya);
  comprobar('y si ES el de esa franja, se dice que es una fuga', /ES el de esa franja/.test(suya[0]?.texto ?? ''), suya[0]?.texto);

  const g = f === 1 ? 2 : 1;
  const ajena = conCodigo(
    auditar(conCambio((_, t) => (t.partes[g - 1] = 'Se oye pitar al mixto de Peñarroya al otro lado del túnel. La estufa sigue sin tirar.'))),
    'parte-nombra-convoy',
  );
  comprobar('si no lo es, se ve igual, sin llamarlo fuga', ajena.length === 1 && !/ES el de esa franja/.test(ajena[0]?.texto ?? ''), ajena);

  comprobar(
    '«el Correo» a secas en un parte también cuenta',
    tiene(auditar(conCambio((_, t) => (t.partes[3] = 'El Correo todavía no ha asomado por la trinchera. La nieve no afloja.'))), 'parte-nombra-convoy'),
  );
  comprobar(
    'un parte que cuenta cuántos han salido y cuánto retraso llevan',
    tiene(
      auditar(conCambio((_, t) => (t.partes[2] = 'Ya han salido dos convoyes y la estación lleva cuatro minutos de retraso. Hace frío.'))),
      'parte-da-por-hecho',
      'grave',
    ),
  );
  comprobar(
    '«siguen esperando en el apartadero» también lo da por hecho',
    tiene(auditar(conCambio((_, t) => (t.partes[4] = 'Dos mercancías siguen esperando en el apartadero. La nieve cae recta.'))), 'parte-da-por-hecho'),
  );
  comprobar(
    '«quedan tres franjas» no: las franjas pasan igual para todas las mesas',
    !tiene(auditar(conCambio((_, t) => (t.partes[3] = 'Quedan tres franjas para el alba y la nieve no afloja. La estufa ronca.'))), 'parte-da-por-hecho'),
  );
  comprobar(
    'dos partes que dicen casi lo mismo',
    tiene(auditar(conCambio((_, t) => (t.partes[2] = t.partes[1]!))), 'partes-repetidos'),
  );
}

// ---------------------------------------------------------------------------
// 6. Lo que no es de esta noche
// ---------------------------------------------------------------------------

paso('Lo que no es de esta noche, y lo que sí cabe en un secreto');
{
  comprobar(
    'un envenenamiento en la sinopsis',
    tiene(auditar(conCambio((p) => (p.synopsis = `${p.synopsis} Alguien ha envenenado al jefe de estación.`))), 'hay-crimen'),
  );
  comprobar(
    'un «culpable» en lo que se lee de la noche',
    tiene(auditar(conCambio((p) => (p.setting = `${p.setting} El culpable del incendio sigue en la casa.`))), 'hay-crimen'),
  );
  comprobar(
    'pero «se siente culpable» en un secreto es un secreto humano, no otro juego',
    !tiene(
      auditar(conCambio((p) => (p.characters[1]!.secret = 'Se siente culpable del descarrilamiento del diecinueve y no lo ha contado nunca a nadie de la casa.'))),
      'hay-crimen',
    ),
  );
  comprobar(
    'el suero en otro convoy',
    tiene(auditar(conCambio((p) => (p.setting = `${p.setting} El suero viaja en el carbonero de la Cuenca.`))), 'suero-en-otro-convoy'),
  );
  comprobar(
    'el suero en el Correo, nombrando a otro de paso, está bien',
    !tiene(auditar(conCambio((p) => (p.setting = `${p.setting} El suero va en el Correo, no en el carbonero de la Cuenca.`))), 'suero-en-otro-convoy'),
  );
  comprobar(
    'otro año en la sinopsis',
    tiene(auditar(conCambio((p) => (p.synopsis = p.synopsis.replace('1927', '1931')))), 'fecha-cambiada', 'menor'),
  );
  const f0 = trama.oficioDePersona.f0!;
  const ajeno = OFICIOS.find((o) => o !== f0)!;
  comprobar(
    'una ficha que le pone otro oficio',
    tiene(
      auditar(
        conCambio((p) => {
          p.characters[0]!.publicPersona = `Es ${OFICIO_DE_PERSONA[ajeno]} desde hace veinte años y no hay nadie en la casa que conozca mejor la línea.`;
        }),
      ),
      'oficio-cruzado',
    ),
  );
  comprobar(
    'una ficha de relleno',
    tiene(
      auditar(
        conCambio((p) => {
          const c = p.characters[2]!;
          c.publicPersona = `${oficioDe(c.participanteId)}.`;
          c.secret = 'Nada.';
          c.personalHook = 'Juega.';
        }),
      ),
      'ficha-flaca',
      'menor',
    ),
  );
}

// ---------------------------------------------------------------------------
// 7. El cuadro
// ---------------------------------------------------------------------------

paso('Un cuadro que ha dejado de salir');
const delCuadro = new Set<string>();
{
  const anotar = (hs: HallazgoDeRevision[]) => hs.filter((h) => h.origen === 'auditoria').forEach((h) => delCuadro.add(h.codigo));

  // Un convoy renombrado después de generar: sus tiras siguen diciendo el nombre viejo (en mayúsculas, como un telegrama).
  const citado = trama.cuadro.find((id) => trama.telegramas.some((t) => t.texto.includes(nombreDe(id).toUpperCase())))!;
  comprobar('hay un convoy que sale en alguna tira (para poder probarlo)', !!citado);
  const renombrada = structuredClone(game);
  const entidades = renombrada.entidades as Record<string, Array<{ id: string; name: string }>>;
  entidades.convoyes!.find((c) => c.id === citado)!.name = 'El mixto de Almadén';
  const desalineada = auditar(buena, renombrada);
  comprobar('un convoy renombrado deja tiras desalineadas', tiene(desalineada, 'tira-desalineada', 'bloqueante'), desalineada);
  if (tiene(desalineada, 'tira-desalineada')) delCuadro.add('tira-desalineada');

  // Una tira quitada: con las que quedan salen varios cuadros.
  const rota = auditar(conCambio((_, t) => t.telegramas.shift()));
  comprobar('sin una tira el cuadro deja de ser uno', tiene(rota, 'cuadro-roto', 'bloqueante'), rota);
  anotar(rota);

  // Alguien que se quita de la mesa con una tira que solo guardaba él.
  const guardan = new Map<string, string[]>();
  for (const [persona, tiras] of Object.entries(trama.reparto)) for (const t of tiras) guardan.set(t, [...(guardan.get(t) ?? []), persona]);
  const solo = [...guardan.entries()].find(([, manos]) => manos.length === 1)?.[1][0];
  comprobar('hay alguien con una tira que no guarda nadie más (para poder probarlo)', !!solo, Object.fromEntries(guardan));
  if (solo) {
    const sinEl = structuredClone(game);
    const e = sinEl.entidades as Record<string, Array<{ id: string }>>;
    e.ferroviarios = e.ferroviarios!.filter((p) => p.id !== solo);
    const sinMano = auditar(buena, sinEl);
    comprobar('su tira ya no la lee nadie: la noche no se resuelve', tiene(sinMano, 'tira-sin-mano', 'bloqueante'), sinMano);
    anotar(sinMano);
  }

  // Una mano con todas las tiras.
  const todas = trama.telegramas.map((t) => t.id);
  const mano = auditar(conCambio((_, t) => (t.reparto.f0 = [...todas])));
  comprobar('una mano con todo resuelve la noche sola', tiene(mano, 'mano-que-lo-resuelve', 'bloqueante'), mano);
  anotar(mano);

  // Alguien sin tiras.
  const vacia = auditar(conCambio((_, t) => (t.reparto.f1 = [])));
  comprobar('alguien sin tiras no tiene nada que aportar', tiene(vacia, 'ferroviario-sin-tiras', 'grave'), vacia);
  anotar(vacia);

  // Sin cuadro.
  const sinCuadro = auditar(conCambio((p) => delete (p as { delJuego?: unknown }).delJuego));
  comprobar('sin trama del juego no hay noche', tiene(sinCuadro, 'sin-cuadro', 'bloqueante'), sinCuadro);
  anotar(sinCuadro);
}

// ---------------------------------------------------------------------------
// 8. Lo que el revisor no puede arreglar no pide otra pasada
// ---------------------------------------------------------------------------

paso('Un cuadro roto no paga una segunda pasada: los parches solo tocan prosa');
{
  const h = (codigo: string): HallazgoDeRevision => ({ codigo, gravedad: 'bloqueante', origen: 'auditoria', texto: codigo, estado: 'pendiente' });
  const corregible = ADAPTADOR_NUDO.corregible?.bind(ADAPTADOR_NUDO);
  comprobar('el adaptador del Nudo dice qué puede arreglar', typeof corregible === 'function');
  comprobar('un cuadro roto no pide otra pasada', !mereceOtraPasada([h('cuadro-roto')], corregible));
  comprobar('una prosa de plantilla sí', mereceOtraPasada([h('prosa-de-plantilla')], corregible));
  comprobar('las dos juntas, sí: la prosa se puede arreglar', mereceOtraPasada([h('cuadro-roto'), h('prosa-de-plantilla')], corregible));
  comprobar('sin declarar nada, todo cuenta, como en CLUEDO', mereceOtraPasada([h('cuadro-roto')]));
  const sinMarcar = [...delCuadro].filter((c) => !['prosa-de-plantilla', 'prosa-a-medias'].includes(c) && !AVISOS_DEL_CUADRO.has(c));
  comprobar('todo aviso que sale al romper el cuadro está entre los que el revisor no arregla', sinMarcar.length === 0, sinMarcar);
}

// ---------------------------------------------------------------------------
// 9. Los parches
// ---------------------------------------------------------------------------

paso('Los parches: solo prosa, nunca más pobre, y una noche de plantilla se rescata');
{
  comprobar('toda la prosa buena entra', rescatada.rechazados.length === 0, rescatada.rechazados);
  comprobar(
    'y entra entera: cabecera, cinco fichas, seis partes y el guion',
    ['la sinopsis', 'la ambientación', 'el título', 'el lema', 'el guion'].every((x) => rescatada.aplicados.includes(x)) &&
      rescatada.aplicados.filter((x) => x.startsWith('ficha de')).length === GENTE.length &&
      rescatada.aplicados.filter((x) => x.startsWith('parte de la franja')).length === 6,
    rescatada.aplicados,
  );
  const tramaBuena = tramaDe(buena) as TramaNudo;
  const { partes: _p1, ...resto1 } = trama;
  const { partes: _p2, ...resto2 } = tramaBuena;
  comprobar('el cuadro, las tiras, el reparto, los oficios, el Correo y el tope no se mueven', JSON.stringify(resto1) === JSON.stringify(resto2));
  comprobar(
    'ni las tiras de cada ficha ni su oficio',
    buena.characters.every((c, i) => JSON.stringify(c.knowledge) === JSON.stringify(plantilla.characters[i]!.knowledge) && c.role === plantilla.characters[i]!.role),
  );
  comprobar('ni la solución', JSON.stringify(buena.solution) === JSON.stringify(plantilla.solution));
  comprobar('la trama de entrada no se toca', plantilla.synopsis !== buena.synopsis && tramaDe(plantilla)!.partes[0] !== tramaBuena.partes[0]);

  // Lo que se intenta colar por el mismo sitio.
  const colado = aplicarParchesNudo(game, buena, {
    cuadro: [...trama.cuadro].reverse(),
    telegramas: [],
    reparto: {},
    correo: 'c5',
    fichas: [{ ...CAMBIOS_BUENOS.fichas[0]!, knowledge: ['el orden entero'], role: 'jefe de estación' }],
  } as never, false);
  const tramaColada = tramaDe(colado.plot) as TramaNudo;
  comprobar(
    'lo que no es prosa no entra aunque venga en el mismo sobre',
    JSON.stringify(tramaColada.cuadro) === JSON.stringify(trama.cuadro) &&
      tramaColada.telegramas.length === trama.telegramas.length &&
      tramaColada.correo === trama.correo &&
      JSON.stringify(tramaColada.reparto) === JSON.stringify(trama.reparto),
  );
  comprobar(
    'ni por una ficha',
    JSON.stringify(colado.plot.characters[0]!.knowledge) === JSON.stringify(buena.characters[0]!.knowledge) &&
      colado.plot.characters[0]!.role === buena.characters[0]!.role,
  );

  const corta = aplicarParchesNudo(game, buena, { sinopsis: 'Nieva.' }, false);
  comprobar('una sinopsis que empobrece no entra', corta.plot.synopsis === buena.synopsis && corta.rechazados.length === 1, corta.rechazados);
  const nadie = aplicarParchesNudo(game, buena, { fichas: [{ ...CAMBIOS_BUENOS.fichas[0]!, participanteId: 'f9' }] }, false);
  comprobar('una ficha de alguien que no está en la mesa no entra', nadie.rechazados.some((r) => /no es nadie/.test(r)), nadie.rechazados);
  const franjas = aplicarParchesNudo(
    game,
    buena,
    { partes: [{ franja: 7, texto: PARTES_BUENOS[0]! }, { franja: 0, texto: PARTES_BUENOS[0]! }, { franja: 2, texto: `${PARTES_BUENOS[1]} Cruje la marquesina.` }] },
    false,
  );
  comprobar(
    'un parte de una franja que no existe no entra; el bueno sí, y solo él',
    franjas.rechazados.length === 2 &&
      franjas.aplicados.join() === 'parte de la franja 2' &&
      (tramaDe(franjas.plot) as TramaNudo).partes.filter((p, i) => p !== tramaBuena.partes[i]).length === 1,
    franjas,
  );
  const guion = aplicarParchesNudo(game, buena, { guion: ['Una sola línea de guion, que no basta para dirigir nada.', 'Y otra.'] }, false);
  comprobar('un guion de menos de tres líneas no entra', guion.plot.gmScript === buena.gmScript || JSON.stringify(guion.plot.gmScript) === JSON.stringify(buena.gmScript), guion);
}

// ---------------------------------------------------------------------------
// 10. Los encargos
// ---------------------------------------------------------------------------

paso('Lo que viaja a cada modelo: quien escribe no ve el cuadro; quien revisa, sí');
{
  const escritor = construirPromptNudo(game, plantilla);
  comprobar('al que escribe no le llega ni una tira', trama.telegramas.every((t) => !escritor.includes(t.texto)));
  comprobar(
    'ni el cuadro',
    !trama.cuadro.some((id, i) => escritor.includes(`franja ${i + 1} (${HORAS_DE_FRANJA[i]}): ${nombreDe(id)}`)),
  );
  comprobar('le llegan las reglas con el tope de esta mesa', escritor.includes(`no pasa de ${trama.retrasoMaximo} minutos`));
  comprobar('y que los partes no nombran convoyes', /Sin nombrar ningún convoy/.test(escritor));
  comprobar('y el oficio de cada cual con su palabra', GENTE.every((_, i) => escritor.includes(`esta noche es ${oficioDe(`f${i}`)}`)));

  const revisor = construirPromptDelRevisorNudo(game, buena, { auditoria: 'AUDITORÍA DE PRUEBA', lecturas: '', hallazgos: [] }, { soloMaterial: false, pasada: 0 });
  comprobar(
    'al que revisa le llega el cuadro verdadero',
    trama.cuadro.every((id, i) => revisor.includes(`franja ${i + 1} (${HORAS_DE_FRANJA[i]}): ${nombreDe(id)}`)),
  );
  comprobar('y lo que midió la auditoría', revisor.includes('AUDITORÍA DE PRUEBA'));
  comprobar('y las reglas que lee la mesa', revisor.includes('La noche. Es la madrugada del 14 de enero de 1927'));

  const cambios = (NUDO_REVISION_SCHEMA as { properties: { cambios: { properties: Record<string, unknown> } } }).properties.cambios.properties;
  comprobar(
    'el esquema del revisor solo tiene sitio para prosa',
    Object.keys(cambios).sort().join() === ['ambientacion', 'fichas', 'guion', 'lema', 'partes', 'sinopsis', 'titulo'].join(),
    Object.keys(cambios),
  );
}

// ---------------------------------------------------------------------------
// 11. El alta
// ---------------------------------------------------------------------------

paso('El alta: sin ella la velada se entrega sin revisar y nada falla');
{
  comprobar('el Nudo tiene revisor', revisorDe('nudo') === revisarTramaNudo);
  const instalados = fs.readFileSync(path.join(import.meta.dirname, '..', 'src', 'juegos', 'instalados.ts'), 'utf8');
  comprobar('y lo da de alta `instalados.ts`, que es lo que carga el servidor', /^import '\.\.\/plot\/nudo-revision';$/m.test(instalados));
}

// ---------------------------------------------------------------------------

console.log('');
if (fallos.length) {
  console.log(`✘ ${fallos.length} de ${hechas} comprobaciones fallan:\n`);
  for (const f of fallos) console.log(`  · ${f}`);
  process.exit(1);
}
console.log(`✔ ${hechas} comprobaciones: la revisión del Nudo ve lo que estropea su noche, y deja en paz la que está bien.`);
