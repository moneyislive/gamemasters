/**
 * EL MUNDO: comarcas hechas de teselas, por las que se camina.
 *
 * ═══ ESTO NO ES UN TABLERO CON FICHAS, Y ÉSA ES LA DECISIÓN ═══
 *
 * Cada hexágono del juego es una COMARCA de setenta y seis unidades de radio, hecha
 * de CIENTO CUARENTA Y CUATRO teselas de suelo. Una persona tarda casi cuarenta
 * segundos en cruzarla. La vista de tablero es ese mismo mundo mirado desde muy
 * arriba, y la vista en tercera persona que llegará con los avatares es la de
 * alguien andando por él. El razonamiento entero está en `escala.ts`.
 *
 * ═══ EL SUELO SON TESELAS DEL PACK, EN TERRAZAS ═══
 *
 * El pack de KayKit está hecho para esto: la tesela mide 1,0 de alto exacto con el
 * canto liso, para que apilarlas dé una terraza con la pared limpia, y trae rampas
 * que suben exactamente un escalón. Así que una tesela se dibuja en DOS piezas:
 *
 *   · la TESELA propiamente dicha, sin escalar en vertical, con su chaflán de
 *     borde intacto — es la superficie por la que se anda;
 *   · y debajo un ZÓCALO (`tesela-fondo`, un prisma liso sin chaflán) estirado
 *     hasta el fondo común del mundo.
 *
 * Estirar la tesela entera en vertical, que es lo que se hacía antes, estira también
 * su chaflán: un bisel de 0,27 unidades se convierte en uno de 1,35 y el borde deja
 * de leerse como un canto. El zócalo cuesta veinte triángulos y no tiene chaflán que
 * estropear.
 *
 * ═══ LOS BIOMAS SALEN DE MOVER LAS UV, NO DE TEÑIR ═══
 *
 * La textura del pack es una paleta de manchas lisas en ocho por cuatro celdas, y
 * todas las teselas de suelo apuntan a la celda de la hierba. Sumarle un
 * desplazamiento a sus UV la lleva a la celda de la arcilla, la piedra o la arena,
 * con su degradado de sombreado incluido. Teñir el material daría un color plano y
 * perdería ese degradado. La medida está en `paleta.ts`, y el propio pack confirma
 * el truco: `hex_transition` es una tesela con dos primitivas, media de un bioma y
 * media de otro.
 *
 * ═══ LO QUE ESTA ESCENA MARCA PARA QUE SE PUEDA JUGAR ═══
 *
 * Un mundo abierto precioso en el que no se sabe dónde construir no sirve. Lo que el
 * juego necesita que se vea son las ARISTAS —donde van los caminos y los puentes— y
 * los VÉRTICES —donde van poblados y ciudades—.
 *
 * Las aristas se marcan con la RED DE CAMINOS, hecha con las trece teselas de camino
 * del pack. No es una raya pintada por encima: es suelo, con su trazado entrando y
 * saliendo por los lados que toca, y serpentea. La primera versión sí era una raya
 * recta de tierra, y setenta y dos rayas rectas dibujaban un panal perfecto sobre un
 * terreno generado precisamente para no tener patrones. Ver `sendas.ts`.
 *
 * Los vértices se dejan VÍRGENES a propósito: sin disco, sin plataforma y sin marca.
 * Lo que los señala es que ahí se juntan tres caminos, que es exactamente lo que
 * señala un cruce en el mundo real. El terreno sí viene aplanado alrededor desde
 * `relieve.ts` —hace falta para construir— pero eso no se ve como una marca, se ve
 * como una explanada.
 *
 * ═══ TODO LO QUE SE REPITE VA INSTANCIADO, Y AGRUPADO POR COMARCA ═══
 *
 * Un mundo de diecinueve comarcas lleva casi tres mil teselas de suelo y varios
 * miles de árboles, rocas y casas. Aquí se agrupan y cada grupo se dibuja de UNA vez
 * con `instancedMesh`. Se agrupa por COMARCA además de por modelo, aunque eso
 * multiplique las llamadas: `three` descarta por objeto entero, así que un único
 * grupo con todos los árboles del mundo se dibuja completo aunque la cámara mire a
 * una sola comarca — que es exactamente el caso de la vista a pie de suelo.
 *
 * ═══ NI UNA IMPORTACIÓN DE `drei` ═══
 *
 * Está instalado y es MIT limpio, pero buena parte de sus componentes asumen DOM.
 * Este fichero lo pintan DOS clientes —la app sobre `expo-gl` y el escritorio sobre
 * WebGL— y un componente que asuma DOM aquí sale negro en el móvil sin un error en
 * ninguna consola. Sólo mallas, materiales y luces.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
/*
 * `useFrame` es del NÚCLEO de r3f, no de `drei`, así que vale en los dos clientes:
 * es el reloj de la escena y no toca el DOM. Y de paso este `import` carga la
 * ampliación de JSX que declara `<mesh>` y compañía — cosa que un `import type {}`
 * con la lista vacía NO hace, porque el compilador lo elide; ver `jsx-de-three.d.ts`.
 */
import { useFrame } from '@react-three/fiber';
import {
  aristasDe,
  centroDeHex,
  puntoDeVertice,
  verticesDeArista,
} from '../shared/mecanicas/malla-hexagonal';
import type { Hex, Punto } from '../shared/mecanicas/malla-hexagonal';
import {
  ALTURA_DE_UNA_PERSONA,
  ESCALA_DEL_PACK,
  ESCALON,
  LAMINA,
  RADIO_DE_COMARCA,
  RADIO_DE_TESELA,
} from './escala';
import {
  CELDA_DE_LA_NIEVE,
  desplazamientoDeCelda,
  desplazamientoDeColor,
  esDeLaHierba,
  esDelColorDelJugador,
  puntosDeLaCifra,
  terrenoDe,
} from './paleta';
import { COLORES_DE_JUGADOR, MODELO, modeloDeMuelle, PIEZAS_DE_COLOR } from './modelos';
import { laMarinaDelMundo } from './marina';
import type { CatalogoDeModelos } from './modelos';
import { cuantoHaSalido, piezasDeAsentamiento } from './asentamiento';
import { queVaEn } from './poblar';
import { fraccion } from './revoltijo';
import { crearRelieve, hexDePunto } from './relieve';
import type { Relieve, Subtesela } from './relieve';
import { apuntaLosLados, piezaDeCauce, piezaDeSenda, teselasDeUnCamino } from './sendas';
import { CAUCE, CUERPO, HONDO, piezaDeOrilla } from './aguas';
import { CELDA_DE_LA_ARENA } from './paleta';
import { sitiosDelTablero, sitiosPermitidos } from './sitios';
import { DISTANCIA_DE_LA_BARRA, huecosDeLaBarra } from './barra';
import type { HuecoDeLaBarra, PiezaDeBarra } from './barra';
import type { Colocando, Sitio } from './sitios';
import type { CaminoEn3D, DeltaEn3D, IslaEn3D, PiezaEn3D } from './tipos';

export { RADIO_DE_COMARCA, RADIO_DE_TESELA, ESCALON };

const COLOR_DEL_NUMERO = '#efe6cd';
/**
 * EL VERDE DE LAS SEÑALES DE COLOCAR.
 *
 * Chillón a propósito, y no es capricho de gusto: el anillo compite contra hierba
 * (`#8fae55`), bosque (`#3f6b45`), arena (`#e3d5a6`), roca (`#7d8590`) y agua
 * (`#257ebc`). Un verde razonable se pierde justo en los dos verdes del tablero, que
 * son la mitad de la superficie. Éste tiene el tono cerca de la hierba pero el triple
 * de saturación y casi todo el brillo, así que no se confunde con nada de lo que hay
 * debajo — y va en material básico, sin luz, para que tampoco se apague en sombra.
 */
const COLOR_DE_LA_SENAL = '#39ff14';
const COLOR_DEL_PUNTO = '#2a2118';

/** El plano de la malla puesto en el mundo: la `y` del tablero es la `z`. */
function alMundo(p: Punto, altura: number): [number, number, number] {
  return [p.x, altura, p.y];
}

/**
 * Los canales de sorteo de lo que va dentro del agua, separados y con nombre.
 *
 * Están aquí y no en `poblar.ts` porque `poblar` decide lo que crece en la TIERRA y
 * mira el terreno; esto decide lo que asoma en el AGUA y mira el cauce. Mezclarlos
 * obligaría a `poblar` a saber de hidrología para nada.
 */
const CANAL_DE_LA_PIEDRA = 31_013;
const CANAL_DEL_BOTE = 31_019;
const CANAL_DEL_GIRO = 31_027;
const CANAL_DE_LA_TALLA = 31_033;

/** El sorteo reproducible de una celda. Ver `revoltijo.ts`. */
function fraccionDeCelda(q: number, r: number, canal: number): number {
  return fraccion(q, r, canal);
}

/** Los lados que lleva una máscara de bits, para pedirle su pieza a la tabla. */
function ladosDe(bits: number): number[] {
  const salida: number[] = [];
  for (let k = 0; k < 6; k++) if ((bits & (1 << k)) !== 0) salida.push(k);
  return salida;
}

/** La llave con la que se agrupa por comarca. */
function llaveDe(h: Hex): string {
  return `${String(h.q)},${String(h.r)}`;
}

