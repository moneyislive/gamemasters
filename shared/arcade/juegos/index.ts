/**
 * LOS ARCADES QUE TRAE ESTE BINARIO. Un fichero, un alta por juego.
 *
 * ═══ POR QUÉ EL ALTA NO VA DENTRO DE `frente.ts` ═══
 *
 * Porque un fichero de reglas que se da de alta a sí mismo al cargarse no se
 * puede leer sin instalarlo. Un comprobador que quiera examinar el manifiesto de
 * La Frente sin meterlo en el registro del proceso —o que quiera montar dos
 * repartos distintos en la misma ejecución, que es lo que hace `verify:reparto`
 * en el otro motor— tendría que soportar el efecto secundario de la importación.
 *
 * Es exactamente el reparto que ya hace `shared/juegos/index.ts`: `cluedo.ts`
 * declara y este fichero da de alta. Aquí además hace falta por una razón que
 * allí no existía: `shared/arcade/index.ts` es NÚCLEO y no se toca, así que las
 * altas no pueden vivir dentro de él. Este fichero es el sitio, y el `juegos/`
 * del árbol lo dice: las reglas del motor arriba, los juegos en su carpeta.
 *
 * ═══ IMPORTARLO TIENE EFECTO. Y ESO ES A PROPÓSITO ═══
 *
 * `import '../arcade/juegos'` instala. Es el mismo trato que el otro motor y por
 * el mismo motivo: quien quiera la Sala de Arcade llena importa esto una vez —lo
 * hace `app/src/vitrina.ts`— y no hay una lista escrita a mano en otro sitio que
 * se quede vieja el día que entre el segundo juego.
 *
 * ═══ REEXPORTADO UNO A UNO, NO CON `export *` ═══
 *
 * Por la cautela que la cabecera de `shared/arcade/index.ts` explica entera: con
 * la estrella, `tsx` dejó fuera funciones en tiempo de EJECUCIÓN mientras el
 * compilador las daba por buenas, y el servidor reventó al arrancar con «does not
 * provide an export named …». Cuesta una línea por nombre y se paga una vez.
 */
import { instalarArcade } from '../index';
import { avanzarElArcade, MANIFIESTO_EL_ARCADE, seAcabo as seAcaboElArcade } from './arcade';
import type { EstadoDelArcade } from './arcade';
import {
  avanzarLaFrente,
  loSecretoDeLaFrente,
  MANIFIESTO_FRENTE,
  proyectarLaFrente,
} from './frente';
import {
  avanzarLaRonda,
  loSecretoDeLaRonda,
  MANIFIESTO_RONDA,
  opcionesDeLaRonda,
  proyectarLaRonda,
  seAcabo as seAcaboLaRonda,
} from './ronda';
import type { EstadoDeLaRonda } from './ronda';
import {
  avanzarRiberas,
  loSecretoDeRiberas,
  MANIFIESTO_RIBERAS,
  opcionesDeRiberas,
  proyectarRiberas,
  seAcabo as seAcaboRiberas,
} from './riberas';
import type { EstadoDeRiberas } from './riberas';
import { avanzarLaPeonza, MANIFIESTO_PEONZA } from './peonza';
import type { EstadoDeLaPeonza } from './peonza';
import { laCifraDeElArcade } from './puntuaciones';

export {
  avanzarElArcade,
  CAIDA_LENTA,
  CAIDA_MEDIO,
  CAIDA_RAPIDA,
  CAMPO,
  EL_ARCADE,
  EMPEZAR as EMPEZAR_EL_ARCADE,
  intervaloCon,
  INTERVALO_INICIAL,
  INTERVALO_MINIMO,
  MANIFIESTO_EL_ARCADE,
  NAVE_MEDIO_ALTO,
  NAVE_MEDIO_ANCHO,
  NAVE_Y,
  OTRA as OTRA_PARTIDA,
  partidaNueva as partidaNuevaDelArcade,
  puntuacionDelArcade,
  RUMBO,
  seAcabo as seAcaboElArcade,
  TICK_HZ as TICK_HZ_DEL_ARCADE,
  TOPE_DE_CAIDAS,
  VELOCIDAD_NAVE,
} from './arcade';
export type { Caida, EstadoDelArcade, MomentoDelArcade, Rumbo } from './arcade';

export {
  avanzarLaPeonza,
  EMPUJAR,
  EMPUJON,
  estaGirando,
  GIRO_MAXIMO,
  MANIFIESTO_PEONZA,
  partidaNueva as partidaNuevaDeLaPeonza,
  PEONZA,
  ROCE,
  TICK_HZ as TICK_HZ_DE_LA_PEONZA,
  VUELTA,
} from './peonza';
export type { EstadoDeLaPeonza } from './peonza';

