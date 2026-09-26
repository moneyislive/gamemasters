/**
 * LO QUE SE HACE A PIE EN UNA MESA DE BOTAS, EN LA SALA: el aviso al recoger, la forja de Riberas y
 * la leva de Las Lindes. Ver `docs/AVATARES-JUGABLES.md` §2 a §6.
 *
 * ═══ AQUÍ NO VIVE NI UNA REGLA ═══
 *
 * Qué brota, quién lo recoge y qué vale lo deciden la sala del servidor y el reductor de cada juego.
 * Esta pantalla lee la vista con los lectores de `shared/` —`alforjasDeLaVista`, `armaDeLaVista`,
 * `escudosDeLaVista`, `levasDeLaVista`— y manda los movimientos por la misma puerta que los demás
 * (`mesa.mover`). Si el juego ofrece el movimiento en `opciones`, se manda ESA opción, tal cual; si no,
 * se compone con el contrato de `shared/` y el reductor decide. Un botón encendido que el reductor
 * rechaza no rompe nada: la mesa vuelve igual.
 *
 * ═══ EL AVISO AL RECOGER ═══
 *
 * La escena llama a `alRecoger({ por, clase, mio })` cuando la sala dice que alguien recogió un
 * brote. Sale un aviso breve encima del lienzo —«+25 € · una cartera», «Bruno se lleva una
 * cartera»— que se va solo a los `DURA_EL_AVISO` y no coge el puntero: es un cartel. La región viva
 * está SIEMPRE en el árbol, vacía cuando no hay nada, por lo mismo que el cartel de los naipes de
 * Riberas: una región `aria-live` que se monta a la vez que su texto no se oye.
 *
 * ═══ `aria-disabled` Y NO `disabled` ═══
 *
 * Por lo mismo que los mandos de Riberas (`riberas-en-tres.tsx`, «`aria-disabled` Y NUNCA `disabled`
 * NATIVO»): al pulsar, `mover` pone `quieto`, el botón se apaga, y un `disabled` nativo deja de ser
 * enfocable y el navegador suelta el foco al `<body>`. Apagado, se sigue leyendo y no manda nada.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import type { Opcion } from '../../shared/arcade';
import { EUROS_DEL_HALLAZGO } from '../../shared/arcade/juegos/burgo';
import {
  alcanzaParaForjar,
  alforjasDeLaVista,
  ARMAS,
  armaDeLaVista,
  FICHA_DEL_ARMA,
  FORJAR,
  MATERIALES,
  NOMBRE_DEL_MATERIAL,
} from '../../shared/arcade/juegos/riberas-armas';
import type { Arma } from '../../shared/arcade/juegos/riberas-armas';
import {
  ESCUDOS_POR_LEVA,
  escudosDeLaVista,
  LEVA,
  LEVAS_POR_JUGADOR,
  levasDeLaVista,
  PUNTOS_POR_ESCUDO,
  puedePagarLaLeva,
} from '../../shared/arcade/juegos/lindes-escudos';
import type { MovimientoDeclarado } from '../../shared/mecanicas/tablero-declarado';

// ---------------------------------------------------------------------------
// El aviso al recoger
// ---------------------------------------------------------------------------

/** Lo que la escena cuenta al recoger: el contrato de `alRecoger`. */
export interface Recogido {
  readonly por: string;
  readonly clase: string;
  readonly mio: boolean;
}

/** De qué juego es el aviso: cada uno dice lo suyo. */
export type JuegoQueSeRecoge = 'burgo' | 'riberas' | 'lindes';

/**
 * LOS EUROS DE LA CALLE, por clase: la tabla del reductor del Burgo (`EUROS_DEL_HALLAZGO`), leída y
 * no copiada. Quien los da es el reductor; aquí sólo se dicen, y con la misma tabla no hay dos
 * números que se puedan separar.
 */
export const EUROS_DE_LA_CALLE: Readonly<Record<string, number>> = EUROS_DEL_HALLAZGO;

/** Cómo se dice lo que se encuentra en el Burgo, con su artículo. */
const LO_DE_LA_CALLE: Readonly<Record<string, string>> = { propina: 'una propina', cartera: 'una cartera', maletin: 'un maletín' };

/** Un material de Riberas en minúscula, o la clase tal cual si no es de la tabla. */
function nombreDelMaterial(clase: string): string {
  const m = (MATERIALES as readonly string[]).includes(clase) ? NOMBRE_DEL_MATERIAL[clase as (typeof MATERIALES)[number]] : clase;
  return m.toLowerCase();
}

/**
 * LA FRASE DEL AVISO. `nombre` es el de quien recogió, sacado de los asientos de la mesa; sin él,
 * «Alguien». Lo mío dice lo que gano; lo de otro, quién se lo lleva.
 */
