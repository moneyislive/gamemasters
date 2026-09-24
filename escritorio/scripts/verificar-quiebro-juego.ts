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
import '../../shared/arcade/juegos';
import { avanzarConMotivo, vistaDeAsiento } from '../../shared/arcade';
import { lizaDeLaMesa } from '../../shared/arcade/juegos/lizas';
import { leerVistaDelQuiebro } from '../../shared/arcade/juegos/quiebro-vista';
import { barrioDeLaNoche, mundoDeLaLizaDelBarrio, ID_DE_LIMITE_EN_LA_LIZA } from '../../shared/arcade/juegos/quiebro-barrio';
import { sePuedeLidiar } from '../../shared/arcade/juegos/lizas';
import { NOMBRES_DEL_QUIEBRO } from '../../shared/arcade/juegos/quiebro-nombres';
import type { VistaDelQuiebro } from '../../shared/arcade/juegos/quiebro-vista';
import { UNO } from '../../shared/mecanicas/fijo';
import { seAndaEnRecta, sePuedeEstar } from '../../shared/mecanicas/mundo';
import { arenaDeLaLiza, problemasDeLaDeclaracion, VERSION_DE_LA_DECLARACION } from '../../shared/mecanicas/liza/declaracion';
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
  textoDeLaSala,
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
import { Partida } from '../src/quiebro/red/partida';
import { PuertoDePrueba, PLAZO_DE_LA_MESA_S } from '../src/quiebro/red/puerto-de-prueba';
import { EstadoDeLosMandos, sinZonaMuerta, ZONA_MUERTA } from '../src/quiebro/mandos/estado';
import { anguloEntre, direccionHacia, elegirBlanco } from '../src/quiebro/mandos/enganche';
import { camaraNueva, DISTANCIA_ABIERTA, DISTANCIA_AL_HOMBRO, encuadrar, FOV_PC, losaEnTresEjes } from '../src/quiebro/camara/encuadre';
import type { CajaAlta } from '../src/quiebro/camara/encuadre';
import { queHacerConLaEleccion, relojEnTexto, valorDeLasEsquirlas, etiquetaDeLaFase, cifra } from '../src/quiebro/hud/lectura';

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
      golpe(ACC.replica, { anuncioTics: 3, imparable: true, soloEn: [EST.remanso], alFallar: null, efecto: efecto(25, puesta(EST.derribado, 30)) }),
    ],
    esquiva: {
      accion: ACC.quiebro,
      puesta: puesta(EST.quiebro, 9, 0, u(3.5), 6),
      ventanaMs: 200,
      esquivaHastaMs: 250,
      primeras: { cuantas: 3, ventanaMs: 300 },
      torpe: { cada: 3, enTics: 24 },
      alAcertar: { puesta: puesta(EST.remanso, 20, 20), alAutor: puesta(EST.descolocado, 20) },
      contraProyectil: { distancia: u(10), tics: 8, accion: ACC.replica },
      ruptura: { coste: 50, desde: [EST.tocado], puesta: puesta(EST.quiebro, 9, 6, u(3.5), 6) },
    },
    rescate: { accion: ACC.rescate, radio: u(1.5), mantenerTics: 30, puesta: puesta(EST.rescatando, 30), vidaAlVolver: 40, medidorAmbos: 0 },
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
      paso.desplazar(Math.floor(azar() * 256), REGLAS.esquiva.puesta.distanciaExtra, 6, false);
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
  partida.ponerLaDeclaracion(LIZA, BARRIO, 'a1');
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
  comprobar('y el cuerpo se desplaza hacia la palanca los 3,5 m del quiebro (sin esperar a la sala)', recorrido > 3 && recorrido < 3.6, recorrido);

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

terminar(123);
