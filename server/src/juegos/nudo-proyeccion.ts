/**
 * Qué ve del estado de la estación cada persona, y qué ve quien dirige.
 *
 * ═══ LA REGLA DE ESTE FICHERO, EN UNA FRASE ═══
 *
 * **El objeto que sale de aquí se compone campo a campo y nunca se copia el
 * estado entero.** Un `...estado` sería más corto y sería la forma de que, el
 * día que alguien añada un campo al estado, ese campo viaje a doce móviles sin
 * que nadie lo decida. En esta partida hay dos cosas que no pueden salir jamás:
 *
 *   1. LA SOLUCIÓN DE CADA INSTRUMENTO. Vive dentro de `estado.instrumentos`,
 *      pegada al planteamiento, porque el reductor las necesita juntas. Si
 *      viajara, el minijuego se resolvería mirando el JSON de la respuesta.
 *
 *   2. LOS TELEGRAMAS AJENOS. Son de papel y son de quien los tiene. Que la app
 *      te enseñe los tuyos es una comodidad para quien pierda su sobre; que te
 *      enseñara los de los demás sería quitarle a la mesa la única razón que
 *      tiene para hablarse.
 *
 * Y hay una tercera que no está aquí y conviene decir dónde está: el CUADRO
 * VERDADERO no vive en el estado sino en la trama (`plot.delJuego`), que no
 * viaja al móvil por ningún camino. No hace falta filtrarlo porque no está.
 */
import { registrarProyeccion, registrarProyeccionParaGm } from './proyecciones';
import { entidadesDe } from '../../../shared/juegos';
import { estadoDe, franjasSinDespacho, plantearFranja } from './nudo-acciones';
import { tramaDe } from './nudo-trama';
import {
  horaDeFranja,
  MANA_DE_OFICIO,
  MARGEN_POR_CONSULTA,
  MARGEN_POR_RECUPERAR,
  NOMBRE_DE_OFICIO,
  OFICIO_DE_PERSONA,
} from '../../../shared/juegos/nudo-tipos';
import type { EstadoNudo, Instrumento, OficioId } from '../../../shared/juegos/nudo-tipos';
import type { LiveSession } from '../../../shared/live';
import type { GameSession } from '../../../shared/types';

/**
 * El instrumento SIN su solución, listo para viajar.
 *
 * Campo a campo, y por eso no hay un `delete solucion`: borrar campos de una
 * copia es una defensa que se rompe callada en cuanto alguien añade el segundo
 * campo secreto. Nombrar los cuatro que sí salen no se rompe nunca.
 */
function instrumentoParaFuera(
  instrumento: Instrumento,
  participanteId: string | undefined,
): {
  puesto: string;
  franja: number;
  cual: OficioId;
  nombre: string;
  planteamiento: unknown;
  cuantosLoHanResuelto: number;
  loHeResuelto: boolean;
} {
  return {
    puesto: instrumento.puesto,
    franja: instrumento.franja,
    cual: instrumento.cual,
    nombre: NOMBRE_DE_OFICIO[instrumento.cual],
    planteamiento: instrumento.planteamiento,
    /*
     * Cuántos y no quiénes: saber que dos personas ya lo han sacado sirve para
     * decidir si vale la pena quedarse, y saber sus nombres no aporta nada que
     * no se vea entrando en la habitación.
     */
    cuantosLoHanResuelto: instrumento.resueltoPor.length,
    loHeResuelto: participanteId ? instrumento.resueltoPor.includes(participanteId) : false,
  };
}

/**
 * Los instrumentos que hay que enseñar, sin escribir nada.
 *
 * ═══ POR QUÉ NO SE LLAMA A `montarFranja` ═══
 *
 * Porque la proyección corre FUERA del candado de `mutar`: lo que escribiera no
 * se guardaría, y peor, podría contar dos veces la conformidad de la franja. Lo
 * que se hace es plantear en el aire con la misma función determinista, así que
 * quien abre la app antes de que nadie haya tocado nada ve exactamente el mismo
 * problema que va a quedar guardado en cuanto alguien actúe.
 *
 * El estado guardado gana cuando existe y es de esta franja: ahí están los
 * `resueltoPor`, que sí son historia.
 */