/**
 * UNA MALLA DEL PACK, lista para instanciar.
 *
 * Para instanciar hace falta una geometría y un material, no un árbol de nodos. Las
 * transformaciones del nodo vienen YA APLICADAS a la geometría, porque al instanciar
 * se pierde el árbol: sin eso, un modelo cuya malla cuelga de un hijo desplazado
 * aparece corrido respecto a donde se le pone.
 */
interface Instanciable {
  geometria: THREE.BufferGeometry;
  material: THREE.Material;
}

/**
 * APLANA UN MODELO A SUS MALLAS.
 *
 * Devuelve TODAS, no la primera. Seis modelos del pack traen dos o tres —el molino
 * lleva las aspas aparte, la atalaya el tejado— y quedarse con la primera dejaba un
 * molino sin aspas: sin error, sin hueco, sin nada que mirar salvo el modelo mal.
 */
function aplana(modelo: THREE.Object3D): Instanciable[] {
  const copia = modelo.clone(true);
  copia.updateWorldMatrix(true, true);
  const inversa = new THREE.Matrix4().copy(copia.matrixWorld).invert();

  const salida: Instanciable[] = [];
  copia.traverse((n) => {
    const malla = n as THREE.Mesh;
    if (!malla.isMesh) return;
    malla.updateWorldMatrix(true, false);
    const geometria = malla.geometry.clone();
    geometria.applyMatrix4(new THREE.Matrix4().copy(inversa).multiply(malla.matrixWorld));
    const material = Array.isArray(malla.material)
      ? (malla.material[0] as THREE.Material)
      : malla.material;
    salida.push({ geometria, material });
  });
  return salida;
}

/** Una copia colocada: dónde, cómo girada y con qué escala en cada eje. */
interface Puesta {
  posicion: THREE.Vector3;
  giro: number;
  escala: THREE.Vector3;
}

/** Una copia a escala uniforme del pack, que es el caso de casi todo. */
function comoElPack(x: number, y: number, z: number, giro = 0, talla = 1): Puesta {
  const s = ESCALA_DEL_PACK * talla;
  return {
    posicion: new THREE.Vector3(x, y, z),
    giro,
    escala: new THREE.Vector3(s, s, s),
  };
}

/**
 * TODAS LAS COPIAS DE UNA MALLA, EN UNA SOLA LLAMADA DE DIBUJO.
 *
 * Las matrices se escriben UNA vez, en un efecto de disposición, y no por
 * fotograma: recalcularlas en `useFrame` sería tirar por la ventana justo lo que el
 * instanciado compra. `computeBoundingSphere` no es opcional — sin ella la esfera
 * envolvente es la de una sola copia y el descarte por frustum borra el grupo entero
 * en cuanto la cámara se mueve, que se ve como comarcas que desaparecen al girar.
 */
function Copias({
  malla,
  puestas,
}: {
  malla: Instanciable;
  puestas: readonly Puesta[];
}): JSX.Element | null {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const m = ref.current;
    if (m === null) return;
    const matriz = new THREE.Matrix4();
    const giro = new THREE.Quaternion();
    const eje = new THREE.Vector3(0, 1, 0);
    puestas.forEach((p, i) => {
      giro.setFromAxisAngle(eje, p.giro);
      matriz.compose(p.posicion, giro, p.escala);
      m.setMatrixAt(i, matriz);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [puestas]);

  if (puestas.length === 0) return null;

  return (
    <instancedMesh
      ref={ref}
      key={puestas.length}
      args={[malla.geometria, malla.material, puestas.length]}
      castShadow
      receiveShadow
    />
  );
}

/** Un grupo de copias del mismo modelo: una entrada por malla del modelo. */
function Modelo({
  mallas,
  puestas,
}: {
  mallas: readonly Instanciable[];
  puestas: readonly Puesta[];
}): JSX.Element {
  return (
    <>
      {mallas.map((m, i) => (
        <Copias key={i} malla={m} puestas={puestas} />
      ))}
    </>
  );
}

/**
 * EL NÚMERO DE LA COMARCA, tumbado en su plaza.
 *
 * A esta escala el disco mide doce unidades de radio: desde el aire se lee de un
 * vistazo, y desde el suelo es una plaza empedrada con la cifra marcada. `poblar.ts`
 * deja despejadas las siete teselas del centro para que ningún pueblo le crezca
 * encima — es la única concesión que el paisaje le hace a la geometría del tablero,
 * y se hace porque sin el número no se puede jugar.
 */
function Numero({
  centro,
  altura,
  cifra,
}: {
  centro: Punto;
  altura: number;
  cifra: number;
}): JSX.Element {
  const puntos = puntosDeLaCifra(cifra);
  const disco = RADIO_DE_TESELA * 1.9;
  return (
    <group position={alMundo(centro, altura + 0.08)}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[disco, 44]} />
        <meshStandardMaterial color={COLOR_DEL_NUMERO} roughness={0.85} />
      </mesh>
      {Array.from({ length: puntos }, (_, i) => (
        <mesh
          key={i}
          position={[(i - (puntos - 1) / 2) * disco * 0.24, 0.05, disco * 0.46]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[disco * 0.07, 12]} />
          <meshBasicMaterial color={COLOR_DEL_PUNTO} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * EL MAR SE PINTA CON EL TÉXEL DEL PACK, NO CON UN AZUL PARECIDO.
 *
 * ═══ LA COTA ═══
 *
 * Estaba a medio escalón sobre el zócalo del mundo, que es un número inventado, y se
 * notaba en todas las capturas: el tablero flotaba sobre un disco azul que quedaba
 * casi tres unidades por debajo del agua de sus propias teselas de costa. El borde
 * enseñaba una pared de tierra sobre el mar.
 *
 * Medido en el `.glb`: la cara de arriba de `tesela-agua` está en `y = -0,2` clavado
 * —el modelo va de -1 a -0,2 y no tiene NADA por encima—, así que el mar va a
 * `0·ESCALON + LAMINA`, que es exactamente la lámina de una tesela de agua a nivel
 * cero. Coincide, y por eso la playa de una costa del borde entra en el mar sin
 * escalón.
 *
 * ═══ EL COLOR, QUE ES LO QUE FALTABA ═══
 *
 * La cota ya casaba y el mar seguía sin leerse como mar: era `#1d6a8e`, un azul
 * elegido a ojo, y el agua del pack es `#257ebc`. Dos azules que en una carta de
 * colores pasarían por el mismo se convierten en una COSTURA cuando están a la misma
 * altura y pegados — el río llegaba al mar y cambiaba de color justo en la playa.
 *
 * Y aunque se acertara el hex, no bastaría: el material del pack trae su rugosidad y
 * su textura, y dos materiales distintos con el mismo color base se sombrean distinto
 * bajo la misma luz. Así que el mar no IMITA el agua del pack: usa su material,
 * clonado, con la textura fijada en el téxel de su cara de arriba —`repeat` a cero
 * deja la UV constante en `offset`, así que todo el disco muestrea ese punto y sólo
 * ése—. Es literalmente el mismo píxel de la misma imagen con la misma rugosidad. No
 * hay dos azules que puedan separarse, porque no hay dos.
 *
 * La UV no está escrita aquí: se LEE de la geometría compilada. Si mañana el pack
 * cambia su tesela de agua, el mar cambia con ella sin que nadie se acuerde de esto.
 *
 * Sigue siendo un disco y no un anillo: por debajo del tablero no se ve, y un anillo
 * costaría un agujero que hay que hacer coincidir con el contorno dentado del mundo.
 */
function uvDeLaCaraDeArriba(g: THREE.BufferGeometry): { u: number; v: number } | null {
  const pos = g.getAttribute('position') as THREE.BufferAttribute | undefined;
  const uv = g.getAttribute('uv') as THREE.BufferAttribute | undefined;
  if (pos === undefined || uv === undefined) return null;

  let alto = -Infinity;
  for (let i = 0; i < pos.count; i++) alto = Math.max(alto, pos.getY(i));

  let u = 0;
  let v = 0;
  let cuantos = 0;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) < alto - 1e-4) continue;
    u += uv.getX(i);
    v += uv.getY(i);
    cuantos++;
  }
  return cuantos > 0 ? { u: u / cuantos, v: v / cuantos } : null;
}

function Mar({
  alcance,
  agua,
}: {
  alcance: number;
  agua: readonly Instanciable[] | undefined;
}): JSX.Element {
  const material = useMemo(() => {
    const pieza = agua?.[0];
    if (pieza === undefined) return null;
    const punto = uvDeLaCaraDeArriba(pieza.geometria);
    if (punto === null) return null;

    const copia = (pieza.material as THREE.MeshStandardMaterial).clone();
    const mapa = copia.map;
    if (mapa === null) return copia;
    /*
     * Se clona también la TEXTURA, y no sólo el material: `offset` y `repeat` viven en
     * ella, así que tocarlos sobre la compartida movería las UV de las dos mil teselas
     * del suelo. Es el mismo fallo que el del desplazamiento de bioma, un piso más
     * abajo.
     */
    const suya = mapa.clone();
    suya.repeat.set(0, 0);
    suya.offset.set(punto.u, punto.v);
    suya.needsUpdate = true;
    copia.map = suya;
    return copia;
  }, [agua]);

  if (material === null) return <group />;
  /*
   * EL MAR NO RECIBE SOMBRA, Y NO ES UN DESCUIDO.
   *
   * La caja de la luz direccional mide un radio de tablero; el disco de mar, seis. Un
   * fragmento que cae fuera de la caja muestrea el mapa de sombras fuera de rango, y
   * three lo pinza al borde: el mar salía sombreado entero salvo un círculo central,
   * o sea más oscuro que el agua de sus propios lagos, que sí está dentro de la caja.
   * Dos azules distintos otra vez, y esta vez ni siquiera por el color.
   *
   * Agrandar la caja tampoco vale: repartir la misma resolución de mapa sobre seis
   * veces el área deja el tablero —que es lo que se mira— con las sombras dentadas. Y
   * en mar abierto no hay nada que proyecte sombra que merezca la pena.
   */
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, LAMINA, 0]} material={material}>
      <circleGeometry args={[alcance * 6, 84]} />
    </mesh>
  );
}

