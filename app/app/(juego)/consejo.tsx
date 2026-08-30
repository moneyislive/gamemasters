/**
 * El consejo del alba: se propone una senda y se señala a alguien.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTA PANTALLA EXISTE Y NO VALE EL PANEL GENÉRICO DE ACCIONES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `proponer-senda` se declara con `eligeVarias`, que el motor valida
 * perfectamente —cuatro pasos, todos reales, sin repetir, en el orden en que se
 * mandaron— pero que el panel genérico de la app no sabe pintar: aquel sabe
 * «elige uno de esta categoría» y nada más. Es la limitación que el informe de
 * arquitectura describe en §6.4, y hasta que se cierre, una acción con lista
 * ordenada necesita pantalla propia. Esta es.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SE PUEDE PROPONER DESDE LA PRIMERA HORA, Y ESO ES DELIBERADO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * La propuesta se puede cambiar en horas posteriores: va madurando conforme
 * salen mojones, y obligar a casarse con la primera castigaría a quien se moja
 * pronto. Lo que no se puede es entregar dos en la misma hora — y eso lo
 * comprueba el motor, no esta pantalla.
 *
 * Y hay una razón de mesa: mojarse pronto DESEMPATA. Si dos sendas empatan en
 * peso, se anda la que se propuso antes. Quien la deja para el final está
 * renunciando a algo.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as api from '../../src/api';
import { usePartida } from '../../src/estado';
import {
  Boton,
  Cargando,
  Cuerpo,
  Error as AvisoError,
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
import { BarraDelRastro, Mon } from '../../src/sombras/piezas';
import { codificarSenda, leerEstadoSombras } from '../../src/sombras/vista';

export default function Consejo(): JSX.Element {
  const { vista, cargando, aplicarVista } = usePartida();
  const [senda, setSenda] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState(false);

  const s = vista ? leerEstadoSombras(vista.estadoDelJuego) : null;

  if (cargando && !vista) {
    return (
      <Pantalla>
        <Cargando texto="Se hace de día…" />
      </Pantalla>
    );
  }
  if (!vista || !s) {
    return (
      <Pantalla>
        <Cargando texto="El consejo todavía no se ha reunido." />
      </Pantalla>
    );
  }

  const nombreDePaso = (id: string) => s.pasos.find((p) => p.id === id)?.nombre ?? id;
  const tramos = s.hora.tramos;
  const completa = senda.length === tramos;
  const yaPropuse = Boolean(s.yo.miPropuesta);
  const enJuego = ['ronda-abierta', 'ronda-cerrada', 'acusaciones'].includes(vista.sesion.phase);
  const propuestas = s.mesa.filter((m) => m.haPropuesto).length + (yaPropuse ? 1 : 0);
  const peso = 1 + s.yo.prendasRecibidas;

  const alternar = (id: string): void => {
    void Haptics.selectionAsync();
    setSenda((previos) => {
      if (previos.includes(id)) return previos.filter((x) => x !== id);
      if (previos.length >= tramos) return previos;
      return [...previos, id];
    });
  };

  const entregar = async (): Promise<void> => {
    setError(null);
    setEnviando(true);
    try {
      const r = await api.hacerAccion('proponer-senda', codificarSenda(senda));
      aplicarVista(r.vista);
      setHecho(true);
      setSenda([]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo entregar la propuesta.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Pantalla>
      <Animated.View entering={FadeInDown.duration(420)}>
        <Sello>{vista.sesion.phase === 'acusaciones' ? 'El consejo del alba' : 'Antes del alba'}</Sello>
        <Titulo style={{ marginTop: espacio.sm }}>Cuatro pasos y un nombre</Titulo>
        <Cuerpo tenue style={{ marginTop: 4 }}>
          Se anda la senda MÁS APOYADA, no la tuya. Y si dos empatan, gana la que se propuso antes.
        </Cuerpo>
      </Animated.View>

      <Marco style={{ marginTop: espacio.md, marginBottom: espacio.md }}>
        <BarraDelRastro rastro={s.hora.rastro} maximo={s.hora.rastroMaximo} compacta />
      </Marco>

      {/* ---- Lo que pesa tu voto ---- */}
      <Marco style={{ marginBottom: espacio.md }}>
        <View style={estilos.pesoFila}>
          <View style={{ flex: 1 }}>
            <Etiqueta>Lo que pesa tu voto</Etiqueta>
            <Cuerpo style={{ fontSize: 22, color: C.oro300, marginTop: 2 }}>{peso}</Cuerpo>
          </View>
          <Cuerpo tenue style={{ flex: 2, fontSize: 14 }}>
            Uno por ser quien eres, y uno más por cada prenda que te han dado
            ({s.yo.prendasRecibidas} de 2).
          </Cuerpo>
        </View>
      </Marco>

      {!enJuego && (
        <Marco>
          <Cuerpo tenue>
            El consejo se abre cuando quien dirige lo decide. Mientras tanto, sigue reuniendo
            mojones.
          </Cuerpo>
        </Marco>
      )}

      {enJuego && (
        <>
          {/* ---- Tu propuesta actual ---- */}
          {yaPropuse && (
            <Animated.View entering={FadeIn.duration(320)}>
              <Marco style={{ marginBottom: espacio.md, borderColor: conAlfa(S.bambu, 0.8) }}>
                <Etiqueta style={{ color: S.bambu }}>Lo que has entregado</Etiqueta>
                {(s.yo.miPropuesta ?? []).map((id, i) => (
                  <View key={`${id}-${i}`} style={estilos.tramo}>
                    <View style={[estilos.numero, { borderColor: S.bambu }]}>
                      <Text style={{ color: S.bambu, fontSize: 13 }}>{i + 1}</Text>
                    </View>
                    <Text style={[texto.titulo, { color: C.pergamino, fontSize: 16, flex: 1 }]}>
                      {nombreDePaso(id)}
                    </Text>
                  </View>
                ))}
                <Cuerpo tenue style={{ fontSize: 13, marginTop: espacio.sm }}>
                  Puedes cambiarla en una hora posterior, pero no dos veces en la misma.
                </Cuerpo>
              </Marco>
            </Animated.View>
          )}

          {/* ---- Armar la senda ---- */}
          <Seccion>{yaPropuse ? 'Cambiarla' : 'Tu senda'}</Seccion>
          <Cuerpo tenue style={{ marginBottom: espacio.sm, fontSize: 14 }}>
            Toca los pasos en el orden en que crees que hay que andarlos. Toca otra vez para
            quitarlos.
          </Cuerpo>

          {s.pasos.map((paso) => {
            const lugar = senda.indexOf(paso.id);
            const dentro = lugar >= 0;
            return (
              <Pressable
                key={paso.id}
                onPress={() => alternar(paso.id)}
                style={({ pressed }) => [
                  estilos.paso,
                  {
                    borderColor: dentro ? C.oro400 : conAlfa(C.laton, 0.35),
                    backgroundColor: dentro ? conAlfa(C.oro500, 0.14) : conAlfa(C.caoba900, 0.6),
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View
                  style={[
                    estilos.numero,
                    { borderColor: dentro ? C.oro400 : conAlfa(C.laton, 0.4) },
                  ]}
                >
                  <Text style={{ color: dentro ? C.oro300 : conAlfa(C.pergaminoTenue, 0.5), fontSize: 13 }}>
                    {dentro ? lugar + 1 : '·'}
                  </Text>
                </View>
                <Text
                  style={[
                    texto.titulo,
                    { color: dentro ? C.oro300 : C.pergamino, fontSize: 17, flex: 1 },
                  ]}
                >
                  {paso.nombre}
                </Text>
              </Pressable>
            );
          })}

          <AvisoError>{error}</AvisoError>
          <Boton
            variante="primario"
            disabled={!completa}
            cargando={enviando}
            onPress={() => void entregar()}
            style={{ marginTop: espacio.md }}
          >
            {completa
              ? 'Entregar esta senda'
              : `Elige ${tramos - senda.length} paso${tramos - senda.length === 1 ? '' : 's'} más`}
          </Boton>
          {hecho && (
            <Cuerpo style={{ color: S.bambu, marginTop: espacio.sm, textAlign: 'center' }}>
              Entregada. Lo que hayas dicho ya cuenta.
            </Cuerpo>
          )}

          <Cuerpo tenue style={{ marginTop: espacio.md, textAlign: 'center', fontSize: 14 }}>
            {propuestas} de {vista.jugadores.length + 1} han entregado la suya.
          </Cuerpo>

          {/* ---- Señalar ---- */}
          <Ornamento />
          <Seccion>Quién cobra de Akechi</Seccion>
          <Marco tono="peligro">
            {vista.miAcusacion ? (
              <>
                <Etiqueta style={{ color: C.oro300 }}>Ya has señalado</Etiqueta>
                <Cuerpo style={{ marginTop: espacio.xs }}>
                  Se señala una vez y para toda la noche. No sabrás si acertaste hasta que amanezca.
                </Cuerpo>
              </>
            ) : (
              <>
                <Cuerpo>
                  Una sola persona, una sola vez, y no se puede cambiar. Si la mayoría de la mesa
                  acierta, a esa persona se le retiran las prendas y su voto no cuenta en el
                  consejo: desenmascararlo no es solo un trofeo.
                </Cuerpo>
                <Boton
                  variante="peligro"
                  onPress={() => router.push('/acusar')}
                  style={{ marginTop: espacio.md }}
                >
                  Señalar a alguien
                </Boton>
              </>
            )}
          </Marco>

          {/* ---- Quién ha entregado ---- */}
          <Ornamento />
          <Seccion>La mesa</Seccion>
          <Marco>
            {s.mesa.map((m) => (
              <View key={m.participanteId} style={estilos.persona}>
                <View style={{ flex: 1 }}>
                  <Mon
                    glifo={m.haPropuesto ? '決' : '·'}
                    tono={m.haPropuesto ? 'acero' : 'apagado'}
                  >
                    {vista.jugadores.find((j) => j.participanteId === m.participanteId)?.displayName ??
                      'alguien'}
                  </Mon>
                  {m.estandarteNombre ? (
                    <Cuerpo tenue style={{ fontSize: 12, marginLeft: 34 }}>
                      {m.estandarteNombre}
                    </Cuerpo>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[texto.microCaps, { color: C.laton, fontSize: 10 }]}>
                    voto {1 + m.prendasRecibidas}
                  </Text>
                  <View style={estilos.puntos}>
                    {Array.from({ length: 2 }, (_, i) => (
                      <View
                        key={i}
                        style={[
                          estilos.punto,
                          {
                            backgroundColor: i < m.prendasRecibidas ? S.prenda : 'transparent',
                            borderColor: S.prenda,
                          },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </Marco>
        </>
      )}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  pesoFila: { flexDirection: 'row', alignItems: 'center', gap: espacio.md },
  paso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    borderWidth: 1.2,
    borderRadius: radio.md,
    padding: espacio.md,
    marginBottom: espacio.sm,
  },
  tramo: { flexDirection: 'row', alignItems: 'center', gap: espacio.md, marginTop: espacio.sm },
  numero: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  persona: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    paddingVertical: espacio.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: conAlfa(C.laton, 0.22),
  },
  puntos: { flexDirection: 'row', gap: 5, marginTop: 4 },
  punto: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.3 },
});
