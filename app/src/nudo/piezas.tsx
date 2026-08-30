/**
 * Las piezas visuales de El Nudo de Valdehierro.
 *
 * Viven aparte de `ui.tsx` por lo mismo que las de las Sombras: `ui.tsx` es de la
 * PLATAFORMA —el marco, el botón, el sello: lo que tiene cualquier juego— y esto
 * es de un juego concreto: la barra del retraso, una fila de convoy, la
 * cuadrícula del cuadro de marchas. Meterlo allí sería empezar a que lo común
 * sepa de trenes.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DÓNDE SE JUEGA ESTO, QUE ES LO QUE MANDA EN TODAS LAS MEDIDAS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * De pie, en un pasillo, a las dos de la mañana, con el móvil en una mano y el
 * cuadro de marchas de papel en la otra, y alguien hablando encima. De ahí salen
 * tres decisiones que se repiten en las cinco piezas y que no son de gusto:
 *
 *  · Nada que haya que leer dos veces. Un glifo y una palabra, no una frase.
 *  · Todo lo pulsable, de 44 puntos de alto para arriba. Se pulsa sin apuntar,
 *    y las celdas de la cuadrícula son estrechas por fuerza —seis columnas en
 *    360 puntos— así que lo que no se puede ganar en ancho se gana en alto.
 *  · El ámbar es el acento y el rojo de señal es la alarma, y no se mezclan. En
 *    una estación el rojo significa una cosa sola; si se usa para decorar, deja
 *    de significarla.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NO HAY VERDE, Y ES A PROPÓSITO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `SelloDeOrden` querría el verde del semáforo para el «vía libre», y la paleta
 * de esta estación no lo tiene (ver `tema-nudo.ts`: hulla, hierro, ámbar y rojo
 * de señal). Inventarle un verde aquí sería meter un sexto color por la puerta
 * de atrás en la pieza que más se mira. El ámbar de la bombilla hace ese papel:
 * es el único color caliente de la pantalla, y contra el rojo de «no da paso»
 * se distingue de un vistazo incluso a media luz y de reojo.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA CUADRÍCULA NO VIAJA AL SERVIDOR. NUNCA.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Es el cuaderno de deducción de cada cual: las equis y los círculos que uno va
 * apuntando mientras la mesa canta telegramas. Vive SOLO en el estado de React
 * de la pantalla que la use, no se manda en ninguna acción y no se guarda en
 * ningún sitio. Lo que se entrega al final es otra cosa —`entregar-cuadro`, con
 * sus seis campos— y se escribe a mano y a conciencia.
 *
 * Que no viaje tiene dos razones. Una de juego: si el servidor supiera lo que
 * cada cual sospecha, la tentación de cruzarlo y devolver ayuda sería enorme, y
 * entonces poner en común deja de ser una conversación y pasa a ser copiar una
 * pantalla. Y otra de oficio: es un garabato que cambia cada diez segundos; un
 * cuaderno que va y viene por la red seis veces por franja son seis ocasiones de
 * perderlo, y perder los apuntes de alguien a las dos de la mañana no se arregla.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Etiqueta, espacio, radio, texto } from '../ui';
import { conAlfa } from '../tema-juego';
import { COLOR_NUDO as C, NUDO as N } from '../tema-nudo';

// ---------------------------------------------------------------------------
// El retraso
// ---------------------------------------------------------------------------

/**
 * El marcador que más se mira de la noche.
 *
 * Es COLECTIVO y es el que decide la partida: por bien que se rehaga el cuadro,
 * si el retraso pasa del tope no gana nadie. Por eso se pinta como una barra y
 * no como un número suelto: un número que sube no se ve subir, y una barra que
 * se llena, sí. El número va al lado igualmente, porque el retraso se gasta en
 * minutos exactos —recuperar uno cuesta margen— y hay que poder contarlos.
 *
 * A partir del 75 % el relleno pasa al rojo de aviso y la cifra con él. El aviso
 * llega ahí y no al 90 % porque recuperar un minuto cuesta 3 de margen: si el
 * cambio de color no da tiempo a reunirlo, es un adorno y no un aviso.
 */
