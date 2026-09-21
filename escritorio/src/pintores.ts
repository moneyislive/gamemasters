/**
 * QUIÉN PINTA CADA ARCADE EN EL ESCRITORIO, EN UNA TABLA (decisión 18 del §1).
 *
 * ═══ POR QUÉ UNA TABLA Y NO CINCO `if` ═══
 *
 * La Sala pinta cada arcade con el mueble que declara su manifiesto: `tablero` es el
 * retablo, `formulario` es la lista de botones. Un arcade puede además traer PINTOR
 * PROPIO —una escena en tres dimensiones que sabe de sus reglas—, y hasta hoy eso se
 * decidía en `sala.tsx` con cinco puntos cableados al nombre de Riberas: si es Riberas,
 * monta `<RiberasEnTres>`; si es Riberas, pinta su marcador; si es Riberas, filtra sus
 * paneles; si es Riberas, compón su pregón. Cinco sitios, y cada uno con su propio
 * `esRiberas` que había que acordarse de tocar.
 *
 * El segundo pintor —el Burgo— habría hecho de esos cinco puntos diez, con dos formas de
 * decidir lo mismo conviviendo en el mismo render. Aquí están en UNA tabla: quien tiene
 * pintor propio lo declara con lo que sabe hacer, y `sala.tsx` lee la fila y monta. El
 * tercer pintor no volverá a pagar esto: escribe su fila y ya está.
 *
 * Es el espejo de `LOS_QUE_PINTA` de la app (`app/src/arcade/pintados.ts`), que resuelve
 * el mismo problema del otro lado con la misma forma.
 *
 * ═══ LAS CONSTANTES SE IMPORTAN DEL JUEGO, NUNCA DEL ÍNDICE ═══
 *
 * `RIBERAS` sale de `shared/arcade/juegos/riberas` y `BURGO` de `.../burgo`, y no de
 * `juegos/index.ts`: el índice INSTALA todos los arcades al cargarse, y eso es cosa del
 * servidor. Este cliente sólo necesita el nombre. Es la misma razón que `sala.tsx` ya
 * tenía escrita para su importación de `RIBERAS`.
 *
 * ═══ EN QUÉ SE APARTA ESTO DEL BOCETO DEL §6.2, Y POR QUÉ ═══
 *
 * El §6.2 dibuja `panelesDe?: (paneles, vista) => PanelDeTablero[]` y `pregonDe?: (vista)
 * => string | null`. Ninguna de las dos cabe con esas firmas:
 *
 *   · El pregón de Riberas es `elPregonEnTres(vista, yo, opciones)` y devuelve un OBJETO
 *     —las tiras vivas, las cerradas y sus botones—, no una cadena. Hace falta `yo` (una
 *     propuesta dirigida a mí no es lo mismo que una mía) y hacen falta las opciones
 *     ENTERAS, antes de ningún filtro, o cada tira se quedaría sin los dos botones que
 *     cuelga. Así que recibe la mesa que se lee y devuelve `unknown`: esta tabla no tiene
 *     por qué saber qué es un pregón.
 *   · `panelesDe` recibe además ESE pregón, porque el panel «Trueques» se retira
 *     exactamente cuando el pregón lo hereda y la criba lo decide con el objeto, no con un
 *     interruptor: sin pregón —un mirón, el respaldo del retablo— los paneles se quedan.
 *
 * La partición que dibuja el §6.2 se respeta entera; lo que cambia son los argumentos, y
 * queda dicho aquí para que nadie lo tome por descuido.
 */
import type { ComponentType, ReactNode } from 'react';
import type { Opcion } from '../../shared/arcade';
import type { PanelDeTablero, TableroDeclarado } from '../../shared/mecanicas/tablero-declarado';
/* De `riberas.ts` y de `burgo.ts`, nunca del índice: ver la cabecera. */
import { RIBERAS } from '../../shared/arcade/juegos/riberas';
import { BURGO } from '../../shared/arcade/juegos/burgo';
import { LINDES } from '../../shared/arcade/juegos/lindes';
import {
  elPregonEnTres,
  panelesEnTres,
  panelesFueraDelPregon,
} from '../../shared/arcade/juegos/riberas-en-tres';
import type { PregonEnTres } from '../../shared/arcade/juegos/riberas-en-tres';
import { BurgoEnTres, MarcadorDelBurgo } from './burgo-en-tres';
import { LindesEnTres, MarcadorDeLasLindes } from './lindes-en-tres';
import type { LaMesa, MesaVista } from './mesa';
import type { ArcadeDelCatalogo } from './muebles';
import { MarcadorDeRiberas, RiberasEnTres } from './riberas-en-tres';

