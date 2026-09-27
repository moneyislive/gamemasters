/**
 * EL TABLERO DE LAS LINDES, EN TRES DIMENSIONES.
 *
 * ═══ QUÉ MONTA, Y EN QUÉ ORDEN ═══
 *
 *  1. EL SUELO. Una sola geometría con todas las losas puestas y su faldón, de
 *     `suelo.ts`. Una llamada de dibujo para el tablero entero.
 *  2. LAS PIEZAS. Todo lo que `losa.ts` decidió poner, agrupado POR MODELO en una
 *     `InstancedMesh` cada uno. Cuarenta llamadas para mil quinientas piezas.
 *  3. LOS LABRIEGOS, que son la única pieza propia: un peón torneado que se tiñe
 *     con el color del asiento (ver `labriego.ts`).
 *  4. LAS CASILLAS DONDE CABE LA LOSA DE LA MANO, que son lo único que se toca, y
 *     el FANTASMA de la losa sobre la que se está señalando.
 *  5. QUIEN PASEA, con el paseo común de `escenas/paseo/`: esta escena le da su
 *     mundo —`mundoDeLasLindes`—, de qué losa se nace y a qué altura está el suelo, y
 *     el paseo pone el resto: los tics, los choques, las cámaras de a pie y la figura.
 *  6. LOS DEMÁS, sólo en una mesa `botas` (la prop `canal`): el canal de la mesa lleva
 *     cada tic de quien pasea al servidor y trae dónde anda cada uno, y los demás
 *     asientos se pintan andando con su figura y su nombre (`paseo/los-demas.tsx`).
 *
 * ═══ LO QUE ESTA ESCENA NO SABE ═══
 *
 * A qué se juega. Recibe un tablero de losas cuadradas —cuáles hay, con qué giro,
 * quién tiene un labriego dónde y en qué casillas cabe la siguiente— y devuelve
 * toques. Ni una regla, ni un turno, ni una puntuación. Quien traduce la partida a
 * esto es `shared/arcade/juegos/lindes-en-tres.ts`, y vive en `shared/` para que
 * la traducción sea UNA y no una por cliente.
 *
 * ═══ EL NIVEL DE DETALLE NO ES UN AHORRO: ES LA CONDICIÓN ═══
 *
 * Setenta y dos losas con todo puesto pasan del techo de triángulos de un PC, y la
 * cuenta está en `medidas.ts`. Así que el relleno —árboles, matas, casas— se monta
 * sólo dentro de un radio alrededor de donde mira la cámara, y lo que cuenta una
 * regla —murallas, ermitas, labriegos— se monta SIEMPRE. Un tablero sin árboles
 * lejos sigue siendo el tablero; un tablero sin la muralla de una villa cerrada es
 * el tablero mintiendo.
 *
 * Y el radio lo pone LA CALIDAD (`detalle.ts`), que hasta ahora llegaba y nadie leía: en
 * `sobria` no se pinta nada menudo y el relleno llega a dos losas y media en vez de a
 * cuatro. Lo que cuenta una regla es igual en las dos.
 *
 * ═══ EN EL TELÉFONO, EL ATLAS DEL TABLERO LLEGA DE FUERA ═══
 *
 * `tablero.glb` trae su atlas como PNG y Hermes no lo decodifica: el valle entero salía en
 * la app sin un solo color. Quien monta la escena en un teléfono le pasa
 * `complementosDelTablero` —el atlas compilado de `app/src/tres/texturas-nativas.ts`— y aquí
 * se registran en el cargador del `.glb`. Por qué así y no importándolo: `catalogo.ts`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { ESCALA_DEL_PACK } from '../escala';
import { rutaDelTablero } from '../ruta-de-modelos';
import { semillaDelCodigo } from '../../shared/mecanicas/semilla';
import { LADO_DE_LOSA } from './medidas';
import { LO_QUE_NO_SE_RECORTA, montarLaLosa, semillaDeLaLosa } from './losa';
import type { PuestaEnLaLosa } from './losa';
import {
  COLOR_DE_LA_ARENA,
  COLOR_DE_LA_CASILLA_CLARA,
  VELO_DE_LA_CASILLA_CLARA,
  geometriaDeLaArena,
  geometriaDeLosHuecos,
  geometriaDelSuelo,
} from './suelo';
import { loQueHayEnElDesierto, loQueSeEstira } from './desierto';
import type { EnElDesierto } from './desierto';
import type { LosaQueSePinta } from './suelo';
import {
  abrirElTablero,
  cajaDeLasPartes,
  cajaDelModelo,
  catalogoDe,
  ejeDelLargo,
  escalaDeLaPuesta,
} from './catalogo';
import type { Catalogo, ComplementoDelCargador, ParteDelModelo } from './catalogo';
import { ANILLOS_DE_DETALLE, DONDE_EMPIEZA_A_IRSE } from './detalle';
import type { AnillosDeDetalle } from './detalle';
import { geometriaDeLaPeana, geometriaDelLabriego } from './labriego';
import {
  ALTO_DE_LA_ULTIMA,
  ALTO_DEL_LABRIEGO,
  loQueEncogeElLabriego,
  loQueSeLevantaLaUltima,
} from './medidas';
import {
  NIEBLA_DEL_PASEO,
  alcanceDeLaArena,
  alturaDeLaCamara,
  alturaDelSuelo,
  camaraDeMesa,
  dondeNaceQuienPasea,
  loQueAbarca,
  losasPorCasilla,
} from './paseo';
import { usarElPaseo } from '../paseo/usar-el-paseo';
import { rodajasQueChocanDelCatalogo, sePintaLoMenudo, trozosDelAdornoDeLasLindes } from './adorno-de-las-lindes';
import { usarElAdorno } from '../paseo/usar-el-adorno';
import { QuienAnda } from '../paseo/quien-anda';
import { usarElCanal } from '../paseo/usar-el-canal';
import { LosDemas } from '../paseo/los-demas';
import { LosHallazgos } from '../paseo/los-hallazgos';
import type { Andante } from '../../shared/mecanicas/mundo';
import { mundoDeLasLindes } from '../../shared/arcade/juegos/lindes-mundo';
import type { Calidad, PropsDeLasLindes, Traer } from './tipos';
import type { Giro } from '../../shared/arcade/juegos/lindes-losas';
import { llaveDeCasilla } from '../../shared/arcade/juegos/lindes-losas';
import { MINIMO_PARA_GIRAR } from '../camara';
import {
  INCLINACION_DE_LA_MANO,
  loQueHaCaido,
  DISTANCIA_DE_LA_MANO,
  DISTANCIA_DE_LA_MANO_A_PIE,
  sitioDeLaMano,
  sitioDelRelojDeLaBolsa,
  ALTO_DE_LA_CAJA_DEL_RELOJ,
} from './rincones';
import {
  ALTO_DEL_RELOJ_EN_LADOS,
  RelojDeArena,
  montarElReloj,
  ponerLaArena,
  soltarElReloj,
} from '../reloj';
import { relojDe } from '../comun/reloj';
import type { RelojCargado } from '../comun/reloj';
import { usarArranqueYMedida } from '../comun/arranque';
import { MODELO } from '../nombres';

/* ─────────────────────────────── Constantes ─────────────────────────────── */

/** El cielo de una mañana de siega: azul arriba, paja en el horizonte. */
const COLOR_DEL_CIELO = '#8cb8de';
const COLOR_DE_LA_NIEBLA = '#cfdae2';

/*
 * LOS DOS ANILLOS DE DETALLE —hasta dónde se pinta lo menudo y hasta dónde el relleno— y
 * cuándo empieza una pieza a irse viven en `detalle.ts`, uno por calidad: son números, y
 * `verify:lindes-escena` cuenta con ellos los triángulos de las dos calidades. Aquí sólo se
 * leen, con la calidad que llega por `props`.
 *
 * `ALTO_DE_LA_ULTIMA` y `loQueSeLevantaLaUltima` viven en `medidas.ts`: son medidas, y
 * desde allí se pueden comprobar sin montar una escena.
 */

/*
 * ═══ LA LOSA DE LA MANO, PEGADA A LA CÁMARA ═══
 *
 * La pieza que toca poner, EN TRES DIMENSIONES y en una esquina del lienzo: se ve la losa
 * de verdad —su villa, sus caminos, sus casas, sus árboles— en lugar de leer «La puerta de
 * la villa · N muralla · E senda» en un renglón y tener que imaginársela.
 *
 * ═══ POR QUÉ COLGADA DE LA CÁMARA Y NO EN UN RINCÓN DEL MUNDO ═══
 *
 * Porque el tablero CRECE y la cámara se aleja con él: cualquier sitio del mundo que hoy
 * caiga en una esquina del encuadre, con setenta losas puestas cae en medio o fuera.
 * Colgada de la cámara ocupa siempre el mismo trozo de pantalla, que es lo que una pieza
 * en la mano tiene que hacer. Es la misma decisión que la bandeja de los dados del Burgo,
 * y por el mismo motivo.
 *
 * ═══ Y POR QUÉ NO ES UN SEGUNDO LIENZO ═══
 *
 * Porque un `<Canvas>` aparte serían DOS contextos de WebGL en la misma pantalla, y en
 * esta casa ya está apuntado lo que pasa con eso en un móvil: el navegador tira uno de los
 * dos y la escena desaparece sin que falle nada. Un grupo más en el lienzo que ya hay no
 * cuesta ni un contexto ni una llamada de dibujo por losa.
 *
 * DÓNDE VA EXACTAMENTE no se decide aquí: está en `mano.ts`, que es aritmética sin
 * `three` y por tanto lo único de esto que un comprobador puede mirar desde Node.
 */

