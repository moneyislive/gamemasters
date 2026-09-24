/**
 * EL HUD DE LA PELEA: aguante y Foco, esquirlas y monedas, el reloj, la brújula de lo que suena, los
 * avisos y los rótulos que enseñan a jugar.
 *
 * ═══ DOS RITMOS DE REPINTADO ═══
 *
 * Las cifras (aguante, Foco, esquirlas, el reloj) se repintan con React ocho veces por segundo: cambian
 * cuando llega un suceso o cuando pasa un segundo, y ocho repintados de un árbol pequeño no se notan. La
 * BRÚJULA no puede esperar: gira con la cámara, que gira con el dedo a sesenta por segundo; sus marcas
 * se mueven en un `requestAnimationFrame` propio escribiendo el `left` de cada una, sin React.
 *
 * ═══ LA BRÚJULA ES LA ACCESIBILIDAD ═══
 *
 * «Una marca para todo lo que suena: la cabina, los tiradores fuera de pantalla, los compañeros caídos y
 * los montones de esquirlas. Así se juega igual en silencio» (diseño §7, §9). Cada clase de marca tiene
 * forma además de color (rombo la cabina, aro el caído, punto pequeño el montón), para quien no distingue
 * el rojo del verde.
 */
import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import { NOMBRES_DEL_QUIEBRO } from '../../../../shared/arcade/juegos/quiebro-nombres';
import { PORTABLE_ESQUIRLA } from '../../../../shared/arcade/juegos/quiebro-vista';
import type { VistaDelQuiebro } from '../../../../shared/arcade/juegos/quiebro-vista';
import { UNO } from '../../../../shared/mecanicas/fijo';
import { CIERRE_DE_LA_LIZA, CODIGO_DE_MODO, PRIMER_NUMERO_DE_ENTIDAD } from '../../../../shared/mecanicas/liza/protocolo';
import { MS_POR_TIC } from '../../../../shared/mecanicas/liza/declaracion';
import type { EstadoDeLosMandos } from '../mandos/estado';
import { direccionHacia } from '../mandos/enganche';
import type { Escenificador } from '../red/escenificar';
import type { Partida } from '../red/partida';
import { COLORES_DE_ASIENTO } from '../red/partida';
import { cifra, etiquetaDeLaFase, loQueLeQueda, miIndice, multiplicadorEnTexto, portableDeLasEsquirlas, relojEnTexto, valorDeLasEsquirlas } from './lectura';

export interface PropsDelCombate {
  readonly vista: VistaDelQuiebro;
  readonly yo: string | null;
  readonly partida: Partida | null;
  readonly escena: Escenificador | null;
  readonly mandos: EstadoDeLosMandos;
  /** ¿Primera noche de este aparato? (los rótulos que enseñan). */
  readonly aprendiz: boolean;
  /** ¿Se ven los mandos táctiles? Entonces no se enseña la chuleta de teclas encima de ellos. */
  readonly tactil: boolean;
}

/** Cada cuánto se repintan las cifras. */
const REPINTADO_MS = 125;

function usarElPulso(ms: number): number {
  const [n, poner] = useState(0);
  useEffect(() => {
    const id = setInterval(() => poner((x) => (x + 1) % 1_000_000), ms);
    return () => clearInterval(id);
  }, [ms]);
  return n;
}