/*
 * ═══ LA PUNTUACIÓN YA NO SE REEXPORTA DESDE AQUÍ, Y ES LA NOTICIA DE LA FASE 5 ═══
 *
 * Aquí había seis nombres reexportados de `./puntuaciones`: la tabla, sus altas,
 * sus consultas y el tipo. Todo eso vive ahora en el NÚCLEO —`shared/arcade`— y se
 * importa de ahí, que es lo honrado: son funciones de plataforma, no de juegos, y
 * dejarlas asomando por la carpeta de los juegos haría creer que una casa que
 * quiera leer una cifra tiene que pasar por el reparto de este binario.
 *
 * De este fichero se sigue exportando lo que sí es del juego: `EstadoSinCifra`, que
 * la lanza El Arcade cuando le dan un estado que no es suyo.
 */
export { EstadoSinCifra, laCifraDeElArcade } from './puntuaciones';

export {
  ACIERTO,
  avanzarLaFrente,
  BARAJA,
  EMPEZAR,
  FRENTE,
  loSecretoDeLaFrente,
  MANIFIESTO_FRENTE,
  OTRA_RONDA,
  partidaNueva,
  PASO,
  proyectarLaFrente,
  segundosQueQuedan,
  SEGUNDOS_DE_RONDA,
  SEGUNDOS_PARA_COLOCARSE,
  TICK_HZ,
  TICS_DE_RONDA,
  TICS_PARA_COLOCARSE,
} from './frente';
export type {
  EstadoDeLaFrente,
  MomentoDeLaFrente,
  VistaDeLaFrente,
  VistaDeLaSala,
  VistaDeQuienLoLleva,
} from './frente';

export {
  avanzarLaRonda,
  BARAJA as BARAJA_DE_LA_RONDA,
  CARTAS_POR_MANO,
  EMPEZAR as EMPEZAR_LA_RONDA,
  JUGADORES,
  JUGAR,
  loSecretoDeLaRonda,
  MANIFIESTO_RONDA,
  opcionesDeLaRonda,
  partidaNueva as partidaNuevaDeLaRonda,
  proyectarLaRonda,
  RONDA,
  seAcabo as seAcaboLaRonda,
  tableroDeLaRonda,
} from './ronda';
export type {
  Carta,
  CartaEnLaBaza,
  EstadoDeLaRonda,
  JugadorDeLaRonda,
  JugadorVisto,
  MomentoDeLaRonda,
  VistaDeLaRonda,
} from './ronda';

export {
  ACAPARAMIENTO,
  ACEPTAR,
  ALZAR,
  ANO_BUENO,
  avanzarRiberas,
  bienDeLaFicha,
  BIENES,
  BIENES_DEL_ANO_BUENO,
  CARTAS_DEL_MAZO,
  claseDeLaCarta,
  CLASES_DE_CARTA,
  COMPRAR,
  COSTE_DE_LA_CARTA,
  cuentaDeBienes,
  deQuienEsElPaso,
  DOS_VEREDAS,
  EMPEZAR as EMPEZAR_RIBERAS,
  esTitulo,
  FUNDAR,
  GUARDIA,
  GUARDIA_MINIMA,
  largoDelVado,
  loSecretoDeRiberas,
  MANIFIESTO_RIBERAS,
  OFRECER,
  opcionesDeRiberas,
  partidaNueva as partidaNuevaDeRiberas,
  PASAR,
  proyectarRiberas,
  puntosDe,
  puntosOcultosDe,
  PUNTOS_DEL_TITULO,
  PUNTOS_DEL_VADO,
  PUNTOS_DE_LA_GUARDIA,
  PUNTOS_PARA_GANAR,
  recalcularElVado,
  comoSiSiempreHubieraHabidoMazo,
  recalcularLaGuardia,
  RECHAZAR,
  REVELAR,
  RIBERAS,
  seAcabo as seAcaboRiberas,
  seudonimoDeLaCarta,
  tableroDeRiberas,
  TIRAR,
  TITULOS,
  TOPE_DE_PIEZAS,
  VADO_MINIMO,
  VEREDAS_DE_LA_CARTA,
} from './riberas';
/*
 * `Carta` SALE DE AQUÍ CON APELLIDO, y no por gusto: La Ronda ya exporta un tipo
 * que se llama así, y las dos son cartas de juegos distintos. Es el mismo apaño que
 * `BARAJA_DE_LA_RONDA` de más arriba y por el mismo motivo — este fichero es la
 * puerta común de los juegos, y es ahí donde los nombres se cruzan.
 */
export type {
  Bien,
  Carta as CartaDeRiberas,
  CartaEnMano,
  ClaseDeCarta,
  Colono,
  ColonoVisto,
  EstadoDeRiberas,
  EstadoDelTrato,
  Ficha,
  Guardia,
  Isla,
  MomentoDeRiberas,
  Opcion,
  Pieza,
  Terreno,
  Titulo,
  Trato,
  Vado,
  VistaDeRiberas,
} from './riberas';