/* ───────────────────────────────── Ayudas ───────────────────────────────── */

/*
 * LAS PARTES DE CADA MODELO, EL CATÁLOGO Y LA CAJA DE UNA PIEZA viven en `catalogo.ts`, con el
 * cargador del `.glb`: son `three` sin React, y así `verify:lindes-escena` abre el tablero y
 * mide las cajas en Node con el mismo código que pinta.
 */

/** Cuántos triángulos tiene una geometría. */
function triangulosDe(g: THREE.BufferGeometry): number {
  const indice = g.getIndex();
  if (indice !== null) return indice.count / 3;
  const pos = g.getAttribute('position');
  return pos === undefined ? 0 : pos.count / 3;
}

/* ─────────────────────────────── La escena ─────────────────────────────── */

/**
 * LO QUE RECIBE LA ESCENA: lo de `tipos.ts`, y una cosa más que no puede vivir allí.
 *
 * `tipos.ts` no nombra `three` a propósito —lo lee el servidor, a través de la traducción de
 * `shared/`, y el servidor no compila `three`—, y un complemento de `GLTFLoader` es un tipo de
 * `three`. Así que la prop que lo lleva se declara aquí, junto a quien la usa.
 */
export interface PropsDeLaEscenaDeLasLindes extends PropsDeLasLindes {
  /**
   * LOS COMPLEMENTOS CON LOS QUE SE ABRE `tablero.glb`, si el motor no sabe abrir su atlas.
   *
   * En la app, en un teléfono, es `[texturasDelTablero]`: el atlas compilado a bytes. En un
   * navegador no se pasa nada, porque el PNG se decodifica de verdad. Se lee UNA vez, al pedir
   * el catálogo —como `traer`—: cambiarlo después no vuelve a abrir el tablero.
   */
  readonly complementosDelTablero?: readonly ComplementoDelCargador[];
}

