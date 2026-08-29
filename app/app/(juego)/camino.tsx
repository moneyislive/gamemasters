/**
 * La senda: lo que has reunido y lo que deja descartado.
 *
 * Es la pantalla que más se mira de El Paso de las Sombras, y tiene tres
 * trabajos que se estorban entre sí. El orden en que están puestos es el orden
 * en que importan:
 *
 *  1. QUE NO SE CONFUNDA LO TUYO CON LO DE LA MESA. Contar en voz alta algo que
 *     creías público y no lo era es delatarse solo, y en un juego donde uno de
 *     los presentes miente, delatarse es perder. Por eso lo privado y lo público
 *     no se distinguen con una etiqueta: son de otro material (ver
 *     `TarjetaHito`).
 *
 *  2. QUE SE SIENTA LA DUDA. Alguno de los públicos puede ser falso y la app NO
 *     SABE CUÁL —el servidor no manda ese dato y no debe—. La tentación es no
 *     mencionarlo, porque una app que avisa de que sus datos pueden ser mentira
 *     parece una app rota. Aquí es al revés: esa desconfianza es la emoción
 *     central del juego, así que se dice arriba y se le da a quien juega la
 *     herramienta para actuar en consecuencia (apartar un mojón y ver qué pasa
 *     sin él).
 *
 *  3. QUE AYUDE A RAZONAR SIN RAZONAR POR TI. El tablero tacha lo que cada hito
 *     deja imposible ÉL SOLO, y no cruza unos con otros. El porqué, con la línea
 *     exacta que no se cruza, está en `src/sombras/piezas.tsx`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Y UNA CUARTA COSA QUE LA MOMIA NO TENÍA: LOS ENCUENTROS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Quién estuvo con quién y a qué hora. No es decoración: dos personas en el
 * mismo paso a la misma hora leyeron EL MISMO mojón, así que si cuentan cosas
 * distintas una miente. Es la única prueba objetiva que hay en toda la noche, y
 * por eso va aquí abajo, debajo de los mojones, que es donde se mira cuando algo
 * no cuadra.
 */
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { usePartida } from '../../src/estado';
import {
  Cargando,
  Cuerpo,
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
} from '../../src/ui';
import { conAlfa } from '../../src/tema-juego';
import { COLOR_SOMBRAS as C, SOMBRAS as S } from '../../src/tema-sombras';
import {
  BarraDelRastro,
  TableroDeLaSenda,
  TarjetaHito,
  exclusionesDe,
  hayContradiccion,
} from '../../src/sombras/piezas';
import { leerEstadoSombras } from '../../src/sombras/vista';