export function Combate({ vista, yo, partida, escena, mandos, aprendiz, tactil }: PropsDelCombate): JSX.Element {
  usarElPulso(REPINTADO_MS);
  const ahora = performance.now();
  const i = miIndice(vista, yo);
  const mio = i >= 0 ? vista.asientos[i] : undefined;
  const numero = partida !== null && partida.sala.yo > 0 ? partida.sala.yo : i + 1;
  const lectura = partida?.lectura ?? null;
  const reglas = lectura?.reglas ?? null;
  const sala = partida?.sala ?? null;
  const cuenta = sala?.cuentas.get(numero);

  const vida = cuenta?.vida ?? mio?.control.aguante ?? 0;
  const vidaTope = Math.max(1, reglas?.cuerpo.vidaTope ?? vida);
  const foco = cuenta?.medidor ?? mio?.control.foco ?? 0;
  const focoTope = Math.max(1, reglas?.medidor.tope ?? 100);
  const cargaSabida = sala !== null && sala.cargas.has(numero);
  const esquirlas = cargaSabida && sala !== null ? sala.lleva(numero, PORTABLE_ESQUIRLA) : (mio?.control.esquirlas ?? 0);
  const valor = valorDeLasEsquirlas(esquirlas, portableDeLasEsquirlas(lectura?.liza ?? null));
  const monedas = sala?.recurso ?? vista.monedas;
  const puntos = (mio?.puntos ?? 0) + (cuenta?.puntos ?? 0);
  const mult = cuenta?.mult ?? UNO;

  /* El reloj: el del encuentro en la pelea, el de la fase en la pausa, el de la cabina en la Llamada. */
  const fase = sala?.fase ?? null;
  let quedaMs: number | null = null;
  if (sala?.zona !== null && sala?.zona !== undefined && vista.fase.tipo === 'llamada') quedaMs = loQueLeQueda(sala.zona.hastaMs, ahora);
  else if (fase !== null && fase.modo === CODIGO_DE_MODO.encuentro) quedaMs = loQueLeQueda(fase.encuentroHastaMs, ahora);
  else if (fase !== null) quedaMs = loQueLeQueda(fase.relojHastaMs, ahora);
  const aprieta = quedaMs !== null && quedaMs < 15000;

  /* Los avisos vivos, con quién los dio. */
  const avisos: { clave: string; texto: string; color: string }[] = [];
  if (sala !== null && lectura !== null) {
    for (const a of sala.avisos) {
      const clase = lectura.liza.avisos.clases.find((c) => c.id === a.clase);
      const vidaMs = (clase?.vidaTics ?? 80) * MS_POR_TIC;
      if (ahora - a.llegoMs > vidaMs) continue;
      const sentido = lectura.sentidoDelAviso(a.clase);
      const texto = sentido === 'otro' ? NOMBRES_DEL_QUIEBRO.botones.aviso : NOMBRES_DEL_QUIEBRO.avisos[sentido];
      const quien = a.de === numero ? 'Tú' : `${NOMBRES_DEL_QUIEBRO.gente.desvelado} ${String(a.de)}`;
      avisos.push({ clave: `${String(a.llegoMs)}-${String(a.de)}`, texto: `${quien} · ${texto}`, color: COLORES_DE_ASIENTO[(a.de - 1) % COLORES_DE_ASIENTO.length] ?? '#fff' });
    }
  }

  /* Los rótulos que enseñan (primera noche) y el del quiebro limpio. */
  const sentido = partida?.sentidoPropio(ahora) ?? 'libre';
  let rotulo: { texto: string; clase: string } | null = null;
  if (escena !== null && ahora - escena.ultimoLimpioMs < 900) rotulo = { texto: NOMBRES_DEL_QUIEBRO.quiebros.limpio, clase: 'q-rotulo limpio' };
  else if (sentido === 'remanso') rotulo = { texto: NOMBRES_DEL_QUIEBRO.pantalla.golpeAhora, clase: 'q-rotulo pista' };
  else if (aprendiz && sala !== null && [...sala.anuncios.values()].some((a) => a.a === numero && a.impactoMs > ahora)) {
    rotulo = { texto: NOMBRES_DEL_QUIEBRO.pantalla.quiebroAlCerrarse, clase: 'q-rotulo pista' };
  } else if (aprendiz && mandos.tipo === 'teclado' && vista.fase.tipo === 'oleada' && vista.fase.oleada === 1 && partida !== null && !partida.seHaMovido) {
    rotulo = { texto: NOMBRES_DEL_QUIEBRO.pantalla.muevete, clase: 'q-rotulo pista' };
  }

  /* El canal, si no está dentro. */
  let delCanal: string | null = null;
  const canal = partida?.estadoDelCanal() ?? null;
  if (canal !== null) {
    if (canal.tipo === 'esperando' || canal.tipo === 'abriendo') {
      delCanal = canal.tipo === 'esperando' && canal.porque === CIERRE_DE_LA_LIZA.llena ? NOMBRES_DEL_QUIEBRO.pantalla.ciudadLlena : NOMBRES_DEL_QUIEBRO.pantalla.reconectando;
    } else if (canal.tipo === 'fuera') {
      delCanal =
        canal.codigo === CIERRE_DE_LA_LIZA.versionVieja
          ? NOMBRES_DEL_QUIEBRO.pantalla.actualiza
          : canal.codigo === CIERRE_DE_LA_LIZA.reemplazado
            ? 'Esta noche sigue en otra pestaña.'
            : canal.motivo.length > 0
              ? canal.motivo
              : 'La calle no contesta.';
    }
  } else if (partida === null && yo !== null) delCanal = null;

  const uso = partida?.usoPosible(ahora) ?? null;
  const progreso = partida?.progresoDeUsar(ahora) ?? null;
  const golpeado = escena !== null && ahora - escena.ultimoGolpeRecibidoMs < 200;
  const circ = 2 * Math.PI * 19;

  return (
    <>
      <div className={golpeado ? 'q-golpeado si' : 'q-golpeado'} />
      <div className="q-vitales">
        <svg className={foco >= (reglas?.esquiva.ruptura.coste ?? 50) ? 'q-foco ruptura' : 'q-foco'} viewBox="0 0 46 46" aria-label={`${NOMBRES_DEL_QUIEBRO.cuentas.foco} ${String(foco)}`}>
          <circle className="pista" cx="23" cy="23" r="19" fill="none" strokeWidth="4" />
          <circle
            className="lleno"
            cx="23"
            cy="23"
            r="19"
            fill="none"
            strokeWidth="4"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - Math.min(1, foco / focoTope))}
            transform="rotate(-90 23 23)"
          />
          <text className="cifra" x="23" y="27" textAnchor="middle">
            {Math.round(foco)}
          </text>
        </svg>
        <div className={vida / vidaTope < 0.3 ? 'q-aguante bajo' : 'q-aguante'}>
          <div className="barra">
            <div className="lleno" style={{ width: `${String(Math.max(0, Math.min(100, (vida / vidaTope) * 100)))}%` }} />
          </div>
          <div className="pie">
            <span>{NOMBRES_DEL_QUIEBRO.cuentas.aguante}</span>
            <b>
              {Math.round(vida)} / {vidaTope}
            </b>
          </div>
        </div>
      </div>

      <div className="q-reloj">
        <div className="etiqueta">{etiquetaDeLaFase(vista)}</div>
        {quedaMs !== null ? <div className={aprieta ? 'cifra aprieta' : 'cifra'}>{relojEnTexto(quedaMs)}</div> : null}
      </div>
      <Brujula partida={partida} />

      <div className="q-botin">
        <div className="esquirlas" aria-label={NOMBRES_DEL_QUIEBRO.cuentas.esquirlas}>
          <span className="gema" />
          {valor.valor > 0 || valor.n > 0 ? `${String(valor.n)} → ${cifra(valor.valor)}` : String(valor.n)}
        </div>
        {valor.conUnaMas !== null && valor.valor >= 0 && portableDeLasEsquirlas(lectura?.liza ?? null) !== null ? (
          <div className="mas">
            {NOMBRES_DEL_QUIEBRO.cuentas.conUnaMas}, {cifra(valor.conUnaMas)}
          </div>
        ) : null}
        <div className="monedas">
          {NOMBRES_DEL_QUIEBRO.cuentas.monedas}
          {Array.from({ length: Math.max(3, monedas) }, (_, k) => (
            <i key={k} className={k < monedas ? '' : 'gastada'} />
          ))}
        </div>
        <div className="puntos">
          {cifra(puntos)} {mult > UNO ? multiplicadorEnTexto(mult) : ''}
        </div>
      </div>

      <div className="q-avisos">
        {avisos.map((a) => (
          <div key={a.clave} className="aviso" style={{ borderLeftColor: a.color }}>
            {a.texto}
          </div>
        ))}
      </div>

      {rotulo !== null ? (
        <div key={rotulo.texto} className={rotulo.clase}>
          {rotulo.texto}
        </div>
      ) : null}

      {mandos.tipo === 'teclado' && uso !== null ? (
        <div className="q-usar-pc q-panel" style={{ display: 'block' }}>
          <kbd>E</kbd> {NOMBRES_DEL_QUIEBRO.botones[uso.que === 'rematar' ? 'rematar' : uso.que === 'rescatar' ? 'rescatar' : 'descolgar']}
          <div className="barra">
            <i style={{ width: `${String(Math.round((progreso ?? 0) * 100))}%` }} />
          </div>
        </div>
      ) : null}

      {mandos.tipo === 'teclado' && !tactil ? (
        <div className="q-teclas">
          <kbd>WASD</kbd> moverse · <kbd>⇧</kbd> correr
          <br />
          <kbd>clic</kbd>/<kbd>J</kbd> {NOMBRES_DEL_QUIEBRO.botones.golpe.toLowerCase()} · <kbd>espacio</kbd>/<kbd>K</kbd> {NOMBRES_DEL_QUIEBRO.botones.quiebro.toLowerCase()}
          <br />
          <kbd>F</kbd> {NOMBRES_DEL_QUIEBRO.golpes.empellon.toLowerCase()} · <kbd>E</kbd> usar · <kbd>Q</kbd> aviso · <kbd>Tab</kbd> marcador
        </div>
      ) : null}

      {delCanal !== null ? <div className="q-canal q-panel">{delCanal}</div> : null}
    </>
  );
}

