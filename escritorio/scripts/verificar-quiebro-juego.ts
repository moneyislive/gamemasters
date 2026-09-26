/**
 * ¿EL CLIENTE DEL QUIEBRO JUEGA LO QUE LA SALA ARBITRA? Todo lo puro de `red/`, `mandos/`, `camara/` y
 * `hud/`, comprobado sin navegador.
 *
 *   npx tsx scripts/verificar-quiebro-juego.ts        (desde escritorio/)
 *
 * ═══ QUÉ AFIRMA ═══
 *
 *   1. EL RELOJ DEL CANAL empieza en cero con cada canal, parte en tics de 50 ms, no manda pulsaciones de
 *      antes de abrir, y la red medida con `eco` da el desfase con el error de la asimetría y nada más.
 *   2. EL CANAL dice `hola` (con su reloj) y un `eco` detrás, un `eco` cada 2 s, tira lo mal formado,
 *      reconecta con espera creciente y NO reconecta tras los cierres que reintentar no arregla.
 *   3. LA PREDICCIÓN ES LA DE LA SALA: miles de tics andando, corriendo, quebrando y recibiendo empujones
 *      por el barrio DE VERDAD, y cada tramo que se manda es uno que la sala acepta según su contrato
 *      (en recta, dentro del límite, con los presupuestos); y si `sala.ts` ya existe, jugado contra ella
 *      sin una sola corrección. Las correcciones viejas se ignoran y el desvío se funde.
 *   4. LA INTERPOLACIÓN va entre dos fotos en tics de la sala, sigue un poco tras la última y se para, y
 *      el rumbo gira por el lado corto.
 *   5. EL GUION de los demás llega al impacto en el presente, espera a la foto en su pose final y funde
 *      sin retroceder NUNCA.
 *   6. LA SALA VISTA guarda lo que dice el cable (instantes pasados a `performance.now()`, relojes,
 *      montones, cargas) y cada `dentro` la deja en blanco.
 *   7. EL DICCIONARIO lee la declaración: qué es GOLPE, la Tanda, el Remanso, un Celador, un aviso.
 *   8. LA PARTIDA ENTERA contra un enchufe de mentira: un `aqui` por tic con `n` seguidos, la pulsación
 *      con el `ms` de su evento, el enganche, la Tanda que encadena, USAR que se mantiene con su `ms`.
 *   9. LOS MANDOS, EL ENGANCHE, LA CÁMARA y EL HUD: la zona muerta, el mejor blanco (y nunca uno tras una
 *      pared), la cámara que no entra en las cajas, el valor de las esquirlas y la pausa que reintenta
 *      sólo con una vista nueva.
 *  10. EL PUERTO DE PRUEBA abre en `quiebro` con el plazo de 300 s, lleva la llave en la cabecera y NUNCA
 *      en la dirección, y lee el rechazo silencioso como `LaMesa`.
 *  11. LOS FUENTES: ni un `onClick`, la llave nunca al almacén ni a la URL, fin de línea LF.
 *  12. EL MAPA DE LA CIUDAD ABIERTA (CIUDAD-ABIERTA §5.9): en el mapa no hay calle pintada donde hay una
 *      pared ni pared donde se anda, píxel a píxel; el minimapa gira la ciudad y las marcas con la misma
 *      cuenta; el plano toca en `pointerdown` (rumbo a un Fallo o a una cabina, «Aquí» en el nudo más
 *      cercano); los metros son los de la sala; y el hilo cabe en su tope, va por delante y no se mueve
 *      del suelo. Con la ciudad de verdad en cuanto exista, y siempre con la de ensayo.
 *  13. LA CIUDAD SE PISA (CIUDAD-ABIERTA, entrega 1): el cliente juega donde juega la sala (`red/lugar.ts`:
 *      la ciudad si el mundo de la liza es el de su traza, el barrio si no); con el límite `ciudad` la
 *      predicción cruza la ciudad entera por calles y la sala de verdad no corrige ni un paso; la partida
 *      saca los Prestados de la gente de la ciudad; el mapa VIVO de la partida (`red/orientarse.ts`) da
 *      las marcas con los metros por calles, el «Aquí» y el rumbo; la cámara no atraviesa las cajas de la
 *      ciudad; y el HUD monta el minimapa, el botón PLANO y el plano sólo en la ciudad. Con el productor de
 *      verdad (bloque 7 bis): en una oleada el límite es `ciudad` y se sale de la plaza.
 *  13 bis. LO QUE SE VIO JUGANDO LA ENTREGA 1 (revisión del 24-sep): el rótulo de la Bajada dice «Plaza ·
 *      Distrito · h:mm» con los nombres de `quiebro-nombres.ts` en las 192 plazas de las 32 trazas; el rumbo
 *      a cada una de las 640 cabinas acaba donde USAR descuelga, por un último tramo que se anda, y sus
 *      metros llegan a 0 allí; el ojo que pinta la cámara nunca queda dentro de una caja ni detrás del cerco
 *      en las salidas de avenida; y lo que va suelto sobre la escena lleva su sombra de noche.
 *  14. EL RAYO EN LOS MANDOS (`docs/quiebro/EL-RAYO.md` §1 y §3, contrato del rayo §5.1): lo que apuntan las
 *      manos (cargar, soltar que dispara, cancelar que anula, el QUIEBRO que cancela y esquiva, lo que se tira
 *      mientras se carga); la partida con un tiro de juguete contra el enchufe de mentira —`[apuntar, msPulsar,
 *      0]` repetido y plantado, UN `[soltar, msSoltar, blanco]`, el toque corto, cancelar que no manda nada, el
 *      daño y el quiebro que cortan, los efectos llamados en el acto y leídos en cada llamada, la recarga que
 *      pone la bala de la sala, los gestos propios y ajenos, cuándo NO se empieza a cargar (tocado, descolocado,
 *      con un golpe propio anunciado, fuera de combate, sin cuerpo) y lo que corta una carga en el acto (la
 *      fase, el fondo, quedarse sin cuerpo)—; el apuntado en PANTALLA (alcance, vista, histéresis, el giro que
 *      pone al blanco bajo la mira, el imán, la línea de la mira); la cámara (el zoom de campo hasta 10° sin
 *      acercar, sus tiempos, el golpe de −2°, la sensibilidad, el giro de entrada en curva suave); la mira
 *      fotograma a fotograma (tres marcas, sin círculo, su radio, su muelle, el cierre por niveles, la
 *      tensión, el PUNTO del pleno sin aro, el arco sólo abierto, los dos finales, el halo desenfocado); los
 *      botones (iconos propios, sin emoji, las clases que salen de la sala, las recargas, la amenaza, la Tanda,
 *      sus tamaños, los rótulos DENTRO del aro); el teclado (la R); y el tiro de juguete sólo en desarrollo.
 *
 * ═══ CÓMO SE SABE QUE MIRA ═══
 *
 * Cada comprobación se vio roja rompiendo el producto en una copia (ver el informe del frente «juego»),
 * y las que cuentan cosas llevan su suelo: una que recorre cero tics no pasa.
 *
 * ═══ POR QUÉ NO USA `server/scripts/arnes.ts` ═══
 *
 * `verify:fronteras` prohíbe que `escritorio/` importe de `server/`: se copia la forma del arnés (0 verde,
 * 1 rojo, 2 bloque saltado, 3 reventado), como hacen los demás comprobadores del Quiebro.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import '../../shared/arcade/juegos';
import { avanzarConMotivo, opcionesDeArcade, vistaDeAsiento } from '../../shared/arcade';
import type { Opcion } from '../../shared/arcade';
import { CABINA, DURACION_MS, ESTILOS } from '../../shared/arcade/juegos/quiebro-reglas';
import { lizaDeLaMesa } from '../../shared/arcade/juegos/lizas';
import { leerVistaDelQuiebro } from '../../shared/arcade/juegos/quiebro-vista';
import { barrioDeLaNoche, mundoDeLaLizaDelBarrio, ID_DE_LIMITE_EN_LA_LIZA } from '../../shared/arcade/juegos/quiebro-barrio';
import { sePuedeLidiar } from '../../shared/arcade/juegos/lizas';
import { NOMBRES_DEL_QUIEBRO } from '../../shared/arcade/juegos/quiebro-nombres';
import type { VistaDelQuiebro } from '../../shared/arcade/juegos/quiebro-vista';
import { UNO } from '../../shared/mecanicas/fijo';
import { arenaDe, seAndaEnRecta, sePuedeEstar } from '../../shared/mecanicas/mundo';
import { arenaDeLaLiza, problemasDeLaDeclaracion, VERSION_DE_LA_DECLARACION } from '../../shared/mecanicas/liza/declaracion';
import { faltaPorElGrafoParaProbar } from '../../shared/mecanicas/liza/cerebro';
import type {
  AccionDeclarada,
  EfectoDeclarado,
  LizaDeclarada,
  PuestaDeEstado,
  ReglasDeAsiento,
} from '../../shared/mecanicas/liza/declaracion';
import {
  CIERRE_DE_LA_LIZA,
  ECO_CADA_MS,
  leerMensajeDelAparato,
  RESULTADO,
  textoDeLaSala,
  TOPE_DE_AQUIS_DE_GOLPE,
  VERSION_DE_LA_LIZA,
} from '../../shared/mecanicas/liza/protocolo';
import type { Aqui, MensajeDeLaSala, MensajeDelAparato, SucesoDelTic } from '../../shared/mecanicas/liza/protocolo';
import type { AvanzarLaSala, EntradaDeLaSala, SalaNueva } from '../../shared/mecanicas/liza/tipos-de-la-sala';
import { RelojDelCanal, RedDelAparato, mediana } from '../src/quiebro/red/reloj';
import { CanalDeLaLiza, direccionDeLaLiza, esperaDelIntento, ESPERA_SI_LLENA_MS, PRIMERA_ESPERA_MS } from '../src/quiebro/red/canal';
import type { Enchufe, EstadoDelCanal, Relojes } from '../src/quiebro/red/canal';
import { FotosDeLaSala, muestraNueva } from '../src/quiebro/red/interpolacion';
import { ALCANZA_M, FUNDIDO_MS, LineaDelCuerpo, pintadoNuevo } from '../src/quiebro/red/guion';
import { dentroDelLimite, PasoPropio } from '../src/quiebro/red/prediccion';
import { SalaVista } from '../src/quiebro/red/sala-vista';
import { leerLaLiza } from '../src/quiebro/red/diccionario';
import { botonesNuevos, Partida, ROTULO_DE_LA_VUELTA_MS } from '../src/quiebro/red/partida';
import { CAIDA_MINIMA_MS, CAIDA_MS, GiroEnLoAlto, RelojDeLaBajada } from '../src/quiebro/red/bajada';
import { PuertoDePrueba, PLAZO_DE_LA_MESA_S } from '../src/quiebro/red/puerto-de-prueba';
import { EstadoDeLosMandos, sinZonaMuerta, ZONA_MUERTA } from '../src/quiebro/mandos/estado';
import { escucharElFondo, EVENTO_DEL_FONDO } from '../src/quiebro/mandos/fondo';
import { engancharElTeclado } from '../src/quiebro/mandos/teclado';
import { quienesFaltanEnLaBajada } from '../src/quiebro/hud/lectura';
import { Reunion, RotuloDeLaBajada } from '../src/quiebro/hud/Pantallas';
import type { PuertoDeMesa } from '../src/quiebro/contrato';
import { anguloEntre, direccionHacia, elegirBlanco } from '../src/quiebro/mandos/enganche';
import { camaraNueva, DISTANCIA_ABIERTA, DISTANCIA_AL_HOMBRO, encuadrar, FOV_PC, losaEnTresEjes } from '../src/quiebro/camara/encuadre';
import type { CajaAlta } from '../src/quiebro/camara/encuadre';
import { queHacerConLaEleccion, relojEnTexto, valorDeLasEsquirlas, etiquetaDeLaFase, cifra } from '../src/quiebro/hud/lectura';
import type { NocheDeLaCiudad } from '../../shared/arcade/juegos/quiebro-ciudad';
import { BORDE_DE_LA_CIUDAD, campoHasta, ciudadDeLaMesa, ciudadDeLaNoche, nudoMasCercano, TRAZAS, triosDeFallos } from '../../shared/arcade/juegos/quiebro-ciudad';
import type { FuenteDelMapa, MarcaDelMapa, OrdenesDelMapa, RumboTendido } from '../src/quiebro/orientacion';
import { alMinimapa, alPlano, LADO_DEL_LIENZO, LADO_DEL_MINIMAPA_PT, METROS_DEL_HILO, METROS_DEL_RESCATE, metrosQueSeEnsenan, TECLA_DEL_PLANO, TRIANGULOS_DEL_HILO } from '../src/quiebro/orientacion';
import type { ColoresDelMapa, LienzoDelMapa, PincelDelMapa } from '../src/quiebro/hud/mapa';
import {
  alPlanoEnPantalla,
  aplicar,
  esLaTeclaDelPlano,
  giradoComoCss,
  giroQueFalta,
  LIENZO_DEL_PLANO,
  lienzoDeLaNoche,
  MARGEN_DEL_BORDE_PT,
  pintarLaCiudad,
  RADIO_DEL_MINIMAPA_M,
  seEnsenaEnElMapa,
  sitioEnElMinimapa,
  tocarElPlano,
  transformacionDelMinimapa,
} from '../src/quiebro/hud/mapa';
import {
  CamposPorMeta,
  hiloNuevo,
  INICIO_DEL_HILO,
  metrosHastaElSitio,
  metrosPorCalles,
  mismoObjetivo,
  nudoDelObjetivo,
  NUMEROS_POR_GLIFO,
  objetivoDeLaMarca,
  PASO_DEL_GLIFO,
  rumboHacia,
  tenderElHilo,
  tramoFinal,
  TRIANGULOS_POR_GLIFO,
} from '../src/quiebro/hud/rumbo';
import { nocheDeEnsayo } from '../src/quiebro/hud/ciudad-de-ensayo';
import { Minimapa } from '../src/quiebro/hud/Minimapa';
import { BotonDelPlano, Plano } from '../src/quiebro/hud/Plano';
import {
  ID_DEL_LIMITE_DE_LA_CIUDAD,
  caminoPorElCampo,
  claseDeZonaDePlaza,
  despejarLasPlazas,
  distanciaPorCalles,
  idDeZonaDeCabina,
  mundoDeLaLizaDeLaCiudad,
} from '../../shared/arcade/juegos/quiebro-ciudad';
import type { GrafoDeLaCiudad } from '../../shared/arcade/juegos/quiebro-ciudad';
import { durmienteMasCercanoEnLaCiudad } from '../../shared/arcade/juegos/quiebro-durmientes';
import { rumboDeRadianes } from '../../shared/mecanicas/andar';
import { cajasDelLugar, lugarDeLaMesa, rotuloDelLugar } from '../src/quiebro/red/lugar';
import type { LugarDeLaNoche } from '../src/quiebro/red/lugar';
import { OrientacionDeLaPartida } from '../src/quiebro/red/orientarse';
import type { PartidaQueOrienta } from '../src/quiebro/red/orientarse';
import { genteDeLaCiudad } from '../src/quiebro/personajes/multitud';
import { cajaParaLaCamara, ojoFueraDeLasCajas } from '../src/quiebro/camara/Camara';
import { Hud } from '../src/quiebro/hud/Hud';
import type { CuerpoPintado } from '../src/quiebro/cuerpos';
import type { TiroDeclarado } from '../../shared/mecanicas/liza/declaracion';
import { cargaDe, leerElTiro, nivelDeLaCarga, semillaDelRayo } from '../src/quiebro/rayo/contrato';
import type { BocaDe, DisparoDelRayo, EfectosDelRayo, EstadoDelRayo } from '../src/quiebro/rayo/contrato';
import {
  apuntadoNuevo,
  apuntarPorLaMira,
  desvioDeGiro,
  distanciaAlEje,
  elegirBlancoDelRayo,
  empujeFueraDeLaSilueta,
  enPantallaNuevo,
  FRANJA_DE_LA_SILUETA,
  FRICCION_EN_EL_BLANCO,
  friccionDelIman,
  giroDeEntrada,
  GIRO_DE_ENTRADA_MS,
  giroParaApuntar,
  HISTERESIS_DEL_BLANCO,
  ojoNuevo,
  pasoDelGiroDeEntrada,
  proyectar,
  RADIO_DE_ENGANCHE,
  RADIO_DEL_IMAN,
  siluetaEnPantalla,
  siluetaNueva,
  tironDelIman,
} from '../src/quiebro/mandos/rayo';
import type { OjoDelRayo } from '../src/quiebro/mandos/rayo';
import { ACERCAMIENTO_AL_APUNTAR, BAJADA_AL_APUNTAR, FOV_DE_LA_CARGA, FOV_MOVIL, HOMBRO_DE_APUNTAR, HOMBRO_M, retrocesoDelDisparo, sensibilidadDelZoom, suavizarElZoom, ZOOM_AL_EMPEZAR, zoomDeLaCarga } from '../src/quiebro/camara/encuadre';
import type { EncuadreDeLaCamara } from '../src/quiebro/camara/encuadre';
import { AJUSTE_MINIMO, ajusteDelRotulo, CIRCUNFERENCIA_DEL_ARO, clasesDeLosBotones, cuerdaDelAro, desfaseDelAro, MandosTactiles, NOMBRE_DEL_RAYO, pintarLasMuescas, segundosDeLaRecarga } from '../src/quiebro/mandos/Tactil';
import { RayoDePC } from '../src/quiebro/hud/RayoDePC';
import {
  ARCO_ENTERO_DESDE_PX,
  ARCO_NINGUNO_BAJO_PX,
  CANCELAR_MS,
  DISPARO_MS,
  escalaDeLaMarca,
  estadoDeLaMiraNuevo,
  luzDelArco,
  MiraDelRayo,
  muelleDelRadio,
  pasoDeLaMira,
  PULSO_MS,
  radioDeLaMira,
  RADIO_DEL_PLENO_PX,
  RADIO_DEL_PUNTO_PX,
  RADIO_MAXIMO_PX,
  RADIO_MINIMO_PX,
  TENSION,
  TENSION_MS,
  TRAMO_DEL_ARCO,
  tramoDelArco,
} from '../src/quiebro/hud/MiraDelRayo';
import type { DibujoDeLaMira, VistaDeLaMira } from '../src/quiebro/hud/MiraDelRayo';

/* ─────────────────────────────── El arnés, en corto ─────────────────────────────── */

