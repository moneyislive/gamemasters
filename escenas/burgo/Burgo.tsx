/**
 * EL BURGO EN TRES DIMENSIONES: el tablero que se ve, contra el contrato de `tipos.ts`.
 *
 * ═══ QUÉ MONTA ═══
 *
 * DOS COSAS QUE SE INSTANCIAN DE MANERAS DISTINTAS, y conviene no confundirlas:
 *
 *  · EL TABLERO. El anillo de cuarenta casillas con sus cuatro bandas de suelo propio y la
 *    línea que separa una de otra (`anillo-en-3d.ts` da los sitios; aquí sólo se instancia),
 *    el frente de manzana de cada solar, las cuatro esquinas —que son manzanas urbanas de
 *    9 × 9 celdas: un cruce, una comisaría, una plaza y una avenida—, el precio y el emblema
 *    de cada casilla fundidos en una sola geometría de tinta, el campo de
 *    teselas sembrado con el código de la mesa, cinco nubes derivando, la cúpula de mediodía
 *    y la niebla. Nada de esto cambia durante la partida.
 *  · LA CIUDAD de dentro del recinto de 648 (`ciudad.ts`): 2.916 celdas, 691 edificios,
 *    1.577 losas de calzada, catorce distritos, 18 coches circulando y los interiores de los
 *    edificios que se abren. Esto NO cabe entero —la ciudad en su nivel más alto pesa un
 *    millón y medio de triángulos— y por eso se monta por GRUPOS y por CERCANÍA (ver más
 *    abajo). El presupuesto es 900.000 en un PC y 230.000 en un móvil, para las dos cosas.
 *
 * Y encima lo que cambia con la partida: casas y posadas, banderas de dueño, seis peones,
 * UN aventurero (el que mueve), la caja del Burgo pegada a la pantalla —los dados, el dinero, el
 * reloj de arena, los mazos y las casas del Concejo—, las monedas
 * que vuelan, el naipe de la carta,
 * la marca de la casilla que se puede tocar y la reja de la Comisaría.
 *
 * ═══ LA CIUDAD SE REPARTE POR CERCANÍA, Y ES LO ÚNICO QUE HACE QUE EXISTA ═══
 *
 * `montarLaCiudad` dice, grupo a grupo, cuál de sus tres montajes toca: L1 (las piezas del
 * pack enteras), L2 (un prisma con banda de ventanas por edificio, y las calles del pack) y
 * L3 (un prisma pelado y una manta de asfalto). Se llama cuando la cámara CAMBIA DE CELDA de
 * 12, no por fotograma, y con el reparto anterior, que es lo que aplica la histéresis de 40
 * unidades y evita que una cámara parada en un umbral parpadee. Después se reescriben todas
 * las matrices de una pasada: son unos miles, no el millón y medio de triángulos que la
 * ciudad tiene descritos.
 *
 * Los INTERIORES son otro asunto: se abren los TRES edificios más cercanos al punto que la
 * cámara mira, y sólo cuando el ojo tiene ese punto a menos de 420. Al abrirlos, la cáscara
 * del pack se DESMONTA (no `visible={false}`: la regla de la casa) y en su sitio se montan
 * las salas con sus tabiques y sus muebles.
 *
 * ═══ CÓMO SE CUENTAN LAS LLAMADAS, QUE ES LO QUE MANDA (§5.2) ═══
 *
 * Todo lo ESTÁTICO del TABLERO —solares, esquinas, campo— se aplana y se FUNDE
 * en UNA geometría (`fundir` de `embarcadero/cargar.ts`; el `.glb` trae un solo material)
 * y el suelo del anillo es otra geometría propia con `vertexColors`: dos llamadas. Lo que
 * cambia va instanciado: las casas (y las casas de posada) en UNA `InstancedMesh` con
 * `instanceColor` sobre la geometría a gris de `tinte-del-burgo.ts`; los peones, igual;
 * las banderas en una `InstancedMesh` POR COLOR (la bandera tiene mástil: no se puede
 * pintar con `instanceColor`); discos de contacto, monedas, marcas de casilla, discos del
 * trato y asas, una cada uno; el aventurero fundido, uno; los dados, dos; las aspas del
 * molino, una; la reja que sube, una (la fija va en el fundido); el naipe, el cielo y las
 * nubes, cuatro.
 *
 * Y LA CIUDAD SUMA LAS SUYAS, que son las que de verdad podían dispararse: una
 * `InstancedMesh` POR PIEZA DEL PACK (unas cincuenta distintas), una por cuenta de
 * triángulos de bulto (poco más de una docena), una por pieza de coche que circula y una
 * malla por cinta (nueve). Parece mucho y no lo es: una malla instanciada con `count = 0`
 * NO cuesta una llamada —three sale antes de `renderInstances` con `primcount === 0`— así
 * que sólo pagan las piezas que ese reparto ha puesto de verdad. Medido en el banco con
 * seis sentados, tablero lleno y la semilla BANCO: 74 llamadas desde la pose de salida, 61
 * a media altura, 96 a pie de calle con tres interiores abiertos (el máximo que se ha
 * visto), y 60 en sobria; el tope es 150 y 90. Los triángulos los suma `verify:burgo-escena`
 * con el `.glb` real; las llamadas se miran en `banco-burgo.html` con `gl.info.render`.
 *
 * ═══ EL `.glb` VA HORNEADO Y A ESCALA DEL MUNDO ═══
 *
 * `burgo.glb` trae el color por vértice (nada de texturas: Hermes no las decodifica) y
 * la escala de los siete packs ya aplicada (`burgo/piezas.ts`). Por eso aquí NO se usa
 * `matrizDePuesta` de `cargar.ts`, que multiplica por `ESCALA_DEL_PACK`: el DECORADO se
 * instancia a talla 1 con `matrizDelBurgo`. Una pieza multiplicada por 5,47 sería una
 * silla del tamaño de una iglesia, sin error.
 *
 * Las tres piezas que son de un JUGADOR son la excepción, y tienen su talla escrita con el
 * porqué en `anillo-en-3d.ts`: el peón va a `TALLA_DEL_PEON`, la casa a `TALLA_DE_LA_CASA` y
 * el hotel a `TALLA_DEL_HOTEL`, que además estira la malla de la casa eje a eje para que un
 * hotel no sea una casa. A la escala del pack el peón medía el 1,8 % del frente de su casilla
 * y un hotel era exactamente una casa: dos fallos que no dan error y se ven en la primera
 * captura del banco.
 *
 * ═══ NINGUNA ANIMACIÓN DECIDE NADA ═══
 *
 * La vista que llega por props ES el estado final. Los `sucesos` de cada jugada nueva se
 * encolan en la cola pura de `coreografia.ts` y se reproducen en `useFrame`: cada suceso
 * del peón se le entrega a la máquina de SU asiento (`peon.ts`) cuando la cola dice que
 * arranca, y lo demás (dados, monedas, naipe, reja, banderas, casas) se pinta leyendo
 * `enCurso`. Un toque en el lienzo SALTA la cola: todo a su estado final en el acto. La
 * primera vista que se ve al montar no se anima: es noticia vieja.
 *
 * ═══ UN AVENTURERO EN PIE A LA VEZ (decisión 11) ═══
 *
 * Los seis asientos están SIEMPRE como peón instanciado. El aventurero de KayKit sólo
 * se monta para el asiento en pie, y antes de entregar a un asiento un suceso que lo
 * pone en pie (`mueve`, `a-la-mazmorra`, `sale-de-la-mazmorra`, `quiebra`) se despide
 * al que estuviera (`despedir`, 0,4 s encogiendo) y se ESPERA a que se haya ido. Con dos
 * aventureros el tablero lleno pasaría de los 110.000 triángulos.
 *
 * ═══ SI NO HAY MARIONETA, EL PEÓN SE DESLIZA ═══
 *
 * En calidad `sobria`, o mientras `animaciones.glb` o la figura no han llegado, no se
 * monta ningún aventurero (nunca T-pose, regla del Muelle) y el peón instanciado del
 * asiento en pie ocupa el sitio que `posicionYRumbo` daría al aventurero: se ve deslizar
 * por la polilínea a la misma velocidad.
 *
 * ═══ LOS DADOS: LA VISTA SE ENTREGA CUANDO LA COLA LO DICE ═══
 *
 * La máquina de `dados-del-burgo.ts` recibe la vista de `props.dados`, pero no en cuanto
 * llega: si la cola tiene un `tira` o un `sale` por arrancar, la vista se retiene y se
 * entrega al arrancar ese suceso (con el par del suceso y el sello de la vista), para
 * que los dados rueden cuando toca y no antes que el peón del turno anterior haya
 * terminado de andar. En el sorteo cada `sale` rueda con un sello propio (el de la ronda
 * y el asiento), y la vista de después —sin tirada aún— no vuelve a rodar.
 *
 * ═══ LA CÁMARA ES DEL CLIENTE; AQUÍ SÓLO SE LA EMPUJA ═══
 *
 * Quien monta el `Canvas` pone el ojo en cada fotograma (`CamaraAerea` en el escritorio,
 * `usarMiradorTactil` en la app, con `poseDelBurgo`). «Seguir al que mueve» se hace aquí
 * en un `useFrame` de prioridad 1 —que corre DESPUÉS del del cliente— mezclando la pose
 * que el cliente dejó con una que mira al aventurero a `CERCANIA_DE_SEGUIMIENTO`, con un
 * peso amortiguado que sube al empezar un `mueve` y baja `REPOSO_TRAS_SEGUIR` después
 * del salto. El cliente cancela el seguimiento con `seguirAlQueMueve: false` (lo hace
 * ante cualquier gesto). En `fin`, la misma mezcla lleva la cámara a plomo sobre la plaza.
 * Todo esto es la cámara de MESA, y sigue siendo la de siempre.
 *
 * ═══ A PIE: EL PASEO COMÚN, CON EL MUNDO QUE DECLARA LA MESA ═══
 *
 * Con `camara.modo` en `hombro` u `ojos` se baja a andar por la ciudad, y se anda con el paseo
 * de `escenas/paseo/` y NINGUNO propio, igual que en Las Lindes: `usarElPaseo` recibe el mundo
 * de `mundoDelBurgo(código)` —la estructura de la mesa, la misma en todas las calidades y la
 * que derivará el servidor para validar—, el sitio de nacer del asiento de quien anda, la
 * palanca de la app (`mandos`) y la altura del suelo que se pinta; el paso, los choques, las
 * cámaras de a pie y la marioneta son suyos. Lo que sólo sabe esta ciudad —de qué sitio se
 * nace, a qué cota va cada suelo y hasta dónde se ve— está en `a-pie.ts`, sin `three`.
 *
 * Tres cosas cambian a pie y ninguna en la mesa: la cámara es del paseo aunque el cliente la
 * siga escribiendo (ver «a pie, la cámara es del paseo» más abajo), la niebla se acerca y con
 * ella el nivel de detalle de la ciudad (`UMBRALES_A_PIE`, medido contra el presupuesto de
 * esta misma escena), y no se abre ningún edificio. El peón del raíl, los dados, la caja y
 * todo lo del tablero siguen como están: se puede tirar y comprar andando.
 *
 * ═══ Y EN UNA MESA DE BOTAS SE ANDA CON LOS DEMÁS, COSIDO COMO EN LAS LINDES ═══
 *
 * Con la prop `canal` —sólo en una mesa `botas`, y quién la pasa lo deciden los clientes con
 * `esMesaDeBotas`— la escena abre el canal de la mesa con `usarElCanal` y lo cose al paseo por los
 * mismos dos sitios que `Lindes.tsx`: lo pedido en cada tic (`alDarUnTic` de las opciones del paseo)
 * y la corrección (`paseo.corregir`, que llega al canal por una referencia porque el paseo se monta
 * después). Los demás asientos se pintan a pie con `LosDemas`, la misma marioneta que quien anda con
 * la pose que llega por el canal, y con LA MISMA altura del suelo (`sueloDelBurgo`): quien sube al
 * andén o cruza un puente lo pisa por encima, visto desde aquí o desde su aparato. Sin la prop no se
 * abre nada y el paseo no paga ni una llamada por tic.
 *
 * ═══ LOS AVISOS DEL CONTRATO, Y CÓMO SE CUMPLEN AQUÍ ═══
 *
 * `alEstarListo` se llama SIEMPRE y una sola vez: cuando `burgo.glb` y `dados.glb` han
 * llegado O HAN FALLADO se deja pintar un fotograma y en el siguiente se avisa; si
 * `traer` no contesta nunca, un tope de quince segundos avisa igual con cielo y luz.
 * `alFallar` va una vez por fichero. `alMedir` una vez por segundo con la media real de
 * milisegundos (cada fotograma acotado a 100 ms). `alEstarListo` y `alMedir` los lleva el gancho
 * común de `comun/arranque.ts`, el mismo de las demás escenas. `alTerminarLaCola` cuando la cola y
 * todas las máquinas de peón han quedado en reposo tras una jugada con sucesos.
 *
 * `alSenalarCasilla` sale de las MISMAS asas que el toque, y sólo cuando la casilla señalada
 * CAMBIA: sesenta avisos de puntero sobre la misma casilla son UN aviso, no sesenta (quién lo
 * decide y por qué: `senaladoTrasElGesto` en `tipos.ts`, y el bloque de «el señalado» aquí
 * abajo). Con el dedo se avisa `null` al levantarlo; con ratón, el cartel se queda donde el
 * cursor lo dejó.
 *
 * ═══ LO QUE NO HAY, A PROPÓSITO ═══
 *
 * Ni `drei`, ni `document`, ni `window`, ni `fetch`, ni Expo: sólo `three`, React y el
 * núcleo de r3f. Ni sombras (2048 baja un móvil de 60 a 20 fps): discos de contacto. Ni
 * texto en el lienzo: el nombre, el precio y la carta van a la hoja. Ni `visible=false`
 * para quitar un toque: el asa de los dados se DESMONTA cuando no hay que tirar, y las
 * asas de las casillas sólo se montan si hay quien atienda el toque o el señalado. Ni `Vector3` en
 * props: ternas. Ni estado escrito tras desmontar: cada promesa mira `vivo`. Ni las
 * partículas de la lluvia de monedas del `fin` (§5.7): queda anotado como pendiente.
 */
import * as React from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LEJANIA, loCogeLaInterfaz, MINIMO_PARA_GIRAR } from '../camara';
import { ORDEN_DE_LAS_CARTAS, ORDEN_DE_LAS_CASILLAS } from '../capas';
import { catalogoDeModelos, MODELO } from '../modelos';
import type { CatalogoDeModelos } from '../modelos';
import { rutaDeLosDados, rutaDelBurgo } from '../ruta-de-modelos';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { GIRO_DEL_RELOJ, RelojDeArena, VACIADO_DEL_RELOJ } from '../reloj';
import { relojDe } from '../comun/reloj';
import type { RelojCargado } from '../comun/reloj';
import { usarArranqueYMedida } from '../comun/arranque';
import {
  ARISTA_DEL_D6_EN_EL_PACK,
  COLOR_DEL_NUMERO,
  COLOR_DEL_PUNTO,
  SACUDIDA,
  anguloRodado,
  avanceDelAsentado,
  giroDelDadoAsentado,
  parQueSeEnsena,
  reboteDelDado,
  sacudida,
  saltoDelDado,
  sucesoDelResultado,
} from '../dados';
import type { ValorDelDado } from '../caras-del-dado';
import { cuaternionDelValor, geometriaDeLosPuntosDelDado, geometriaDelCuerpoDelDado } from '../cubo-del-dado';
import { abrirGlb, aplana, cargadorPara, fundir } from '../embarcadero/cargar';
import type { AventureroCargado, Instanciable, ParteAFundir } from '../embarcadero/cargar';
import { amortiguado } from '../embarcadero/camara';
import { CLIP, figura as datosDeFigura } from '../embarcadero/figuras';
import type { FiguraId } from '../embarcadero/figuras';
import { DURACION } from '../embarcadero/gestos';
import { ATRIBUTO_DE_TINTE_CARGADO } from '../embarcadero/piezas';
import type { Traer } from '../embarcadero/tipos';
import { catalogoDelBurgoDe } from './catalogo-del-burgo';
import { PIEZA, RETICULA_DE_LA_CIUDAD } from './piezas';
import type { NombreDePieza } from './piezas';
import {
  ALTURA_DEL_BORDE,
  ALTURA_DEL_FILETE,
  ALTURA_DEL_REBORDE,
  ANCHO_DE_CASILLA,
  ANILLO_DEL_BURGO,
  BANDERA_SOBRE_LA_POSADA,
  BORDE_CLARO,
  BORDE_INTERIOR,
  CASILLAS,
  CONFIN_DE_LAS_NUBES,
  DERIVA_DE_LAS_NUBES,
  EL_CONCEJO,
  FILETE,
  FRANJA,
  LADO_DE_ESQUINA,
  LADO_INTERIOR,
  LINEA_DE_LA_MARCHA,
  MEDIO_LADO,
  RADIO_DEL_DISCO_DEL_PEON,
  SUBIDA_DE_LA_REJA,
  SUPERFICIE,
  TALLA_DEL_HOTEL,
  TALLA_DEL_PEON,
  TALLA_DE_LA_CASA,
  campo,
  huecoDeBandera,
  huecoDeCasa,
  huecoDePeon,
  huecoDePosada,
  marcoDeCasilla,
  mundoEstatico,
  puestaDeLaReja,
  puestasDeLasEsquinas,
  puntoEnCasilla,
  sitioDelPrecinto,
  puntoEnEsquina,
  semillaDelCampo,
  suelosDelAnillo,
} from './anillo-en-3d';
import type { AnilloEn3D, PapelDelSuelo, Punto, Puesta } from './anillo-en-3d';
import {
  MUEBLE,
  RECINTO_DEL_BURGO,
  TRIANGULOS_DEL_TABIQUE,
  TRIANGULOS_DEL_TABIQUE_CON_PUERTA,
  TRIANGULOS_DE_LA_CUBIERTA,
  TRIANGULOS_DE_LA_ESCALERA,
  TRIANGULOS_DE_LA_LOSA,
  TRIANGULOS_DE_LA_MEDIANERA,
  cascaraAbierta,
  ciudadDelCodigo,
  cocheEnElInstante,
  montarLaCiudad,
  salasDelEdificio,
  tonoDeLaFachada,
  tonoDelEdificio,
} from './ciudad';
import type { BultoPropio, EdificioDeLaCiudad, LaCiudad, MontajeDeLaCiudad, PuestaDeSala, PuestaEnLaCiudad } from './ciudad';
import { claveDelBulto, geometriaDeLaCaja, geometriaDeLaPlacaConSuCantidad, geometriaDelColorDeUnBillete, geometriaDeLosMazos, geometriaDeUnaCasita, geometriaDeUnBillete, geometriaDeUnHotelito, geometriaDelPrecinto, geometriaDeLaJoya, geometriaDeLaMonedaDeLaRecaudacion, geometriaDeLaOnda, geometriaDeUnaBocanada, geometriaDeLaRejaDeLaCelda, geometriaDeLaRuleta, geometriaDeLaTapa, geometriaDeLasObras, geometriaDeLosRotulos, geometriaDeUnBulto, geometriaDeUnTren, geometriaDeUnaCinta, soltarLosBultos } from './ciudad-en-3d';
import { BOCANADAS_DEL_HUMO, CASILLA_DE_LA_CENTRAL, CASILLA_DEL_CANAL, bisagrasDeLosCofres, bocaDeLaChimenea, centroDeLaAlberca, ejeDeLaJoya, ejesDeLasRuletas, largoDeLaVia, monedaDeLaRecaudacionEnElMundo, paradasDelTren, puntoEnLaVia, sitioDeLaRejaDeLaCelda } from './obras';
import { CASAS_DEL_CONCEJO, DISCOS_DEL_TRATO, DISCOS_DE_CONTACTO, MONEDAS_EN_VUELO, POSADAS_DEL_CONCEJO, SEGMENTOS_DEL_CIELO, SEGMENTOS_DEL_DISCO, TITULOS } from './presupuesto';
import {
  HUNDIR_CASAS,
  LUMINANCIA_EMPENADA,
  POR_CASA,
  TAPA_DEL_COFRE,
  TREN,
  alzadoDeLaReja,
  alzadoDeLaRejaDeLaCelda,
  aperturaDelCofre,
  avanceDelTren,
  giroDeLaJoya,
  giroDeLaRuleta,
  loQueAnimaUnaCarta,
  esRecaudacion,
  momentoDeLaRecaudacion,
  bocanadaDelHumo,
  esRentaDe,
  ondaDelAgua,
  arcoDeMoneda,
  avanzarLaCola,
  backOut,
  caidaConRebote,
  caidaDelPeonDelSorteo,
  colaVacia,
  encolar as encolarEnLaCola,
  enCurso,
  escalaDelNaipe,
  hundirse,
  mediaAsta,
  monedasDe,
  parpadeo,
  progresoDeLaMoneda,
  saltar as saltarLaColaDeSucesos,
  terminada as colaTerminada,
} from './coreografia';
import type { ColaDeSucesos, SucesoProgramado } from './coreografia';
import { PASO_DE_LA_REJA, avanzar, despedir, encolar as encolarAlPeon, esSucesoDelPeon, nacer, posicionDelPeon, posicionYRumbo, saltarLaCola, terminada as peonTerminado } from './peon';
import type { EstadoDelPeon } from './peon';
import { dadosDelBurgoEnReposo, faseDeLosDadosConPar, saltoDelDoble } from './dados-del-burgo';
import type { EstadoDeLosDadosDelBurgo, SucesoDeLosDadosDelBurgo, VistaDeLosDadosDelBurgo } from './dados-del-burgo';
import {
  ARISTA_DE_LOS_DADOS,
  ASA_DEL_RELOJ_DE_ARENA,
  BILLETES,
  BILLETES_A_LA_VISTA,
  ENVOLVENTE_DEL_RELOJ,
  HOTELES_DEL_CONCEJO,
  MOVIMIENTO_DE_LOS_DADOS,
  SITIO_DE_LA_BANDEJA_POR_DEFECTO,
  billetesDeLaCantidad,
  cajaDelAsaDeLosDados,
  cajaDelAsaDelReloj,
  colorDelFieltro,
  huecosDeLosDados,
  planoDeLaBandeja,
  poseDeLaBandeja,
  sitioDeLaPlaca,
  sitioDelBillete,
  sitiosDeLasCasas,
  sitiosDeLosHoteles,
  textoDelDinero,
} from './bandeja-de-los-dados';
import {
  ALCANCE_DEL_BURGO,
  ALTURA_MINIMA_DEL_OJO_DEL_BURGO,
  AMORTIGUACION_DEL_SEGUIMIENTO,
  CERCANIA_DE_SEGUIMIENTO,
  NIEBLA_DE_LA_MESA,
  REPOSO_TRAS_SEGUIR,
  nieblaDeLaMesa,
} from './camara-del-burgo';
import { AMBAR_DEL_CONCEJO, coloresDeLasBanderas, geometriaParaInstanciar, geometriaTenidaDe, soltarTintesDeGeometrias } from './tinte-del-burgo';
import { Aventurero } from './Aventurero';
import { gestoAlSalir, senaladoTrasElGesto } from './tipos';
import type { CasillaEn3D, FiguraEn3D, GestoDeSenalado, PropsDelBurgo } from './tipos';
import { NIEBLA_A_PIE, UMBRALES_A_PIE, asientoQueAnda, modoDelPaseoDe, sitioDeNacerEnElBurgo, sueloDelBurgo } from './a-pie';
import { usarElPaseo } from '../paseo/usar-el-paseo';
import { indiceDeEstorbos } from '../paseo/estorbos';
import { rodajasDelCatalogo } from '../paseo/rodajas-del-catalogo';
import { estorbosDelBurgo } from './estorbos-del-burgo';
import { QuienAnda } from '../paseo/quien-anda';
import { usarElCanal } from '../paseo/usar-el-canal';
import { LosDemas } from '../paseo/los-demas';
import { LosHallazgos } from '../paseo/los-hallazgos';
import { mundoDelBurgo } from '../../shared/arcade/juegos/burgo-mundo';
import type { Andante, MundoDeclarado } from '../../shared/mecanicas/mundo';
import type { SucesoDelBurgo } from '../../shared/arcade/juegos/burgo';

/* ─────────────────────────────── Constantes ─────────────────────────────── */

