/**
 * EL VALLE EN LA MESA: lo que las dos pantallas de Las Lindes hacían igual, escrito una vez.
 *
 * ═══ ERA LA MISMA PANTALLA DOS VECES, MENOS LO QUE LA HACE DE SU CLIENTE ═══
 *
 * `app/src/arcade/lindes-en-tres-escena.tsx` y `escritorio/src/lindes-en-tres.tsx` repetían unas
 * setenta líneas casi palabra por palabra: las tres cámaras con sus nombres, el giro que se ajusta
 * solo al señalar una casilla, el `alFallar` que manda al retablo con el mismo mensaje, la calidad
 * medida con el juez de la casa, la traducción de cada toque al movimiento que se manda, y el
 * montaje del `<Canvas>` con la `<Lindes>` dentro. Cada una con su copia del porqué, y una copia
 * del porqué es el primer sitio donde dos pantallas empiezan a decir cosas distintas: la de la app
 * ya pintaba el valle con otra exposición que la del escritorio sin que nadie lo hubiera decidido.
 *
 * ═══ LO QUE SE QUEDA CADA CLIENTE, Y POR QUÉ ═══
 *
 * La FORMA —una hoja y el pulgar en el teléfono, un raíl y el teclado en el PC—; el `<Canvas>`,
 * porque cada cliente tiene el suyo —el de la app sale de `tres/Lienzo` para que Metro elija el
 * nativo—; cómo se recoge un fallo al pintar —la red de la app apunta en el parte de fallos, el
 * límite del escritorio no tiene parte—; y TODO lo de Boots on Board: desde dónde se mira —el modo,
 * que en una mesa de botas nace a pie—, el canal, su dirección —cada cliente llama a su casa— y su
 * cartel. Eso lo vigila `verify:canal-del-paseo` en el fuente de cada cliente y aquí no se mueve ni
 * una coma: este fichero recibe el modo y devuelve la cámara, y nada más.
 *
 * ═══ Y NINGUNA REGLA ═══
 *
 * Qué se puede poner y dónde, qué sitio se ofrece para plantar, cuál es la acción de pasar: todo
 * sale de `shared/arcade/juegos/lindes-en-tres.ts`, como antes. Esto sólo junta lo que los dos
 * clientes hacían con ello.
 *
 * ═══ UN GANCHO DE REACT EN `escenas/`, Y POR QUÉ NO ES UN PROBLEMA ═══
 *
 * `Lindes.tsx` ya los usa y lo montan los dos clientes: la app resuelve `react` desde su
 * `node_modules` para todo lo que no viene de allí (`app/metro.config.js`) y el escritorio lo
 * deduplica en `vite.config.ts`. Lo que NO hay aquí es `document`, ni teclas, ni un `Canvas`: cada
 * una de esas cosas es de un solo cliente.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ACESFilmicToneMapping } from 'three';
import {
  accionesFueraDeLosSitios,
  elSiguienteGiro,
  girosQueCaben,
  laAccionDePasar,
  movimientoDePoner,
  sitiosQueSeOfrecen,
  tableroEnTres,
} from '../../shared/arcade/juegos/lindes-en-tres';
import type { SitioQueSeOfrece } from '../../shared/arcade/juegos/lindes-en-tres';
import { losaPorId } from '../../shared/arcade/juegos/lindes-losas';
import type { Giro, Losa } from '../../shared/arcade/juegos/lindes-losas';
import type { Opcion } from '../../shared/arcade/opciones';
import type { AccionDeTablero, MovimientoDeclarado } from '../../shared/mecanicas/tablero-declarado';
import type { MuestraDelHilo } from '../embarcadero/calidad';
import { calidadDelValle, conLaMuestra } from './detalle';
import type { Calidad, ModoDeCamaraDeLasLindes, PropsDeLasLindes, TableroDeLasLindesEn3D, Traer } from './tipos';

/** Desde dónde se mira: la mesa, detrás del hombro de la figura, o desde sus ojos. */
export type ModoDelValle = 'mesa' | 'hombro' | 'ojos';

/** Una de las tres cámaras, con el nombre que cabe en cada cliente. */
export interface CamaraDelValle {
  readonly modo: ModoDelValle;
  /** El del escritorio, que tiene sitio para dos palabras: el mismo que el de las del Burgo. */
  readonly rotulo: string;
  /** El del teléfono: tres botones encima del valle, y cada punto de ancho es tablero que no se toca. */
  readonly corto: string;
  /** Lo que el escritorio enseña al pararse encima con el ratón, y por eso nombra las teclas. */
  readonly ayuda: string;
}

