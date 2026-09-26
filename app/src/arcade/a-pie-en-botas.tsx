/**
 * LO QUE SE HACE A PIE EN UNA MESA DE BOTAS, EN LA APP: el aviso al recoger y los movimientos de la
 * forja de Riberas y de la leva de Las Lindes. Ver `docs/AVATARES-JUGABLES.md` §2 a §6.
 *
 * ═══ AQUÍ NO VIVE NI UNA REGLA ═══
 *
 * Qué brota, quién lo recoge y qué vale lo deciden la sala del servidor y el reductor de cada juego.
 * Las pantallas leen la vista con los lectores de `shared/` —`alforjasDeLaVista`, `armaDeLaVista`,
 * `escudosDeLaVista`, `levasDeLaVista`— y mandan los movimientos por la misma puerta que los demás
 * (`mesa.mover`). Si el juego ofrece el movimiento en `opciones`, se manda ESA opción, tal cual; si
 * no, se compone con el contrato de `shared/` y el reductor decide. Un botón encendido que el
 * reductor rechaza no rompe nada: la mesa vuelve igual y el aviso de la mesa dice por qué.
 *
 * ═══ ES LA HERMANA DE `escritorio/src/a-pie-en-botas.tsx` ═══
 *
 * La frase del aviso y la composición de los movimientos son las mismas palabra por palabra; lo que
 * cambia es el mueble —aquí `View` y `Text`, allí `<p>`—. No se importa de allí porque aquel fichero
 * trae JSX del DOM, que en la app no existe. Los números no se copian: los euros son
 * `EUROS_DEL_HALLAZGO` del reductor del Burgo, y la leva y la forja, sus tablas de `shared/`.
 *
 * ═══ EL AVISO AL RECOGER ═══
 *
 * La escena llama a `alRecoger({ por, clase, mio })` cuando la sala dice que alguien recogió un
 * brote. Sale un aviso breve encima del lienzo —«+25 € · una cartera», «Bruno se lleva una
 * cartera»— que se va solo a los `DURA_EL_AVISO` y NO COGE EL DEDO (`pointerEvents="none"`): es un
 * cartel, y lo que tapa sigue siendo tablero. Cada pantalla lo pone donde no tapa ni la palanca ni
 * los botones del paseo. La región viva está SIEMPRE en el árbol, vacía cuando no hay nada: una
 * región viva que se monta a la vez que su texto no se anuncia.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { EUROS_DEL_HALLAZGO } from '../../../shared/arcade/juegos/burgo';
import { FICHA_DEL_ARMA, FORJAR, MATERIALES, NOMBRE_DEL_MATERIAL } from '../../../shared/arcade/juegos/riberas-armas';
import type { Arma, Material } from '../../../shared/arcade/juegos/riberas-armas';
import { ESCUDOS_POR_LEVA, LEVA, PUNTOS_POR_ESCUDO } from '../../../shared/arcade/juegos/lindes-escudos';
import type { MovimientoDeclarado } from '../../../shared/mecanicas/tablero-declarado';
import type { OpcionDeMesa } from './mesa';
import { conAlfa } from '../tema';
import { LETRA, RADIO, SALA } from './muebles';

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

/** Cómo se dice lo que se encuentra en el Burgo, con su artículo. */
const LO_DE_LA_CALLE: Readonly<Record<string, string>> = { propina: 'una propina', cartera: 'una cartera', maletin: 'un maletín' };

/** Un material de Riberas en minúscula, o la clase tal cual si no es de la tabla. */
function nombreDelMaterial(clase: string): string {
  const m = (MATERIALES as readonly string[]).includes(clase) ? NOMBRE_DEL_MATERIAL[clase as Material] : clase;
  return m.toLowerCase();
}

/**
 * LA FRASE DEL AVISO. `nombre` es el de quien recogió, sacado de los nombres de la mesa; sin él,
 * «Alguien». Lo mío dice lo que gano; lo de otro, quién se lo lleva.
 */