/** El mediodía: azul en el cénit, crema en el horizonte, y la niebla del color del horizonte. */
const COLOR_DEL_CENIT = '#6fa9dc';
const COLOR_DEL_HORIZONTE = '#e9e0c8';
const COLOR_DE_LA_NIEBLA = '#d6dfe4';
/** La cúpula, más cerca que el plano lejano de los dos clientes (alcance × 8). */
const RADIO_DEL_CIELO = ALCANCE_DEL_BURGO * 6;
/* La niebla de la mesa —lineal, de dos a cuatro alcances (§5.6), retirada con el ojo— es `nieblaDeLaMesa`. */
/** Las luces de mediodía: sin sombras en ningún cliente. */
const LUZ = { hemisferio: { cielo: '#d8e8ff', suelo: '#8a7a5a', intensidad: 0.85 }, sol: { rumbo: [1, 2, 1.2] as const, color: '#fff3dd', intensidad: 1.7 } } as const;
/** Los colores del suelo propio, banda a banda (LA-CIUDAD.md §2). */
const COLOR_DEL_FILETE = '#efe7d2';
const COLOR_DE_LA_SUPERFICIE = '#e4dcc4';
const COLOR_DEL_MARCO = '#f4eedd';
const COLOR_DE_LA_ESQUINA = '#e0d7bd';
const COLOR_DE_LA_FRANJA_SIN_BARRIO = '#d7cbb0';
/**
 * LA LÍNEA QUE SEPARA DOS CASILLAS: la tinta del tablero, la misma del precio.
 *
 * Es lo que hace que un lado del anillo se lea como NUEVE CASILLAS y no como un borde beige
 * de 648 con números encima. Ver `ANCHO_DE_LA_LINEA` en `anillo-en-3d.ts`.
 */
const COLOR_DE_LA_LINEA = '#4a4238';
/*
 * EL SUELO DEL RECINTO NO ES UN PRADO, Y ESO SE VIO MIRANDO.
 *
 * Era verde (`#95b56c`), y con la ciudad montada por niveles el resultado era una ciudad de
 * bloques grises PLANTADA EN UN CAMPO: a más de 156 unidades las parcelas no llevan solera
 * —el nivel de detalle se las come— y lo que se veía entre los edificios era el prado. Un
 * gris cálido de losa hace que la ciudad se lea como ciudad en los tres niveles y no cuesta
 * un triángulo: es el mismo cuadro de siempre con otro color. Lo verde de dentro (el parque,
 * el césped del estadio, el cementerio) lo pinta cada distrito con su propio suelo, que
 * `ciudad.ts` mantiene montado hasta el último nivel justamente para esto.
 */
const COLOR_DEL_INTERIOR = '#a19d90';
const COLOR_DE_LA_TIERRA = '#7a9b55';
/** El color de cada papel de cuadro de suelo: una sola tabla, y `construirSuelo` no decide nada. */
const COLOR_DEL_SUELO: Readonly<Record<PapelDelSuelo, string>> = {
  franja: COLOR_DE_LA_FRANJA_SIN_BARRIO,
  reborde: COLOR_DE_LA_FRANJA_SIN_BARRIO,
  filete: COLOR_DEL_FILETE,
  superficie: COLOR_DE_LA_SUPERFICIE,
  borde: COLOR_DEL_MARCO,
  esquina: COLOR_DE_LA_ESQUINA,
  linea: COLOR_DE_LA_LINEA,
  recinto: COLOR_DEL_INTERIOR,
};
/** Cuánto mide de lado la tierra bajo el campo. */
const LADO_DE_LA_TIERRA = CONFIN_DE_LAS_NUBES * 3;
/** El acento con el que se enciende la casilla tocable, y el blanco de la destacada. */
const COLOR_DEL_ACENTO = '#f2b134';
const COLOR_DE_LA_DESTACADA = '#fff6dc';
/** Los colores del naipe por mazo (§5.5). */
const COLOR_DEL_NAIPE = { pregon: '#c9a227', arca: '#3f9a5a' } as const;
/** El naipe mide 3 × 4,2 y ocupa el 28 % del alto del lienzo, arriba. */
const NAIPE = { ancho: 3, alto: 4.2, parteDelAlto: 0.28, margenArriba: 0.05 } as const;
/** El radio de la marca de casilla: un anillo plano que cabe en la calle. */
const MARCA = { interior: 2.2, exterior: 3.0, alza: 0.06 } as const;
/** Lo que mide la moneda en vuelo (la pieza mide 2,64 de diámetro: se instancia a esto). */
const TALLA_DE_LA_MONEDA = 0.45;
/** Los discos del trato: doce de 0,5 en línea entre los dos peones. */
const LADO_DEL_DISCO_DEL_TRATO = 0.5;
const COLOR_DEL_TRATO = '#f2e8cf';
/** Las aspas del molino, radianes por segundo. */
const GIRO_DE_LAS_ASPAS = 0.9;
/** Desde qué altura caen los peones en el sorteo. */
const CAIDA_DEL_SORTEO = 4;
/** El asa de una casilla: un plano invisible de su tamaño, un pelo sobre el suelo. */
const ALZA_DEL_ASA = 0.4;
/** Cuánto pesa la mezcla hacia la pose de `fin`: a plomo sobre la plaza, a este alto. */
const ALTURA_DEL_FIN = ALCANCE_DEL_BURGO * 1.35;
/** El amortiguado con el que la marca destacada se desliza al siguiente. */
const AMORTIGUACION_DE_LA_MARCA = 8;
/** Capacidades de las mallas instanciadas: un tablero lleno y una casa de más que se hunde. */
const CAPACIDAD = {
  casas: CASAS_DEL_CONCEJO + POSADAS_DEL_CONCEJO + 2,
  banderas: TITULOS + POSADAS_DEL_CONCEJO + 1,
  peones: 6,
  discos: DISCOS_DE_CONTACTO,
  monedas: MONEDAS_EN_VUELO,
  marcas: CASILLAS + 1,
  trato: DISCOS_DEL_TRATO,
  /** Un precinto por título: lo más que puede haber hipotecado a la vez. */
  precintos: TITULOS,
} as const;

/* ───────────────────────── La ciudad de dentro del recinto ───────────────────────── */

/**
 * CADA CUÁNTO SE VUELVE A REPARTIR LA CIUDAD POR NIVELES.
 *
 * No por fotograma: `montarLaCiudad` recorre 174 grupos y reescribir las matrices son unos
 * miles de `compose`. Se hace cuando la cámara CAMBIA DE CELDA (12 unidades), que es lo que
 * pide `LA-CIUDAD.md` §8, y con eso una panorámica a 60 fotogramas por segundo reparte tres
 * o cuatro veces por segundo en vez de sesenta.
 */
const PASO_PARA_REPARTIR = RETICULA_DE_LA_CIUDAD;
/** Cuántos edificios se abren a la vez, como mucho (§5). Tres, y los tres más cercanos. */
const EDIFICIOS_ABIERTOS = 3;
/**
 * CUÁNDO SE ABRE UN EDIFICIO, Y POR QUÉ NO ES «CON EL OJO POR DEBAJO DE 40».
 *
 * `LA-CIUDAD.md` §5 lo escribió como «por debajo de 60 de distancia y 40 de ALTURA DE OJO», y
 * al medirlo en el banco resultó ser una regla que NO PUEDE CUMPLIRSE NUNCA con la cámara que
 * hay. La cuenta, con los números de `camara-del-burgo.ts` y `camara.ts`:
 *
 *     cercanía más corta (`LIMITES_DEL_BURGO.masCerca` 0,15) → el ojo queda a 366 del punto
 *     que mira; inclinación mínima (`ALTURA_MINIMA`, 12°) → altura de ojo 366 · sen 12° = 76.
 *
 * O sea que el ojo NUNCA baja de 76, y con el umbral en 40 los interiores no se abrían jamás
 * en una partida: sólo en el banco, bajando la mirada por debajo de lo que el cliente deja.
 * Un adorno que el jugador no ve no es un adorno, es peso muerto.
 *
 * Así que la regla pasa a medirse donde de verdad está la atención: EL PUNTO QUE LA CÁMARA
 * MIRA en el suelo, y a qué distancia tiene el ojo de ese punto. Con la cercanía más corta el
 * ojo está a 366, y una sala de 8 de lado mide ahí 8/366 · 1.304 = 28 píxeles en un PC: se ve
 * el sofá. Con la cercanía siguiente (0,2) el ojo se va a 488 y la sala baja de 21 px. El
 * umbral se pone en 420, entre las dos: se abren cuando el jugador ha acercado del todo, y no
 * antes. Los 60 del radio no se tocan: son los del plano y son lo que abarca la mirada.
 */
const PARA_ABRIR = { distancia: 60, alcance: 420 } as const;
/**
 * CUÁNTOS SITIOS SE LE GUARDA A CADA MUEBLE, Y DE DÓNDE SALE EL NÚMERO.
 *
 * La primera versión dimensionó el almacén de muebles con la muestra de tres interiores que
 * la ciudad trae montada, por tres. En el banco saltó el aviso en cuanto la cámara se metió
 * en una calle —«la ciudad se pasó de la capacidad de anaquel-pequeno», y luego de «cama»—
 * porque el edificio que uno abre no tiene por qué ser de los tres: una tienda lleva
 * anaqueles que un dormitorio no lleva. Catar dieciséis edificios tampoco bastó: medido, la
 * muestra de dieciséis se queda corta hasta ×3.
 *
 * Así que el número está MEDIDO SOBRE TODO EL UNIVERSO, no estimado. Recorriendo los 3.110
 * edificios con cáscara de cinco ciudades enteras y amueblándolos uno a uno:
 *
 *   · `salasDelEdificio` NO emite ni una pieza que no esté en la tabla `MUEBLE` de
 *     `ciudad.ts` (40 distintas de las 60 que la tabla tiene), así que el universo de piezas
 *     que pueden hacer falta se sabe de antemano y no hay que catarlo.
 *   · El máximo de UNA pieza en UN edificio son 18 (`plato`, en un restaurante). Ni una
 *     llega a 24 en 3.110 edificios.
 *
 * Con eso, `24 × 3` sitios por pieza cubre los tres que pueden estar abiertos a la vez con
 * margen, cuesta 60 × 72 = 4.320 matrices (276 kB) y se sabe en el acto, sin amueblar nada
 * al montar. La escritura sigue parándose en la capacidad y avisando una vez por `alFallar`:
 * es una cota medida sobre cinco ciudades, no un teorema.
 */
const MUEBLES_POR_EDIFICIO = 24;
/** Y lo mismo para los tabiques y las losas, que son bultos: el máximo medido fue 24 (los de 10). */
const BULTOS_POR_EDIFICIO = 32;

/**
 * EL ÚNICO INTERRUPTOR DE LA ESCENA, Y ES DEL BANCO.
 *
 * `banco-burgo.html` tiene que poder abrir y cerrar los interiores a mano para mirarlos, y
 * el sitio obvio para eso sería una prop. No lo es: `tipos.ts` es el CONTRATO que cumplen
 * los dos clientes, y meterle una prop que sólo usa un banco de pruebas la convierte en algo
 * que la app tendrá que pasar para siempre. Así que va aquí, con su valor de la PARTIDA por
 * defecto (`true`), y lo que se documenta es que nadie más lo toca: `app/` y `escritorio/src`
 * no lo nombran, y `verify:burgo-escena` comprueba que sigue naciendo en `true`.
 */
export const INTERRUPTORES_DEL_BANCO = { interiores: true };

/** Una malla instanciada de la ciudad: su geometría, su capacidad y su contador vivo. */
interface MallaDeLaCiudad {
  readonly clave: string;
  readonly geometria: THREE.BufferGeometry;
  readonly capacidad: number;
  /** Los bultos llevan color por instancia; las piezas del pack, no (su color va horneado). */
  readonly conColor: boolean;
}

interface CiudadEn3D {
  readonly ciudad: LaCiudad;
  readonly piezas: readonly MallaDeLaCiudad[];
  readonly bultos: readonly MallaDeLaCiudad[];
  readonly coches: readonly MallaDeLaCiudad[];
  /**
   * LAS NUEVE CINTAS VAN SIEMPRE MONTADAS, y no es un descuido.
   *
   * Son nueve en toda la ciudad —el sendero del parque, la pista del circuito, sus dos
   * quitamiedos, la línea de meta, las aceras del parque— y suman unos mil triángulos. Que
   * el trazado del parque y el óvalo del circuito se lean DESDE ARRIBA es medio distrito:
   * quitarlos a 420 unidades ahorraría mil triángulos de 692.000 y borraría las dos cosas
   * que hacen que la ciudad se entienda desde la pose de salida.
   */
  readonly cintas: readonly THREE.BufferGeometry[];
  readonly material: THREE.Material;
  /** Por índice de edificio, su clave de cáscara: la puesta que se DESMONTA al abrirlo. */
  readonly cascaras: ReadonlyMap<number, string>;
  readonly soltar: () => void;
}

/** La clave con la que se reconoce una puesta concreta del pack: pieza y sitio, redondeados. */
function claveDePuesta(pieza: string, x: number, z: number): string {
  return `${pieza}|${x.toFixed(2)}|${z.toFixed(2)}`;
}

/**
 * LAS MALLAS DE LA CIUDAD, con la capacidad sacada de la propia ciudad y no de un número
 * escrito a mano.
 *
 * La capacidad de una pieza es la suma, grupo a grupo, del MÁXIMO que ese grupo pone de esa
 * pieza en cualquiera de sus tres niveles. Es una cota superior de verdad —ningún reparto
 * puede pedir más— y sale barata de calcular una vez. Escribir «500 farolas» a mano habría
 * durado hasta la primera semilla con una calle más.
 */
function construirLaCiudad(ciudad: LaCiudad, catalogo: CatalogoDeModelos, material: THREE.Material): CiudadEn3D {
  const propias: THREE.BufferGeometry[] = [];
  const geometriaDe = (nombre: string): THREE.BufferGeometry | null => {
    const nodo = catalogo.get(nombre);
    if (nodo === undefined) return null;
    const partes = aplana(nodo);
    for (const p of partes) propias.push(p.geometria);
    const g = unaGeometria(partes);
    if (g !== null && g !== partes[0]?.geometria) propias.push(g);
    return g;
  };
  const topeDePieza = new Map<string, number>();
  /** Por clave de bulto (`bulto-30`, `bulto-260-llano`), su cuenta de triángulos y su capacidad. */
  const topeDeBulto = new Map<string, { triangulos: number; llano: boolean; capacidad: number }>();
  const sube = (mapa: Map<string, number>, clave: string, cuanto: number): void => {
    mapa.set(clave, (mapa.get(clave) ?? 0) + cuanto);
  };
  const subeBulto = (triangulos: number, llano: boolean, cuanto: number): void => {
    const clave = claveDelBulto(triangulos, llano);
    const hecho = topeDeBulto.get(clave);
    if (hecho === undefined) topeDeBulto.set(clave, { triangulos, llano, capacidad: cuanto });
    else hecho.capacidad += cuanto;
  };
  for (const g of ciudad.grupos) {
    const porPieza = new Map<string, number>();
    const porBulto = new Map<string, { triangulos: number; llano: boolean; cuantos: number }>();
    for (const nivel of g.niveles) {
      const p = new Map<string, number>();
      const b = new Map<string, { triangulos: number; llano: boolean; cuantos: number }>();
      for (const q of [...nivel.puestas, ...nivel.coches]) p.set(q.pieza, (p.get(q.pieza) ?? 0) + 1);
      for (const q of nivel.bultos) {
        const llano = q.alto <= 0;
        const clave = claveDelBulto(q.triangulos, llano);
        const hecho = b.get(clave);
        if (hecho === undefined) b.set(clave, { triangulos: q.triangulos, llano, cuantos: 1 });
        else hecho.cuantos++;
      }
      for (const [k, n] of p) porPieza.set(k, Math.max(porPieza.get(k) ?? 0, n));
      for (const [k, v] of b) {
        const hecho = porBulto.get(k);
        if (hecho === undefined) porBulto.set(k, { ...v });
        else hecho.cuantos = Math.max(hecho.cuantos, v.cuantos);
      }
    }
    for (const [k, n] of porPieza) sube(topeDePieza, k, n);
    for (const v of porBulto.values()) subeBulto(v.triangulos, v.llano, v.cuantos);
  }
  /* Y los interiores, que no son de ningún grupo: la tabla entera de muebles (ver `MUEBLES_POR_EDIFICIO`). */
  for (const pieza of Object.keys(MUEBLE)) sube(topeDePieza, pieza, MUEBLES_POR_EDIFICIO * EDIFICIOS_ABIERTOS);
  for (const cuenta of [TRIANGULOS_DEL_TABIQUE, TRIANGULOS_DEL_TABIQUE_CON_PUERTA, TRIANGULOS_DE_LA_ESCALERA]) {
    subeBulto(cuenta, false, BULTOS_POR_EDIFICIO * EDIFICIOS_ABIERTOS);
  }
  /* La losa de una sala es un bulto CON grueso, no un plano: `GRUESO_DE_LA_LOSA` es 0,5. */
  subeBulto(TRIANGULOS_DE_LA_LOSA, false, BULTOS_POR_EDIFICIO * EDIFICIOS_ABIERTOS);
  /* Y la casa de muñecas: por edificio abierto, su tejado —que va tumbado— y tres medianeras. */
  subeBulto(TRIANGULOS_DE_LA_CUBIERTA, true, EDIFICIOS_ABIERTOS);
  subeBulto(TRIANGULOS_DE_LA_MEDIANERA, false, 3 * EDIFICIOS_ABIERTOS);

  const piezas: MallaDeLaCiudad[] = [];
  for (const [nombre, capacidad] of [...topeDePieza].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (catalogo.get(nombre) === undefined) continue;
    const geometria = geometriaDe(nombre);
    if (geometria === null) continue;
    piezas.push({ clave: nombre, geometria, capacidad, conColor: false });
  }
  const bultos: MallaDeLaCiudad[] = [];
  for (const [clave, v] of [...topeDeBulto].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    bultos.push({ clave, geometria: geometriaDeUnBulto(v.triangulos, v.llano), capacidad: v.capacidad, conColor: true });
  }
  /* Los coches que CIRCULAN van aparte: se reescriben cada fotograma y los demás no. */
  const porCoche = new Map<string, number>();
  for (const r of ciudad.coches.rutas) porCoche.set(r.pieza, (porCoche.get(r.pieza) ?? 0) + 1);
  const coches: MallaDeLaCiudad[] = [];
  for (const [nombre, capacidad] of [...porCoche].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (catalogo.get(nombre) === undefined) continue;
    const geometria = geometriaDe(nombre);
    if (geometria === null) continue;
    coches.push({ clave: `ruta-${nombre}`, geometria, capacidad, conColor: false });
  }

  /*
   * LAS CINTAS NO SE INSTANCIAN: son nueve en toda la ciudad y cada una es distinta. Cada
   * una es su propia malla, con su color horneado, y se muestra o se esconde con el nivel
   * de su grupo. Se esconde DESMONTÁNDOLA del árbol, no con `visible`, que aquí da igual
   * porque no cogen el dedo, pero la regla de la casa es una sola.
   */
  const cintas: THREE.BufferGeometry[] = [];
  for (const c of ciudad.cintas) {
    const geometria = geometriaDeUnaCinta(c);
    propias.push(geometria);
    cintas.push(geometria);
  }

  const cascaras = new Map<number, string>();
  for (const e of ciudad.edificios) if (e.cascara !== null) cascaras.set(e.indice, claveDePuesta(e.cascara, e.centro.x, e.centro.z));

  return {
    ciudad,
    piezas,
    bultos,
    coches,
    cintas,
    material,
    cascaras,
    soltar: () => {
      for (const g of propias) g.dispose();
    },
  };
}

const EJE_X = new THREE.Vector3(1, 0, 0);
const EJE_Y = new THREE.Vector3(0, 1, 0);
const EJE_Z = new THREE.Vector3(0, 0, 1);
const auxPosicion = new THREE.Vector3();
const auxGiro = new THREE.Quaternion();
const auxGiro2 = new THREE.Quaternion();
const auxEuler = new THREE.Euler();
const auxEscala = new THREE.Vector3();
const auxMatriz = new THREE.Matrix4();
const auxColor = new THREE.Color();

/**
 * LOS COLORES YA LEÍDOS: un hexadecimal se lee UNA vez, no cada vez que se escribe.
 *
 * `Color.set(cadena)` es `setStyle`, que son dos expresiones regulares sobre el texto. Un
 * hexadecimal siempre da el mismo color, así que leerlo dos veces es trabajo tirado, y desde
 * que cada casa tiene su propio tono (`tonoDeLaFachada`) las cadenas distintas pasaron de
 * diecisiete a unas setecientas.
 *
 * ═══ LO QUE ESTO AHORRA, MEDIDO, Y LO QUE NO ═══
 *
 * Contando las llamadas desde la consola del banco, misma pose y misma semilla, en diez
 * segundos con la cámara quieta: sin la tabla, 21.362 lecturas de color; con ella, 13.440 —y
 * esas trece mil que quedan no son de la ciudad, son de los peones, las casas y las marcas,
 * que escriben su color en cada fotograma por su cuenta. El fotograma pasó de 18,0 ms a 17,5.
 *
 * O sea: es media milésima, no un rescate. Queda escrito con el número pequeño A PROPÓSITO,
 * porque durante un rato pareció valer setenta y cinco milésimas: el banco llegó a marcar 92
 * ms con el color por casa y 17 sin él, tres veces seguidas, y no era el color — era la
 * máquina, que tenía otra escena 3D abierta y la batería de comprobadores corriendo. Un
 * cronómetro de fotograma en una máquina ocupada miente con mucha convicción. Lo que no
 * miente es contar llamadas: eso no depende de quién más esté usando la CPU.
 *
 * La tabla tiene tantas entradas como colores distintos hay en la ciudad —unos mil— y no
 * crece con los fotogramas. No hace falta soltarla: no son objetos de la tarjeta.
 */
const coloresLeidos = new Map<string, THREE.Color>();
function colorLeido(hex: string): THREE.Color {
  const hecho = coloresLeidos.get(hex);
  if (hecho !== undefined) return hecho;
  const nuevo = new THREE.Color(hex);
  coloresLeidos.set(hex, nuevo);
  return nuevo;
}

const auxVector = new THREE.Vector3();
const auxVector2 = new THREE.Vector3();
const auxRayo = new THREE.Ray();
const PLANO_DEL_SUELO = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const NADA = new THREE.Matrix4().makeScale(0, 0, 0);

const pinza = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));

/** La matriz de una puesta del Burgo: SIN `ESCALA_DEL_PACK`, que ya va horneada (ver la cabecera). */
function matrizDelBurgo(x: number, y: number, z: number, giro: number, talla: number, destino = new THREE.Matrix4()): THREE.Matrix4 {
  return destino.compose(auxPosicion.set(x, y, z), auxGiro.setFromAxisAngle(EJE_Y, giro), auxEscala.set(talla, talla, talla));
}

/**
 * LA MATRIZ DE UNA PIEZA ESTIRADA, que hoy sólo usa el HOTEL.
 *
 * `compose` monta `T · R · S`: la escala se aplica en los ejes LOCALES de la pieza y luego se
 * gira, que es justo lo que hace falta. La malla de la casa mira hacia dentro del anillo, así
 * que su `+X` local cae a lo largo de la casilla y estirarlo alarga el hotel por el frente, no
 * por el fondo (ver `TALLA_DEL_HOTEL` en `anillo-en-3d.ts`). Con la escala en el mundo pasaría
 * lo contrario en dos de los cuatro lados del tablero.
 */
function matrizEstiradaDelBurgo(x: number, y: number, z: number, giro: number, ancho: number, alto: number, fondo: number, destino = new THREE.Matrix4()): THREE.Matrix4 {
  return destino.compose(auxPosicion.set(x, y, z), auxGiro.setFromAxisAngle(EJE_Y, giro), auxEscala.set(ancho, alto, fondo));
}

/** ¿Es el botón derecho o el del medio? Ésos son de la cámara. Copia de `delta.tsx`. */
function noEsElPrimario(e: { nativeEvent: { button?: number } }): boolean {
  const boton = e.nativeEvent.button;
  return boton !== undefined && boton !== 0;
}

/**
 * ¿ESTE PUNTERO ES UN DEDO? Todo lo que no sea un ratón lo es, y lo que no se sabe también.
 *
 * El mismo apaño que `Embarcadero.tsx`: `pointerType` se lee de un objeto ensanchado porque
 * el suceso sintético de `expo-gl` en la app no siempre lo trae, y ahí el puntero es SIEMPRE
 * un dedo. Suponer `mouse` cuando falta dejaría el cartel encendido para siempre en el móvil,
 * que es el único sitio donde no hay manera de apagarlo moviendo la mano.
 */
function esDeDedo(e: { nativeEvent: unknown }): boolean {
  return ((e.nativeEvent as { pointerType?: string }).pointerType ?? 'touch') !== 'mouse';
}

/* ─────────────────────────── La carga, con caché por `traer` ─────────────────────────── */

