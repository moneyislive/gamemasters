/// <reference types="vite/client" />
/**
 * EL DOCUMENTO SUELTO DEL QUIEBRO (`escritorio/quiebro.html`): lo que cargan el WebView apaisado de la
 * app y el `iframe` de `/jugar` en el iPhone. Recibe la mesa por el PUENTE de `contrato.ts` y monta
 * `<Quiebro incrustado>`.
 *
 * ═══ EL PUENTE, EN LOS DOS SENTIDOS ═══
 *
 *   · Al cargar, el documento dice `listo` y espera un `mesa`. Cada `mesa` que llega es la foto de AHORA
 *     (código, asiento, llave, servidor, vista, opciones, revisión) y con ella se avisa al juego.
 *   · El juego mueve con `mover`: sale un `mover {id, movimiento}` y la promesa se cumple con el `movido`
 *     de ese `id` (o `sin-red` si no llega en `ESPERA_DEL_MOVIDO_MS`).
 *   · `salir` y `medida` salen cuando el juego los pide.
 *
 * ═══ DE QUIÉN SE ACEPTA ═══
 *
 * En el `iframe`, SÓLO de mi anfitrión: `vieneDelAnfitrion` compara el origen del evento con el del
 * propio documento o con los fijados AL COMPILAR (`VITE_QUIEBRO_ANFITRIONES`, y en desarrollo la app web
 * de este árbol en el 8131) —nunca con lo que diga el mensaje, que sería un círculo (ver `contrato.ts`)—.
 * En el WebView de la app no hay otra ventana: la app llama con `injectJavaScript` a
 * `window.quiebroDelAnfitrion(texto)`, que este documento deja puesta, y ahí no hay origen que comparar.
 * La LLAVE nunca entra por la dirección: sólo por el mensaje `mesa`.
 *
 * ═══ EL MODO DE PRUEBA (`?prueba=1`) ═══
 *
 * Sin anfitrión: el documento abre su propia mesa contra el servidor (`red/puerto-de-prueba.ts`) y se
 * juega en el navegador sin la Sala. Con `&codigo=XXXXX` se sienta en una mesa ya abierta: dos pestañas,
 * dos desvelados. La llave vive sólo en la memoria de la pestaña.
 */
import { useEffect, useMemo, useState } from 'react';
import type { JSX } from 'react';
import { createRoot } from 'react-dom/client';
import type { Opcion } from '../../../shared/arcade';
import type { MovimientoDeclarado } from '../../../shared/mecanicas/tablero-declarado';
import { NOMBRES_DEL_QUIEBRO } from '../../../shared/arcade/juegos/quiebro-nombres';
import { VERSION_DEL_PUENTE, leerMensajeDelAnfitrion, textoDelDocumento, vieneDelAnfitrion } from './contrato';
import type { MensajeDelDocumento, MesaParaElDocumento, PuertoDeMesa, SalidaDelMovimiento } from './contrato';
import { Quiebro } from './Quiebro';
import { PuertoDePrueba } from './red/puerto-de-prueba';
import './hud/hud.css';

/** Lo que se espera un `movido` antes de dar el movimiento por perdido. */
const ESPERA_DEL_MOVIDO_MS = 15000;