export function BarraDelRetraso({
  retraso,
  maximo,
}: {
  retraso: number;
  maximo: number;
}): JSX.Element {
  /*
   * El tope llega del servidor y podría llegar a cero con una partida vieja o a
   * medio arrancar. Sin esta guarda, `retraso / 0` es `Infinity`, el porcentaje
   * sale `NaN%` y React Native no pinta una barra rara: revienta la pantalla.
   */
  const proporcion = maximo > 0 ? Math.min(1, Math.max(0, retraso / maximo)) : 0;
  const apremia = proporcion >= 0.75;
  const quedan = Math.max(0, maximo - retraso);

  return (
    <View>
      <View style={estilos.cabecera}>
        <Etiqueta>Retraso de la noche</Etiqueta>
        <Etiqueta style={{ color: apremia ? C.peligro : C.pergaminoTenue }}>
          {apremia ? 'al límite' : `quedan ${quedan} min`}
        </Etiqueta>
      </View>

      <View style={estilos.retrasoFila}>
        <View
          style={[
            estilos.retrasoCarril,
            {
              backgroundColor: conAlfa(C.caoba900, 0.85),
              borderColor: apremia ? C.burdeos600 : conAlfa(C.laton, 0.35),
            },
          ]}
        >
          <View
            style={[
              estilos.retrasoRelleno,
              {
                width: `${Math.round(proporcion * 100)}%`,
                backgroundColor: apremia ? C.peligro : conAlfa(C.burdeos600, 0.9),
              },
            ]}
          />
        </View>

        <View style={estilos.retrasoCifra}>
          <Text style={[texto.numero, { fontSize: 38, color: apremia ? C.peligro : C.oro300 }]}>
            {retraso}
          </Text>
          <Text style={[texto.microCaps, { color: C.laton, fontSize: 10, letterSpacing: 1.4 }]}>
            tope {maximo}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Las fichitas de cuenta
// ---------------------------------------------------------------------------

/**
 * Un número con su rótulo: conformidades, margen, convoyes cursados.
 *
 * Van siempre en fila y siempre juntas, así que la pieza no lleva `flex` propio:
 * en una fila se dimensionan por su contenido y en cualquier otro sitio no se
 * deforman. Para repartir el ancho a partes iguales, quien las use las envuelve
 * en un `<View style={{ flex: 1 }}>` y se estiran solas.
 */
export function Contador({
  etiqueta,
  valor,
  tono = 'oro',
}: {
  etiqueta: string;
  valor: number | string;
  tono?: 'oro' | 'rojo' | 'tenue';
}): JSX.Element {
  const paleta =
    tono === 'rojo'
      ? { cifra: C.peligro, borde: conAlfa(C.burdeos600, 0.65), fondo: conAlfa(C.burdeos700, 0.25) }
      : tono === 'tenue'
        ? { cifra: C.pergaminoTenue, borde: conAlfa(C.laton, 0.3), fondo: conAlfa(C.caoba900, 0.55) }
        : { cifra: C.oro300, borde: conAlfa(C.oro500, 0.45), fondo: conAlfa(C.caoba900, 0.72) };

  return (
    <View style={[estilos.contador, { borderColor: paleta.borde, backgroundColor: paleta.fondo }]}>
      <Text numberOfLines={1} style={[texto.titulo, { color: paleta.cifra, fontSize: 24 }]}>
        {valor}
      </Text>
      <Etiqueta style={{ marginTop: 2, textAlign: 'center' }}>{etiqueta}</Etiqueta>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Los convoyes
// ---------------------------------------------------------------------------

/** Lo que el enclavamiento ha dicho de un convoy, en un glifo y una palabra. */
const MARCA_DE_ESTADO = {
  salido: { glifo: '✓', palabra: 'cursado' },
  rechazado: { glifo: N.marca, palabra: 'no dio paso' },
  espera: { glifo: '·', palabra: 'en vía' },
} as const;

/**
 * Una fila de convoy: se usa para elegir a cuál se le cursa la orden.
 *
 * EL CORREO DE MEDIANOCHE VA MARCADO y no es decoración: es el único convoy que
 * TIENE que cruzar para ganar, y a las dos de la mañana nadie se acuerda de cuál
 * de los seis era. Lleva el filo de rojo de señal y su sello, que son las dos
 * únicas cosas que se ven sin leer.
 *
 * Sin `onPress` no es pulsable y no lo finge —ni sombra al tocar ni papel de
 * botón—, para que la crónica de lo ya cursado no parezca que aún admite algo.
 */
export function FilaDeConvoy({
  nombre,
  carga,
  esCorreo,
  estado = 'espera',
  onPress,
}: {
  nombre: string;
  carga?: string;
  esCorreo?: boolean;
  estado?: 'salido' | 'rechazado' | 'espera';
  onPress?: () => void;
}): JSX.Element {
  const marca = MARCA_DE_ESTADO[estado];
  const tinta =
    estado === 'salido' ? C.oro300 : estado === 'rechazado' ? C.peligro : C.pergaminoTenue;

  const cuerpo = (
    <View
      style={[
        estilos.convoy,
        {
          backgroundColor: conAlfa(C.caoba900, 0.72),
          borderColor: esCorreo ? C.burdeos600 : conAlfa(C.laton, 0.35),
          borderLeftWidth: esCorreo ? 4 : 1,
        },
        estado === 'salido' && { opacity: 0.7 },
      ]}
    >
      <View style={estilos.convoyTexto}>
        <View style={estilos.convoyTitular}>
          <Text numberOfLines={1} style={[texto.cuerpo, { color: C.pergamino, flexShrink: 1 }]}>
            {nombre}
          </Text>
          {esCorreo ? (
            <View style={[estilos.selloCorreo, { borderColor: C.burdeos600 }]}>
              <Text style={[texto.microCaps, { color: C.peligro, fontSize: 9, letterSpacing: 1.2 }]}>
                Correo
              </Text>
            </View>
          ) : null}
        </View>
        {carga ? (
          <Text
            numberOfLines={1}
            style={[texto.cuerpo, { color: C.pergaminoTenue, fontSize: 14, lineHeight: 19 }]}
          >
            {carga}
          </Text>
        ) : null}
      </View>

      <View style={estilos.convoyMarca}>
        <Text style={{ color: tinta, fontSize: 20 }}>{marca.glifo}</Text>
        <Etiqueta style={{ color: tinta, fontSize: 9, letterSpacing: 1, textAlign: 'center' }}>
          {marca.palabra}
        </Etiqueta>
      </View>
    </View>
  );

  if (!onPress) return cuerpo;
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${nombre}${esCorreo ? ', el correo de medianoche' : ''}, ${marca.palabra}`}
      style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
    >
      {cuerpo}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// El cuadro de marchas de cada cual
// ---------------------------------------------------------------------------

/**
 * La clave de una casilla del cuaderno.
 *
 * Se exporta porque la pantalla que use la `Cuadricula` tiene que construir la
 * misma cadena para guardar lo que devuelve `onTocar`. Escrita a mano en los dos
 * sitios, el día que cambie el separador una mitad seguirá funcionando y la otra
 * no, y el síntoma sería un cuaderno que se apunta solo en las casillas que no
 * son —de los fallos que nadie relaciona con un separador.
 */
export const claveDeMarca = (convoyId: string, indiceDeFranja: number): string =>
  `${convoyId}:${indiceDeFranja}`;

/** El ciclo de una casilla al tocarla: vacía → equis → círculo → vacía. */
export const siguienteMarca = (actual: 'x' | 'o' | undefined): 'x' | 'o' | undefined =>
  actual === undefined ? 'x' : actual === 'x' ? 'o' : undefined;

/**
 * LA PIEZA CENTRAL: el cuadro de marchas rehecho a lápiz.
 *
 * Convoyes en las filas, franjas en las columnas, una casilla por cruce. Se toca
 * y cicla vacía → equis → círculo → vacía, que es exactamente lo que se hace en
 * el papel: primero se tacha lo que un telegrama deja imposible y, cuando de una
 * franja solo queda uno, se le pone el círculo.
 *
 * ESTO NO SE MANDA AL SERVIDOR. Es el cuaderno de deducción de cada cual y se
 * guarda SOLO en el estado de React de la pantalla que la use: ni se envía en
 * ninguna acción, ni se guarda en el móvil, ni lo ve nadie más. Está razonado
 * arriba, en la cabecera del fichero, y es la línea que esta pieza no cruza.
 *
 * TAMPOCO DEDUCE. No tacha una fila entera porque haya un círculo en ella, ni
 * avisa de contradicciones. Es la misma línea que trazaron el papiro de la Momia
 * y el tablero de las Sombras: en cuanto la app cruza los datos por ti, la mesa
 * deja de hablar y se dedica a mirar seis móviles iguales.
 *
 * ═══ POR QUÉ TODO ES `flex` Y NO HAY UN SOLO ANCHO ESCRITO ═══
 *
 * Seis columnas más los nombres en un móvil de 360 puntos dejan, descontando el
 * margen de la pantalla y el del marco, unos 280 para repartir: el nombre se
 * lleva el 30 % y cada franja unos 32 puntos. Con anchos fijos, el primer móvil
 * estrecho —o una partida de siete franjas— desborda la fila y la última columna
 * se sale por el filo sin que nada dé error. Con `flex` se estrecha y se sigue
 * pudiendo tocar: las casillas son de 44 puntos de ALTO, que es lo que salva el
 * dedo cuando el ancho no da para más.
 */
export function Cuadricula({
  convoyes,
  franjas,
  marcas,
  onTocar,
}: {
  convoyes: Array<{ id: string; nombre: string }>;
  franjas: string[];
  marcas: Record<string, 'x' | 'o' | undefined>;
  onTocar: (clave: string) => void;
}): JSX.Element {
  return (
    <View>
      <View style={estilos.rejillaFila}>
        <View style={estilos.rejillaNombre} />
        {franjas.map((franja, i) => (
          <View key={`cabecera:${i}`} style={estilos.rejillaCelda}>
            <Text style={[texto.etiqueta, { color: C.oro300, fontSize: 13, letterSpacing: 0 }]}>
              {i + 1}
            </Text>
            <Text
              numberOfLines={1}
              style={[texto.microCaps, { color: C.laton, fontSize: 9, letterSpacing: 0 }]}
            >
              {franja}
            </Text>
          </View>
        ))}
      </View>

      {convoyes.map((convoy) => (
        <View key={convoy.id} style={estilos.rejillaFila}>
          <View style={estilos.rejillaNombre}>
            <Text
              numberOfLines={2}
              style={[texto.cuerpo, { color: C.pergamino, fontSize: 13, lineHeight: 16 }]}
            >
              {convoy.nombre}
            </Text>
          </View>

          {franjas.map((franja, i) => {
            const clave = claveDeMarca(convoy.id, i);
            const marca = marcas[clave];
            const paleta =
              marca === 'o'
                ? { borde: C.oro500, fondo: conAlfa(C.oro500, 0.22), tinta: C.oro300 }
                : marca === 'x'
                  ? {
                      borde: conAlfa(C.burdeos600, 0.55),
                      fondo: conAlfa(C.burdeos700, 0.28),
                      tinta: conAlfa(C.pergaminoTenue, 0.85),
                    }
                  : { borde: conAlfa(C.laton, 0.3), fondo: 'transparent', tinta: C.pergamino };
            return (
              <Pressable
                key={clave}
                onPress={() => {
                  void Haptics.selectionAsync();
                  onTocar(clave);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${convoy.nombre}, franja ${franja || i + 1}: ${
                  marca === 'o' ? 'es este' : marca === 'x' ? 'descartado' : 'sin marcar'
                }`}
                style={({ pressed }) => [
                  estilos.rejillaCelda,
                  estilos.rejillaCasilla,
                  { borderColor: paleta.borde, backgroundColor: paleta.fondo },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={{ color: paleta.tinta, fontSize: 17 }}>
                  {marca === 'o' ? '○' : marca === 'x' ? N.marca : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// La contestación del enclavamiento
// ---------------------------------------------------------------------------

/**
 * Lo que ha contestado el enclavamiento a la orden que se acaba de cursar.
 *
 * Es la única pieza que aparece de golpe y se lee a un metro de distancia, sin
 * tener el móvil en la mano: se cursa la orden y la pantalla se pasa de mano en
 * mano o se levanta para que la vea la mesa. De ahí el tamaño del rótulo y que
 * debajo vaya la CONSECUENCIA y no una explicación: cuando no da paso, lo que
 * hay que saber es que son +1 de retraso, no por qué.
 */
export function SelloDeOrden({
  aceptada,
  nombre,
}: {
  aceptada: boolean;
  nombre: string;
}): JSX.Element {
  const paleta = aceptada
    ? { borde: C.oro500, fondo: conAlfa(C.oro500, 0.14), tinta: C.oro300 }
    : { borde: C.burdeos600, fondo: conAlfa(C.burdeos700, 0.3), tinta: C.peligro };

  return (
    <View style={[estilos.selloOrden, { borderColor: paleta.borde, backgroundColor: paleta.fondo }]}>
      <Text style={{ color: paleta.tinta, fontSize: 30 }}>{aceptada ? '✓' : N.marca}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[texto.titulo, { color: paleta.tinta, fontSize: 22, letterSpacing: 2.4 }]}>
          {aceptada ? 'VÍA LIBRE' : 'NO DA PASO'}
        </Text>
        <Text numberOfLines={2} style={[texto.cuerpo, { color: C.pergamino, fontSize: 16 }]}>
          {nombre}
        </Text>
        <Etiqueta style={{ color: paleta.tinta, marginTop: espacio.xs }}>
          {aceptada ? `sale de ${N.estacion}` : '+1 de retraso'}
        </Etiqueta>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Medidas y disposición. El color NO vive aquí: `StyleSheet.create` se evalúa al
// importar el fichero, o sea antes de que haya partida, y congelaría la paleta
// —es la advertencia de la cabecera de `ui.tsx`, y aquí vale igual aunque este
// juego solo tenga una.
// ---------------------------------------------------------------------------

const estilos = StyleSheet.create({
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  retrasoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    marginTop: espacio.sm,
  },
  retrasoCarril: {
    flex: 1,
    height: 20,
    borderWidth: 1,
    borderRadius: radio.sm,
    // Sin esto, el relleno se sale por las esquinas redondeadas del carril y la
    // barra parece un rectángulo pegado encima de otro.
    overflow: 'hidden',
  },
  retrasoRelleno: { height: '100%' },
  retrasoCifra: { alignItems: 'center', minWidth: 62 },

  contador: {
    minWidth: 78,
    borderWidth: 1,
    borderRadius: radio.md,
    paddingVertical: espacio.sm,
    paddingHorizontal: espacio.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  convoy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    minHeight: 60,
    borderWidth: 1,
    borderRadius: radio.md,
    paddingVertical: espacio.sm,
    paddingHorizontal: espacio.md,
    marginBottom: espacio.sm,
  },
  convoyTexto: { flex: 1 },
  convoyTitular: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  selloCorreo: {
    borderWidth: 1,
    borderRadius: radio.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  convoyMarca: { alignItems: 'center', width: 62 },

  rejillaFila: { flexDirection: 'row', alignItems: 'stretch', gap: 3, marginBottom: 3 },
  // El nombre se lleva unos ocho de cada veintisiete: en 360 puntos son los ~84
  // que hacen falta para dos líneas de trece, y con siete franjas se encoge solo.
  rejillaNombre: { flex: 8, justifyContent: 'center', paddingRight: espacio.xs },
  rejillaCelda: { flex: 3, alignItems: 'center', justifyContent: 'center' },
  // 44 de alto: el mínimo que se pulsa sin apuntar. Es lo que compensa que el
  // ancho lo reparta la aritmética de arriba y pueda quedarse en treinta y pico.
  rejillaCasilla: { height: 44, borderWidth: 1, borderRadius: radio.sm },

  selloOrden: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    borderWidth: 2,
    borderRadius: radio.md,
    padding: espacio.lg,
    marginBottom: espacio.md,
  },
});
