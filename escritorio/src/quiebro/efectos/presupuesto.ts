/**
 * EL PRESUPUESTO DE LOS EFECTOS: cuántas instancias, triángulos y llamadas gasta cada pieza en cada
 * nivel, escrito una sola vez y leído por las piezas y por el comprobador.
 *
 * ═══ POR QUÉ LAS PIEZAS LEEN DE AQUÍ Y NO AL REVÉS ═══
 *
 * Un renglón de presupuesto escrito aparte de la pieza que describe es un renglón que miente en
 * cuanto alguien sube la lluvia «un poco» en el componente: el comprobador sigue sumando el número
 * viejo y sale verde. Así que la pieza NO tiene sus cifras: pide `instanciasDe(pieza, nivel)` y los
 * ajustes de `POR_NIVEL`, y la forma de su geometría sale de `TRIANGULOS_DE_LA_FORMA`, que el
 * comprobador contrasta con la geometría DE VERDAD (`geometrias.ts`, construida en Node). Lo que se
 * suma es lo que se pinta.
 *
 * ═══ QUÉ SE CUENTA: EL PEOR CASO, TODO A LA VEZ ═══
 *
 * Cada pieza es UNA malla instanciada y cuenta UNA llamada —la que hace cuando tiene algo vivo—, y
 * sus triángulos son los de su capacidad llena. En la noche real casi nunca coinciden el Bis, un
 * Trasvase, tres impresiones y una ráfaga, pero el tope se mide contra esa suma porque es la que
 * rompe un N0: las piezas vacías se apagan (`visible = false`) y no gastan nada.
 *
 * ═══ LO QUE ES DE JUEGO NO BAJA CON EL NIVEL ═══
 *
 * «La estructura, los anillos, las líneas de apuntado, las balas […] son idénticos en todos los
 * niveles» (diseño §8). Aquí eso son `anillos`, `trazos` (apuntado y balas) y `esquirlas` (se
 * recogen pasando cerca: si en N0 hubiera menos, un jugador vería botín que otro no ve). Van
 * marcadas `deJuego` y el comprobador exige la misma cifra en los cuatro niveles. El resto es
 * adorno y crece con el nivel, nunca decrece.
 *
 * ═══ DE DÓNDE SALEN LOS TOPES DE LA ESCENA ═══
 *
 * Del §8 del diseño, provisionales hasta el banco en aparato: N0 150 000 triángulos y 60 llamadas,
 * N1 250 000 / 90, N2 600 000 / 150, N3 1 500 000 / 250. El dueño de esas cifras es el gobernador
 * (`calidad/niveles.ts`, de otro frente); se copian aquí sólo para comprobar que los efectos caben
 * en su parte (`PARTE_DE_LOS_EFECTOS`). Si allí cambian, aquí se ve rojo y se decide.
 *
 * Puro: ni three ni DOM.
 */

/** Los cuatro niveles automáticos de calidad (diseño §8). */
export type Nivel = 0 | 1 | 2 | 3;
export const NIVELES: readonly Nivel[] = [0, 1, 2, 3];

/** Una cifra por nivel, de N0 a N3. */
export type PorNivel = readonly [number, number, number, number];

/** Las familias de sombreador: UN material (un programa) por familia. */
export type Familia = 'anuncio' | 'ondas' | 'cintas' | 'tapices' | 'chispas' | 'esquirlas';

/** Las formas de geometría que se instancian. */
export type Forma = 'cuadro' | 'cinta-recta' | 'cinta-curva' | 'esquirla';

/** Tramos de una cinta curva (los hilos del Trasvase y el cable de la salida). */
export const SEGMENTOS_DE_LA_CURVA = 12;
/** Caras de una esquirla: bipirámide hexagonal, seis arriba y seis abajo. */
export const CARAS_DE_LA_ESQUIRLA = 12;