/**
 * LAS TRES CÁMARAS, y las tres hacen falta: la de la mesa es con la que se juega, la del hombro es
 * con la que se recorre, y la de los ojos es la que hace que el tablero deje de ser una maqueta y
 * pase a ser un sitio. Van en este orden en los dos clientes —en el escritorio son las teclas 1, 2 y
 * 3— y con las MISMAS palabras que las del Burgo, que `verify:escritorio` compara con éstas.
 */
export const LAS_CAMARAS_DEL_VALLE: readonly CamaraDelValle[] = [
  { modo: 'mesa', rotulo: 'La mesa', corto: 'Mesa', ayuda: 'Desde arriba, con el tablero entero a la vista.' },
  { modo: 'hombro', rotulo: 'Al hombro', corto: 'Hombro', ayuda: 'Detrás de tu figura. Se anda con W, A, S, D.' },
  { modo: 'ojos', rotulo: 'Sus ojos', corto: 'Ojos', ayuda: 'Desde su cara, andando por encima de las losas.' },
];

/** El campo vertical de la cámara, en grados. El mismo que usa `camaraDeMesa` para encuadrar. */
export const CAMPO_DEL_VALLE = 45;

/**
 * EL LIENZO DEL VALLE, el mismo en los dos clientes: lo que cada uno le pone a su `<Canvas>`.
 *
 * Sin sombras en ninguno, y no es una decisión por plataforma: un mapa de sombras redibujado cada
 * fotograma baja un móvil de gama media de sesenta a veinte, y el valle se lee perfectamente sin
 * él. Es lo mismo que hacen el Muelle y el Burgo. Y el plano lejano, a seis mil: el tablero crece
 * de una losa a setenta y dos, y la cámara de mesa se aleja con él.
 */
export const EL_LIENZO_DEL_VALLE: {
  readonly gl: { readonly antialias: boolean };
  readonly dpr: [number, number];
  readonly shadows: boolean;
  readonly camera: { readonly fov: number; readonly near: number; readonly far: number };
} = {
  gl: { antialias: true },
  dpr: [1, 2],
  shadows: false,
  camera: { fov: CAMPO_DEL_VALLE, near: 1, far: 6000 },
};

/**
 * EL MAPEO TONAL DEL VALLE: ACES a 1,02, en los dos. El escritorio lo ponía y la app no —se quedaba
 * con el de serie de r3f, ACES a 1,00—, así que el mismo valle salía un pelo más oscuro en el
 * teléfono sin que nadie lo hubiera decidido. Se le da al `onCreated` de cada `<Canvas>`.
 *
 * Recibe lo justo del renderizador y no el `RootState` de r3f: cada cliente trae su copia de la
 * librería, y un tipo de una copia no se deja asignar al de la otra.
 */
export function alCrearElLienzoDelValle({
  gl,
}: {
  readonly gl: { toneMapping: number; toneMappingExposure: number };
}): void {
  gl.toneMapping = ACESFilmicToneMapping;
  gl.toneMappingExposure = 1.02;
}

/** Lo que cada cliente sabe de la mesa, con la forma mínima que cumplen los dos. */
export interface LaMesaDelValle {
  readonly codigo: string;
  readonly yo: string | null;
  readonly asientos: readonly { readonly id: string; readonly figura?: string }[];
  readonly vista: unknown;
}

/** Lo que el controlador necesita de cada cliente. */
export interface LoQueNecesitaElValle {
  /** La mesa puesta: su código —la semilla del paisaje—, quién soy, las figuras y la vista del juego. */
  readonly puesta: LaMesaDelValle;
  /** El tablero declarado de la vista: de ahí salen la acción de pasar y las acciones de la tira. */
  readonly tablero: { readonly acciones: readonly AccionDeTablero[] } | null;
  /** Lo que el juego ofrece a este asiento AHORA: de ahí salen los sitios donde plantar. */
  readonly opciones: readonly Opcion[];
  readonly mover: (movimiento: MovimientoDeclarado) => unknown;
  readonly quieto: boolean;
  /** Desde dónde se mira. Es del cliente: en una mesa de botas nace a pie, y eso lo decide él. */
  readonly modo: ModoDelValle;
  /** Cómo se traen los modelos: cada cliente tiene su casa. */
  readonly traer: Traer;
}

