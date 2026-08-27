/**
 * El papiro: los fragmentos que has reunido y lo que dejan descartado.
 *
 * Es la pantalla que más se mira de El Misterio de la Momia, y tiene tres
 * trabajos que se estorban entre sí. El orden en que están puestos es el orden
 * en que importan:
 *
 *  1. QUE NO SE CONFUNDA LO TUYO CON LO DE LA MESA. Contar en voz alta algo que
 *     creías público y no lo era es delatarse solo, y en un juego donde uno de
 *     los presentes miente, delatarse es perder. Por eso lo privado y lo público
 *     no se distinguen con una etiqueta: son de otro material (ver
 *     `TarjetaFragmento`).
 *
 *  2. QUE SE SIENTA LA DUDA. Alguno de los públicos puede ser falso y la app NO
 *     SABE CUÁL —el servidor no manda ese dato y no debe—. La tentación es no
 *     mencionarlo, porque una app que avisa de que sus datos pueden ser mentira
 *     parece una app rota. Aquí es al revés: esa desconfianza es la emoción
 *     central del juego, así que se dice arriba, en grande, y se le da a quien
 *     juega la herramienta para actuar en consecuencia (apartar un fragmento y
 *     ver qué pasa sin él).
 *
 *  3. QUE AYUDE A RAZONAR SIN RAZONAR POR TI. El tablero tacha lo que cada
 *     fragmento deja imposible ÉL SOLO, y no cruza unos con otros. El porqué,
 *     largo y con la línea exacta que no se cruza, está en `piezas.tsx`.
 */
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
import { COLOR_MOMIA as C, MOMIA } from '../../src/tema-momia';
import {
  TableroDeRitos,
  TarjetaFragmento,
  exclusionesDe,
  hayContradiccion,
} from '../../src/momia/piezas';
import { leerEstadoMomia } from '../../src/momia/vista';