function instrumentosDeAhora(
  game: GameSession,
  sesion: LiveSession,
  estado: EstadoNudo,
): Record<string, Instrumento> {
  const franja = Math.max(1, sesion.round);
  const guardados = estado.instrumentos ?? {};
  const alguno = Object.values(guardados)[0];
  if (alguno && alguno.franja === franja) return guardados;
  try {
    return plantearFranja(game, franja);
  } catch {
    /* Sin trama no hay instrumentos, y eso no puede tumbar la vista. */
    return {};
  }
}

/** Lo que ve del estado de la noche una persona concreta. */
export function vistaDelNudo(
  game: GameSession,
  sesion: LiveSession,
  participanteId: string,
): unknown {
  const trama = tramaDe(game.plot);
  if (!trama) return undefined;
  const estado = estadoDe(game, sesion);
  const instrumentos = instrumentosDeAhora(game, sesion, estado);

  const convoyes = entidadesDe(game, 'convoyes');
  const puestos = entidadesDe(game, 'puestos');
  const mercancias = entidadesDe(game, 'mercancias');
  const nombreDeConvoy = (id: string): string => convoyes.find((c) => c.id === id)?.name ?? id;

  const ficha = estado.gente[participanteId];
  const oficio: OficioId = trama.oficioDePersona[participanteId] ?? 'agujas';
  const jugador = sesion.players.find((p) => p.participanteId === participanteId);
  const miPuesto = jugador?.elecciones
    .filter((e) => e.round === sesion.round)
    .slice(-1)[0]?.lugarId;

  const mias = trama.reparto[participanteId] ?? [];

  return {
    /* ---- La noche, que es pública entera ---- */
    franja: Math.max(0, sesion.round),
    franjas: trama.cuadro.length,
    hora: horaDeFranja(Math.max(1, sesion.round)),
    retraso: estado.retraso,
    retrasoMaximo: trama.retrasoMaximo,
    conformidades: estado.conformidades,
    despachados: estado.despachados,
    salidos: estado.salidos.map((id) => ({ id, nombre: nombreDeConvoy(id) })),
    /*
     * QUIÉN ES EL CORREO ES PÚBLICO, y a propósito: sin saberlo, la regla «si el
     * Correo no cruza no hay nada más que hablar» no se puede jugar. Está en su
     * hoja de porte, encima de la mesa, desde el minuto uno.
     */
    correo: { id: trama.correo, nombre: nombreDeConvoy(trama.correo) },
    porSalir: convoyes
      .filter((c) => !estado.salidos.includes(c.id))
      .map((c) => ({
        id: c.id,
        nombre: c.name,
        carga: mercancias.find((m) => m.id === trama.cargaDeConvoy[c.id])?.name,
      })),
    /*
     * La crónica de las órdenes es PÚBLICA, incluidas las rechazadas. Es lo que
     * la mesa ha visto pasar en voz alta, y tenerla escrita evita la discusión
     * de «¿pero ese no lo habíamos probado ya?» a las tres de la mañana.
     */
    ordenes: estado.ordenes.map((o) => ({
      franja: o.franja,
      convoy: o.convoy,
      nombre: nombreDeConvoy(o.convoy),
      aceptada: o.aceptada,
    })),
    franjasPerdidas: franjasSinDespacho(estado, Math.max(0, sesion.round - 1)),

    /* ---- Tú ---- */
    yo: {
      oficio,
      oficioNombre: OFICIO_DE_PERSONA[oficio],
      instrumentoNombre: NOMBRE_DE_OFICIO[oficio],
      mana: MANA_DE_OFICIO[oficio],
      manaUsada: ficha?.manaUsada ?? false,
      /* Los efectos armados: la mesa tiene que poder verlos en tu pantalla. */
      indulto: ficha?.indulto ?? false,
      consultaGratis: ficha?.consultaGratis ?? false,
      sinConformidad: ficha?.sinConformidad ?? false,
      margen: ficha?.margen ?? 0,
      consultas: ficha?.consultas ?? 0,
      instrumentosResueltos: ficha?.instrumentosResueltos ?? 0,
      /* SOLO LOS TUYOS. Ver la cabecera. */
      telegramas: mias
        .map((id) => trama.telegramas.find((t) => t.id === id))
        .filter((t): t is NonNullable<typeof t> => t !== undefined)
        .map((t) => ({ id: t.id, texto: t.texto })),
      puesto: miPuesto,
      puestoNombre: miPuesto ? puestos.find((p) => p.id === miPuesto)?.name : undefined,
    },

    /* ---- El instrumento que tienes delante ---- */
    instrumento: miPuesto && instrumentos[miPuesto]
      ? instrumentoParaFuera(instrumentos[miPuesto]!, participanteId)
      : undefined,

    /* ---- Los puestos, con lo que se sabe de cada uno ---- */
    puestos: puestos.map((p) => ({
      id: p.id,
      nombre: p.name,
      oficio: trama.oficioDePuesto[p.id],
      oficioNombre: trama.oficioDePuesto[p.id]
        ? NOMBRE_DE_OFICIO[trama.oficioDePuesto[p.id]!]
        : undefined,
      rendido: estado.puestosRendidos.includes(p.id),
    })),

    /* ---- Lo que cuesta cada cosa, para no tener que recordarlo ---- */
    tarifa: { consulta: MARGEN_POR_CONSULTA, recuperar: MARGEN_POR_RECUPERAR },

    /* ---- Y el final, cuando lo hay ---- */
    amanecer: estado.amanecer,
  };
}