export function Lindes(props: PropsDeLaEscenaDeLasLindes): JSX.Element {
  const { tablero, codigo, traer, calidad, camara, giroEnMano, quieto } = props;
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);

  /*
   * ═══ EL ARRANQUE Y LA MEDIDA, CON EL GANCHO COMÚN ═══
   *
   * `comun/arranque.ts`, el mismo de las demás escenas. Aquí se avisaba de que el tablero estaba
   * listo en cuanto llegaba el `.glb`, con el valle aún sin pintar; ahora se deja pintar y se avisa,
   * como promete el contrato, y el tope de quince segundos es el suyo. Y la medida —una vez por
   * segundo, con la media de ESE segundo— sólo corre con el tablero cargado: mientras el `.glb`
   * viaja la escena es un suelo y un cielo, y un juez que mirara eso diría `plena` de un valle que
   * aún no está.
   */
  const arrancar = usarArranqueYMedida(props, { llave: traer, midiendo: catalogo !== null });

  /* ── Los modelos ────────────────────────────────────────────────────────── */
  useEffect(() => {
    let vivo = true;
    let cargado: Catalogo | null = null;

    /* Sin complementos es el `GLTFLoader` de siempre; en el teléfono, con el atlas compilado. */
    const complementos = props.complementosDelTablero ?? [];
    traer(rutaDelTablero())
      .then((bytes) => abrirElTablero(bytes, complementos))
      .then((gltf) => {
        if (!vivo) return;
        cargado = catalogoDe(gltf.scene);
        setCatalogo(cargado);
      })
      .catch((e: unknown) => {
        if (!vivo) return;
        const motivo = e instanceof Error ? e.message : String(e);
        setFallo(motivo);
        props.alFallar?.(motivo);
      })
      .finally(() => {
        if (vivo) arrancar();
      });

    return () => {
      vivo = false;
      cargado?.soltar();
    };
    /* `traer` y los avisos son estables por contrato; el catálogo se pide una vez. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traer]);

  /* ── La semilla del paisaje: la misma mesa, el mismo valle ──────────────── */
  const semilla = useMemo(() => semillaDelCodigo(codigo, 0x5eed), [codigo]);
  /* ── El suelo ───────────────────────────────────────────────────────────── */
  const losasQueSePintan = useMemo<LosaQueSePinta[]>(
    () => tablero.losas.map((l) => ({ x: l.x, y: l.y, losa: l.losa, giro: l.giro })),
    [tablero.losas],
  );
  const suelo = useMemo(() => geometriaDelSuelo(losasQueSePintan), [losasQueSePintan]);
  useEffect(() => () => suelo?.dispose(), [suelo]);
  /*
   * El desierto se saca de las losas y de la semilla, así que sólo se rehace cuando el
   * tablero crece: ocho piezas no cuestan nada, pero recalcularlas cada fotograma las movería
   * de sitio y un peñasco que anda es peor que ningún peñasco.
   */
  const desierto = useMemo(
    () => loQueHayEnElDesierto(losasQueSePintan, semilla),
    [losasQueSePintan, semilla],
  );

  /* ── Lo que se pone encima, agrupado por modelo ──────────────────────────── */
  const contenidos = useMemo(() => {
    const salida = new Map<string, { readonly puestas: readonly PuestaEnLaLosa[]; readonly x: number; readonly y: number }>();
    for (const l of tablero.losas) {
      const suya = semillaDeLaLosa(semilla, l.x, l.y);
      salida.set(l.casilla, { puestas: montarLaLosa(l.losa, l.giro, suya).puestas, x: l.x, y: l.y });
    }
    return salida;
  }, [tablero.losas, semilla]);

  /* ── La cámara ──────────────────────────────────────────────────────────── */
  const { camera, size } = useThree();
  const abarca = useMemo(() => loQueAbarca(tablero.losas), [tablero.losas]);

  /* Hasta dónde llega la arena: lo de la mesa y lo del paseo, a la vez. Ver `alcanceDeLaArena`. */
  const alcance = useMemo(
    () => alcanceDeLaArena(abarca, camaraDeMesa(abarca, size.width / Math.max(1, size.height)).suelo),
    [abarca, size.width, size.height],
  );
  const arena = useMemo(
    () => geometriaDeLaArena(losasQueSePintan, alcance),
    [losasQueSePintan, alcance],
  );
  useEffect(() => () => arena?.dispose(), [arena]);
  const laNiebla = useRef<THREE.Fog>(null);
  const mirandoA = useRef<{ x: number; z: number }>({ x: 0, z: 0 });

  /*
   * ═══ EL PASEO ES EL COMÚN: ESTA ESCENA SÓLO DECLARA SU MUNDO ═══
   *
   * Aquí se daba un paso propio por fotograma, en coma flotante, preguntando a un `Set` de
   * casillas si había losa: el borde paraba y las casas y las murallas se atravesaban. Y las
   * teclas se leían de `document`, que en el móvil no existe. Ahora el paseo es el de
   * `escenas/paseo/`, por tics, con el paso de `shared/` y la arena de un MUNDO que esta escena
   * no escribe: lo deriva `mundoDeLasLindes` de las mismas losas y la misma semilla que el
   * paisaje, que es también lo que derivará el servidor. Lo único que se le cuenta desde aquí es
   * lo que sólo sabe este valle: de qué losa se nace, a qué altura está su suelo, y que la
   * cámara no baja a la senda con los pies (ver `alturaDeLaCamara`).
   *
   * ═══ Y EL MUNDO SÓLO SE DERIVA A PIE ═══
   *
   * Derivarlo es montar otra vez el reparto de todas las losas y sacar sus cajas: medido en
   * Node con un tablero lleno —72 losas, 1.831 cuerpos— son entre 210 y 345 ms, tanto como el
   * paisaje que esta escena ya monta, y en el Hermes del móvil, sin JIT, bastante más. Mirando
   * la mesa no lo usa nadie, y es donde se pasa casi toda la partida: ahí no se paga.
   */
  const aPie = camara.modo !== 'mesa';
  const mundo = useMemo(
    () => (aPie ? mundoDeLasLindes(tablero.losas, semilla) : null),
    [aPie, tablero.losas, semilla],
  );
  const nace = useMemo(
    () => (mundo === null ? null : dondeNaceQuienPasea(tablero.losas, mundo)),
    [tablero.losas, mundo],
  );
  const porCasilla = useMemo(() => losasPorCasilla(tablero.losas), [tablero.losas]);
  const alturaEn = useCallback((x: number, z: number) => alturaDelSuelo(porCasilla, x, z), [porCasilla]);
  const alturaDeLaCamaraEn = useCallback(
    (x: number, z: number) => alturaDeLaCamara(porCasilla, x, z),
    [porCasilla],
  );
  /*
   * ═══ EL CANAL, SÓLO SI LA MESA ES DE BOTAS ═══
   *
   * Sin la prop no se abre nada y `alDarUnTic` es `undefined`: una mesa normal no paga ni una
   * llamada por tic. Con ella, el paseo le da cada tic al canal (la costura a) y el canal pone a
   * quien pasea donde dice el servidor (la costura b), que llega por una referencia porque el
   * paseo se monta después. Ver `paseo/usar-el-canal.ts`. La refriega va por los mismos hilos: el
   * paseo le pregunta al canal si quien pasea está en el suelo (`caido`), y `QuienAnda` y `LosDemas`
   * le preguntan cómo va cada uno (`cliente`).
   */
  const corregirAQuienPasea = useRef<(sitio: Andante) => void>(() => undefined);
  const elCanal = usarElCanal(props.canal, corregirAQuienPasea, props.alRecoger);
  /*
   * Y LO MENUDO, QUE PARA A QUIEN ANDA EN ESTE APARATO: barriles, carros, sacos, vallas, las rocas
   * que no llegan a la cintura… (`adorno-de-las-lindes.ts`). No es estructura y el servidor no lo ve.
   * Sólo si se pinta: la sobria no pinta lo menudo, y no se choca con lo que no se ve. Por trozos,
   * fuera del fotograma (`usarElAdorno`).
   */
  const trabajoDelAdorno = useMemo(
    () =>
      !aPie || catalogo === null
        ? null
        : trozosDelAdornoDeLasLindes(
            tablero.losas,
            semilla,
            rodajasQueChocanDelCatalogo(catalogo.partes),
            (pieza) => ejeDelLargo(cajaDelModelo(catalogo, pieza)),
            sePintaLoMenudo(calidad),
          ),
    [aPie, catalogo, tablero.losas, semilla, calidad],
  );
  const adorno = usarElAdorno(trabajoDelAdorno);
  const paseo = usarElPaseo({
    mundo,
    adorno,
    brotes: elCanal.brotes,
    nace,
    modo: camara.modo,
    mandos: props.mandos,
    alturaEn,
    alturaDeLaCamaraEn,
    alDarUnTic: elCanal.alDarUnTic,
    caido: elCanal.caido,
  });
  useEffect(() => {
    corregirAQuienPasea.current = paseo.corregir;
  }, [paseo.corregir]);

  /*
   * ═══ A PIE, EL PLANO CERCANO A MEDIA UNIDAD ═══
   *
   * El lienzo del valle lo pone a una unidad (`EL_LIENZO_DEL_VALLE`), que desde la mesa sobra. A pie,
   * desde que quien anda mide la mitad (`paseo/talla.ts`), la cámara de hombro pegada a una pared se
   * queda a 0,64 de su espalda (`ATRAS_MINIMO_DEL_HOMBRO`) y la cabeza caía dentro de esa unidad: se
   * cortaba. Media unidad, como el Burgo y Riberas; al subir a la mesa vuelve la de antes.
   */
  useEffect(() => {
    const c = camera as THREE.PerspectiveCamera;
    if (!aPie || c.isPerspectiveCamera !== true) return undefined;
    const cercaDeLaMesa = c.near;
    c.near = Math.min(cercaDeLaMesa, 0.5);
    c.updateProjectionMatrix();
    return () => {
      c.near = cercaDeLaMesa;
      c.updateProjectionMatrix();
    };
  }, [aPie, camera]);

  useFrame((_, dt) => {
    if (camara.modo === 'mesa') {
      const pose = camaraDeMesa(abarca, size.width / Math.max(1, size.height));
      /*
       * ═══ EL PLANO DE FONDO LO DICE LA POSE, Y SE PONE ANTES DE MOVER NADA ═══
       *
       * Estaba escrito a mano en quien monta la escena —`far: 6000`— y valía mientras el
       * tablero fuera pequeño: con un tablero largo en una pantalla estrecha la cámara se
       * va a cuatro mil y la esquina de allá queda a seis mil trescientos, o sea detrás del
       * fondo. El tablero entero desaparece, se ve cielo, y no hay ni un error en la
       * consola. Quien sabe a qué distancia se pone la cámara es `camaraDeMesa`, así que es
       * ella la que dice hasta dónde hay que ver.
       */
      const camaraDeVerdad = camera as THREE.PerspectiveCamera;
      if (camaraDeVerdad.isPerspectiveCamera === true && camaraDeVerdad.far < pose.lejos) {
        camaraDeVerdad.far = pose.lejos;
        camaraDeVerdad.updateProjectionMatrix();
      }
      /* Y la niebla, detrás del tablero: mirando la mesa no da profundidad, se lo come. */
      const n = laNiebla.current;
      if (n !== null) {
        n.near = pose.niebla.cerca;
        n.far = pose.niebla.lejos;
      }
      if (quieto === true) camera.position.set(pose.x, pose.y, pose.z);
      /* Si no, se acerca poco a poco: el tablero crece y un salto de cámara marea. */
      else camera.position.lerp(new THREE.Vector3(pose.x, pose.y, pose.z), Math.min(1, dt * 2.5));
      camera.lookAt(pose.miraX, pose.miraY, pose.miraZ);
      mirandoA.current = { x: pose.miraX, z: pose.miraZ };
      return;
    }
    /*
     * Andando SÍ hace falta la niebla cerca: a ras de suelo es lo único que da idea de
     * cuánto tablero queda por delante. Se le devuelven sus dos números de siempre.
     */
    const nAndando = laNiebla.current;
    if (nAndando !== null) {
      nAndando.near = NIEBLA_DEL_PASEO.cerca;
      nAndando.far = NIEBLA_DEL_PASEO.lejos;
    }
    /*
     * El paso y la cámara ya los ha dado el paseo, que corre antes que esto (`usarElPaseo`,
     * con prioridad −1). Aquí sólo se lee dónde está quien pasea, que es el centro del
     * recorte por distancia.
     */
    mirandoA.current = { x: paseo.pose.current.x, z: paseo.pose.current.z };
  });

  /* ── Los toques ─────────────────────────────────────────────────────────── */
  const [senalado, setSenalado] = useState<{ x: number; y: number } | null>(null);
  const huecos = useMemo(() => geometriaDeLosHuecos(tablero.huecos), [tablero.huecos]);
  useEffect(() => () => huecos?.dispose(), [huecos]);

  /*
   * LA CASILLA SEÑALADA SE OLVIDA CUANDO DEJA DE SER UN HUECO.
   *
   * Se quedaba puesta de un turno para otro, y al empezar el siguiente la pista del raíl
   * decía «En 3, -1» —una casilla que acababa de llenarse, la que uno mismo acaba de
   * ocupar— mientras el fantasma no se pintaba en ninguna parte. Desde que el primer toque
   * señala y el segundo pone, además, una casilla señalada rancia haría que el primer toque
   * en OTRA casilla colocara sin enseñar nada, que es justo lo que se acaba de arreglar.
   */
  useEffect(() => {
    if (senalado === null) return;
    if (tablero.huecos.some((h) => h.x === senalado.x && h.y === senalado.y)) return;
    setSenalado(null);
    props.alSenalarHueco?.(null, null);
  }, [props, senalado, tablero.huecos]);

  const casillaDelPunto = useCallback((p: THREE.Vector3) => {
    return { x: Math.round(p.x / LADO_DE_LOSA), y: Math.round(-p.z / LADO_DE_LOSA) };
  }, []);

  /*
   * ═══ EL TOQUE ES `pointerdown` + `pointerup`, Y NO `onClick` ═══
   *
   * Esto era un `onClick` y en la app NO SE PODÍA PONER UNA LOSA — o sea, no se podía
   * jugar—. Los `pointermove` sí llegaban: el fantasma aparecía y el botón de girar se
   * encendía. Lo que no llegaba nunca era el `click`, porque React Native Web llama a
   * `preventDefault` en el `pointerdown` para su propio sistema de gestos y entonces el
   * navegador no sintetiza el `click`. Con ratón, en el escritorio, sí lo sintetiza, y por
   * eso allí funcionaba y aquí no: el mismo código, el mismo servidor, dos resultados.
   *
   * `Lindes.tsx` era el ÚNICO sitio de `escenas/` que usaba `onClick`; las otras veintiuna
   * asas de esta casa usan `onPointerDown`/`onPointerUp`, y ahora se ve por qué.
   *
   * ═══ Y UN TOQUE NO ES UN ARRASTRE ═══
   *
   * Con el dedo, girar la cámara empieza igual que tocar: bajando el puntero sobre el
   * tablero. Si `pointerup` pusiera la losa a secas, cada giro de cámara colocaría una. Se
   * guarda dónde bajó y sólo cuenta como toque si subió cerca —`MINIMO_PARA_GIRAR`, el
   * mismo umbral que usa el Burgo y que vive en `escenas/camara.ts`— y en la misma casilla.
   */
  const bajoEn = useRef<{ x: number; y: number; casilla: string } | null>(null);
  const alBajar = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (e.nativeEvent.button !== undefined && e.nativeEvent.button !== 0) return;
      e.stopPropagation();
      const donde = casillaDelPunto(e.point);
      bajoEn.current = { x: e.pointer.x, y: e.pointer.y, casilla: llaveDeCasilla(donde.x, donde.y) };
    },
    [casillaDelPunto],
  );

  const alTocar = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const bajo = bajoEn.current;
      bajoEn.current = null;
      if (bajo === null) return;
      if (e.nativeEvent.button !== undefined && e.nativeEvent.button !== 0) return;
      e.stopPropagation();
      const donde = casillaDelPunto(e.point);
      /*
       * El umbral se mide en PUNTOS de pantalla y no en las unidades de r3f, que van de
       * menos uno a uno: en un lienzo ancho, cuatro puntos son una centésima de esa escala.
       */
      const dx = ((e.pointer.x - bajo.x) * size.width) / 2;
      const dy = ((e.pointer.y - bajo.y) * size.height) / 2;
      if (Math.hypot(dx, dy) > MINIMO_PARA_GIRAR) return;
      if (bajo.casilla !== llaveDeCasilla(donde.x, donde.y)) return;
      const cabe = tablero.huecos.filter((h) => h.x === donde.x && h.y === donde.y);
      if (cabe.length === 0) return;
      /*
       * ═══ EL PRIMER TOQUE SEÑALA; EL SEGUNDO PONE ═══
       *
       * Con ratón esto no cambia nada: el cursor ya ha pasado por encima de la casilla, así
       * que `onPointerMove` la señaló y el clic sigue colocando a la primera.
       *
       * Con el dedo sí, y era lo que hacía el juego injugable en el móvil. El motor nativo
       * de react-three-fiber saca `onPointerMove` del `onPanResponderMove`, o sea SÓLO si el
       * dedo se arrastra: un toque limpio da `onPointerDown` y `onPointerUp` y ninguno en
       * medio. Así que en el móvil nunca había casilla señalada, «Girar» estaba apagado
       * —`girosQueCaben` con `senalada === null` devuelve cero— y el primer toque ponía la
       * losa en el acto, con el giro que hubiera. Las cuatro maneras de encajar una losa,
       * que son media regla de Carcassonne, no se podían elegir.
       *
       * Ahora el primer toque enciende el fantasma y el botón, y el segundo confirma. Nadie
       * pone una losa sin haber visto antes cómo queda.
       */
      if (senalado === null || senalado.x !== donde.x || senalado.y !== donde.y) {
        setSenalado(donde);
        props.alSenalarHueco?.(donde.x, donde.y);
        return;
      }
      /*
       * ═══ CON QUÉ GIRO SE PONE, QUE ES LA DECISIÓN DE INTERFAZ DEL JUEGO ═══
       *
       * La pantalla lleva un giro elegido —se cambia con un botón o con la rueda—
       * y aquí se usa ÉSE si cabe. Si no cabe, se pone con el primero que sí, y no
       * se rechaza el toque: quien señala una casilla que admite un solo giro no
       * tiene por qué adivinar cuál era.
       */
      const elegido = cabe.find((h) => h.giro === giroEnMano) ?? cabe[0];
      if (elegido === undefined) return;
      props.alTocarHueco?.(elegido.x, elegido.y, elegido.giro);
    },
    [casillaDelPunto, giroEnMano, props, senalado, tablero.huecos, size],
  );

  const alSenalar = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const donde = casillaDelPunto(e.point);
      if (senalado !== null && senalado.x === donde.x && senalado.y === donde.y) return;
      if (!tablero.huecos.some((h) => h.x === donde.x && h.y === donde.y)) return;
      setSenalado(donde);
      props.alSenalarHueco?.(donde.x, donde.y);
    },
    [casillaDelPunto, props, senalado, tablero.huecos],
  );

  /* ── El fantasma de la losa que se va a poner ────────────────────────────── */
  const fantasma = useMemo(() => {
    if (senalado === null || tablero.enMano === '') return null;
    const cabe = tablero.huecos.filter((h) => h.x === senalado.x && h.y === senalado.y);
    if (cabe.length === 0) return null;
    const elegido = cabe.find((h) => h.giro === giroEnMano) ?? cabe[0];
    if (elegido === undefined) return null;
    return {
      x: elegido.x,
      y: elegido.y,
      giro: elegido.giro,
      /*
       * LA SEMILLA ES LA DE LA CASILLA A LA QUE VA, y no una cualquiera. El fantasma
       * ensena como va a quedar la losa ahi: con `semilla ^ 0x9e37` ensenaba un reparto
       * de casas, arboles y vallas y al soltarla salia otro, porque lo que se pone se
       * monta con `semillaDeLaLosa(semilla, x, y)`. Medido: 0 de 384 coincidian. Un
       * fantasma que no es lo que va a pasar no es un fantasma, es un dibujo.
       */
      contenido: montarLaLosa(
        tablero.enMano,
        elegido.giro,
        semillaDeLaLosa(semilla, elegido.x, elegido.y),
      ),
    };
  }, [giroEnMano, semilla, senalado, tablero.enMano, tablero.huecos]);
  const sueloDelFantasma = useMemo(
    () =>
      fantasma === null
        ? null
        : geometriaDelSuelo([{ x: fantasma.x, y: fantasma.y, losa: tablero.enMano, giro: fantasma.giro }]),
    [fantasma, tablero.enMano],
  );
  useEffect(() => () => sueloDelFantasma?.dispose(), [sueloDelFantasma]);

  /*
   * ═══ LA MEDIDA: UNA VEZ POR SEGUNDO, CON LA MEDIA DE ESE SEGUNDO ═══
   *
   * Es el contrato de `alMedir` en esta casa, y es lo que lee el juez de la calidad: la media de
   * milisegundos del ÚLTIMO segundo y cuántos fotogramas cubre. La lleva el gancho de arriba
   * (`usarArranqueYMedida`, que sólo mide con el tablero cargado). Aquí se mandaba cada treinta
   * fotogramas la media DESDE EL PRINCIPIO con el total de fotogramas desde el principio; con eso
   * `juzgarCalidad`, que suma los fotogramas de las muestras, contaba los treinta primeros tres veces
   * y juzgaba con noventa fotogramas vistos y no con ciento veinte. El lobby de Las Lindes tenía el
   * mismo fallo cada sesenta y nadie lo vio: por eso ahora la medida es una, y de todas.
   */

  /*
   * ═══ SE DEVUELVE UN FRAGMENTO Y NO UN `<group>`, Y NO ES ESTILO ═══
   *
   * `attach="background"` y `attach="fog"` se enganchan al OBJETO PADRE. Dentro de
   * un `<group>` eso escribe `group.background`, que no existe y que a nadie le
   * importa: la escena se queda sin cielo y sin niebla, sin un error en ninguna
   * consola. Con el fragmento, el padre es la escena de verdad.
   *
   * Se ve como un lienzo NEGRO con el tablero dentro, y lo primero que uno piensa
   * es que no se ha pintado nada. Costó un rato y por eso está escrito aquí.
   */
  return (
    <>
      <color attach="background" args={[COLOR_DEL_CIELO]} />
      {/*
        LA NIEBLA LA MUEVE EL FOTOGRAMA, y no estos dos números: en la vista de mesa se
        aparta detrás del tablero y en el paseo se queda cerca, que es donde sirve. Ver
        `camaraDeMesa`. Los `args` son sólo con lo que nace, antes del primer fotograma.
      */}
      <fog ref={laNiebla} attach="fog" args={[COLOR_DE_LA_NIEBLA, NIEBLA_DEL_PASEO.cerca, NIEBLA_DEL_PASEO.lejos]} />
      <hemisphereLight args={['#eaf2ff', '#6b6a4a', 1.15]} />
      <directionalLight
        position={[LADO_DE_LOSA * 3, LADO_DE_LOSA * 5, LADO_DE_LOSA * 2]}
        intensity={1.5}
        color="#fff3dd"
      />

      {arena !== null ? (
        <mesh geometry={arena} receiveShadow={false}>
          <meshStandardMaterial color={COLOR_DE_LA_ARENA} roughness={1} metalness={0} />
        </mesh>
      ) : null}

      {catalogo !== null ? <ElDesierto catalogo={catalogo} piezas={desierto} /> : null}

      {suelo !== null ? (
        <mesh geometry={suelo} receiveShadow={false}>
          <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
        </mesh>
      ) : null}

      {catalogo !== null ? (
        <LoQueSePoneEncima
          catalogo={catalogo}
          contenidos={contenidos}
          mirandoA={mirandoA}
          calidad={calidad}
          ultima={tablero.losas.find((l) => l.ultima)?.casilla ?? ''}
          aPie={camara.modo !== 'mesa'}
        />
      ) : null}

      <LosLabriegos labriegos={tablero.labriegos} aPie={camara.modo !== 'mesa'} />

      {/*
        QUIEN ANDA, en tercera persona. Sólo mientras se pasea: en la mesa no hay a quién
        seguir, y pintarlo allí sería una figura de dos unidades y media perdida en un
        tablero de mil seiscientas. Ver `paseo/quien-anda.tsx` para por qué no existía. Lee
        la pose que escribe el paseo: dónde, a qué altura y a qué paso de verdad.
      */}
      {camara.modo === 'mesa' ? null : (
        <QuienAnda
          traer={traer}
          asiento={camara.asiento}
          figura={props.figura}
          pose={paseo.pose}
          enPrimeraPersona={camara.modo === 'ojos'}
          alFallar={props.alFallar}
          cliente={elCanal.cliente}
        />
      )}

      {/*
        LOS DEMÁS, sólo con canal y sólo a pie: en la mesa son figuras de dos unidades y media
        en un tablero de mil seiscientas, lo mismo que quien pasea, que tampoco se pinta allí.
        El canal sigue abierto mirando la mesa, y al bajar ya están donde están.
      */}
      {props.canal === undefined || camara.modo === 'mesa' ? null : (
        <LosDemas
          traer={traer}
          cliente={elCanal.cliente}
          presentes={elCanal.presentes}
          asientos={props.canal.asientos}
          yo={props.canal.yo}
          alturaEn={alturaEn}
        />
      )}

      {/*
        LOS HALLAZGOS, con la misma guarda y el mismo suelo: escudos sueltos por el valle, girando
        sobre su losa con su columna de luz (`paseo/los-hallazgos.tsx`). No se tocan: ninguna de sus
        mallas contesta a un rayo, y los huecos de abajo siguen cogiendo el toque.
      */}
      {props.canal === undefined || camara.modo === 'mesa' ? null : <LosHallazgos brotes={elCanal.brotes} alturaEn={alturaEn} />}

      {huecos !== null ? (
        <mesh geometry={huecos} onPointerDown={alBajar} onPointerUp={alTocar} onPointerMove={alSenalar}>
          <meshStandardMaterial
            color={COLOR_DE_LA_CASILLA_CLARA}
            transparent
            opacity={VELO_DE_LA_CASILLA_CLARA}
            roughness={1}
            metalness={0}
            depthWrite={false}
          />
        </mesh>
      ) : null}

      {catalogo !== null && tablero.enMano !== '' ? (
        <LaLosaEnLaMano
          aPie={camara.modo !== 'mesa'}
          catalogo={catalogo}
          losa={tablero.enMano}
          giro={giroEnMano}
          /*
           * Mientras se senala una casilla, la losa del rincon se monta con LA SEMILLA DE
           * ESA CASILLA: asi lo que se tiene en la mano y lo que se va a soltar son la
           * misma losa, arbol por arbol. Sin casilla senalada no hay destino todavia, y
           * entonces vale la de la mesa.
           */
          semilla={
            senalado === null ? semilla : semillaDeLaLosa(semilla, senalado.x, senalado.y)
          }
          reservaAbajo={props.reservaAbajo ?? 0}
        />
      ) : null}

      <ElRelojDeLaBolsa
        reservaAbajo={props.reservaAbajo ?? 0}
        aPie={camara.modo !== 'mesa'}
        catalogo={catalogo}
        traer={traer}
        quedan={tablero.quedan}
        deLaBolsa={tablero.deLaBolsa}
        sePuedePasar={props.sePuedePasar === true}
        alPasar={props.alPasar}
      />

      {sueloDelFantasma !== null && fantasma !== null ? (
        <group position={[0, ALTO_DE_LA_ULTIMA, 0]}>
          <mesh geometry={sueloDelFantasma}>
            <meshStandardMaterial vertexColors transparent opacity={0.72} roughness={1} metalness={0} />
          </mesh>
        </group>
      ) : null}

      {fallo !== null ? null : null}
    </>
  );
}

