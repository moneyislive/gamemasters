/**
 * EL PUERTO DE PRUEBA: una mesa propia contra el servidor, para jugar el Quiebro en un navegador sin la
 * Sala ni la app.
 *
 * ═══ PARA QUÉ, Y POR QUÉ NO ES UN ATAJO ═══
 *
 * El juego recibe un `PuertoDeMesa` (`contrato.ts`) y no sabe de dónde. En la Sala se lo da el pintor del
 * escritorio; en la app y en `/jugar`, el puente. Para probar el juego mientras esos dos se escriben —y
 * para probarlo con dos pestañas a la vez, que es como se prueba un cooperativo— este puerto hace lo
 * mismo que `LaMesa` de `escritorio/src/mesa.ts`, con las mismas rutas y las mismas reglas:
 *
 *   · abrir con `POST /api/arcade/mesas` (o sentarse en una con `POST …/:codigo/asientos`);
 *   · sondear con `GET …/:codigo?desde=rev` y la llave en `x-asiento` (el 204 de la espera larga vuelve a
 *     preguntar; un 404 es que la mesa ya no está);
 *   · mover con `POST …/:codigo/movimientos` llevando SIEMPRE la `rev` sobre la que se decidió, y leer el
 *     rechazo silencioso como lo lee `LaMesa`: la revisión no subió, o el juego dijo un motivo.
 *
 * LA LLAVE SÓLO EN MEMORIA: ni en la dirección ni en el almacén. Cerrar la pestaña es perder el asiento de
 * prueba, y está bien: es una mesa de prueba.
 *
 * `fetch` se pasa desde fuera para poder probarlo en Node sin red.
 */
import type { Opcion } from '../../../../shared/arcade';
import type { MovimientoDeclarado } from '../../../../shared/mecanicas/tablero-declarado';
import type { PuertoDeMesa, SalidaDelMovimiento } from '../contrato';

/** Lo que el servidor devuelve de una mesa, y sólo lo que aquí se lee. */
interface MesaDelServidor {
  readonly codigo: string;
  readonly rev: number;
  readonly yo: string | null;
  readonly vista: unknown;
  readonly opciones?: readonly Opcion[];
  readonly motivo?: string | null;
}

type Busca = (ruta: string, init?: RequestInit) => Promise<Response>;

/** El plazo de vigilancia con que se abre la mesa (diseño §10: 300 s, no por turnos). */
export const PLAZO_DE_LA_MESA_S = 300;
const ESPERA_TRAS_FALLO_MS = 2000;

function esMesa(v: unknown): v is MesaDelServidor {
  if (typeof v !== 'object' || v === null) return false;
  const m = v as Record<string, unknown>;
  return typeof m.codigo === 'string' && typeof m.rev === 'number' && Object.prototype.hasOwnProperty.call(m, 'vista');
}

export class PuertoDePrueba implements PuertoDeMesa {
  codigo: string;
  yo: string | null;
  llave: string | null;
  readonly servidor = '';
  vista: unknown;
  opciones: readonly Opcion[];
  rev: number;
  private readonly avisar = new Set<() => void>();
  private parado = false;
  private corte: AbortController | null = null;

  private constructor(
    private readonly buscar: Busca,
    mesa: MesaDelServidor,
    llave: string,
  ) {
    this.codigo = mesa.codigo;
    this.yo = mesa.yo;
    this.llave = llave;
    this.vista = mesa.vista;
    this.opciones = mesa.opciones ?? [];
    this.rev = mesa.rev;
  }

  /** Abre una mesa nueva de El Quiebro y se sienta. */
  static async abrir(buscar: Busca, nombre: string): Promise<PuertoDePrueba> {
    return PuertoDePrueba.pedir(buscar, '/api/arcade/mesas', { arcade: 'quiebro', nombre, plazoSegundos: PLAZO_DE_LA_MESA_S }, 'No se ha podido abrir la mesa');
  }

  /** Se sienta en la mesa `codigo` (para probar con dos pestañas). */
  static async entrar(buscar: Busca, codigo: string, nombre: string): Promise<PuertoDePrueba> {
    return PuertoDePrueba.pedir(buscar, `/api/arcade/mesas/${encodeURIComponent(codigo)}/asientos`, { arcade: 'quiebro', nombre }, 'No se ha podido entrar en la mesa');
  }