/** Triángulos de UNA instancia de cada forma. `geometrias.ts` los tiene que dar exactos. */
export const TRIANGULOS_DE_LA_FORMA: Readonly<Record<Forma, number>> = {
  cuadro: 2,
  'cinta-recta': 2,
  'cinta-curva': 2 * SEGMENTOS_DE_LA_CURVA,
  esquirla: CARAS_DE_LA_ESQUIRLA,
};

/*
 * ─────────────────────────────── Lo que hay a la vez ───────────────────────────────
 *
 * Topes de juego, del diseño: 3 anuncios por persona × 6 personas = 18 (cabe en 24); 2 tiradores
 * con una línea cada uno y ráfagas de 3, 12 balas vivas como mucho (§10: «Balas (12 como mucho)»);
 * esquirlas: 3 por Celador desalojado, hasta 12 por desvelado en un montón.
 */
export const ANILLOS_A_LA_VEZ = 24;
export const APUNTADOS_A_LA_VEZ = 6;
export const BALAS_A_LA_VEZ = 12;
export const IMPACTOS_A_LA_VEZ = 8;
export const SILUETAS_A_LA_VEZ = 8;
export const HACES_A_LA_VEZ = 2;
export const TRASVASES_A_LA_VEZ = 3;
export const SALIDAS_A_LA_VEZ = 2;
/** El cable de la cabina en tramos rectos (del auricular al poste, del poste a la marquesina, y arriba). */
export const TRAMOS_DEL_CABLE = 3;
export const ESQUIRLAS_A_LA_VEZ = 96;
/*
 * EL RAYO (`docs/quiebro/EL-RAYO.md` §4 y §7). Seis asientos pueden cargar y soltar a la vez, pero lo que se VE a la
 * vez es menos: un rayo dura en pantalla menos de medio segundo y una carga, lo que se mantenga el botón. Cuatro de
 * cada cosa; con más, se pisa lo más viejo (`Ranuras`). Las marcas chamuscadas duran unos segundos y van aparte.
 */
export const RAYOS_A_LA_VEZ = 4;
export const CARGAS_A_LA_VEZ = 4;
export const MARCAS_A_LA_VEZ = 4;

/** Los ajustes de adorno que cambian con el nivel. Cada pieza lee los suyos. */
export const POR_NIVEL = {
  /** Columnas de la Grafía en el cielo, tras la niebla. */
  columnasDelCielo: [32, 64, 112, 176],
  /** Pantallas de la ciudad con lluvia de glifos que se pintan a la vez. */
  pantallas: [12, 20, 28, 36],
  /** Ondas de aire vivas detrás de cada bala. */
  ondasPorBala: [2, 3, 5, 6],
  /** Chispas de un impacto de fuerza 1 (los flojos, menos). */
  chispasPorImpacto: [10, 16, 24, 32],
  /** Chispas vivas como mucho: el anillo circular donde caen. */
  chispasVivas: [48, 96, 192, 320],
  /** Hilos de un Trasvase. */
  hilosPorTrasvase: [3, 4, 5, 5],
  /** Columnas de glifos a lo ancho de una silueta (impresión, desalojo, salida). */
  columnasPorSilueta: [6, 8, 10, 12],
  /** Paños del muro del Bis alrededor del círculo. */
  panelesDelMuro: [24, 32, 48, 64],
  /** Bandas del marco del Bis: en N0 sólo arriba y abajo. */
  bandasDelMarco: [2, 4, 4, 4],
  /*
   * EL RAYO, por nivel (EL-RAYO.md §4, la tabla N0-N3). Lo que el jugador USA para decidir —dónde da, cuánto
   * abarca (la onda del suelo mide el área de verdad), la carga de otro— sale igual en los cuatro; lo que baja en
   * N0 es el detalle: el canal en menos tramos, sin ramas, una sola descarga y una estela corta.
   */
  /** Tramos de doce segmentos en que se parte el canal de un rayo (el primero, junto a la mano, el más corto). */
  tramosDelRayo: [4, 5, 7, 8],
  /** Ramas de un rayo. */
  ramasDelRayo: [0, 1, 2, 3],
  /** Descargas del pleno (la primera y sus re-descargas, en menos de 90 ms). */
  descargasDelRayo: [1, 2, 3, 3],
  /** Lo que dura la estela ionizada del pleno, en ms (en el reloj presentado). */
  estelaDelRayo: [150, 250, 350, 450],
  /** Filamentos que chisporrotean alrededor de la mano que carga. */
  filamentosDeLaCarga: [2, 3, 4, 5],
  /** Motas que convergen hacia la mano que carga. */
  motasDeLaCarga: [4, 6, 8, 10],
  /** Soplos de vapor del suelo mojado en el estallido. */
  vaporDelEstallido: [0, 1, 2, 3],
} as const satisfies Record<string, PorNivel>;

