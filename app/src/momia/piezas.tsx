/**
 * Las piezas visuales de la Momia.
 *
 * Viven aparte de `ui.tsx` porque `ui.tsx` es de la PLATAFORMA —el marco, el
 * botón, el sello: lo que tiene cualquier juego— y esto es de un juego concreto:
 * un cartucho egipcio, la cuenta de la maldición, una tarjeta de papiro. Meterlo
 * allí habría sido el error de siempre: que lo común empiece a saber de qué se
 * juega.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Cuerpo, Etiqueta, espacio, radio, texto } from '../ui';
import { conAlfa } from '../tema-juego';
import { COLOR_MOMIA as C, MOMIA } from '../tema-momia';
import { MARCAS_PARA_TOCADO, cumple, permutaciones, type Restriccion } from '../../../shared/juegos';
import { Lacre, OjoAbierto } from './glifos';
import type { FragmentoVisible, RitoVisible } from './vista';

// ---------------------------------------------------------------------------
// El cartucho
// ---------------------------------------------------------------------------

/**
 * Un cartucho: el óvalo con la barra al final donde se escribía un nombre real.
 *
 * Es la pieza de identidad del juego, y hace en la Momia lo que el `Sello` hace
 * en CLUEDO. Se usa para los ritos —que son nombres sagrados— y para nada más:
 * si se usara para cualquier rótulo dejaría de significar «esto es un rito» y
 * pasaría a significar «esto es un recuadro».
 */