export function fraseDelHallazgo(juego: JuegoQueSeRecoge, r: Recogido, nombre: string | null): string {
  const quien = nombre ?? 'Alguien';
  if (juego === 'burgo') {
    /* Con `hasOwnProperty`: una clase que llega por el cable y se llama `toString` no es dinero. */
    const que = Object.prototype.hasOwnProperty.call(LO_DE_LA_CALLE, r.clase) ? (LO_DE_LA_CALLE[r.clase] as string) : r.clase;
    const euros = Object.prototype.hasOwnProperty.call(EUROS_DEL_HALLAZGO, r.clase) ? EUROS_DEL_HALLAZGO[r.clase] : undefined;
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

/** Lo que se pinta: la frase, si es mía, y un contador para que dos avisos iguales sean dos. */
export interface FraseDelAviso {
  readonly texto: string;
  readonly mio: boolean;
  readonly n: number;
}

/**
 * EL AVISO AL RECOGER: devuelve el `alRecoger` que se le pasa a la escena y la frase que hay que
 * pintar (o `null`). Estable mientras no cambie el juego: los nombres cambian en cada vuelta del
 * sondeo y se leen de una referencia. Uno a la vez: el nuevo pisa al anterior, que dos avisos a la
 * vez obligan a leer cuál es el de ahora.
 */
export function usarElAvisoDelHallazgo(
  juego: JuegoQueSeRecoge,
  nombres: ReadonlyMap<string, string>,
): { readonly alRecoger: (r: Recogido) => void; readonly frase: FraseDelAviso | null } {
  const [frase, ponerFrase] = useState<FraseDelAviso | null>(null);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cuenta = useRef(0);
  const losNombres = useRef(nombres);
  losNombres.current = nombres;
  const alRecoger = useCallback(
    (r: Recogido): void => {
      const nombre = losNombres.current.get(r.por) ?? null;
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
  return { alRecoger, frase };
}

/**
 * EL CARTEL DEL AVISO. Siempre montado —vacío cuando no hay frase— y sin coger el dedo. `style` lo
 * pone cada pantalla: dónde no tapa nada lo sabe ella, no este mueble.
 */
export function ElAvisoDelHallazgo({
  frase,
  style,
}: {
  readonly frase: FraseDelAviso | null;
  readonly style?: StyleProp<ViewStyle>;
}): JSX.Element {
  return (
    <View style={[estilos.caja, style]} pointerEvents="none" accessibilityLiveRegion="polite">
      {frase === null ? null : (
        <Text key={frase.n} style={[estilos.frase, frase.mio ? estilos.fraseMia : null]} numberOfLines={2}>
          {frase.texto}
        </Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Mandar: la opción del juego si la hay, y si no, el contrato de `shared/`
// ---------------------------------------------------------------------------

/** La opción de `opciones` cuyo movimiento es éste, o el movimiento compuesto si el juego no la ofrece. */
export function movimientoOfrecido(
  opciones: readonly OpcionDeMesa[],
  tipo: string,
  casa: (carga: unknown) => boolean,
  compuesto: MovimientoDeclarado,
): MovimientoDeclarado {
  const o = opciones.find((x) => x.tipo === tipo && casa(x.carga));
  return o === undefined ? compuesto : { tipo: o.tipo, carga: o.carga };
}

/** Una receta dicha: «2 cuero + 1 pedernal», en el orden en que la escribe la tabla. */
export function recetaDicha(arma: Arma): string {
  const receta = FICHA_DEL_ARMA[arma].receta;
  return (Object.keys(receta) as Material[])
    .filter((m) => (MATERIALES as readonly string[]).includes(m) && (receta[m] ?? 0) > 0)
    .map((m) => `${String(receta[m])} ${NOMBRE_DEL_MATERIAL[m].toLowerCase()}`)
    .join(' + ');
}

/** El prefijo del `id` de las opciones de forjar que compone el reductor de Riberas: `forjar:<arma>`. */
export const PREFIJO_DE_FORJAR = 'forjar:';

/** ¿Es una opción de forjar? Por su `id` o por su tipo: la forja las enseña, y ninguna lista más. */
export function esOpcionDeForjar(o: { readonly id: string; readonly tipo: string }): boolean {
  return o.id.startsWith(PREFIJO_DE_FORJAR) || o.tipo === FORJAR;
}

/**
 * El movimiento de forjar `arma`: la opción del juego con `id` `forjar:<arma>` si la ofrece, si no la
 * de su tipo con esa arma en la carga, y si tampoco, `{ tipo: FORJAR, carga: { arma } }`.
 */
export function movimientoDeForjar(opciones: readonly OpcionDeMesa[], arma: Arma): MovimientoDeclarado {
  const porId = opciones.find((o) => o.id === `${PREFIJO_DE_FORJAR}${arma}`);
  if (porId !== undefined) return { tipo: porId.tipo, carga: porId.carga };
  return movimientoOfrecido(
    opciones,
    FORJAR,
    (c) => typeof c === 'object' && c !== null && (c as { arma?: unknown }).arma === arma,
    { tipo: FORJAR, carga: { arma } },
  );
}

/** El rótulo del botón de la leva, con sus números: los de `shared/`, no escritos a mano. */
export const ROTULO_DE_LA_LEVA = `Leva (${String(ESCUDOS_POR_LEVA)} escudos → 1 labriego)`;

/** La otra cara de la leva, en una línea: guardarlos puntúa. */
export const LO_QUE_VALE_GUARDARLOS = `Cada escudo sin gastar vale ${String(PUNTOS_POR_ESCUDO)} ${PUNTOS_POR_ESCUDO === 1 ? 'punto' : 'puntos'} al final.`;

/** El movimiento de la leva: la opción del juego si la ofrece, o `{ tipo: LEVA, carga: {} }`. */
export function movimientoDeLaLeva(opciones: readonly OpcionDeMesa[]): MovimientoDeclarado {
  return movimientoOfrecido(opciones, LEVA, () => true, { tipo: LEVA, carga: {} });
}

/*
 * El cromo del aviso: la teja de la Sala con el contorno blanco al 40 %, el mismo de las hojas, y
 * fondo opaco porque debajo hay un mundo que cambia de color con el ángulo. Lo mío, con el contorno
 * de acento: es lo que acabo de ganar.
 */
const estilos = StyleSheet.create({
  caja: { alignItems: 'center' },
  frase: {
    ...LETRA.rotuloChico,
    color: SALA.blanco,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIO.mando,
    borderWidth: 1,
    borderColor: conAlfa(SALA.blanco, 0.4),
    backgroundColor: SALA.teja,
    overflow: 'hidden',
  },
  fraseMia: { borderColor: SALA.acento },
});