/* ──────────────────── Las piezas del pack, instanciadas ──────────────────── */

interface LoQueSePoneEncimaProps {
  readonly catalogo: Catalogo;
  readonly contenidos: ReadonlyMap<string, { readonly puestas: readonly PuestaEnLaLosa[]; readonly x: number; readonly y: number }>;
  readonly mirandoA: { current: { x: number; z: number } };
  readonly calidad: Calidad;
  readonly ultima: string;
  /** ¿Se está andando por el tablero? Entonces la última losa no se levanta. */
  readonly aPie: boolean;
}

/**
 * TODAS LAS PIEZAS DEL PACK, UNA `InstancedMesh` POR MODELO Y POR MATERIAL.
 *
 * ═══ POR QUÉ SE REPARTE POR MODELO Y NO POR LOSA ═══
 *
 * Porque una llamada de dibujo cuesta lo mismo con una pieza que con mil, y lo que
 * se paga es el número de llamadas. Por losa serían setenta y dos grupos con
 * veinte mallas cada uno: mil cuatrocientas llamadas, y una tarjeta de móvil se
 * arrodilla mucho antes. Por modelo son cuarenta, pase lo que pase en la partida.
 *
 * El precio es que hay que rehacer las matrices cuando cambia el tablero, y eso es
 * recorrer una lista: microsegundos, una vez por losa puesta.
 */