/**
 * LO QUE VA A LA ESCENA, igual en los dos clientes: se le pasa a `<Lindes>` con `{...valle.escena}`.
 * Lo que falta lo pone cada uno detrás: el canal de una mesa de botas, los mandos del pulgar en la
 * app y el atlas compilado del teléfono.
 */
export type LaEscenaDelValle = Pick<
  PropsDeLasLindes,
  | 'tablero'
  | 'codigo'
  | 'traer'
  | 'calidad'
  | 'alMedir'
  | 'camara'
  | 'giroEnMano'
  | 'figura'
  | 'quieto'
  | 'sePuedePasar'
  | 'alPasar'
  | 'alTocarHueco'
  | 'alSenalarHueco'
  | 'alFallar'
>;

/** Lo que el controlador devuelve: la escena, y lo que la hoja o el raíl de cada cliente pintan. */
export interface ElValleEnLaMesa {
  /** El tablero en tres dimensiones, o `null` si la vista no es de este juego. */
  readonly datos: TableroDeLasLindesEn3D | null;
  /** Lo que se le pasa a `<Lindes>`, o `null` si no hay valle que pintar. */
  readonly escena: LaEscenaDelValle | null;
  /** Por qué se cayó el valle —el tablero que no llegó, el lienzo que reventó—, o `null`. */
  readonly roto: string | null;
  /** Lo que se le da a la escena y a la red de cada cliente: los dos mandan al retablo. */
  readonly alFallar: (motivo: string) => void;
  /** Dónde se puede plantar, con lo que valdría cada sitio. */
  readonly sitios: readonly SitioQueSeOfrece[];
  /** Las acciones del tablero que no son uno de esos sitios: empezar, no plantar. */
  readonly sinRepetir: AccionDeTablero[];
  /** Un botón de la tira o un sitio: manda el movimiento tal cual lo declaró el juego. */
  readonly alTocar: (movimiento: MovimientoDeclarado) => void;
  /** La losa de la mano, del catálogo, o `null` si no hay ninguna. */
  readonly laLosa: Losa | null;
  readonly giro: Giro;
  /** Los giros con que cabe la losa en la casilla señalada; vacío si no hay ninguna señalada. */
  readonly girosAqui: readonly Giro[];
  /** Pasa al siguiente giro que cabe: el botón de «Girar» de los dos, y la R del escritorio. */
  readonly girar: () => void;
  readonly senalada: { readonly x: number; readonly y: number } | null;
}

/**
 * EL CONTROLADOR DE LAS LINDES, para los dos clientes.
 *
 * ═══ EL GIRO VIVE AQUÍ Y NO EN LA PARTIDA ═══
 *
 * Con qué giro se pone la losa es una decisión de PANTALLA hasta que se pulsa: no es estado del
 * juego, no viaja por el cable y no tiene que sobrevivir a nada. Si viviera en la partida, girar
 * sería un movimiento —una revisión, un aviso a los demás aparatos y una entrada en el diario— por
 * cada vuelta que alguien le da a una losa antes de decidirse.
 */
