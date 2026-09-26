/// <reference types="vite/client" />
/**
 * `<Quiebro>`: EL JUEGO ENTERO, a pantalla completa, a partir de un puerto de mesa.
 *
 * ═══ UN JUEGO, TRES ANFITRIONES ═══
 *
 * Lo monta el pintor del escritorio (con su `LaMesa`), el documento suelto que cargan la app y `/jugar`
 * (con el puente de `contrato.ts`) y, en pruebas, un puerto que abre su propia mesa. Aquí no se sabe
 * cuál: llega un `PuertoDeMesa` y ya (ver la cabecera de `contrato.ts`).
 *
 * ═══ LO QUE SE MONTA ═══
 *
 *   · EL LIENZO (r3f), con la ciudad de la noche (`ciudad/`), los efectos (`efectos/`), los cuerpos
 *     —los del frente de personajes si ya existe `personajes/index.ts`; si no, las siluetas provisionales
 *     de `provisional/`, que leen la MISMA `FuenteDeCuerpos`—, la cámara (`camara/`) y un único
 *     `<Posproceso>` gobernado por `usarElNivel` (`calidad/`).
 *   · LA PARTIDA (`red/partida.ts`): el canal de la Liza, lo predicho, lo interpolado, el guion.
 *   · EL SONIDO (`sonido/`): uno por montaje, desbloqueado en el toque de BAJAR.
 *   · EL HUD (`hud/`) en DOM encima, y los MANDOS (`mandos/`): táctiles en un teléfono, teclado y ratón
 *     en un PC.
 *
 * ═══ EL ORDEN DENTRO DEL FOTOGRAMA ═══
 *
 * `useFrame` corre por prioridad, y el orden importa: (−3) la escena drena los sucesos con los cuerpos
 * del fotograma anterior y la partida da sus tics y escribe los cuerpos de éste; (−2) la cámara se pone
 * detrás de mi cuerpo ya movido; (−1) los efectos y los cuerpos se pintan; (0) la ciudad; (1) el
 * posproceso pinta el fotograma. Nadie más pinta con prioridad positiva en este lienzo.
 *
 * ═══ EL BARRIO O LA CIUDAD ═══
 *
 * Dónde se juega lo dice `red/lugar.ts` (`lugarDeLaMesa`): la ciudad abierta de 540 m cuando la vista trae
 * su traza Y el mundo de la liza es el de esa ciudad; si no, el barrio de siempre. Con ese lugar se pinta
 * la ciudad (`LaCiudadDeNoche` con la traza, las plazas y las despejadas), choca la cámara, suenan el tren
 * y la lluvia, se lee el rótulo de la Bajada y la gente de los personajes; y en la ciudad, el minimapa y el
 * plano leen el mapa vivo de la partida (`red/orientarse.ts`). El lugar se guarda por identidad: la vista
 * cambia con cada voto y la noche no, y un lugar nuevo en cada voto rehacía la cámara y los personajes.
 *
 * ═══ AL FONDO, CALLADO ═══
 *
 * Cuando la pestaña se oculta, la página se va o la app pasa a segundo plano (`mandos/fondo.ts`), se
 * sueltan TODOS los mandos y la partida deja de mandar `aqui` (`Partida.callar`): la sala lo da por
 * ausente a los 2 s, que es lo que el diseño promete (§5). Sin callarse, un aparato que no frena sus
 * temporizadores al fondo seguiría presente y los Celadores pegarían a nadie.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType, JSX, MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { Camera } from 'three';
import { lizaDeLaMesa } from '../../../shared/arcade/juegos/lizas';
import { IDS_DE_ESTILO, NOMBRES_DEL_QUIEBRO } from '../../../shared/arcade/juegos/quiebro-nombres';
import { claveDeLaFase } from '../../../shared/arcade/juegos/quiebro-liza';
import { leerVistaDelQuiebro } from '../../../shared/arcade/juegos/quiebro-vista';
import type { VistaDelQuiebro } from '../../../shared/arcade/juegos/quiebro-vista';
import type { LizaDeclarada } from '../../../shared/mecanicas/liza/declaracion';
import { UNO } from '../../../shared/mecanicas/fijo';
import type { PuertoDeMesa, SalidaDelMovimiento } from './contrato';
import { LaCiudadDeNoche } from './ciudad/LaCiudadDeNoche';
import { EfectosDelQuiebro, crearRelojDePresentacion, crearSistemaDeEfectos } from './efectos';
import type { SistemaDeEfectos } from './efectos';
import type { BocaDe } from './rayo/contrato';
import { Posproceso } from './posproceso/Posproceso';
import { forzarElNivel, usarElNivel } from './calidad/usar-el-nivel';
import { laCuentaDe } from './calidad/medida';
import { crearSonido } from './sonido';
import type { ModoDeLaMusica, Sonido } from './sonido';
import { CamaraDelQuiebro } from './camara/Camara';
import type { ModoDeLaCamara } from './camara/Camara';
import { EstadoDeLosMandos } from './mandos/estado';
import { escucharElFondo } from './mandos/fondo';
import { engancharElTeclado } from './mandos/teclado';
import { MandosTactiles } from './mandos/Tactil';
import { RelojDeLaBajada } from './red/bajada';
import { direccionDeLaLiza } from './red/canal';
import type { Enchufe } from './red/canal';
import { Escenificador } from './red/escenificar';
import { Partida } from './red/partida';
import { lugarDeLaMesa, rotuloDelLugar, semillaDelLugar, tiempoDelLugar } from './red/lugar';
import type { LugarDeLaNoche } from './red/lugar';
import { OrientacionDeLaPartida } from './red/orientarse';
import { Hud } from './hud/Hud';
import { quienesFaltanEnLaBajada } from './hud/lectura';
import { ID_DEL_QUIEBRO } from './hud/Pantallas';
import { SiluetasProvisionales } from './provisional/Siluetas';
import type { PropsDelPintorDeCuerpos } from './provisional/Siluetas';
import './hud/hud.css';

export interface PropsDelQuiebro {
  readonly puerto: PuertoDeMesa;
  /** Dentro de otra pantalla (el pintor del escritorio) y no a pantalla completa en su documento. */
  readonly incrustado: boolean;
  /** La persona quiere salir del juego (volver a la Sala, cerrar el WebView). */
  readonly alSalir?: () => void;
  /** «Otra mesa»: abrir una nueva. Sin él, se sale (el anfitrión sabe abrir mesas; el juego no). */
  readonly alOtraMesa?: () => void;
  /** Lo que midió el gobernador de calidad, para el anfitrión que lo guarda. */
  readonly alMedir?: (nivel: 0 | 1 | 2 | 3, calidad: 'sobria' | 'plena') => void;
  /** Sólo en el modo de prueba: la dirección con que otra pestaña se sienta en esta mesa (la reunión la enseña). */
  readonly enlaceParaEntrar?: string;
}