/**
 * Las cintas de un rayo en un nivel: dos por tramo del canal —el NÚCLEO, fino y quebrado a todas las escalas, y su
 * VELO, ancho y con el quiebro fino muy rebajado (una cinta ancha que sigue un quiebro más corto que su anchura se
 * dobla sobre sí misma y sale una soga borrosa)— y las ramas.
 */
export function cintasPorRayo(n: Nivel): number {
  return 2 * POR_NIVEL.tramosDelRayo[n] + POR_NIVEL.ramasDelRayo[n];
}
/** Las cintas de una carga en un nivel: los filamentos y las motas. */
export function cintasPorCarga(n: Nivel): number {
  return POR_NIVEL.filamentosDeLaCarga[n] + POR_NIVEL.motasDeLaCarga[n];
}
/**
 * Las ondas de un rayo: el fogonazo de la boca, el resplandor del estallido, la onda del suelo, el destello del
 * área, el charco de luz en el suelo y los soplos de vapor.
 */
export function ondasPorRayo(n: Nivel): number {
  return 5 + POR_NIVEL.vaporDelEstallido[n];
}
/** Las ondas de una carga: el núcleo que crece en la palma y el aro que se contrae. */
export const ONDAS_POR_CARGA = 2;

export type AjusteDeNivel = keyof typeof POR_NIVEL;

/** El valor de un ajuste en un nivel. */
export function ajuste(que: AjusteDeNivel, nivel: Nivel): number {
  return POR_NIVEL[que][nivel];
}

/** Las piezas: una malla instanciada cada una. */
export type Pieza =
  | 'anillos'
  | 'trazos'
  | 'ondas'
  | 'chispas'
  | 'siluetas'
  | 'hilos'
  | 'muro'
  | 'marco'
  | 'esquirlas'
  | 'cielo'
  | 'pantallas'
  | 'rayos';

export interface RenglonDePieza {
  readonly pieza: Pieza;
  readonly familia: Familia;
  readonly forma: Forma;
  /** Lo que pinta, para el informe del banco. */
  readonly queLleva: string;
  /** Señal de juego: la misma cifra en todos los niveles. */
  readonly deJuego: boolean;
  /** Reloj con que se anima: el verdadero (señales de juego) o el presentado (adorno). */
  readonly reloj: 'verdadero' | 'presentado';
  /** Instancias como mucho, por nivel. */
  readonly instancias: PorNivel;
}

/** Una cifra por nivel a partir de una cuenta. */
function porNivel(f: (n: Nivel) => number): PorNivel {
  return [f(0), f(1), f(2), f(3)];
}