/**
 * LA LUZ DE UN MUNDO GRANDE.
 *
 * Tres luces y ninguna más: una direccional cálida que hace de sol y tira las
 * sombras, un ambiente frío que rellena lo que el sol no toca —sin él las caras en
 * sombra quedan negras y las piezas parecen recortadas— y un hemisférico que devuelve
 * algo del verde del suelo por abajo.
 *
 * La cámara de sombras se dimensiona con el alcance y no con un número fijo: a esta
 * escala, un volumen de sombra pensado para un tablero de mesa deja el noventa por
 * ciento del mundo sin sombras y nadie sabe por qué.
 */
function Luces({ alcance }: { alcance: number }): JSX.Element {
  return (
    <>
      <ambientLight intensity={0.55} color="#cfe0f0" />
      <hemisphereLight args={['#eaf4ff', '#54613f', 0.6]} />
      <directionalLight
        position={[alcance * 0.55, alcance * 1.2, alcance * 0.4]}
        intensity={2}
        color="#fff3dd"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-alcance}
        shadow-camera-right={alcance}
        shadow-camera-top={alcance}
        shadow-camera-bottom={-alcance}
        shadow-camera-far={alcance * 4}
        shadow-bias={-0.0006}
      />
    </>
  );
}

/**
 * EN CUÁNTOS TRAMOS SE PARTE LA SENDA DE UNA ARISTA.
 *
 * Una arista mide setenta y seis unidades y por el medio el suelo puede subir y
 * bajar, aunque sus dos extremos —los rellanos de los vértices— estén llanos. Cada
 * tramo se apoya en la cota que le toca, así que la senda sube con el terreno en vez
 * de hundirse en una cuesta y flotar en la siguiente.
 */
const TRAMOS_DE_SENDA = 10;

/** Los tramos de una raya que va de un punto a otro, apoyados en el suelo. */
function tramosEntre(a: Punto, b: Punto, relieve: Relieve, alto: number): Puesta[] {
  const giro = Math.atan2(-(b.y - a.y), b.x - a.x);
  const salida: Puesta[] = [];
  for (let i = 0; i < TRAMOS_DE_SENDA; i++) {
    const t = (i + 0.5) / TRAMOS_DE_SENDA;
    const x = a.x + (b.x - a.x) * t;
    const z = a.y + (b.y - a.y) * t;
    salida.push({
      posicion: new THREE.Vector3(x, relieve.alturaEn({ x, y: z }) + alto, z),
      giro,
      escala: new THREE.Vector3(1, 1, 1),
    });
  }
  return salida;
}

/**
 * EL MUNDO ENTERO.
 *
 * Recibe datos llanos, un catálogo de modelos ya cargado y una semilla. No sabe de
 * partidas, ni de turnos, ni de quién mira: eso lo decide quien lo monta, que es
 * distinto en cada cliente.
 */
/**
 * LA SEÑAL DE UN SITIO DONDE SE PUEDE PONER ALGO: un anillo en el suelo.
 *
 * ═══ AQUÍ HUBO UNA FLECHA, Y SOBRABA ═══
 *
 * La primera versión ponía una flecha de verdad —cono y asta— flotando sobre cada
 * sitio, con el anillo debajo como apoyo. Puesta en pantalla, el anillo hacía todo el
 * trabajo y la flecha estorbaba: cincuenta y cuatro astas flotando sobre el tablero lo
 * convierten en un alfiletero y tapan justo el terreno que hay que juzgar antes de
 * elegir dónde fundar.
 *
 * Así que queda el anillo solo. Es la lección de siempre en un tablero mirado desde
 * arriba: lo que se lee a plomo es lo que está PEGADO AL SUELO. Una flecha vertical se
 * ve de punta.
 *
 * ═══ MIDE LO MISMO EN PANTALLA, ESTÉ CERCA O LEJOS ═══
 *
 * Esto no es un adorno, es lo que la hace existir. La vista de tablero mira el mundo
 * desde seiscientas setenta unidades, y un anillo del tamaño de una tesela a esa
 * distancia ocupa unos pocos píxeles. La primera versión no llevaba esta cuenta y la
 * captura salió idéntica a la de antes: se dibujaba, costaba sus llamadas y no se veía.
 *
 * Un marcador no es un objeto del mundo: es un cartel, y tiene que medir lo mismo en la
 * pantalla desde el aire y desde el suelo, como la chincheta de un mapa. La cuenta sale
 * de la cámara y no de una constante ajustada a ojo: a distancia `d`, un lente de campo
 * `fov` abarca `2·d·tan(fov/2)` de alto, así que para ocupar una fracción `f` de la
 * pantalla hay que medir `2·d·tan(fov/2)·f`.
 *
 * Y se acota por los dos lados: pegada al suelo la cuenta pide un anillo de una unidad,
 * que es una china; y desde muy lejos pediría uno que se come tres comarcas.
 *
 * ═══ LA ZONA DE AGARRE ES INVISIBLE Y MÁS GRANDE QUE EL ANILLO ═══
 *
 * Apuntar con el dedo a un anillo de veinte píxeles en un móvil no es jugar, es
 * puntería. Quien recibe el toque es un cilindro invisible que crece con el anillo.
 *
 * Y aquí hay una trampa del motor que conviene dejar escrita: `visible={false}` NO quita
 * el objeto del trazado de rayos —sigue siendo pinchable, que es justo lo que se quiere
 * aquí— mientras que `raycast={null}` revienta al primer rayo porque el motor la llama
 * sin comprobar. Lo que sí lo desactiva es `raycast={() => null}`.
 */