/* ═══ LOS PERSONAJES, SI YA ESTÁN ═══
 *
 * `personajes/index.ts` es de otro frente y puede no existir todavía. Vite resuelve este patrón al
 * compilar: sin el fichero, el mapa sale vacío y se pintan las siluetas provisionales; con él, se pinta
 * su componente (`PersonajesDelQuiebro`, o `Personajes`), que recibe las mismas props. */
interface ModuloDePersonajes {
  readonly CuerposDelQuiebro?: ComponentType<PropsDelPintorDeCuerpos>;
  readonly PersonajesDelQuiebro?: ComponentType<PropsDelPintorDeCuerpos>;
  readonly Personajes?: ComponentType<PropsDelPintorDeCuerpos>;
}
const MODULOS_DE_PERSONAJES = import.meta.glob<ModuloDePersonajes>('./personajes/index.ts', { eager: true });

function elPintorDeCuerpos(): ComponentType<PropsDelPintorDeCuerpos> {
  for (const m of Object.values(MODULOS_DE_PERSONAJES)) {
    const c = m.CuerposDelQuiebro ?? m.PersonajesDelQuiebro ?? m.Personajes;
    if (c !== undefined) return c;
  }
  return SiluetasProvisionales;
}
const PintorDeCuerpos = elPintorDeCuerpos();

/* ═══ LO QUE ESTE APARATO RECUERDA ═══ (en un `try`: el almacén puede no estar) */
const LLAVE_DE_NOCHES = 'quiebro.aparato.noches-jugadas';
const LLAVE_DEL_ZURDO = 'quiebro.aparato.zurdo';
const LLAVE_DEL_SILENCIO = 'quiebro.aparato.silencio-avisado';