function LoQueSePoneEncima(props: LoQueSePoneEncimaProps): JSX.Element {
  const { catalogo, contenidos, mirandoA, calidad, ultima, aPie } = props;

  /*
   * HASTA DÓNDE SE PINTA EL RELLENO LO DICE LA CALIDAD, y los números están en `detalle.ts`.
   * Esta prop llegaba desde el principio y no la leía nadie: `sobria` pintaba lo mismo que
   * `plena`. Lo que cuenta una regla no mira esto: se pinta siempre, en las dos.
   */
  const anillos = ANILLOS_DE_DETALLE[calidad];

  /*
   * Desde la mesa, la última losa se levanta para que se vea cuál acaba de ponerse; a pie
   * no, que sus casas flotarían a dos alturas de hombre sobre su propio terreno. El
   * razonamiento entero está en `loQueSeLevantaLaUltima`, que es donde vive la medida.
   */
  const seLevanta = loQueSeLevantaLaUltima(aPie);

  /* Lo que cuenta una regla se monta siempre; el relleno, sólo cerca. */
  const porModelo = useMemo(() => {
    const salida = new Map<string, PuestaEnLaLosa[]>();
    for (const [casilla, lo] of contenidos) {
      const dx = lo.x * LADO_DE_LOSA;
      const dz = -lo.y * LADO_DE_LOSA;
      for (const p of lo.puestas) {
        const lista = salida.get(p.pieza);
        const puesta: PuestaEnLaLosa = {
          ...p,
          x: p.x + dx,
          z: p.z + dz,
          y: p.y + (casilla === ultima ? seLevanta : 0),
        };
        if (lista === undefined) salida.set(p.pieza, [puesta]);
        else lista.push(puesta);
      }
    }
    return salida;
  }, [contenidos, seLevanta, ultima]);

  return (
    <group>
      {[...porModelo.keys()].sort().map((nombre) => (
        <UnModelo
          key={nombre}
          partes={catalogo.partes.get(nombre) ?? []}
          puestas={porModelo.get(nombre) ?? []}
          mirandoA={mirandoA}
          anillos={anillos}
        />
      ))}
    </group>
  );
}

interface UnModeloProps {
  readonly partes: readonly ParteDelModelo[];
  readonly puestas: readonly PuestaEnLaLosa[];
  readonly mirandoA: { current: { x: number; z: number } };
  /** Hasta dónde se pinta lo que se recorta, en losas: el de la calidad que toque. */
  readonly anillos: AnillosDeDetalle;
}

const AUX_MATRIZ = new THREE.Matrix4();
const AUX_POSICION = new THREE.Vector3();
const AUX_GIRO = new THREE.Quaternion();
const AUX_EJE = new THREE.Vector3(0, 1, 0);
const AUX_ESCALA = new THREE.Vector3();
/*
 * Los tres ejes de la cámara, reutilizados. Se declaran aquí y no dentro del
 * `useFrame` de la mano por lo mismo que los de arriba: tres `Vector3` nuevos por
 * fotograma son ciento ochenta objetos por segundo que el recolector tiene que
 * barrer, y el tirón se nota justo en la escena que hay que mirar bonita.
 */
const AUX_ADELANTE = new THREE.Vector3();
const AUX_DERECHA = new THREE.Vector3();
const AUX_ARRIBA = new THREE.Vector3();

