/**
 * RIBERAS EN TRES DIMENSIONES, EN EL ESCRITORIO: el pintor propio del juego sobre el
 * motor de arcade, montado en un lienzo dentro de la mesa de siempre.
 *
 * ═══ QUÉ ES, Y QUÉ NO ═══
 *
 * Riberas sigue siendo un arcade de `mueble: 'tablero'`: su vista trae el
 * `TableroDeclarado` de siempre y `Paneles` lo sigue leyendo en el raíl. Lo que
 * cambia es QUIÉN pinta la parte grande: en vez del `Retablo` genérico, aquí se
 * monta la escena del delta (`escenas/delta.tsx`) con lo que la mesa manda,
 * traducido UNA sola vez en `shared/arcade/juegos/riberas-en-tres.ts`. Es el
 * mismo precedente que La Frente en la app: un pintor propio para un juego,
 * enchufado donde antes iba el mueble genérico, sin tocar el contrato.
 *
 * NO HAY NINGUNA REGLA AQUÍ. Dónde se puede construir lo dice `colocandoEnTres`
 * leyendo las mismas `opciones()` que el reductor exige; qué se manda al soltar
 * viene ya montado dentro de cada sitio; con quién se puede trocar lo dice
 * `truequesPosibles`. Este fichero recoge y manda. Si aquí apareciera un `if`
 * sobre una choza o una vereda, la traducción habría dejado de ser una.
 *
 * ═══ EL SVG NO SE VA: ES EL RESPALDO, Y NO ES OPCIONAL ═══
 *
 * Cuatro cosas pueden faltar y ninguna puede dejar la mesa sin pintar: el `.glb`
 * no llega, el `Canvas` revienta al nacer —sin WebGL, sin contexto—, esto se
 * renderiza en Node sin ventana (`verificar-escritorio`), o LA MESA NO CABE EN
 * TRES DIMENSIONES. En los tres primeros casos y en el último se pinta EL RETABLO
 * DE SIEMPRE, con sus acciones y sus opciones sueltas, y una línea en letra chica
 * de por qué. Es la regla del §5 del Muelle llevada a la partida: si el mundo no
 * arranca, se juega igual.
 *
 * ═══ «SIN DELTA» NO ES «SIN ISLAS»: SON DOS PREGUNTAS ═══
 *
 * `tableroEnTres` devuelve `null` por DOS motivos que no se parecen en nada: el
 * delta aún no se ha repartido —la mesa está reunida y sólo hay «Empezar»— o la
 * mesa tiene cinco o seis colonos y el atlas sólo trae cuatro colores de jugador
 * (`seVeEnTres`). La primera versión leía el `null` como «no hay islas» y pintaba
 * un formulario suelto; con cinco colonos y diecinueve islas repartidas eso eran
 * cincuenta y cuatro botones de «Fundar aquí» sin tablero, sin telón y sin el
 * aviso del turno. Y como la Sala enseña el Muelle mientras la mesa se reúne,
 * esa rama casi sólo se alcanzaba en el caso malo. Así que se pregunta al
 * TABLERO DECLARADO si hay algo que pintar (`caras.length`) y a `seVeEnTres` si
 * cabe en el lienzo; sin islas, formulario; con islas y sin colores, el retablo.
 *
 * ═══ EL MODELO SE PIDE UNA VEZ POR PESTAÑA ═══
 *
 * `tablero.glb` pesa lo que pesa y se pide por HTTP al servidor de juego. Cada
 * revisión de la mesa repinta este componente; volver a pedirlo —o volver a
 * parsearlo— en cada montaje sería un telón negro por jugada. La promesa vive en
 * el módulo: la primera mesa lo trae, las siguientes lo encuentran. Si falló, se
 * suelta la promesa para que la siguiente mesa lo vuelva a intentar.
 *
 * ═══ LA CÁMARA ES LA DEL BANCO, Y ESCUCHA EN LA VENTANA ═══
 *
 * El mirador (`escenas/camara.ts`) va por `ref` y no por estado: son sesenta
 * cambios por segundo mientras se arrastra. Se escucha en la ventana y no en el
 * lienzo por lo que cuenta la cabecera de `camara.ts`: así la cámara llega SIEMPRE
 * después de la escena y puede mirar si la barra o la mano ya se quedaron el gesto
 * (`esDeLaInterfaz`). Y soltar fuera del lienzo también termina el arrastre.
 *
 * Y el ojo se pone SEGÚN LA PROPORCIÓN DEL LIENZO, igual que en el banco: en un
 * monitor no cambia nada, pero en una tableta en retrato o en la rejilla de menos
 * de 900 px —donde el raíl baja y el lienzo se estrecha— sin ella el delta se
 * salía por los lados. Como al alejarse el ojo la niebla fija del banco quedaría
 * DELANTE del mundo y lo blanquearía, la niebla se mide desde el ojo y no desde
 * el centro: se mueve con la cámara en cada fotograma.
 *
 * ═══ LO QUE ESTO NO IMPORTA ═══
 *
 * Nada de `app/` (lo vigila `verify:fronteras`), nada de `drei`, y de
 * `escenas/embarcadero/` sólo lo que decide quién tiene tema (`tema.ts`, y ésa la
 * lee la Sala). La ruta del modelo y la semilla vienen de `escenas/ruta-de-modelos.ts`
 * y `shared/mecanicas/semilla.ts`, que no arrastran ninguna tabla: aquí hubo una copia
 * de cada una, y la de la semilla ya no pasaba a mayúsculas.
 */
