/**
 * El amanecer sobre Valdehierro: cómo acabó la noche.
 *
 * Es la pantalla del desenlace de El Nudo de Valdehierro, y sustituye a la de la
 * plataforma por la tabla de `PANTALLAS_DE_JUEGO` (`src/pantallas.ts`). Se mira
 * una sola vez, entre ocho y doce personas a la vez, de pie y en silencio, con
 * el cuadro de marchas de papel todavía en la mano.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ NO VALE LA GENÉRICA
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * La de la plataforma está escrita para CLUEDO: abre el sobre del crimen, dice
 * quién ganó por haber acusado antes y ordena a la mesa por aciertos. Aquí NO
 * HAY CULPABLE y no hay carrera: se gana en grupo —si el Correo cruza y el
 * retraso no pasa del tope, gana el turno entero— o no gana nadie. Enseñar una
 * clasificación al final de una noche cooperativa no es un rótulo mal puesto:
 * convierte en competición lo que la mesa acaba de hacer entre todos, y en el
 * peor momento posible, que es cuando ya no se puede explicar.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EL ORDEN ES EL DE LA CONVERSACIÓN QUE VIENE DETRÁS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Primero SI SE SACÓ LA NOCHE, que es lo que todo el mundo quiere saber y lo
 * único que se lee a un metro. Después EL CUADRO VERDADERO, que es el momento de
 * la velada: seis renglones, la hora y el convoy, y ahí es donde la mesa levanta
 * la vista del móvil para gritar. Luego lo de cada cual —tu cuadro contra el
 * bueno—, la cuenta de la noche y, al final, quiénes ganaron.
 *
 * Lo tuyo va DESPUÉS del cuadro verdadero a propósito: acertar seis franjas de
 * memoria es un mérito personal y no decide nada, así que ponerlo antes haría
 * creer que la noche se ganaba por ahí.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DE DÓNDE SALE CADA COSA, Y QUÉ PASA SI FALTA EL PARTE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * El CUADRO VERDADERO sale de `vista.desenlace.respuestas` —un renglón por eje,
 * o sea por franja, con la hora en `rotulo`— y de ningún otro sitio: es la única
 * puerta por la que la plataforma deja salir la solución, y está probada. El
 * estado del juego no lo manda nunca, ni siquiera aquí.
 *
 * El VEREDICTO sale de `estado.amanecer`, que lo escribe el servidor cuando
 * quien dirige da el parte. Pero quien dirige puede irse directo al desenlace
 * —es una velada en casa, no un procedimiento— y entonces ese parte no existe.
 * En ese caso se deduce de lo que sí hay: si el Correo está entre los convoyes
 * que salieron y si el retraso pasó del tope. Es EXACTAMENTE lo que hace
 * `calcularAmanecer` en el servidor menos las dos cuentas que solo se cobran al
 * final —lo que cuesta una franja sin despacho y un convoy que se queda en la
 * vía—, así que la deducción puede pecar de optimista y NUNCA de lo contrario.
 * Por eso, cuando no hay parte, la pantalla lo dice en el sitio donde iría el
 * anuncio en vez de callárselo: dar por buena una noche que el servidor todavía
 * no ha cerrado sería mentir en el único instante en el que nadie va a dudar de
 * la pantalla.
 *
 * Y si además falta el estado entero —una partida vieja, un móvil por detrás del
 * servidor— hay un cuarto titular que no afirma nada. Un final tiene tres
 * finales; una pantalla tiene que tener también el caso de «no lo sé», porque
 * pintar «EL CORREO SE QUEDÓ EN LA VÍA» sin saberlo sería inventarse la noche.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { usePartida } from '../estado';
import {
  Boton,
  Cargando,
  Cuerpo,
  CuerpoPapel,
  Etiqueta,
  Marco,
  Ornamento,
  Pantalla,
  Seccion,
  Sello,
  Titulo,
  espacio,
  radio,
  texto,
} from '../ui';
import { conAlfa } from '../tema-juego';
import { COLOR_NUDO as C, NUDO as N } from '../tema-nudo';
import { Contador } from './piezas';
import { leerEstadoNudo } from './vista';
import type { AmanecerVisible, EstadoNudoVisible } from './vista';

// ---------------------------------------------------------------------------
// El veredicto
// ---------------------------------------------------------------------------

/**
 * Los cuatro finales posibles. Tres son de juego y el cuarto es de honradez.
 *
 * `sin-parte` no es un empate ni un final malo: es «la estación no ha dicho cómo
 * quedó y yo no tengo con qué deducirlo». Se distingue del resto porque es el
 * único que no se pinta en color: ni el ámbar de la bombilla ni el rojo de
 * señal, que en esta paleta significan cosas concretas.
 */