/** Un modelo del pack, con todas sus copias del tablero en una sola malla por parte. */
function UnModelo({ partes, puestas, mirandoA, anillos }: UnModeloProps): JSX.Element | null {
  const mallas = useRef<(THREE.InstancedMesh | null)[]>([]);
  const conRelleno = anillos.relleno * LADO_DE_LOSA;
  const conMenudo = anillos.menudo * LADO_DE_LOSA;
  /* Hacia dónde estira el `largo`, leído en la caja del modelo una vez: ver `ejeDelLargo`. */
  const eje = useMemo(() => ejeDelLargo(cajaDeLasPartes(partes)), [partes]);

  useFrame(() => {
    const centro = mirandoA.current;
    for (let k = 0; k < partes.length; k++) {
      const malla = mallas.current[k];
      if (malla === null || malla === undefined) continue;
      let n = 0;
      for (const p of puestas) {
        /*
         * ═══ EL RECORTE SE DESVANECE, NO CORTA ═══
         *
         * Era un `continue` a secas: la pieza estaba entera o no estaba. Y el borde SE VE,
         * porque no hay nada que lo tape — el relleno desaparece a cuatro losas del centro y
         * la niebla del paseo no empieza hasta ocho. Entre las dos hay cuatro losas de tierra
         * de nadie donde los árboles se encienden y se apagan de golpe según uno anda, en un
         * anillo perfecto alrededor de la cámara. Y en la vista de mesa ya no hay niebla
         * ninguna, así que el anillo se ve entero.
         *
         * Ensanchar el anillo no cabe: medido con el reparto de hoy, cuatro losas y media son
         * 3.167.310 triángulos contra un tope de 3.200.000 —un uno por ciento de holgura, que no
         * es caber; con el de entonces eran 3.241.206—. Así que en el último tramo del alcance la
         * pieza ENCOGE hasta desaparecer. No cuesta ni un triángulo —es la escala que ya se
         * está componiendo— y lo que se ve es que las cosas se hacen pequeñas con la
         * distancia, que es lo que hacen las cosas.
         */
        let desvanece = 1;
        if (LO_QUE_NO_SE_RECORTA.indexOf(p.porque) < 0) {
          const tope = p.menuda ? conMenudo : conRelleno;
          /* Un anillo de cero es NUNCA —lo menudo en `sobria`—, no «lo que caiga justo en el centro». */
          if (tope <= 0) continue;
          const dx = p.x - centro.x;
          const dz = p.z - centro.z;
          const lejos = dx * dx + dz * dz;
          if (lejos > tope * tope) continue;
          const desde = tope * DONDE_EMPIEZA_A_IRSE;
          if (lejos > desde * desde) {
            desvanece = (tope - Math.sqrt(lejos)) / (tope - desde);
            if (desvanece <= 0.02) continue;
          }
        }
        AUX_POSICION.set(p.x, p.y, p.z);
        AUX_GIRO.setFromAxisAngle(AUX_EJE, p.giro);
        /* El `largo`, por el eje que es largo: el muro por su `x`, la valla por su `z`. */
        escalaDeLaPuesta(p.escala * desvanece, p.largo, eje, AUX_ESCALA);
        malla.setMatrixAt(n, AUX_MATRIZ.compose(AUX_POSICION, AUX_GIRO, AUX_ESCALA));
        n++;
      }
      malla.count = n;
      malla.instanceMatrix.needsUpdate = true;
    }
  });

  if (partes.length === 0 || puestas.length === 0) return null;
  return (
    <group>
      {partes.map((parte, k) => (
        <instancedMesh
          key={k}
          ref={(m: THREE.InstancedMesh | null) => {
            mallas.current[k] = m;
          }}
          args={[parte.geometria, parte.material, puestas.length]}
          frustumCulled={false}
        />
      ))}
    </group>
  );
}

/* La caja de un modelo del pack —alto, ancho y fondo medidos— es `cajaDelModelo`, en `catalogo.ts`. */

/* ──────────────────────────── El desierto de fuera ──────────────────────────── */

/**
 * LAS OCHO PIEZAS DE ALREDEDOR.
 *
 * Dónde van y cuáles son lo decide `desierto.ts`, que es aritmética y se puede medir desde
 * Node. Aquí sólo se instancian, con el mismo camino que la losa de la mano: agrupadas por
 * modelo y sin recorte por distancia, porque ocho piezas grandes no son atrezo menudo — son
 * el sitio, y el sitio no se apaga cuando la cámara se aleja.
 */
function ElDesierto({
  catalogo,
  piezas,
}: {
  readonly catalogo: Catalogo;
  readonly piezas: readonly EnElDesierto[];
}): JSX.Element | null {
  /*
   * ═══ LA ESCALA SE SACA MIDIENDO EL MODELO, NO DE UNA TABLA ═══
   *
   * `desierto.ts` pide un ALTO porque las piezas del pack no miden lo mismo —hay cuatro veces
   * entre `roca-a` y `piedra`—, así que una escala común daba un peñasco y un guijarro. Aquí
   * está la caja de cada modelo, que es el único sitio donde se sabe de verdad lo que mide, y
   * de ella sale la escala. El día que alguien recompile el pack con otro tamaño, esto sigue
   * dando peñascos sin tocar una línea.
   */
  const porModelo = useMemo(() => {
    const salida = new Map<string, PuestaEnLaLosa[]>();
    for (const p of piezas) {
      const escala = loQueSeEstira(cajaDelModelo(catalogo, p.pieza), p.tamano);
      const puesta: PuestaEnLaLosa = {
        pieza: p.pieza,
        x: p.x,
        y: p.y,
        z: p.z,
        giro: p.giro,
        escala,
        largo: 1,
        porque: 'prado',
        menuda: false,
      };
      const lista = salida.get(p.pieza);
      if (lista === undefined) salida.set(p.pieza, [puesta]);
      else lista.push(puesta);
    }
    return salida;
  }, [catalogo, piezas]);

  if (porModelo.size === 0) return null;
  return (
    <group>
      {[...porModelo.keys()].sort().map((nombre) => (
        <UnModeloSinRecorte
          key={nombre}
          partes={catalogo.partes.get(nombre) ?? []}
          puestas={porModelo.get(nombre) ?? []}
        />
      ))}
    </group>
  );
}

/* ─────────────────────── El reloj de arena de la bolsa ─────────────────────── */

/**
 * CUÁNTA PARTIDA QUEDA, EN EL RINCÓN DE LA DERECHA.
 *
 * ═══ POR QUÉ UN RELOJ DE ARENA EN UN JUEGO SIN PLAZOS ═══
 *
 * Porque lo que se acaba aquí no es el turno: es LA BOLSA. Las Lindes declara `tickHz: 0`
 * —ni plazos ni nada que el servidor haga por ti si tardas—, así que un reloj que contara
 * el turno sería una mentira muy bien pintada. Pero la partida SÍ se acaba, y se acaba
 * exactamente cuando se saca la última losa: cuánto queda es lo que decide si mandar un
 * labriego al prado, de donde no vuelve, o guardárselo. Eso está en el raíl como «Quedan
 * 38», que es un número que hay que leer y comparar con otro que no está en ningún sitio.
 *
 * Es el MISMO reloj de Riberas: el mismo componente `RelojDeArena` y las mismas medidas.
 * Lo único que cambia es qué mide la arena, y eso lo decide quien lo monta.
 *
 * ═══ Y ES EL `.glb`, COMO EN RIBERAS Y EN EL BURGO ═══
 *
 * Aquí se pasaba `modelo={null}`, que era pedir el reloj de conos —el respaldo anterior al
 * modelo— y quedarse con él para siempre. Lo puse yo, y con un motivo medido: el `.glb` trae
 * el color HORNEADO A VÉRTICE y horneado oscuro (la arena en `rgb(133, 74, 29)` y la madera
 * en `rgb(42, 10, 2)`, casi negra), y en el rincón oscuro de este juego eso daba 20 píxeles
 * claros dentro de los bulbos contra los 3.539 de los conos.
 *
 * El motivo era bueno y la decisión era mala: dejaba a este juego con un reloj distinto al de
 * los otros dos, y el respaldo abierto para que a cualquiera le volviera a pasar. Miguel lo
 * vio en cuanto se sentó. Así que aquí va el mismo reloj que en todas partes, y lo oscuro del
 * horneado se arregla donde está el problema —en el modelo—, no escondiéndolo detrás de un
 * segundo reloj.
 *
 * ═══ Y ES TAMBIÉN EL BOTÓN DE PASAR ═══
 *
 * Como allí y por lo mismo: no plantar es el gesto más corriente de la partida y no tiene
 * que costar buscar un botón. Apagado cuando el juego no lo ofrece, y entonces ni coge el
 * toque.
 */
