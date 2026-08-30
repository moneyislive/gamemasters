/**
 * La hora: la pantalla donde se juega El Paso de las Sombras.
 *
 * Es la pestaña «Hora», y cambia de piel según la fase, igual que la de CLUEDO y
 * la vigilia de la Momia. Lo que la distingue de las dos es que **manda a la
 * gente a levantarse**: el gesto central no es tocar una sala en una lista, es
 * ir hasta una habitación, leer una palabra escrita en la puerta y escribirla.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ LA CONTRASEÑA SE PIDE DESPUÉS DE ELEGIR EL PASO Y NO ANTES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Porque el orden de la pantalla tiene que ser el orden de la noche: primero se
 * decide a dónde ir —que es la decisión de verdad, y se toma sentado, mirando
 * quién más va— y luego se va y se lee. Con el campo de texto arriba, la
 * pantalla parecía pedir una contraseña para entrar en la app.
 *
 * Y por eso el botón dice «Ya estoy allí» y no «Enviar»: es lo que de verdad
 * significa pulsarlo.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LO QUE NO SE PINTA NUNCA
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Dónde están los cazadores de ESTA hora, salvo que lleves el farol. Es lo único
 * que el juego se guarda, y la pantalla no lo insinúa: ni un color distinto en
 * un paso, ni un icono, ni un «cuidado». Lo que sí se pinta, y en grande, es
 * dónde estaban en las horas ya cerradas — porque es lo que permite comprobar
 * quién decía la verdad.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as api from '../api';
import { usePartida } from '../estado';
import { Reloj } from '../reloj';
import { AvisoDeLaPartida } from '../conexion';
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
} from '../ui';
import { conAlfa } from '../tema-juego';
import { COLOR_SOMBRAS as C, SOMBRAS as S } from '../tema-sombras';
import { BarraDelRastro, Mon, TarjetaDisfraz, TarjetaHito } from './piezas';
import { codificarInvocacion, leerEstadoSombras, queEligeElPapel } from './vista';
import { Alba } from './alba';
import type { PapelId } from '../../../shared/juegos';

export function Hora(): JSX.Element {
  const { vista, cargando, error, aplicarVista } = usePartida();
  const [contrasena, setContrasena] = useState('');
  const [pasoElegido, setPasoElegido] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [ultimo, setUltimo] = useState<string | null>(null);
  const [avisando, setAvisando] = useState(false);
  const [papelElegido, setPapelElegido] = useState<PapelId | null>(null);
  const [objetivo, setObjetivo] = useState<string | null>(null);
  const [enserElegido, setEnserElegido] = useState<string | null>(null);

  /*
   * TODOS LOS HOOKS ANTES DE CUALQUIER `return`. React identifica los hooks por
   * su orden de llamada, así que salir antes cambiaría cuántos hay entre una
   * pantalla de carga y una partida en curso, y React tiraría la pantalla.
   */
  if (cargando && !vista) {
    return (
      <Pantalla>
        <Cargando texto="Saliendo de Sakai…" />
      </Pantalla>
    );
  }
  if (!vista) {
    return (
      <Pantalla>
        <AvisoError>{error ?? 'No hay ninguna partida activa.'}</AvisoError>
        <Boton onPress={() => router.replace('/')}>Volver a entrar</Boton>
      </Pantalla>
    );
  }

  const { sesion, yo } = vista;
  const s = leerEstadoSombras(vista.estadoDelJuego);
  const nombreDePaso = (id: string) => s?.pasos.find((p) => p.id === id)?.nombre ?? id;
  const nombreDe = (participanteId: string) =>
    vista.jugadores.find((j) => j.participanteId === participanteId)?.displayName ?? 'alguien';

  const hacer = async (
    etiqueta: string,
    accion: string,
    datos: Record<string, string | string[]>,
    alSalirBien?: (resultado: unknown) => void,
  ): Promise<void> => {
    setErrorAccion(null);
    setOcupado(etiqueta);
    try {
      const r = await api.hacerAccion(accion, datos);
      aplicarVista(r.vista);
      alSalirBien?.(r.resultado);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setErrorAccion(e instanceof Error ? e.message : 'No se pudo hacer eso.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } finally {
      setOcupado(null);
    }
  };

  const avisar = async (listo: boolean): Promise<void> => {
    setErrorAccion(null);
    setAvisando(true);
    try {
      const r = await api.avisarListo(listo);
      aplicarVista(r.vista);
    } catch (e) {
      setErrorAccion(e instanceof Error ? e.message : 'No se pudo avisar.');
    } finally {
      setAvisando(false);
    }
  };

  // ---- El desenlace tiene pantalla propia ----
  if (sesion.phase === 'desenlace') return <Alba />;

  // ---- Sala de espera ----
  if (sesion.phase === 'lobby') {
    return (
      <Pantalla>
        <AvisoDeLaPartida />
        <Animated.View entering={FadeInDown.duration(500)} style={estilos.centro}>
          <Sello>Sakai · antes de salir</Sello>
          <Titulo style={{ textAlign: 'center', marginTop: espacio.lg }}>
            {sesion.tituloPartida}
          </Titulo>
          <Cuerpo tenue style={{ textAlign: 'center', fontStyle: 'italic', marginTop: 4 }}>
            {sesion.lema}
          </Cuerpo>
          <Ornamento style={{ marginVertical: espacio.lg }} />
          <Cuerpo style={{ textAlign: 'center' }}>
            Kioto arde y los caminos grandes ya no son nuestros. Se sale de noche y se cruza Iga.
            Antes de andar, lee quién eres: llevas un disfraz que los demás no tienen.
          </Cuerpo>
          <Boton
            onPress={() => router.push('/(juego)/personaje')}
            style={{ marginTop: espacio.lg, alignSelf: 'stretch' }}
          >
            Ver quién eres
          </Boton>
          <View style={{ height: espacio.md }} />
          <Cuerpo tenue style={{ textAlign: 'center', fontSize: 14 }}>
            {sesion.listos} de {sesion.total} han dicho que están listos.
          </Cuerpo>
          <Boton
            variante={yo.pediEmpezar ? 'secundario' : 'primario'}
            cargando={avisando}
            onPress={() => void avisar(!yo.pediEmpezar)}
            style={{ marginTop: espacio.sm, alignSelf: 'stretch' }}
          >
            {yo.pediEmpezar ? 'Ya no tengo prisa' : 'Estoy listo para salir'}
          </Boton>
          <AvisoError>{errorAccion}</AvisoError>
        </Animated.View>
      </Pantalla>
    );
  }

  if (!s) {
    return (
      <Pantalla>
        <AvisoDeLaPartida />
        <Cargando texto="La columna todavía no se ha puesto en marcha…" />
      </Pantalla>
    );
  }

  const enHora = sesion.phase === 'ronda-abierta';
  const enConsejo = sesion.phase === 'acusaciones';
  const misHitosDeAhora = s.yo.hitos.filter(
    (h) => h.halladoEn?.ronda === s.hora.ronda,
  );
  const papeles = s.yo.papelesDisponibles ?? [s.yo.papel];
  const papelActivo = papelElegido && papeles.includes(papelElegido) ? papelElegido : papeles[0]!;
  const elige = queEligeElPapel(papelActivo);
  const mentiras = s.yo.mentiras ?? [];
  const revelado = s.hora.batidosRevelados;

  return (
    <Pantalla>
      <AvisoDeLaPartida />

      {/* ---- La hora ---- */}
      <Animated.View entering={FadeInUp.duration(420)}>
        <View style={estilos.cabecera}>
          <View style={{ flex: 1 }}>
            <Etiqueta>
              Hora {s.hora.ronda} de {sesion.totalRounds}
            </Etiqueta>
            <View style={estilos.horaFila}>
              <Text style={estilos.kanji}>{s.hora.kanji}</Text>
              <Titulo style={{ fontSize: 24 }}>{s.hora.nombre}</Titulo>
            </View>
          </View>
          {enHora && sesion.roundEndsAt && <Reloj terminaEn={sesion.roundEndsAt} ahoraServidor={sesion.ahora} />}
        </View>
      </Animated.View>

      <Marco style={{ marginBottom: espacio.md }}>
        <BarraDelRastro rastro={s.hora.rastro} maximo={s.hora.rastroMaximo} />
      </Marco>

      {/* ---- Lo que solo tú sabes ---- */}
      {s.hora.batidoQueVes && (
        <Animated.View entering={FadeIn.duration(360)}>
          <Marco tono="peligro" style={{ marginBottom: espacio.md }}>
            <Etiqueta style={{ color: C.oro300 }}>Lo ves porque llevas el farol</Etiqueta>
            <Cuerpo style={{ marginTop: espacio.xs, fontSize: 18 }}>
              Esta hora los cazadores están en {s.hora.batidoQueVes.nombre}.
            </Cuerpo>
            <Cuerpo tenue style={{ marginTop: espacio.xs, fontSize: 14 }}>
              Nadie más lo sabe. Se sabrá al cerrar la hora, y entonces se verá si lo dijiste.
            </Cuerpo>
          </Marco>
        </Animated.View>
      )}
      {s.yo.sabeQueBatiran && (
        <Marco style={{ marginBottom: espacio.md, borderColor: conAlfa(S.anil, 0.9) }}>
          <Etiqueta>Lo que has averiguado yendo por delante</Etiqueta>
          <Cuerpo style={{ marginTop: espacio.xs }}>
            La hora que viene los cazadores estarán en {s.yo.sabeQueBatiran.nombre}.
          </Cuerpo>
        </Marco>
      )}

      <AvisoError>{errorAccion}</AvisoError>

      {/* ---- Reconocer un paso ---- */}
      {enHora && (
        <Animated.View entering={FadeInDown.duration(420).delay(80)}>
          <Seccion>Reconocer un paso</Seccion>
          {s.yo.miPaso ? (
            <Marco>
              <Etiqueta>Esta hora has ido a</Etiqueta>
              <Titulo style={{ fontSize: 20, marginTop: 2 }}>{nombreDePaso(s.yo.miPaso)}</Titulo>
              {ultimo && (
                <Cuerpo style={{ marginTop: espacio.sm, color: S.rastro }}>{ultimo}</Cuerpo>
              )}
              {misHitosDeAhora.length > 0 ? (
                <View style={{ marginTop: espacio.md }}>
                  <Etiqueta>Lo que dice su mojón</Etiqueta>
                  <View style={{ height: espacio.xs }} />
                  {misHitosDeAhora.map((h) => (
                    <TarjetaHito key={h.id} hito={h} nombreDePaso={nombreDePaso} />
                  ))}
                </View>
              ) : (
                <Cuerpo tenue style={{ marginTop: espacio.sm }}>
                  Ya has vuelto. Lo que hayas leído está en la pestaña de la senda.
                </Cuerpo>
              )}
              <Boton
                onPress={() => router.push('/(juego)/camino')}
                style={{ marginTop: espacio.md }}
              >
                Ir a la senda
              </Boton>
            </Marco>
          ) : (
            <>
              <Cuerpo tenue style={{ marginBottom: espacio.sm }}>
                Elige a dónde vas. Después ve hasta allí, lee la palabra escrita en la puerta y
                escríbela aquí. Sin eso no hay mojón que leer.
              </Cuerpo>
              {s.pasos.map((paso) => {
                const activo = pasoElegido === paso.id;
                const quienesVan = (s.encuentros.find((e) => e.ronda === s.hora.ronda)?.pasos ?? [])
                  .find((p) => p.pasoId === paso.id)?.quienes ?? [];
                return (
                  <Pressable
                    key={paso.id}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setPasoElegido(activo ? null : paso.id);
                    }}
                    style={({ pressed }) => [
                      estilos.paso,
                      {
                        borderColor: activo ? C.oro400 : conAlfa(C.laton, 0.35),
                        backgroundColor: activo ? conAlfa(C.oro500, 0.14) : conAlfa(C.caoba900, 0.6),
                      },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[texto.titulo, { color: activo ? C.oro300 : C.pergamino, fontSize: 17 }]}>
                        {paso.nombre}
                      </Text>
                      {paso.descripcion ? (
                        <Cuerpo tenue style={{ fontSize: 14, marginTop: 2 }}>
                          {paso.descripcion}
                        </Cuerpo>
                      ) : null}
                      {quienesVan.length > 0 && (
                        <Text style={[texto.microCaps, { color: C.laton, marginTop: 4, fontSize: 11 }]}>
                          {quienesVan.map(nombreDe).join(' · ')}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}

              {pasoElegido && (
                <Animated.View entering={FadeIn.duration(300)}>
                  <Marco style={{ marginTop: espacio.md }}>
                    <Etiqueta>La palabra escrita en la puerta de {nombreDePaso(pasoElegido)}</Etiqueta>
                    <TextInput
                      value={contrasena}
                      onChangeText={setContrasena}
                      placeholder="p. ej. YAMA"
                      placeholderTextColor={conAlfa(C.pergaminoTenue, 0.45)}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      style={estilos.entrada}
                    />
                    <Cuerpo tenue style={{ fontSize: 13, marginTop: espacio.xs }}>
                      Da igual mayúsculas o minúsculas. Si te equivocas no pierdes la hora: vuelve
                      a mirar.
                    </Cuerpo>
                    <Boton
                      variante="primario"
                      cargando={ocupado === 'avanzar'}
                      disabled={contrasena.trim().length === 0}
                      onPress={() =>
                        void hacer(
                          'avanzar',
                          'avanzar',
                          { paso: pasoElegido, contrasena },
                          (resultado) => {
                            const r = resultado as { batido?: boolean; rastroSubio?: number; teLibraste?: boolean };
                            setContrasena('');
                            setPasoElegido(null);
                            setUltimo(
                              r?.batido
                                ? r.teLibraste
                                  ? 'Los has visto de cerca, y no te han mirado la cara. El rastro no ha subido.'
                                  : 'Los has visto. Estaban aquí, y ahora la columna lleva una pisada más encima.'
                                : null,
                            );
                          },
                        )
                      }
                      style={{ marginTop: espacio.md }}
                    >
                      Ya estoy allí
                    </Boton>
                  </Marco>
                </Animated.View>
              )}
            </>
          )}
        </Animated.View>
      )}

      {/* ---- El disfraz ---- */}
      {enHora && (
        <>
          <Ornamento />
          <Seccion>Tu disfraz</Seccion>
          <Marco>
            <TarjetaDisfraz
              rol={s.yo.papelRol}
              kanji={s.yo.papelKanji}
              queHace={s.yo.papelQueHace}
              usado={s.yo.papelUsado}
            />

            {papeles.length > 1 && (
              <View style={{ marginTop: espacio.md }}>
                <Etiqueta>Y el otro, que nadie sabe que tienes</Etiqueta>
                <View style={estilos.opciones}>
                  {papeles.map((p) => (
                    <Pressable
                      key={p}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        setPapelElegido(p);
                        setObjetivo(null);
                      }}
                      style={[
                        estilos.opcion,
                        {
                          borderColor: p === papelActivo ? S.bermellon : conAlfa(C.laton, 0.4),
                          backgroundColor:
                            p === papelActivo ? conAlfa(S.bermellon, 0.2) : 'transparent',
                        },
                      ]}
                    >
                      <Text style={[texto.etiqueta, { color: C.pergamino, fontSize: 13 }]}>
                        {p === 'falsear' ? 'Dejar un mojón de tu puño' : (s.yo.papelRol ?? p)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {!s.yo.papelUsado && elige === 'persona' && (
              <View style={{ marginTop: espacio.md }}>
                <Etiqueta>¿Sobre quién?</Etiqueta>
                <View style={estilos.opciones}>
                  {vista.jugadores
                    .filter((j) => papelActivo !== 'trocar' || j.participanteId !== yo.participanteId)
                    .map((j) => (
                      <Pressable
                        key={j.participanteId}
                        onPress={() => {
                          void Haptics.selectionAsync();
                          setObjetivo(j.participanteId);
                        }}
                        style={[
                          estilos.opcion,
                          {
                            borderColor: objetivo === j.participanteId ? C.oro400 : conAlfa(C.laton, 0.4),
                            backgroundColor:
                              objetivo === j.participanteId ? conAlfa(C.oro500, 0.15) : 'transparent',
                          },
                        ]}
                      >
                        <Text style={[texto.etiqueta, { color: C.pergamino, fontSize: 13 }]}>
                          {j.displayName}
                        </Text>
                      </Pressable>
                    ))}
                </View>
              </View>
            )}

            {!s.yo.papelUsado && elige === 'hito-propio' && (
              <View style={{ marginTop: espacio.md }}>
                <Etiqueta>¿Cuál pones sobre la mesa?</Etiqueta>
                {s.yo.hitos.filter((h) => !h.publico).length === 0 ? (
                  <Cuerpo tenue style={{ marginTop: espacio.xs }}>
                    Todavía no tienes ningún mojón sin contar.
                  </Cuerpo>
                ) : (
                  s.yo.hitos
                    .filter((h) => !h.publico)
                    .map((h) => (
                      <Pressable
                        key={h.id}
                        onPress={() => {
                          void Haptics.selectionAsync();
                          setObjetivo(h.id);
                        }}
                        style={{ opacity: objetivo === h.id ? 1 : 0.6 }}
                      >
                        <TarjetaHito hito={h} nombreDePaso={nombreDePaso} />
                      </Pressable>
                    ))
                )}
              </View>
            )}

            {!s.yo.papelUsado && elige === 'mentira' && (
              <View style={{ marginTop: espacio.md }}>
                <Etiqueta style={{ color: S.bermellon }}>
                  Cuál dejas escrito · aparecerá en el paso donde estés esta hora
                </Etiqueta>
                {mentiras.length === 0 ? (
                  <Cuerpo tenue style={{ marginTop: espacio.xs }}>
                    Ya has gastado todas.
                  </Cuerpo>
                ) : (
                  mentiras.map((m) => (
                    <Pressable
                      key={m.id}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        setObjetivo(m.id);
                      }}
                      style={[
                        estilos.mentira,
                        {
                          borderColor: objetivo === m.id ? S.bermellon : conAlfa(S.bermellon, 0.4),
                          backgroundColor:
                            objetivo === m.id ? conAlfa(S.bermellon, 0.16) : 'transparent',
                        },
                      ]}
                    >
                      <Cuerpo style={{ fontSize: 16 }}>{m.texto}</Cuerpo>
                    </Pressable>
                  ))
                )}
                <Cuerpo tenue style={{ fontSize: 13, marginTop: espacio.xs }}>
                  Hazlo donde no haya nadie más: la columna sabe quién estuvo dónde, y dos personas
                  en el mismo sitio leyeron lo mismo.
                </Cuerpo>
              </View>
            )}

            <Boton
              variante={papelActivo === 'falsear' ? 'peligro' : 'secundario'}
              cargando={ocupado === 'invocar'}
              disabled={s.yo.papelUsado}
              onPress={() =>
                void hacer(
                  'invocar',
                  'invocar',
                  codificarInvocacion({
                    papel: papelActivo,
                    aQuien: elige === 'persona' ? objetivo : null,
                    hito: elige === 'hito-propio' || elige === 'mentira' ? objetivo : null,
                  }),
                  (resultado) => {
                    const r = resultado as { efecto?: string; revelado?: string };
                    setObjetivo(null);
                    setUltimo([r?.efecto, r?.revelado].filter(Boolean).join(' · ') || null);
                  },
                )
              }
              style={{ marginTop: espacio.md }}
            >
              {s.yo.papelUsado ? 'Ya lo has usado esta hora' : 'Usar el disfraz'}
            </Boton>
          </Marco>
        </>
      )}

      {/* ---- Las prendas ---- */}
      {(enHora || sesion.phase === 'ronda-cerrada' || enConsejo) && (
        <>
          <Ornamento />
          <Seccion>Tu palabra</Seccion>
          <Marco>
            <View style={estilos.prendasFila}>
              <View>
                <Etiqueta>Por dar</Etiqueta>
                <View style={estilos.puntos}>
                  {Array.from({ length: Math.max(s.yo.prendas, 2) }, (_, i) => (
                    <View
                      key={i}
                      style={[
                        estilos.punto,
                        {
                          backgroundColor: i < s.yo.prendas ? S.prenda : 'transparent',
                          borderColor: S.prenda,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
              <View>
                <Etiqueta>Te han dado</Etiqueta>
                <View style={estilos.puntos}>
                  {Array.from({ length: 2 }, (_, i) => (
                    <View
                      key={i}
                      style={[
                        estilos.punto,
                        {
                          backgroundColor: i < s.yo.prendasRecibidas ? S.prenda : 'transparent',
                          borderColor: S.prenda,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
            </View>
            <Cuerpo tenue style={{ fontSize: 14, marginTop: espacio.sm }}>
              Tu voto en el consejo pesa {1 + s.yo.prendasRecibidas}. Una prenda solo se da a otra
              persona, y quien la recibe debe una respuesta sincera a una pregunta directa.
            </Cuerpo>
            {s.yo.prendas > 0 && (
              <View style={{ marginTop: espacio.md }}>
                <Etiqueta>Dar una prenda a</Etiqueta>
                <View style={estilos.opciones}>
                  {vista.jugadores
                    .filter((j) => j.participanteId !== yo.participanteId)
                    .map((j) => (
                      <Pressable
                        key={j.participanteId}
                        onPress={() =>
                          void hacer('avalar', 'avalar', { aQuien: j.participanteId }, () =>
                            setUltimo(`Le has dado tu palabra a ${j.displayName}.`),
                          )
                        }
                        disabled={ocupado === 'avalar'}
                        style={[
                          estilos.opcion,
                          { borderColor: conAlfa(S.prenda, 0.6), backgroundColor: conAlfa(S.prenda, 0.08) },
                        ]}
                      >
                        <Text style={[texto.etiqueta, { color: C.pergamino, fontSize: 13 }]}>
                          {j.displayName}
                        </Text>
                      </Pressable>
                    ))}
                </View>
              </View>
            )}
          </Marco>
        </>
      )}

      {/* ---- La carga ---- */}
      {s.yo.enseres.length > 0 && (
        <>
          <Ornamento />
          <Seccion>Lo que llevas</Seccion>
          {s.yo.enseres.map((enser) => (
            <Marco key={enser.id} style={{ marginBottom: espacio.sm }}>
              <Mon glifo={enser.porte ? '荷' : '·'} tono={enser.porte ? 'acero' : 'apagado'}>
                {enser.nombre}
              </Mon>
              {enser.porteQue ? (
                <Cuerpo style={{ marginTop: espacio.sm, fontSize: 15 }}>{enser.porteQue}</Cuerpo>
              ) : (
                <Cuerpo tenue style={{ marginTop: espacio.sm, fontSize: 14 }}>
                  No pesa en las reglas. Hay que llevarlo igual.
                </Cuerpo>
              )}
              <Etiqueta style={{ marginTop: espacio.md }}>Pasárselo a</Etiqueta>
              <View style={estilos.opciones}>
                {vista.jugadores
                  .filter((j) => j.participanteId !== yo.participanteId)
                  .map((j) => (
                    <Pressable
                      key={j.participanteId}
                      onPress={() => {
                        setEnserElegido(enser.id);
                        void hacer('entregar', 'entregar', { enser: enser.id, aQuien: j.participanteId }, () =>
                          setUltimo(`${enser.nombre} ahora lo lleva ${j.displayName}.`),
                        );
                      }}
                      disabled={ocupado === 'entregar' && enserElegido === enser.id}
                      style={[
                        estilos.opcion,
                        { borderColor: conAlfa(C.laton, 0.45) },
                      ]}
                    >
                      <Text style={[texto.etiqueta, { color: C.pergamino, fontSize: 13 }]}>
                        {j.displayName}
                      </Text>
                    </Pressable>
                  ))}
              </View>
            </Marco>
          ))}
        </>
      )}

      {/* ---- Lo que ya se sabe ---- */}
      {revelado.length > 0 && (
        <>
          <Ornamento />
          <Seccion>Dónde estaban los cazadores</Seccion>
          <Marco>
            {revelado.map((b) => (
              <View key={b.ronda} style={estilos.revelado}>
                <Text style={[texto.microCaps, { color: C.laton, fontSize: 11, width: 62 }]}>
                  hora {b.ronda}
                </Text>
                <Text style={[texto.cuerpo, { color: S.rastro, fontSize: 16, flex: 1 }]}>
                  {b.nombre}
                </Text>
                <Text style={[texto.microCaps, { color: C.pergaminoTenue, fontSize: 11 }]}>
                  {(s.encuentros.find((e) => e.ronda === b.ronda)?.pasos ?? [])
                    .find((p) => p.pasoId === b.pasoId)
                    ?.quienes.map(nombreDe)
                    .join(' · ') || 'nadie'}
                </Text>
              </View>
            ))}
            <Cuerpo tenue style={{ fontSize: 13, marginTop: espacio.sm }}>
              Aquí es donde se comprueba lo que se dijo. Quien estuvo en el mismo sitio leyó lo
              mismo.
            </Cuerpo>
          </Marco>
        </>
      )}

      {/* ---- Entre horas ---- */}
      {sesion.phase === 'ronda-cerrada' && (
        <Animated.View entering={FadeInDown.duration(420)}>
          <Ornamento />
          <Marco>
            <Sello>Alto en el camino</Sello>
            <Cuerpo style={{ marginTop: espacio.md }}>
              La columna se ha parado. Es el momento de poner sobre la mesa lo que cada cual ha
              leído — y de mirar quién estuvo con quién.
            </Cuerpo>
            <Boton onPress={() => router.push('/(juego)/camino')} style={{ marginTop: espacio.md }}>
              Ver la senda
            </Boton>
          </Marco>
        </Animated.View>
      )}

      {/* ---- El consejo ---- */}
      {enConsejo && (
        <Animated.View entering={FadeInDown.duration(420)}>
          <Ornamento />
          <Marco tono="peligro">
            <Sello>El consejo del alba</Sello>
            <Cuerpo style={{ marginTop: espacio.md }}>
              Empieza a clarear. Cada cual propone su senda y señala a quien cree que cobra de
              Akechi. Se anda la más apoyada, no la tuya.
            </Cuerpo>
            <Boton
              variante="primario"
              onPress={() => router.push('/(juego)/consejo')}
              style={{ marginTop: espacio.md }}
            >
              Ir al consejo
            </Boton>
          </Marco>
        </Animated.View>
      )}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  centro: { alignItems: 'center', paddingVertical: espacio.xl },
  cabecera: { flexDirection: 'row', alignItems: 'center', marginBottom: espacio.md },
  horaFila: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  kanji: { color: C.oro500, fontSize: 26, lineHeight: 30 },
  paso: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderRadius: radio.md,
    padding: espacio.md,
    marginBottom: espacio.sm,
  },
  entrada: {
    marginTop: espacio.sm,
    borderWidth: 1.2,
    borderColor: conAlfa(C.oro500, 0.5),
    borderRadius: radio.md,
    backgroundColor: conAlfa(C.caoba900, 0.7),
    color: C.oro300,
    paddingHorizontal: espacio.md,
    paddingVertical: 12,
    fontSize: 22,
    letterSpacing: 3,
    textAlign: 'center',
  },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm, marginTop: espacio.sm },
  opcion: {
    borderWidth: 1,
    borderRadius: radio.md,
    paddingVertical: 8,
    paddingHorizontal: espacio.md,
  },
  mentira: {
    borderWidth: 1.2,
    borderRadius: radio.md,
    padding: espacio.md,
    marginTop: espacio.sm,
  },
  prendasFila: { flexDirection: 'row', gap: espacio.xl },
  puntos: { flexDirection: 'row', gap: 6, marginTop: 6 },
  punto: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.4 },
  revelado: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm, marginBottom: 6 },
});
