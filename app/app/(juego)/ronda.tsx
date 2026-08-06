/**
 * La pantalla de la ronda: donde se juega.
 *
 * Cambia de piel según la fase. En la sala de espera invita a mirar tu
 * personaje; con la ronda abierta manda elegir sala y enseña lo que encuentras;
 * al cerrarse, calla y te empuja al tablón. Es la pantalla que la gente tendrá
 * delante durante dos horas, así que nunca muestra dos cosas a la vez.
 */
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import * as api from '../../src/api';
import { usePartida } from '../../src/estado';
import { Reloj } from '../../src/reloj';
import {
  Boton,
  Cargando,
  Cuerpo,
  Error as AvisoError,
  Etiqueta,
  Marco,
  Ornamento,
  Pantalla,
  Sello,
  Seccion,
  Titulo,
  color,
  espacio,
  radio,
  texto,
} from '../../src/ui';
import type { SalaVista } from '../../../shared/live';

export default function Ronda(): JSX.Element {
  const { vista, cargando, error, aplicarVista } = usePartida();
  const [eligiendo, setEligiendo] = useState<string | null>(null);
  const [errorSala, setErrorSala] = useState<string | null>(null);

  if (cargando && !vista) return <Pantalla><Cargando texto="Buscando la partida…" /></Pantalla>;
  if (!vista) {
    return (
      <Pantalla>
        <AvisoError>{error ?? 'No hay ninguna partida activa.'}</AvisoError>
        <Boton onPress={() => router.replace('/')}>Volver a entrar</Boton>
      </Pantalla>
    );
  }

  const { sesion, yo, salas, misPistas, miSala, narracion } = vista;

  const elegir = async (sala: SalaVista): Promise<void> => {
    setErrorSala(null);
    setEligiendo(sala.id);
    try {
      const r = await api.elegirSala(sala.id);
      aplicarVista(r.vista);
    } catch (e) {
      setErrorSala(e instanceof Error ? e.message : 'No se pudo entrar en esa sala.');
    } finally {
      setEligiendo(null);
    }
  };

  // ---- Sala de espera ----
  if (sesion.phase === 'lobby') {
    return (
      <Pantalla>
        <Animated.View entering={FadeInDown.duration(500)} style={estilos.centro}>
          <Sello>Sala de espera</Sello>
          <Titulo style={{ textAlign: 'center', marginTop: espacio.lg }}>
            {sesion.tituloPartida}
          </Titulo>
          <Cuerpo tenue style={{ textAlign: 'center', fontStyle: 'italic', marginTop: 4 }}>
            {sesion.lema}
          </Cuerpo>
        </Animated.View>

        <Ornamento />

        <Animated.View entering={FadeInUp.delay(200).duration(500)}>
          <Marco>
            <Etiqueta>Eres</Etiqueta>
            <Titulo style={{ fontSize: 24, marginTop: 4 }}>{yo.characterName}</Titulo>
            <Cuerpo tenue style={{ marginTop: 4 }}>{yo.role}</Cuerpo>
            <Boton
              variante="primario"
              onPress={() => router.push('/(juego)/personaje')}
              style={{ marginTop: espacio.lg }}
            >
              Leer tu dosier
            </Boton>
          </Marco>

          <Marco>
            <Cuerpo tenue style={{ textAlign: 'center' }}>
              La velada empezará en cuanto quien dirige abra la primera ronda.
              Aprovecha para aprenderte tu papel: en cuanto empiece, no habrá tiempo.
            </Cuerpo>
          </Marco>
        </Animated.View>
      </Pantalla>
    );
  }

  // ---- Desenlace ----
  if (sesion.phase === 'desenlace') {
    return (
      <Pantalla>
        <Animated.View entering={FadeIn.duration(600)} style={estilos.centro}>
          <Sello>Se ha abierto el sobre</Sello>
          <Titulo style={{ textAlign: 'center', marginTop: espacio.lg }}>El desenlace</Titulo>
        </Animated.View>
        <Ornamento />
        <Boton variante="primario" onPress={() => router.push('/desenlace')}>
          Ver quién fue
        </Boton>
      </Pantalla>
    );
  }

  // ---- Acusaciones ----
  if (sesion.phase === 'acusaciones') {
    const yaAcuso = Boolean(vista.miAcusacion);
    return (
      <Pantalla>
        <Animated.View entering={FadeInDown.duration(500)} style={estilos.centro}>
          <Sello>Momento de la verdad</Sello>
          <Titulo style={{ textAlign: 'center', marginTop: espacio.lg }}>
            {yaAcuso ? 'Tu acusación está entregada' : 'Acusa'}
          </Titulo>
        </Animated.View>
        <Ornamento />
        <Marco tono={yaAcuso ? 'oscuro' : 'peligro'}>
          <Cuerpo>
            {yaAcuso
              ? 'Ya no se puede cambiar. Ahora toca esperar a que se abra el sobre del crimen y ver quién estuvo más cerca.'
              : 'Una sola combinación: quién, con qué y dónde. No podrás cambiarla, y gana quien acierte primero.'}
          </Cuerpo>
          {!yaAcuso && (
            <Boton
              variante="peligro"
              onPress={() => router.push('/acusar')}
              style={{ marginTop: espacio.lg }}
            >
              Escribir mi acusación
            </Boton>
          )}
        </Marco>
      </Pantalla>
    );
  }

  // ---- Ronda abierta o cerrada ----
  const abierta = sesion.phase === 'ronda-abierta';

  return (
    <Pantalla>
      <View style={estilos.cabeceraRonda}>
        <View style={{ flex: 1 }}>
          <Etiqueta>
            Ronda {sesion.round} de {sesion.totalRounds}
          </Etiqueta>
          <Titulo style={{ fontSize: 24, marginTop: 2 }}>
            {abierta ? (miSala ? 'Estás investigando' : 'Elige dónde entrar') : 'Ronda cerrada'}
          </Titulo>
        </View>
        {abierta && <Reloj terminaEn={sesion.roundEndsAt} ahoraServidor={sesion.ahora} />}
      </View>

      {narracion && (
        <Animated.View entering={FadeInDown.duration(500)}>
          <Marco tono="papel">
            <Etiqueta style={{ color: color.burdeos700 }}>{narracion.title}</Etiqueta>
            <Cuerpo style={{ color: color.caoba700, marginTop: espacio.sm }}>
              {narracion.text}
            </Cuerpo>
          </Marco>
        </Animated.View>
      )}

      <AvisoError>{errorSala}</AvisoError>

      {abierta ? (
        <>
          <Seccion>{miSala ? 'Puedes cambiarte una vez' : 'Salas'}</Seccion>
          {salas.map((sala, i) => {
            const dentro = miSala === sala.id;
            return (
              <Animated.View
                key={sala.id}
                entering={FadeInUp.delay(60 * i).duration(400)}
                layout={Layout.springify()}
              >
                <Pressable
                  onPress={() => void elegir(sala)}
                  disabled={dentro || eligiendo !== null}
                  style={({ pressed }) => [
                    estilos.sala,
                    dentro && estilos.salaDentro,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  {sala.photoUrl ? (
                    <Image
                      source={{ uri: `${api.servidorActual()}${sala.photoUrl}` }}
                      style={estilos.salaFoto}
                    />
                  ) : (
                    <View style={[estilos.salaFoto, estilos.salaFotoVacia]}>
                      <Cuerpo tenue style={{ fontSize: 22 }}>⌂</Cuerpo>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Cuerpo style={{ fontFamily: 'Cinzel_600SemiBold', fontSize: 17 }}>
                      {sala.name}
                    </Cuerpo>
                    <Cuerpo tenue style={{ fontSize: 15 }}>
                      {sala.ocupantes === 0
                        ? 'No hay nadie'
                        : sala.ocupantes === 1
                          ? 'Hay alguien dentro'
                          : `${sala.ocupantes} personas dentro`}
                    </Cuerpo>
                  </View>
                  {dentro && <Cuerpo style={{ color: color.oro300, fontSize: 20 }}>✓</Cuerpo>}
                </Pressable>
              </Animated.View>
            );
          })}

          {misPistas.length > 0 && (
            <>
              <Ornamento />
              <Seccion>Lo que encuentras aquí</Seccion>
              {misPistas.map((pista, i) => (
                <Animated.View key={pista.id} entering={FadeInUp.delay(120 * i).duration(520)}>
                  <Marco tono="papel">
                    <Etiqueta style={{ color: color.burdeos700 }}>{pista.roomName}</Etiqueta>
                    <Cuerpo style={{ color: color.caoba700, marginTop: espacio.sm }}>
                      {pista.description}
                    </Cuerpo>
                  </Marco>
                </Animated.View>
              ))}
              <Cuerpo tenue style={{ fontStyle: 'italic', fontSize: 15 }}>
                Qué significa es cosa tuya. Al cerrar la ronda pasará al tablón común.
              </Cuerpo>
            </>
          )}
        </>
      ) : (
        <Marco>
          <Cuerpo>
            Todo lo que se ha encontrado esta ronda está ya en el tablón común. Es el momento de
            hablar: contrasta lo tuyo con lo de los demás antes de que empiece la siguiente.
          </Cuerpo>
          <Boton onPress={() => router.push('/(juego)/tablon')} style={{ marginTop: espacio.lg }}>
            Ir al tablón
          </Boton>
        </Marco>
      )}

      <Ornamento />
      <Boton onPress={() => router.push('/consejero')}>Preguntar al consejero</Boton>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  centro: { alignItems: 'center', paddingTop: espacio.xl },
  cabeceraRonda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    marginBottom: espacio.lg,
  },
  sala: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.28)',
    backgroundColor: 'rgba(31,18,12,0.55)',
    borderRadius: radio.md,
    padding: espacio.md,
    marginBottom: espacio.sm,
  },
  salaDentro: {
    borderColor: color.oro400,
    backgroundColor: 'rgba(201,162,39,0.14)',
  },
  salaFoto: { width: 52, height: 52, borderRadius: radio.sm },
  salaFotoVacia: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11,23,16,0.7)',
  },
});