  private static async pedir(buscar: Busca, ruta: string, cuerpo: unknown, queSalioMal: string): Promise<PuertoDePrueba> {
    const r = await buscar(ruta, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) });
    let datos: unknown = null;
    try {
      datos = await r.json();
    } catch {
      datos = null;
    }
    const d = (datos ?? {}) as { error?: unknown; llave?: unknown; mesa?: unknown };
    if (!r.ok || typeof d.llave !== 'string' || !esMesa(d.mesa)) {
      throw new Error(`${queSalioMal}: ${typeof d.error === 'string' ? d.error : `el servidor contestó ${String(r.status)}`}`);
    }
    const puerto = new PuertoDePrueba(buscar, d.mesa, d.llave);
    void puerto.sondear();
    return puerto;
  }

  suscribir(avisar: () => void): () => void {
    this.avisar.add(avisar);
    return () => {
      this.avisar.delete(avisar);
    };
  }

  /** Deja de sondear (la pestaña se va). */
  cerrar(): void {
    this.parado = true;
    this.corte?.abort();
  }

  private ponerMesa(m: MesaDelServidor): void {
    this.vista = m.vista;
    this.opciones = m.opciones ?? [];
    this.rev = m.rev;
    if (m.yo !== null) this.yo = m.yo;
    for (const a of this.avisar) a();
  }

  private cabeceras(conCuerpo: boolean): Record<string, string> {
    const h: Record<string, string> = {};
    if (conCuerpo) h['content-type'] = 'application/json';
    if (this.llave !== null) h['x-asiento'] = this.llave;
    return h;
  }

  private async sondear(): Promise<void> {
    while (!this.parado) {
      this.corte = new AbortController();
      try {
        const r = await this.buscar(`/api/arcade/mesas/${encodeURIComponent(this.codigo)}?desde=${String(this.rev)}`, {
          headers: this.cabeceras(false),
          signal: this.corte.signal,
        });
        if (this.parado) return;
        if (r.status === 204) continue;
        if (r.status === 404) {
          this.parado = true;
          return;
        }
        if (!r.ok) throw new Error(String(r.status));
        const d = (await r.json()) as { mesa?: unknown };
        if (esMesa(d.mesa) && d.mesa.rev !== this.rev) this.ponerMesa(d.mesa);
      } catch {
        if (this.parado) return;
        await new Promise<void>((listo) => setTimeout(listo, ESPERA_TRAS_FALLO_MS));
      }
    }
  }

  async mover(movimiento: MovimientoDeclarado): Promise<SalidaDelMovimiento> {
    const rev = this.rev;
    try {
      const r = await this.buscar(`/api/arcade/mesas/${encodeURIComponent(this.codigo)}/movimientos`, {
        method: 'POST',
        headers: this.cabeceras(true),
        body: JSON.stringify({ rev, tipo: movimiento.tipo, carga: movimiento.carga }),
      });
      let datos: unknown = null;
      try {
        datos = await r.json();
      } catch {
        datos = null;
      }
      const d = (datos ?? {}) as { error?: unknown; mesa?: unknown };
      const mesa = esMesa(d.mesa) ? d.mesa : null;
      if (mesa !== null && mesa.rev !== this.rev) this.ponerMesa(mesa);
      /* El rechazo silencioso: 200 con la mesa igual, o un motivo del juego (ver `mesa.ts`, regla 2). */
      const motivo = r.ok ? (mesa?.motivo ?? '') : typeof d.error === 'string' ? d.error : `el servidor contestó ${String(r.status)}`;
      const seIgnoro = r.ok && mesa !== null && mesa.rev === rev;
      if (!r.ok || seIgnoro || (motivo !== null && motivo.length > 0)) return { resultado: 'rechazado', motivo: motivo ?? '' };
      return { resultado: 'hecho', motivo: '' };
    } catch (error) {
      return { resultado: 'sin-red', motivo: error instanceof Error ? error.message : String(error) };
    }
  }
}