import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ACESFilmicToneMapping, Fog } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Mirador } from '../../escenas/camara';
import {
  esDeLaInterfaz,
  MINIMO_PARA_GIRAR,
  MIRADOR_DE_SALIDA,
  ojoDelMirador,
  tirandoDelMirador,
} from '../../escenas/camara';
import { Delta, encuadreDelDelta } from '../../escenas/delta';
import { catalogoDeModelos } from '../../escenas/modelos';
import type { CatalogoDeModelos } from '../../escenas/modelos';
import { rutaDelTablero } from '../../escenas/ruta-de-modelos';
import type { Opcion } from '../../shared/arcade';
import {
  barraEnTres,
  BIEN_EN_LA_ESCENA,
  bienDeRiberas,
  bienesQueSeCambianPor,
  colocandoEnTres,
  manoEnTres,
  opcionesFueraDelTablero,
  seVeEnTres,
  tableroEnTres,
  truequesPosibles,
} from '../../shared/arcade/juegos/riberas-en-tres';
import type { IdDeLaBarra, TableroEnTres, TruequePosible } from '../../shared/arcade/juegos/riberas-en-tres';
import { semillaDelCodigo } from '../../shared/mecanicas/semilla';
import type { TableroDeclarado } from '../../shared/mecanicas/tablero-declarado';
import { Formulario } from './formulario';
import type { LaMesa, MesaVista } from './mesa';
import type { ArcadeDelCatalogo } from './muebles';
import { opcionesSueltas } from './plan';
import { loQueSeDiceDeUnFallo } from './red-de-seguridad';
import { AccionesDelTablero, Retablo } from './retablo';

/**
 * De dónde se trae el tablero: la única ruta, la de `escenas/ruta-de-modelos.ts`, que
 * es la que sirve `server/src/routes/modelos.ts`. Relativa: en desarrollo la reenvía el
 * proxy de Vite y en producción es el mismo Node que sirve esta página.
 */
const RUTA_DEL_TABLERO = rutaDelTablero();

/** El azul del cielo de mediodía, que es también el color al que se funde la niebla. */
const COLOR_DEL_CIELO = '#9ec9e2';

/** El título de este pintor sobre el lienzo. Es chrome de la Sala, no una palabra del juego. */
const TITULO_DE_LO_QUE_SE_HACE = 'Lo que puedes hacer';

// ---------------------------------------------------------------------------
// El catálogo de modelos, una vez por pestaña
// ---------------------------------------------------------------------------

let catalogoEnCamino: Promise<CatalogoDeModelos> | null = null;

/**
 * Trae y parsea `tablero.glb`, y lo recuerda. Ver la cabecera: una promesa por
 * pestaña, y si falla se suelta para que el siguiente montaje lo intente otra vez.
 *
 * `GLTFLoader.parseAsync` sobre los bytes de un `fetch` relativo, y no `.load(url)`:
 * así el error de red se lee como lo que es —«contestó 404»— y no como un `ProgressEvent`
 * sin texto, que es lo que devuelve el cargador cuando la petición falla.
 */