/**
 * LO QUE LA SALA LE DA A UN PINTOR PROPIO. Es la forma que ya tenían `LoQueVeRiberas` y
 * `LoQueVeElBurgo`, escrita una vez para que la tabla pueda tiparse: los dos pintores la
 * cumplen letra por letra, y el tercero tendrá que cumplirla también.
 */
export interface LoQueVeElPintor {
  manifiesto: ArcadeDelCatalogo;
  mesa: LaMesa;
  puesta: MesaVista;
  tablero: TableroDeclarado;
  opciones: readonly Opcion[];
  foco?: (recuadro: HTMLElement | null) => void;
  elRail?: ReactNode;
  laSalida?: string;
}

/** Lo que hace falta leer de la mesa para componer un pregón o un marcador. */
export interface LaMesaQueSeLee {
  readonly vista: unknown;
  readonly yo: string | null;
  /** ENTERAS, antes de ningún filtro: ver la cabecera. */
  readonly opciones: readonly Opcion[];
}

export interface PintorPropio {
  /** El que ocupa el sitio del retablo. Decide él mismo si cae al respaldo. */
  readonly Pintor: ComponentType<LoQueVeElPintor>;
  /** Un marcador propio en el raíl, delante de los paneles que declara el juego. */
  readonly Marcador?: ComponentType<{ vista: unknown; yo: string | null }>;
  /** Lo que se pregona fuera de los paneles, si el juego tiene algo así. `null` si no hay nada vivo. */
  readonly pregonDe?: (mesa: LaMesaQueSeLee) => unknown;
  /** Los paneles del juego, ordenados y cribados para esta pantalla. */
  readonly panelesDe?: (paneles: readonly PanelDeTablero[], pregon: unknown) => PanelDeTablero[];
}

/**
 * LA TABLA. Un arcade que no esté aquí se pinta con su mueble genérico y no se entera de
 * que este fichero existe, que es exactamente lo que tiene que pasar con los cuatro que
 * hay y con los que entren por `ARCADES_EXTERNOS`.
 */
export const PINTORES_PROPIOS: Readonly<Record<string, PintorPropio>> = {
  [RIBERAS]: {
    Pintor: RiberasEnTres,
    Marcador: MarcadorDeRiberas,
    pregonDe: ({ vista, yo, opciones }) => elPregonEnTres(vista, yo, opciones),
    /*
     * `panelesEnTres` pone delante el panel donde están MIS BIENES POR CLASE —que en la
     * escena son cartas sin número, así que «limo: 3» no se lee en ningún otro sitio— y le
     * quita al panel «La mesa» la cifra de bienes de cada colono (decisión 17 de Miguel).
     * `panelesFueraDelPregon` retira «Trueques» cuando el pregón lo hereda, y sólo entonces.
     * Las dos criban en `shared/`, donde `verify:riberas-en-tres` las mide desde Node.
     */
    panelesDe: (paneles, pregon) =>
      panelesFueraDelPregon(panelesEnTres(paneles), pregon as PregonEnTres<Opcion> | null),
  },
  /*
   * ═══ EL TERCER PINTOR, Y NO HA PAGADO NADA ═══
   *
   * La cabecera de este fichero prometía que «el tercer pintor no volverá a pagar
   * esto: escribe su fila y ya está». Ésta es esa fila, y se cumplió: dos líneas y
   * ni un `if` en `sala.tsx`.
   *
   * Sin `pregonDe` ni `panelesDe` por lo mismo que El Burgo: lo que Las Lindes
   * tiene que decir fuera del tablero —la losa de la mano, dónde plantar, quién
   * va ganando— lo pinta su propio raíl, y sus paneles declarados se pintan tal
   * cual porque el reglamento no tiene ninguno que sobre.
   */
  [LINDES]: {
    Pintor: LindesEnTres,
    Marcador: MarcadorDeLasLindes,
  },
  [BURGO]: {
    Pintor: BurgoEnTres,
    Marcador: MarcadorDelBurgo,
    /*
     * El Burgo no pregona nada fuera de los paneles: lo que en Riberas es una tira colgada
     * de la cinta, aquí es la sección «El trato» de la hoja, dentro del cajón. Y sus paneles
     * declarados se pintan tal cual: el reglamento no tiene ninguno que sobre. Sin las dos
     * filas, `sala.tsx` deja `elPregonSePinta` en `null` y `Paneles` cae a los del tablero,
     * que es lo que hacía con cualquier arcade sin pintor propio.
     */
  },
};
