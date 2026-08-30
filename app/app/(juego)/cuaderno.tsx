/**
 * Tus pistas: todo lo que has ido averiguando, ordenado por dónde viene.
 *
 * ESTA PESTAÑA ERA «NOTAS» y era un cuadro de texto con una lista de nombres
 * debajo. Todo lo demás que una persona averigua a lo largo de una velada
 * —lo que su personaje ya sabía de los demás, lo que se le va desbloqueando
 * ronda a ronda, los giros que le entregan y lo que encuentra al entrar en una
 * sala— estaba repartido entre el dosier y el tablón, mezclado con su papel y
 * con las reglas del juego. Buscar «¿qué sabía yo de Marta?» a los cuarenta
 * minutos era bajar por el dosier entero.
 *
 * Ahora lo que se desbloquea vive junto, en un orden que responde a la pregunta
 * que se hace cada vez:
 *
 *   1. lo que sabes de ellos ....... el material con el que empiezas y el que
 *      te va llegando ronda a ronda
 *   2. lo que has encontrado ....... tus salas, ronda a ronda. Solo tuyo
 *   3. lo que te han entregado ..... los giros, que cambian tu papel a mitad
 *   4. objetos y sospechosos ....... el material con el que se acusa
 *   5. tu cuaderno ................. lo que escribes tú
 *
 * LO QUE ENCUENTRAS ES TUYO, y de ahí que esté aquí y no en la pestaña de
 * hechos. Antes las pistas de todas las salas se volcaban al cerrar la ronda en
 * un tablón que veía todo el mundo, así que elegir bien la sala no servía de
 * nada y contar lo que habías visto tampoco. El servidor ya solo manda las de
 * las salas en las que estuviste; esta pantalla es el único sitio donde
 * aparecen.
 *
 * El cuaderno se guarda solo, con retardo, mientras escribes. Nadie va a pulsar
 * «guardar» en mitad de una conversación, y perder las notas de una ronda entera
 * por cerrar la app sería el peor fallo posible de esta pantalla.
 */
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as api from '../../src/api';
import { usePartida } from '../../src/estado';
import {
  Cargando,
  Cuerpo,
  Etiqueta,
  Marco,
  Ornamento,
  Pantalla,
  Plegable,
  Seccion,
  Titulo,
  color,
  espacio,
  radio,
  texto,
} from '../../src/ui';
import type { PistaVista } from '../../../shared/live';