function Senal({
  sitio,
  color,
  elegida,
  onElegir,
}: {
  sitio: Sitio;
  color: string;
  elegida: boolean;
  onElegir: (sitio: Sitio) => void;
}): JSX.Element {
  const anillo = useRef<THREE.Mesh>(null);
  const agarre = useRef<THREE.Mesh>(null);
  const [encima, setEncima] = useState(false);

  /*
   * El latido va por reloj y no por estado: cambiar un estado de React sesenta veces por
   * segundo por cada una de las cincuenta y cuatro señales repinta el árbol entero
   * sesenta veces por segundo. Aquí se tocan la matriz y la opacidad, y no se repinta
   * nada.
   */
  useFrame((estado) => {
    const camara = estado.camera as THREE.PerspectiveCamera;
    const dx = camara.position.x - sitio.punto.x;
    const dy = camara.position.y - sitio.altura;
    const dz = camara.position.z - sitio.punto.y;
    const lejos = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const campo = ((camara.isPerspectiveCamera ? camara.fov : 45) * Math.PI) / 180;
    const quiere = (2 * lejos * Math.tan(campo / 2) * PARTE_DE_PANTALLA) / RADIO_DE_TESELA;
    const talla = Math.min(Math.max(quiere, 0.7), 6) * (encima || elegida ? 1.25 : 1);

    const a = anillo.current;
    if (a !== null) {
      a.scale.setScalar(talla);
      const m = a.material as THREE.MeshBasicMaterial;
      const t = estado.clock.elapsedTime;
      const desfase = sitio.punto.x * 0.07 + sitio.punto.y * 0.05;
      m.opacity =
        (encima || elegida ? 0.95 : 0.7) + Math.sin(t * 2.4 + desfase) * LATIDO_DE_LA_SENAL;
    }
    const g = agarre.current;
    if (g !== null) g.scale.setScalar(talla);
  });

  return (
    <group position={[sitio.punto.x, sitio.altura, sitio.punto.y]}>
      {/*
       * LA ZONA DE AGARRE: se dibuja, pero no escribe ni un píxel.
       *
       * `visible={false}` NO sirve aquí, y esto costó una prueba en pantalla. En `three`
       * a secas, el trazado de rayos no mira `visible` y un objeto invisible sigue
       * siendo pinchable — pero el sistema de eventos de r3f SÍ lo mira, y descarta los
       * impactos sobre objetos invisibles antes de repartirlos. Con `visible={false}` el
       * cilindro estaba ahí, el rayo lo tocaba, y el clic no llegaba nunca.
       *
       * Lo que sí funciona es `colorWrite={false}`: la malla existe, se recorre, recibe
       * el rayo y r3f la considera visible, pero el pintor no escribe color. Y sin
       * `depthWrite`, para que tampoco tape lo que tiene detrás.
       *
       * Y la otra mitad del refrán, por si alguien va a desactivar el rayo en otro sitio:
       * `raycast={null}` revienta al primer rayo porque el motor la llama sin comprobar.
       * Lo que lo desactiva es `raycast={() => null}`.
       */}
      <mesh
        ref={agarre}
        position={[0, ALTO_DEL_ANILLO * 0.6, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setEncima(true);
        }}
        onPointerOut={() => setEncima(false)}
        /*
         * SE DISPARA AL SOLTAR, NO AL PULSAR, y con eso salen los DOS gestos de uno.
         *
         * Lo que se pidió son dos formas de construir: pulsar el anillo, o arrastrar la
         * pieza desde la barra y soltarla encima. Parecen dos interacciones y son la
         * misma vista desde dos sitios — lo único que las distingue es dónde se pulsó
         * antes de soltar.
         *
         * · Pulsar el anillo: el puntero baja y sube sobre el anillo. Soltar aquí.
         * · Arrastrar: el puntero baja sobre la barra, se mueve, y sube sobre el anillo.
         *   Soltar aquí también.
         *
         * Con `onClick` sólo funcionaba el primero, porque un clic exige que la pulsación
         * y la suelta caigan en el mismo objeto. Con `onPointerUp` funcionan los dos y no
         * hay dos caminos de código que puedan separarse.
         *
         * No se captura el puntero al pulsar en la barra a propósito: capturarlo haría
         * que la suelta se entregara a la barra y nunca al anillo, que es exactamente lo
         * contrario de lo que hace falta.
         */
        onPointerUp={(e) => {
          e.stopPropagation();
          onElegir(sitio);
        }}
      >
        <cylinderGeometry args={[RADIO_DE_TESELA, RADIO_DE_TESELA, ALTO_DEL_ANILLO * 1.6, 8]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>
      {/*
       * SÍ PRUEBA LA PROFUNDIDAD, y esto es una corrección que sólo se ve jugando.
       *
       * La primera versión lo dibujaba con `depthTest={false}` para que no lo tapara el
       * canto de la tesela de al lado en una ladera. Y conseguía algo peor: el anillo de
       * un vértice del otro extremo del tablero se dibujaba ENCIMA de la montaña que
       * tenía delante. Se veía un anillo, se pulsaba, y no pasaba nada — porque el rayo
       * sí respeta la geometría y chocaba con la montaña.
       *
       * Un marcador que se ve donde no está es peor que un marcador escondido: el
       * escondido enseña que ahí no se puede pulsar, y el otro miente. Ahora lo que se
       * ve es lo que se puede pulsar, y si una montaña tapa un sitio es porque de verdad
       * está detrás de una montaña.
       *
       * ═══ Y FLOTA POR ENCIMA DEL PAISAJE, QUE ES LA OTRA MITAD ═══
       *
       * Al activar la profundidad, la mitad de los anillos desapareció: un vértice del
       * catán cae en medio de una comarca poblada, con árboles de seis unidades y casas
       * de cinco alrededor. Un anillo a ras de suelo queda ENTERRADO entre el follaje —
       * honesto pero inservible.
       *
       * Así que sube por encima de lo que crece: dos personas y media, que es más alto
       * que un árbol del pack y más bajo que la cámara de tierra. Y el cilindro del asa
       * llega desde el suelo hasta más arriba del anillo, así que se pulsa donde se ve.
       *
       * No escribe profundidad para no tapar lo que tiene detrás, y va de los dos lados
       * para que no desaparezca visto desde el ras del suelo.
       */}
      <mesh
        ref={anillo}
        position={[0, ALTO_DEL_ANILLO, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={2}
      >
        <ringGeometry args={[RADIO_DE_TESELA * 0.4, RADIO_DE_TESELA * 0.78, 28]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.7}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/**
 * A QUÉ ALTURA FLOTA EL ANILLO SOBRE EL SUELO DE SU SITIO.
 *
 * Dos personas y media. Sale de medir contra lo que crece en una comarca: el árbol del
 * pack levanta 1,2 del pack —seis y medio de mundo— y la casa de paisaje 1,28. Por
 * debajo de eso el anillo se pierde entre el follaje; muy por encima deja de leerse como
 * una marca EN un sitio y pasa a ser un globo.
 */
const ALTO_DEL_ANILLO = ALTURA_DE_UNA_PERSONA * 2.5;
/** Cuánto sube y baja la opacidad del anillo. Lo justo para que se note vivo. */
const LATIDO_DE_LA_SENAL = 0.18;
/** Qué parte del alto de la pantalla ocupa una señal, mire desde donde mire la cámara. */
const PARTE_DE_PANTALLA = 0.035;

/**
 * UNA PIEZA PUESTA EN SU HUECO DE LA BARRA.
 *
 * Se escala para que quepa en el hueco sea del tamaño que sea: el castillo mide 3,98 del
 * pack y la casa 1,28, así que sin normalizar el castillo saldría tres veces más grande
 * que la casa y la barra parecería rota. Se mide la caja de la geometría y se divide.
 *
 * Gira despacio porque es un modelo y no un icono: girando se le ve la forma, y es lo
 * que distingue enseñar la pieza de verdad de enseñar una foto suya.
 */
function PiezaEnLaBarra({
  pieza,
  hueco,
  mallas,
  tomada,
  onTomar,
}: {
  pieza: PiezaDeBarra;
  hueco: HuecoDeLaBarra;
  mallas: readonly Instanciable[];
  tomada: boolean;
  onTomar: (id: string) => void;
}): JSX.Element {
  const grupo = useRef<THREE.Group>(null);
  const [encima, setEncima] = useState(false);

  /*
   * CUÁNTO SE ESCALA Y DÓNDE TIENE LOS PIES.
   *
   * Las dos cosas se miden de la caja de la geometría, y las dos hacen falta. El alto,
   * para que el castillo —3,98 del pack— y la casa —1,28— salgan del mismo tamaño en la
   * barra en vez de uno tres veces mayor que el otro.
   *
   * Y el suelo, porque los modelos del pack NO tienen todos su origen en la base: el
   * puente lo tiene por el medio. Sin corregirlo, la barra sale con unas piezas
   * apoyadas y otras medio hundidas, y parece un fallo de dibujo cuando es un fallo de
   * suposición.
   */
  const { talla, pies } = useMemo(() => {
    let alto = 0;
    let bajo = Infinity;
    for (const m of mallas) {
      m.geometria.computeBoundingBox();
      const caja = m.geometria.boundingBox;
      if (caja === null) continue;
      alto = Math.max(alto, caja.max.y - caja.min.y);
      bajo = Math.min(bajo, caja.min.y);
    }
    const t = alto > 0 ? (hueco.lado * 0.62) / alto : 1;
    return { talla: t, pies: Number.isFinite(bajo) ? -bajo * t : 0 };
  }, [mallas, hueco.lado]);

  useFrame((estado) => {
    const g = grupo.current;
    if (g === null) return;
    const t = estado.clock.elapsedTime;
    g.rotation.y = t * 0.5;
    const crece = encima || tomada ? 1.18 : 1;
    const sube = encima || tomada ? hueco.lado * 0.12 : 0;
    g.position.y =
      -hueco.lado * 0.34 + pies * crece + sube + (tomada ? Math.sin(t * 6) * hueco.lado * 0.03 : 0);
    g.scale.setScalar(talla * crece);
  });

  return (
    <group position={[hueco.x, hueco.y, hueco.z]}>
      {/*
       * EL ASA ES LA CASILLA ENTERA, y esto costó una prueba en pantalla.
       *
       * La primera versión ponía el asa en el ZÓCALO, debajo de la pieza, razonando que
       * es una superficie ancha y plana. Y al probarlo no se cogía nada: uno pulsa la
       * CASA, no el posavasos que tiene debajo. Lo que hay que poder agarrar es lo que
       * se ve.
       *
       * Así que el asa es una caja invisible del tamaño del hueco, con la pieza y el
       * zócalo dentro. Los modelos no reciben rayos —`raycast={() => null}`— para que un
       * hueco entre las almenas del castillo no deje pasar el dedo al tablero de detrás.
       *
       * Invisible por `colorWrite`, no por `visible={false}`: r3f descarta de sus eventos
       * los objetos invisibles, y con `visible={false}` el asa no recibiría nada.
       */}
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setEncima(true);
        }}
        onPointerOut={() => setEncima(false)}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (pieza.disponible) onTomar(pieza.id);
        }}
      >
        <boxGeometry args={[hueco.lado, hueco.lado, hueco.lado * 0.8]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>
      {/* El zócalo, que ya sólo es adorno: le da sitio a la pieza y dice si está apagada. */}
      <mesh position={[0, -hueco.lado * 0.42, 0]} raycast={() => null}>
        <cylinderGeometry args={[hueco.lado * 0.46, hueco.lado * 0.5, hueco.lado * 0.12, 6]} />
        <meshStandardMaterial
          color={tomada ? COLOR_DE_LA_SENAL : encima ? '#f0e3c2' : '#c8b48a'}
          transparent
          opacity={pieza.disponible ? 0.92 : 0.3}
          roughness={0.7}
        />
      </mesh>
      <group ref={grupo}>
        {mallas.map((m, i) => (
          <mesh
            key={`barra:${pieza.id}:${String(i)}`}
            geometry={m.geometria}
            material={m.material}
            raycast={() => null}
          />
        ))}
      </group>
    </group>
  );
}

/**
 * LA BARRA DE ABAJO, pegada a la cámara.
 *
 * ═══ CÓMO SE PEGA, SIN TOCAR EL ÁRBOL DE LA ESCENA ═══
 *
 * Se copian la posición y el giro de la cámara sobre el grupo en cada fotograma, y los
 * huecos van dentro en coordenadas locales. Es lo mismo que colgar el grupo de la cámara
 * pero sin moverlo de sitio en el árbol, que en r3f obliga a manipular el objeto de la
 * cámara a mano y a acordarse de descolgarlo.
 *
 * ═══ Y POR QUÉ SE BORRA LA PROFUNDIDAD ANTES ═══
 *
 * La barra vive a dos unidades de la cámara y en la vista de tablero nada del mundo se
 * le acerca. Pero en la vista de tierra la cámara camina entre árboles, y un tronco a
 * unidad y media taparía media barra. Se borra el buffer de profundidad justo antes de
 * dibujarla: a partir de ahí la barra se dibuja sobre todo lo demás, pero SIN perder su
 * propia profundidad, así que un castillo sigue tapándose a sí mismo como debe.
 *
 * Poner `depthTest={false}` en los materiales daría el mismo «va delante» y rompería eso
 * otro: las caras de atrás del castillo se dibujarían encima de las de delante.
 */
function Barra({
  piezas,
  aplanados,
  tomada,
  onTomar,
}: {
  piezas: readonly PiezaDeBarra[];
  aplanados: Map<string, Instanciable[]>;
  tomada: string | null;
  onTomar: (id: string) => void;
}): JSX.Element {
  const grupo = useRef<THREE.Group>(null);
  const [forma, setForma] = useState({ campo: (45 * Math.PI) / 180, proporcion: 16 / 9 });

  useFrame((estado) => {
    const g = grupo.current;
    if (g === null) return;
    g.position.copy(estado.camera.position);
    g.quaternion.copy(estado.camera.quaternion);

    const c = estado.camera as THREE.PerspectiveCamera;
    const campo = ((c.isPerspectiveCamera ? c.fov : 45) * Math.PI) / 180;
    const proporcion = estado.size.width / Math.max(1, estado.size.height);
    if (Math.abs(campo - forma.campo) > 1e-6 || Math.abs(proporcion - forma.proporcion) > 1e-4) {
      setForma({ campo, proporcion });
    }
  });

  const huecos = useMemo(
    () => huecosDeLaBarra(piezas.length, forma.campo, forma.proporcion),
    [piezas.length, forma],
  );

  return (
    <group ref={grupo} renderOrder={1000}>
      {/*
       * El testigo que borra la profundidad. No escribe color y no recibe rayos: sólo
       * está para que el pintor pase por él justo antes de la barra.
       */}
      <mesh renderOrder={999} onBeforeRender={(gl) => gl.clearDepth()} raycast={() => null}>
        <planeGeometry args={[0.001, 0.001]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>
      {/*
       * Su propia luz, y con alcance corto. La barra gira con la cámara, así que con la
       * luz del mundo se le apagarían las piezas cada vez que el jugador diera media
       * vuelta al tablero. Con `distance` a tres unidades no llega al mundo y no lo
       * altera.
       */}
      <pointLight position={[0.4, 0.6, -1.2]} intensity={3.5} distance={3} decay={1.4} />
      {/*
       * EL FONDO DE LA BARRA, y por qué hace falta aunque no se «vea» nada en él.
       *
       * Sin él, cuatro modelos flotando en la parte de abajo se leen como cuatro
       * edificios más del tablero, sólo que muy grandes y en primer plano. El fondo los
       * separa del mundo: dice «esto es tuyo, no es paisaje». Es el mismo trabajo que
       * hace el marco de un cuadro y por eso es tan tenue — se nota si falta, no si está.
       */}
      {huecos.length > 0 && (
        <mesh position={[0, (huecos[0] as HuecoDeLaBarra).y, -DISTANCIA_DE_LA_BARRA - 0.02]} raycast={() => null}>
          <planeGeometry
            args={[
              (huecos[huecos.length - 1] as HuecoDeLaBarra).x -
                (huecos[0] as HuecoDeLaBarra).x +
                (huecos[0] as HuecoDeLaBarra).lado * 1.7,
              (huecos[0] as HuecoDeLaBarra).lado * 1.5,
            ]}
          />
          <meshBasicMaterial color="#0d1f1a" transparent opacity={0.42} depthWrite={false} />
        </mesh>
      )}
      {piezas.map((pieza, i) => {
        const hueco = huecos[i];
        const mallas = aplanados.get(pieza.modelo);
        if (hueco === undefined || mallas === undefined) return null;
        return (
          <PiezaEnLaBarra
            key={`barra:${pieza.id}`}
            pieza={pieza}
            hueco={hueco}
            mallas={mallas}
            tomada={tomada === pieza.id}
            onTomar={onTomar}
          />
        );
      })}
    </group>
  );
}

export function Delta({
  datos,
  modelos,
  semilla = 0,
  colocando = null,
  onElegirSitio,
  barra = [],
  tomada = null,
  onTomarDeLaBarra,
}: {
  datos: DeltaEn3D;
  modelos: CatalogoDeModelos;
  semilla?: number;
  /**
   * Lo que se está colocando ahora mismo, o `null` si no se está colocando nada.
   *
   * Los sitios legales llegan DE FUERA: la escena no los calcula. Ver `sitios.ts`.
   */
  colocando?: Colocando | null;
  /** Aviso de que alguien ha pulsado un anillo. La escena no decide qué pasa después. */
  onElegirSitio?: (sitio: Sitio) => void;
  /**
   * Lo que se puede coger de la barra de abajo. Vacío o sin poner, no hay barra.
   *
   * Qué está disponible lo decide el juego: la escena las enseña apagadas y no deja
   * cogerlas, igual que el anillo no sabe por qué un vértice vale.
   */
  barra?: readonly PiezaDeBarra[];
  /** Cuál está cogida ahora mismo, para dibujarla levantada. */
  tomada?: string | null;
  /** Aviso de que alguien ha cogido una pieza de la barra. */
  onTomarDeLaBarra?: (id: string) => void;
}): JSX.Element {
  /**
   * Cada modelo, aplanado una vez a geometría + material para poder instanciarlo.
   *
   * ═══ Y LAS PIEZAS DE JUGADOR, QUE SE FABRICAN AQUÍ ═══
   *
   * El `.glb` trae UNA de cada pieza de jugador —la azul— y las otras tres salen de
   * mover las UV de la celda del color. Está medido: las cuatro variantes que el pack
   * distribuye tienen la misma geometría byte a byte, y sólo cambian las UV de los
   * vértices que caen en la celda (0,3), una columna por color. Ver `paleta.ts`.
   *
   * Se hace al cargar y no al compilar por lo mismo que los biomas: si se hiciera al
   * compilar habría que meter las cuatro copias en el fichero, que es justo lo que se
   * está evitando. El coste en memoria es el mismo que antes —cuatro geometrías vivas—
   * pero el fichero que se descarga y que entra en la historia de git lleva una.
   *
   * Sólo se mueve lo que ES del color. Un castillo tiene piedra, madera y tejado, y
   * mover la lámina entera lo dejaría de un color plano — la misma corrección que hubo
   * que hacer en los biomas con `esDeLaHierba`, aquí desde el principio.
   */
  const aplanados = useMemo(() => {
    const tabla = new Map<string, Instanciable[]>();
    for (const [nombre, modelo] of modelos) {
      const mallas = aplana(modelo);
      if (mallas.length > 0) tabla.set(nombre, mallas);
    }

    for (const pieza of PIEZAS_DE_COLOR) {
      const base = tabla.get(pieza);
      if (base === undefined) continue;
      for (const color of COLORES_DE_JUGADOR) {
        const salto = desplazamientoDeColor(color);
        tabla.set(
          `${pieza}-${color}`,
          base.map(({ geometria, material }) => {
            if (salto.u === 0 && salto.v === 0) return { geometria, material };
            const suya = geometria.clone();
            const uv = suya.getAttribute('uv') as THREE.BufferAttribute | undefined;
            if (uv === undefined) return { geometria: suya, material };
            for (let i = 0; i < uv.count; i++) {
              if (!esDelColorDelJugador(uv.getX(i), uv.getY(i))) continue;
              uv.setXY(i, uv.getX(i) + salto.u, uv.getY(i) + salto.v);
            }
            uv.needsUpdate = true;
            return { geometria: suya, material };
          }),
        );
      }
    }
    return tabla;
  }, [modelos]);

  const relieve = useMemo(
    () => crearRelieve(datos.islas.map((i) => ({ hex: i.hex, terreno: i.terreno })), semilla),
    [datos.islas, semilla],
  );

  /**
   * LA RED DE CAMINOS DEL MUNDO.
   *
   * Un camino por cada ARISTA de comarca, que es donde el juego deja tender los
   * caminos de los jugadores. No van rectos: serpentean con un ruido continuo que se
   * anula en las puntas, así que llegan exactamente al vértice —donde se juntan con
   * los otros dos que salen de él— y por el medio se apartan del borde y vuelven.
   *
   * Lo que se guarda por tesela es el CONJUNTO DE LADOS por los que sale el camino,
   * no una pieza: los cruces salen solos, porque tres aristas que llegan a la misma
   * tesela acumulan sus lados en el mismo conjunto y la tabla devuelve la pieza de
   * tres bocas. Ver `sendas.ts`.
   */
  const red = useMemo(() => {
    const lados = new Map<string, Set<number>>();
    const paso = Math.sqrt(3) * RADIO_DE_TESELA;
    for (const arista of aristasDe(datos.islas.map((i) => i.hex))) {
      const [a, b] = verticesDeArista(arista);
      if (a === undefined || b === undefined) continue;
      const cadena = teselasDeUnCamino(
        puntoDeVertice(a, RADIO_DE_COMARCA),
        puntoDeVertice(b, RADIO_DE_COMARCA),
        RADIO_DE_TESELA,
        paso,
        4_099 + semilla * 7_919,
        hexDePunto,
      );
      apuntaLosLados(cadena, lados);
    }

    const piezas = new Map<string, { modelo: string; giro: number }>();
    for (const [llave, cuales] of lados) {
      const pieza = piezaDeSenda(cuales);
      if (pieza !== null) piezas.set(llave, pieza);
    }
    /*
     * Se devuelven también los LADOS en crudo, y no sólo la pieza resuelta, porque
     * quien pone el puente necesita saber por qué eje cruza el camino — y eso ya no
     * se puede leer de la pieza una vez elegida.
     */
    return { piezas, lados };
  }, [datos.islas, semilla]);

  /*
   * EL PLAN DEL MUNDO: dónde va cada copia de cada cosa.
   *
   * Se calcula UNA vez —dos mil setecientas teselas y varios miles de cosas encima—
   * y no por fotograma. Las claves llevan la comarca además del modelo para que cada
   * grupo se pueda descartar por separado; ver la cabecera.
   */
  const plan = useMemo(() => {
    const suelo = new Map<string, Puesta[]>();
    const cosas = new Map<string, Puesta[]>();
    const plazas: Array<{ isla: IslaEn3D; centro: Punto; altura: number }> = [];

    for (const isla of datos.islas) {
      const llave = llaveDe(isla.hex);
      const teselas: Subtesela[] = relieve.subteselasDe(isla.hex);

      for (const t of teselas) {
        /*
         * EL ORDEN DE MANDO: agua > orilla > senda > rampa > tesela.
         *
         * El agua manda sobre todo porque su celda no es suelo. Luego la ORILLA, y
         * ésta es la parte que costó una tarde: la orilla no es adorno, es la forma
         * del terreno. Una tesela de costa dice «por estos lados de aquí hay agua», y
         * la tesela de camino no tiene agua por ninguno. Poner el camino encima de
         * una costa no tapa un dibujo: abre un BOQUETE en la línea de agua, tierra
         * seca pegada al mar.
         *
         * Y el boquete no era pequeño. El contorno exterior del mundo también es
         * arista de comarca, así que la red de caminos traza el perímetro entero — y
         * se comía las doscientas y pico teselas de costa del borde, o sea la playa
         * completa del tablero. Medido: 227 celdas de borde con orilla, y sólo 140
         * piezas de orilla dibujadas en todo el mundo.
         *
         * Es el mismo fallo que el del río pintado «con orilla a ratos», visto por el
         * otro lado: allí la costa no se dibujaba porque el patrón de lados no era
         * dibujable, aquí porque otra pieza le ganaba el sitio. La regla que sale de
         * las dos: lo que describe DÓNDE ESTÁ EL AGUA manda sobre lo que describe por
         * dónde se pasa.
         *
         * Un camino cortado por una costa no queda mal, queda bien: llega a la playa
         * y se para, que es lo que hace un camino cuando se acaba la tierra. Y donde
         * de verdad cruza, ya hay un puente puesto sobre la celda de agua.
         *
         * Debajo de la orilla, la SENDA manda sobre la rampa, y no al revés: una
         * tesela de camino que cambia de nivel ya tiene su propia variante en cuesta,
         * mientras que poner la rampa encima BORRA el camino. Con el orden contrario,
         * cada rampa que cayera sobre el trazado se lo comía — y como el río fabrica
         * bancos a nivel del agua, fabricaba rampas nuevas a lo largo de las dos
         * orillas justo donde más se mira.
         */
        const enAgua = t.agua === CAUCE || t.agua === CUERPO;
        const cauce = t.agua === CAUCE ? piezaDeCauce(ladosDe(t.cauce)) : null;
        const orilla = !enAgua ? piezaDeOrilla(t.orilla) : null;
        const senda =
          !enAgua && orilla === null && t.rampa === null
            ? red.piezas.get(llaveDe(t.sub))
            : undefined;
        const cual = enAgua
          ? t.agua === CUERPO
            ? MODELO.agua
            : (cauce?.modelo ?? MODELO.agua)
          : orilla !== null
            ? orilla.modelo
            : senda !== undefined
              ? senda.modelo
              : t.rampa !== null
                ? MODELO.rampaAlta
                : MODELO.tesela;
        /*
         * LA NIEVE ES UNA CAPA, NO UN BIOMA.
         *
         * Se pone encima de lo que haya cuando la tesela pasa de la cota, así que
         * entra en la llave del grupo como si fuera un terreno más. Una montaña
         * nevada sigue siendo montaña para el juego —sigue produciendo piedra— y sólo
         * cambia a qué celda del atlas apuntan las UV de su suelo.
         */
        /*
         * Las teselas de agua y de cauce NO se clonan por bioma: ya reparten sus UV
         * entre hierba, agua y arena, y desplazarlas movería también el agua.
         */
        /*
         * LAS TESELAS QUE YA TRAEN AGUA O ARENA NO SE TIÑEN DE BIOMA.
         *
         * El desplazamiento de UV lleva la mancha de hierba a la celda del bioma; una
         * tesela de costa reparte sus vértices entre hierba, arena y agua, así que
         * moverla entera llevaría también el mar y la playa a otra celda del atlas.
         * Se quedan con su aspecto de fábrica, que es el correcto.
         */
        const capa =
          enAgua || orilla !== null
            ? 'agua'
            : t.margen
              ? 'ribera'
              : t.nieve
                ? 'nieve'
                : isla.terreno;
        /* La lámina va a su propio nivel, que no tiene por qué ser el del terreno. */
        const cota = enAgua ? t.nivelDelAgua * ESCALON : t.altura;
        empuja(
          suelo,
          `${llave}|${cual}|${capa}`,
          comoElPack(
            t.centro.x,
            cota,
            t.centro.y,
            cauce?.giro ?? orilla?.giro ?? senda?.giro ?? t.rampa ?? 0,
          ),
        );

        /*
         * EL ZÓCALO. Sólo hace falta bajo lo que está elevado: la propia tesela ya
         * ocupa un escalón de cuerpo, así que a nivel cero no hay nada que rellenar.
         */
        const tapa = cota - ESCALON;
        if (tapa > relieve.base + 1e-6) {
          empuja(suelo, `${llave}|${MODELO.fondo}|${isla.terreno}`, {
            posicion: new THREE.Vector3(t.centro.x, tapa, t.centro.y),
            giro: 0,
            escala: new THREE.Vector3(ESCALA_DEL_PACK, tapa - relieve.base, ESCALA_DEL_PACK),
          });
        }

        /*
         * LO QUE FLOTA O ASOMA EN EL AGUA.
         *
         * Sólo en el AGUA ANCHA, y no es un capricho: la tesela de río del pack tiene
         * un cauce de 0,92 sobre 2,0, o sea cinco unidades de mundo — dos personas de
         * ancho. Un bote de doce unidades de eslora ahí encima es una mentira que se ve
         * a la primera. Donde el río se hace cuerpo de agua, con sus tres celdas de
         * través y sus orillas de costa, sí cabe y además tiene sentido: eso es un río
         * navegable.
         *
         * Y VAN A LA LÁMINA, no a la cara de la tesela. `cota` es la cara de arriba de
         * la tesela de agua; el agua que se ve está `LAMINA` por debajo, que son 1,09.
         * Poniéndolas en `cota - 0,38` —«un poco hundidas», decía este comentario—
         * quedaban 0,71 FLOTANDO sobre el agua: una piedra suspendida en el aire y un
         * bote navegando por encima de su propio reflejo. La resta pequeña va después
         * de la lámina, no en vez de ella.
         */
        /*
         * EL PUENTE, donde un camino se mete en el agua.
         *
         * ═══ LAS TESELAS «CROSSING» DEL PACK NO SON PUENTES: SON VADOS ═══
         *
         * Está medido recorriendo la línea central de la calzada: existe camino hasta
         * el borde del cauce y en todo el tramo central la única superficie que hay es
         * agua. No hay tablero, ni pilas, ni barandilla. Un generador que dé por hecho
         * que la crossing lleva puente saca caminos que se meten en el río por todo el
         * tablero.
         *
         * El puente de verdad es un PROP aparte, con la calzada a +0,20 del pack y las
         * rampas aterrizando a -0,047 en los puntos medios de los lados — o sea
         * exactamente sobre la calzada del vado. Está hecho para posarse encima.
         *
         * Su eje nativo es el de los lados {2,5}, así que para cruzar por el eje `r` se
         * gira `60·(r-2)`. Sin puente, las tres a siete aristas más miradas del tablero
         * enseñan el camino cortado en seco a la orilla.
         */
        if (enAgua) {
          const cruzan = red.lados.get(llaveDe(t.sub));
          if (cruzan !== undefined && cruzan.size >= 2) {
            const eje = [...cruzan].find((k) => cruzan.has((k + 3) % 6));
            if (eje !== undefined) {
              empuja(
                cosas,
                `${llave}|${MODELO.puente}`,
                comoElPack(t.centro.x, cota, t.centro.y, ((eje - 2 + 6) % 6) * (Math.PI / 3)),
              );
            }
          }
        }

        if (t.agua === CUERPO && t.porte === HONDO) {
          const enElAgua = cota + LAMINA - ESCALON * 0.04;
          if (fraccionDeCelda(t.sub.q, t.sub.r, CANAL_DE_LA_PIEDRA) < 0.22) {
            empuja(
              cosas,
              `${llave}|${MODELO.rocaB}`,
              comoElPack(
                t.centro.x,
                enElAgua,
                t.centro.y,
                fraccionDeCelda(t.sub.q, t.sub.r, CANAL_DEL_GIRO) * Math.PI * 2,
                0.7 + fraccionDeCelda(t.sub.q, t.sub.r, CANAL_DE_LA_TALLA) * 0.5,
              ),
            );
          } else if (fraccionDeCelda(t.sub.q, t.sub.r, CANAL_DEL_BOTE) < 0.06) {
            empuja(
              cosas,
              `${llave}|${MODELO.bote}`,
              comoElPack(
                t.centro.x,
                enElAgua,
                t.centro.y,
                fraccionDeCelda(t.sub.q, t.sub.r, CANAL_DEL_GIRO) * Math.PI * 2,
                1.6,
              ),
            );
          }
        }

        /* Encima del agua, de un camino y de una playa no crece nada. */
        if (senda !== undefined || enAgua || orilla !== null) continue;

        for (const puesto of queVaEn(t, isla.terreno)) {
          empuja(
            cosas,
            `${llave}|${puesto.modelo}`,
            comoElPack(
              t.centro.x + puesto.donde.x,
              t.altura,
              t.centro.y + puesto.donde.y,
              puesto.giro,
              puesto.talla,
            ),
          );
        }
      }

      const centro = centroDeHex(isla.hex, RADIO_DE_COMARCA);
      plazas.push({ isla, centro, altura: relieve.alturaEn(centro) });
    }

    /*
     * LO QUE HAY EN EL AGUA DE FUERA: MUELLES Y BARCOS.
     *
     * Va al final y no dentro del bucle de comarcas porque no es de ninguna: un muelle
     * se apoya en la celda FANTASMA de más allá del último hexágono del mundo, que no
     * pertenece a ninguna comarca. Por eso todos van al mismo grupo `mar`, y por eso da
     * igual para el descarte por tronco de cámara — son cuatro piezas, no dos mil.
     *
     * Las reglas de dónde y cuántos están en `marina.ts`, que no importa `three` y se
     * puede medir desde Node. Aquí sólo se pasa de la aritmética a la escena.
     */
    const marina = laMarinaDelMundo(relieve.todas(), semilla);
    for (const m of marina.muelles) {
      /*
       * EL MUELLE VA A LA COTA DE SU TESELA, o sea a cero: es una pieza de tesela como
       * las demás, con su geometría bajando hasta el zócalo —esos son los pilotes— y su
       * plataforma asomando por encima del agua. Puesto a la cota de la LÁMINA se
       * hundiría un escalón entero y sólo se le verían los postes.
       */
      empuja(
        cosas,
        `mar|${modeloDeMuelle(
          COLORES_DE_JUGADOR[m.color % COLORES_DE_JUGADOR.length] ?? 'blue',
        )}`,
        comoElPack(m.punto.x, 0, m.punto.y, m.giro, m.talla),
      );
    }
    for (const b of marina.barcos) {
      /*
       * EL BARCO VA A LA LÁMINA, y no a cero: el casco del pack empieza en `y = 0` y no
       * tiene obra viva —medido: el modelo va de 0 a 2,237—, así que su cero ES su línea
       * de flotación. Puesto a la cota del suelo navegaría un escalón por encima del
       * mar, que es la clase de error que sólo se ve cuando ya está en una captura.
       *
       * Y el giro lleva el cuarto de vuelta del modelo: su proa mira a `+z`, o sea a
       * `-90°` en el ángulo del pack, así que para poner rumbo a `θ` hay que girarlo
       * `θ + 90°`.
       */
      empuja(
        cosas,
        `mar|${MODELO.barco}`,
        comoElPack(b.punto.x, LAMINA, b.punto.y, b.giro + Math.PI / 2, b.talla),
      );
    }
    /*
     * Y LAS MATAS DE LAS ORILLAS DE DENTRO.
     *
     * Van a la cota de SU lámina y no a la del mar: un lago a dos escalones tiene sus
     * juncos dos escalones más arriba. Por eso la mata trae su nivel y no su altura —el
     * escalón se sabe aquí, no en `marina.ts`.
     */
    const JUNCOS = [MODELO.juncoA, MODELO.juncoB, MODELO.juncoC];
    const NENUFARES = [MODELO.nenufarA, MODELO.nenufarB];
    for (const m of marina.matas) {
      const cual = m.nenufar
        ? (NENUFARES[m.variante % NENUFARES.length] ?? MODELO.nenufarA)
        : (JUNCOS[m.variante % JUNCOS.length] ?? MODELO.juncoA);
      empuja(
        cosas,
        `mar|${cual}`,
        comoElPack(
          m.punto.x,
          m.nivelDelAgua * ESCALON + LAMINA,
          m.punto.y,
          m.giro,
          m.talla,
        ),
      );
    }

    return { suelo, cosas, plazas };
  }, [datos.islas, relieve, red]);

  /**
   * LAS GEOMETRÍAS DE SUELO, una por pieza y bioma, y sólo las que se usan.
   *
   * Las teselas del pack son siempre de hierba; lo que cambia entre biomas es a qué
   * celda del atlas apuntan sus UV. Así que se clona cada geometría y se le suma el
   * desplazamiento. Se derivan del plan YA HECHO —no de una lista escrita a mano— así
   * que si mañana el generador saca una pieza nueva, su geometría aparece sola; y no
   * se clonan las trece teselas de camino en los seis biomas cuando el mapa sólo usa
   * cuatro de ellas.
   */
  const suelos = useMemo(() => {
    const tabla = new Map<string, Instanciable>();
    for (const llave of plan.suelo.keys()) {
      const partes = llave.split('|');
      const pieza = String(partes[1]);
      const terreno = String(partes[2]);
      const propio = `${pieza}|${terreno}`;
      if (tabla.has(propio)) continue;
      const base = aplanados.get(pieza)?.[0];
      if (base === undefined) continue;
      const geometria = base.geometria.clone();
      const uv = geometria.getAttribute('uv') as THREE.BufferAttribute | undefined;
      const salto =
        terreno === 'agua'
          ? { u: 0, v: 0 }
          : desplazamientoDeCelda(
              terreno === 'nieve'
                ? CELDA_DE_LA_NIEVE
                : terreno === 'ribera'
                  ? CELDA_DE_LA_ARENA
                  : terrenoDe(terreno).celda,
            );
      if (uv !== undefined && (salto.u !== 0 || salto.v !== 0)) {
        for (let i = 0; i < uv.count; i++) {
          /*
           * SÓLO SE MUEVE LO QUE ES HIERBA, y esto es una corrección.
           *
           * Antes se desplazaba la lámina de UV entera, y en una tesela lisa daba
           * igual porque toda ella apunta a la celda de la hierba. Pero una tesela de
           * CAMINO tiene dos zonas: la hierba y la franja de tierra pisada, en otra
           * celda del atlas. Al mover las dos, el camino salía del color de un bioma
           * cualquiera —arena sobre la arcilla, arcilla sobre la piedra— en vez del
           * suyo. Se veía y se leía como «los caminos son de tierra clara», que era
           * mentira: era el desplazamiento arrastrando lo que no le tocaba.
           *
           * Lo mismo va a valer para las teselas de río y de costa, que reparten sus
           * vértices entre tres celdas: hierba, agua y arena.
           */
          if (!esDeLaHierba(uv.getX(i), uv.getY(i))) continue;
          uv.setXY(i, uv.getX(i) + salto.u, uv.getY(i) + salto.v);
        }
        uv.needsUpdate = true;
      }
      tabla.set(propio, { geometria, material: base.material });
    }
    return tabla;
  }, [aplanados, plan]);

  /** El ladrón: una tienda plantada en la plaza de la comarca que ocupa. */
  const ladron = useMemo(() => {
    if (datos.ladron === null) return null;
    const centro = centroDeHex(datos.ladron, RADIO_DE_COMARCA);
    return comoElPack(centro.x, relieve.alturaEn(centro), centro.y, 0, 3);
  }, [datos.ladron, relieve]);

  const caminos = useMemo(() => {
    const tabla = new Map<string, Puesta[]>();
    for (const c of datos.caminos) {
      const [a, b] = verticesDeArista(c.arista);
      if (a === undefined || b === undefined) continue;
      const lista = tabla.get(c.color) ?? [];
      lista.push(
        ...tramosEntre(
          puntoDeVertice(a, RADIO_DE_COMARCA),
          puntoDeVertice(b, RADIO_DE_COMARCA),
          relieve,
          0.3,
        ),
      );
      tabla.set(c.color, lista);
    }
    return tabla;
  }, [datos.caminos, relieve]);

  const largoDelTramo = RADIO_DE_COMARCA / TRAMOS_DE_SENDA;
  const geometriaDelCamino = useMemo(
    () => new THREE.BoxGeometry(largoDelTramo * 0.9, ESCALON * 0.09, RADIO_DE_TESELA * 0.34),
    [largoDelTramo],
  );

  /**
   * LOS SITIOS DEL TABLERO, con su altura ya resuelta.
   *
   * Se calculan una vez por tablero y no cada vez que se empieza a colocar: son ciento
   * cuarenta y cinco consultas de altura y no cambian mientras el relieve sea el mismo.
   */
  const sitios = useMemo(
    () => sitiosDelTablero(datos.islas.map((i) => i.hex), (p) => relieve.alturaEn(p)),
    [datos.islas, relieve],
  );

  const alcance = useMemo(() => {
    let mayor = RADIO_DE_COMARCA;
    for (const isla of datos.islas) {
      const c = centroDeHex(isla.hex, RADIO_DE_COMARCA);
      mayor = Math.max(mayor, Math.hypot(c.x, c.y) + RADIO_DE_COMARCA);
    }
    return mayor;
  }, [datos.islas]);

  return (
    <group>
      <Luces alcance={alcance} />
      <Mar alcance={alcance} agua={aplanados.get(MODELO.agua)} />

      {/*
       * LAS SEÑALES DE COLOCAR, que sólo existen mientras se coloca.
       *
       * No hay cincuenta y cuatro objetos invisibles esperando por si acaso: se montan
       * al empezar a colocar y se desmontan al terminar. Con la lista vacía no se monta
       * ninguna, que es lo que tiene que pasar cuando el juego dice que no se puede
       * poner nada en ningún sitio — y se ve, en vez de dejar al jugador probando.
       */}
      {barra.length > 0 && (
        <Barra
          piezas={barra}
          aplanados={aplanados}
          tomada={tomada}
          onTomar={(id) => onTomarDeLaBarra?.(id)}
        />
      )}

      {colocando !== null &&
        sitiosPermitidos(sitios, colocando).map((sitio) => (
          <Senal
            key={`senal:${sitio.clase}:${sitio.llave}`}
            sitio={sitio}
            color={COLOR_DE_LA_SENAL}
            elegida={false}
            onElegir={(s) => onElegirSitio?.(s)}
          />
        ))}

      {[...plan.suelo].map(([llave, puestas]) => {
        const partes = llave.split('|');
        const malla = suelos.get(`${String(partes[1])}|${String(partes[2])}`);
        return malla === undefined ? null : (
          <Copias key={`suelo:${llave}`} malla={malla} puestas={puestas} />
        );
      })}

      {[...plan.cosas].map(([llave, puestas]) => {
        const nombre = llave.slice(llave.indexOf('|') + 1);
        const mallas = aplanados.get(nombre);
        return mallas === undefined ? null : (
          <Modelo key={`cosa:${llave}`} mallas={mallas} puestas={puestas} />
        );
      })}

      {plan.plazas.map(({ isla, centro, altura }) =>
        isla.cifra === null ? null : (
          <Numero
            key={`num:${llaveDe(isla.hex)}`}
            centro={centro}
            altura={altura}
            cifra={isla.cifra}
          />
        ),
      )}

      {datos.piezas.map((pieza) => (
        <Asentamiento
          key={`obra:${pieza.vertice}:${pieza.clase}:${pieza.color}`}
          pieza={pieza}
          aplanados={aplanados}
          relieve={relieve}
        />
      ))}

      {ladron === null ? null : <Ladron mallas={aplanados.get(MODELO.tienda)} puesta={ladron} />}

      {[...caminos].map(([color, puestas]) => (
        <Copias
          key={`camino:${color}`}
          malla={{
            geometria: geometriaDelCamino,
            material: new THREE.MeshStandardMaterial({ color, roughness: 0.9 }),
          }}
          puestas={puestas}
        />
      ))}
    </group>
  );
}

/**
 * UN ASENTAMIENTO, LEVANTÁNDOSE.
 *
 * ═══ POR QUÉ ESTO NO VA INSTANCIADO COMO TODO LO DEMÁS ═══
 *
 * Porque cada pieza tiene que MOVERSE por separado mientras se construye, y cada
 * asentamiento va por su cuenta: uno acaba de fundarse y el de al lado lleva veinte
 * turnos. Con una malla instanciada habría que reescribir la tabla de matrices
 * entera en cada fotograma para animar tres piezas, que es tirar por la ventana justo
 * lo que el instanciado compra. Son pocas —trece piezas por poblado, veinte por
 * ciudad, y en una partida entera no pasan de cuarenta asentamientos— así que salen
 * más baratas como mallas sueltas.
 *
 * ═══ CÓMO SABE CUÁNDO EMPEZÓ ═══
 *
 * No hace falta que nadie se lo diga. La `key` de este componente lleva el vértice,
 * la clase y el color, así que React lo MONTA cuando aparece la pieza en los datos y
 * lo vuelve a montar cuando un poblado se convierte en ciudad. El reloj se pone a
 * cero al montar, y ya está: no hay que mandar por la red un instante de
 * construcción, ni guardarlo en la partida, ni sincronizar nada.
 *
 * ═══ CÓMO CRECE ═══
 *
 * En vertical desde el suelo, no desde un punto. Los modelos del pack tienen la base
 * en `y = 0`, así que escalar la altura de cero a uno hace que la pieza salga de la
 * tierra. El ancho arranca en tres cuartos y llega a uno, y un pequeño rebote al
 * final —el seno— hace que ASIENTE en vez de deslizarse hasta su sitio.
 */
function Asentamiento({
  pieza,
  aplanados,
  relieve,
}: {
  pieza: PiezaEn3D;
  aplanados: ReadonlyMap<string, Instanciable[]>;
  relieve: Relieve;
}): JSX.Element {
  const punto = puntoDeVertice(pieza.vertice, RADIO_DE_COMARCA);
  const suelo = relieve.alturaEn(punto);
  const partes = useMemo(
    () => piezasDeAsentamiento(pieza.clase, pieza.color, pieza.vertice),
    [pieza.clase, pieza.color, pieza.vertice],
  );

  const grupos = useRef<Array<THREE.Group | null>>([]);
  const nacido = useRef(-1);

  useFrame((estado) => {
    if (nacido.current < 0) nacido.current = estado.clock.elapsedTime;
    const transcurrido = estado.clock.elapsedTime - nacido.current;
    for (let i = 0; i < partes.length; i++) {
      const g = grupos.current[i];
      const parte = partes[i];
      if (g === null || g === undefined || parte === undefined) continue;
      const salido = cuantoHaSalido(parte, transcurrido);
      g.visible = salido > 0.001;
      if (!g.visible) continue;
      const base = ESCALA_DEL_PACK * parte.talla;
      const rebote = 1 + Math.sin(Math.PI * salido) * 0.12;
      g.scale.set(base * (0.75 + salido * 0.25), base * salido * rebote, base * (0.75 + salido * 0.25));
    }
  });

  return (
    <group position={alMundo(punto, suelo)}>
      {partes.map((parte, i) => {
        const mallas = aplanados.get(parte.modelo);
        if (mallas === undefined) return null;
        return (
          <group
            key={`${parte.modelo}:${String(i)}`}
            ref={(g) => {
              grupos.current[i] = g;
            }}
            position={[parte.donde.x, parte.sobre, parte.donde.y]}
            rotation={[0, parte.giro, 0]}
            scale={0}
          >
            {mallas.map((m, j) => (
              <mesh key={j} geometry={m.geometria} material={m.material} castShadow receiveShadow />
            ))}
          </group>
        );
      })}
    </group>
  );
}

/** El ladrón, aparte para no meter una función anónima dentro del JSX. */
function Ladron({
  mallas,
  puesta,
}: {
  mallas: readonly Instanciable[] | undefined;
  puesta: Puesta;
}): JSX.Element | null {
  const puestas = useMemo(() => [puesta], [puesta]);
  if (mallas === undefined) return null;
  return <Modelo mallas={mallas} puestas={puestas} />;
}

/** Mete una copia en el grupo que le toca, creándolo si hace falta. */
function empuja(tabla: Map<string, Puesta[]>, llave: string, puesta: Puesta): void {
  const lista = tabla.get(llave);
  if (lista === undefined) tabla.set(llave, [puesta]);
  else lista.push(puesta);
}

/** Dónde poner la cámara para que quepa el mundo entero, mirado desde arriba. */
export function encuadreDelDelta(hexes: readonly Hex[]): {
  posicion: [number, number, number];
  alcance: number;
} {
  let mayor = RADIO_DE_COMARCA;
  for (const h of hexes) {
    const c = centroDeHex(h, RADIO_DE_COMARCA);
    mayor = Math.max(mayor, Math.hypot(c.x, c.y) + RADIO_DE_COMARCA);
  }
  return { posicion: [0, mayor * 1.25, mayor * 1.15], alcance: mayor };
}