function traerElCatalogo(): Promise<CatalogoDeModelos> {
  if (catalogoEnCamino !== null) return catalogoEnCamino;
  const promesa = (async (): Promise<CatalogoDeModelos> => {
    const r = await fetch(RUTA_DEL_TABLERO);
    if (!r.ok) throw new Error(`${RUTA_DEL_TABLERO} contestó ${String(r.status)}`);
    const bytes = await r.arrayBuffer();
    const gltf = await new GLTFLoader().parseAsync(bytes, '');
    return catalogoDeModelos(gltf.scene);
  })();
  catalogoEnCamino = promesa;
  promesa.catch(() => {
    if (catalogoEnCamino === promesa) catalogoEnCamino = null;
  });
  return promesa;
}

/**
 * El catálogo desde un componente: `null` mientras llega, y el motivo si no llegó.
 *
 * `cancelado` por lo mismo que en el banco: si la mesa se desmonta mientras el
 * fichero viaja, escribir el estado después es un aviso de React y una referencia
 * viva a una escena que ya no se dibuja. Y sólo se pide cuando HACE FALTA: en Node
 * no corren los efectos, y con una mesa que va a caer al retablo —más colonos que
 * colores— descargar dos megas para no montar el lienzo sería tirarlos. El gancho
 * se llama siempre (reglas de los ganchos); lo que se condiciona es la petición.
 */
function usarElCatalogo(hazFalta: boolean): { modelos: CatalogoDeModelos | null; fallo: string | null } {
  const [modelos, ponerModelos] = useState<CatalogoDeModelos | null>(null);
  const [fallo, ponerFallo] = useState<string | null>(null);

  useEffect(() => {
    if (!hazFalta) return undefined;
    let cancelado = false;
    traerElCatalogo().then(
      (catalogo) => {
        if (!cancelado) ponerModelos(catalogo);
      },
      (error: unknown) => {
        if (!cancelado) ponerFallo(loQueSeDiceDeUnFallo(error));
      },
    );
    return () => {
      cancelado = true;
    };
  }, [hazFalta]);

  return { modelos, fallo };
}

// ---------------------------------------------------------------------------
// La cámara aérea
// ---------------------------------------------------------------------------

/**
 * LA NIEBLA, MEDIDA DESDE EL OJO. El banco la pone a 2,6 y 7,5 alcances del centro
 * con la cámara quieta a `LEJANIA` (1,77) alcances; medidos desde esa cámara son
 * 0,85 y 5,7 alcances por delante del ojo. Aquí el ojo se aleja cuando el lienzo
 * es estrecho, y una niebla clavada al centro se quedaría delante del delta y lo
 * dejaría blanqueado. Así que se lleva con la cámara: mismo aspecto en el
 * monitor, y el mismo aspecto desde más lejos.
 */
const NIEBLA_EMPIEZA_A = 0.85;
const NIEBLA_TERMINA_A = 5.7;

/**
 * El mirador del banco, sin la vista de suelo: aquí se juega desde el aire.
 *
 * La aritmética del arrastre está en `escenas/camara.ts`, donde se puede medir;
 * esto sólo escucha el ratón y mueve la cámara en cada fotograma. Sólo cuentan los
 * gestos que empiezan SOBRE ESTE lienzo —`e.target === lienzo`—, así que arrastrar
 * por el raíl o por el formulario no gira nada.
 *
 * La proporción del lienzo entra en cada fotograma y no una vez: el raíl baja o
 * sube al cruzar los 900 px, la ventana se estira, la tableta se gira, y el
 * `<canvas>` cambia de forma sin que se remonte nada. Leer `clientWidth` por
 * fotograma cuesta menos que un observador de tamaño y no se queda nunca atrás.
 */