/**
 * EL ALTA. Manifiesto, reductor, proyección y `loSecreto` por la misma puerta.
 *
 * Las cuatro juntas y no en cuatro llamadas: `instalarArcade` está escrito así
 * para que no exista el estado intermedio de un juego declarado del que no se
 * sabe jugar, o —peor aquí— de un juego con `secretos: true` instalado sin nada
 * que tape. Con `secretos: true` y sin estas dos funciones, `exigirSecretosTapados()`
 * no dejaría arrancar al servidor, que es exactamente lo que tiene que pasar.
 */
instalarArcade({
  manifiesto: MANIFIESTO_FRENTE,
  avanzar: avanzarLaFrente,
  proyeccion: proyectarLaFrente,
  loSecreto: loSecretoDeLaFrente,
});

/**
 * «LA RONDA», el de la fase 2: la mesa en línea con mano oculta.
 *
 * ═══ POR QUÉ SU ESTADO SE INSTALA COMO `EstadoDeLaRonda | undefined` ═══
 *
 * Porque una mesa de arcade nace con `estado: undefined` —el árbitro lo
 * documenta como una forma legítima de empezar— y es el reductor quien construye
 * lo suyo en el primer movimiento, con la semilla y los asientos que le llegan en
 * el contexto. Eso es lo que hace que reejecutar el diario reparta exactamente
 * las mismas cartas.
 *
 * El parámetro se escribe a mano y no se deja inferir porque las tres funciones
 * lo usan en posiciones distintas —el reductor lo recibe y devuelve, la
 * proyección solo lo recibe— y con la inferencia el compilador escoge una de las
 * dos y las otras dos dejan de encajar.
 */
/*
 * ═══ Y CON `opciones()`, QUE ES LA MITAD DE LO QUE LA HACE JUGABLE ═══
 *
 * La mitad, y conviene que quede escrito porque registrarla sola NO basta y
 * durante un rato pareció que sí.
 *
 * Sin `opciones()` este juego no tenía botones: una partida repartida y en marcha
 * daba cero opciones a los cuatro sentados, así que no se podía jugar en ningún
 * cliente. Pero con `opciones()` y NADA MÁS, el mueble `formulario` pinta una
 * lista de botones y punto: quien tiene el turno ve cinco cartas y nada del
 * juego —ni la baza, ni el marcador, ni de quién es el turno—, los otros tres ven
 * una pantalla de disculpa, y al terminar la partida no se entera nadie de quién
 * ha ganado. Medido sobre una partida real, no supuesto.
 *
 * Por eso La Ronda declara además un TABLERO —`tableroDeLaRonda`, y su manifiesto
 * dice `mueble: 'tablero'`—, que es lo que trae el aviso, los paneles y las
 * cartas de la baza dibujadas. Las dos piezas juntas son las que la hacen
 * jugable, y en los DOS clientes: el de escritorio pinta el tablero con SVG del
 * navegador y la app con `ElTableroEnLinea`, que es el mismo camino genérico que
 * ya recorre un arcade instalado desde fuera.
 *
 * Que `opciones` sea opcional en el alta sigue estando bien —La Frente y El
 * Arcade pintan su propia pantalla y no les falta—; lo que estaba mal era que
 * este juego no hiciera ninguna de las dos cosas.
 */
instalarArcade<EstadoDeLaRonda | undefined>({
  manifiesto: MANIFIESTO_RONDA,
  avanzar: avanzarLaRonda,
  proyeccion: proyectarLaRonda,
  loSecreto: loSecretoDeLaRonda,
  opciones: opcionesDeLaRonda,
  seAcabo: seAcaboLaRonda,
});

/**
 * «EL ARCADE», el de la fase 3: sesenta fotogramas por segundo y una cifra.
 *
 * ═══ ENTRA CON TRES Y NO CON CUATRO, Y LA TERCERA ES NUEVA ═══
 *
 * Ni proyección ni `loSecreto`: declara `secretos: false` porque sus secretos
 * serían secretos entre asientos y aquí solo hay un asiento —de hecho ninguno: un
 * aparato y quien lo sujeta—. Está razonado entero en la cabecera de `arcade.ts`.
 *
 * ═══ Y LA PUNTUACIÓN YA ENTRA POR ESTA PUERTA: ES LA DEUDA DE LA FASE 3, PAGADA ═══
 *
 * Aquí ponía que el alta de este juego estaba INCOMPLETA por una limitación del
 * contrato: `instalarArcade` no tenía hueco para la puntuación, así que la cifra
 * de un estado opaco se leía de una tabla escrita a mano en `./puntuaciones.ts`.
 * Aquella tabla dejó de ser inofensiva en cuanto la fase 5 le añadió altas EN
 * EJECUCIÓN para el enchufe —era llana y sin anclar, y su propia cabecera
 * argumentaba que podía serlo «porque aquí no hay altas»—. La cabecera de ese
 * fichero cuenta la mudanza entera.
 *
 * `puntuacion` es ahora un campo del alta como los demás, va a la misma tabla
 * anclada que el reductor, y lo que se pasa es la función del propio juego.
 *
 * El parámetro se escribe a mano por lo mismo que en La Ronda: el reductor admite
 * `undefined` —una mesa nace sin estado, aunque este juego no tenga mesa— y con
 * la inferencia el compilador escoge una de las dos posiciones y la otra deja de
 * encajar.
 */