/*
 * El de `burgo.glb` vive en `./catalogo-del-burgo`, compartido con la plaza del lobby: dos
 * cachés del mismo fichero serían 2,8 MB bajados dos veces justo al zarpar.
 */
const catalogosDeLosDados = new WeakMap<Traer, Promise<CatalogoDeModelos | null>>();

/** El catálogo de `dados.glb`, o `null` si no llega: entonces se pinta el respaldo. */
function catalogoDeLosDadosDe(traer: Traer, alFallar: (motivo: string) => void): Promise<CatalogoDeModelos | null> {
  const hecho = catalogosDeLosDados.get(traer);
  if (hecho !== undefined) return hecho;
  const promesa = traer(rutaDeLosDados())
    .then((bytes) => abrirGlb(bytes))
    .then((gltf) => catalogoDeModelos(gltf.scene))
    .catch((fallo: unknown): null => {
      catalogosDeLosDados.delete(traer);
      alFallar(`no han llegado los dados (${rutaDeLosDados()}): ${fallo instanceof Error ? fallo.message : String(fallo)}`);
      return null;
    });
  catalogosDeLosDados.set(traer, promesa);
  return promesa;
}

/* ─────────────────────────────── El mundo fijo ─────────────────────────────── */

interface Aspas {
  readonly matrizDelMolino: THREE.Matrix4;
  readonly posicion: readonly [number, number, number];
  readonly giro: THREE.Quaternion;
  readonly geometria: THREE.BufferGeometry;
  readonly material: THREE.Material;
}

interface PiezaSuelta {
  readonly geometria: THREE.BufferGeometry;
  readonly material: THREE.Material;
  readonly puesta: Puesta;
}

interface Nubes {
  readonly geometria: THREE.BufferGeometry;
  readonly material: THREE.Material;
  readonly puestas: readonly Puesta[];
}

interface Mundo {
  readonly fundido: { readonly geometria: THREE.BufferGeometry; readonly material: THREE.Material } | null;
  readonly material: THREE.Material | null;
  readonly aspas: Aspas | null;
  /** La reja que sube y baja, suelta; la fija va en el fundido. */
  readonly reja: PiezaSuelta | null;
  readonly nubes: readonly Nubes[];
  /** Las geometrías de las piezas dinámicas, ya en una sola por pieza. */
  readonly casa: THREE.BufferGeometry | null;
  readonly peon: THREE.BufferGeometry | null;
  readonly bandera: THREE.BufferGeometry | null;
  readonly moneda: THREE.BufferGeometry | null;
  readonly soltar: () => void;
}

/**
 * LAS PARTES DE UNA PIEZA EN UNA SOLA GEOMETRÍA, conservando la máscara de tinte.
 * `fundir` de `cargar.ts` la tira al normalizar (sólo posición, normal y color), y las
 * piezas que se instancian teñidas la necesitan. Si la pieza es una sola malla, se
 * devuelve tal cual.
 */
function unaGeometria(partes: readonly Instanciable[]): THREE.BufferGeometry | null {
  const primera = partes[0];
  if (primera === undefined) return null;
  if (partes.length === 1) return primera.geometria;
  const conMascara = partes.every((p) => p.geometria.getAttribute(ATRIBUTO_DE_TINTE_CARGADO) !== undefined);
  const listas = partes.map((p) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', p.geometria.getAttribute('position').clone());
    if (p.geometria.getAttribute('normal') === undefined) p.geometria.computeVertexNormals();
    g.setAttribute('normal', p.geometria.getAttribute('normal').clone());
    const color = p.geometria.getAttribute('color');
    const n = p.geometria.getAttribute('position').count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      c[i * 3] = color === undefined ? 1 : color.getX(i);
      c[i * 3 + 1] = color === undefined ? 1 : color.getY(i);
      c[i * 3 + 2] = color === undefined ? 1 : color.getZ(i);
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    if (conMascara) g.setAttribute(ATRIBUTO_DE_TINTE_CARGADO, p.geometria.getAttribute(ATRIBUTO_DE_TINTE_CARGADO).clone());
    const idx = p.geometria.getIndex();
    if (idx !== null) g.setIndex(idx.clone());
    return g;
  });
  const fundida = mergeGeometries(listas, false) as THREE.BufferGeometry | null;
  for (const g of listas) g.dispose();
  return fundida;
}

/**
 * CONSTRUYE EL MUNDO FIJO de una mesa con el catálogo: lo fundido, lo suelto que se
 * anima (aspas, reja), las nubes y las geometrías de lo que se instancia. Devuelve cómo
 * soltarlo: todas las geometrías de aquí son copias nuestras (`aplana` clona).
 */
function construirMundo(catalogo: CatalogoDeModelos, semilla: number, calidad: 'plena' | 'sobria'): Mundo {
  const propias: THREE.BufferGeometry[] = [];
  const porPieza = new Map<string, Instanciable[]>();
  const partesDe = (nombre: string): Instanciable[] => {
    const hechas = porPieza.get(nombre);
    if (hechas !== undefined) return hechas;
    const nodo = catalogo.get(nombre);
    const partes = nodo === undefined ? [] : aplana(nodo);
    for (const p of partes) propias.push(p.geometria);
    porPieza.set(nombre, partes);
    return partes;
  };

  /* El molino: las aspas fuera, el cuerpo al fundido. */
  let aspas: Aspas | null = null;
  const molino = catalogo.get(PIEZA.torreDeAgua);
  if (molino !== undefined) {
    const copia = molino.clone(true);
    copia.updateWorldMatrix(true, true);
    let ventilador: THREE.Mesh | null = null;
    copia.traverse((n) => {
      const m = n as THREE.Mesh;
      if (m.isMesh && m.name.includes('fan')) ventilador = m;
    });
    if (ventilador !== null) {
      const v = ventilador as THREE.Mesh;
      const relativa = new THREE.Matrix4().copy(copia.matrixWorld).invert().multiply(v.matrixWorld);
      const posicion = new THREE.Vector3();
      const giro = new THREE.Quaternion();
      relativa.decompose(posicion, giro, new THREE.Vector3());
      aspas = {
        matrizDelMolino: new THREE.Matrix4(),
        posicion: [posicion.x, posicion.y, posicion.z],
        giro,
        geometria: v.geometry,
        material: Array.isArray(v.material) ? (v.material[0] as THREE.Material) : v.material,
      };
      v.removeFromParent();
    }
    const cuerpo = aplana(copia);
    for (const c of cuerpo) propias.push(c.geometria);
    porPieza.set(PIEZA.torreDeAgua, cuerpo);
  }

  /*
   * Todo lo estático, en una sola geometría. La reja FIJA de la Mazmorra entra también
   * (`mundoEstatico` deja fuera las dos por si acaso; sólo una se anima): así son 24
   * llamadas y no 25, medido en el banco.
   */
  const aFundir: ParteAFundir[] = [];
  let material: THREE.Material | null = null;
  const laQueSube = puestaDeLaReja();
  const rejaFijaPuesta = puestasDesLasRejas().find((p) => !(Math.abs(p.x - laQueSube.x) < 1e-6 && Math.abs(p.z - laQueSube.z) < 1e-6)) ?? null;
  for (const p of [...mundoEstatico(semilla, calidad), ...(rejaFijaPuesta === null ? [] : [rejaFijaPuesta])]) {
    const matriz = matrizDelBurgo(p.x, p.y, p.z, p.giro, p.talla);
    if (p.pieza === PIEZA.torreDeAgua && aspas !== null) aspas.matrizDelMolino.copy(matriz);
    for (const parte of partesDe(p.pieza)) {
      /* Los estandartes de la Puerta Mayor van teñidos del ámbar del Concejo (§5.1). */
      const geometria = p.pieza === PIEZA.estandarte ? geometriaTenidaDe(PIEZA.estandarte, parte.geometria, AMBAR_DEL_CONCEJO) : parte.geometria;
      aFundir.push({ geometria, matriz });
      material ??= parte.material;
    }
  }
  const geometriaFundida = fundir(aFundir);
  if (geometriaFundida !== null) propias.push(geometriaFundida);
  const fundido = geometriaFundida === null || material === null ? null : { geometria: geometriaFundida, material };

  /* La reja que sube y baja, suelta. */
  let reja: PiezaSuelta | null = null;
  const geometriaDeLaReja = unaGeometria(partesDe(PIEZA.verjaPuerta));
  if (geometriaDeLaReja !== null) {
    if (geometriaDeLaReja !== partesDe(PIEZA.verjaPuerta)[0]?.geometria) propias.push(geometriaDeLaReja);
    const materialDeLaReja = partesDe(PIEZA.verjaPuerta)[0]?.material ?? material;
    reja = { geometria: geometriaDeLaReja, material: materialDeLaReja as THREE.Material, puesta: laQueSube };
  }

  /* Las nubes, instanciadas por pieza, sólo en plena. */
  const nubes: Nubes[] = [];
  if (calidad === 'plena') {
    const porNube = new Map<NombreDePieza, Puesta[]>();
    for (const n of campo(semilla).nubes) porNube.set(n.pieza, [...(porNube.get(n.pieza) ?? []), n]);
    for (const [pieza, puestas] of porNube) {
      const g = unaGeometria(partesDe(pieza));
      const m = partesDe(pieza)[0]?.material;
      if (g === null || m === undefined) continue;
      if (g !== partesDe(pieza)[0]?.geometria) propias.push(g);
      nubes.push({ geometria: g, material: m, puestas });
    }
  }

  /* Las piezas que se instancian por la partida: casa y peón a gris, bandera y moneda tal cual. */
  const dinamica = (pieza: NombreDePieza, aGris: boolean): THREE.BufferGeometry | null => {
    const g = unaGeometria(partesDe(pieza));
    if (g === null) return null;
    if (g !== partesDe(pieza)[0]?.geometria) propias.push(g);
    return aGris ? geometriaParaInstanciar(pieza, g) : g;
  };

  return {
    fundido,
    material,
    aspas,
    reja,
    nubes,
    casa: dinamica(PIEZA.casa, true),
    peon: dinamica(PIEZA.peon, true),
    bandera: dinamica(PIEZA.bandera, false),
    moneda: dinamica(PIEZA.moneda, false),
    soltar: () => {
      soltarTintesDeGeometrias(propias);
      for (const g of propias) g.dispose();
    },
  };
}

/** Las dos puestas de `muro-reja` de la Mazmorra, en el mundo. */
function puestasDesLasRejas(): Puesta[] {
  return puestasDeLasEsquinas().filter((p) => p.pieza === PIEZA.verjaPuerta);
}

/* ─────────────────────────────── El suelo propio ─────────────────────────────── */

interface Suelo {
  readonly geometria: THREE.BufferGeometry;
  /** Por casilla lateral, el tramo de vértices de su acera (desde, hasta) para repintarla. */
  readonly aceras: ReadonlyMap<number, { readonly desde: number; readonly hasta: number }>;
}

/**
 * EL SUELO DEL ANILLO, GEOMETRÍA PROPIA CON COLOR POR VÉRTICE.
 *
 * ═══ LOS CUADROS NO SE VUELVEN A CALCULAR AQUÍ: SE PIDEN ═══
 *
 * La primera versión de esta función repetía la aritmética de `suelosDeLaCasilla` —las
 * cuatro bandas, el canto del reborde, los dos tramos de marco de una esquina— con las
 * mismas constantes pero escrita otra vez. El resultado era que `verify:burgo-escena` medía
 * `suelosDelAnillo()`, que NADIE dibujaba, y la escena dibujaba una copia que el comprobador
 * no miraba nunca. Es el fallo de «el comprobador verde por filtro roto» con otro traje:
 * dos verdades sobre lo mismo, y sólo una vigilada. Ahora hay una: `anillo-en-3d.ts` dice
 * dónde van los cuadros y aquí sólo se les da color y se enhebran.
 *
 * Lo que se añade encima son los dos cuadros que NO son del anillo: el suelo del recinto de la
 * ciudad y la tierra bajo el campo. El paño de dados que hubo en el campo se fue con los dados a la
 * pantalla (la caja del Burgo, `bandeja-de-los-dados.ts`).
 *
 * El color de la FRANJA es el del barrio y se REESCRIBE por vértice cuando cambia la vista o
 * se empeña (nunca con opacidad), así que de cada casilla se guarda el tramo de vértices de
 * sus cuadros `franja` y `reborde`. Las cuentas están en `presupuesto.ts`.
 */
/**
 * UN CUADRO ENHEBRADO EN DOS TRIÁNGULOS, con su color y su normal en cada vértice. Devuelve cuántos
 * vértices añade: seis, o ninguno si le faltan puntos.
 */
function enhebrarCuadro(
  destino: { readonly posiciones: number[]; readonly colores: number[]; readonly normales: number[] },
  puntos: readonly (readonly [number, number, number])[],
  color: THREE.Color,
  normal: readonly [number, number, number],
): number {
  const [a, b, c, d] = puntos as readonly [number, number, number][];
  if (a === undefined || b === undefined || c === undefined || d === undefined) return 0;
  /*
   * EL SENTIDO DE GIRO SE DERIVA DE LA NORMAL PEDIDA, no se supone: la primera versión
   * escribía los cuatro puntos en un orden fijo y en las casillas laterales la cara
   * salía mirando hacia ABAJO (el producto vectorial daba −y), así que la calle y el
   * solar se pintaban a oscuras —iluminados por el suelo del hemisferio— sin error.
   */
  const nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
  const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
  const nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const alDerecho = nx * normal[0] + ny * normal[1] + nz * normal[2] >= 0;
  for (const v of alDerecho ? [a, b, c, c, d, a] : [a, d, c, c, b, a]) {
    destino.posiciones.push(v[0], v[1], v[2]);
    destino.colores.push(color.r, color.g, color.b);
    destino.normales.push(normal[0], normal[1], normal[2]);
  }
  return 6;
}

function construirSuelo(): Suelo {
  const posiciones: number[] = [];
  const colores: number[] = [];
  const normales: number[] = [];
  const aceras = new Map<number, { desde: number; hasta: number }>();
  let vertices = 0;
  const color = new THREE.Color();
  const cuadro = (puntos: readonly (readonly [number, number, number])[], hex: string, normal: readonly [number, number, number]): void => {
    color.set(hex);
    vertices += enhebrarCuadro({ posiciones, colores, normales }, puntos, color, normal);
  };
  let casillaEnCurso = -1;
  let desdeDeLaAcera = 0;
  for (const q of suelosDelAnillo()) {
    if (q.papel === 'franja') {
      casillaEnCurso = q.casilla;
      desdeDeLaAcera = vertices;
    }
    cuadro(q.puntos, COLOR_DEL_SUELO[q.papel], q.normal);
    if (q.papel === 'reborde' && casillaEnCurso === q.casilla) aceras.set(q.casilla, { desde: desdeDeLaAcera, hasta: vertices });
  }
  /* El suelo del recinto y la tierra bajo el campo: no son del anillo. */
  const llano = (lado: number, y: number, hex: string): void => {
    const m = lado / 2;
    cuadro(
      [
        [-m, y, -m],
        [-m, y, m],
        [m, y, m],
        [m, y, -m],
      ],
      hex,
      [0, 1, 0],
    );
  };
  llano(LADO_INTERIOR, 0, COLOR_DEL_SUELO.recinto);
  llano(LADO_DE_LA_TIERRA, -0.03, COLOR_DE_LA_TIERRA);

  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.BufferAttribute(new Float32Array(posiciones), 3));
  geometria.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colores), 3));
  geometria.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normales), 3));
  geometria.computeBoundingSphere();
  return { geometria, aceras };
}

/** Los vértices del fieltro de la caja: la primera cara de `carasDeLaCaja`, seis vértices. */
const VERTICES_DEL_FIELTRO = 6;
/** Lo que hace el asa propia del reloj de arena, que en la caja del Burgo va apagada: nada. */
const NADA_QUE_HACER = (): void => undefined;

/** Pinta el fieltro de la caja del Burgo del color de quien tira (`colorDelFieltro`). */
function pintaElFieltro(caja: THREE.BufferGeometry, hex: string): void {
  const color = caja.getAttribute('color') as THREE.BufferAttribute;
  auxColor.set(hex);
  for (let i = 0; i < VERTICES_DEL_FIELTRO; i++) color.setXYZ(i, auxColor.r, auxColor.g, auxColor.b);
  color.needsUpdate = true;
}

/*
 * EL RELOJ DE ARENA DE RIBERAS se trae con `relojDe`, el cargador común (`comun/reloj.ts`), y sólo en la
 * calidad plena: pesa veinte mil triángulos y un móvil no los tiene, así que en la sobria no se pide y la
 * caja se queda con el asa, que es lo que cuenta su presupuesto.
 *
 * Aquí hubo una copia suya, `relojDelBurgoDe`, con su propia caché contra el mismo `traer` —el mismo
 * fichero bajado dos veces si el cliente pasaba de Las Lindes al Burgo— y un aviso que decía «se pinta
 * el de conos» cuando el reloj de conos ya no existía. El trato es el de siempre y está escrito allí: si
 * no llega NO se avisa por `alFallar` —el escritorio del Burgo mandaría la partida entera al tablero
 * dibujado por un fichero de arte—, se dice por consola.
 */

/** Pinta la acera de una casilla con su color, apagado al tanto que se diga (1 = entera). */
function pintaLaAcera(suelo: Suelo, casilla: CasillaEn3D, luminancia: number): void {
  const tramo = suelo.aceras.get(casilla.indice);
  if (tramo === undefined) return;
  const color = suelo.geometria.getAttribute('color') as THREE.BufferAttribute;
  auxColor.set(casilla.colorDelBarrio ?? COLOR_DE_LA_FRANJA_SIN_BARRIO).multiplyScalar(luminancia);
  for (let i = tramo.desde; i < tramo.hasta; i++) color.setXYZ(i, auxColor.r, auxColor.g, auxColor.b);
  color.needsUpdate = true;
}

/* ─────────────────────────────── El cielo ─────────────────────────────── */

/** La cúpula con degradado por vértice: azul arriba, crema en el horizonte. Sin sombreador con tiempo. */
function geometriaDelCielo(): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(RADIO_DEL_CIELO, SEGMENTOS_DEL_CIELO.ancho, SEGMENTOS_DEL_CIELO.alto);
  const pos = g.getAttribute('position');
  const colores = new Float32Array(pos.count * 3);
  const cenit = new THREE.Color(COLOR_DEL_CENIT);
  const horizonte = new THREE.Color(COLOR_DEL_HORIZONTE);
  for (let i = 0; i < pos.count; i++) {
    const u = pinza(pos.getY(i) / RADIO_DEL_CIELO, 0, 1);
    const t = Math.sqrt(u);
    auxColor.copy(horizonte).lerp(cenit, t);
    colores[i * 3] = auxColor.r;
    colores[i * 3 + 1] = auxColor.g;
    colores[i * 3 + 2] = auxColor.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colores, 3));
  return g;
}

/* ─────────────────────────────── Ayudas de estado ─────────────────────────────── */

interface Asiento {
  readonly figura: FiguraEn3D;
  readonly indice: number;
}

/** Los sucesos que ponen a un asiento en pie: antes hay que despedir al que estuviera. */
function poneEnPie(s: SucesoDelBurgo): boolean {
  return s.que === 'mueve' || s.que === 'a-la-mazmorra' || s.que === 'sale-de-la-mazmorra' || s.que === 'quiebra';
}

function quienDe(s: SucesoDelBurgo): string | null {
  return 'quien' in s ? s.quien : null;
}

/** El estado de un peón que acaba de nacer con lo que dice la vista: sin animar. */
function nacidoDeLaVista(f: FiguraEn3D, indice: number, semilla: number, ahora: number): EstadoDelPeon {
  const e = nacer(f.casilla, (semilla ^ (indice + 1) * 0x9e37_79b9) >>> 0, ahora, indice);
  return { ...e, fase: f.presa ? 'preso' : 'quieto', presa: f.presa, quebrada: f.quebrada };
}

/** El punto de un peón (o del Concejo si `asiento` es null) para que las monedas sepan de dónde a dónde. */
function puntoDelDinero(asiento: string | null, casilla: number, asientos: readonly Asiento[], peones: ReadonlyMap<string, EstadoDelPeon>): Punto {
  if (asiento === null) return EL_CONCEJO;
  const a = asientos.find((x) => x.figura.asiento === asiento);
  const e = a === undefined ? undefined : peones.get(asiento);
  const donde = e === undefined ? casilla : e.enCasilla;
  return huecoDePeon(donde, a?.indice ?? 0);
}

/** El centro de la calle de una casilla: donde se pone la marca. */
function centroDeLaMarca(casilla: number): Punto {
  const m = marcoDeCasilla(casilla);
  return m.centro;
}

/** El suelo mientras se mira la mesa: nadie pregunta, y derivar el de verdad no se paga ahí. */
const SIN_SUELO = (): number => 0;

/**
 * SI LA FIGURA DE QUIEN ANDA NO LLEGA, SE DICE Y SE SIGUE ANDANDO. No por `alFallar`: el escritorio
 * manda la partida entera al tablero dibujado con cualquier aviso de ésos, y una figura que no
 * baja no puede tirar el anillo —es el mismo trato que el reloj de arena, `relojDe`—. Se
 * anda sin verla, que es lo que ya pasa en primera persona. A nivel de módulo para ser la misma
 * función siempre: `QuienAnda` vuelve a pedir la figura si cambia.
 */
function avisaQueNoLlegaQuienAnda(motivo: string): void {
  console.warn(`La figura de quien anda por el burgo no ha llegado (${motivo}): se anda sin verla.`);
}

/* ─────────────────────────────── La escena entera ─────────────────────────────── */