let hechas = 0;
const fallos: string[] = [];
function comprobar(que: string, bien: boolean, detalle?: unknown): boolean {
  hechas++;
  if (!bien) {
    let texto = '';
    if (detalle !== undefined) {
      try {
        texto = ` — ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}`.slice(0, 900);
      } catch {
        texto = ` — ${String(detalle)}`;
      }
    }
    fallos.push(`${que}${texto}`);
  }
  return bien;
}
function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}
function nota(texto: string): void {
  console.log(`  ${texto}`);
}
function terminar(escritas: number): never {
  hechas++;
  if (fallos.length > 0) {
    console.log(`\n${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
    for (const f of fallos) console.log(`  ✗ ${f}`);
  }
  if (hechas < escritas) {
    console.error(`\nSólo se han hecho ${hechas} de las ${escritas} comprobaciones escritas: SE HA SALTADO UN BLOQUE.`);
    process.exit(2);
  }
  if (fallos.length > 0) process.exit(1);
  console.log(`\n✔ ${hechas} comprobaciones. El cliente predice lo que la sala acepta, interpola, guioniza y manda lo que el contrato dice.`);
  if (hechas > escritas) console.log(`  (El suelo dice ${escritas} y se han hecho ${hechas}: sube \`escritas\`.)`);
  process.exit(0);
}
const reventar = (error: unknown): void => {
  for (const f of fallos) console.log(`  ✗ ${f}`);
  console.error(`\nEL GUION HA REVENTADO después de ${hechas} comprobaciones: no es un veredicto sobre el producto.\n`);
  console.error(error);
  process.exit(3);
};
process.on('uncaughtException', reventar);
process.on('unhandledRejection', reventar);

const u = (m: number): number => Math.round(m * UNO);
const casi = (a: number, b: number, tol = 1e-6): boolean => Math.abs(a - b) <= tol;

/* ─────────────────────────────── Una liza del diseño, sobre el barrio de verdad ─────────────────────────────── */

/*
 * La liza de El Quiebro la escribe otro frente (`quiebro-liza.ts`). Para probar el cliente sin
 * esperarla, aquí se declara una con los NÚMEROS DEL DISEÑO (§4) y el mundo DE VERDAD del barrio
 * (`mundoDeLaLizaDelBarrio`): la Tanda de tres golpes y su Cierre, el Empellón, la Réplica del
 * Remanso, el quiebro de 9 tics que suelta al 6, Prestados, Celadores con guardia y tiradores. Y se
 * exige que la Liza la acepte (`problemasDeLaDeclaracion`): una liza de prueba que la sala rechazaría
 * probaría un cliente para otra sala.
 */
const EST = { quiebro: 1, tocado: 2, remanso: 3, derribado: 4, rematando: 5, sinCuerpo: 6, ausente: 7, descolocado: 8, desalojable: 9, reaparecido: 10, caido: 11, rescatando: 12, descolgando: 13, absorbiendo: 14 } as const;
const ACC = { entrada: 1, seguida1: 2, seguida2: 3, cierre: 4, empellon: 5, replica: 6, quiebro: 10, rescate: 11, remate: 12, descolgar: 13, golpePrestado: 42, tandaCelador: 40, respuesta: 41 } as const;

const puesta = (estado: number, tics: number, intocableTics = 0, distanciaExtra = 0, soltableDesdeTic = tics): PuestaDeEstado => ({
  estado,
  tics,
  intocableTics,
  distanciaExtra,
  soltableDesdeTic,
});

function efecto(dano: number, p: PuestaDeEstado | null, empuje = 0, rompeGuardia = false): EfectoDeclarado {
  return { dano, danoAlRitmo: dano + 5, puntos: 10, puntosAlRitmo: 15, puesta: p, empuje, alChocar: { dano: empuje > 0 ? 15 : 0, tics: empuje > 0 && p !== null ? 10 : 0 }, rompeGuardia };
}

function golpe(id: number, extra: Partial<AccionDeclarada>): AccionDeclarada {
  return {
    id,
    anuncioTics: 8,
    alcance: u(1.1),
    holgura: u(1.2),
    enganche: { radio: u(7), conoRumbos: 43, holgura: u(0.5) },
    avance: 0,
    cadena: null,
    efecto: efecto(10, puesta(EST.tocado, 12)),
    imparable: false,
    recargaTics: 0,
    recuperacionTics: 0,
    soloEn: [],
    alFallar: puesta(EST.descolocado, 8),
    ...extra,
  };
}

const cadena = (tras: number, anuncioTicsAlRitmo: number) => ({ tras: [tras], antesMs: 100, despuesMs: 250, ritmoMs: 75, anuncioTicsAlRitmo, soloSiDio: false });

function reglasDelDiseno(asiento: string): ReglasDeAsiento {
  return {
    asiento,
    cuerpo: {
      radio: u(0.35),
      marchas: [u(2), u(5), u(7)],
      aceleracionTics: 3,
      presupuestoCorto: { velocidad: u(8.75), acumulaTics: 20 },
      presupuestoLargo: { distancia: u(80), enTics: 200 },
      vidaTope: 100,
      vidaAlRematar: 10,
      firmeCadaTics: 0,
      guardaTics: 3,
    },
    acciones: [
      golpe(ACC.entrada, { avance: u(5.5) }),
      golpe(ACC.seguida1, { anuncioTics: 5, cadena: cadena(ACC.entrada, 4), efecto: efecto(10, puesta(EST.tocado, 10)) }),
      golpe(ACC.seguida2, { anuncioTics: 5, cadena: cadena(ACC.seguida1, 4), efecto: efecto(10, puesta(EST.tocado, 10)) }),
      golpe(ACC.cierre, { anuncioTics: 7, cadena: cadena(ACC.seguida2, 7), efecto: efecto(20, puesta(EST.derribado, 30), u(3)) }),
      golpe(ACC.empellon, { anuncioTics: 10, recargaTics: 60, efecto: efecto(8, puesta(EST.tocado, 24), u(4), true) }),
      golpe(ACC.replica, { anuncioTics: 3, avance: u(4.5), imparable: true, soloEn: [EST.remanso], alFallar: null, efecto: efecto(25, puesta(EST.derribado, 30)) }),
    ],
    esquiva: {
      accion: ACC.quiebro,
      /* Como la de verdad: el quiebro (3,5 m) más la holgura que la sala admite encima (0,5 m). */
      puesta: puesta(EST.quiebro, 9, 0, u(4), 6),
      ventanaMs: 200,
      esquivaHastaMs: 250,
      primeras: { cuantas: 3, ventanaMs: 300 },
      torpe: { cada: 3, enTics: 24 },
      alAcertar: { puesta: puesta(EST.remanso, 20, 20), alAutor: puesta(EST.descolocado, 20) },
      contraProyectil: { distancia: u(14), tics: 10, accion: ACC.replica },
      ruptura: { coste: 50, desde: [EST.tocado], puesta: puesta(EST.quiebro, 9, 6, u(4), 6) },
    },
    rescate: { accion: ACC.rescate, radio: u(1.5), mantenerTics: 30, puesta: puesta(EST.rescatando, 30), vidaAlVolver: 40, medidorAmbos: 0 },
    tiro: null,
    medidor: { tope: 100, porLimpia: 35, porRitmo: 5, porRemate: 20, porChoque: 10 },
    puntos: { factor: UNO, multiplicador: { paso: 6554, tope: 2 * UNO }, porLimpia: 50, porChoque: 30, porRemate: 100, porRescate: 75, porSalir: 150 },
    alEmpezar: { vida: 100, medidor: 0, lleva: [{ portable: 1, n: 0 }] },
  };
}

const BARRIO = barrioDeLaNoche('QUIEB', 1);

function lizaDelDiseno(modo: 'encuentro' | 'calma' = 'encuentro'): LizaDeclarada {
  const estado = (id: number, bloqueaPaso: boolean, bloqueaAccion: boolean, cancelaCon: number[], seCortaConDano = false) => ({ id, bloqueaPaso, bloqueaAccion, cancelaCon, seCortaConDano });
  return {
    version: VERSION_DE_LA_DECLARACION,
    mundo: mundoDeLaLizaDelBarrio(BARRIO),
    fase: {
      clave: 'n1-o1',
      modo,
      limite: ID_DE_LIMITE_EN_LA_LIZA.glorieta48,
      semilla: 777,
      reloj: null,
      encuentro:
        modo === 'encuentro'
          ? {
              ronda: 1,
              presentes: 2,
              relojTics: 3000,
              vivasALaVez: [6, 8],
              grupos: [{ clase: 2, cuantos: [6, 8], vivasALaVez: [6, 8], claseDeZona: 1, desdeTic: 0, cadaTics: 20, eleccion: 'azar' }],
              fin: { tipo: 'vaciar' },
            }
          : null,
    },
    asientos: [reglasDelDiseno('a1'), reglasDelDiseno('a2')],
    estados: [
      estado(EST.quiebro, true, true, []),
      estado(EST.tocado, true, true, [ACC.quiebro]),
      estado(EST.remanso, false, false, []),
      estado(EST.derribado, true, true, []),
      estado(EST.rematando, true, true, [], true),
      estado(EST.sinCuerpo, true, true, []),
      estado(EST.ausente, true, true, []),
      estado(EST.descolocado, true, true, []),
      estado(EST.desalojable, true, true, []),
      estado(EST.reaparecido, false, false, []),
      estado(EST.caido, true, true, []),
      estado(EST.rescatando, true, true, [], true),
      estado(EST.descolgando, true, true, [], true),
      estado(EST.absorbiendo, true, true, []),
    ],
    clases: [
      {
        id: 1,
        vida: 90,
        radio: u(0.35),
        velocidad: u(5.5),
        acciones: [golpe(ACC.tandaCelador, { anuncioTics: 11, enganche: null, alFallar: null }), golpe(ACC.respuesta, { anuncioTics: 6, enganche: null, alFallar: null })],
        proyectil: 0,
        guardia: { conoRumbos: 43, para: [ACC.entrada], salvoEn: [EST.tocado, EST.descolocado], alParar: puesta(EST.descolocado, 8), respuesta: ACC.respuesta, esquivaAlAzar: { acciones: [ACC.empellon], probabilidad: UNO / 2 } },
        cerebro: { distanciaMinima: 0, distanciaMaxima: u(1.1), decideCadaTics: 4, costeCuerpoACuerpo: 2, costeDisparo: 1, sigueElGrafo: true },
        aparicion: { modo: 'imprimir', tics: 24 },
        alCaer: {
          tipo: 'rematable',
          puesta: puesta(EST.desalojable, 60),
          remate: { accion: ACC.remate, radio: u(2.5), mantenerTics: 24, puesta: puesta(EST.rematando, 24, 24) },
          suelta: { portable: 1, n: 3 },
          siNo: { absorbe: 2, radio: u(12), absorbiendo: puesta(EST.absorbiendo, 12), vida: 45, reapareceTras: 40, claseDeZona: 1, distanciaMinima: u(15) },
        },
      },
      {
        id: 2,
        vida: 20,
        radio: u(0.35),
        velocidad: u(4),
        acciones: [golpe(ACC.golpePrestado, { anuncioTics: 14, enganche: null, alFallar: null, efecto: efecto(8, puesta(EST.tocado, 10)) })],
        proyectil: 0,
        guardia: null,
        cerebro: { distanciaMinima: 0, distanciaMaxima: u(1.1), decideCadaTics: 4, costeCuerpoACuerpo: 1, costeDisparo: 0, sigueElGrafo: false },
        aparicion: { modo: 'desdePunto', tics: 10 },
        alCaer: { tipo: 'irse' },
      },
      {
        id: 3,
        vida: 70,
        radio: u(0.35),
        velocidad: u(4.5),
        acciones: [golpe(50, { anuncioTics: 11, enganche: null, alFallar: null })],
        proyectil: 1,
        guardia: null,
        cerebro: { distanciaMinima: u(8), distanciaMaxima: u(18), decideCadaTics: 4, costeCuerpoACuerpo: 2, costeDisparo: 1, sigueElGrafo: true },
        aparicion: { modo: 'imprimir', tics: 24 },
        alCaer: { tipo: 'irse' },
      },
    ],
    proyectiles: [{ id: 1, apuntarTics: 12, balas: 3, cadaTics: 3, velocidad: u(20), radio: u(0.2), alcance: u(30), efecto: efecto(12, puesta(EST.tocado, 10)) }],
    turnos: { cuerpoACuerpo: 2, disparo: 1, anunciosALaVez: 3, excluyen: [EST.remanso, EST.sinCuerpo, EST.ausente, EST.reaparecido], alargarConLaRed: true, repetirTrasTics: 0 },
    portables: [{ id: 1, tope: 12, radioDeRecogida: u(1.2), montonTics: 400, pago: { tipo: 'triangular', porUnidad: 10 } }],
    equipo: { recurso: 3, caida: puesta(EST.caido, 240), reaparicion: { coste: 1, esperaTics: 160, vida: 60, puesta: puesta(EST.reaparecido, 40, 40) } },
    sinCuerpo: { estado: EST.sinCuerpo },
    presencia: { ausenteTrasTics: 40, estadoAusente: EST.ausente, veredictoTrasTics: 1200 },
    avisos: {
      clases: [
        { id: 1, vidaTics: 80, objetivo: 'entidad' },
        { id: 2, vidaTics: 60, objetivo: 'asiento' },
        { id: 3, vidaTics: 60, objetivo: 'ninguno' },
        { id: 4, vidaTics: 60, objetivo: 'entidad' },
      ],
      cadaTics: 20,
    },
    red: { compBaseMs: 25, compTopeMs: 150, esperaDeSitiosMs: 250 },
    veredictos: { columnas: [{ que: 'puntos' }, { que: 'lleva', portable: 1 }, { que: 'vida' }, { que: 'salio' }] },
    aforo: { entidades: 14, balas: 12, montones: 8 },
  };
}

const LIZA = lizaDelDiseno();
{
  const problemas = problemasDeLaDeclaracion(LIZA);
  comprobar('la liza del diseño sobre el barrio de verdad es una liza que la sala acepta', problemas.length === 0, problemas.slice(0, 6));
}
const ARENA = arenaDeLaLiza(LIZA);
const REGLAS = LIZA.asientos[0] as ReglasDeAsiento;
const LIMITE = LIZA.mundo.limites.find((l) => l.id === ID_DE_LIMITE_EN_LA_LIZA.glorieta48)?.caja ?? null;
/** ¿Se anda en recta `metros` desde `(x, z)` (Q16.16) hacia `angulo` (convenio de `andar.ts`)? */
function libreHacia(x: number, z: number, angulo: number, metros: number): boolean {
  return seAndaEnRecta(ARENA, { x, z }, { x: x + u(Math.sin(angulo) * metros), z: z - u(Math.cos(angulo) * metros) }, REGLAS.cuerpo.radio);
}
/** El sitio de nacer con más calle libre alrededor: ahí se juega la partida de prueba. */
const NACE = [...LIZA.mundo.nace]
  .filter((s) => s.papel === 'asiento')
  .map((s) => ({ s, libres: [0, 1, 2, 3, 4, 5, 6, 7].filter((k) => libreHacia(s.x, s.z, (k * Math.PI) / 4, 6)).length }))
  .sort((a, b) => b.libres - a.libres || a.s.x - b.s.x)[0]?.s ?? { x: 0, z: 0, rumbo: 0, papel: 'asiento' as const };

/* ─────────────────────────────── 1. El reloj del canal y la red ─────────────────────────────── */

paso('1. El reloj del canal y la red medida');
{
  const r = new RelojDelCanal(10_000.4);
  comprobar('el reloj del canal empieza en cero al abrir (ms y tic)', r.ms(10_000.4) === 0 && r.tic(10_000.4) === 0);
  comprobar('el tic es el tramo de 50 ms: 49,9 ms es el 0 y 50 ms el 1', r.tic(10_000.4 + 49.9) === 0 && r.tic(10_000.4 + 50) === 1 && r.tic(10_000.4 + 1234) === 24);
  comprobar(
    'una pulsación de antes de abrir no se manda (null), y una de después va en ms enteros del canal',
    r.msDeLaPulsacion(9_999) === null && r.msDeLaPulsacion(10_000.4 + 123.9) === 123 && r.msDeLaPulsacion(Number.NaN) === null,
  );
  comprobar('un instante del canal vuelve a `performance.now()` sumando el origen', r.aPerformance(500) === 10_500.4);
  comprobar('la mediana de una lista par e impar', mediana([5, 1, 3]) === 3 && mediana([4, 1, 3, 2]) === 2.5 && Number.isNaN(mediana([])));

  /* Un servidor cuyo reloj va 1.234 ms por detrás; ida 30 y vuelta 50: el error es la mitad de la asimetría. */
  const D = 1234;
  const red = new RedDelAparato();
  red.alEntrar(0, 0);
  for (let i = 0; i < 7; i++) {
    const c = 1000 + i * 2000;
    const msDeLaSala = c + 30 - D;
    red.alEco(c, msDeLaSala, c + 80);
  }
  comprobar('el desfase sale de los ecos con el error de la asimetría (10 ms) y nada más', casi(red.desfase(), D + 10, 1e-9), red.desfase());
  comprobar('la ida y vuelta es la mediana de los ecos', red.rtt() === 80);
  comprobar('el tic de la sala estimado: (reloj del aparato − desfase) / 50', casi(red.ticDeLaSala(20_000), (20_000 - (D + 10)) / 50));
  const antes = red.desfase();
  red.alFotografiar(0, 20_000);
  const igual = red.desfase() === antes;
  red.alFotografiar(1_000_000, 20_000);
  comprobar('una foto vieja no mueve el reloj; una del «futuro» lo adelanta justo hasta ella', igual && casi(red.ticDeLaSala(20_000), 1_000_000));
  comprobar('un eco imposible (vuelve antes de irse) se ignora', red.alEco(5000, 100, 4000) === null);
}

/* ─────────────────────────────── 2. El canal ─────────────────────────────── */

paso('2. El canal: hola, eco, lo mal formado y cuándo se vuelve');

/** Un enchufe de mentira: guarda lo que se manda y deja abrir, contestar y cerrar a mano. */
class EnchufeDeMentira implements Enchufe {
  readyState = 0;
  readonly mandado: string[] = [];
  onopen: ((e: unknown) => void) | null = null;
  onmessage: ((e: { readonly data: unknown }) => void) | null = null;
  onclose: ((e: { readonly code: number; readonly reason: string }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  constructor(readonly direccion: string) {}
  send(texto: string): void {
    this.mandado.push(texto);
  }
  close(): void {
    this.readyState = 3;
  }
  abrir(): void {
    this.readyState = 1;
    this.onopen?.({});
  }
  llega(m: MensajeDeLaSala | string): void {
    this.onmessage?.({ data: typeof m === 'string' ? m : textoDeLaSala(m) });
  }
  cae(codigo: number): void {
    this.readyState = 3;
    this.onclose?.({ code: codigo, reason: '' });
  }
  leidos(): MensajeDelAparato[] {
    return this.mandado.map((t) => leerMensajeDelAparato(t)).filter((m): m is MensajeDelAparato => m !== null);
  }
}

/** Relojes a mano: el tiempo avanza cuando se dice, y los temporizadores saltan en orden. */
class RelojesDeMentira implements Relojes {
  t = 5_000;
  private siguiente = 1;
  private readonly pendientes = new Map<number, { cuando: number; hacer: () => void }>();
  ahora(): number {
    return this.t;
  }
  despues(ms: number, hacer: () => void): unknown {
    const id = this.siguiente++;
    this.pendientes.set(id, { cuando: this.t + ms, hacer });
    return id;
  }
  cancelar(asa: unknown): void {
    this.pendientes.delete(asa as number);
  }
  azar(): number {
    return 0.5;
  }
  avanzar(ms: number): void {
    const fin = this.t + ms;
    for (;;) {
      let primero: [number, { cuando: number; hacer: () => void }] | null = null;
      for (const e of this.pendientes) if (e[1].cuando <= fin && (primero === null || e[1].cuando < primero[1].cuando)) primero = e;
      if (primero === null) break;
      this.pendientes.delete(primero[0]);
      this.t = primero[1].cuando;
      primero[1].hacer();
    }
    this.t = fin;
  }
}

{
  const relojes = new RelojesDeMentira();
  const enchufes: EnchufeDeMentira[] = [];
  const estados: EstadoDelCanal[] = [];
  const recibidos: MensajeDeLaSala[] = [];
  const canal = new CanalDeLaLiza({
    direccion: direccionDeLaLiza('', 'http://localhost:5291', 'QUIEB'),
    llave: 'llave-de-prueba',
    fabrica: (d) => {
      const e = new EnchufeDeMentira(d);
      enchufes.push(e);
      return e;
    },
    relojes,
    alMensaje: (m) => recibidos.push(m),
    alCambiar: (e) => estados.push(e),
  });
  comprobar(
    'la dirección del canal es la ruta de la Liza en ws, y sin llave dentro',
    direccionDeLaLiza('', 'http://localhost:5291', 'QUIEB') === 'ws://localhost:5291/api/arcade/mesas/QUIEB/liza' &&
      direccionDeLaLiza('https://gm.example', 'http://x', 'AB') === 'wss://gm.example/api/arcade/mesas/AB/liza',
  );
  canal.abrir();
  const e1 = enchufes[0] as EnchufeDeMentira;
  relojes.t += 7;
  e1.abrir();
  const primeros = e1.leidos();
  const hola = primeros[0];
  comprobar(
    'al abrir, lo primero es `hola` con la versión de la Liza, la llave y el reloj del canal (que empieza en 0)',
    hola !== undefined && hola.t === 'hola' && hola.v === VERSION_DE_LA_LIZA && hola.llave === 'llave-de-prueba' && hola.c === 0,
    primeros,
  );
  comprobar('y justo detrás, el primer `eco`', primeros[1]?.t === 'eco' && primeros.length === 2, primeros);
  comprobar('lo que no es `hola` ni `eco` no sale antes del `dentro`', !canal.enviar({ t: 'aviso', clase: 1, objetivo: 0 }));
  e1.llega({ t: 'dentro', yo: 1, k: 100, x: 0, z: 0, r: 0, hz: 20 });
  comprobar('con `dentro` el canal está dentro y el mensaje llega', canal.dentro() && recibidos.length === 1 && recibidos[0]?.t === 'dentro');
  const antesDelEco = e1.leidos().filter((m) => m.t === 'eco').length;
  relojes.avanzar(ECO_CADA_MS * 3 + 10);
  const ecos = e1.leidos().filter((m) => m.t === 'eco');
  comprobar('un `eco` cada 2 s, con el reloj del canal', ecos.length === antesDelEco + 3 && ecos[ecos.length - 1]?.t === 'eco', ecos);
  e1.llega('{"t":"foto","k":1,"p":[],"x":1}');
  e1.llega('no es json');
  comprobar('lo mal formado se tira y se cuenta, y no llega a nadie', canal.descartados === 2 && recibidos.length === 1);

  e1.cae(1001);
  const esperando = canal.estado();
  comprobar(
    'un despliegue (1001) vuelve a intentarlo tras la primera espera, con su azar',
    esperando.tipo === 'esperando' && esperando.enMs - relojes.t === Math.round(PRIMERA_ESPERA_MS * 1.0),
    esperando,
  );
  relojes.avanzar(PRIMERA_ESPERA_MS + 1);
  comprobar('y lo intenta: un enchufe nuevo', enchufes.length === 2);
  /* Con `?.`: si el intento no llegó, lo de detrás sale ROJO con su nombre en vez de reventar el guion. */
  enchufes[1]?.cae(1006);
  const segunda = canal.estado();
  comprobar('si vuelve a caer sin entrar, espera más (crece)', segunda.tipo === 'esperando' && segunda.enMs - relojes.t === PRIMERA_ESPERA_MS * 2, segunda);
  comprobar('la espera crece y tiene techo', esperaDelIntento(1, 1006) === 500 && esperaDelIntento(3, 1006) === 2000 && esperaDelIntento(20, 1006) === 15000);
  comprobar('«la ciudad está llena» espera un minuto', esperaDelIntento(1, CIERRE_DE_LA_LIZA.llena) === ESPERA_SI_LLENA_MS);
  relojes.avanzar(PRIMERA_ESPERA_MS * 2 + 1);
  const e3 = enchufes[2];
  e3?.abrir();
  const holaNuevo = e3?.leidos()[0];
  comprobar('un canal nuevo es un reloj nuevo: su `hola` vuelve a contar desde 0', holaNuevo?.t === 'hola' && holaNuevo.c === 0);
  e3?.cae(CIERRE_DE_LA_LIZA.llaveMala);
  relojes.avanzar(120_000);
  comprobar('tras `llaveMala` NO se vuelve a intentar: se queda fuera con su código', canal.estado().tipo === 'fuera' && enchufes.length === 3, canal.estado());
  for (const codigo of [CIERRE_DE_LA_LIZA.reemplazado, CIERRE_DE_LA_LIZA.mesaCerrada, CIERRE_DE_LA_LIZA.versionVieja, CIERRE_DE_LA_LIZA.mesaQueNo]) {
    canal.abrir();
    const e = enchufes[enchufes.length - 1] as EnchufeDeMentira;
    e.abrir();
    e.cae(codigo);
    relojes.avanzar(120_000);
  }
  comprobar('ni tras `reemplazado`, `mesaCerrada`, `versionVieja` o `mesaQueNo` (un enchufe por intento, ninguno más)', enchufes.length === 7 && canal.estado().tipo === 'fuera');
  canal.cerrar();
  comprobar('cerrar a propósito deja el canal cerrado', canal.estado().tipo === 'cerrado');
}

/* ─────────────────────────────── 3. La predicción es la de la sala ─────────────────────────────── */

paso('3. La predicción es la de la sala');

/**
 * EL VALIDADOR DEL CONTRATO: lo que la sala acepta de un `aqui`, escrito AQUÍ desde `declaracion.ts`
 * (`CuerpoDeclarado`, `PuestaDeEstado.distanciaExtra`, `LimiteDelMundo`) y no leído de la predicción:
 * dentro del límite; el tramo desde el último sitio bueno se anda EN RECTA (`seAndaEnRecta`); y la
 * distancia no pasa del presupuesto corto acumulado más la distancia extra del estado en curso.
 */
class ValidadorDelContrato {
  private x: number;
  private z: number;
  private acumulado = 0;
  private extra = 0;
  malos: string[] = [];
  tramos = 0;
  constructor(x: number, z: number) {
    this.x = x;
    this.z = z;
  }
  darExtra(distancia: number): void {
    this.extra += distancia;
  }
  tic(nx: number, nz: number): void {
    const r = REGLAS.cuerpo;
    const porTic = (r.presupuestoCorto.velocidad / 20) | 0;
    this.acumulado = Math.min(this.acumulado + porTic, porTic * r.presupuestoCorto.acumulaTics);
    const d = Math.hypot(nx - this.x, nz - this.z);
    this.tramos++;
    if (!dentroDelLimite(LIMITE, nx, nz)) this.malos.push(`fuera del límite en (${String(nx / UNO)}, ${String(nz / UNO)})`);
    else if (!seAndaEnRecta(ARENA, { x: this.x, z: this.z }, { x: nx, z: nz }, r.radio)) this.malos.push(`tramo que no se anda en recta hasta (${String(nx / UNO)}, ${String(nz / UNO)})`);
    else if (d > this.acumulado + this.extra + 2) this.malos.push(`${String(d / UNO)} m en un tic con ${String((this.acumulado + this.extra) / UNO)} de presupuesto`);
    const gastoDelExtra = Math.min(this.extra, Math.max(0, d - this.acumulado));
    this.extra -= gastoDelExtra;
    this.acumulado = Math.max(0, this.acumulado - (d - gastoDelExtra));
    this.x = nx;
    this.z = nz;
  }
}

/** Un azar pequeño y fijo para el paseo (esto es el comprobador: aquí sí vale el azar de fuera de `shared/`). */
function azarDe(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9) >>> 0;
    return s / 4294967296;
  };
}

{
  const paso = new PasoPropio(ARENA, REGLAS.cuerpo);
  paso.colocar(NACE.x, NACE.z);
  const validador = new ValidadorDelContrato(paso.x, paso.z);
  const azar = azarDe(24);
  let rumbo = 0;
  let quiebros = 0;
  let empujones = 0;
  let corridos = 0;
  let resbalones = 0;
  const trayecto: string[] = [];
  for (let t = 0; t < 6000; t++) {
    if (t % 25 === 0) rumbo = Math.floor(azar() * 256);
    const fuerza = azar() < 0.1 ? 0 : 0.3 + azar() * 0.7;
    const correr = azar() < 0.3;
    if (!paso.desplazandose() && t % 37 === 11) {
      /* El aparato quiebra lo del estilo (la puesta menos la holgura) y la sala admite la puesta entera. */
      paso.desplazar(Math.floor(azar() * 256), REGLAS.esquiva.puesta.distanciaExtra - u(0.5), 6, false);
      validador.darExtra(REGLAS.esquiva.puesta.distanciaExtra);
      quiebros++;
    } else if (!paso.desplazandose() && t % 101 === 50) {
      paso.desplazar(Math.floor(azar() * 256), u(4), 5, true);
      validador.darExtra(u(4));
      empujones++;
    }
    const antesX = paso.x;
    const antes = paso.velocidad;
    const dado = paso.paso({ rumbo, fuerza, correr }, false, LIMITE);
    if (dado.marcha === 3) corridos++;
    if (antes > 0 && paso.velocidad === 0 && fuerza > 0) resbalones++;
    validador.tic(dado.x, dado.z);
    if (t < 20) trayecto.push(`${String(antesX)}→${String(dado.x)}`);
  }
  comprobar(
    'seis mil tics por la glorieta de verdad, andando, corriendo, quebrando y empujado: la sala acepta CADA tramo',
    validador.malos.length === 0 && validador.tramos === 6000,
    validador.malos.slice(0, 5),
  );
  comprobar('y el paseo de verdad pasó por todo: quiebros, empujones, carreras y paredes', quiebros > 100 && empujones > 40 && corridos > 500 && resbalones > 5, { quiebros, empujones, corridos, resbalones });

  /* La misma entrada da el mismo paso: la predicción es pura. */
  const a = new PasoPropio(ARENA, REGLAS.cuerpo);
  const b = new PasoPropio(ARENA, REGLAS.cuerpo);
  a.colocar(NACE.x, NACE.z);
  b.colocar(NACE.x, NACE.z);
  let iguales = true;
  for (let t = 0; t < 400; t++) {
    const e = { rumbo: (t * 7) % 256, fuerza: 0.9, correr: t % 50 < 20 };
    const pa = a.paso(e, false, LIMITE);
    const pb = b.paso(e, false, LIMITE);
    if (pa.x !== pb.x || pa.z !== pb.z) iguales = false;
  }
  comprobar('la predicción es pura: la misma entrada da exactamente el mismo sitio', iguales);

  /* Las marchas del diseño: andar por debajo del 60 %, trotar por encima, correr con Mayúsculas. */
  const m = new PasoPropio(ARENA, REGLAS.cuerpo);
  m.colocar(NACE.x, NACE.z);
  const marchas: number[] = [];
  for (const [fuerza, correr] of [
    [0.4, false],
    [0.8, false],
    [0.8, true],
  ] as const) {
    let ultima = 0;
    for (let t = 0; t < 8; t++) ultima = m.paso({ rumbo: 64, fuerza, correr }, false, null).marcha;
    marchas.push(ultima);
  }
  comprobar('las marchas: < 60 % anda (1), ≥ 60 % trota (2), correr corre (3)', marchas.join() === '1,2,3', marchas);
  const acelera = new PasoPropio(ARENA, REGLAS.cuerpo);
  acelera.colocar(NACE.x, NACE.z);
  const velocidades: number[] = [];
  for (let t = 0; t < 4; t++) {
    acelera.paso({ rumbo: 64, fuerza: 0.8, correr: false }, false, null);
    velocidades.push(acelera.velocidad / UNO);
  }
  comprobar('de quieto al trote (5 m/s) en los 3 tics del diseño, sin pasarse', casi(velocidades[2] ?? 0, 5, 0.01) && (velocidades[1] ?? 9) < 5 && casi(velocidades[3] ?? 0, 5, 0.01), velocidades);
  const bloqueado = new PasoPropio(ARENA, REGLAS.cuerpo);
  bloqueado.colocar(NACE.x, NACE.z);
  const antesX = bloqueado.x;
  for (let t = 0; t < 10; t++) bloqueado.paso({ rumbo: 64, fuerza: 1, correr: true }, true, null);
  comprobar('un estado que bloquea el paso no deja andar', bloqueado.x === antesX);

  /* Las correcciones: la nueva manda; las de `aqui` que salieron antes de ella se ignoran; el desvío se funde. */
  const c = new PasoPropio(ARENA, REGLAS.cuerpo);
  c.colocar(NACE.x, NACE.z);
  for (let t = 0; t < 10; t++) c.paso({ rumbo: 64, fuerza: 1, correr: false }, false, null);
  const lejos = c.x;
  const atendida = c.corregir(5, NACE.x, NACE.z, 10);
  const vieja = c.corregir(8, NACE.x + u(1), NACE.z, 12);
  const nueva = c.corregir(11, NACE.x, NACE.z + u(0.5), 13);
  comprobar(
    'una corrección pone el sitio simulado en el acto; las de lo enviado antes de ella se ignoran',
    atendida && !vieja && nueva && c.z === NACE.z + u(0.5) && lejos !== NACE.x,
  );
  const desvio0 = Math.hypot(c.desvioX, c.desvioZ);
  c.fundir(0.1);
  const desvio1 = Math.hypot(c.desvioX, c.desvioZ);
  c.fundir(1);
  comprobar('lo pintado no salta: el desvío existe y se funde (37 % a los 0,1 s, nada al segundo)', desvio0 > 0.1 && casi(desvio1 / desvio0, Math.exp(-1), 0.01) && c.desvioX === 0 && c.desvioZ === 0, { desvio0, desvio1 });
  const salto = new PasoPropio(ARENA, REGLAS.cuerpo);
  salto.colocar(NACE.x, NACE.z);
  salto.corregir(1, NACE.x + u(10), NACE.z, 1);
  comprobar('una corrección de más de 2,5 m (una reaparición) se salta, no se desliza', salto.desvioX === 0 && salto.desvioZ === 0);
}

/*
 * CONTRA LA SALA DE VERDAD, si ya existe (otro frente la escribe a la vez): se juega la predicción
 * contra `avanzarLaSala` y se cuentan las correcciones. Sin la sala, se dice y no se cuenta como mirado.
 */
async function contraLaSala(liza: LizaDeclarada, reglas: ReglasDeAsiento, cuantos: number, semilla: number): Promise<{ total: number; sinExplicar: number } | null> {
  const ruta = new URL('../../shared/mecanicas/liza/sala.ts', import.meta.url);
  if (!existsSync(ruta)) return null;
  const modulo = (await import(ruta.href)) as { salaNueva?: SalaNueva; avanzarLaSala?: AvanzarLaSala };
  if (typeof modulo.salaNueva !== 'function' || typeof modulo.avanzarLaSala !== 'function') return null;
  let sala = modulo.salaNueva(liza, liza.fase.semilla);
  sala = modulo.avanzarLaSala(sala, [{ tipo: 'conexion', asiento: 1, rttMs: 60, desfaseMs: 0 }]).sala;
  const p = new PasoPropio(arenaDeLaLiza(liza), reglas.cuerpo);
  const donde = sala.asientos[0];
  p.colocar(donde?.x ?? NACE.x, donde?.z ?? NACE.z);
  const azar = azarDe(semilla);
  let rumbo = 0;
  let total = 0;
  let sinExplicar = 0;
  const bloquea = (est: number): boolean => liza.estados.some((e) => e.id === est && e.bloqueaPaso);
  for (let t = 1; t <= cuantos; t++) {
    if (t % 30 === 0) rumbo = Math.floor(azar() * 256);
    /*
     * En un encuentro los Prestados pegan, y quien está tocado no anda: el aparato lo sabe por el suceso
     * `estado` y no predice pasos que la sala no admite. Aquí se lee del estado de la sala, que es lo que
     * ese suceso cuenta. Quien cae y vuelve por la cabina de refugio aparece donde dice la sala (el
     * aparato lo lee de la foto).
     */
    const a0 = sala.asientos[0];
    const enCurso = a0?.estado ?? null;
    const bloqueado = enCurso !== null && sala.tic < enCurso.hastaTic && bloquea(enCurso.estado);
    if (a0 !== undefined && !a0.conCuerpo) {
      p.colocar(a0.x, a0.z);
      continue;
    }
    const d = p.paso({ rumbo, fuerza: 0.9, correr: t % 200 < 80 }, bloqueado, arenaYLimite(liza));
    const entrada: EntradaDeLaSala = { tipo: 'aqui', asiento: 1, n: t, x: d.x, z: d.z, r: rumbo, m: d.marcha, accion: null, desfaseMs: 0 };
    const pasoDeLaSala = modulo.avanzarLaSala(sala, [entrada]);
    sala = pasoDeLaSala.sala;
    for (const c of pasoDeLaSala.correcciones) {
      total++;
      /*
       * Una corrección está EXPLICADA si en los últimos tics empezó un estado que bloquea el paso (un golpe
       * que llega entre mi paso y la sala: el aparato no podía saberlo) o si el asiento acaba de volver
       * a tener cuerpo. Cualquier otra es una predicción que la sala no acepta.
       */
      const e = sala.asientos[0]?.estado ?? null;
      const explicada = e !== null && bloquea(e.estado) && sala.tic - e.desdeTic <= 4;
      if (!explicada) sinExplicar++;
      p.corregir(c.n, c.x, c.z, t);
    }
  }
  return { total, sinExplicar };
}

await (async () => {
  const correcciones = await contraLaSala(lizaDelDiseno('calma'), REGLAS, 1200, 99);
  if (correcciones === null) {
    nota('`shared/mecanicas/liza/sala.ts` aún no existe (o no exporta la sala): la predicción se ha probado contra el contrato escrito, no contra la sala.');
    return;
  }
  comprobar('contra la sala de verdad, 1.200 tics andando y corriendo por la glorieta en calma: ni una corrección', correcciones.total === 0, correcciones);
})();

function arenaYLimite(liza: LizaDeclarada) {
  return liza.mundo.limites.find((l) => l.id === liza.fase.limite)?.caja ?? null;
}

/* ─────────────────────────────── 4. La interpolación ─────────────────────────────── */

paso('4. Los demás, 150 ms atrás entre fotos');
{
  const f = new FotosDeLaSala();
  f.guardar({ t: 'foto', k: 10, p: [[20, 0, 0, 250, 1, 0]] });
  f.guardar({ t: 'foto', k: 12, p: [[20, 200, 0, 6, 1, 0], [21, 500, 500, 0, 0, 0]] });
  f.guardar({ t: 'foto', k: 11, p: [[20, 9999, 0, 0, 0, 0]] });
  const m = muestraNueva();
  f.muestra(20, 11, m);
  comprobar('a medio camino entre dos fotos, a medio camino (en tics de la sala); una foto vieja no se cuela', casi(m.x, 1) && casi(m.z, 0) && f.ultimoK() === 12, m);
  comprobar('la velocidad sale de las dos fotos (2 m en 2 tics = 20 m/s)', casi(m.velocidad, 20));
  const r1 = m.mira;
  comprobar('el rumbo gira por el lado corto (a medio camino de 250 a 6 está el 0, no el 128)', casi(r1, 0, 1e-9), r1);
  f.muestra(20, 13, m);
  const mas = m.x;
  f.muestra(20, 40, m);
  comprobar('tras la última foto sigue su velocidad dos tics como mucho y se para', casi(mas, 3) && casi(m.x, 4), { mas, x: m.x });
  f.muestra(21, 11, m);
  comprobar('quien sale sólo en una foto se pinta donde sale', casi(m.x, 5) && casi(m.z, 5));
  comprobar('quien no sale en ninguna no se pinta', !f.muestra(99, 11, m));
  f.vaciar();
  comprobar('vaciar deja la sala sin fotos', !f.muestra(20, 11, m) && f.ultimoK() === -1);
}

/* ─────────────────────────────── 5. El guion ─────────────────────────────── */

paso('5. El guion de los demás, y el fundido que nunca retrocede');
{
  const l = new LineaDelCuerpo();
  const p = pintadoNuevo();
  /* Un Celador anda hacia el este; su foto va 150 ms atrás. Lanza un golpe desde x = 10 hacia x = 12. */
  l.pintar(0, 9.2, 0, p);
  l.empezar({ gesto: 'entrada', desdeMs: 0, finMs: 700, impactoMs: 400, destinoX: 12, destinoZ: 0, rumbo: Math.PI / 2, direccion: null });
  let retrocede = false;
  let anterior = -Infinity;
  let enElImpacto = 0;
  let gestoEnElImpacto: string | null = null;
  let fundidoVisto = false;
  let alEmpezar = Number.NaN;
  for (let t = 0; t <= 2000; t += 10) {
    /* La foto avanza a 5 m/s desde 9,2 y se para en 12. */
    const foto = Math.min(12, 9.2 + t * 0.005);
    l.pintar(t, foto, 0, p);
    if (p.x < anterior - 1e-9) retrocede = true;
    anterior = p.x;
    if (t === 0) alEmpezar = p.x;
    if (t === 400) {
      enElImpacto = p.x;
      gestoEnElImpacto = p.gesto;
    }
    if (t > 700 && p.gesto === null && p.x < 12 - 1e-9) fundidoVisto = true;
  }
  /* Del sitio pintado (9,2) y no del destino: al empezar está donde estaba, y en el impacto, a medio viaje (≈ 10,9 m con la curva suave: 400 de 700 ms). */
  comprobar(
    'el guion lleva el gesto y va del sitio pintado al destino',
    gestoEnElImpacto === 'entrada' && casi(alEmpezar, 9.2) && enElImpacto > 9.2 + 0.5 && enElImpacto < 12 - 0.5,
    { alEmpezar, enElImpacto, gestoEnElImpacto },
  );
  comprobar('NUNCA retrocede: ni al acabar el guion, ni esperando, ni fundiendo', !retrocede);
  comprobar('y acaba libre, sobre la foto', !l.activa() && casi(p.x, 12));
  void fundidoVisto;

  /* La espera: con la foto lejos no suelta; cuando llega a 0,3 m, funde en 150 ms. */
  const e = new LineaDelCuerpo();
  const q = pintadoNuevo();
  e.pintar(0, 0, 0, q);
  e.empezar({ gesto: 'cierre', desdeMs: 0, finMs: 100, impactoMs: 50, destinoX: 3, destinoZ: 0, rumbo: null, direccion: null });
  e.pintar(100, 0, 0, q);
  e.pintar(200, 1, 0, q);
  const esperando = q.x === 3 && q.gesto === 'cierre';
  e.pintar(300, 3 - ALCANZA_M + 0.01, 0, q);
  /* Los 150 ms del diseño van aquí escritos, no leídos de `FUNDIDO_MS`: un fundido de 15 ms saldría en verde. */
  e.pintar(300 + 75, 3 - ALCANZA_M + 0.01, 0, q);
  const aMedias = q.x < 3 - 0.05 && q.x > 3 - ALCANZA_M + 0.05;
  e.pintar(300 + 151, 3 - ALCANZA_M + 0.01, 0, q);
  comprobar(
    'se queda en la pose final mientras la foto está a más de 0,3 m, y luego funde en 150 ms',
    FUNDIDO_MS === 150 && ALCANZA_M === 0.3 && esperando && aMedias && casi(q.x, 3 - ALCANZA_M + 0.01) && !e.activa(),
    q,
  );
  const c = new LineaDelCuerpo();
  c.pintar(0, 5, 5, q);
  c.empezar({ gesto: 'entrada', desdeMs: 0, finMs: 1000, impactoMs: 400, destinoX: 8, destinoZ: 5, rumbo: null, direccion: null });
  c.pintar(100, 5, 5, q);
  const x = q.x;
  c.cortar(100);
  c.pintar(110, 5, 5, q);
  comprobar('un guion cortado espera a la foto desde donde estaba, sin saltar', casi(q.x, x) && q.gesto === null);
}

/* ─────────────────────────────── 6. La sala vista ─────────────────────────────── */

paso('6. La sala vista desde el aparato');
{
  const s = new SalaVista();
  const r = new RelojDelCanal(1000);
  const tic = (k: number, ...ev: SucesoDelTic[]): MensajeDeLaSala => ({ t: 'tic', k, ev });
  s.aplicar({ t: 'dentro', yo: 2, k: 50, x: 0, z: 0, r: 0, hz: 20 }, 1100, r);
  s.aplicar(
    tic(
      51,
      { e: 'fase', clave: 'n1-o1', modo: 2, limite: 1, relojMs: 0, encuentroTics: 3000 },
      { e: 'recurso', n: 3 },
      { e: 'cuenta', a: 2, vida: 80, medidor: 35, puntos: 120, mult: UNO },
      { e: 'nace', id: 16, clase: 1, x: 350, z: -200, r: 64 },
      { e: 'anuncio', id: 7, de: 16, a: 2, acc: ACC.tandaCelador, t: 900, x: 350, z: -200 },
      { e: 'monton', id: 30, p: 1, n: 3, x: 100, z: 100 },
      { e: 'carga', a: 2, p: 1, n: 4 },
    ),
    1200,
    r,
  );
  const a = s.anuncios.get(7);
  comprobar('el anuncio guarda el impacto en `performance.now()` (t + origen) y el sitio en metros', a !== undefined && a.impactoMs === 1900 && casi(a.x, 3.5) && casi(a.z, -2), a);
  comprobar(
    'la fase guarda su reloj de encuentro contado desde que llegó (3.000 tics = 150 s)',
    s.fase !== null && s.fase.encuentroHastaMs === 1200 + 150_000 && s.fase.relojHastaMs === null && s.recurso === 3,
  );
  comprobar('la cuenta, la carga y el montón están', s.cuentas.get(2)?.vida === 80 && s.lleva(2, 1) === 4 && s.montones.get(30)?.n === 3);
  s.novedades.length = 0;
  s.aplicar(tic(52, { e: 'resuelve', id: 7, r: 2, dano: 0, vida: 80 }, { e: 'recoge', id: 30, a: 2, n: 2, queda: 1 }, { e: 'estado', a: 2, est: EST.remanso, tics: 20, into: 20 }), 1300, r);
  const resuelve = s.novedades.find((n) => n.tipo === 'suceso' && n.suceso.e === 'resuelve');
  comprobar(
    'resolver quita el anuncio y la novedad lleva el que era (para cerrar su anillo)',
    !s.anuncios.has(7) && resuelve !== undefined && resuelve.tipo === 'suceso' && resuelve.anuncio?.id === 7,
  );
  comprobar('recoger deja lo que queda en el montón', s.montones.get(30)?.n === 1);
  comprobar('un estado dura sus tics desde que llegó', s.estadoEn(2, 1300 + 999) === EST.remanso && s.estadoEn(2, 1300 + 1000) === 0);
  s.aplicar(tic(53, { e: 'seva', id: 16, por: 2, quien: 2 }, { e: 'recoge', id: 30, a: 2, n: 1, queda: 0 }), 1400, r);
  comprobar('se va la entidad y el montón vacío', !s.entidades.has(16) && !s.montones.has(30));
  s.aplicar({ t: 'dentro', yo: 1, k: 900, x: 0, z: 0, r: 0, hz: 20 }, 1500, r);
  comprobar('cada `dentro` tira todo lo que se sabía de la sala', s.yo === 1 && s.fase === null && s.cuentas.size === 0 && s.cargas.size === 0 && s.recurso === null);
}

/* ─────────────────────────────── 7. El diccionario ─────────────────────────────── */

paso('7. El diccionario: qué es cada número de la declaración');
{
  const l = leerLaLiza(LIZA, 1);
  comprobar(
    'los botones: GOLPE abre con la Entrada, la Réplica, el Empellón, el quiebro y el rescate',
    l.botones.entrada === ACC.entrada && l.botones.replica === ACC.replica && l.botones.empellon === ACC.empellon && l.botones.quiebro === ACC.quiebro && l.botones.rescate === ACC.rescate,
    l.botones,
  );
  comprobar(
    'la Tanda encadena Entrada → Seguida → Seguida → Cierre, y el Cierre no tiene nada detrás',
    l.siguienteEnLaTanda(ACC.entrada) === ACC.seguida1 && l.siguienteEnLaTanda(ACC.seguida1) === ACC.seguida2 && l.siguienteEnLaTanda(ACC.seguida2) === ACC.cierre && l.siguienteEnLaTanda(ACC.cierre) === 0,
  );
  comprobar(
    'los gestos de la Tanda, del Empellón, de la Réplica, del Prestado y de la respuesta de la guardia',
    l.gestoDeLaAccion(ACC.entrada) === 'entrada' &&
      l.gestoDeLaAccion(ACC.seguida1) === 'seguida-1' &&
      l.gestoDeLaAccion(ACC.seguida2) === 'seguida-2' &&
      l.gestoDeLaAccion(ACC.cierre) === 'cierre' &&
      l.gestoDeLaAccion(ACC.empellon) === 'empellon' &&
      l.gestoDeLaAccion(ACC.replica) === 'replica' &&
      l.gestoDeLaAccion(ACC.golpePrestado) === 'golpe-de-prestado' &&
      l.gestoDeLaAccion(ACC.respuesta) === 'respuesta',
  );
  comprobar(
    'los estados: quiebro, Remanso, tocado, derribado, descolocado, caído, desalojable, sin cuerpo',
    l.sentidoDelEstado(EST.quiebro) === 'quiebro' &&
      l.sentidoDelEstado(EST.remanso) === 'remanso' &&
      l.sentidoDelEstado(EST.tocado) === 'tocado' &&
      l.sentidoDelEstado(EST.derribado) === 'derribado' &&
      l.sentidoDelEstado(EST.descolocado) === 'descolocado' &&
      l.sentidoDelEstado(EST.caido) === 'caido' &&
      l.sentidoDelEstado(EST.desalojable) === 'desalojable' &&
      l.sentidoDelEstado(EST.sinCuerpo) === 'sin-cuerpo' &&
      l.sentidoDelEstado(0) === 'libre',
  );
  comprobar('las clases: guardia es Celador, proyectil es tirador, sin nada es Prestado', l.cuerpoDeLaClase(1) === 'celador' && l.cuerpoDeLaClase(3) === 'tirador' && l.cuerpoDeLaClase(2) === 'prestado');
  comprobar(
    'la amenaza del anillo: la respuesta de la guardia se distingue de la Tanda del Celador',
    l.amenazaDeLaAccion(ACC.respuesta) === 'respuesta' && l.amenazaDeLaAccion(ACC.tandaCelador) === 'celador' && l.amenazaDeLaAccion(ACC.golpePrestado) === 'prestado',
  );
  comprobar(
    'los avisos en el orden del diseño: marcar, Rescate, Voy, ¡Desalójalo!',
    l.avisos.marcar === 1 && l.avisos.rescate === 2 && l.avisos.voy === 3 && l.avisos.desalojalo === 4 && l.sentidoDelAviso(4) === 'desalojalo',
  );
  comprobar('el remate de la clase del Celador, y ninguno para el Prestado', l.remateDeLaClase(1) === ACC.remate && l.remateDeLaClase(2) === 0);
  const sinAsiento = leerLaLiza(LIZA, 0);
  const fueraDeLaLiza = leerLaLiza(LIZA, LIZA.asientos.length + 1);
  comprobar(
    'sin asiento en la liza se lee igual, sin botones (y un número que no está en la liza es «sin asiento»)',
    sinAsiento.yo === 0 && sinAsiento.reglas === null && sinAsiento.botones.entrada === 0 && fueraDeLaLiza.yo === 0 && fueraDeLaLiza.reglas === null,
  );
  comprobar('cada número lee SU asiento: el 1 el primero, el 2 el segundo', leerLaLiza(LIZA, 1).reglas === LIZA.asientos[0] && leerLaLiza(LIZA, 2).reglas === LIZA.asientos[1]);
  /* El orden de la lista no decide: con el Empellón y la Réplica delante, GOLPE sigue abriendo con la Entrada. */
  const alReves: LizaDeclarada = { ...LIZA, asientos: LIZA.asientos.map((a) => ({ ...a, acciones: [...a.acciones].reverse() })) };
  const lr = leerLaLiza(alReves, 1);
  comprobar(
    'con las acciones en otro orden, GOLPE sigue abriendo con la Entrada (no con el Empellón ni la Réplica)',
    lr.botones.entrada === ACC.entrada && lr.botones.empellon === ACC.empellon && lr.botones.replica === ACC.replica,
    lr.botones,
  );
}

paso('7 bis. El diccionario y la predicción con el productor DE VERDAD');
await (async () => {
  if (!sePuedeLidiar('quiebro')) {
    nota('El productor de El Quiebro no está en el registro de lizas: este bloque no mira nada (y el suelo lo dirá).');
    return;
  }
  /* Una mesa por la misma puerta que la de verdad: el reductor registrado, dos asientos, empezar y vencer la Bajada. */
  let estado: unknown = undefined;
  const asientos = ['s1', 's2'];
  const sentados = asientos.map((asiento) => ({ asiento, nombre: asiento }));
  const mandar = (quien: string | null, tipo: string, carga: unknown): string | null => {
    const s = avanzarConMotivo('quiebro', estado, { tipo, carga }, { quien, azar: 20260924, tic: 0, asientos });
    if (s.motivo === null) estado = s.estado;
    return s.motivo;
  };
  const vista = (): unknown => vistaDeAsiento('quiebro', estado, null, sentados);
  mandar('s1', 'empezar', null);
  /* El segundo baja con la Mole: su Réplica es la que menos avanza, y la Acometida tiene que llegar igual. */
  const conLaMole = mandar('s2', 'estilo', { id: 'mole' });
  const enLaBajada = leerVistaDelQuiebro(vista());
  if (enLaBajada?.reloj !== null && enLaBajada?.reloj !== undefined) mandar(null, 'arcade:reloj', { id: enLaBajada.reloj.id });
  const cruda = vista();
  const leida = leerVistaDelQuiebro(cruda);
  const real = lizaDeLaMesa('quiebro', cruda, 'QUIEB');
  comprobar(
    'con una mesa de verdad (empezar y vencer la Bajada) el productor da la liza de la primera oleada',
    leida !== null && leida.fase.tipo === 'oleada' && real !== null && real.fase.modo === 'encuentro',
    { fase: leida?.fase, modo: real?.fase.modo },
  );
  if (real === null) return;
  const l = leerLaLiza(real, 1);
  const r = l.reglas;
  comprobar('mi asiento está en la liza de verdad (el número 1 es el primero que se sentó)', l.yo === 1 && r !== null);
  if (r === null) return;
  const cadenaReal = [l.botones.entrada];
  for (let k = 0; k < 5; k++) {
    const sig = l.siguienteEnLaTanda(cadenaReal[cadenaReal.length - 1] as number);
    if (sig === 0) break;
    cadenaReal.push(sig);
  }
  comprobar(
    'el diccionario lee la liza de verdad: GOLPE abre una Tanda de cuatro eslabones que acaba en un Cierre, y hay Réplica, Empellón y quiebro',
    l.botones.entrada !== 0 && cadenaReal.length === 4 && l.gestoDeLaAccion(cadenaReal[3] as number) === 'cierre' && l.botones.replica !== 0 && l.botones.empellon !== 0 && l.botones.quiebro === r.esquiva.accion,
    { botones: l.botones, cadenaReal },
  );
  const sentidos = real.estados.map((e) => `${String(e.id)}:${l.sentidoDelEstado(e.id)}`);
  const hay = (s: string): boolean => real.estados.some((e) => l.sentidoDelEstado(e.id) === s);
  const deLaEntrada = r.acciones.find((a) => a.id === l.botones.entrada)?.efecto.puesta?.estado ?? 0;
  const delCierre = r.acciones.find((a) => a.id === cadenaReal[3])?.efecto.puesta?.estado ?? 0;
  comprobar(
    'los estados de la liza de verdad tienen su sentido (quiebro, Remanso, tocado, derribado, descolocado, caído, desalojable, sin cuerpo), y la Entrada toca y el Cierre derriba',
    ['quiebro', 'remanso', 'tocado', 'derribado', 'descolocado', 'caido', 'desalojable', 'sin-cuerpo'].every(hay) &&
      l.sentidoDelEstado(deLaEntrada) === 'tocado' &&
      l.sentidoDelEstado(delCierre) === 'derribado',
    sentidos,
  );
  const clases = real.clases.map((c) => l.cuerpoDeLaClase(c.id)).sort().join();
  comprobar('las clases de verdad son un Prestado, un Celador y un tirador', clases === 'celador,prestado,tirador', clases);
  /*
   * LA ACOMETIDA LLEGA SIEMPRE AL TIRADOR (decisión del coordinador, 24-sep): el vuelo, más lo que avanza la
   * Réplica que lanza (la de cada estilo), más su alcance y su holgura, tiene que cubrir lo más lejos que
   * se pone un tirador. Con los 10 m del diseño la Mole se quedaba corta a partir de 15,8 m y cualquiera
   * a partir de 16,8, y el tirador busca hasta 18.
   */
  const tirador = real.clases.find((c) => l.cuerpoDeLaClase(c.id) === 'tirador');
  const lejosM = (tirador?.cerebro.distanciaMaxima ?? 0) / UNO;
  const alcancesM = real.asientos.map((a) => {
    const c = a.esquiva.contraProyectil;
    const replica = a.acciones.find((x) => x.id === c.accion);
    return (c.distancia + (replica?.avance ?? 0) + (replica?.alcance ?? 0) + (replica?.holgura ?? 0)) / UNO;
  });
  comprobar(
    'la Acometida llega siempre al tirador: vuelo, avance de la Réplica y alcance cubren lo más lejos que se pone, con todos los estilos (también la Mole)',
    conLaMole === null && tirador !== undefined && lejosM >= 8 && alcancesM.length === 2 && Math.min(...alcancesM) >= lejosM,
    { conLaMole, lejosM, alcancesM },
  );
  comprobar(
    'los avisos de verdad, en el orden del diseño: marcar, Rescate, Voy, ¡Desalójalo!',
    l.avisos.marcar !== 0 && l.avisos.rescate !== 0 && l.avisos.voy !== 0 && l.avisos.desalojalo !== 0 && new Set([l.avisos.marcar, l.avisos.rescate, l.avisos.voy, l.avisos.desalojalo]).size === 4,
    l.avisos,
  );
  /* La predicción con el cuerpo, la arena y el límite de verdad, contra el contrato y contra la sala. */
  const arena = arenaDeLaLiza(real);
  const limite = real.mundo.limites.find((x) => x.id === real.fase.limite)?.caja ?? null;
  const nace = real.mundo.nace.find((x) => x.papel === 'asiento') ?? NACE;
  const p = new PasoPropio(arena, r.cuerpo);
  p.colocar(nace.x, nace.z);
  let malos = 0;
  let px = p.x;
  let pz = p.z;
  const azar = azarDe(7);
  let rumbo = 0;
  for (let t = 0; t < 3000; t++) {
    if (t % 25 === 0) rumbo = Math.floor(azar() * 256);
    if (!p.desplazandose() && t % 41 === 7) p.desplazar(Math.floor(azar() * 256), r.esquiva.puesta.distanciaExtra, Math.min(6, r.esquiva.puesta.tics), false);
    const d = p.paso({ rumbo, fuerza: 1, correr: t % 100 < 50 }, false, limite);
    if (!dentroDelLimite(limite, d.x, d.z) || !seAndaEnRecta(arena, { x: px, z: pz }, { x: d.x, z: d.z }, r.cuerpo.radio) || !sePuedeEstar(arena, d.x, d.z, r.cuerpo.radio)) malos++;
    px = d.x;
    pz = d.z;
  }
  comprobar('con el reglamento de verdad, 3.000 tics quebrando y corriendo: todo tramo en recta, dentro del límite y donde se puede estar', malos === 0, malos);
  /*
   * LA CIUDAD SE PISA (CIUDAD-ABIERTA, entrega 1): en la oleada el límite es la ciudad entera, el cliente
   * juega en la ciudad de la traza de la vista, y andando por sus calles se sale de la plaza sin que el
   * contrato tire un solo tramo. Mientras el productor diera el barrio, esto sale ROJO con su porqué.
   */
  const leidoDeVerdad = lugarDeLaMesa(leida, 'QUIEB', real);
  const lugarDeVerdad = leidoDeVerdad.lugar;
  comprobar(
    'con el productor de verdad, en la oleada el límite es la CIUDAD (no la plaza) y el cliente juega en la ciudad de la traza de la vista',
    real.fase.limite === ID_DEL_LIMITE_DE_LA_CIUDAD && lugarDeVerdad !== null && lugarDeVerdad.tipo === 'ciudad' && lugarDeVerdad.traza === leida?.traza,
    { limite: real.fase.limite, lugar: lugarDeVerdad?.tipo ?? null, aviso: leidoDeVerdad.aviso, traza: leida?.traza ?? null },
  );
  /* Sin la ciudad no hay calles que andar: la comprobación sale roja igual (no se salta). */
  const andado =
    lugarDeVerdad !== null && lugarDeVerdad.tipo === 'ciudad'
      ? andarPorLaCiudad(real, r, lugarDeVerdad.noche.grafo, [nace.x / UNO, nace.z / UNO], [
          [200, -200],
          [-200, 200],
        ])
      : { metros: 0, lejos: 0, llegadas: 0, malos: ['el lugar no es la ciudad'], tics: 0 };
  comprobar(
    `con la liza de verdad, por las calles de la ciudad hasta dos esquinas lejanas (${String(Math.round(andado.metros))} m, hasta ${String(Math.round(andado.lejos))} m de la plaza): todo tramo dentro del límite, en recta y donde se puede estar`,
    andado.malos.length === 0 && andado.llegadas === 2 && andado.lejos > 150,
    andado.malos.slice(0, 4),
  );
  const correcciones = await contraLaSala(real, r, 1600, 5);
  if (correcciones === null) nota('Sin sala, la liza de verdad no se juega contra ella.');
  else {
    comprobar(
      'la liza de verdad contra la sala de verdad, en la oleada con Prestados que pegan: 1.600 tics sin una corrección que no explique un golpe recibido',
      correcciones.sinExplicar === 0,
      correcciones,
    );
    nota(`(con la liza de verdad: ${String(correcciones.total)} correcciones, todas por un golpe que llegó entre el paso y la sala)`);
  }
})();

/* ─────────────────────────────── 8. La partida entera ─────────────────────────────── */

paso('8. La partida entera, contra un enchufe de mentira');
{
  const relojes = new RelojesDeMentira();
  const mandos = new EstadoDeLosMandos();
  const enchufes: EnchufeDeMentira[] = [];
  const partida = new Partida({
    direccion: 'ws://x/api/arcade/mesas/QUIEB/liza',
    llave: 'k1',
    fabrica: (d) => {
      const e = new EnchufeDeMentira(d);
      enchufes.push(e);
      return e;
    },
    relojes,
    mandos,
  });
  partida.ponerLaDeclaracion(LIZA, { tipo: 'barrio', barrio: BARRIO }, 'a1');
  partida.asegurarElCanal(true);
  const e = enchufes[0] as EnchufeDeMentira;
  e.abrir();
  const origen = relojes.t;
  e.llega({ t: 'dentro', yo: 1, k: 1000, x: NACE.x, z: NACE.z, r: 0, hz: 20 });
  e.llega({ t: 'tic', k: 1000, ev: [{ e: 'fase', clave: 'n1-o1', modo: 2, limite: ID_DE_LIMITE_EN_LA_LIZA.glorieta48, relojMs: 0, encuentroTics: 3000 }] });
  e.llega({ t: 'eco', c: 0, k: 1000, ms: 50_000 });
  const fotograma = (ms: number): void => {
    relojes.t += ms;
    partida.fotograma(relojes.t, ms / 1000);
  };
  fotograma(1);
  mandos.ponerPalanca(0, 1, relojes.t);
  for (let i = 0; i < 20; i++) fotograma(16);
  /* Un fotograma que se come tres tics. */
  fotograma(150);
  const aquis = e.leidos().filter((m): m is Aqui => m.t === 'aqui');
  const ns = aquis.map((a) => a.n);
  const seguidos = ns.every((n, i) => i === 0 || n === (ns[i - 1] as number) + 1);
  comprobar('un `aqui` por tic, con `n` seguidos, aunque un fotograma se coma tres', aquis.length >= 8 && seguidos && (ns[ns.length - 1] ?? 0) === Math.floor((relojes.t - origen) / 50), ns);
  const primero = aquis[0];
  const ultimo = aquis[aquis.length - 1];
  comprobar(
    'andando hacia delante (la cámara al norte) el sitio del `aqui` avanza hacia el norte (z baja) y la marcha es la del trote',
    primero !== undefined && ultimo !== undefined && ultimo.z < primero.z && ultimo.m === 2 && ultimo.x === primero.x,
    { primero, ultimo },
  );

  /* Un Celador a 3 m delante, en la foto y en la sala. */
  const kSala = 1000 + 20;
  const yoX = (ultimo?.x ?? NACE.x) / UNO;
  const yoZ = (ultimo?.z ?? NACE.z) / UNO;
  e.llega({ t: 'tic', k: kSala, ev: [{ e: 'nace', id: 16, clase: 1, x: Math.round(yoX * 100), z: Math.round((yoZ - 3) * 100), r: 128 }] });
  e.llega({ t: 'foto', k: kSala, p: [[16, Math.round(yoX * 100), Math.round((yoZ - 3) * 100), 128, 0, 0]] });
  e.llega({ t: 'foto', k: kSala + 2, p: [[16, Math.round(yoX * 100), Math.round((yoZ - 3) * 100), 128, 0, 0]] });
  mandos.ponerPalanca(0, 0, relojes.t);
  fotograma(16);
  const golpeEn = relojes.t - 3.7;
  mandos.pulsar('golpe', golpeEn);
  fotograma(60);
  const conAccion = e.leidos().filter((m): m is Aqui => m.t === 'aqui' && m.a !== 0);
  const golpe1 = conAccion[0];
  comprobar(
    'GOLPE sale en el `aqui` siguiente como la Entrada, con el `ms` de su EVENTO (no el del fotograma) y el Celador enganchado',
    golpe1 !== undefined && golpe1.a !== 0 && golpe1.a[0] === ACC.entrada && golpe1.a[1] === Math.floor(golpeEn - origen) && golpe1.a[2] === 16,
    golpe1,
  );
  comprobar('el cuerpo propio arranca el gesto al pulsar (la Entrada, desde el instante de la pulsación)', partida.pintadoDe(1)?.gesto === 'entrada' && partida.pintadoDe(1)?.gestoDesdeMs === golpeEn);
  /* La sala anuncia mi Entrada: la anticipación elástica toma su impacto, y el siguiente GOLPE encadena. */
  const impactoCanal = Math.floor(relojes.t - origen) + 300;
  e.llega({ t: 'tic', k: kSala + 4, ev: [{ e: 'anuncio', id: 1, de: 1, a: 16, acc: ACC.entrada, t: impactoCanal, x: Math.round(yoX * 100), z: Math.round(yoZ * 100) }] });
  fotograma(16);
  comprobar('el anuncio de mi golpe fija el impacto del gesto en SU instante, en mi reloj (anticipación elástica)', partida.pintadoDe(1)?.impactoMs === impactoCanal + origen, partida.pintadoDe(1)?.impactoMs);
  relojes.t += 250;
  const seguida = relojes.t;
  mandos.pulsar('golpe', seguida);
  fotograma(60);
  const golpe2 = e.leidos().filter((m): m is Aqui => m.t === 'aqui' && m.a !== 0)[1];
  comprobar('GOLPE dentro de la ventana tras el impacto encadena la Seguida', golpe2 !== undefined && golpe2.a !== 0 && golpe2.a[0] === ACC.seguida1, golpe2);
  relojes.t += 3000;
  mandos.pulsar('golpe', relojes.t);
  fotograma(60);
  const golpe3 = e.leidos().filter((m): m is Aqui => m.t === 'aqui' && m.a !== 0)[2];
  comprobar('pasada la ventana, GOLPE vuelve a abrir con la Entrada', golpe3 !== undefined && golpe3.a !== 0 && golpe3.a[0] === ACC.entrada, golpe3);

  /* En el Remanso, GOLPE es la Réplica. */
  e.llega({ t: 'tic', k: kSala + 90, ev: [{ e: 'estado', a: 1, est: EST.remanso, tics: 20, into: 20 }] });
  mandos.pulsar('golpe', relojes.t + 1);
  fotograma(60);
  const replica = e.leidos().filter((m): m is Aqui => m.t === 'aqui' && m.a !== 0)[3];
  comprobar('en el Remanso GOLPE es la Réplica', replica !== undefined && replica.a !== 0 && replica.a[0] === ACC.replica, replica);

  /* QUIEBRO: su acción, sin blanco, con su `ms`; y el cuerpo empieza a desplazarse en el acto. */
  e.llega({ t: 'tic', k: kSala + 120, ev: [{ e: 'estado', a: 1, est: 0, tics: 0, into: 0 }] });
  fotograma(16);
  const antesDelQuiebroX = partida.paso?.x ?? 0;
  const antesDelQuiebroZ = partida.paso?.z ?? 0;
  /* Hacia un lado con calle libre: la cámara mira al norte, y la palanca empuja hacia ese lado. */
  const lado = [Math.PI / 2, -Math.PI / 2, Math.PI, 0].find((a) => libreHacia(antesDelQuiebroX, antesDelQuiebroZ, a, 4.5)) ?? Math.PI / 2;
  const quiebroEn = relojes.t - 2;
  mandos.ponerPalanca(Math.sin(lado), Math.cos(lado), relojes.t);
  mandos.pulsar('quiebro', quiebroEn);
  /* El pulgar se suelta en el mismo fotograma: el quiebro va hacia donde apuntaba AL PULSAR. */
  mandos.ponerPalanca(0, 0, relojes.t);
  for (let i = 0; i < 30; i++) fotograma(16);
  const quiebro = e.leidos().filter((m): m is Aqui => m.t === 'aqui' && m.a !== 0 && m.a[0] === ACC.quiebro)[0];
  comprobar('QUIEBRO viaja con su acción, sin blanco y con el `ms` de su evento', quiebro !== undefined && quiebro.a !== 0 && quiebro.a[1] === Math.floor(quiebroEn - origen) && quiebro.a[2] === 0, quiebro);
  const recorrido = Math.hypot((partida.paso?.x ?? 0) - antesDelQuiebroX, (partida.paso?.z ?? 0) - antesDelQuiebroZ) / UNO;
  comprobar('y el cuerpo se desplaza hacia la palanca los 3,5 m del quiebro (sin esperar a la sala, y no los 4 que la sala admite con su holgura)', recorrido > 3.3 && recorrido < 3.6, recorrido);

  /* USAR junto a un Celador desalojable: se mantiene, con el MISMO `ms` en cada `aqui`. */
  const p = partida.pintadoDe(1);
  const px = Math.round((p?.x ?? 0) * 100);
  const pz = Math.round((p?.z ?? 0) * 100);
  e.llega({ t: 'foto', k: kSala + 196, p: [[16, px + 150, pz, 0, 0, 0]] });
  e.llega({ t: 'foto', k: kSala + 198, p: [[16, px + 150, pz, 0, 0, 0]] });
  fotograma(16);
  const enPie = partida.usoPosible(relojes.t);
  comprobar('junto a un Celador EN PIE, USAR no es rematarlo: sólo al desalojable', enPie === null || enPie.que !== 'rematar', enPie);
  e.llega({ t: 'tic', k: kSala + 200, ev: [{ e: 'estado', a: 16, est: EST.desalojable, tics: 60, into: 0 }] });
  e.llega({ t: 'foto', k: kSala + 200, p: [[16, px + 150, pz, 0, 0, EST.desalojable]] });
  e.llega({ t: 'foto', k: kSala + 202, p: [[16, px + 150, pz, 0, 0, EST.desalojable]] });
  fotograma(16);
  const uso = partida.usoPosible(relojes.t);
  comprobar('junto a un Celador desalojable, USAR es rematarlo', uso !== null && uso.que === 'rematar' && uso.accion === ACC.remate && uso.blanco === 16, uso);
  const antesDeUsar = e.leidos().length;
  const usarEn = relojes.t - 1;
  mandos.pulsar('usar', usarEn);
  for (let i = 0; i < 6; i++) fotograma(50);
  const sostenidos = e
    .leidos()
    .slice(antesDeUsar)
    .filter((m): m is Aqui => m.t === 'aqui');
  const todos = sostenidos.every((m) => m.a !== 0 && m.a[0] === ACC.remate && m.a[1] === Math.floor(usarEn - origen) && m.a[2] === 16);
  comprobar('mantenido, un `aqui` por tic con el remate y el MISMO `ms` de la pulsación', sostenidos.length >= 5 && todos, sostenidos.slice(0, 3));
  mandos.soltarUsar();
  fotograma(50);
  const trasSoltar = e.leidos()[e.leidos().length - 1];
  comprobar('al soltar, el primer `aqui` sin la acción la suelta', trasSoltar?.t === 'aqui' && trasSoltar.a === 0);

  /* Sin cuerpo (sale por la cabina): no se manda `aqui`. */
  e.llega({ t: 'tic', k: kSala + 300, ev: [{ e: 'sale', a: 1, zona: 30 }] });
  const antesDeSalir = e.leidos().length;
  for (let i = 0; i < 6; i++) fotograma(50);
  comprobar('quien no tiene cuerpo no manda `aqui` (Vigía)', e.leidos().slice(antesDeSalir).every((m) => m.t !== 'aqui') && !partida.conCuerpo());

  /* Una fase de calma quieta: tampoco. Y `dentro` lo tira todo y vuelve a empezar. */
  e.llega({ t: 'dentro', yo: 1, k: 5000, x: NACE.x, z: NACE.z, r: 64, hz: 20 });
  comprobar('un `dentro` nuevo devuelve el cuerpo a donde dice la sala y olvida la sala de antes', partida.conCuerpo() && partida.paso?.x === NACE.x && partida.sala.entidades.size === 0);
  partida.cerrar();
}

/* ─────────────────────────────── 9. Mandos, enganche, cámara y HUD ─────────────────────────────── */

paso('9. Los mandos, el enganche, la cámara y el HUD');
{
  const dentro = sinZonaMuerta(ZONA_MUERTA * 0.9, 0);
  const borde = sinZonaMuerta(1, 0);
  const medio = sinZonaMuerta(0, ZONA_MUERTA + (1 - ZONA_MUERTA) * 0.6);
  /* El 12 % va escrito aquí: leerlo de `ZONA_MUERTA` daría verde con cualquier zona. */
  const justoDentro = sinZonaMuerta(0.115, 0);
  const justoFuera = sinZonaMuerta(0.125, 0);
  comprobar(
    'la zona muerta del 12 % es cero, y el 60 % del recorrido útil es 0,6',
    dentro.fuerza === 0 && casi(borde.fuerza, 1) && casi(medio.fuerza, 0.6) && justoDentro.fuerza === 0 && justoFuera.fuerza > 0,
    { dentro, borde, medio, justoDentro, justoFuera },
  );
  const m = new EstadoDeLosMandos();
  m.ponerPalanca(0, 1, 100);
  m.ponerPalanca(0, 1, 200);
  const aFondo = m.aFondoDesde;
  m.ponerPalanca(0, 0.5, 300);
  comprobar('«a fondo» recuerda desde cuándo, y se olvida al aflojar', aFondo === 100 && m.aFondoDesde === null);
  m.pulsar('golpe', 10);
  m.pulsar('quiebro', 11);
  m.pulsar('usar', 12);
  const cola = m.tomarPulsaciones();
  comprobar('las pulsaciones salen en orden con su hora, USAR se mantiene aparte', cola.length === 2 && cola[0]?.boton === 'golpe' && cola[1]?.timeStamp === 11 && m.usarDesde === 12 && m.tomarPulsaciones().length === 0);
  m.soltarTodo();
  comprobar('perder el foco lo suelta todo (un dedo que no levantó no sigue empujando)', m.fuerza === 0 && m.usarDesde === null && !m.correrPedido);

  /* El enganche: el mejor en el cono y el radio; nunca tras una pared. */
  const sinCajas = new Int32Array(0);
  const base = { x: 0, z: 0, direccion: 0, radio: 7, medioCono: Math.PI / 3, anterior: 0, cuerpos: sinCajas };
  comprobar(
    'el enganche prefiere cerca y de frente, y deja fuera lo de detrás y lo de más de 7 m',
    elegirBlanco(base, [
      { numero: 20, x: 0, z: -6 },
      { numero: 21, x: 1, z: -2 },
      { numero: 22, x: 0, z: 3 },
      { numero: 23, x: 0, z: -8 },
    ]) === 21 &&
      elegirBlanco(base, [{ numero: 22, x: 0, z: 3 }]) === 0 &&
      elegirBlanco(base, [{ numero: 23, x: 0, z: -8 }]) === 0 &&
      elegirBlanco(base, [{ numero: 27, x: 0, z: -6.9 }]) === 27,
  );
  comprobar('a más de 60° de la palanca no engancha', elegirBlanco(base, [{ numero: 24, x: 3, z: -1 }]) === 0 && elegirBlanco(base, [{ numero: 25, x: 1, z: -3 }]) === 25);
  const pared = new Int32Array([u(-2), u(-2.5), u(2), u(-2)]);
  comprobar('un blanco detrás de una pared no se engancha aunque esté cerca', elegirBlanco({ ...base, cuerpos: pared }, [{ numero: 26, x: 0, z: -4 }]) === 0);
  comprobar('las direcciones siguen el convenio de `andar.ts` (0 al norte, +90° al este)', casi(direccionHacia(0, -1), 0) && casi(direccionHacia(1, 0), Math.PI / 2) && casi(anguloEntre(0.1, -0.1), 0.2));

  /* La cámara: al hombro, abierta con enemigos, y nunca dentro de una caja. */
  const cam = camaraNueva(0);
  const libre = encuadrar(cam, { x: 0, z: 0, dt: 1, enemigosCerca: false, blanco: null, mandaElDedo: true, remanso: 0, tactil: false, vigia: false, cajas: [] });
  const detras = Math.hypot(libre.ojo.x - 0.45, libre.ojo.z);
  comprobar(
    'al hombro: 3,2 m detrás, 1,7 m de alto y 70° de campo en PC',
    DISTANCIA_AL_HOMBRO === 3.2 && casi(detras, 3.2, 0.01) && casi(libre.ojo.y, 1.7, 0.01) && libre.fov === 70 && FOV_PC === 70 && libre.ojo.z > 0,
    libre,
  );
  const abierta = encuadrar(camaraNueva(0), { x: 0, z: 0, dt: 10, enemigosCerca: true, blanco: null, mandaElDedo: true, remanso: 0, tactil: false, vigia: false, cajas: [] });
  comprobar('con enemigos a menos de 5 m se abre a 4 m', DISTANCIA_ABIERTA === 4 && casi(Math.hypot(abierta.ojo.x - 0.45, abierta.ojo.z), 4, 0.05));
  const muro: CajaAlta = { x0: -5, z0: 1.5, x1: 5, z1: 3, alto: 6 };
  const tapada = encuadrar(camaraNueva(0), { x: 0, z: 0, dt: 1, enemigosCerca: false, blanco: null, mandaElDedo: true, remanso: 0, tactil: false, vigia: false, cajas: [muro] });
  const dentroDelMuro = tapada.ojo.x > muro.x0 && tapada.ojo.x < muro.x1 && tapada.ojo.z > muro.z0 && tapada.ojo.z < muro.z1 && tapada.ojo.y < muro.alto;
  comprobar('con un muro detrás, la cámara se pone delante del muro y no dentro', !dentroDelMuro && tapada.ojo.z < muro.z0, tapada.ojo);
  const bajo: CajaAlta = { x0: -5, z0: 1.5, x1: 5, z1: 3, alto: 0.45 };
  const conBanco = encuadrar(camaraNueva(0), { x: 0, z: 0, dt: 1, enemigosCerca: false, blanco: null, mandaElDedo: true, remanso: 0, tactil: false, vigia: false, cajas: [bajo] });
  comprobar('un banco bajo no la acerca: la prueba de losa mira el alto de cada caja', casi(Math.hypot(conBanco.ojo.x - 0.45, conBanco.ojo.z), DISTANCIA_AL_HOMBRO, 0.01));
  comprobar('la losa en tres ejes: entra, no entra, y pasa por encima', (losaEnTresEjes({ x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 10 }, muro, 0) ?? -1) > 0 && losaEnTresEjes({ x: 0, y: 8, z: 0 }, { x: 0, y: 8, z: 10 }, muro, 0) === null);
  const enRemanso = encuadrar(camaraNueva(0), { x: 0, z: 0, dt: 1, enemigosCerca: false, blanco: null, mandaElDedo: true, remanso: 1, tactil: true, vigia: false, cajas: [] });
  comprobar('el Remanso cierra el campo 8° (75 → 67 en el móvil) y orbita', enRemanso.fov === 67 && enRemanso.ojo.x !== libre.ojo.x);
  const auto = camaraNueva(0);
  for (let i = 0; i < 60; i++) encuadrar(auto, { x: 0, z: 0, dt: 1 / 30, enemigosCerca: false, blanco: { x: 5, z: 0 }, mandaElDedo: false, remanso: 0, tactil: false, vigia: false, cajas: [] });
  const quieta = camaraNueva(0);
  for (let i = 0; i < 60; i++) encuadrar(quieta, { x: 0, z: 0, dt: 1 / 30, enemigosCerca: false, blanco: { x: 5, z: 0 }, mandaElDedo: true, remanso: 0, tactil: false, vigia: false, cajas: [] });
  comprobar('la cámara automática gira hacia el blanco; si manda el dedo, no', auto.giro > 1 && quieta.giro === 0, { auto: auto.giro, quieta: quieta.giro });
  const vigia = encuadrar(camaraNueva(0), { x: 3, z: 4, dt: 1, enemigosCerca: false, blanco: null, mandaElDedo: true, remanso: 0, tactil: false, vigia: true, cajas: [] });
  comprobar('Vigía: cenital a 25 m sobre el sitio', vigia.ojo.y === 25 && vigia.mira.x === 3 && vigia.mira.z === 4);

  /* El HUD. */
  const esquirla = LIZA.portables[0] ?? null;
  const seis = valorDeLasEsquirlas(6, esquirla);
  const doce = valorDeLasEsquirlas(12, esquirla);
  comprobar('«6 → 210 · con una más, 280», y con 12 (el tope) ya no cabe otra', seis.valor === 210 && seis.conUnaMas === 280 && doce.valor === 780 && doce.conUnaMas === null);
  comprobar('los relojes se leen «2:30», «0:09», y los miles con punto', relojEnTexto(150_000) === '2:30' && relojEnTexto(8_200) === '0:09' && cifra(12480) === '12.480');
  const vistaDePausa = { fase: { tipo: 'pausa', oleada: 3 }, asientos: [{ asiento: 'a1', haElegido: false }] } as unknown as VistaDelQuiebro;
  const hecha = { ...vistaDePausa, asientos: [{ asiento: 'a1', haElegido: true }] } as unknown as VistaDelQuiebro;
  const otra = { ...vistaDePausa, fase: { tipo: 'pausa', oleada: 4 } } as unknown as VistaDelQuiebro;
  const pendiente = { oleada: 3, retoque: 'iman', voto: 'llamar', intentos: 1, rev: 40, ultimo: { resultado: 'rechazado' as const, motivo: '' } };
  comprobar(
    'la pausa reintenta sólo con una vista MÁS NUEVA que la del intento, y lo da por hecho si ya consta',
    queHacerConLaEleccion(vistaDePausa, 40, 'a1', pendiente) === 'esperar' &&
      queHacerConLaEleccion(vistaDePausa, 41, 'a1', pendiente) === 'reintentar' &&
      queHacerConLaEleccion(hecha, 41, 'a1', pendiente) === 'hecho' &&
      queHacerConLaEleccion(otra, 41, 'a1', pendiente) === 'abandonar' &&
      queHacerConLaEleccion(vistaDePausa, 41, 'a1', { ...pendiente, intentos: 3 }) === 'abandonar',
  );
  comprobar(
    'la fase se rotula con los nombres del juego: la oleada 4 es la primera Propina',
    etiquetaDeLaFase({ fase: { tipo: 'oleada', oleada: 4 } } as unknown as VistaDelQuiebro) === `${NOMBRES_DEL_QUIEBRO.fases.propina} 1` &&
      etiquetaDeLaFase({ fase: { tipo: 'oleada', oleada: 2 } } as unknown as VistaDelQuiebro) === `${NOMBRES_DEL_QUIEBRO.fases.oleada} 2`,
  );
}

/* ─────────────────────────────── 10. El puerto de prueba ─────────────────────────────── */

paso('10. El puerto de prueba');
await (async () => {
  const pedidas: { ruta: string; init: RequestInit | undefined }[] = [];
  let rev = 3;
  let respuestaDelMover: () => Response = () => new Response(JSON.stringify({ mesa: { codigo: 'QUIEB', rev: rev + 1, yo: 'a1', vista: {}, opciones: [] } }), { status: 200 });
  const buscar = async (ruta: string, init?: RequestInit): Promise<Response> => {
    pedidas.push({ ruta, init });
    if (init?.method === 'POST' && ruta === '/api/arcade/mesas') {
      return new Response(JSON.stringify({ codigo: 'QUIEB', asiento: 'a1', llave: 'secreta', mesa: { codigo: 'QUIEB', rev, yo: 'a1', vista: {}, opciones: [] } }), { status: 201 });
    }
    if (init?.method === 'POST') return respuestaDelMover();
    /* El sondeo: se queda esperando (como la espera larga) hasta que lo corten. */
    return new Promise<Response>((_, rechazar) => init?.signal?.addEventListener('abort', () => rechazar(new Error('cortado'))));
  };
  const p = await PuertoDePrueba.abrir(buscar, 'Prueba');
  const apertura = pedidas[0];
  const cuerpo = JSON.parse(String(apertura?.init?.body ?? '{}')) as { arcade?: string; plazoSegundos?: number };
  comprobar('abre una mesa de `quiebro` con el plazo de vigilancia de 300 s', cuerpo.arcade === 'quiebro' && cuerpo.plazoSegundos === PLAZO_DE_LA_MESA_S && p.codigo === 'QUIEB' && p.llave === 'secreta');
  await new Promise((listo) => setTimeout(listo, 5));
  const sondeo = pedidas[1];
  const cabeceras = (sondeo?.init?.headers ?? {}) as Record<string, string>;
  comprobar('sondea desde su revisión con la llave en `x-asiento`, y la llave NUNCA va en una dirección', sondeo?.ruta === '/api/arcade/mesas/QUIEB?desde=3' && cabeceras['x-asiento'] === 'secreta' && pedidas.every((q) => !q.ruta.includes('secreta')));
  const hecho = await p.mover({ tipo: 'empezar', carga: null });
  const cuerpoDelMover = JSON.parse(String(pedidas[pedidas.length - 1]?.init?.body ?? '{}')) as { rev?: number; tipo?: string };
  comprobar('mover lleva la revisión sobre la que se decidió, y con la revisión subida es `hecho`', hecho.resultado === 'hecho' && cuerpoDelMover.rev === 3 && cuerpoDelMover.tipo === 'empezar' && p.rev === 4);
  rev = 4;
  respuestaDelMover = () => new Response(JSON.stringify({ mesa: { codigo: 'QUIEB', rev: 4, yo: 'a1', vista: {}, opciones: [] } }), { status: 200 });
  const igual = await p.mover({ tipo: 'elegir', carga: { retoque: 'iman', voto: null } });
  respuestaDelMover = () => new Response(JSON.stringify({ error: 'revisión rancia', mesa: { codigo: 'QUIEB', rev: 5, yo: 'a1', vista: {}, opciones: [] } }), { status: 409 });
  const rancia = await p.mover({ tipo: 'elegir', carga: { retoque: 'iman', voto: null } });
  respuestaDelMover = () => {
    throw new Error('sin red');
  };
  const sinRed = await p.mover({ tipo: 'elegir', carga: { retoque: 'iman', voto: null } });
  comprobar(
    'el rechazo silencioso (misma revisión) y el 409 son `rechazado`; sin respuesta, `sin-red`; y el 409 trae la mesa nueva',
    igual.resultado === 'rechazado' && rancia.resultado === 'rechazado' && sinRed.resultado === 'sin-red' && p.rev === 5,
    { igual, rancia, sinRed, rev: p.rev },
  );
  p.cerrar();
})();

/* ─────────────────────────────── 10 bis. El pulido del cliente ─────────────────────────────── */

/*
 * Lo que trajo el pulido de la sala (el informe «pulido-reglas-sala», su «Lo que tiene que saber el
 * frente del cliente») y lo que pidió el coordinador el 24-sep: la Bajada como preparación con su reloj
 * de verdad, el ausente (propio y ajeno) y el juego al fondo, la Acometida entera y el código en el modo
 * de prueba. Cada comprobación se vio roja rompiendo el producto en un espejo del árbol.
 */
paso('10 bis. La preparación, el ausente, el fondo, la Acometida entera y la mesa de otra pestaña');
await (async () => {
  const sinComentariosDe = (x: string): string => x.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  /* ── La Bajada: su reloj y la caída de la cámara (`red/bajada.ts`) ── */
  const visto = (fase: string, reloj: { id: string; duraMs: number } | null, todosListos: boolean, deLaSala: { clave: string; relojHastaMs: number | null; llegoMs: number } | null = null, noche = 1) => ({
    fase,
    noche,
    reloj,
    todosListos,
    clave: fase === 'bajada' ? `n${String(noche)}.b` : `n${String(noche)}.o1`,
    deLaSala,
  });
  const R15 = { id: 'n1.b', duraMs: DURACION_MS.bajada };
  const R6 = { id: 'n1.b.listos', duraMs: DURACION_MS.bajadaConTodos };
  {
    const b = new RelojDeLaBajada();
    const t0 = 100_000;
    b.observar(visto('bajada', R15, false), t0);
    const alEmpezar = b.leer(t0);
    b.observar(visto('bajada', R15, false), t0 + 5600);
    const aLos56 = b.leer(t0 + 5600);
    b.observar(visto('bajada', R15, false), t0 + 15000 - CAIDA_MS - 50);
    const antesDeCaer = b.leer(t0 + 15000 - CAIDA_MS - 50);
    b.observar(visto('bajada', R15, false), t0 + 15000 - CAIDA_MS);
    b.observar(visto('bajada', R15, false), t0 + 15000 - CAIDA_MS + 200);
    const alFinal = b.leer(t0 + 15000 - CAIDA_MS + 200);
    comprobar(
      'sin nadie listo, la Bajada dura sus 15 s: la cámara espera arriba a los 5,6 s (la caída de antes) y sólo cae cuando ya no queda más que lo que tarda en caer',
      alEmpezar.quedaMs === 15000 && alEmpezar.caida === 0 && aLos56.caida === 0 && aLos56.quedaMs === 9400 && antesDeCaer.caida === 0 && alFinal.caida !== null && alFinal.caida > 0 && alFinal.caida < 0.1,
      { alEmpezar, aLos56, antesDeCaer, alFinal },
    );
  }
  {
    const b = new RelojDeLaBajada();
    const t0 = 200_000;
    b.observar(visto('bajada', R15, false), t0);
    b.observar(visto('bajada', R6, true), t0 + 2000);
    const alListo = b.leer(t0 + 2000);
    b.observar(visto('bajada', R6, true), t0 + 4000);
    const aMedias = b.leer(t0 + 4000);
    b.observar(visto('bajada', R6, true), t0 + 5990);
    const casi = b.leer(t0 + 5990);
    comprobar(
      'con todos listos a los 2 s el reloj es el de la caída (6 s desde que EMPEZÓ la Bajada) y la cámara cae en los 4 s que quedan',
      alListo.quedaMs === 4000 && alListo.caida === 0 && aMedias.caida === 0.5 && casi.caida !== null && casi.caida > 0.99 && casi.quedaMs === 10,
      { alListo, aMedias, casi },
    );
  }
  {
    const b = new RelojDeLaBajada();
    const t0 = 300_000;
    b.observar(visto('bajada', R15, false), t0);
    b.observar(visto('oleada', null, false), t0 + 1000);
    const enLaOleada = b.leer(t0 + 1000 + CAIDA_MINIMA_MS / 2);
    b.observar(visto('oleada', null, false), t0 + 1000 + CAIDA_MINIMA_MS + 10);
    const despues = b.leer(t0 + 1000 + CAIDA_MINIMA_MS + 10);
    comprobar(
      'si la Bajada se acaba antes de caer (el último listo con el reloj vencido), la caída sigue en la oleada lo mínimo, y luego manda la pelea',
      enLaOleada.caida === 0.5 && enLaOleada.quedaMs === null && despues.caida === null,
      { enLaOleada, despues },
    );
  }
  {
    /* Una pestaña que se recarga a los 10 s: la sala dice que al reloj de 15 s le quedan 5. */
    const b = new RelojDeLaBajada();
    const t0 = 400_000;
    b.observar(visto('bajada', R15, false, { clave: 'n1.re', relojHastaMs: t0 + 2000, llegoMs: t0 - 50 }), t0);
    const conLaVieja = b.leer(t0);
    b.observar(visto('bajada', R15, false, { clave: 'n1.b', relojHastaMs: t0 + 5000, llegoMs: t0 + 10 }), t0 + 10);
    const conLaSuya = b.leer(t0 + 10);
    b.observar(visto('bajada', R15, false, { clave: 'n1.b', relojHastaMs: t0 + 5000, llegoMs: t0 + 10 }), t0 + 510);
    const cayendo = b.leer(t0 + 510);
    comprobar(
      'el principio de la Bajada lo dice la sala (su suceso `fase` de ESTA fase), y el de otra fase (el recuento de la noche de antes) no cuenta',
      conLaVieja.quedaMs === 15000 && conLaSuya.quedaMs === 4990 && cayendo.caida !== null && cayendo.caida > 0.05,
      { conLaVieja, conLaSuya, cayendo },
    );
  }
  {
    /*
     * LA CAÍDA NO DA VUELTAS: con la página abierta 1168 s (la cuarta noche de una mesa), la Bajada entera
     * a 60 fotogramas por segundo. El giro de la cámara en lo alto se suma fotograma a fotograma; sacado
     * del reloj de la página, la caída barría 6,2 vueltas y saltaba de un lado de la plaza al otro.
     */
    const b = new RelojDeLaBajada();
    const giro = new GiroEnLoAlto();
    const t0 = 1_168_000;
    let antes: number | null = null;
    let saltoMayor = 0;
    let barridoEnLaCaida = 0;
    let fotogramasCayendo = 0;
    for (let t = t0; t <= t0 + DURACION_MS.bajada + 400; t += 16) {
      b.observar(t < t0 + DURACION_MS.bajada ? visto('bajada', R15, false) : visto('oleada', null, false), t);
      const c = b.caida(t);
      const a = giro.avanzar(t, c ?? 1);
      if (antes !== null) {
        const d = Math.abs(a - antes);
        saltoMayor = Math.max(saltoMayor, d);
        if (c !== null && c > 0) {
          barridoEnLaCaida += d;
          fotogramasCayendo++;
        }
      }
      antes = a;
    }
    comprobar(
      'la cámara cae sin dar vueltas lleve lo que lleve abierta la página: en toda la caída gira unas centésimas de radián, y nada de golpe entre dos fotogramas',
      fotogramasCayendo > 250 && barridoEnLaCaida < 0.15 && saltoMayor < 0.002,
      { fotogramasCayendo, barridoEnLaCaida, saltoMayor },
    );
    const camara = sinComentariosDe(readFileSync(new URL('../src/quiebro/camara/Camara.tsx', import.meta.url), 'utf8'));
    comprobar(
      'y la cámara de la Bajada usa ese giro sumado, no uno sacado del reloj de la página',
      /new GiroEnLoAlto\(\)/.test(camara) && /\.avanzar\(ahora, caida \?\? 0\)/.test(camara) && !/VUELTA_EN_LO_ALTO/.test(camara),
    );
  }

  /* ── Quién falta, y lo que pintan la reunión y la preparación ── */
  let estado: unknown = undefined;
  const asientos = ['s1', 's2', 's3'];
  const sentados = asientos.map((asiento) => ({ asiento, nombre: asiento }));
  const mandar = (quien: string | null, tipo: string, carga: unknown): string | null => {
    const s = avanzarConMotivo('quiebro', estado, { tipo, carga }, { quien, azar: 20260924, tic: 0, asientos });
    if (s.motivo === null) estado = s.estado;
    return s.motivo;
  };
  const vista = (): VistaDelQuiebro => leerVistaDelQuiebro(vistaDeAsiento('quiebro', estado, null, sentados)) as VistaDelQuiebro;
  const opcionesDe = (quien: string): Opcion[] => [...opcionesDeArcade('quiebro', vistaDeAsiento('quiebro', estado, null, sentados), quien)];
  const puertoDe = (v: VistaDelQuiebro, yo: string, opciones: readonly Opcion[], mandados: { tipo: string; carga: unknown }[]): PuertoDeMesa => ({
    codigo: 'QUIEB',
    yo,
    llave: null,
    servidor: '',
    vista: v,
    opciones,
    rev: 1,
    mover: async (m) => {
      mandados.push({ tipo: m.tipo, carga: m.carga });
      return { resultado: 'hecho', motivo: '' };
    },
    suscribir: () => () => undefined,
  });
  const enLaReunion = vista();
  const htmlDeLaReunion = renderToStaticMarkup(createElement(Reunion, { vista: enLaReunion, puerto: puertoDe(enLaReunion, 's1', [...opcionesDe('s1'), { id: 'estilo:ligera', tipo: 'estilo', carga: { id: 'ligera' }, rotulo: 'Ligera', ayuda: '' }], []), mover: async () => ({ resultado: 'hecho' as const, motivo: '' }), enlaceParaEntrar: 'http://x/sala/quiebro.html?prueba=1&codigo=QUIEB' }));
  const tarjetasConBoton = (htmlDeLaReunion.match(/<button[^>]*class="q-tarjeta/g) ?? []).length;
  comprobar(
    'la reunión ENSEÑA los estilos sin un solo botón que mande (aunque le llegara la opción): el estilo se elige al bajar; y en el modo de prueba enseña la dirección de la segunda pestaña',
    tarjetasConBoton === 0 && (htmlDeLaReunion.match(/class="q-tarjeta/g) ?? []).length === 3 && htmlDeLaReunion.includes('?prueba=1&amp;codigo=QUIEB'),
    { tarjetasConBoton },
  );
  mandar('s1', 'empezar', null);
  mandar('s2', 'estilo', { id: 'mole' });
  const enLaBajada = vista();
  const faltan = quienesFaltanEnLaBajada(enLaBajada);
  comprobar('en la Bajada faltan los que no han dicho que están listos (elegir estilo ya es estarlo), y fuera de ella nadie', faltan.join() === '0,2' && quienesFaltanEnLaBajada(enLaReunion).length === 0, faltan);
  const relojVisto = new RelojDeLaBajada();
  relojVisto.observar(visto('bajada', enLaBajada.reloj, false), performance.now());
  const mandados: { tipo: string; carga: unknown }[] = [];
  const htmlDeS1 = renderToStaticMarkup(createElement(RotuloDeLaBajada, { vista: enLaBajada, rotulo: 'Glorieta', puerto: puertoDe(enLaBajada, 's1', opcionesDe('s1'), mandados), mover: async () => ({ resultado: 'hecho' as const, motivo: '' }), bajada: relojVisto }));
  const htmlDeS2 = renderToStaticMarkup(createElement(RotuloDeLaBajada, { vista: enLaBajada, rotulo: 'Glorieta', puerto: puertoDe(enLaBajada, 's2', opcionesDe('s2'), mandados), mover: async () => ({ resultado: 'hecho' as const, motivo: '' }), bajada: relojVisto }));
  comprobar(
    'la preparación enseña el reloj de verdad, los estilos que se pueden elegir, BAJAR a quien aún no está listo, y quién falta',
    /0:1[45]/.test(htmlDeS1) && (htmlDeS1.match(/<button[^>]*class="q-tarjeta/g) ?? []).length === 3 && htmlDeS1.includes(`>${NOMBRES_DEL_QUIEBRO.mesa.bajar}<`) && htmlDeS1.includes('Faltan'),
    htmlDeS1.slice(0, 400),
  );
  const quiebrosDeLasTarjetas = (['gabardina', 'ligera', 'mole'] as const).map((id) => `${NOMBRES_DEL_QUIEBRO.quiebros.quiebro} ${ESTILOS[id].quiebroMetros.toFixed(1).replace('.', ',')} m`);
  comprobar(
    'las tarjetas dicen el quiebro de la tabla de estilos (3,5 m la Gabardina), no el presupuesto con la holgura que la sala admite encima',
    quiebrosDeLasTarjetas.every((q) => htmlDeS1.includes(q)),
    { quiebrosDeLasTarjetas, cifras: htmlDeS1.match(/class="cifras">[^<]*/g) },
  );
  comprobar(
    'a quien ya está listo, ni estilos ni BAJAR: se le dice «listo» y con qué estilo baja',
    !htmlDeS2.includes(`>${NOMBRES_DEL_QUIEBRO.mesa.bajar}<`) && !/<button[^>]*class="q-tarjeta/.test(htmlDeS2) && htmlDeS2.includes('Listo') && htmlDeS2.includes(NOMBRES_DEL_QUIEBRO.estilos.mole),
  );

  /* ── El ausente, el propio y el de los demás; y el aparato callado al fondo ── */
  const relojes = new RelojesDeMentira();
  const mandos = new EstadoDeLosMandos();
  const enchufes: EnchufeDeMentira[] = [];
  const partida = new Partida({
    direccion: 'ws://x/api/arcade/mesas/QUIEB/liza',
    llave: 'k1',
    fabrica: (d) => {
      const e = new EnchufeDeMentira(d);
      enchufes.push(e);
      return e;
    },
    relojes,
    mandos,
  });
  partida.ponerLaDeclaracion(LIZA, { tipo: 'barrio', barrio: BARRIO }, 'a1');
  partida.asegurarElCanal(true);
  const e = enchufes[0] as EnchufeDeMentira;
  e.abrir();
  const origen = relojes.t;
  e.llega({ t: 'dentro', yo: 1, k: 1000, x: NACE.x, z: NACE.z, r: 0, hz: 20 });
  e.llega({ t: 'tic', k: 1000, ev: [{ e: 'fase', clave: 'n1-o1', modo: 2, limite: ID_DE_LIMITE_EN_LA_LIZA.glorieta48, relojMs: 0, encuentroTics: 3000 }] });
  e.llega({ t: 'eco', c: 0, k: 1000, ms: 50_000 });
  const fotograma = (ms: number): void => {
    relojes.t += ms;
    partida.fotograma(relojes.t, ms / 1000);
  };
  const yoX = Math.round((NACE.x / UNO) * 100);
  const yoZ = Math.round((NACE.z / UNO) * 100);
  const fotoConDos = (k: number, estDel2: number): void => e.llega({ t: 'foto', k, p: [[2, yoX + 300, yoZ, 0, 0, estDel2]] });
  fotoConDos(1000, 0);
  fotoConDos(1002, 0);
  fotograma(1);
  for (let i = 0; i < 10; i++) fotograma(16);
  e.llega({ t: 'tic', k: 1010, ev: [{ e: 'estado', a: 1, est: EST.ausente, tics: 20000, into: 20000 }, { e: 'estado', a: 2, est: EST.ausente, tics: 20000, into: 20000 }] });
  fotoConDos(1012, EST.ausente);
  fotoConDos(1014, EST.ausente);
  for (let i = 0; i < 12; i++) fotograma(16);
  const ausenteYo = partida.ausencia(relojes.t);
  const tenueYo = partida.pintadoDe(1)?.tenue === true;
  const tenueEl2 = partida.pintadoDe(2)?.tenue === true;
  const sentidoDel2 = partida.sentidoDe(2, relojes.t);
  e.llega({ t: 'tic', k: 1030, ev: [{ e: 'estado', a: 1, est: EST.reaparecido, tics: 10, into: 10 }, { e: 'estado', a: 2, est: 0, tics: 0, into: 0 }] });
  fotoConDos(1030, 0);
  fotoConDos(1032, 0);
  for (let i = 0; i < 12; i++) fotograma(16);
  const deVuelta = partida.ausencia(relojes.t);
  const tenueTrasVolver = partida.pintadoDe(1)?.tenue === true || partida.pintadoDe(2)?.tenue === true;
  relojes.t += ROTULO_DE_LA_VUELTA_MS;
  fotograma(16);
  const yaNada = partida.ausencia(relojes.t);
  comprobar(
    'ausente, el HUD lo dice y mi cuerpo va tenue; al volver, «de vuelta» un momento y luego nada',
    ausenteYo === 'ausente' && tenueYo && deVuelta === 'vuelta' && yaNada === null && !tenueTrasVolver,
    { ausenteYo, tenueYo, deVuelta, yaNada },
  );
  comprobar('un compañero ausente se pinta tenue (y su sentido es «ausente», para su rótulo)', tenueEl2 && sentidoDel2 === 'ausente', { tenueEl2, sentidoDel2 });
  /* Al fondo: ni un `aqui`; de vuelta, como mucho los del tope de golpe, y luego uno por tic. */
  const antesDelFondo = e.leidos().length;
  partida.callar(true);
  for (let i = 0; i < 60; i++) fotograma(50);
  const alFondo = e.leidos().slice(antesDelFondo).filter((m) => m.t === 'aqui').length;
  partida.callar(false);
  fotograma(50);
  const rafaga = e.leidos().slice(antesDelFondo).filter((m): m is Aqui => m.t === 'aqui');
  for (let i = 0; i < 10; i++) fotograma(50);
  const despues = e.leidos().slice(antesDelFondo).filter((m): m is Aqui => m.t === 'aqui').map((m) => m.n);
  const seguidos = despues.slice(rafaga.length).every((n, i, xs) => i === 0 || n === (xs[i - 1] as number) + 1);
  comprobar(
    'al fondo el aparato se calla (3 s sin un `aqui`: la sala lo da por ausente) y al volver manda como mucho la ráfaga del tope y luego uno por tic',
    alFondo === 0 && rafaga.length >= 1 && rafaga.length <= TOPE_DE_AQUIS_DE_GOLPE && despues.length >= rafaga.length + 9 && seguidos,
    { alFondo, rafaga: rafaga.length, despues: despues.length },
  );

  /* ── La Acometida ajena, entera; la propia, en el instante de su anuncio ── */
  const tiradorX = yoX + 1100;
  const k2 = 1200;
  e.llega({ t: 'tic', k: k2, ev: [{ e: 'nace', id: 20, clase: 3, x: tiradorX, z: yoZ + 300, r: 0 }] });
  e.llega({ t: 'foto', k: k2, p: [[2, yoX, yoZ + 300, 64, 0, 0], [20, tiradorX, yoZ + 300, 192, 0, 0]] });
  e.llega({ t: 'foto', k: k2 + 2, p: [[2, yoX, yoZ + 300, 64, 0, 0], [20, tiradorX, yoZ + 300, 192, 0, 0]] });
  for (let i = 0; i < 12; i++) fotograma(16);
  const msCanal = Math.floor(relojes.t - origen);
  e.llega({ t: 'tic', k: k2 + 10, ev: [{ e: 'anuncio', id: 77, de: 2, a: 20, acc: ACC.replica, t: msCanal + 650, x: yoX, z: yoZ + 300 }] });
  for (let i = 0; i < 40; i++) fotograma(16);
  const alLlegar = partida.pintadoDe(2);
  const tirador = partida.pintadoDe(20);
  const queda = alLlegar === null || tirador === null ? Number.NaN : Math.hypot(alLlegar.x - tirador.x, alLlegar.z - tirador.z);
  const vuela = alLlegar?.gesto === 'avance';
  /* La misma Réplica, con su anuncio corto (tras un quiebro cuerpo a cuerpo), no vuela. */
  for (let i = 0; i < 80; i++) fotograma(16);
  const msCanal2 = Math.floor(relojes.t - origen);
  e.llega({ t: 'foto', k: k2 + 200, p: [[2, yoX, yoZ + 300, 64, 0, 0], [20, tiradorX, yoZ + 300, 192, 0, 0]] });
  e.llega({ t: 'foto', k: k2 + 202, p: [[2, yoX, yoZ + 300, 64, 0, 0], [20, tiradorX, yoZ + 300, 192, 0, 0]] });
  for (let i = 0; i < 70; i++) fotograma(16);
  e.llega({ t: 'tic', k: k2 + 230, ev: [{ e: 'anuncio', id: 78, de: 2, a: 20, acc: ACC.replica, t: Math.floor(relojes.t - origen) + 150, x: yoX, z: yoZ + 300 }] });
  for (let i = 0; i < 12; i++) fotograma(16);
  const corta = partida.pintadoDe(2);
  const quedaCorta = corta === null || tirador === null ? Number.NaN : Math.hypot(corta.x - tiradorX / 100, corta.z - (yoZ + 300) / 100);
  void msCanal2;
  comprobar(
    'la Acometida de un compañero se pinta ENTERA: su guion vuela hasta el tirador (y no sólo el avance de la Réplica) y llega al impacto',
    vuela && queda < (REGLAS.acciones.find((a) => a.id === ACC.replica)?.alcance ?? 0) / UNO + 0.3,
    { queda, gesto: alLlegar?.gesto },
  );
  const avanceDeLaReplica = (REGLAS.acciones.find((a) => a.id === ACC.replica)?.avance ?? 0) / UNO;
  comprobar(
    'la misma Réplica con su anuncio corto (tras un quiebro cuerpo a cuerpo) no vuela: avanza lo suyo y no más',
    quedaCorta > 11 - avanceDeLaReplica - 0.3 && corta?.gesto !== 'avance',
    { quedaCorta, avanceDeLaReplica, gesto: corta?.gesto },
  );
  /* La mía: la limpia contra la bala y el anuncio de mi Réplica en el mismo lote, el anuncio DELANTE. */
  for (let i = 0; i < 80; i++) fotograma(16);
  const impactoMio = Math.floor(relojes.t - origen) + 700;
  /* Un Celador a 3 m al norte, en el cono de la cámara: el blanco que GOLPE buscaría a media Acometida. */
  e.llega({ t: 'tic', k: k2 + 298, ev: [{ e: 'nace', id: 21, clase: 1, x: yoX, z: yoZ - 300, r: 128 }] });
  e.llega({ t: 'tic', k: k2 + 300, ev: [{ e: 'bala', id: 90, de: 20, p: 1, x: tiradorX, z: yoZ, r: 192, t: Math.floor(relojes.t - origen) - 100 }] });
  e.llega({
    t: 'tic',
    k: k2 + 302,
    ev: [
      { e: 'anuncio', id: 91, de: 1, a: 20, acc: ACC.replica, t: impactoMio, x: yoX, z: yoZ },
      { e: 'impacta', bala: 90, a: 1, r: RESULTADO.limpia, dano: 0, vida: 100 },
      { e: 'estado', a: 1, est: EST.remanso, tics: 20, into: 20 },
    ],
  });
  fotograma(16);
  const mio = partida.pintadoDe(1);
  comprobar(
    'mi Acometida vuela con el instante del anuncio de mi Réplica aunque llegue DELANTE de la limpia en el mismo lote',
    mio?.gesto === 'avance' && mio.impactoMs === impactoMio + origen,
    { gesto: mio?.gesto, impacto: mio?.impactoMs, esperado: impactoMio + origen },
  );
  /*
   * GOLPE A MEDIA ACOMETIDA. En el vuelo el estado es el Remanso, que no bloquea, y quien aprendió «limpio
   * y luego GOLPE» pulsa. La sala lo tira (a media anuncio sólo vale encadenar); el aparato lo atendía, y
   * cambiaba el vuelo por el avance de una Réplica que nunca salió, hacia el Celador de al lado: la
   * Acometida acababa lejos del tirador.
   */
  const tiradorQuieto = { x: tiradorX / 100, z: (yoZ + 300) / 100 };
  const aDe = (c: { x: number; z: number } | null): number => (c === null ? Number.NaN : Math.hypot(c.x - tiradorQuieto.x, c.z - tiradorQuieto.z));
  const alQuebrar = aDe(partida.pintadoDe(1));
  const leidosAntesDelGolpe = e.leidos().length;
  const atendidasAntes = partida.pulsacionesAtendidas.length;
  for (let i = 0; i < 7; i++) fotograma(16);
  mandos.pulsar('golpe', relojes.t);
  /* Del tirador, fotograma a fotograma: volando hacia él, la distancia no crece nunca. */
  let seAleja = 0;
  let antesDelFotograma = aDe(partida.pintadoDe(1));
  let gestoTrasPulsar: string | undefined;
  for (let i = 0; i < 43; i++) {
    fotograma(16);
    if (i === 2) gestoTrasPulsar = partida.pintadoDe(1)?.gesto;
    const ahora = aDe(partida.pintadoDe(1));
    seAleja = Math.max(seAleja, ahora - antesDelFotograma);
    antesDelFotograma = ahora;
  }
  const alAcabarDeVolar = aDe(partida.pintadoDe(1));
  const golpesMandados = e.leidos().slice(leidosAntesDelGolpe).filter((m): m is Aqui => m.t === 'aqui' && m.a !== 0);
  const alcanceDeLaReplica = (REGLAS.acciones.find((a) => a.id === ACC.replica)?.alcance ?? 0) / UNO;
  nota(`Acometida con GOLPE a los 128 ms, en el Remanso: de ${alQuebrar.toFixed(1)} m a ${alAcabarDeVolar.toFixed(1)} m del tirador, alejándose como mucho ${seAleja.toFixed(2)} m en un fotograma (alcance de la Réplica ${alcanceDeLaReplica.toFixed(1)} m)`);
  comprobar(
    'GOLPE a media Acometida no se manda, no cambia el gesto y no corta el vuelo: se llega al tirador sin desviarse, igual que sin tocar nada',
    golpesMandados.length === 0 && partida.pulsacionesAtendidas.length === atendidasAntes && gestoTrasPulsar === 'avance' && alQuebrar > 8 && seAleja < 0.05 && alAcabarDeVolar < alcanceDeLaReplica + 0.5,
    { golpesMandados: golpesMandados.map((m) => m.a), gestoTrasPulsar, alQuebrar, seAleja, alAcabarDeVolar },
  );
  /* Pasado el impacto sí: la pulsación vuelve a ser de la sala. */
  for (let i = 0; i < 20; i++) fotograma(16);
  mandos.pulsar('golpe', relojes.t);
  fotograma(60);
  const trasElImpacto = e.leidos().slice(leidosAntesDelGolpe).filter((m): m is Aqui => m.t === 'aqui' && m.a !== 0);
  comprobar('pasado el impacto de la Acometida, GOLPE vuelve a mandarse', trasElImpacto.length === 1, trasElImpacto.map((m) => m.a));
  partida.cerrar();

  /* ── Soltar los mandos al irse al fondo (`mandos/fondo.ts`) y lo que manda la app ── */
  const m = new EstadoDeLosMandos();
  m.pulsar('golpe', 1);
  m.ponerPalanca(0, 1, 2);
  m.soltarTodo();
  comprobar('soltarlo todo tira también las pulsaciones sin atender (un GOLPE de antes de irse no sale al volver)', m.tomarPulsaciones().length === 0 && m.fuerza === 0);
  /*
   * EL PUENTE DE LA APP, LEÍDO Y NO IMPORTADO: `verify:fronteras` no deja que `escritorio/` importe de
   * `app/` (la primera versión lo importaba, y la batería entera salía roja por ello). De su fuente se
   * sacan el nombre del evento y la plantilla del guion que la app inyecta, y la plantilla se evalúa TAL
   * CUAL con esos dos nombres: lo que se prueba es lo que la app manda.
   */
  const puenteDeLaApp = readFileSync(new URL('../../app/src/arcade/quiebro-puente.ts', import.meta.url), 'utf8');
  const EVENTO_DEL_FONDO_DE_LA_APP = /export const EVENTO_DEL_FONDO = '([^'\n]+)';/.exec(puenteDeLaApp)?.[1] ?? '';
  const plantillaDelFondo = /export function guionDelFondo\(alFondo: boolean\): string \{\s*return (`[^`]*`);\s*\}/.exec(puenteDeLaApp)?.[1] ?? null;
  const guionDelFondo = (alFondo: boolean): string =>
    plantillaDelFondo === null ? '' : String(new Function('EVENTO_DEL_FONDO', 'alFondo', `return ${plantillaDelFondo};`)(EVENTO_DEL_FONDO_DE_LA_APP, alFondo));
  comprobar('se lee el puente de la app: el nombre del evento y la plantilla de su guion', EVENTO_DEL_FONDO_DE_LA_APP.length > 0 && plantillaDelFondo !== null);
  const ventana = new EventTarget() as EventTarget & Record<string, unknown>;
  const documento = new EventTarget() as EventTarget & { visibilityState: string; pointerLockElement: unknown; exitPointerLock: () => void };
  documento.visibilityState = 'visible';
  documento.pointerLockElement = null;
  documento.exitPointerLock = () => undefined;
  const g = globalThis as unknown as Record<string, unknown>;
  const antesW = g.window;
  const antesD = g.document;
  g.window = ventana;
  g.document = documento;
  try {
    const avisos: boolean[] = [];
    const dejar = escucharElFondo((f) => avisos.push(f));
    documento.visibilityState = 'hidden';
    documento.dispatchEvent(new Event('visibilitychange'));
    documento.visibilityState = 'visible';
    documento.dispatchEvent(new Event('visibilitychange'));
    ventana.dispatchEvent(new Event('pagehide'));
    ventana.dispatchEvent(new Event('pageshow'));
    /* Lo que mete la app con `injectJavaScript`, tal cual. */
    new Function(guionDelFondo(true))();
    new Function(guionDelFondo(false))();
    dejar();
    comprobar(
      'el fondo se entera de la pestaña oculta, de la página que se va y de la app al fondo (con el guion que inyecta la app, y el mismo nombre de evento)',
      avisos.join() === 'true,false,true,false,true,false' && EVENTO_DEL_FONDO === EVENTO_DEL_FONDO_DE_LA_APP,
      avisos,
    );
    /* La app se va al fondo sin nadie escuchando (la partida se rehace entre medias) y una escucha nueva empieza. */
    new Function(guionDelFondo(true))();
    const avisosDeLaNueva: boolean[] = [];
    const dejarLaNueva = escucharElFondo((f) => avisosDeLaNueva.push(f));
    new Function(guionDelFondo(false))();
    dejarLaNueva();
    comprobar(
      'una escucha que empieza con la app ya al fondo (la partida rehecha en segundo plano) nace al fondo, y vuelve con el aviso de la app',
      avisosDeLaNueva.join() === 'true,false',
      avisosDeLaNueva,
    );
    const mt = new EstadoDeLosMandos();
    const superficie = new EventTarget() as EventTarget & HTMLElement;
    const soltarTeclado = engancharElTeclado(mt, { superficie, activo: () => true });
    const tecla = new Event('keydown') as Event & { code: string; repeat: boolean; ctrlKey: boolean; metaKey: boolean; altKey: boolean };
    Object.assign(tecla, { code: 'KeyW', repeat: false, ctrlKey: false, metaKey: false, altKey: false });
    ventana.dispatchEvent(tecla);
    const conLaW = mt.fuerza;
    ventana.dispatchEvent(new CustomEvent(EVENTO_DEL_FONDO, { detail: true }));
    const trasElFondo = mt.fuerza;
    soltarTeclado();
    comprobar('con la W pisada, la app al fondo suelta el teclado (la palanca a cero)', conLaW > 0 && trasElFondo === 0, { conLaW, trasElFondo });
  } finally {
    g.window = antesW;
    g.document = antesD;
  }
  const leerFuente = (ruta: string): string => sinComentariosDe(readFileSync(new URL(ruta, import.meta.url), 'utf8'));
  const tactil = leerFuente('../src/quiebro/mandos/Tactil.tsx');
  comprobar(
    'los mandos táctiles sueltan los dedos al perder el foco y al irse al fondo (no sólo el teclado)',
    /addEventListener\('blur'/.test(tactil) && /escucharElFondo\(/.test(tactil) && /mandos\.soltarTodo\(\)/.test(tactil) && /d\.palanca = null/.test(tactil),
  );
  const documentoDeLaApp = leerFuente('../../app/src/arcade/quiebro-documento.tsx');
  comprobar('el WebView de la app avisa al documento al pasar a segundo plano y al volver (`AppState` → `guionDelFondo`)', /AppState\.addEventListener\('change'/.test(documentoDeLaApp) && /injectJavaScript\(guionDelFondo\(/.test(documentoDeLaApp));
  const juego = leerFuente('../src/quiebro/Quiebro.tsx');
  comprobar('el juego escucha el fondo, suelta los mandos y calla la partida', /escucharElFondo\(/.test(juego) && /partida\?\.callar\(fondo\)/.test(juego) && /mandos\.soltarTodo\(\)/.test(juego));

  /* ── Otra pestaña se sienta en la mesa con su código ── */
  const pedidas: { ruta: string; init: RequestInit | undefined }[] = [];
  const buscar = async (ruta: string, init?: RequestInit): Promise<Response> => {
    pedidas.push({ ruta, init });
    if (init?.method === 'POST') return new Response(JSON.stringify({ asiento: 'a2', llave: 'otra-llave', mesa: { codigo: 'QUIEB', rev: 7, yo: 'a2', vista: {}, opciones: [] } }), { status: 200 });
    return new Promise<Response>((_, rechazar) => init?.signal?.addEventListener('abort', () => rechazar(new Error('cortado'))));
  };
  const segunda = await PuertoDePrueba.entrar(buscar, 'QUIEB', 'Prueba');
  const cuerpoDeEntrar = JSON.parse(String(pedidas[0]?.init?.body ?? '{}')) as { arcade?: string };
  comprobar(
    'con `&codigo=` el puerto de prueba se SIENTA en esa mesa (POST …/:codigo/asientos, del arcade quiebro) y no abre otra; la llave, en memoria y nunca en una dirección',
    pedidas[0]?.ruta === '/api/arcade/mesas/QUIEB/asientos' && cuerpoDeEntrar.arcade === 'quiebro' && segunda.yo === 'a2' && segunda.llave === 'otra-llave' && pedidas.every((q) => !q.ruta.includes('otra-llave')),
    pedidas.map((q) => q.ruta),
  );
  segunda.cerrar();
  const doc = leerFuente('../src/quiebro/documento.tsx');
  comprobar(
    'el documento de prueba pasa a la reunión la dirección con el código de ESTA mesa (sin llave), y «Otra mesa» abre una nueva',
    /enlaceParaEntrar=\{enlaceParaEntrar\(puerto\.codigo\)\}/.test(doc) && /\?prueba=1&codigo=\$\{encodeURIComponent\(codigo\)\}/.test(doc) && /ponerALaMesa\(null\)/.test(doc),
  );

  /* ── La app vuelve a vertical al salir de la noche (Android gira con el sensor desde `orientation: default`) ── */
  const escena = leerFuente('../../app/src/arcade/quiebro-en-tres-escena.tsx');
  comprobar(
    'al salir de la noche la app se bloquea en VERTICAL si no había otro bloqueo, nunca `unlockAsync` a ciegas',
    !/unlockAsync\(/.test(escena) && /OrientationLock\.PORTRAIT_UP/.test(escena) && /lockAsync\(bloqueoAlSalir\(/.test(escena),
  );
})();

/* ─────────────────────────────── 11. Los fuentes ─────────────────────────────── */

paso('11. Los fuentes del frente');
{
  const raiz = new URL('../src/quiebro/', import.meta.url);
  const ficheros: string[] = ['Quiebro.tsx', 'documento.tsx'];
  for (const carpeta of ['red', 'mandos', 'camara', 'hud', 'provisional']) {
    for (const f of readdirSync(new URL(`${carpeta}/`, raiz))) ficheros.push(`${carpeta}/${f}`);
  }
  const fuentes = ficheros.map((f) => [f, readFileSync(new URL(f, raiz), 'utf8')] as const);
  const html = readFileSync(new URL('../quiebro.html', import.meta.url), 'utf8');
  const este = readFileSync(new URL(import.meta.url), 'utf8');
  comprobar('se miran todos los fuentes del frente (y no cero)', fuentes.length >= 20, fuentes.length);
  const sinComentarios = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const conClick = fuentes.filter(([f, s]) => f.endsWith('.tsx') && /\bonClick\b/.test(sinComentarios(s))).map(([f]) => f);
  comprobar('ni un `onClick` en los .tsx del juego: todo actúa en `pointerdown`', conClick.length === 0, conClick);
  const llaveGuardada = fuentes.filter(([, s]) => /setItem\([^)]*llave|localStorage[^;\n]*llave|[?&]llave=/i.test(sinComentarios(s))).map(([f]) => f);
  comprobar('la llave del asiento no se guarda en el almacén ni viaja en una dirección', llaveGuardada.length === 0, llaveGuardada);
  const conCr = [...fuentes, ['quiebro.html', html] as const, ['verificar-quiebro-juego.ts', este] as const].filter(([, s]) => s.includes('\r')).map(([f]) => f);
  comprobar('fin de línea LF en todo el frente', conCr.length === 0, conCr);
  /* Las formas de `MARCAS_VETADAS` del diseño (§1): la palabra suelta no, que tumbaría `updateMatrix`. */
  const marcas = /the matrix|matrix (reloaded|revolutions|resurrections)|agente? smith|\bmorpheus\b|\btrinity\b|nabucodonosor|bullet[- ]?time/i;
  const conMarca = fuentes.filter(([, s]) => marcas.test(s)).map(([f]) => f);
  comprobar('nada de la marca ajena en ningún texto del cliente', conMarca.length === 0, conMarca);
  comprobar(
    'el documento suelto carga `documento.tsx`, es de teléfono (sin zoom) y no lleva ninguna llave',
    html.includes('/src/quiebro/documento.tsx') && /user-scalable=no/.test(html) && !/llave=/.test(html),
  );
}

/* ─────────────────────────────── 12. El mapa de la ciudad abierta ─────────────────────────────── */

/*
 * El minimapa, el plano y el rumbo (docs/quiebro/CIUDAD-ABIERTA.md §5.9), sobre la ciudad de verdad si
 * `ciudadDeLaMesa` ya existe y siempre sobre la de ensayo (`hud/ciudad-de-ensayo.ts`), que tiene la forma
 * de la columna. Lo que se pinta se mira con un pincel que rasteriza rectángulos: el mapa sólo usa
 * `fillRect`, así que la rejilla ve lo que verá el lienzo.
 */
paso('12. El mapa de la ciudad abierta: minimapa, plano y rumbo');
{
  const L = LADO_DEL_LIENZO;
  const B = BORDE_DE_LA_CIUDAD;

  /** Un pincel que rasteriza rectángulos por el centro del píxel, como el lienzo sin suavizado. */
  class RejillaDelMapa implements PincelDelMapa {
    fillStyle: unknown = '';
    readonly pixeles = new Uint16Array(L * L);
    readonly colores: string[] = ['(sin pintar)'];
    private readonly indices = new Map<string, number>();
    rectangulos = 0;
    fillRect(x: number, y: number, ancho: number, alto: number): void {
      const color = String(this.fillStyle);
      let c = this.indices.get(color);
      if (c === undefined) {
        c = this.colores.length;
        this.colores.push(color);
        this.indices.set(color, c);
      }
      const x0 = Math.max(0, Math.ceil(x - 0.5));
      const x1 = Math.min(L, Math.ceil(x + ancho - 0.5));
      const y0 = Math.max(0, Math.ceil(y - 0.5));
      const y1 = Math.min(L, Math.ceil(y + alto - 0.5));
      for (let py = y0; py < y1; py++) for (let px = x0; px < x1; px++) this.pixeles[py * L + px] = c;
      this.rectangulos++;
    }
    clase(px: number, py: number): string {
      return this.colores[this.pixeles[py * L + px] as number] as string;
    }
    /** La clase del píxel donde cae el punto del mundo `(x, z)`. */
    en(x: number, z: number): string {
      return this.clase(Math.min(L - 1, Math.max(0, Math.floor(x + B))), Math.min(L - 1, Math.max(0, Math.floor(z + B))));
    }
  }
  const DISTRITOS_DEL_MAPA = ['casco', 'ensanche', 'lonja', 'naves', 'torres'] as const;
  const porDistrito = (p: string): Record<(typeof DISTRITOS_DEL_MAPA)[number], string> =>
    ({ casco: `${p}:casco`, ensanche: `${p}:ensanche`, lonja: `${p}:lonja`, naves: `${p}:naves`, torres: `${p}:torres` });
  /* Una paleta de palabras: cada píxel dice QUÉ es, no de qué color. */
  const PALABRAS: ColoresDelMapa = {
    vacio: 'vacio',
    calle: 'calle',
    avenida: 'avenida',
    mediana: 'mediana',
    plaza: 'plaza',
    soportal: 'soportal',
    coche: 'coche',
    estorbo: 'estorbo',
    corte: 'corte',
    corteClaro: 'corte',
    salida: 'salida',
    filo: porDistrito('filo'),
    tejado: porDistrito('tejado'),
  };
  const SE_ANDA = new Set(['calle', 'avenida', 'mediana', 'plaza', 'soportal']);

  const ensayo = nocheDeEnsayo();
  /*
   * La ciudad de verdad, si ya se escribe. Sin escribir (`CiudadSinEscribir`, por el nombre y no con
   * `instanceof`: `tsx` puede cargar `shared/` dos veces) no se mira; escrita pero sin poderse derivar es
   * un ROJO con su porqué, y no un guion reventado: sin ciudad no hay mapa que valga.
   */
  let deVerdad: NocheDeLaCiudad | null = null;
  let sinDerivar: string | null = null;
  try {
    const c = ciudadDeLaMesa(0, 'K7M2P');
    const trio = triosDeFallos(c, 1)[0];
    deVerdad = ciudadDeLaNoche(c, 'K7M2P', 1, trio === undefined ? [1] : [1, trio[0], trio[1]]);
  } catch (e) {
    if (!(e instanceof Error) || e.name !== 'CiudadSinEscribir') sinDerivar = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }
  if (sinDerivar !== null) comprobar('la ciudad de verdad (traza 0, noche 1) se deriva para pintarla', false, sinDerivar);
  nota(
    deVerdad !== null
      ? 'la ciudad de verdad ya existe: se mira además de la de ensayo'
      : sinDerivar !== null
        ? 'la ciudad de verdad existe pero no se deriva: se mira la de ensayo'
        : '`ciudadDeLaMesa` aún lanza CiudadSinEscribir (frente Traza): se mira la ciudad de ensayo',
  );

  /** Todo lo que depende de la ciudad: 7 comprobaciones por ciudad. */
  const mirar = (noche: NocheDeLaCiudad, nombre: string): void => {
    /* 1. Lo pintado que estorba coincide píxel a píxel con las cajas que se pintan. */
    const rejilla = new RejillaDelMapa();
    const rectangulos = pintarLaCiudad(rejilla, noche, PALABRAS);
    const ocupado = new Uint8Array(L * L);
    for (const c of noche.cajas) {
      if (!seEnsenaEnElMapa(c.tipo)) continue;
      const x0 = Math.max(0, Math.ceil(c.x0 + B - 0.5));
      const x1 = Math.min(L, Math.ceil(c.x1 + B - 0.5));
      const y0 = Math.max(0, Math.ceil(c.z0 + B - 0.5));
      const y1 = Math.min(L, Math.ceil(c.z1 + B - 0.5));
      for (let py = y0; py < y1; py++) for (let px = x0; px < x1; px++) ocupado[py * L + px] = 1;
    }
    let calleEnPared = 0;
    let paredEnCalle = 0;
    let sinPintar = 0;
    let paredes = 0;
    let ejemplo: unknown = null;
    for (let py = 0; py < L; py++) {
      for (let px = 0; px < L; px++) {
        const clase = rejilla.clase(px, py);
        const pared = ocupado[py * L + px] === 1;
        if (clase === '(sin pintar)') sinPintar++;
        else if (SE_ANDA.has(clase) && pared) {
          calleEnPared++;
          ejemplo ??= { px, py, clase, mundo: [px - B + 0.5, py - B + 0.5] };
        } else if (!SE_ANDA.has(clase) && !pared) {
          paredEnCalle++;
          ejemplo ??= { px, py, clase, mundo: [px - B + 0.5, py - B + 0.5] };
        }
        if (pared) paredes++;
      }
    }
    comprobar(
      `${nombre}: en el mapa no hay calle pintada donde hay una pared ni pared donde se anda, píxel a píxel (y no es un mapa vacío)`,
      calleEnPared === 0 && paredEnCalle === 0 && sinPintar === 0 && paredes > L * L * 0.15,
      { calleEnPared, paredEnCalle, sinPintar, paredes, ejemplo },
    );

    /* 2. Cada edificio con el tejado de su distrito; cada plaza, cada avenida y cada corte, en su tono. */
    const malos: unknown[] = [];
    for (const e of noche.ciudad.edificios) {
      const c = noche.ciudad.cajas[e.caja];
      if (c === undefined || c.x1 - c.x0 <= 2 || c.z1 - c.z0 <= 2) continue;
      const hay = rejilla.en((c.x0 + c.x1) / 2, (c.z0 + c.z1) / 2);
      if (hay !== `tejado:${e.distrito}`) malos.push({ edificio: e.indice, distrito: e.distrito, hay });
    }
    for (const h of noche.ciudad.huecos) {
      if (h.uso !== 'plaza') continue;
      let visto = false;
      for (let z = Math.ceil(h.solar.z0 + B) + 0.5; z < h.solar.z1 + B && !visto; z += 1) {
        for (let x = Math.ceil(h.solar.x0 + B) + 0.5; x < h.solar.x1 + B && !visto; x += 1) {
          if (ocupado[Math.floor(z) * L + Math.floor(x)] === 1) continue;
          if (rejilla.clase(Math.floor(x), Math.floor(z)) !== 'plaza') malos.push({ plaza: h.plaza, hay: rejilla.clase(Math.floor(x), Math.floor(z)) });
          visto = true;
        }
      }
    }
    for (const a of noche.ciudad.avenidas) {
      const m = (a.desde + a.hasta) / 2 + 3;
      const hay = a.eje === 'x' ? rejilla.en(m, a.linea) : rejilla.en(a.linea, m);
      const lado = a.eje === 'x' ? rejilla.en(m, a.linea + a.ancho / 2 - 2) : rejilla.en(a.linea + a.ancho / 2 - 2, m);
      if (hay !== 'mediana' && hay !== 'estorbo' && hay !== 'coche') malos.push({ avenida: a.id, hay });
      if (lado !== 'avenida' && lado !== 'estorbo' && lado !== 'coche') malos.push({ avenida: a.id, lado });
    }
    for (const corte of noche.cortes) {
      const c = noche.cajas[corte.caja];
      if (c !== undefined && rejilla.en((c.x0 + c.x1) / 2, (c.z0 + c.z1) / 2) !== 'corte') malos.push({ corte: corte.tramo });
    }
    comprobar(`${nombre}: cada edificio lleva el tejado de su distrito, y las plazas, las avenidas y los cortes de obra se ven en su tono`, malos.length === 0 && noche.ciudad.edificios.length > 50, malos.slice(0, 6));
    comprobar(`${nombre}: la ciudad entera se pinta con un número acotado de rectángulos (${String(rectangulos)})`, rectangulos === rejilla.rectangulos && rectangulos > 100 && rectangulos <= 4000, rectangulos);

    /* 3. Los metros del mapa son los de la sala: de plaza a plaza (de nudo a nudo, que es como se mide la tabla), los de la tabla de la ciudad. */
    const base = noche.ciudad.grafo;
    const plazas = noche.ciudad.plazas;
    const camposBase = new CamposPorMeta();
    const hilo = hiloNuevo();
    const distintos: unknown[] = [];
    for (const a of plazas) {
      for (const b of plazas) {
        const campo = camposBase.campo(base, b.nudo);
        const desde = base.nudos[a.nudo] ?? a.centro;
        const metros = metrosPorCalles(base, campo, desde.x, desde.z);
        tenderElHilo(base, { campo }, desde.x, desde.z, hilo);
        const tabla = metrosQueSeEnsenan(noche.ciudad.distancias[a.numero - 1]?.[b.numero - 1] ?? Number.NaN);
        if (metros !== tabla || hilo.metros !== tabla) distintos.push({ de: a.numero, a: b.numero, metros, hilo: hilo.metros, tabla });
      }
    }
    comprobar(`${nombre}: de plaza a plaza, los metros por calles del mapa y del hilo son los de la tabla de distancias de la ciudad`, distintos.length === 0 && plazas.length === 6, distintos.slice(0, 5));

    /* 3 bis. Y son los que ANDA LA SALA: su Dijkstra (`cerebro.ts`), preguntado como ella lo pregunta, sobre el grafo de la noche en Q16.16. */
    const conLaCiudad = {
      ...LIZA,
      mundo: { ...LIZA.mundo, grafo: { nudos: noche.grafo.nudos.map((q) => ({ x: q.x * UNO, z: q.z * UNO })), aristas: noche.grafo.aristas.map((e) => [e.a, e.b] as const) } },
    } as LizaDeclarada;
    const todos = noche.grafo.nudos.map((_, i) => i);
    const camposDeLaNoche = new CamposPorMeta();
    const contraLaSala: unknown[] = [];
    let leidos = 0;
    const unaCabina = noche.ciudad.cabinas[7];
    const metasDeLaSala = [plazas[0]?.nudo ?? 0, plazas[3]?.nudo ?? 1, unaCabina === undefined ? (plazas[5]?.nudo ?? 2) : nudoDelObjetivo(noche, { tipo: 'zona', zona: unaCabina.zona })];
    for (const metaDeLaSala of metasDeLaSala) {
      const sala = faltaPorElGrafoParaProbar(conLaCiudad, metaDeLaSala, todos);
      const campo = camposDeLaNoche.campo(noche.grafo, metaDeLaSala);
      for (const v of todos) {
        const q = noche.grafo.nudos[v] as { x: number; z: number };
        const s = sala[v] as number;
        const enLaSala = s < 0 ? -1 : metrosQueSeEnsenan(s / UNO);
        const enElMapa = metrosPorCalles(noche.grafo, campo, q.x, q.z);
        leidos++;
        if (enLaSala !== enElMapa && contraLaSala.length < 5) contraLaSala.push({ meta: metaDeLaSala, nudo: v, enLaSala, enElMapa });
      }
    }
    comprobar(
      `${nombre}: en cada nudo, los metros que enseña el HUD son los que anda la sala hasta la misma meta (su Dijkstra, con los cortes de la noche)`,
      contraLaSala.length === 0 && leidos >= 3 * 1900,
      { contraLaSala, leidos },
    );

    /* 4. El rumbo a cada objetivo, con los nudos de la noche; lo que no existe no tiende nada. */
    const campos = new CamposPorMeta();
    const objetivosMalos: unknown[] = [];
    for (const p of plazas) if (nudoDelObjetivo(noche, { tipo: 'fallo', plaza: p.numero }) !== p.nudo) objetivosMalos.push({ plaza: p.numero });
    for (const c of noche.ciudad.cabinas) {
      const n = nudoDelObjetivo(noche, { tipo: 'zona', zona: c.zona });
      const q = noche.grafo.nudos[n];
      if (q === undefined || Math.hypot(q.x - c.sitio.x, q.z - c.sitio.z) > 12) objetivosMalos.push({ cabina: c.indice, n });
    }
    for (const r of noche.ciudad.refugios) if (nudoDelObjetivo(noche, { tipo: 'zona', zona: r.zona }) < 0) objetivosMalos.push({ refugio: r.indice });
    const invalidos = [
      nudoDelObjetivo(noche, { tipo: 'fallo', plaza: 9 }),
      nudoDelObjetivo(noche, { tipo: 'zona', zona: 250 }),
      nudoDelObjetivo(noche, { tipo: 'nudo', nudo: -1 }),
      nudoDelObjetivo(noche, { tipo: 'nudo', nudo: noche.grafo.nudos.length }),
    ];
    const alFallo = rumboHacia(noche, { tipo: 'fallo', plaza: plazas[2]?.numero ?? 3 }, 1, campos);
    comprobar(
      `${nombre}: el rumbo sale del nudo de la plaza de un Fallo y del más cercano a una cabina o un refugio, con el campo del grafo de la noche; lo que la noche no tiene no tiende nada`,
      objetivosMalos.length === 0 &&
        noche.ciudad.cabinas.length > 0 &&
        noche.ciudad.refugios.length > 0 &&
        invalidos.every((n) => n === -1) &&
        rumboHacia(noche, { tipo: 'fallo', plaza: 9 }, 1, campos) === null &&
        alFallo !== null &&
        alFallo.campo === campos.campo(noche.grafo, alFallo.nudo) &&
        alFallo.campo.metros[alFallo.nudo] === 0,
      { objetivosMalos: objetivosMalos.slice(0, 4), invalidos, cabinas: noche.ciudad.cabinas.length, refugios: noche.ciudad.refugios.length },
    );

    /* 5. El hilo, andando de la Bajada a un Fallo: tope, sitio, paso y quieto en el suelo. */
    const meta = plazas[noche.fallos[2] !== undefined ? noche.fallos[2] - 1 : 5] as (typeof plazas)[number];
    const rumbo = rumboHacia(noche, { tipo: 'fallo', plaza: meta.numero }, 1, campos) as RumboTendido;
    const x = { x: (plazas[0] as (typeof plazas)[number]).centro.x + 0.6, z: (plazas[0] as (typeof plazas)[number]).centro.z + 0.4 };
    const antes: { x: number; z: number; g: number }[] = [];
    let pasos = 0;
    let glifos = 0;
    let llegaAlFinal = false;
    const faltas: unknown[] = [];
    for (; pasos < 1500; pasos++) {
      tenderElHilo(noche.grafo, rumbo, x.x, x.z, hilo);
      if (hilo.cuantos * TRIANGULOS_POR_GLIFO > TRIANGULOS_DEL_HILO) faltas.push({ pasos, tope: hilo.cuantos });
      /* Lo andado por la ruta hasta cada glifo, y que el glifo esté en ella. */
      const aLoLargo = (gx: number, gz: number): number => {
        let andado = 0;
        for (let i = 0; i + 1 < hilo.puntos; i++) {
          const ax = hilo.ruta[i * 2] as number;
          const az = hilo.ruta[i * 2 + 1] as number;
          const bx = hilo.ruta[i * 2 + 2] as number;
          const bz = hilo.ruta[i * 2 + 3] as number;
          const largo = Math.abs(bx - ax) + Math.abs(bz - az);
          const enX = Math.min(ax, bx) - 1e-6 <= gx && gx <= Math.max(ax, bx) + 1e-6;
          const enZ = Math.min(az, bz) - 1e-6 <= gz && gz <= Math.max(az, bz) + 1e-6;
          if (enX && enZ && (Math.abs(ax - bx) < 1e-9 ? Math.abs(gx - ax) < 1e-6 : Math.abs(gz - az) < 1e-6)) return andado + Math.abs(gx - ax) + Math.abs(gz - az);
          andado += largo;
        }
        return Number.NaN;
      };
      const ahora: { x: number; z: number; g: number }[] = [];
      let previo = Number.NaN;
      for (let k = 0; k < hilo.cuantos; k++) {
        const o = k * NUMEROS_POR_GLIFO;
        const g = { x: hilo.glifos[o] as number, z: hilo.glifos[o + 1] as number, g: hilo.glifos[o + 3] as number };
        const s = aLoLargo(g.x, g.z);
        if (!(s >= INICIO_DEL_HILO - 1e-4 && s <= METROS_DEL_HILO + 1e-4)) faltas.push({ pasos, k, fuera: s });
        if (k > 0 && Math.abs(s - previo - PASO_DEL_GLIFO) > 1e-3) faltas.push({ pasos, k, paso: s - previo });
        previo = s;
        ahora.push(g);
      }
      /* Quieto en el suelo: lo que ya estaba sigue en su sitio con su mismo glifo, y aparece uno como mucho. */
      let nuevos = 0;
      for (const g of ahora) {
        const ya = antes.find((a) => Math.abs(a.x - g.x) < 1e-3 && Math.abs(a.z - g.z) < 1e-3);
        if (ya === undefined) nuevos++;
        else if (ya.g !== g.g) faltas.push({ pasos, cambia: g });
      }
      if (pasos > 0 && nuevos > 1) faltas.push({ pasos, nuevos });
      antes.length = 0;
      antes.push(...ahora);
      glifos += hilo.cuantos;
      if (hilo.metros === 0 || hilo.puntos < 2) {
        llegaAlFinal = hilo.llega;
        break;
      }
      if (hilo.llega && hilo.cuantos > 0) {
        const o = (hilo.cuantos - 1) * NUMEROS_POR_GLIFO;
        const m = noche.grafo.nudos[meta.nudo] as { x: number; z: number };
        if (Math.abs((hilo.glifos[o] as number) - m.x) > 1e-6 || Math.abs((hilo.glifos[o + 1] as number) - m.z) > 1e-6) faltas.push({ pasos, ultimoNoEnLaMeta: [hilo.glifos[o], hilo.glifos[o + 1]] });
      }
      /* Medio metro por la ruta. */
      const tx = (hilo.ruta[2] as number) - x.x;
      const tz = (hilo.ruta[3] as number) - x.z;
      const l = Math.hypot(tx, tz);
      if (l <= 0.5) {
        x.x = hilo.ruta[2] as number;
        x.z = hilo.ruta[3] as number;
      } else {
        x.x += (tx / l) * 0.5;
        x.z += (tz / l) * 0.5;
      }
    }
    comprobar(
      `${nombre}: andando de la Bajada a un Fallo, el hilo cabe en sus ${String(TRIANGULOS_DEL_HILO)} triángulos, va por la ruta a ${String(INICIO_DEL_HILO)}-${String(METROS_DEL_HILO)} m por delante con un glifo cada ${String(PASO_DEL_GLIFO)} m, no se mueve del suelo y acaba en la meta`,
      faltas.length === 0 && pasos > 100 && glifos > 1000 && llegaAlFinal,
      { faltas: faltas.slice(0, 5), pasos, glifos, llegaAlFinal },
    );
  };

  mirar(ensayo, 'ensayo');
  if (deVerdad !== null) mirar(deVerdad, 'de verdad');

  /* 6. El lienzo de la noche se pinta UNA vez: por la identidad de la noche. */
  let lienzosHechos = 0;
  let rectangulosPintados = 0;
  const crear = (): LienzoDelMapa => {
    lienzosHechos++;
    const pincel: PincelDelMapa = {
      fillStyle: '',
      fillRect: () => {
        rectangulosPintados++;
      },
    };
    return { width: 0, height: 0, getContext: () => pincel };
  };
  const otra = nocheDeEnsayo(2);
  const primero = lienzoDeLaNoche(ensayo, crear);
  const pintados = rectangulosPintados;
  const segundo = lienzoDeLaNoche(ensayo, crear);
  lienzoDeLaNoche(ensayo, crear);
  lienzoDeLaNoche(otra, crear);
  comprobar(
    'el lienzo de la ciudad se pinta una sola vez por noche (y otra noche es otro lienzo)',
    primero !== null && primero === segundo && primero.width === L && lienzosHechos === 2 && pintados > 100 && rectangulosPintados > pintados,
    { lienzosHechos, pintados, rectangulosPintados },
  );

  /* 7. El minimapa: el lienzo girado y las marcas caen en el mismo sitio, con cualquier mirada. */
  const lado = LADO_DEL_MINIMAPA_PT;
  const k = lado / 2 / RADIO_DEL_MINIMAPA_M;
  let peor = 0;
  let probados = 0;
  for (const giro of [0, 0.7, Math.PI / 2, 2.5, -1.2, Math.PI, 5.9]) {
    for (const yo of [
      { x: 0, z: 0 },
      { x: -130.25, z: 77.5 },
      { x: 250, z: -260 },
    ]) {
      const m = transformacionDelMinimapa(yo, giro, lado, RADIO_DEL_MINIMAPA_M);
      for (let i = 0; i < 12; i++) {
        const p = { x: yo.x + 70 * Math.cos(i * 1.7), z: yo.z + 55 * Math.sin(i * 2.3) };
        const lienzo = alPlano(p.x, p.z);
        const a = aplicar(m, lienzo.u, lienzo.v);
        const s = sitioEnElMinimapa(p.x, p.z, yo, giro, lado, RADIO_DEL_MINIMAPA_M);
        const e = alMinimapa(p.x - yo.x, p.z - yo.z, giro);
        if (s.enElBorde) continue;
        peor = Math.max(peor, Math.hypot(a.u - s.u, a.v - s.v), Math.hypot(s.u - (lado / 2 + e.u * k), s.v - (lado / 2 + e.v * k)));
        probados++;
      }
    }
  }
  comprobar('el minimapa lleva la ciudad y las marcas con la MISMA cuenta en cualquier mirada (el lienzo girado y `alMinimapa` coinciden)', peor < 1e-9 && probados > 150, { peor, probados });

  const delante = sitioEnElMinimapa(0, -30, { x: 0, z: 0 }, 0, lado, RADIO_DEL_MINIMAPA_M);
  const alEste = sitioEnElMinimapa(30, 0, { x: 0, z: 0 }, Math.PI / 2, lado, RADIO_DEL_MINIMAPA_M);
  const alSur = sitioEnElMinimapa(0, 30, { x: 0, z: 0 }, Math.PI / 2, lado, RADIO_DEL_MINIMAPA_M);
  const lejos = sitioEnElMinimapa(0, -200, { x: 0, z: 0 }, 0, lado, RADIO_DEL_MINIMAPA_M);
  comprobar(
    'lo que se mira sale arriba (el norte mirando al norte, el este mirando al este), el sur mirando al este sale a la derecha, y un Fallo a 200 m va al canto en su dirección',
    casi(delante.u, lado / 2) && delante.v < lado / 2 - 20 && casi(alEste.u, lado / 2) && alEste.v < lado / 2 - 20 && alSur.u > lado / 2 + 20 && casi(alSur.v, lado / 2) &&
      lejos.enElBorde && casi(lejos.v, MARGEN_DEL_BORDE_PT) && casi(lejos.u, lado / 2) && casi(lejos.angulo, 0) && !delante.enElBorde,
    { delante, alEste, alSur, lejos },
  );

  let peorCss = 0;
  for (const [pintado, ahora] of [
    [0, 0.3],
    [1.2, 0.9],
    [-2, -2.4],
    [3, -3],
  ] as const) {
    for (let i = 0; i < 8; i++) {
      const p = { x: 40 * Math.cos(i), z: 30 * Math.sin(i * 1.3) };
      const s0 = sitioEnElMinimapa(p.x, p.z, { x: 0, z: 0 }, pintado, lado, RADIO_DEL_MINIMAPA_M);
      const s1 = sitioEnElMinimapa(p.x, p.z, { x: 0, z: 0 }, ahora, lado, RADIO_DEL_MINIMAPA_M);
      const g = giradoComoCss(s0.u - lado / 2, s0.v - lado / 2, giroQueFalta(pintado, ahora));
      peorCss = Math.max(peorCss, Math.hypot(g.u - (s1.u - lado / 2), g.v - (s1.v - lado / 2)));
    }
  }
  comprobar('entre dos refrescos, girar con CSS lo que falta deja cada cosa donde la pondría un refresco', peorCss < 1e-9, peorCss);

  /* 8. El plano, a toques: todo en `pointerdown`, y cada toque hace lo que dice el diseño. */
  const hechas: string[] = [];
  const ordenes: OrdenesDelMapa = {
    aqui: (n) => hechas.push(`aqui ${String(n)}`),
    tenderElRumbo: (o) => hechas.push(`rumbo ${JSON.stringify(o)}`),
    soltarElRumbo: () => hechas.push('soltar'),
  };
  const plaza3 = ensayo.ciudad.plazas[2] as (typeof ensayo.ciudad.plazas)[number];
  const cabina = ensayo.ciudad.cabinas[3] as (typeof ensayo.ciudad.cabinas)[number];
  const marca = (clase: MarcaDelMapa['clase'], x: number, z: number, quien: number): MarcaDelMapa => ({ clase, x, z, color: null, metros: -1, quien, rumbo: false });
  let marcas: MarcaDelMapa[] = [marca('fallo', plaza3.centro.x, plaza3.centro.z, plaza3.numero), marca('cabina', cabina.sitio.x, cabina.sitio.z, cabina.zona), marca('companero', 0, 10, 2)];
  let tendido: RumboTendido | null = null;
  const fuenteDelMapa: FuenteDelMapa = {
    noche: () => ensayo,
    yo: () => ({ x: 0, z: 6, mira: 0 }),
    giroDeLaCamara: () => 0,
    marcas: () => marcas,
    rumbo: () => tendido,
    vigia: () => false,
  };
  /* Un plano de 592 pt: un pt por metro, para que ida y vuelta del toque sean exactas y un empate sea un empate. */
  const ladoDelPlano = LIENZO_DEL_PLANO;
  const caja = { left: 100, top: 20, width: ladoDelPlano, height: ladoDelPlano };
  const toque = (x: number, z: number, dx = 0, dy = 0, raton = -1): { clientX: number; clientY: number; button: number; pointerType: string; parado: number; preventDefault(): void; stopPropagation(): void } => {
    const p = alPlanoEnPantalla(x, z, ladoDelPlano);
    return {
      clientX: caja.left + p.u + dx,
      clientY: caja.top + p.v + dy,
      button: raton < 0 ? 0 : raton,
      pointerType: raton < 0 ? 'touch' : 'mouse',
      parado: 0,
      preventDefault() {
        this.parado |= 1;
      },
      stopPropagation() {
        this.parado |= 2;
      },
    };
  };
  const t1 = toque(plaza3.centro.x, plaza3.centro.z, 8, -6);
  const r1 = tocarElPlano(t1, caja, fuenteDelMapa, ordenes);
  comprobar(
    'tocar a 10 pt de un Fallo tiende el rumbo a su plaza, y el toque no sigue hacia los mandos de debajo',
    r1 !== null && r1.tipo === 'rumbo' && hechas.at(-1) === `rumbo ${JSON.stringify({ tipo: 'fallo', plaza: plaza3.numero })}` && t1.parado === 3,
    { r1, hechas, parado: t1.parado },
  );
  tendido = rumboHacia(ensayo, { tipo: 'fallo', plaza: plaza3.numero }, 1, new CamposPorMeta());
  const r2 = tocarElPlano(toque(plaza3.centro.x, plaza3.centro.z, -4, 5), caja, fuenteDelMapa, ordenes);
  tendido = null;
  comprobar('tocar otra vez el Fallo del rumbo lo suelta', r2 !== null && r2.tipo === 'soltar' && hechas.at(-1) === 'soltar', { r2, hechas });

  const sitio = { x: 30.5, z: 101.25 };
  const r3 = tocarElPlano(toque(sitio.x, sitio.z), caja, fuenteDelMapa, ordenes);
  const esperado = nudoMasCercano(ensayo.grafo, sitio.x, sitio.z);
  const lejosDelFallo = tocarElPlano(toque(plaza3.centro.x, plaza3.centro.z, 30, 0), caja, fuenteDelMapa, ordenes);
  comprobar(
    'tocar un sitio manda «Aquí» sobre el nudo más cercano de ESE sitio (con el margen del plano descontado), y a 30 pt de un Fallo ya no es el Fallo',
    r3 !== null && r3.tipo === 'aqui' && r3.nudo === esperado && hechas.at(-2) === `aqui ${String(esperado)}` && lejosDelFallo !== null && lejosDelFallo.tipo === 'aqui',
    { r3, esperado, lejosDelFallo },
  );

  const cuantasAntes = hechas.length;
  const fuera = tocarElPlano(toque(-B - 15, 0), caja, fuenteDelMapa, ordenes);
  const derecho = toque(sitio.x, sitio.z, 0, 0, 2);
  const conElDerecho = tocarElPlano(derecho, caja, fuenteDelMapa, ordenes);
  const conElIzquierdo = tocarElPlano(toque(sitio.x, sitio.z, 0, 0, 0), caja, fuenteDelMapa, ordenes);
  comprobar(
    'fuera de la ciudad no se toca nada, y el botón derecho del ratón no toca (ni se come el evento); el izquierdo, sí',
    fuera === null && conElDerecho === null && derecho.parado === 0 && conElIzquierdo !== null && conElIzquierdo.tipo === 'aqui' && hechas.length === cuantasAntes + 1,
    { fuera, conElDerecho, parado: derecho.parado, conElIzquierdo, hechas: hechas.slice(cuantasAntes) },
  );

  marcas = [marca('cabina', sitio.x + 4, sitio.z, cabina.zona), marca('fallo', sitio.x - 4, sitio.z, plaza3.numero), marca('companero', sitio.x, sitio.z, 2)];
  const empate = tocarElPlano(toque(sitio.x, sitio.z), caja, fuenteDelMapa, ordenes);
  marcas = [marca('cabina', sitio.x + 4, sitio.z, cabina.zona)];
  const aCabina = tocarElPlano(toque(sitio.x, sitio.z), caja, fuenteDelMapa, ordenes);
  comprobar(
    'a igual distancia del dedo gana el Fallo sobre la cabina, un compañero no tiende rumbo, y tocar una cabina tiende el rumbo a su zona',
    empate !== null && empate.tipo === 'rumbo' && mismoObjetivo(empate.objetivo, { tipo: 'fallo', plaza: plaza3.numero }) && aCabina !== null && aCabina.tipo === 'rumbo' && mismoObjetivo(aCabina.objetivo, { tipo: 'zona', zona: cabina.zona }) &&
      objetivoDeLaMarca(marca('companero', 0, 0, 2)) === null && objetivoDeLaMarca(marca('fallo', 0, 0, 0)) === null,
    { empate, aCabina },
  );

  /* 9. Los campos, uno por (grafo, meta), guardados; el grafo de otra noche es otro campo. */
  const campos = new CamposPorMeta(2);
  const g1 = ensayo.grafo;
  const g2 = otra.grafo;
  const c1 = campos.campo(g1, 10);
  const c1b = campos.campo(g1, 10);
  const c2 = campos.campo(g2, 10);
  campos.campo(g1, 11);
  const c1c = campos.campo(g1, 10);
  comprobar(
    'los campos se guardan por grafo y meta (el mismo objeto), el grafo de otra noche calcula el suyo y el más viejo se tira',
    c1 === c1b && c2 !== c1 && c1c !== c1 && campos.calculados === 4 && c1.metros[10] === 0,
    { calculados: campos.calculados },
  );

  /* 10. El hilo empieza donde está el propio, no en el nudo que ya dejó atrás. */
  const calle = -24;
  const desde = nudoMasCercano(ensayo.grafo, -72, calle);
  const hasta = nudoMasCercano(ensayo.grafo, 72, calle);
  const deFrente = hiloNuevo();
  const propio = { x: -72 + 2.9, z: calle + 1.5 };
  tenderElHilo(ensayo.grafo, { campo: campoHasta(ensayo.grafo, hasta) }, propio.x, propio.z, deFrente);
  const detras: number[] = [];
  for (let i = 0; i < deFrente.cuantos; i++) {
    const gx = deFrente.glifos[i * NUMEROS_POR_GLIFO] as number;
    const gz = deFrente.glifos[i * NUMEROS_POR_GLIFO + 1] as number;
    if (gx < propio.x + INICIO_DEL_HILO - 1e-6 || gz !== calle) detras.push(gx);
  }
  comprobar(
    'con el propio ya pasado el nudo más cercano, el hilo sale por delante de él y ni un glifo queda a su espalda',
    nudoMasCercano(ensayo.grafo, propio.x, propio.z) === desde && deFrente.cuantos > 20 && detras.length === 0 && Math.abs((deFrente.glifos[2] as number) - Math.PI / 2) < 1e-6,
    { detras, cuantos: deFrente.cuantos, rumbo: deFrente.glifos[2] },
  );

  /* 11. La M, los componentes y los fuentes. */
  const tecla = (code: string, extra: Partial<{ repeat: boolean; ctrlKey: boolean; target: unknown }> = {}) => ({ code, repeat: extra.repeat ?? false, ctrlKey: extra.ctrlKey ?? false, metaKey: false, altKey: false, target: extra.target ?? null });
  comprobar(
    'la M abre y cierra el plano; repetida, con Ctrl o escribiendo en un campo, no',
    TECLA_DEL_PLANO === 'KeyM' &&
      esLaTeclaDelPlano(tecla('KeyM'), TECLA_DEL_PLANO) &&
      !esLaTeclaDelPlano(tecla('KeyM', { repeat: true }), TECLA_DEL_PLANO) &&
      !esLaTeclaDelPlano(tecla('KeyM', { ctrlKey: true }), TECLA_DEL_PLANO) &&
      !esLaTeclaDelPlano(tecla('KeyM', { target: { tagName: 'INPUT' } }), TECLA_DEL_PLANO) &&
      !esLaTeclaDelPlano(tecla('KeyN'), TECLA_DEL_PLANO),
  );
  const planoAbierto = renderToStaticMarkup(createElement(Plano, { fuente: fuenteDelMapa, ordenes, abierto: true, alCerrar: () => undefined }));
  const planoCerrado = renderToStaticMarkup(createElement(Plano, { fuente: fuenteDelMapa, ordenes, abierto: false, alCerrar: () => undefined }));
  const boton = renderToStaticMarkup(createElement(BotonDelPlano, { abierto: true, alAlternar: () => undefined }));
  const mini = renderToStaticMarkup(createElement(Minimapa, { fuente: fuenteDelMapa }));
  const miniTocable = renderToStaticMarkup(createElement(Minimapa, { fuente: fuenteDelMapa, alTocar: () => undefined }));
  comprobar(
    'el plano cerrado no pinta nada; abierto lleva su lienzo de toques, la leyenda y cerrar; PLANO dice si está abierto; el minimapa sólo se toca si se le da a qué',
    planoCerrado === '' &&
      /class="marcas"/.test(planoAbierto) &&
      planoAbierto.includes('q-plano-leyenda') &&
      planoAbierto.includes('aria-label="Cerrar el plano"') &&
      boton.includes('aria-pressed="true"') &&
      boton.includes('aria-label="Plano"') &&
      mini.includes('q-minimapa') &&
      mini.includes('role="img"') &&
      miniTocable.includes('role="button"'),
    { planoAbierto: planoAbierto.slice(0, 300), boton, mini: mini.slice(0, 200) },
  );
  const raizDelHud = new URL('../src/quiebro/hud/', import.meta.url);
  const sinComentarios = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const plano = sinComentarios(readFileSync(new URL('Plano.tsx', raizDelHud), 'utf8'));
  const minimapa = sinComentarios(readFileSync(new URL('Minimapa.tsx', raizDelHud), 'utf8'));
  comprobar(
    'el plano toca en `onPointerDown` con `tocarElPlano`, y el minimapa también: ni un `onClick`',
    /onPointerDown=\{alTocar\}/.test(plano) && /tocarElPlano\(e,/.test(plano) && /onPointerDown=\{tocable \? alBajar/.test(minimapa) && !/\bonClick\b/.test(plano + minimapa),
  );
}


/* ─────────────────────────────── 13. La ciudad se pisa ─────────────────────────────── */

/**
 * ANDA POR LAS CALLES de la ciudad con la predicción: de `desde` (metros) a cada objetivo, nudo a nudo por el
 * camino corto del grafo (el hilo de rumbo del HUD), al trote y a la carrera, contra el contrato de la sala
 * escrito aquí: cada tramo dentro del límite de la fase, en recta y donde se puede estar. Devuelve lo andado,
 * lo más lejos que se llegó de donde se empezó y los tramos malos.
 */
function andarPorLaCiudad(
  liza: LizaDeclarada,
  reglas: ReglasDeAsiento,
  grafo: GrafoDeLaCiudad,
  desde: readonly [number, number],
  objetivos: readonly (readonly [number, number])[],
  alPaso?: (x: number, z: number, t: number) => void,
): { metros: number; lejos: number; llegadas: number; malos: string[]; tics: number } {
  const arena = arenaDeLaLiza(liza);
  const limite = arenaYLimite(liza);
  const p = new PasoPropio(arena, reglas.cuerpo);
  p.colocar(u(desde[0]), u(desde[1]));
  const malos: string[] = [];
  let metros = 0;
  let lejos = 0;
  let llegadas = 0;
  let t = 0;
  for (const [ox, oz] of objetivos) {
    const meta = nudoMasCercano(grafo, ox, oz);
    const campo = campoHasta(grafo, meta);
    const camino = caminoPorElCampo(grafo, campo, nudoMasCercano(grafo, p.x / UNO, p.z / UNO), Number.POSITIVE_INFINITY);
    let k = 0;
    for (let vuelta = 0; vuelta < 4000 && k < camino.length; vuelta++, t++) {
      const n = grafo.nudos[camino[k] as number] as { x: number; z: number };
      const dx = n.x - p.x / UNO;
      const dz = n.z - p.z / UNO;
      if (Math.hypot(dx, dz) < 0.6) {
        k++;
        vuelta--;
        t--;
        continue;
      }
      const antesX = p.x;
      const antesZ = p.z;
      const d = p.paso({ rumbo: rumboDeRadianes(Math.atan2(dx, -dz)), fuerza: 1, correr: t % 400 < 300 }, false, limite);
      if (!dentroDelLimite(limite, d.x, d.z)) malos.push(`fuera del límite en (${String(d.x / UNO)}, ${String(d.z / UNO)})`);
      else if (!seAndaEnRecta(arena, { x: antesX, z: antesZ }, { x: d.x, z: d.z }, reglas.cuerpo.radio)) malos.push(`tramo que no se anda en recta hasta (${String(d.x / UNO)}, ${String(d.z / UNO)})`);
      else if (!sePuedeEstar(arena, d.x, d.z, reglas.cuerpo.radio)) malos.push(`un sitio donde no se puede estar: (${String(d.x / UNO)}, ${String(d.z / UNO)})`);
      metros += Math.hypot(d.x - antesX, d.z - antesZ) / UNO;
      lejos = Math.max(lejos, Math.hypot(d.x / UNO - desde[0], d.z / UNO - desde[1]));
      alPaso?.(d.x, d.z, t);
    }
    const final = grafo.nudos[meta] as { x: number; z: number };
    if (Math.hypot(final.x - p.x / UNO, final.z - p.z / UNO) < 1) llegadas++;
  }
  return { metros, lejos, llegadas, malos, tics: t };
}

paso('13. La ciudad se pisa: el lugar, el límite `ciudad`, la gente, el mapa vivo, la cámara y el HUD');
await (async () => {
  const CODIGO = 'QUIEB';
  const NOCHE_C = ciudadDeLaNoche(ciudadDeLaMesa(9, CODIGO), CODIGO, 1, [1]);
  const GRAFO = NOCHE_C.grafo;
  const PLAZA = NOCHE_C.ciudad.plazas[0]?.centro ?? { x: 0, z: 0 };
  /* La liza del diseño con el mundo de la ciudad, su límite y clases de zona que la ciudad tiene. */
  const impresion = claseDeZonaDePlaza(1, 'impresion');
  const base = lizaDelDiseno('encuentro');
  const lizaDeLaCiudad = (modo: 'encuentro' | 'calma', despejadas = false): LizaDeclarada => {
    const l = lizaDelDiseno(modo);
    return {
      ...l,
      mundo: mundoDeLaLizaDeLaCiudad(NOCHE_C, despejadas),
      fase: {
        ...l.fase,
        limite: ID_DEL_LIMITE_DE_LA_CIUDAD,
        encuentro: l.fase.encuentro === null ? null : { ...l.fase.encuentro, grupos: l.fase.encuentro.grupos.map((g) => ({ ...g, claseDeZona: impresion })) },
      },
      clases: l.clases.map((c) => (c.alCaer.tipo === 'rematable' ? { ...c, alCaer: { ...c.alCaer, siNo: { ...c.alCaer.siNo, claseDeZona: impresion } } } : c)),
    };
  };
  const LIZA_C = lizaDeLaCiudad('encuentro');
  const problemas = problemasDeLaDeclaracion(LIZA_C);
  comprobar('la liza del diseño sobre la ciudad de verdad (mundo, límite `ciudad`, zonas de la ciudad) es una liza que la sala acepta', problemas.length === 0, problemas.slice(0, 4));
  void base;
  const REGLAS_C = LIZA_C.asientos[0] as ReglasDeAsiento;
  const naceC = LIZA_C.mundo.nace.find((x) => x.papel === 'asiento') ?? { x: u(PLAZA.x), z: u(PLAZA.z), rumbo: 0, papel: 'asiento' as const };

  /* ── El lugar: la ciudad sólo si el mundo de la liza es el de su traza ── */
  const vistaFalsa = (traza: number | null, contramedida = 'ninguna'): VistaDelQuiebro =>
    ({ traza, noche: { numero: 1, receta: 'enjambre', fallos: [1] }, reglamento: { contramedida } }) as unknown as VistaDelQuiebro;
  const conCiudad = lugarDeLaMesa(vistaFalsa(9), CODIGO, LIZA_C);
  const conBarrio = lugarDeLaMesa(vistaFalsa(9), CODIGO, LIZA);
  const sinLiza = lugarDeLaMesa(vistaFalsa(9), CODIGO, null);
  const sinTraza = lugarDeLaMesa(vistaFalsa(null), CODIGO, LIZA);
  /* Lo que hace el productor de verdad: sus sitios de nacer y sus clases de zona encima, con el mismo suelo. */
  const comoElProductor: LizaDeclarada = { ...LIZA_C, mundo: { ...LIZA_C.mundo, nace: LIZA_C.mundo.nace.slice(0, 12), zonas: LIZA_C.mundo.zonas.map((z) => ({ ...z })) } };
  const delProductor = lugarDeLaMesa(vistaFalsa(9), CODIGO, comoElProductor);
  const despejada = lugarDeLaMesa(vistaFalsa(9), CODIGO, lizaDeLaCiudad('encuentro', true));
  comprobar(
    'el lugar es la ciudad si el mundo de la liza es el de su traza (también con lo que el productor pone encima), y la noche es la misma que deriva la sala',
    conCiudad.lugar?.tipo === 'ciudad' && conCiudad.lugar.noche === NOCHE_C && conCiudad.aviso === null && delProductor.lugar?.tipo === 'ciudad' && sinLiza.lugar?.tipo === 'ciudad',
    { conCiudad: conCiudad.lugar?.tipo, delProductor: delProductor.lugar?.tipo, sinLiza: sinLiza.lugar?.tipo },
  );
  comprobar(
    'con la traza en la vista y el mundo del barrio en la liza (una obra a medias) se juega en el barrio y se dice por qué; sin traza, el barrio',
    conBarrio.lugar?.tipo === 'barrio' && conBarrio.aviso !== null && sinTraza.lugar?.tipo === 'barrio' && sinTraza.aviso === null,
    { conBarrio: conBarrio.lugar?.tipo, aviso: conBarrio.aviso, sinTraza: sinTraza.lugar?.tipo },
  );
  comprobar(
    'las «Plazas despejadas» se reconocen por el mundo de la liza aunque la contramedida se llame de otro modo: la noche es la despejada',
    despejada.lugar?.tipo === 'ciudad' && despejada.lugar.despejadas && despejada.lugar.noche === despejarLasPlazas(NOCHE_C) && cajasDelLugar(despejada.lugar).length === lizaDeLaCiudad('calma', true).mundo.suelo.cuerpos.length,
    { tipo: despejada.lugar?.tipo, despejadas: despejada.lugar?.tipo === 'ciudad' ? despejada.lugar.despejadas : null },
  );
  const LUGAR_C = conCiudad.lugar as LugarDeLaNoche;

  /* ── La predicción cruza la ciudad, y la sala de verdad no corrige ni un paso ── */
  const esquinas: readonly (readonly [number, number])[] = [
    [240, -240],
    [240, 240],
    [-240, 240],
    [-240, -240],
  ];
  const cruce = andarPorLaCiudad(LIZA_C, REGLAS_C, GRAFO, [naceC.x / UNO, naceC.z / UNO], esquinas);
  comprobar(
    `con el límite \`ciudad\`, por las calles hasta las cuatro esquinas (${String(Math.round(cruce.metros))} m, hasta ${String(Math.round(cruce.lejos))} m de la plaza): todo tramo dentro del límite, en recta y donde se puede estar`,
    cruce.malos.length === 0 && cruce.llegadas === 4 && cruce.lejos > 300 && cruce.metros > 1500,
    { malos: cruce.malos.slice(0, 4), llegadas: cruce.llegadas, lejos: cruce.lejos },
  );
  const sala = await (async (): Promise<{ correcciones: number; lejos: number; tics: number } | null> => {
    const ruta = new URL('../../shared/mecanicas/liza/sala.ts', import.meta.url);
    if (!existsSync(ruta)) return null;
    const modulo = (await import(ruta.href)) as { salaNueva?: SalaNueva; avanzarLaSala?: AvanzarLaSala };
    if (typeof modulo.salaNueva !== 'function' || typeof modulo.avanzarLaSala !== 'function') return null;
    const avanzar = modulo.avanzarLaSala;
    const liza = lizaDeLaCiudad('calma');
    let s = modulo.salaNueva(liza, liza.fase.semilla);
    s = avanzar(s, [{ tipo: 'conexion', asiento: 1, rttMs: 60, desfaseMs: 0 }]).sala;
    const a0 = s.asientos[0];
    let correcciones = 0;
    let lejos = 0;
    const origen = { x: (a0?.x ?? naceC.x) / UNO, z: (a0?.z ?? naceC.z) / UNO };
    const andado = andarPorLaCiudad(liza, liza.asientos[0] as ReglasDeAsiento, GRAFO, [origen.x, origen.z], [esquinas[0] as readonly [number, number], [0, 0]], (x, z, t) => {
      const paso = avanzar(s, [{ tipo: 'aqui', asiento: 1, n: t + 1, x, z, r: 0, m: 3, accion: null, desfaseMs: 0 }]);
      s = paso.sala;
      correcciones += paso.correcciones.length;
      const a = s.asientos[0];
      if (a !== undefined) lejos = Math.max(lejos, Math.hypot(a.x / UNO - origen.x, a.z / UNO - origen.z));
    });
    return { correcciones, lejos, tics: andado.tics };
  })();
  if (sala === null) nota('Sin la sala de verdad, el cruce no se juega contra ella.');
  else {
    comprobar(
      `contra la sala de verdad, con la liza de la ciudad en calma: ${String(sala.tics)} tics por las calles hasta una esquina y de vuelta, ni una corrección, y la sala me deja a ${String(Math.round(sala.lejos))} m de donde nací`,
      sala.correcciones === 0 && sala.lejos > 300 && sala.tics > 900,
      sala,
    );
  }

  /* ── La partida en la ciudad: el límite, la gente y lo que da al mapa ── */
  const relojes = new RelojesDeMentira();
  const mandos = new EstadoDeLosMandos();
  const enchufes: EnchufeDeMentira[] = [];
  const partida = new Partida({
    direccion: 'ws://x/api/arcade/mesas/QUIEB/liza',
    llave: 'k1',
    fabrica: (d) => {
      const e = new EnchufeDeMentira(d);
      enchufes.push(e);
      return e;
    },
    relojes,
    mandos,
  });
  partida.ponerLaDeclaracion(LIZA_C, LUGAR_C, 'a1');
  partida.asegurarElCanal(true);
  const e = enchufes[0] as EnchufeDeMentira;
  e.abrir();
  e.llega({ t: 'dentro', yo: 1, k: 1000, x: naceC.x, z: naceC.z, r: 0, hz: 20 });
  e.llega({ t: 'tic', k: 1000, ev: [{ e: 'fase', clave: 'n1-o1', modo: 2, limite: ID_DEL_LIMITE_DE_LA_CIUDAD, relojMs: 0, encuentroTics: 3000 }] });
  e.llega({ t: 'eco', c: 0, k: 1000, ms: 50_000 });
  const fotograma = (ms: number): void => {
    relojes.t += ms;
    partida.fotograma(relojes.t, ms / 1000);
  };
  fotograma(1);
  comprobar(
    'la partida en la ciudad da a los personajes la gente de la ciudad y al mapa la noche de la ciudad (y en el barrio, ninguna noche)',
    partida.genteDeLaNoche() === genteDeLaCiudad(NOCHE_C) && partida.nocheDeLaCiudad() === NOCHE_C,
  );
  /*
   * Hacia el norte a la carrera, doce segundos: con el límite de la plaza (60 × 60, el de la Bajada) no se
   * pasaba de 30 m de su centro, y con la glorieta de antes, de 24.
   */
  partida.giroDeLaCamara = 0;
  mandos.correrPedido = true;
  const salidaDe = { x: PLAZA.x, z: PLAZA.z };
  let lejosDelNace = 0;
  let fuera = 0;
  for (let i = 0; i < 720; i++) {
    const libre = (dir: number): boolean => {
      const c = partida.pintadoDe(1);
      return c !== null && seAndaEnRecta(arenaDeLaLiza(LIZA_C), { x: u(c.x), z: u(c.z) }, { x: u(c.x + Math.sin(dir) * 1.5), z: u(c.z - Math.cos(dir) * 1.5) }, REGLAS_C.cuerpo.radio);
    };
    /* Hacia el norte si se puede, si no hacia el este o el oeste: sale de la plaza por su calle. */
    const dir = libre(0) ? 0 : libre(Math.PI / 2) ? Math.PI / 2 : -Math.PI / 2;
    mandos.ponerPalanca(Math.sin(dir), Math.cos(dir), relojes.t);
    fotograma(16.7);
    const c = partida.pintadoDe(1);
    if (c !== null) lejosDelNace = Math.max(lejosDelNace, Math.max(Math.abs(c.x - salidaDe.x), Math.abs(c.z - salidaDe.z)));
  }
  for (const a of e.leidos()) if (a.t === 'aqui' && !dentroDelLimite(arenaYLimite(LIZA_C), a.x, a.z)) fuera++;
  comprobar(`con el límite \`ciudad\` la partida sale de la plaza: a ${String(Math.round(lejosDelNace))} m de su centro en doce segundos (la plaza llega a 30), y ningún \`aqui\` fuera del límite`, lejosDelNace > 45 && fuera === 0, { lejosDelNace, fuera });
  mandos.ponerPalanca(0, 0, relojes.t);
  /* Un Prestado nace a 5 m: sale del durmiente de la ciudad que dice la función pura, en todos los aparatos. */
  const yoAhora = partida.pintadoDe(1) as CuerpoPintado;
  const kNace = 1000 + Math.floor((relojes.t - 5000) / 50);
  const px = Math.round((yoAhora.x + 5) * 100);
  const pz = Math.round(yoAhora.z * 100);
  e.llega({ t: 'tic', k: kNace, ev: [{ e: 'nace', id: 30, clase: 2, x: px, z: pz, r: 0 }] });
  fotograma(16);
  const esperado = durmienteMasCercanoEnLaCiudad(NOCHE_C, kNace, Math.round((px / 100) * UNO), Math.round((pz / 100) * UNO), []);
  comprobar(
    `el Prestado que nace sale del durmiente de la ciudad más cercano, el de la función pura (${String(esperado)}), y ya no se pinta como civil`,
    esperado !== null && partida.prestados().has(esperado) && partida.prestados().size === 1,
    { esperado, prestados: [...partida.prestados()] },
  );

  /* ── El mapa vivo de la partida ── */
  let ahora = 1000;
  const cuerpos: CuerpoPintado[] = [];
  const cuerpo = (id: number, x: number, z: number, color: string | null): CuerpoPintado => ({ id, clase: id < 16 ? 'desvelado' : 'prestado', variante: 0, color, x, z, rumbo: 0.5, velocidad: 0, gesto: 'reposo', gestoDesdeMs: 0, impactoMs: null, direccionDelGesto: null, contorno: true, tenue: false });
  const nudoCerca = (x: number, z: number): { x: number; z: number } => GRAFO.nudos[nudoMasCercano(GRAFO, x, z)] as { x: number; z: number };
  const yo0 = nudoCerca(PLAZA.x + 30, PLAZA.z);
  cuerpos.push(cuerpo(1, yo0.x, yo0.z, '#ff4d6d'));
  const lejano = nudoCerca(PLAZA.x + 150, PLAZA.z - 90);
  cuerpos.push(cuerpo(2, lejano.x, lejano.z, '#46c8ff'));
  const cercano = nudoCerca(yo0.x, yo0.z + 18);
  cuerpos.push(cuerpo(3, cercano.x, cercano.z, '#b4ff4a'));
  const sentidos = new Map<number, string>([[3, 'caido']]);
  let conCuerpo = true;
  let zona: { id: number; hastaMs: number } | null = null;
  const falsa = {
    nocheDeLaCiudad: () => NOCHE_C as NocheDeLaCiudad | null,
    yo: () => 1 as number | null,
    pintadoDe: (n: number) => cuerpos.find((c) => c.id === n) ?? null,
    cuerpos: () => cuerpos,
    conCuerpo: () => conCuerpo,
    jugando: () => true,
    sentidoDe: (n: number) => sentidos.get(n) ?? 'libre',
    get sala() {
      return { zona } as unknown as Partida['sala'];
    },
    giroDeLaCamara: 0.3,
  } as unknown as PartidaQueOrienta;
  const mapa = new OrientacionDeLaPartida(falsa, () => ahora);
  const porCalles = (x0: number, z0: number, x1: number, z1: number): number => metrosQueSeEnsenan(distanciaPorCalles(GRAFO, campoHasta(GRAFO, nudoMasCercano(GRAFO, x0, z0)), x1, z1));
  let marcas = mapa.marcas();
  const m2 = marcas.find((m) => m.quien === 2);
  const m3 = marcas.find((m) => m.quien === 3);
  comprobar(
    'el mapa vivo da cada compañero con el color de su asiento y sus metros POR CALLES desde mí (los del grafo de la noche, no en recta)',
    m2 !== undefined && m2.clase === 'companero' && m2.color === '#46c8ff' && m2.metros === porCalles(yo0.x, yo0.z, lejano.x, lejano.z) && m2.metros > Math.hypot(lejano.x - yo0.x, lejano.z - yo0.z) - 1,
    { m2, calles: porCalles(yo0.x, yo0.z, lejano.x, lejano.z) },
  );
  comprobar(
    `un compañero caído a ${String(METROS_DEL_RESCATE)} m o menos por calles sale como «Rescate»; el del mapa y el de la brújula son el mismo número`,
    m3 !== undefined && m3.clase === 'caido' && m3.metros >= 0 && m3.metros <= 40 && m2?.clase !== 'caido',
    m3,
  );
  const cabina = NOCHE_C.ciudad.cabinas[4];
  zona = cabina === undefined ? null : { id: idDeZonaDeCabina(4), hastaMs: ahora + 50_000 };
  ahora += 200;
  marcas = mapa.marcas();
  const mc = marcas.find((m) => m.clase === 'cabina');
  const metaDeLaCabina = cabina === undefined ? -1 : nudoMasCercano(GRAFO, cabina.sitio.x, cabina.sitio.z);
  /*
   * Hasta su SITIO, donde se descuelga, y no hasta el nudo de la calzada que tiene al lado (4,5-6 m más
   * allá): el campo del nudo más lo que hay de él al sitio por los ejes, como la mide el productor al
   * elegirla. Con los del nudo, el pie del minimapa decía «1 m» en mitad de la calzada y la Llamada se
   * perdía allí (revisión del 24-sep).
   */
  const nudoDeLaCabina = GRAFO.nudos[metaDeLaCabina];
  const delNudoAlSitio = cabina === undefined || nudoDeLaCabina === undefined ? -1 : Math.abs(nudoDeLaCabina.x - cabina.sitio.x) + Math.abs(nudoDeLaCabina.z - cabina.sitio.z);
  const hastaElNudo = metaDeLaCabina < 0 ? -1 : distanciaPorCalles(GRAFO, campoHasta(GRAFO, metaDeLaCabina), yo0.x, yo0.z);
  comprobar(
    'la cabina que suena sale en su poste, en ámbar, con los metros por calles hasta su SITIO (el campo de su nudo más lo del nudo al sitio, como la mide el productor), no hasta el nudo de la calzada',
    mc !== undefined && cabina !== undefined && mc.x === cabina.poste.x && mc.z === cabina.poste.z && mc.color === null && delNudoAlSitio >= 4 && mc.metros === metrosQueSeEnsenan(hastaElNudo + delNudoAlSitio),
    { mc, meta: metaDeLaCabina, hastaElNudo, delNudoAlSitio },
  );
  /* «Aquí»: tiende el rumbo propio a un nudo; otra vez, lo suelta; y el rumbo a la cabina la marca. */
  const nudoLejos = nudoMasCercano(GRAFO, -200, 200);
  mapa.aqui(nudoLejos);
  ahora += 200;
  const aqui = mapa.marcas().find((m) => m.clase === 'aviso');
  const rumboAqui = mapa.rumbo();
  const nLejos = GRAFO.nudos[nudoLejos] as { x: number; z: number };
  comprobar(
    '«Aquí» en el plano tiende MI rumbo a ese nudo: su marca, con mi color y los metros del campo del rumbo (los de la sala)',
    rumboAqui !== null && rumboAqui.nudo === nudoLejos && aqui !== undefined && aqui.rumbo && aqui.x === nLejos.x && aqui.z === nLejos.z && aqui.color === '#ff4d6d' && aqui.metros === metrosPorCalles(GRAFO, rumboAqui.campo, yo0.x, yo0.z),
    { aqui, nudo: rumboAqui?.nudo },
  );
  mapa.aqui(nudoLejos);
  ahora += 200;
  const soltado = mapa.rumbo() === null && mapa.marcas().every((m) => m.clase !== 'aviso');
  mapa.tenderElRumbo({ tipo: 'zona', zona: zona?.id ?? 0 });
  ahora += 200;
  const cabinaDelRumbo = mapa.marcas().find((m) => m.clase === 'cabina');
  comprobar('el mismo «Aquí» otra vez suelta el rumbo; tocar la cabina lo tiende a ella y su marca lo dice', soltado && cabinaDelRumbo?.rumbo === true && mapa.rumbo()?.nudo === metaDeLaCabina, { soltado, cabinaDelRumbo });
  /* Lo que cuesta: las marcas se rehacen a 10 Hz y el campo desde mí sólo si cambia mi nudo. */
  const antes = mapa.camposDesdeMi;
  const rehechasAntes = mapa.rehechas;
  ahora += 150;
  mapa.marcas();
  mapa.marcas();
  const unaVez = mapa.rehechas - rehechasAntes;
  ahora += 150;
  mapa.marcas();
  const mismoNudo = mapa.camposDesdeMi === antes;
  const otro = nudoCerca(yo0.x + 60, yo0.z);
  (cuerpos[0] as CuerpoPintado).x = otro.x;
  (cuerpos[0] as CuerpoPintado).z = otro.z;
  ahora += 150;
  mapa.marcas();
  comprobar(
    'dos preguntas en el mismo refresco (el minimapa y el plano) rehacen la lista una vez; el campo desde mí se rehace sólo al cambiar de nudo',
    unaVez === 1 && mismoNudo && mapa.camposDesdeMi === antes + 1,
    { unaVez, antes, despues: mapa.camposDesdeMi },
  );
  /* El Vigía: los enemigos cerca de un compañero; y nunca más de 20 marcas. */
  conCuerpo = false;
  /* Primero doce lejos de todos (si el Vigía no mirara la distancia, llenarían la lista), luego dieciocho cerca del compañero lejano. */
  for (let k = 0; k < 12; k++) cuerpos.push(cuerpo(16 + k, lejano.x + (k % 4) * 8, lejano.z + 90 + Math.floor(k / 4) * 10, null));
  for (let k = 0; k < 18; k++) cuerpos.push(cuerpo(28 + k, lejano.x + (k % 6) * 6 - 15, lejano.z + Math.floor(k / 6) * 12 - 12, null));
  ahora += 200;
  marcas = mapa.marcas();
  const enemigos = marcas.filter((m) => m.clase === 'enemigo');
  const lejosDeTodos = enemigos.filter((m) => cuerpos.every((c) => c.id >= 16 || c.id === 1 || Math.hypot(c.x - m.x, c.z - m.z) > 60));
  comprobar(
    'sin cuerpo (Vigía) el mapa enseña los enemigos a 60 m o menos de un compañero, y nunca más de 20 marcas',
    mapa.vigia() && mapa.yo() === null && enemigos.length > 0 && lejosDeTodos.length === 0 && marcas.length <= 20,
    { enemigos: enemigos.length, lejosDeTodos: lejosDeTodos.length, total: marcas.length },
  );
  /* Otra noche: el mismo objetivo con el campo de su grafo. En el barrio, nada. */
  const otraNoche = ciudadDeLaNoche(ciudadDeLaMesa(9, CODIGO), CODIGO, 2, [3]);
  let noche: NocheDeLaCiudad | null = otraNoche;
  (falsa as unknown as { nocheDeLaCiudad: () => NocheDeLaCiudad | null }).nocheDeLaCiudad = () => noche;
  const rumboAntes = mapa.rumbo();
  const rumboOtra = mapa.rumbo();
  void rumboAntes;
  const metaOtra = nudoMasCercano(otraNoche.grafo, cabina?.sitio.x ?? 0, cabina?.sitio.z ?? 0);
  const retendido = rumboOtra !== null && rumboOtra.nudo === metaOtra && rumboOtra.campo === mapa.campos.campo(otraNoche.grafo, metaOtra);
  noche = null;
  ahora += 200;
  comprobar('con otra noche el rumbo se vuelve a tender al mismo objetivo en su grafo; en el barrio no hay mapa (ni marcas ni rumbo)', retendido && mapa.marcas().length === 0 && mapa.rumbo() === null && mapa.noche() === null, { retendido });

  /* ── La cámara no atraviesa las cajas de la ciudad ── */
  const cajasCamara = cajasDelLugar(LUGAR_C).map(cajaParaLaCamara);
  const edificio = NOCHE_C.cajas.find((c) => c.tipo === 'edificio' && c.alto > 8 && c.x1 - c.x0 > 20);
  let dentroDeUna = 0;
  let probadas = 0;
  if (edificio !== undefined) {
    const cx = (edificio.x0 + edificio.x1) / 2;
    const z = edificio.z1 + 1.2;
    for (let k = 0; k < 64; k++) {
      const giro = (k / 64) * Math.PI * 2;
      const estado = camaraNueva(giro);
      const en = encuadrar(estado, { x: cx, z, dt: 1, enemigosCerca: false, blanco: null, mandaElDedo: true, remanso: 0, tactil: false, vigia: false, cajas: cajasCamara });
      probadas++;
      for (const c of cajasCamara) if (en.ojo.x > c.x0 && en.ojo.x < c.x1 && en.ojo.z > c.z0 && en.ojo.z < c.z1 && en.ojo.y < c.alto) dentroDeUna++;
    }
  }
  comprobar('pegado a la fachada de un edificio de la ciudad, en 64 giros la cámara nunca queda dentro de una caja (las de la ciudad entera, no las del barrio)', edificio !== undefined && probadas === 64 && dentroDeUna === 0 && cajasCamara.length === NOCHE_C.cajas.length, { dentroDeUna, cajas: cajasCamara.length });

  /* ── El HUD monta el minimapa, el botón PLANO y el plano sólo en la ciudad, y sólo en la calle ── */
  let estadoMesa: unknown = undefined;
  const asientos = ['s1'];
  const sentados = asientos.map((asiento) => ({ asiento, nombre: asiento }));
  const mandar = (quien: string | null, tipo: string, carga: unknown): void => {
    const r = avanzarConMotivo('quiebro', estadoMesa, { tipo, carga }, { quien, azar: 7, tic: 0, asientos });
    if (r.motivo === null) estadoMesa = r.estado;
  };
  mandar('s1', 'empezar', null);
  const enBajada = leerVistaDelQuiebro(vistaDeAsiento('quiebro', estadoMesa, 's1', sentados));
  if (enBajada?.reloj !== null && enBajada?.reloj !== undefined) mandar(null, 'arcade:reloj', { id: enBajada.reloj.id });
  const enOleada = leerVistaDelQuiebro(vistaDeAsiento('quiebro', estadoMesa, 's1', sentados));
  const puerto: PuertoDeMesa = {
    codigo: CODIGO,
    yo: 's1',
    llave: 'k',
    servidor: '',
    vista: null,
    opciones: [],
    rev: 1,
    mover: async () => ({ ok: true }) as unknown as Awaited<ReturnType<PuertoDeMesa['mover']>>,
    suscribir: () => () => undefined,
  };
  const pintarElHud = (vista: VistaDelQuiebro | null, enLaCiudad: boolean): string =>
    renderToStaticMarkup(
      createElement(Hud, {
        vista,
        puerto,
        partida,
        escena: null,
        mandos,
        sonido: { volumenDe: () => 1, silenciado: () => false } as unknown as Parameters<typeof Hud>[0]['sonido'],
        mover: async () => ({ ok: true }) as unknown as Awaited<ReturnType<Parameters<typeof Hud>[0]['mover']>>,
        bajado: true,
        alBajar: () => undefined,
        primeraNoche: false,
        rotuloDelBarrio: null,
        rotuloDeFase: null,
        marcador: false,
        alMarcador: () => undefined,
        menu: false,
        alMenu: () => undefined,
        zurdo: false,
        alZurdo: () => undefined,
        tactil: true,
        alSalir: undefined,
        alOtraMesa: () => undefined,
        avisoDelSilencio: false,
        bajada: new RelojDeLaBajada(),
        ojo: { current: null },
        mapa,
        enLaCiudad,
      }),
    );
  const conMapa = (html: string): boolean => /q-mapa-mini/.test(html) && /q-plano-boton/.test(html);
  const oleadaEnLaCiudad = enOleada === null ? '' : pintarElHud(enOleada, true);
  const oleadaEnElBarrio = enOleada === null ? '' : pintarElHud(enOleada, false);
  const bajadaEnLaCiudad = enBajada === null ? '' : pintarElHud(enBajada, true);
  comprobar(
    'el HUD de la oleada en la ciudad lleva el minimapa y el botón PLANO; en el barrio y en la Bajada, no',
    enOleada?.fase.tipo === 'oleada' && conMapa(oleadaEnLaCiudad) && !conMapa(oleadaEnElBarrio) && enBajada?.fase.tipo === 'bajada' && !conMapa(bajadaEnLaCiudad),
    { fase: enOleada?.fase.tipo, ciudad: conMapa(oleadaEnLaCiudad), barrio: conMapa(oleadaEnElBarrio), bajada: conMapa(bajadaEnLaCiudad) },
  );
  const fuenteDelJuego = readFileSync(new URL('../src/quiebro/Quiebro.tsx', import.meta.url), 'utf8');
  comprobar(
    'el juego monta el mapa vivo de SU partida y pinta la ciudad del lugar (traza, plazas y despejadas), con la cámara y la gente del mismo lugar',
    /new OrientacionDeLaPartida\(partida\)/.test(fuenteDelJuego) &&
      /mapa=\{mapa\}/.test(fuenteDelJuego) &&
      /traza: lugar\.traza, fallos: lugar\.fallos, despejadas: lugar\.despejadas/.test(fuenteDelJuego) &&
      /\{\.\.\.deLaCiudad\}/.test(fuenteDelJuego) &&
      /lugar=\{p\.lugar\}/.test(fuenteDelJuego) &&
      /ponerLaDeclaracion\(liza, lugar, puerto\.yo\)/.test(fuenteDelJuego),
  );
})();

/* ─────────────────────────────── 13 bis. Lo que se vio jugando la entrega 1 ─────────────────────────────── */

paso('13 bis. Lo que se vio jugando: el rótulo de la Bajada, el rumbo hasta donde se descuelga, el ojo fuera de las cajas y el HUD que se lee');
{
  const CODIGO = 'QUIEB';

  /*
   * EL RÓTULO DE LA BAJADA. Se leía con un molde a una forma que `quiebro-nombres.ts` no tiene (`.plazas` y
   * `.distritos` en la raíz): compilaba, la búsqueda fallaba siempre y cada plaza salía con el nombre de una
   * glorieta del barrio y sin distrito (en la mesa V78QY, el Patio de Carga de las Naves era «Glorieta de la
   * Estrella, 3:13»). Se mira en las 6 plazas de las 32 trazas por el camino del juego (`lugarDeLaMesa` con
   * la vista, `rotuloDelLugar`), contra lo que dicen las listas por su índice.
   */
  const nombres = NOMBRES_DEL_QUIEBRO.ciudad;
  let rotulos = 0;
  const rotulosMalos: unknown[] = [];
  const plazasVistas = new Set<string>();
  for (let t = 0; t < TRAZAS; t++) {
    for (const p of ciudadDeLaMesa(t, CODIGO).plazas) {
      const vista = { traza: t, noche: { numero: 2, receta: 'enjambre', fallos: [p.numero] }, reglamento: { contramedida: 'ninguna' } } as unknown as VistaDelQuiebro;
      const lugar = lugarDeLaMesa(vista, CODIGO, null).lugar;
      const rotulo = rotuloDelLugar(lugar);
      rotulos++;
      const hora = lugar?.tipo === 'ciudad' ? lugar.noche.hora : null;
      const nombre = nombres.plazas[p.nombre];
      const esperado = hora === null || nombre === undefined ? null : `${nombre} · ${nombres.distritos[p.distrito]} · ${String(hora.h)}:${hora.m < 10 ? '0' : ''}${String(hora.m)}`;
      if (esperado !== null && rotulo === esperado) plazasVistas.add(nombre as string);
      else if (rotulosMalos.length < 4) rotulosMalos.push({ traza: t, plaza: p.numero, rotulo, esperado });
    }
  }
  comprobar(
    `el rótulo de la Bajada es «Plaza · Distrito · h:mm» con los nombres de \`quiebro-nombres.ts\` por su índice, en las ${String(rotulos)} plazas de las 32 trazas (${String(plazasVistas.size)} plazas con nombre distinto)`,
    rotulos === TRAZAS * 6 && rotulosMalos.length === 0 && plazasVistas.size >= 6,
    rotulosMalos,
  );

  /*
   * EL RUMBO A UNA CABINA ACABA DONDE SE DESCUELGA. Los nudos van por el centro de la calzada y el nudo más
   * cercano a una cabina queda a 4,5-6 m de su sitio: un hilo que acababa en él dejaba al jugador en la
   * calzada con «1 m» en el minimapa y sin poder descolgar (revisión del 24-sep: la Llamada se perdió así).
   * Se tiende como lo tienden el minimapa y el plano, desde la Glorieta, a las 20 cabinas de las 32 trazas.
   */
  let cabinas = 0;
  let lejosDeLaZona = 0;
  let peorAlCentro = 0;
  let tramosQueNoSeAndan = 0;
  let metrosMalos = 0;
  const cabinasMalas: unknown[] = [];
  const hiloDeLaCabina = hiloNuevo();
  for (let t = 0; t < TRAZAS; t++) {
    const noche = ciudadDeLaNoche(ciudadDeLaMesa(t, CODIGO), CODIGO, 1, [1]);
    const arena = arenaDe(mundoDeLaLizaDeLaCiudad(noche, false).suelo);
    const campos = new CamposPorMeta();
    const desde = noche.ciudad.plazas[0]?.centro ?? { x: 0, z: 0 };
    for (const c of noche.ciudad.cabinas) {
      cabinas++;
      const objetivo = { tipo: 'zona', zona: c.zona } as const;
      const rumbo = rumboHacia(noche, objetivo, 1, campos);
      const zona = noche.ciudad.zonas.find((z) => z.id === c.zona);
      if (rumbo === null || zona === undefined) {
        tramosQueNoSeAndan++;
        continue;
      }
      const tramo = tramoFinal(noche, objetivo);
      tenderElHilo(noche.grafo, rumbo, desde.x + 3, desde.z + 20, hiloDeLaCabina, tramo);
      const n = hiloDeLaCabina.puntos;
      const fx = hiloDeLaCabina.ruta[(n - 1) * 2] as number;
      const fz = hiloDeLaCabina.ruta[(n - 1) * 2 + 1] as number;
      /* Lo que mira USAR para descolgar (`usoPosible`): el centro de la zona, a `radio` o menos. */
      const alCentro = Math.hypot(fx - (zona.caja.x0 + zona.caja.x1) / 2, fz - (zona.caja.z0 + zona.caja.z1) / 2);
      peorAlCentro = Math.max(peorAlCentro, alCentro);
      if (!(alCentro <= CABINA.metros)) {
        lejosDeLaZona++;
        if (cabinasMalas.length < 3) cabinasMalas.push({ traza: t, cabina: c.indice, final: [fx, fz], sitio: c.sitio, alCentro });
      }
      /* Del nudo meta al final, cada tramo se anda en recta con el radio de una persona: el contrato de la sala. */
      const meta = noche.grafo.nudos[rumbo.nudo] as { x: number; z: number };
      let k = -1;
      for (let i = 0; i < n; i++) if (hiloDeLaCabina.ruta[i * 2] === meta.x && hiloDeLaCabina.ruta[i * 2 + 1] === meta.z) k = i;
      let seAnda = k >= 0 && hiloDeLaCabina.rutaEntera;
      for (let i = Math.max(0, k); seAnda && i < n - 1; i++) {
        const a = { x: u(hiloDeLaCabina.ruta[i * 2] as number), z: u(hiloDeLaCabina.ruta[i * 2 + 1] as number) };
        const b = { x: u(hiloDeLaCabina.ruta[i * 2 + 2] as number), z: u(hiloDeLaCabina.ruta[i * 2 + 3] as number) };
        seAnda = seAndaEnRecta(arena, a, b, u(0.35)) && sePuedeEstar(arena, b.x, b.z, u(0.35));
      }
      if (!seAnda) tramosQueNoSeAndan++;
      /* Los metros: 0 en el sitio; en el nudo de la calzada, lo que falta de verdad. */
      if (metrosHastaElSitio(noche.grafo, rumbo.campo, tramo, c.sitio.x, c.sitio.z) !== 0 || metrosHastaElSitio(noche.grafo, rumbo.campo, tramo, meta.x, meta.z) < 4) metrosMalos++;
    }
  }
  comprobar(
    `el rumbo a cada una de las ${String(cabinas)} cabinas de las 32 trazas acaba a ${String(CABINA.metros)} m o menos del centro de su zona, donde USAR descuelga (lo más lejos, ${peorAlCentro.toFixed(2)} m), por un último tramo que se anda; sus metros son 0 allí y 4 o más en el nudo de la calzada`,
    cabinas === TRAZAS * 20 && lejosDeLaZona === 0 && tramosQueNoSeAndan === 0 && metrosMalos === 0,
    { lejosDeLaZona, tramosQueNoSeAndan, metrosMalos, cabinasMalas },
  );
  const fuenteDe = (ruta: string): string => readFileSync(new URL(ruta, import.meta.url), 'utf8');
  const conElTramo = /tenderElHilo\(noche\.grafo, rumbo, yo\.x, yo\.z, hilo, tramoFinal\(noche, rumbo\.objetivo\)\)/;
  comprobar(
    'el minimapa y el plano tienden el hilo con el último tramo del objetivo, y el mapa vivo mide sus metros hasta el sitio',
    conElTramo.test(fuenteDe('../src/quiebro/hud/Minimapa.tsx')) &&
      conElTramo.test(fuenteDe('../src/quiebro/hud/Plano.tsx')) &&
      /metrosHastaElSitio\(noche\.grafo, this\.campos\.campo\(noche\.grafo, meta\), tramoFinal\(noche, objetivo\)/.test(fuenteDe('../src/quiebro/red/orientarse.ts')),
  );

  /*
   * EL OJO NUNCA DENTRO DE UNA CAJA. Con la espalda contra una pared el hombro de `encuadrar` ya cae dentro de
   * su margen y el ojo acaba detrás de la cara: en las tres salidas de avenida, dentro del cerco y de la
   * cortina de glifos, con un cuarto de la pantalla en blanco (revisión del 24-sep). Se prueba el ojo que se
   * PINTA (`ojoFueraDeLasCajas` sobre el de `encuadrar`, lo que hace `Camara.tsx`) en 16 giros: en las tres
   * salidas de las 32 trazas, pegado al cerco por todo el ancho de la avenida, y pegado a cada fachada en
   * cuatro trazas.
   */
  const PLANO_CERCANO = 0.1;
  const dentroDeUnaCaja = (o: { x: number; y: number; z: number }, cajas: readonly CajaAlta[], margen: number): boolean =>
    cajas.some((c) => o.x > c.x0 - margen && o.x < c.x1 + margen && o.z > c.z0 - margen && o.z < c.z1 + margen && o.y < c.alto + margen);
  let giros = 0;
  let dentroAntes = 0;
  let dentroDespues = 0;
  let enLasSalidas = 0;
  let detrasAntes = 0;
  let detrasDespues = 0;
  for (let t = 0; t < TRAZAS; t++) {
    const noche = ciudadDeLaNoche(ciudadDeLaMesa(t, CODIGO), CODIGO, 1, [1]);
    const arena = arenaDe(mundoDeLaLizaDeLaCiudad(noche, false).suelo);
    const cajas = noche.cajas.map(cajaParaLaCamara);
    const probar = (x: number, z: number, salida: boolean): void => {
      if (!sePuedeEstar(arena, u(x), u(z), u(0.35))) return;
      for (let k = 0; k < 16; k++) {
        const en = encuadrar(camaraNueva((k / 16) * Math.PI * 2), { x, z, dt: 1, enemigosCerca: false, blanco: null, mandaElDedo: true, remanso: 0, tactil: false, vigia: false, cajas });
        const ojo = ojoFueraDeLasCajas(x, z, en.ojo, cajas);
        giros++;
        if (dentroDeUnaCaja(en.ojo, cajas, 0)) dentroAntes++;
        /* Fuera, y a más del plano cercano de la cámara (0,1 m) de toda cara. */
        if (dentroDeUnaCaja(ojo, cajas, PLANO_CERCANO)) dentroDespues++;
        if (!salida) continue;
        enLasSalidas++;
        if (Math.max(Math.abs(en.ojo.x), Math.abs(en.ojo.z)) > BORDE_DE_LA_CIUDAD) detrasAntes++;
        if (Math.max(Math.abs(ojo.x), Math.abs(ojo.z)) > BORDE_DE_LA_CIUDAD - 0.1) detrasDespues++;
      }
    };
    for (const av of noche.ciudad.avenidas) {
      for (const extremo of [av.desde, av.hasta]) {
        if (Math.abs(extremo) < BORDE_DE_LA_CIUDAD) continue;
        const largo = Math.sign(extremo) * (BORDE_DE_LA_CIUDAD - 0.36);
        for (let d = -11; d <= 11; d++) probar(av.eje === 'x' ? largo : av.linea + d, av.eje === 'x' ? av.linea + d : largo, true);
      }
    }
    if (t % 8 !== 0) continue;
    for (const c of noche.cajas) {
      if (c.tipo !== 'edificio') continue;
      const cx = (c.x0 + c.x1) / 2;
      const cz = (c.z0 + c.z1) / 2;
      probar(cx, c.z0 - 0.36, false);
      probar(cx, c.z1 + 0.36, false);
      probar(c.x0 - 0.36, cz, false);
      probar(c.x1 + 0.36, cz, false);
    }
  }
  comprobar(
    `el ojo que se pinta nunca queda dentro de una caja ni detrás de la cara del cerco: ${String(giros)} giros (${String(enLasSalidas)} en las salidas de avenida); el de \`encuadrar\` quedaba dentro en ${String(dentroAntes)} y detrás del cerco en ${String(detrasAntes)}`,
    giros > 30000 && enLasSalidas > 5000 && dentroAntes > 0 && detrasAntes > 0 && dentroDespues === 0 && detrasDespues === 0,
    { giros, enLasSalidas, dentroAntes, detrasAntes, dentroDespues, detrasDespues },
  );
  const fuenteDeLaCamara = fuenteDe('../src/quiebro/camara/Camara.tsx');
  comprobar(
    'la cámara del juego pinta ese ojo (el de `encuadrar` pasado por `ojoFueraDeLasCajas`), salvo el Vigía',
    /const ojo = vigia \? encuadrado\.ojo : ojoFueraDeLasCajas\(cuerpo\.x, cuerpo\.z, encuadrado\.ojo, cajas\);/.test(fuenteDeLaCamara) &&
      /const alHombro: EncuadreDeLaCamara = ojo === encuadrado\.ojo \? encuadrado : \{ \.\.\.encuadrado, ojo \};/.test(fuenteDeLaCamara),
  );

  /*
   * EL HUD SE LEE DELANTE DE LA CORTINA. El reloj claro quedaba sobre un fondo de luminancia media 160 y la
   * etiqueta del aguante, al 62 %, sobre 138 (revisión del 24-sep). Todo texto que va suelto sobre la escena
   * lleva la sombra de noche `--q-halo` pegada a la letra, la primera de su lista (la que se pinta encima);
   * la cifra del Foco, un trazo de noche bajo el relleno; y los grupos (el reloj, los vitales y el botín), un
   * fondo de noche difuminado (`--q-bruma`).
   */
  const css = fuenteDe('../src/quiebro/hud/hud.css');
  const regla = (selector: string): string => {
    const i = css.indexOf(`\n${selector} {`);
    return i < 0 ? '' : css.slice(i, css.indexOf('\n}', i));
  };
  const sueltos = ['.q-aguante .pie', '.q-reloj .etiqueta', '.q-reloj .cifra', '.q-reloj .cifra.aprieta', '.q-brujula .punto', '.q-botin .esquirlas', '.q-botin .mas', '.q-botin .monedas', '.q-botin .puntos', '.q-rotulo.pista', '.q-teclas'];
  const sinHalo = sueltos.filter((selector) => !/\n  text-shadow: var\(--q-halo\)[,;]/.test(regla(selector)));
  const halo =
    /\n  --q-halo: 0 0 2px rgba\(2, 6, 7, 0\.95\), 0 0 5px rgba\(2, 6, 7, 0\.85\), 0 0 10px rgba\(2, 6, 7, 0\.6\);/.test(regla('.quiebro-raiz')) &&
    /\n  --q-bruma: radial-gradient\(closest-side, rgba\(3, 7, 9, 0\.55\), rgba\(3, 7, 9, 0\)\);/.test(regla('.quiebro-raiz'));
  const foco = /paint-order: stroke;/.test(regla('.q-foco .cifra')) && /stroke: rgba\(2, 6, 7, 0\.9\);/.test(regla('.q-foco .cifra'));
  const sinBruma = ['.q-reloj', '.q-vitales', '.q-botin'].filter((selector) => !/\n  background: var\(--q-bruma\);/.test(regla(selector)));
  comprobar(
    `lo que va suelto sobre la escena (${String(sueltos.length)} textos y la cifra del Foco) lleva la sombra de noche pegada a la letra, primera de su lista, y sus grupos un fondo de noche: se lee también delante de la cortina de glifos`,
    halo && sinHalo.length === 0 && foco && sinBruma.length === 0,
    { halo, sinHalo, foco, sinBruma },
  );
}

/* ─────────────────────────────── 14. El rayo en los mandos ─────────────────────────────── */

/*
 * EL RAYO EN EL CLIENTE, frente MANDOS (docs/quiebro/EL-RAYO.md §1 y §3; el contrato del rayo, §5.1). La sala
 * todavía no cumple el tiro (fase 0): la partida se prueba con uno DE JUGUETE sobre la liza del diseño, con sus
 * propios ids (30 y 31: los reservados del Quiebro, 12 y 13, son aquí el remate y el descolgar), la tabla del
 * §1.2 y un espía en `efectos.rayo`. Lo que la sala hará con el cable es de REGLAS; aquí, que el cable dice lo
 * que el contrato promete.
 */
paso('14. El rayo en los mandos: el gesto, el cable, el apuntado, la cámara, la mira y los botones');
{
  const sinComentariosDe = (x: string): string => x.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  /* ── Lo que apuntan las manos ── */
  const m = new EstadoDeLosMandos();
  m.pulsar('rayo', 100);
  const cargando = m.rayoDesde;
  const enLaCola = m.tomarPulsaciones().length;
  m.soltarRayo(640, 17);
  const soltado = m.tomarRayoSoltado();
  const otraVez = m.tomarRayoSoltado();
  comprobar(
    'el RAYO se mantiene: pulsar lo carga (sin pasar por la cola) y SOLTAR deja un disparo, uno, con las dos horas y el blanco que se veía',
    cargando === 100 && enLaCola === 0 && soltado !== null && soltado.desde === 100 && soltado.hasta === 640 && soltado.blanco === 17 && otraVez === null && m.rayoDesde === null,
    { cargando, enLaCola, soltado, otraVez },
  );
  m.soltarRayo(700, 3);
  const sinCarga = m.tomarRayoSoltado();
  m.pulsar('rayo', 800);
  m.cancelarRayo();
  m.soltarRayo(900, 3);
  const trasCancelar = m.tomarRayoSoltado();
  m.pulsar('rayo', 1000);
  m.soltarRayo(1100, 0);
  m.soltarTodo();
  const trasIrse = m.tomarRayoSoltado();
  comprobar(
    'soltar sin carga no es nada; cancelar ANULA (el soltar de después no dispara); e irse tira un disparo que aún no se mandó',
    sinCarga === null && trasCancelar === null && trasIrse === null,
    { sinCarga, trasCancelar, trasIrse },
  );
  m.pulsar('rayo', 2000);
  m.pulsar('golpe', 2010);
  m.pulsar('empellon', 2020);
  m.pulsar('usar', 2030);
  m.pulsar('aviso', 2040);
  const mientras = m.tomarPulsaciones().map((p) => p.boton);
  const usarMientras = m.usarDesde;
  m.pulsar('quiebro', 2050);
  const conQuiebro = m.tomarPulsaciones().map((p) => p.boton);
  comprobar(
    'mientras se carga, GOLPE, EMPELLÓN y USAR se tiran (no rompen la carga), AVISO pasa, y QUIEBRO CANCELA la carga y esquiva',
    mientras.join() === 'aviso' && usarMientras === null && conQuiebro.join() === 'quiebro' && m.rayoDesde === null,
    { mientras, usarMientras, conQuiebro, rayoDesde: m.rayoDesde },
  );

  /* ── El apuntado, en la pantalla ── */
  const ojoDe = (en: EncuadreDeLaCamara, aspecto = 844 / 390): OjoDelRayo => {
    const o = ojoNuevo();
    const fx = en.mira.x - en.ojo.x;
    const fy = en.mira.y - en.ojo.y;
    const fz = en.mira.z - en.ojo.z;
    const lf = Math.hypot(fx, fy, fz);
    o.x = en.ojo.x;
    o.y = en.ojo.y;
    o.z = en.ojo.z;
    o.fx = fx / lf;
    o.fy = fy / lf;
    o.fz = fz / lf;
    /* La derecha es f × arriba, y el arriba de la cámara, derecha × f (lo que hace `lookAt`). */
    const rx = -o.fz;
    const rz = o.fx;
    const lr = Math.hypot(rx, rz);
    o.rx = rx / lr;
    o.ry = 0;
    o.rz = rz / lr;
    o.ux = o.ry * o.fz - o.rz * o.fy;
    o.uy = o.rz * o.fx - o.rx * o.fz;
    o.uz = o.rx * o.fy - o.ry * o.fx;
    o.tanMedio = Math.tan((en.fov * Math.PI) / 360);
    o.aspecto = aspecto;
    return o;
  };
  const situacion = { dt: 1, enemigosCerca: false, blanco: null, mandaElDedo: true, remanso: 0, tactil: true, vigia: false, cajas: [] as CajaAlta[] };
  const ojoEn = (x: number, z: number, giro: number, carga = 0): OjoDelRayo => ojoDe(encuadrar(camaraNueva(giro), { ...situacion, x, z, carga }));
  const alNorte = ojoEn(0, 0, 0);
  const sinCajas = new Int32Array(0);
  /* A 4 m y un poco a la izquierda (cerca en el suelo); a 14 m justo bajo la mira (lejos, pero es a lo que se apunta). */
  const cerca = { numero: 20, x: -1.4, z: -4 };
  const bajoLaMira = { numero: 21, x: HOMBRO_M, z: -14 };
  const base = { ojo: alNorte, x: 0, z: 0, alcance: 24, radio: RADIO_DE_ENGANCHE, anterior: 0, cuerpos: sinCajas };
  const enPantalla = enPantallaNuevo();
  proyectar(alNorte, cerca.x, 1.25, cerca.z, enPantalla);
  const uCerca = enPantalla.u;
  comprobar(
    'el blanco del rayo es el que cae más cerca de la mira EN LA PANTALLA (no el más cercano en el suelo), y sólo si el nivel de ahora lo alcanza',
    elegirBlancoDelRayo(base, [cerca, bajoLaMira]) === 21 && elegirBlancoDelRayo({ ...base, alcance: 12 }, [cerca, bajoLaMira]) === 0 && Math.abs(uCerca) > RADIO_DE_ENGANCHE,
    { conAlcance24: elegirBlancoDelRayo(base, [cerca, bajoLaMira]), conAlcance12: elegirBlancoDelRayo({ ...base, alcance: 12 }, [cerca, bajoLaMira]), uCerca },
  );
  const pared = new Int32Array([u(-3), u(-9), u(3), u(-8)]);
  const entrada = { ...base, radio: alNorte.aspecto + 0.1, alcance: 12 };
  comprobar(
    'tras una pared no se engancha; y al EMPEZAR (la pantalla entera) sale el más a mano de la pantalla',
    elegirBlancoDelRayo({ ...base, cuerpos: pared }, [bajoLaMira]) === 0 && elegirBlancoDelRayo(entrada, [cerca, bajoLaMira]) === 20,
  );
  /*
   * La histéresis: con la mira un poco más cerca del otro, el que ya estaba se queda (y sin él de antes, sale el otro:
   * es la ventaja la que lo sostiene); con la mira encima del otro, cambia.
   */
  const a = { numero: 30, x: 0.3, z: -12 };
  const rival = { numero: 31, x: 1.8, z: -12 };
  const hacia = (f: number): OjoDelRayo => ojoEn(0, 0, giroParaApuntar(0, 0, a.x + (rival.x - a.x) * f, a.z, HOMBRO_M));
  const cercaDelRival = hacia(0.6);
  proyectar(cercaDelRival, a.x, 1.25, a.z, enPantalla);
  const dA = Math.hypot(enPantalla.u, enPantalla.v);
  proyectar(cercaDelRival, rival.x, 1.25, rival.z, enPantalla);
  const dRival = Math.hypot(enPantalla.u, enPantalla.v);
  const seQueda = elegirBlancoDelRayo({ ...base, ojo: cercaDelRival, anterior: 30 }, [rival, a]);
  const sinAnterior = elegirBlancoDelRayo({ ...base, ojo: cercaDelRival, anterior: 0 }, [a, rival]);
  const cambia = elegirBlancoDelRayo({ ...base, ojo: hacia(1), anterior: 30 }, [a, rival]);
  comprobar(
    'con dos blancos casi igual de cerca de la mira no salta: el que ya estaba tiene ventaja; con la mira claramente sobre el otro, cambia',
    dRival < dA && dA - dRival < HISTERESIS_DEL_BLANCO && seQueda === 30 && sinAnterior === 31 && cambia === 31,
    { dA, dRival, seQueda, sinAnterior, cambia },
  );
  /* El giro que pone al blanco bajo la mira, con la cámara del juego (el hombro a 0,7 m). */
  let peorU = 0;
  let giros = 0;
  for (const [bx, bz] of [
    [2, -3],
    [-5, -6],
    [8, 2],
    [-20, -30],
    [0, 40],
    [30, -1],
  ] as const) {
    const g = giroParaApuntar(0, 0, bx, bz, HOMBRO_M);
    const o = ojoEn(0, 0, g);
    if (proyectar(o, bx, 1.5, bz, enPantalla)) {
      giros++;
      peorU = Math.max(peorU, Math.abs(enPantalla.u));
    }
  }
  const sinHombro = ojoEn(0, 0, Math.atan2(2, 3));
  proyectar(sinHombro, 2, 1.5, -3, enPantalla);
  comprobar(
    'el giro de entrada pone al blanco bajo la mira con el hombro a 0,7 m (y sin tenerlo en cuenta se desvía): la mira cae encima en los seis',
    giros === 6 && peorU < 0.01 && Math.abs(enPantalla.u) > 0.05,
    { giros, peorU, sinHombro: enPantalla.u },
  );
  comprobar(
    'el imán: el dedo frena encima del blanco y nada fuera de su radio; la vista se deja caer hacia él, menos que lo que falta, y nada fuera',
    friccionDelIman(0) === FRICCION_EN_EL_BLANCO &&
      friccionDelIman(RADIO_DEL_IMAN) === 1 &&
      friccionDelIman(RADIO_DEL_IMAN * 0.5) > FRICCION_EN_EL_BLANCO &&
      friccionDelIman(RADIO_DEL_IMAN * 0.5) < 1 &&
      tironDelIman(0.05, 1 / 60) > 0 &&
      tironDelIman(0.05, 1 / 60) < 0.05 &&
      tironDelIman(-0.05, 1 / 60) < 0 &&
      tironDelIman(RADIO_DEL_IMAN * 1.01, 1 / 60) === 0 &&
      casi(desvioDeGiro(0.1, 0.3), 0.2) &&
      casi(desvioDeGiro(3.1, -3.1), 2 * Math.PI - 6.2),
  );
  const apunte = apuntadoNuevo();
  const libre = apuntarPorLaMira(alNorte, 0, 0, 16, 0.05, sinCajas, apunte);
  const aLibre = { ...apunte };
  proyectar(alNorte, aLibre.x, 1.5, aLibre.z, enPantalla);
  const uLibre = enPantalla.u;
  const conPared = apuntarPorLaMira(alNorte, 0, 0, 16, 0.05, pared, apunte);
  const aPared = { ...apunte };
  /* Un poste en el camino del CUERPO que la línea de la mira (0,7 m a la derecha) no toca: el rayo se para en él igual. */
  const poste = new Int32Array([u(-0.3), u(-6), u(0.35), u(-5)]);
  const conPoste = apuntarPorLaMira(alNorte, 0, 0, 16, 0.05, poste, apunte);
  comprobar(
    'sin blanco, el rayo va por la línea de la mira: al alcance del nivel desde el cuerpo y bajo la mira; con una pared delante, o un poste en el camino del cuerpo que la mira no ve, se para en él',
    libre &&
      !aLibre.choca &&
      casi(Math.hypot(aLibre.x, aLibre.z), 16, 0.01) &&
      Math.abs(uLibre) < 0.01 &&
      conPared &&
      aPared.choca &&
      Math.hypot(aPared.x, aPared.z) < 9.1 &&
      conPoste &&
      apunte.choca &&
      Math.hypot(apunte.x, apunte.z) < 5.2,
    { aLibre, uLibre, aPared, poste: { ...apunte } },
  );

  /* ── La cámara ── */
  const quieta = encuadrar(camaraNueva(0), { ...situacion, x: 0, z: 0 });
  const llena = encuadrar(camaraNueva(0), { ...situacion, x: 0, z: 0, carga: 1 });
  const media = encuadrar(camaraNueva(0), { ...situacion, x: 0, z: 0, carga: 0.5 });
  const enPc = encuadrar(camaraNueva(0), { ...situacion, x: 0, z: 0, tactil: false, carga: 1 });
  comprobar(
    'el zoom del rayo cierra el campo hasta 10° (75 → 65 en el teléfono, 70 → 60 en PC) y NO acerca la cámara: el ojo y la mira, los mismos',
    FOV_DE_LA_CARGA === 10 &&
      llena.fov === FOV_MOVIL - 10 &&
      media.fov === FOV_MOVIL - 5 &&
      enPc.fov === 60 &&
      llena.ojo.x === quieta.ojo.x &&
      llena.ojo.y === quieta.ojo.y &&
      llena.ojo.z === quieta.ojo.z &&
      llena.mira.z === quieta.mira.z,
    { llena: llena.fov, media: media.fov, enPc: enPc.fov },
  );
  const tiempoHasta = (desde: number, quiere: number, umbral: (z: number) => boolean): number => {
    let z = desde;
    for (let t = 0; t < 2000; t += 5) {
      if (umbral(z)) return t;
      z = suavizarElZoom(z, quiere, 0.005);
    }
    return Number.POSITIVE_INFINITY;
  };
  const entra = tiempoHasta(0, 1, (z) => z >= 0.95);
  const sale = tiempoHasta(1, 0, (z) => z <= 0.05);
  comprobar(
    'el zoom entra en ≈0,25 s y sale en ≈0,12 s; al pulsar ya entra una parte, y lleno sólo en el pleno',
    entra >= 200 && entra <= 300 && sale >= 90 && sale <= 150 && zoomDeLaCarga(true, 0) === ZOOM_AL_EMPEZAR && ZOOM_AL_EMPEZAR > 0 && zoomDeLaCarga(true, 1) === 1 && zoomDeLaCarga(false, 1) === 0 && zoomDeLaCarga(true, 0.5) < 1,
    { entra, sale },
  );
  const golpes = [0, 30, 75, 120, 149, 150, 400].map(retrocesoDelDisparo);
  comprobar(
    'el disparo da un golpe de campo de −2° que vuelve en 150 ms; y con el campo cerrado el dedo gira menos, en la proporción tan(fov/2)',
    golpes[0] === -2 && golpes.slice(0, 5).every((g, i, l) => i === 0 || g > (l[i - 1] as number)) && golpes[5] === 0 && golpes[6] === 0 && sensibilidadDelZoom(75, 75) === 1 && casi(sensibilidadDelZoom(65, 75), Math.tan((65 * Math.PI) / 360) / Math.tan((75 * Math.PI) / 360)) && sensibilidadDelZoom(65, 75) < 0.9,
    golpes,
  );
  const camara = sinComentariosDe(readFileSync(new URL('../src/quiebro/camara/Camara.tsx', import.meta.url), 'utf8'));
  comprobar(
    'la cámara del juego: la automática no pelea mientras se carga, el zoom suavizado va al encuadre, el dedo con la sensibilidad y el imán, y apunta con ESTA cámara',
    /mandaElDedo: p\.mandos\.mandaElDedo\(ahora\) \|\| cargando/.test(camara) &&
      /carga: zoom\.current/.test(camara) &&
      /zoom\.current = suavizarElZoom\(zoom\.current, zoomDeLaCarga\(cargando, rayo\.c\), paso\)/.test(camara) &&
      /e\.giro \+= giro\.giro \* sensibilidad \* \(cargando \? friccionDelIman\(desvio\) : 1\)/.test(camara) &&
      /p\.partida\.apuntarElRayo\(ojoDelRayo\.current, ahora, girando\)/.test(camara) &&
      /retrocesoDelDisparo\(ahora - disparo\.t\)/.test(camara),
  );
  /*
   * El giro de entrada: una curva SUAVE de 180 ms (arranca y llega con velocidad cero), no una exponencial que arranca
   * a toda velocidad (con τ = 50 ms, el 28 % del giro en el primer fotograma: un latigazo de 18° en uno de 63°).
   */
  const curvaDeEntrada = (desvio0: number, velocidadDelBlanco: number): { pasos: number[]; falta: number } => {
    const g = giroDeEntrada(0);
    let giro = 0;
    let quiere = desvio0;
    const pasos: number[] = [];
    let falta = quiere - giro;
    pasoDelGiroDeEntrada(g, 7, quiere - giro, 0);
    for (let i = 1; i < 40; i++) {
      quiere += velocidadDelBlanco / 60;
      const p = pasoDelGiroDeEntrada(g, 7, quiere - giro, (i * 1000) / 60);
      if (p === null) break;
      pasos.push(p / desvio0);
      giro += p;
      falta = quiere - giro;
    }
    return { pasos, falta };
  };
  const quieta63 = curvaDeEntrada((63 * Math.PI) / 180, 0);
  const huye = curvaDeEntrada((63 * Math.PI) / 180, 0.6);
  const rehace = giroDeEntrada(0);
  pasoDelGiroDeEntrada(rehace, 7, 1, 0);
  pasoDelGiroDeEntrada(rehace, 7, 1, 50);
  const alCambiar = pasoDelGiroDeEntrada(rehace, 9, 1, 100);
  const trasCambiar = pasoDelGiroDeEntrada(rehace, 9, 1, 100 + 1000 / 60);
  const tarde = giroDeEntrada(0);
  const fueraDeLaVentana = pasoDelGiroDeEntrada(tarde, 11, 1, GIRO_DE_ENTRADA_MS + 40);
  comprobar(
    'el giro de entrada es SUAVE: el primer fotograma no llega al 12 % del giro y ninguno pasa del 20 %; a los ≈180 ms está en el blanco, también si el blanco se mueve; un blanco nuevo dentro de la ventana empieza otra curva, y fuera de ella (o sin blanco) no gira la entrada: tira el imán',
    (quieta63.pasos[0] ?? 1) < 0.12 &&
      Math.max(...quieta63.pasos.map(Math.abs)) < 0.2 &&
      quieta63.pasos.length >= 10 &&
      quieta63.pasos.length <= 12 &&
      Math.abs(quieta63.falta) < 1e-9 &&
      Math.abs(huye.falta) < 1e-9 &&
      alCambiar === 0 &&
      trasCambiar !== null &&
      trasCambiar > 0 &&
      trasCambiar < 0.12 &&
      fueraDeLaVentana === null &&
      pasoDelGiroDeEntrada(giroDeEntrada(0), 0, 1, 50) === null,
    { primero: quieta63.pasos[0], pasos: quieta63.pasos.length, falta: quieta63.falta, huye: huye.falta, alCambiar, trasCambiar, fueraDeLaVentana },
  );
  comprobar(
    'y la cámara del juego gira con ESA curva al empezar a cargar (la entrada manda mientras dura; luego, el imán)',
    /entrada\.current = giroDeEntrada\(ahora\);/.test(camara) &&
      /const deLaEntrada = entrada\.current === null \? null : pasoDelGiroDeEntrada\(entrada\.current, rayo\.blanco, desvio, ahora\);\s*e\.giro \+= deLaEntrada \?\? tironDelIman\(desvio, paso\);/.test(camara),
  );

  /* ── La partida, con un tiro de juguete, contra el enchufe de mentira ── */
  const APUNTAR = 30;
  const SOLTAR = 31;
  const CARGANDO = 60;
  const TABLA = [
    { desdeMs: 0, area: 3, alcance: 16, recargaTics: 60 },
    { desdeMs: 300, area: 2, alcance: 24, recargaTics: 72 },
    { desdeMs: 750, area: 1, alcance: 32, recargaTics: 86 },
    { desdeMs: 1300, area: 0, alcance: 45, recargaTics: 100 },
  ] as const;
  const tiro: TiroDeclarado = {
    apuntar: APUNTAR,
    soltar: SOLTAR,
    puesta: puesta(CARGANDO, 40),
    niveles: TABLA.map((n, i) => ({ desdeMs: n.desdeMs, proyectil: 90 + i, ancho: u(0.2), area: u(n.area), efectoDelArea: n.area === 0 ? null : efecto(10, puesta(EST.tocado, 10), u(1)), recargaTics: n.recargaTics })),
    enganche: { radio: u(45), conoRumbos: 8, holgura: u(0.5) },
    holgura: u(0.6),
    cargaMaximaMs: 2000,
  };
  const CON_TIRO: LizaDeclarada = {
    ...LIZA,
    asientos: LIZA.asientos.map((r) => ({ ...r, tiro })),
    estados: [...LIZA.estados, { id: CARGANDO, bloqueaPaso: true, bloqueaAccion: false, cancelaCon: [], seCortaConDano: true }],
    proyectiles: [...LIZA.proyectiles, ...TABLA.map((n, i) => ({ id: 90 + i, apuntarTics: 1, balas: 1, cadaTics: 0, velocidad: u(400), radio: u(0.05), alcance: u(n.alcance), efecto: efecto(10, puesta(EST.tocado, 10)) }))],
  };
  const leido = leerElTiro(tiro, CON_TIRO.proyectiles);
  const relojes = new RelojesDeMentira();
  const mandos = new EstadoDeLosMandos();
  const enchufes: EnchufeDeMentira[] = [];
  const partida = new Partida({
    direccion: 'ws://x/api/arcade/mesas/QUIEB/liza',
    llave: 'k1',
    fabrica: (d) => {
      const en = new EnchufeDeMentira(d);
      enchufes.push(en);
      return en;
    },
    relojes,
    mandos,
  });
  const llamadas: string[] = [];
  const soltados: DisparoDelRayo[] = [];
  const cargas: number[] = [];
  const espia = (quien: string): EfectosDelRayo => ({
    empezarCarga: (q) => void llamadas.push(`${quien}:empezar ${String(q)}`),
    actualizarCarga: (q, es: Readonly<EstadoDelRayo>) => {
      llamadas.push(`${quien}:actualizar ${String(q)}`);
      cargas.push(es.c);
    },
    cancelarCarga: (q) => void llamadas.push(`${quien}:cancelar ${String(q)}`),
    soltar: (d) => {
      llamadas.push(`${quien}:soltar ${String(d.quien)}`);
      soltados.push(d);
    },
    estallar: () => void llamadas.push(`${quien}:estallar`),
  });
  const efectos: { rayo: EfectosDelRayo; boca: BocaDe | null } = { rayo: espia('a'), boca: null };
  partida.efectos = efectos;
  partida.ponerLaDeclaracion(CON_TIRO, { tipo: 'barrio', barrio: BARRIO }, 'a1');
  partida.asegurarElCanal(true);
  const e = enchufes[0] as EnchufeDeMentira;
  e.abrir();
  const origen = relojes.t;
  e.llega({ t: 'dentro', yo: 1, k: 1000, x: NACE.x, z: NACE.z, r: 0, hz: 20 });
  e.llega({ t: 'tic', k: 1000, ev: [{ e: 'fase', clave: 'n1-o1', modo: 2, limite: ID_DE_LIMITE_EN_LA_LIZA.glorieta48, relojMs: 0, encuentroTics: 3000 }] });
  e.llega({ t: 'eco', c: 0, k: 1000, ms: 50_000 });
  const fotograma = (ms: number): void => {
    relojes.t += ms;
    partida.fotograma(relojes.t, ms / 1000);
  };
  const cuantas = (x: string): number => llamadas.filter((l) => l === x).length;
  const aquisDesde = (n: number): Aqui[] => e.leidos().slice(n).filter((x): x is Aqui => x.t === 'aqui');
  const kAhora = (): number => Math.max(1000, Math.round(partida.ticDeLaSala(relojes.t)));
  fotograma(1);
  for (let i = 0; i < 4; i++) fotograma(16);
  const yoX = NACE.x / UNO;
  const yoZ = NACE.z / UNO;
  /* Un Celador a 6 m, hacia un lado con calle libre, y la cámara mirándolo. */
  /* Hacia un lado que NO sea el norte (el cuerpo nace mirando al norte: así se ve que al cargar se vuelve hacia la mira). */
  const dir = [Math.PI / 2, -Math.PI / 2, Math.PI, (3 * Math.PI) / 4, (-3 * Math.PI) / 4].find((ang) => libreHacia(NACE.x, NACE.z, ang, 7)) ?? Math.PI / 2;
  const cel = { x: yoX + Math.sin(dir) * 6, z: yoZ - Math.cos(dir) * 6 };
  e.llega({ t: 'tic', k: kAhora(), ev: [{ e: 'nace', id: 16, clase: 1, x: Math.round(cel.x * 100), z: Math.round(cel.z * 100), r: 128 }] });
  e.llega({ t: 'foto', k: kAhora(), p: [[16, Math.round(cel.x * 100), Math.round(cel.z * 100), 128, 0, 0]] });
  partida.giroDeLaCamara = dir;
  fotograma(16);
  const giroAlCelador = giroParaApuntar(yoX, yoZ, cel.x, cel.z, HOMBRO_M);
  const ojoAlCelador = ojoEn(yoX, yoZ, giroAlCelador);

  /* Cargar, empujando la palanca: plantado, `[apuntar, ms, 0]` con el mismo `ms`, y los efectos una vez por fotograma. */
  const antesDeCargar = e.leidos().length;
  const llamadasAntes = llamadas.length;
  const t0 = relojes.t - 2.5;
  mandos.ponerPalanca(0, 1, relojes.t);
  mandos.pulsar('rayo', t0);
  const cargasDelCuerpo: number[] = [];
  let marcos = 0;
  for (let i = 0; i < 50; i++) {
    fotograma(16);
    marcos++;
    partida.apuntarElRayo(ojoAlCelador, relojes.t, false);
    cargasDelCuerpo.push(partida.pintadoDe(1)?.carga ?? -1);
  }
  const gestoCargando = partida.pintadoDe(1)?.gesto;
  const aquisCargando = aquisDesde(antesDeCargar);
  const msPulsar = Math.floor(t0 - origen);
  const primerAqui = aquisCargando[0];
  const actualizaciones = llamadas.slice(llamadasAntes).filter((l) => l === 'a:actualizar 1').length;
  comprobar(
    'CARGANDO, cada `aqui` lleva `[apuntar, msPulsar, 0]` con el MISMO `ms` de su evento, y el cuerpo se planta aunque la palanca empuje',
    aquisCargando.length >= 14 &&
      aquisCargando.every((x) => x.a !== 0 && x.a[0] === APUNTAR && x.a[1] === msPulsar && x.a[2] === 0) &&
      primerAqui !== undefined &&
      aquisCargando.every((x) => x.x === primerAqui.x && x.z === primerAqui.z),
    aquisCargando.slice(0, 3),
  );
  comprobar(
    'y en el acto: los efectos empiezan UNA vez, actualizan UNA vez por fotograma con la carga que sube, y el cuerpo carga (`cargar-rayo`, con su carga)',
    cuantas('a:empezar 1') === 1 &&
      actualizaciones === marcos &&
      cargas.length >= 2 &&
      (cargas[cargas.length - 1] as number) > (cargas[0] as number) &&
      gestoCargando === 'cargar-rayo' &&
      (cargasDelCuerpo[cargasDelCuerpo.length - 1] as number) > (cargasDelCuerpo[0] as number) &&
      (cargasDelCuerpo[0] as number) >= 0,
    { empezar: cuantas('a:empezar 1'), actualizaciones, marcos, gestoCargando },
  );
  const rumboDeLaCarga = aquisCargando[aquisCargando.length - 1]?.r ?? -1;
  const rumboAlBlanco = rumboDeRadianes(direccionHacia(cel.x - yoX, cel.z - yoZ));
  const antesDeLaCarga = e
    .leidos()
    .slice(0, antesDeCargar)
    .filter((x): x is Aqui => x.t === 'aqui')
    .pop()?.r ?? -1;
  const vuelta = (x: number, y: number): number => Math.min(Math.abs(x - y), 256 - Math.abs(x - y));
  comprobar(
    'con la cámara mirando al Celador, la mira lo engancha y apunta a su pecho, y el cuerpo (el `r` de cada `aqui`), que miraba a otro lado, se vuelve hacia lo apuntado',
    partida.rayo.blanco === 16 && Math.hypot(partida.rayo.apuntado.x - cel.x, partida.rayo.apuntado.z - cel.z) < 0.01 && vuelta(rumboDeLaCarga, rumboAlBlanco) <= 1 && vuelta(antesDeLaCarga, rumboAlBlanco) > 16,
    { rumboDeLaCarga, rumboAlBlanco, antesDeLaCarga },
  );
  /* Los efectos se leen en CADA llamada: otro `rayo` colgado a media carga recibe lo que sigue. */
  efectos.rayo = espia('b');
  fotograma(16);
  partida.apuntarElRayo(ojoAlCelador, relojes.t, false);
  comprobar('los efectos del rayo se leen en cada llamada (el que los envuelva a media carga recibe lo que sigue)', cuantas('b:actualizar 1') === 1);

  /* Soltar: UN `[soltar, msSoltar, blanco]`, y los efectos sueltan en el acto lo predicho. */
  const t1 = relojes.t - 1;
  mandos.soltarRayo(t1, partida.rayo.blanco);
  fotograma(16);
  const gestoAlSoltar = partida.pintadoDe(1);
  const gesto1 = { gesto: gestoAlSoltar?.gesto, desde: gestoAlSoltar?.gestoDesdeMs, impacto: gestoAlSoltar?.impactoMs };
  for (let i = 0; i < 8; i++) fotograma(16);
  const trasSoltar = aquisDesde(antesDeCargar);
  const iSoltar = trasSoltar.findIndex((x) => x.a !== 0 && x.a[0] === SOLTAR);
  const elSoltar = trasSoltar[iSoltar];
  const msSoltar = Math.floor(t1 - origen);
  const cargaMs = msSoltar - msPulsar;
  const esperado = leido === null ? null : nivelDeLaCarga(leido, cargaMs);
  const rumboAlCelador = rumboDeRadianes(direccionHacia(cel.x - yoX, cel.z - yoZ));
  comprobar(
    'al SOLTAR, UN `aqui` con `[soltar, msSoltar, blanco]` justo tras la carga, mirando al blanco, y detrás los `aqui` sin acción',
    elSoltar !== undefined &&
      elSoltar.a !== 0 &&
      elSoltar.a[1] === msSoltar &&
      elSoltar.a[2] === 16 &&
      trasSoltar.filter((x) => x.a !== 0 && x.a[0] === SOLTAR).length === 1 &&
      (trasSoltar[iSoltar - 1]?.a as readonly number[] | 0 | undefined) !== undefined &&
      trasSoltar[iSoltar - 1]?.a !== 0 &&
      (trasSoltar[iSoltar - 1]?.a as readonly number[])[0] === APUNTAR &&
      Math.min(Math.abs(elSoltar.r - rumboAlCelador), 256 - Math.abs(elSoltar.r - rumboAlCelador)) <= 1 &&
      trasSoltar.slice(iSoltar + 1).length >= 2 &&
      trasSoltar.slice(iSoltar + 1).every((x) => x.a === 0),
    { elSoltar, rumboAlCelador, previo: trasSoltar[iSoltar - 1]?.a },
  );
  const d = soltados[0];
  comprobar(
    'y en el acto los efectos sueltan el rayo predicho: bala 0, su nivel y su carga (la de `msSoltar − msPulsar`), hacia el blanco, y la semilla del contrato',
    soltados.length === 1 &&
      d !== undefined &&
      esperado !== null &&
      leido !== null &&
      esperado.nivel === 3 &&
      d.bala === 0 &&
      d.quien === 1 &&
      d.nivel === esperado.nivel &&
      d.area === esperado.area &&
      casi(d.c, cargaDe(leido, cargaMs)) &&
      d.dio === true &&
      Math.hypot(d.destino.x - cel.x, d.destino.z - cel.z) < 0.01 &&
      d.semilla === semillaDelRayo(1, Math.round(t1)) &&
      d.t === t1,
    { d, cargaMs, esperado: esperado?.nivel },
  );
  comprobar(
    'el cuerpo LANZA (`lanzar-rayo`, con el impacto en el instante del disparo), la carga se apaga y la cámara ve el disparo',
    gesto1.gesto === 'lanzar-rayo' && gesto1.desde === t1 && gesto1.impacto === t1 && partida.ultimoDisparo?.t === t1 && !partida.rayo.activo && partida.rayo.nivel === 0,
    gesto1,
  );

  /*
   * La recarga: mientras la sala no cuenta la bala, no se carga otra (pasado ya el gesto de lanzar, que también lo
   * impide: así se mira la espera y no el gesto); la bala propia trae la de su nivel.
   */
  relojes.t += 500;
  fotograma(16);
  mandos.pulsar('rayo', relojes.t);
  fotograma(16);
  const enEspera = cuantas('b:empezar 1') === 0 && mandos.rayoDesde === null && !partida.leerLosBotones(relojes.t).rayo.listo;
  const nivelSalido = esperado ?? TABLA.length;
  const proyectilSalido = leido === null || esperado === null ? 0 : (leido.niveles[esperado.nivel - 1]?.proyectil ?? 0);
  e.llega({ t: 'tic', k: kAhora(), ev: [{ e: 'bala', id: 70, de: 1, p: proyectilSalido, x: Math.round(yoX * 100), z: Math.round(yoZ * 100), r: rumboAlCelador, t: msSoltar }] });
  fotograma(16);
  const recargaMs = esperado?.recargaMs ?? 0;
  const botones1 = partida.leerLosBotones(relojes.t);
  const recarga1 = { recarga: botones1.rayo.recarga, quedaMs: botones1.rayo.quedaMs, esperado: msSoltar + origen + recargaMs - relojes.t };
  mandos.pulsar('rayo', relojes.t);
  fotograma(16);
  const enRecarga = cuantas('b:empezar 1') === 0;
  relojes.t += recargaMs;
  fotograma(16);
  mandos.pulsar('rayo', relojes.t);
  fotograma(16);
  comprobar(
    'tras soltar, no se carga otro hasta que la sala cuenta la bala; la bala PROPIA trae la recarga de su nivel desde que salió; y pasada, se vuelve a cargar',
    enEspera &&
      nivelSalido !== undefined &&
      recargaMs === TABLA[2].recargaTics * 50 &&
      casi(partida.rayo.recargaHastaMs, msSoltar + origen + recargaMs, 0.001) &&
      casi(recarga1.quedaMs, recarga1.esperado, 0.001) &&
      casi(recarga1.recarga, recarga1.esperado / recargaMs, 1e-9) &&
      recarga1.recarga > 0.5 &&
      enRecarga &&
      cuantas('b:empezar 1') === 1,
    { enEspera, recarga1, enRecarga, empezadas: cuantas('b:empezar 1') },
  );

  /* Cancelar: nada por el cable, los efectos cancelan, y el soltar de después no dispara. */
  for (let i = 0; i < 4; i++) fotograma(16);
  const antesDeCancelar = e.leidos().length;
  mandos.cancelarRayo();
  for (let i = 0; i < 6; i++) fotograma(16);
  mandos.soltarRayo(relojes.t, 16);
  for (let i = 0; i < 4; i++) fotograma(16);
  const trasCancelar2 = aquisDesde(antesDeCancelar);
  comprobar(
    'CANCELAR no manda nada (el primer `aqui` va sin acción, y la sala la suelta sin disparar): los efectos cancelan una vez y no sueltan',
    cuantas('b:cancelar 1') === 1 && soltados.length === 1 && trasCancelar2.length >= 3 && trasCancelar2.every((x) => x.a === 0),
    trasCancelar2.slice(0, 3).map((x) => x.a),
  );

  /* El daño corta la carga; el QUIEBRO la cancela y esquiva; GOLPE no sale mientras. */
  mandos.pulsar('rayo', relojes.t);
  for (let i = 0; i < 4; i++) fotograma(16);
  mandos.pulsar('golpe', relojes.t);
  for (let i = 0; i < 4; i++) fotograma(16);
  const golpeMientras = aquisDesde(antesDeCancelar).some((x) => x.a !== 0 && x.a[0] === ACC.entrada);
  e.llega({ t: 'tic', k: kAhora(), ev: [{ e: 'estado', a: 1, est: EST.tocado, tics: 6, into: 0 }] });
  fotograma(16);
  const trasElDano = { cancelados: cuantas('b:cancelar 1'), rayoDesde: mandos.rayoDesde };
  mandos.soltarRayo(relojes.t, 0);
  for (let i = 0; i < 4; i++) fotograma(16);
  e.llega({ t: 'tic', k: kAhora(), ev: [{ e: 'estado', a: 1, est: 0, tics: 0, into: 0 }] });
  relojes.t += 400;
  fotograma(16);
  comprobar(
    'mientras se carga GOLPE no sale; y un golpe recibido corta la carga sin disparar (el soltar de después no es nada)',
    !golpeMientras && trasElDano.cancelados === 2 && trasElDano.rayoDesde === null && soltados.length === 1,
    { golpeMientras, trasElDano, soltados: soltados.length },
  );
  const antesDelQuiebro = e.leidos().length;
  mandos.pulsar('rayo', relojes.t);
  for (let i = 0; i < 4; i++) fotograma(16);
  mandos.pulsar('quiebro', relojes.t);
  for (let i = 0; i < 6; i++) fotograma(16);
  const trasQuiebro = aquisDesde(antesDelQuiebro);
  comprobar(
    'QUIEBRO a media carga la cancela (sin soltar) y esquiva: su `aqui` sale con la esquiva',
    cuantas('b:cancelar 1') === 3 && soltados.length === 1 && trasQuiebro.some((x) => x.a !== 0 && x.a[0] === ACC.quiebro) && !trasQuiebro.some((x) => x.a !== 0 && x.a[0] === SOLTAR),
    { cancelados: cuantas('b:cancelar 1') },
  );

  /* Un toque tan corto que se pulsa y se suelta entre dos latidos: sale igual, con su sostenida delante. */
  relojes.t += 3000;
  for (let i = 0; i < 4; i++) fotograma(16);
  const antesDelToque = e.leidos().length;
  mandos.pulsar('rayo', relojes.t - 8);
  mandos.soltarRayo(relojes.t - 2, 0);
  for (let i = 0; i < 8; i++) fotograma(16);
  const toque = aquisDesde(antesDelToque).filter((x) => x.a !== 0);
  comprobar(
    'un toque corto (pulsar y soltar entre dos latidos) no se pierde: sale su `[apuntar]` y detrás su `[soltar]`, un chispazo',
    toque.length === 2 && toque[0]?.a !== 0 && (toque[0]?.a as readonly number[])[0] === APUNTAR && (toque[1]?.a as readonly number[])[0] === SOLTAR && soltados.length === 2 && soltados[1]?.nivel === 1,
    toque.map((x) => x.a),
  );

  /* Los demás: su estado de cargar pone el gesto con la carga que crece, y su bala, el de lanzar. */
  const otroX = yoX + Math.sin(dir + Math.PI / 2) * 3;
  const otroZ = yoZ - Math.cos(dir + Math.PI / 2) * 3;
  const fotoDelOtro = (): void => e.llega({ t: 'foto', k: kAhora(), p: [[2, Math.round(otroX * 100), Math.round(otroZ * 100), 0, 0, 0]] });
  fotoDelOtro();
  fotoDelOtro();
  e.llega({ t: 'tic', k: kAhora(), ev: [{ e: 'estado', a: 2, est: CARGANDO, tics: 40, into: 0 }] });
  fotograma(16);
  const cargaDelOtro1 = { gesto: partida.pintadoDe(2)?.gesto, carga: partida.pintadoDe(2)?.carga ?? -1 };
  for (let i = 0; i < 20; i++) fotograma(16);
  fotoDelOtro();
  const cargaDelOtro2 = { gesto: partida.pintadoDe(2)?.gesto, carga: partida.pintadoDe(2)?.carga ?? -1 };
  e.llega({ t: 'tic', k: kAhora(), ev: [{ e: 'bala', id: 71, de: 2, p: 91, x: Math.round(otroX * 100), z: Math.round(otroZ * 100), r: 0, t: Math.floor(relojes.t - origen) }] });
  fotograma(16);
  const lanzaElOtro = partida.pintadoDe(2)?.gesto;
  comprobar(
    'otro jugador que carga se pinta cargando (`cargar-rayo`) con la carga que lleva en su estado; y su bala le pone el gesto de lanzar',
    cargaDelOtro1.gesto === 'cargar-rayo' && cargaDelOtro2.gesto === 'cargar-rayo' && cargaDelOtro2.carga > cargaDelOtro1.carga && cargaDelOtro1.carga >= 0 && lanzaElOtro === 'lanzar-rayo',
    { cargaDelOtro1, cargaDelOtro2, lanzaElOtro },
  );

  /* Los botones: la recarga del EMPELLÓN es la de su anuncio; QUIEBRO se enciende con un golpe hacia mí; GOLPE lleva la Tanda. */
  relojes.t += 3000;
  fotograma(16);
  mandos.pulsar('empellon', relojes.t);
  fotograma(60);
  const sinAnuncio = partida.leerLosBotones(relojes.t).empellon.recarga;
  const impactoDelEmpellon = Math.floor(relojes.t - origen) + 500;
  e.llega({ t: 'tic', k: kAhora(), ev: [{ e: 'anuncio', id: 5, de: 1, a: 16, acc: ACC.empellon, t: impactoDelEmpellon, x: Math.round(yoX * 100), z: Math.round(yoZ * 100) }] });
  fotograma(16);
  const empellon = { ...partida.leerLosBotones(relojes.t).empellon };
  const esperaDelEmpellon = impactoDelEmpellon + origen + (60 - 10) * 50 - relojes.t;
  comprobar(
    'la recarga del EMPELLÓN la pone su ANUNCIO de la sala (desde que lanzó, sus tics), no la hora de la pulsación: sin anuncio, ninguna',
    sinAnuncio === 0 && casi(empellon.quedaMs, esperaDelEmpellon, 0.001) && empellon.recarga > 0.9 && !empellon.listo,
    { sinAnuncio, empellon, esperaDelEmpellon },
  );
  const sinAmenaza = partida.leerLosBotones(relojes.t).quiebro.amenaza;
  e.llega({ t: 'tic', k: kAhora(), ev: [{ e: 'anuncio', id: 9, de: 16, a: 1, acc: ACC.tandaCelador, t: Math.floor(relojes.t - origen) + 400, x: Math.round(cel.x * 100), z: Math.round(cel.z * 100) }] });
  fotograma(16);
  const amenaza1 = partida.leerLosBotones(relojes.t).quiebro.amenaza;
  relojes.t += 250;
  fotograma(16);
  const amenaza2 = partida.leerLosBotones(relojes.t).quiebro.amenaza;
  relojes.t += 400;
  fotograma(16);
  const amenaza3 = partida.leerLosBotones(relojes.t).quiebro.amenaza;
  comprobar(
    'QUIEBRO se enciende mientras un golpe viene hacia mí (por dónde va su anillo, de 0 al impacto) y se apaga pasado',
    sinAmenaza === -1 && amenaza1 >= 0 && amenaza1 < 0.2 && amenaza2 > 0.6 && amenaza2 <= 1 && amenaza3 === -1,
    { sinAmenaza, amenaza1, amenaza2, amenaza3 },
  );
  relojes.t += 4000;
  fotograma(16);
  mandos.pulsar('golpe', relojes.t);
  fotograma(60);
  const impactoDeLaEntrada = Math.floor(relojes.t - origen) + 300;
  e.llega({ t: 'tic', k: kAhora(), ev: [{ e: 'anuncio', id: 11, de: 1, a: 16, acc: ACC.entrada, t: impactoDeLaEntrada, x: Math.round(yoX * 100), z: Math.round(yoZ * 100) }] });
  fotograma(16);
  const tandaAntes = { ...partida.leerLosBotones(relojes.t).golpe };
  relojes.t += 250;
  fotograma(16);
  const tandaEnLaVentana = { ...partida.leerLosBotones(relojes.t).golpe };
  relojes.t += 700;
  fotograma(16);
  const tandaRota = { ...partida.leerLosBotones(relojes.t).golpe };
  comprobar(
    'GOLPE lleva el paso de la Tanda: dada la Entrada, 1 de 4, y el siguiente se enciende mientras su ventana está abierta; pasada, se rompe',
    tandaAntes.paso === 1 && tandaAntes.de === 4 && !tandaAntes.ventana && tandaEnLaVentana.paso === 1 && tandaEnLaVentana.ventana && tandaRota.paso === 0 && !tandaRota.ventana,
    { tandaAntes, tandaEnLaVentana, tandaRota },
  );

  /*
   * NO SE EMPIEZA A CARGAR (EL-RAYO.md §1.1, paso 6): tocado o descolocado, con un golpe propio anunciado sin resolver
   * (aunque su gesto ya no corra), fuera de combate o sin cuerpo. Con un control al lado —libre, en el mismo sitio, SÍ
   * carga—, para que el «no» no sea verde por nada. Los modos de fase: 1 la calma, 2 el encuentro (`CODIGO_DE_MODO`).
   */
  relojes.t += 6000;
  for (let i = 0; i < 4; i++) fotograma(16);
  const intentarCargar = (): boolean => {
    const antes = cuantas('b:empezar 1');
    const n0 = e.leidos().length;
    mandos.pulsar('rayo', relojes.t);
    for (let i = 0; i < 3; i++) fotograma(16);
    const empezo = cuantas('b:empezar 1') > antes || aquisDesde(n0).some((x) => x.a !== 0 && x.a[0] === APUNTAR);
    mandos.cancelarRayo();
    for (let i = 0; i < 3; i++) fotograma(16);
    return empezo;
  };
  const estadoPropio = (est: number, tics: number): void => e.llega({ t: 'tic', k: kAhora(), ev: [{ e: 'estado', a: 1, est, tics, into: 0 }] });
  const faseNueva = (clave: string, modo: number): void =>
    e.llega({ t: 'tic', k: kAhora(), ev: [{ e: 'fase', clave, modo, limite: ID_DE_LIMITE_EN_LA_LIZA.glorieta48, relojMs: 0, encuentroTics: modo === 2 ? 3000 : 0 }] });
  const libreCarga = intentarCargar();
  estadoPropio(EST.tocado, 20);
  const tocadoCarga = intentarCargar();
  estadoPropio(EST.descolocado, 20);
  const descolocadoCarga = intentarCargar();
  estadoPropio(0, 0);
  /* Un golpe mío anunciado, y otro recibido que corta mi gesto pero no el anuncio: sigue sin resolver. */
  e.llega({ t: 'tic', k: kAhora(), ev: [{ e: 'anuncio', id: 41, de: 1, a: 16, acc: ACC.entrada, t: Math.floor(relojes.t - origen) + 1500, x: Math.round(yoX * 100), z: Math.round(yoZ * 100) }] });
  estadoPropio(EST.tocado, 2);
  estadoPropio(0, 0);
  const conGolpeCarga = intentarCargar();
  relojes.t += 2500;
  fotograma(16);
  const resueltoCarga = intentarCargar();
  faseNueva('n1-c1', 1);
  const enCalmaCarga = intentarCargar();
  faseNueva('n1-o2', 2);
  for (let i = 0; i < 3; i++) fotograma(16);
  comprobar(
    'no se EMPIEZA a cargar tocado, ni descolocado, ni con un golpe propio anunciado sin resolver (aunque su gesto ya no corra), ni fuera de combate; libre, en el mismo sitio, sí (y pasado el golpe, también)',
    libreCarga && !tocadoCarga && !descolocadoCarga && !conGolpeCarga && resueltoCarga && !enCalmaCarga,
    { libreCarga, tocadoCarga, descolocadoCarga, conGolpeCarga, resueltoCarga, enCalmaCarga },
  );
  /*
   * Y una carga EN CURSO se corta en el acto (sin esperar al fotograma) y sin disparar: al cambiar de fase —también a
   * otra de combate: la sala suelta la sostenida, y si no, se seguiría mandando la de antes—, al irse al fondo y al
   * quedarse sin cuerpo; y sin cuerpo no se vuelve a cargar.
   */
  const cargarYVer = (): boolean => {
    mandos.pulsar('rayo', relojes.t);
    for (let i = 0; i < 4; i++) fotograma(16);
    return partida.rayo.activo;
  };
  const soltadosAntesDeCortar = soltados.length;
  const leidosAntesDeCortar = e.leidos().length;
  const c0 = cuantas('b:cancelar 1');
  const cargaAntesDeLaFase = cargarYVer();
  faseNueva('n1-o3', 2);
  const cortaLaFase = cuantas('b:cancelar 1') === c0 + 1;
  for (let i = 0; i < 3; i++) fotograma(16);
  const sigueTrasLaFase = partida.rayo.activo || mandos.rayoDesde !== null;
  const c1 = cuantas('b:cancelar 1');
  const cargaAntesDelFondo = cargarYVer();
  partida.callar(true);
  const cortaElFondo = cuantas('b:cancelar 1') === c1 + 1;
  partida.callar(false);
  mandos.cancelarRayo();
  for (let i = 0; i < 3; i++) fotograma(16);
  const c2 = cuantas('b:cancelar 1');
  const cargaAntesDeSalir = cargarYVer();
  e.llega({ t: 'tic', k: kAhora(), ev: [{ e: 'sale', a: 1, zona: 30 }] });
  const cortaAlSalir = cuantas('b:cancelar 1') === c2 + 1;
  for (let i = 0; i < 3; i++) fotograma(16);
  const sinCuerpoCarga = intentarCargar();
  const soltaronAlCortar = aquisDesde(leidosAntesDeCortar).some((x) => x.a !== 0 && x.a[0] === SOLTAR);
  comprobar(
    'una carga en curso se CORTA en el acto y sin disparar al cambiar de fase (también a otra de combate), al irse al fondo y al quedarse sin cuerpo; y sin cuerpo no se vuelve a cargar',
    cargaAntesDeLaFase && cortaLaFase && !sigueTrasLaFase && cargaAntesDelFondo && cortaElFondo && cargaAntesDeSalir && cortaAlSalir && !sinCuerpoCarga && !soltaronAlCortar && soltados.length === soltadosAntesDeCortar,
    { cargaAntesDeLaFase, cortaLaFase, sigueTrasLaFase, cargaAntesDelFondo, cortaElFondo, cargaAntesDeSalir, cortaAlSalir, sinCuerpoCarga, soltaronAlCortar },
  );
  partida.cerrar();

  /* ── Los botones, pintados ── */
  const botonesHtml = renderToStaticMarkup(createElement(MandosTactiles, { mandos: new EstadoDeLosMandos(), partida: null, zurdo: false }));
  const iconos = ['golpe', 'quiebro', 'empellon', 'usar', 'rayo', 'aviso'].filter((i) => botonesHtml.includes(`class="icono icono-${i}"`));
  const nombres = [NOMBRES_DEL_QUIEBRO.botones.golpe, NOMBRES_DEL_QUIEBRO.botones.quiebro, NOMBRES_DEL_QUIEBRO.botones.empellon, NOMBRES_DEL_QUIEBRO.botones.usar, NOMBRES_DEL_QUIEBRO.botones.aviso, NOMBRE_DEL_RAYO];
  const iconosFuente = readFileSync(new URL('../src/quiebro/mandos/iconos.tsx', import.meta.url), 'utf8');
  const conEmoji = /\p{Extended_Pictographic}/u.test(botonesHtml) || /\p{Extended_Pictographic}/u.test(iconosFuente) || /<image|<img|xlink:href|href=/.test(iconosFuente);
  comprobar(
    'los botones llevan su ICONO propio en SVG (golpe, quiebro, empellón, usar, rayo, aviso), su rótulo de siempre, y ni un emoji ni una imagen de fuera',
    iconos.length === 6 && nombres.every((n) => botonesHtml.includes(`aria-label="${n}"`) && botonesHtml.includes(`>${n}<`)) && !conEmoji && NOMBRE_DEL_RAYO.length > 0,
    { iconos, conEmoji },
  );
  comprobar('los segundos de una recarga se leen «3», «2», «1», y nada al acabar', segundosDeLaRecarga(2400) === '3' && segundosDeLaRecarga(1000) === '1' && segundosDeLaRecarga(1001) === '2' && segundosDeLaRecarga(100) === '');
  const tactil = sinComentariosDe(readFileSync(new URL('../src/quiebro/mandos/Tactil.tsx', import.meta.url), 'utf8'));
  const cuerpoDe = (nombre: string): string => {
    const i = tactil.indexOf(`const ${nombre} = `);
    return i < 0 ? '' : tactil.slice(i, tactil.indexOf('\n  };', i));
  };
  const alSoltarElRayo = cuerpoDe('alSoltarElRayo');
  const alPerderElRayo = cuerpoDe('alPerderElRayo');
  const alPulsarElRayo = cuerpoDe('alPulsarElRayo');
  comprobar(
    'el dedo del RAYO se captura; SOLTAR lo deja a `null` ANTES de disparar (la captura perdida que llega detrás no cancela); cancelar y la captura perdida ANULAN',
    /setPointerCapture\(e\.pointerId\)/.test(alPulsarElRayo) &&
      /mandos\.pulsar\('rayo', e\.timeStamp\)/.test(alPulsarElRayo) &&
      alSoltarElRayo.indexOf('d.rayo = null') >= 0 &&
      alSoltarElRayo.indexOf('d.rayo = null') < alSoltarElRayo.indexOf('mandos.soltarRayo(e.timeStamp,') &&
      /mandos\.cancelarRayo\(\)/.test(alPerderElRayo) &&
      !/soltarRayo/.test(alPerderElRayo) &&
      /onPointerUp=\{alSoltarElRayo\}\s+onPointerCancel=\{alPerderElRayo\}\s+onLostPointerCapture=\{alPerderElRayo\}/.test(tactil) &&
      /onContextMenu=\{sinMenu\}/.test(tactil) &&
      /const sinMenu = \(e: EventoDeRaton<HTMLDivElement>\): void => \{\s*e\.preventDefault\(\);/.test(tactil) &&
      /d\.rayo = null;\s*if \(base\.current !== null\) base\.current\.style\.display = 'none';/.test(tactil),
  );
  const css = sinComentariosDe(readFileSync(new URL('../src/quiebro/hud/hud.css', import.meta.url), 'utf8'));
  const reglaCss = (selector: string): string => {
    const i = css.indexOf(`\n${selector} {`);
    return i < 0 ? '' : css.slice(i, css.indexOf('\n}', i));
  };
  const lado = (selector: string): number => Number(/\n  width: (\d+(?:\.\d+)?)px;/.exec(reglaCss(selector))?.[1] ?? Number.NaN);
  const tamanos = { golpe: lado('.q-tecla.golpe'), quiebro: lado('.q-tecla.quiebro'), empellon: lado('.q-tecla.empellon'), usar: lado('.q-tecla.usar'), aviso: lado('.q-tecla.aviso'), rayo: lado('.q-tecla.rayo') };
  const dentroDe = (t: number, hoy: number): boolean => t >= hoy && t <= hoy * 1.1;
  const mandosCss = css.slice(css.indexOf('.q-tactil {'), css.indexOf('.q-teclas {'));
  comprobar(
    'los tamaños: los de hoy o hasta un 10 % más, el RAYO de unos 76 a la izquierda y a 28 pt o más del borde; mientras se carga, la derecha deja pasar el dedo salvo QUIEBRO; y ni un `backdrop-filter`',
    dentroDe(tamanos.golpe, 88) &&
      dentroDe(tamanos.quiebro, 72) &&
      dentroDe(tamanos.empellon, 60) &&
      dentroDe(tamanos.usar, 64) &&
      dentroDe(tamanos.aviso, 44) &&
      tamanos.rayo >= 72 &&
      tamanos.rayo <= 80 &&
      /\n  left: calc\((\d+)px \+ var\(--q-izq\)\);/.test(reglaCss('.q-tecla.rayo')) &&
      Number(/\n  left: calc\((\d+)px \+ var\(--q-izq\)\);/.exec(reglaCss('.q-tecla.rayo'))?.[1] ?? 0) >= 28 &&
      /\n  pointer-events: none;/.test(reglaCss('.q-tactil.cargando .q-botones .q-tecla:not(.quiebro),\n.q-tactil.cargando .q-tecla.aviso')) &&
      !/backdrop-filter/.test(mandosCss),
    tamanos,
  );
  comprobar(
    'N0 barato: los botones, la palanca y la mira sin sombras ni halos en `data-nivel=0`',
    /\n  box-shadow: 0 0 0 1px rgba\(2, 5, 6, 0\.55\);/.test(reglaCss(".quiebro-raiz[data-nivel='0'] .q-tecla")) &&
      /box-shadow: none/.test(reglaCss(".quiebro-raiz[data-nivel='0'] .q-palanca-pomo")) &&
      /display: none/.test(reglaCss(".quiebro-raiz[data-nivel='0'] .q-mira .marca .halo,\n.quiebro-raiz[data-nivel='0'] .q-mira .punto .halo")),
  );

  /* Las clases de los botones, de lo que dice la sala (lo que el fotograma de los mandos escribe tal cual). */
  const bn = botonesNuevos();
  bn.activos = true;
  bn.golpe.listo = true;
  bn.quiebro.listo = true;
  bn.empellon.listo = true;
  bn.rayo.hay = true;
  bn.rayo.listo = true;
  const enReposo = clasesDeLosBotones(bn, null);
  const conElDedo = clasesDeLosBotones(bn, 1234);
  bn.rayo.cargando = true;
  bn.rayo.c = 0.5;
  const aMedias = clasesDeLosBotones(bn, 1234);
  bn.rayo.c = 1;
  const enElPleno = clasesDeLosBotones(bn, 1234);
  bn.rayo.cargando = false;
  bn.rayo.c = 0;
  bn.rayo.listo = false;
  bn.rayo.recarga = 0.4;
  bn.rayo.quedaMs = 2000;
  bn.quiebro.amenaza = 0.3;
  bn.empellon.recarga = 0.5;
  const rayoEnRecarga = clasesDeLosBotones(bn, null);
  bn.rayo.recarga = 0;
  bn.rayo.quedaMs = 0;
  bn.quiebro.amenaza = -1;
  const noPuede = clasesDeLosBotones(bn, null);
  bn.rayo.hay = false;
  const sinTiro = clasesDeLosBotones(bn, null);
  comprobar(
    'las clases de los botones salen de la sala: cargar apaga la derecha desde que baja el dedo (antes de que la partida lo cuente); el RAYO en recarga sólo mientras no carga, apagado si no puede y no es la recarga, cargando, y pleno con la carga llena; QUIEBRO con la amenaza, EMPELLÓN con su recarga; sin tiro, sin botón',
    !enReposo.cargando &&
      enReposo.conRayo &&
      !enReposo.rayoEnRecarga &&
      !enReposo.rayoApagado &&
      !enReposo.amenaza &&
      conElDedo.cargando &&
      aMedias.cargando &&
      aMedias.rayoCargando &&
      !aMedias.pleno &&
      enElPleno.pleno &&
      rayoEnRecarga.rayoEnRecarga &&
      !rayoEnRecarga.rayoApagado &&
      !rayoEnRecarga.cargando &&
      rayoEnRecarga.amenaza &&
      rayoEnRecarga.empellonEnRecarga &&
      noPuede.rayoApagado &&
      !noPuede.rayoEnRecarga &&
      !noPuede.amenaza &&
      !sinTiro.conRayo &&
      !sinTiro.rayoApagado &&
      !sinTiro.rayoEnRecarga,
    { enReposo, conElDedo, aMedias, enElPleno, rayoEnRecarga, noPuede, sinTiro },
  );
  comprobar(
    'y el fotograma de los mandos las escribe tal cual (la capa `cargando`, el RAYO en recarga, apagado, cargando y pleno, la amenaza, la recarga del Empellón), y ajusta los rótulos al montar, al llegar las letras y cuando uno cambia o aparece',
    /const clases = clasesDeLosBotones\(b, mandos\.rayoDesde\);/.test(tactil) &&
      /alternar\(raiz\.current, 'cargando', clases\.cargando\);/.test(tactil) &&
      /alternar\(rayo\.current, 'recarga', clases\.rayoEnRecarga\);/.test(tactil) &&
      /alternar\(rayo\.current, 'apagada', clases\.rayoApagado\);/.test(tactil) &&
      /alternar\(rayo\.current, 'cargando', clases\.rayoCargando\);/.test(tactil) &&
      /alternar\(rayo\.current, 'pleno', clases\.pleno\);/.test(tactil) &&
      /alternar\(quiebro\.current, 'amenaza', clases\.amenaza\);/.test(tactil) &&
      /alternar\(empellon\.current, 'recarga', clases\.empellonEnRecarga\);/.test(tactil) &&
      /for \(const el of raiz\.current\.querySelectorAll<HTMLElement>\('\.q-tecla \.rotulo'\)\) ajustarElRotulo\(el\);/.test(tactil) &&
      (tactil.match(/ajustar = true;/g) ?? []).length >= 4 &&
      /let ajustar = true;/.test(tactil),
  );

  /*
   * LOS RÓTULOS, DENTRO DEL ARO: la cuerda del aro a la altura del rótulo manda. Con la letra de casa (Bahnschrift
   * comprimida: 0,42-0,53 em por letra medidos en Edge) cabe sin estrecharse; con una de reserva ancha (Arial o Roboto:
   * 0,60-0,71 em) `ajustarElRotulo` lo estrecha, y nunca más de un 30 %. Los rótulos, de la hoja (tamaño, espaciado,
   * altura y relleno) y los textos, todos los que salen (USAR dice también REMATAR, RESCATAR y DESCOLGAR).
   */
  comprobar(
    'la cuerda del aro: en el centro, el diámetro útil; en el borde, nada; más estrecha cuanto más abajo; y el ajuste estrecha lo justo, nunca más del mínimo',
    casi(cuerdaDelAro(64, 32), 2 * (64 * 0.429 - 1.5), 1e-9) &&
      cuerdaDelAro(64, 0) === 0 &&
      cuerdaDelAro(64, 12) < cuerdaDelAro(64, 18) &&
      ajusteDelRotulo(30, 37) === 1 &&
      casi(ajusteDelRotulo(50, 37), 0.74, 1e-9) &&
      ajusteDelRotulo(500, 37) === AJUSTE_MINIMO,
  );
  const medidaDe = (regla: string, prop: string): number | null => {
    const hallada = new RegExp(`\\n  ${prop}: (\\d+(?:\\.\\d+)?)(?:px|em|%);`).exec(regla);
    return hallada === null ? null : Number(hallada[1]);
  };
  const reglaDelRotulo = reglaCss('.q-tecla .rotulo');
  const LETRA_DE_CASA_EM = 0.54;
  const LETRA_ANCHA_EM = 0.72;
  const nb = NOMBRES_DEL_QUIEBRO.botones;
  const rotulos = [
    { boton: 'golpe', lado: tamanos.golpe, regla: '.q-tecla.golpe .rotulo', textos: [nb.golpe] },
    { boton: 'quiebro', lado: tamanos.quiebro, regla: '.q-tecla.quiebro .rotulo', textos: [nb.quiebro] },
    { boton: 'empellon', lado: tamanos.empellon, regla: '.q-tecla.empellon .rotulo', textos: [nb.empellon] },
    { boton: 'usar', lado: tamanos.usar, regla: '.q-tecla.usar .rotulo', textos: [nb.usar, nb.rematar, nb.rescatar, nb.descolgar] },
    { boton: 'aviso', lado: tamanos.aviso, regla: '.q-tecla.aviso .rotulo', textos: [nb.aviso] },
    { boton: 'rayo', lado: tamanos.rayo, regla: '.q-tecla.rayo .rotulo', textos: [NOMBRE_DEL_RAYO] },
    { boton: 'rayo de PC', lado: lado('.q-tecla.rayo.q-rayo-pc'), regla: '.q-tecla.rayo.q-rayo-pc .rotulo', textos: [NOMBRE_DEL_RAYO] },
  ].flatMap((c) =>
    c.textos.map((texto) => {
      const propia = reglaCss(c.regla);
      const tam = medidaDe(propia, 'font-size') ?? medidaDe(reglaDelRotulo, 'font-size') ?? Number.NaN;
      const espacio = medidaDe(propia, 'letter-spacing') ?? medidaDe(reglaDelRotulo, 'letter-spacing') ?? Number.NaN;
      const abajo = ((medidaDe(propia, 'bottom') ?? medidaDe(reglaDelRotulo, 'bottom') ?? Number.NaN) / 100) * c.lado;
      const relleno = (medidaDe(reglaDelRotulo, 'padding-left') ?? Number.NaN) * tam;
      const cabe = cuerdaDelAro(c.lado, abajo);
      const casa = texto.length * tam * (LETRA_DE_CASA_EM + espacio) + relleno;
      const ancha = texto.length * tam * (LETRA_ANCHA_EM + espacio) + relleno;
      return { boton: c.boton, texto, cabe: Math.round(cabe * 10) / 10, casa: Math.round(casa * 10) / 10, ajusteConLaAncha: Math.round(ajusteDelRotulo(ancha, cabe) * 100) / 100 };
    }),
  );
  const noCaben = rotulos.filter((x) => !(x.casa <= x.cabe) || !(x.ajusteConLaAncha >= 0.7));
  comprobar(
    `los ${String(rotulos.length)} rótulos caben DENTRO de su aro con la letra de casa, sin estrecharse, y con una de reserva ancha el ajuste los deja dentro estrechando un 30 % como mucho`,
    rotulos.length === 10 && noCaben.length === 0 && /\n  width: max-content;/.test(reglaDelRotulo) && /\n  transform: translateX\(-50%\) scaleX\(var\(--q-ajuste, 1\)\);/.test(reglaDelRotulo),
    noCaben.length > 0 ? noCaben : rotulos,
  );
  comprobar(
    'en espejo el rótulo conserva su centrado y su ajuste, y los segundos su altura',
    /\n  transform: translateX\(-50%\) scaleX\(calc\(-1 \* var\(--q-ajuste, 1\)\)\);/.test(reglaCss('.q-tactil.zurdo .q-botones .q-tecla > .rotulo')) &&
      /\n  transform: translateY\(-50%\) scaleX\(-1\);/.test(reglaCss('.q-tactil.zurdo .q-botones .q-tecla > .segundos')),
  );

  /* ── La mira ── */
  const miraHtml = renderToStaticMarkup(createElement(MiraDelRayo, { partida: null, ojo: { current: null } }));
  const marcas = (miraHtml.match(/class="marca"/g) ?? []).length;
  const arcoLleno = tramoDelArco(0, 40, 1);
  const barrido = /A40 40 0 0 1 /.test(arcoLleno);
  comprobar(
    'la mira son TRES marcas (su chevrón hacia dentro), su arco partido en tres y el punto del pleno (relleno, de 3 px o menos): ni cruz, ni círculo de mira telescópica, ni retícula',
    marcas === 3 &&
      (miraHtml.match(/class="punto"/g) ?? []).length === 1 &&
      RADIO_DEL_PUNTO_PX <= 3 && !/<circle|<line|<rect|<ellipse|<polyline/.test(miraHtml) && (miraHtml.match(/class="carga"/g) ?? []).length === 3 && TRAMO_DEL_ARCO <= 80 && barrido && tramoDelArco(0, 40, 0) === '',
    { marcas, arcoLleno },
  );
  comprobar(
    'su radio es el área a la distancia del blanco (2 m a 12 m con 75°: unos 49 px de 390), entre 10 y 90 px, y en el pleno (sin área) se juntan en un punto',
    casi(radioDeLaMira(2, 12, 75, 390), (2 / (12 * Math.tan((75 * Math.PI) / 360))) * 195, 0.01) &&
      radioDeLaMira(0.05, 40, 75, 390) === RADIO_MINIMO_PX &&
      radioDeLaMira(6, 2, 75, 390) === RADIO_MAXIMO_PX &&
      radioDeLaMira(0, 12, 75, 390) === RADIO_DEL_PLENO_PX &&
      RADIO_DEL_PLENO_PX < RADIO_MINIMO_PX &&
      escalaDeLaMarca(RADIO_DEL_PLENO_PX) < 0.5 &&
      escalaDeLaMarca(40) === 1,
  );
  let r = RADIO_MAXIMO_PX;
  let v = 0;
  let peor = 0;
  let pasa = 0;
  for (let i = 0; i < 12; i++) {
    const s = muelleDelRadio(r, v, 20, 0.05);
    r = s.radio;
    v = s.velocidad;
    if (!Number.isFinite(r)) peor = Number.POSITIVE_INFINITY;
    pasa = Math.max(pasa, 20 - r);
    peor = Math.max(peor, Math.abs(r - 20));
  }
  comprobar('el muelle del radio se cierra con un poco de sobrepaso y es estable con fotogramas lentos (50 ms): en 0,6 s está en su sitio', Number.isFinite(peor) && Math.abs(r - 20) < 0.5 && pasa > 0 && pasa < 12, { r, pasa });

  /* La mira, fotograma a fotograma: lo que decide `pasoDeLaMira` es lo que el componente pinta. */
  const vista = (v: Partial<VistaDeLaMira>): VistaDeLaMira => ({ activa: true, enPantalla: true, x: 400, y: 200, quiere: 60, blanco: 0, c: 0.3, disparo: null, ...v });
  const correrLaMira = (em: ReturnType<typeof estadoDeLaMiraNuevo>, v: VistaDeLaMira, desde: number, ms: number): (DibujoDeLaMira | null)[] => {
    const dibujos: (DibujoDeLaMira | null)[] = [];
    for (let t = desde; t < desde + ms; t += 16) dibujos.push(pasoDeLaMira(em, v, t, 0.016));
    return dibujos;
  };
  const ultimo = (l: (DibujoDeLaMira | null)[]): DibujoDeLaMira | null => l[l.length - 1] ?? null;
  /* El pleno: de un área abierta (arco entero) a la línea sin área; lo que queda, un punto que late. */
  const alPleno = estadoDeLaMiraNuevo(null);
  const abierta = ultimo(correrLaMira(alPleno, vista({ quiere: 40, c: 0.8, blanco: 7 }), 0, 600));
  const pleno = correrLaMira(alPleno, vista({ quiere: radioDeLaMira(0, 18, 65, 390), c: 1, blanco: 7 }), 600, 400 + PULSO_MS * 2).slice(-Math.ceil(PULSO_MS / 16) - 2);
  const plenos = pleno.filter((x): x is DibujoDeLaMira => x !== null);
  const escalas = plenos.map((x) => x.escala);
  comprobar(
    'EN EL PLENO la mira se junta en UN PUNTO: sin arco (ni un aro alrededor), las marcas cerradas en el radio del pleno y fundidas, y el punto de luz encendido, que late; abierta, el arco entero y sin punto',
    abierta !== null &&
      abierta.arco === 1 &&
      abierta.punto === 0 &&
      abierta.marcas === 1 &&
      plenos.length === pleno.length &&
      plenos.length > 10 &&
      plenos.every((x) => x.arco === 0 && x.radio <= RADIO_DEL_PLENO_PX + 0.5 && x.marcas <= 0.3 && x.punto >= 0.7) &&
      Math.max(...escalas) / Math.min(...escalas) > 1.05 &&
      RADIO_DEL_PUNTO_PX <= 3,
    { abierta, pleno: plenos[0], escalas: [Math.min(...escalas), Math.max(...escalas)] },
  );
  comprobar(
    `el arco de la carga sólo rodea marcas ABIERTAS: nada con ellas por debajo de ${String(ARCO_NINGUNO_BAJO_PX)} px (el radio mínimo del área incluido), entero desde ${String(ARCO_ENTERO_DESDE_PX)}; cerradas, un arco alrededor sería un aro con algo dentro`,
    luzDelArco(RADIO_MINIMO_PX) === 0 &&
      luzDelArco(ARCO_NINGUNO_BAJO_PX) === 0 &&
      luzDelArco(ARCO_NINGUNO_BAJO_PX - 0.1) === 0 &&
      luzDelArco(ARCO_ENTERO_DESDE_PX) === 1 &&
      luzDelArco(RADIO_MAXIMO_PX) === 1 &&
      ARCO_NINGUNO_BAJO_PX >= 18 &&
      ultimo(correrLaMira(estadoDeLaMiraNuevo(null), vista({ quiere: RADIO_MINIMO_PX, c: 0.9 }), 0, 700))?.arco === 0,
  );
  /* Se cierra con el área: 3 m, 2 m y 1 m a 9 m, cada escalón más cerrado, y el muelle llega a cada uno. */
  const cierra = estadoDeLaMiraNuevo(null);
  const radios = [3, 2, 1].map((area, i) => {
    const quiere = radioDeLaMira(area, 9, 70, 390);
    return { quiere, tiene: ultimo(correrLaMira(cierra, vista({ quiere, c: 0.2 + 0.3 * i }), i * 700, 700))?.radio ?? Number.NaN };
  });
  comprobar(
    'la mira se CIERRA con la carga: a cada nivel, el área más pequeña, y el muelle llega a su radio',
    radios.every((x) => Math.abs(x.tiene - x.quiere) < 0.5) && (radios[0]?.tiene ?? 0) > (radios[1]?.tiene ?? 0) && (radios[1]?.tiene ?? 0) > (radios[2]?.tiene ?? 0),
    radios,
  );
  /* La tensión al fijar un blanco nuevo; con el mismo, nada. */
  const tensa = estadoDeLaMiraNuevo(null);
  const sinBlanco = ultimo(correrLaMira(tensa, vista({ quiere: 40, c: 0.4 }), 0, 300));
  const alFijar = pasoDeLaMira(tensa, vista({ quiere: 40, c: 0.4, blanco: 7 }), 300, 0.016);
  const pasada = ultimo(correrLaMira(tensa, vista({ quiere: 40, c: 0.4, blanco: 7 }), 316, TENSION_MS + 16));
  comprobar(
    'al FIJAR un blanco la mira se tensa (un salto de escala que vuelve en 140 ms) y brilla más; pasada la tensión, con el mismo blanco, nada',
    sinBlanco !== null &&
      sinBlanco.escala === 1 &&
      alFijar !== null &&
      casi(alFijar.escala, 1 + TENSION, 1e-9) &&
      alFijar.brillo >= 0.99 &&
      pasada !== null &&
      pasada.escala === 1 &&
      pasada.brillo < 0.5 &&
      pasada.brillo > sinBlanco.brillo,
    { sinBlanco: sinBlanco?.escala, alFijar: alFijar?.escala, pasada: pasada?.escala },
  );
  /* Los dos finales: el disparo se cierra en el punto y se apaga; la cancelación se abre y se apaga. */
  const aDisparar = estadoDeLaMiraNuevo(null);
  correrLaMira(aDisparar, vista({ quiere: 40, c: 0.9 }), 0, 400);
  const disparo = correrLaMira(aDisparar, vista({ activa: false, disparo: 1234 }), 400, DISPARO_MS + 40);
  const aCancelar = estadoDeLaMiraNuevo(null);
  correrLaMira(aCancelar, vista({ quiere: 40, c: 0.9 }), 0, 400);
  const cancela = correrLaMira(aCancelar, vista({ activa: false, disparo: null }), 400, CANCELAR_MS + 40);
  const vistosDelDisparo = disparo.filter((x): x is DibujoDeLaMira => x !== null);
  const vistosAlCancelar = cancela.filter((x): x is DibujoDeLaMira => x !== null);
  comprobar(
    'al SOLTAR la mira se cierra en el punto y se apaga (sin aro); al CANCELAR se abre y se apaga; y luego no queda nada',
    vistosDelDisparo.length >= 5 &&
      vistosDelDisparo.every((x, i, l) => i === 0 || x.radio < (l[i - 1] as DibujoDeLaMira).radio) &&
      (vistosDelDisparo[vistosDelDisparo.length - 1]?.radio ?? 99) < 3 &&
      (vistosDelDisparo[vistosDelDisparo.length - 1]?.punto ?? 0) > 0.9 &&
      (vistosDelDisparo[vistosDelDisparo.length - 1]?.arco ?? 1) === 0 &&
      disparo[disparo.length - 1] === null &&
      vistosAlCancelar.length >= 4 &&
      vistosAlCancelar.every((x, i, l) => i === 0 || (x.radio > (l[i - 1] as DibujoDeLaMira).radio && x.opacidad < (l[i - 1] as DibujoDeLaMira).opacidad)) &&
      vistosAlCancelar.every((x) => x.punto === 0) &&
      cancela[cancela.length - 1] === null,
    { disparo: vistosDelDisparo.map((x) => Math.round(x.radio * 10) / 10), cancela: vistosAlCancelar.map((x) => Math.round(x.radio * 10) / 10) },
  );
  /* El componente le pasa lo que ve (el área de AHORA a la distancia del blanco) y pinta lo que devuelve. */
  const miraFuente = sinComentariosDe(readFileSync(new URL('../src/quiebro/hud/MiraDelRayo.tsx', import.meta.url), 'utf8'));
  comprobar(
    'y el componente de la mira le pasa lo que ve —el radio del área de ahora a la distancia del blanco, el blanco, la carga y el disparo— y pinta lo que devuelve: sin arco, ni un tramo',
    /quiere = radioDeLaMira\(rayo\.area, profundidad, fov, alto\);/.test(miraFuente) &&
      /\{ activa, enPantalla, x, y, quiere, blanco: rayo\?\.blanco \?\? 0, c: rayo\?\.c \?\? 0, disparo: partida\?\.ultimoDisparo\?\.t \?\? null \}/.test(miraFuente) &&
      /arcos\.current\[k\]\?\.setAttribute\('d', d\.arco > 0 \? tramoDelArco\(k, d\.radioDelArco, d\.c\) : ''\);/.test(miraFuente) &&
      /grupoDeArcos\.current\?\.setAttribute\('opacity', redondo\(d\.arco, 100\)\);/.test(miraFuente) &&
      /punto\.current\?\.setAttribute\('opacity', redondo\(d\.punto, 100\)\);/.test(miraFuente) &&
      /grupoDeMarcas\.current\?\.setAttribute\('opacity', redondo\(d\.marcas, 100\)\);/.test(miraFuente),
  );
  /* El halo: un resplandor (la marca desenfocada), no un contorno duro; y el trazo, fino. */
  const anchoDelTrazo = (regla: string): number => Number(/\n  stroke-width: (\d+(?:\.\d+)?);/.exec(regla)?.[1] ?? Number.NaN);
  const desenfoque = Number(/<filter id="q-mira-difuso"[^>]*><feGaussianBlur stdDeviation="(\d+(?:\.\d+)?)"/.exec(miraHtml)?.[1] ?? Number.NaN);
  const halos = (miraHtml.match(/<path class="halo" d="M-6 -9\.5L0 0L6 -9\.5" filter="url\(#q-mira-difuso\)"/g) ?? []).length;
  const trazos = { halo: anchoDelTrazo(reglaCss('.q-mira .marca .halo')), filo: anchoDelTrazo(reglaCss('.q-mira .marca .filo')), nucleo: anchoDelTrazo(reglaCss('.q-mira .marca .nucleo')), arco: anchoDelTrazo(reglaCss('.q-mira .carga')) };
  comprobar(
    'el halo de las marcas es un RESPLANDOR (su chevrón desenfocado por el filtro de la mira), no un contorno de bordes duros; y el trazo es fino: filo de 3 px o menos con el núcleo dentro, y el arco de menos de 2',
    desenfoque >= 1.5 && halos === 3 && trazos.halo <= 6 && trazos.filo <= 3 && trazos.nucleo < trazos.filo && trazos.nucleo <= 2 && trazos.arco < 2,
    { desenfoque, halos, trazos },
  );

  /* ── El teclado: la R ── */
  const ventana = new EventTarget();
  const documento = new EventTarget() as EventTarget & { visibilityState: string; pointerLockElement: unknown; exitPointerLock: () => void };
  documento.visibilityState = 'visible';
  documento.pointerLockElement = null;
  documento.exitPointerLock = () => undefined;
  const g = globalThis as unknown as Record<string, unknown>;
  const antesW = g.window;
  const antesD = g.document;
  g.window = ventana;
  g.document = documento;
  try {
    const mt = new EstadoDeLosMandos();
    const superficie = new EventTarget() as EventTarget & HTMLElement;
    const soltarTeclado = engancharElTeclado(mt, { superficie, activo: () => true, blancoDelRayo: () => 23 });
    const tecla = (tipo: string, code: string, t: number): void => {
      const ev = new Event(tipo) as Event & { code: string; repeat: boolean; ctrlKey: boolean; metaKey: boolean; altKey: boolean; timeStamp: number };
      Object.assign(ev, { code, repeat: false, ctrlKey: false, metaKey: false, altKey: false });
      Object.defineProperty(ev, 'timeStamp', { value: t });
      ventana.dispatchEvent(ev);
    };
    tecla('keydown', 'KeyR', 300);
    const conR = mt.rayoDesde;
    tecla('keyup', 'KeyR', 1100);
    const tiroDeR = mt.tomarRayoSoltado();
    tecla('keydown', 'KeyR', 1500);
    tecla('keydown', 'Escape', 1600);
    const trasEsc = mt.rayoDesde;
    tecla('keyup', 'KeyR', 1700);
    const nadaTrasEsc = mt.tomarRayoSoltado();
    tecla('keydown', 'KeyR', 2000);
    ventana.dispatchEvent(new Event('blur'));
    const trasBlur = mt.rayoDesde;
    soltarTeclado();
    comprobar(
      'en PC, mantener la R carga y SOLTARLA dispara con la hora de su `keyup` y el blanco de la mira; Esc y perder el foco la cancelan',
      conR === 300 && tiroDeR !== null && tiroDeR.desde === 300 && tiroDeR.hasta === 1100 && tiroDeR.blanco === 23 && trasEsc === null && nadaTrasEsc === null && trasBlur === null,
      { conR, tiroDeR, trasEsc, nadaTrasEsc, trasBlur },
    );
  } finally {
    g.window = antesW;
    g.document = antesD;
  }
  const combate = sinComentariosDe(readFileSync(new URL('../src/quiebro/hud/Combate.tsx', import.meta.url), 'utf8'));
  const hud = sinComentariosDe(readFileSync(new URL('../src/quiebro/hud/Hud.tsx', import.meta.url), 'utf8'));
  comprobar(
    'la ayuda de teclas dice la R, el HUD monta la mira y el rayo de PC, y abrir el plano (la M) cancela la carga',
    /<kbd>R<\/kbd> mantén/.test(combate) && /<MiraDelRayo partida=\{partida\} ojo=\{ojo\} \/>/.test(combate) && /<RayoDePC partida=\{partida\} \/>/.test(combate) && /if \(plano\) mandos\.cancelarRayo\(\);/.test(hud),
  );

  /* ── El juego cuelga los efectos, y el tiro de juguete sólo existe en desarrollo ── */
  const juego = sinComentariosDe(readFileSync(new URL('../src/quiebro/Quiebro.tsx', import.meta.url), 'utf8'));
  const quienLeeLaTabla: string[] = [];
  const recorrer = (carpeta: URL, rel: string): void => {
    for (const f of readdirSync(carpeta, { withFileTypes: true })) {
      if (f.isDirectory()) recorrer(new URL(`${f.name}/`, carpeta), `${rel}${f.name}/`);
      else if (/\.(ts|tsx)$/.test(f.name) && /NIVELES_DEL_RAYO/.test(sinComentariosDe(readFileSync(new URL(f.name, carpeta), 'utf8')))) quienLeeLaTabla.push(`${rel}${f.name}`);
    }
  };
  recorrer(new URL('../src/quiebro/', import.meta.url), '');
  const importaElJuguete = juego.match(/tiro-de-prueba/g) ?? [];
  comprobar(
    'el juego cuelga los efectos en la partida; y la tabla del rayo sólo la lee el tiro de JUGUETE, que se carga con `import()` dentro del bloque de desarrollo',
    /partida\.efectos = sistema;/.test(juego) &&
      quienLeeLaTabla.join() === 'red/tiro-de-prueba.ts' &&
      importaElJuguete.length === 1 &&
      /if \(!import\.meta\.env\.DEV\) return;[\s\S]{0,400}void import\('\.\/red\/tiro-de-prueba'\)/.test(juego) &&
      !/from '\.\/red\/tiro-de-prueba'/.test(juego),
    { quienLeeLaTabla, importaElJuguete: importaElJuguete.length },
  );
}

terminar(266);