export function fraseDelHallazgo(juego: JuegoQueSeRecoge, r: Recogido, nombre: string | null): string {
  const quien = nombre ?? 'Alguien';
  if (juego === 'burgo') {
    /* Con `hasOwnProperty`: una clase que llega por el cable y se llama `toString` no es dinero. */
    const que = Object.prototype.hasOwnProperty.call(LO_DE_LA_CALLE, r.clase) ? (LO_DE_LA_CALLE[r.clase] as string) : r.clase;
    const euros = Object.prototype.hasOwnProperty.call(EUROS_DE_LA_CALLE, r.clase) ? EUROS_DE_LA_CALLE[r.clase] : undefined;
    if (!r.mio) return `${quien} se lleva ${que}`;
    return euros === undefined ? `Te llevas ${que}` : `+${String(euros)} € · ${que}`;
  }
  if (juego === 'riberas') {
    const que = nombreDelMaterial(r.clase);
    return r.mio ? `+1 ${que}` : `${quien} se lleva 1 ${que}`;
  }
  const que = r.clase === 'escudo' ? 'escudo' : r.clase;
  return r.mio ? `+1 ${que}` : `${quien} se lleva un ${que}`;
}

/** Lo que dura un aviso en pantalla, en milisegundos. */
export const DURA_EL_AVISO = 2600;

/**
 * EL AVISO AL RECOGER: devuelve el `alRecoger` que se le pasa a la escena y lo que hay que pintar.
 * Estable mientras no cambien el juego ni los asientos. Uno a la vez: el nuevo pisa al anterior, que
 * dos avisos a la vez obligan a leer cuál es el de ahora.
 */
export function usarElAvisoDelHallazgo(
  juego: JuegoQueSeRecoge,
  asientos: readonly { readonly id: string; readonly nombre: string }[],
): { readonly alRecoger: (r: Recogido) => void; readonly aviso: JSX.Element } {
  const [frase, ponerFrase] = useState<{ readonly texto: string; readonly mio: boolean; readonly n: number } | null>(null);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cuenta = useRef(0);
  /* Los asientos cambian en cada vuelta del sondeo; el `alRecoger` no tiene por qué. */
  const losAsientos = useRef(asientos);
  losAsientos.current = asientos;
  const alRecoger = useCallback(
    (r: Recogido): void => {
      const nombre = losAsientos.current.find((a) => a.id === r.por)?.nombre ?? null;
      cuenta.current += 1;
      ponerFrase({ texto: fraseDelHallazgo(juego, r, nombre), mio: r.mio, n: cuenta.current });
      if (reloj.current !== null) clearTimeout(reloj.current);
      reloj.current = setTimeout(() => {
        reloj.current = null;
        ponerFrase(null);
      }, DURA_EL_AVISO);
    },
    [juego],
  );
  useEffect(
    () => () => {
      if (reloj.current !== null) clearTimeout(reloj.current);
    },
    [],
  );
  const aviso = (
    <p className="aviso-del-hallazgo" aria-live="polite">
      {frase === null ? null : (
        <span key={frase.n} className={frase.mio ? 'aviso-del-hallazgo-frase aviso-del-hallazgo-mio' : 'aviso-del-hallazgo-frase'}>
          {frase.texto}
        </span>
      )}
    </p>
  );
  return { alRecoger, aviso };
}

// ---------------------------------------------------------------------------
// Mandar: la opción del juego si la hay, y si no, el contrato de `shared/`
// ---------------------------------------------------------------------------

/** La opción de `opciones` cuyo movimiento es éste, o el movimiento compuesto si el juego no la ofrece. */
export function movimientoOfrecido(
  opciones: readonly Opcion[],
  tipo: string,
  casa: (carga: unknown) => boolean,
  compuesto: MovimientoDeclarado,
): MovimientoDeclarado {
  const o = opciones.find((x) => x.tipo === tipo && casa(x.carga));
  return o === undefined ? compuesto : { tipo: o.tipo, carga: o.carga };
}

// ---------------------------------------------------------------------------
// Riberas: la forja
// ---------------------------------------------------------------------------

/** Una receta dicha: «2 cuero + 1 pedernal», en el orden en que la escribe la tabla (lo que más pide, primero). */
export function recetaDicha(arma: Arma): string {
  const receta = FICHA_DEL_ARMA[arma].receta;
  return (Object.keys(receta) as (typeof MATERIALES)[number][])
    .filter((m) => (MATERIALES as readonly string[]).includes(m) && (receta[m] ?? 0) > 0)
    .map((m) => `${String(receta[m])} ${NOMBRE_DEL_MATERIAL[m].toLowerCase()}`)
    .join(' + ');
}

/**
 * LAS OPCIONES SIN LAS DE FORJAR, cuando las pinta `LaForja`. El reductor ofrece un `forjar:<arma>`
 * por cada arma que alcanza, y sin esta criba salían otra vez, a secas, en el carril y en el cajón
 * de Riberas: la misma forja dos veces en la misma pantalla. `conLaForja` es la condición con la que
 * se monta el panel (mesa de botas y con asiento); sin panel, las opciones pasan enteras.
 */