/** LOS RENGLONES. El orden es el de pintado dentro de los efectos. */
export const PIEZAS: readonly RenglonDePieza[] = [
  {
    pieza: 'cielo',
    familia: 'tapices',
    forma: 'cuadro',
    queLleva: 'columnas de Grafía que suben tras la niebla',
    deJuego: false,
    reloj: 'presentado',
    instancias: POR_NIVEL.columnasDelCielo,
  },
  {
    pieza: 'pantallas',
    familia: 'tapices',
    forma: 'cuadro',
    queLleva: 'pantallas de la ciudad con lluvia de glifos',
    deJuego: false,
    reloj: 'presentado',
    instancias: POR_NIVEL.pantallas,
  },
  {
    pieza: 'muro',
    familia: 'tapices',
    forma: 'cuadro',
    queLleva: 'el muro de glifos del Bis, que tiembla',
    deJuego: false,
    reloj: 'presentado',
    instancias: POR_NIVEL.panelesDelMuro,
  },
  {
    pieza: 'siluetas',
    familia: 'tapices',
    forma: 'cuadro',
    queLleva: 'impresión, desalojo, salida por la cabina y el haz ámbar',
    deJuego: false,
    reloj: 'presentado',
    instancias: porNivel(() => SILUETAS_A_LA_VEZ + HACES_A_LA_VEZ),
  },
  {
    pieza: 'hilos',
    familia: 'cintas',
    forma: 'cinta-curva',
    queLleva: 'hilos del Trasvase y el cable de la salida',
    deJuego: false,
    reloj: 'presentado',
    instancias: porNivel((n) => TRASVASES_A_LA_VEZ * POR_NIVEL.hilosPorTrasvase[n] + SALIDAS_A_LA_VEZ * TRAMOS_DEL_CABLE),
  },
  {
    pieza: 'esquirlas',
    familia: 'esquirlas',
    forma: 'esquirla',
    queLleva: 'las esquirlas ámbar, flotando',
    deJuego: true,
    reloj: 'presentado',
    instancias: porNivel(() => ESQUIRLAS_A_LA_VEZ),
  },
  {
    pieza: 'chispas',
    familia: 'chispas',
    forma: 'cuadro',
    queLleva: 'chispas de los impactos',
    deJuego: false,
    reloj: 'presentado',
    instancias: POR_NIVEL.chispasVivas,
  },
  {
    pieza: 'ondas',
    familia: 'ondas',
    forma: 'cuadro',
    queLleva: 'ondas de aire tras las balas, onda y destello de los impactos; del rayo, la boca, el resplandor, la onda del suelo, el charco de luz, el vapor, la carga y la marca',
    deJuego: false,
    reloj: 'verdadero',
    instancias: porNivel(
      (n) => BALAS_A_LA_VEZ * POR_NIVEL.ondasPorBala[n] + IMPACTOS_A_LA_VEZ * 2 + RAYOS_A_LA_VEZ * ondasPorRayo(n) + CARGAS_A_LA_VEZ * ONDAS_POR_CARGA + MARCAS_A_LA_VEZ,
    ),
  },
  {
    /*
     * EL RAYO (EL-RAYO.md §4): el canal quebrado, sus ramas y su estela, y los filamentos y las motas de la carga,
     * como cintas curvas que el sombreador quiebra (el tipo 4 de `materiales.ts`). No es señal de juego —lo que se
     * juzga es la bala de la sala, y el área la dice la onda del suelo—, así que va de adorno y crece con el nivel.
     * Su reloj es el verdadero (el destello llega cuando llega); la estela, dentro, va en el presentado.
     */
    pieza: 'rayos',
    familia: 'cintas',
    forma: 'cinta-curva',
    queLleva: 'el rayo: canal, ramas, estela; y los filamentos y motas de la carga',
    deJuego: false,
    reloj: 'verdadero',
    instancias: porNivel((n) => RAYOS_A_LA_VEZ * cintasPorRayo(n) + CARGAS_A_LA_VEZ * cintasPorCarga(n)),
  },
  {
    pieza: 'trazos',
    familia: 'cintas',
    forma: 'cinta-recta',
    queLleva: 'líneas de apuntado y balas con su estela',
    deJuego: true,
    reloj: 'verdadero',
    instancias: porNivel(() => APUNTADOS_A_LA_VEZ + BALAS_A_LA_VEZ),
  },
  {
    pieza: 'anillos',
    familia: 'anuncio',
    forma: 'cuadro',
    queLleva: 'los anillos del anuncio',
    deJuego: true,
    reloj: 'verdadero',
    instancias: porNivel(() => ANILLOS_A_LA_VEZ),
  },
  {
    pieza: 'marco',
    familia: 'tapices',
    forma: 'cuadro',
    queLleva: 'el marco de la repetición del Bis, en pantalla',
    deJuego: false,
    reloj: 'presentado',
    instancias: POR_NIVEL.bandasDelMarco,
  },
];