export function Burgo(props: PropsDelBurgo): JSX.Element {
  const { tablero, dados, sucesos, codigo, traer, calidad, quieto, seguirAlQueMueve } = props;
  const plena = calidad === 'plena';
  const anillo: AnilloEn3D = ANILLO_DEL_BURGO;

  /* Los avisos van por referencia: el hilo de dibujo llama siempre a la versión de este render. */
  const avisos = useRef(props);
  avisos.current = props;
  const vivo = useRef(true);
  useEffect(
    () => () => {
      vivo.current = false;
    },
    [],
  );
  const falla = (motivo: string): void => {
    if (vivo.current) avisos.current.alFallar?.(motivo);
  };

  // -------------------------------------------------------------------------
  // La carga: burgo.glb, dados.glb, las figuras de los sentados y la biblioteca
  // -------------------------------------------------------------------------

  const [catalogo, ponerCatalogo] = useState<CatalogoDeModelos | null>(null);
  const [catalogoDeDados, ponerCatalogoDeDados] = useState<CatalogoDeModelos | null>(null);

  /* Cuando los dos `.glb` han llegado o fallado, arranca: `arrancar` es el del gancho de arranque, más abajo. */
  useEffect(() => {
    const burgo = catalogoDelBurgoDe(traer).then(
      (c) => {
        if (vivo.current) ponerCatalogo(c);
      },
      (fallo: unknown) => {
        falla(`no ha llegado el burgo (${rutaDelBurgo()}): ${fallo instanceof Error ? fallo.message : String(fallo)}`);
      },
    );
    const losDados = catalogoDeLosDadosDe(traer, falla).then((c) => {
      if (vivo.current && c !== null) ponerCatalogoDeDados(c);
    });
    void Promise.all([burgo, losDados]).then(() => {
      if (vivo.current) arrancar();
    });
  }, [traer]);

  const cargador = useMemo(() => cargadorPara(traer), [traer]);
  const [figuras, ponerFiguras] = useState<ReadonlyMap<FiguraId, AventureroCargado>>(new Map());
  const [biblioteca, ponerBiblioteca] = useState<readonly THREE.AnimationClip[]>([]);
  const pedidas = useRef(new Set<FiguraId>());
  const bibliotecaPedida = useRef(false);
  const figurasQueHacenFalta = useMemo(() => {
    const lista: FiguraId[] = [];
    for (const f of tablero.figuras) if (!lista.includes(f.figura)) lista.push(f.figura);
    return lista;
  }, [tablero.figuras]);

  /* Sólo en plena: en sobria no hay aventurero y no se baja nada. Se precargan TODAS las figuras (memoria, no llamadas). */
  useEffect(() => {
    if (!plena) return;
    const pideBiblioteca = (): void => {
      if (bibliotecaPedida.current) return;
      bibliotecaPedida.current = true;
      cargador.animaciones().then(
        (clips) => {
          if (vivo.current) ponerBiblioteca(clips);
        },
        (fallo: unknown) => {
          falla(`no han llegado las animaciones de los aventureros: ${fallo instanceof Error ? fallo.message : String(fallo)}`);
        },
      );
    };
    for (const id of figurasQueHacenFalta) {
      if (pedidas.current.has(id)) continue;
      pedidas.current.add(id);
      cargador.aventurero(id).then(
        (a) => {
          if (!vivo.current) return;
          ponerFiguras((antes) => {
            const nuevas = new Map(antes);
            nuevas.set(id, a);
            return nuevas;
          });
          pideBiblioteca();
        },
        (fallo: unknown) => {
          falla(`no ha llegado la figura «${datosDeFigura(id).nombre}»: ${fallo instanceof Error ? fallo.message : String(fallo)}`);
          pideBiblioteca();
        },
      );
    }
  }, [cargador, figurasQueHacenFalta, plena]);

  // -------------------------------------------------------------------------
  // El mundo fijo, el suelo, el cielo y los materiales propios
  // -------------------------------------------------------------------------

  const semilla = useMemo(() => semillaDelCampo(codigo), [codigo]);
  const mundo = useMemo(() => (catalogo === null ? null : construirMundo(catalogo, semilla, calidad)), [catalogo, semilla, calidad]);
  useEffect(() => () => mundo?.soltar(), [mundo]);

  const suelo = useMemo(construirSuelo, []);
  useEffect(() => () => suelo.geometria.dispose(), [suelo]);

  /*
   * ─ LA CAJA DEL BURGO (`bandeja-de-los-dados.ts`). ─
   *
   * Su sitio y su forma se recalculan al cambiar el lienzo o la esquina, no por fotograma; su fieltro
   * se repinta con el color de quien tira —el del sorteo mientras se sortea, y si no el de quien tiene
   * el turno—; y sus piezas se recolocan cuando cambia lo que enseñan: el dinero, las casas del
   * Concejo y las cartas.
   */
  const tamanoDelLienzo = useThree((s) => s.size);
  const campoDeLaCamara = useThree((s) => (s.camera as THREE.PerspectiveCamera).fov);
  const esquinaDeLaBandeja = props.bandejaDeLosDados?.esquina ?? SITIO_DE_LA_BANDEJA_POR_DEFECTO.esquina;
  const margenDeLaBandeja = props.bandejaDeLosDados?.margen ?? SITIO_DE_LA_BANDEJA_POR_DEFECTO.margen;
  /* Lo que la aparta de los mandos de un teléfono a pie (ver `SitioDeLaBandeja`): sin ellos, lo de siempre. */
  const apartadoVertical = props.bandejaDeLosDados?.apartadoVertical;
  const apartadoDerecho = props.bandejaDeLosDados?.apartadoDerecho;
  const anchoMaximoDeLaBandeja = props.bandejaDeLosDados?.anchoMaximo;
  const poseDeLaBandejaEnPantalla = useMemo(
    () =>
      poseDeLaBandeja(Math.max(1, tamanoDelLienzo.width), Math.max(1, tamanoDelLienzo.height), campoDeLaCamara, {
        esquina: esquinaDeLaBandeja,
        margen: margenDeLaBandeja,
        apartadoVertical,
        apartadoDerecho,
        anchoMaximo: anchoMaximoDeLaBandeja,
      }),
    [tamanoDelLienzo.width, tamanoDelLienzo.height, campoDeLaCamara, esquinaDeLaBandeja, margenDeLaBandeja, apartadoVertical, apartadoDerecho, anchoMaximoDeLaBandeja],
  );
  const forma = poseDeLaBandejaEnPantalla.forma;
  const plano = useMemo(() => planoDeLaBandeja(forma), [forma]);
  const huecosDeLosDadosRef = useRef(huecosDeLosDados(forma));
  huecosDeLosDadosRef.current = useMemo(() => huecosDeLosDados(forma), [forma]);
  const cajaGeometria = useMemo(() => geometriaDeLaCaja(forma), [forma]);
  useEffect(() => () => cajaGeometria?.dispose(), [cajaGeometria]);
  const asaDeLosDados = useMemo(() => cajaDelAsaDeLosDados(forma), [forma]);
  const asaDeLosDadosGeometria = useMemo(() => new THREE.BoxGeometry(asaDeLosDados.ancho, asaDeLosDados.alto, asaDeLosDados.fondo), [asaDeLosDados]);
  useEffect(() => () => asaDeLosDadosGeometria.dispose(), [asaDeLosDadosGeometria]);
  const asaParaPasar = useMemo(() => cajaDelAsaDelReloj(forma), [forma]);
  const asaParaPasarGeometria = useMemo(() => new THREE.BoxGeometry(asaParaPasar.ancho, asaParaPasar.alto, asaParaPasar.fondo), [asaParaPasar]);
  useEffect(() => () => asaParaPasarGeometria.dispose(), [asaParaPasarGeometria]);
  const piezasDeLaCaja = useMemo(
    () => ({
      casita: geometriaDeUnaCasita(),
      hotelito: geometriaDeUnHotelito(),
      billete: geometriaDeUnBillete(),
      colorDelBillete: geometriaDelColorDeUnBillete(),
    }),
    [],
  );
  useEffect(
    () => () => {
      const p = piezasDeLaCaja;
      for (const g of [p.casita, p.hotelito, p.billete, p.colorDelBillete]) g?.dispose();
    },
    [piezasDeLaCaja],
  );
  const delanteDeLaTirada = dados?.delanteDe ?? null;
  const colorDeLaTirada =
    (delanteDeLaTirada === null ? undefined : tablero.figuras.find((f) => f.asiento === delanteDeLaTirada)?.color) ?? tablero.figuras.find((f) => f.leToca)?.color ?? null;
  useLayoutEffect(() => {
    if (cajaGeometria !== null) pintaElFieltro(cajaGeometria, colorDelFieltro(colorDeLaTirada));
  }, [cajaGeometria, colorDeLaTirada]);
  /* El dinero es el de quien mira; para un mirón, el de quien tiene el turno. */
  const dineroALaVista = (tablero.figuras.find((f) => f.esLocal) ?? tablero.figuras.find((f) => f.leToca))?.dinero ?? null;
  const textoDeLaPlaca = dineroALaVista === null ? '' : textoDelDinero(dineroALaVista);
  const placaGeometria = useMemo(() => (textoDeLaPlaca === '' ? null : geometriaDeLaPlacaConSuCantidad(textoDeLaPlaca)), [textoDeLaPlaca]);
  useEffect(() => () => placaGeometria?.dispose(), [placaGeometria]);
  const casitas = useRef<THREE.InstancedMesh>(null);
  const hotelitos = useRef<THREE.InstancedMesh>(null);
  const billetes = useRef<THREE.InstancedMesh>(null);
  const coloresDeLosBilletes = useRef<THREE.InstancedMesh>(null);
  const { casas: casasDelConcejo, posadas: hotelesDelConcejo, cartas: cartasDelConcejo } = tablero.banca;
  const mazosGeometria = useMemo(() => geometriaDeLosMazos(forma, { pregon: cartasDelConcejo.pregon, arca: cartasDelConcejo.arca }), [forma, cartasDelConcejo.pregon, cartasDelConcejo.arca]);
  useEffect(() => () => mazosGeometria?.dispose(), [mazosGeometria]);
  useLayoutEffect(() => {
    const escribe = (malla: THREE.InstancedMesh | null, sitios: readonly Punto[], cuantos: number): void => {
      if (malla === null) return;
      const n = Math.max(0, Math.min(sitios.length, Math.floor(cuantos)));
      for (let k = 0; k < n; k++) {
        const s = sitios[k] as Punto;
        malla.setMatrixAt(k, auxMatriz.compose(auxPosicion.set(s.x, 0, s.z), auxGiro.identity(), auxEscala.set(1, 1, 1)));
      }
      malla.count = n;
      malla.instanceMatrix.needsUpdate = true;
      malla.computeBoundingSphere();
    };
    escribe(casitas.current, sitiosDeLasCasas(forma), casasDelConcejo);
    escribe(hotelitos.current, sitiosDeLosHoteles(forma), hotelesDelConcejo);
  }, [forma, casasDelConcejo, hotelesDelConcejo, piezasDeLaCaja]);
  useLayoutEffect(() => {
    const papel = billetes.current;
    const color = coloresDeLosBilletes.current;
    if (papel === null || color === null) return;
    let n = 0;
    if (dineroALaVista !== null) {
      billetesDeLaCantidad(dineroALaVista).forEach((cuantos, i) => {
        const billete = BILLETES[i];
        if (billete === undefined) return;
        auxColor.set(billete.color);
        for (let k = 0; k < cuantos && n < BILLETES_A_LA_VISTA; k++) {
          const s = sitioDelBillete(forma, billete.valor, k);
          auxMatriz.compose(auxPosicion.set(s.x, s.y, s.z), auxGiro.setFromAxisAngle(EJE_Y, s.giro), auxEscala.set(1, 1, 1));
          papel.setMatrixAt(n, auxMatriz);
          color.setMatrixAt(n, auxMatriz);
          color.setColorAt(n, auxColor);
          n++;
        }
      });
    }
    for (const malla of [papel, color]) {
      malla.count = n;
      malla.instanceMatrix.needsUpdate = true;
      if (malla.instanceColor !== null) malla.instanceColor.needsUpdate = true;
      malla.computeBoundingSphere();
    }
  }, [forma, dineroALaVista, piezasDeLaCaja]);

  /*
   * ─ EL RELOJ DE ARENA. ─ El de Riberas en la calidad plena, clonado, normalizado a una unidad de alto
   * y con sus dos montones medidos por dónde están —el de arriba tiene el centro más alto—; en la
   * sobria, el asa y nada más. Lo mueve el `useFrame` de la escena: la arena con la
   * fracción de turno, el giro al cambiar de turno y el vaciado de golpe al pasarlo.
   */
  const [modeloDelReloj, ponerModeloDelReloj] = useState<RelojCargado | null>(null);
  useEffect(() => {
    if (!plena) return;
    void relojDe(traer).then((m) => {
      if (vivo.current) ponerModeloDelReloj(m);
    });
  }, [plena, traer]);
  const relojMontado = useMemo(() => {
    if (!plena || modeloDelReloj === null) return null;
    const dentro = SkeletonUtils.clone(modeloDelReloj.escena);
    const caja = new THREE.Box3().setFromObject(dentro);
    const tamano = caja.getSize(new THREE.Vector3());
    /*
     * CABE EN EL CILINDRO DE `ENVOLVENTE_DEL_RELOJ`, que es lo que la composición le reserva: un lado de
     * alto, y menos si por ancho no cupiera. Centrado de lado, y con la base en lo más bajo del cilindro,
     * que es la mesa en la que apoya la caja.
     */
    const medida = Math.max(1e-6, tamano.y / ENVOLVENTE_DEL_RELOJ.alto, Math.max(tamano.x, tamano.z) / (2 * ENVOLVENTE_DEL_RELOJ.radio));
    const centro = caja.getCenter(new THREE.Vector3());
    dentro.position.set(-centro.x / medida, -caja.min.y / medida - ENVOLVENTE_DEL_RELOJ.alto / 2, -centro.z / medida);
    dentro.scale.multiplyScalar(1 / medida);
    const clon = new THREE.Group();
    clon.add(dentro);
    const mezclador = new THREE.AnimationMixer(dentro);
    for (const clip of modeloDelReloj.clips) mezclador.clipAction(clip).play();
    const conAltura: { malla: THREE.Mesh; altura: number }[] = [];
    dentro.traverse((n) => {
      const m = n as THREE.Mesh;
      if (!m.isMesh || (m.morphTargetInfluences?.length ?? 0) === 0) return;
      m.geometry.computeBoundingBox();
      const c = m.geometry.boundingBox;
      conAltura.push({ malla: m, altura: c === null ? 0 : (c.min.y + c.max.y) / 2 });
    });
    conAltura.sort((a, b) => b.altura - a.altura);
    /*
     * LOS GRANOS, EN UNA LLAMADA Y NO EN CINCUENTA. El modelo trae cincuenta nodos que comparten una malla
     * de dos triángulos, y `three` dibuja cada uno por su lado: medido en el banco, el reloj sólo subía la
     * escena de 117 a 207 llamadas de dibujo, con un tope de 150. Cada grano cuelga de su propio nodo, que
     * es el que anima el clip, y todos esos nodos cuelgan de uno común. Así que los granos se apagan —el
     * mezclador sigue moviendo sus nodos— y una malla instanciada colgada de ese nodo común copia en cada
     * fotograma la matriz del nodo de cada grano por la del grano.
     */
    const granos: THREE.Mesh[] = [];
    dentro.traverse((n) => {
      const m = n as THREE.Mesh;
      if (m.isMesh && (m.morphTargetInfluences?.length ?? 0) === 0 && /Instancer/i.test(m.name)) granos.push(m);
    });
    const primero = granos[0];
    const comun = primero?.parent?.parent ?? null;
    let chorro: THREE.InstancedMesh | null = null;
    if (primero !== undefined && comun !== null && granos.every((g) => g.parent !== null && g.parent.parent === comun)) {
      chorro = new THREE.InstancedMesh(primero.geometry, primero.material, granos.length);
      chorro.frustumCulled = false;
      chorro.raycast = () => undefined;
      comun.add(chorro);
      for (const g of granos) g.visible = false;
    }
    return { clon, mezclador, montones: conAltura.map((c, i) => ({ malla: c.malla, arriba: i === 0 })), granos: chorro === null ? [] : granos, chorro };
  }, [plena, modeloDelReloj]);
  useEffect(
    () => () => {
      if (relojMontado === null) return;
      relojMontado.mezclador.stopAllAction();
      relojMontado.mezclador.uncacheRoot(relojMontado.clon.children[0] ?? relojMontado.clon);
    },
    [relojMontado],
  );
  const relojMontadoRef = useRef(relojMontado);
  relojMontadoRef.current = relojMontado;
  const cuerpoDelReloj = useRef<THREE.Group>(null);
  const asaDelReloj = useRef<THREE.Mesh>(null);
  const estadoDelReloj = useRef<{ vueltaPintada: number | null; girando: { desde: number } | null; vaciando: number | null; sePulso: boolean }>({ vueltaPintada: null, girando: null, vaciando: null, sePulso: false });

  /*
   * ─ LA CIUDAD: se genera de la semilla de la mesa y se pasa a geometría con el catálogo. ─
   *
   * `ciudadDelCodigo` es aritmética pura y tarda unas decenas de milisegundos: se hace UNA
   * vez por código y calidad, mientras el telón está bajado (antes de `alEstarListo`), y no
   * se vuelve a tocar. Lo que cambia por fotograma es sólo el REPARTO por niveles.
   */
  const ciudad = useMemo(() => ciudadDelCodigo(codigo, RECINTO_DEL_BURGO, calidad), [codigo, calidad]);
  const laCiudad = useMemo(
    () => (catalogo === null || mundo === null || mundo.material === null ? null : construirLaCiudad(ciudad, catalogo, mundo.material)),
    [ciudad, catalogo, mundo],
  );
  useEffect(() => () => laCiudad?.soltar(), [laCiudad]);
  useEffect(() => soltarLosBultos, []);

  /*
   * ═══ A PIE: EL PASEO COMÚN, CON EL MUNDO DE LA MESA Y LO QUE SÓLO SABE ESTA CIUDAD ═══
   *
   * La misma llamada que `Lindes.tsx`, y a propósito: el paseo, los choques, las cámaras de a pie,
   * las teclas y la marioneta son de `escenas/paseo/`, y el canal de Boots on Board se enchufa aquí
   * igual que allí (justo debajo). Esta escena sólo le da lo suyo:
   *
   *   · EL MUNDO, que es `mundoDelBurgo(código)`: la traza y lo sólido de los distritos, igual en
   *     todas las calidades y el mismo que derivará el servidor. Es ESTÁTICO —las casas que se
   *     compran son fichas, no mundo—, así que se deriva UNA vez por código, y la primera vez que se
   *     baja a andar: medido en Node, de 2 a 15 ms, y en el Hermes del móvil, sin JIT, bastante
   *     más. Mirando la mesa, que es casi toda la partida, no se paga.
   *   · DE QUÉ SITIO SE NACE: el del asiento de quien anda (`sitioDeNacerEnElBurgo`).
   *   · A QUÉ ALTURA ESTÁ EL SUELO QUE SE PINTA (`sueloDelBurgo`), que no decide nada.
   */
  const modoDelPaseo = modoDelPaseoDe(props.camara);
  const aPie = modoDelPaseo !== 'mesa';
  const quienAnda = asientoQueAnda(props.camara);
  const mundoRecordado = useRef<{ readonly codigo: string; readonly mundo: MundoDeclarado } | null>(null);
  const mundoAPie = useMemo(() => {
    if (!aPie) return null;
    const hecho = mundoRecordado.current;
    if (hecho !== null && hecho.codigo === codigo) return hecho.mundo;
    const deLaMesa = mundoDelBurgo(codigo);
    mundoRecordado.current = { codigo, mundo: deLaMesa };
    return deLaMesa;
  }, [aPie, codigo]);
  const naceQuienAnda = useMemo(() => (mundoAPie === null ? null : sitioDeNacerEnElBurgo(mundoAPie.nace, tablero.figuras, quienAnda)), [mundoAPie, tablero.figuras, quienAnda]);
  const alturaDelSuelo = useMemo(() => (aPie ? sueloDelBurgo(ciudad) : SIN_SUELO), [aPie, ciudad]);
  /*
   * LO QUE ESTORBA A LA VISTA: el adorno de la ciudad que se pinta —mobiliario, coches aparcados,
   * marquesinas…—, medido en el catálogo, para que la cámara de hombro no se quede detrás de una
   * señal de tráfico (`estorbos-del-burgo.ts`). No choca ni viaja. Una vez por ciudad, y sólo a pie.
   */
  const estorbosAPie = useMemo(
    () => (!aPie || catalogo === null ? null : indiceDeEstorbos(estorbosDelBurgo(ciudad, rodajasDelCatalogo(catalogo)))),
    [aPie, catalogo, ciudad],
  );
  /*
   * ═══ EL CANAL, SÓLO SI LA MESA ES DE BOTAS ═══
   *
   * Lo mismo que en `Lindes.tsx`. Sin la prop no se abre nada y `alDarUnTic` es `undefined`: una
   * mesa normal no paga ni una llamada por tic. Con ella, el paseo le da cada tic al canal (la
   * costura a) y el canal pone a quien anda donde dice el servidor (la costura b), que llega por una
   * referencia porque el paseo se monta después. El canal se queda abierto también mirando la mesa:
   * al bajar, los demás ya están donde están, y un `dentro` que llegue antes de nacer se guarda y se
   * nace ahí (ver `paseo/usar-el-paseo.ts`). La refriega, por los mismos hilos que en Las Lindes: el
   * paseo pregunta si quien anda está en el suelo (`caido`) y `QuienAnda` cómo va (`cliente`).
   */
  const corregirAQuienPasea = useRef<(sitio: Andante) => void>(() => undefined);
  const elCanal = usarElCanal(props.canal, corregirAQuienPasea, props.alRecoger);
  const paseo = usarElPaseo({
    mundo: mundoAPie,
    nace: naceQuienAnda,
    modo: modoDelPaseo,
    mandos: props.mandos,
    alturaEn: alturaDelSuelo,
    estorbos: estorbosAPie,
    alDarUnTic: elCanal.alDarUnTic,
    caido: elCanal.caido,
  });
  useEffect(() => {
    corregirAQuienPasea.current = paseo.corregir;
  }, [paseo.corregir]);
  const figuraQueAnda = tablero.figuras.find((f) => f.asiento === quienAnda)?.figura;

  /*
   * ═══ A PIE, LA CÁMARA ES DEL PASEO, LA ESCRIBA QUIEN LA ESCRIBA DESPUÉS ═══
   *
   * El paseo común pone la cámara de hombro o de ojos con prioridad −1, antes que nadie. Pero en
   * el Burgo la cámara de MESA la pone el cliente, en cada fotograma y con prioridad 0 —el ojo del
   * mirador táctil en la app, `CamaraAerea` en el escritorio—, y montada ANTES que esta escena, así
   * que corre después del paseo y lo pisaría. Apagarla no está en manos de la escena, y
   * desmontarla a pie y volverla a montar en la mesa la dejaría suscrita DETRÁS de la escena, que
   * es justo lo que rompe «seguir al que mueve» (la cabecera lo cuenta: el cliente va delante).
   *
   * Así que se guarda la cámara que el paseo acaba de poner —con −1 y detrás de él, porque se
   * apunta después— y se vuelve a poner en el primer `useFrame` de prioridad 0 de la escena, que
   * corre DESPUÉS del del cliente y ANTES que todo lo que aquí se lee de la cámara: el reparto de
   * la ciudad por cercanía, el naipe y la caja pegada a la pantalla. Prioridad NEGATIVA, que no le
   * quita a r3f el pintar solo: eso sólo lo hace una positiva (`usar-el-paseo.ts` lo cuenta).
   */
  const camaraDelPaseo = useRef({ posicion: new THREE.Vector3(), giro: new THREE.Quaternion() });
  useFrame((s) => {
    if (!aPie) return;
    camaraDelPaseo.current.posicion.copy(s.camera.position);
    camaraDelPaseo.current.giro.copy(s.camera.quaternion);
  }, -1);
  const laNiebla = useRef<THREE.Fog>(null);
  useFrame((s) => {
    /* La niebla de la mesa se aparta detrás del tablero; la de a pie se acerca y manda en el detalle. */
    const n = laNiebla.current;
    if (n !== null) {
      n.near = aPie ? NIEBLA_A_PIE.cerca : laNieblaDeLaMesa.cerca;
      n.far = aPie ? NIEBLA_A_PIE.lejos : laNieblaDeLaMesa.lejos;
    }
    if (!aPie) return;
    s.camera.position.copy(camaraDelPaseo.current.posicion);
    s.camera.quaternion.copy(camaraDelPaseo.current.giro);
  });

  /* Los precios y los emblemas: no cambian con la partida, así que van fundidos y son UNA llamada. */
  const rotulos = useMemo(geometriaDeLosRotulos, []);
  useEffect(() => () => rotulos?.geometria.dispose(), [rotulos]);
  /* Las obras de las casillas: asfalto, rayas y carteles, todas en una malla y una llamada. */
  const obras = useMemo(geometriaDeLasObras, []);
  useEffect(() => () => obras?.dispose(), [obras]);
  /* Y el tren, que va aparte porque anda: una malla, dos instancias, una llamada. */
  const trenGeometria = useMemo(geometriaDeUnTren, []);
  useEffect(() => () => trenGeometria?.dispose(), [trenGeometria]);
  /* El precinto de la hipoteca: una geometría, instanciada una vez por casilla hipotecada. */
  const precintoGeometria = useMemo(geometriaDelPrecinto, []);
  useEffect(() => () => precintoGeometria?.dispose(), [precintoGeometria]);
  const precintos = useRef<THREE.InstancedMesh>(null);
  const trenes = useRef<THREE.InstancedMesh>(null);
  const laVia = useMemo(() => ({ largo: largoDeLaVia(), paradas: paradasDelTren() }), []);
  /* Las tres piezas vivas de las casillas: las tapas de los cofres, las ruletas y la joya. */
  const tapaGeometria = useMemo(geometriaDeLaTapa, []);
  const ruletaGeometria = useMemo(geometriaDeLaRuleta, []);
  const joyaGeometria = useMemo(geometriaDeLaJoya, []);
  const rejaDeLaCeldaGeometria = useMemo(geometriaDeLaRejaDeLaCelda, []);
  const monedaDeLaOficinaGeometria = useMemo(geometriaDeLaMonedaDeLaRecaudacion, []);
  const bocanadaGeometria = useMemo(geometriaDeUnaBocanada, []);
  const ondaGeometria = useMemo(geometriaDeLaOnda, []);
  useEffect(
    () => () => {
      tapaGeometria?.dispose();
      ruletaGeometria?.dispose();
      joyaGeometria?.dispose();
      rejaDeLaCeldaGeometria?.dispose();
      monedaDeLaOficinaGeometria?.dispose();
      bocanadaGeometria?.dispose();
      ondaGeometria?.dispose();
    },
    [tapaGeometria, ruletaGeometria, joyaGeometria, rejaDeLaCeldaGeometria, monedaDeLaOficinaGeometria, bocanadaGeometria, ondaGeometria],
  );
  const tapas = useRef<THREE.InstancedMesh>(null);
  const ruletas = useRef<THREE.InstancedMesh>(null);
  const joya = useRef<THREE.InstancedMesh>(null);
  const rejaDeLaCelda = useRef<THREE.Mesh>(null);
  const monedaDeLaOficina = useRef<THREE.Mesh>(null);
  const humo = useRef<THREE.InstancedMesh>(null);
  const onda = useRef<THREE.Mesh>(null);
  const sitiosVivos = useMemo(() => ({ cofres: bisagrasDeLosCofres(), ruletas: ejesDeLasRuletas(), joya: ejeDeLaJoya(), reja: sitioDeLaRejaDeLaCelda(), chimenea: bocaDeLaChimenea(), alberca: centroDeLaAlberca() }), []);

  const materiales = useMemo(
    () => ({
      suelo: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }),
      cielo: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, fog: false }),
      disco: new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.3, depthWrite: false }),
      marca: new THREE.MeshBasicMaterial({ vertexColors: false, transparent: true, opacity: 0.85, depthTest: false, depthWrite: false, side: THREE.DoubleSide }),
      trato: new THREE.MeshBasicMaterial({ color: COLOR_DEL_TRATO, transparent: true, opacity: 0.8, depthWrite: false }),
      naipePregon: new THREE.MeshBasicMaterial({ color: COLOR_DEL_NAIPE.pregon, depthTest: false, depthWrite: false, side: THREE.DoubleSide }),
      naipeArca: new THREE.MeshBasicMaterial({ color: COLOR_DEL_NAIPE.arca, depthTest: false, depthWrite: false, side: THREE.DoubleSide }),
      asa: new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }),
      dadoCuerpo: new THREE.MeshStandardMaterial({ color: COLOR_DEL_NUMERO, roughness: 0.6 }),
      dadoPuntos: new THREE.MeshStandardMaterial({ color: COLOR_DEL_PUNTO, roughness: 0.6 }),
      /* Lo propio de la ciudad: color por vértice (y por instancia en los bultos), sin brillo. */
      bulto: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0 }),
      cinta: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0, side: THREE.DoubleSide }),
      /* La tinta de los rótulos: plana, como una tinta impresa, y no una superficie iluminada. */
      rotulo: new THREE.MeshBasicMaterial({ vertexColors: true }),
    }),
    [],
  );
  const geometrias = useMemo(
    () => ({
      cielo: geometriaDelCielo(),
      disco: new THREE.CircleGeometry(RADIO_DEL_DISCO_DEL_PEON, SEGMENTOS_DEL_DISCO),
      marca: new THREE.RingGeometry(MARCA.interior, MARCA.exterior, SEGMENTOS_DEL_DISCO, 1),
      trato: new THREE.PlaneGeometry(LADO_DEL_DISCO_DEL_TRATO, LADO_DEL_DISCO_DEL_TRATO),
      naipe: new THREE.PlaneGeometry(NAIPE.ancho, NAIPE.alto),
      asaDeCasilla: new THREE.PlaneGeometry(1, 1),
      dadoCuerpo: geometriaDelCuerpoDelDado(ARISTA_DE_LOS_DADOS),
      dadoPuntos: geometriaDeLosPuntosDelDado(ARISTA_DE_LOS_DADOS),
    }),
    [],
  );
  useEffect(
    () => () => {
      for (const m of Object.values(materiales)) m.dispose();
      for (const g of Object.values(geometrias)) g.dispose();
    },
    [materiales, geometrias],
  );

  /* El dado del pack, aplanado, o nada (entonces el respaldo). */
  const dadoDelPack = useMemo(() => {
    const nodo = catalogoDeDados?.get(MODELO.dado);
    if (nodo === undefined) return null;
    const partes = aplana(nodo);
    const g = unaGeometria(partes);
    const m = partes[0]?.material;
    return g === null || m === undefined ? null : { geometria: g, material: m, partes };
  }, [catalogoDeDados]);
  useEffect(
    () => () => {
      if (dadoDelPack === null) return;
      for (const p of dadoDelPack.partes) p.geometria.dispose();
      if (dadoDelPack.partes.length > 1) dadoDelPack.geometria.dispose();
    },
    [dadoDelPack],
  );

  /* Las banderas: una geometría teñida por color, de la caché de `tinte.ts`. */
  const coloresDeBanderas = useMemo(() => coloresDeLasBanderas(tablero.figuras.map((f) => f.color)), [tablero.figuras]);
  const banderasPorColor = useMemo(
    () => (mundo?.bandera === null || mundo === null ? [] : coloresDeBanderas.map((hex) => ({ hex, geometria: geometriaTenidaDe(PIEZA.bandera, mundo.bandera as THREE.BufferGeometry, hex) }))),
    [mundo, coloresDeBanderas],
  );

  /* Las aceras se repintan cuando cambia la lista de casillas (misma identidad si la firma no cambió). */
  useLayoutEffect(() => {
    for (const c of tablero.casillas) pintaLaAcera(suelo, c, c.empenada ? LUMINANCIA_EMPENADA : 1);
  }, [suelo, tablero.casillas]);

  // -------------------------------------------------------------------------
  // El estado vivo: peones, cola, dados, cámara. Todo en referencias.
  // -------------------------------------------------------------------------

  const asientos = useMemo<Asiento[]>(() => tablero.figuras.map((figura, indice) => ({ figura, indice })), [tablero.figuras]);
  const asientosRef = useRef(asientos);
  asientosRef.current = asientos;
  const casillasRef = useRef(tablero.casillas);
  casillasRef.current = tablero.casillas;

  const peones = useRef(new Map<string, EstadoDelPeon>());
  /** Por asiento, la referencia que lee su `Aventurero`. */
  const refsDePeon = useRef(new Map<string, { current: EstadoDelPeon | null }>());
  const cola = useRef<ColaDeSucesos>(colaVacia(0));
  const alimentados = useRef(new WeakSet<SucesoProgramado>());
  const ultimaJugada = useRef<number | null>(null);
  const colaPendiente = useRef<readonly SucesoDelBurgo[] | null>(null);
  const colaAvisada = useRef(true);
  const cartaCerrada = useRef<SucesoProgramado | null>(null);

  /* La primera vista no se anima; las siguientes se encolan en el hilo de dibujo. */
  useEffect(() => {
    if (ultimaJugada.current === null) {
      ultimaJugada.current = sucesos.jugada;
      return;
    }
    if (sucesos.jugada === ultimaJugada.current) return;
    ultimaJugada.current = sucesos.jugada;
    colaPendiente.current = [...(colaPendiente.current ?? []), ...sucesos.lista];
  }, [sucesos]);

  const maquinaDeDados = useRef<EstadoDeLosDadosDelBurgo>(dadosDelBurgoEnReposo());
  const sucesosDeDados = useRef<SucesoDeLosDadosDelBurgo[]>([]);
  const vistaDeDadosPendiente = useRef<VistaDeLosDadosDelBurgo | null>(null);
  const asentadoEn = useRef(-1);
  const selloDelPar = useRef(0);
  useEffect(() => {
    if (dados === null) return;
    vistaDeDadosPendiente.current = { par: dados.par, tirado: dados.tirado, sello: dados.sello };
  }, [dados]);

  const [enPie, ponerEnPie] = useState<string | null>(null);
  const enPieRef = useRef<string | null>(null);
  const [ganadorEnPlaza, ponerGanadorEnPlaza] = useState(false);

  const seguimiento = useRef({ peso: 0, objetivo: { x: 0, z: 0 }, hastaCuando: -1 });
  const marcaDestacada = useRef<{ x: number; z: number } | null>(null);

  /*
   * ─ EL ARRANQUE Y LA MEDIDA, con el gancho común (`comun/arranque.ts`). ─ `alEstarListo` dos fotogramas
   * después de que `burgo.glb` y `dados.glb` hayan llegado o fallado —o a los quince segundos, diciendo
   * que el burgo no contestó—, y `alMedir` una vez por segundo. Se llama aquí, detrás de la cámara del
   * paseo, para que ésa siga siendo el primer `useFrame` de prioridad 0 de la escena.
   */
  const arrancar = usarArranqueYMedida(props, { llave: traer, alVencerElTope: () => falla('el burgo no ha contestado en quince segundos') });

  /* ─ La ciudad viva: el reparto por niveles, los interiores abiertos y las mallas. ─ */
  const laCiudadRef = useRef<CiudadEn3D | null>(laCiudad);
  laCiudadRef.current = laCiudad;
  const mallasDeLaCiudad = useRef(new Map<string, THREE.InstancedMesh>());
  const mallasDeCoches = useRef(new Map<string, THREE.InstancedMesh>());
  const reparto = useRef({
    /** Dónde estaba la cámara cuando se repartió: `null` = no se ha repartido nunca. */
    desde: null as { x: number; z: number } | null,
    /** Por grupo, el nivel que tenía: es lo que da la histéresis. */
    niveles: [] as number[],
    montaje: null as MontajeDeLaCiudad | null,
    /** Los índices de los edificios abiertos, en orden, y sus salas ya pedidas. */
    abiertos: [] as number[],
    salas: [] as PuestaDeSala[],
    /** Y lo que les queda de cáscara: el tejado y las tres medianeras (`cascaraAbierta`). */
    caparazones: [] as BultoPropio[],
    /** Cuántos repartos se han hecho, y si ya se avisó de un desbordamiento de capacidad. */
    repartos: 0,
    avisadoElDesborde: false,
  });
  const salasPorEdificio = useRef(new Map<number, PuestaDeSala[]>());

  /* Las mallas instanciadas. */
  const casas = useRef<THREE.InstancedMesh>(null);
  const peonesMalla = useRef<THREE.InstancedMesh>(null);
  const discos = useRef<THREE.InstancedMesh>(null);
  const monedas = useRef<THREE.InstancedMesh>(null);
  const marcas = useRef<THREE.InstancedMesh>(null);
  const tratoMalla = useRef<THREE.InstancedMesh>(null);
  const asas = useRef<THREE.InstancedMesh>(null);
  const banderas = useRef<(THREE.InstancedMesh | null)[]>([]);
  const nubes = useRef<(THREE.InstancedMesh | null)[]>([]);
  const aspas = useRef<THREE.Mesh>(null);
  const rejaGrupo = useRef<THREE.Group>(null);
  const naipeGrupo = useRef<THREE.Group>(null);
  const naipe = useRef<THREE.Mesh>(null);
  const cupula = useRef<THREE.Mesh>(null);
  const dadosGrupos = useRef<(THREE.Group | null)[]>([null, null]);
  const grupoDeLaBandeja = useRef<THREE.Group>(null);
  const dadoEnReposo = useRef([new THREE.Quaternion(), new THREE.Quaternion()]);
  const dadoAlDejarDeRodar = useRef([new THREE.Quaternion(), new THREE.Quaternion()]);
  const dadoObjetivo = useRef([new THREE.Quaternion(), new THREE.Quaternion()]);
  const claveDelObjetivo = useRef('');

  /* Las asas de las casillas: una matriz por casilla, escritas una vez. */
  useLayoutEffect(() => {
    const m = asas.current;
    if (m === null) return;
    for (let i = 0; i < CASILLAS; i++) {
      const marco = marcoDeCasilla(i);
      const centro = marco.esEsquina ? puntoEnEsquina(marco, SUPERFICIE.centro, SUPERFICIE.centro) : puntoEnCasilla(marco, SUPERFICIE.centro, 0);
      const ancho = marco.esEsquina ? LADO_DE_ESQUINA : ANCHO_DE_CASILLA;
      auxEuler.set(-Math.PI / 2, 0, 0);
      auxGiro.setFromEuler(auxEuler);
      auxGiro2.setFromAxisAngle(EJE_Y, Math.atan2(marco.fuera.x, marco.fuera.z));
      auxGiro.premultiply(auxGiro2);
      m.setMatrixAt(i, auxMatriz.compose(auxPosicion.set(centro.x, ALZA_DEL_ASA, centro.z), auxGiro, auxEscala.set(ancho, marco.esEsquina ? LADO_DE_ESQUINA : SUPERFICIE.hasta - FILETE.desde, 1)));
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    /* Las dos props son las que montan y desmontan la malla: si cambia una, hay `asas` nuevas que escribir. */
  }, [props.alTocarCasilla, props.alSenalarCasilla]);

  const tamano = useThree((s) => s.size);
  /*
   * La niebla de la mesa se retira con el ojo, que en retrato se retira para que quepa el anillo:
   * fija, dejaba el tablero entero detrás de ella y la app lo pintaba en blanco (`nieblaDeLaMesa`).
   * Con la proporción del LIENZO, la misma con la que se retira el ojo.
   */
  const laNieblaDeLaMesa = nieblaDeLaMesa(tamano.width / Math.max(1, tamano.height));
  const reloj = useThree((s) => s.clock);
  /** Las aceras repintadas este fotograma por un empeño en curso: al acabar, vuelven a su color base. */
  const acerasEnCurso = useRef(new Set<number>());

  // -------------------------------------------------------------------------
  // Saltar la cola: todo a su estado final
  // -------------------------------------------------------------------------

  const saltarTodo = (ahora: number): void => {
    cola.current = saltarLaColaDeSucesos(cola.current);
    colaPendiente.current = null;
    for (const [id, e] of peones.current) peones.current.set(id, saltarLaCola(e, ahora));
    cartaCerrada.current = null;
    seguimiento.current.hastaCuando = -1;
    const v = vistaDeDadosPendiente.current;
    if (v !== null) {
      sucesosDeDados.current.push({ que: 'vista', vista: v });
      vistaDeDadosPendiente.current = null;
    }
  };

  // -------------------------------------------------------------------------
  // La ciudad: repartirla por niveles y escribir sus matrices
  // -------------------------------------------------------------------------

  /* Cuando cambia la ciudad (código o calidad) las mallas son otras: hay que repartir de cero. */
  useEffect(() => {
    reparto.current.desde = null;
    reparto.current.niveles = [];
    reparto.current.abiertos = [];
    reparto.current.salas = [];
    salasPorEdificio.current.clear();
  }, [laCiudad]);
  /* Y al bajar a andar o al subir a la mesa, los umbrales son otros: se reparte en el fotograma siguiente. */
  useEffect(() => {
    reparto.current.desde = null;
  }, [aPie]);

  /**
   * QUÉ EDIFICIOS SE ABREN: los TRES más cercanos AL PUNTO QUE SE MIRA, y sólo de cerca.
   *
   * `x` y `z` son el punto del suelo al que apunta la cámara —no dónde está el ojo— y
   * `alcance` lo lejos que el ojo tiene ese punto. Los dos hacen falta: el radio dice «esa
   * manzana es la que se está mirando» y el alcance dice «y se está mirando de cerca». Ver
   * `PARA_ABRIR` para por qué el segundo no es la altura del ojo.
   */
  const edificiosQueSeAbren = (c: CiudadEn3D, x: number, z: number, alcance: number): number[] => {
    /*
     * A PIE NO SE ABRE NINGUNO. La casa de muñecas se hizo para mirarla desde arriba: le quita la
     * fachada que da a la calle, y a ras de calle eso es un edificio sin frente, con los muebles a la
     * vista y una caja en el mundo que no deja entrar. Es un decorado roto, no un interior.
     */
    if (aPie || !plena || !INTERRUPTORES_DEL_BANCO.interiores || alcance > PARA_ABRIR.alcance) return [];
    const cerca: { indice: number; d: number }[] = [];
    for (const e of c.ciudad.edificios) {
      if (e.cascara === null) continue;
      const d = Math.hypot(e.centro.x - x, e.centro.z - z);
      if (d <= PARA_ABRIR.distancia) cerca.push({ indice: e.indice, d });
    }
    cerca.sort((a, b) => a.d - b.d);
    return cerca
      .slice(0, EDIFICIOS_ABIERTOS)
      .map((k) => k.indice)
      .sort((a, b) => a - b);
  };

  /**
   * ESCRIBIR LA CIUDAD ENTERA: una pasada por los 174 grupos, cada uno a SU nivel.
   *
   * Lo que se escribe es sólo lo que está montado, así que el bucle recorre la ciudad pero
   * escribe unos miles de matrices, no el millón y medio de triángulos que la ciudad tiene
   * en L1. Y va POR MALLA: una `InstancedMesh` por pieza del pack y una por cuenta de
   * triángulos de bulto, con el contador puesto al final. El que se pasa de capacidad NO
   * desborda: se para y lo dice una vez por `alFallar`.
   */
  const escribirLaCiudad = (c: CiudadEn3D, montaje: MontajeDeLaCiudad, abiertos: readonly number[], salas: readonly PuestaDeSala[], caparazones: readonly BultoPropio[]): void => {
    const mallas = mallasDeLaCiudad.current;
    const cuenta = new Map<string, number>();
    const ocultas = new Set<string>();
    for (const indice of abiertos) {
      const clave = c.cascaras.get(indice);
      if (clave !== undefined) ocultas.add(clave);
    }
    let desbordada: string | null = null;
    const pon = (clave: string, color: string | null): void => {
      const malla = mallas.get(clave);
      if (malla === undefined) return;
      const n = cuenta.get(clave) ?? 0;
      if (n >= (malla.userData.capacidad as number)) {
        desbordada ??= clave;
        return;
      }
      malla.setMatrixAt(n, auxMatriz);
      if (color !== null) malla.setColorAt(n, colorLeido(color));
      cuenta.set(clave, n + 1);
    };
    const ponPuesta = (p: PuestaEnLaCiudad): void => {
      if (ocultas.size > 0 && ocultas.has(claveDePuesta(p.pieza, p.x, p.z))) return;
      matrizDelBurgo(p.x, p.y, p.z, p.giro, p.talla, auxMatriz);
      pon(p.pieza, null);
    };
    const ponBulto = (b: BultoPropio): void => {
      auxGiro.setFromAxisAngle(EJE_Y, b.giro);
      auxMatriz.compose(auxPosicion.set(b.x, b.y, b.z), auxGiro, auxEscala.set(Math.max(1e-4, b.ancho), Math.max(1e-4, b.alto), Math.max(1e-4, b.fondo)));
      pon(claveDelBulto(b.triangulos, b.alto <= 0), b.color);
    };
    for (const g of c.ciudad.grupos) {
      const d = g.niveles[montaje.nivelDelGrupo[g.indice] ?? 2];
      if (d === undefined) continue;
      for (const p of d.puestas) ponPuesta(p);
      for (const p of d.coches) ponPuesta(p);
      for (const b of d.bultos) ponBulto(b);
    }
    /* Los interiores: sus tabiques y sus losas son bultos, y sus muebles piezas del pack. */
    for (const sala of salas) {
      for (const b of sala.bultos) ponBulto(b);
      for (const m of sala.muebles) ponPuesta(m);
    }
    /* Y lo que le queda por fuera al edificio abierto, que es lo que lo sigue haciendo un edificio. */
    for (const b of caparazones) ponBulto(b);
    for (const [clave, malla] of mallas) {
      const n = cuenta.get(clave) ?? 0;
      malla.count = n;
      malla.instanceMatrix.needsUpdate = true;
      if (malla.instanceColor !== null) malla.instanceColor.needsUpdate = true;
      /* La regla de la casa: toda `InstancedMesh` recalcula su esfera tras escribir matrices. */
      malla.computeBoundingSphere();
    }
    if (desbordada !== null && !reparto.current.avisadoElDesborde) {
      reparto.current.avisadoElDesborde = true;
      falla(`la ciudad se pasó de la capacidad de «${desbordada}»: se dibuja lo que cabe`);
    }
  };

  /**
   * REPARTIR: sólo cuando la cámara cambia de CELDA o cuando cambian los edificios abiertos.
   *
   * `montarLaCiudad` recibe el reparto ANTERIOR, que es lo que aplica la histéresis de 40
   * unidades: sin ella, una cámara parada justo en un umbral parpadearía entre dos montajes
   * cada vez que el amortiguado del mirador la moviera medio metro.
   */
  const repartirLaCiudad = (x: number, z: number, focoX: number, focoZ: number, alcance: number): void => {
    const c = laCiudadRef.current;
    if (c === null) return;
    const r = reparto.current;
    const abiertos = edificiosQueSeAbren(c, focoX, focoZ, alcance);
    const mismos = abiertos.length === r.abiertos.length && abiertos.every((v, k) => v === r.abiertos[k]);
    const lejos = r.desde === null || Math.abs(r.desde.x - x) >= PASO_PARA_REPARTIR || Math.abs(r.desde.z - z) >= PASO_PARA_REPARTIR;
    if (!lejos && mismos) return;
    r.desde = { x, z };
    if (!mismos) {
      r.abiertos = abiertos;
      const salas: PuestaDeSala[] = [];
      const caparazones: BultoPropio[] = [];
      for (const indice of abiertos) {
        let hechas = salasPorEdificio.current.get(indice);
        const e: EdificioDeLaCiudad | undefined = c.ciudad.edificios[indice];
        if (hechas === undefined) {
          hechas = e === undefined ? [] : salasDelEdificio(e, c.ciudad.semilla);
          salasPorEdificio.current.set(indice, hechas);
        }
        salas.push(...hechas);
        /*
         * Y el edificio no desaparece por abrirse: le queda su tejado y las tres medianeras
         * que no dan a la calle, del mismo color con el que se pintaba de lejos. Ver
         * `cascaraAbierta` para el fallo que esto arregla.
         */
        if (e !== undefined) {
          const primera = e.celdas[0];
          const color = primera === undefined ? tonoDelEdificio(e.cascara) : tonoDeLaFachada(tonoDelEdificio(e.cascara), primera.i, primera.j);
          caparazones.push(...cascaraAbierta(e, color));
        }
      }
      r.salas = salas;
      r.caparazones = caparazones;
    }
    /* A pie, con los umbrales de a pie: el detalle hasta donde manda la calidad y el L2 hasta la niebla (`a-pie.ts`). */
    const montaje = montarLaCiudad(c.ciudad, x, z, r.niveles.length === c.ciudad.grupos.length ? r.niveles : undefined, aPie ? UMBRALES_A_PIE[c.ciudad.calidad] : undefined);
    r.montaje = montaje;
    r.niveles = [...montaje.nivelDelGrupo];
    r.repartos++;
    escribirLaCiudad(c, montaje, r.abiertos, r.salas, r.caparazones);
  };

  // -------------------------------------------------------------------------
  // El fotograma
  // -------------------------------------------------------------------------

  useFrame((s, dtCrudo) => {
    const ahora = s.clock.elapsedTime;
    const dt = Math.min(0.1, Math.max(0, dtCrudo));
    const losAsientos = asientosRef.current;
    const casillas = casillasRef.current;

    /* ─ Los peones nacen con la vista, y se resincronizan cuando no animan nada. ─ */
    for (const a of losAsientos) {
      const id = a.figura.asiento;
      let e = peones.current.get(id);
      if (e === undefined) {
        e = nacidoDeLaVista(a.figura, a.indice, semilla, ahora);
        peones.current.set(id, e);
      }
      if (!refsDePeon.current.has(id)) refsDePeon.current.set(id, { current: null });
    }
    for (const id of [...peones.current.keys()]) if (!losAsientos.some((a) => a.figura.asiento === id)) peones.current.delete(id);

    /* ─ La cola: lo que llegó por props entra aquí, con el reloj de la escena. ─ */
    if (colaPendiente.current !== null) {
      cola.current = encolarEnLaCola({ ...cola.current, ahora }, colaPendiente.current, anillo);
      colaPendiente.current = null;
      colaAvisada.current = false;
    }
    cola.current = avanzarLaCola(cola.current, dt);
    if (cola.current.ahora !== ahora) cola.current = { ...cola.current, ahora };

    /* ─ Entregar a cada máquina lo que arranca ahora, con un solo aventurero en pie. ─ */
    let quienEstaEnPie: string | null = null;
    for (const [id, e] of peones.current) if (e.enPie) quienEstaEnPie = id;
    for (const p of cola.current.programados) {
      if (p.desde > ahora) break;
      if (alimentados.current.has(p)) continue;
      const sc = p.suceso;
      const quien = quienDe(sc);
      if (sc.que === 'tira' || sc.que === 'sale' || sc.que === 'tirada-de-oficio') {
        /* Los dados ruedan cuando la cola lo dice, con el par del suceso. */
        const vista = vistaDeDadosPendiente.current;
        const sello = sc.que === 'sale' ? -(1_000 + sc.ronda * 10 + losAsientos.findIndex((a) => a.figura.asiento === sc.quien)) : (vista?.sello ?? maquinaDeDados.current.vista?.sello ?? 0) + (sc.que === 'tirada-de-oficio' ? 0.5 : 0);
        /* «La primera vista nunca es nueva»: si la máquina no ha visto ninguna, se le da una en reposo antes. */
        if (maquinaDeDados.current.vista === null) sucesosDeDados.current.push({ que: 'vista', vista: { par: null, tirado: false, sello: -1 } });
        sucesosDeDados.current.push({ que: 'tocado' }, { que: 'vista', vista: { par: sc.dados, tirado: true, sello } });
        if (sc.que === 'tira' && vista !== null) vistaDeDadosPendiente.current = null;
        alimentados.current.add(p);
        continue;
      }
      if (sc.que === 'mueve' && quien !== null) {
        seguimiento.current.objetivo = huecoDePeon(sc.desde, losAsientos.find((a) => a.figura.asiento === quien)?.indice ?? 0);
        seguimiento.current.hastaCuando = p.hasta + REPOSO_TRAS_SEGUIR;
      }
      if (!esSucesoDelPeon(sc) || quien === null) {
        alimentados.current.add(p);
        continue;
      }
      const e = peones.current.get(quien);
      if (e === undefined) {
        alimentados.current.add(p);
        continue;
      }
      if (poneEnPie(sc) && quienEstaEnPie !== null && quienEstaEnPie !== quien) {
        /* Decisión 11: el otro se despide primero; este suceso espera. */
        const otro = peones.current.get(quienEstaEnPie);
        if (otro !== undefined && otro.fase === 'quieto') peones.current.set(quienEstaEnPie, despedir(otro, ahora));
        break;
      }
      peones.current.set(quien, encolarAlPeon(e, [sc]));
      if (poneEnPie(sc)) quienEstaEnPie = quien;
      alimentados.current.add(p);
    }
    /* Sin nada por arrancar, la vista de dados retenida entra. */
    const hayTiradaPorArrancar = cola.current.programados.some((p) => p.desde > ahora && (p.suceso.que === 'tira' || p.suceso.que === 'sale'));
    if (!hayTiradaPorArrancar && vistaDeDadosPendiente.current !== null) {
      sucesosDeDados.current.push({ que: 'vista', vista: vistaDeDadosPendiente.current });
      vistaDeDadosPendiente.current = null;
    }

    /* ─ Las máquinas de peón avanzan; se resincronizan con la vista cuando están en reposo. ─ */
    for (const a of losAsientos) {
      const id = a.figura.asiento;
      let e = peones.current.get(id);
      if (e === undefined) continue;
      e = avanzar(e, ahora, dt, anillo);
      if (peonTerminado(e) && colaTerminada(cola.current) && (e.enCasilla !== a.figura.casilla || e.presa !== a.figura.presa || e.quebrada !== a.figura.quebrada) && !e.enPie) {
        e = nacidoDeLaVista(a.figura, a.indice, semilla, ahora);
      }
      peones.current.set(id, e);
      const ref = refsDePeon.current.get(id);
      if (ref !== undefined) ref.current = e;
    }
    let ahoraEnPie: string | null = null;
    for (const [id, e] of peones.current) if (e.enPie) ahoraEnPie = id;
    if (ahoraEnPie !== enPieRef.current) {
      enPieRef.current = ahoraEnPie;
      ponerEnPie(ahoraEnPie);
    }

    /* ─ Aviso de cola terminada, una vez por jugada. ─ */
    const todoQuieto = colaTerminada(cola.current) && [...peones.current.values()].every(peonTerminado);
    if (todoQuieto && !colaAvisada.current) {
      colaAvisada.current = true;
      avisos.current.alTerminarLaCola?.();
    }

    const sonando = enCurso(cola.current);
    const enCursoDe = (que: SucesoDelBurgo['que']): (typeof sonando)[number] | undefined => sonando.find((x) => x.suceso.que === que);

    /* ─ Los dados: la cola de sucesos, el tic, y la pose de cada uno. ─ */
    {
      for (const suceso of sucesosDeDados.current) maquinaDeDados.current = faseDeLosDadosConPar(maquinaDeDados.current, suceso, ahora);
      sucesosDeDados.current = [];
      const antes = maquinaDeDados.current.fase.fase;
      maquinaDeDados.current = faseDeLosDadosConPar(maquinaDeDados.current, { que: 'tic' }, ahora);
      const { fase } = maquinaDeDados.current;
      if (antes === 'asentando' && fase.fase === 'quieta') asentadoEn.current = ahora;
      const par = parQueSeEnsena(fase);
      const sello = maquinaDeDados.current.vista?.sello ?? 0;
      const clave = `${String(par[0])},${String(par[1])},${String(sello)}`;
      if (claveDelObjetivo.current !== clave) {
        claveDelObjetivo.current = clave;
        selloDelPar.current = sello;
        for (const i of [0, 1] as const) {
          const valor = Math.min(6, Math.max(1, Math.round(par[i]))) as ValorDelDado;
          cuaternionDelValor(valor, giroDelDadoAsentado(i, Math.round(sello)), dadoObjetivo.current[i] as THREE.Quaternion);
        }
      }
      const disponible = dados?.porTirar === true && fase.fase === 'quieta';
      for (const i of [0, 1] as const) {
        const g = dadosGrupos.current[i];
        if (g === null || g === undefined) continue;
        const hueco = huecosDeLosDadosRef.current[i] as Punto;
        g.position.set(hueco.x, ARISTA_DE_LOS_DADOS / 2, hueco.z);
        const reposo = dadoEnReposo.current[i] as THREE.Quaternion;
        const alDejar = dadoAlDejarDeRodar.current[i] as THREE.Quaternion;
        const objetivo = dadoObjetivo.current[i] as THREE.Quaternion;
        if (fase.fase === 'rodando') {
          const transcurrido = ahora - fase.desde;
          const angulo = anguloRodado(transcurrido);
          auxEuler.set(angulo * (i === 0 ? 1 : 0.8), 0, angulo * (i === 0 ? 0.7 : -1));
          auxGiro.setFromEuler(auxEuler);
          g.quaternion.copy(reposo).premultiply(auxGiro);
          g.position.y += saltoDelDado(transcurrido) * ARISTA_DE_LOS_DADOS * MOVIMIENTO_DE_LOS_DADOS.salto;
          alDejar.copy(g.quaternion);
          continue;
        }
        if (fase.fase === 'asentando') {
          const transcurrido = ahora - fase.desde;
          g.quaternion.slerpQuaternions(alDejar, objetivo, avanceDelAsentado(transcurrido));
          g.position.y += reboteDelDado(transcurrido) * ARISTA_DE_LOS_DADOS * MOVIMIENTO_DE_LOS_DADOS.rebote;
          continue;
        }
        g.quaternion.copy(objetivo);
        reposo.copy(g.quaternion);
        alDejar.copy(g.quaternion);
        if (asentadoEn.current >= 0) g.position.y += saltoDelDoble(par, ahora - asentadoEn.current) * ARISTA_DE_LOS_DADOS * MOVIMIENTO_DE_LOS_DADOS.doble;
        if (disponible) {
          const sac = sacudida(ahora + i * 0.05);
          g.position.x += sac * SACUDIDA.traslacion * ARISTA_DE_LOS_DADOS * MOVIMIENTO_DE_LOS_DADOS.sacudida;
          auxGiro.setFromAxisAngle(EJE_Y, sac * SACUDIDA.giro);
          g.quaternion.premultiply(auxGiro);
        }
      }
    }

    /* ─ Las casas y las banderas: lo que dice la vista, con lo que brota, cae o se hunde. ─ */
    {
      const alza = enCursoDe('alza');
      const vende = enCursoDe('vende');
      const compra = sonando.filter((x) => x.suceso.que === 'compra' || (x.suceso.que === 'almoneda-cerrada' && x.suceso.ganador !== null) || x.suceso.que === 'cambia-de-mano');
      const empenos = sonando.filter((x) => x.suceso.que === 'empena' || x.suceso.que === 'desempena');
      const desierta = sonando.find((x) => x.suceso.que === 'almoneda-cerrada' && x.suceso.ganador === null);
      const mc = casas.current;
      let nCasas = 0;
      const porColor = new Map<string, number>();
      const escribeBandera = (hex: string, x: number, y: number, z: number, giro: number, escalaY: number): void => {
        const k = coloresDeBanderas.indexOf(hex);
        const malla = banderas.current[k];
        if (k < 0 || malla === null || malla === undefined) return;
        const n = porColor.get(hex) ?? 0;
        if (n >= CAPACIDAD.banderas) return;
        malla.setMatrixAt(n, auxMatriz.compose(auxPosicion.set(x, y, z), auxGiro.setFromAxisAngle(EJE_Y, giro), auxEscala.set(1, Math.max(0.001, escalaY), 1)));
        porColor.set(hex, n + 1);
      };
      /*
       * EL PRECINTO, tendido lo que diga la hipoteca: entero si está hipotecada, a medias mientras se
       * hipoteca o se deshipoteca —con la misma curva que la bandera—, y nada si no. Se estira a lo
       * largo de la cinta, que es el primer eje de su marco (`sitioDelPrecinto`).
       */
      const mallaDePrecintos = precintos.current;
      let nPrecintos = 0;
      const escribePrecinto = (casilla: number, tendido: number): void => {
        if (mallaDePrecintos === null || tendido <= 0.001 || nPrecintos >= CAPACIDAD.precintos) return;
        const s = sitioDelPrecinto(casilla);
        mallaDePrecintos.setMatrixAt(nPrecintos, auxMatriz.compose(auxPosicion.set(s.x, s.y, s.z), auxGiro.setFromAxisAngle(EJE_Y, s.giro), auxEscala.set(tendido, 1, 1)));
        nPrecintos++;
      };
      for (const c of casillas) {
        const marco = marcoDeCasilla(c.indice);
        if (marco.esEsquina) continue;
        const giro = Math.atan2(-marco.fuera.x, -marco.fuera.z);
        const suyo = c.dueno;
        /* Las casas. */
        if (mc !== null && suyo !== null && c.casas > 0) {
          auxColor.set(suyo);
          const esPosada = c.casas >= 5;
          const cuantas = esPosada ? 1 : c.casas;
          const alzaAqui = alza !== undefined && alza.suceso.que === 'alza' && alza.suceso.casilla === c.indice ? alza : undefined;
          const t = alzaAqui === undefined ? 0 : ahora - alzaAqui.desde;
          if (esPosada && alzaAqui !== undefined && t < HUNDIR_CASAS) {
            /* Las cuatro se hunden antes de que brote el hotel. */
            for (let k = 0; k < 4 && nCasas < CAPACIDAD.casas; k++) {
              const h = huecoDeCasa(c.indice, k);
              const e = hundirse(t);
              mc.setMatrixAt(nCasas, matrizDelBurgo(h.x, 0, h.z, giro, TALLA_DE_LA_CASA * Math.max(0.001, e), auxMatriz));
              mc.setColorAt(nCasas, auxColor);
              nCasas++;
            }
          } else {
            /*
             * LA MISMA MALLA, DOS VOLÚMENES. Cuatro casas son cuatro cubos de 10,34 de frente
             * repartidos por 46,3 de la casilla; un hotel es UN bloque de 22,34 × 14 × 14 en el
             * medio. La animación de brote multiplica la talla, no la sustituye: si aquí se
             * escribiera la escala de brotar a secas —que es lo que había— la pieza volvería a
             * salir del tamaño que trae el pack, que es el fallo que esta tanda arregla.
             */
            for (let k = 0; k < cuantas && nCasas < CAPACIDAD.casas; k++) {
              const h = esPosada ? huecoDePosada(c.indice) : huecoDeCasa(c.indice, k);
              let escala = 1;
              if (alzaAqui !== undefined) {
                const brota = esPosada ? 0 : cuantas - 1;
                if (k === brota) escala = backOut((t - (esPosada ? HUNDIR_CASAS : 0)) / POR_CASA);
              }
              const brote = Math.max(0.001, escala);
              const m = esPosada
                ? matrizEstiradaDelBurgo(h.x, ALTURA_DEL_REBORDE, h.z, giro, TALLA_DEL_HOTEL.ancho * brote, TALLA_DEL_HOTEL.alto * brote, TALLA_DEL_HOTEL.fondo * brote, auxMatriz)
                : matrizDelBurgo(h.x, ALTURA_DEL_REBORDE, h.z, giro, TALLA_DE_LA_CASA * brote, auxMatriz);
              mc.setMatrixAt(nCasas, m);
              mc.setColorAt(nCasas, auxColor);
              nCasas++;
            }
          }
          if (esPosada) {
            const p = puntoEnCasilla(marco, FRANJA.centro, BANDERA_SOBRE_LA_POSADA.u);
            const escala = alzaAqui !== undefined ? backOut((t - HUNDIR_CASAS) / POR_CASA) : 1;
            escribeBandera(suyo, p.x, ALTURA_DEL_REBORDE + BANDERA_SOBRE_LA_POSADA.alza * Math.max(0.001, escala), p.z, giro, escala);
          }
        }
        /* La casa que se vende, hundiéndose donde estaba. */
        if (mc !== null && vende !== undefined && vende.suceso.que === 'vende' && vende.suceso.casilla === c.indice && suyo !== null && nCasas < CAPACIDAD.casas) {
          const k = Math.min(3, vende.suceso.casas);
          const h = huecoDeCasa(c.indice, k);
          auxColor.set(suyo);
          mc.setMatrixAt(nCasas, matrizDelBurgo(h.x, ALTURA_DEL_REBORDE, h.z, giro, TALLA_DE_LA_CASA * Math.max(0.001, hundirse(ahora - vende.desde, vende.hasta - vende.desde)), auxMatriz));
          mc.setColorAt(nCasas, auxColor);
          nCasas++;
        }
        /* La bandera del dueño, o la ámbar de la almoneda. */
        const b = huecoDeBandera(c.indice);
        if (suyo !== null) {
          const cae = compra.find((x) => 'casilla' in x.suceso && x.suceso.casilla === c.indice);
          const empeno = empenos.find((x) => 'casilla' in x.suceso && x.suceso.casilla === c.indice);
          let f = c.empenada ? 1 : 0;
          let luminancia = c.empenada ? LUMINANCIA_EMPENADA : 1;
          if (empeno !== undefined) {
            f = mediaAsta(ahora - empeno.desde, empeno.suceso.que === 'empena');
            luminancia = 1 - (1 - LUMINANCIA_EMPENADA) * f;
            pintaLaAcera(suelo, c, luminancia);
            acerasEnCurso.current.add(c.indice);
          } else if (acerasEnCurso.current.has(c.indice)) {
            acerasEnCurso.current.delete(c.indice);
            pintaLaAcera(suelo, c, luminancia);
          }
          escribePrecinto(c.indice, f);
          const y = cae === undefined ? 0 : caidaConRebote(ahora - cae.desde);
          const giroDeLaBandera = cae !== undefined && cae.suceso.que === 'cambia-de-mano' ? giro + Math.PI * pinza((ahora - cae.desde) / (cae.hasta - cae.desde), 0, 1) : giro;
          escribeBandera(suyo, b.x, ALTURA_DEL_REBORDE + y, b.z, giroDeLaBandera, 1 - 0.45 * f);
        } else if (c.enAlmoneda || (desierta !== undefined && 'casilla' in desierta.suceso && desierta.suceso.casilla === c.indice)) {
          const escala = desierta !== undefined && 'casilla' in desierta.suceso && desierta.suceso.casilla === c.indice ? hundirse(ahora - desierta.desde, desierta.hasta - desierta.desde) : parpadeo(ahora);
          escribeBandera(AMBAR_DEL_CONCEJO, b.x, ALTURA_DEL_REBORDE, b.z, giro, escala);
        }
      }
      if (mc !== null) {
        mc.count = nCasas;
        mc.instanceMatrix.needsUpdate = true;
        if (mc.instanceColor !== null) mc.instanceColor.needsUpdate = true;
        mc.computeBoundingSphere();
      }
      if (mallaDePrecintos !== null) {
        mallaDePrecintos.count = nPrecintos;
        mallaDePrecintos.instanceMatrix.needsUpdate = true;
        mallaDePrecintos.computeBoundingSphere();
      }
      coloresDeBanderas.forEach((hex, k) => {
        const malla = banderas.current[k];
        if (malla === null || malla === undefined) return;
        malla.count = porColor.get(hex) ?? 0;
        malla.instanceMatrix.needsUpdate = true;
        malla.computeBoundingSphere();
      });
    }

    /* ─ Los peones y sus discos; el aventurero que no hay se sustituye por el peón deslizando. ─ */
    {
      const mp = peonesMalla.current;
      const md = discos.current;
      const sorteo = sonando.find((x) => x.suceso.que === 'sale' && x.suceso.ronda <= 1);
      const apuro = enCursoDe('apuro');
      let nDiscos = 0;
      losAsientos.forEach((a, k) => {
        const e = peones.current.get(a.figura.asiento);
        if (mp === null || e === undefined || k >= CAPACIDAD.peones) return;
        const conAventurero = plena && enPieRef.current === a.figura.asiento && figuras.has(a.figura.figura) && biblioteca.length > 0;
        let p = posicionDelPeon(e, anillo, ahora);
        if (e.enPie && !conAventurero && !p.visible) {
          const av = posicionYRumbo(e, anillo, ahora);
          p = { x: av.x, y: 0, z: av.z, tumbado: 0, visible: av.escala > 0.01 };
        }
        let y = p.y;
        if (sorteo !== undefined) {
          const u = caidaDelPeonDelSorteo(k, ahora - sorteo.desde);
          y += CAIDA_DEL_SORTEO * (1 - u) + reboteDelDado(u * 0.35) * 10;
        }
        let x = p.x;
        if (apuro !== undefined && apuro.suceso.que === 'apuro' && apuro.suceso.quien === a.figura.asiento) x += sacudida(ahora) * 0.25;
        auxColor.set(a.figura.color);
        if (!p.visible) {
          mp.setMatrixAt(k, NADA);
        } else {
          /*
           * EL PEÓN VA A `TALLA_DEL_PEON`, NO A 1. Aquí había un `set(1, 1, 1)` literal, y con él
           * el peón salía del tamaño que trae el pack: 1,272 de huella sobre un frente de 72, el
           * 1,8 %, con el dígito del precio al lado midiendo dieciséis veces eso. La talla y de
           * dónde sale su número están en `anillo-en-3d.ts`; aquí sólo se aplica.
           *
           * Uniforme, y la escala va DENTRO del giro de tumbarse, que es lo que `compose` hace
           * (`T · R · S`): un peón derribado es el mismo peón derribado, no uno aplastado.
           */
          auxEuler.set((Math.PI / 2) * p.tumbado, 0, 0);
          auxGiro.setFromEuler(auxEuler);
          mp.setMatrixAt(k, auxMatriz.compose(auxPosicion.set(x, y, p.z), auxGiro, auxEscala.set(TALLA_DEL_PEON, TALLA_DEL_PEON, TALLA_DEL_PEON)));
          if (md !== null && nDiscos < CAPACIDAD.discos) {
            auxEuler.set(-Math.PI / 2, 0, 0);
            md.setMatrixAt(nDiscos, auxMatriz.compose(auxPosicion.set(x, 0.03, p.z), auxGiro.setFromEuler(auxEuler), auxEscala.set(1, 1, 1)));
            nDiscos++;
          }
        }
        mp.setColorAt(k, auxColor);
      });
      /* El disco del aventurero en pie (y del que se despide), en la misma malla que los de los peones. */
      if (md !== null) {
        for (const [id, e] of peones.current) {
          if (!e.enPie || nDiscos >= CAPACIDAD.discos) continue;
          const conAventurero = plena && figuras.has(losAsientos.find((a) => a.figura.asiento === id)?.figura.figura ?? 'caballero') && biblioteca.length > 0;
          if (!conAventurero) continue;
          const av = posicionYRumbo(e, anillo, ahora);
          if (av.escala <= 0.01) continue;
          auxEuler.set(-Math.PI / 2, 0, 0);
          md.setMatrixAt(nDiscos, auxMatriz.compose(auxPosicion.set(av.x, 0.03, av.z), auxGiro.setFromEuler(auxEuler), auxEscala.set(1.1 * av.escala, 1.1 * av.escala, 1)));
          nDiscos++;
        }
      }
      if (mp !== null) {
        for (let k = losAsientos.length; k < CAPACIDAD.peones; k++) mp.setMatrixAt(k, NADA);
        mp.instanceMatrix.needsUpdate = true;
        if (mp.instanceColor !== null) mp.instanceColor.needsUpdate = true;
      }
      if (md !== null) {
        md.count = nDiscos;
        md.instanceMatrix.needsUpdate = true;
      }
    }

    /* ─ Las monedas en vuelo. ─ */
    {
      const mm = monedas.current;
      if (mm !== null) {
        let n = 0;
        for (const x of sonando) {
          const sc = x.suceso;
          if (sc.que !== 'cobra' && sc.que !== 'paga') continue;
          const cuantas = monedasDe(sc.cuanto);
          const de = sc.que === 'cobra' ? puntoDelDinero(sc.de, sc.casilla, losAsientos, peones.current) : puntoDelDinero(sc.quien, sc.casilla, losAsientos, peones.current);
          const a = sc.que === 'cobra' ? puntoDelDinero(sc.quien, sc.casilla, losAsientos, peones.current) : puntoDelDinero(sc.a, sc.casilla, losAsientos, peones.current);
          for (let k = 0; k < cuantas && n < CAPACIDAD.monedas; k++) {
            const u = progresoDeLaMoneda(k, ahora - x.desde, sc.cuanto);
            if (u <= 0 || u >= 1) continue;
            const px = de.x + (a.x - de.x) * u;
            const pz = de.z + (a.z - de.z) * u;
            auxEuler.set(0, ahora * 6 + k, Math.PI / 2);
            mm.setMatrixAt(n, auxMatriz.compose(auxPosicion.set(px, 1 + arcoDeMoneda(u), pz), auxGiro.setFromEuler(auxEuler), auxEscala.set(TALLA_DE_LA_MONEDA, TALLA_DE_LA_MONEDA, TALLA_DE_LA_MONEDA)));
            n++;
          }
        }
        mm.count = n;
        mm.instanceMatrix.needsUpdate = true;
      }
    }

    /* ─ Las marcas: las casillas tocables y la destacada, que se desliza. ─ */
    {
      const mk = marcas.current;
      if (mk !== null) {
        let n = 0;
        auxEuler.set(-Math.PI / 2, 0, 0);
        auxGiro.setFromEuler(auxEuler);
        auxColor.set(COLOR_DEL_ACENTO);
        for (const c of casillas) {
          if (!c.tocable || n >= CAPACIDAD.marcas - 1) continue;
          const p = centroDeLaMarca(c.indice);
          const pulso = 1 + 0.04 * Math.sin(ahora * 4 + c.indice);
          mk.setMatrixAt(n, auxMatriz.compose(auxPosicion.set(p.x, MARCA.alza, p.z), auxGiro, auxEscala.set(pulso, pulso, 1)));
          mk.setColorAt(n, auxColor);
          n++;
        }
        /* La destacada: la casilla de quien tiene el turno, o el peón delante del que ruedan los dados en el sorteo. */
        let objetivo: Punto | null = null;
        const delante = dados?.delanteDe ?? null;
        if (delante !== null) {
          const a = losAsientos.find((x) => x.figura.asiento === delante);
          const e = a === undefined ? undefined : peones.current.get(delante);
          if (a !== undefined && e !== undefined) objetivo = huecoDePeon(e.enCasilla, a.indice);
        } else if (tablero.destacada !== null) {
          objetivo = centroDeLaMarca(tablero.destacada);
        }
        if (objetivo !== null) {
          const actual = marcaDestacada.current ?? { x: objetivo.x, z: objetivo.z };
          const k = amortiguado(dt, AMORTIGUACION_DE_LA_MARCA);
          actual.x += (objetivo.x - actual.x) * k;
          actual.z += (objetivo.z - actual.z) * k;
          marcaDestacada.current = actual;
          auxColor.set(COLOR_DE_LA_DESTACADA);
          const talla = delante !== null ? 0.55 : 1.12;
          mk.setMatrixAt(n, auxMatriz.compose(auxPosicion.set(actual.x, MARCA.alza + 0.01, actual.z), auxGiro, auxEscala.set(talla, talla, 1)));
          mk.setColorAt(n, auxColor);
          n++;
        } else {
          marcaDestacada.current = null;
        }
        mk.count = n;
        mk.instanceMatrix.needsUpdate = true;
        if (mk.instanceColor !== null) mk.instanceColor.needsUpdate = true;
        mk.computeBoundingSphere();
      }
    }

    /* ─ Los discos del trato: una línea entre los dos peones mientras dure. ─ */
    {
      const mt = tratoMalla.current;
      if (mt !== null) {
        const t = tablero.trato;
        let n = 0;
        if (t !== null) {
          const de = puntoDelDinero(t.de, 0, losAsientos, peones.current);
          const a = puntoDelDinero(t.a, 0, losAsientos, peones.current);
          auxEuler.set(-Math.PI / 2, 0, 0);
          auxGiro.setFromEuler(auxEuler);
          for (let k = 0; k < DISCOS_DEL_TRATO; k++) {
            const u = (k + 0.5) / DISCOS_DEL_TRATO;
            const brillo = 0.7 + 0.3 * Math.sin(ahora * 3 - k * 0.6);
            mt.setMatrixAt(n, auxMatriz.compose(auxPosicion.set(de.x + (a.x - de.x) * u, 0.05, de.z + (a.z - de.z) * u), auxGiro, auxEscala.set(brillo, brillo, 1)));
            n++;
          }
        }
        mt.count = n;
        mt.instanceMatrix.needsUpdate = true;
      }
    }

    /*
     * ─ LAS TRES PIEZAS VIVAS DE LAS CASILLAS ─
     *
     * La tapa del cofre se abre cuando el que mueve coge una carta del ARCA, y la ruleta gira
     * cuando la coge del PREGÓN; la joya da una vuelta cuando alguien paga la Tasa. El suceso de
     * la carta no dice en qué casilla se cogió —hay tres de cada—, así que se mira dónde está el
     * peón de quien la coge: es el único sitio donde esa carta puede haber salido.
     */
    {
      const carta = enCursoDe('carta');
      const dondeEstaEl = (quien: string): number => peones.current.get(quien)?.enCasilla ?? -1;
      const casillaDeLaCarta = carta !== undefined && carta.suceso.que === 'carta' ? dondeEstaEl(carta.suceso.quien) : -1;
      const mazo = carta !== undefined && carta.suceso.que === 'carta' ? carta.suceso.mazo : null;
      const desdeLaCarta = carta === undefined ? 0 : ahora - carta.desde;
      const queSeAnima = loQueAnimaUnaCarta(mazo, casillaDeLaCarta);
      const mt = tapas.current;
      if (mt !== null) {
        sitiosVivos.cofres.forEach((sitio, i) => {
          const abierta = queSeAnima.cofre === sitio.casilla ? aperturaDelCofre(desdeLaCarta) : 0;
          auxGiro.setFromAxisAngle(EJE_Y, sitio.giro);
          auxGiro.multiply(auxGiro2.setFromAxisAngle(EJE_X, -abierta * TAPA_DEL_COFRE.angulo));
          auxMatriz.compose(auxPosicion.set(sitio.x, sitio.y, sitio.z), auxGiro, auxEscala.set(1, 1, 1));
          mt.setMatrixAt(i, auxMatriz);
        });
        mt.count = sitiosVivos.cofres.length;
        mt.instanceMatrix.needsUpdate = true;
      }
      const mr = ruletas.current;
      if (mr !== null) {
        sitiosVivos.ruletas.forEach((sitio, i) => {
          const girada = queSeAnima.ruleta === sitio.casilla ? giroDeLaRuleta(desdeLaCarta) : 0;
          auxGiro.setFromAxisAngle(EJE_Y, sitio.giro + girada);
          auxMatriz.compose(auxPosicion.set(sitio.x, sitio.y, sitio.z), auxGiro, auxEscala.set(1, 1, 1));
          mr.setMatrixAt(i, auxMatriz);
        });
        mr.count = sitiosVivos.ruletas.length;
        mr.instanceMatrix.needsUpdate = true;
      }
      /*
       * LA REJA DE LA CELDA DEL CUARTEL DE LA 30: sube para que entre quien cae en ¡A comisaría!,
       * y baja cuando está dentro. Lleva su PROPIA curva —`alzadoDeLaRejaDeLaCelda`— y no la de la
       * verja de la Comisaría, porque va al compás del que corre a la celda; y desde otra casilla
       * se queda quieta, que nadie entra en ella.
       */
      const rc = rejaDeLaCelda.current;
      if (rc !== null) {
        const encierro = enCursoDe('a-la-mazmorra');
        const alzada = encierro === undefined || encierro.suceso.que !== 'a-la-mazmorra' ? 0 : alzadoDeLaRejaDeLaCelda(ahora - encierro.desde, encierro.suceso.desde);
        rc.position.y = sitiosVivos.reja.y + alzada * SUBIDA_DE_LA_REJA;
      }
      const mj = joya.current;
      if (mj !== null) {
        const tasa = sonando.find((x) => (x.suceso.que === 'paga' || x.suceso.que === 'cobra') && x.suceso.porque === 'alcabala');
        const girada = tasa === undefined ? 0 : giroDeLaJoya(ahora - tasa.desde);
        auxGiro.setFromAxisAngle(EJE_Y, sitiosVivos.joya.giro + girada);
        auxMatriz.compose(auxPosicion.set(sitiosVivos.joya.x, sitiosVivos.joya.y, sitiosVivos.joya.z), auxGiro, auxEscala.set(1, 1, 1));
        mj.setMatrixAt(0, auxMatriz);
        mj.count = 1;
        mj.instanceMatrix.needsUpdate = true;
      }
      /*
       * LA MONEDA DE LA RECAUDACIÓN: sube rodando la escalinata de la oficina y entra por la puerta
       * cuando alguien paga el Impuesto. Fuera de esos 0,6 s no se pinta, y no cuesta ni la llamada.
       */
      const mo = monedaDeLaOficina.current;
      if (mo !== null) {
        const pago = sonando.find((x) => esRecaudacion(x.suceso));
        const momento = pago === undefined ? null : momentoDeLaRecaudacion(ahora - pago.desde);
        mo.visible = momento !== null;
        if (momento !== null) {
          const p = monedaDeLaRecaudacionEnElMundo(momento.u);
          mo.position.set(p.x, p.y, p.z);
          auxGiro.setFromAxisAngle(EJE_Y, p.giro);
          auxGiro.multiply(auxGiro2.setFromAxisAngle(EJE_X, p.rodado));
          mo.quaternion.copy(auxGiro);
          mo.scale.setScalar(Math.max(0.001, momento.escala));
        }
      }
      /*
       * EL HUMO DE LA CENTRAL Y LA ONDA DEL CANAL: cuando alguien paga la renta de la Luz, tres
       * bocanadas por la chimenea; cuando la del Agua, una onda que se abre en la alberca. Fuera de
       * su ventana no se pintan.
       */
      const mh = humo.current;
      if (mh !== null) {
        const renta = sonando.find((x) => esRentaDe(x.suceso, CASILLA_DE_LA_CENTRAL));
        let n = 0;
        for (let k = 0; renta !== undefined && k < BOCANADAS_DEL_HUMO; k++) {
          const b = bocanadaDelHumo(k, ahora - renta.desde);
          if (b === null || b.lado < 0.01) continue;
          auxGiro.setFromAxisAngle(EJE_Y, sitiosVivos.chimenea.giro + k * 0.7);
          auxMatriz.compose(auxPosicion.set(sitiosVivos.chimenea.x, sitiosVivos.chimenea.y + b.lado / 2 + b.sube, sitiosVivos.chimenea.z), auxGiro, auxEscala.set(b.lado, b.lado, b.lado));
          mh.setMatrixAt(n, auxMatriz);
          n++;
        }
        mh.count = n;
        mh.visible = n > 0;
        mh.instanceMatrix.needsUpdate = true;
      }
      const mw = onda.current;
      if (mw !== null) {
        const renta = sonando.find((x) => esRentaDe(x.suceso, CASILLA_DEL_CANAL));
        const escala = renta === undefined ? null : ondaDelAgua(ahora - renta.desde);
        mw.visible = escala !== null;
        if (escala !== null) mw.scale.set(escala, 1, escala);
      }
    }

    /*
     * ─ LOS DOS TRENES, que no esperan a nadie ─
     *
     * Van por la MISMA polilínea que se ve dibujada —`puntoEnLaVia`—, así que no pueden ir por un
     * sitio distinto del que hay vía. El segundo va a media vuelta del primero, que es lo que hace
     * que casi siempre haya uno a la vista sin que se pisen en las paradas.
     */
    {
      const malla = trenes.current;
      if (malla !== null && trenGeometria !== null) {
        const vuelta = laVia.largo / TREN.velocidad + laVia.paradas.length * TREN.parada;
        for (let i = 0; i < TREN.cuantos; i++) {
          const avance = avanceDelTren(ahora, laVia.largo, laVia.paradas, (vuelta * i) / TREN.cuantos);
          const p = puntoEnLaVia(avance);
          auxGiro.setFromAxisAngle(EJE_Y, p.rumbo);
          auxMatriz.compose(auxPosicion.set(p.x, 0, p.z), auxGiro, auxEscala.set(1, 1, 1));
          malla.setMatrixAt(i, auxMatriz);
        }
        malla.count = TREN.cuantos;
        malla.instanceMatrix.needsUpdate = true;
      }
    }

    /* ─ La reja de la Mazmorra, las aspas, las nubes, el agua quieta. ─ */
    {
      const rg = rejaGrupo.current;
      if (rg !== null && mundo?.reja) {
        let alzado = 0;
        const entra = enCursoDe('a-la-mazmorra');
        const sale = enCursoDe('sale-de-la-mazmorra');
        if (entra !== undefined && entra.suceso.que === 'a-la-mazmorra') alzado = alzadoDeLaReja(ahora - entra.desde, entra.suceso.desde);
        else if (sale !== undefined) {
          const t = ahora - sale.desde;
          alzado = t < PASO_DE_LA_REJA ? t / PASO_DE_LA_REJA : Math.max(0, 1 - (t - PASO_DE_LA_REJA) / (sale.hasta - sale.desde - PASO_DE_LA_REJA));
        }
        rg.position.y = mundo.reja.puesta.y + alzado * SUBIDA_DE_LA_REJA;
      }
      const asp = aspas.current;
      if (asp !== null && mundo?.aspas) {
        auxGiro.setFromAxisAngle(EJE_Z, ahora * GIRO_DE_LAS_ASPAS);
        asp.quaternion.copy(mundo.aspas.giro).multiply(auxGiro);
      }
      if (mundo !== null) {
        mundo.nubes.forEach((nube, k) => {
          const malla = nubes.current[k];
          if (malla === null || malla === undefined) return;
          nube.puestas.forEach((p, i) => {
            const recorrido = (p.x + CONFIN_DE_LAS_NUBES + ahora * DERIVA_DE_LAS_NUBES) % (2 * CONFIN_DE_LAS_NUBES);
            const x = recorrido - CONFIN_DE_LAS_NUBES;
            malla.setMatrixAt(i, matrizDelBurgo(x, p.y + Math.sin(ahora / 7 + i) * 0.6, p.z, p.giro, p.talla, auxMatriz));
          });
          malla.instanceMatrix.needsUpdate = true;
        });
      }
    }

    /*
     * ─ El reloj de arena: la caída con la fracción de turno, el giro al empezar otro y el vaciado de
     * golpe al pasarlo. Como en `delta.tsx`, sin pasar por el estado de React. ─
     */
    {
      const cuerpo = cuerpoDelReloj.current;
      const reloj = avisos.current.reloj ?? null;
      const er = estadoDelReloj.current;
      if (cuerpo !== null) {
        const vuelta = reloj?.vuelta ?? 0;
        if (er.vueltaPintada !== vuelta) {
          if (er.vueltaPintada !== null) er.girando = { desde: ahora };
          er.vueltaPintada = vuelta;
          er.vaciando = null;
          er.sePulso = false;
        }
        if (er.girando === null) {
          cuerpo.rotation.z = 0;
        } else {
          const va = (ahora - er.girando.desde) / GIRO_DEL_RELOJ;
          if (va >= 1) {
            cuerpo.rotation.z = 0;
            er.girando = null;
          } else {
            cuerpo.rotation.z = Math.sin(va * Math.PI) * Math.PI;
          }
        }
        let parte = 0;
        if (reloj !== null && reloj.venceEn !== null && reloj.venceEn > reloj.desde) parte = (Date.now() - reloj.desde) / (reloj.venceEn - reloj.desde);
        if (er.sePulso && er.vaciando === null) {
          er.vaciando = ahora;
          er.sePulso = false;
        }
        if (er.vaciando !== null) {
          const va = (ahora - er.vaciando) / VACIADO_DEL_RELOJ;
          parte = Math.max(parte, Math.min(1, parte + (1 - parte) * va));
        }
        parte = Math.min(1, Math.max(0, parte));
        const montado = relojMontadoRef.current;
        if (montado !== null) {
          montado.mezclador.update(dt);
          for (const monton of montado.montones) {
            const pesos = monton.malla.morphTargetInfluences;
            if (pesos !== undefined && pesos.length > 0) pesos[0] = monton.arriba ? parte : 1 - parte;
          }
          const chorro = montado.chorro;
          if (chorro !== null) {
            montado.granos.forEach((g, k) => {
              const nodo = g.parent;
              if (nodo === null) return;
              nodo.updateMatrix();
              g.updateMatrix();
              chorro.setMatrixAt(k, auxMatriz.multiplyMatrices(nodo.matrix, g.matrix));
            });
            chorro.instanceMatrix.needsUpdate = true;
          }
        }
      }
    }

    /* ─ El naipe, pegado a la cámara. ─ */
    {
      const ng = naipeGrupo.current;
      const nm = naipe.current;
      const carta = enCursoDe('carta');
      const cam = s.camera as THREE.PerspectiveCamera;
      if (ng !== null && nm !== null) {
        const seVe = carta !== undefined && cartaCerrada.current !== carta;
        ng.visible = seVe;
        if (seVe && carta !== undefined && carta.suceso.que === 'carta') {
          ng.position.copy(cam.position);
          ng.quaternion.copy(cam.quaternion);
          const medioAlto = Math.tan((cam.fov * Math.PI) / 360);
          const d = NAIPE.alto / (NAIPE.parteDelAlto * 2 * medioAlto);
          const arriba = d * medioAlto * (1 - NAIPE.margenArriba * 2) - NAIPE.alto / 2;
          const t = ahora - carta.desde;
          const e = escalaDelNaipe(t);
          nm.position.set(0, arriba, -d);
          nm.rotation.set(0, (1 - e) * Math.PI, 0);
          nm.scale.set(Math.max(0.001, e), Math.max(0.001, e), 1);
          nm.material = carta.suceso.mazo === 'arca' ? materiales.naipeArca : materiales.naipePregon;
        }
      }
      if (cupula.current !== null) cupula.current.position.copy(cam.position);
    }

    /* ─ La ciudad: el reparto por niveles (por celda) y los coches que circulan (por fotograma). ─ */
    {
      const cam = s.camera as THREE.PerspectiveCamera;
      /*
       * EL NIVEL DE DETALLE SE MIDE DESDE EL OJO y los interiores desde EL PUNTO QUE SE MIRA:
       * son dos preguntas distintas. «¿Qué se ve grande?» la contesta la distancia al ojo, que
       * es lo que `verify:la-ciudad` proyecta desde sus ocho poses. «¿Qué está mirando el
       * jugador?» la contesta dónde corta el suelo el rayo de la cámara.
       */
      auxRayo.origin.copy(cam.position);
      cam.getWorldDirection(auxRayo.direction);
      const corte = auxRayo.intersectPlane(PLANO_DEL_SUELO, auxVector);
      const focoX = corte === null ? cam.position.x : corte.x;
      const focoZ = corte === null ? cam.position.z : corte.z;
      const alcance = corte === null ? Infinity : cam.position.distanceTo(corte);
      repartirLaCiudad(cam.position.x, cam.position.z, focoX, focoZ, alcance);
      const c = laCiudadRef.current;
      if (c !== null) {
        const cuenta = new Map<string, number>();
        for (const ruta of c.ciudad.coches.rutas) {
          const clave = `ruta-${ruta.pieza}`;
          const malla = mallasDeCoches.current.get(clave);
          if (malla === undefined) continue;
          const n = cuenta.get(clave) ?? 0;
          if (n >= (malla.userData.capacidad as number)) continue;
          const coche = cocheEnElInstante(ruta, ahora);
          malla.setMatrixAt(n, matrizDelBurgo(coche.x, coche.y, coche.z, coche.giro, 1, auxMatriz));
          cuenta.set(clave, n + 1);
        }
        for (const [clave, malla] of mallasDeCoches.current) {
          malla.count = cuenta.get(clave) ?? 0;
          malla.instanceMatrix.needsUpdate = true;
          malla.computeBoundingSphere();
        }
      }
    }

    /* ─ El fin: el ganador aparece en la plaza. ─ */
    const fin = enCursoDe('fin') !== undefined || (tablero.ganador !== null && colaTerminada(cola.current));
    if (fin !== ganadorEnPlaza) ponerGanadorEnPlaza(fin);
  });

  /*
   * ─ La cámara: seguir al que mueve y la pose de `fin`, DESPUÉS del cliente. ─
   *
   * Con la misma prioridad (0) que el `useFrame` del cliente, a propósito: r3f deja de
   * pintar solo en cuanto alguien se suscribe con prioridad mayor que cero (pasa a
   * «render manual»). Los suscriptores de igual prioridad corren en orden de montaje,
   * y el cliente monta su cámara ANTES que `<Burgo>` (§6.1, §6.2 y el banco): este
   * fotograma ve la pose que el cliente acaba de dejar y la mezcla desde ahí.
   */
  useFrame((s, dtCrudo) => {
    /* A pie la cámara es del paseo: ni se sigue al que mueve ni se sube a la plaza. Al volver a la mesa, sigue donde iba. */
    if (aPie) return;
    const dt = Math.min(0.1, Math.max(0, dtCrudo));
    const ahora = s.clock.elapsedTime;
    const cam = s.camera as THREE.PerspectiveCamera;
    const sg = seguimiento.current;
    const fin = ganadorEnPlaza;
    const enPieAhora = enPieRef.current;
    let objetivo: Punto | null = null;
    if (fin) objetivo = { x: 0, z: 0 };
    else if (seguirAlQueMueve && enPieAhora !== null && ahora < sg.hastaCuando) {
      const e = peones.current.get(enPieAhora);
      if (e !== undefined) {
        const p = posicionYRumbo(e, anillo, ahora);
        objetivo = { x: p.x, z: p.z };
      }
    }
    const pesoObjetivo = objetivo === null ? 0 : 1;
    sg.peso += (pesoObjetivo - sg.peso) * amortiguado(dt, AMORTIGUACION_DEL_SEGUIMIENTO);
    if (objetivo !== null) sg.objetivo = objetivo;
    if (sg.peso < 0.002) return;
    /* Dónde mira ahora la cámara del cliente: donde su rayo corta el suelo. */
    auxRayo.origin.copy(cam.position);
    cam.getWorldDirection(auxRayo.direction);
    const corte = auxRayo.intersectPlane(PLANO_DEL_SUELO, auxVector);
    if (corte === null) return;
    const objetivoActual = auxVector;
    const direccion = auxVector2.copy(cam.position).sub(objetivoActual).normalize();
    let distancia: number;
    let mira: THREE.Vector3;
    if (fin) {
      distancia = ALTURA_DEL_FIN;
      mira = new THREE.Vector3(sg.objetivo.x, 0, sg.objetivo.z);
      direccion.set(0.02, 1, 0.02).normalize();
    } else {
      distancia = ALCANCE_DEL_BURGO * CERCANIA_DE_SEGUIMIENTO * LEJANIA;
      mira = new THREE.Vector3(sg.objetivo.x, 0, sg.objetivo.z);
    }
    const posicion = mira.clone().addScaledVector(direccion, distancia);
    posicion.y = Math.max(ALTURA_MINIMA_DEL_OJO_DEL_BURGO, posicion.y);
    const miraMezclada = objetivoActual.clone().lerp(mira, sg.peso);
    const posicionMezclada = cam.position.clone().lerp(posicion, sg.peso);
    cam.position.copy(posicionMezclada);
    cam.lookAt(miraMezclada);
  });

  /*
   * ─ La caja del Burgo, pegada a la cámara: EL ÚLTIMO `useFrame` DE LA ESCENA. ─
   *
   * Aparte y después del seguimiento, porque el seguimiento se sale antes de terminar cuando no
   * sigue a nadie y porque es el que mueve la cámara. Copiada en el `useFrame` de la escena —el
   * primero—, la bandeja se pintaría con la cámara del fotograma anterior: justo al tirar, que es
   * cuando la cámara corre detrás del peón, los dados temblarían en la esquina. Con la misma
   * prioridad que todos, que r3f corre en orden de montaje.
   */
  useFrame((s) => {
    const b = grupoDeLaBandeja.current;
    if (b === null) return;
    b.position.copy(s.camera.position);
    b.quaternion.copy(s.camera.quaternion);
  });

  // -------------------------------------------------------------------------
  // Los toques
  // -------------------------------------------------------------------------

  const pulsado = useRef<{ instancia: number | undefined; x: number; y: number } | null>(null);
  const empiezaElToque = (e: ThreeEvent<PointerEvent>): void => {
    if (noEsElPrimario(e)) return;
    e.stopPropagation();
    loCogeLaInterfaz(e.nativeEvent);
    pulsado.current = { instancia: e.instanceId, x: e.pointer.x, y: e.pointer.y };
  };
  const esUnToque = (e: ThreeEvent<PointerEvent>): boolean => {
    const p = pulsado.current;
    pulsado.current = null;
    if (p === null || noEsElPrimario(e)) return false;
    const dx = ((e.pointer.x - p.x) * tamano.width) / 2;
    const dy = ((e.pointer.y - p.y) * tamano.height) / 2;
    return Math.hypot(dx, dy) < MINIMO_PARA_GIRAR && p.instancia === e.instanceId;
  };

  /*
   * ═══ EL SEÑALADO: QUÉ CASILLA MIRA EL PUNTERO, SIN TOCAR NADA ═══
   *
   * EL HUECO QUE ESTO TAPA. El cartel del pie del escritorio —nombre, barrio, precio, renta de
   * hoy y estado— tenía que salir AL POSAR EL CURSOR, «eso se hace veinte veces por turno», y
   * la escena no publicaba ningún aviso de señalado: sólo `alTocarCasilla`. El cliente lo
   * resolvió con lo que había —el primer toque señala y el segundo abre la tarjeta—, que
   * funciona y no es lo pedido: con ratón, veinte lecturas por turno eran veinte clics.
   *
   * CUÁNDO SALE EL AVISO NO SE DECIDE AQUÍ. Lo dicen `senaladoTrasElGesto` y `gestoAlSalir`
   * (`tipos.ts`, sin `three`): no se avisa dos veces seguidas del mismo índice, salir de una
   * casilla para entrar en la vecina no apaga nada —ni llegando la salida delante, que es lo
   * que r3f hace hoy, ni llegando detrás—, y un `instanceId` que no es una casilla se manda
   * como `null`. Están allí para que `verify:burgo-escena` los pueda correr con recorridos de
   * puntero de verdad; aquí sólo se guarda el último y se llama.
   *
   * EL SEÑALADO NO ES UN TOQUE, y por eso hace tres cosas MENOS que `tocaCasilla`:
   *
   *   · NO salta la cola. Mover el ratón por encima del tablero acabaría con todas las
   *     animaciones del turno antes de que se vieran; el toque sí la salta, a propósito.
   *   · NO para la propagación ni marca el gesto como de la interfaz: posar no le quita el
   *     gesto a nadie. Con el dedo, arrastrar por el anillo va leyendo casillas y el toque
   *     sigue funcionando igual, porque el señalado no le toca el `pulsado`.
   *   · NO lo apaga `props.quieto`. `quieto` está para que las asas no MANDEN mientras hay un
   *     movimiento en vuelo —una orden a medias es una jugada perdida—, y leer una casilla no
   *     manda nada: es justo mientras el peón anda cuando apetece mirar adónde va.
   */
  const senalada = useRef<number | null>(null);
  const senala = (gesto: GestoDeSenalado): void => {
    const paso = senaladoTrasElGesto(senalada.current, gesto, CASILLAS);
    if (!paso.avisa) return;
    senalada.current = paso.ahora;
    avisos.current.alSenalarCasilla?.(paso.ahora);
  };
  const senalaLaCasilla = (e: ThreeEvent<PointerEvent>): void => {
    senala({ que: 'posa', sobre: e.instanceId });
  };
  const dejaDeSenalarLaCasilla = (e: ThreeEvent<PointerEvent>): void => {
    /* Salir de una casilla casi siempre es entrar en la vecina, y el aviso ya trae debajo cuál: `gestoAlSalir`. */
    senala(gestoAlSalir(e.instanceId, e.intersections, e.eventObject));
  };

  const tocaCasilla = (e: ThreeEvent<PointerEvent>): void => {
    /*
     * CON EL DEDO NO HAY CURSOR POSADO: al levantarlo, el señalado se apaga. Va ANTES del
     * `esUnToque`, que se come el gesto cuando fue un arrastre: un dedo que arrastró por el
     * anillo y se levanta también deja de señalar. Con ratón NO se apaga nada — el cursor
     * sigue donde estaba y el cartel tiene que seguir puesto después de hacer clic.
     */
    if (esDeDedo(e)) senala({ que: 'levanta' });
    if (!esUnToque(e)) return;
    e.stopPropagation();
    const i = e.instanceId;
    if (i === undefined || i < 0 || i >= CASILLAS) return;
    saltarTodo(reloj.elapsedTime);
    if (avisos.current.quieto) return;
    avisos.current.alTocarCasilla?.(i);
  };
  const tocaPeon = (e: ThreeEvent<PointerEvent>): void => {
    if (!esUnToque(e)) return;
    e.stopPropagation();
    const i = e.instanceId;
    const a = i === undefined ? undefined : asientosRef.current[i];
    if (a === undefined) return;
    avisos.current.alTocarFigura?.(a.figura.asiento);
  };
  const tocaLosDados = (e: ThreeEvent<PointerEvent>): void => {
    if (!esUnToque(e)) return;
    e.stopPropagation();
    if (avisos.current.quieto) return;
    const alTocar = avisos.current.alTocarLosDados;
    if (alTocar === undefined) return;
    sucesosDeDados.current.push({ que: 'tocado' });
    void alTocar().then((resultado) => {
      /* `sucesoDelResultado` sólo devuelve `rechazado` o nada: aquí se escribe con la vista del Burgo. */
      const suceso = sucesoDelResultado(resultado);
      if (suceso !== null && suceso.que === 'rechazado' && vivo.current) sucesosDeDados.current.push({ que: 'rechazado' });
    });
  };
  /*
   * TOCAR EL RELOJ DE ARENA ES PASAR EL TURNO, con el mismo toque que los dados: apretar y soltar sin
   * arrastrar (`cajaDelAsaDelReloj` cuenta por qué no basta con apretar, como en Riberas). La arena se
   * vacía de golpe al mandarlo, y vuelve a caer por donde iba si la mesa no lo toma y el turno sigue.
   */
  const tocaElReloj = (e: ThreeEvent<PointerEvent>): void => {
    if (!esUnToque(e)) return;
    e.stopPropagation();
    if (avisos.current.quieto || avisos.current.reloj?.disponible !== true) return;
    const pasar = avisos.current.alPasarElTurno;
    if (pasar === undefined) return;
    const er = estadoDelReloj.current;
    const vuelta = er.vueltaPintada;
    er.sePulso = true;
    void pasar().then((resultado) => {
      if (resultado === 'hecho' || !vivo.current || er.vueltaPintada !== vuelta) return;
      er.sePulso = false;
      er.vaciando = null;
    });
  };
  /*
   * LA BANDEJA PARA EL TOQUE A LO DE DETRÁS, como la tapa de la mesa de Riberas: en r3f sólo se lanzan
   * rayos contra lo que tiene manejadores, así que sin estos una bandeja delante de una casilla
   * dejaría pasar el clic y el cartel a la casilla que no se ve. No marca `loCogeLaInterfaz`: arrastrar
   * desde la bandeja sigue girando el tablero. Y lleva `onPointerOver`/`onPointerOut`, que son los
   * que la meten en la lista de «señalados» de r3f y apagan lo que había detrás.
   */
  const paraElToque = (e: ThreeEvent<PointerEvent>): void => {
    e.stopPropagation();
  };
  const cierraElNaipe = (e: ThreeEvent<PointerEvent>): void => {
    if (noEsElPrimario(e)) return;
    e.stopPropagation();
    loCogeLaInterfaz(e.nativeEvent);
    const carta = enCurso(cola.current).find((x) => x.suceso.que === 'carta');
    if (carta !== undefined) cartaCerrada.current = cola.current.programados.find((p) => p.suceso === carta.suceso) ?? null;
  };

  // -------------------------------------------------------------------------

  const asientoEnPie = asientos.find((a) => a.figura.asiento === enPie) ?? null;
  const cargadoEnPie = asientoEnPie === null ? undefined : figuras.get(asientoEnPie.figura.figura);
  const refEnPie = asientoEnPie === null ? undefined : refsDePeon.current.get(asientoEnPie.figura.asiento);
  const ganador = asientos.find((a) => a.figura.asiento === tablero.ganador) ?? null;
  const cargadoDelGanador = ganador === null ? undefined : figuras.get(ganador.figura.figura);
  const estadoDelGanador = useMemo<{ current: EstadoDelPeon | null }>(() => ({ current: null }), []);
  const anilloDeLaPlaza = useMemo<AnilloEn3D>(
    () => ({
      ...ANILLO_DEL_BURGO,
      huecoDeAventurero: () => ({ x: 0, z: 0 }),
      rumboDeLaMarcha: () => 0.35,
    }),
    [],
  );
  useEffect(() => {
    if (!ganadorEnPlaza || ganador === null) {
      estadoDelGanador.current = null;
      return;
    }
    const e = nacer(0, semilla ^ 0x51, 0, ganador.indice);
    estadoDelGanador.current = { ...e, enPie: true, gesto: { clip: CLIP.saludar, desde: 0, dura: DURACION.saludar } };
  }, [ganadorEnPlaza, ganador, semilla, estadoDelGanador]);
  useFrame((s) => {
    const e = estadoDelGanador.current;
    if (e === null) return;
    const ahora = s.clock.elapsedTime;
    /* Saluda en bucle: se reprograma el gesto cada vez que termina. */
    if (e.gesto === null || ahora - e.gesto.desde >= e.gesto.dura) estadoDelGanador.current = { ...e, gesto: { clip: CLIP.saludar, desde: ahora, dura: DURACION.saludar } };
  });

  return (
    <>
      {/*
       * La niebla la mueve el fotograma: la de la mesa, que se retira con el ojo (`laNieblaDeLaMesa`: en retrato el ojo
       * se retira para que quepa el anillo y una niebla fija dejaba el tablero en blanco), o la de a pie. Los `args` son
       * sólo con los que nace.
       */}
      <fog ref={laNiebla} attach="fog" args={[COLOR_DE_LA_NIEBLA, NIEBLA_DE_LA_MESA.cerca, NIEBLA_DE_LA_MESA.lejos]} />

      {/* El fondo: la cúpula de mediodía pegada a la cámara. Se dibuja la primera y no escribe profundidad. */}
      <mesh ref={cupula} geometry={geometrias.cielo} material={materiales.cielo} frustumCulled={false} renderOrder={-10} raycast={() => null} />

      {/* Las luces de mediodía, sin sombras (§5.6). */}
      <hemisphereLight args={[LUZ.hemisferio.cielo, LUZ.hemisferio.suelo, LUZ.hemisferio.intensidad]} />
      <directionalLight position={[LUZ.sol.rumbo[0] * 100, LUZ.sol.rumbo[1] * 100, LUZ.sol.rumbo[2] * 100]} intensity={LUZ.sol.intensidad} color={LUZ.sol.color} />

      {/* El suelo del anillo, la plaza y la tierra: una geometría propia con color por vértice. */}
      <mesh geometry={suelo.geometria} material={materiales.suelo} raycast={() => null} />

      {/* Los precios y los emblemas de las casillas: fundidos en una sola geometría, tinta plana. */}
      {obras === null ? null : <mesh geometry={obras} material={materiales.bulto} position={[0, 0, 0]} raycast={() => null} />}
      {trenGeometria === null ? null : <instancedMesh ref={trenes} args={[trenGeometria, materiales.bulto, TREN.cuantos]} frustumCulled={false} raycast={() => null} />}
      {/* Los precintos de las casillas hipotecadas: tinta plana, como los rótulos, y uno por casilla. */}
      {precintoGeometria === null ? null : <instancedMesh ref={precintos} args={[precintoGeometria, materiales.rotulo, CAPACIDAD.precintos]} frustumCulled={false} raycast={() => null} />}
      {tapaGeometria === null ? null : <instancedMesh ref={tapas} args={[tapaGeometria, materiales.bulto, sitiosVivos.cofres.length]} frustumCulled={false} raycast={() => null} />}
      {ruletaGeometria === null ? null : <instancedMesh ref={ruletas} args={[ruletaGeometria, materiales.bulto, sitiosVivos.ruletas.length]} frustumCulled={false} raycast={() => null} />}
      {joyaGeometria === null ? null : <instancedMesh ref={joya} args={[joyaGeometria, materiales.bulto, 1]} frustumCulled={false} raycast={() => null} />}
      {rejaDeLaCeldaGeometria === null ? null : (
        <mesh
          ref={rejaDeLaCelda}
          geometry={rejaDeLaCeldaGeometria}
          material={materiales.bulto}
          position={[sitiosVivos.reja.x, sitiosVivos.reja.y, sitiosVivos.reja.z]}
          rotation={[0, sitiosVivos.reja.giro, 0]}
          raycast={() => null}
        />
      )}
      {monedaDeLaOficinaGeometria === null ? null : <mesh ref={monedaDeLaOficina} geometry={monedaDeLaOficinaGeometria} material={materiales.bulto} visible={false} raycast={() => null} />}
      {bocanadaGeometria === null ? null : <instancedMesh ref={humo} args={[bocanadaGeometria, materiales.bulto, BOCANADAS_DEL_HUMO]} visible={false} frustumCulled={false} raycast={() => null} />}
      {ondaGeometria === null ? null : (
        <mesh ref={onda} geometry={ondaGeometria} material={materiales.bulto} position={[sitiosVivos.alberca.x, sitiosVivos.alberca.y, sitiosVivos.alberca.z]} visible={false} raycast={() => null} />
      )}
      {rotulos === null ? null : <mesh geometry={rotulos.geometria} material={materiales.rotulo} position={[0, 0, 0]} raycast={() => null} />}

      {/*
        LA CIUDAD. Una `InstancedMesh` por pieza del pack y una por cuenta de triángulos de
        bulto; las que no tienen nada montado se quedan con `count = 0` y NO cuestan una
        llamada de dibujo (three sale antes de `renderInstances` con `primcount === 0`), que
        es lo que hace que 174 grupos por tres niveles quepan en unas decenas de llamadas.
      */}
      {laCiudad === null ? null : (
        <group>
          {laCiudad.piezas.map((m) => (
            <instancedMesh
              key={m.clave}
              ref={(malla) => {
                if (malla === null) {
                  mallasDeLaCiudad.current.delete(m.clave);
                  return;
                }
                malla.userData.capacidad = m.capacidad;
                /* El nombre es para la lupa del banco: una malla sin nombre no se puede señalar. */
                malla.name = m.clave;
                malla.count = 0;
                mallasDeLaCiudad.current.set(m.clave, malla);
                reparto.current.desde = null;
              }}
              args={[m.geometria, laCiudad.material, m.capacidad]}
              raycast={() => null}
            />
          ))}
          {laCiudad.bultos.map((m) => (
            <instancedMesh
              key={m.clave}
              ref={(malla) => {
                if (malla === null) {
                  mallasDeLaCiudad.current.delete(m.clave);
                  return;
                }
                malla.userData.capacidad = m.capacidad;
                /* El nombre es para la lupa del banco: una malla sin nombre no se puede señalar. */
                malla.name = m.clave;
                malla.count = 0;
                mallasDeLaCiudad.current.set(m.clave, malla);
                reparto.current.desde = null;
              }}
              args={[m.geometria, materiales.bulto, m.capacidad]}
              raycast={() => null}
            />
          ))}
          {laCiudad.coches.map((m) => (
            <instancedMesh
              key={m.clave}
              ref={(malla) => {
                if (malla === null) {
                  mallasDeCoches.current.delete(m.clave);
                  return;
                }
                malla.userData.capacidad = m.capacidad;
                /* El nombre es para la lupa del banco: una malla sin nombre no se puede señalar. */
                malla.name = m.clave;
                malla.count = 0;
                mallasDeCoches.current.set(m.clave, malla);
              }}
              args={[m.geometria, laCiudad.material, m.capacidad]}
              raycast={() => null}
            />
          ))}
          {laCiudad.cintas.map((g, k) => (
            <mesh key={`cinta-${String(k)}`} geometry={g} material={materiales.cinta} raycast={() => null} />
          ))}
        </group>
      )}

      {mundo === null ? null : (
        <group>
          {mundo.fundido === null ? null : <mesh geometry={mundo.fundido.geometria} material={mundo.fundido.material} raycast={() => null} />}
          {mundo.aspas === null ? null : (
            <group matrix={mundo.aspas.matrizDelMolino} matrixAutoUpdate={false}>
              {/* La posición como TERNA, no como Vector3: fiber sólo copia un vector de SU copia de three. */}
              <mesh ref={aspas} position={[mundo.aspas.posicion[0], mundo.aspas.posicion[1], mundo.aspas.posicion[2]]} geometry={mundo.aspas.geometria} material={mundo.aspas.material} raycast={() => null} />
            </group>
          )}
          {mundo.reja === null ? null : (
            <group ref={rejaGrupo} position={[mundo.reja.puesta.x, mundo.reja.puesta.y, mundo.reja.puesta.z]} rotation={[0, mundo.reja.puesta.giro, 0]}>
              <mesh geometry={mundo.reja.geometria} material={mundo.reja.material} raycast={() => null} />
            </group>
          )}
          {mundo.nubes.map((nube, k) => (
            <instancedMesh
              key={`nube-${String(k)}`}
              ref={(m) => {
                nubes.current[k] = m;
              }}
              args={[nube.geometria, nube.material, nube.puestas.length]}
              frustumCulled={false}
              raycast={() => null}
            />
          ))}
          {mundo.casa === null || mundo.material === null ? null : (
            <instancedMesh ref={casas} args={[mundo.casa, mundo.material, CAPACIDAD.casas]} frustumCulled={false} raycast={() => null} />
          )}
          {mundo.peon === null || mundo.material === null ? null : (
            <instancedMesh ref={peonesMalla} args={[mundo.peon, mundo.material, CAPACIDAD.peones]} frustumCulled={false} onPointerDown={empiezaElToque} onPointerUp={tocaPeon} />
          )}
          {mundo.material === null
            ? null
            : banderasPorColor.map((b, k) => (
                <instancedMesh
                  key={b.hex}
                  ref={(m) => {
                    banderas.current[k] = m;
                  }}
                  args={[b.geometria, mundo.material as THREE.Material, CAPACIDAD.banderas]}
                  frustumCulled={false}
                  raycast={() => null}
                />
              ))}
          {mundo.moneda === null || mundo.material === null || !plena ? null : (
            <instancedMesh ref={monedas} args={[mundo.moneda, mundo.material, CAPACIDAD.monedas]} frustumCulled={false} raycast={() => null} />
          )}
        </group>
      )}

      {/* Los discos de contacto de los peones, la marca de casilla y los discos del trato. */}
      <instancedMesh ref={discos} args={[geometrias.disco, materiales.disco, CAPACIDAD.discos]} frustumCulled={false} raycast={() => null} />
      <group renderOrder={ORDEN_DE_LAS_CASILLAS}>
        <instancedMesh ref={marcas} args={[geometrias.marca, materiales.marca, CAPACIDAD.marcas]} frustumCulled={false} renderOrder={ORDEN_DE_LAS_CASILLAS} raycast={() => null} />
      </group>
      <instancedMesh ref={tratoMalla} args={[geometrias.trato, materiales.trato, CAPACIDAD.trato]} frustumCulled={false} raycast={() => null} />

      {/*
        Las asas de las casillas: UNA malla instanciada, `instanceId → casilla`, y sólo si hay
        quien atienda el toque O el señalado. Con el señalado basta: un cliente que sólo quiera
        el cartel al posar el cursor —o una vista de mirón, que no manda nada— necesita estas
        asas igual, y sin esa segunda condición las montaría un `alTocarCasilla` de mentira.
      */}
      {props.alTocarCasilla === undefined && props.alSenalarCasilla === undefined ? null : (
        <instancedMesh
          ref={asas}
          args={[geometrias.asaDeCasilla, materiales.asa, CASILLAS]}
          onPointerDown={empiezaElToque}
          onPointerUp={tocaCasilla}
          onPointerMove={senalaLaCasilla}
          onPointerOut={dejaDeSenalarLaCasilla}
        />
      )}

      {/*
        LA CAJA DEL BURGO, pegada a la pantalla (`bandeja-de-los-dados.ts`). El grupo de fuera copia la
        cámara en el último `useFrame`; el de dentro pone la caja en su esquina, cabeceada hacia el ojo
        (`cabeceoHaciaElOjo`) y a su escala. Todo lo que cuelga de él va en unidades de bandeja: la caja
        y sus piezas, el reloj, los dos dados y las dos asas, que sólo se montan cuando hay algo que mandar.

        LAS LLAMADAS DE DIBUJO SE CUENTAN: en la calidad sobria la escena tiene 90, y con la caja recién
        puesta hacía 92 (medido en el banco). Por eso los mazos van con sus emblemas en una geometría, la
        placa con su cantidad en otra, y las dos asas con `visible={false}`: r3f no mira `visible` al tirar
        rayos —es el fallo que contó una interfaz apagada que seguía cogiendo piezas—, así que un asa
        escondida se sigue tocando y no se dibuja. Se DESMONTAN cuando no se puede mandar, que es lo que sí
        le quita el toque.
      */}
      <group ref={grupoDeLaBandeja}>
        <group
          position={[poseDeLaBandejaEnPantalla.x, poseDeLaBandejaEnPantalla.y, poseDeLaBandejaEnPantalla.z]}
          rotation={[poseDeLaBandejaEnPantalla.cabeceo, 0, 0]}
          scale={[poseDeLaBandejaEnPantalla.escala, poseDeLaBandejaEnPantalla.escala, poseDeLaBandejaEnPantalla.escala]}
        >
          {cajaGeometria === null ? null : (
            <mesh geometry={cajaGeometria} material={materiales.suelo} onPointerDown={paraElToque} onPointerUp={paraElToque} onPointerMove={paraElToque} onPointerOver={paraElToque} onPointerOut={paraElToque} />
          )}
          {/* Las casas y los hoteles que le quedan al Concejo. */}
          {piezasDeLaCaja.casita === null ? null : <instancedMesh ref={casitas} args={[piezasDeLaCaja.casita, materiales.suelo, CASAS_DEL_CONCEJO]} frustumCulled={false} raycast={() => null} />}
          {piezasDeLaCaja.hotelito === null ? null : <instancedMesh ref={hotelitos} args={[piezasDeLaCaja.hotelito, materiales.suelo, HOTELES_DEL_CONCEJO]} frustumCulled={false} raycast={() => null} />}
          {/* Los dos mazos, tan altos como cartas les quedan, con su emblema encima. */}
          {mazosGeometria === null ? null : <mesh geometry={mazosGeometria} material={materiales.suelo} raycast={() => null} />}
          {/* El dinero: sus billetes en montones y la placa con la cantidad. */}
          {piezasDeLaCaja.billete === null ? null : <instancedMesh ref={billetes} args={[piezasDeLaCaja.billete, materiales.suelo, BILLETES_A_LA_VISTA]} frustumCulled={false} raycast={() => null} />}
          {piezasDeLaCaja.colorDelBillete === null ? null : <instancedMesh ref={coloresDeLosBilletes} args={[piezasDeLaCaja.colorDelBillete, materiales.suelo, BILLETES_A_LA_VISTA]} frustumCulled={false} raycast={() => null} />}
          {placaGeometria === null ? null : <mesh geometry={placaGeometria} material={materiales.suelo} position={[sitioDeLaPlaca(forma).x, sitioDeLaPlaca(forma).y, sitioDeLaPlaca(forma).z]} raycast={() => null} />}
          {/*
            El reloj de arena, de pie junto a los dados: el modelo de Riberas en plena, los conos en sobria.
            Su asa propia va APAGADA: pasar el turno es tocar el asa de la caja (`tocaElReloj`), que la
            envuelve, y no apretar ésta.
          */}
          {/*
            Va donde va el MODELO y no hay segundo sitio: el respaldo de conos se sentaba en
            `cinturaDeLosConos`, y ese reloj ya no existe. La medida se queda en la bandeja
            porque el nicho sigue tallado para que quepa de sobra, no para colocar nada.
          */}
          <group position={[plano.reloj.x, plano.reloj.centroDelModelo, plano.reloj.z]}>
            <RelojDeArena
              cuerpo={cuerpoDelReloj}
              asa={asaDelReloj}
              lado={plano.reloj.lado}
              ancho={plano.reloj.lado * ASA_DEL_RELOJ_DE_ARENA.ancho}
              encendido={false}
              modelo={relojMontado?.clon ?? null}
              onPulsar={NADA_QUE_HACER}
            />
          </group>
          {([0, 1] as const).map((i) => (
            <group
              key={`dado-${String(i)}`}
              ref={(g) => {
                dadosGrupos.current[i] = g;
              }}
            >
              {dadoDelPack !== null ? (
                <mesh geometry={dadoDelPack.geometria} material={dadoDelPack.material} scale={[ARISTA_DE_LOS_DADOS / ARISTA_DEL_D6_EN_EL_PACK, ARISTA_DE_LOS_DADOS / ARISTA_DEL_D6_EN_EL_PACK, ARISTA_DE_LOS_DADOS / ARISTA_DEL_D6_EN_EL_PACK]} raycast={() => null} />
              ) : (
                <>
                  <mesh geometry={geometrias.dadoCuerpo} material={materiales.dadoCuerpo} raycast={() => null} />
                  <mesh geometry={geometrias.dadoPuntos} material={materiales.dadoPuntos} raycast={() => null} />
                </>
              )}
            </group>
          ))}
          {props.reloj?.disponible === true && props.alPasarElTurno !== undefined ? (
            <mesh position={[asaParaPasar.x, asaParaPasar.y, asaParaPasar.z]} geometry={asaParaPasarGeometria} material={materiales.asa} visible={false} onPointerDown={empiezaElToque} onPointerUp={tocaElReloj} />
          ) : null}
          {dados?.porTirar === true ? (
            <mesh position={[asaDeLosDados.x, asaDeLosDados.y, asaDeLosDados.z]} geometry={asaDeLosDadosGeometria} material={materiales.asa} visible={false} onPointerDown={empiezaElToque} onPointerUp={tocaLosDados} />
          ) : null}
        </group>
      </group>

      {/* El naipe de la carta, pegado a la cámara, en su capa. */}
      <group ref={naipeGrupo} visible={false} renderOrder={ORDEN_DE_LAS_CARTAS}>
        <mesh ref={naipe} geometry={geometrias.naipe} material={materiales.naipePregon} renderOrder={ORDEN_DE_LAS_CARTAS} onPointerDown={cierraElNaipe} />
      </group>

      {/* El aventurero en pie: uno, y sólo con marioneta. */}
      {plena && asientoEnPie !== null && cargadoEnPie !== undefined && refEnPie !== undefined && biblioteca.length > 0 ? (
        <Aventurero key={asientoEnPie.figura.asiento} estado={refEnPie} cargado={cargadoEnPie} biblioteca={biblioteca} anillo={anillo} />
      ) : null}
      {/* Y el ganador en la plaza, en `fin`. */}
      {plena && ganadorEnPlaza && cargadoDelGanador !== undefined && biblioteca.length > 0 ? (
        <Aventurero key="ganador" estado={estadoDelGanador} cargado={cargadoDelGanador} biblioteca={biblioteca} anillo={anilloDeLaPlaza} />
      ) : null}

      {/*
        QUIEN ANDA, sólo a pie: la marioneta del paseo común con la figura de su asiento, la que se
        eligió en el Muelle. No es el aventurero del raíl —ése sigue andando las casillas con su
        peón—: es quien mira, bajado a la calle. En «ojos» no se pinta, que la cámara está dentro de
        su cabeza. En las dos calidades: sin ella la cámara de hombro iría detrás de nadie.
      */}
      {aPie ? (
        <QuienAnda
          traer={traer}
          asiento={quienAnda}
          figura={figuraQueAnda}
          pose={paseo.pose}
          enPrimeraPersona={modoDelPaseo === 'ojos'}
          alFallar={avisaQueNoLlegaQuienAnda}
          cliente={elCanal.cliente}
        />
      ) : null}

      {/*
        LOS DEMÁS, sólo con canal y sólo a pie: mirando la mesa son figuras de dos unidades y media
        en un anillo de 864 de lado, lo mismo que quien anda, que tampoco se pinta allí. Con la MISMA
        altura del suelo que el paseo le da a quien anda, `alturaDelSuelo`: el andén, el puente y el
        bordillo se pisan igual, se mire a quien se mire. Sus figuras son las que cada uno eligió en
        el Muelle, y su rótulo lleva el color de su peón (`asientosQueAndanPorElBurgo`).
      */}
      {props.canal === undefined || !aPie ? null : (
        <LosDemas
          traer={traer}
          cliente={elCanal.cliente}
          presentes={elCanal.presentes}
          asientos={props.canal.asientos}
          yo={props.canal.yo}
          alturaEn={alturaDelSuelo}
        />
      )}

      {/*
        LOS HALLAZGOS, con la misma guarda y el mismo suelo: propinas, carteras y maletines girando
        por la calle, cada uno con su columna de luz, y el maletín la más alta (`paseo/los-hallazgos.tsx`).
      */}
      {props.canal === undefined || !aPie ? null : <LosHallazgos brotes={elCanal.brotes} alturaEn={alturaDelSuelo} />}
    </>
  );
}

/** Para el banco y el comprobador: las capacidades de las mallas instanciadas y la matriz de una puesta. */
export { CAPACIDAD, matrizDelBurgo };
