/**
 * El cuaderno: donde se apuntan las sospechas.
 *
 * Se guarda solo, con retardo, mientras escribes. Nadie va a pulsar «guardar»
 * en mitad de una conversación, y perder las notas de una ronda entera por
 * cerrar la app sería el peor fallo posible de esta pantalla.
 */
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import * as api from '../../src/api';
import { usePartida } from '../../src/estado';
import {
  Cargando,
  Cuerpo,
  Etiqueta,
  Marco,
  Pantalla,
  Seccion,
  Titulo,
  color,
  espacio,
  radio,
  texto,
} from '../../src/ui';

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

  const sospechosos = vista.jugadores;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Pantalla>
        <Titulo style={{ fontSize: 24, marginTop: espacio.md }}>Tu cuaderno</Titulo>
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

        <Seccion>Repaso rápido</Seccion>
        <Marco>
          {sospechosos.map((j) => (
            <View key={j.suspectId} style={estilos.fila}>
              <Cuerpo style={{ flex: 1, fontSize: 16 }}>{j.characterName}</Cuerpo>
              <Cuerpo tenue style={{ fontSize: 14 }}>
                {j.salaActual ?? '—'}
              </Cuerpo>
            </View>
          ))}
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
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201,162,39,0.14)',
  },
});