instalarArcade<EstadoDelArcade | undefined>({
  manifiesto: MANIFIESTO_EL_ARCADE,
  avanzar: avanzarElArcade,
  puntuacion: laCifraDeElArcade,
  seAcabo: seAcaboElArcade,
});

/**
 * «RIBERAS», el de la fase 4: el tablero hexagonal propio.
 *
 * ═══ ENTRA POR LA MISMA PUERTA QUE LOS OTROS TRES, Y ESA ES LA NOTICIA ═══
 *
 * Es el juego más rico de los cuatro —comercio con ciclo de vida, recursos
 * ocultos, un premio derivado que se recalcula, orden en serpentina y alguien
 * contestando sin tener el turno— y su alta es literalmente igual de larga que la
 * de La Ronda. Ni un campo nuevo en el manifiesto, ni un parámetro más en
 * `instalarArcade`, ni una llamada aparte. Eso es lo que la fase 4 existe para
 * demostrar, y por eso el tablero hexagonal va el cuarto y no el primero.
 *
 * ═══ Y DESDE LA FASE 5 ENTRA ADEMÁS SU `opciones()` ═══
 *
 * Este comentario decía que `opciones()` no cabía por esta puerta «y no porque
 * falte un hueco que haya que abrir: no hace falta ninguno», porque sus dos
 * clientes vivían dentro del propio juego. Era cierto PARA UN JUEGO DE DENTRO DEL
 * BINARIO, y sólo para eso: un arcade de fuera no tiene forma de llamarse a sí
 * mismo desde una pantalla que no ha escrito, así que sin el hueco la frase del
 * §7 —«los muebles genéricos son los únicos que un arcade de FUERA puede usar»—
 * valía a medias.
 *
 * Registrarla no cambia nada de cómo juega Riberas: sus dos clientes internos
 * siguen llamándola directamente, porque llamarla por el registro sería resolver
 * un id para ejecutar la función del fichero que se está leyendo. Lo que compra es
 * que la plataforma pueda preguntársela a CUALQUIER arcade, incluido uno que no
 * conozca — y con eso, que un mueble genérico pinte botones sin saber a qué se
 * juega.
 *
 * Los dos parámetros se escriben a mano: el estado porque las tres funciones lo
 * usan en posiciones distintas y con la inferencia el compilador escoge una y las
 * demás dejan de encajar, y la vista porque `opcionesDeRiberas` recibe `unknown`
 * a propósito —lo que le llega en el móvil es lo que vino por la red— y dejarlo
 * inferir la ataría a la forma de la vista, que es lo contrario de lo que hace
 * falta.
 */
instalarArcade<EstadoDeRiberas | undefined, unknown>({
  manifiesto: MANIFIESTO_RIBERAS,
  avanzar: avanzarRiberas,
  proyeccion: proyectarRiberas,
  loSecreto: loSecretoDeRiberas,
  opciones: opcionesDeRiberas,
  seAcabo: seAcaboRiberas,
});

/**
 * «LA PEONZA», la de la fase 5: la puerta del mueble `escena`, y nada más.
 *
 * ═══ ENTRA CON UN ALTA DE DOS LÍNEAS, Y ESO ES LO QUE TIENE QUE DEMOSTRAR ═══
 *
 * Ni proyección, ni `loSecreto`, ni opciones, ni puntuación: es un juego de un
 * aparato y una persona mirando girar una peonza. Que un arcade en TRES
 * DIMENSIONES quepa con exactamente la misma alta que el más pobre de todos es lo
 * que dice que el mueble es un dato del manifiesto y no una rama del motor.
 *
 * NO ES UN JUEGO-PRUEBA. Los cinco juegos-prueba empujan el motor por un eje cada
 * uno; éste no empuja nada y no pretende hacerlo. Su cabecera cuenta por qué es
 * deliberadamente pobre: un arcade de demostración rico se convierte en el modelo
 * de cómo se escribe uno de escena, y entonces el mueble sale con su forma.
 */
instalarArcade<EstadoDeLaPeonza | undefined>({
  manifiesto: MANIFIESTO_PEONZA,
  avanzar: avanzarLaPeonza,
});