export function usarElValleEnLaMesa(o: LoQueNecesitaElValle): ElValleEnLaMesa {
  const { puesta, tablero, opciones, mover, quieto, modo, traer } = o;
  const vista = puesta.vista;
  const datos = useMemo(() => tableroEnTres(vista), [vista]);
  const sitios = useMemo(() => sitiosQueSeOfrecen(vista, opciones), [vista, opciones]);

  /*
   * EL RELOJ DE ARENA DE LA ESCENA ES TAMBIÉN EL BOTÓN DE PASAR, y lo que manda es LA MISMA acción
   * que manda el botón de la tira: se la pregunta a `shared/`, que es quien sabe cuál de las
   * acciones del tablero es la de no plantar. Dos caminos al mismo gesto que mandaran cosas
   * distintas serían dos gestos, y uno de los dos acabaría roto sin que nadie lo notara.
   */
  const laDePasar = useMemo(() => laAccionDePasar(tablero), [tablero]);
  /*
   * LO QUE VA EN LA TIRA DE LAS ACCIONES: lo que la de los sitios no pinta ya. `acciones` trae TODO
   * lo que no sea poner una losa, así que traía también los plantados, y cada sitio salía dos veces:
   * una con lo que valdría y otra sin nada. Cuáles sobran lo dice `shared/`, que sabe qué movimiento
   * hay detrás de cada sitio. (El respaldo NO filtra: allí no hay tira de sitios.)
   */
  const sinRepetir = useMemo(() => accionesFueraDeLosSitios(tablero, sitios), [tablero, sitios]);

  const [roto, ponerRoto] = useState<string | null>(null);
  const alFallar = useCallback((motivo: string) => {
    console.warn(`El valle no se ha podido pintar (${motivo}): se juega sobre el retablo.`);
    ponerRoto(motivo);
  }, []);

  /*
   * ═══ LA CALIDAD SE MIDE, NO SE ESCRIBE ═══
   *
   * La escena manda por `alMedir` lo que le cuesta cada segundo y `calidadDelValle` (`detalle.ts`)
   * decide con el juez de la casa —22 ms de media en 120 fotogramas—, sobre las últimas doce
   * muestras y sin volver a subir: el tablero crece de una losa a setenta y dos, y juzgar sólo al
   * montar sería juzgar siempre el de una. En todas las plataformas: ninguna decisión mira la
   * plataforma.
   */
  const [calidad, ponerCalidad] = useState<Calidad>('plena');
  const muestras = useRef<MuestraDelHilo[]>([]);
  const alMedir = useCallback((m: { triangulos: number; llamadas: number; ms: number; fotogramas: number }) => {
    muestras.current = conLaMuestra(muestras.current, { ms: m.ms, fotogramas: m.fotogramas });
    ponerCalidad((antes) => calidadDelValle(antes, muestras.current));
  }, []);

  const [giro, ponerGiro] = useState<Giro>(0);
  const [senalada, ponerSenalada] = useState<{ x: number; y: number } | null>(null);
  const girosAqui = useMemo(
    () => (datos === null || senalada === null ? [] : girosQueCaben(datos, senalada.x, senalada.y)),
    [datos, senalada],
  );
  /*
   * EL GIRO SE AJUSTA SOLO AL SEÑALAR UNA CASILLA: si el que llevas elegido no cabe ahí, pasa al
   * primero que sí. Lo contrario es un fantasma que no aparece y un toque que pone la losa de otra
   * manera, y enseñar lo que va a pasar antes de que pase es toda la gracia del fantasma.
   */
  useEffect(() => {
    if (girosAqui.length === 0) return;
    if (girosAqui.indexOf(giro) >= 0) return;
    ponerGiro(girosAqui[0] as Giro);
  }, [girosAqui, giro]);
  const girar = useCallback(() => {
    ponerGiro((g) => elSiguienteGiro(girosAqui, g));
  }, [girosAqui]);

  const alTocar = useCallback(
    (movimiento: MovimientoDeclarado) => {
      void mover(movimiento);
    },
    [mover],
  );
  const alTocarHueco = useCallback(
    (x: number, y: number, conGiro: Giro) => {
      void mover(movimientoDePoner(x, y, conGiro));
    },
    [mover],
  );
  const alSenalarHueco = useCallback((x: number | null, y: number | null) => {
    ponerSenalada(x === null || y === null ? null : { x, y });
  }, []);

  const laLosa = datos === null || datos.enMano === '' ? null : losaPorId(datos.enMano);
  /* Quien pasea es quien está sentado en esta pantalla; un mirón pasea sin asiento. */
  const camara: ModoDeCamaraDeLasLindes = modo === 'mesa' ? { modo: 'mesa' } : { modo, asiento: puesta.yo ?? '' };

  const escena: LaEscenaDelValle | null =
    datos === null
      ? null
      : {
          tablero: datos,
          codigo: puesta.codigo,
          traer,
          calidad,
          alMedir,
          camara,
          giroEnMano: giro,
          /*
           * LA FIGURA DE QUIEN PASEA, sacada del asiento de la mesa. Si no eligió ninguna,
           * `figuraQueSePinta` saca una del identificador: nunca se queda sin nadie a quien seguir.
           */
          figura: puesta.asientos.find((a) => a.id === puesta.yo)?.figura,
          quieto,
          sePuedePasar: laDePasar !== null && !quieto,
          alPasar: laDePasar === null ? undefined : () => alTocar(laDePasar.toque),
          alTocarHueco,
          alSenalarHueco,
          alFallar,
        };

  return { datos, escena, roto, alFallar, sitios, sinRepetir, alTocar, laLosa, giro, girosAqui, girar, senalada };
}