type Veredicto = 'gano' | 'sin-correo' | 'tarde' | 'sin-parte';

/**
 * Qué se lee en grande, según cómo acabó.
 *
 * VA EN UNA TABLA Y NO EN TERNARIOS ANIDADOS por lo mismo que el ornamento de
 * `ui.tsx`: cuatro casos encadenados con `?:` se leen en diagonal y el día que
 * haya un quinto se cuela dentro del respaldo de otro sin que nada avise. Aquí
 * los cuatro se ven de una vez, y el que falte no compila.
 *
 * El TONO es una ranura y no un color: los colores de un `const` de módulo se
 * congelan al importar el fichero, y aunque esta pantalla sea de un solo juego
 * —y su paleta, por tanto, fija— la costumbre de meter color en una constante de
 * módulo es la que reventó el tema de la Momia. Se resuelve al pintar.
 */
const TITULAR: Record<
  Veredicto,
  { sello: string; rotulo: string; tono: 'oro' | 'rojo' | 'neutro'; frase: string }
> = {
  gano: {
    sello: `${N.estacion} · amanece`,
    rotulo: 'EL PUERTO SIGUE ABIERTO',
    tono: 'oro',
    frase: 'El Correo cruzó y el suero está en el valle antes de que abra el consultorio.',
  },
  'sin-correo': {
    sello: `${N.estacion} · amanece`,
    rotulo: 'EL CORREO SE QUEDÓ EN LA VÍA',
    tono: 'rojo',
    frase: 'Clarea con el suero todavía en la estación. No hubo franja para él.',
  },
  tarde: {
    sello: `${N.estacion} · amanece`,
    rotulo: 'AMANECIÓ TARDE',
    tono: 'rojo',
    frase: 'El Correo cruzó, pero el puerto se cerró con la nieve antes de que llegara al valle.',
  },
  'sin-parte': {
    sello: `${N.estacion} · sin parte`,
    rotulo: 'AMANECIÓ SOBRE VALDEHIERRO',
    tono: 'neutro',
    frase: 'La noche se cerró sin dar el parte, así que la estación no ha dicho cómo quedó.',
  },
};

/**
 * Cómo acabó, con el parte si lo hay y deduciéndolo si no.
 *
 * Las dos condiciones son las del servidor y son DOS, no una: se puede sacar los
 * seis convoyes y perder por veinte minutos de retraso, y se puede cerrar con
 * dos minutos habiendo dejado el Correo en la vía tres.
 */
function veredictoDe(
  parte: AmanecerVisible | undefined,
  estado: EstadoNudoVisible | undefined,
): Veredicto {
  if (parte) {
    /*
     * `ganadores` es la palabra del servidor y manda sobre las otras dos: las
     * escribió la misma función que las calculó, en el instante en que se dio el
     * parte, y desde entonces no puede cambiar.
     */
    if (parte.ganadores.length > 0) return 'gano';
    return parte.correoPaso ? 'tarde' : 'sin-correo';
  }
  if (!estado) return 'sin-parte';
  /*
   * Se saca a una constante ANTES del `some`: dentro de una función de flecha,
   * TypeScript deja de fiarse de que `estado.correo` siga sin ser `undefined`, y
   * el arreglo cómodo sería un `!` que aquí no hace falta.
   */
  const correo = estado.correo;
  if (!correo) return 'sin-parte';
  if (!estado.salidos.some((c) => c.id === correo.id)) return 'sin-correo';
  return estado.retraso > estado.retrasoMaximo ? 'tarde' : 'gano';
}

// ---------------------------------------------------------------------------
// La pantalla
// ---------------------------------------------------------------------------