export function Cartucho({
  children,
  tono = 'oro',
  style,
}: {
  children: React.ReactNode;
  tono?: 'oro' | 'lapis' | 'apagado';
  style?: object;
}): JSX.Element {
  const paleta =
    tono === 'lapis'
      ? { borde: MOMIA.lapis, fondo: conAlfa(C.caoba900, 0.85), tinta: C.pergamino }
      : tono === 'apagado'
        ? { borde: conAlfa(C.laton, 0.3), fondo: 'transparent', tinta: conAlfa(C.pergaminoTenue, 0.55) }
        : { borde: C.oro500, fondo: conAlfa(C.oro500, 0.1), tinta: C.oro300 };
  return (
    <View
      style={[
        estilos.cartucho,
        { borderColor: paleta.borde, backgroundColor: paleta.fondo },
        style,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[texto.etiqueta, { color: paleta.tinta, fontSize: 13, letterSpacing: 0.8, flex: 1 }]}
      >
        {children}
      </Text>
      {/* La barra vertical del final del cartucho. Sin ella es una píldora. */}
      <View style={[estilos.cartuchoBarra, { backgroundColor: paleta.borde }]} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// La cuenta de la maldición
// ---------------------------------------------------------------------------

/**
 * Marcas y amuletos, del tamaño que merecen.
 *
 * EL ENCARGO PEDÍA «MUY VISIBLES» Y ESO NO ES UN CAPRICHO DE ESTILO. Es la única
 * información de la pantalla que decide algo AHORA: con dos marcas, entrar en la
 * cámara profanada te deja tocado y sin voz en la votación. Si hay que buscarla,
 * se entra sin mirarla.
 *
 * Las marcas se dibujan siempre las TRES, gastadas y por gastar, en vez de poner
 * «2 marcas». Un número hay que interpretarlo —¿dos de cuántas?— y tres casillas
 * de las que dos están tachadas se entiende sin leer, que es de lo que se trata
 * cuando se mira el móvil de pie y con prisa.
 */
export function Maldicion({
  marcas,
  amuletos,
  tocado,
  compacto = false,
}: {
  marcas: number;
  amuletos: number;
  tocado: boolean;
  compacto?: boolean;
}): JSX.Element {
  const grande = !compacto;
  return (
    <View style={[estilos.maldicion, compacto && { gap: espacio.md }]}>
      <View>
        <Etiqueta style={{ color: tocado ? MOMIA.profanada : C.laton }}>
          {tocado ? 'Tocado' : 'Marcas'}
        </Etiqueta>
        <View style={[estilos.fila, { marginTop: 6 }]}>
          {Array.from({ length: MARCAS_PARA_TOCADO }, (_, i) => (
            <Marca key={i} puesta={i < marcas} tam={grande ? 26 : 18} />
          ))}
        </View>
      </View>

      <View>
        <Etiqueta>Amuletos</Etiqueta>
        <View style={[estilos.fila, { marginTop: 6 }]}>
          {amuletos === 0 ? (
            <Cuerpo tenue style={{ fontSize: grande ? 16 : 14, opacity: 0.7 }}>
              ninguno
            </Cuerpo>
          ) : (
            Array.from({ length: amuletos }, (_, i) => (
              <Text key={i} style={{ fontSize: grande ? 24 : 18, color: MOMIA.amuleto }}>
                {'☥'}
              </Text>
            ))
          )}
        </View>
      </View>
    </View>
  );
}

/**
 * Una marca de la maldición.
 *
 * Dibujada y no un emoji: tenía que ser la misma marca puesta y sin poner —el
 * mismo trazo, encendido o apagado— y con dos caracteres distintos eso no se
 * consigue, porque cada uno tiene su propio ancho y la fila baila según cuántas
 * lleves.
 */
function Marca({ puesta, tam }: { puesta: boolean; tam: number }): JSX.Element {
  const tinta = puesta ? MOMIA.maldicion : conAlfa(C.pergaminoTenue, 0.22);
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24">
      {/* El wedjat simplificado: el ojo que la maldición te deja encima. */}
      <Path
        d="M2.5 12.5c3-4.5 6.2-6.8 9.5-6.8s6.5 2.3 9.5 6.8"
        fill="none"
        stroke={tinta}
        strokeWidth={puesta ? 2.2 : 1.6}
        strokeLinecap="round"
      />
      <Path
        d="M12 9.4a3.1 3.1 0 1 1 0 6.2 3.1 3.1 0 0 1 0-6.2z"
        fill={puesta ? tinta : 'none'}
        stroke={tinta}
        strokeWidth={1.6}
      />
      <Path
        d="M12 15.6v3.4M12 19l-2.6 2"
        fill="none"
        stroke={tinta}
        strokeWidth={puesta ? 2.2 : 1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Las tarjetas de fragmento
// ---------------------------------------------------------------------------

/**
 * Un fragmento de papiro.
 *
 * LO PRIVADO Y LO PÚBLICO TIENEN QUE SER IMPOSIBLES DE CONFUNDIR, y por eso no
 * se distinguen con una etiqueta ni con un borde de otro color: se distinguen
 * por SER DE OTRO MATERIAL. Lo tuyo es lapislázuli oscuro con la tinta clara,
 * como algo guardado en un bolsillo; lo de la mesa es papiro claro con tinta
 * marrón, como algo que está boca arriba delante de todos. A un metro de
 * distancia, con mala luz y sin gafas, siguen siendo dos cosas distintas.
 *
 * Confundirlas arruina la partida —contar en voz alta algo que creías público
 * te delata— así que la diferencia tenía que sobrevivir a mirarlo mal.
 */
export function TarjetaFragmento({
  fragmento,
  privado,
  dudado,
  alDudar,
}: {
  fragmento: FragmentoVisible;
  privado: boolean;
  /** Solo para los públicos: ¿lo has apartado por no fiarte? */
  dudado?: boolean;
  alDudar?: () => void;
}): JSX.Element {
  if (privado) {
    return (
      <View style={[estilos.frag, estilos.fragPrivado]}>
        <View style={estilos.fragCabecera}>
          <Lacre size={16} color={MOMIA.amuleto} />
          <Etiqueta style={{ color: conAlfa(MOMIA.amuleto, 0.9) }}>Solo tú lo has leído</Etiqueta>
        </View>
        <Text style={[texto.cuerpo, { color: C.pergamino, marginTop: espacio.sm }]}>
          {fragmento.texto || descripcionDe(fragmento.restriccion)}
        </Text>
      </View>
    );
  }

  return (
    <View style={[estilos.frag, estilos.fragPublico, dudado && estilos.fragDudado]}>
      <View style={estilos.fragCabecera}>
        <OjoAbierto size={16} color={C.burdeos700} />
        <Etiqueta style={{ color: C.burdeos700, flex: 1 }}>
          {fragmento.publicadoPorNombre
            ? `Lo puso ${fragmento.publicadoPorNombre}`
            : 'Sobre la mesa'}
        </Etiqueta>
      </View>
      <Text
        style={[
          texto.cuerpo,
          { color: C.caoba700, marginTop: espacio.sm },
          dudado && { textDecorationLine: 'line-through', opacity: 0.55 },
        ]}
      >
        {fragmento.texto || descripcionDe(fragmento.restriccion)}
      </Text>

      {alDudar && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: dudado }}
          accessibilityLabel={
            dudado ? 'Volver a creerte este fragmento' : 'Apartar este fragmento por no fiarte'
          }
          onPress={() => {
            void Haptics.selectionAsync();
            alDudar();
          }}
          style={({ pressed }) => [
            estilos.dudar,
            dudado && { backgroundColor: conAlfa(C.burdeos600, 0.2), borderColor: C.burdeos600 },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text
            style={[
              texto.microCaps,
              { color: dudado ? C.burdeos700 : conAlfa(C.caoba700, 0.7) },
            ]}
          >
            {dudado ? 'APARTADO · NO ME LO CREO' : 'NO ME FÍO'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/** Por si un fragmento llega sin frase: se lee la restricción en crudo. */
export function descripcionDe(r: Restriccion): string {
  switch (r.tipo) {
    case 'antes':
      return `${r.a} va antes que ${r.b}.`;
    case 'inmediatamente-antes':
      return `${r.a} va justo antes que ${r.b}.`;
    case 'posicion':
      return `${r.a} ocupa el lugar ${r.posicion}.`;
    case 'no-posicion':
      return `${r.a} no ocupa el lugar ${r.posicion}.`;
    case 'extremos':
      return `${r.a} abre o cierra el sellado.`;
  }
}

// ---------------------------------------------------------------------------
// El tablero de deducción
// ---------------------------------------------------------------------------

/**
 * ═══ LA REGLA QUE GOBIERNA ESTE TABLERO: LA APP SOLO DICE QUE NO ═══
 *
 * El diseño avisa de que una ayuda que escupa la respuesta mata el juego, y la
 * frontera entre «ayudar a razonar» y «razonar por ti» está más cerca de lo que
 * parece. Aquí se pone así, y es una decisión, no una casualidad:
 *
 *   La app tacha las casillas que UN fragmento, ÉL SOLO, deja imposibles.
 *   No combina fragmentos. No propaga. No dice nunca que sí.
 *
 * POR QUÉ NO SE COMBINAN. `solucionesDe` está a un import de distancia y con 5
 * ritos son 120 permutaciones: cruzar todos los fragmentos es trivial de
 * calcular. Y es exactamente lo que no hay que hacer, porque el conjunto
 * completo determina el orden por construcción (§4.2): un tablero con
 * propagación quedaría con una sola casilla libre por fila en cuanto la mesa
 * pusiera en común lo que tiene. O sea, la respuesta, dibujada.
 *
 * Sin propagación, esto es lo mismo que hace cualquiera con un boli en la hoja
 * de sellado impresa: pasar las frases a una cuadrícula. Transcribir es ayudar;
 * cruzar es jugar por ti. Lo que la app se ahorra es el trabajo aburrido —no
 * perder un fragmento, no equivocarse al tachar— y lo que deja intacto es el
 * único trabajo que tiene gracia.
 *
 * LO ÚNICO QUE SÍ SE CRUZA es la contradicción (`hayContradiccion`), y cabe
 * dentro de la regla porque también es un «no»: dice que ese conjunto no puede
 * ser cierto entero, y no dice cuál sobra ni cuál es el orden bueno. Ese aviso
 * no es una ayuda para resolver el puzle: es el juego. Es el momento en que la
 * mesa descubre que alguien miente.
 */

/** Las casillas imposibles, como claves «rito|posición». */
export type Exclusiones = ReadonlySet<string>;

export const clave = (rito: string, posicion: number): string => `${rito}|${posicion}`;

/**
 * Qué casillas tacha cada fragmento por sí solo.
 *
 * Un `antes` solo dice, él solo, que A no puede cerrar y que B no puede abrir.
 * Que además empuje a A hacia el principio es una conclusión de cruzarlo con
 * los demás, y esa la saca quien juega.
 */
export function exclusionesDe(restricciones: Restriccion[], ritos: RitoVisible[]): Exclusiones {
  const n = ritos.length;
  const fuera = new Set<string>();
  for (const r of restricciones) {
    switch (r.tipo) {
      case 'posicion':
        // La única que tacha una fila entera y una columna entera a la vez.
        for (let p = 1; p <= n; p++) if (p !== r.posicion) fuera.add(clave(r.a, p));
        for (const rito of ritos) if (rito.id !== r.a) fuera.add(clave(rito.id, r.posicion));
        break;
      case 'no-posicion':
        fuera.add(clave(r.a, r.posicion));
        break;
      case 'extremos':
        for (let p = 2; p < n; p++) fuera.add(clave(r.a, p));
        break;
      case 'antes':
      case 'inmediatamente-antes':
        // Lo que dice sin ayuda de nadie: A no cierra, B no abre.
        fuera.add(clave(r.a, n));
        fuera.add(clave(r.b, 1));
        break;
    }
  }
  return fuera;
}

/**
 * ¿Puede ser cierto todo esto a la vez?
 *
 * Aquí SÍ se cruzan todos, y es la única vez. Ver arriba por qué cabe: la
 * respuesta es un sí o un no sobre el conjunto, nunca un orden.
 */
export function hayContradiccion(restricciones: Restriccion[], ritos: RitoVisible[]): boolean {
  if (restricciones.length === 0 || ritos.length === 0) return false;
  const ids = ritos.map((r) => r.id);
  return !permutaciones(ids).some((orden) => restricciones.every((r) => cumple(orden, r)));
}

/** La cuadrícula: cinco ritos por cinco lugares, con lo imposible tachado. */
export function TableroDeRitos({
  ritos,
  exclusiones,
}: {
  ritos: RitoVisible[];
  exclusiones: Exclusiones;
}): JSX.Element {
  const n = ritos.length;
  return (
    <View>
      <View style={estilos.tabFila}>
        <View style={estilos.tabNombre} />
        {Array.from({ length: n }, (_, i) => (
          <View key={i} style={estilos.tabCelda}>
            <Text style={[texto.microCaps, { color: C.oro500, fontSize: 12 }]}>{i + 1}</Text>
          </View>
        ))}
      </View>

      {ritos.map((rito) => (
        <View key={rito.id} style={estilos.tabFila}>
          <View style={estilos.tabNombre}>
            <Text numberOfLines={1} style={[texto.cuerpo, { fontSize: 15, color: C.pergamino }]}>
              {rito.nombre}
            </Text>
          </View>
          {Array.from({ length: n }, (_, i) => {
            const imposible = exclusiones.has(clave(rito.id, i + 1));
            return (
              <View
                key={i}
                accessibilityLabel={`${rito.nombre}, lugar ${i + 1}: ${
                  imposible ? 'descartado' : 'todavía posible'
                }`}
                style={[estilos.tabCelda, estilos.tabCasilla, imposible && estilos.tabFuera]}
              >
                {imposible && (
                  <Svg width={16} height={16} viewBox="0 0 16 16">
                    <Path
                      d="M3.5 3.5 L12.5 12.5 M12.5 3.5 L3.5 12.5"
                      stroke={MOMIA.profanada}
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  </Svg>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 5 },

  cartucho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    borderWidth: 1.5,
    borderRadius: radio.redondo,
    paddingVertical: 7,
    paddingLeft: espacio.md,
    paddingRight: espacio.sm,
  },
  cartuchoBarra: { width: 2.5, height: 14, borderRadius: 2 },

  maldicion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacio.xl,
    flexWrap: 'wrap',
  },

  frag: {
    borderWidth: 1,
    borderRadius: radio.md,
    padding: espacio.md,
    marginBottom: espacio.sm,
  },
  fragCabecera: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fragPrivado: {
    backgroundColor: conAlfa(C.caoba900, 0.92),
    borderColor: MOMIA.lapis,
    // El filo azul a la izquierda: se ve aunque la tarjeta esté medio fuera de
    // pantalla, que es como se ven las de una lista larga al desplazarse.
    borderLeftWidth: 4,
    borderLeftColor: MOMIA.amuleto,
  },
  fragPublico: {
    backgroundColor: C.pergamino,
    borderColor: conAlfa(C.laton, 0.5),
    borderLeftWidth: 4,
    borderLeftColor: C.burdeos700,
  },
  fragDudado: { opacity: 0.72, borderStyle: 'dashed' },
  dudar: {
    alignSelf: 'flex-start',
    marginTop: espacio.md,
    borderWidth: 1,
    borderColor: conAlfa(C.caoba700, 0.35),
    borderRadius: radio.sm,
    paddingVertical: 6,
    paddingHorizontal: espacio.md,
  },

  tabFila: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  tabNombre: { flex: 1, paddingRight: espacio.sm },
  tabCelda: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  tabCasilla: {
    borderWidth: 1,
    borderColor: conAlfa(C.laton, 0.3),
    borderRadius: radio.sm,
    backgroundColor: conAlfa(C.caoba900, 0.5),
  },
  tabFuera: {
    backgroundColor: conAlfa(MOMIA.profanada, 0.12),
    borderColor: conAlfa(MOMIA.profanada, 0.4),
  },
});