/** Los anfitriones fijados al compilar: el `.env` y, en desarrollo, la app web de este árbol. */
function anfitrionesFijados(): readonly string[] {
  const deLaCompilacion = String(import.meta.env.VITE_QUIEBRO_ANFITRIONES ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return import.meta.env.DEV ? [...deLaCompilacion, 'http://localhost:8131'] : deLaCompilacion;
}

interface VentanaConPuente {
  ReactNativeWebView?: { postMessage(texto: string): void };
  quiebroDelAnfitrion?: (texto: string) => void;
}

/**
 * EL PUERTO DEL PUENTE: la última `mesa` del anfitrión y el `mover` que le pregunta. Implementa el
 * `PuertoDeMesa` del contrato con getters sobre lo último que llegó.
 */
class PuertoDelPuente implements PuertoDeMesa {
  private mesa: MesaParaElDocumento;
  private readonly avisar = new Set<() => void>();
  private siguienteId = 1;
  private readonly esperando = new Map<number, (s: SalidaDelMovimiento) => void>();

  constructor(
    primera: MesaParaElDocumento,
    private readonly mandar: (m: MensajeDelDocumento) => void,
  ) {
    this.mesa = primera;
  }

  get codigo(): string {
    return this.mesa.codigo;
  }
  get yo(): string | null {
    return this.mesa.yo;
  }
  get llave(): string | null {
    return this.mesa.llave;
  }
  get servidor(): string {
    return this.mesa.servidor;
  }
  get vista(): unknown {
    return this.mesa.vista;
  }
  get opciones(): readonly Opcion[] {
    return this.mesa.opciones;
  }
  get rev(): number {
    return this.mesa.rev;
  }

  /** Una `mesa` nueva del anfitrión. */
  ponerMesa(m: MesaParaElDocumento): void {
    this.mesa = m;
    for (const a of this.avisar) a();
  }

  /** Un `movido` del anfitrión. */
  movido(id: number, salida: SalidaDelMovimiento): void {
    const cumplir = this.esperando.get(id);
    if (cumplir === undefined) return;
    this.esperando.delete(id);
    cumplir(salida);
  }

  mover(movimiento: MovimientoDeclarado): Promise<SalidaDelMovimiento> {
    const id = this.siguienteId++;
    return new Promise<SalidaDelMovimiento>((cumplir) => {
      this.esperando.set(id, cumplir);
      this.mandar({ t: 'mover', v: VERSION_DEL_PUENTE, id, movimiento: { tipo: movimiento.tipo, carga: movimiento.carga } });
      setTimeout(() => this.movido(id, { resultado: 'sin-red', motivo: 'El anfitrión no contestó.' }), ESPERA_DEL_MOVIDO_MS);
    });
  }

  suscribir(avisar: () => void): () => void {
    this.avisar.add(avisar);
    return () => {
      this.avisar.delete(avisar);
    };
  }
}

/** El documento con anfitrión: escucha el puente y monta el juego cuando llega la primera mesa. */
function ConAnfitrion(): JSX.Element {
  const [puerto, ponerPuerto] = useState<PuertoDelPuente | null>(null);
  const ventana = window as unknown as Window & VentanaConPuente;

  /* A quién se le habla: al WebView de la app si está; si no, a la ventana que enmarca, en SU origen. */
  const [origenDelAnfitrion, ponerOrigen] = useState<string | null>(null);
  const mandar = useMemo(
    () =>
      (m: MensajeDelDocumento): void => {
        const texto = textoDelDocumento(m);
        if (ventana.ReactNativeWebView !== undefined) {
          ventana.ReactNativeWebView.postMessage(texto);
          return;
        }
        if (window.parent === window) return;
        const destinos = origenDelAnfitrion !== null ? [origenDelAnfitrion] : [location.origin, ...anfitrionesFijados()];
        for (const d of destinos) {
          try {
            window.parent.postMessage(texto, d);
          } catch {
            /* Un origen que no es el del marco no recibe nada: es lo que se quiere. */
          }
        }
      },
    [ventana, origenDelAnfitrion],
  );

  useEffect(() => {
    let actual: PuertoDelPuente | null = null;
    const atender = (texto: unknown): void => {
      const m = leerMensajeDelAnfitrion(texto);
      if (m === null) return;
      if (m.t === 'mesa') {
        if (actual === null || actual.codigo !== m.codigo || actual.llave !== m.llave) {
          actual = new PuertoDelPuente(m, mandar);
          ponerPuerto(actual);
        } else actual.ponerMesa(m);
        return;
      }
      actual?.movido(m.id, { resultado: m.resultado, motivo: m.motivo });
    };
    const alMensaje = (e: MessageEvent): void => {
      if (!vieneDelAnfitrion(e.origin, location.origin, anfitrionesFijados())) return;
      ponerOrigen(e.origin);
      atender(e.data);
    };
    window.addEventListener('message', alMensaje);
    /* El WebView de la app entra por aquí (con `injectJavaScript`): no hay otra ventana ni origen. */
    ventana.quiebroDelAnfitrion = (texto: string) => atender(texto);
    mandar({ t: 'listo', v: VERSION_DEL_PUENTE });
    return () => {
      window.removeEventListener('message', alMensaje);
      delete ventana.quiebroDelAnfitrion;
    };
  }, [mandar, ventana]);

  if (puerto === null) return <Esperando texto="Esperando a la mesa…" />;
  return (
    <Quiebro
      puerto={puerto}
      incrustado
      alSalir={() => mandar({ t: 'salir', v: VERSION_DEL_PUENTE })}
      alMedir={(nivel, calidad) => mandar({ t: 'medida', v: VERSION_DEL_PUENTE, calidad, nivel })}
    />
  );
}

/** El modo de prueba: una mesa propia contra el servidor. */
function DePrueba({ codigo }: { readonly codigo: string | null }): JSX.Element {
  const [puerto, ponerPuerto] = useState<PuertoDePrueba | null>(null);
  const [fallo, ponerFallo] = useState<string | null>(null);
  const [intento, ponerIntento] = useState(0);
  useEffect(() => {
    let vivo = true;
    let abierto: PuertoDePrueba | null = null;
    const buscar = (ruta: string, init?: RequestInit): Promise<Response> => fetch(ruta, init);
    const pedido = codigo === null ? PuertoDePrueba.abrir(buscar, 'Prueba') : PuertoDePrueba.entrar(buscar, codigo, 'Prueba');
    pedido.then(
      (p) => {
        if (!vivo) {
          p.cerrar();
          return;
        }
        abierto = p;
        ponerPuerto(p);
        ponerFallo(null);
      },
      (e: unknown) => {
        if (vivo) ponerFallo(e instanceof Error ? e.message : String(e));
      },
    );
    return () => {
      vivo = false;
      abierto?.cerrar();
    };
  }, [codigo, intento]);
  if (fallo !== null) return <Esperando texto={fallo} reintentar={() => ponerIntento((n) => n + 1)} />;
  if (puerto === null) return <Esperando texto="Abriendo una mesa de prueba…" />;
  return (
    <Quiebro
      puerto={puerto}
      incrustado={false}
      alOtraMesa={() => {
        puerto.cerrar();
        ponerPuerto(null);
        ponerIntento((n) => n + 1);
      }}
    />
  );
}

function Esperando({ texto, reintentar }: { readonly texto: string; readonly reintentar?: () => void }): JSX.Element {
  return (
    <div className="quiebro-raiz">
      <div className="q-azotea">
        <div className="nombre-del-juego q-rotulo-neon">{NOMBRES_DEL_QUIEBRO.juego.nombre}</div>
        <div className="frase">{texto}</div>
        {reintentar !== undefined ? (
          <button
            type="button"
            className="q-boton"
            onPointerDown={(e) => {
              e.preventDefault();
              reintentar();
            }}
          >
            Reintentar
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Documento(): JSX.Element {
  const parametros = new URLSearchParams(location.search);
  if (parametros.get('prueba') === '1') {
    const codigo = parametros.get('codigo');
    return <DePrueba codigo={codigo !== null && /^[A-Za-z0-9]{3,12}$/.test(codigo) ? codigo.toUpperCase() : null} />;
  }
  return <ConAnfitrion />;
}

const raiz = document.getElementById('raiz');
if (raiz === null) throw new Error('Falta el <div id="raiz"> de quiebro.html');
const arbol = createRoot(raiz);
arbol.render(<Documento />);

/* En desarrollo, Vite vuelve a ejecutar este módulo al tocar sus ficheros: sin esto quedarían dos raíces. */
import.meta.hot?.dispose(() => arbol.unmount());