export function Amanecer(): JSX.Element {
  const { vista, cargando } = usePartida();

  /*
   * EL HOOK VA ANTES DE CUALQUIER `return`, incluido el de «todavía no ha
   * amanecido». React cuenta los hooks por orden de llamada: si el aviso saliera
   * antes, pasar de «cargando» a «desenlace» cambiaría cuántos hay y React
   * tiraría la pantalla entera en el único momento de la noche que no se repite.
   */
  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const desenlace = vista?.desenlace;
  if (!vista || !desenlace) {
    return (
      <Pantalla>
        <Cargando texto={cargando ? 'Amanece sobre Valdehierro…' : 'Todavía no ha amanecido.'} />
      </Pantalla>
    );
  }

  const estado = leerEstadoNudo(vista.estadoDelJuego);
  const parte = estado?.amanecer;
  const veredicto = veredictoDe(parte, estado);
  const titular = TITULAR[veredicto];
  const tinta = { oro: C.oro300, rojo: C.peligro, neutro: C.pergamino }[titular.tono];

  const franjas = desenlace.respuestas;
  const idCorreo = estado?.correo?.id;
  const salidos = estado?.salidos;

  /*
   * Los nombres de los convoyes salen de `vista.entidades`, que es la lista que
   * la plataforma manda toda la partida: hace falta para poner nombre a lo que
   * TÚ escribiste, que puede ser un convoy que no salió en ninguna franja y por
   * tanto no aparece en las respuestas verdaderas.
   */
  const convoyes = vista.entidades.find((e) => e.categoriaId === 'convoyes')?.cosas ?? [];
  const nombreDeConvoy = (id: string): string =>
    convoyes.find((c) => c.id === id)?.name ??
    franjas.find((r) => r.entidadId === id)?.nombre ??
    id;

  const mio = vista.miRespuesta?.respuestas;
  const aciertos = mio ? franjas.filter((r) => mio[r.ejeId] === r.entidadId).length : 0;

  const cruzaron = parte?.cruzaron ?? estado?.despachados;
  const retrasoFinal = parte?.retrasoFinal ?? estado?.retraso;
  const tope = estado?.retrasoMaximo;

  /*
   * LA MESA ENTERA, Y TÚ EL PRIMERO. `vista.jugadores` llega del servidor SIN
   * quien la recibe —la proyección te quita a propósito—, así que pintar esa
   * lista tal cual dejaría fuera del turno ganador justo a quien está mirando la
   * pantalla. Es el mismo tropiezo que documenta el amanecer de la Momia.
   */
  const mesa = [
    { id: vista.yo.participanteId, nombre: vista.yo.displayName, soyYo: true },
    ...vista.jugadores.map((j) => ({
      id: j.participanteId,
      nombre: j.displayName,
      soyYo: false,
    })),
  ];
  const ganadores = parte?.ganadores;
  const gano = veredicto === 'gano';
  const ganoEste = (id: string): boolean => (ganadores ? ganadores.includes(id) : gano);

  return (
    <Pantalla>
      {/* ---- 1. Cómo acabó ---- */}
      <Animated.View entering={FadeInDown.duration(600)} style={estilos.centro}>
        <Sello>{titular.sello}</Sello>
        <Titulo
          style={{ textAlign: 'center', marginTop: espacio.lg, fontSize: 27, lineHeight: 34, color: tinta }}
        >
          {titular.rotulo}
        </Titulo>
      </Animated.View>

      {/*
        El anuncio lo escribe el servidor y está pensado para leerse en voz alta,
        así que va TAL CUAL y sobre papel: es el parte que se clava en el tablón,
        y es lo único de esta pantalla que se dice en alto. Cuando no lo hay, va
        en su sitio la frase corta del titular, que dice lo mismo en una línea sin
        fingir que la estación ha hablado.
      */}
      <Animated.View entering={FadeIn.duration(500).delay(220)}>
        {parte?.anuncio ? (
          <Marco tono="papel" style={{ marginTop: espacio.lg }}>
            <Text style={[texto.microCaps, { color: C.caoba700, letterSpacing: 2.4 }]}>
              Parte del amanecer
            </Text>
            <CuerpoPapel style={{ marginTop: espacio.sm }}>{parte.anuncio}</CuerpoPapel>
          </Marco>
        ) : (
          <Marco style={{ marginTop: espacio.lg }}>
            <Cuerpo style={{ textAlign: 'center' }}>{titular.frase}</Cuerpo>
            <Cuerpo tenue style={{ textAlign: 'center', fontSize: 14, marginTop: espacio.sm }}>
              {veredicto === 'sin-parte'
                ? 'Se cerró la noche sin el parte y sin cuentas: lo que sigue es el cuadro verdadero, que eso sí está.'
                : 'Nadie dio el parte del amanecer: esto es lo que decía el tablero al cerrar, sin cobrar todavía lo que cuestan las franjas perdidas y los convoyes que se quedaron en la vía.'}
            </Cuerpo>
          </Marco>
        )}
      </Animated.View>

      <Ornamento />

      {/* ---- 2. El cuadro verdadero ---- */}
      <Seccion>El cuadro de marchas de esta noche</Seccion>
      <Cuerpo tenue style={{ fontSize: 14, marginBottom: espacio.sm }}>
        El que ardió en el telégrafo. Este era el orden bueno, franja por franja.
      </Cuerpo>
      <Animated.View entering={FadeInDown.duration(520).delay(320)}>
        <Marco style={{ marginBottom: espacio.md }}>
          {franjas.map((r, i) => (
            <Renglon
              key={r.ejeId}
              franja={i + 1}
              hora={r.rotulo}
              nombre={r.nombre}
              esCorreo={r.entidadId !== '' && r.entidadId === idCorreo}
              cruzo={salidos ? salidos.some((c) => c.id === r.entidadId) : undefined}
              ultimo={i === franjas.length - 1}
            />
          ))}
          {salidos ? (
            <Cuerpo tenue style={{ fontSize: 13, marginTop: espacio.md }}>
              A la derecha, el que de verdad salió. El enclavamiento no daba paso a otro, así que lo
              que cruzó, cruzó en su franja.
            </Cuerpo>
          ) : null}
        </Marco>
      </Animated.View>

      {/* ---- 3. Tu cuadro contra el bueno ---- */}
      <Seccion>El cuadro que entregaste</Seccion>
      {mio ? (
        <Marco style={{ marginBottom: espacio.md }}>
          {franjas.map((r) => {
            const puse = mio[r.ejeId] ?? '';
            const bien = puse !== '' && puse === r.entidadId;
            return (
              <View key={`mio:${r.ejeId}`} style={estilos.renglonMio}>
                <Text style={[texto.microCaps, { color: C.laton, fontSize: 11, width: 52 }]}>
                  {r.rotulo}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    texto.cuerpo,
                    { color: bien ? C.pergamino : C.pergaminoTenue, fontSize: 16, flex: 1 },
                  ]}
                >
                  {puse === '' ? 'lo dejaste en blanco' : nombreDeConvoy(puse)}
                </Text>
                <Text style={{ color: bien ? C.oro300 : C.peligro, fontSize: 18, width: 24, textAlign: 'right' }}>
                  {bien ? '✓' : N.marca}
                </Text>
              </View>
            );
          })}
          <View style={[estilos.total, { borderTopColor: conAlfa(C.laton, 0.25) }]}>
            <Text style={[texto.numero, { color: C.oro300, fontSize: 34 }]}>
              {aciertos}
            </Text>
            <Etiqueta style={{ marginLeft: espacio.sm }}>
              de {franjas.length} franjas, de memoria
            </Etiqueta>
          </View>
        </Marco>
      ) : (
        <Marco style={{ marginBottom: espacio.md }}>
          <Cuerpo tenue>
            No llegaste a entregar el tuyo. No le quita nada a la noche: el cuadro de memoria es
            cosa de cada cual y la estación se saca en la vía, no en el papel.
          </Cuerpo>
        </Marco>
      )}

      {/* ---- 4. La cuenta de la noche ---- */}
      {cruzaron !== undefined || retrasoFinal !== undefined ? (
        <>
          <Seccion>La cuenta de la noche</Seccion>
          <View style={estilos.cuenta}>
            {cruzaron !== undefined ? (
              <View style={{ flex: 1 }}>
                <Contador etiqueta="cruzaron" valor={`${cruzaron}/${franjas.length}`} />
              </View>
            ) : null}
            {retrasoFinal !== undefined ? (
              <View style={{ flex: 1 }}>
                {/*
                  Aquí NO va `BarraDelRetraso`, que es lo que se ha mirado toda la
                  noche: su rótulo dice «quedan N min», y en un marcador ya
                  cerrado eso no significa nada. La cifra sola, en rojo si el
                  puerto se cerró, dice lo único que queda por decir.
                */}
                <Contador
                  etiqueta="retraso final"
                  valor={retrasoFinal}
                  tono={veredicto === 'tarde' ? 'rojo' : 'oro'}
                />
              </View>
            ) : null}
            {tope !== undefined ? (
              <View style={{ flex: 1 }}>
                <Contador etiqueta="el tope era" valor={tope} tono="tenue" />
              </View>
            ) : null}
          </View>
        </>
      ) : null}

      <Ornamento />

      {/* ---- 5. Quiénes ganaron ---- */}
      <Seccion>{gano ? 'Ganó el turno de noche' : 'Esta noche no la sacó nadie'}</Seccion>
      <Marco tono={gano ? 'oscuro' : 'peligro'} style={{ marginBottom: espacio.md }}>
        <Cuerpo tenue style={{ fontSize: 15, marginBottom: espacio.md }}>
          {gano
            ? 'Aquí no hay primero ni último: cruzó el Correo y el puerto aguantó, así que gana el turno entero.'
            : 'Aquí se gana en grupo o no se gana. No hay a quién señalar: se perdió en la vía, y se perdió entre todos.'}
        </Cuerpo>
        {mesa.map((p) => {
          const suya = ganoEste(p.id);
          return (
            <View key={p.id} style={estilos.renglonMesa}>
              <Text style={{ color: suya ? C.oro300 : conAlfa(C.pergaminoTenue, 0.7), fontSize: 16, width: 22 }}>
                {suya ? '✓' : '·'}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  texto.cuerpo,
                  { color: suya ? C.pergamino : C.pergaminoTenue, fontSize: 16, flex: 1 },
                ]}
              >
                {p.nombre}
              </Text>
              {p.soyYo ? <Etiqueta>tú</Etiqueta> : null}
            </View>
          );
        })}
      </Marco>

      <Boton
        variante="primario"
        onPress={() => router.replace('/(juego)/perfil')}
        style={{ marginTop: espacio.lg }}
      >
        Ver mi vitrina
      </Boton>
    </Pantalla>
  );
}