function CamaraAerea({ alcance }: { alcance: number }): null {
  const { camera, gl, scene } = useThree();
  const mirador = useRef<Mirador>(MIRADOR_DE_SALIDA);

  useEffect(() => {
    const lienzo = gl.domElement;
    let desde: { x: number; y: number } | null = null;
    let gira = false;

    const baja = (e: PointerEvent): void => {
      if (e.target !== lienzo) return;
      if (esDeLaInterfaz(e)) return;
      desde = { x: e.clientX, y: e.clientY };
      gira = false;
    };
    const mueve = (e: PointerEvent): void => {
      if (desde === null) return;
      if (!gira) {
        if (Math.hypot(e.clientX - desde.x, e.clientY - desde.y) < MINIMO_PARA_GIRAR) return;
        gira = true;
      }
      mirador.current = tirandoDelMirador(
        mirador.current,
        e.clientX - desde.x,
        e.clientY - desde.y,
        { ancho: lienzo.clientWidth, alto: lienzo.clientHeight },
      );
      desde = { x: e.clientX, y: e.clientY };
    };
    const suelta = (): void => {
      desde = null;
      gira = false;
    };

    window.addEventListener('pointerdown', baja);
    window.addEventListener('pointermove', mueve);
    window.addEventListener('pointerup', suelta);
    window.addEventListener('pointercancel', suelta);
    return () => {
      window.removeEventListener('pointerdown', baja);
      window.removeEventListener('pointermove', mueve);
      window.removeEventListener('pointerup', suelta);
      window.removeEventListener('pointercancel', suelta);
    };
  }, [gl]);

  useFrame(() => {
    const lienzo = gl.domElement;
    const [x, y, z] = ojoDelMirador(
      mirador.current,
      alcance,
      lienzo.clientHeight > 0 ? lienzo.clientWidth / lienzo.clientHeight : undefined,
    );
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
    if (scene.fog instanceof Fog) {
      const distancia = Math.hypot(x, y, z);
      scene.fog.near = distancia + alcance * NIEBLA_EMPIEZA_A;
      scene.fog.far = distancia + alcance * NIEBLA_TERMINA_A;
    }
  });
  return null;
}

// ---------------------------------------------------------------------------
// El límite del mundo
// ---------------------------------------------------------------------------

/**
 * Si el `Canvas` revienta al nacer, aquí se para y se avisa. Es la misma clase que
 * el `LimiteDelMundo` del muelle —no se exporta de allí a propósito: cada pantalla
 * decide qué hace con el fallo, y ésta cae al SVG—. No pinta nada porque lo que
 * hay que pintar en su lugar lo decide quien la monta.
 */
class LimiteDelMundo extends Component<
  { alFallar: (motivo: string) => void; children: ReactNode },
  { roto: boolean }
> {
  public override state = { roto: false };

  public static getDerivedStateFromError(): { roto: boolean } {
    return { roto: true };
  }

  public override componentDidCatch(error: unknown): void {
    this.props.alFallar(loQueSeDiceDeUnFallo(error));
  }

  public override render(): ReactNode {
    return this.state.roto ? null : this.props.children;
  }
}

// ---------------------------------------------------------------------------
// El pintor
// ---------------------------------------------------------------------------

export interface LoQueVeRiberas {
  manifiesto: ArcadeDelCatalogo;
  mesa: LaMesa;
  /** La mesa ya puesta: `mesa.mesa` cuando se está dentro. Se pasa aparte para no volver a comprobarlo. */
  puesta: MesaVista;
  /** El tablero declarado que trae la vista. Es lo que pinta el respaldo SVG. */
  tablero: TableroDeclarado;
  opciones: readonly Opcion[];
}

/** A quién se le propone el trueque cuando el juego permite ofrecérselo a varios. */
interface PreguntandoAQuien {
  trueques: readonly TruequePosible<Opcion>[];
}