function ElRelojDeLaBolsa({
  aPie,
  catalogo,
  traer,
  quedan,
  deLaBolsa,
  sePuedePasar,
  alPasar,
  reservaAbajo,
}: {
  /** ¿Se está andando por el tablero? Entonces el rincón va cerca, o se entierra. */
  readonly aPie: boolean;
  /** Los puntos de abajo que tapa la pantalla (la cinta, los mandos). Ver `PropsDeLasLindes`. */
  readonly reservaAbajo: number;
  /** El pack, para la caja en la que se apoya. `null` mientras viaja. */
  readonly catalogo: Catalogo | null;
  /** Para traer `reloj.glb`. El mismo `traer` de la escena, así que se baja una sola vez. */
  readonly traer: Traer;
  readonly quedan: number;
  readonly deLaBolsa: number;
  readonly sePuedePasar: boolean;
  readonly alPasar?: () => void;
}): JSX.Element {
  const grupo = useRef<THREE.Group>(null);
  const cuerpo = useRef<THREE.Group>(null);
  const asa = useRef<THREE.Mesh>(null);
  const { camera, size } = useThree();

  /*
   * EL MODELO, CON SU PROPIA RED Y SIN TUMBAR NADA SI NO LLEGA. Es el mismo trato que las
   * losas, los aventureros y el pack: una mesa sin reloj se sigue jugando —el asa de pasar
   * sigue puesta— y lo que no puede es dejar la escena a medias. `relojDe` lo baja una sola
   * vez por `traer`, así que abrir dos veces la misma mesa no lo pide dos veces.
   */
  const [cargado, ponerCargado] = useState<RelojCargado | null>(null);
  useEffect(() => {
    let vivo = true;
    void relojDe(traer).then((m) => {
      if (vivo) ponerCargado(m);
    });
    return () => {
      vivo = false;
    };
  }, [traer]);
  const montado = useMemo(() => montarElReloj(cargado), [cargado]);
  useEffect(() => () => soltarElReloj(montado), [montado]);

  /*
   * El sitio se saca UNA vez por pintado y se usa en los dos lados: el tamaño se lo lleva
   * el componente y la pose la pone el fotograma. Sacarlo dos veces sería tener dos
   * cuentas que hay que acordarse de cambiar a la vez, y sólo una se vería mal.
   */
  const sitio = sitioDelRelojDeLaBolsa(
    (camera as THREE.PerspectiveCamera).fov ?? 45,
    size.width / Math.max(1, size.height),
    ALTO_DEL_RELOJ_EN_LADOS,
    aPie ? DISTANCIA_DE_LA_MANO_A_PIE : DISTANCIA_DE_LA_MANO,
    reservaAbajo / Math.max(1, size.height),
  );

  /*
   * La pose y la arena, en el mismo fotograma y sin pasar por el estado de React: la
   * fracción sólo cambia cuando se saca una losa, pero la POSE cambia con la cámara, que
   * se mueve sola mientras el tablero crece.
   *
   * Y el `cuerpo` no gira nunca, al revés que en Riberas: allí el reloj da media vuelta al
   * empezar la ronda porque el plazo se reinicia. Aquí no hay plazo y la bolsa no se
   * rellena, así que darle la vuelta sería decir que algo vuelve a empezar.
   */
  useFrame((_, salto) => {
    const g = grupo.current;
    if (g === null) return;
    const camara = camera as THREE.PerspectiveCamera;
    AUX_ADELANTE.set(0, 0, -1).applyQuaternion(camara.quaternion);
    AUX_DERECHA.set(1, 0, 0).applyQuaternion(camara.quaternion);
    AUX_ARRIBA.set(0, 1, 0).applyQuaternion(camara.quaternion);
    g.position
      .copy(camara.position)
      .addScaledVector(AUX_ADELANTE, sitio.adelante)
      .addScaledVector(AUX_DERECHA, sitio.derecha)
      .addScaledVector(AUX_ARRIBA, sitio.arriba);
    /*
     * El reloj está de pie en su plano y mira al frente, así que con el giro de la cámara
     * basta: no lleva la vuelta que sí necesita la losa, que está tumbada.
     */
    g.quaternion.copy(camara.quaternion);

    /*
     * ═══ LA ARENA, Y EL SALTO QUE DA `useFrame` ═══
     *
     * El mezclador se empuja con el `salto` de `useFrame` y NO con `clock.getDelta()`: r3f ya
     * consume ese reloj una vez por fotograma, así que volver a llamarlo devuelve casi cero y
     * los granos se quedan quietos sin que falle nada. Está medido en Riberas y escrito allí.
     *
     * Y la fracción no cuenta un plazo: cuenta LA BOLSA. `loQueHaCaido` la saca de cuántas
     * losas quedan, que es lo único que aquí se acaba.
     */
    if (montado !== null) {
      montado.mezclador.update(salto);
      ponerLaArena(montado, loQueHaCaido(quedan, deLaBolsa));
    }
  });

  /*
   * ═══ EN QUÉ SE APOYA, QUE NO PUEDE SER EN NADA ═══
   *
   * El reloj iba flotando en su esquina. Un reloj de arena que flota no es un objeto: es un
   * icono pegado en el cristal, y este juego no tiene iconos pegados, tiene cosas puestas
   * encima de otras. En Riberas se apoya en la barra y en El Burgo en la bandeja de los
   * dados; aquí no había nada debajo.
   *
   * Una CAJA DE MERCADO, del mismo pack que todo lo que hay en las losas: es lo que habría
   * debajo de un reloj en una plaza, y para este juego dice además lo suyo — lo que se acaba
   * aquí es la BOLSA de losas, y de una caja es de donde salen.
   *
   * Se le da el ALTO medido y no una escala a ojo, por lo mismo que al desierto, y se sienta
   * con su cara de arriba justo en la base del reloj: el modelo llega normalizado a una
   * unidad y centrado, así que su base está media unidad por debajo del centro de su grupo.
   */
  const enQueSeApoya = useMemo(() => {
    if (catalogo === null) return null;
    const suyo = cajaDelModelo(catalogo, MODELO.caja).alto;
    if (suyo <= 1e-6) return null;
    const alto = sitio.lado * ALTO_DE_LA_CAJA_DEL_RELOJ;
    const puestas: PuestaEnLaLosa[] = [
      {
        pieza: MODELO.caja,
        x: 0,
        y: -sitio.lado / 2 - alto,
        z: 0,
        /* Un pelo torcida: una caja a escuadra con la pantalla parece parte del marco. */
        giro: Math.PI * 0.12,
        escala: alto / (suyo * ESCALA_DEL_PACK),
        largo: 1,
        porque: 'prado',
        menuda: false,
      },
    ];
    return <UnModeloSinRecorte partes={catalogo.partes.get(MODELO.caja) ?? []} puestas={puestas} />;
  }, [catalogo, sitio.lado]);

  return (
    <group ref={grupo}>
      {enQueSeApoya}
      <RelojDeArena
        cuerpo={cuerpo}
        asa={asa}
        lado={sitio.lado}
        ancho={sitio.ancho}
        encendido={sePuedePasar}
        modelo={montado?.clon ?? null}
        onPulsar={() => alPasar?.()}
      />
    </group>
  );
}

/* ──────────────────────────── La losa de la mano ──────────────────────────── */

/**
 * LA LOSA QUE SE VA A PONER, EN UNA ESQUINA DEL LIENZO.
 *
 * Se monta la MISMA losa que se pondría —mismo generador, misma semilla, mismo giro—
 * a escala pequeña y siguiendo a la cámara. Que sea la misma y no un dibujo aparte es
 * la mitad del asunto: lo que se ve en la mano es EXACTAMENTE lo que va a aparecer en
 * el tablero, con las casas y los árboles que le tocaron. Un dibujo aparte se separa
 * del generador en la primera semana y nadie se entera hasta que alguien compara.
 *
 * ═══ Y GIRA CON EL BOTÓN, QUE ES PARA LO QUE SIRVE ═══
 *
 * El giro entra por `props`: quien pulsa «Girar» cambia el número y la losa de la mano
 * da un cuarto de vuelta. Sin esto, girar es una palabra en un botón y hay que
 * imaginarse el resultado; con esto se ve antes de tocar el tablero.
 */
function LaLosaEnLaMano({
  aPie,
  catalogo,
  losa,
  giro,
  semilla,
  reservaAbajo,
}: {
  /** ¿Se está andando por el tablero? Entonces el rincón va cerca, o se entierra. */
  readonly aPie: boolean;
  /** Los puntos de abajo que tapa la pantalla (la cinta, los mandos). Ver `PropsDeLasLindes`. */
  readonly reservaAbajo: number;
  readonly catalogo: Catalogo;
  readonly losa: string;
  readonly giro: Giro;
  readonly semilla: number;
}): JSX.Element | null {
  const grupo = useRef<THREE.Group>(null);
  const { camera, size } = useThree();

  const contenido = useMemo(() => montarLaLosa(losa, giro, semilla), [giro, losa, semilla]);
  const suelo = useMemo(() => geometriaDelSuelo([{ x: 0, y: 0, losa, giro }]), [giro, losa]);
  useEffect(() => () => suelo?.dispose(), [suelo]);

  const porModelo = useMemo(() => {
    const salida = new Map<string, PuestaEnLaLosa[]>();
    for (const p of contenido.puestas) {
      const lista = salida.get(p.pieza);
      if (lista === undefined) salida.set(p.pieza, [p]);
      else lista.push(p);
    }
    return salida;
  }, [contenido]);

  /*
   * ═══ SE RECOLOCA CADA FOTOGRAMA EN VEZ DE COLGAR DE LA CÁMARA ═══
   *
   * Colgarla como hija de `camera` sería más corto y tiene un problema: la niebla y
   * las luces se calculan en coordenadas del MUNDO, así que una losa hija de la cámara
   * se ilumina como si estuviera en el origen —de noche cerrada cuando el paseante se
   * ha ido lejos, y sin niebla cuando todo lo demás la tiene—. Recolocándola a mano es
   * un objeto del mundo que casualmente va donde va la cámara, y se ilumina con lo que
   * tiene alrededor.
   */
  useFrame(() => {
    const g = grupo.current;
    if (g === null) return;
    const camara = camera as THREE.PerspectiveCamera;
    const sitio = sitioDeLaMano(
      camara.fov ?? 45,
      size.width / Math.max(1, size.height),
      aPie ? DISTANCIA_DE_LA_MANO_A_PIE : DISTANCIA_DE_LA_MANO,
      reservaAbajo / Math.max(1, size.height),
    );

    AUX_ADELANTE.set(0, 0, -1).applyQuaternion(camara.quaternion);
    AUX_DERECHA.set(1, 0, 0).applyQuaternion(camara.quaternion);
    AUX_ARRIBA.set(0, 1, 0).applyQuaternion(camara.quaternion);
    g.position
      .copy(camara.position)
      .addScaledVector(AUX_ADELANTE, sitio.adelante)
      .addScaledVector(AUX_DERECHA, sitio.derecha)
      .addScaledVector(AUX_ARRIBA, sitio.arriba);
    g.quaternion.copy(camara.quaternion);
    g.rotateX(INCLINACION_DE_LA_MANO);
    g.scale.setScalar(sitio.escala);
  });

  if (suelo === null) return null;
  return (
    <group ref={grupo}>
      <mesh geometry={suelo}>
        <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
      </mesh>
      {[...porModelo.keys()].sort().map((nombre) => (
        <UnModeloSinRecorte
          key={nombre}
          partes={catalogo.partes.get(nombre) ?? []}
          puestas={porModelo.get(nombre) ?? []}
        />
      ))}
    </group>
  );
}