function leer(clave: string): string | null {
  try {
    return globalThis.localStorage?.getItem(clave) ?? null;
  } catch {
    return null;
  }
}
function escribir(clave: string, valor: string): void {
  try {
    globalThis.localStorage?.setItem(clave, valor);
  } catch {
    /* Sin almacén se juega igual: se olvida entre visitas. */
  }
}

/** ¿Es un aparato táctil? (o se pide con `?tactil=1`, para probar en un PC). */
function esTactil(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).get('tactil') === '1') return true;
  } catch {
    /* Una dirección rara no hace táctil a nadie. */
  }
  return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

/** Las fases en que hay sala que abrir. */
function hayQueJugar(v: VistaDelQuiebro | null): boolean {
  if (v === null) return false;
  const f = v.fase.tipo;
  return f === 'bajada' || f === 'oleada' || f === 'pausa' || f === 'llamada' || f === 'recuento' || f === 'interrumpida';
}

/** La música de cada fase (diseño §9). */
function musicaDeLaFase(v: VistaDelQuiebro | null): ModoDeLaMusica {
  if (v === null) return 'callada';
  switch (v.fase.tipo) {
    case 'oleada':
      return 'combate';
    case 'llamada':
      return 'llamada';
    case 'interrumpida':
    case 'cerrada':
      return 'callada';
    default:
      return 'calma';
  }
}

/** La fábrica de enchufes del navegador. */
const enchufeDelNavegador = (direccion: string): Enchufe => new WebSocket(direccion) as unknown as Enchufe;

const RELOJES_DEL_NAVEGADOR = {
  ahora: () => performance.now(),
  despues: (ms: number, hacer: () => void): unknown => setTimeout(hacer, ms),
  cancelar: (asa: unknown): void => clearTimeout(asa as ReturnType<typeof setTimeout>),
  azar: () => Math.random(),
};