registrarProyeccion('nudo', (game, sesion, participanteId) =>
  vistaDelNudo(game, sesion, participanteId),
);

/**
 * Lo que puede ver del estado quien dirige A CIEGAS.
 *
 * ═══ POR QUÉ HACE FALTA UNA SEGUNDA ═══
 *
 * La vista del Game Master manda la `sesion` entera, y dentro va `estado`. Aquí
 * eso incluye la solución de los cuatro instrumentos de la franja: el panel no
 * las pinta, pero el dato viaja al navegador, y con el Game Master jugando eso
 * es la maniobra resuelta en las herramientas de desarrollo.
 *
 * SOLO SE FILTRA A CIEGAS. Dirigiendo de la forma normal, quien dirige tiene el
 * cuadro verdadero impreso en la mano: esconderle las soluciones de un minijuego
 * sería quitarle medio puesto de mando por nada.
 *
 * LO QUE SÍ VE A CIEGAS, y es lo importante: el retraso, las conformidades, qué
 * puestos están rendidos, quién lleva cuánto margen y la crónica de órdenes.
 * Con eso se dirige la noche entera sin conocer el cuadro.
 */
registrarProyeccionParaGm('nudo', (game, sesion) => {
  const estado = estadoDe(game, sesion);
  return {
    despachados: estado.despachados,
    salidos: estado.salidos,
    retraso: estado.retraso,
    conformidades: estado.conformidades,
    puestosRendidos: estado.puestosRendidos,
    ordenes: estado.ordenes,
    franjasPerdidas: franjasSinDespacho(estado, Math.max(0, sesion.round - 1)),
    gente: estado.gente,
    amanecer: estado.amanecer,
    /*
     * Los instrumentos SIN solución. Se pasa `undefined` como persona porque
     * quien dirige no resuelve ninguno: `loHeResuelto` sería siempre falso y
     * decir «cuántos» es lo que le sirve para saber si la mesa está trabajando.
     */
    instrumentos: Object.fromEntries(
      Object.entries(estado.instrumentos ?? {}).map(([id, i]) => [
        id,
        instrumentoParaFuera(i, undefined),
      ]),
    ),
  };
});