export function RiberasEnTres({ manifiesto, mesa, puesta, tablero, opciones }: LoQueVeRiberas): JSX.Element {
  const { mover, quieto } = mesa;
  const vista = puesta.vista;
  const yo = puesta.yo;

  /*
   * ═══ LAS ISLAS CONSERVAN SU IDENTIDAD ENTRE SONDEOS, Y ESO ES LO QUE NO TIEMBLA ═══
   *
   * Cada respuesta del servidor trae una vista NUEVA, y `tableroEnTres` fabrica de
   * ella una lista de islas nueva aunque el delta no haya cambiado —y no cambia en
   * toda la partida—. La escena reconstruye el relieve y el plan entero del mundo
   * cuando cambia la identidad de `datos.islas` (`escenas/delta.tsx`, `relieve`):
   * miles de copias reescritas en cada jugada de cualquiera y en cada vuelta del
   * sondeo. Se vería como un tirón por revisión. Así que se firma el contenido de
   * las islas y, si es el mismo, se entrega LA MISMA lista de antes. Piezas y
   * caminos sí van frescos: son lo que cambia.
   */
  const islasVistas = useRef<{ firma: string; islas: TableroEnTres['islas'] } | null>(null);
  const datos = useMemo(() => {
    const crudo = tableroEnTres(vista);
    if (crudo === null) return null;
    const firma = crudo.islas
      .map((i) => `${String(i.hex.q)},${String(i.hex.r)}:${i.terreno}:${String(i.cifra)}`)
      .join('|');
    const antes = islasVistas.current;
    const islas = antes !== null && antes.firma === firma ? antes.islas : crudo.islas;
    islasVistas.current = { firma, islas };
    return { ...crudo, islas };
  }, [vista]);
  const mano = useMemo(() => manoEnTres(vista), [vista]);
  const fuera = useMemo(() => opcionesFueraDelTablero(opciones), [opciones]);

  // -------------------------------------------------------------------------
  // Lo que se tiene en la mano
  // -------------------------------------------------------------------------

  const [tomada, ponerTomada] = useState<IdDeLaBarra | null>(null);
  const [cogida, ponerCogida] = useState<string | null>(null);
  const [preguntando, ponerPreguntando] = useState<PreguntandoAQuien | null>(null);

  /*
   * AL CAMBIAR LA REVISIÓN SE SUELTA TODO. Lo que se tenía agarrado se agarró
   * mirando la mesa anterior: los sitios legales de esa pieza pueden haber dejado
   * de serlo, y la carta cogida puede haberse gastado. Seguir con ello en la mano
   * sería ofrecer soltarlo donde la mesa nueva ya no lo admite.
   */
  useEffect(() => {
    ponerTomada(null);
    ponerCogida(null);
    ponerPreguntando(null);
  }, [puesta.rev]);

  /*
   * La barra y lo que se está colocando se DERIVAN de la vista en cada render, no se
   * guardan: así, si la vista cambia sin que cambie `rev` —no debería, pero un
   * sondeo trae la mesa entera—, los anillos son siempre los de lo que hay delante.
   * `quieto` apaga la barra entera: con una petición en vuelo no se coge nada.
   */
  const barra = useMemo(
    () => barraEnTres(vista, yo).map((p) => (quieto ? { ...p, disponible: false } : p)),
    [vista, yo, quieto],
  );
  const colocando = useMemo(
    () => (tomada === null ? null : colocandoEnTres(vista, yo, tomada)),
    [vista, yo, tomada],
  );

  const cartaCogida = useMemo(() => mano.find((c) => c.id === cogida) ?? null, [mano, cogida]);
  const seCambianPor = useMemo(() => {
    if (cartaCogida === null || quieto) return [];
    return bienesQueSeCambianPor(vista, opciones, bienDeRiberas(cartaCogida.bien)).map(
      (b) => BIEN_EN_LA_ESCENA[b] ?? b,
    );
  }, [cartaCogida, quieto, vista, opciones]);

  const alTomarDeLaBarra = useCallback(
    (id: string) => {
      if (quieto) return;
      ponerCogida(null);
      ponerTomada((antes) => (antes === id ? null : (id as IdDeLaBarra)));
    },
    [quieto],
  );

  const alElegirSitio = useCallback(
    (sitio: { llave: string }) => {
      if (quieto || colocando === null) return;
      /* El movimiento viene montado por las reglas. Aquí no se monta nada. */
      const movimiento = colocando.movimientos.get(sitio.llave);
      ponerTomada(null);
      if (movimiento !== undefined) mover(movimiento);
    },
    [quieto, colocando, mover],
  );

  const alCogerCarta = useCallback(
    (carta: { id: string }) => {
      if (quieto) return;
      ponerTomada(null);
      ponerPreguntando(null);
      ponerCogida((antes) => (antes === carta.id ? null : carta.id));
    },
    [quieto],
  );

  /*
   * AL SOLTAR LA CARTA SOBRE UN BIEN: uno solo a quien proponérselo, se manda; varios,
   * se pregunta. Riberas exige destinatario y este cliente no lo elige por nadie.
   * Los nombres de la escena se traducen de vuelta a los de Riberas antes de preguntar
   * a las reglas, porque la carga habla en el idioma del juego.
   */
  const alProponerTrueque = useCallback(
    (bienEnLaEscena: string) => {
      if (quieto || cartaCogida === null) return;
      const doy = bienDeRiberas(cartaCogida.bien);
      const quiero = bienDeRiberas(bienEnLaEscena);
      const posibles = truequesPosibles(vista, opciones, doy, quiero);
      ponerCogida(null);
      const unico = posibles[0];
      if (unico !== undefined && posibles.length === 1) {
        mover({ tipo: unico.opcion.tipo, carga: unico.opcion.carga });
        return;
      }
      if (posibles.length > 1) ponerPreguntando({ trueques: posibles });
    },
    [quieto, cartaCogida, vista, opciones, mover],
  );

  // -------------------------------------------------------------------------
  // El mundo
  // -------------------------------------------------------------------------

  /* El modelo sólo se pide si el lienzo se va a montar: con delta y con colores. */
  const { modelos, fallo: falloDelModelo } = usarElCatalogo(tablero.caras.length > 0 && seVeEnTres(vista));
  const [falloDelLienzo, ponerFalloDelLienzo] = useState<string | null>(null);
  const alFallarElLienzo = useCallback((motivo: string) => {
    ponerFalloDelLienzo(motivo);
  }, []);
  const fallo = falloDelModelo ?? falloDelLienzo;

  const semilla = useMemo(() => semillaDelCodigo(puesta.codigo), [puesta.codigo]);
  const encuadre = useMemo(
    () => (datos === null ? null : encuadreDelDelta(datos.islas.map((i) => i.hex))),
    [datos],
  );

  /*
   * SIN ISLAS NO HAY DELTA QUE PINTAR: sólo lo que se puede hacer. Es lo mismo que
   * hace la mesa de siempre sin tablero, y todas las opciones van al formulario,
   * porque no hay barra ni mano que enseñe ninguna. Se pregunta al TABLERO
   * DECLARADO y no a `datos`: ver la cabecera, «sin delta» no es «sin islas».
   */
  if (tablero.caras.length === 0) {
    return (
      <Formulario
        opciones={opciones}
        alElegir={mover}
        quieto={quieto}
        titulo={TITULO_DE_LO_QUE_SE_HACE}
      />
    );
  }

  /*
   * EL RESPALDO. Si la mesa no cabe en los colores del lienzo, si el modelo no
   * llegó o si el lienzo reventó, se pinta lo que se pintaba antes de que existiera
   * este fichero, entero, y se dice por qué en letra chica. No es una pantalla de
   * error: es la mesa jugable de siempre. El tercer motivo —hay tablero declarado
   * pero la traducción no dio delta— no debería darse nunca; se dice por su nombre
   * para que, si un día se da, no se confunda con los otros dos.
   */
  const porQueElRetablo =
    !seVeEnTres(vista)
      ? 'Sois más de cuatro y el tablero en tres dimensiones sólo sabe pintar cuatro colores todavía: se juega sobre el tablero de siempre.'
      : fallo !== null
        ? `El delta en tres dimensiones no ha arrancado: ${fallo}. Se juega sobre el tablero dibujado.`
        : datos === null || encuadre === null
          ? 'La mesa trae tablero pero no un delta que pintar: se juega sobre el tablero dibujado.'
          : null;
  if (porQueElRetablo !== null || datos === null || encuadre === null) {
    const sueltas = opcionesSueltas(tablero, opciones);
    return (
      <>
        <p className="letra-chica riberas-sin-mundo">{porQueElRetablo}</p>
        <Retablo tablero={tablero} alTocar={mover} quieto={quieto} />
        <AccionesDelTablero tablero={tablero} alTocar={mover} quieto={quieto} />
        {sueltas.length > 0 ? (
          <Formulario opciones={sueltas} alElegir={mover} quieto={quieto} titulo="Y además puedes" />
        ) : null}
      </>
    );
  }

  const conMundo = typeof window !== 'undefined' && modelos !== null;
  const alcance = encuadre.alcance;

  return (
    <div className="riberas-en-tres">
      {/*
        El aviso del tablero es del JUEGO —«te toca fundar», «espera a que tire
        otro»— y viaja en el tablero declarado igual que antes. En el retablo lo
        pinta el propio retablo; aquí, que no hay retablo, se pinta encima del
        lienzo en el mismo sitio y con la misma letra. Perderlo sería perder la
        única frase que dice en qué momento está la partida.
      */}
      {tablero.aviso.length > 0 ? <p className="aviso-del-tablero">{tablero.aviso}</p> : null}

      <div className={quieto ? 'riberas-lienzo riberas-lienzo-quieto' : 'riberas-lienzo'}>
        {conMundo ? (
          <LimiteDelMundo alFallar={alFallarElLienzo}>
            <Canvas
              shadows
              dpr={[1, 2]}
              gl={{ antialias: true }}
              camera={{ position: encuadre.posicion, fov: 45, near: 0.5, far: alcance * 8 }}
              onCreated={({ gl }) => {
                gl.toneMapping = ACESFilmicToneMapping;
                gl.toneMappingExposure = 1.05;
              }}
            >
              {/* La niebla empieza detrás del mundo, y del color del cielo: ver `banco3d.tsx`. */}
              <color attach="background" args={[COLOR_DEL_CIELO]} />
              <fog attach="fog" args={[COLOR_DEL_CIELO, alcance * 2.6, alcance * 7.5]} />
              <CamaraAerea alcance={alcance} />
              <Delta
                datos={datos}
                modelos={modelos}
                semilla={semilla}
                colocando={colocando}
                onElegirSitio={alElegirSitio}
                barra={barra}
                tomada={tomada}
                onTomarDeLaBarra={alTomarDeLaBarra}
                mano={mano}
                cogida={cogida}
                onCogerCarta={alCogerCarta}
                seCambianPor={seCambianPor}
                onProponerTrueque={alProponerTrueque}
              />
            </Canvas>
          </LimiteDelMundo>
        ) : (
          /* El telón: `--suelo` con el nombre del juego hasta que el modelo llega. */
          <div className="riberas-telon" aria-busy="true">
            <p className="riberas-nombre">{manifiesto.nombre}</p>
            <p className="letra-chica">Se levanta el delta.</p>
          </div>
        )}
      </div>

      {preguntando !== null ? (
        <AQuien
          trueques={preguntando.trueques}
          quieto={quieto}
          alElegir={(t) => {
            ponerPreguntando(null);
            mover({ tipo: t.opcion.tipo, carga: t.opcion.carga });
          }}
          alDejarlo={() => {
            ponerPreguntando(null);
          }}
        />
      ) : null}

      {/*
        Y debajo, lo que el tablero NO enseña ya: tirar, pasar, aceptar, rechazar,
        empezar. Fundar y alzar los ofrece la barra con sus anillos; ofrecer un
        trueque lo ofrece la mano. Cada movimiento se enseña exactamente una vez.

        Se calla SÓLO si el tablero está enseñando algo y aquí no queda nada: con
        una barra encendida, «no hay nada que puedas hacer» sería mentira. Y si el
        juego no ofrece nada de nada —le toca a otro— sí se dice, porque entonces es
        verdad y es lo único que explica por qué la barra está apagada.
      */}
      {fuera.length > 0 || opciones.length === 0 ? (
        <Formulario opciones={fuera} alElegir={mover} quieto={quieto} titulo={TITULO_DE_LO_QUE_SE_HACE} />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// A quién se le propone
// ---------------------------------------------------------------------------

/**
 * El menú pequeño de destinatarios. Rótulo y ayuda son los que escribió el juego en
 * cada opción de ofrecer —ya nombran a quién—, así que aquí no se inventa ni una
 * palabra sobre el trato: sólo el título y la salida.
 */
function AQuien({
  trueques,
  quieto,
  alElegir,
  alDejarlo,
}: {
  trueques: readonly TruequePosible<Opcion>[];
  quieto: boolean;
  alElegir: (t: TruequePosible<Opcion>) => void;
  alDejarlo: () => void;
}): JSX.Element {
  return (
    <div className="formulario riberas-a-quien">
      <h2 className="rotulo-de-panel">A quién se lo propones</h2>
      <ul className="opciones">
        {trueques.map((t) => (
          <li key={t.opcion.id}>
            <button
              type="button"
              className="opcion"
              disabled={quieto}
              title={t.opcion.ayuda}
              onClick={() => {
                alElegir(t);
              }}
            >
              <span className="opcion-texto">
                <span className="opcion-rotulo">{t.opcion.rotulo}</span>
                {t.opcion.ayuda.length > 0 ? <span className="opcion-ayuda">{t.opcion.ayuda}</span> : null}
              </span>
            </button>
          </li>
        ))}
        <li>
          <button type="button" className="opcion opcion-sobria" onClick={alDejarlo}>
            <span className="opcion-texto">
              <span className="opcion-rotulo">Dejarlo</span>
            </span>
          </button>
        </li>
      </ul>
    </div>
  );
}
