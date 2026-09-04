/**
 * LOS PLAZOS QUE SE OFRECEN AL ABRIR UNA MESA, con su nombre.
 *
 * ═══ POR QUÉ CINCO BOTONES Y NO UN CAMPO DE NÚMERO ═══
 *
 * Porque lo que se está eligiendo no es un número: es QUÉ CLASE DE PARTIDA es
 * ésta. «Un rato» y «un día por turno» son dos productos distintos —una se juega
 * sentados en un bar y la otra se juega desde el trabajo a lo largo de la semana— y
 * un campo libre le pediría a quien abre que tradujera esa decisión a segundos.
 *
 * El primero no manda nada y deja que mande el defecto del servidor, que es lo
 * correcto: el número lo decide quien hospeda, y tenerlo escrito aquí sería una
 * segunda copia que se desincroniza el día que cambie allí.
 *
 * ═══ Y EL QUINTO, «SIN PRISA», QUE FALTÓ UNA VEZ ═══
 *
 * `plazoSegundos: 0` está documentado como legítimo desde la cabecera de `abrir`
 * —«esta mesa no tiene prisa»— y fue el único plazo que la app NO podía pedir:
 * ninguno de los cuatro botones mandaba cero, y `turnoDesde` —que sólo llega a la
 * pantalla en una mesa sin plazo— era código muerto desde la app. Va el último a
 * propósito: es el caso raro, y quien lo elige sabe lo que elige.
 *
 * ═══ POR QUÉ ES UN FICHERO Y NO UNA CONSTANTE DENTRO DE UNA PANTALLA ═══
 *
 * Porque lo piden DOS pantallas —el tablero en línea y la hoja del Muelle— y la
 * segunda nació con una copia de la tabla de la primera, con un comentario que
 * decía «si cambia una tiene que cambiar la otra». Eso es exactamente la clase de
 * promesa que se rompe sola. Sin un solo `import`, para que un comprobador de Node
 * pueda leerla el día que haga falta.
 */
export interface Plazo {
  readonly rotulo: string;
  /** `undefined` = no se manda nada y decide el servidor; `0` = sin plazo. */
  readonly segundos: number | undefined;
  readonly ayuda: string;
}

export const PLAZOS: readonly Plazo[] = [
  { rotulo: 'Como venga', segundos: undefined, ayuda: 'El plazo por defecto del servidor.' },
  { rotulo: 'Un rato', segundos: 10 * 60, ayuda: 'Diez minutos por turno. Para jugar del tirón.' },
  { rotulo: 'Un día', segundos: 24 * 60 * 60, ayuda: 'Veinticuatro horas por turno. La Larga.' },
  { rotulo: 'Tres días', segundos: 3 * 24 * 60 * 60, ayuda: 'Para una partida de la semana entera.' },
  { rotulo: 'Sin prisa', segundos: 0, ayuda: 'Sin plazo: el turno no se pasa solo nunca.' },
];