export function opcionesFueraDeLaForja(opciones: readonly Opcion[], conLaForja: boolean): readonly Opcion[] {
  return conLaForja ? opciones.filter((o) => o.tipo !== FORJAR) : opciones;
}

/** El movimiento de forjar `arma`: la opción del juego si la ofrece, o `{ tipo: FORJAR, carga: { arma } }`. */
export function movimientoDeForjar(opciones: readonly Opcion[], arma: Arma): MovimientoDeclarado {
  return movimientoOfrecido(
    opciones,
    FORJAR,
    (c) => typeof c === 'object' && c !== null && (c as { arma?: unknown }).arma === arma,
    { tipo: FORJAR, carga: { arma } },
  );
}

/**
 * LA FORJA DE RIBERAS: las alforjas, el arma que se lleva y un botón por arma con su receta y su
 * ayuda, encendido si alcanza. Sólo en una mesa de botas y con asiento: la monta quien lo sabe.
 */
export function LaForja({
  vista,
  yo,
  opciones,
  quieto,
  mover,
}: {
  readonly vista: unknown;
  readonly yo: string;
  readonly opciones: readonly Opcion[];
  readonly quieto: boolean;
  readonly mover: (m: MovimientoDeclarado) => unknown;
}): JSX.Element {
  const alforjas = alforjasDeLaVista(vista, yo);
  const lleva = armaDeLaVista(vista, yo);
  return (
    <section className="forja" aria-label="Forja">
      <h3>Forja</h3>
      <p className="forja-alforjas">
        Alforjas: {MATERIALES.map((m) => `${String(alforjas[m])} ${NOMBRE_DEL_MATERIAL[m].toLowerCase()}`).join(' · ')}
      </p>
      <p className="forja-lleva">Llevas: {lleva === null ? 'los puños' : FICHA_DEL_ARMA[lleva].nombre.toLowerCase()}</p>
      <ul className="forja-armas" role="list">
        {ARMAS.map((arma) => {
          const ficha = FICHA_DEL_ARMA[arma];
          const apagado = quieto || !alcanzaParaForjar(alforjas, arma);
          return (
            <li key={arma}>
              <button
                type="button"
                className="forja-arma"
                aria-disabled={apagado}
                title={ficha.ayuda}
                onClick={() => {
                  if (apagado) return;
                  void mover(movimientoDeForjar(opciones, arma));
                }}
              >
                <span className="forja-arma-nombre">
                  {ficha.nombre}
                  {lleva === arma ? ' (la llevas)' : ''}
                </span>
                <span className="forja-arma-receta">{recetaDicha(arma)}</span>
                <span className="forja-arma-ayuda">{ficha.ayuda}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="forja-nota">Los materiales se encuentran andando. Forjar otra arma sustituye a la que llevas.</p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Las Lindes: los escudos y la leva
// ---------------------------------------------------------------------------

/** El rótulo del botón de la leva, con sus números: los de `shared/`, no escritos a mano. */
export const ROTULO_DE_LA_LEVA = `Leva (${String(ESCUDOS_POR_LEVA)} escudos → 1 labriego)`;

/** El movimiento de la leva: la opción del juego si la ofrece, o `{ tipo: LEVA, carga: {} }`. */
export function movimientoDeLaLeva(opciones: readonly Opcion[]): MovimientoDeclarado {
  return movimientoOfrecido(opciones, LEVA, () => true, { tipo: LEVA, carga: {} });
}

/**
 * LOS ESCUDOS DE LAS LINDES: cuántos tengo, cuántas levas he pagado y el botón de la leva, encendido
 * si alcanza (`puedePagarLaLeva`). Y la otra cara de la elección, en una línea: guardarlos puntúa.
 */
export function LosEscudos({
  vista,
  yo,
  opciones,
  quieto,
  mover,
}: {
  readonly vista: unknown;
  readonly yo: string;
  readonly opciones: readonly Opcion[];
  readonly quieto: boolean;
  readonly mover: (m: MovimientoDeclarado) => unknown;
}): JSX.Element {
  const escudos = escudosDeLaVista(vista, yo);
  const levas = levasDeLaVista(vista, yo);
  const apagado = quieto || !puedePagarLaLeva(escudos, levas);
  return (
    <section className="lindes-panel lindes-escudos-panel" aria-label="Escudos">
      <h3>Escudos</h3>
      <p className="lindes-escudos-cuenta">
        Tienes {escudos} {escudos === 1 ? 'escudo' : 'escudos'} · levas {levas} de {LEVAS_POR_JUGADOR}
      </p>
      <button
        type="button"
        className="lindes-leva"
        aria-disabled={apagado}
        onClick={() => {
          if (apagado) return;
          void mover(movimientoDeLaLeva(opciones));
        }}
      >
        {ROTULO_DE_LA_LEVA}
      </button>
      <p className="lindes-pista">
        Cada escudo sin gastar vale {PUNTOS_POR_ESCUDO} {PUNTOS_POR_ESCUDO === 1 ? 'punto' : 'puntos'} al final.
      </p>
    </section>
  );
}