export default function Papiro(): JSX.Element {
  const { vista, cargando } = usePartida();
  /**
   * Qué fragmentos públicos has apartado por no fiarte.
   *
   * Vive SOLO en el móvil, y es a propósito: no es una jugada, es una sospecha.
   * Si viajara al servidor sería un dato más que alguien podría acabar viendo, y
   * lo que hace que esto valga algo es que nadie sabe de qué dudas tú.
   */
  const [apartados, setApartados] = useState<Set<string>>(new Set());

  const estado = useMemo(() => leerEstadoMomia(vista?.estadoDelJuego), [vista?.estadoDelJuego]);

  const deduccion = useMemo(() => {
    if (!estado) return null;
    const publicosEnPie = estado.publicos.filter((f) => !apartados.has(f.id));
    const enUso = [...estado.yo.fragmentos, ...publicosEnPie].map((f) => f.restriccion);
    return {
      exclusiones: exclusionesDe(enUso, estado.ritos),
      contradiccion: hayContradiccion(enUso, estado.ritos),
      cuantos: enUso.length,
    };
  }, [estado, apartados]);

  if (cargando && !vista) return <Pantalla><Cargando texto="Desenrollando el papiro…" /></Pantalla>;

  if (!estado) {
    return (
      <Pantalla>
        <Titulo>El papiro</Titulo>
        <Marco>
          <Cuerpo tenue>
            Todavía no hay nada escrito. Los fragmentos aparecen al entrar en las cámaras: cada
            uno dice una sola cosa sobre el orden de los ritos.
          </Cuerpo>
        </Marco>
      </Pantalla>
    );
  }

  const mios = estado.yo.fragmentos;
  const publicos = estado.publicos;

  const alternar = (id: string): void =>
    setApartados((antes) => {
      const nuevo = new Set(antes);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });

  return (
    <Pantalla>
      <Animated.View entering={FadeInDown.duration(480)} style={estilos.centro}>
        <Sello>El papiro roto</Sello>
        <Titulo style={{ textAlign: 'center', marginTop: espacio.md }}>
          {mios.length + publicos.length === 0
            ? 'Sin un solo fragmento'
            : `${mios.length + publicos.length} fragmentos`}
        </Titulo>
        <Cuerpo tenue style={{ textAlign: 'center', fontStyle: 'italic', marginTop: 2 }}>
          Cada trozo dice una cosa sobre el orden. Ninguno lo dice entero.
        </Cuerpo>
      </Animated.View>

      <Ornamento />

      {/* ---- Lo tuyo ---- */}
      <Seccion>En tu mano</Seccion>
      {mios.length === 0 ? (
        <Marco>
          <Cuerpo tenue>
            No llevas ninguno todavía. Entra en una cámara durante la vigilia y saldrás con uno.
          </Cuerpo>
        </Marco>
      ) : (
        mios.map((f, i) => (
          <Animated.View key={f.id} entering={FadeInUp.delay(50 * i).duration(420)}>
            <TarjetaFragmento fragmento={f} privado />
          </Animated.View>
        ))
      )}

      <Ornamento />

      {/* ---- Lo de la mesa, con su duda ---- */}
      <Seccion>Sobre la mesa</Seccion>

      {publicos.length > 0 && (
        <Animated.View entering={FadeInUp.duration(500)}>
          <View style={estilos.duda}>
            <Cuerpo style={{ color: C.pergamino, fontFamily: 'Cinzel_600SemiBold', fontSize: 17 }}>
              Alguno de estos puede ser falso.
            </Cuerpo>
            <Cuerpo tenue style={{ marginTop: 6, fontSize: 16 }}>
              El saqueador puede fabricar un fragmento y ponerlo aquí como si lo hubiera
              encontrado. No hay forma de distinguirlo mirándolo: se escribe igual y suena igual.
              {'\n\n'}
              Lo único que se puede hacer es apartar el que no te cuadre y ver si el resto encaja
              sin él. <Cuerpo tenue style={{ fontStyle: 'italic' }}>Nadie ve de qué dudas.</Cuerpo>
            </Cuerpo>
          </View>
        </Animated.View>
      )}

      {publicos.length === 0 ? (
        <Marco>
          <Cuerpo tenue>
            Nadie ha puesto nada en común. Al cerrarse la vigilia se hace público parte de lo
            encontrado, y quien tenga el don de documentar puede adelantar algo suyo.
          </Cuerpo>
        </Marco>
      ) : (
        publicos.map((f, i) => (
          <Animated.View key={f.id} entering={FadeInUp.delay(50 * i).duration(420)}>
            <TarjetaFragmento
              fragmento={f}
              privado={false}
              dudado={apartados.has(f.id)}
              alDudar={() => alternar(f.id)}
            />
          </Animated.View>
        ))
      )}

      {/* ---- El tablero ---- */}
      {estado.ritos.length > 0 && (
        <>
          <Ornamento />
          <Seccion>Lo que ya no puede ser</Seccion>
          <Cuerpo tenue style={{ fontSize: 16, marginBottom: espacio.md }}>
            Cada casilla tachada es un lugar que un fragmento descarta por sí solo. El tablero no
            cruza unos con otros: eso es tu trabajo, y es el juego.
          </Cuerpo>

          {deduccion?.contradiccion && (
            <Animated.View entering={FadeInDown.duration(400)}>
              <View style={estilos.mentira}>
                <Etiqueta style={{ color: '#ffd9c9' }}>Esto no puede ser</Etiqueta>
                <Cuerpo style={{ color: '#ffe6da', marginTop: 6, fontSize: 17 }}>
                  No existe ningún orden de los cinco ritos que cumpla a la vez todo lo que estás
                  dando por cierto. Alguno de estos fragmentos miente.
                </Cuerpo>
              </View>
            </Animated.View>
          )}

          <Marco>
            <TableroDeRitos ritos={estado.ritos} exclusiones={deduccion?.exclusiones ?? new Set()} />
            <View style={estilos.pieTablero}>
              <Etiqueta>
                {deduccion?.cuantos === 1
                  ? '1 fragmento en pie'
                  : `${deduccion?.cuantos ?? 0} fragmentos en pie`}
              </Etiqueta>
              {apartados.size > 0 && (
                <Etiqueta style={{ color: C.burdeos600 }}>
                  {apartados.size === 1 ? '1 apartado' : `${apartados.size} apartados`}
                </Etiqueta>
              )}
            </View>
          </Marco>
        </>
      )}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  centro: { alignItems: 'center', paddingTop: espacio.lg },

  /**
   * El aviso de la duda.
   *
   * Con el borde izquierdo grueso en ocre y sin el redondeo de los marcos
   * normales: tenía que leerse como una nota al margen escrita a mano encima de
   * la pantalla, no como un panel más del producto. Es lo único de la app que
   * dice «no te fíes de lo que te estoy enseñando».
   */
  duda: {
    borderLeftWidth: 4,
    borderLeftColor: MOMIA.profanada,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: conAlfa(MOMIA.profanada, 0.35),
    backgroundColor: conAlfa(MOMIA.profanada, 0.1),
    borderTopRightRadius: radio.md,
    borderBottomRightRadius: radio.md,
    padding: espacio.md,
    marginBottom: espacio.md,
  },

  mentira: {
    borderWidth: 1,
    borderColor: MOMIA.profanada,
    backgroundColor: conAlfa(MOMIA.profanada, 0.28),
    borderRadius: radio.md,
    padding: espacio.md,
    marginBottom: espacio.md,
  },

  pieTablero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: espacio.md,
    paddingTop: espacio.sm,
    borderTopWidth: 1,
    borderTopColor: conAlfa(C.laton, 0.25),
  },
});