export default function Cuaderno(): JSX.Element {
  const { vista } = usePartida();
  const [texto_, setTexto] = useState<string | null>(null);
  const [estado, setEstado] = useState<'guardado' | 'guardando' | 'pendiente'>('guardado');
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Se toma el valor del servidor solo la primera vez: después manda lo que
  // está escribiendo la persona, o el cursor saltaría a cada refresco.
  useEffect(() => {
    if (texto_ === null && vista) setTexto(vista.yo.notas);
  }, [vista, texto_]);

  const alEscribir = (valor: string): void => {
    setTexto(valor);
    setEstado('pendiente');
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      setEstado('guardando');
      api
        .guardarNotas(valor)
        .then(() => setEstado('guardado'))
        .catch(() => setEstado('pendiente'));
    }, 900);
  };

  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  if (!vista) return <Pantalla><Cargando /></Pantalla>;

  const { yo } = vista;

  /*
   * Los hallazgos, agrupados por la ronda en la que los encontraste y con la
   * más reciente arriba. Agrupar por ronda y no por sala es deliberado: lo que
   * se recuerda de una velada es «esto lo vi en la tercera», y la sala ya va
   * escrita en cada tarjeta.
   */
  const porRonda = new Map<number, PistaVista[]>();
  for (const p of vista.misHallazgos) {
    if (!porRonda.has(p.round)) porRonda.set(p.round, []);
    porRonda.get(p.round)!.push(p);
  }
  const rondas = [...porRonda.keys()].sort((a, b) => b - a);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Pantalla>
        <Titulo style={{ fontSize: 24, marginTop: espacio.md }}>Tus pistas</Titulo>
        <Cuerpo tenue style={{ marginBottom: espacio.lg }}>
          Todo lo que has averiguado, y solo tú. Nada de esto lo ve nadie más: si quieres que se
          sepa, tendrás que contarlo.
        </Cuerpo>

        {/* ---- 1. Lo que tu personaje sabe de los demás ---- */}
        <Seccion>Lo que sabes de los sospechosos</Seccion>
        {yo.conocimiento.length === 0 ? (
          <Marco>
            <Cuerpo tenue>
              Todavía nada. Irás recordando cosas según avance la velada.
            </Cuerpo>
          </Marco>
        ) : (
          yo.conocimiento.map((k, i) => (
            <Animated.View key={i} entering={FadeInUp.delay(50 * i).duration(420)}>
              <Marco tono="papel">
                <Cuerpo style={{ color: color.caoba700 }}>{k}</Cuerpo>
              </Marco>
            </Animated.View>
          ))
        )}
        {yo.conocimientoPendiente > 0 && (
          <Cuerpo tenue style={{ fontStyle: 'italic', fontSize: 15 }}>
            Aún recordarás {yo.conocimientoPendiente}{' '}
            {yo.conocimientoPendiente === 1 ? 'cosa más' : 'cosas más'} en próximas rondas.
          </Cuerpo>
        )}

        <Ornamento />

        {/* ---- 2. Lo que has encontrado tú, sala a sala ---- */}
        <Seccion>Lo que has encontrado</Seccion>
        {rondas.length === 0 ? (
          <Marco>
            <Cuerpo tenue>
              Todavía nada. Al entrar en una sala verás lo que haya en ella, y solo tú lo verás.
            </Cuerpo>
          </Marco>
        ) : (
          rondas.map((ronda) => (
            <View key={ronda}>
              <Etiqueta style={{ marginBottom: espacio.sm }}>Ronda {ronda}</Etiqueta>
              {porRonda.get(ronda)!.map((p, i) => (
                <Animated.View key={p.id} entering={FadeInUp.delay(50 * i).duration(420)}>
                  <Marco tono="papel">
                    <Etiqueta style={{ color: color.burdeos700 }}>{p.lugarNombre}</Etiqueta>
                    <Cuerpo style={{ color: color.caoba700, marginTop: espacio.sm }}>
                      {p.description}
                    </Cuerpo>
                    {/*
                      Qué señala la pista solo llega con la ronda ya cerrada:
                      mientras está abierta, interpretarla es trabajo tuyo. Lo
                      decide el servidor, que no manda el campo hasta entonces.
                    */}
                    {p.pointsTo && (
                      <View style={estilos.senala}>
                        <Cuerpo
                          style={{ color: color.burdeos700, fontSize: 16, fontStyle: 'italic' }}
                        >
                          {p.pointsTo}
                        </Cuerpo>
                      </View>
                    )}
                  </Marco>
                </Animated.View>
              ))}
            </View>
          ))
        )}

        {/* ---- 3. Los giros: lo que te entregan a mitad de partida ---- */}
        {yo.giros.length > 0 && (
          <>
            <Ornamento />
            <Seccion>Lo que acabas de descubrir</Seccion>
            {yo.giros.map((g) => (
              <Animated.View key={g.id} entering={FadeInUp.duration(520)}>
                <Marco tono="peligro">
                  <Etiqueta style={{ color: '#f0c9c0' }}>Ronda {g.round}</Etiqueta>
                  <Cuerpo style={{ marginTop: espacio.sm }}>{g.instruction}</Cuerpo>
                </Marco>
              </Animated.View>
            ))}
          </>
        )}

        <Ornamento />

        {/*
          ---- 4. El material con el que se acusa ----

          Plegados los dos: no cambian en toda la velada y se consultan al final,
          cuando hay que escribir la combinación. Desplegados empujarían al fondo
          del scroll lo que sí cambia cada ronda, que es lo de arriba.
        */}
        <Seccion>De quién y de qué se sospecha</Seccion>
        <Plegable etiqueta="Los objetos" resumen={vista.objetos.map((o) => o.name).join(' · ')}>
          <Marco>
            {vista.objetos.map((o, i) => (
              <View key={o.id} style={i === 0 ? estilos.filaPrimera : estilos.fila}>
                <Cuerpo style={{ flex: 1, fontSize: 16 }}>{o.name}</Cuerpo>
                {o.description ? (
                  <Cuerpo tenue style={{ flex: 1, fontSize: 14 }}>{o.description}</Cuerpo>
                ) : null}
              </View>
            ))}
          </Marco>
        </Plegable>

        <Plegable
          etiqueta="Quién está en la mesa"
          resumen={vista.jugadores.map((j) => j.characterName).join(' · ')}
        >
          <Marco>
            {vista.jugadores.map((j, i) => (
              <View key={j.participanteId} style={i === 0 ? estilos.filaPrimera : estilos.fila}>
                <View
                  style={[
                    estilos.punto,
                    { backgroundColor: j.conectado ? color.oro400 : 'rgba(217,201,163,0.25)' },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Cuerpo style={{ fontFamily: 'Cinzel_600SemiBold', fontSize: 16 }}>
                    {j.characterName}
                  </Cuerpo>
                  <Cuerpo tenue style={{ fontSize: 14 }}>
                    {j.role}
                    {j.salaActual ? ` · en ${j.salaActual}` : ''}
                    {j.yaAcuso ? ' · ya acusó' : ''}
                  </Cuerpo>
                </View>
              </View>
            ))}
          </Marco>
        </Plegable>

        <Ornamento />

        {/* ---- 5. Lo que escribes tú ---- */}
        <Seccion>Tu cuaderno</Seccion>
        <View style={estilos.estado}>
          <Etiqueta>
            {estado === 'guardado'
              ? 'Guardado'
              : estado === 'guardando'
                ? 'Guardando…'
                : 'Sin guardar'}
          </Etiqueta>
        </View>

        <Marco tono="papel" style={{ padding: 0 }}>
          <TextInput
            value={texto_ ?? ''}
            onChangeText={alEscribir}
            multiline
            textAlignVertical="top"
            placeholder="Quién estaba dónde. Quién se puso nervioso. Qué no encaja…"
            placeholderTextColor="rgba(62,39,35,0.4)"
            style={estilos.campo}
          />
        </Marco>

        <Cuerpo tenue style={{ fontSize: 15, fontStyle: 'italic' }}>
          Lo que escribas aquí no lo ve nadie más, ni siquiera quien dirige.
        </Cuerpo>
      </Pantalla>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  estado: { marginBottom: espacio.sm },
  campo: {
    minHeight: 260,
    padding: espacio.lg,
    color: color.caoba700,
    borderRadius: radio.lg,
    ...texto.cuerpo,
  },
  senala: {
    marginTop: espacio.md,
    paddingTop: espacio.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(109,26,42,0.3)',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: 'rgba(201,162,39,0.14)',
  },
  filaPrimera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    paddingVertical: 7,
  },
  punto: { width: 8, height: 8, borderRadius: radio.redondo },
});