// ---------------------------------------------------------------------------
// Un renglón del cuadro verdadero
// ---------------------------------------------------------------------------

/**
 * Hora, convoy y —si se sabe— si llegó a salir.
 *
 * Vive aquí y no en `piezas.tsx` porque solo tiene sentido en esta pantalla:
 * `FilaDeConvoy` es la fila que se PULSA para cursar una orden y por eso no
 * lleva hora, y meterle una columna de franja para un solo uso la volvería una
 * pieza con dos oficios. Aquí, además, nada es pulsable: la noche terminó.
 *
 * EL CORREO VA MARCADO con el filo rojo y su sello, igual que durante la
 * partida. Es la fila que la mesa busca con la vista antes de leer nada, y que
 * en el cuadro verdadero cambie de aspecto sería obligar a buscarla otra vez.
 */
function Renglon({
  franja,
  hora,
  nombre,
  esCorreo,
  cruzo,
  ultimo,
}: {
  franja: number;
  hora: string;
  nombre: string;
  esCorreo: boolean;
  /** `undefined` cuando no ha llegado el estado del juego y no se puede saber. */
  cruzo?: boolean;
  ultimo: boolean;
}): JSX.Element {
  return (
    <View
      style={[
        estilos.renglon,
        {
          borderBottomColor: conAlfa(C.laton, 0.22),
          borderBottomWidth: ultimo ? 0 : 1,
          borderLeftColor: C.burdeos600,
          borderLeftWidth: esCorreo ? 4 : 0,
          paddingLeft: esCorreo ? espacio.sm : 0,
        },
      ]}
    >
      <View style={estilos.renglonHora}>
        <Text style={[texto.etiqueta, { color: C.oro300, fontSize: 15 }]}>{hora}</Text>
        <Text style={[texto.microCaps, { color: C.laton, fontSize: 9, letterSpacing: 1 }]}>
          franja {franja}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text numberOfLines={2} style={[texto.cuerpo, { color: C.pergamino, fontSize: 18 }]}>
          {nombre}
        </Text>
        {esCorreo ? (
          <View style={[estilos.selloCorreo, { borderColor: C.burdeos600 }]}>
            <Text style={[texto.microCaps, { color: C.peligro, fontSize: 9, letterSpacing: 1.2 }]}>
              Correo de medianoche
            </Text>
          </View>
        ) : null}
      </View>

      {cruzo === undefined ? null : (
        <View style={estilos.renglonMarca}>
          <Text style={{ color: cruzo ? C.oro300 : C.peligro, fontSize: 18 }}>
            {cruzo ? '✓' : N.marca}
          </Text>
          <Text
            style={[texto.microCaps, { color: cruzo ? C.laton : C.peligro, fontSize: 9, letterSpacing: 1 }]}
          >
            {cruzo ? 'cruzó' : 'en vía'}
          </Text>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Medidas y disposición. El color va en línea, nunca aquí: un `StyleSheet` de
// módulo se evalúa al importar el fichero y congelaría la paleta.
// ---------------------------------------------------------------------------

const estilos = StyleSheet.create({
  centro: { alignItems: 'center' },

  renglon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    minHeight: 56,
    paddingVertical: espacio.sm,
  },
  renglonHora: { width: 56 },
  renglonMarca: { width: 48, alignItems: 'center' },
  selloCorreo: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radio.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginTop: 4,
  },

  renglonMio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    minHeight: 34,
  },
  total: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: espacio.md,
    paddingTop: espacio.sm,
    borderTopWidth: 1,
  },

  cuenta: { flexDirection: 'row', gap: espacio.sm, marginBottom: espacio.md },

  renglonMesa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    minHeight: 32,
  },
});