export function Quiebro({ puerto, incrustado, alSalir, alOtraMesa, alMedir, enlaceParaEntrar }: PropsDelQuiebro): JSX.Element {
  /* ─── La mesa ─── */
  const [rev, ponerRev] = useState(0);
  useEffect(() => puerto.suscribir(() => ponerRev((r) => (r + 1) % 1_000_000)), [puerto]);
  const vistaCruda = puerto.vista;
  const codigo = puerto.codigo;
  const vista = useMemo(() => leerVistaDelQuiebro(vistaCruda), [vistaCruda, rev]);
  /*
   * SÓLO EN DESARROLLO, `?rayo=juguete`: la liza de ESTE aparato con el tiro de juguete (`red/tiro-de-prueba.ts`),
   * para probar el rayo en el juego mientras la sala no lo cumpla. El `import()` va dentro del bloque de desarrollo:
   * el empaquetado ni lo lleva. El tiro de juguete no toca el mundo: el lugar y la ciudad son los mismos.
   */
  const [conTiroDeJuguete, ponerConTiroDeJuguete] = useState<((l: LizaDeclarada) => LizaDeclarada) | null>(null);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let pedido = false;
    try {
      pedido = new URLSearchParams(window.location.search).get('rayo') === 'juguete';
    } catch {
      pedido = false;
    }
    if (!pedido) return;
    void import('./red/tiro-de-prueba').then((m) => ponerConTiroDeJuguete(() => m.conTiroDeJuguete));
  }, []);
  const liza = useMemo<LizaDeclarada | null>(() => {
    if (vista === null) return null;
    try {
      const deLaMesa = lizaDeLaMesa(ID_DEL_QUIEBRO, vistaCruda, codigo);
      return deLaMesa === null || conTiroDeJuguete === null ? deLaMesa : conTiroDeJuguete(deLaMesa);
    } catch {
      return null;
    }
  }, [vista, vistaCruda, codigo, conTiroDeJuguete]);
  /* Dónde se juega, guardado por identidad (ver «El barrio o la ciudad»). */
  const lugarAnterior = useRef<LugarDeLaNoche | null>(null);
  const avisoDelLugar = useRef<string | null>(null);
  const lugar = useMemo<LugarDeLaNoche | null>(() => {
    const leido = lugarDeLaMesa(vista, codigo, liza);
    if (leido.aviso !== null && leido.aviso !== avisoDelLugar.current && import.meta.env.DEV) console.warn(`[quiebro] ${leido.aviso}`);
    avisoDelLugar.current = leido.aviso;
    const antes = lugarAnterior.current;
    const nuevo = leido.lugar;
    const mismo =
      antes !== null &&
      nuevo !== null &&
      ((antes.tipo === 'barrio' && nuevo.tipo === 'barrio' && antes.barrio === nuevo.barrio) ||
        (antes.tipo === 'ciudad' && nuevo.tipo === 'ciudad' && antes.noche === nuevo.noche && antes.fallos.join(',') === nuevo.fallos.join(',')));
    const elegido = mismo ? antes : nuevo;
    lugarAnterior.current = elegido;
    return elegido;
  }, [vista, codigo, liza]);
  const enLaCiudad = lugar !== null && lugar.tipo === 'ciudad';

  /* ─── Lo que vive lo que vive el juego ─── */
  const mandos = useMemo(() => new EstadoDeLosMandos(), []);
  const sonido = useMemo<Sonido>(() => crearSonido(), []);
  useEffect(() => () => sonido.destruir(), [sonido]);
  const sistema = useMemo<SistemaDeEfectos>(() => crearSistemaDeEfectos(crearRelojDePresentacion(), performance.now()), []);
  const llave = puerto.llave;
  const servidor = puerto.servidor;
  const partida = useMemo(() => {
    if (llave === null) return null;
    const origen = typeof location === 'undefined' ? 'http://localhost' : location.origin;
    return new Partida({
      direccion: direccionDeLaLiza(servidor, origen, codigo),
      llave,
      fabrica: enchufeDelNavegador,
      relojes: RELOJES_DEL_NAVEGADOR,
      mandos,
    });
  }, [codigo, llave, servidor, mandos]);
  useEffect(() => () => partida?.cerrar(), [partida]);
  /*
   * EL RAYO PROPIO (contrato del rayo §5.1): la partida llama a los efectos en el acto (empezar, actualizar,
   * cancelar, soltar), leyendo `sistema.rayo` en cada llamada, y saca la mano de `sistema.boca`.
   */
  useEffect(() => {
    if (partida === null) return undefined;
    partida.efectos = sistema;
    return () => {
      partida.efectos = null;
    };
  }, [partida, sistema]);
  const partidaViva = useRef<Partida | null>(null);
  partidaViva.current = partida;
  const escena = useMemo(() => (partida === null ? null : new Escenificador(partida, sistema, sonido)), [partida, sistema, sonido]);
  /* El mapa vivo de la partida: el minimapa, el plano y el rumbo lo leen (ver `red/orientarse.ts`). */
  const mapa = useMemo(() => (partida === null ? null : new OrientacionDeLaPartida(partida)), [partida]);
  /* El reloj de la Bajada (la preparación) y la cámara del lienzo, que el HUD lee fuera de él. */
  const bajada = useMemo(() => new RelojDeLaBajada(), []);
  const ojo = useRef<Camera | null>(null);

  /*
   * SÓLO EN DESARROLLO: las piezas vivas en `window.__quiebro`, para mirarlas desde la consola (como
   * `window.__banco` en los bancos). El empaquetado no lo lleva: `import.meta.env.DEV` es `false` allí y
   * el bloque entero se cae al compilar. La escena añade lo suyo (`medir`, el renderizador).
   */
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __quiebro?: Record<string, unknown> };
    w.__quiebro = { ...(w.__quiebro ?? {}), partida, mandos, sistema, sonido, bajada, forzarElNivel, mapa, lugar };
  }, [partida, mandos, sistema, sonido, bajada, mapa, lugar]);

  /* Al fondo, callado (ver la cabecera). */
  useEffect(
    () =>
      escucharElFondo((fondo) => {
        mandos.soltarTodo();
        partida?.callar(fondo);
      }),
    [mandos, partida],
  );

  /* El latido de la red, aparte de los fotogramas (ver `Partida.latir`). */
  useEffect(() => {
    if (partida === null) return;
    const id = setInterval(() => partida.latir(performance.now()), 25);
    return () => clearInterval(id);
  }, [partida]);

  /* La declaración y el canal siguen a la vista. */
  useEffect(() => {
    if (partida === null) return;
    partida.ponerLaDeclaracion(liza, lugar, puerto.yo);
    partida.estilos = vista?.reglamento.asientos.map((a) => Math.max(0, IDS_DE_ESTILO.indexOf(a.estilo))) ?? [];
    partida.apagon = vista?.reglamento.averia === 'apagon';
    partida.asegurarElCanal(hayQueJugar(vista) && liza !== null);
  }, [partida, liza, lugar, vista, puerto.yo]);

  /* ─── BAJAR, y lo que recuerda el aparato ─── */
  const [bajado, ponerBajado] = useState(false);
  const [primeraNoche, ponerPrimeraNoche] = useState(() => leer(LLAVE_DE_NOCHES) === null);
  const [zurdo, ponerZurdo] = useState(() => leer(LLAVE_DEL_ZURDO) === '1');
  const [avisoDelSilencio, ponerAvisoDelSilencio] = useState(false);
  const tactil = useMemo(esTactil, []);
  const alBajar = useCallback(() => {
    void sonido.desbloquear();
    ponerBajado(true);
    if (sonido.puedeCallarElInterruptor && leer(LLAVE_DEL_SILENCIO) === null) {
      escribir(LLAVE_DEL_SILENCIO, '1');
      ponerAvisoDelSilencio(true);
      setTimeout(() => ponerAvisoDelSilencio(false), 6000);
    }
  }, [sonido]);
  /* Una noche que llega al recuento cuenta como jugada: la siguiente ya no es la primera. */
  const fase = vista?.fase.tipo ?? null;
  useEffect(() => {
    if (fase === 'recuento' && primeraNoche) {
      escribir(LLAVE_DE_NOCHES, '1');
      ponerPrimeraNoche(false);
    }
  }, [fase, primeraNoche]);

  /*
   * LA PRIMERA NOCHE DEL APARATO: los quiebros de aprender (diseño §2.1). Lo sabe este aparato y sólo él,
   * y el reductor lo admite desde la Bajada (no en la reunión, que se rehace con quien se siente): se
   * manda UNA vez por noche en cuanto la mesa lo ofrece.
   */
  const aprendizPedido = useRef<number | null>(null);
  useEffect(() => {
    const noche = vista?.noche?.numero ?? null;
    if (!primeraNoche || noche === null || aprendizPedido.current === noche) return;
    if (!puerto.opciones.some((o) => o.tipo === 'aprendiz')) return;
    aprendizPedido.current = noche;
    void puerto.mover({ tipo: 'aprendiz', carga: null });
  }, [vista, primeraNoche, puerto, rev]);

  /* ─── La música, el ambiente y los rótulos de cada fase ─── */
  const [rotuloDeFase, ponerRotuloDeFase] = useState<string | null>(null);
  const oleada = vista !== null && (vista.fase.tipo === 'oleada' || vista.fase.tipo === 'pausa') ? vista.fase.oleada : 0;
  useEffect(() => {
    sonido.musica({ modo: musicaDeLaFase(vista) });
    let texto: string | null = null;
    if (fase === 'oleada' && oleada >= 2) texto = NOMBRES_DEL_QUIEBRO.pantalla.vienenMas;
    if (fase === 'llamada') {
      texto = NOMBRES_DEL_QUIEBRO.pantalla.suenaUnaCabina;
      /* El Bis: el trozo de ciudad que se repite y avisa de la Llamada (diseño §8, momento 7). */
      const yo = partida?.yo() ?? null;
      const donde = yo === null ? null : (partida?.sitioDe(yo) ?? null);
      sistema.bis({ x: donde?.x ?? 0, z: donde?.z ?? 0 }, performance.now());
      sonido.bis();
    }
    ponerRotuloDeFase(texto);
    if (texto === null) return;
    const t = setTimeout(() => ponerRotuloDeFase(null), 2800);
    return () => clearTimeout(t);
    // Sólo al cambiar de fase: la vista cambia con cada voto y eso no es otra fase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, oleada]);
  useEffect(() => {
    if (lugar !== null) sonido.ambiente({ tiempo: tiempoDelLugar(lugar), bajoTecho: 0, ciudad: 1 });
  }, [lugar, sonido]);

  /* ─── Mover en la mesa ─── */
  const mover = useCallback((tipo: string, carga: unknown): Promise<SalidaDelMovimiento> => puerto.mover({ tipo, carga }), [puerto]);

  /* ─── Los mandos de PC ─── */
  const superficie = useRef<HTMLDivElement>(null);
  const [marcador, ponerMarcador] = useState(false);
  const [menu, ponerMenu] = useState(false);
  const jugandoAhora = useRef(false);
  jugandoAhora.current = bajado && !menu && (fase === 'oleada' || fase === 'llamada' || fase === 'bajada');
  useEffect(() => {
    const s = superficie.current;
    if (s === null) return;
    return engancharElTeclado(mandos, {
      superficie: s,
      activo: () => jugandoAhora.current,
      alMarcador: ponerMarcador,
      alMenu: () => ponerMenu((m) => !m),
      /* El blanco que la mira del rayo tiene debajo al soltar la R. */
      blancoDelRayo: () => partidaViva.current?.rayo.blanco ?? 0,
    });
  }, [mandos]);
  useEffect(() => {
    if (!jugandoAhora.current) mandos.soltarTodo();
  }, [menu, fase, mandos]);

  const [nivelActual, ponerNivelActual] = useState<0 | 1 | 2 | 3>(1);
  const alNivel = useCallback(
    (n: 0 | 1 | 2 | 3) => {
      ponerNivelActual(n);
      sonido.calidad(n === 0 ? 'baja' : 'alta');
      alMedir?.(n, n === 0 ? 'sobria' : 'plena');
    },
    [sonido, alMedir],
  );

  const modo: ModoDeLaCamara = vista === null || fase === 'reunion' || fase === 'final' || fase === 'cerrada' || partida === null ? 'orbita' : fase === 'bajada' ? 'bajada' : 'juego';
  /* Lo que el reloj de la Bajada mira en cada fotograma: la clave de la fase y si están todos listos. */
  const claveDeLaMesa = useMemo(() => (vista === null ? '' : claveDeLaFase(vista)), [vista]);
  const todosListos = useMemo(() => vista !== null && vista.fase.tipo === 'bajada' && quienesFaltanEnLaBajada(vista).length === 0, [vista]);

  return (
    <div className={incrustado ? 'quiebro-raiz incrustado' : 'quiebro-raiz'} data-nivel={nivelActual}>
      <div className="quiebro-lienzo" ref={superficie}>
        <Canvas
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          camera={{ fov: 70, near: 0.1, far: 900, position: [0, 22, 34] }}
          dpr={1}
          onCreated={({ gl }) => {
            gl.toneMappingExposure = 1.1;
          }}
        >
          <Escena
            codigo={codigo}
            vista={vista}
            lugar={lugar}
            partida={partida}
            escena={escena}
            sistema={sistema}
            sonido={sonido}
            mandos={mandos}
            modo={modo}
            bajada={bajada}
            claveDeLaMesa={claveDeLaMesa}
            todosListos={todosListos}
            ojo={ojo}
            tactil={tactil}
            alNivel={alNivel}
          />
        </Canvas>
      </div>
      <div className={enLaCiudad && bajado && (fase === 'oleada' || fase === 'llamada' || fase === 'pausa') ? 'quiebro-hud q-con-minimapa' : 'quiebro-hud'}>
        {bajado && tactil && (fase === 'oleada' || fase === 'llamada') && !menu ? (
          <MandosTactiles mandos={mandos} partida={partida} zurdo={zurdo} />
        ) : null}
        <Hud
          vista={vista}
          puerto={puerto}
          partida={partida}
          escena={escena}
          mandos={mandos}
          sonido={sonido}
          mover={mover}
          bajado={bajado}
          alBajar={alBajar}
          primeraNoche={primeraNoche}
          rotuloDelBarrio={rotuloDelLugar(lugar)}
          rotuloDeFase={rotuloDeFase}
          marcador={marcador}
          alMarcador={ponerMarcador}
          menu={menu}
          alMenu={ponerMenu}
          zurdo={zurdo}
          alZurdo={(z) => {
            ponerZurdo(z);
            escribir(LLAVE_DEL_ZURDO, z ? '1' : '0');
          }}
          tactil={tactil}
          alSalir={alSalir}
          alOtraMesa={alOtraMesa ?? (() => alSalir?.())}
          avisoDelSilencio={avisoDelSilencio}
          bajada={bajada}
          ojo={ojo}
          mapa={mapa}
          enLaCiudad={enLaCiudad}
          {...(enlaceParaEntrar === undefined ? {} : { enlaceParaEntrar })}
        />
      </div>
    </div>
  );
}

interface PropsDeLaEscena {
  readonly codigo: string;
  readonly vista: VistaDelQuiebro | null;
  readonly lugar: LugarDeLaNoche | null;
  readonly partida: Partida | null;
  readonly escena: Escenificador | null;
  readonly sistema: SistemaDeEfectos;
  readonly sonido: Sonido;
  readonly mandos: EstadoDeLosMandos;
  readonly modo: ModoDeLaCamara;
  readonly bajada: RelojDeLaBajada;
  readonly claveDeLaMesa: string;
  readonly todosListos: boolean;
  readonly ojo: MutableRefObject<Camera | null>;
  readonly tactil: boolean;
  readonly alNivel: (n: 0 | 1 | 2 | 3) => void;
}

/** La plaza de la reunión: la Glorieta del Relojero (la misma lista siempre, para no rehacer la ciudad). */
const FALLOS_DE_LA_REUNION: readonly number[] = Object.freeze([1]);

/** Lo que el director de los personajes dice que pintó (el de `personajes/director.ts`, sin importarlo). */
interface DirectorQueMide {
  readonly medida: { readonly llamadas: number; readonly triangulos: number };
  /** La boca del rayo (`rayo/contrato.ts`): dónde está la mano de cada cuerpo. Un pintor sin ella no la da. */
  readonly bocaDe?: BocaDe;
}

/** LO QUE VA DENTRO DEL LIENZO: el nivel, el bucle y las piezas de cada frente. */
function Escena(p: PropsDeLaEscena): JSX.Element {
  /* En la Bajada y en la pelea el nivel no cambia: recompilar toda la ciudad congelaría la imagen segundos. */
  const modoVivo = useRef(p.modo);
  modoVivo.current = p.modo;
  const nivel = usarElNivel({
    nivelQuieto: () => modoVivo.current !== 'orbita',
    claveDelBloque: p.modo,
    esconderAlCompilar: () => modoVivo.current !== 'juego',
  });
  const remanso = useRef(0);
  const { alNivel } = p;
  useEffect(() => alNivel(nivel.nivel), [nivel.nivel, alNivel]);
  const ultimaRacha = useRef(-1);
  const camara = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  p.ojo.current = camara;
  const director = useRef<DirectorQueMide | null>(null);
  const nivelVivo = useRef(nivel.nivel);
  nivelVivo.current = nivel.nivel;
  const { sistema: sistemaDeEfectos } = p;
  const alDirector = useCallback(
    (d: unknown) => {
      director.current = (d as DirectorQueMide | null) ?? null;
      /* LA BOCA DEL RAYO: la mano que exponen los personajes, en el sistema de efectos (`rayo/contrato.ts`). */
      sistemaDeEfectos.boca = director.current?.bocaDe ?? null;
    },
    [sistemaDeEfectos],
  );

  /*
   * SÓLO EN DESARROLLO: `__quiebro.medir()` dice lo que cuesta el fotograma DE VERDAD —la escena y el
   * total con los pases, como los cuenta el posproceso (`calidad/medida.ts`), y lo que pintaron los
   * personajes según su director—. Es lo que se mira para repartir las cuotas del presupuesto con el
   * juego entero delante, y no pieza a pieza en su banco.
   */
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __quiebro?: Record<string, unknown> };
    w.__quiebro = {
      ...(w.__quiebro ?? {}),
      gl,
      medir: () => {
        const c = laCuentaDe(gl);
        const d = director.current;
        return {
          nivel: nivelVivo.current,
          escena: c === null ? { llamadas: gl.info.render.calls, triangulos: gl.info.render.triangles } : { llamadas: c.llamadasDeLaEscena, triangulos: c.triangulosDeLaEscena },
          total: c === null ? null : { llamadas: c.llamadas, triangulos: c.triangulos },
          personajes: d === null ? null : { llamadas: d.medida.llamadas, triangulos: d.medida.triangulos },
        };
      },
    };
  }, [gl]);

  useFrame((_estado, dt) => {
    const ahora = performance.now();
    p.escena?.drenar(ahora);
    p.partida?.fotograma(ahora, Math.min(0.1, dt));
    /* La Bajada: lo que ve la mesa y lo que dijo la sala (ver `red/bajada.ts`). */
    const faseDeLaSala = p.partida?.sala.fase ?? null;
    p.bajada.observar(
      {
        fase: p.vista?.fase.tipo ?? null,
        noche: p.vista?.noche?.numero ?? null,
        reloj: p.vista?.reloj ?? null,
        todosListos: p.todosListos,
        clave: p.claveDeLaMesa,
        deLaSala: faseDeLaSala,
      },
      ahora,
    );
    p.escena?.cadaFotograma(ahora, p.lugar);
    remanso.current = p.sistema.reloj.intensidad(ahora);
    /* La racha mete percusión (diseño §9): se le dice a la música sólo cuando cambia. */
    const partida = p.partida;
    const reglas = partida?.lectura?.reglas ?? null;
    if (partida !== null && reglas !== null && p.vista?.fase.tipo === 'oleada') {
      const mult = partida.sala.cuentas.get(partida.sala.yo)?.mult ?? UNO;
      const paso = Math.max(1, reglas.puntos.multiplicador.paso);
      const racha = Math.max(0, Math.round((mult - UNO) / paso));
      if (racha !== ultimaRacha.current) {
        ultimaRacha.current = racha;
        p.sonido.musica({ modo: 'combate', racha });
      }
    }
  }, -3);

  const reloj = useCallback(() => p.sistema.reloj.presentado(performance.now()) / 1000, [p.sistema]);
  const tic = useCallback(() => p.partida?.ticDeLosDurmientes() ?? performance.now() / 50, [p.partida]);
  const presentado = useCallback((t: number) => p.sistema.reloj.presentado(t), [p.sistema]);
  const caida = useCallback((t: number) => p.bajada.caida(t), [p.bajada]);
  const noche = p.vista?.noche?.numero ?? null;
  const lugar = p.lugar;
  /* La ciudad abierta con su traza, sus plazas y sus despejadas; el barrio, sin nada de eso. */
  const deLaCiudad = lugar !== null && lugar.tipo === 'ciudad' ? { traza: lugar.traza, fallos: lugar.fallos, despejadas: lugar.despejadas } : {};
  const barrio = lugar !== null && lugar.tipo === 'barrio' ? lugar.barrio : null;

  return (
    <>
      {noche !== null ? (
        <LaCiudadDeNoche codigo={p.codigo} noche={noche} nivel={nivel.nivel} reloj={reloj} tic={tic} farolasEncendidas={p.vista?.reglamento.averia === 'apagon' ? 0 : 1} {...deLaCiudad} />
      ) : p.vista !== null ? (
        /*
         * La reunión: aún no hay traza (se sortea al empezar) y la cámara da vueltas sobre la Glorieta del
         * Relojero, que está en el centro de todas. Se pinta la de la traza 0, como el mundo de la reunión
         * del productor; al empezar, la Bajada escribe la de la mesa desde lo alto.
         */
        <LaCiudadDeNoche codigo={p.codigo} noche={1} nivel={nivel.nivel} reloj={reloj} traza={0} fallos={FALLOS_DE_LA_REUNION} />
      ) : (
        <LaCiudadDeNoche codigo={p.codigo} noche={1} nivel={nivel.nivel} reloj={reloj} />
      )}
      <EfectosDelQuiebro sistema={p.sistema} nivel={nivel.nivel} semillaDelCielo={semillaDelLugar(lugar)} />
      {p.partida !== null ? <PintorDeCuerpos fuente={p.partida} nivel={nivel.nivel} barrio={barrio} presentado={presentado} alDirector={alDirector} /> : null}
      {p.partida !== null && p.escena !== null ? (
        <CamaraDelQuiebro
          partida={p.partida}
          mandos={p.mandos}
          escena={p.escena}
          sistema={p.sistema}
          sonido={p.sonido}
          lugar={p.lugar}
          modo={p.modo}
          caida={caida}
          tactil={p.tactil}
        />
      ) : (
        <CamaraDeOrbita tactil={p.tactil} />
      )}
      <Posproceso nivel={nivel.nivel} capacidades={nivel.capacidades} remanso={remanso} sistema={p.sistema} />
    </>
  );
}

/** Sin asiento (quien mira) o sin partida: la cámara da vueltas sobre la plaza. */
function CamaraDeOrbita({ tactil }: { readonly tactil: boolean }): null {
  useFrame((estado) => {
    const a = (performance.now() / 1000) * 0.05;
    const cam = estado.camera as import('three').PerspectiveCamera;
    cam.position.set(Math.sin(a) * 34, 22, Math.cos(a) * 34);
    cam.lookAt(0, 2, 0);
    const fov = tactil ? 75 : 70;
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  }, -2);
  return null;
}
