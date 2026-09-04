/**
 * EL MUELLE EN EL ESCRITORIO: la escena a pantalla completa detrás, el raíl al lado.
 *
 * ═══ QUÉ ES ═══
 *
 * Lo que se pinta en `/sala/riberas` mientras la mesa no ha empezado
 * (`docs/EL-MUELLE.md`, §1.4 y §5): el embarcadero de `escenas/embarcadero/`
 * montado en un `Canvas` de r3f, y encima, a la derecha, el raíl de 22 rem con el
 * vestíbulo de siempre —nombre, plazo, abrir, código— más lo que el muelle añade:
 * la figura, el código que se copia, los sentados con su presencia, y la llamada
 * a zarpar cuando el juego la ofrece.
 *
 * ═══ EL HUD NUNCA DEPENDE DEL `Canvas` ═══
 *
 * Es la regla del §5 y aquí se paga en tres sitios. El raíl se pinta con datos de
 * `mesa.ts` y no le pregunta nada a la escena. El `Canvas` va dentro de un límite
 * de error propio (`LimiteDelMundo`): si WebGL no arranca, la excepción NO sube
 * hasta la red de seguridad de la Sala —que la tumbaría entera— sino que se
 * convierte en un `alFallar` y el telón dice qué faltó. Y el `Canvas` sólo se
 * monta con `window` delante: `verificar-escritorio` renderiza este componente
 * con `renderToStaticMarkup` en Node, donde no hay ni ventana ni contexto de
 * dibujo, y lo que se comprueba allí es justamente que el raíl entero existe sin
 * que el mundo exista.
 *
 * ═══ POR QUÉ EL MUNDO NO SE PIDE MIENTRAS SE ESTÁ «YENDO» A UNA MESA GUARDADA ═══
 *
 * Al recargar con un asiento en el bolsillo, `mesa.ts` arranca en `yendo` y
 * pregunta al servidor si la llave vale. Si la mesa ya empezó, la Sala pinta el
 * tablero directamente (§6.6) y este componente se desmonta al instante: montar
 * el `Canvas`, pedir el `.glb` y tirarlo todo medio segundo después es trabajo
 * que se ve como un parpadeo negro. Así que mientras la fase sea `yendo` sin
 * haber visto nada antes, sólo está el telón; en cuanto se sabe que hay orilla o
 * muelle que enseñar, el mundo se pide y ya no se suelta hasta zarpar.
 *
 * ═══ ZARPAR: LA ESCENA MANDA, PERO CON TOPE ═══
 *
 * `zarpando` llega de la Sala cuando `empezada` pasa a `true` EN LA VISTA, nunca
 * al pulsar (§3). La coreografía la hace la escena y avisa con `alZarpar`; si
 * tarda más de `TOPE_DE_ZARPAR_MS`, si el mundo no llegó a cargar, o si quien
 * mira pulsa la escena, se desembarca igual. Una animación que puede dejar a
 * alguien sin tablero no es una animación: es un cerrojo.
 *
 * ═══ LO QUE ESTO NO IMPORTA ═══
 *
 * Nada de `app/` (lo vigila `verify:fronteras`) y nada de `drei`. De `escenas/`
 * sólo lo que el contrato exporta: la escena, la lista de figuras y el tema.
 */
import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping } from 'three';
import { Embarcadero } from '../../escenas/embarcadero/Embarcadero';
import { esFigura, FIGURAS, figura as datosDeFigura, figuraQueSePinta } from '../../escenas/embarcadero/figuras';
import type { FiguraId } from '../../escenas/embarcadero/figuras';
import type { TemaDelMuelle } from '../../escenas/embarcadero/tema';
import type { MesaEnElMuelle, Traer, Ventana } from '../../escenas/embarcadero/tipos';
import { esLaOpcionDeEmpezar, haEmpezado } from './empezada';
import { figuraDeEstreno, guardarFigura } from './figura';
import type { LaMesa, MesaVista } from './mesa';
import type { ArcadeDelCatalogo } from './muebles';
import { loQueSeDiceDeUnFallo } from './red-de-seguridad';
import { BASE, PLAZOS } from './sala';