/** Cuántas marcas caben en la brújula. */
const MARCAS = 24;
/** Lo que abarca la franja: ±90° de la mirada. */
const MEDIO_CAMPO = Math.PI / 2;

type ClaseDeMarca = 'cabina' | 'tirador' | 'caido' | 'monton' | 'marcado';

/** LA BRÚJULA EN FRANJA: se mueve sola, fuera de React. */
function Brujula({ partida }: { readonly partida: Partida | null }): JSX.Element {
  const marcas = useRef<(HTMLDivElement | null)[]>([]);
  const puntos = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    let vivo = true;
    let pedido = 0;
    const poner = (k: number, clase: ClaseDeMarca, angulo: number, color: string | null): void => {
      const m = marcas.current[k];
      if (m === null || m === undefined) return;
      const x = Math.max(-1, Math.min(1, angulo / MEDIO_CAMPO));
      m.style.display = 'block';
      m.style.left = `${String(50 + x * 48)}%`;
      m.className = `marca ${clase}`;
      m.style.color = color ?? '';
      m.style.opacity = Math.abs(angulo) > MEDIO_CAMPO ? '0.55' : '1';
    };
    const pintar = (): void => {
      if (!vivo) return;
      pedido = requestAnimationFrame(pintar);
      let k = 0;
      const p = partida;
      const yo = p === null ? null : p.yo();
      const mio = p === null || yo === null ? null : p.pintadoDe(yo);
      const giro = p?.giroDeLaCamara ?? 0;
      const angulo = (x: number, z: number): number => {
        if (mio === null) return 0;
        let a = direccionHacia(x - mio.x, z - mio.z) - giro;
        a = ((a % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
        return a;
      };
      /* Los puntos cardinales, para orientarse en el barrio. */
      const cardinales = ['N', 'E', 'S', 'O'];
      for (let c = 0; c < 4; c++) {
        const s = puntos.current[c];
        if (s === null || s === undefined) continue;
        let a = (c * Math.PI) / 2 - giro;
        a = ((a % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
        s.style.display = Math.abs(a) <= MEDIO_CAMPO ? 'block' : 'none';
        s.style.left = `${String(50 + (a / MEDIO_CAMPO) * 48)}%`;
        s.textContent = cardinales[c] ?? '';
      }
      if (p !== null && mio !== null) {
        const ahora = performance.now();
        const l = p.lectura;
        const sala = p.sala;
        const zona = sala.zona;
        if (zona !== null && ahora < zona.hastaMs && l !== null) {
          const z = l.zona(zona.id);
          if (z !== null && k < MARCAS) poner(k++, 'cabina', angulo((z.caja.x0 + z.caja.x1) / 2 / UNO, (z.caja.z0 + z.caja.z1) / 2 / UNO), null);
        }
        for (const c of p.cuerpos()) {
          if (k >= MARCAS) break;
          if (c.id >= PRIMER_NUMERO_DE_ENTIDAD && c.clase === 'tirador') poner(k++, 'tirador', angulo(c.x, c.z), null);
          else if (c.id < PRIMER_NUMERO_DE_ENTIDAD && c.id !== yo && l !== null && l.sentidoDelEstado(sala.estadoEn(c.id, ahora)) === 'caido') {
            poner(k++, 'caido', angulo(c.x, c.z), c.color);
          }
        }
        for (const m of sala.montones.values()) {
          if (k >= MARCAS) break;
          poner(k++, 'monton', angulo(m.x, m.z), null);
        }
        if (l !== null) {
          for (const a of sala.avisos) {
            if (k >= MARCAS) break;
            if (l.sentidoDelAviso(a.clase) !== 'marcar' || a.obj === 0) continue;
            const clase = l.liza.avisos.clases.find((c) => c.id === a.clase);
            if (ahora - a.llegoMs > (clase?.vidaTics ?? 80) * MS_POR_TIC) continue;
            const c = p.pintadoDe(a.obj);
            if (c !== null) poner(k++, 'marcado', angulo(c.x, c.z), null);
          }
        }
      }
      for (; k < MARCAS; k++) {
        const m = marcas.current[k];
        if (m !== null && m !== undefined) m.style.display = 'none';
      }
    };
    pedido = requestAnimationFrame(pintar);
    return () => {
      vivo = false;
      cancelAnimationFrame(pedido);
    };
  }, [partida]);

  return (
    <div className="q-brujula" aria-hidden="true">
      {[0, 1, 2, 3].map((c) => (
        <span
          key={`p${String(c)}`}
          className="punto"
          ref={(e) => {
            puntos.current[c] = e;
          }}
        />
      ))}
      <div className="centro" />
      {Array.from({ length: MARCAS }, (_, k) => (
        <div
          key={k}
          className="marca"
          ref={(e) => {
            marcas.current[k] = e;
          }}
        />
      ))}
    </div>
  );
}