export default function Camino(): JSX.Element {
  const { vista, cargando } = usePartida();
  /**
   * Qué mojones públicos has apartado por no fiarte.
   *
   * Vive SOLO en el móvil, y es a propósito: no es una jugada, es una sospecha.
   * Si viajara al servidor sería un dato más que alguien podría acabar viendo, y
   * sobre todo dejaría de ser tuyo: la app pasaría a llevar la cuenta de en
   * quién confías, que es exactamente lo que este juego quiere que se diga en
   * voz alta y no en una pantalla.
   */
  const [apartados, setApartados] = useState<string[]>([]);

  const s = vista ? leerEstadoSombras(vista.estadoDelJuego) : null;

  const enJuego = useMemo(() => {
    if (!s) return [];
    const publicosVivos = s.camino.filter((h) => !apartados.includes(h.id));
    // Los tuyos no se pueden apartar: los has leído tú.
    const todos = [...s.yo.hitos.filter((h) => !h.publico), ...publicosVivos];
    return todos;
  }, [s, apartados]);

  const condiciones = useMemo(
    () => enJuego.map((h) => h.condicion).filter((c): c is NonNullable<typeof c> => Boolean(c)),
    [enJuego],
  );

  const exclusiones = useMemo(
    () => exclusionesDe(condiciones, s?.pasos ?? [], s?.hora.tramos ?? 4),
    [condiciones, s?.pasos, s?.hora.tramos],
  );

  const contradice = useMemo(
    () => hayContradiccion(condiciones, s?.pasos ?? [], s?.hora.tramos ?? 4),
    [condiciones, s?.pasos, s?.hora.tramos],
  );

  if (cargando && !vista) {
    return (
      <Pantalla>
        <Cargando texto="Recogiendo lo que has leído…" />
      </Pantalla>
    );
  }
  if (!vista || !s) {
    return (
      <Pantalla>
        <Cargando texto="Todavía no hay nada que leer." />
      </Pantalla>
    );
  }

  const nombreDePaso = (id: string) => s.pasos.find((p) => p.id === id)?.nombre ?? id;
  const nombreDe = (id: string) =>
    id === vista.yo.suspectId
      ? vista.yo.displayName
      : (vista.jugadores.find((j) => j.suspectId === id)?.displayName ?? 'alguien');
  const mios = s.yo.hitos.filter((h) => !h.publico);

  return (
    <Pantalla>
      <Animated.View entering={FadeInUp.duration(420)}>
        <Sello>La senda</Sello>
        <Titulo style={{ marginTop: espacio.sm }}>
          {s.hora.tramos} pasos, en orden
        </Titulo>
        <Cuerpo tenue style={{ marginTop: 4 }}>
          De los {s.pasos.length} que hay, solo {s.hora.tramos} llevan a la playa. Nadie tiene
          bastantes mojones para saberlo solo.
        </Cuerpo>
      </Animated.View>

      <Marco style={{ marginTop: espacio.md, marginBottom: espacio.md }}>
        <BarraDelRastro rastro={s.hora.rastro} maximo={s.hora.rastroMaximo} compacta />
      </Marco>

      {contradice && (
        <Animated.View entering={FadeInDown.duration(400)}>
          <Marco tono="peligro" style={{ marginBottom: espacio.md }}>
            <Etiqueta style={{ color: C.oro300 }}>Aquí hay algo que no encaja</Etiqueta>
            <Cuerpo style={{ marginTop: espacio.xs }}>
              Con todo lo que estás contando no queda NINGUNA senda posible. Eso significa que uno
              de estos mojones es mentira. Apártalo y mira qué pasa sin él — y luego pregunta a
              quien lo puso dónde dice haberlo leído, y quién estaba con él.
            </Cuerpo>
          </Marco>
        </Animated.View>
      )}

      {/* ---- El tablero ---- */}
      <Seccion>Lo que queda descartado</Seccion>
      {s.hayCondiciones ? (
        <Marco>
          <TableroDeLaSenda
            pasos={s.pasos}
            tramos={s.hora.tramos}
            exclusiones={exclusiones}
          />
          <Cuerpo tenue style={{ fontSize: 13, marginTop: espacio.md }}>
            Cada mojón tacha lo que deja imposible ÉL SOLO. No se cruzan entre sí a propósito: eso
            es trabajo de la mesa, no de la app.
          </Cuerpo>
        </Marco>
      ) : (
        <Marco>
          <Cuerpo tenue>
            Todavía no has leído ningún mojón. Ve a un paso, lee la palabra de la puerta y vuelve.
          </Cuerpo>
        </Marco>
      )}

      {/* ---- Lo tuyo ---- */}
      <Ornamento />
      <Seccion>En tu mano</Seccion>
      {mios.length === 0 ? (
        <Marco>
          <Cuerpo tenue>Nada todavía.</Cuerpo>
        </Marco>
      ) : (
        mios.map((h) => <TarjetaHito key={h.id} hito={h} nombreDePaso={nombreDePaso} />)
      )}

      {/* ---- Lo de la mesa ---- */}
      <Ornamento />
      <Seccion>Sobre la mesa</Seccion>
      <Cuerpo tenue style={{ marginBottom: espacio.sm, fontSize: 14 }}>
        Cualquiera de estos puede ser falso, y nadie sabe cuál. Tócalo para apartarlo y ver el
        tablero sin él.
      </Cuerpo>
      {s.camino.length === 0 ? (
        <Marco>
          <Cuerpo tenue>Nadie ha puesto nada sobre la mesa todavía.</Cuerpo>
        </Marco>
      ) : (
        s.camino.map((h) => (
          <TarjetaHito
            key={h.id}
            hito={h}
            apartada={apartados.includes(h.id)}
            nombreDePaso={nombreDePaso}
            alTocar={() =>
              setApartados((previos) =>
                previos.includes(h.id) ? previos.filter((x) => x !== h.id) : [...previos, h.id],
              )
            }
          />
        ))
      )}

      {/* ---- Los encuentros ---- */}
      {s.encuentros.length > 0 && (
        <>
          <Ornamento />
          <Seccion>Quién estuvo con quién</Seccion>
          <Cuerpo tenue style={{ marginBottom: espacio.sm, fontSize: 14 }}>
            Dos personas en el mismo paso a la misma hora leyeron lo mismo. Es lo único de esta
            noche que no se puede discutir.
          </Cuerpo>
          {s.encuentros
            .slice()
            .sort((a, b) => b.ronda - a.ronda)
            .map((e) => {
              const batido = s.hora.batidosRevelados.find((b) => b.ronda === e.ronda);
              return (
                <Marco key={e.ronda} style={{ marginBottom: espacio.sm }}>
                  <View style={estilos.horaFila}>
                    <Etiqueta>Hora {e.ronda}</Etiqueta>
                    {batido && (
                      <Text style={[texto.microCaps, { color: S.rastro, fontSize: 11 }]}>
                        cazadores en {batido.nombre}
                      </Text>
                    )}
                  </View>
                  {e.pasos.map((p) => (
                    <View key={p.pasoId} style={estilos.encuentro}>
                      <Text
                        style={[
                          texto.cuerpo,
                          {
                            color: batido?.pasoId === p.pasoId ? S.rastro : C.pergamino,
                            fontSize: 15,
                            flex: 1,
                          },
                        ]}
                      >
                        {p.nombre}
                      </Text>
                      <Text
                        style={[
                          texto.microCaps,
                          { color: C.pergaminoTenue, fontSize: 11, flex: 1, textAlign: 'right' },
                        ]}
                      >
                        {p.quienes.map(nombreDe).join(' · ')}
                      </Text>
                    </View>
                  ))}
                </Marco>
              );
            })}
        </>
      )}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  horaFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: espacio.sm,
  },
  encuentro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    paddingVertical: 3,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: conAlfa(C.laton, 0.22),
  },
});