/** El renglón de una pieza. Revienta si no existe: una pieza sin renglón es un fallo de este fichero. */
export function renglonDe(pieza: Pieza): RenglonDePieza {
  const r = PIEZAS.find((p) => p.pieza === pieza);
  if (r === undefined) throw new Error(`la pieza ${pieza} no tiene renglón de presupuesto`);
  return r;
}

/** Instancias que una pieza puede pintar en un nivel. */
export function instanciasDe(pieza: Pieza, nivel: Nivel): number {
  return renglonDe(pieza).instancias[nivel];
}

/** Instancias que una pieza reserva: las del nivel más alto, para que cambiar de nivel no rehaga la malla. */
export function capacidadDe(pieza: Pieza): number {
  return Math.max(...renglonDe(pieza).instancias);
}

export interface GastoDeUnaPieza {
  readonly pieza: Pieza;
  readonly instancias: number;
  readonly triangulos: number;
  readonly llamadas: number;
}

export interface GastoDelNivel {
  readonly nivel: Nivel;
  readonly piezas: readonly GastoDeUnaPieza[];
  readonly triangulos: number;
  readonly llamadas: number;
}

/** Lo que gastan los efectos en un nivel con todo encendido a la vez. */
export function gastoDelNivel(nivel: Nivel, piezas: readonly RenglonDePieza[] = PIEZAS): GastoDelNivel {
  const filas = piezas.map((p) => {
    const instancias = p.instancias[nivel];
    return {
      pieza: p.pieza,
      instancias,
      triangulos: instancias * TRIANGULOS_DE_LA_FORMA[p.forma],
      llamadas: instancias > 0 ? 1 : 0,
    };
  });
  return {
    nivel,
    piezas: filas,
    triangulos: filas.reduce((s, f) => s + f.triangulos, 0),
    llamadas: filas.reduce((s, f) => s + f.llamadas, 0),
  };
}

/** Los topes de la escena entera por nivel (diseño §8, provisionales). Ver la cabecera. */
export const TOPES_DE_LA_ESCENA: readonly { readonly triangulos: number; readonly llamadas: number }[] = [
  { triangulos: 150_000, llamadas: 60 },
  { triangulos: 250_000, llamadas: 90 },
  { triangulos: 600_000, llamadas: 150 },
  { triangulos: 1_500_000, llamadas: 250 },
];

/**
 * La parte de la escena que se pueden llevar los efectos con TODO encendido. Las llamadas pesan
 * más que los triángulos: en N0 cada llamada es un 1,7 % del fotograma y los efectos son cuadros.
 */
export const PARTE_DE_LOS_EFECTOS = { triangulos: 0.05, llamadas: 0.2 } as const;

/** El tope de los efectos en un nivel: su parte de la escena, redondeada hacia abajo. */
export function topeDeLosEfectos(nivel: Nivel): { triangulos: number; llamadas: number } {
  const escena = TOPES_DE_LA_ESCENA[nivel] as { triangulos: number; llamadas: number };
  return {
    triangulos: Math.floor(escena.triangulos * PARTE_DE_LOS_EFECTOS.triangulos),
    llamadas: Math.floor(escena.llamadas * PARTE_DE_LOS_EFECTOS.llamadas),
  };
}