/** Lo que se le da a la coreografía de zarpar antes de cambiar de pantalla sin ella. */
export const TOPE_DE_ZARPAR_MS = 3500;

/** Cuánto dura el «copiado» junto al botón. Lo que se tarda en mirarlo. */
const COPIADO_MS = 1600;

/**
 * Los bytes de un modelo, por la misma ruta relativa que pide la app.
 *
 * En desarrollo pasa por el proxy de Vite y en producción es el mismo Node que
 * sirve esta página (`vite.config.ts`). Vive fuera del componente para que su
 * identidad no cambie en cada render: la escena la recibe por props.
 */
const traer: Traer = async (ruta) => {
  const r = await fetch(ruta);
  if (!r.ok) throw new Error(`${ruta} contestó ${String(r.status)}`);
  return r.arrayBuffer();
};

export interface LoQueVeElMuelle {
  manifiesto: ArcadeDelCatalogo;
  tema: TemaDelMuelle;
  mesa: LaMesa;
  silla: string;
  codigoDeLaUrl: string;
  /** La partida ha empezado EN LA VISTA: toca la coreografía de zarpar. */
  zarpando: boolean;
  /** La coreografía terminó o se saltó: la Sala ya puede pintar el tablero. */
  alDesembarcar: () => void;
}

export function Muelle({
  manifiesto,
  tema,
  mesa,
  silla,
  codigoDeLaUrl,
  zarpando,
  alDesembarcar,
}: LoQueVeElMuelle): JSX.Element {
  const puesta = mesa.fase === 'dentro' ? mesa.mesa : null;
  const dentro = puesta !== null;
  const { vestir } = mesa;

  // -------------------------------------------------------------------------
  // La figura
  // -------------------------------------------------------------------------

  const [figura, ponerFigura] = useState<FiguraId>(() => figuraDeEstreno(silla));
  const [eligiendo, ponerEligiendo] = useState(false);

  /*
   * AL LLEGAR A UNA MESA, SI MI ASIENTO YA TRAE FIGURA, MANDA LA SUYA. Es el
   * caso de recargar: la que guarda el servidor es la que ven los demás, y una
   * ventana que se levantara con otra distinta estaría contradiciendo a cinco
   * pantallas. Sólo al ver un código NUEVO: después de eso el que manda soy yo,
   * porque cada elección se pone en pantalla al instante y viaja con `vestir`.
   */
  const codigoVisto = useRef<string | null>(null);
  useEffect(() => {
    if (puesta === null) {
      codigoVisto.current = null;
      return;
    }
    if (codigoVisto.current === puesta.codigo) return;
    codigoVisto.current = puesta.codigo;
    const mia = puesta.asientos.find((a) => a.id === puesta.yo)?.figura;
    if (esFigura(mia) && mia !== figura) {
      ponerFigura(mia);
      guardarFigura(silla, mia);
    }
  }, [puesta, figura, silla]);

  const elegir = useCallback(
    (id: FiguraId) => {
      ponerFigura(id);
      guardarFigura(silla, id);
      if (dentro) vestir(id);
    },
    [silla, dentro, vestir],
  );

  /*
   * TECLAS 1 A 6, como los atajos del formulario y con la misma cortesía: nunca
   * mientras se escribe en un campo, o teclear «1» en el nombre cambiaría de
   * aventurero.
   */
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent): void => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const activo = document.activeElement;
      if (
        activo instanceof HTMLInputElement ||
        activo instanceof HTMLTextAreaElement ||
        activo instanceof HTMLSelectElement
      ) {
        return;
      }
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > FIGURAS.length) return;
      const elegida = FIGURAS[n - 1];
      if (elegida === undefined) return;
      e.preventDefault();
      elegir(elegida.id);
    };
    window.addEventListener('keydown', alPulsar);
    return () => {
      window.removeEventListener('keydown', alPulsar);
    };
  }, [elegir]);

  // -------------------------------------------------------------------------
  // El mundo
  // -------------------------------------------------------------------------

  const [mundoPedido, ponerMundoPedido] = useState(mesa.fase !== 'yendo');
  useEffect(() => {
    if (mesa.fase !== 'yendo') ponerMundoPedido(true);
  }, [mesa.fase]);

  const [listo, ponerListo] = useState(false);
  const [fallo, ponerFallo] = useState<string | null>(null);
  const alEstarListo = useCallback(() => {
    ponerListo(true);
  }, []);
  const alFallar = useCallback((motivo: string) => {
    ponerFallo(motivo);
  }, []);

  /*
   * La ventana que ve la cámara es el CONTENEDOR, no `window`: en una ventana
   * estrecha la escena ocupa 46vh arriba y el raíl va debajo, y la cámara tiene
   * que encuadrar eso. `franjaInferior` es 0 porque aquí el HUD va al lado, no
   * encima (ver `Ventana` en el contrato).
   */
  const contenedor = useRef<HTMLDivElement | null>(null);
  const [ventana, ponerVentana] = useState<Ventana>({ ancho: 1280, alto: 720, franjaInferior: 0 });
  useEffect(() => {
    const el = contenedor.current;
    if (el === null || typeof ResizeObserver === 'undefined') return;
    const medir = (): void => {
      const caja = el.getBoundingClientRect();
      ponerVentana({
        ancho: Math.max(1, Math.round(caja.width)),
        alto: Math.max(1, Math.round(caja.height)),
        franjaInferior: 0,
      });
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => {
      observador.disconnect();
    };
  }, []);

  const mesaEnElMuelle = useMemo<MesaEnElMuelle>(
    () => ({
      codigo: puesta?.codigo ?? null,
      asientos: puesta?.asientos ?? [],
      yo: puesta?.yo ?? null,
      empezada: puesta !== null && haEmpezado(puesta),
      aforo: manifiesto.jugadores,
      tema,
    }),
    [puesta, manifiesto.jugadores, tema],
  );

  // -------------------------------------------------------------------------
  // Zarpar
  // -------------------------------------------------------------------------

  const desembarcado = useRef(false);
  const desembarcar = useCallback(() => {
    if (desembarcado.current) return;
    desembarcado.current = true;
    alDesembarcar();
  }, [alDesembarcar]);

  useEffect(() => {
    if (!zarpando) {
      desembarcado.current = false;
      return;
    }
    /*
     * Sin mundo no hay coreografía que esperar: al tablero. Y SÓLO sin mundo:
     * `alFallar` puede llegar por una sola figura que no se abrió, con la cala y
     * los demás en pie, y eso no es motivo para saltarse el zarpe. Si lo que
     * falló fue el embarcadero entero, el contrato dice que la escena avisa
     * `alZarpar` en el fotograma siguiente, así que tampoco hay que adivinarlo
     * aquí: basta con el telón (`listo`) y el tope.
     */
    if (!listo) {
      desembarcar();
      return;
    }
    const tope = setTimeout(desembarcar, TOPE_DE_ZARPAR_MS);
    return () => {
      clearTimeout(tope);
    };
  }, [zarpando, listo, desembarcar]);

  // -------------------------------------------------------------------------

  const conMundo = typeof window !== 'undefined' && mundoPedido;

  return (
    <main className="muelle">
      <div
        className="muelle-escena"
        ref={contenedor}
        onClick={zarpando ? desembarcar : undefined}
      >
        {conMundo ? (
          <LimiteDelMundo alFallar={alFallar}>
            <Canvas
              dpr={[1, 2]}
              gl={{ antialias: true }}
              camera={{ fov: 55, near: 0.3, far: 1500 }}
              onCreated={({ gl }) => {
                gl.toneMapping = ACESFilmicToneMapping;
                gl.toneMappingExposure = 0.95;
              }}
            >
              <Embarcadero
                mesa={mesaEnElMuelle}
                ventana={ventana}
                traer={traer}
                calidad="plena"
                /*
                 * Mi figura sólo se prueba en la orilla o sentado. Mirando una mesa
                 * ajena sin asiento (`yo` nulo con código), ponerla pintaría a un
                 * séptimo aventurero en la cabeza del muelle y dejaría fuera a uno
                 * de los seis de verdad.
                 */
                figuraQuePruebo={mesaEnElMuelle.codigo === null || mesaEnElMuelle.yo !== null ? figura : undefined}
                zarpando={zarpando}
                alEstarListo={alEstarListo}
                alZarpar={desembarcar}
                alFallar={alFallar}
              />
            </Canvas>
          </LimiteDelMundo>
        ) : null}
        {!listo ? (
          <div className="muelle-telon">
            <p className="muelle-lugar">{tema.lugar}</p>
            <p className="letra-chica">
              {fallo === null ? tema.espera : `El mundo no ha arrancado: ${fallo}. Se abre, se entra y se reparte igual.`}
            </p>
          </div>
        ) : fallo !== null ? (
          <p className="muelle-falta letra-chica">Algo del mundo no ha llegado: {fallo}.</p>
        ) : null}
      </div>

      <div className="muelle-hoja">
        <div className="muelle-hueco">
          <h1 className="titulo">{manifiesto.nombre}</h1>
          {zarpando ? <p className="muelle-zarpando">{tema.zarpar}</p> : null}
        </div>

        <aside className="rail muelle-rail">
          {mesa.aviso.length > 0 ? <p className="aviso">{mesa.aviso}</p> : null}
          {eligiendo ? (
            <Figuras
              elegida={figura}
              alElegir={elegir}
              alVolver={() => {
                ponerEligiendo(false);
              }}
            />
          ) : null}
          {puesta === null ? (
            <EnLaOrilla
              escondida={eligiendo}
              mesa={mesa}
              codigoDeLaUrl={codigoDeLaUrl}
              minimo={manifiesto.jugadores.minimo}
              figura={figura}
              alCambiar={() => {
                ponerEligiendo(true);
              }}
            />
          ) : (
            <EnElMuelle
              escondida={eligiendo}
              mesa={mesa}
              puesta={puesta}
              tema={tema}
              aforo={manifiesto.jugadores}
              zarpando={zarpando}
              alSaltar={desembarcar}
              alCambiar={() => {
                ponerEligiendo(true);
              }}
            />
          )}
        </aside>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// El límite del mundo
// ---------------------------------------------------------------------------

/**
 * Si el `Canvas` revienta al nacer —sin WebGL, sin contexto—, aquí se para.
 *
 * Es la misma clase que `RedDeSeguridad` con el trabajo contrario: aquélla pinta
 * una pantalla porque la Sala ya no se puede pintar; ésta no pinta NADA porque
 * la Sala sigue entera —el raíl abre, entra y reparte— y lo único que hay que
 * hacer es decirlo, que lo hace el telón con el motivo.
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
// En la orilla: antes de sentarse
// ---------------------------------------------------------------------------

/**
 * Los mismos campos que el `Vestibulo` de la Sala, más la figura.
 *
 * Se esconde con `hidden` en vez de desmontarse mientras se elige figura, para
 * que el nombre y el código tecleados sigan ahí al volver: elegir aventurero es
 * un paréntesis, no otra pantalla.
 */
function EnLaOrilla({
  escondida,
  mesa,
  codigoDeLaUrl,
  minimo,
  figura,
  alCambiar,
}: {
  escondida: boolean;
  mesa: LaMesa;
  codigoDeLaUrl: string;
  minimo: number;
  figura: FiguraId;
  alCambiar: () => void;
}): JSX.Element {
  const [nombre, ponerNombre] = useState('');
  const [codigo, ponerCodigo] = useState(codigoDeLaUrl);
  /* El índice y no los segundos, por lo que cuenta el `Vestibulo`: `undefined` y `0` son distintos. */
  const [cualPlazo, ponerCualPlazo] = useState(0);
  const plazo = PLAZOS[cualPlazo];
  const laFigura = datosDeFigura(figura);

  return (
    <div className="muelle-tramo" hidden={escondida}>
      <section className="panel">
        <h2 className="rotulo-de-panel">Quién eres</h2>
        <p className="letra-chica">
          Es lo que ven los demás en el muelle. No es una cuenta: no hay correo ni contraseña, y
          muere con la partida.
        </p>
        <input
          className="campo"
          value={nombre}
          maxLength={24}
          placeholder="Tu nombre"
          onChange={(e) => {
            ponerNombre(e.target.value);
          }}
        />
        <div className="muelle-figura">
          <span className="opcion-texto">
            <span className="opcion-rotulo figura-nombre">{laFigura.nombre}</span>
            <span className="opcion-ayuda">{laFigura.nota}</span>
          </span>
          <button type="button" className="opcion opcion-sobria opcion-corta" onClick={alCambiar}>
            <span className="opcion-texto">
              <span className="opcion-rotulo">Cambiar</span>
            </span>
          </button>
        </div>
      </section>

      <section className="panel">
        <h2 className="rotulo-de-panel">Abrir una mesa</h2>
        <p className="letra-chica">
          {minimo > 1
            ? `Hacen falta ${String(minimo)} para zarpar: al abrir sale un código que se pasa a los demás.`
            : 'Sale un código por si quieres que se siente alguien más.'}
        </p>
        <select
          className="campo"
          value={cualPlazo}
          aria-label="Plazo por turno"
          onChange={(e) => {
            ponerCualPlazo(Number(e.target.value));
          }}
        >
          {PLAZOS.map((p, i) => (
            <option value={i} key={p.rotulo}>
              {p.rotulo}
            </option>
          ))}
        </select>
        {plazo === undefined ? null : <p className="letra-chica">{plazo.ayuda}</p>}
        <button
          type="button"
          className="opcion"
          disabled={mesa.quieto}
          onClick={() => {
            mesa.abrir(nombre.trim(), plazo?.segundos, figura);
          }}
        >
          <span className="opcion-texto">
            <span className="opcion-rotulo">Abrir mesa</span>
          </span>
        </button>
      </section>

      <section className="panel">
        <h2 className="rotulo-de-panel">Entrar con un código</h2>
        <p className="letra-chica">Cinco letras. Da igual mayúsculas o minúsculas.</p>
        <input
          className="campo campo-codigo"
          value={codigo}
          maxLength={8}
          placeholder="ABCDE"
          onChange={(e) => {
            ponerCodigo(e.target.value.toUpperCase());
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && codigo.trim().length > 0) mesa.entrar(codigo, nombre.trim(), figura);
          }}
        />
        <button
          type="button"
          className="opcion"
          disabled={mesa.quieto || codigo.trim().length === 0}
          onClick={() => {
            mesa.entrar(codigo, nombre.trim(), figura);
          }}
        >
          <span className="opcion-texto">
            <span className="opcion-rotulo">Sentarse</span>
          </span>
        </button>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// En el muelle: sentados, esperando
// ---------------------------------------------------------------------------

function EnElMuelle({
  escondida,
  mesa,
  puesta,
  tema,
  aforo,
  zarpando,
  alSaltar,
  alCambiar,
}: {
  escondida: boolean;
  mesa: LaMesa;
  puesta: MesaVista;
  tema: TemaDelMuelle;
  aforo: { minimo: number; maximo: number };
  zarpando: boolean;
  alSaltar: () => void;
  alCambiar: () => void;
}): JSX.Element {
  /*
   * «Copiado» es de los cuatro sitios con acento del §5; el fallo —un navegador
   * sin portapapeles, que es lo normal por HTTP fuera de `localhost`— va en gris
   * y dice qué hacer. Los dos se van solos al rato.
   */
  const [copiado, ponerCopiado] = useState<{ texto: string; bien: boolean } | null>(null);
  useEffect(() => {
    if (copiado === null) return;
    const t = setTimeout(() => {
      ponerCopiado(null);
    }, COPIADO_MS);
    return () => {
      clearTimeout(t);
    };
  }, [copiado]);

  /*
   * El enlace lleva el código y NO la silla, por lo que cuenta `LaFicha`: la
   * silla es el cajón de este navegador y fuera de aquí no significa nada.
   * `window` con guarda porque este raíl también se renderiza en Node.
   */
  const origen = typeof window === 'undefined' ? '' : window.location.origin;
  const enlace = `${origen}${BASE}/${encodeURIComponent(puesta.arcade)}?codigo=${puesta.codigo}`;

  const copiar = (que: 'el código' | 'el enlace', texto: string): void => {
    const noSePudo = { texto: 'El navegador no deja copiar: selecciónalo a mano.', bien: false };
    const portapapeles = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
    if (portapapeles === undefined) {
      ponerCopiado(noSePudo);
      return;
    }
    portapapeles.writeText(texto).then(
      () => {
        ponerCopiado({ texto: `Copiado ${que}.`, bien: true });
      },
      () => {
        ponerCopiado(noSePudo);
      },
    );
  };

  /*
   * ═══ `?? []`, LA MISMA GUARDA QUE EN `LaMesaPuesta` Y POR LO MISMO ═══
   *
   * `opciones` puede faltar con un servidor anterior. Y las opciones se pintan
   * TODAS, no sólo la de empezar: esconder un movimiento legal es peor que
   * enseñarlo en el sitio equivocado. La de empezar es la única con acento (§5).
   */
  const opciones = puesta.opciones ?? [];
  const sentados = puesta.asientos.length;

  return (
    <div className="muelle-tramo" hidden={escondida}>
      <section className="panel">
        <h2 className="rotulo-de-panel">{tema.lugar}</h2>
        <p className="codigo-grande">{puesta.codigo}</p>
        <div className="muelle-copias">
          <button
            type="button"
            className="opcion opcion-sobria opcion-corta"
            onClick={() => {
              copiar('el código', puesta.codigo);
            }}
          >
            <span className="opcion-texto">
              <span className="opcion-rotulo">Copiar código</span>
            </span>
          </button>
          <button
            type="button"
            className="opcion opcion-sobria opcion-corta"
            onClick={() => {
              copiar('el enlace', enlace);
            }}
          >
            <span className="opcion-texto">
              <span className="opcion-rotulo">Copiar enlace</span>
            </span>
          </button>
        </div>
        <p className={copiado?.bien === true ? 'letra-chica copiado copiado-vivo' : 'letra-chica copiado'} aria-live="polite">
          {copiado === null ? 'Pásale el código o el enlace a quien falte.' : copiado.texto}
        </p>
        <ul className="renglones muelle-sentados">
          {puesta.asientos.map((a) => {
            const soyYo = a.id === puesta.yo;
            const suFigura = datosDeFigura(figuraQueSePinta(a.id, a.figura));
            return (
              <li key={a.id} className={soyYo ? 'yo' : undefined}>
                <i
                  className={a.presente ? 'piloto piloto-vivo' : 'piloto'}
                  title={a.presente ? 'En el muelle' : 'Fuera'}
                />
                <span className="sentado-nombre">
                  {a.nombre.length > 0 ? a.nombre : a.id}
                  {soyYo ? ' (tú)' : ''}
                </span>
                <span className="sentado-figura">{suFigura.nombre}</span>
              </li>
            );
          })}
        </ul>
        <p className="letra-chica">
          {String(sentados)} de {String(aforo.maximo)} sentados
          {sentados < aforo.minimo ? ` · hacen falta ${String(aforo.minimo)}` : ''}
        </p>
      </section>

      <section className="panel">
        {zarpando ? (
          <>
            <h2 className="rotulo-de-panel">{tema.zarpar}</h2>
            <button type="button" className="opcion opcion-sobria" onClick={alSaltar}>
              <span className="opcion-texto">
                <span className="opcion-rotulo">Ir al tablero</span>
                <span className="opcion-ayuda">Sin esperar a que zarpen.</span>
              </span>
            </button>
          </>
        ) : opciones.length === 0 ? (
          <p className="letra-chica muelle-espera">{tema.espera}</p>
        ) : (
          <ul className="opciones muelle-opciones">
            {opciones.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  className={esLaOpcionDeEmpezar(o) ? 'opcion opcion-zarpar' : 'opcion'}
                  disabled={mesa.quieto}
                  onClick={() => {
                    mesa.mover({ tipo: o.tipo, carga: o.carga });
                  }}
                >
                  <span className="opcion-texto">
                    <span className="opcion-rotulo">{o.rotulo}</span>
                    {o.ayuda.length > 0 ? <span className="opcion-ayuda">{o.ayuda}</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button type="button" className="opcion opcion-sobria" onClick={alCambiar}>
        <span className="opcion-texto">
          <span className="opcion-rotulo">Cambiar de aventurero</span>
          <span className="opcion-ayuda">Los demás lo ven en su siguiente vuelta.</span>
        </span>
      </button>
      <button type="button" className="opcion opcion-sobria" onClick={mesa.salir}>
        <span className="opcion-texto">
          <span className="opcion-rotulo">Levantarse</span>
          <span className="opcion-ayuda">Se olvida el asiento en este navegador.</span>
        </span>
      </button>
      {/* La salida de verdad, y se pregunta antes porque afecta a los demás. Ver `LaMesaPuesta`. */}
      <button
        type="button"
        className="opcion opcion-sobria"
        onClick={() => {
          const seguro = globalThis.confirm(
            '¿Tirar la mesa? Se acaba para todos los que estén sentados.',
          );
          if (seguro) mesa.tirar();
        }}
      >
        <span className="opcion-texto">
          <span className="opcion-rotulo">Tirar la mesa</span>
          <span className="opcion-ayuda">Se acaba para todos.</span>
        </span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Las figuras
// ---------------------------------------------------------------------------

function Figuras({
  elegida,
  alElegir,
  alVolver,
}: {
  elegida: FiguraId;
  alElegir: (id: FiguraId) => void;
  alVolver: () => void;
}): JSX.Element {
  return (
    <section className="panel muelle-tramo">
      <h2 className="rotulo-de-panel">Quién eres en el muelle</h2>
      <p className="letra-chica">Se ve en la escena al elegir. También con las teclas 1 a 6.</p>
      <ul className="opciones muelle-figuras">
        {FIGURAS.map((f, i) => (
          <li key={f.id}>
            <button
              type="button"
              className={f.id === elegida ? 'opcion figura-elegida' : 'opcion'}
              aria-pressed={f.id === elegida}
              onClick={() => {
                alElegir(f.id);
              }}
            >
              <kbd className="atajo">{i + 1}</kbd>
              <span className="opcion-texto">
                <span className="opcion-rotulo">{f.nombre}</span>
                <span className="opcion-ayuda">{f.nota}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="opcion opcion-sobria" onClick={alVolver}>
        <span className="opcion-texto">
          <span className="opcion-rotulo">Volver</span>
        </span>
      </button>
    </section>
  );
}