/**
 * UN MODELO DEL PACK SIN EL RECORTE POR DISTANCIA.
 *
 * El del tablero se recorta con los dos anillos; el de la mano NO puede. La losa de la
 * mano vive en el ORIGEN del mundo —lo que se mueve es el grupo que la lleva—, así que
 * la cuenta de la distancia la compararía contra un paseante que puede estar a miles
 * de unidades y no pintaría ni un árbol: la pieza en la mano saldría pelada justo
 * cuando el tablero está grande, que es cuando más falta hace verla.
 *
 * Son quince renglones y evitan meter una bandera dentro del otro, que tendría que
 * mirarse en cada pieza de cada fotograma para un solo caso.
 */
function UnModeloSinRecorte({
  partes,
  puestas,
}: {
  readonly partes: readonly ParteDelModelo[];
  readonly puestas: readonly PuestaEnLaLosa[];
}): JSX.Element | null {
  const mallas = useRef<(THREE.InstancedMesh | null)[]>([]);
  /* La misma cuenta que `UnModelo`: la losa de la mano es la que se va a poner, valla a valla. */
  const eje = useMemo(() => ejeDelLargo(cajaDeLasPartes(partes)), [partes]);

  useEffect(() => {
    for (let k = 0; k < partes.length; k++) {
      const malla = mallas.current[k];
      if (malla === null || malla === undefined) continue;
      for (let i = 0; i < puestas.length; i++) {
        const p = puestas[i] as PuestaEnLaLosa;
        AUX_POSICION.set(p.x, p.y, p.z);
        AUX_GIRO.setFromAxisAngle(AUX_EJE, p.giro);
        escalaDeLaPuesta(p.escala, p.largo, eje, AUX_ESCALA);
        malla.setMatrixAt(i, AUX_MATRIZ.compose(AUX_POSICION, AUX_GIRO, AUX_ESCALA));
      }
      malla.count = puestas.length;
      malla.instanceMatrix.needsUpdate = true;
    }
  }, [eje, partes, puestas]);

  if (partes.length === 0 || puestas.length === 0) return null;
  return (
    <group>
      {partes.map((parte, k) => (
        <instancedMesh
          key={k}
          ref={(m: THREE.InstancedMesh | null) => {
            mallas.current[k] = m;
          }}
          args={[parte.geometria, parte.material, puestas.length]}
          frustumCulled={false}
        />
      ))}
    </group>
  );
}

/* ────────────────────────────── Los labriegos ────────────────────────────── */

/**
 * LOS PEONES PLANTADOS, con su peana del color de cada cual.
 *
 * ═══ EL MATERIAL SE CREA AQUÍ Y NO SE DEJA COMO HIJO DEL `<instancedMesh>` ═══
 *
 * Con `args={[geometria, undefined, cuantos]}` y un `<meshStandardMaterial>` de
 * hijo, la malla nace SIN material y `three` no dibuja nada hasta que r3f engancha
 * el hijo — y cuando lo engancha, la malla ya tiene `instanceColor` puesto por un
 * efecto que corrió antes, así que el color se pierde. El resultado es un tablero
 * con veintiséis labriegos plantados en el estado y NINGUNO a la vista, sin un solo
 * error en la consola. Costó encontrarlo porque todo lo demás —la partida, la
 * traducción, las posiciones— estaba bien.
 *
 * Creados aquí y pasados por `args`, la malla nace completa.
 */
function LosLabriegos({
  labriegos,
  aPie,
}: {
  readonly labriegos: readonly {
    readonly casilla: string;
    readonly enX: number;
    readonly enZ: number;
    readonly color: string;
  }[];
  /** ¿Se está andando por el tablero? Entonces el labriego es un hombre, no una ficha. */
  readonly aPie: boolean;
}): JSX.Element | null {
  /*
   * ═══ UNA FICHA DESDE LA MESA, UN HOMBRE DESDE EL SUELO ═══
   *
   * `ALTO_DEL_LABRIEGO` son siete personas, y está bien razonado: desde la mesa el
   * labriego no es un señor en un campo, es la marca de QUIÉN tiene qué, y tiene que
   * leerse de un vistazo entre las casitas. Ver su comentario en `medidas.ts`.
   *
   * Pero este juego se recorre a pie. Y a pie esa misma ficha es un gigante rojo de
   * TRECE METROS plantado en el prado, con una peana de once metros flotándole a la
   * altura de la rodilla y el paseante andando por debajo. Mirado en el móvil: al
   * pulsar «hombro» la pantalla se llenaba de rojo, y lo primero que pensé es que el
   * avatar salía gigante — el avatar estaba bien; lo gigante era la ficha.
   *
   * Así que la ficha se queda ficha en la mesa y se hace hombre al bajar. No es un apaño
   * de tamaño: un labriego ES un hombre en un campo, y a su lado va el avatar de quien
   * pasea, que mide exactamente lo mismo. Las dos lecturas son verdad, cada una desde
   * donde se mira.
   */
  const cuanto = loQueEncogeElLabriego(aPie);
  const peon = useMemo(() => geometriaDelLabriego(), []);
  const peana = useMemo(() => geometriaDeLaPeana(ALTO_DEL_LABRIEGO * 0.42), []);
  const materialDelPeon = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 }),
    [],
  );
  const materialDeLaPeana = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, transparent: true, opacity: 0.8 }),
    [],
  );
  useEffect(
    () => () => {
      peon.dispose();
      peana.dispose();
      materialDelPeon.dispose();
      materialDeLaPeana.dispose();
    },
    [materialDeLaPeana, materialDelPeon, peana, peon],
  );

  const sitios = useMemo(
    () =>
      labriegos.map((l) => {
        const partes = l.casilla.split(',');
        const cx = Number(partes[0]) * LADO_DE_LOSA;
        const cz = -Number(partes[1]) * LADO_DE_LOSA;
        return {
          x: cx + l.enX * LADO_DE_LOSA,
          z: cz + l.enZ * LADO_DE_LOSA,
          color: new THREE.Color(l.color),
        };
      }),
    [labriegos],
  );

  const losPeones = useRef<THREE.InstancedMesh>(null);
  const lasPeanas = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    for (const malla of [losPeones.current, lasPeanas.current]) {
      if (malla === null) continue;
      const esPeana = malla === lasPeanas.current;
      for (let i = 0; i < sitios.length; i++) {
        const s = sitios[i] as { x: number; z: number; color: THREE.Color };
        AUX_POSICION.set(s.x, esPeana ? LADO_DE_LOSA * 0.006 * cuanto : 0, s.z);
        AUX_GIRO.identity();
        AUX_ESCALA.set(cuanto, cuanto, cuanto);
        malla.setMatrixAt(i, AUX_MATRIZ.compose(AUX_POSICION, AUX_GIRO, AUX_ESCALA));
        malla.setColorAt(i, s.color);
      }
      malla.count = sitios.length;
      malla.instanceMatrix.needsUpdate = true;
      if (malla.instanceColor !== null) malla.instanceColor.needsUpdate = true;
    }
  }, [cuanto, sitios]);

  if (sitios.length === 0) return null;
  return (
    <group>
      <instancedMesh
        ref={losPeones}
        args={[peon, materialDelPeon, sitios.length]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={lasPeanas}
        args={[peana, materialDeLaPeana, sitios.length]}
        frustumCulled={false}
      />
    </group>
  );
}
